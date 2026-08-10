import {
  WorkflowDefinition,
  WorkflowDefinitionProps,
  WorkflowState,
  WorkflowTransition,
  WorkflowUuid,
} from '../domain/workflow-definition.aggregate';
import {
  WorkflowInstance,
  WorkflowInstanceHistoryEvent,
  WorkflowInstanceProps,
} from '../domain/workflow-instance.aggregate';
import {
  WorkflowQueue,
  WorkflowQueueProps,
} from '../domain/workflow-queue.aggregate';
import {
  WorkItem,
  WorkItemHistoryEvent,
  WorkItemProps,
} from '../domain/work-item.aggregate';

type NullableTimestamp = string | null;

export interface WorkflowDefinitionPersistenceRow {
  id: WorkflowUuid;
  code: string;
  name: string;
  definition_version: number;
  status: WorkflowDefinitionProps['status'];
  version: number;
  deleted_at: NullableTimestamp;
}

export interface WorkflowStatePersistenceRow {
  id: WorkflowUuid;
  workflow_definition_id: WorkflowUuid;
  code: string;
  name: string;
  is_initial: boolean;
  is_terminal: boolean;
  version: number;
  deleted_at: NullableTimestamp;
}

export interface WorkflowTransitionPersistenceRow {
  id: WorkflowUuid;
  workflow_definition_id: WorkflowUuid;
  from_state_id: WorkflowUuid;
  to_state_id: WorkflowUuid;
  version: number;
  deleted_at: NullableTimestamp;
}

export interface WorkflowInstancePersistenceRow {
  id: WorkflowUuid;
  organization_id: WorkflowUuid;
  workflow_definition_id: WorkflowUuid;
  workflow_definition_version: number;
  current_state_id: WorkflowUuid;
  source_type: string;
  source_id: WorkflowUuid;
  status: WorkflowInstanceProps['status'];
  version: number;
  deleted_at: NullableTimestamp;
}

export interface WorkflowHistoryPersistenceRow {
  id: WorkflowUuid;
  organization_id: WorkflowUuid;
  workflow_instance_id: WorkflowUuid;
  event_type: string;
  occurred_at: string;
}

export interface WorkflowQueuePersistenceRow {
  id: WorkflowUuid;
  organization_id: WorkflowUuid;
  code: string;
  name: string;
  type: WorkflowQueueProps['type'];
  is_active: boolean;
  version: number;
  deleted_at: NullableTimestamp;
}

export interface WorkflowTaskPersistenceRow {
  id: WorkflowUuid;
  organization_id: WorkflowUuid;
  workflow_instance_id: WorkflowUuid;
  status: WorkItemProps['status'];
  title: string;
  version: number;
  queue_id: WorkflowUuid | null;
  assigned_organization_member_id: WorkflowUuid | null;
  deleted_at: NullableTimestamp;
}

export interface WorkflowTaskHistoryPersistenceRow {
  workflow_task_history_id: WorkflowUuid;
  organization_id: WorkflowUuid;
  workflow_task_id: WorkflowUuid;
  event_type: string;
  occurred_at: string;
}

const asDate = (value: NullableTimestamp): Date | null =>
  value ? new Date(value) : null;

/** Translates database-shaped records without placing SQL or persistence fields in aggregates. */
export class WorkflowDatabaseMapper {
  static toDefinition(
    root: WorkflowDefinitionPersistenceRow,
    states: WorkflowStatePersistenceRow[],
    transitions: WorkflowTransitionPersistenceRow[],
  ): WorkflowDefinition {
    return WorkflowDefinition.rehydrate(
      {
        workflowDefinitionId: root.id,
        code: root.code,
        name: root.name,
        definitionVersion: root.definition_version,
        status: root.status,
        version: root.version,
        deletedAt: asDate(root.deleted_at),
      },
      states.map((state) => WorkflowDatabaseMapper.toState(state)),
      transitions.map((transition) =>
        WorkflowDatabaseMapper.toTransition(transition),
      ),
    );
  }

  static toState(row: WorkflowStatePersistenceRow): WorkflowState {
    return {
      workflowStateId: row.id,
      workflowDefinitionId: row.workflow_definition_id,
      code: row.code,
      name: row.name,
      isInitial: row.is_initial,
      isTerminal: row.is_terminal,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    };
  }

  static toTransition(
    row: WorkflowTransitionPersistenceRow,
  ): WorkflowTransition {
    return {
      workflowTransitionId: row.id,
      workflowDefinitionId: row.workflow_definition_id,
      fromStateId: row.from_state_id,
      toStateId: row.to_state_id,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    };
  }

  static toInstance(
    root: WorkflowInstancePersistenceRow,
    history: WorkflowHistoryPersistenceRow[],
  ): WorkflowInstance {
    return WorkflowInstance.rehydrate(
      {
        workflowInstanceId: root.id,
        organizationId: root.organization_id,
        workflowDefinitionId: root.workflow_definition_id,
        workflowDefinitionVersion: root.workflow_definition_version,
        currentStateId: root.current_state_id,
        sourceType: root.source_type,
        sourceId: root.source_id,
        status: root.status,
        version: root.version,
        deletedAt: asDate(root.deleted_at),
      },
      history.map((event) => WorkflowDatabaseMapper.toInstanceHistory(event)),
    );
  }

  static toInstanceHistory(
    row: WorkflowHistoryPersistenceRow,
  ): WorkflowInstanceHistoryEvent {
    return {
      workflowHistoryId: row.id,
      organizationId: row.organization_id,
      workflowInstanceId: row.workflow_instance_id,
      eventType: row.event_type,
      occurredAt: new Date(row.occurred_at),
    };
  }

  static toQueue(row: WorkflowQueuePersistenceRow): WorkflowQueue {
    return WorkflowQueue.rehydrate({
      workflowQueueId: row.id,
      organizationId: row.organization_id,
      code: row.code,
      name: row.name,
      type: row.type,
      isActive: row.is_active,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    });
  }

  static toWorkItem(
    root: WorkflowTaskPersistenceRow,
    history: WorkflowTaskHistoryPersistenceRow[],
  ): WorkItem {
    return WorkItem.rehydrate(
      {
        workflowTaskId: root.id,
        organizationId: root.organization_id,
        workflowInstanceId: root.workflow_instance_id,
        status: root.status,
        title: root.title,
        version: root.version,
        queueId: root.queue_id,
        assignedOrganizationMemberId: root.assigned_organization_member_id,
        deletedAt: asDate(root.deleted_at),
      },
      history.map((event) => WorkflowDatabaseMapper.toWorkItemHistory(event)),
    );
  }

  static toWorkItemHistory(
    row: WorkflowTaskHistoryPersistenceRow,
  ): WorkItemHistoryEvent {
    return {
      workflowTaskHistoryId: row.workflow_task_history_id,
      organizationId: row.organization_id,
      workflowTaskId: row.workflow_task_id,
      eventType: row.event_type,
      occurredAt: new Date(row.occurred_at),
    };
  }
}
