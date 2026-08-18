import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { CreateReimbursementCaseDto, ReimbursementProductCode } from './dto/create-reimbursement-case.dto';
import { TransitionReimbursementCaseDto } from './dto/transition-reimbursement-case.dto';
import { ReimbursementCaseFilterDto } from './dto/reimbursement-case-filter.dto';

interface Actor { id: string; role?: string | null; hospitalId?: string | null; }

const ADMIN_ROLES = new Set(['SUPER ADMIN', 'ADMIN', 'PRIMARY ADMIN', 'AUDIT DIRECTOR']);

// Role names are normalized server-side.  The System Admin role catalogue may
// map its own display labels to these product permissions later without putting
// authorization rules in React.
const CREATE_ROLES: Record<ReimbursementProductCode, readonly string[]> = {
  ICA: ['HOSPITAL_COORDINATOR', 'CLAIM_EXECUTIVE'],
  PRE_POST: ['PATIENT', 'CLAIM_EXECUTIVE'],
  PARTNER_PROCESSING: ['SYSTEM_SERVICE_ACCOUNT', 'INTEGRATIONS_HEAD', 'PARTNER_DESK_LEAD'],
  KYP: ['INTAKE_DESK', 'PATIENT_APP', 'POLICY_EXPERT', 'MEDICAL_AUDITOR'],
  RECOVERY_RECON: ['RECOVERY_OFFICER', 'RECON_ANALYST', 'FINANCE_EXECUTIVE'],
};

@Injectable()
export class ReimbursementService {
  constructor(private readonly database: DatabaseService) {}
  private get db() { return this.database.getClient(); }

