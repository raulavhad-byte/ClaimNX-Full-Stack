import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SharedModule } from '../../shared/shared.module';

import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
  ],

  controllers: [
    RolesController,
  ],

  providers: [
    RolesRepository,
    RolesService,
  ],

  exports: [
    RolesRepository,
    RolesService,
  ],
})
export class RolesModule {}