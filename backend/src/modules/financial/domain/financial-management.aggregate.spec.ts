import { FinancialDomainError, FinancialVersionConflictError } from './financial-domain.error';
import { FinancialRemittanceBatch } from './financial-remittance-batch.aggregate';
import { FinancialClaimSettlement } from './financial-claim-settlement.aggregate';
import { FinancialRecovery } from './financial-recovery.aggregate';
import { FinancialPosting } from './financial-posting';

const id = (name: string) => `${name}-id`;
const batch = () => FinancialRemittanceBatch.create({ financialRemittanceBatchId:id('batch'),organizationId:id('org'),hospitalId:id('hospital'),insurancePartnerId:id('partner'),claimProductReferenceValueId:id('product'),remittanceSourceTypeReferenceValueId:id('source'),remittanceStatusReferenceValueId:id('status'),remittanceReference:'REM-1',currencyCode:'INR',grossAmount:100,netAmount:90,createdBy:id('actor'),updatedBy:id('actor'),version:1 });

describe('Financial Management domain', () => {
  it('enforces remittance child ownership and line-reference uniqueness', () => {
    const aggregate = batch();
    const line = { financialRemittanceLineItemId:id('line'),financialRemittanceBatchId:id('batch'),organizationId:id('org'),hospitalId:id('hospital'),lineReference:'LINE-1',lineStatusReferenceValueId:id('line-status'),grossAmount:100,deductionAmount:10,netAmount:90,currencyCode:'INR',version:1 };
    aggregate.addLineItem(line);
    expect(() => aggregate.addLineItem({ ...line, financialRemittanceLineItemId:id('line-2') })).toThrow(FinancialDomainError);
    expect(() => aggregate.addLineItem({ ...line, financialRemittanceLineItemId:id('wrong'), hospitalId:id('other') })).toThrow(FinancialDomainError);
  });

  it('enforces batch optimistic concurrency', () => {
    expect(() => batch().assertMutable(2)).toThrow(FinancialVersionConflictError);
  });

  it('enforces settlement deduction ownership and positive amounts', () => {
    const aggregate = FinancialClaimSettlement.create({ financialClaimSettlementId:id('settlement'),organizationId:id('org'),hospitalId:id('hospital'),claimId:id('claim'),insurancePartnerId:id('partner'),claimProductReferenceValueId:id('product'),settlementStatusReferenceValueId:id('status'),settlementReference:'SET-1',currencyCode:'INR',grossPayerPaidAmount:100,tdsAmount:0,payerDeductionAmount:0,otherPayerAdjustmentAmount:0,netPayerSettlementAmount:100,patientResponsibilityAmount:0,hospitalWriteOffAmount:0,createdBy:id('actor'),updatedBy:id('actor'),version:1 });
    expect(() => aggregate.addDeduction({ financialSettlementDeductionId:id('deduction'),financialClaimSettlementId:id('settlement'),organizationId:id('org'),hospitalId:id('hospital'),deductionTypeReferenceValueId:id('type'),amount:0,currencyCode:'INR',version:1 })).toThrow(FinancialDomainError);
  });

  it('requires recoveries to reconcile', () => {
    expect(() => FinancialRecovery.create({ financialRecoveryId:id('recovery'),organizationId:id('org'),hospitalId:id('hospital'),claimId:id('claim'),insurancePartnerId:id('partner'),claimProductReferenceValueId:id('product'),recoveryTypeReferenceValueId:id('type'),recoveryStatusReferenceValueId:id('status'),recoveryReference:'REC-1',currencyCode:'INR',originalAmount:100,recoveredAmount:20,outstandingAmount:90,createdBy:id('actor'),updatedBy:id('actor'),version:1 })).toThrow(FinancialDomainError);
  });

  it('protects immutable financial posting rules', () => {
    expect(() => FinancialPosting.create({ financialPostingId:id('posting'),organizationId:id('org'),hospitalId:id('hospital'),claimProductReferenceValueId:id('product'),postingTypeReferenceValueId:id('type'),postingReference:id('reference'),postingSequence:1,currencyCode:'INR',debitAccountCode:'AR',creditAccountCode:'AR',amount:1,createdBy:id('actor'),updatedBy:id('actor'),version:1 })).toThrow(FinancialDomainError);
  });
});
