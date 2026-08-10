import { AutomationDomainError } from './automation-domain.error';
import {
  AutomationClaimProductCode,
  AutomationProductStrategyFactory,
  AutomationWorkPurposeCode,
} from './automation-product.strategy';

export type AutomationUuid = string;
/** Codes are governed by the Phase 10 global reference-data catalogue. */
export type AutomationWorkStatusCode = 'QUEUED' | 'IN_PROGRESS' | 'REVIEW_REQUIRED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AutomationJobStatusCode = 'STARTED' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'RETRY_SCHEDULED' | 'CANCELLED';

export interface AutomationReference<TCode extends string> {
  referenceValueId: AutomationUuid;
  code: TCode;
}

export interface AutomationWorkRequestProps {
  automationWorkRequestId: AutomationUuid;
  organizationId: AutomationUuid;
  hospitalId?: AutomationUuid | null;
  claimId?: AutomationUuid | null;
  claimProductReferenceValueId?: AutomationUuid | null;
  claimProductCode?: AutomationClaimProductCode | null;
  purpose: AutomationReference<AutomationWorkPurposeCode>;
  status: AutomationReference<AutomationWorkStatusCode>;
  sourceRecordType: string;
  sourceRecordId?: AutomationUuid | null;
  correlationId: AutomationUuid;
  idempotencyKey: string;
  createdBy: AutomationUuid;
  createdAt: Date;
  updatedBy: AutomationUuid;
  updatedAt: Date;
  deletedAt?: Date | null;
  version: number;
}

export interface AutomationJobAttempt {
  automationJobAttemptId: AutomationUuid;
  attemptNumber: number;
  status: AutomationReference<AutomationJobStatusCode>;
  startedAt: Date;
  completedAt?: Date | null;
  failureClassification?: string | null;
  failureSummary?: string | null;
}

const blank = (value: string | null | undefined): boolean => !value || value.trim() === '';

/** Tenant-scoped, idempotent request for one approved automation purpose. */
export class AutomationWorkRequest {
  private readonly attempts: AutomationJobAttempt[] = [];

  private constructor(private props: AutomationWorkRequestProps, attempts: AutomationJobAttempt[] = []) {
    this.assertPersistentState();
    this.attempts.push(...attempts.map((attempt) => ({ ...attempt, status: { ...attempt.status } })));
  }

  static create(props: AutomationWorkRequestProps): AutomationWorkRequest {
    if (props.status.code !== 'QUEUED') {
      throw new AutomationDomainError('A new Automation Work Request must start in QUEUED status.');
    }
    return new AutomationWorkRequest(props);
  }

  static rehydrate(props: AutomationWorkRequestProps, attempts: AutomationJobAttempt[] = []): AutomationWorkRequest {
    return new AutomationWorkRequest(props, attempts);
  }

  get id(): AutomationUuid {
    return this.props.automationWorkRequestId;
  }

  get snapshot(): Readonly<AutomationWorkRequestProps> {
    return { ...this.props, purpose: { ...this.props.purpose }, status: { ...this.props.status } };
  }

  get jobAttempts(): readonly AutomationJobAttempt[] {
    return this.attempts.map((attempt) => ({ ...attempt, status: { ...attempt.status } }));
  }

  startAttempt(
    attemptId: AutomationUuid,
    startedStatus: AutomationReference<'STARTED'>,
    actorUserId: AutomationUuid,
    expectedVersion: number,
    startedAt = new Date(),
  ): AutomationJobAttempt {
    this.assertMutable(expectedVersion, actorUserId);
    this.assertProductPurposeAllowed();
    if (this.props.status.code !== 'QUEUED' && this.props.status.code !== 'FAILED') {
      throw new AutomationDomainError('Only QUEUED or FAILED Automation Work Requests can start an attempt.');
    }
    if (this.attempts.some((attempt) => attempt.status.code === 'STARTED' && !attempt.completedAt)) {
      throw new AutomationDomainError('Only one active Automation Job Attempt is allowed per Work Request.');
    }
    const attempt: AutomationJobAttempt = {
      automationJobAttemptId: attemptId,
      attemptNumber: this.attempts.length + 1,
      status: { ...startedStatus },
      startedAt,
    };
    this.attempts.push(attempt);
    this.advanceStatus('IN_PROGRESS', actorUserId, startedAt);
    return { ...attempt, status: { ...attempt.status } };
  }

