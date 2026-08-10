import { AutomationDomainError } from './automation-domain.error';
import { AutomationUuid } from './automation-work-request.aggregate';

/** Codes are governed by the Phase 10 AUTOMATION_DISPATCH_STATUS reference category. */
export type PayerDispatchStatusCode = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REVIEW_REQUIRED' | 'CANCELLED';
export interface PayerDispatchStatus { referenceValueId: AutomationUuid; code: PayerDispatchStatusCode; }

export interface PayerDispatchTaskProps {
  payerDispatchTaskId: AutomationUuid;
  organizationId: AutomationUuid;
  hospitalId: AutomationUuid;
  claimId: AutomationUuid;
  hospitalInsurancePartnerIntegrationId: AutomationUuid;
  correlationId: AutomationUuid;
  idempotencyKey: string;
  status: PayerDispatchStatus;
  createdBy: AutomationUuid;
  createdAt: Date;
  updatedBy: AutomationUuid;
  updatedAt: Date;
  deletedAt?: Date | null;
  version: number;
}

/** Controlled external dispatch boundary; it never changes a Claim directly. */
export class PayerDispatchTask {
  private verified = false;
  private constructor(private props: PayerDispatchTaskProps, enforceInitialStatus = true) {
    if (!props.payerDispatchTaskId || !props.organizationId || !props.hospitalId || !props.claimId || !props.hospitalInsurancePartnerIntegrationId || !props.correlationId || !props.idempotencyKey || !props.createdBy || !props.updatedBy || (enforceInitialStatus && props.status.code !== 'QUEUED') || !Number.isInteger(props.version) || props.version < 1) {
      throw new AutomationDomainError('A new Payer Dispatch Task requires immutable tenant, Claim, route, audit, and QUEUED status values.');
    }
  }
  static create(props: PayerDispatchTaskProps): PayerDispatchTask { return new PayerDispatchTask(props); }
  static rehydrate(props: PayerDispatchTaskProps): PayerDispatchTask { return new PayerDispatchTask(props, false); }
  get snapshot(): Readonly<PayerDispatchTaskProps> { return { ...this.props, status: { ...this.props.status } }; }
  start(inProgressStatus: PayerDispatchStatus, actorUserId: AutomationUuid, expectedVersion: number, occurredAt = new Date()): void { this.transition('QUEUED', inProgressStatus, actorUserId, expectedVersion, occurredAt); }
  verify(actorUserId: AutomationUuid): void { if (!actorUserId || this.props.status.code !== 'IN_PROGRESS') throw new AutomationDomainError('Only an in-progress Payer Dispatch Task can be verified by an actor.'); this.verified = true; }
  complete(completedStatus: PayerDispatchStatus, actorUserId: AutomationUuid, expectedVersion: number, occurredAt = new Date()): void { if (!this.verified) throw new AutomationDomainError('A Payer Dispatch Task requires verified outcome before completion.'); this.transition('IN_PROGRESS', completedStatus, actorUserId, expectedVersion, occurredAt); }
  fail(failedStatus: PayerDispatchStatus, actorUserId: AutomationUuid, expectedVersion: number, occurredAt = new Date()): void { this.transition('IN_PROGRESS', failedStatus, actorUserId, expectedVersion, occurredAt); }
  private transition(expectedCurrent: PayerDispatchStatusCode, target: PayerDispatchStatus, actorUserId: AutomationUuid, expectedVersion: number, occurredAt: Date): void {
    if (this.props.deletedAt || !actorUserId || expectedVersion !== this.props.version || !Number.isInteger(expectedVersion) || this.props.status.code !== expectedCurrent) throw new AutomationDomainError('Payer Dispatch Task state or version conflict. Reload before retrying.');
    this.props = { ...this.props, status: { ...target }, updatedBy: actorUserId, updatedAt: occurredAt, version: this.props.version + 1 };
  }
}
