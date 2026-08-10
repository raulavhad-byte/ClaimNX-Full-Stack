import { AutomationManagementUseCases } from '../../application/automation-management.use-cases';
import { AutomationV1Controller } from './automation-v1.controller';

describe('AutomationV1Controller', () => {
  const useCases = {
    createWorkRequest: jest.fn(), startWorkRequest: jest.fn(), recordJobAttempt: jest.fn(),
    createReviewCase: jest.fn(), recordReviewDecision: jest.fn(), createOwnerCommandRequest: jest.fn(), createPayerDispatchTask: jest.fn(),
  } as unknown as AutomationManagementUseCases;
  const controller = new AutomationV1Controller(useCases);

  beforeEach(() => jest.clearAllMocks());

  it('passes the authenticated URL tenant scope to a work-request command and returns only its identifier', async () => {
    (useCases.createWorkRequest as jest.Mock).mockResolvedValue('work-request-id');
    await expect(controller.createWorkRequest('organization-id', 'hospital-id', 'actor-id', {
      claimId: 'claim-id', claimProductReferenceValueId: 'product-id', workPurposeReferenceValueId: 'purpose-id', queuedWorkStatusReferenceValueId: 'queued-id', sourceRecordType: 'CLAIM', idempotencyKey: 'automation-1',
    })).resolves.toEqual({ automationWorkRequestId: 'work-request-id' });
    expect(useCases.createWorkRequest).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'organization-id', hospitalId: 'hospital-id', actorUserId: 'actor-id', idempotencyKey: 'automation-1' }));
  });

  it('returns only the payer dispatch task identifier and never a credential secret reference', async () => {
    (useCases.createPayerDispatchTask as jest.Mock).mockResolvedValue('dispatch-task-id');
    const response = await controller.createPayerDispatchTask('organization-id', 'hospital-id', 'actor-id', {
      claimId: 'claim-id', claimProductReferenceValueId: 'product-id', hospitalInsurancePartnerIntegrationId: 'integration-id', dispatchChannelReferenceValueId: 'channel-id', queuedDispatchStatusReferenceValueId: 'queued-id', credentialSecretReference: 'vault://opaque-reference', idempotencyKey: 'dispatch-1',
    });
    expect(response).toEqual({ payerDispatchTaskId: 'dispatch-task-id' });
    expect(response).not.toHaveProperty('credentialSecretReference');
  });
});
