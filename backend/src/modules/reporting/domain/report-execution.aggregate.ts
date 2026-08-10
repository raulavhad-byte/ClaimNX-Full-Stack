import {
  ReportingConflictError,
  ReportingValidationError,
} from './reporting-domain.error';

export type ReportExecutionStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ReportExecutionProps {
  id: string;
  organizationId: string;
  reportDefinitionId: string;
  executionStatusReferenceValueId: string;
  outputFormatReferenceValueId: string;
  status: ReportExecutionStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  deletedBy?: string | null;
  deletedAt?: Date | null;
}

export type CreateReportExecution = Omit<ReportExecutionProps, 'status' | 'version' | 'createdAt' | 'updatedAt' | 'startedAt' | 'completedAt' | 'errorMessage' | 'deletedAt'>;

export class ReportExecution {
  private constructor(private readonly props: ReportExecutionProps) {}

  static create(input: CreateReportExecution, now = new Date()): ReportExecution {
    for (const [value, label] of [[input.id, 'Execution'], [input.organizationId, 'Organization'], [input.reportDefinitionId, 'Report definition'], [input.executionStatusReferenceValueId, 'Execution status reference value'], [input.outputFormatReferenceValueId, 'Output format reference value'], [input.createdBy, 'Audit actor'], [input.updatedBy, 'Audit actor']] as const) {
      if (!value?.trim()) throw new ReportingValidationError(`${label} is required.`);
    }
    return new ReportExecution({ ...input, status: 'QUEUED', version: 1, startedAt: null, completedAt: null, errorMessage: null, deletedBy: null, deletedAt: null, createdAt: now, updatedAt: now });
  }

  static rehydrate(props: ReportExecutionProps): ReportExecution { if (props.version < 1) throw new ReportingValidationError('Execution version must be at least 1.'); return new ReportExecution({ ...props }); }

  start(actorId: string, expectedVersion: number, now = new Date()): void { this.transition(actorId, expectedVersion, 'RUNNING', now); this.props.startedAt = now; }
  complete(actorId: string, expectedVersion: number, now = new Date()): void { this.transition(actorId, expectedVersion, 'COMPLETED', now); this.props.completedAt = now; }
  fail(actorId: string, expectedVersion: number, errorMessage: string, now = new Date()): void { if (!errorMessage?.trim()) throw new ReportingValidationError('Execution failure reason is required.'); this.transition(actorId, expectedVersion, 'FAILED', now); this.props.errorMessage = errorMessage.trim(); this.props.completedAt = now; }
  snapshot(): Readonly<ReportExecutionProps> { return { ...this.props }; }

  private transition(actorId: string, expectedVersion: number, target: ReportExecutionStatus, now: Date): void {
    if (expectedVersion !== this.props.version) throw new ReportingConflictError('Report execution version conflict.');
    if (!actorId?.trim()) throw new ReportingValidationError('Audit actor is required.');
    const valid = (this.props.status === 'QUEUED' && target === 'RUNNING') || (this.props.status === 'RUNNING' && (target === 'COMPLETED' || target === 'FAILED'));
    if (!valid) throw new ReportingValidationError(`Cannot transition report execution from ${this.props.status} to ${target}.`);
    this.props.status = target; this.props.updatedBy = actorId; this.props.updatedAt = now; this.props.version += 1;
  }
}
