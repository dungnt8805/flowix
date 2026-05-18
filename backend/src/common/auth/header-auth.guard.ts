import { CanActivate, ExecutionContext, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { AuthTokenService } from '../../modules/auth/application/auth-token.service';
import { AuthenticatedUser } from './authenticated-user';
import { IS_PUBLIC_KEY } from './public.decorator';

interface RequestWithHeadersAndUser {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

@Injectable()
export class HeaderAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly authTokenService?: AuthTokenService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithHeadersAndUser>();
    const authorization = this.readHeader(request, 'authorization');
    if (authorization?.startsWith('Bearer ') === true) {
      if (this.authTokenService === undefined) {
        throw new UnauthorizedException('Bearer authentication is not configured.');
      }

      const payload = this.authTokenService.verifyAccessToken(authorization.slice('Bearer '.length));
      request.user = {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
        sessionId: payload.sid
      };
      return true;
    }

    const userId = this.readHeader(request, 'x-user-id');
    const userEmail = this.readHeader(request, 'x-user-email');
    const displayName = this.readHeader(request, 'x-user-name');

    if (userId === undefined || userEmail === undefined) {
      throw new UnauthorizedException('Missing authentication headers.');
    }

    if (!isUUID(userId, '4')) {
      throw new UnauthorizedException('Authenticated user id must be a UUID.');
    }

    request.user = {
      id: userId,
      email: userEmail,
      displayName: displayName ?? null
    };

    return true;
  }

  private readHeader(
    request: RequestWithHeadersAndUser,
    headerName: string
  ): string | undefined {
    const headerValue = request.headers[headerName];

    if (typeof headerValue === 'string') {
      const normalized = headerValue.trim();
      return normalized.length > 0 ? normalized : undefined;
    }

    if (Array.isArray(headerValue)) {
      const firstValue = headerValue[0]?.trim();
      return firstValue !== undefined && firstValue.length > 0 ? firstValue : undefined;
    }

    return undefined;
  }
}
