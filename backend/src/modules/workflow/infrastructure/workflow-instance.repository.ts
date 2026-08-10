import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { WorkflowInstance } from '../domain/workflow-instance.aggregate';

import {
  WorkflowDatabaseMapper,
  WorkflowInstancePersistenceRow,
} from './workflow-database.mapper';

@Injectable()
export class WorkflowInstanceRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveById(
    organizationId: string,
    workflowInstanceId: string,
  ): Promise<WorkflowInstance | null> {
    const client = this.databaseService.getClient();
    const { data: root, error: rootError } = await client
      .from('workflow_instances')
      .select(
        'id, organization_id, workflow_definition_id, workflow_definition_version, current_state_id, source_type, source_id, status, version, deleted_at',
      )
      .eq('id', workflowInstanceId)
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<WorkflowInstancePersistenceRow>();
    if (rootError) throw rootError;
    if (!root) return null;

    const { data: history, error: historyError } = await client
      .from('workflow_history')
      .select(
        'id, organization_id, workflow_instance_id, event_type, occurred_at',
      )
      .eq('organization_id', organizationId)
      .eq('workflow_instance_id', workflowInstanceId)
      .eq('is_deleted', false)
      .order('occurred_at', { ascending: true });
    if (historyError) throw historyError;
    return WorkflowDatabaseMapper.toInstance(root, history ?? []);
  }
}
