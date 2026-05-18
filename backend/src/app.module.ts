import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { PostgresDatabaseModule } from './database/postgres/postgres.module';
import { HeaderAuthGuard } from './common/auth/header-auth.guard';
import { BaselineRateLimitGuard } from './common/rate-limit/baseline-rate-limit.guard';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { DiagramsModule } from './modules/diagrams/diagrams.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule,
    PostgresDatabaseModule,
    AuthModule,
    AuditModule,
    HealthModule,
    WorkspacesModule,
    DiagramsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: HeaderAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: BaselineRateLimitGuard
    }
  ]
})
export class AppModule {}
