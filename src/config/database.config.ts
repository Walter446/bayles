import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const databaseConfig = (configService: ConfigService) => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST', 'localhost'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USER', 'postgres'),
  password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
  database: configService.get<string>('DATABASE_NAME', 'bayles_db'),
  synchronize: true,
  logging: true,
  entities: ['dist/**/*.entity{.ts,.js}'],
});
