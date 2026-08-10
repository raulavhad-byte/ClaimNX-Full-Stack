import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { InsuranceProductPlan } from '../domain/insurance-partner.aggregate';
import { InsuranceDatabaseMapper, InsuranceProductPlanPersistenceRow } from './insurance-database.mapper';

@Injectable()
export class InsuranceProductPlanRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveById(insurancePartnerId: string, planId: string): Promise<InsuranceProductPlan | null> {
    const { data, error } = await this.databaseService.getClient()
      .from('insurance_product_plan')
      .select('insurance_product_plan_id, insurance_partner_id, plan_code, plan_name, description, operational_status_reference_value_id, version, deleted_at')
      .eq('insurance_product_plan_id', planId)
      .eq('insurance_partner_id', insurancePartnerId)
      .is('deleted_at', null)
      .maybeSingle<InsuranceProductPlanPersistenceRow>();
    if (error) throw error;
    return data ? InsuranceDatabaseMapper.toProductPlan(data) : null;
  }

  async create(input: {
    insuranceProductPlanId: string; insurancePartnerId: string; planCode: string; planName: string;
    description?: string | null; operationalStatusReferenceValueId: string; actorUserId: string;
  }): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc('create_insurance_product_plan', {
      p_insurance_product_plan_id: input.insuranceProductPlanId, p_insurance_partner_id: input.insurancePartnerId,
      p_plan_code: input.planCode, p_plan_name: input.planName, p_description: input.description ?? null,
      p_operational_status_reference_value_id: input.operationalStatusReferenceValueId, p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string;
  }

  async update(partnerId: string, planId: string, expectedVersion: number, actorUserId: string, patch: Record<string, string | null>): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('update_insurance_product_plan', {
      p_insurance_product_plan_id: planId, p_insurance_partner_id: partnerId,
      p_expected_version: expectedVersion, p_actor_user_id: actorUserId, p_patch: patch,
    });
    if (error) throw error;
    return data as string | null;
  }

  async setStatus(partnerId: string, planId: string, expectedVersion: number, statusReferenceValueId: string, actorUserId: string): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('set_insurance_product_plan_status', {
      p_insurance_product_plan_id: planId, p_insurance_partner_id: partnerId, p_expected_version: expectedVersion,
      p_operational_status_reference_value_id: statusReferenceValueId, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  async softDelete(partnerId: string, planId: string, expectedVersion: number, actorUserId: string): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('soft_delete_insurance_product_plan', {
      p_insurance_product_plan_id: planId, p_insurance_partner_id: partnerId,
      p_expected_version: expectedVersion, p_actor_user_id: actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }
}
