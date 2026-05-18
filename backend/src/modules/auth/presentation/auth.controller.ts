import { Body, Controller, Get, Ip, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { Public } from '../../../common/auth/public.decorator';
import { AuthService, AuthSessionResponse, AuthUserResponse, ForgotPasswordResponse } from '../application/auth.service';
import { ForgotPasswordRequest } from './dto/forgot-password.request';
import { LoginRequest } from './dto/login.request';
import { RefreshTokenRequest } from './dto/refresh-token.request';
import { RegisterRequest } from './dto/register.request';
import { ResetPasswordRequest } from './dto/reset-password.request';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body() body: RegisterRequest,
    @Req() request: Request,
    @Ip() ipAddress: string
  ): Promise<AuthSessionResponse> {
    return this.authService.register({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      userAgent: request.headers['user-agent'],
      ipAddress
    });
  }

  @Public()
  @Post('login')
  login(
    @Body() body: LoginRequest,
    @Req() request: Request,
    @Ip() ipAddress: string
  ): Promise<AuthSessionResponse> {
    return this.authService.login({
      email: body.email,
      password: body.password,
      userAgent: request.headers['user-agent'],
      ipAddress
    });
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: RefreshTokenRequest): Promise<AuthSessionResponse> {
    return this.authService.refresh(body.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserResponse> {
    return this.authService.me(user);
  }

  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<{ revoked: true }> {
    await this.authService.logout(user);
    return { revoked: true };
  }

  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<{ revoked: true }> {
    await this.authService.logoutAll(user);
    return { revoked: true };
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordRequest): Promise<{ reset: true }> {
    await this.authService.resetPassword({ token: body.token, password: body.password });
    return { reset: true };
  }
}
