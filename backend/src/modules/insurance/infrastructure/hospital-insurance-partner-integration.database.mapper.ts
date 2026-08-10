import {
  HospitalInsurancePartnerIntegration,
  HospitalInsurancePartnerIntegrationProps,
} from '../domain/hospital-insurance-partner-integration.aggregate';

/**
 * Safe persistence shape for normal reads. The credential secret reference is
 * intentionally absent: it is write-only and must never be returned by API reads.
 */
export interface HospitalInsurancePartnerIntegrationPersistenceRow {
  hospital_insurance_partner_integration_id: string;
  organization_id: string;
  hospital_id: string;
  insurance_partner_id: string;
  integration_code: string;
  submission_channel_reference_value_id: string;
  payer_email_address: string | null;
  notification_email_address: string | null;
  portal_url: string | null;
  portal_user_name: string | null;
  operational_status_reference_value_id: string;
  version: number;
  deleted_at: string | null;
}

export class HospitalInsurancePartnerIntegrationDatabaseMapper {
  static toAggregate(
    row: HospitalInsurancePartnerIntegrationPersistenceRow,
  ): HospitalInsurancePartnerIntegration {
    const props: HospitalInsurancePartnerIntegrationProps = {
      hospitalInsurancePartnerIntegrationId: row.hospital_insurance_partner_integration_id,
      organizationId: row.organization_id,
      hospitalId: row.hospital_id,
      insurancePartnerId: row.insurance_partner_id,
      integrationCode: row.integration_code,
      submissionChannelReferenceValueId: row.submission_channel_reference_value_id,
      payerEmailAddress: row.payer_email_address,
      notificationEmailAddress: row.notification_email_address,
      portalUrl: row.portal_url,
      portalUserName: row.portal_user_name,
      operationalStatusReferenceValueId: row.operational_status_reference_value_id,
      version: row.version,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    };
    return HospitalInsurancePartnerIntegration.rehydrate(props);
  }
}
