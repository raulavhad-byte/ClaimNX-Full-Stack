import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { Claim } from '../domain/claim.aggregate';
import {
  ClaimDatabaseMapper,
  ClaimListRecord,
  ClaimPersistenceRow,
} from './claim.database.mapper';

export interface ListActiveClaimsQuery {
  organizationId: string;
  hospitalId: string;
  claimProductReferenceValueId?: string;
  lifecycleStatusReferenceValueId?: string;
}

export interface CreateClaimPersistenceInput {
  claimId: string;
  claimStatusHistoryId: string;
  organizationId: string;
  hospitalId: string;
  patientId?: string | null;
  claimProductReferenceValueId: string;
  claimTypeReferenceValueId: string;
  draftLifecycleStatusReferenceValueId: string;
  hospitalInsurancePartnerIntegrationId?: string | null;
  currencyCode: string;
  totalClaimedAmount: number;
  authorizationReference?: string | null;
  actorUserId: string;
}

export interface TransitionClaimLifecyclePersistenceInput {
  claimId: string;
  organizationId: string;
  hospitalId: string;
  expectedVersion: number;
  targetLifecycleStatusReferenceValueId: string;
  claimStatusHistoryId: string;
  transitionReason: string;
  actorUserId: string;
}

export interface CreateClaimAuthorizationPersistenceInput {
  claimAuthorizationId: string;
  organizationId: string;
  hospitalId: string;
  claimId: string;
  authorizationTypeReferenceValueId: string;
  authorizationStatusReferenceValueId: string;
  authorizationNumber?: string | null;
  approvedAmount?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  actorUserId: string;
}

export interface CreateClaimQueryPersistenceInput {
  claimQueryId: string;
  organizationId: string;
  hospitalId: string;
  claimId: string;
  queryTypeReferenceValueId: string;
  queryStatusReferenceValueId: string;
  payerQueryReference?: string | null;
  queryText: string;
  dueAt?: string | null;
  actorUserId: string;
}

export interface CreateClaimSubmissionIntentPersistenceInput {
  claimSubmissionIntentId: string;
  organizationId: string;
  hospitalId: string;
  claimId: string;
  hospitalInsurancePartnerIntegrationId: string;
  channelReferenceValueId: string;
  submissionStatusReferenceValueId: string;
  actorUserId: string;
}

/**
 * Phase 8 read repository. Every query uses Organization and Hospital scope;
 * legacy Claim fields are never returned to new application code.
 */
@Injectable()
export class ClaimRepository {
  private static readonly canonicalColumns = [
    'id', 'organization_id', 'hospital_id', 'claim_number',
    'claim_product_reference_value_id', 'claim_type_reference_value_id',
    'lifecycle_status_reference_value_id', 'hospital_insurance_partner_integration_id',
    'patient_id', 'currency_code', 'total_claimed_amount', 'approved_amount',
    'authorization_reference', 'external_submission_reference', 'closure_reason',
    'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted_by', 'deleted_at', 'version',
    'claim_product:reference_values!fk_claims_product_reference_value(code)',
    'lifecycle_status:reference_values!fk_claims_lifecycle_status_reference_value(code)',
  ].join(', ');

  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveById(
    organizationId: string,
    hospitalId: string,
    claimId: string,
  ): Promise<Claim | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('claims')
      .select(ClaimRepository.canonicalColumns)
      .eq('id', claimId)
      .eq('organization_id', organizationId)
      .eq('hospital_id', hospitalId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data ? ClaimDatabaseMapper.toAggregate(this.toPersistenceRow(data)) : null;
  }

