import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { WorkflowQueue } from '../domain/workflow-queue.aggregate';

import {
  WorkflowDatabaseMapper,
  WorkflowQueuePersistenceRow,
} from './workflow-database.mapper';

@Injectable()
export class WorkflowQueueRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveById(
    organizationId: string,
    workflowQueueId: string,
  ): Promise<WorkflowQueue | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('workflow_queues')
      .select(
        'id, organization_id, code, name, type, is_active, version, deleted_at',
      )
      .eq('id', workflowQueueId)
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<WorkflowQueuePersistenceRow>();
    if (error) throw error;
    return data ? WorkflowDatabaseMapper.toQueue(data) : null;
  }
}
