import {
  AutomationJobAttempt,
  AutomationWorkRequest,
  AutomationWorkRequestProps,
} from '../domain/automation-work-request.aggregate';
import {
  AutomationReviewCase,
  AutomationReviewCaseProps,
  AutomationReviewDecision,
} from '../domain/automation-review-case.aggregate';
import { PayerDispatchTask, PayerDispatchTaskProps } from '../domain/payer-dispatch-task.aggregate';

type Timestamp = string | Date | null;
const toDate = (value: Timestamp): Date | null => value ? new Date(value) : null;

export interface AutomationWorkRequestPersistenceRow {
  automation_work_request_id: string; organization_id: string; hospital_id: string | null; claim_id: string | null;
  claim_product_reference_value_id: string | null; claim_product_code: 'ICA' | 'PRE_POST' | 'PARTNER_PROCESSING' | 'KYP' | null;
  work_purpose_reference_value_id: string; work_purpose_code: any; work_status_reference_value_id: string; work_status_code: any;
  source_record_type: string; source_record_id: string | null; correlation_id: string; idempotency_key: string;
  created_by: string; created_at: Timestamp; updated_by: string; updated_at: Timestamp; deleted_at: Timestamp; version: number;
}
export interface AutomationJobAttemptPersistenceRow {
  automation_job_attempt_id: string; attempt_number: number; job_status_reference_value_id: string; job_status_code: any;
  started_at: Timestamp; completed_at: Timestamp; failure_classification: string | null; failure_summary: string | null;
}
export interface AutomationReviewCasePersistenceRow {
  automation_review_case_id: string; organization_id: string; automation_work_request_id: string;
  created_by: string; created_at: Timestamp; updated_by: string; updated_at: Timestamp; deleted_at: Timestamp; version: number;
}
export interface AutomationReviewDecisionPersistenceRow {
  automation_review_decision_id: string; decision_sequence: number; decision_code: any; decision_reason: string | null;
  reviewer_user_id: string; decided_at: Timestamp;
}
export interface PayerDispatchTaskPersistenceRow {
  payer_dispatch_task_id: string; organization_id: string; hospital_id: string; claim_id: string;
  hospital_insurance_partner_integration_id: string; correlation_id: string; idempotency_key: string;
  dispatch_status_reference_value_id: string; dispatch_status_code: any;
  created_by: string; created_at: Timestamp; updated_by: string; updated_at: Timestamp; deleted_at: Timestamp; version: number;
}

/** Converts only database rows already scoped to the calling Organization and Hospital. */
export class AutomationDatabaseMapper {
  static toWorkRequest(root: AutomationWorkRequestPersistenceRow, attempts: AutomationJobAttemptPersistenceRow[] = []): AutomationWorkRequest {
    const props: AutomationWorkRequestProps = {
      automationWorkRequestId: root.automation_work_request_id, organizationId: root.organization_id, hospitalId: root.hospital_id,
      claimId: root.claim_id, claimProductReferenceValueId: root.claim_product_reference_value_id, claimProductCode: root.claim_product_code,
      purpose: { referenceValueId: root.work_purpose_reference_value_id, code: root.work_purpose_code },
      status: { referenceValueId: root.work_status_reference_value_id, code: root.work_status_code },
      sourceRecordType: root.source_record_type, sourceRecordId: root.source_record_id, correlationId: root.correlation_id,
      idempotencyKey: root.idempotency_key, createdBy: root.created_by, createdAt: toDate(root.created_at)!,
      updatedBy: root.updated_by, updatedAt: toDate(root.updated_at)!, deletedAt: toDate(root.deleted_at), version: root.version,
    };
    const mapped: AutomationJobAttempt[] = attempts.map((row) => ({ automationJobAttemptId: row.automation_job_attempt_id,
      attemptNumber: row.attempt_number, status: { referenceValueId: row.job_status_reference_value_id, code: row.job_status_code },
      startedAt: toDate(row.started_at)!, completedAt: toDate(row.completed_at), failureClassification: row.failure_classification, failureSummary: row.failure_summary }));
    return AutomationWorkRequest.rehydrate(props, mapped);
  }

  static toReviewCase(root: AutomationReviewCasePersistenceRow, decisions: AutomationReviewDecisionPersistenceRow[] = []): AutomationReviewCase {
    const props: AutomationReviewCaseProps = { automationReviewCaseId: root.automation_review_case_id, organizationId: root.organization_id,
      automationWorkRequestId: root.automation_work_request_id, createdBy: root.created_by, createdAt: toDate(root.created_at)!,
      updatedBy: root.updated_by, updatedAt: toDate(root.updated_at)!, deletedAt: toDate(root.deleted_at), version: root.version };
    const mapped: AutomationReviewDecision[] = decisions.map((row) => ({ automationReviewDecisionId: row.automation_review_decision_id,
      decisionSequence: row.decision_sequence, decisionCode: row.decision_code, decisionReason: row.decision_reason,
      reviewerUserId: row.reviewer_user_id, decidedAt: toDate(row.decided_at)! }));
    return AutomationReviewCase.rehydrate(props, mapped);
  }

  static toPayerDispatchTask(row: PayerDispatchTaskPersistenceRow): PayerDispatchTask {
    const props: PayerDispatchTaskProps = { payerDispatchTaskId: row.payer_dispatch_task_id, organizationId: row.organization_id,
      hospitalId: row.hospital_id, claimId: row.claim_id, hospitalInsurancePartnerIntegrationId: row.hospital_insurance_partner_integration_id,
      correlationId: row.correlation_id, idempotencyKey: row.idempotency_key,
      status: { referenceValueId: row.dispatch_status_reference_value_id, code: row.dispatch_status_code }, createdBy: row.created_by,
      createdAt: toDate(row.created_at)!, updatedBy: row.updated_by, updatedAt: toDate(row.updated_at)!, deletedAt: toDate(row.deleted_at), version: row.version };
    return PayerDispatchTask.rehydrate(props);
  }
}
