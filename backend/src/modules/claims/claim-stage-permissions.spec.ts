import {
  canUpdateClaimAtStage,
  getStageUpdatePermission,
} from './claim-stage-permissions';

describe('cashless claim stage permissions', () => {
  it('maps a configured claim status to its update permission', () => {
    expect(getStageUpdatePermission('Pending Medical Review')).toBe(
      'stage_permissions:stage_pending_medical_review:update',
    );
    expect(getStageUpdatePermission('Discharged Approved')).toBe(
      'stage_permissions:stage_discharged_approved:update',
    );
    expect(getStageUpdatePermission('Discharge Query Replied')).toBe(
      'stage_permissions:stage_discharge_query_reply:update',
    );
  });

  it('allows a role with the matching current-stage permission', () => {
    expect(canUpdateClaimAtStage({
      id: 'user-1',
      role: 'Medical Officer',
      permissions: [
        'stage_permissions:stage_pending_medical_review:update',
      ],
    }, 'Pending Medical Review')).toBe(true);
  });

  it('denies a role without the matching current-stage permission', () => {
    expect(canUpdateClaimAtStage({
      id: 'user-1',
      role: 'Medical Officer',
      permissions: [],
    }, 'Pending Medical Review')).toBe(false);
  });

  it('keeps administrator access and non-cashless product statuses intact', () => {
    expect(canUpdateClaimAtStage({
      id: 'admin-1',
      role: 'Super Admin',
      permissions: [],
    }, 'Pending Medical Review')).toBe(true);

    expect(canUpdateClaimAtStage({
      id: 'user-1',
      role: 'Policy Auditor',
      permissions: [],
    }, 'KYP Pending Approval')).toBe(true);
  });
});