  async create(input: CreateReimbursementCaseDto, actor: Actor) {
    await this.assertHospitalScope(input.hospitalId, actor);
    this.assertRole(actor, CREATE_ROLES[input.productCode]);
    if (input.productCode === 'PRE_POST' && !input.parentCaseId) {
      throw new BadRequestException('A Pre & Post case requires its verified parent ICA reimbursement case.');
    }
    if (input.productCode === 'RECOVERY_RECON' && !input.claimId) {
      throw new BadRequestException('A Recovery & Recon case requires a settled or repudiated master claim.');
    }

    const { data: hospital, error: hospitalError } = await this.db
      .from('hospitals').select('organization_id').eq('id', input.hospitalId).eq('is_deleted', false).maybeSingle();
    if (hospitalError) throw hospitalError;
    if (!hospital?.organization_id) throw new NotFoundException('Active hospital not found.');

    if (input.productCode === 'PRE_POST') {
      const { data: parent, error: parentError } = await this.db
        .from('reimbursement_cases')
        .select('id, product_code, hospital_id, is_deleted')
        .eq('id', input.parentCaseId).maybeSingle();
      if (parentError) throw parentError;
      if (!parent || parent.is_deleted || parent.product_code !== 'ICA' || parent.hospital_id !== input.hospitalId) {
        throw new BadRequestException('The parent case must be an active ICA reimbursement case for the selected hospital.');
      }
    }

    if (input.productCode === 'RECOVERY_RECON') {
      const { data: claim, error: claimError } = await this.db
        .from('claims').select('id, hospital_id, is_deleted').eq('id', input.claimId).maybeSingle();
      if (claimError) throw claimError;
      if (!claim || claim.is_deleted || claim.hospital_id !== input.hospitalId) {
        throw new BadRequestException('Recovery & Recon must reference an active master claim for the selected hospital.');
      }
    }

    const { data: firstStage, error: stageError } = await this.db
      .from('reimbursement_workflow_stages').select('status_code')
      .eq('product_code', input.productCode).order('display_order', { ascending: true }).limit(1).maybeSingle();
    if (stageError) throw stageError;
    if (!firstStage?.status_code) throw new BadRequestException('Reimbursement workflow configuration is unavailable.');

    const caseReference = `${input.productCode.slice(0, 6)}-${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
    const row = {
      organization_id: hospital.organization_id, hospital_id: input.hospitalId,
      claim_id: input.claimId ?? null, parent_case_id: input.parentCaseId ?? null,
      product_code: input.productCode, case_reference: caseReference,
      status_code: firstStage.status_code, patient_id: input.patientId ?? null,
      payer_id: input.payerId ?? null, total_claimed_amount: input.totalClaimedAmount ?? 0,
      metadata: input.metadata ?? {}, created_by: actor.id, updated_by: actor.id,
    };
    const { data: created, error } = await this.db.from('reimbursement_cases').insert(row).select().single();
    if (error) throw error;
    const { error: historyError } = await this.db.from('reimbursement_case_transitions').insert({
      case_id: created.id, organization_id: hospital.organization_id, product_code: input.productCode,
      from_status_code: null, to_status_code: firstStage.status_code,
      reason: 'Case created', actor_user_id: actor.id,
    });
    if (historyError) throw historyError;
    return created;
  }

  async list(filter: ReimbursementCaseFilterDto, actor: Actor) {
    const hospitalId = filter.hospitalId ?? actor.hospitalId;
    if (!hospitalId) throw new BadRequestException('A hospital scope is required.');
    await this.assertHospitalScope(hospitalId, actor);
    let query = this.db.from('reimbursement_cases').select('*').eq('hospital_id', hospitalId).eq('is_deleted', false).order('updated_at', { ascending: false });
    if (filter.productCode) query = query.eq('product_code', filter.productCode);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async transition(caseId: string, input: TransitionReimbursementCaseDto, actor: Actor) {
    const { data: item, error } = await this.db.from('reimbursement_cases').select('*').eq('id', caseId).eq('is_deleted', false).maybeSingle();
    if (error) throw error;
    if (!item) throw new NotFoundException('Reimbursement case not found.');
    await this.assertHospitalScope(item.hospital_id, actor);
    this.assertTransitionRole(String(item.product_code), input.targetStatusCode, actor);

    const { data: target, error: targetError } = await this.db.from('reimbursement_workflow_stages').select('status_code, display_order, is_terminal')
      .eq('product_code', item.product_code).eq('status_code', input.targetStatusCode).maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new BadRequestException('Target status is not valid for this reimbursement product.');
    const { data: current, error: currentError } = await this.db.from('reimbursement_workflow_stages').select('display_order')
      .eq('product_code', item.product_code).eq('status_code', item.status_code).maybeSingle();
    if (currentError) throw currentError;
    if (!current || target.display_order <= current.display_order) {
      throw new BadRequestException('Reimbursement cases can move forward only. Reopen or amendment actions require their dedicated authorised endpoint.');
    }

    const { data: updated, error: updateError } = await this.db.from('reimbursement_cases').update({
      status_code: target.status_code, updated_by: actor.id, updated_at: new Date().toISOString(),
      closed_at: target.is_terminal ? new Date().toISOString() : null, version: item.version + 1,
    }).eq('id', item.id).eq('version', item.version).select().maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new BadRequestException('Case was changed by another user. Reload and retry.');
    const { error: auditError } = await this.db.from('reimbursement_case_transitions').insert({
      case_id: item.id, organization_id: item.organization_id, product_code: item.product_code,
      from_status_code: item.status_code, to_status_code: target.status_code,
      reason: input.reason?.trim() || null, metadata: input.metadata ?? {}, actor_user_id: actor.id,
    });
    if (auditError) throw auditError;
    return updated;
  }

  private normalizeRole(role?: string | null) { return String(role ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'); }
  private assertRole(actor: Actor, allowed: readonly string[]) {
    const role = this.normalizeRole(actor.role);
    if (ADMIN_ROLES.has(role) || allowed.includes(role)) return;
    throw new ForbiddenException('Your role is not authorised for this reimbursement operation.');
  }
  private assertTransitionRole(product: string, target: string, actor: Actor) {
    if (ADMIN_ROLES.has(this.normalizeRole(actor.role))) return;
    const roles = product === 'KYP' ? ['POLICY_EXPERT', 'MEDICAL_AUDITOR', 'MEDICAL_DIRECTOR', 'CHIEF_UNDERWRITER']
      : product === 'PARTNER_PROCESSING' ? ['PARTNER_DESK_LEAD', 'CLAIM_EXECUTIVE', 'FINANCE_EXECUTIVE', 'SYSTEM_SYNC']
      : product === 'RECOVERY_RECON' ? ['RECOVERY_OFFICER', 'RECON_ANALYST', 'GRIEVANCE_LEAD', 'LEGAL_COUNSEL', 'LEGAL_HEAD', 'FINANCE_CONTROLLER', 'CFO']
      : product === 'PRE_POST' ? ['CLAIM_EXECUTIVE', 'MEDICAL_AUDITOR', 'FINANCIAL_AUDITOR', 'DISPATCH_OFFICER', 'FINANCE_EXECUTIVE']
      : ['HOSPITAL_COORDINATOR', 'CLAIM_EXECUTIVE', 'MEDICAL_AUDITOR', 'DOCTOR_REVIEWER', 'FINANCIAL_AUDITOR', 'BILLING_HEAD', 'DISPATCH_OFFICER', 'OPERATIONS_LEAD', 'OPS_MANAGER', 'FINANCE_EXECUTIVE', 'CLAIMS_HEAD'];
    this.assertRole(actor, roles);
  }
  private async assertHospitalScope(hospitalId: string, actor: Actor) {
    if (ADMIN_ROLES.has(this.normalizeRole(actor.role))) return;
    if (actor.hospitalId === hospitalId) return;
    throw new ForbiddenException('You are not authorised to access this hospital reimbursement case.');
  }
}
