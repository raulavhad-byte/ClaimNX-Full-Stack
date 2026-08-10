import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { WorkflowDefinition } from '../domain/workflow-definition.aggregate';

import {
  WorkflowDatabaseMapper,
  WorkflowDefinitionPersistenceRow,
} from './workflow-database.mapper';

@Injectable()
export class WorkflowDefinitionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveById(
    workflowDefinitionId: string,
  ): Promise<WorkflowDefinition | null> {
    const client = this.databaseService.getClient();
    const { data: root, error: rootError } = await client
      .from('workflow_definitions')
      .select('id, code, name, definition_version, status, version, deleted_at')
      .eq('id', workflowDefinitionId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<WorkflowDefinitionPersistenceRow>();
    if (rootError) throw rootError;
    if (!root) return null;

    const [statesResult, transitionsResult] = await Promise.all([
      client
        .from('workflow_states')
        .select(
          'id, workflow_definition_id, code, name, is_initial, is_terminal, version, deleted_at',
        )
        .eq('workflow_definition_id', workflowDefinitionId)
        .eq('is_deleted', false),
      client
        .from('workflow_transitions')
        .select(
          'id, workflow_definition_id, from_state_id, to_state_id, version, deleted_at',
        )
        .eq('workflow_definition_id', workflowDefinitionId)
        .eq('is_deleted', false),
    ]);
    if (statesResult.error) throw statesResult.error;
    if (transitionsResult.error) throw transitionsResult.error;

    return WorkflowDatabaseMapper.toDefinition(
      root,
      statesResult.data ?? [],
      transitionsResult.data ?? [],
    );
  }
}
