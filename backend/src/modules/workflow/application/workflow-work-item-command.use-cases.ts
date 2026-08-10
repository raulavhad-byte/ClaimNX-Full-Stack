import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { WorkflowWorkItemCommandRepository } from '../infrastructure/workflow-work-item-command.repository';

import { WorkflowTenantAccessService } from './workflow-tenant-access.service';

export interface CreateWorkItemCommand {
  actorUserId: string;
  organizationId: string;
  workflowInstanceId: string;
  workflowStateId?: string | null;
  type: string;
  title: string;
  description?: string | null;
  queueId?: string | null;
  assignedOrganizationMemberId?: string | null;
  priority?: string | null;
  slaTargetMinutes?: number | null;
}

export interface AssignWorkItemCommand {
  actorUserId: string;
  organizationId: string;
  workflowTaskId: string;
  version: number;
  queueId?: string | null;
  assignedOrganizationMemberId?: string | null;
}

export interface TransitionWorkItemCommand {
  actorUserId: string;
  organizationId: string;
  workflowTaskId: string;
  version: number;
  targetStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  description?: string | null;
}

export interface UpdateWorkItemSlaCommand {
  actorUserId: string;
  organizationId: string;
  workflowTaskId: string;
  workflowSlaId: string;
  workItemVersion: number;
  slaVersion: number;
  targetMinutes: number;
  pause: boolean;
  pauseReason?: string | null;
}

export interface RetireWorkItemCommand {
  actorUserId: string;
  organizationId: string;
  workflowTaskId: string;
  version: number;
}

export interface CreateWorkItemResult {
  workflowTaskId: string;
  workflowSlaId: string | null;
}

@Injectable()
export class WorkflowWorkItemCommandUseCases {
  constructor(
    private readonly repository: WorkflowWorkItemCommandRepository,
    private readonly tenantAccess: WorkflowTenantAccessService,
  ) {}

  async create(command: CreateWorkItemCommand): Promise<CreateWorkItemResult> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    const workflowTaskId = randomUUID();
    const workflowSlaId = command.slaTargetMinutes ? randomUUID() : null;
    const result = await this.repository.create({
      ...command,
      workflowTaskId,
      workflowTaskHistoryId: randomUUID(),
      workflowSlaId,
    });
    return {
      workflowTaskId: this.requireMutation(result),
      workflowSlaId,
    };
  }

  async assign(command: AssignWorkItemCommand): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.assign({
        ...command,
        expectedVersion: command.version,
        workflowTaskHistoryId: randomUUID(),
      }),
    );
  }

  async transition(command: TransitionWorkItemCommand): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.transition({
        ...command,
        expectedVersion: command.version,
        workflowTaskHistoryId: randomUUID(),
      }),
    );
  }

  async updateSla(command: UpdateWorkItemSlaCommand): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.updateSla({
        ...command,
        expectedWorkItemVersion: command.workItemVersion,
        expectedSlaVersion: command.slaVersion,
        workflowTaskHistoryId: randomUUID(),
      }),
    );
  }

  async retire(command: RetireWorkItemCommand): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.softDelete({
        ...command,
        expectedVersion: command.version,
        workflowTaskHistoryId: randomUUID(),
      }),
    );
  }

  private async assertMembership(
    actorUserId: string,
    organizationId: string,
  ): Promise<void> {
    await this.tenantAccess.assertActiveMembership(actorUserId, organizationId);
  }

  private requireMutation(result: string | null): string {
    if (!result) {
      throw new ConflictException(
        'The Work Item was changed, retired, or is outside this Organization tenant. Refresh and retry.',
      );
    }
    return result;
  }
}
