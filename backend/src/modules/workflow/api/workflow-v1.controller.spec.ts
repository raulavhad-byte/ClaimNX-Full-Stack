import { WorkflowV1Controller } from './workflow-v1.controller';

describe('WorkflowV1Controller', () => {
  it('passes the authenticated actor and tenant path to Work Item creation', async () => {
    const platformCommands = {};
    const workItemCommands = {
      create: jest.fn().mockResolvedValue({
        workflowTaskId: 'work-item-id',
        workflowSlaId: 'sla-id',
      }),
    };
    const controller = new WorkflowV1Controller(
      platformCommands as never,
      workItemCommands as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      controller.createWorkItem('organization-id', 'actor-id', {
        workflowInstanceId: 'instance-id',
        type: 'STANDARD',
        title: 'Review document',
      }),
    ).resolves.toEqual({
      workflowTaskId: 'work-item-id',
      workflowSlaId: 'sla-id',
    });

    expect(workItemCommands.create).toHaveBeenCalledWith({
      actorUserId: 'actor-id',
      organizationId: 'organization-id',
      workflowInstanceId: 'instance-id',
      type: 'STANDARD',
      title: 'Review document',
    });
  });

  it('returns the Workflow Definition graph required by transition clients', async () => {
    const definition = {
      snapshot: { workflowDefinitionId: 'definition-id', status: 'DRAFT' },
      workflowStates: [{ workflowStateId: 'state-id', code: 'OPEN' }],
      workflowTransitions: [
        {
          workflowTransitionId: 'transition-id',
          fromStateId: 'state-id',
          toStateId: 'state-id-2',
        },
      ],
    };
    const getDefinition = { execute: jest.fn().mockResolvedValue(definition) };
    const controller = new WorkflowV1Controller(
      {} as never,
      {} as never,
      getDefinition as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      controller.getDefinitionById('definition-id'),
    ).resolves.toEqual({
      ...definition.snapshot,
      states: definition.workflowStates,
      transitions: definition.workflowTransitions,
    });
  });
});
