import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class WorkflowWorkItemCommandRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(input: {
    workflowTaskId: string;
    workflowTaskHistoryId: string;
    workflowSlaId?: string | null;
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
    actorUserId: string;
  }): Promise<string> {
    const result = await this.call('create_work_item', {
      p_workflow_task_id: input.workflowTaskId,
      p_workflow_task_history_id: input.workflowTaskHistoryId,
      p_workflow_sla_id: input.workflowSlaId ?? null,
      p_organization_id: input.organizationId,
      p_workflow_instance_id: input.workflowInstanceId,
      p_workflow_state_id: input.workflowStateId ?? null,
      p_type: input.type,
      p_title: input.title,
      p_description: input.description ?? null,
      p_queue_id: input.queueId ?? null,
      p_assigned_organization_member_id:
        input.assignedOrganizationMemberId ?? null,
      p_priority: input.priority ?? null,
      p_sla_target_minutes: input.slaTargetMinutes ?? null,
      p_actor_user_id: input.actorUserId,
    });
    if (!result) {
      throw new Error('Work Item creation did not return an identifier.');
    }
    return result;
  }

  async assign(input: {
    workflowTaskId: string;
    workflowTaskHistoryId: string;
    organizationId: string;
    expectedVersion: number;
    queueId?: string | null;
    assignedOrganizationMemberId?: string | null;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('assign_work_item', {
      p_workflow_task_id: input.workflowTaskId,
      p_workflow_task_history_id: input.workflowTaskHistoryId,
      p_organization_id: input.organizationId,
      p_expected_version: input.expectedVersion,
      p_queue_id: input.queueId ?? null,
      p_assigned_organization_member_id:
        input.assignedOrganizationMemberId ?? null,
      p_actor_user_id: input.actorUserId,
    });
  }

  async transition(input: {
    workflowTaskId: string;
    workflowTaskHistoryId: string;
    organizationId: string;
    expectedVersion: number;
    targetStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    description?: string | null;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('transition_work_item', {
      p_workflow_task_id: input.workflowTaskId,
      p_workflow_task_history_id: input.workflowTaskHistoryId,
      p_organization_id: input.organizationId,
      p_expected_version: input.expectedVersion,
      p_target_status: input.targetStatus,
      p_description: input.description ?? null,
      p_actor_user_id: input.actorUserId,
    });
  }

  async updateSla(input: {
    workflowTaskId: string;
    workflowSlaId: string;
    workflowTaskHistoryId: string;
    organizationId: string;
    expectedWorkItemVersion: number;
    expectedSlaVersion: number;
    targetMinutes: number;
    pause: boolean;
    pauseReason?: string | null;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('update_work_item_sla', {
      p_workflow_task_id: input.workflowTaskId,
      p_workflow_sla_id: input.workflowSlaId,
      p_workflow_task_history_id: input.workflowTaskHistoryId,
      p_organization_id: input.organizationId,
      p_expected_work_item_version: input.expectedWorkItemVersion,
      p_expected_sla_version: input.expectedSlaVersion,
      p_target_minutes: input.targetMinutes,
      p_pause: input.pause,
      p_pause_reason: input.pauseReason ?? null,
      p_actor_user_id: input.actorUserId,
    });
  }

  async softDelete(input: {
    workflowTaskId: string;
    workflowTaskHistoryId: string;
    organizationId: string;
    expectedVersion: number;
    actorUserId: string;
  }): Promise<string | null> {
    return this.call('soft_delete_work_item', {
      p_workflow_task_id: input.workflowTaskId,
      p_workflow_task_history_id: input.workflowTaskHistoryId,
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
}
