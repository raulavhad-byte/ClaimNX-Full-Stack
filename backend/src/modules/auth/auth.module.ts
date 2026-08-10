import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { DatabaseModule } from '../../database/database.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { StringValue } from 'ms';
import { SupabaseAuthService } from './supabase-auth.service';
import { UserSessionsRepository } from './user-sessions.repository';
import { SharedModule } from '../../shared/shared.module';
import { DeviceDetectorService } from './device-detector.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditModule } from '../audit/audit.module';


@Module({
  imports: [
    ConfigModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    DatabaseModule,
    SharedModule,
    AuditModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),

        signOptions: {
          expiresIn: configService.getOrThrow('JWT_EXPIRES_IN') as StringValue,
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
  AuthService,
  JwtStrategy,
  JwtAuthGuard,
  PermissionsGuard,
  SupabaseAuthService,
  UserSessionsRepository,
  DeviceDetectorService,
],

  exports: [
    AuthService,
    JwtModule,
    PassportModule,    
    
  ],
})
export class AuthModule {}