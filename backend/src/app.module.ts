import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeaderAuthGuard } from './common/auth/header-auth.guard';
import { BaselineRateLimitGuard } from './common/rate-limit/baseline-rate-limit.guard';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { DiagramsModule } from './modules/diagrams/diagrams.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false
    }),
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
