import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule } from '../../config/config.module';
import { DatabaseConfig } from '../../config/config.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      useFactory: (dbConfig: DatabaseConfig): TypeOrmModuleOptions => ({
        ...dbConfig,
        autoLoadEntities: true,
      }),
      inject: ['DATABASE_CONFIG'],
    }),
  ],
})
export class PostgresDatabaseModule {}
