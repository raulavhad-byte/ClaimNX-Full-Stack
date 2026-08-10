import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { Hospital } from '../domain/hospital.aggregate';

import {
  HospitalAddressPersistenceRow,
  HospitalContactPersistenceRow,
  HospitalDatabaseMapper,
  HospitalDepartmentPersistenceRow,
  HospitalPersistenceRow,
} from './hospital-database.mapper';

@Injectable()
export class HospitalAggregateRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Loads an active Hospital aggregate in its tenant boundary.
   * Address, Contact, and Department children are never loaded independently.
   */
  async findActiveById(
    organizationId: string,
    hospitalId: string,
  ): Promise<Hospital | null> {
    const client = this.databaseService.getClient();
    const { data: root, error: rootError } = await client
      .from('hospitals')
      .select(
        'id, organization_id, hospital_code, display_name, registration_number, hospital_type_reference_value_id, ownership_type_reference_value_id, operational_status_reference_value_id, primary_address_id, primary_contact_id, version',
      )
      .eq('id', hospitalId)
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<HospitalPersistenceRow>();

    if (rootError) {
      throw rootError;
    }

    if (!root) {
      return null;
    }

    const [addressesResult, contactsResult, departmentsResult] = await Promise.all([
      client
        .from('hospital_address')
        .select(
          'hospital_address_id, hospital_id, address_type_reference_value_id, address_line1, address_line2, landmark, country_id, state_id, city_id, postal_code, is_primary, version, deleted_at',
        )
        .eq('hospital_id', hospitalId)
        .is('deleted_at', null),
      client
        .from('hospital_contact')
        .select(
          'hospital_contact_id, hospital_id, contact_type_reference_value_id, contact_name, designation, email_address, phone_number, mobile_number, is_primary, version, deleted_at',
        )
        .eq('hospital_id', hospitalId)
        .is('deleted_at', null),
      client
        .from('hospital_department')
        .select(
          'hospital_department_id, hospital_id, department_code, department_name, department_type_reference_value_id, operational_status_reference_value_id, description, version, deleted_at',
        )
        .eq('hospital_id', hospitalId)
        .eq('is_deleted', false)
        .is('deleted_at', null),
    ]);

    if (addressesResult.error) {
      throw addressesResult.error;
    }
    if (contactsResult.error) {
      throw contactsResult.error;
    }
    if (departmentsResult.error) {
      throw departmentsResult.error;
    }

    return HospitalDatabaseMapper.toAggregate(
      root,
      (addressesResult.data ?? []) as HospitalAddressPersistenceRow[],
      (contactsResult.data ?? []) as HospitalContactPersistenceRow[],
      (departmentsResult.data ?? []) as HospitalDepartmentPersistenceRow[],
    );
  }

  async findActiveByCode(
    organizationId: string,
    hospitalCode: string,
  ): Promise<Hospital | null> {
    const client = this.databaseService.getClient();
    const { data, error } = await client
      .from('hospitals')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('hospital_code', hospitalCode)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw error;
    }

    return data
      ? this.findActiveById(organizationId, data.id)
      : null;
  }

  async createAggregate(
    aggregate: Hospital,
    actorUserId: string,
  ): Promise<string> {
    HospitalDatabaseMapper.assertPersistable(aggregate);

    const root = aggregate.snapshot;
    const { data, error } = await this.databaseService.getClient().rpc(
      'create_hospital_aggregate',
      {
        p_hospital_id: root.hospitalId,
        p_organization_id: root.organizationId,
        p_hospital_code: root.hospitalCode,
        p_display_name: root.displayName,
        p_registration_number: root.registrationNumber ?? null,
        p_hospital_type_reference_value_id: root.hospitalTypeReferenceValueId,
        p_ownership_type_reference_value_id:
          root.ownershipTypeReferenceValueId ?? null,
        p_operational_status_reference_value_id:
          root.operationalStatusReferenceValueId,
        p_remarks: null,
        p_primary_address_id: root.primaryAddressId ?? null,
        p_primary_contact_id: root.primaryContactId ?? null,
        p_actor_user_id: actorUserId,
        p_addresses: aggregate.hospitalAddresses.map((address) => ({
          hospital_address_id: address.hospitalAddressId,
          address_type_reference_value_id: address.addressTypeReferenceValueId,
          address_line1: address.addressLine1,
          address_line2: address.addressLine2 ?? null,
          landmark: address.landmark ?? null,
          country_id: address.countryId,
          state_id: address.stateId,
          city_id: address.cityId,
          postal_code: address.postalCode,
          is_primary: address.isPrimary,
        })),
        p_contacts: aggregate.hospitalContacts.map((contact) => ({
          hospital_contact_id: contact.hospitalContactId,
          contact_type_reference_value_id:
            contact.contactTypeReferenceValueId,
          contact_name: contact.contactName,
          designation: contact.designation ?? null,
          email_address: contact.emailAddress ?? null,
          phone_number: contact.phoneNumber,
          mobile_number: contact.mobileNumber ?? null,
          is_primary: contact.isPrimary,
        })),
        p_departments: aggregate.hospitalDepartments.map((department) => ({
          hospital_department_id: department.hospitalDepartmentId,
          department_code: department.departmentCode,
          department_name: department.departmentName,
          department_type_reference_value_id:
            department.departmentTypeReferenceValueId ?? null,
          operational_status_reference_value_id:
            department.operationalStatusReferenceValueId,
          description: department.description ?? null,
        })),
      },
    );

    if (error) {
      throw error;
    }

    return data;
  }

  async updateRoot(
    organizationId: string,
    hospitalId: string,
    expectedVersion: number,
    actorUserId: string,
    patch: Record<string, string>,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'update_hospital_root',
      {
        p_hospital_id: hospitalId,
        p_organization_id: organizationId,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
        p_patch: patch,
      },
    );

    if (error) {
      throw error;
    }

    return data as string | null;
  }

  async createAddress(input: {
    hospitalAddressId: string;
    hospitalId: string;
    organizationId: string;
    addressTypeReferenceValueId: string;
    addressLine1: string;
    addressLine2?: string | null;
    landmark?: string | null;
    countryId: string;
    stateId: string;
    cityId: string;
    postalCode: string;
    actorUserId: string;
  }): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'create_hospital_address',
      {
        p_hospital_address_id: input.hospitalAddressId,
        p_hospital_id: input.hospitalId,
        p_organization_id: input.organizationId,
        p_address_type_reference_value_id: input.addressTypeReferenceValueId,
        p_address_line1: input.addressLine1,
        p_address_line2: input.addressLine2 ?? null,
        p_landmark: input.landmark ?? null,
        p_country_id: input.countryId,
        p_state_id: input.stateId,
        p_city_id: input.cityId,
        p_postal_code: input.postalCode,
        p_actor_user_id: input.actorUserId,
      },
    );
    if (error) throw error;
    return data as string;
  }

  async updateAddress(
    organizationId: string,
    hospitalId: string,
    hospitalAddressId: string,
    expectedVersion: number,
    actorUserId: string,
    patch: Record<string, string>,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'update_hospital_address',
      {
        p_hospital_address_id: hospitalAddressId,
        p_hospital_id: hospitalId,
        p_organization_id: organizationId,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
        p_patch: patch,
      },
    );
    if (error) throw error;
    return data as string | null;
  }

  async softDeleteAddress(
    organizationId: string,
    hospitalId: string,
    hospitalAddressId: string,
    expectedVersion: number,
    actorUserId: string,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'soft_delete_hospital_address',
      {
        p_hospital_address_id: hospitalAddressId,
        p_hospital_id: hospitalId,
        p_organization_id: organizationId,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
      },
    );
    if (error) throw error;
    return data as string | null;
  }

  async createContact(input: {
    hospitalContactId: string; hospitalId: string; organizationId: string; contactTypeReferenceValueId: string;
    contactName: string; designation?: string | null; emailAddress?: string | null; phoneNumber: string;
    mobileNumber?: string | null; actorUserId: string;
  }): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc('create_hospital_contact', {
      p_hospital_contact_id: input.hospitalContactId, p_hospital_id: input.hospitalId, p_organization_id: input.organizationId,
      p_contact_type_reference_value_id: input.contactTypeReferenceValueId, p_contact_name: input.contactName,
      p_designation: input.designation ?? null, p_email_address: input.emailAddress ?? null,
      p_phone_number: input.phoneNumber, p_mobile_number: input.mobileNumber ?? null, p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string;
  }

  async updateContact(organizationId: string, hospitalId: string, hospitalContactId: string, expectedVersion: number, actorUserId: string, patch: Record<string, string>): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('update_hospital_contact', {
      p_hospital_contact_id: hospitalContactId, p_hospital_id: hospitalId, p_organization_id: organizationId,
      p_expected_version: expectedVersion, p_actor_user_id: actorUserId, p_patch: patch,
    });
    if (error) throw error;
    return data as string | null;
  }

  async softDeleteContact(organizationId: string, hospitalId: string, hospitalContactId: string, expectedVersion: number, actorUserId: string): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('soft_delete_hospital_contact', {
      p_hospital_contact_id: hospitalContactId, p_hospital_id: hospitalId, p_organization_id: organizationId,
      p_expected_version: expectedVersion, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  async createDepartment(input: { hospitalDepartmentId: string; hospitalId: string; organizationId: string; departmentCode: string; departmentName: string; departmentTypeReferenceValueId?: string | null; operationalStatusReferenceValueId: string; description?: string | null; actorUserId: string }): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc('create_hospital_department', {
      p_hospital_department_id: input.hospitalDepartmentId, p_hospital_id: input.hospitalId, p_organization_id: input.organizationId,
      p_department_code: input.departmentCode, p_department_name: input.departmentName,
      p_department_type_reference_value_id: input.departmentTypeReferenceValueId ?? null,
      p_operational_status_reference_value_id: input.operationalStatusReferenceValueId,
      p_description: input.description ?? null, p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string;
  }

  async updateDepartment(organizationId: string, hospitalId: string, hospitalDepartmentId: string, expectedVersion: number, actorUserId: string, patch: Record<string, string>): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('update_hospital_department', {
      p_hospital_department_id: hospitalDepartmentId, p_hospital_id: hospitalId, p_organization_id: organizationId,
      p_expected_version: expectedVersion, p_actor_user_id: actorUserId, p_patch: patch,
    });
    if (error) throw error;
    return data as string | null;
  }

  async softDeleteDepartment(organizationId: string, hospitalId: string, hospitalDepartmentId: string, expectedVersion: number, actorUserId: string): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('soft_delete_hospital_department', {
      p_hospital_department_id: hospitalDepartmentId, p_hospital_id: hospitalId, p_organization_id: organizationId,
      p_expected_version: expectedVersion, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  async setPrimaryAddress(organizationId: string, hospitalId: string, hospitalAddressId: string, expectedHospitalVersion: number, actorUserId: string): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('set_hospital_primary_address', {
      p_organization_id: organizationId, p_hospital_id: hospitalId, p_hospital_address_id: hospitalAddressId,
      p_expected_hospital_version: expectedHospitalVersion, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  async setPrimaryContact(organizationId: string, hospitalId: string, hospitalContactId: string, expectedHospitalVersion: number, actorUserId: string): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('set_hospital_primary_contact', {
      p_organization_id: organizationId, p_hospital_id: hospitalId, p_hospital_contact_id: hospitalContactId,
      p_expected_hospital_version: expectedHospitalVersion, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }
}
