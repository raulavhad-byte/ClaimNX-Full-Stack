import { Injectable, NotFoundException } from '@nestjs/common';

import { WorkflowQueue } from '../domain/workflow-queue.aggregate';
import { WorkflowQueueRepository } from '../infrastructure/workflow-queue.repository';

import { WorkflowTenantAccessService } from './workflow-tenant-access.service';

export interface GetWorkflowQueueQuery {
  actorUserId: string;
  organizationId: string;
  workflowQueueId: string;
}

@Injectable()
export class GetWorkflowQueueUseCase {
  constructor(
    private readonly repository: WorkflowQueueRepository,
    private readonly tenantAccess: WorkflowTenantAccessService,
  ) {}

  async execute(query: GetWorkflowQueueQuery): Promise<WorkflowQueue> {
    await this.tenantAccess.assertActiveMembership(
      query.actorUserId,
      query.organizationId,
    );
    const queue = await this.repository.findActiveById(
      query.organizationId,
      query.workflowQueueId,
    );
    if (!queue)
      throw new NotFoundException(
        'Workflow Queue not found in the Organization tenant.',
      );
    return queue;
  }
}
