import { DatabaseService } from '../../../database/database.service';
import { HospitalInsurancePartnerIntegrationRepository } from './hospital-insurance-partner-integration.repository';

describe('HospitalInsurancePartnerIntegrationRepository', () => {
  it('scopes standard reads by organization, Hospital, and active lifecycle', async () => {
    const chain = {
      select: jest.fn(), eq: jest.fn(), is: jest.fn(), maybeSingle: jest.fn(),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.is.mockReturnValue(chain);
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const databaseService = {
      getClient: () => ({ from: jest.fn(() => chain) }),
    } as unknown as DatabaseService;

    const repository = new HospitalInsurancePartnerIntegrationRepository(databaseService);
    await expect(repository.findActiveById('organization-1', 'hospital-1', 'integration-1')).resolves.toBeNull();

    expect(chain.select).toHaveBeenCalledWith(expect.not.stringContaining('credential_secret_reference'));
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'organization-1');
    expect(chain.eq).toHaveBeenCalledWith('hospital_id', 'hospital-1');
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('uses the approved SQL command function for creation', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'integration-1', error: null });
    const databaseService = {
      getClient: () => ({ rpc }),
    } as unknown as DatabaseService;
    const repository = new HospitalInsurancePartnerIntegrationRepository(databaseService);

    await expect(repository.create({
      hospitalInsurancePartnerIntegrationId: 'integration-1', organizationId: 'organization-1', hospitalId: 'hospital-1',
      insurancePartnerId: 'partner-1', integrationCode: 'BLUE-CROSS-EMAIL', submissionChannelReferenceValueId: 'channel-email',
      payerEmailAddress: 'preauth@payer.example', operationalStatusReferenceValueId: 'status-draft', actorUserId: 'actor-1',
    })).resolves.toBe('integration-1');

    expect(rpc).toHaveBeenCalledWith('create_hospital_insurance_partner_integration', expect.objectContaining({
      p_organization_id: 'organization-1', p_hospital_id: 'hospital-1', p_actor_user_id: 'actor-1',
    }));
  });
});
