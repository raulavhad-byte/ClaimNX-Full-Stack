import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { HospitalInsurancePartnerIntegration } from '../domain/hospital-insurance-partner-integration.aggregate';
import {
  HospitalInsurancePartnerIntegrationDatabaseMapper,
  HospitalInsurancePartnerIntegrationPersistenceRow,
} from './hospital-insurance-partner-integration.database.mapper';

export interface CreateHospitalInsurancePartnerIntegrationPersistenceInput {
  hospitalInsurancePartnerIntegrationId: string;
  organizationId: string;
  hospitalId: string;
  insurancePartnerId: string;
  integrationCode: string;
  submissionChannelReferenceValueId: string;
  payerEmailAddress?: string | null;
  notificationEmailAddress?: string | null;
  portalUrl?: string | null;
  portalUserName?: string | null;
  credentialSecretReference?: string | null;
  operationalStatusReferenceValueId: string;
  actorUserId: string;
}

export interface UpdateHospitalInsurancePartnerIntegrationPersistenceInput {
  organizationId: string;
  hospitalId: string;
  hospitalInsurancePartnerIntegrationId: string;
  expectedVersion: number;
  integrationCode: string;
  submissionChannelReferenceValueId: string;
  payerEmailAddress?: string | null;
  notificationEmailAddress?: string | null;
  portalUrl?: string | null;
  portalUserName?: string | null;
  credentialSecretReference?: string | null;
  actorUserId: string;
}

@Injectable()
export class HospitalInsurancePartnerIntegrationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveById(
    organizationId: string,
    hospitalId: string,
    integrationId: string,
  ): Promise<HospitalInsurancePartnerIntegration | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('hospital_insurance_partner_integration')
      .select(
        'hospital_insurance_partner_integration_id, organization_id, hospital_id, insurance_partner_id, integration_code, submission_channel_reference_value_id, payer_email_address, notification_email_address, portal_url, portal_user_name, operational_status_reference_value_id, version, deleted_at',
      )
      .eq('hospital_insurance_partner_integration_id', integrationId)
      .eq('organization_id', organizationId)
      .eq('hospital_id', hospitalId)
      .is('deleted_at', null)
      .maybeSingle<HospitalInsurancePartnerIntegrationPersistenceRow>();

    if (error) throw error;
    return data ? HospitalInsurancePartnerIntegrationDatabaseMapper.toAggregate(data) : null;
  }

  async listActiveByHospital(
    organizationId: string,
    hospitalId: string,
  ): Promise<HospitalInsurancePartnerIntegration[]> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('hospital_insurance_partner_integration')
      .select(
        'hospital_insurance_partner_integration_id, organization_id, hospital_id, insurance_partner_id, integration_code, submission_channel_reference_value_id, payer_email_address, notification_email_address, portal_url, portal_user_name, operational_status_reference_value_id, version, deleted_at',
      )
      .eq('organization_id', organizationId)
      .eq('hospital_id', hospitalId)
      .is('deleted_at', null)
      .order('integration_code', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) =>
      HospitalInsurancePartnerIntegrationDatabaseMapper.toAggregate(
        row as HospitalInsurancePartnerIntegrationPersistenceRow,
      ),
    );
  }

  async create(input: CreateHospitalInsurancePartnerIntegrationPersistenceInput): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'create_hospital_insurance_partner_integration',
      {
        p_hospital_insurance_partner_integration_id: input.hospitalInsurancePartnerIntegrationId,
        p_organization_id: input.organizationId,
        p_hospital_id: input.hospitalId,
        p_insurance_partner_id: input.insurancePartnerId,
        p_integration_code: input.integrationCode,
        p_submission_channel_reference_value_id: input.submissionChannelReferenceValueId,
        p_payer_email_address: input.payerEmailAddress ?? null,
        p_notification_email_address: input.notificationEmailAddress ?? null,
        p_portal_url: input.portalUrl ?? null,
        p_portal_user_name: input.portalUserName ?? null,
        p_credential_secret_reference: input.credentialSecretReference ?? null,
        p_operational_status_reference_value_id: input.operationalStatusReferenceValueId,
        p_actor_user_id: input.actorUserId,
      },
    );
    if (error) throw error;
    return data as string;
  }

  async update(input: UpdateHospitalInsurancePartnerIntegrationPersistenceInput): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'update_hospital_insurance_partner_integration',
      {
        p_hospital_insurance_partner_integration_id: input.hospitalInsurancePartnerIntegrationId,
        p_organization_id: input.organizationId,
        p_hospital_id: input.hospitalId,
        p_expected_version: input.expectedVersion,
        p_integration_code: input.integrationCode,
        p_submission_channel_reference_value_id: input.submissionChannelReferenceValueId,
        p_payer_email_address: input.payerEmailAddress ?? null,
        p_notification_email_address: input.notificationEmailAddress ?? null,
        p_portal_url: input.portalUrl ?? null,
        p_portal_user_name: input.portalUserName ?? null,
        p_credential_secret_reference: input.credentialSecretReference ?? null,
        p_actor_user_id: input.actorUserId,
      },
    );
    if (error) throw error;
    return data as string | null;
  }

  async setStatus(
    organizationId: string,
    hospitalId: string,
    integrationId: string,
    expectedVersion: number,
    operationalStatusReferenceValueId: string,
    actorUserId: string,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'set_hospital_insurance_partner_integration_status',
      {
        p_hospital_insurance_partner_integration_id: integrationId,
        p_organization_id: organizationId,
        p_hospital_id: hospitalId,
        p_expected_version: expectedVersion,
        p_operational_status_reference_value_id: operationalStatusReferenceValueId,
        p_actor_user_id: actorUserId,
      },
    );
    if (error) throw error;
    return data as string | null;
  }

  async softDelete(
    organizationId: string,
    hospitalId: string,
    integrationId: string,
    expectedVersion: number,
    actorUserId: string,
  ): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'soft_delete_hospital_insurance_partner_integration',
      {
        p_hospital_insurance_partner_integration_id: integrationId,
        p_organization_id: organizationId,
        p_hospital_id: hospitalId,
        p_expected_version: expectedVersion,
        p_actor_user_id: actorUserId,
      },
    );
    if (error) throw error;
    return data as string | null;
  }
}
