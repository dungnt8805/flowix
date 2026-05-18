import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  entities: string[];
  migrations: string[];
  migrationsRun: boolean;
  synchronize: boolean;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
      ],
      cache: true,
    }),
  ],
  providers: [
    {
      provide: 'DATABASE_CONFIG',
      useFactory: (configService: ConfigService): DatabaseConfig => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: Number(configService.get('DATABASE_PORT', 5432)),
        database: configService.get<string>('DATABASE_NAME', 'flo_vis'),
        username: configService.get<string>('DATABASE_USERNAME', 'postgres'),
        password: configService.get<string>('DATABASE_PASSWORD', 'password'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [
          __dirname + '/../database/migrations/*{.ts,.js}',
        ],
        migrationsRun: true,
        synchronize: false,
      }),
      inject: [ConfigService],
    },
  ],
  exports: ['DATABASE_CONFIG'],
})
export class ConfigModule {}
