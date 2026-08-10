import { Module } from '@nestjs/common';

import { SharedModule } from '../../shared/shared.module';
import { AutomationAccessService } from './application/automation-access.service';
import { AutomationManagementUseCases } from './application/automation-management.use-cases';
import { AutomationManagementRepository } from './infrastructure/automation-management.repository';
import { AutomationV1Controller } from './presentation/controllers/automation-v1.controller';

/** Phase 10 tenant-scoped automation command API. */
@Module({
  imports: [SharedModule],
  controllers: [AutomationV1Controller],
  providers: [AutomationAccessService, AutomationManagementRepository, AutomationManagementUseCases],
  exports: [AutomationManagementUseCases],
})
export class AutomationModule {}
