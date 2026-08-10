import {
  Hospital,
  HospitalAddress,
  HospitalAggregateProps,
  HospitalContact,
  HospitalDepartment,
  HospitalDomainError,
  Uuid,
} from '../domain/hospital.aggregate';

export interface HospitalPersistenceRow {
  id: Uuid;
  organization_id: Uuid;
  hospital_code: string;
  display_name: string;
  registration_number: string | null;
  hospital_type_reference_value_id: Uuid;
  ownership_type_reference_value_id: Uuid | null;
  operational_status_reference_value_id: Uuid;
  primary_address_id: Uuid | null;
  primary_contact_id: Uuid | null;
  version: number;
}

export interface HospitalAddressPersistenceRow {
  hospital_address_id: Uuid;
  hospital_id: Uuid;
  address_type_reference_value_id: Uuid;
  address_line1: string;
  address_line2: string | null;
  landmark: string | null;
  country_id: Uuid;
  state_id: Uuid;
  city_id: Uuid;
  postal_code: string;
  is_primary: boolean;
  version: number;
  deleted_at: string | null;
}

export interface HospitalContactPersistenceRow {
  hospital_contact_id: Uuid;
  hospital_id: Uuid;
  contact_type_reference_value_id: Uuid;
  contact_name: string;
  designation: string | null;
  email_address: string | null;
  phone_number: string;
  mobile_number: string | null;
  is_primary: boolean;
  version: number;
  deleted_at: string | null;
}

export interface HospitalDepartmentPersistenceRow {
  hospital_department_id: Uuid;
  hospital_id: Uuid;
  department_code: string;
  department_name: string;
  department_type_reference_value_id: Uuid | null;
  operational_status_reference_value_id: Uuid;
  description: string | null;
  version: number;
  deleted_at: string | null;
}

const asDate = (value: string | null): Date | null =>
  value ? new Date(value) : null;

export class HospitalDatabaseMapper {
  static toAggregate(
    root: HospitalPersistenceRow,
    addresses: HospitalAddressPersistenceRow[],
    contacts: HospitalContactPersistenceRow[],
    departments: HospitalDepartmentPersistenceRow[],
  ): Hospital {
    const props: HospitalAggregateProps = {
      hospitalId: root.id,
      organizationId: root.organization_id,
      hospitalCode: root.hospital_code,
      displayName: root.display_name,
      registrationNumber: root.registration_number,
      hospitalTypeReferenceValueId: root.hospital_type_reference_value_id,
      ownershipTypeReferenceValueId: root.ownership_type_reference_value_id,
      operationalStatusReferenceValueId: root.operational_status_reference_value_id,
      primaryAddressId: root.primary_address_id,
      primaryContactId: root.primary_contact_id,
      version: root.version,
    };

    return Hospital.rehydrate(
      props,
      addresses.map(HospitalDatabaseMapper.toAddress),
      contacts.map(HospitalDatabaseMapper.toContact),
      departments.map(HospitalDatabaseMapper.toDepartment),
    );
  }

  static toAddress(row: HospitalAddressPersistenceRow): HospitalAddress {
    return {
      hospitalAddressId: row.hospital_address_id,
      hospitalId: row.hospital_id,
      addressTypeReferenceValueId: row.address_type_reference_value_id,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      landmark: row.landmark,
      countryId: row.country_id,
      stateId: row.state_id,
      cityId: row.city_id,
      postalCode: row.postal_code,
      isPrimary: row.is_primary,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    };
  }

  static toContact(row: HospitalContactPersistenceRow): HospitalContact {
    return {
      hospitalContactId: row.hospital_contact_id,
      hospitalId: row.hospital_id,
      contactTypeReferenceValueId: row.contact_type_reference_value_id,
      contactName: row.contact_name,
      designation: row.designation,
      emailAddress: row.email_address,
      phoneNumber: row.phone_number,
      mobileNumber: row.mobile_number,
      isPrimary: row.is_primary,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    };
  }

  static toDepartment(
    row: HospitalDepartmentPersistenceRow,
  ): HospitalDepartment {
    return {
      hospitalDepartmentId: row.hospital_department_id,
      hospitalId: row.hospital_id,
      departmentCode: row.department_code,
      departmentName: row.department_name,
      departmentTypeReferenceValueId: row.department_type_reference_value_id,
      operationalStatusReferenceValueId:
        row.operational_status_reference_value_id,
      description: row.description,
      version: row.version,
      deletedAt: asDate(row.deleted_at),
    };
  }

  static assertPersistable(aggregate: Hospital): void {
    const { hospitalAddresses, hospitalContacts, hospitalDepartments } = aggregate;

    if (
      hospitalAddresses.some((address) => address.hospitalId !== aggregate.id) ||
      hospitalContacts.some((contact) => contact.hospitalId !== aggregate.id) ||
      hospitalDepartments.some((department) => department.hospitalId !== aggregate.id)
    ) {
      throw new HospitalDomainError(
        'A Hospital Aggregate cannot persist child entities owned by another Hospital.',
      );
    }
  }
}
