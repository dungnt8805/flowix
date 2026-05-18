import { Body, Controller, Ip, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../../common/auth/public.decorator';
import { AuthService, AuthSessionResponse, ForgotPasswordResponse } from '../application/auth.service';
import { ForgotPasswordRequest } from './dto/forgot-password.request';
import { LoginRequest } from './dto/login.request';
import { RefreshTokenRequest } from './dto/refresh-token.request';
import { RegisterRequest } from './dto/register.request';
import { ResetPasswordRequest } from './dto/reset-password.request';

@ApiTags('Auth')
@Public()
@Controller('auth')
export class PublicAuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('refresh')
  refresh(@Body() body: RefreshTokenRequest): Promise<AuthSessionResponse> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordRequest): Promise<{ reset: true }> {
    await this.authService.resetPassword({ token: body.token, password: body.password });
    return { reset: true };
  }
}
