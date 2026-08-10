import { FinancialDomainError, FinancialVersionConflictError } from './financial-domain.error';
import { FinancialUuid } from './financial-remittance-batch.aggregate';

export interface FinancialRecoveryProps {
  financialRecoveryId: FinancialUuid;
  organizationId: FinancialUuid;
  hospitalId: FinancialUuid;
  claimId: FinancialUuid;
  insurancePartnerId: FinancialUuid;
  claimProductReferenceValueId: FinancialUuid;
  recoveryTypeReferenceValueId: FinancialUuid;
  recoveryStatusReferenceValueId: FinancialUuid;
  recoveryReference: string;
  currencyCode: string;
  originalAmount: number;
  recoveredAmount: number;
  outstandingAmount: number;
  createdBy: FinancialUuid;
  updatedBy: FinancialUuid;
  version: number;
  deletedAt?: Date | null;
}

/** Financial Recovery tracks a payer receivable and forbids over-recovery. */
export class FinancialRecovery {
  private constructor(private readonly props: FinancialRecoveryProps) { this.assertValid(); }
  static create(props: FinancialRecoveryProps): FinancialRecovery { return new FinancialRecovery(props); }
  static rehydrate(props: FinancialRecoveryProps): FinancialRecovery { return new FinancialRecovery(props); }
  get id(): FinancialUuid { return this.props.financialRecoveryId; }
  get snapshot(): Readonly<FinancialRecoveryProps> { return { ...this.props }; }
  assertMutable(expectedVersion: number): void {
    if (this.props.deletedAt) throw new FinancialDomainError('A soft-deleted Recovery cannot be changed.');
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new FinancialDomainError('Expected Recovery version must be greater than or equal to 1.');
    if (expectedVersion !== this.props.version) throw new FinancialVersionConflictError('Recovery');
  }
  private assertValid(): void {
    const p = this.props;
    if ([p.financialRecoveryId,p.organizationId,p.hospitalId,p.claimId,p.insurancePartnerId,p.claimProductReferenceValueId,p.recoveryTypeReferenceValueId,p.recoveryStatusReferenceValueId,p.recoveryReference,p.createdBy,p.updatedBy].some((value) => !value || value.trim() === '')) throw new FinancialDomainError('Recovery identity, tenant, Claim, partner, product, type, status, reference, and audit actors are required.');
    if (!/^[A-Z]{3}$/.test(p.currencyCode) || [p.originalAmount,p.recoveredAmount,p.outstandingAmount].some((value) => !Number.isFinite(value) || value < 0) || p.recoveredAmount > p.originalAmount || p.outstandingAmount !== p.originalAmount - p.recoveredAmount) throw new FinancialDomainError('Recovery amounts must be non-negative, cannot exceed the original amount, and must reconcile exactly.');
    if (!Number.isInteger(p.version) || p.version < 1) throw new FinancialDomainError('Recovery version must be greater than or equal to 1.');
  }
}
