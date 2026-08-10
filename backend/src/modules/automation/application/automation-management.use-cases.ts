import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AutomationManagementRepository } from '../infrastructure/automation-management.repository';
import { AutomationAccessService } from './automation-access.service';

export interface AutomationCommandContext { actorUserId: string; organizationId: string; hospitalId: string; }
export interface CreateAutomationWorkRequestCommand extends AutomationCommandContext { claimId: string; claimProductReferenceValueId: string; workPurposeReferenceValueId: string; queuedWorkStatusReferenceValueId: string; sourceRecordType: string; sourceRecordId?: string | null; correlationId?: string; idempotencyKey: string; safeInputSummary?: Record<string, unknown> | null; }
export interface StartAutomationWorkRequestCommand extends AutomationCommandContext { automationWorkRequestId: string; expectedVersion: number; inProgressStatusReferenceValueId: string; }
export interface RecordAutomationJobAttemptCommand extends AutomationCommandContext { automationWorkRequestId: string; expectedRequestVersion: number; attemptNumber: number; jobStatusReferenceValueId: string; resultingWorkStatusReferenceValueId: string; providerCode?: string | null; modelIdentifier?: string | null; policyVersion?: string | null; externalCorrelationReference?: string | null; failureClassification?: string | null; failureSummary?: string | null; startedAt: string; completedAt: string; }
export interface CreateAutomationReviewCaseCommand extends AutomationCommandContext { claimId: string; automationWorkRequestId: string; reviewTypeReferenceValueId: string; openReviewStatusReferenceValueId: string; correlationId?: string; summary?: string | null; }
export interface RecordAutomationReviewDecisionCommand extends AutomationCommandContext { automationReviewCaseId: string; expectedCaseVersion: number; decisionSequence: number; decisionCode: string; finalValue?: Record<string, unknown> | null; decisionReason?: string | null; reviewStatusReferenceValueId: string; }
export interface CreateOwnerCommandRequestCommand extends AutomationCommandContext { claimId: string; automationReviewCaseId?: string | null; targetContext: string; commandType: string; commandPayload?: Record<string, unknown> | null; commandStatusReferenceValueId: string; correlationId?: string; idempotencyKey: string; }
export interface CreatePayerDispatchTaskCommand extends AutomationCommandContext { claimId: string; claimProductReferenceValueId: string; hospitalInsurancePartnerIntegrationId: string; dispatchChannelReferenceValueId: string; queuedDispatchStatusReferenceValueId: string; submissionIntentReference?: string | null; credentialSecretReference?: string | null; correlationId?: string; idempotencyKey: string; }

@Injectable()
export class AutomationManagementUseCases {
  constructor(private readonly repository: AutomationManagementRepository, private readonly access: AutomationAccessService) {}

  async createWorkRequest(c: CreateAutomationWorkRequestCommand): Promise<string> {
    await this.allow(c); this.required(c.sourceRecordType, 'Source record type'); this.required(c.idempotencyKey, 'Idempotency key'); this.safeJson(c.safeInputSummary);
    return this.command(() => this.repository.createWorkRequest({ p_automation_work_request_id: randomUUID(), p_automation_audit_entry_id: randomUUID(), p_organization_id: c.organizationId, p_hospital_id: c.hospitalId, p_claim_id: c.claimId, p_claim_product_reference_value_id: c.claimProductReferenceValueId, p_work_purpose_reference_value_id: c.workPurposeReferenceValueId, p_work_status_reference_value_id: c.queuedWorkStatusReferenceValueId, p_source_record_type: c.sourceRecordType.trim(), p_source_record_id: c.sourceRecordId ?? null, p_correlation_id: c.correlationId ?? randomUUID(), p_idempotency_key: c.idempotencyKey.trim(), p_safe_input_summary: c.safeInputSummary ?? {}, p_actor_user_id: c.actorUserId }));
  }

