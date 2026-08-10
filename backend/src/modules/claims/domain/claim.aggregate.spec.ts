import { Claim, ClaimProps } from './claim.aggregate';
import { ClaimDomainError, UnimplementedClaimProductStrategyError } from './claim-domain.error';

const draftStatus = { referenceValueId: 'status-draft', code: 'DRAFT' as const };

const createProps = (overrides: Partial<ClaimProps> = {}): ClaimProps => ({
  claimId: 'claim-1',
  organizationId: 'organization-1',
  hospitalId: 'hospital-1',
  claimNumber: 'CLM-000001',
  claimProductReferenceValueId: 'product-ica',
  claimProductCode: 'ICA',
  claimTypeReferenceValueId: 'type-cashless-preauth',
  lifecycleStatus: draftStatus,
  currencyCode: 'INR',
  totalClaimedAmount: 1000,
  createdBy: 'user-1',
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedBy: 'user-1',
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  version: 1,
  ...overrides,
});

describe('Claim aggregate', () => {
  it('creates an ICA claim in DRAFT only', () => {
    const claim = Claim.create(createProps());
    expect(claim.snapshot.lifecycleStatus.code).toBe('DRAFT');
  });

  it('records an allowed ICA lifecycle transition and increments the version', () => {
    const claim = Claim.create(createProps());
    const history = claim.transition(
      { referenceValueId: 'status-ready-review', code: 'READY_FOR_REVIEW' },
      'user-1', 1, 'history-1', 'Claim details complete', new Date('2026-08-01T01:00:00.000Z'),
    );
    expect(history.fromStatusCode).toBe('DRAFT');
    expect(claim.snapshot.lifecycleStatus.code).toBe('READY_FOR_REVIEW');
    expect(claim.snapshot.version).toBe(2);
    expect(claim.claimStatusHistory).toHaveLength(1);
  });

  it('rejects an invalid ICA lifecycle transition', () => {
    const claim = Claim.create(createProps());
    expect(() => claim.transition(
      { referenceValueId: 'status-approved', code: 'APPROVED' }, 'user-1', 1, 'history-1',
    )).toThrow('Claim transition from DRAFT to APPROVED is not allowed for ICA.');
  });

  it('guards operational transitions for future products', () => {
    const claim = Claim.create(createProps({
      claimProductCode: 'KYP', claimProductReferenceValueId: 'product-kyp',
    }));
    expect(() => claim.transition(
      { referenceValueId: 'status-ready-review', code: 'READY_FOR_REVIEW' }, 'user-1', 1, 'history-1',
    )).toThrow(UnimplementedClaimProductStrategyError);
  });

  it('rejects stale version writes and invalid amounts', () => {
    const claim = Claim.create(createProps());
    expect(() => claim.transition(
      { referenceValueId: 'status-ready-review', code: 'READY_FOR_REVIEW' }, 'user-1', 2, 'history-1',
    )).toThrow('Claim version conflict. Reload the Claim before retrying the operation.');
    expect(() => Claim.create(createProps({ totalClaimedAmount: -1 }))).toThrow(ClaimDomainError);
  });
});
