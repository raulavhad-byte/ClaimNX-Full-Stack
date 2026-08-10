import { WorkflowDatabaseMapper } from './workflow-database.mapper';

describe('WorkflowDatabaseMapper', () => {
  it('rehydrates a Definition with its State graph', () => {
    const definition = WorkflowDatabaseMapper.toDefinition(
      {
        id: 'definition-1',
        code: 'CLAIM',
        name: 'Claim',
        definition_version: 1,
        status: 'ACTIVE',
        version: 1,
        deleted_at: null,
      },
      [
        {
          id: 'state-1',
          workflow_definition_id: 'definition-1',
          code: 'OPEN',
          name: 'Open',
          is_initial: true,
          is_terminal: false,
          version: 1,
          deleted_at: null,
        },
      ],
      [],
    );
    expect(definition.id).toBe('definition-1');
    expect(definition.workflowStates).toHaveLength(1);
  });

  it('rehydrates tenant-bound Work Items and their history', () => {
    const workItem = WorkflowDatabaseMapper.toWorkItem(
      {
        id: 'task-1',
        organization_id: 'org-1',
        workflow_instance_id: 'instance-1',
        status: 'OPEN',
        title: 'Review claim',
        version: 1,
        queue_id: 'queue-1',
        assigned_organization_member_id: null,
        deleted_at: null,
      },
      [
        {
          workflow_task_history_id: 'history-1',
          organization_id: 'org-1',
          workflow_task_id: 'task-1',
          event_type: 'CREATED',
          occurred_at: '2026-07-30T00:00:00.000Z',
        },
      ],
    );
    expect(workItem.snapshot.organizationId).toBe('org-1');
    expect(workItem.events).toHaveLength(1);
  });
});
