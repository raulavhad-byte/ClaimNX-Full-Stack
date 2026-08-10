import {
  HospitalInsurancePartnerIntegration,
  HospitalInsurancePartnerIntegrationProps,
} from './hospital-insurance-partner-integration.aggregate';
import { InsuranceDomainError } from './insurance-partner.aggregate';

const createProps = (): HospitalInsurancePartnerIntegrationProps => ({
  hospitalInsurancePartnerIntegrationId: 'integration-1',
  organizationId: 'organization-1',
  hospitalId: 'hospital-1',
  insurancePartnerId: 'partner-1',
  integrationCode: 'BLUE-CROSS-EMAIL',
  submissionChannelReferenceValueId: 'channel-email',
  payerEmailAddress: 'preauth@payer.example',
  operationalStatusReferenceValueId: 'status-draft',
  version: 1,
});

describe('HospitalInsurancePartnerIntegration domain model', () => {
  it('accepts a draft email configuration with a valid identity and version', () => {
    const integration = HospitalInsurancePartnerIntegration.create(createProps());
    expect(integration.id).toBe('integration-1');
  });

  it('requires a payer email when an Email integration is active', () => {
    const integration = HospitalInsurancePartnerIntegration.create({ ...createProps(), payerEmailAddress: null });
    expect(() => integration.assertOperationalConfiguration('EMAIL', 'ACTIVE')).toThrow(
      'An active Email integration requires a payer email address.',
    );
  });

  it('requires only an external secret reference for an active RPA portal integration', () => {
    const integration = HospitalInsurancePartnerIntegration.create({
      ...createProps(),
      portalUrl: 'https://portal.payer.example',
      portalUserName: 'hospital-routing-user',
      credentialSecretReference: 'vault://claimnx/payers/blue-cross/hospital-1',
    });
    expect(() => integration.assertOperationalConfiguration('RPA_PORTAL', 'ACTIVE')).not.toThrow();
  });

  it('rejects a non-HTTPS portal URL', () => {
    const integration = HospitalInsurancePartnerIntegration.create({
      ...createProps(),
      portalUrl: 'http://portal.payer.example',
    });
    expect(() => integration.assertOperationalConfiguration('RPA_PORTAL', 'DRAFT')).toThrow('Portal URL must use HTTPS.');
  });

  it('does not allow the reserved API channel to become active', () => {
    const integration = HospitalInsurancePartnerIntegration.create(createProps());
    expect(() => integration.assertOperationalConfiguration('API', 'ACTIVE')).toThrow(InsuranceDomainError);
  });

  it('rejects an invalid optimistic-concurrency version', () => {
    expect(() => HospitalInsurancePartnerIntegration.create({ ...createProps(), version: 0 })).toThrow(
      'Hospital–Payer Integration version must be greater than or equal to 1.',
    );
  });
});
