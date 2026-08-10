export type InsuranceUuid = string;

export class InsuranceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsuranceDomainError';
  }
}

export interface InsurancePartnerContact {
  insurancePartnerContactId: InsuranceUuid;
  insurancePartnerId: InsuranceUuid;
  contactTypeReferenceValueId: InsuranceUuid;
  contactName: string;
  designation?: string | null;
  emailAddress?: string | null;
  phoneNumber: string;
  mobileNumber?: string | null;
  isPrimary: boolean;
  version: number;
  deletedAt?: Date | null;
}

export interface InsurancePartnerAggregateProps {
  insurancePartnerId: InsuranceUuid;
  partnerCode: string;
  displayName: string;
  legalName?: string | null;
  partnerTypeReferenceValueId: InsuranceUuid;
  operationalStatusReferenceValueId: InsuranceUuid;
  registrationNumber?: string | null;
  version: number;
  deletedAt?: Date | null;
}

export interface InsuranceProductPlanProps {
  insuranceProductPlanId: InsuranceUuid;
  insurancePartnerId: InsuranceUuid;
  planCode: string;
  planName: string;
  description?: string | null;
  operationalStatusReferenceValueId: InsuranceUuid;
  version: number;
  deletedAt?: Date | null;
}

export interface OrganizationInsurancePartnerEnablementProps {
  organizationInsurancePartnerEnablementId: InsuranceUuid;
  organizationId: InsuranceUuid;
  insurancePartnerId: InsuranceUuid;
  tenantPartnerCode?: string | null;
  operationalStatusReferenceValueId: InsuranceUuid;
  version: number;
  deletedAt?: Date | null;
}

const isBlank = (value: string | null | undefined): boolean => !value || value.trim() === '';
const isActive = (deletedAt?: Date | null): boolean => !deletedAt;

/**
 * Platform-owned Insurance Partner aggregate root. Contacts are owned children;
 * they cannot be reassigned to another Partner.
 */
export class InsurancePartner {
  private readonly contacts: InsurancePartnerContact[];

  private constructor(
    private readonly props: InsurancePartnerAggregateProps,
    contacts: InsurancePartnerContact[] = [],
  ) {
    this.assertRootIsValid();
    this.contacts = contacts.map((contact) => ({ ...contact }));
    this.assertContactsAreValid();
  }

  static create(props: InsurancePartnerAggregateProps): InsurancePartner {
    return new InsurancePartner(props);
  }

  static rehydrate(
    props: InsurancePartnerAggregateProps,
    contacts: InsurancePartnerContact[],
  ): InsurancePartner {
    return new InsurancePartner(props, contacts);
  }

  get id(): InsuranceUuid {
    return this.props.insurancePartnerId;
  }

  get snapshot(): Readonly<InsurancePartnerAggregateProps> {
    return { ...this.props };
  }

  get insurancePartnerContacts(): readonly InsurancePartnerContact[] {
    return this.contacts.map((contact) => ({ ...contact }));
  }

  addContact(contact: InsurancePartnerContact): void {
    if (contact.insurancePartnerId !== this.id) {
      throw new InsuranceDomainError('Contact cannot be reassigned to another Insurance Partner.');
    }
    if (this.contacts.some((item) => item.insurancePartnerContactId === contact.insurancePartnerContactId)) {
      throw new InsuranceDomainError('Insurance Partner Contact identifier must be unique within the aggregate.');
    }
    this.assertContactFields(contact);
    if (contact.isPrimary && isActive(contact.deletedAt)) {
      this.assertNoOtherPrimaryContact(contact.contactTypeReferenceValueId);
    }
    this.contacts.push({ ...contact });
  }

  assertContactCanBeChanged(insurancePartnerContactId: InsuranceUuid): InsurancePartnerContact {
    const contact = this.contacts.find(
      (item) => item.insurancePartnerContactId === insurancePartnerContactId && isActive(item.deletedAt),
    );
    if (!contact) {
      throw new InsuranceDomainError('Contact must be active and owned by the Insurance Partner.');
    }
    return { ...contact };
  }

  setPrimaryContact(insurancePartnerContactId: InsuranceUuid): void {
    const contact = this.assertContactCanBeChanged(insurancePartnerContactId);
    this.contacts.forEach((item) => {
      if (isActive(item.deletedAt) && item.contactTypeReferenceValueId === contact.contactTypeReferenceValueId) {
        item.isPrimary = item.insurancePartnerContactId === insurancePartnerContactId;
      }
    });
  }

