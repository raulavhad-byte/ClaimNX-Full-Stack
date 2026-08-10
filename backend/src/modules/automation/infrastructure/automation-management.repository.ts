import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AutomationReviewCase } from '../domain/automation-review-case.aggregate';
import { AutomationWorkRequest } from '../domain/automation-work-request.aggregate';
import { PayerDispatchTask } from '../domain/payer-dispatch-task.aggregate';
import { AutomationDatabaseMapper, AutomationJobAttemptPersistenceRow, AutomationReviewCasePersistenceRow, AutomationReviewDecisionPersistenceRow, AutomationWorkRequestPersistenceRow, PayerDispatchTaskPersistenceRow } from './automation-database.mapper';

/** Read boundary for Phase 10. Commands are intentionally added only after the reviewed command-persistence migration. */
@Injectable()
export class AutomationManagementRepository {
  private readonly logger = new Logger(AutomationManagementRepository.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveWorkRequestById(organizationId: string, hospitalId: string, requestId: string): Promise<AutomationWorkRequest | null> {
    const client = this.databaseService.getClient();
    const { data: root, error } = await client.from('automation_work_request').select('automation_work_request_id, organization_id, hospital_id, claim_id, claim_product_reference_value_id, source_record_type, source_record_id, correlation_id, idempotency_key, created_by, created_at, updated_by, updated_at, deleted_at, version, work_purpose_reference_value_id, work_status_reference_value_id').eq('automation_work_request_id', requestId).eq('organization_id', organizationId).eq('hospital_id', hospitalId).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    if (!root) return null;
    const [workPurposeCode, workStatusCode, claimProductCode] = await Promise.all([
      this.findActiveReferenceCode((root as any).work_purpose_reference_value_id),
      this.findActiveReferenceCode((root as any).work_status_reference_value_id),
      this.findActiveReferenceCode((root as any).claim_product_reference_value_id),
    ]);
    const normalized = { ...(root as any), work_purpose_code: workPurposeCode, work_status_code: workStatusCode, claim_product_code: claimProductCode } as AutomationWorkRequestPersistenceRow;
    const attempts = await this.listAttempts(requestId);
    return AutomationDatabaseMapper.toWorkRequest(normalized, attempts);
  }

  async findActiveReviewCaseById(organizationId: string, hospitalId: string, reviewCaseId: string): Promise<AutomationReviewCase | null> {
    const client = this.databaseService.getClient();
    const { data: root, error } = await client.from('automation_review_case').select('automation_review_case_id, organization_id, automation_work_request_id, created_by, created_at, updated_by, updated_at, deleted_at, version').eq('automation_review_case_id', reviewCaseId).eq('organization_id', organizationId).eq('hospital_id', hospitalId).is('deleted_at', null).maybeSingle<AutomationReviewCasePersistenceRow>();
    if (error) throw error;
    if (!root) return null;
    const { data: decisions, error: decisionError } = await client.from('automation_review_decision').select('automation_review_decision_id, decision_sequence, decision_code, decision_reason, reviewer_user_id, decided_at').eq('automation_review_case_id', reviewCaseId).is('deleted_at', null).order('decision_sequence');
    if (decisionError) throw decisionError;
    return AutomationDatabaseMapper.toReviewCase(root, (decisions ?? []) as AutomationReviewDecisionPersistenceRow[]);
  }

  async findActivePayerDispatchTaskById(organizationId: string, hospitalId: string, taskId: string): Promise<PayerDispatchTask | null> {
    const { data, error } = await this.databaseService.getClient().from('payer_dispatch_task').select('payer_dispatch_task_id, organization_id, hospital_id, claim_id, hospital_insurance_partner_integration_id, correlation_id, idempotency_key, dispatch_status_reference_value_id, created_by, created_at, updated_by, updated_at, deleted_at, version').eq('payer_dispatch_task_id', taskId).eq('organization_id', organizationId).eq('hospital_id', hospitalId).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const dispatchStatusCode = await this.findActiveReferenceCode((data as any).dispatch_status_reference_value_id);
    return AutomationDatabaseMapper.toPayerDispatchTask({ ...(data as any), dispatch_status_code: dispatchStatusCode } as PayerDispatchTaskPersistenceRow);
  }

  async createWorkRequest(input: Record<string, unknown>): Promise<string> { return this.command('create_automation_work_request', input); }
  async startWorkRequest(input: Record<string, unknown>): Promise<string> { return this.command('start_automation_work_request', input); }
  async recordJobAttempt(input: Record<string, unknown>): Promise<string> { return this.command('record_automation_job_attempt', input); }
  async createReviewCase(input: Record<string, unknown>): Promise<string> { return this.command('create_automation_review_case', input); }
  async recordReviewDecision(input: Record<string, unknown>): Promise<string> { return this.command('record_automation_review_decision', input); }
  async createOwnerCommandRequest(input: Record<string, unknown>): Promise<string> { return this.command('create_automation_owner_command_request', input); }
  async createPayerDispatchTask(input: Record<string, unknown>): Promise<string> { return this.command('create_payer_dispatch_task', input); }

  private async command(functionName: string, input: Record<string, unknown>): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc(functionName, input);
    if (error) {
      this.logger.error(
        `Automation command ${functionName} failed: ${error.code ?? 'UNKNOWN'} ${error.message}`,
      );
      throw error;
    }
    return data as string;
  }

  private async listAttempts(requestId: string): Promise<AutomationJobAttemptPersistenceRow[]> {
    const { data, error } = await this.databaseService.getClient().from('automation_job_attempt').select('automation_job_attempt_id, attempt_number, job_status_reference_value_id, started_at, completed_at, failure_classification, failure_summary').eq('automation_work_request_id', requestId).is('deleted_at', null).order('attempt_number');
    if (error) throw error;
    return Promise.all((data ?? []).map(async (row: any) => ({
      ...row,
      job_status_code: await this.findActiveReferenceCode(row.job_status_reference_value_id),
    }))) as Promise<AutomationJobAttemptPersistenceRow[]>;
  }

  /**
   * Reference data is intentionally looked up directly. Phase 10 tables do not
   * own foreign-key relationships to reference_values, so PostgREST embeds
   * would incorrectly depend on a generated relationship in its schema cache.
   */
  private async findActiveReferenceCode(referenceValueId: string | null): Promise<string | null> {
    if (!referenceValueId) return null;
    const { data, error } = await this.databaseService.getClient()
      .from('reference_values')
      .select('code')
      .eq('id', referenceValueId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return (data as { code?: string } | null)?.code ?? null;
  }
}
