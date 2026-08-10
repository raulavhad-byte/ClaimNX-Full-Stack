import {
  ClaimLifecycleStatusCode,
  ClaimProductCode,
  ClaimProductStrategyFactory,
} from './claim-product.strategy';
import { ClaimDomainError } from './claim-domain.error';

export type ClaimUuid = string;

export interface ClaimLifecycleStatus {
  referenceValueId: ClaimUuid;
  code: ClaimLifecycleStatusCode;
}

export interface ClaimProps {
  claimId: ClaimUuid;
  organizationId: ClaimUuid;
  hospitalId: ClaimUuid;
  claimNumber: string;
  claimProductReferenceValueId: ClaimUuid;
  claimProductCode: ClaimProductCode;
  claimTypeReferenceValueId: ClaimUuid;
  lifecycleStatus: ClaimLifecycleStatus;
  hospitalInsurancePartnerIntegrationId?: ClaimUuid | null;
  patientId?: ClaimUuid | null;
  currencyCode: string;
  totalClaimedAmount: number;
  approvedAmount?: number | null;
  authorizationReference?: string | null;
  externalSubmissionReference?: string | null;
  closureReason?: string | null;
  createdBy: ClaimUuid;
  createdAt: Date;
  updatedBy: ClaimUuid;
  updatedAt: Date;
  deletedBy?: ClaimUuid | null;
  deletedAt?: Date | null;
  version: number;
}

export interface ClaimStatusHistoryEntry {
  claimStatusHistoryId: ClaimUuid;
  organizationId: ClaimUuid;
  claimId: ClaimUuid;
  claimProductReferenceValueId: ClaimUuid;
  fromStatusReferenceValueId?: ClaimUuid | null;
  toStatusReferenceValueId: ClaimUuid;
  fromStatusCode?: ClaimLifecycleStatusCode | null;
  toStatusCode: ClaimLifecycleStatusCode;
  transitionReason?: string | null;
  actorUserId: ClaimUuid;
  occurredAt: Date;
}

const isBlank = (value: string | null | undefined): boolean => !value || value.trim() === '';

/**
 * Phase 8 Claim aggregate root. It owns business lifecycle validation and
 * status-history intent; the Workflow Platform only owns operational work.
 */
export class Claim {
  private readonly statusHistory: ClaimStatusHistoryEntry[] = [];

  private constructor(private props: ClaimProps, statusHistory: ClaimStatusHistoryEntry[] = []) {
    this.assertPersistentState();
    this.statusHistory.push(...statusHistory.map((entry) => ({ ...entry })));
  }

  static create(props: ClaimProps): Claim {
    if (props.lifecycleStatus.code !== 'DRAFT') {
      throw new ClaimDomainError('A new Claim must start in DRAFT status.');
    }
    return new Claim(props);
  }

  static rehydrate(props: ClaimProps, statusHistory: ClaimStatusHistoryEntry[] = []): Claim {
    return new Claim(props, statusHistory);
  }

  get id(): ClaimUuid {
    return this.props.claimId;
  }

  get snapshot(): Readonly<ClaimProps> {
    return { ...this.props, lifecycleStatus: { ...this.props.lifecycleStatus } };
  }

  get claimStatusHistory(): readonly ClaimStatusHistoryEntry[] {
    return this.statusHistory.map((entry) => ({ ...entry }));
  }

  transition(
    targetStatus: ClaimLifecycleStatus,
    actorUserId: ClaimUuid,
    expectedVersion: number,
    claimStatusHistoryId: ClaimUuid,
    reason?: string | null,
    occurredAt = new Date(),
  ): ClaimStatusHistoryEntry {
    this.assertMutable(expectedVersion, actorUserId);
    this.assertStatus(targetStatus);
    ClaimProductStrategyFactory.forProduct(this.props.claimProductCode).validateTransition(
      this.props.lifecycleStatus.code,
      targetStatus.code,
    );

    const history: ClaimStatusHistoryEntry = {
      claimStatusHistoryId,
      organizationId: this.props.organizationId,
      claimId: this.id,
      claimProductReferenceValueId: this.props.claimProductReferenceValueId,
      fromStatusReferenceValueId: this.props.lifecycleStatus.referenceValueId,
      toStatusReferenceValueId: targetStatus.referenceValueId,
      fromStatusCode: this.props.lifecycleStatus.code,
      toStatusCode: targetStatus.code,
      transitionReason: reason?.trim() || null,
      actorUserId,
      occurredAt,
    };
    this.props = {
      ...this.props,
      lifecycleStatus: { ...targetStatus },
      updatedBy: actorUserId,
      updatedAt: occurredAt,
      version: this.props.version + 1,
    };
    this.statusHistory.push(history);
    return { ...history };
  }

  private assertPersistentState(): void {
    const props = this.props;
    if (
      isBlank(props.claimId) ||
      isBlank(props.organizationId) ||
      isBlank(props.hospitalId) ||
      isBlank(props.claimNumber) ||
      isBlank(props.claimProductReferenceValueId) ||
      isBlank(props.claimTypeReferenceValueId) ||
      isBlank(props.currencyCode) ||
      isBlank(props.createdBy) ||
      isBlank(props.updatedBy)
    ) {
      throw new ClaimDomainError(
        'Claim identity, tenant, Hospital, number, product, type, currency, and audit actors are required.',
      );
    }
    this.assertStatus(props.lifecycleStatus);
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new ClaimDomainError('Claim version must be greater than or equal to 1.');
    }
    if (!Number.isFinite(props.totalClaimedAmount) || props.totalClaimedAmount < 0) {
      throw new ClaimDomainError('Total claimed amount must be a non-negative finite value.');
    }
    if (props.approvedAmount !== undefined && props.approvedAmount !== null &&
      (!Number.isFinite(props.approvedAmount) || props.approvedAmount < 0)) {
      throw new ClaimDomainError('Approved amount must be a non-negative finite value when supplied.');
    }
  }

  private assertStatus(status: ClaimLifecycleStatus): void {
    if (isBlank(status.referenceValueId) || isBlank(status.code)) {
      throw new ClaimDomainError('Claim lifecycle status reference and code are required.');
    }
  }

  private assertMutable(expectedVersion: number, actorUserId: ClaimUuid): void {
    if (this.props.deletedAt) {
      throw new ClaimDomainError('A soft-deleted Claim cannot be changed.');
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new ClaimDomainError('Expected Claim version must be greater than or equal to 1.');
    }
    if (expectedVersion !== this.props.version) {
      throw new ClaimDomainError('Claim version conflict. Reload the Claim before retrying the operation.');
    }
    if (isBlank(actorUserId)) {
      throw new ClaimDomainError('Claim transition actor is required.');
    }
  }
}
