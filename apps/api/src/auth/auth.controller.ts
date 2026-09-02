import { Body, Controller, Get, Headers, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthService } from './auth.service';
import type { LoginDto, RefreshDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/auth.decorators';
import type { AuthenticatedUser, RequestWithContext } from '../common/request-context';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Req() request: RequestWithContext, @Res({ passthrough: true }) response: Response, @Headers('x-client-platform') clientPlatform?: string) {
    const platform = body.platform ?? (clientPlatform === 'native' ? 'native' : 'browser');
    const tokens = await this.auth.login(body.username, body.password, request, body.deviceId, platform);
    this.auth.setRefreshCookie(response, tokens.refreshToken);
    return { accessToken: tokens.accessToken, ...(platform === 'native' ? { refreshToken: tokens.refreshToken } : {}) };
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto, @Req() request: RequestWithContext, @Res({ passthrough: true }) response: Response) {
    const cookieToken = request.cookies?.pharmacy_refresh as string | undefined;
    const tokens = await this.auth.refresh(body.refreshToken ?? cookieToken);
    this.auth.setRefreshCookie(response, tokens.refreshToken);
    return { accessToken: tokens.accessToken, ...(body.refreshToken ? { refreshToken: tokens.refreshToken } : {}) };
  }

  @Post('logout')
  async logout(@Body() body: RefreshDto, @Req() request: RequestWithContext, @Res({ passthrough: true }) response: Response) {
    const cookieToken = request.cookies?.pharmacy_refresh as string | undefined;
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
