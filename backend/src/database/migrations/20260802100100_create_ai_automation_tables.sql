BEGIN;

-- Phase 10 is additive. Business UUIDs are generated in the NestJS application layer.
DO $$ BEGIN
 IF to_regclass('public.organizations') IS NULL OR to_regclass('public.hospitals') IS NULL
    OR to_regclass('public.users') IS NULL OR to_regclass('public.claims') IS NULL
    OR to_regclass('public.insurance_entities') IS NULL OR to_regclass('public.reference_values') IS NULL
    OR to_regclass('public.hospital_insurance_partner_integration') IS NULL THEN
   RAISE EXCEPTION 'Phase 10 requires Organization, Hospital, IAM, Claim, Insurance, Hospital-Payer Integration, and Reference Data tables.';
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.automation_work_request (
 automation_work_request_id UUID NOT NULL, organization_id UUID NOT NULL, hospital_id UUID, claim_id UUID,
 claim_product_reference_value_id UUID, work_purpose_reference_value_id UUID NOT NULL,
 work_status_reference_value_id UUID NOT NULL, source_record_type VARCHAR(80) NOT NULL,
 source_record_id UUID, correlation_id UUID NOT NULL, idempotency_key VARCHAR(128) NOT NULL,
 safe_input_summary JSONB, created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_automation_work_request PRIMARY KEY(automation_work_request_id),
 CONSTRAINT ck_automation_work_request_version CHECK(version>=1),
 CONSTRAINT ck_automation_work_request_source_type CHECK(BTRIM(source_record_type)<>''),
 CONSTRAINT ck_automation_work_request_idempotency_key CHECK(BTRIM(idempotency_key)<>''),
 CONSTRAINT fk_automation_work_request_organization FOREIGN KEY(organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_work_request_hospital FOREIGN KEY(hospital_id) REFERENCES public.hospitals(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_work_request_claim FOREIGN KEY(claim_id) REFERENCES public.claims(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_work_request_created_by FOREIGN KEY(created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_work_request_updated_by FOREIGN KEY(updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_work_request_deleted_by FOREIGN KEY(deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.automation_job_attempt (
 automation_job_attempt_id UUID NOT NULL, automation_work_request_id UUID NOT NULL, attempt_number INTEGER NOT NULL,
 job_status_reference_value_id UUID NOT NULL, provider_code VARCHAR(80), model_identifier VARCHAR(160), policy_version VARCHAR(80),
 external_correlation_reference VARCHAR(160), failure_classification VARCHAR(80), failure_summary VARCHAR(1000), started_at TIMESTAMPTZ NOT NULL,
 completed_at TIMESTAMPTZ, created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_automation_job_attempt PRIMARY KEY(automation_job_attempt_id), CONSTRAINT ck_automation_job_attempt_number CHECK(attempt_number>0),
 CONSTRAINT ck_automation_job_attempt_version CHECK(version=1), CONSTRAINT ck_automation_job_attempt_timing CHECK(completed_at IS NULL OR completed_at>=started_at),
 CONSTRAINT fk_automation_job_attempt_request FOREIGN KEY(automation_work_request_id) REFERENCES public.automation_work_request(automation_work_request_id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_job_attempt_created_by FOREIGN KEY(created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_job_attempt_updated_by FOREIGN KEY(updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_job_attempt_deleted_by FOREIGN KEY(deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.automation_review_case (
 automation_review_case_id UUID NOT NULL, organization_id UUID NOT NULL, hospital_id UUID, claim_id UUID,
 automation_work_request_id UUID NOT NULL, review_type_reference_value_id UUID NOT NULL, review_status_reference_value_id UUID NOT NULL,
 correlation_id UUID NOT NULL, summary VARCHAR(1000), created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_automation_review_case PRIMARY KEY(automation_review_case_id), CONSTRAINT ck_automation_review_case_version CHECK(version>=1),
 CONSTRAINT fk_automation_review_case_organization FOREIGN KEY(organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_review_case_hospital FOREIGN KEY(hospital_id) REFERENCES public.hospitals(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_review_case_claim FOREIGN KEY(claim_id) REFERENCES public.claims(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_review_case_request FOREIGN KEY(automation_work_request_id) REFERENCES public.automation_work_request(automation_work_request_id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_review_case_created_by FOREIGN KEY(created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_review_case_updated_by FOREIGN KEY(updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_review_case_deleted_by FOREIGN KEY(deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.automation_extraction_candidate (
 automation_extraction_candidate_id UUID NOT NULL, automation_review_case_id UUID NOT NULL, automation_job_attempt_id UUID NOT NULL,
 field_name VARCHAR(120) NOT NULL, candidate_sequence INTEGER NOT NULL, candidate_value JSONB NOT NULL, provenance_summary JSONB,
 confidence_score NUMERIC(5,4) NOT NULL, created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_automation_extraction_candidate PRIMARY KEY(automation_extraction_candidate_id), CONSTRAINT ck_automation_extraction_candidate_sequence CHECK(candidate_sequence>0),
 CONSTRAINT ck_automation_extraction_candidate_confidence CHECK(confidence_score>=0 AND confidence_score<=1), CONSTRAINT ck_automation_extraction_candidate_version CHECK(version=1),
 CONSTRAINT fk_automation_extraction_candidate_case FOREIGN KEY(automation_review_case_id) REFERENCES public.automation_review_case(automation_review_case_id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_extraction_candidate_attempt FOREIGN KEY(automation_job_attempt_id) REFERENCES public.automation_job_attempt(automation_job_attempt_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.automation_inference_result (
 automation_inference_result_id UUID NOT NULL, automation_review_case_id UUID, automation_job_attempt_id UUID NOT NULL,
 inference_type_reference_value_id UUID NOT NULL, result_payload JSONB NOT NULL, readiness_score NUMERIC(5,2), confidence_score NUMERIC(5,4), explanation_summary VARCHAR(2000),
 created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_automation_inference_result PRIMARY KEY(automation_inference_result_id), CONSTRAINT ck_automation_inference_result_readiness CHECK(readiness_score IS NULL OR (readiness_score>=0 AND readiness_score<=100)), CONSTRAINT ck_automation_inference_result_confidence CHECK(confidence_score IS NULL OR (confidence_score>=0 AND confidence_score<=1)), CONSTRAINT ck_automation_inference_result_version CHECK(version=1),
 CONSTRAINT fk_automation_inference_result_case FOREIGN KEY(automation_review_case_id) REFERENCES public.automation_review_case(automation_review_case_id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_inference_result_attempt FOREIGN KEY(automation_job_attempt_id) REFERENCES public.automation_job_attempt(automation_job_attempt_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.automation_review_decision (
 automation_review_decision_id UUID NOT NULL, automation_review_case_id UUID NOT NULL, decision_sequence INTEGER NOT NULL,
 decision_code VARCHAR(40) NOT NULL, final_value JSONB, decision_reason VARCHAR(2000), reviewer_user_id UUID NOT NULL, decided_at TIMESTAMPTZ NOT NULL,
 created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_automation_review_decision PRIMARY KEY(automation_review_decision_id), CONSTRAINT ck_automation_review_decision_sequence CHECK(decision_sequence>0), CONSTRAINT ck_automation_review_decision_code CHECK(BTRIM(decision_code)<>''), CONSTRAINT ck_automation_review_decision_version CHECK(version=1),
 CONSTRAINT fk_automation_review_decision_case FOREIGN KEY(automation_review_case_id) REFERENCES public.automation_review_case(automation_review_case_id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_review_decision_reviewer FOREIGN KEY(reviewer_user_id) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.automation_owner_command_request (
 automation_owner_command_request_id UUID NOT NULL, organization_id UUID NOT NULL, hospital_id UUID, claim_id UUID,
 automation_review_case_id UUID, target_context VARCHAR(80) NOT NULL, command_type VARCHAR(100) NOT NULL, command_payload JSONB NOT NULL,
 command_status_reference_value_id UUID NOT NULL, correlation_id UUID NOT NULL, idempotency_key VARCHAR(128) NOT NULL, processed_at TIMESTAMPTZ,
 created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_automation_owner_command_request PRIMARY KEY(automation_owner_command_request_id), CONSTRAINT ck_automation_owner_command_request_version CHECK(version>=1), CONSTRAINT ck_automation_owner_command_request_context CHECK(BTRIM(target_context)<>''), CONSTRAINT ck_automation_owner_command_request_type CHECK(BTRIM(command_type)<>''),
 CONSTRAINT fk_automation_owner_command_request_organization FOREIGN KEY(organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_owner_command_request_hospital FOREIGN KEY(hospital_id) REFERENCES public.hospitals(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_owner_command_request_claim FOREIGN KEY(claim_id) REFERENCES public.claims(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_owner_command_request_case FOREIGN KEY(automation_review_case_id) REFERENCES public.automation_review_case(automation_review_case_id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_owner_command_request_created_by FOREIGN KEY(created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_owner_command_request_updated_by FOREIGN KEY(updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_owner_command_request_deleted_by FOREIGN KEY(deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.payer_dispatch_task (
 payer_dispatch_task_id UUID NOT NULL, organization_id UUID NOT NULL, hospital_id UUID NOT NULL, claim_id UUID NOT NULL,
 claim_product_reference_value_id UUID NOT NULL, hospital_insurance_partner_integration_id UUID NOT NULL,
 dispatch_channel_reference_value_id UUID NOT NULL, dispatch_status_reference_value_id UUID NOT NULL,
 submission_intent_reference UUID, credential_secret_reference VARCHAR(512), correlation_id UUID NOT NULL, idempotency_key VARCHAR(128) NOT NULL,
 created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_payer_dispatch_task PRIMARY KEY(payer_dispatch_task_id), CONSTRAINT ck_payer_dispatch_task_version CHECK(version>=1), CONSTRAINT ck_payer_dispatch_task_idempotency_key CHECK(BTRIM(idempotency_key)<>''),
 CONSTRAINT ck_payer_dispatch_task_secret_reference CHECK(credential_secret_reference IS NULL OR (BTRIM(credential_secret_reference)<>'' AND credential_secret_reference !~* '(password|token|cookie|session)')),
 CONSTRAINT fk_payer_dispatch_task_organization FOREIGN KEY(organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_payer_dispatch_task_hospital FOREIGN KEY(hospital_id) REFERENCES public.hospitals(id) ON DELETE RESTRICT,
 CONSTRAINT fk_payer_dispatch_task_claim FOREIGN KEY(claim_id) REFERENCES public.claims(id) ON DELETE RESTRICT,
 CONSTRAINT fk_payer_dispatch_task_integration FOREIGN KEY(hospital_insurance_partner_integration_id) REFERENCES public.hospital_insurance_partner_integration(hospital_insurance_partner_integration_id) ON DELETE RESTRICT,
 CONSTRAINT fk_payer_dispatch_task_created_by FOREIGN KEY(created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_payer_dispatch_task_updated_by FOREIGN KEY(updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_payer_dispatch_task_deleted_by FOREIGN KEY(deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.payer_dispatch_attempt (
 payer_dispatch_attempt_id UUID NOT NULL, payer_dispatch_task_id UUID NOT NULL, attempt_number INTEGER NOT NULL,
 dispatch_status_reference_value_id UUID NOT NULL, external_correlation_reference VARCHAR(160), failure_classification VARCHAR(80), failure_summary VARCHAR(1000), started_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ,
 created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_payer_dispatch_attempt PRIMARY KEY(payer_dispatch_attempt_id), CONSTRAINT ck_payer_dispatch_attempt_number CHECK(attempt_number>0), CONSTRAINT ck_payer_dispatch_attempt_version CHECK(version=1), CONSTRAINT ck_payer_dispatch_attempt_timing CHECK(completed_at IS NULL OR completed_at>=started_at),
 CONSTRAINT fk_payer_dispatch_attempt_task FOREIGN KEY(payer_dispatch_task_id) REFERENCES public.payer_dispatch_task(payer_dispatch_task_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.payer_dispatch_verification (
 payer_dispatch_verification_id UUID NOT NULL, payer_dispatch_task_id UUID NOT NULL, payer_dispatch_attempt_id UUID NOT NULL,
 verification_status_reference_value_id UUID NOT NULL, verification_source VARCHAR(80) NOT NULL, external_reference VARCHAR(160), verified_by UUID, verified_at TIMESTAMPTZ NOT NULL,
 created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_payer_dispatch_verification PRIMARY KEY(payer_dispatch_verification_id), CONSTRAINT ck_payer_dispatch_verification_source CHECK(BTRIM(verification_source)<>''), CONSTRAINT ck_payer_dispatch_verification_version CHECK(version=1),
 CONSTRAINT fk_payer_dispatch_verification_task FOREIGN KEY(payer_dispatch_task_id) REFERENCES public.payer_dispatch_task(payer_dispatch_task_id) ON DELETE RESTRICT,
 CONSTRAINT fk_payer_dispatch_verification_attempt FOREIGN KEY(payer_dispatch_attempt_id) REFERENCES public.payer_dispatch_attempt(payer_dispatch_attempt_id) ON DELETE RESTRICT,
 CONSTRAINT fk_payer_dispatch_verification_verified_by FOREIGN KEY(verified_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.automation_audit_entry (
 automation_audit_entry_id UUID NOT NULL, organization_id UUID NOT NULL, hospital_id UUID, claim_id UUID,
 aggregate_type VARCHAR(80) NOT NULL, aggregate_id UUID NOT NULL, event_type VARCHAR(100) NOT NULL, correlation_id UUID NOT NULL,
 model_identifier VARCHAR(160), policy_version VARCHAR(80), sanitized_provenance JSONB, safe_output_summary JSONB, actor_user_id UUID, occurred_at TIMESTAMPTZ NOT NULL,
 created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_by UUID, deleted_at TIMESTAMPTZ, version INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT pk_automation_audit_entry PRIMARY KEY(automation_audit_entry_id), CONSTRAINT ck_automation_audit_entry_version CHECK(version=1), CONSTRAINT ck_automation_audit_entry_aggregate_type CHECK(BTRIM(aggregate_type)<>''), CONSTRAINT ck_automation_audit_entry_event_type CHECK(BTRIM(event_type)<>''),
 CONSTRAINT fk_automation_audit_entry_organization FOREIGN KEY(organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_audit_entry_hospital FOREIGN KEY(hospital_id) REFERENCES public.hospitals(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_audit_entry_claim FOREIGN KEY(claim_id) REFERENCES public.claims(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_audit_entry_actor FOREIGN KEY(actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_audit_entry_created_by FOREIGN KEY(created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_audit_entry_updated_by FOREIGN KEY(updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_automation_audit_entry_deleted_by FOREIGN KEY(deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_work_request_source_purpose_idempotency_active ON public.automation_work_request(organization_id,source_record_type,source_record_id,work_purpose_reference_value_id,idempotency_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_job_attempt_request_number_active ON public.automation_job_attempt(automation_work_request_id,attempt_number) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_extraction_candidate_case_field_sequence_active ON public.automation_extraction_candidate(automation_review_case_id,field_name,candidate_sequence) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_review_decision_case_sequence_active ON public.automation_review_decision(automation_review_case_id,decision_sequence) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_owner_command_idempotency_active ON public.automation_owner_command_request(organization_id,target_context,idempotency_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payer_dispatch_task_claim_idempotency_active ON public.payer_dispatch_task(organization_id,claim_id,idempotency_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payer_dispatch_attempt_task_number_active ON public.payer_dispatch_attempt(payer_dispatch_task_id,attempt_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_automation_work_request_hospital_status_active ON public.automation_work_request(organization_id,hospital_id,work_status_reference_value_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_automation_review_case_status_active ON public.automation_review_case(organization_id,hospital_id,review_status_reference_value_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payer_dispatch_task_status_active ON public.payer_dispatch_task(organization_id,hospital_id,dispatch_status_reference_value_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_automation_audit_entry_claim_occurred_at ON public.automation_audit_entry(organization_id,hospital_id,claim_id,occurred_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_ai_automation_append_only_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Phase 10 append-only record % cannot be updated or deleted.', TG_TABLE_NAME; END; $$;
DROP TRIGGER IF EXISTS trg_automation_job_attempt_append_only ON public.automation_job_attempt;
DROP TRIGGER IF EXISTS trg_automation_extraction_candidate_append_only ON public.automation_extraction_candidate;
DROP TRIGGER IF EXISTS trg_automation_inference_result_append_only ON public.automation_inference_result;
DROP TRIGGER IF EXISTS trg_automation_review_decision_append_only ON public.automation_review_decision;
DROP TRIGGER IF EXISTS trg_payer_dispatch_attempt_append_only ON public.payer_dispatch_attempt;
DROP TRIGGER IF EXISTS trg_payer_dispatch_verification_append_only ON public.payer_dispatch_verification;
DROP TRIGGER IF EXISTS trg_automation_audit_entry_append_only ON public.automation_audit_entry;
CREATE TRIGGER trg_automation_job_attempt_append_only BEFORE UPDATE OR DELETE ON public.automation_job_attempt FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_automation_append_only_mutation();
CREATE TRIGGER trg_automation_extraction_candidate_append_only BEFORE UPDATE OR DELETE ON public.automation_extraction_candidate FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_automation_append_only_mutation();
CREATE TRIGGER trg_automation_inference_result_append_only BEFORE UPDATE OR DELETE ON public.automation_inference_result FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_automation_append_only_mutation();
CREATE TRIGGER trg_automation_review_decision_append_only BEFORE UPDATE OR DELETE ON public.automation_review_decision FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_automation_append_only_mutation();
CREATE TRIGGER trg_payer_dispatch_attempt_append_only BEFORE UPDATE OR DELETE ON public.payer_dispatch_attempt FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_automation_append_only_mutation();
CREATE TRIGGER trg_payer_dispatch_verification_append_only BEFORE UPDATE OR DELETE ON public.payer_dispatch_verification FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_automation_append_only_mutation();
CREATE TRIGGER trg_automation_audit_entry_append_only BEFORE UPDATE OR DELETE ON public.automation_audit_entry FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_automation_append_only_mutation();

COMMENT ON TABLE public.automation_work_request IS 'Phase 10 durable, tenant-scoped automation request. It does not own Claim state.';
COMMENT ON TABLE public.payer_dispatch_task IS 'Phase 10 controlled payer dispatch task. credential_secret_reference is an opaque external secret pointer only.';
COMMENT ON TABLE public.automation_audit_entry IS 'Phase 10 append-only, sanitized automation audit record. No raw documents, credentials, or external payloads are permitted.';

COMMIT;
