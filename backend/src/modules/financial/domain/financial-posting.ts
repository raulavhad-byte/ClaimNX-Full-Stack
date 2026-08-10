import { FinancialDomainError } from './financial-domain.error';
import { FinancialUuid } from './financial-remittance-batch.aggregate';

export interface FinancialPostingProps {
  financialPostingId: FinancialUuid;
  organizationId: FinancialUuid;
  hospitalId: FinancialUuid;
  claimProductReferenceValueId: FinancialUuid;
  postingTypeReferenceValueId: FinancialUuid;
  postingReference: FinancialUuid;
  postingSequence: number;
  currencyCode: string;
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  createdBy: FinancialUuid;
  updatedBy: FinancialUuid;
  version: number;
}

/** Immutable accounting event. Persistence prohibits UPDATE and DELETE. */
export class FinancialPosting {
  private constructor(private readonly props: FinancialPostingProps) {
    const p = props;
    if ([p.financialPostingId,p.organizationId,p.hospitalId,p.claimProductReferenceValueId,p.postingTypeReferenceValueId,p.postingReference,p.debitAccountCode,p.creditAccountCode,p.createdBy,p.updatedBy].some((value) => !value || value.trim() === '')) throw new FinancialDomainError('Posting identity, tenant, product, type, reference, accounts, and audit actors are required.');
    if (!/^[A-Z]{3}$/.test(p.currencyCode) || !Number.isFinite(p.amount) || p.amount <= 0 || p.debitAccountCode === p.creditAccountCode || !Number.isInteger(p.postingSequence) || p.postingSequence < 1 || p.version !== 1) throw new FinancialDomainError('Posting currency, amount, accounts, sequence, or immutable version is invalid.');
  }
  static create(props: FinancialPostingProps): FinancialPosting { return new FinancialPosting(props); }
  get snapshot(): Readonly<FinancialPostingProps> { return { ...this.props }; }
}
