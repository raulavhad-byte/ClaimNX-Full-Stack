import { HospitalInsurancePartnerIntegrationUseCases } from '../../application/hospital-insurance-partner-integration.use-cases';
import { HospitalPayerIntegrationV1Controller } from './hospital-payer-integration-v1.controller';

describe('HospitalPayerIntegrationV1Controller', () => {
  const useCases = {
    list: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    setStatus: jest.fn(),
    retire: jest.fn(),
  } as unknown as HospitalInsurancePartnerIntegrationUseCases;
  const controller = new HospitalPayerIntegrationV1Controller(useCases);

  beforeEach(() => jest.clearAllMocks());

  it('does not expose a credential secret reference when it creates an integration', async () => {
    (useCases.create as jest.Mock).mockResolvedValue({
      hospitalInsurancePartnerIntegrationId: 'integration-id',
      organizationId: 'organization-id', hospitalId: 'hospital-id', insurancePartnerId: 'partner-id',
      integrationCode: 'PAYER-EMAIL', submissionChannelReferenceValueId: 'channel-id',
      operationalStatusReferenceValueId: 'status-id', version: 1,
    });

    const response = await controller.create('organization-id', 'hospital-id', 'actor-id', {
      insurancePartnerId: 'partner-id', integrationCode: 'PAYER-EMAIL',
      submissionChannelReferenceValueId: 'channel-id', operationalStatusReferenceValueId: 'status-id',
      credentialSecretReference: 'vault://insurance/payer-email',
    });

    expect(useCases.create).toHaveBeenCalledWith(expect.objectContaining({
      credentialSecretReference: 'vault://insurance/payer-email', actorUserId: 'actor-id',
    }));
    expect(response).not.toHaveProperty('credentialSecretReference');
  });

  it('passes the URL scope and version to a retirement command', async () => {
    await controller.retire('organization-id', 'hospital-id', 'integration-id', 'actor-id', { version: 3 });
    expect(useCases.retire).toHaveBeenCalledWith({
      actorUserId: 'actor-id', organizationId: 'organization-id', hospitalId: 'hospital-id',
      hospitalInsurancePartnerIntegrationId: 'integration-id', version: 3,
    });
  });
});
