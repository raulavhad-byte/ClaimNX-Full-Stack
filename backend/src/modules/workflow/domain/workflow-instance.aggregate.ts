import {
  WorkflowDomainError,
  WorkflowUuid,
} from './workflow-definition.aggregate';

export interface WorkflowInstanceProps {
  workflowInstanceId: WorkflowUuid;
  organizationId: WorkflowUuid;
  workflowDefinitionId: WorkflowUuid;
  workflowDefinitionVersion: number;
  currentStateId: WorkflowUuid;
  sourceType: string;
  sourceId: WorkflowUuid;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  version: number;
  deletedAt?: Date | null;
}

export interface WorkflowInstanceHistoryEvent {
  workflowHistoryId: WorkflowUuid;
  organizationId: WorkflowUuid;
  workflowInstanceId: WorkflowUuid;
  eventType: string;
  occurredAt: Date;
}

/** Organization-scoped execution aggregate. History is append-only. */
export class WorkflowInstance {
  private readonly history: WorkflowInstanceHistoryEvent[];

  private constructor(
    private readonly props: WorkflowInstanceProps,
    history: WorkflowInstanceHistoryEvent[] = [],
  ) {
    this.assertRootIsValid();
    this.history = history.map((event) => ({ ...event }));
    this.history.forEach((event) => this.assertOwnedHistory(event));
  }

  static create(props: WorkflowInstanceProps): WorkflowInstance {
    return new WorkflowInstance(props);
  }

  static rehydrate(
    props: WorkflowInstanceProps,
    history: WorkflowInstanceHistoryEvent[],
  ): WorkflowInstance {
    return new WorkflowInstance(props, history);
  }

  get id(): WorkflowUuid {
    return this.props.workflowInstanceId;
  }
  get snapshot(): Readonly<WorkflowInstanceProps> {
    return { ...this.props };
  }
  get events(): readonly WorkflowInstanceHistoryEvent[] {
    return this.history.map((event) => ({ ...event }));
  }

  recordHistory(event: WorkflowInstanceHistoryEvent): void {
    this.assertOwnedHistory(event);
    if (
      this.history.some(
        (item) => item.workflowHistoryId === event.workflowHistoryId,
      )
    ) {
      throw new WorkflowDomainError(
        'Workflow Instance History event already exists.',
      );
    }
    this.history.push({ ...event });
  }

  assertCanTransitionTo(
    nextStateId: WorkflowUuid,
    transitionIsApproved: boolean,
    currentStateIsTerminal: boolean,
  ): void {
    if (this.props.deletedAt || this.props.status !== 'OPEN')
      throw new WorkflowDomainError(
        'Only an open active Workflow Instance can transition.',
      );
    if (currentStateIsTerminal)
      throw new WorkflowDomainError(
        'A terminal Workflow Instance cannot transition without an explicitly approved reopening policy.',
      );
    if (!transitionIsApproved)
      throw new WorkflowDomainError(
        'The Workflow Instance transition is not approved by its Definition.',
      );
    if (!nextStateId)
      throw new WorkflowDomainError('A target Workflow State is required.');
  }

  private assertRootIsValid(): void {
    if (
      !this.id ||
      !this.props.organizationId ||
      !this.props.workflowDefinitionId ||
      !this.props.currentStateId ||
      !this.props.sourceType.trim() ||
      !this.props.sourceId
    ) {
      throw new WorkflowDomainError(
        'Workflow Instance tenant, definition, state, and external subject reference are required.',
      );
    }
    if (
      !Number.isInteger(this.props.workflowDefinitionVersion) ||
      this.props.workflowDefinitionVersion < 1 ||
      !Number.isInteger(this.props.version) ||
      this.props.version < 1
    ) {
      throw new WorkflowDomainError(
        'Workflow Instance versions must be integers greater than or equal to 1.',
      );
    }
  }

  private assertOwnedHistory(event: WorkflowInstanceHistoryEvent): void {
    if (
      event.workflowInstanceId !== this.id ||
      event.organizationId !== this.props.organizationId
    ) {
      throw new WorkflowDomainError(
        'Workflow Instance History must belong to the same Instance and Organization.',
      );
    }
  }
}