  async startWorkRequest(c: StartAutomationWorkRequestCommand): Promise<string> {
    await this.allow(c); this.version(c.expectedVersion, 'Work Request');
    await this.requireWorkRequest(c); return this.command(() => this.repository.startWorkRequest({ p_automation_audit_entry_id: randomUUID(), p_organization_id: c.organizationId, p_automation_work_request_id: c.automationWorkRequestId, p_expected_version: c.expectedVersion, p_in_progress_status_reference_value_id: c.inProgressStatusReferenceValueId, p_actor_user_id: c.actorUserId }));
  }

  async recordJobAttempt(c: RecordAutomationJobAttemptCommand): Promise<string> {
    await this.allow(c); this.version(c.expectedRequestVersion, 'Work Request'); this.positive(c.attemptNumber, 'Attempt number'); this.safeText(c.failureSummary);
    await this.requireWorkRequest(c); return this.command(() => this.repository.recordJobAttempt({ p_automation_job_attempt_id: randomUUID(), p_automation_audit_entry_id: randomUUID(), p_organization_id: c.organizationId, p_automation_work_request_id: c.automationWorkRequestId, p_expected_request_version: c.expectedRequestVersion, p_attempt_number: c.attemptNumber, p_job_status_reference_value_id: c.jobStatusReferenceValueId, p_resulting_work_status_reference_value_id: c.resultingWorkStatusReferenceValueId, p_provider_code: c.providerCode ?? null, p_model_identifier: c.modelIdentifier ?? null, p_policy_version: c.policyVersion ?? null, p_external_correlation_reference: c.externalCorrelationReference ?? null, p_failure_classification: c.failureClassification ?? null, p_failure_summary: c.failureSummary ?? null, p_started_at: c.startedAt, p_completed_at: c.completedAt, p_actor_user_id: c.actorUserId }));
  }

  async createReviewCase(c: CreateAutomationReviewCaseCommand): Promise<string> {
    await this.allow(c); await this.requireWorkRequest({ ...c, automationWorkRequestId: c.automationWorkRequestId });
    return this.command(() => this.repository.createReviewCase({ p_automation_review_case_id: randomUUID(), p_automation_audit_entry_id: randomUUID(), p_organization_id: c.organizationId, p_hospital_id: c.hospitalId, p_claim_id: c.claimId, p_automation_work_request_id: c.automationWorkRequestId, p_review_type_reference_value_id: c.reviewTypeReferenceValueId, p_review_status_reference_value_id: c.openReviewStatusReferenceValueId, p_correlation_id: c.correlationId ?? randomUUID(), p_summary: c.summary ?? null, p_actor_user_id: c.actorUserId }));
  }

  async recordReviewDecision(c: RecordAutomationReviewDecisionCommand): Promise<string> {
    await this.allow(c); this.version(c.expectedCaseVersion, 'Review Case'); this.positive(c.decisionSequence, 'Decision sequence'); this.required(c.decisionCode, 'Decision code'); this.safeJson(c.finalValue);
    const reviewCase = await this.repository.findActiveReviewCaseById(c.organizationId, c.hospitalId, c.automationReviewCaseId); if (!reviewCase) throw new NotFoundException('Automation Review Case was not found.');
    return this.command(() => this.repository.recordReviewDecision({ p_automation_review_decision_id: randomUUID(), p_automation_audit_entry_id: randomUUID(), p_organization_id: c.organizationId, p_automation_review_case_id: c.automationReviewCaseId, p_expected_case_version: c.expectedCaseVersion, p_decision_sequence: c.decisionSequence, p_decision_code: c.decisionCode.trim(), p_final_value: c.finalValue ?? {}, p_decision_reason: c.decisionReason ?? null, p_review_status_reference_value_id: c.reviewStatusReferenceValueId, p_actor_user_id: c.actorUserId }));
  }

