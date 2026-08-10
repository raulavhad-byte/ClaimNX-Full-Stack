import { ClaimDatabaseMapper, ClaimPersistenceRow } from './claim.database.mapper';

const row: ClaimPersistenceRow = {
  id: 'claim-1', organization_id: 'organization-1', hospital_id: 'hospital-1',
  claim_number: 'CLM-0000000001', claim_product_reference_value_id: 'product-ica',
  claim_product_code: 'ICA', claim_type_reference_value_id: 'type-preauth',
  lifecycle_status_reference_value_id: 'status-draft', lifecycle_status_code: 'DRAFT',
  hospital_insurance_partner_integration_id: 'integration-1', patient_id: null,
  currency_code: 'INR', total_claimed_amount: '1500.25', approved_amount: null,
  authorization_reference: null, external_submission_reference: null, closure_reason: null,
  created_by: 'user-1', created_at: '2026-08-01T00:00:00.000Z',
  updated_by: 'user-1', updated_at: '2026-08-01T00:00:00.000Z',
  deleted_by: null, deleted_at: null, version: 1,
};

describe('ClaimDatabaseMapper', () => {
  it('maps only canonical Phase 8 persistence fields into a Claim aggregate', () => {
    const claim = ClaimDatabaseMapper.toAggregate(row);
    expect(claim.snapshot.claimNumber).toBe('CLM-0000000001');
    expect(claim.snapshot.claimProductCode).toBe('ICA');
    expect(claim.snapshot.totalClaimedAmount).toBe(1500.25);
  });

  it('maps numeric database values to API-safe list values', () => {
    const record = ClaimDatabaseMapper.toListRecord(row);
    expect(record.approvedAmount).toBeNull();
    expect(record.totalClaimedAmount).toBe(1500.25);
  });
});
