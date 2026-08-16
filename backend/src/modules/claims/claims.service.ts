import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { DatabaseService } from '../../database/database.service';

import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { ClaimFilterDto } from './dto/claim-filter.dto';
import { CrmDecisionDto } from './dto/crm-decision.dto';
import { CrmCommentDto } from './dto/crm-comment.dto';
import {
  canUpdateClaimAtStage,
  getStageUpdatePermission,
} from './claim-stage-permissions';
import type { ClaimStageActor } from './claim-stage-permissions';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  private get supabase() {
    return this.databaseService.getClient();
  }

  async create(createClaimDto: CreateClaimDto, actorUserId: string) {
    const hospital = await this.requireHospitalContext(
      createClaimDto.hospital_id,
      actorUserId,
    );
    const [productReferenceId, claimTypeReferenceId, lifecycleReferenceId] = await Promise.all([
      // Master data in earlier environments uses ICA for the cashless CPC
      // workflow and CASHLESS_PREAUTH for its claim type. Accept both the
      // current and legacy codes, in priority order.
      this.requireReferenceValue('CLAIM_PRODUCT', ['CPC', 'ICA', 'CASHLESS']),
      this.requireReferenceValue('CLAIM_TYPE', ['CASHLESS', 'CASHLESS_PREAUTH']),
      this.requireReferenceValue('CLAIM_LIFECYCLE_STATUS', 'DRAFT'),
    ]);

    // Never trust a browser-generated case reference. Multiple hospitals and
    // concurrent browser sessions can otherwise produce the same value (for
    // example, "CPC-101"). The legacy case_ref_id is globally unique, while
    // claim_number is a readable organization-scoped number when the database
    // allocator is available.
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const caseReferenceId = `CASE-${randomUUID()}`;
      const claimNumber = await this.allocateClaimNumber(hospital.organization_id);
      const { data, error } = await this.supabase
        .from('claims')
        .insert({
          ...createClaimDto,
          case_ref_id: caseReferenceId,
          organization_id: hospital.organization_id,
          claim_number: claimNumber,
          claim_product_reference_value_id: productReferenceId,
          claim_type_reference_value_id: claimTypeReferenceId,
          lifecycle_status_reference_value_id: lifecycleReferenceId,
          created_by: actorUserId,
          updated_by: actorUserId,
          last_updated_by: actorUserId,
          is_deleted: false,
          version: 1,
        })
        .select()
        .single();

      if (!error) return data;
      lastError = error;
      // Retry only for the database's uniqueness check. All validation and
      // availability errors must remain visible to the caller immediately.
      if (error.code !== '23505') throw error;
    }

    throw lastError;
  }

  private async allocateClaimNumber(organizationId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('allocate_claim_number', {
      p_organization_id: organizationId,
    });

    if (!error && typeof data === 'string' && data.trim()) {
      return data;
    }

    // The UUID fallback keeps production claim creation collision-proof even
    // during a rolling deployment where an older database has not yet received
    // the allocator migration. It is also safe for any future tenant count.
    console.warn('Claim number allocator unavailable; using UUID fallback.', error?.message);
    return `CLM-${randomUUID()}`;
  }

  private async requireHospitalContext(
    hospitalId: string,
    actorUserId: string,
  ): Promise<{ id: string; organization_id: string }> {
    const { data, error } = await this.supabase
      .from('hospitals')
      .select('id, organization_id')
      .eq('id', hospitalId)
      .eq('is_deleted', false)
      .maybeSingle<{ id: string; organization_id: string }>();

    if (error) throw error;
    if (data?.organization_id) {
      return data;
    }

    // Legacy Hospital Onboarding created a user profile but did not create the
    // corresponding hospitals row. Provision that missing database hospital
    // only for a Hospital entity, then permanently link the user to it.
    const { data: hospitalUser, error: userError } = await this.supabase
      .from('users')
      .select('id, display_name, email, mobile_no, role, entity_type, profile_data')
      .eq('id', hospitalId)
      .eq('is_deleted', false)
      .maybeSingle<{
        id: string;
        display_name: string;
        email: string;
        mobile_no: string | null;
        role: string | null;
        entity_type: string | null;
        profile_data: Record<string, unknown> | null;
      }>();

    if (userError) throw userError;
    const isHospitalProfile = hospitalUser?.entity_type === 'Hospital' ||
      /^hospital\b/i.test(hospitalUser?.role ?? '');
    if (!hospitalUser || !isHospitalProfile) {
      throw new NotFoundException(
        'The selected hospital does not have an active organization assignment.',
      );
    }

    const { data: organizations, error: organizationError } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('status', 'ACTIVE')
      .eq('is_deleted', false)
      .limit(2);
    if (organizationError) throw organizationError;
    if (!organizations || organizations.length !== 1) {
      throw new BadRequestException(
        'Hospital onboarding requires exactly one active organization. Assign this hospital to an organization before creating a claim.',
      );
    }

    const profile = hospitalUser.profile_data ?? {};
    const hospitalName = String(profile.hospitalName ?? hospitalUser.display_name ?? '').trim();
    if (!hospitalName) {
      throw new BadRequestException('The Hospital profile needs a hospital name before creating a claim.');
    }

    // These are mandatory legacy columns in the hospitals table. Reuse the
    // configured default values rather than inserting null and failing after
    // the patient record has already been created.
    const { data: hospitalDefaults, error: defaultsError } = await this.supabase
      .from('hospitals')
      .select('hospital_type_reference_value_id, operational_status_reference_value_id')
      .eq('is_deleted', false)
      .not('hospital_type_reference_value_id', 'is', null)
      .not('operational_status_reference_value_id', 'is', null)
      .limit(1)
      .maybeSingle<{
        hospital_type_reference_value_id: string;
        operational_status_reference_value_id: string;
      }>();
    if (defaultsError) throw defaultsError;
    if (!hospitalDefaults) {
      throw new BadRequestException(
        'Hospital master configuration is incomplete. Configure a Hospital Type and Operational Status before onboarding hospitals.',
      );
    }

    const { data: createdHospital, error: createHospitalError } = await this.supabase
      .from('hospitals')
      .insert({
        organization_id: organizations[0].id,
        hospital_name: hospitalName,
        display_name: hospitalName,
        hospital_code: `HOSP-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        hospital_type: 'General Hospital',
        hospital_type_reference_value_id: hospitalDefaults.hospital_type_reference_value_id,
        operational_status_reference_value_id: hospitalDefaults.operational_status_reference_value_id,
        rohini_id: profile.rohiniId ? String(profile.rohiniId) : null,
        address: profile.address ? String(profile.address) : null,
        district: profile.district ? String(profile.district) : null,
        state: profile.state ? String(profile.state) : null,
        email: hospitalUser.email,
        phone: hospitalUser.mobile_no,
        status: 'ACTIVE',
        created_by: actorUserId,
        updated_by: actorUserId,
        is_deleted: false,
        version: 1,
      })
      .select('id, organization_id')
      .single<{ id: string; organization_id: string }>();

    if (createHospitalError || !createdHospital) {
      throw new BadRequestException(
        createHospitalError?.message ?? 'Unable to create the missing Hospital database profile.',
      );
    }

    const { error: linkError } = await this.supabase
      .from('users')
      .update({ hospital_id: createdHospital.id, updated_at: new Date().toISOString() })
      .eq('id', hospitalUser.id);
    if (linkError) throw linkError;

    return createdHospital;
  }

  private async requireReferenceValue(
    categoryCode: string,
    valueCodes: string | string[],
  ): Promise<string> {
    const candidates = Array.isArray(valueCodes) ? valueCodes : [valueCodes];
    for (const valueCode of candidates) {
      const { data, error } = await this.supabase
        .from('reference_values')
        .select('id, reference_categories!inner(code)')
        .eq('code', valueCode)
        .eq('reference_categories.code', categoryCode)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .is('deleted_at', null)
        .maybeSingle<{ id: string }>();

      if (error) throw error;
      if (data?.id) return data.id;
    }

    throw new NotFoundException(
      `Required active ${categoryCode} reference value (${candidates.join(' or ')}) was not found.`,
    );
  }

  async findAll(filter?: ClaimFilterDto, actorUserId?: string) {
    if (!actorUserId) {
      throw new BadRequestException('An authenticated user is required to read claims.');
    }

    // Finance, Accounts and Reconciliation users are always scoped in the
    // database. The RPC resolves assigned hospitals plus Zone → State,
    // State, and District mappings from users.profile_data before returning a
    // claim, so the browser never receives an out-of-scope record.
    const { data, error } = await this.supabase
      .rpc('claims_visible_to_user', {
        p_actor_user_id: actorUserId,
        p_status: filter?.status ?? null,
        p_priority: filter?.priority ?? null,
        p_patient_id: filter?.patient_id ?? null,
        p_hospital_id: filter?.hospital_id ?? null,
        p_payer_id: filter?.payer_id ?? null,
      });

    if (error) throw error;

    const claims = [...(data ?? [])].sort((left: any, right: any) =>
      String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')),
    );

    // Keep the hospital identifier as the relational source of truth, but
    // enrich read models with its display name. Queue screens must not expose
    // a UUID when a legacy claim predates the hospital-name snapshot.
    const hospitalIds = [...new Set(claims.map((claim: any) => claim.hospital_id).filter(Boolean))];
    if (hospitalIds.length === 0) return claims;

    const { data: hospitalRows, error: hospitalError } = await this.supabase
      .from('hospitals')
      .select('id, hospital_name, display_name')
      .in('id', hospitalIds);

    if (hospitalError) throw hospitalError;

    const namesById = new Map(
      (hospitalRows ?? []).map((hospital) => [
        hospital.id,
        hospital.display_name || hospital.hospital_name,
      ]),
    );

    return claims.map((claim: any) => ({
      ...claim,
      hospital_name: namesById.get(claim.hospital_id) ?? null,
    }));
  }

  async findOne(id: string, actorUserId?: string) {
    const { data, error } = await this.supabase
      .from('claims')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      throw new NotFoundException('Claim not found');
    }

    if (actorUserId) {
      await this.assertClaimVisibleToUser(data, actorUserId, 'view');
    }

    return data;
  }

  async update(
    id: string,
    updateClaimDto: UpdateClaimDto,
    actor: ClaimStageActor,
  ) {
    const currentClaim = await this.findOne(id);
    await this.assertClaimVisibleToUser(currentClaim, actor.id, 'update');

    const isStageChange = Boolean(
      updateClaimDto.status && updateClaimDto.status !== currentClaim.status,
    );
    if (isStageChange && !canUpdateClaimAtStage(actor, currentClaim.status)) {
      const requiredPermission = getStageUpdatePermission(currentClaim.status);
      throw new ForbiddenException(
        `Your role cannot update claims in the "${currentClaim.status}" stage. ` +
        `Required permission: ${requiredPermission}.`,
      );
    }

    this.assertFinanceSettlementTransition(currentClaim.status, updateClaimDto.status);
    this.assertRecoverablePartialSettlementReason(
      currentClaim.status,
      updateClaimDto.status,
      updateClaimDto.form_data,
    );

    const { data, error } = await this.supabase
      .from('claims')
      .update({
        ...updateClaimDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Claim not found');
    }

    return data;
  }

  /** CRM queue ownership is server-controlled so the browser cannot assign a
   * case to another user or manufacture a review transition. */
  async acceptForCrmReview(id: string, actor: ClaimStageActor) {
    this.assertCrmActor(actor);
    const claim = await this.findOne(id);
    await this.assertClaimVisibleToUser(claim, actor.id, 'update');

    const formData = { ...(claim.form_data ?? {}) };
    const review = formData.crmReviewStatus;
    const assignedUserId = formData.assignedCrmUserId;
    if (review === 'Processed') {
      throw new BadRequestException('A processed CRM claim cannot be accepted again.');
    }
    if (assignedUserId && assignedUserId !== actor.id) {
      throw new ForbiddenException('This claim is already under review by another CRM user.');
    }

    const actorName = await this.getActorDisplayName(actor.id);
    const now = new Date().toISOString();
    const history = Array.isArray(formData.history) ? formData.history : [];
    const nextFormData = {
      ...formData,
      assignedCrmUserId: actor.id,
      assignedCrmUserName: actorName,
      crmReviewStatus: 'Under Review',
      history: [{
        id: `crm-accepted-${randomUUID()}`,
        date: now,
        status: claim.status,
        type: 'status_change',
        comment: `CRM claim accepted by ${actorName}; moved to Under Review.`,
      }, ...history],
    };

    return this.persistCrmWorkflow(id, nextFormData, actor.id);
  }

  /** Records the CRM decision and comment as a timeline event, then releases
   * the claim into the processed queue. The decision is intentionally stored
   * in form_data alongside the legacy claim timeline until CRM columns are
   * promoted through a dedicated schema migration. */
  async submitCrmDecision(id: string, decision: CrmDecisionDto, actor: ClaimStageActor) {
    this.assertCrmActor(actor);
    const claim = await this.findOne(id);
    await this.assertClaimVisibleToUser(claim, actor.id, 'update');

    const formData = { ...(claim.form_data ?? {}) };
    if (formData.crmReviewStatus !== 'Under Review' || formData.assignedCrmUserId !== actor.id) {
      throw new ForbiddenException('Only the CRM user assigned to an Under Review claim can submit its decision.');
    }

    const actorName = await this.getActorDisplayName(actor.id);
    const now = new Date().toISOString();
    const history = Array.isArray(formData.history) ? formData.history : [];
    const nextFormData = {
      ...formData,
      assignedCrmUserId: null,
      assignedCrmUserName: null,
      crmReviewStatus: 'Processed',
      crmDecision: {
        decision: 'Completed',
        comment: decision.comment.trim(),
        attachments: decision.attachments ?? [],
        completedAt: now,
        completedByUserId: actor.id,
        completedByUserName: actorName,
      },
      history: [{
        id: `crm-decision-${randomUUID()}`,
        date: now,
        status: claim.status,
        type: 'status_change',
        comment: `CRM action completed by ${actorName}. Comment: ${decision.comment.trim()}`,
        stageData: { documents: decision.attachments ?? [] },
      }, ...history],
    };

    return this.persistCrmWorkflow(id, nextFormData, actor.id);
  }

  /** A CRM note is a non-transitioning operational activity. It is available
   * at every claim stage and must never release, assign, or re-stage a claim. */
  async addCrmComment(id: string, input: CrmCommentDto, actor: ClaimStageActor) {
    this.assertCrmActor(actor);
    const claim = await this.findOne(id);
    await this.assertClaimVisibleToUser(claim, actor.id, 'update');

    const actorName = await this.getActorDisplayName(actor.id);
    const now = new Date().toISOString();
    const formData = { ...(claim.form_data ?? {}) };
    const history = Array.isArray(formData.history) ? formData.history : [];
    const attachments = input.attachments ?? [];
    return this.persistCrmWorkflow(id, {
      ...formData,
      history: [{
        id: `crm-comment-${randomUUID()}`,
        date: now,
        status: claim.status,
        type: 'status_change',
        comment: `CRM comment by ${actorName}: ${input.comment.trim()}`,
        stageData: { documents: attachments },
      }, ...history],
    }, actor.id);
  }

  async getCrmPerformance(actor: ClaimStageActor) {
    this.assertCrmActor(actor);
    const { data, error } = await this.supabase.rpc('claims_visible_to_user', {
      p_actor_user_id: actor.id, p_status: null, p_priority: null,
      p_patient_id: null, p_hospital_id: null, p_payer_id: null,
    });
    if (error) throw error;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const decisions = (data ?? []).map((claim: any) => claim.form_data?.crmDecision)
      .filter((entry: any) => entry?.completedByUserId === actor.id && entry.completedAt);
    const countSince = (start: Date) => decisions.filter((entry: any) =>
      new Date(entry.completedAt).getTime() >= start.getTime()).length;

    return {
      today: countSince(startOfToday),
      weekly: countSince(startOfWeek),
      monthly: countSince(startOfMonth),
      totalProcessed: decisions.length,
      approved: 0,
      queries: 0,
      rejected: 0,
    };
  }

  private async persistCrmWorkflow(id: string, formData: Record<string, unknown>, actorUserId: string) {
    const { data, error } = await this.supabase.from('claims').update({
      form_data: formData,
      updated_at: new Date().toISOString(),
      updated_by: actorUserId,
      last_updated_by: actorUserId,
    }).eq('id', id).eq('is_deleted', false).select().single();
    if (error || !data) throw new NotFoundException('Claim not found');
    return data;
  }

  private async getActorDisplayName(actorUserId: string): Promise<string> {
    const { data, error } = await this.supabase.from('users')
      .select('display_name').eq('id', actorUserId).maybeSingle<{ display_name: string | null }>();
    if (error) throw error;
    return data?.display_name?.trim() || 'CRM User';
  }

  private assertCrmActor(actor: ClaimStageActor) {
    const role = String(actor.role ?? '').trim().toUpperCase();
    const permissions = Array.isArray(actor.permissions) ? actor.permissions : [];
    const hasCrmPermission = permissions.some((permission) => typeof permission === 'string' && (
      permission === 'all' || permission.startsWith('crm:') || permission === 'nav_crm'
    ));
    if (['SUPER ADMIN', 'ADMIN', 'PRIMARY ADMIN'].includes(role) || role.includes('CRM') || hasCrmPermission) return;
    throw new ForbiddenException('CRM workflow actions require CRM access.');
  }

  private async assertClaimVisibleToUser(
    claim: any,
    actorUserId: string,
    action: 'view' | 'update',
  ) {
    const { data: visibleClaims, error: visibilityError } = await this.supabase
      .rpc('claims_visible_to_user', {
        p_actor_user_id: actorUserId,
        p_status: null,
        p_priority: null,
        p_patient_id: claim.patient_id ?? null,
        p_hospital_id: claim.hospital_id ?? null,
        p_payer_id: claim.payer_id ?? null,
      });

    if (visibilityError) throw visibilityError;
    if (!(visibleClaims ?? []).some((visibleClaim: any) => visibleClaim.id === claim.id)) {
      throw new ForbiddenException(`You do not have access to ${action} this claim.`);
    }
  }

  /**
   * Recoverable partial settlements are reportable financial outcomes. Keep the
   * taxonomy and the mandatory free-text explanation server-side so direct API
   * callers cannot create incomplete records.
   */
  private assertRecoverablePartialSettlementReason(
    currentStatus?: string,
    nextStatus?: string,
    formData?: Record<string, any>,
  ) {
    const recoverableStatus = 'Partially Claim Settled - Recoverable';
    if (currentStatus === recoverableStatus || nextStatus !== recoverableStatus) return;

    const allowedReasons = new Set([
      'Tariff Deductions',
      'Discount on Package',
      'Non Medical Expenses',
      'Reasonable & Customary Clause',
      'Co-payment',
      'Investigation Charges',
      'SI Exhausted',
      'Other',
    ]);
    const reason = String(formData?.partial_remark_type ?? '').trim();
    if (!allowedReasons.has(reason)) {
      throw new BadRequestException(
        'A valid Partially Settled Reason is required for a recoverable partial settlement.',
      );
    }
    if (reason === 'Other' && !String(formData?.partial_remark_other_comment ?? '').trim()) {
      throw new BadRequestException(
        'Specify the partial settlement reason when Other is selected.',
      );
    }
  }

  private assertFinanceSettlementTransition(currentStatus?: string, nextStatus?: string) {
    if (!currentStatus || !nextStatus || currentStatus === nextStatus) return;

    const transitions: Record<string, string[]> = {
      'File Dispatched': [
        'Claim under process', 'Claim Under query', 'Pending with insurer Medical Team',
        'Claim Approved', 'Partially Claim Settled - Recoverable',
        'Partially Claim Settled - Non-Recoverable', 'Complete Settlement',
      ],
      'Claim under process': [
        'Claim Under query', 'Pending with insurer Medical Team', 'Claim Approved',
        'Partially Claim Settled - Recoverable', 'Partially Claim Settled - Non-Recoverable',
        'Complete Settlement',
      ],
      'Pending with insurer Medical Team': [
        'Claim Under query', 'Claim under process', 'Claim Pending with insurer Medical',
        'Claim Approved', 'Partially Claim Settled - Recoverable',
        'Partially Claim Settled - Non-Recoverable', 'Complete Settlement',
      ],
      'Claim Pending with insurer Medical': [
        'Claim Under query', 'Claim under process', 'Claim Approved',
        'Partially Claim Settled - Recoverable', 'Partially Claim Settled - Non-Recoverable',
        'Complete Settlement',
      ],
      'Claim Under query': [
        'Claim Query Resolved', 'Claim Approved', 'Partially Claim Settled - Recoverable',
        'Partially Claim Settled - Non-Recoverable', 'Complete Settlement',
      ],
      'Claim Query Resolved': [
        'Claim Under query', 'Claim under process', 'Pending with insurer Medical Team',
        'Claim Approved', 'Partially Claim Settled - Recoverable',
        'Partially Claim Settled - Non-Recoverable', 'Complete Settlement',
      ],
      'Claim Approved': [
        'Partially Claim Settled - Recoverable', 'Partially Claim Settled - Non-Recoverable',
        'Complete Settlement',
      ],
      'Partially Claim Settled - Recoverable': [
        'Partially Claim Settled - Non-Recoverable', 'Complete Settlement', 'Account Reconciliation',
      ],
      'Partially Claim Settled - Non-Recoverable': [
        'Complete Settlement', 'Account Reconciliation', 'Bank Reconciliation Completed',
      ],
      'Complete Settlement': [
        'Account Reconciliation', 'Bank Reconciliation Completed', 'Claim Approved',
        'Partially Claim Settled - Recoverable',
      ],
      'Account Reconciliation': [
        'Bank Reconciliation Completed', 'Claim Approved', 'Partially Claim Settled - Recoverable',
      ],
      'Bank Reconciliation Completed': [],
    };

    if (Object.prototype.hasOwnProperty.call(transitions, currentStatus) &&
        !transitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid Finance settlement transition from ${currentStatus} to ${nextStatus}.`,
      );
    }
  }

  async remove(id: string, actor: ClaimStageActor) {
    const claim = await this.findOne(id);
    await this.assertClaimVisibleToUser(claim, actor.id, 'update');
    if (String(claim.status ?? '').trim().toLowerCase() !== 'draft') {
      throw new BadRequestException('Only saved draft claims can be deleted.');
    }

    // Drafts have not entered an operational workflow, so the user has
    // explicitly chosen a true purge rather than retention/audit deletion.
    // Remove private binaries and their document records before deleting the
    // claim row, preventing orphaned storage objects and database rows.
    const { data: documents, error: documentLookupError } = await this.supabase
      .from('documents')
      .select('id, file_path')
      .eq('claim_id', id);
    if (documentLookupError) throw documentLookupError;

    const objectPaths = (documents ?? [])
      .map((document: any) => String(document.file_path ?? ''))
      .filter((path: string) => path.startsWith('claim-documents/'))
      .map((path: string) => path.slice('claim-documents/'.length));
    if (objectPaths.length > 0) {
      const { error: storageError } = await this.supabase.storage
        .from('claim-documents')
        .remove(objectPaths);
      if (storageError) throw storageError;
    }

    const { error: documentDeleteError } = await this.supabase
      .from('documents')
      .delete()
      .eq('claim_id', id);
    if (documentDeleteError) throw documentDeleteError;

    const { error } = await this.supabase
      .from('claims')
      .delete()
      .eq('id', id)
      .eq('is_deleted', false);

    if (error) {
      throw error;
    }

    return {
      message: 'Draft claim permanently deleted successfully',
    };
  }
}
