import { UnauthorizedException } from '@nestjs/common';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  const previousSecret = process.env.AUTH_JWT_SECRET;

  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.AUTH_JWT_SECRET = previousSecret;
  });

  it('issues verifiable access and refresh tokens for a session', () => {
    const service = new AuthTokenService();

    const issued = service.issueTokenPair({
      userId: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      displayName: 'User'
    });

    expect(service.verifyAccessToken(issued.accessToken)).toEqual(
      expect.objectContaining({
        sub: '11111111-1111-4111-8111-111111111111',
        email: 'user@example.com',
        displayName: 'User',
        sid: issued.sessionId,
        typ: 'access'
      })
    );
    expect(service.verifyRefreshToken(issued.refreshToken)).toEqual(
      expect.objectContaining({
        sub: '11111111-1111-4111-8111-111111111111',
        sid: issued.sessionId,
        typ: 'refresh'
      })
    );
  });

  it('rejects tampered tokens', () => {
    const service = new AuthTokenService();
    const issued = service.issueTokenPair({
      userId: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      displayName: null
    });

    expect(() => service.verifyAccessToken(`${issued.accessToken}tampered`)).toThrow(UnauthorizedException);
  });
});
