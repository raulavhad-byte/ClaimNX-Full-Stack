import {
  WorkflowDomainError,
  WorkflowUuid,
} from './workflow-definition.aggregate';

export interface WorkflowQueueProps {
  workflowQueueId: WorkflowUuid;
  organizationId: WorkflowUuid;
  code: string;
  name: string;
  type: 'PERSONAL' | 'DEPARTMENT' | 'ROLE' | 'HOSPITAL' | 'GENERAL';
  isActive: boolean;
  version: number;
  deletedAt?: Date | null;
}

/** Organization-scoped operational destination; it does not own Work Items. */
export class WorkflowQueue {
  private constructor(private readonly props: WorkflowQueueProps) {
    if (
      !props.workflowQueueId ||
      !props.organizationId ||
      !props.code.trim() ||
      !props.name.trim()
    ) {
      throw new WorkflowDomainError(
        'Workflow Queue identifier, Organization, code, and name are required.',
      );
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new WorkflowDomainError(
        'Workflow Queue version must be an integer greater than or equal to 1.',
      );
    }
  }

  static create(props: WorkflowQueueProps): WorkflowQueue {
    return new WorkflowQueue(props);
  }
  static rehydrate(props: WorkflowQueueProps): WorkflowQueue {
    return new WorkflowQueue(props);
  }
  get id(): WorkflowUuid {
    return this.props.workflowQueueId;
  }
  get snapshot(): Readonly<WorkflowQueueProps> {
    return { ...this.props };
  }

  assertCanReceiveWork(): void {
    if (this.props.deletedAt || !this.props.isActive) {
      throw new WorkflowDomainError(
        'An inactive or retired Workflow Queue cannot receive a new Work Item assignment.',
      );
    }
  }
}
