import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import type { User, UserRole } from '@prisma/client';
import type { AppEnvironment } from '@pharmacy-mvp/config';
import { AuditService } from '../common/audit.service';
import { AppError } from '../common/errors';
import type { RequestWithContext } from '../common/request-context';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { REFRESH_COOKIE_NAME } from '../common/constants';

interface JwtPayload {
  sub: string;
  role: UserRole;
  pharmacyId: string | null;
  username: string;
  sessionId: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const parseDurationMs = (value: string): number => {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (!match) throw new Error('Invalid duration configuration');
  const amount = Number(match[1]);
  const unit = match[2];
  if (!unit) throw new Error('Invalid duration configuration');
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit.toLowerCase() as 's' | 'm' | 'h' | 'd'];
  return amount * multiplier;
};

const hashToken = (value: string): string => createHash('sha256').update(value).digest('hex');
const genericLoginError = (): UnauthorizedException => new UnauthorizedException('نام کاربری یا رمز عبور نادرست است.');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnvironment, true>,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async login(
    usernameInput: string,
    password: string,
    request: RequestWithContext,
    deviceId: string | undefined,
    platform: 'browser' | 'native',
  ): Promise<TokenPair> {
    const username = usernameInput.trim().toLowerCase();
    const ip = request.ip ?? 'unknown';
    const allowed = await this.redis.consumeRateLimit(
      `pharmacy-mvp:login:${ip}:${username}`,
      this.config.get('LOGIN_RATE_LIMIT'),
      this.config.get('LOGIN_RATE_WINDOW_SECONDS'),
    );
    if (!allowed) throw new AppError('RATE_LIMITED', 'تعداد تلاش‌های ورود بیش از حد مجاز است.', 429);

    const user = await this.prisma.user.findUnique({ where: { username }, include: { pharmacy: true } });
    if (!user || !user.isActive || user.deletedAt || (user.lockedUntil && user.lockedUntil > new Date())) {
      await this.recordLoginFailure(user, request);
      throw genericLoginError();
    }
    let verified = false;
    try {
      verified = await argon2.verify(user.passwordHash, password);
    } catch {
      verified = false;
    }
    if (!verified) {
      await this.recordLoginFailure(user, request);
      throw genericLoginError();
    }

    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + parseDurationMs(this.config.get('JWT_REFRESH_EXPIRES_IN')));
    const session = await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
      });
      return transaction.refreshSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: hashToken(refreshToken),
          deviceId: deviceId ?? null,
          platform,
          expiresAt,
        },
      });
    });
    await this.audit.record({
      actorUserId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      requestId: request.requestId,
      ipAddress: ip,
      userAgent: request.get('user-agent') ?? '',
    });
    const accessToken = await this.jwt.signAsync<JwtPayload>({
      sub: user.id,
      role: user.role,
      pharmacyId: user.pharmacyId,
      username: user.username,
      sessionId: session.id,
    });
    return { accessToken, refreshToken };
  }

  async refresh(rawToken: string | undefined): Promise<TokenPair> {
    if (!rawToken) throw genericLoginError();
    const session = await this.prisma.refreshSession.findUnique({
      where: { refreshTokenHash: hashToken(rawToken) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive || session.user.deletedAt) {
      throw genericLoginError();
    }
    const nextRefreshToken = randomBytes(48).toString('base64url');
    const nextExpiresAt = new Date(Date.now() + parseDurationMs(this.config.get('JWT_REFRESH_EXPIRES_IN')));
    const nextSession = await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshSession.updateMany({ where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } });
      if (revoked.count !== 1) throw genericLoginError();
      return transaction.refreshSession.create({
        data: {
          userId: session.userId,
          refreshTokenHash: hashToken(nextRefreshToken),
          deviceId: session.deviceId,
          platform: session.platform,
          expiresAt: nextExpiresAt,
        },
      });
    });
    const accessToken = await this.jwt.signAsync<JwtPayload>({
      sub: session.user.id,
      role: session.user.role,
      pharmacyId: session.user.pharmacyId,
      username: session.user.username,
      sessionId: nextSession.id,
    });
    return { accessToken, refreshToken: nextRefreshToken };
  }

  async logout(rawToken: string | undefined, request: RequestWithContext): Promise<{ loggedOut: true }> {
    if (rawToken) {
      await this.prisma.refreshSession.updateMany({
        where: { refreshTokenHash: hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.record({
      actorUserId: request.user?.id,
      action: 'LOGOUT',
      entityType: 'Session',
      requestId: request.requestId,
      ipAddress: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? '',
    });
    return { loggedOut: true };
  }

  async me(userId: string): Promise<Pick<User, 'id' | 'firstName' | 'lastName' | 'username' | 'mobile' | 'role' | 'pharmacyId'>> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt) throw genericLoginError();
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      mobile: user.mobile,
      role: user.role,
      pharmacyId: user.pharmacyId,
    };
  }

  clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: this.config.get('NODE_ENV') === 'production' });
  }

  setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      maxAge: parseDurationMs(this.config.get('JWT_REFRESH_EXPIRES_IN')),
      path: '/api/v1/auth',
    });
  }

  private async recordLoginFailure(user: (User & { pharmacy: unknown }) | null, request: RequestWithContext): Promise<void> {
    if (user) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockThreshold = 5;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil: failedLoginCount >= lockThreshold ? new Date(Date.now() + 15 * 60_000) : null,
        },
      });
      await this.audit.record({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        requestId: request.requestId,
        ipAddress: request.ip ?? 'unknown',
        userAgent: request.get('user-agent') ?? '',
      });
    }
  }
}
