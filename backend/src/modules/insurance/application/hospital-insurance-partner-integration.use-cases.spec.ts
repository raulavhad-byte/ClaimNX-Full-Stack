import { ConflictException } from '@nestjs/common';

import { HospitalInsurancePartnerIntegration } from '../domain/hospital-insurance-partner-integration.aggregate';
import { HospitalInsurancePartnerIntegrationRepository } from '../infrastructure/hospital-insurance-partner-integration.repository';
import { InsuranceAccessService } from './insurance-access.service';
import { HospitalInsurancePartnerIntegrationUseCases } from './hospital-insurance-partner-integration.use-cases';
import { HospitalPayerIntegrationReferenceDataService } from './hospital-payer-integration-reference-data.service';

const existing = () => HospitalInsurancePartnerIntegration.rehydrate({
  hospitalInsurancePartnerIntegrationId: 'integration-1', organizationId: 'organization-1',
  hospitalId: 'hospital-1', insurancePartnerId: 'partner-1', integrationCode: 'PAYER-EMAIL',
  submissionChannelReferenceValueId: 'channel-email', payerEmailAddress: 'preauth@payer.example',
  operationalStatusReferenceValueId: 'status-draft', version: 1,
});

describe('HospitalInsurancePartnerIntegrationUseCases', () => {
  const access = {
    assertActiveMembership: jest.fn(),
    assertActiveHospitalInOrganization: jest.fn(),
  } as unknown as InsuranceAccessService;
  const references = { requireCode: jest.fn() } as unknown as HospitalPayerIntegrationReferenceDataService;
  const repository = {
    findActiveById: jest.fn(), listActiveByHospital: jest.fn(), create: jest.fn(),
    update: jest.fn(), setStatus: jest.fn(), softDelete: jest.fn(),
  } as unknown as HospitalInsurancePartnerIntegrationRepository;
  const useCases = new HospitalInsurancePartnerIntegrationUseCases(repository, access, references);

  beforeEach(() => jest.clearAllMocks());

  it('creates a scoped Email integration and never returns the secret reference', async () => {
    (references.requireCode as jest.Mock).mockResolvedValueOnce('EMAIL').mockResolvedValueOnce('DRAFT');
    (repository.create as jest.Mock).mockResolvedValue('integration-1');
    (repository.findActiveById as jest.Mock).mockResolvedValue(existing());

    const result = await useCases.create({
      actorUserId: 'actor-1', organizationId: 'organization-1', hospitalId: 'hospital-1', insurancePartnerId: 'partner-1',
      integrationCode: 'PAYER-EMAIL', submissionChannelReferenceValueId: 'channel-email',
      payerEmailAddress: 'preauth@payer.example', credentialSecretReference: 'vault://not-returned',
      operationalStatusReferenceValueId: 'status-draft',
    });

    expect(access.assertActiveMembership).toHaveBeenCalledWith('actor-1', 'organization-1');
    expect(access.assertActiveHospitalInOrganization).toHaveBeenCalledWith('organization-1', 'hospital-1');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      credentialSecretReference: 'vault://not-returned', actorUserId: 'actor-1',
    }));
    expect(result).not.toHaveProperty('credentialSecretReference');
  });

  it('returns a conflict when an optimistic update no longer matches', async () => {
    (references.requireCode as jest.Mock).mockResolvedValueOnce('EMAIL').mockResolvedValueOnce('DRAFT');
    (repository.findActiveById as jest.Mock).mockResolvedValue(existing());
    (repository.update as jest.Mock).mockResolvedValue(null);

    await expect(useCases.update({
      actorUserId: 'actor-1', organizationId: 'organization-1', hospitalId: 'hospital-1',
      hospitalInsurancePartnerIntegrationId: 'integration-1', version: 1, integrationCode: 'PAYER-EMAIL-2',
      submissionChannelReferenceValueId: 'channel-email', payerEmailAddress: 'preauth@payer.example',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires an active tenant Hospital before listing integrations', async () => {
    (repository.listActiveByHospital as jest.Mock).mockResolvedValue([existing()]);
    const result = await useCases.list('actor-1', 'organization-1', 'hospital-1');
    expect(result).toHaveLength(1);
    expect(access.assertActiveHospitalInOrganization).toHaveBeenCalledWith('organization-1', 'hospital-1');
  });
});
