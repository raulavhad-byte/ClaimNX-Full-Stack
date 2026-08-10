import { InsuranceDomainError, InsuranceUuid } from './insurance-partner.aggregate';

export type HospitalPayerIntegrationChannel = 'EMAIL' | 'RPA_PORTAL' | 'API';
export type HospitalPayerIntegrationStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface HospitalInsurancePartnerIntegrationProps {
  hospitalInsurancePartnerIntegrationId: InsuranceUuid;
  organizationId: InsuranceUuid;
  hospitalId: InsuranceUuid;
  insurancePartnerId: InsuranceUuid;
  integrationCode: string;
  submissionChannelReferenceValueId: InsuranceUuid;
  payerEmailAddress?: string | null;
  notificationEmailAddress?: string | null;
  portalUrl?: string | null;
  portalUserName?: string | null;
  /** Opaque external secret-manager pointer; never a credential value. */
  credentialSecretReference?: string | null;
  operationalStatusReferenceValueId: InsuranceUuid;
  version: number;
  deletedAt?: Date | null;
}

const isBlank = (value: string | null | undefined): boolean => !value || value.trim() === '';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Independent aggregate for Hospital-specific routing configuration to an
 * approved Insurer or TPA. It does not own Hospital, Insurance Partner, or
 * Organization Partner Enablement records.
 */
export class HospitalInsurancePartnerIntegration {
  private constructor(private readonly props: HospitalInsurancePartnerIntegrationProps) {
    this.assertPersistentState();
  }

  static create(props: HospitalInsurancePartnerIntegrationProps): HospitalInsurancePartnerIntegration {
    return new HospitalInsurancePartnerIntegration(props);
  }

  static rehydrate(props: HospitalInsurancePartnerIntegrationProps): HospitalInsurancePartnerIntegration {
    return new HospitalInsurancePartnerIntegration(props);
  }

  get id(): InsuranceUuid {
    return this.props.hospitalInsurancePartnerIntegrationId;
  }

  get snapshot(): Readonly<HospitalInsurancePartnerIntegrationProps> {
    return { ...this.props };
  }

  /**
   * Channel and status codes are resolved from Reference Data by the
   * application layer before this domain rule is invoked.
   */
  assertOperationalConfiguration(
    channel: HospitalPayerIntegrationChannel,
    status: HospitalPayerIntegrationStatus,
  ): void {
    if (!['EMAIL', 'RPA_PORTAL', 'API'].includes(channel)) {
      throw new InsuranceDomainError('Hospital–Payer Integration channel is invalid.');
    }
    if (!['DRAFT', 'ACTIVE', 'INACTIVE'].includes(status)) {
      throw new InsuranceDomainError('Hospital–Payer Integration status is invalid.');
    }

    this.assertEmail(this.props.payerEmailAddress, 'Payer email address');
    this.assertEmail(this.props.notificationEmailAddress, 'Notification email address');

    if (this.props.portalUrl && !this.props.portalUrl.trim().toLowerCase().startsWith('https://')) {
      throw new InsuranceDomainError('Portal URL must use HTTPS.');
    }

    if (status !== 'ACTIVE') {
      return;
    }
    if (channel === 'EMAIL' && isBlank(this.props.payerEmailAddress)) {
      throw new InsuranceDomainError('An active Email integration requires a payer email address.');
    }
    if (
      channel === 'RPA_PORTAL' &&
      (isBlank(this.props.portalUrl) || isBlank(this.props.portalUserName) || isBlank(this.props.credentialSecretReference))
    ) {
      throw new InsuranceDomainError(
        'An active RPA Portal integration requires an HTTPS portal URL, portal user name, and external credential secret reference.',
      );
    }
    if (channel === 'API') {
      throw new InsuranceDomainError('API integration cannot be activated until an approved connector is implemented.');
    }
  }

  private assertPersistentState(): void {
    const props = this.props;
    if (
      isBlank(props.hospitalInsurancePartnerIntegrationId) ||
      isBlank(props.organizationId) ||
      isBlank(props.hospitalId) ||
      isBlank(props.insurancePartnerId) ||
      isBlank(props.integrationCode) ||
      isBlank(props.submissionChannelReferenceValueId) ||
      isBlank(props.operationalStatusReferenceValueId)
    ) {
      throw new InsuranceDomainError(
        'Integration identity, tenant, Hospital, Insurance Partner, code, channel, and status are required.',
      );
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InsuranceDomainError('Hospital–Payer Integration version must be greater than or equal to 1.');
    }
    this.assertOptionalNotBlank(props.payerEmailAddress, 'Payer email address');
    this.assertOptionalNotBlank(props.notificationEmailAddress, 'Notification email address');
    this.assertOptionalNotBlank(props.portalUrl, 'Portal URL');
    this.assertOptionalNotBlank(props.portalUserName, 'Portal user name');
    this.assertOptionalNotBlank(props.credentialSecretReference, 'Credential secret reference');
  }

  private assertOptionalNotBlank(value: string | null | undefined, label: string): void {
    if (value !== null && value !== undefined && isBlank(value)) {
      throw new InsuranceDomainError(`${label} cannot be blank when supplied.`);
    }
  }

  private assertEmail(value: string | null | undefined, label: string): void {
    if (value !== null && value !== undefined && !emailPattern.test(value.trim())) {
      throw new InsuranceDomainError(`${label} format is invalid.`);
    }
  }
}
