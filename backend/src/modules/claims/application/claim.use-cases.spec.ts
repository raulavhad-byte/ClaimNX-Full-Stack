import { BadRequestException, ConflictException } from '@nestjs/common';

import { Claim } from '../domain/claim.aggregate';
import { ClaimRepository } from '../infrastructure/claim.repository';
import { ClaimAccessService } from './claim-access.service';
import { ClaimReferenceDataService } from './claim-reference-data.service';
import { ClaimUseCases } from './claim.use-cases';

const actorUserId = '10000000-0000-0000-0000-000000000001';
const organizationId = '10000000-0000-0000-0000-000000000002';
const hospitalId = '10000000-0000-0000-0000-000000000003';
const claimId = '10000000-0000-0000-0000-000000000004';

function activeClaim(): Claim {
  return Claim.rehydrate({
    claimId, organizationId, hospitalId, claimNumber: 'CLM-000001',
    claimProductReferenceValueId: '10000000-0000-0000-0000-000000000005', claimProductCode: 'ICA',
    claimTypeReferenceValueId: '10000000-0000-0000-0000-000000000006',
    lifecycleStatus: { referenceValueId: '10000000-0000-0000-0000-000000000007', code: 'DRAFT' },
    currencyCode: 'INR', totalClaimedAmount: 1000, createdBy: actorUserId, updatedBy: actorUserId,
    createdAt: new Date(), updatedAt: new Date(), version: 1,
  });
}

describe('ClaimUseCases', () => {
  const repository = {
    create: jest.fn(), findActiveById: jest.fn(), transitionLifecycle: jest.fn(),
    createAuthorization: jest.fn(), createQuery: jest.fn(), createSubmissionIntent: jest.fn(),
  } as unknown as jest.Mocked<ClaimRepository>;
  const access = { assertTenantHospitalAccess: jest.fn() } as unknown as jest.Mocked<ClaimAccessService>;
  const referenceData = { requireClaimProduct: jest.fn(), requireLifecycleStatus: jest.fn(), requireCode: jest.fn() } as unknown as jest.Mocked<ClaimReferenceDataService>;
  const useCases = new ClaimUseCases(repository, access, referenceData);

  beforeEach(() => jest.resetAllMocks());

  it('creates only a Draft Claim in the caller tenant scope', async () => {
    referenceData.requireClaimProduct.mockResolvedValue('ICA');
    referenceData.requireLifecycleStatus.mockResolvedValue('DRAFT');
    referenceData.requireCode.mockResolvedValue('CASHLESS');
    repository.create.mockResolvedValue(claimId);
    repository.findActiveById.mockResolvedValue(activeClaim());

    const result = await useCases.create({
      actorUserId, organizationId, hospitalId, claimProductReferenceValueId: 'product-id',
      claimTypeReferenceValueId: 'type-id', draftLifecycleStatusReferenceValueId: 'draft-id',
      currencyCode: 'inr', totalClaimedAmount: 1000,
    });

    expect(result.id).toBe(claimId);
    expect(access.assertTenantHospitalAccess).toHaveBeenCalledWith(actorUserId, organizationId, hospitalId);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ currencyCode: 'INR', actorUserId }));
  });

  it('rejects a non-Draft creation request before persistence', async () => {
    referenceData.requireClaimProduct.mockResolvedValue('ICA');
    referenceData.requireLifecycleStatus.mockResolvedValue('SUBMITTED');
    referenceData.requireCode.mockResolvedValue('CASHLESS');

    await expect(useCases.create({
      actorUserId, organizationId, hospitalId, claimProductReferenceValueId: 'product-id',
      claimTypeReferenceValueId: 'type-id', draftLifecycleStatusReferenceValueId: 'submitted-id',
      currencyCode: 'INR', totalClaimedAmount: 1000,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns a concurrency conflict when the atomic lifecycle write becomes stale', async () => {
    repository.findActiveById.mockResolvedValue(activeClaim());
    referenceData.requireLifecycleStatus.mockResolvedValue('READY_FOR_REVIEW');
    repository.transitionLifecycle.mockResolvedValue(null);

    await expect(useCases.transition({
      actorUserId, organizationId, hospitalId, claimId, expectedVersion: 1,
      targetLifecycleStatusReferenceValueId: 'review-id', transitionReason: 'Ready for reviewer validation.',
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
