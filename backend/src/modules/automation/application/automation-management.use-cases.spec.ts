import { BadRequestException } from '@nestjs/common';

import { AutomationAccessService } from './automation-access.service';
import { AutomationManagementUseCases } from './automation-management.use-cases';
import { AutomationManagementRepository } from '../infrastructure/automation-management.repository';

describe('AutomationManagementUseCases', () => {
  const access = { assertCommandAccess: jest.fn() } as unknown as jest.Mocked<AutomationAccessService>;
  const repository = {
    createWorkRequest: jest.fn(),
    findActiveWorkRequestById: jest.fn(),
  } as unknown as jest.Mocked<AutomationManagementRepository>;
  const useCases = new AutomationManagementUseCases(repository, access);
  const context = { actorUserId: 'actor-1', organizationId: 'organization-1', hospitalId: 'hospital-1' };

  beforeEach(() => jest.clearAllMocks());

  it('creates a tenant-scoped work request with application-generated identifiers', async () => {
    repository.createWorkRequest.mockResolvedValue('request-1');

    await expect(useCases.createWorkRequest({
      ...context, claimId: 'claim-1', claimProductReferenceValueId: 'product-1', workPurposeReferenceValueId: 'purpose-1', queuedWorkStatusReferenceValueId: 'status-queued', sourceRecordType: 'CLAIM', idempotencyKey: 'claim-1:extract', safeInputSummary: { documentCount: 2 },
    })).resolves.toBe('request-1');

    expect(access.assertCommandAccess).toHaveBeenCalledWith('actor-1', 'organization-1', 'hospital-1');
    expect(repository.createWorkRequest).toHaveBeenCalledWith(expect.objectContaining({ p_organization_id: 'organization-1', p_hospital_id: 'hospital-1', p_actor_user_id: 'actor-1', p_idempotency_key: 'claim-1:extract', p_automation_work_request_id: expect.any(String), p_automation_audit_entry_id: expect.any(String) }));
  });

  it('rejects credential-like fields from sanitized automation input', async () => {
    await expect(useCases.createWorkRequest({
      ...context, claimId: 'claim-1', claimProductReferenceValueId: 'product-1', workPurposeReferenceValueId: 'purpose-1', queuedWorkStatusReferenceValueId: 'status-queued', sourceRecordType: 'CLAIM', idempotencyKey: 'claim-1:extract', safeInputSummary: { password: 'not-allowed' },
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createWorkRequest).not.toHaveBeenCalled();
  });
});
