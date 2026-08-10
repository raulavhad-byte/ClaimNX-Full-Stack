import {
  WorkflowDefinition,
  WorkflowDomainError,
  WorkflowState,
  WorkflowTransition,
} from './workflow-definition.aggregate';
import { WorkflowInstance } from './workflow-instance.aggregate';
import { WorkflowQueue } from './workflow-queue.aggregate';
import { WorkItem } from './work-item.aggregate';

const definitionId = 'definition-1';
const state = (id: string, initial = false): WorkflowState => ({
  workflowStateId: id,
  workflowDefinitionId: definitionId,
  code: id,
  name: id,
  isInitial: initial,
  isTerminal: false,
  version: 1,
});
const transition = (
  id: string,
  fromStateId: string,
  toStateId: string,
): WorkflowTransition => ({
  workflowTransitionId: id,
  workflowDefinitionId: definitionId,
  fromStateId,
  toStateId,
  version: 1,
});

describe('Workflow Platform domain aggregates', () => {
  it('requires a single active initial State before a Definition starts Instances', () => {
    const definition = WorkflowDefinition.create({
      workflowDefinitionId: definitionId,
      code: 'CLAIM',
      name: 'Claim',
      definitionVersion: 1,
      status: 'ACTIVE',
      version: 1,
    });
    expect(() => definition.assertCanStartInstances()).toThrow(
      WorkflowDomainError,
    );
    definition.addState(state('opened', true));
    expect(() => definition.assertCanStartInstances()).not.toThrow();
  });

  it('rejects a transition that crosses definitions or loops to itself', () => {
    const definition = WorkflowDefinition.create({
      workflowDefinitionId: definitionId,
      code: 'CLAIM',
      name: 'Claim',
      definitionVersion: 1,
      status: 'DRAFT',
      version: 1,
    });
    definition.addState(state('opened', true));
    definition.addState(state('review'));
    expect(() =>
      definition.addTransition(transition('loop', 'opened', 'opened')),
    ).toThrow(WorkflowDomainError);
    expect(() =>
      definition.addTransition({
        ...transition('other', 'opened', 'review'),
        workflowDefinitionId: 'another-definition',
      }),
    ).toThrow(WorkflowDomainError);
  });

  it('protects tenant ownership of Instance and Work Item history', () => {
    const instance = WorkflowInstance.create({
      workflowInstanceId: 'instance-1',
      organizationId: 'org-1',
      workflowDefinitionId: definitionId,
      workflowDefinitionVersion: 1,
      currentStateId: 'opened',
      sourceType: 'CLAIM',
      sourceId: 'claim-1',
      status: 'OPEN',
      version: 1,
    });
    expect(() =>
      instance.recordHistory({
        workflowHistoryId: 'history-1',
        organizationId: 'org-2',
        workflowInstanceId: 'instance-1',
        eventType: 'STARTED',
        occurredAt: new Date(),
      }),
    ).toThrow(WorkflowDomainError);

    const workItem = WorkItem.create({
      workflowTaskId: 'task-1',
      organizationId: 'org-1',
      workflowInstanceId: 'instance-1',
      status: 'OPEN',
      title: 'Review',
      version: 1,
    });
    expect(() =>
      workItem.recordHistory({
        workflowTaskHistoryId: 'task-history-1',
        organizationId: 'org-1',
        workflowTaskId: 'task-2',
        eventType: 'CREATED',
        occurredAt: new Date(),
      }),
    ).toThrow(WorkflowDomainError);
  });

  it('rejects assignments to inactive queues or members and updates to completed Work Items', () => {
    const inactiveQueue = WorkflowQueue.create({
      workflowQueueId: 'queue-1',
      organizationId: 'org-1',
      code: 'REVIEW',
      name: 'Review',
      type: 'GENERAL',
      isActive: false,
      version: 1,
    });
    expect(() => inactiveQueue.assertCanReceiveWork()).toThrow(
      WorkflowDomainError,
    );
    const workItem = WorkItem.create({
      workflowTaskId: 'task-1',
      organizationId: 'org-1',
      workflowInstanceId: 'instance-1',
      status: 'COMPLETED',
      title: 'Review',
      version: 1,
      queueId: 'queue-1',
    });
    expect(() => workItem.assertCanAssign(false, true)).toThrow(
      WorkflowDomainError,
    );
  });
});
