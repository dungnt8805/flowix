import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenService } from '../../modules/auth/application/auth-token.service';
import { HeaderAuthGuard } from './header-auth.guard';

describe('HeaderAuthGuard', () => {
  it('allows public routes without auth headers', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true)
    } as unknown as Reflector;
    const guard = new HeaderAuthGuard(reflector);

    const canActivate = guard.canActivate(createContext({ headers: {} }));

    expect(canActivate).toBe(true);
  });

  it('hydrates request.user from auth headers', () => {
    const request: GuardTestRequest = {
      headers: {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
        'x-user-email': 'user@example.com'
      }
    };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false)
    } as unknown as Reflector;
    const guard = new HeaderAuthGuard(reflector);

    const canActivate = guard.canActivate(createContext(request));

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      displayName: null
    });
  });

  it('hydrates request.user from a bearer access token', () => {
    const previousSecret = process.env.AUTH_JWT_SECRET;
    process.env.AUTH_JWT_SECRET = 'guard-test-secret';
    const tokenService = new AuthTokenService();
    const tokenPair = tokenService.issueTokenPair({
      userId: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      displayName: 'User'
    });
    const request: GuardTestRequest = {
      headers: {
        authorization: `Bearer ${tokenPair.accessToken}`
      }
    };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false)
    } as unknown as Reflector;
    const guard = new HeaderAuthGuard(reflector, tokenService);

    const canActivate = guard.canActivate(createContext(request));

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      displayName: 'User',
      sessionId: tokenPair.sessionId
    });
    process.env.AUTH_JWT_SECRET = previousSecret;
  });

  it('rejects protected routes when auth headers are missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false)
    } as unknown as Reflector;
    const guard = new HeaderAuthGuard(reflector);

    expect(() => guard.canActivate(createContext({ headers: {} }))).toThrow(UnauthorizedException);
  });

  it('rejects protected routes when the user id is not a UUID', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false)
    } as unknown as Reflector;
    const guard = new HeaderAuthGuard(reflector);

    expect(() =>
      guard.canActivate(
        createContext({
          headers: { 'x-user-id': 'user-1', 'x-user-email': 'user@example.com' }
        })
      )
    ).toThrow(UnauthorizedException);
  });
});

interface GuardTestRequest {
  headers: Record<string, string>;
  user?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

function createContext(request: GuardTestRequest): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getContext: () => undefined, getData: () => undefined }),
    switchToWs: () => ({ getClient: () => undefined, getData: () => undefined, getPattern: () => undefined }),
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}
