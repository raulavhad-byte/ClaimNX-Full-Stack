import { Injectable, NotFoundException } from '@nestjs/common';

import { WorkflowInstance } from '../domain/workflow-instance.aggregate';
import { WorkflowInstanceRepository } from '../infrastructure/workflow-instance.repository';

import { WorkflowTenantAccessService } from './workflow-tenant-access.service';

export interface GetWorkflowInstanceQuery {
  actorUserId: string;
  organizationId: string;
  workflowInstanceId: string;
}

@Injectable()
export class GetWorkflowInstanceUseCase {
  constructor(
    private readonly repository: WorkflowInstanceRepository,
    private readonly tenantAccess: WorkflowTenantAccessService,
  ) {}

  async execute(query: GetWorkflowInstanceQuery): Promise<WorkflowInstance> {
    await this.tenantAccess.assertActiveMembership(
      query.actorUserId,
      query.organizationId,
    );
    const instance = await this.repository.findActiveById(
      query.organizationId,
      query.workflowInstanceId,
    );
    if (!instance) {
      throw new NotFoundException(
        'Workflow Instance not found in the Organization tenant.',
      );
    }
    return instance;
  }
}
