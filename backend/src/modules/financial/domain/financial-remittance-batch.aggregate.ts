import { FinancialDomainError, FinancialVersionConflictError } from './financial-domain.error';

export type FinancialUuid = string;

export interface FinancialRemittanceLineItem {
  financialRemittanceLineItemId: FinancialUuid;
  financialRemittanceBatchId: FinancialUuid;
  organizationId: FinancialUuid;
  hospitalId: FinancialUuid;
  lineReference: string;
  lineStatusReferenceValueId: FinancialUuid;
  grossAmount: number;
  deductionAmount: number;
  netAmount: number;
  currencyCode: string;
  version: number;
  deletedAt?: Date | null;
}

export interface FinancialRemittanceEvidence {
  financialRemittanceEvidenceId: FinancialUuid;
  financialRemittanceBatchId: FinancialUuid;
  organizationId: FinancialUuid;
  hospitalId: FinancialUuid;
  storageObjectReference: string;
  fileName: string;
  version: number;
  deletedAt?: Date | null;
}

export interface FinancialRemittanceBatchProps {
  financialRemittanceBatchId: FinancialUuid;
  organizationId: FinancialUuid;
  hospitalId: FinancialUuid;
  insurancePartnerId: FinancialUuid;
  claimProductReferenceValueId: FinancialUuid;
  remittanceSourceTypeReferenceValueId: FinancialUuid;
  remittanceStatusReferenceValueId: FinancialUuid;
  remittanceReference: string;
  currencyCode: string;
  grossAmount: number;
  netAmount: number;
  createdBy: FinancialUuid;
  updatedBy: FinancialUuid;
  version: number;
  deletedAt?: Date | null;
}

const blank = (value: string | null | undefined) => !value || value.trim() === '';
const active = (deletedAt?: Date | null) => !deletedAt;
const money = (value: number) => Number.isFinite(value) && value >= 0;
const currency = (value: string) => /^[A-Z]{3}$/.test(value);

/**
 * Remittance Batch is the aggregate root for payer remittance lines and their
 * evidence. A child always stays in the batch's tenant and hospital scope.
 */
export class FinancialRemittanceBatch {
  private readonly lineItems: FinancialRemittanceLineItem[];
  private readonly evidence: FinancialRemittanceEvidence[];

  private constructor(
    private readonly props: FinancialRemittanceBatchProps,
    lineItems: FinancialRemittanceLineItem[] = [],
    evidence: FinancialRemittanceEvidence[] = [],
  ) {
    this.assertRoot();
    this.lineItems = lineItems.map((item) => ({ ...item }));
    this.evidence = evidence.map((item) => ({ ...item }));
    this.lineItems.forEach((item) => this.assertLine(item));
    this.evidence.forEach((item) => this.assertEvidence(item));
    this.assertUniqueChildren();
  }

  static create(props: FinancialRemittanceBatchProps): FinancialRemittanceBatch {
    return new FinancialRemittanceBatch(props);
  }

  static rehydrate(
    props: FinancialRemittanceBatchProps,
    lineItems: FinancialRemittanceLineItem[],
    evidence: FinancialRemittanceEvidence[],
  ): FinancialRemittanceBatch {
    return new FinancialRemittanceBatch(props, lineItems, evidence);
  }

  get id(): FinancialUuid { return this.props.financialRemittanceBatchId; }
  get snapshot(): Readonly<FinancialRemittanceBatchProps> { return { ...this.props }; }
  get remittanceLineItems(): readonly FinancialRemittanceLineItem[] { return this.lineItems.map((item) => ({ ...item })); }
  get remittanceEvidence(): readonly FinancialRemittanceEvidence[] { return this.evidence.map((item) => ({ ...item })); }

  addLineItem(item: FinancialRemittanceLineItem): void {
    this.assertLine(item);
    if (this.lineItems.some((existing) => active(existing.deletedAt) && active(item.deletedAt) && existing.lineReference === item.lineReference)) {
      throw new FinancialDomainError('An active Remittance Line reference must be unique within its Remittance Batch.');
    }
    this.lineItems.push({ ...item });
  }

  addEvidence(item: FinancialRemittanceEvidence): void {
    this.assertEvidence(item);
    if (this.evidence.some((existing) => active(existing.deletedAt) && active(item.deletedAt) && existing.storageObjectReference === item.storageObjectReference)) {
      throw new FinancialDomainError('An active Remittance Evidence storage reference must be unique within its Remittance Batch.');
    }
    this.evidence.push({ ...item });
  }

  assertMutable(expectedVersion: number): void {
    if (!active(this.props.deletedAt)) throw new FinancialDomainError('A soft-deleted Remittance Batch cannot be changed.');
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new FinancialDomainError('Expected Remittance Batch version must be greater than or equal to 1.');
    if (expectedVersion !== this.props.version) throw new FinancialVersionConflictError('Remittance Batch');
  }

  private assertRoot(): void {
    const p = this.props;
    if ([p.financialRemittanceBatchId, p.organizationId, p.hospitalId, p.insurancePartnerId, p.claimProductReferenceValueId, p.remittanceSourceTypeReferenceValueId, p.remittanceStatusReferenceValueId, p.remittanceReference, p.createdBy, p.updatedBy].some(blank)) {
      throw new FinancialDomainError('Remittance Batch identity, tenant, Hospital, partner, product, source, status, reference, and audit actors are required.');
    }
    if (!currency(p.currencyCode)) throw new FinancialDomainError('Remittance Batch currency must be a three-letter uppercase ISO code.');
    if (!money(p.grossAmount) || !money(p.netAmount) || p.netAmount > p.grossAmount) throw new FinancialDomainError('Remittance Batch amounts must be non-negative and net amount cannot exceed gross amount.');
    if (!Number.isInteger(p.version) || p.version < 1) throw new FinancialDomainError('Remittance Batch version must be greater than or equal to 1.');
  }

  private assertLine(item: FinancialRemittanceLineItem): void {
    if (item.financialRemittanceBatchId !== this.id || item.organizationId !== this.props.organizationId || item.hospitalId !== this.props.hospitalId || [item.financialRemittanceLineItemId, item.lineReference, item.lineStatusReferenceValueId].some(blank)) {
      throw new FinancialDomainError('Remittance Line must be identified and owned by the same Batch, Organization, and Hospital.');
    }
    if (!currency(item.currencyCode) || !money(item.grossAmount) || !money(item.deductionAmount) || !money(item.netAmount) || item.netAmount > item.grossAmount || !Number.isInteger(item.version) || item.version < 1) {
      throw new FinancialDomainError('Remittance Line amounts, currency, and version are invalid.');
    }
  }

  private assertEvidence(item: FinancialRemittanceEvidence): void {
    if (item.financialRemittanceBatchId !== this.id || item.organizationId !== this.props.organizationId || item.hospitalId !== this.props.hospitalId || [item.financialRemittanceEvidenceId, item.storageObjectReference, item.fileName].some(blank) || !Number.isInteger(item.version) || item.version < 1) {
      throw new FinancialDomainError('Remittance Evidence must be identified and owned by the same Batch, Organization, and Hospital.');
    }
  }

  private assertUniqueChildren(): void {
    const lineReferences = this.lineItems.filter((item) => active(item.deletedAt)).map((item) => item.lineReference);
    const storageReferences = this.evidence.filter((item) => active(item.deletedAt)).map((item) => item.storageObjectReference);
    if (new Set(lineReferences).size !== lineReferences.length || new Set(storageReferences).size !== storageReferences.length) {
      throw new FinancialDomainError('Active Remittance child business references must be unique within the Batch.');
    }
  }
}
