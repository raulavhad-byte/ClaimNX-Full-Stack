import { HospitalPayerIntegrationResult } from '../../application/hospital-insurance-partner-integration.use-cases';
import { HospitalPayerIntegrationResponseDto } from '../dto/hospital-payer-integration-response.dto';

export class HospitalPayerIntegrationResponseMapper {
  static toResponse(
    integration: HospitalPayerIntegrationResult,
  ): HospitalPayerIntegrationResponseDto {
    return {
      hospitalInsurancePartnerIntegrationId:
        integration.hospitalInsurancePartnerIntegrationId,
      organizationId: integration.organizationId,
      hospitalId: integration.hospitalId,
      insurancePartnerId: integration.insurancePartnerId,
      integrationCode: integration.integrationCode,
      submissionChannelReferenceValueId:
        integration.submissionChannelReferenceValueId,
      payerEmailAddress: integration.payerEmailAddress,
      notificationEmailAddress: integration.notificationEmailAddress,
      portalUrl: integration.portalUrl,
      portalUserName: integration.portalUserName,
      operationalStatusReferenceValueId:
        integration.operationalStatusReferenceValueId,
      version: integration.version,
    };
  }
}