  async createOwnerCommandRequest(c: CreateOwnerCommandRequestCommand): Promise<string> {
    await this.allow(c); this.required(c.targetContext, 'Target context'); this.required(c.commandType, 'Command type'); this.required(c.idempotencyKey, 'Idempotency key'); this.safeJson(c.commandPayload);
    return this.command(() => this.repository.createOwnerCommandRequest({ p_automation_owner_command_request_id: randomUUID(), p_automation_audit_entry_id: randomUUID(), p_organization_id: c.organizationId, p_hospital_id: c.hospitalId, p_claim_id: c.claimId, p_automation_review_case_id: c.automationReviewCaseId ?? null, p_target_context: c.targetContext.trim(), p_command_type: c.commandType.trim(), p_command_payload: c.commandPayload ?? {}, p_command_status_reference_value_id: c.commandStatusReferenceValueId, p_correlation_id: c.correlationId ?? randomUUID(), p_idempotency_key: c.idempotencyKey.trim(), p_actor_user_id: c.actorUserId }));
  }

  async createPayerDispatchTask(c: CreatePayerDispatchTaskCommand): Promise<string> {
    await this.allow(c); this.required(c.idempotencyKey, 'Idempotency key'); this.opaqueReference(c.credentialSecretReference);
    return this.command(() => this.repository.createPayerDispatchTask({ p_payer_dispatch_task_id: randomUUID(), p_automation_audit_entry_id: randomUUID(), p_organization_id: c.organizationId, p_hospital_id: c.hospitalId, p_claim_id: c.claimId, p_claim_product_reference_value_id: c.claimProductReferenceValueId, p_hospital_insurance_partner_integration_id: c.hospitalInsurancePartnerIntegrationId, p_dispatch_channel_reference_value_id: c.dispatchChannelReferenceValueId, p_dispatch_status_reference_value_id: c.queuedDispatchStatusReferenceValueId, p_submission_intent_reference: c.submissionIntentReference ?? null, p_credential_secret_reference: c.credentialSecretReference ?? null, p_correlation_id: c.correlationId ?? randomUUID(), p_idempotency_key: c.idempotencyKey.trim(), p_actor_user_id: c.actorUserId }));
  }

  private async allow(c: AutomationCommandContext): Promise<void> { await this.access.assertCommandAccess(c.actorUserId, c.organizationId, c.hospitalId); }
  private async requireWorkRequest(c: AutomationCommandContext & { automationWorkRequestId: string }): Promise<void> { if (!await this.repository.findActiveWorkRequestById(c.organizationId, c.hospitalId, c.automationWorkRequestId)) throw new NotFoundException('Automation Work Request was not found.'); }
  private version(value: number, label: string): void { if (!Number.isInteger(value) || value < 1) throw new BadRequestException(`${label} expectedVersion must be a positive integer.`); }
  private positive(value: number, label: string): void { if (!Number.isInteger(value) || value < 1) throw new BadRequestException(`${label} must be a positive integer.`); }
  private required(value: string | null | undefined, label: string): void { if (!value?.trim()) throw new BadRequestException(`${label} is required.`); }
  private safeText(value: string | null | undefined): void { if (value && /password|token|cookie|session|authorization|bearer/i.test(value)) throw new BadRequestException('Automation command content must not contain credentials or tokens.'); }
  private safeJson(value: Record<string, unknown> | null | undefined): void { if (value && /password|token|cookie|session|authorization|bearer/i.test(JSON.stringify(value))) throw new BadRequestException('Automation command content must not contain credentials or tokens.'); }
  private opaqueReference(value: string | null | undefined): void { if (value && /password|token|cookie|session|authorization|bearer/i.test(value)) throw new BadRequestException('Credential secret reference must be an opaque external secret reference.'); }
  private async command(operation: () => Promise<string>): Promise<string> { try { return await operation(); } catch (error) { const code = (error as { code?: string }).code; if (code === '23505') throw new ConflictException('An active automation record with the same business idempotency key already exists.'); if (code === '23503') throw new BadRequestException('A required automation dependency is unavailable.'); throw error; } }
}
