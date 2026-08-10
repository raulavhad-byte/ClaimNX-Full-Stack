import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { QueryBuilderService } from '../../../shared/services/query-builder.service';
import { InsurancePartner } from '../domain/insurance-partner.aggregate';
import {
  InsuranceDatabaseMapper,
  InsurancePartnerContactPersistenceRow,
  InsurancePartnerPersistenceRow,
} from './insurance-database.mapper';

export interface ListInsurancePartnersQuery {
  page: number;
  limit: number;
  search?: string;
  partnerTypeReferenceValueId?: string;
  operationalStatusReferenceValueId?: string;
  sortBy:
    | 'partner_code'
    | 'display_name'
    | 'legal_name'
    | 'created_at'
    | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

export interface InsurancePartnerListRecord {
  id: string;
  partner_code: string;
  display_name: string;
  legal_name: string | null;
  partner_type_reference_value_id: string;
  operational_status_reference_value_id: string;
  registration_number: string | null;
  version: number;
}

export interface InsurancePartnerListResult {
  rows: InsurancePartnerListRecord[];
  totalRecords: number;
}

@Injectable()
export class InsurancePartnerRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queryBuilderService: QueryBuilderService,
  ) {}

  async list(
    input: ListInsurancePartnersQuery,
  ): Promise<InsurancePartnerListResult> {
    const client = this.databaseService.getClient();

    let query = client
      .from('insurance_entities')
      .select(
        [
          'id',
          'partner_code',
          'display_name',
          'legal_name',
          'partner_type_reference_value_id',
          'operational_status_reference_value_id',
          'registration_number',
          'version',
        ].join(', '),
        { count: 'exact' },
      )
      .eq('is_deleted', false)
      .is('deleted_at', null);

    query = this.queryBuilderService.build(query, {
      search: input.search?.trim(),
      searchableColumns: [
        'partner_code',
        'display_name',
        'legal_name',
        'registration_number',
      ],
      filters: {
        partner_type_reference_value_id:
          input.partnerTypeReferenceValueId,
        operational_status_reference_value_id:
          input.operationalStatusReferenceValueId,
      },
      page: input.page,
      limit: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    });

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      rows: (data ?? []) as unknown as InsurancePartnerListRecord[],
      totalRecords: count ?? 0,
    };
  }

  async findActiveById(
    insurancePartnerId: string,
  ): Promise<InsurancePartner | null> {
    const client = this.databaseService.getClient();

    const { data: root, error: rootError } = await client
      .from('insurance_entities')
      .select(
        [
          'id',
          'partner_code',
          'display_name',
          'legal_name',
          'partner_type_reference_value_id',
          'operational_status_reference_value_id',
          'registration_number',
          'version',
        ].join(', '),
      )
      .eq('id', insurancePartnerId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<InsurancePartnerPersistenceRow>();

    if (rootError) {
      throw rootError;
    }

    if (!root) {
      return null;
    }

    const { data: contacts, error: contactsError } = await client
      .from('insurance_partner_contact')
      .select(
        [
          'insurance_partner_contact_id',
          'insurance_partner_id',
          'contact_type_reference_value_id',
          'contact_name',
          'designation',
          'email_address',
          'phone_number',
          'mobile_number',
          'is_primary',
          'version',
          'deleted_at',
        ].join(', '),
      )
      .eq('insurance_partner_id', insurancePartnerId)
      .is('deleted_at', null);

    if (contactsError) {
      throw contactsError;
    }

    return InsuranceDatabaseMapper.toPartnerAggregate(
      root,
      (contacts ?? []) as unknown as InsurancePartnerContactPersistenceRow[],
    );
  }

  async create(input: {
    insurancePartnerId: string;
    partnerCode: string;
    displayName: string;
    legalName?: string | null;
    partnerTypeReferenceValueId: string;
    operationalStatusReferenceValueId: string;
    registrationNumber?: string | null;
    actorUserId: string;
  }): Promise<string> {
    const { data, error } = await this.databaseService
      .getClient()
      .rpc('create_insurance_partner', {
        p_insurance_partner_id: input.insurancePartnerId,
        p_partner_code: input.partnerCode,
        p_display_name: input.displayName,
        p_legal_name: input.legalName ?? null,
        p_partner_type_reference_value_id:
          input.partnerTypeReferenceValueId,
        p_operational_status_reference_value_id:
          input.operationalStatusReferenceValueId,
        p_registration_number: input.registrationNumber ?? null,
        p_actor_user_id: input.actorUserId,
      });

    if (error) {
      throw error;
    }

    return data as string;
  }

  async update(
    id: string,
    expectedVersion: number,
    actorUserId: string,
    patch: Record<string, string | null>,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .rpc('update_insurance_partner', {
        p_insurance_partner_id: id,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
        p_patch: patch,
      });

    if (error) {
      throw error;
    }

    return data as string | null;
  }

  async setStatus(
    id: string,
    expectedVersion: number,
    statusReferenceValueId: string,
    actorUserId: string,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .rpc('set_insurance_partner_status', {
        p_insurance_partner_id: id,
        p_expected_version: expectedVersion,
        p_operational_status_reference_value_id:
          statusReferenceValueId,
        p_actor_user_id: actorUserId,
      });

    if (error) {
      throw error;
    }

    return data as string | null;
  }

  async softDelete(
    id: string,
    expectedVersion: number,
    actorUserId: string,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .rpc('soft_delete_insurance_partner', {
        p_insurance_partner_id: id,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
      });

    if (error) {
      throw error;
    }

    return data as string | null;
  }

  async createContact(input: {
    insurancePartnerContactId: string;
    insurancePartnerId: string;
    contactTypeReferenceValueId: string;
    contactName: string;
    designation?: string | null;
    emailAddress?: string | null;
    phoneNumber: string;
    mobileNumber?: string | null;
    actorUserId: string;
  }): Promise<string> {
    const { data, error } = await this.databaseService
      .getClient()
      .rpc('create_insurance_partner_contact', {
        p_insurance_partner_contact_id:
          input.insurancePartnerContactId,
        p_insurance_partner_id: input.insurancePartnerId,
        p_contact_type_reference_value_id:
          input.contactTypeReferenceValueId,
        p_contact_name: input.contactName,
        p_designation: input.designation ?? null,
        p_email_address: input.emailAddress ?? null,
        p_phone_number: input.phoneNumber,
        p_mobile_number: input.mobileNumber ?? null,
        p_actor_user_id: input.actorUserId,
      });

    if (error) {
      throw error;
    }

    return data as string;
  }

  async updateContact(
    partnerId: string,
    contactId: string,
    expectedVersion: number,
    actorUserId: string,
    patch: Record<string, string | null>,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .rpc('update_insurance_partner_contact', {
        p_insurance_partner_contact_id: contactId,
        p_insurance_partner_id: partnerId,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
        p_patch: patch,
      });

    if (error) {
      throw error;
    }

    return data as string | null;
  }

  async setPrimaryContact(
    partnerId: string,
    contactId: string,
    expectedVersion: number,
    actorUserId: string,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .rpc('set_insurance_partner_primary_contact', {
        p_insurance_partner_contact_id: contactId,
        p_insurance_partner_id: partnerId,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
      });

    if (error) {
      throw error;
    }

    return data as string | null;
  }

  async softDeleteContact(
    partnerId: string,
    contactId: string,
    expectedVersion: number,
    actorUserId: string,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .rpc('soft_delete_insurance_partner_contact', {
        p_insurance_partner_contact_id: contactId,
        p_insurance_partner_id: partnerId,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
      });

    if (error) {
      throw error;
    }

    return data as string | null;
  }
}