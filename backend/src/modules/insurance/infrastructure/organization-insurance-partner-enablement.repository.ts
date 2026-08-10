import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { OrganizationInsurancePartnerEnablement } from '../domain/insurance-partner.aggregate';
import {
  InsuranceDatabaseMapper,
  OrganizationInsurancePartnerEnablementPersistenceRow,
} from './insurance-database.mapper';

@Injectable()
export class OrganizationInsurancePartnerEnablementRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveById(organizationId: string, enablementId: string): Promise<OrganizationInsurancePartnerEnablement | null> {
    const { data, error } = await this.databaseService.getClient()
      .from('organization_insurance_partner_enablement')
      .select('organization_insurance_partner_enablement_id, organization_id, insurance_partner_id, tenant_partner_code, operational_status_reference_value_id, version, deleted_at')
      .eq('organization_insurance_partner_enablement_id', enablementId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle<OrganizationInsurancePartnerEnablementPersistenceRow>();
    if (error) throw error;
    return data ? InsuranceDatabaseMapper.toEnablement(data) : null;
  }

  async create(input: {
    organizationInsurancePartnerEnablementId: string; organizationId: string; insurancePartnerId: string;
    tenantPartnerCode?: string | null; operationalStatusReferenceValueId: string; actorUserId: string;
  }): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc('create_organization_insurance_partner_enablement', {
      p_organization_insurance_partner_enablement_id: input.organizationInsurancePartnerEnablementId,
      p_organization_id: input.organizationId, p_insurance_partner_id: input.insurancePartnerId,
      p_tenant_partner_code: input.tenantPartnerCode ?? null,
      p_operational_status_reference_value_id: input.operationalStatusReferenceValueId,
      p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string;
  }

  async update(organizationId: string, enablementId: string, expectedVersion: number, actorUserId: string, patch: Record<string, string | null>): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('update_organization_insurance_partner_enablement', {
      p_organization_insurance_partner_enablement_id: enablementId, p_organization_id: organizationId,
      p_expected_version: expectedVersion, p_actor_user_id: actorUserId, p_patch: patch,
    });
    if (error) throw error;
    return data as string | null;
  }

  async setStatus(organizationId: string, enablementId: string, expectedVersion: number, statusReferenceValueId: string, actorUserId: string): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('set_organization_insurance_partner_enablement_status', {
      p_organization_insurance_partner_enablement_id: enablementId, p_organization_id: organizationId,
      p_expected_version: expectedVersion, p_operational_status_reference_value_id: statusReferenceValueId,
      p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  async softDelete(organizationId: string, enablementId: string, expectedVersion: number, actorUserId: string): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('soft_delete_organization_insurance_partner_enablement', {
      p_organization_insurance_partner_enablement_id: enablementId, p_organization_id: organizationId,
      p_expected_version: expectedVersion, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }
}
