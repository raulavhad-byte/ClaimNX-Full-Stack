import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SharedModule } from '../../shared/shared.module';

import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './permissions.repository';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
  ],
  controllers: [
    PermissionsController,
  ],
  providers: [
    PermissionsRepository,
    PermissionsService,
  ],
  exports: [
    PermissionsRepository,
    PermissionsService,
  ],
})
export class PermissionsModule {}