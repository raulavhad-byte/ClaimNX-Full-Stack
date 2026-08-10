import { Injectable, NotFoundException } from '@nestjs/common';

import { WorkItem } from '../domain/work-item.aggregate';
import { WorkItemRepository } from '../infrastructure/work-item.repository';

import { WorkflowTenantAccessService } from './workflow-tenant-access.service';

export interface GetWorkItemQuery {
  actorUserId: string;
  organizationId: string;
  workflowTaskId: string;
}

@Injectable()
export class GetWorkItemUseCase {
  constructor(
    private readonly repository: WorkItemRepository,
    private readonly tenantAccess: WorkflowTenantAccessService,
  ) {}

  async execute(query: GetWorkItemQuery): Promise<WorkItem> {
    await this.tenantAccess.assertActiveMembership(
      query.actorUserId,
      query.organizationId,
    );
    const workItem = await this.repository.findActiveById(
      query.organizationId,
      query.workflowTaskId,
    );
    if (!workItem)
      throw new NotFoundException(
        'Work Item not found in the Organization tenant.',
      );
    return workItem;
  }
}
