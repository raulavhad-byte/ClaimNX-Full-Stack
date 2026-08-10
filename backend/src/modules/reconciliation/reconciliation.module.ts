import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';

import { SharedModule } from '../../shared/shared.module';

import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationRepository } from './reconciliation.repository';

@Module({
  imports: [
    SharedModule,
    AuditModule,
  ],
  controllers: [ReconciliationController],
  providers: [
    ReconciliationService,
    ReconciliationRepository,
  ],
})
export class ReconciliationModule {}