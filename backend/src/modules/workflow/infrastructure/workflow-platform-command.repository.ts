import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class WorkflowPlatformCommandRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async createDefinition(input: {
    workflowDefinitionId: string;
    code: string;
    name: string;
    description?: string | null;
    allowsReopen: boolean;
    actorUserId: string;
    states: object[];
    transitions: object[];
  }): Promise<string> {
    return this.requireResult(
      await this.call('create_workflow_definition', {
        p_workflow_definition_id: input.workflowDefinitionId,
        p_code: input.code,
        p_name: input.name,
        p_description: input.description ?? null,
        p_allows_reopen: input.allowsReopen,
        p_actor_user_id: input.actorUserId,
        p_states: input.states,
        p_transitions: input.transitions,
      }),
      'Workflow Definition creation did not return an identifier.',
    );
  }

  async activateDefinition(
    workflowDefinitionId: string,
    expectedVersion: number,
    actorUserId: string,
  ): Promise<string | null> {
    return this.call('activate_workflow_definition', {
      p_workflow_definition_id: workflowDefinitionId,
      p_expected_version: expectedVersion,
      p_actor_user_id: actorUserId,
    });
  }

  async retireDefinition(
    workflowDefinitionId: string,
    expectedVersion: number,
    actorUserId: string,
  ): Promise<string | null> {
    return this.call('retire_workflow_definition', {
      p_workflow_definition_id: workflowDefinitionId,
      p_expected_version: expectedVersion,
      p_actor_user_id: actorUserId,
    });
  }

  async startInstance(input: {
    workflowInstanceId: string;
    workflowHistoryId: string;
    organizationId: string;
    instanceReference: string;
    workflowDefinitionId: string;
    hospitalId: string;
    sourceType: string;
    sourceId: string;
    priority?: string | null;
    actorUserId: string;
  }): Promise<string> {
    return this.requireResult(
      await this.call('start_workflow_instance', {
        p_workflow_instance_id: input.workflowInstanceId,
        p_workflow_history_id: input.workflowHistoryId,
        p_organization_id: input.organizationId,
        p_instance_reference: input.instanceReference,
        p_workflow_definition_id: input.workflowDefinitionId,
        p_hospital_id: input.hospitalId,
        p_source_type: input.sourceType,
        p_source_id: input.sourceId,
        p_priority: input.priority ?? null,
        p_actor_user_id: input.actorUserId,
      }),
      'Workflow Instance creation did not return an identifier.',
    );
  }

  async transitionInstance(input: {
    workflowInstanceId: string;
    workflowHistoryId: string;
    organizationId: string;
    expectedVersion: number;
    targetStateId: string;
    description?: string | null;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('transition_workflow_instance', {
      p_workflow_instance_id: input.workflowInstanceId,
      p_workflow_history_id: input.workflowHistoryId,
      p_organization_id: input.organizationId,
      p_expected_version: input.expectedVersion,
      p_target_state_id: input.targetStateId,
      p_description: input.description ?? null,
      p_actor_user_id: input.actorUserId,
    });
  }

  async cancelInstance(input: {
    workflowInstanceId: string;
    workflowHistoryId: string;
    organizationId: string;
    expectedVersion: number;
    closureReason: string;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('cancel_workflow_instance', {
      p_workflow_instance_id: input.workflowInstanceId,
      p_workflow_history_id: input.workflowHistoryId,
      p_organization_id: input.organizationId,
      p_expected_version: input.expectedVersion,
      p_closure_reason: input.closureReason,
      p_actor_user_id: input.actorUserId,
    });
  }

  async createQueue(input: {
    workflowQueueId: string;
    organizationId: string;
    code: string;
    name: string;
    type: string;
    scopeHospitalId?: string | null;
    actorUserId: string;
  }): Promise<string> {
    return this.requireResult(
      await this.call('create_workflow_queue', {
        p_workflow_queue_id: input.workflowQueueId,
        p_organization_id: input.organizationId,
        p_code: input.code,
        p_name: input.name,
        p_type: input.type,
        p_scope_hospital_id: input.scopeHospitalId ?? null,
        p_actor_user_id: input.actorUserId,
      }),
      'Workflow Queue creation did not return an identifier.',
    );
  }

  async updateQueue(input: {
    workflowQueueId: string;
    organizationId: string;
    expectedVersion: number;
    code: string;
    name: string;
    type: string;
    scopeHospitalId?: string | null;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('update_workflow_queue', {
      p_workflow_queue_id: input.workflowQueueId,
      p_organization_id: input.organizationId,
      p_expected_version: input.expectedVersion,
      p_code: input.code,
      p_name: input.name,
      p_type: input.type,
      p_scope_hospital_id: input.scopeHospitalId ?? null,
      p_actor_user_id: input.actorUserId,
    });
  }

  async setQueueStatus(input: {
    workflowQueueId: string;
    organizationId: string;
    expectedVersion: number;
    isActive: boolean;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('set_workflow_queue_status', {
      p_workflow_queue_id: input.workflowQueueId,
      p_organization_id: input.organizationId,
      p_expected_version: input.expectedVersion,
      p_is_active: input.isActive,
      p_actor_user_id: input.actorUserId,
    });
  }

  async softDeleteQueue(input: {
    workflowQueueId: string;
    organizationId: string;
    expectedVersion: number;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('soft_delete_workflow_queue', {
      p_workflow_queue_id: input.workflowQueueId,
      p_organization_id: input.organizationId,
      p_expected_version: input.expectedVersion,
      p_actor_user_id: input.actorUserId,
    });
  }

  private async call(
    functionName: string,
    parameters: Record<string, unknown>,
  ): Promise<string | null> {
    const response = await this.databaseService
      .getClient()
      .rpc(functionName, parameters);
    if (response.error) throw response.error;
    return response.data as string | null;
  }

  private requireResult(result: string | null, message: string): string {
    if (!result) throw new Error(message);
    return result;
  }
}
