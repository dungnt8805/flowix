import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  displayName: string | null;
  sid: string;
  typ: 'access';
  exp: number;
  iat: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  typ: 'refresh';
  exp: number;
  iat: number;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

type JwtPayload = AccessTokenPayload | RefreshTokenPayload;

const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class AuthTokenService {
  issueTokenPair(input: {
    userId: string;
    email: string;
    displayName: string | null;
    sessionId?: string;
  }): AuthTokenPair & { sessionId: string; refreshTokenExpiresAtDate: Date } {
    const sessionId = input.sessionId ?? randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const accessExpiresAt = now + this.accessTtlSeconds;
    const refreshExpiresAt = now + this.refreshTtlSeconds;
    const accessToken = this.sign({
      sub: input.userId,
      email: input.email,
      displayName: input.displayName,
      sid: sessionId,
      typ: 'access',
      iat: now,
      exp: accessExpiresAt
    });
    const refreshToken = this.sign({
      sub: input.userId,
      sid: sessionId,
      typ: 'refresh',
      iat: now,
      exp: refreshExpiresAt
    });

    return {
      sessionId,
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(accessExpiresAt * 1000).toISOString(),
      refreshTokenExpiresAt: new Date(refreshExpiresAt * 1000).toISOString(),
      refreshTokenExpiresAtDate: new Date(refreshExpiresAt * 1000)
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.verify(token);
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid access token.');
    }
    return payload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verify(token);
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    return payload;
  }

  private get accessTtlSeconds(): number {
    return readPositiveInteger(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS, DEFAULT_ACCESS_TTL_SECONDS);
  }

  private get refreshTtlSeconds(): number {
    return readPositiveInteger(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS, DEFAULT_REFRESH_TTL_SECONDS);
  }

  private sign(payload: JwtPayload): string {
    const encodedHeader = encode({ alg: 'HS256', typ: 'JWT' });
    const encodedPayload = encode(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    return `${signingInput}.${this.signature(signingInput)}`;
  }

  private verify(token: string): JwtPayload {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (encodedHeader === undefined || encodedPayload === undefined || signature === undefined) {
      throw new UnauthorizedException('Invalid token.');
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = this.signature(signingInput);
    if (!constantTimeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid token.');
    }

    let payload: JwtPayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid token.');
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expired.');
    }

    return payload;
  }

  private signature(signingInput: string): string {
    return createHmac('sha256', this.secret).update(signingInput).digest('base64url');
  }

  private get secret(): string {
    return process.env.AUTH_JWT_SECRET ?? 'flo-vis-local-development-secret-change-me';
  }
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
