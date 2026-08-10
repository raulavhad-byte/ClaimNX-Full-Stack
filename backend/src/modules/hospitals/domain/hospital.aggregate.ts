export type Uuid = string;

export class HospitalDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HospitalDomainError';
  }
}

export interface HospitalAddress {
  hospitalAddressId: Uuid;
  hospitalId: Uuid;
  addressTypeReferenceValueId: Uuid;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  countryId: Uuid;
  stateId: Uuid;
  cityId: Uuid;
  postalCode: string;
  isPrimary: boolean;
  version?: number;
  deletedAt?: Date | null;
}

export interface HospitalContact {
  hospitalContactId: Uuid;
  hospitalId: Uuid;
  contactTypeReferenceValueId: Uuid;
  contactName: string;
  designation?: string | null;
  emailAddress?: string | null;
  phoneNumber: string;
  mobileNumber?: string | null;
  isPrimary: boolean;
  version?: number;
  deletedAt?: Date | null;
}

export interface HospitalDepartment {
  hospitalDepartmentId: Uuid;
  hospitalId: Uuid;
  departmentCode: string;
  departmentName: string;
  departmentTypeReferenceValueId?: Uuid | null;
  operationalStatusReferenceValueId: Uuid;
  description?: string | null;
  version?: number;
  deletedAt?: Date | null;
}

export interface HospitalAggregateProps {
  hospitalId: Uuid;
  organizationId: Uuid;
  hospitalCode: string;
  displayName: string;
  registrationNumber?: string | null;
  hospitalTypeReferenceValueId: Uuid;
  ownershipTypeReferenceValueId?: Uuid | null;
  operationalStatusReferenceValueId: Uuid;
  primaryAddressId?: Uuid | null;
  primaryContactId?: Uuid | null;
  version: number;
}

const normalized = (value: string): string => value.trim().toLocaleLowerCase();

const isActive = (deletedAt?: Date | null): boolean => !deletedAt;

/**
 * The Hospital Aggregate Root. All Hospital child changes are validated here
 * before persistence; children cannot be reassigned to another Hospital.
 */
export class Hospital {
  private readonly addresses: HospitalAddress[];
  private readonly contacts: HospitalContact[];
  private readonly departments: HospitalDepartment[];

  private constructor(
    private readonly props: HospitalAggregateProps,
    addresses: HospitalAddress[] = [],
    contacts: HospitalContact[] = [],
    departments: HospitalDepartment[] = [],
  ) {
    this.assertRootIsValid();
    this.addresses = [...addresses];
    this.contacts = [...contacts];
    this.departments = [...departments];
    this.assertAggregateIntegrity();
  }

  static create(props: HospitalAggregateProps): Hospital {
    return new Hospital(props);
  }

  static rehydrate(
    props: HospitalAggregateProps,
    addresses: HospitalAddress[],
    contacts: HospitalContact[],
    departments: HospitalDepartment[],
  ): Hospital {
    return new Hospital(props, addresses, contacts, departments);
  }

  get id(): Uuid {
    return this.props.hospitalId;
  }

  get snapshot(): Readonly<HospitalAggregateProps> {
    return { ...this.props };
  }

  get hospitalAddresses(): readonly HospitalAddress[] {
    return this.addresses.map((address) => ({ ...address }));
  }

  get hospitalContacts(): readonly HospitalContact[] {
    return this.contacts.map((contact) => ({ ...contact }));
  }

  get hospitalDepartments(): readonly HospitalDepartment[] {
    return this.departments.map((department) => ({ ...department }));
  }

  addAddress(address: HospitalAddress): void {
    this.assertChildOwnership(address.hospitalId, 'Address');
    this.assertUniqueChildId(
      this.addresses.map((item) => item.hospitalAddressId),
      address.hospitalAddressId,
      'Address',
    );

    if (address.isPrimary && isActive(address.deletedAt)) {
      this.assertNoOtherPrimaryAddress();
      this.props.primaryAddressId = address.hospitalAddressId;
    }

    this.addresses.push({ ...address });
  }

