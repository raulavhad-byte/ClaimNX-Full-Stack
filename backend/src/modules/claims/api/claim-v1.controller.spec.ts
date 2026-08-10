import { ClaimV1Controller } from './claim-v1.controller';
import { ClaimUseCases } from '../application/claim.use-cases';
import { Claim } from '../domain/claim.aggregate';

describe('ClaimV1Controller', () => {
  const useCases = { create: jest.fn(), get: jest.fn(), list: jest.fn(), transition: jest.fn(), createAuthorization: jest.fn(), createQuery: jest.fn(), createSubmissionIntent: jest.fn() } as unknown as jest.Mocked<ClaimUseCases>;
  const controller = new ClaimV1Controller(useCases);

  it('passes the authenticated actor and both tenant dimensions to create', async () => {
    const claim = Claim.rehydrate({
      claimId: '10000000-0000-0000-0000-000000000001', organizationId: '10000000-0000-0000-0000-000000000002', hospitalId: '10000000-0000-0000-0000-000000000003',
      claimNumber: 'CLM-1', claimProductReferenceValueId: '10000000-0000-0000-0000-000000000004', claimProductCode: 'ICA', claimTypeReferenceValueId: '10000000-0000-0000-0000-000000000005',
      lifecycleStatus: { referenceValueId: '10000000-0000-0000-0000-000000000006', code: 'DRAFT' }, currencyCode: 'INR', totalClaimedAmount: 0,
      createdBy: '10000000-0000-0000-0000-000000000007', updatedBy: '10000000-0000-0000-0000-000000000007', createdAt: new Date(), updatedAt: new Date(), version: 1,
    });
    useCases.create.mockResolvedValue(claim);
    const body = { claimProductReferenceValueId: 'product', claimTypeReferenceValueId: 'type', draftLifecycleStatusReferenceValueId: 'draft', currencyCode: 'INR', totalClaimedAmount: 0 };

    const result = await controller.create('organization', 'hospital', 'actor', body);

    expect(useCases.create).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 'actor', organizationId: 'organization', hospitalId: 'hospital' }));
    expect(result).toMatchObject({ claimId: claim.id, claimNumber: 'CLM-1' });
  });
});
