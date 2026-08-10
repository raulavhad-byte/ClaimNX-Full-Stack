import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { FinancialManagementUseCases } from './financial-management.use-cases';

const context = { actorUserId: 'actor-1', organizationId: 'org-1', hospitalId: 'hospital-1' };

describe('FinancialManagementUseCases', () => {
  const access = { assertCommandAccess: jest.fn().mockResolvedValue(undefined) };
  const repository = {
    createRemittanceBatch: jest.fn().mockResolvedValue('batch-1'),
    findActiveRemittanceBatchById: jest.fn(),
    createRemittanceLineItem: jest.fn(),
    createRemittanceEvidence: jest.fn(),
    createClaimSettlement: jest.fn(),
    findActiveSettlementById: jest.fn(),
    createSettlementDeduction: jest.fn(), createRecovery: jest.fn(), createPosting: jest.fn(),
    createBankStatementLine: jest.fn(), createBankMatch: jest.fn(),
  };
  let useCases: FinancialManagementUseCases;

  beforeEach(() => { jest.clearAllMocks(); useCases = new FinancialManagementUseCases(repository as never, access as never); });

  it('enforces tenant access and generates the batch UUID in the application layer', async () => {
    await expect(useCases.createRemittanceBatch({ ...context, insurancePartnerId: 'payer-1', claimProductReferenceValueId: 'product-1', remittanceSourceTypeReferenceValueId: 'source-1', remittanceStatusReferenceValueId: 'status-1', remittanceReference: 'REM-1', receivedAt: '2026-08-01T00:00:00Z', currencyCode: 'INR', grossAmount: 100, netAmount: 90 })).resolves.toBe('batch-1');
    expect(access.assertCommandAccess).toHaveBeenCalledWith('actor-1', 'org-1', 'hospital-1');
    expect(repository.createRemittanceBatch).toHaveBeenCalledWith(expect.objectContaining({ p_financial_remittance_batch_id: expect.any(String), p_organization_id: 'org-1' }));
  });

  it('rejects invalid aggregate input before reaching persistence', async () => {
    await expect(useCases.createRemittanceBatch({ ...context, insurancePartnerId: 'payer-1', claimProductReferenceValueId: 'product-1', remittanceSourceTypeReferenceValueId: 'source-1', remittanceStatusReferenceValueId: 'status-1', remittanceReference: 'REM-1', receivedAt: '2026-08-01T00:00:00Z', currencyCode: 'inr', grossAmount: 100, netAmount: 90 })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createRemittanceBatch).not.toHaveBeenCalled();
  });

  it('converts unique database conflicts to a consistent API error', async () => {
    repository.createRemittanceBatch.mockRejectedValueOnce({ code: '23505' });
    await expect(useCases.createRemittanceBatch({ ...context, insurancePartnerId: 'payer-1', claimProductReferenceValueId: 'product-1', remittanceSourceTypeReferenceValueId: 'source-1', remittanceStatusReferenceValueId: 'status-1', remittanceReference: 'REM-1', receivedAt: '2026-08-01T00:00:00Z', currencyCode: 'INR', grossAmount: 100, netAmount: 90 })).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when a remittance child references a missing active root', async () => {
    repository.findActiveRemittanceBatchById.mockResolvedValueOnce(null);
    await expect(useCases.createRemittanceEvidence({ ...context, financialRemittanceBatchId: 'missing', storageObjectReference: 'obj-1', fileName: 'remittance.pdf' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires exactly one monetary direction on a bank statement line', async () => {
    await expect(useCases.createBankStatementLine({ ...context, bankTransactionReference: 'TX-1', bankAccountReference: 'BANK-1', transactionAt: '2026-08-01T00:00:00Z', currencyCode: 'INR', creditAmount: 10, debitAmount: 10, bankMatchStatusReferenceValueId: 'status-1' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