  private assertRootIsValid(): void {
    const props = this.props;
    if (
      isBlank(props.insurancePartnerId) ||
      isBlank(props.partnerCode) ||
      isBlank(props.displayName) ||
      isBlank(props.partnerTypeReferenceValueId) ||
      isBlank(props.operationalStatusReferenceValueId)
    ) {
      throw new InsuranceDomainError('Insurance Partner identity, code, name, type, and status are required.');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InsuranceDomainError('Insurance Partner version must be greater than or equal to 1.');
    }
  }

  private assertContactsAreValid(): void {
    const ids = new Set<string>();
    this.contacts.forEach((contact) => {
      if (contact.insurancePartnerId !== this.id) {
        throw new InsuranceDomainError('Contact cannot be reassigned to another Insurance Partner.');
      }
      if (ids.has(contact.insurancePartnerContactId)) {
        throw new InsuranceDomainError('Insurance Partner Contact identifier must be unique within the aggregate.');
      }
      ids.add(contact.insurancePartnerContactId);
      this.assertContactFields(contact);
    });
    const activePrimaryPairs = this.contacts.filter((contact) => contact.isPrimary && isActive(contact.deletedAt));
    const types = new Set(activePrimaryPairs.map((contact) => contact.contactTypeReferenceValueId));
    if (types.size !== activePrimaryPairs.length) {
      throw new InsuranceDomainError('Only one active primary Contact may exist for each Contact Type.');
    }
  }

  private assertContactFields(contact: InsurancePartnerContact): void {
    if (
      isBlank(contact.insurancePartnerContactId) ||
      isBlank(contact.contactTypeReferenceValueId) ||
      isBlank(contact.contactName) ||
      isBlank(contact.phoneNumber)
    ) {
      throw new InsuranceDomainError('Contact identity, type, name, and phone number are required.');
    }
    if (!Number.isInteger(contact.version) || contact.version < 1) {
      throw new InsuranceDomainError('Insurance Partner Contact version must be greater than or equal to 1.');
    }
  }

  private assertNoOtherPrimaryContact(contactTypeReferenceValueId: InsuranceUuid): void {
    if (
      this.contacts.some(
        (item) =>
          isActive(item.deletedAt) &&
          item.isPrimary &&
          item.contactTypeReferenceValueId === contactTypeReferenceValueId,
      )
    ) {
      throw new InsuranceDomainError('Only one active primary Contact may exist for each Contact Type.');
    }
  }
}

/** Independent Phase 7 aggregate: plan ownership belongs to a Partner. */
export class InsuranceProductPlan {
  private constructor(private readonly props: InsuranceProductPlanProps) {
    if (
      isBlank(props.insuranceProductPlanId) ||
      isBlank(props.insurancePartnerId) ||
      isBlank(props.planCode) ||
      isBlank(props.planName) ||
      isBlank(props.operationalStatusReferenceValueId)
    ) {
      throw new InsuranceDomainError('Plan identity, Partner, code, name, and status are required.');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InsuranceDomainError('Insurance Product Plan version must be greater than or equal to 1.');
    }
  }

  static create(props: InsuranceProductPlanProps): InsuranceProductPlan {
    return new InsuranceProductPlan(props);
  }

  static rehydrate(props: InsuranceProductPlanProps): InsuranceProductPlan {
    return new InsuranceProductPlan(props);
  }

  get id(): InsuranceUuid {
    return this.props.insuranceProductPlanId;
  }

  get snapshot(): Readonly<InsuranceProductPlanProps> {
    return { ...this.props };
  }
}

/** Tenant-scoped authorization aggregate; it does not own the Partner root. */
export class OrganizationInsurancePartnerEnablement {
  private constructor(private readonly props: OrganizationInsurancePartnerEnablementProps) {
    if (
      isBlank(props.organizationInsurancePartnerEnablementId) ||
      isBlank(props.organizationId) ||
      isBlank(props.insurancePartnerId) ||
      isBlank(props.operationalStatusReferenceValueId)
    ) {
      throw new InsuranceDomainError('Enablement identity, Organization, Partner, and status are required.');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new InsuranceDomainError('Organization Partner Enablement version must be greater than or equal to 1.');
    }
  }

  static create(props: OrganizationInsurancePartnerEnablementProps): OrganizationInsurancePartnerEnablement {
    return new OrganizationInsurancePartnerEnablement(props);
  }

  static rehydrate(props: OrganizationInsurancePartnerEnablementProps): OrganizationInsurancePartnerEnablement {
    return new OrganizationInsurancePartnerEnablement(props);
  }

  get id(): InsuranceUuid {
    return this.props.organizationInsurancePartnerEnablementId;
  }

  get snapshot(): Readonly<OrganizationInsurancePartnerEnablementProps> {
    return { ...this.props };
  }
}
