import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthService, AuthUserResponse } from '../application/auth.service';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class ProtectedAuthController {
  constructor(private readonly authService: AuthService) {}

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
}
