import {
  HospitalInsurancePartnerIntegrationDatabaseMapper,
  HospitalInsurancePartnerIntegrationPersistenceRow,
} from './hospital-insurance-partner-integration.database.mapper';

const persistenceRow: HospitalInsurancePartnerIntegrationPersistenceRow = {
  hospital_insurance_partner_integration_id: 'integration-1',
  organization_id: 'organization-1',
  hospital_id: 'hospital-1',
  insurance_partner_id: 'partner-1',
  integration_code: 'BLUE-CROSS-EMAIL',
  submission_channel_reference_value_id: 'channel-email',
  payer_email_address: 'preauth@payer.example',
  notification_email_address: null,
  portal_url: null,
  portal_user_name: null,
  operational_status_reference_value_id: 'status-draft',
  version: 1,
  deleted_at: null,
};

describe('HospitalInsurancePartnerIntegrationDatabaseMapper', () => {
  it('maps the tenant-scoped persistence row to the domain aggregate', () => {
    const aggregate = HospitalInsurancePartnerIntegrationDatabaseMapper.toAggregate(persistenceRow);
    expect(aggregate.snapshot).toMatchObject({
      organizationId: 'organization-1',
      hospitalId: 'hospital-1',
      insurancePartnerId: 'partner-1',
      integrationCode: 'BLUE-CROSS-EMAIL',
      version: 1,
    });
  });

  it('does not expose an external credential secret reference in a normal read model', () => {
    const aggregate = HospitalInsurancePartnerIntegrationDatabaseMapper.toAggregate(persistenceRow);
    expect(aggregate.snapshot).not.toHaveProperty('credentialSecretReference');
  });
});