  assertAddressCanBeChanged(hospitalAddressId: Uuid): HospitalAddress {
    const address = this.addresses.find(
      (item) => item.hospitalAddressId === hospitalAddressId && isActive(item.deletedAt),
    );
    if (!address) {
      throw new HospitalDomainError('Address must be active and owned by the Hospital.');
    }
    return { ...address };
  }

  assertAddressCanBeDeleted(hospitalAddressId: Uuid): HospitalAddress {
    const address = this.assertAddressCanBeChanged(hospitalAddressId);
    if (this.props.primaryAddressId === hospitalAddressId) {
      throw new HospitalDomainError(
        'The current primary Address cannot be deleted. Select another primary Address first.',
      );
    }
    return address;
  }

  addContact(contact: HospitalContact): void {
    this.assertChildOwnership(contact.hospitalId, 'Contact');
    this.assertUniqueChildId(
      this.contacts.map((item) => item.hospitalContactId),
      contact.hospitalContactId,
      'Contact',
    );

    if (contact.isPrimary && isActive(contact.deletedAt)) {
      this.assertNoOtherPrimaryContact(contact.contactTypeReferenceValueId);
      this.props.primaryContactId ??= contact.hospitalContactId;
    }

    this.contacts.push({ ...contact });
  }

  assertContactCanBeChanged(hospitalContactId: Uuid): HospitalContact {
    const contact = this.contacts.find(
      (item) => item.hospitalContactId === hospitalContactId && isActive(item.deletedAt),
    );
    if (!contact) throw new HospitalDomainError('Contact must be active and owned by the Hospital.');
    return { ...contact };
  }

  assertContactCanBeDeleted(hospitalContactId: Uuid): HospitalContact {
    const contact = this.assertContactCanBeChanged(hospitalContactId);
    if (this.props.primaryContactId === hospitalContactId) {
      throw new HospitalDomainError('The current primary Contact cannot be deleted. Select another primary Contact first.');
    }
    return contact;
  }

  addDepartment(department: HospitalDepartment): void {
    this.assertChildOwnership(department.hospitalId, 'Department');
    this.assertUniqueChildId(
      this.departments.map((item) => item.hospitalDepartmentId),
      department.hospitalDepartmentId,
      'Department',
    );

    if (isActive(department.deletedAt)) {
      const duplicateCode = this.departments.some(
        (item) =>
          isActive(item.deletedAt) &&
          normalized(item.departmentCode) === normalized(department.departmentCode),
      );
      const duplicateName = this.departments.some(
        (item) =>
          isActive(item.deletedAt) &&
          normalized(item.departmentName) === normalized(department.departmentName),
      );

      if (duplicateCode || duplicateName) {
        throw new HospitalDomainError(
          'An active Hospital Department code and name must each be unique within a Hospital.',
        );
      }
    }

    this.departments.push({ ...department });
  }

  assertDepartmentCanBeChanged(hospitalDepartmentId: Uuid): HospitalDepartment {
    const department = this.departments.find(
      (item) => item.hospitalDepartmentId === hospitalDepartmentId && isActive(item.deletedAt),
    );
    if (!department) throw new HospitalDomainError('Department must be active and owned by the Hospital.');
    return { ...department };
  }

  setPrimaryAddress(hospitalAddressId: Uuid): void {
    const address = this.addresses.find(
      (item) => item.hospitalAddressId === hospitalAddressId,
    );

    if (!address || !isActive(address.deletedAt)) {
      throw new HospitalDomainError('Primary Address must be an active Address owned by the Hospital.');
    }

    this.addresses.forEach((item) => {
      if (isActive(item.deletedAt)) {
        item.isPrimary = item.hospitalAddressId === hospitalAddressId;
      }
    });
    this.props.primaryAddressId = hospitalAddressId;
  }

