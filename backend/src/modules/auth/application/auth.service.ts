import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { UserEntity } from '../../users/infrastructure/persistence/user.entity';
import { SecurityTokenType } from '../domain/security-token-type';
import { UserAuthMethodEntity } from '../infrastructure/persistence/user-auth-method.entity';
import { UserCredentialEntity } from '../infrastructure/persistence/user-credential.entity';
import { UserSecurityTokenEntity } from '../infrastructure/persistence/user-security-token.entity';
import { UserSessionEntity } from '../infrastructure/persistence/user-session.entity';
import { AuthCryptoService } from './auth-crypto.service';
import { AuthTokenPair, AuthTokenService } from './auth-token.service';

export interface AuthUserResponse {
  id: string;
  email: string;
  displayName: string | null;
  emailVerifiedAt: string | null;
}

export interface AuthSessionResponse {
  user: AuthUserResponse;
  tokens: AuthTokenPair;
}

export interface ForgotPasswordResponse {
  accepted: true;
  resetToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(UserCredentialEntity)
    private readonly credentials: Repository<UserCredentialEntity>,
    @InjectRepository(UserAuthMethodEntity)
    private readonly authMethods: Repository<UserAuthMethodEntity>,
    @InjectRepository(UserSessionEntity)
    private readonly sessions: Repository<UserSessionEntity>,
    @InjectRepository(UserSecurityTokenEntity)
    private readonly securityTokens: Repository<UserSecurityTokenEntity>,
    private readonly crypto: AuthCryptoService,
    private readonly tokens: AuthTokenService
  ) {}

  async register(input: {
    email: string;
    password: string;
    displayName?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<AuthSessionResponse> {
    const email = normalizeEmail(input.email);
    const existingUser = await this.users.findOneBy({ email });
    if (existingUser !== null) {
      throw new ConflictException('A user with this email already exists.');
    }

    const user = await this.users.save(
      this.users.create({
        email,
        displayName: normalizeOptional(input.displayName),
        avatarUrl: null,
        emailVerifiedAt: null
      })
    );

    await this.credentials.save(
      this.credentials.create({
        userId: user.id,
        passwordHash: await this.crypto.hashPassword(input.password),
        passwordUpdatedAt: new Date()
      })
    );

    await this.authMethods.save(
      this.authMethods.create({
        userId: user.id,
        method: 'password',
        provider: 'local',
        providerSubject: email,
        email
      })
    );

    return this.createSession(user, input.userAgent, input.ipAddress);
  }

  async login(input: {
    email: string;
    password: string;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<AuthSessionResponse> {
    const user = await this.users.findOneBy({ email: normalizeEmail(input.email) });
    if (user === null) {
      throw invalidCredentials();
    }

    const credential = await this.credentials.findOneBy({ userId: user.id });
    if (credential === null) {
      throw invalidCredentials();
    }

    const passwordMatches = await this.crypto.verifyPassword(input.password, credential.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    return this.createSession(user, input.userAgent, input.ipAddress);
  }

  async refresh(refreshToken: string): Promise<AuthSessionResponse> {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const session = await this.sessions.findOneBy({ id: payload.sid, userId: payload.sub });
    if (session === null || session.revokedAt !== null || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const refreshTokenHash = this.crypto.hashToken(refreshToken);
    if (session.refreshTokenHash !== refreshTokenHash) {
      session.revokedAt = new Date();
      await this.sessions.save(session);
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.users.findOneBy({ id: payload.sub });
    if (user === null) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const issued = this.tokens.issueTokenPair({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      sessionId: session.id
    });
    session.refreshTokenHash = this.crypto.hashToken(issued.refreshToken);
    session.expiresAt = issued.refreshTokenExpiresAtDate;
    session.rotatedAt = new Date();
    await this.sessions.save(session);

    return { user: toAuthUserResponse(user), tokens: issued };
  }

  async me(user: AuthenticatedUser): Promise<AuthUserResponse> {
    const currentUser = await this.users.findOneBy({ id: user.id });
    if (currentUser === null) {
      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerifiedAt: null
      };
    }

    return toAuthUserResponse(currentUser);
  }

  async logout(user: AuthenticatedUser): Promise<void> {
    if (user.sessionId === undefined) {
      return;
    }

    await this.sessions.update(
      { id: user.sessionId, userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() }
    );
  }

  async logoutAll(user: AuthenticatedUser): Promise<void> {
    await this.sessions.update({ userId: user.id, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async forgotPassword(emailInput: string): Promise<ForgotPasswordResponse> {
    const user = await this.users.findOneBy({ email: normalizeEmail(emailInput) });
    if (user === null) {
      return { accepted: true };
    }

    const resetToken = this.crypto.generateOpaqueToken();
    await this.securityTokens.save(
      this.securityTokens.create({
        userId: user.id,
        tokenType: SecurityTokenType.PASSWORD_RESET,
        tokenHash: this.crypto.hashToken(resetToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: null
      })
    );

    if (process.env.NODE_ENV === 'production' && process.env.AUTH_EXPOSE_RESET_TOKEN !== 'true') {
      return { accepted: true };
    }

    return { accepted: true, resetToken };
  }

  async resetPassword(input: { token: string; password: string }): Promise<void> {
    const token = await this.securityTokens.findOneBy({
      tokenType: SecurityTokenType.PASSWORD_RESET,
      tokenHash: this.crypto.hashToken(input.token),
      usedAt: IsNull()
    });
    if (token === null || token.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid password reset token.');
    }

    let credential = await this.credentials.findOneBy({ userId: token.userId });
    if (credential === null) {
      credential = this.credentials.create({ userId: token.userId });
    }

    credential.passwordHash = await this.crypto.hashPassword(input.password);
    credential.passwordUpdatedAt = new Date();
    token.usedAt = new Date();
    await this.credentials.save(credential);
    await this.securityTokens.save(token);
    await this.sessions.update({ userId: token.userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private async createSession(
    user: UserEntity,
    userAgent?: string | null,
    ipAddress?: string | null
  ): Promise<AuthSessionResponse> {
    const issued = this.tokens.issueTokenPair({
      userId: user.id,
      email: user.email,
      displayName: user.displayName
    });

    await this.sessions.save(
      this.sessions.create({
        id: issued.sessionId,
        userId: user.id,
        refreshTokenHash: this.crypto.hashToken(issued.refreshToken),
        userAgent: normalizeOptional(userAgent),
        ipAddress: normalizeOptional(ipAddress),
        expiresAt: issued.refreshTokenExpiresAtDate,
        revokedAt: null,
        rotatedAt: null
      })
    );

    return { user: toAuthUserResponse(user), tokens: issued };
  }
}

function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException('Invalid email or password.');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? null : normalized;
}

function toAuthUserResponse(user: UserEntity): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null
  };
}
