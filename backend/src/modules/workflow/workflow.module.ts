import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { GetWorkItemUseCase } from './application/get-work-item.use-case';
import { GetWorkflowDefinitionUseCase } from './application/get-workflow-definition.use-case';
import { GetWorkflowInstanceUseCase } from './application/get-workflow-instance.use-case';
import { GetWorkflowQueueUseCase } from './application/get-workflow-queue.use-case';
import { WorkflowPlatformCommandUseCases } from './application/workflow-platform-command.use-cases';
import { WorkflowTenantAccessService } from './application/workflow-tenant-access.service';
import { WorkflowWorkItemCommandUseCases } from './application/workflow-work-item-command.use-cases';
import { WorkflowV1Controller } from './api/workflow-v1.controller';
import { WorkItemRepository } from './infrastructure/work-item.repository';
import { WorkflowDefinitionRepository } from './infrastructure/workflow-definition.repository';
import { WorkflowInstanceRepository } from './infrastructure/workflow-instance.repository';
import { WorkflowPlatformCommandRepository } from './infrastructure/workflow-platform-command.repository';
import { WorkflowQueueRepository } from './infrastructure/workflow-queue.repository';
import { WorkflowWorkItemCommandRepository } from './infrastructure/workflow-work-item-command.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkflowV1Controller],
  providers: [
    WorkflowTenantAccessService,
    WorkflowDefinitionRepository,
    WorkflowInstanceRepository,
    WorkflowQueueRepository,
    WorkItemRepository,
    WorkflowPlatformCommandRepository,
    WorkflowWorkItemCommandRepository,
    GetWorkflowDefinitionUseCase,
    GetWorkflowInstanceUseCase,
    GetWorkflowQueueUseCase,
    GetWorkItemUseCase,
    WorkflowPlatformCommandUseCases,
    WorkflowWorkItemCommandUseCases,
  ],
})
export class WorkflowModule {}
