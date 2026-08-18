import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SharedModule } from '../../shared/shared.module';

import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
    AuthModule,
    AuditModule,
  ],

  controllers: [
    UsersController,
  ],

  providers: [
    UsersService,
    UsersRepository,
  ],

  exports: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
