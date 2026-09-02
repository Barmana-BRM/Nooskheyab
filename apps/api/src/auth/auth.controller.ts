import { Body, Controller, Get, Headers, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/auth.decorators';
import type { AuthenticatedUser, RequestWithContext } from '../common/request-context';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
    @Headers('x-client-platform') clientPlatform?: string,
  ) {
    const platform = body.platform ?? (clientPlatform === 'native' ? 'native' : 'browser');
    const tokens = await this.auth.login(
      body.username,
      body.password,
      request,
      body.deviceId,
      platform,
    );
    if (platform === 'native')
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    this.auth.setRefreshCookie(response, tokens.refreshToken);
    return { accessToken: tokens.accessToken, ...this.auth.issueCsrf(response) };
  }

  @Get('csrf')
  csrf(@Res({ passthrough: true }) response: Response) {
    return this.auth.issueCsrf(response);
  }

  @Post('refresh')
  async refresh(
    @Body() body: RefreshDto,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieToken = request.cookies?.pharmacy_refresh as string | undefined;
    if (!body.refreshToken) this.auth.assertCsrf(request);
    const tokens = await this.auth.refresh(body.refreshToken ?? cookieToken);
    if (!body.refreshToken) this.auth.setRefreshCookie(response, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      ...(body.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
    };
  }

  @Post('logout')
  async logout(
    @Body() body: RefreshDto,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieToken = request.cookies?.pharmacy_refresh as string | undefined;
    if (!body.refreshToken) this.auth.assertCsrf(request);
    const result = await this.auth.logout(body.refreshToken ?? cookieToken, request);
    this.auth.clearRefreshCookie(response);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }
}
