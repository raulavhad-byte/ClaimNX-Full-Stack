import {
  WorkflowDomainError,
  WorkflowUuid,
} from './workflow-definition.aggregate';

export interface WorkItemProps {
  workflowTaskId: WorkflowUuid;
  organizationId: WorkflowUuid;
  workflowInstanceId: WorkflowUuid;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  title: string;
  version: number;
  queueId?: WorkflowUuid | null;
  assignedOrganizationMemberId?: WorkflowUuid | null;
  deletedAt?: Date | null;
}

export interface WorkItemHistoryEvent {
  workflowTaskHistoryId: WorkflowUuid;
  organizationId: WorkflowUuid;
  workflowTaskId: WorkflowUuid;
  eventType: string;
  occurredAt: Date;
}

/** Independently mutable Organization-scoped operational Work Item aggregate. */
export class WorkItem {
  private readonly history: WorkItemHistoryEvent[];

  private constructor(
    private readonly props: WorkItemProps,
    history: WorkItemHistoryEvent[] = [],
  ) {
    if (
      !props.workflowTaskId ||
      !props.organizationId ||
      !props.workflowInstanceId ||
      !props.title.trim()
    ) {
      throw new WorkflowDomainError(
        'Work Item identifier, Organization, Instance, and title are required.',
      );
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new WorkflowDomainError(
        'Work Item version must be an integer greater than or equal to 1.',
      );
    }
    this.history = history.map((event) => ({ ...event }));
    this.history.forEach((event) => this.assertOwnedHistory(event));
  }

  static create(props: WorkItemProps): WorkItem {
    return new WorkItem(props);
  }
  static rehydrate(
    props: WorkItemProps,
    history: WorkItemHistoryEvent[],
  ): WorkItem {
    return new WorkItem(props, history);
  }
  get id(): WorkflowUuid {
    return this.props.workflowTaskId;
  }
  get snapshot(): Readonly<WorkItemProps> {
    return { ...this.props };
  }
  get events(): readonly WorkItemHistoryEvent[] {
    return this.history.map((event) => ({ ...event }));
  }

  assertCanAssign(queueIsActive: boolean, memberIsActive: boolean): void {
    if (
      this.props.deletedAt ||
      this.props.status === 'COMPLETED' ||
      this.props.status === 'CANCELLED'
    ) {
      throw new WorkflowDomainError(
        'Completed, cancelled, or retired Work Items reject normal assignment changes.',
      );
    }
    if (this.props.queueId && !queueIsActive)
      throw new WorkflowDomainError(
        'A Work Item Queue must be active when assigned.',
      );
    if (this.props.assignedOrganizationMemberId && !memberIsActive)
      throw new WorkflowDomainError(
        'A Work Item direct assignee must be an active Organization Member.',
      );
  }

  recordHistory(event: WorkItemHistoryEvent): void {
    this.assertOwnedHistory(event);
    if (
      this.history.some(
        (item) => item.workflowTaskHistoryId === event.workflowTaskHistoryId,
      )
    ) {
      throw new WorkflowDomainError('Work Item History event already exists.');
    }
    this.history.push({ ...event });
  }

  private assertOwnedHistory(event: WorkItemHistoryEvent): void {
    if (
      event.workflowTaskId !== this.id ||
      event.organizationId !== this.props.organizationId
    ) {
      throw new WorkflowDomainError(
        'Work Item History must belong to the same Work Item and Organization.',
      );
    }
  }
}
