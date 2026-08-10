import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { WorkItem } from '../domain/work-item.aggregate';

import {
  WorkflowDatabaseMapper,
  WorkflowTaskPersistenceRow,
} from './workflow-database.mapper';

@Injectable()
export class WorkItemRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveById(
    organizationId: string,
    workflowTaskId: string,
  ): Promise<WorkItem | null> {
    const client = this.databaseService.getClient();
    const { data: root, error: rootError } = await client
      .from('workflow_tasks')
      .select(
        'id, organization_id, workflow_instance_id, status, title, version, queue_id, assigned_organization_member_id, deleted_at',
      )
      .eq('id', workflowTaskId)
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<WorkflowTaskPersistenceRow>();
    if (rootError) throw rootError;
    if (!root) return null;

    const { data: history, error: historyError } = await client
      .from('workflow_task_history')
      .select(
        'workflow_task_history_id, organization_id, workflow_task_id, event_type, occurred_at',
      )
      .eq('organization_id', organizationId)
      .eq('workflow_task_id', workflowTaskId)
      .eq('is_deleted', false)
      .order('occurred_at', { ascending: true });
    if (historyError) throw historyError;
    return WorkflowDatabaseMapper.toWorkItem(root, history ?? []);
  }
}
