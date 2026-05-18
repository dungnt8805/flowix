import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCryptoService } from './application/auth-crypto.service';
import { AuthTokenService } from './application/auth-token.service';
import { AuthService } from './application/auth.service';
import { CurrentUserSyncService } from './application/current-user-sync.service';
import { UserAuthMethodEntity } from './infrastructure/persistence/user-auth-method.entity';
import { UserCredentialEntity } from './infrastructure/persistence/user-credential.entity';
import { UserSecurityTokenEntity } from './infrastructure/persistence/user-security-token.entity';
import { UserSessionEntity } from './infrastructure/persistence/user-session.entity';
import { PublicAuthController } from './presentation/public-auth.controller';
import { ProtectedAuthController } from './presentation/protected-auth.controller';
import { UserEntity } from '../users/infrastructure/persistence/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserCredentialEntity,
      UserAuthMethodEntity,
      UserSessionEntity,
      UserSecurityTokenEntity
    ])
  ],
  controllers: [PublicAuthController, ProtectedAuthController],
  providers: [AuthCryptoService, AuthTokenService, AuthService, CurrentUserSyncService],
  exports: [TypeOrmModule, AuthTokenService, CurrentUserSyncService]
})
export class AuthModule {}
