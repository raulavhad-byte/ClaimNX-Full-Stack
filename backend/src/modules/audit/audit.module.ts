import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SharedModule } from '../../shared/shared.module';

import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditRepository,
  ],
  exports: [
    AuditService,
    AuditRepository,
  ],
})
export class AuditModule {}