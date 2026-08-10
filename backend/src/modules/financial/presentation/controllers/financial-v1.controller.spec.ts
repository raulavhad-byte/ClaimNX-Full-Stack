import { FinancialManagementUseCases } from '../../application/financial-management.use-cases';
import { FinancialV1Controller } from './financial-v1.controller';

describe('FinancialV1Controller', () => {
  const useCases = {
    createRemittanceBatch: jest.fn(), createRemittanceLineItem: jest.fn(), createRemittanceEvidence: jest.fn(),
    createClaimSettlement: jest.fn(), createSettlementDeduction: jest.fn(), createRecovery: jest.fn(),
    createPosting: jest.fn(), createBankStatementLine: jest.fn(), createBankMatch: jest.fn(),
  } as unknown as FinancialManagementUseCases;
  const controller = new FinancialV1Controller(useCases);
  beforeEach(() => jest.clearAllMocks());

  it('passes authenticated tenant scope to a remittance batch command and returns only its identifier', async () => {
    (useCases.createRemittanceBatch as jest.Mock).mockResolvedValue('batch-id');
    await expect(controller.createBatch('org-id', 'hospital-id', 'actor-id', {
      insurancePartnerId: 'partner-id', claimProductReferenceValueId: 'product-id', remittanceSourceTypeReferenceValueId: 'source-id', remittanceStatusReferenceValueId: 'status-id', remittanceReference: 'REM-1', receivedAt: '2026-08-01T00:00:00Z', currencyCode: 'INR', grossAmount: 100, netAmount: 90,
    })).resolves.toEqual({ financialRemittanceBatchId: 'batch-id' });
    expect(useCases.createRemittanceBatch).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 'actor-id', organizationId: 'org-id', hospitalId: 'hospital-id', remittanceReference: 'REM-1' }));
  });

  it('does not return a posting payload or account values after command execution', async () => {
    (useCases.createPosting as jest.Mock).mockResolvedValue('posting-id');
    const response = await controller.createPosting('org-id', 'hospital-id', 'actor-id', {
      claimProductReferenceValueId: 'product-id', postingTypeReferenceValueId: 'type-id', postingReference: 'POST-1', postingSequence: 1, postedAt: '2026-08-01T00:00:00Z', currencyCode: 'INR', debitAccountCode: 'DR', creditAccountCode: 'CR', amount: 100,
    });
    expect(response).toEqual({ financialPostingId: 'posting-id' });
    expect(response).not.toHaveProperty('debitAccountCode');
  });
});
