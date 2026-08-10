import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { WorkflowPlatformCommandRepository } from '../infrastructure/workflow-platform-command.repository';

import { WorkflowTenantAccessService } from './workflow-tenant-access.service';

export interface WorkflowDefinitionStateInput {
  code: string;
  name: string;
  displayOrder: number;
  slaTargetMinutes?: number | null;
  isInitial: boolean;
  isTerminal: boolean;
}

export interface WorkflowDefinitionTransitionInput {
  fromStateCode: string;
  toStateCode: string;
  requiresComment?: boolean;
  approvalRequired?: boolean;
}

export interface CreateWorkflowDefinitionCommand {
  actorUserId: string;
  code: string;
  name: string;
  description?: string | null;
  allowsReopen?: boolean;
  states: WorkflowDefinitionStateInput[];
  transitions?: WorkflowDefinitionTransitionInput[];
}

export interface DefinitionVersionCommand {
  actorUserId: string;
  workflowDefinitionId: string;
  version: number;
}

export interface StartWorkflowInstanceCommand {
  actorUserId: string;
  organizationId: string;
  instanceReference: string;
  workflowDefinitionId: string;
  hospitalId: string;
  sourceType: string;
  sourceId: string;
  priority?: string | null;
}

export interface TransitionWorkflowInstanceCommand {
  actorUserId: string;
  organizationId: string;
  workflowInstanceId: string;
  version: number;
  targetStateId: string;
  description?: string | null;
}

export interface CancelWorkflowInstanceCommand {
  actorUserId: string;
  organizationId: string;
  workflowInstanceId: string;
  version: number;
  closureReason: string;
}

export interface CreateWorkflowQueueCommand {
  actorUserId: string;
  organizationId: string;
  code: string;
  name: string;
  type: string;
  scopeHospitalId?: string | null;
}

export interface UpdateWorkflowQueueCommand extends CreateWorkflowQueueCommand {
  workflowQueueId: string;
  version: number;
}

export interface WorkflowQueueVersionCommand {
  actorUserId: string;
  organizationId: string;
  workflowQueueId: string;
  version: number;
}

@Injectable()
export class WorkflowPlatformCommandUseCases {
  constructor(
    private readonly repository: WorkflowPlatformCommandRepository,
    private readonly tenantAccess: WorkflowTenantAccessService,
  ) {}

  async createDefinition(
    command: CreateWorkflowDefinitionCommand,
  ): Promise<string> {
    const stateIds = new Map(
      command.states.map((state) => [state.code, randomUUID()]),
    );
    return this.repository.createDefinition({
      workflowDefinitionId: randomUUID(),
      code: command.code,
      name: command.name,
      description: command.description,
      allowsReopen: command.allowsReopen ?? false,
      actorUserId: command.actorUserId,
      states: command.states.map((state) => ({
        id: stateIds.get(state.code),
        code: state.code,
        name: state.name,
        display_order: state.displayOrder,
        sla_target_minutes: state.slaTargetMinutes ?? null,
        is_initial: state.isInitial,
        is_terminal: state.isTerminal,
      })),
      transitions: (command.transitions ?? []).map((transition) => ({
        id: randomUUID(),
        from_state_id: stateIds.get(transition.fromStateCode),
        to_state_id: stateIds.get(transition.toStateCode),
        requires_comment: transition.requiresComment ?? false,
        approval_required: transition.approvalRequired ?? false,
      })),
    });
  }

  async activateDefinition(command: DefinitionVersionCommand): Promise<string> {
    return this.requireMutation(
      await this.repository.activateDefinition(
        command.workflowDefinitionId,
        command.version,
        command.actorUserId,
      ),
      'Workflow Definition was changed, retired, or is no longer a draft. Refresh and retry.',
    );
  }

  async retireDefinition(command: DefinitionVersionCommand): Promise<string> {
    return this.requireMutation(
      await this.repository.retireDefinition(
        command.workflowDefinitionId,
        command.version,
        command.actorUserId,
      ),
      'Workflow Definition was changed, has active Instances, or is no longer available. Refresh and retry.',
    );
  }

  async startInstance(command: StartWorkflowInstanceCommand): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.repository.startInstance({
      ...command,
      workflowInstanceId: randomUUID(),
      workflowHistoryId: randomUUID(),
    });
  }

  async transitionInstance(
    command: TransitionWorkflowInstanceCommand,
  ): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.transitionInstance({
        ...command,
        expectedVersion: command.version,
        workflowHistoryId: randomUUID(),
      }),
      'Workflow Instance was changed, closed, cancelled, or is outside this Organization tenant. Refresh and retry.',
    );
  }

  async cancelInstance(
    command: CancelWorkflowInstanceCommand,
  ): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.cancelInstance({
        ...command,
        expectedVersion: command.version,
        workflowHistoryId: randomUUID(),
      }),
      'Workflow Instance was changed, closed, cancelled, or is outside this Organization tenant. Refresh and retry.',
    );
  }

  async createQueue(command: CreateWorkflowQueueCommand): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.repository.createQueue({
      ...command,
      workflowQueueId: randomUUID(),
    });
  }

  async updateQueue(command: UpdateWorkflowQueueCommand): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.updateQueue({
        ...command,
        expectedVersion: command.version,
      }),
      'Workflow Queue was changed, retired, or is outside this Organization tenant. Refresh and retry.',
    );
  }

  async activateQueue(command: WorkflowQueueVersionCommand): Promise<string> {
    return this.setQueueStatus(command, true);
  }

  async deactivateQueue(command: WorkflowQueueVersionCommand): Promise<string> {
    return this.setQueueStatus(command, false);
  }

  async retireQueue(command: WorkflowQueueVersionCommand): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.softDeleteQueue({
        ...command,
        expectedVersion: command.version,
      }),
      'Workflow Queue was changed, referenced by active Work Items, retired, or is outside this Organization tenant.',
    );
  }

  private async setQueueStatus(
    command: WorkflowQueueVersionCommand,
    isActive: boolean,
  ): Promise<string> {
    await this.assertMembership(command.actorUserId, command.organizationId);
    return this.requireMutation(
      await this.repository.setQueueStatus({
        ...command,
        expectedVersion: command.version,
        isActive,
      }),
      'Workflow Queue was changed, retired, or is outside this Organization tenant. Refresh and retry.',
    );
  }

  private async assertMembership(
    actorUserId: string,
    organizationId: string,
  ): Promise<void> {
    await this.tenantAccess.assertActiveMembership(actorUserId, organizationId);
  }

  private requireMutation(result: string | null, message: string): string {
    if (!result) throw new ConflictException(message);
    return result;
  }
}