  setPrimaryContact(hospitalContactId: Uuid): void {
    const contact = this.contacts.find(
      (item) => item.hospitalContactId === hospitalContactId,
    );

    if (!contact || !isActive(contact.deletedAt)) {
      throw new HospitalDomainError('Primary Contact must be an active Contact owned by the Hospital.');
    }

    this.contacts.forEach((item) => {
      if (
        isActive(item.deletedAt) &&
        item.contactTypeReferenceValueId === contact.contactTypeReferenceValueId
      ) {
        item.isPrimary = item.hospitalContactId === hospitalContactId;
      }
    });
    this.props.primaryContactId = hospitalContactId;
  }

  private assertRootIsValid(): void {
    if (!this.props.hospitalId || !this.props.organizationId) {
      throw new HospitalDomainError('Hospital and Organization identifiers are required.');
    }

    if (!this.props.hospitalCode.trim() || !this.props.displayName.trim()) {
      throw new HospitalDomainError('Hospital Code and Display Name are required.');
    }

    if (!this.props.hospitalTypeReferenceValueId || !this.props.operationalStatusReferenceValueId) {
      throw new HospitalDomainError('Hospital Type and Operational Status are required.');
    }

    if (!Number.isInteger(this.props.version) || this.props.version < 1) {
      throw new HospitalDomainError('Hospital version must be an integer greater than or equal to 1.');
    }
  }

  private assertAggregateIntegrity(): void {
    this.addresses.forEach((address) => this.assertChildOwnership(address.hospitalId, 'Address'));
    this.contacts.forEach((contact) => this.assertChildOwnership(contact.hospitalId, 'Contact'));
    this.departments.forEach((department) => this.assertChildOwnership(department.hospitalId, 'Department'));

    const activePrimaryAddresses = this.addresses.filter(
      (address) => isActive(address.deletedAt) && address.isPrimary,
    );
    if (activePrimaryAddresses.length > 1) {
      throw new HospitalDomainError('Only one active primary Address may exist for a Hospital.');
    }

    const primaryContactsByType = new Set<string>();
    this.contacts
      .filter((contact) => isActive(contact.deletedAt) && contact.isPrimary)
      .forEach((contact) => {
        if (primaryContactsByType.has(contact.contactTypeReferenceValueId)) {
          throw new HospitalDomainError(
            'Only one active primary Contact may exist for a Hospital and Contact Type.',
          );
        }
        primaryContactsByType.add(contact.contactTypeReferenceValueId);
      });

    if (
      this.props.primaryAddressId &&
      !activePrimaryAddresses.some(
        (address) => address.hospitalAddressId === this.props.primaryAddressId,
      )
    ) {
      throw new HospitalDomainError('The selected primary Address must be active and owned by the Hospital.');
    }

    if (
      this.props.primaryContactId &&
      !this.contacts.some(
        (contact) =>
          isActive(contact.deletedAt) &&
          contact.isPrimary &&
          contact.hospitalContactId === this.props.primaryContactId,
      )
    ) {
      throw new HospitalDomainError('The selected primary Contact must be active and owned by the Hospital.');
    }
  }

  private assertChildOwnership(childHospitalId: Uuid, childName: string): void {
    if (childHospitalId !== this.props.hospitalId) {
      throw new HospitalDomainError(`${childName} cannot be reassigned to another Hospital.`);
    }
  }

  private assertUniqueChildId(existingIds: Uuid[], newId: Uuid, childName: string): void {
    if (existingIds.includes(newId)) {
      throw new HospitalDomainError(`${childName} already exists in this Hospital Aggregate.`);
    }
  }

  private assertNoOtherPrimaryAddress(): void {
    if (this.addresses.some((item) => isActive(item.deletedAt) && item.isPrimary)) {
      throw new HospitalDomainError('Only one active primary Address may exist for a Hospital.');
    }
  }

  private assertNoOtherPrimaryContact(contactTypeReferenceValueId: Uuid): void {
    if (
      this.contacts.some(
        (item) =>
          isActive(item.deletedAt) &&
          item.isPrimary &&
          item.contactTypeReferenceValueId === contactTypeReferenceValueId,
      )
    ) {
      throw new HospitalDomainError(
        'Only one active primary Contact may exist for a Hospital and Contact Type.',
      );
    }
  }
}