  async listActive(input: ListActiveClaimsQuery): Promise<ClaimListRecord[]> {
    let query = this.databaseService
      .getClient()
      .from('claims')
      .select(ClaimRepository.canonicalColumns)
      .eq('organization_id', input.organizationId)
      .eq('hospital_id', input.hospitalId)
      .eq('is_deleted', false)
      .is('deleted_at', null);

    if (input.claimProductReferenceValueId) {
      query = query.eq('claim_product_reference_value_id', input.claimProductReferenceValueId);
    }
    if (input.lifecycleStatusReferenceValueId) {
      query = query.eq('lifecycle_status_reference_value_id', input.lifecycleStatusReferenceValueId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ClaimDatabaseMapper.toListRecord(this.toPersistenceRow(row)));
  }

  async create(input: CreateClaimPersistenceInput): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc('create_claim', {
      p_claim_id: input.claimId,
      p_claim_status_history_id: input.claimStatusHistoryId,
      p_organization_id: input.organizationId,
      p_hospital_id: input.hospitalId,
      p_patient_id: input.patientId ?? null,
      p_claim_product_reference_value_id: input.claimProductReferenceValueId,
      p_claim_type_reference_value_id: input.claimTypeReferenceValueId,
      p_draft_lifecycle_status_reference_value_id: input.draftLifecycleStatusReferenceValueId,
      p_hospital_insurance_partner_integration_id: input.hospitalInsurancePartnerIntegrationId ?? null,
      p_currency_code: input.currencyCode,
      p_total_claimed_amount: input.totalClaimedAmount,
      p_authorization_reference: input.authorizationReference ?? null,
      p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string;
  }

  async transitionLifecycle(input: TransitionClaimLifecyclePersistenceInput): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('transition_claim_lifecycle', {
      p_claim_id: input.claimId,
      p_organization_id: input.organizationId,
      p_hospital_id: input.hospitalId,
      p_expected_version: input.expectedVersion,
      p_target_lifecycle_status_reference_value_id: input.targetLifecycleStatusReferenceValueId,
      p_claim_status_history_id: input.claimStatusHistoryId,
      p_transition_reason: input.transitionReason,
      p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  async createAuthorization(input: CreateClaimAuthorizationPersistenceInput): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('create_claim_authorization', {
      p_claim_authorization_id: input.claimAuthorizationId, p_organization_id: input.organizationId,
      p_hospital_id: input.hospitalId, p_claim_id: input.claimId,
      p_authorization_type_reference_value_id: input.authorizationTypeReferenceValueId,
      p_authorization_status_reference_value_id: input.authorizationStatusReferenceValueId,
      p_authorization_number: input.authorizationNumber ?? null, p_approved_amount: input.approvedAmount ?? null,
      p_valid_from: input.validFrom ?? null, p_valid_until: input.validUntil ?? null, p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  async createQuery(input: CreateClaimQueryPersistenceInput): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('create_claim_query', {
      p_claim_query_id: input.claimQueryId, p_organization_id: input.organizationId,
      p_hospital_id: input.hospitalId, p_claim_id: input.claimId,
      p_query_type_reference_value_id: input.queryTypeReferenceValueId,
      p_query_status_reference_value_id: input.queryStatusReferenceValueId,
      p_payer_query_reference: input.payerQueryReference ?? null, p_query_text: input.queryText,
      p_due_at: input.dueAt ?? null, p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  async createSubmissionIntent(input: CreateClaimSubmissionIntentPersistenceInput): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc('create_claim_submission_intent', {
      p_claim_submission_intent_id: input.claimSubmissionIntentId,
      p_organization_id: input.organizationId, p_hospital_id: input.hospitalId, p_claim_id: input.claimId,
      p_hospital_insurance_partner_integration_id: input.hospitalInsurancePartnerIntegrationId,
      p_channel_reference_value_id: input.channelReferenceValueId,
      p_submission_status_reference_value_id: input.submissionStatusReferenceValueId,
      p_actor_user_id: input.actorUserId,
    });
    if (error) throw error;
    return data as string | null;
  }

  private toPersistenceRow(raw: any): ClaimPersistenceRow {
    return {
      ...raw,
      claim_product_code: raw.claim_product?.code,
      lifecycle_status_code: raw.lifecycle_status?.code,
    } as ClaimPersistenceRow;
  }
}
