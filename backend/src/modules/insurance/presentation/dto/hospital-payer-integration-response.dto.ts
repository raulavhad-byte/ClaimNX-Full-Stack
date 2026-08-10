/**
 * Safe Hospitalâ€“Payer integration projection.
 * `credentialSecretReference` is intentionally absent from every response.
 */
export class HospitalPayerIntegrationResponseDto {
  hospitalInsurancePartnerIntegrationId!: string;
  organizationId!: string;
  hospitalId!: string;
  insurancePartnerId!: string;
  integrationCode!: string;
  submissionChannelReferenceValueId!: string;
  payerEmailAddress?: string | null;
  notificationEmailAddress?: string | null;
  portalUrl?: string | null;
  portalUserName?: string | null;
  operationalStatusReferenceValueId!: string;
  version!: number;
}
