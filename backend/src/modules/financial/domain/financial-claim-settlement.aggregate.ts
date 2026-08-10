import { FinancialDomainError, FinancialVersionConflictError } from './financial-domain.error';
import { FinancialUuid } from './financial-remittance-batch.aggregate';

export interface FinancialSettlementDeduction {
  financialSettlementDeductionId: FinancialUuid;
  financialClaimSettlementId: FinancialUuid;
  organizationId: FinancialUuid;
  hospitalId: FinancialUuid;
  deductionTypeReferenceValueId: FinancialUuid;
  amount: number;
  currencyCode: string;
  version: number;
  deletedAt?: Date | null;
}

export interface FinancialClaimSettlementProps {
  financialClaimSettlementId: FinancialUuid;
  organizationId: FinancialUuid;
  hospitalId: FinancialUuid;
  claimId: FinancialUuid;
  insurancePartnerId: FinancialUuid;
  claimProductReferenceValueId: FinancialUuid;
  settlementStatusReferenceValueId: FinancialUuid;
  settlementReference: string;
  currencyCode: string;
  grossPayerPaidAmount: number;
  tdsAmount: number;
  payerDeductionAmount: number;
  otherPayerAdjustmentAmount: number;
  netPayerSettlementAmount: number;
  patientResponsibilityAmount: number;
  hospitalWriteOffAmount: number;
  createdBy: FinancialUuid;
  updatedBy: FinancialUuid;
  version: number;
  deletedAt?: Date | null;
}

const blank = (value: string | null | undefined) => !value || value.trim() === '';
const validMoney = (value: number) => Number.isFinite(value) && value >= 0;

/** Settlement is independent from Remittance ingestion and owns its deductions. */
export class FinancialClaimSettlement {
  private readonly deductions: FinancialSettlementDeduction[];

  private constructor(private readonly props: FinancialClaimSettlementProps, deductions: FinancialSettlementDeduction[] = []) {
    this.assertRoot();
    this.deductions = deductions.map((item) => ({ ...item }));
    this.deductions.forEach((item) => this.assertDeduction(item));
  }

  static create(props: FinancialClaimSettlementProps): FinancialClaimSettlement { return new FinancialClaimSettlement(props); }
  static rehydrate(props: FinancialClaimSettlementProps, deductions: FinancialSettlementDeduction[]): FinancialClaimSettlement { return new FinancialClaimSettlement(props, deductions); }
  get id(): FinancialUuid { return this.props.financialClaimSettlementId; }
  get snapshot(): Readonly<FinancialClaimSettlementProps> { return { ...this.props }; }
  get settlementDeductions(): readonly FinancialSettlementDeduction[] { return this.deductions.map((item) => ({ ...item })); }

  addDeduction(deduction: FinancialSettlementDeduction): void { this.assertDeduction(deduction); this.deductions.push({ ...deduction }); }
  assertMutable(expectedVersion: number): void {
    if (this.props.deletedAt) throw new FinancialDomainError('A soft-deleted Claim Settlement cannot be changed.');
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new FinancialDomainError('Expected Claim Settlement version must be greater than or equal to 1.');
    if (expectedVersion !== this.props.version) throw new FinancialVersionConflictError('Claim Settlement');
  }

  private assertRoot(): void {
    const p = this.props;
    if ([p.financialClaimSettlementId,p.organizationId,p.hospitalId,p.claimId,p.insurancePartnerId,p.claimProductReferenceValueId,p.settlementStatusReferenceValueId,p.settlementReference,p.createdBy,p.updatedBy].some(blank)) throw new FinancialDomainError('Claim Settlement identity, tenant, Claim, partner, product, status, reference, and audit actors are required.');
    if (!/^[A-Z]{3}$/.test(p.currencyCode) || [p.grossPayerPaidAmount,p.tdsAmount,p.payerDeductionAmount,p.otherPayerAdjustmentAmount,p.netPayerSettlementAmount,p.patientResponsibilityAmount,p.hospitalWriteOffAmount].some((amount) => !validMoney(amount))) throw new FinancialDomainError('Claim Settlement currency and amounts are invalid.');
    if (!Number.isInteger(p.version) || p.version < 1) throw new FinancialDomainError('Claim Settlement version must be greater than or equal to 1.');
  }
  private assertDeduction(item: FinancialSettlementDeduction): void {
    if (item.financialClaimSettlementId !== this.id || item.organizationId !== this.props.organizationId || item.hospitalId !== this.props.hospitalId || [item.financialSettlementDeductionId,item.deductionTypeReferenceValueId].some(blank) || !validMoney(item.amount) || item.amount <= 0 || !/^[A-Z]{3}$/.test(item.currencyCode) || !Number.isInteger(item.version) || item.version < 1) throw new FinancialDomainError('Settlement Deduction must be positive, versioned, and owned by the same Settlement tenant scope.');
  }
}