  completeAttempt(
    attemptId: AutomationUuid,
    completedStatus: AutomationReference<'SUCCEEDED'>,
    requestCompletedStatus: AutomationReference<'COMPLETED'>,
    actorUserId: AutomationUuid,
    expectedVersion: number,
    completedAt = new Date(),
  ): void {
    this.finishAttempt(attemptId, completedStatus, actorUserId, expectedVersion, completedAt);
    this.props = { ...this.props, status: { ...requestCompletedStatus }, updatedBy: actorUserId, updatedAt: completedAt };
  }

  failAttempt(
    attemptId: AutomationUuid,
    failedStatus: AutomationReference<'FAILED'>,
    requestFailedStatus: AutomationReference<'FAILED'>,
    failureClassification: string,
    actorUserId: AutomationUuid,
    expectedVersion: number,
    completedAt = new Date(),
  ): void {
    if (blank(failureClassification)) {
      throw new AutomationDomainError('A failed Automation Job Attempt requires a safe failure classification.');
    }
    this.finishAttempt(attemptId, failedStatus, actorUserId, expectedVersion, completedAt, failureClassification);
    this.props = { ...this.props, status: { ...requestFailedStatus }, updatedBy: actorUserId, updatedAt: completedAt };
  }

  private finishAttempt(
    attemptId: AutomationUuid,
    status: AutomationReference<'SUCCEEDED' | 'FAILED'>,
    actorUserId: AutomationUuid,
    expectedVersion: number,
    completedAt: Date,
    failureClassification?: string,
  ): void {
    this.assertMutable(expectedVersion, actorUserId);
    const attempt = this.attempts.find((candidate) => candidate.automationJobAttemptId === attemptId);
    if (!attempt || attempt.status.code !== 'STARTED' || attempt.completedAt) {
      throw new AutomationDomainError('Only the active Automation Job Attempt can be completed or failed.');
    }
    attempt.status = { ...status };
    attempt.completedAt = completedAt;
    attempt.failureClassification = failureClassification?.trim() || null;
    this.props = { ...this.props, updatedBy: actorUserId, updatedAt: completedAt, version: this.props.version + 1 };
  }

  private advanceStatus(code: AutomationWorkStatusCode, actorUserId: AutomationUuid, occurredAt: Date): void {
    this.props = { ...this.props, status: { ...this.props.status, code }, updatedBy: actorUserId, updatedAt: occurredAt, version: this.props.version + 1 };
  }

  private assertPersistentState(): void {
    if (blank(this.props.automationWorkRequestId) || blank(this.props.organizationId) || blank(this.props.sourceRecordType) || blank(this.props.correlationId) || blank(this.props.idempotencyKey) || blank(this.props.createdBy) || blank(this.props.updatedBy)) {
      throw new AutomationDomainError('Automation Work Request identity, tenant, source, correlation, idempotency, and audit values are required.');
    }
    if (!Number.isInteger(this.props.version) || this.props.version < 1) {
      throw new AutomationDomainError('Automation Work Request version must be greater than or equal to 1.');
    }
    if (this.props.claimId && (!this.props.hospitalId || !this.props.claimProductReferenceValueId || !this.props.claimProductCode)) {
      throw new AutomationDomainError('A Claim-related Automation Work Request requires Hospital and Claim Product context.');
    }
  }

  private assertProductPurposeAllowed(): void {
    if (this.props.claimProductCode) {
      AutomationProductStrategyFactory.forProduct(this.props.claimProductCode).assertPurposeSupported(this.props.purpose.code);
    }
  }

  private assertMutable(expectedVersion: number, actorUserId: AutomationUuid): void {
    if (this.props.deletedAt) throw new AutomationDomainError('A soft-deleted Automation Work Request cannot change.');
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1 || expectedVersion !== this.props.version) {
      throw new AutomationDomainError('Automation Work Request version conflict. Reload before retrying.');
    }
    if (blank(actorUserId)) throw new AutomationDomainError('Automation actor is required.');
  }
}
