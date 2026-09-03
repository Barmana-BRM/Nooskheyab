import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AppEnvironment } from '@pharmacy-mvp/config';
import type { UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import type { RequestWithContext } from '../common/request-context';

interface JwtPayload {
  sub: string;
  role: UserRole;
  pharmacyId: string | null;
  username: string;
  sessionId: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnvironment, true>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const header = request.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('ورود به سامانه لازم است.');
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      const session = await this.prisma.refreshSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!user || !session || !user.isActive || user.deletedAt) throw new Error('inactive');
      request.user = {
        id: user.id,
        role: user.role,
        pharmacyId: user.pharmacyId,
        username: user.username,
      };
      return true;
    } catch {
      throw new UnauthorizedException('ورود به سامانه لازم است.');
    }
  }
}
