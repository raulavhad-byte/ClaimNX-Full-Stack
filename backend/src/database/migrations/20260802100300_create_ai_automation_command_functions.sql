BEGIN;

-- Phase 10 command persistence.  All UUIDs are supplied by the application.
-- This migration deliberately never stores provider credentials, tokens, raw
-- documents, or external payloads.  Append-only tables receive terminal
-- events only; a start command changes the durable parent status.

CREATE OR REPLACE FUNCTION public.assert_automation_active_actor(p_actor_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF p_actor_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.users user_record
        WHERE user_record.id = p_actor_user_id
          AND LOWER(user_record.status) = 'active'
          AND COALESCE(user_record.is_deleted, FALSE) = FALSE
          AND user_record.deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'Phase 10 requires an active ClaimNX IAM user.'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_automation_hospital_scope(p_organization_id UUID, p_hospital_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF p_hospital_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.hospitals hospital
        WHERE hospital.id = p_hospital_id AND hospital.organization_id = p_organization_id
          AND hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ) THEN RAISE EXCEPTION 'Hospital is not active within the requested Organization.'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_automation_claim_scope(p_organization_id UUID, p_hospital_id UUID, p_claim_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF p_claim_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.claims claim
        WHERE claim.id = p_claim_id AND claim.organization_id = p_organization_id
          AND claim.hospital_id = p_hospital_id AND claim.deleted_at IS NULL
          AND COALESCE(claim.is_deleted, FALSE) = FALSE
    ) THEN RAISE EXCEPTION 'Claim is not active within the requested Organization and Hospital.'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_automation_reference_value(p_reference_value_id UUID, p_category_code TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF p_reference_value_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.reference_values value
        JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_reference_value_id AND category.code = p_category_code
          AND value.organization_id IS NULL AND value.is_active = TRUE
          AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE
    ) THEN RAISE EXCEPTION 'Reference value is not an active global % value.', p_category_code; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_automation_safe_json(p_value JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    IF p_value IS NOT NULL AND p_value::TEXT ~* '(password|token|cookie|session|authorization|bearer)' THEN
        RAISE EXCEPTION 'Automation command payload may not contain secrets or credentials.';
    END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.append_automation_command_audit(
    p_automation_audit_entry_id UUID, p_organization_id UUID, p_hospital_id UUID,
    p_claim_id UUID, p_aggregate_type VARCHAR, p_aggregate_id UUID, p_event_type VARCHAR,
    p_correlation_id UUID, p_safe_output_summary JSONB, p_actor_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.assert_automation_safe_json(p_safe_output_summary);
    INSERT INTO public.automation_audit_entry (
        automation_audit_entry_id, organization_id, hospital_id, claim_id, aggregate_type,
        aggregate_id, event_type, correlation_id, sanitized_provenance, safe_output_summary,
        actor_user_id, occurred_at, created_by, updated_by
    ) VALUES (
        p_automation_audit_entry_id, p_organization_id, p_hospital_id, p_claim_id,
        BTRIM(p_aggregate_type), p_aggregate_id, BTRIM(p_event_type), p_correlation_id,
        jsonb_build_object('source', 'phase_10_command'), p_safe_output_summary,
        p_actor_user_id, NOW(), p_actor_user_id, p_actor_user_id
    );
END; $$;

CREATE OR REPLACE FUNCTION public.create_automation_work_request(
    p_automation_work_request_id UUID, p_automation_audit_entry_id UUID,
    p_organization_id UUID, p_hospital_id UUID, p_claim_id UUID,
    p_claim_product_reference_value_id UUID, p_work_purpose_reference_value_id UUID,
    p_work_status_reference_value_id UUID, p_source_record_type VARCHAR, p_source_record_id UUID,
    p_correlation_id UUID, p_idempotency_key VARCHAR, p_safe_input_summary JSONB, p_actor_user_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_existing_id UUID;
BEGIN
    PERFORM public.assert_automation_active_actor(p_actor_user_id);
    PERFORM public.assert_automation_hospital_scope(p_organization_id, p_hospital_id);
    PERFORM public.assert_automation_claim_scope(p_organization_id, p_hospital_id, p_claim_id);
    PERFORM public.assert_automation_reference_value(p_claim_product_reference_value_id, 'CLAIM_PRODUCT');
    PERFORM public.assert_automation_reference_value(p_work_purpose_reference_value_id, 'AUTOMATION_WORK_PURPOSE');
    PERFORM public.assert_automation_reference_value(p_work_status_reference_value_id, 'AUTOMATION_WORK_STATUS');
    PERFORM public.assert_automation_safe_json(p_safe_input_summary);
    IF p_automation_work_request_id IS NULL OR p_automation_audit_entry_id IS NULL OR p_correlation_id IS NULL
       OR NULLIF(BTRIM(p_source_record_type), '') IS NULL OR NULLIF(BTRIM(p_idempotency_key), '') IS NULL THEN
        RAISE EXCEPTION 'Work Request identifiers, source type, correlation, and idempotency key are required.';
    END IF;
    SELECT automation_work_request_id INTO v_existing_id FROM public.automation_work_request request
    WHERE request.organization_id = p_organization_id AND request.source_record_type = BTRIM(p_source_record_type)
      AND request.source_record_id IS NOT DISTINCT FROM p_source_record_id
      AND request.work_purpose_reference_value_id = p_work_purpose_reference_value_id
      AND request.idempotency_key = BTRIM(p_idempotency_key) AND request.deleted_at IS NULL;
    IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;
    INSERT INTO public.automation_work_request (
        automation_work_request_id, organization_id, hospital_id, claim_id,
        claim_product_reference_value_id, work_purpose_reference_value_id,
        work_status_reference_value_id, source_record_type, source_record_id, correlation_id,
        idempotency_key, safe_input_summary, created_by, updated_by
    ) VALUES (
        p_automation_work_request_id, p_organization_id, p_hospital_id, p_claim_id,
        p_claim_product_reference_value_id, p_work_purpose_reference_value_id,
        p_work_status_reference_value_id, BTRIM(p_source_record_type), p_source_record_id,
        p_correlation_id, BTRIM(p_idempotency_key), p_safe_input_summary, p_actor_user_id, p_actor_user_id
    );
    PERFORM public.append_automation_command_audit(p_automation_audit_entry_id, p_organization_id, p_hospital_id, p_claim_id,
        'AUTOMATION_WORK_REQUEST', p_automation_work_request_id, 'WORK_REQUEST_CREATED', p_correlation_id,
        jsonb_build_object('purposeReferenceValueId', p_work_purpose_reference_value_id), p_actor_user_id);
    RETURN p_automation_work_request_id;
END; $$;

CREATE OR REPLACE FUNCTION public.start_automation_work_request(
    p_automation_audit_entry_id UUID, p_organization_id UUID, p_automation_work_request_id UUID,
    p_expected_version INTEGER, p_in_progress_status_reference_value_id UUID, p_actor_user_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_hospital_id UUID; v_claim_id UUID; v_correlation_id UUID; v_id UUID;
BEGIN
    PERFORM public.assert_automation_active_actor(p_actor_user_id);
    PERFORM public.assert_automation_reference_value(p_in_progress_status_reference_value_id, 'AUTOMATION_WORK_STATUS');
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN RAISE EXCEPTION 'Expected Work Request version is required.'; END IF;
    UPDATE public.automation_work_request request SET work_status_reference_value_id = p_in_progress_status_reference_value_id,
        updated_by = p_actor_user_id, updated_at = NOW(), version = request.version + 1
    WHERE request.automation_work_request_id = p_automation_work_request_id AND request.organization_id = p_organization_id
      AND request.version = p_expected_version AND request.deleted_at IS NULL
    RETURNING request.automation_work_request_id, request.hospital_id, request.claim_id, request.correlation_id
    INTO v_id, v_hospital_id, v_claim_id, v_correlation_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Work Request is stale, inactive, or outside the tenant.'; END IF;
    PERFORM public.append_automation_command_audit(p_automation_audit_entry_id, p_organization_id, v_hospital_id, v_claim_id,
        'AUTOMATION_WORK_REQUEST', v_id, 'WORK_REQUEST_STARTED', v_correlation_id, NULL, p_actor_user_id);
    RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_automation_job_attempt(
    p_automation_job_attempt_id UUID, p_automation_audit_entry_id UUID, p_organization_id UUID,
    p_automation_work_request_id UUID, p_expected_request_version INTEGER, p_attempt_number INTEGER,
    p_job_status_reference_value_id UUID, p_resulting_work_status_reference_value_id UUID,
    p_provider_code VARCHAR, p_model_identifier VARCHAR, p_policy_version VARCHAR,
    p_external_correlation_reference VARCHAR, p_failure_classification VARCHAR, p_failure_summary VARCHAR,
    p_started_at TIMESTAMPTZ, p_completed_at TIMESTAMPTZ, p_actor_user_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_hospital_id UUID; v_claim_id UUID; v_correlation_id UUID; v_id UUID;
BEGIN
    PERFORM public.assert_automation_active_actor(p_actor_user_id);
    PERFORM public.assert_automation_reference_value(p_job_status_reference_value_id, 'AUTOMATION_JOB_STATUS');
    PERFORM public.assert_automation_reference_value(p_resulting_work_status_reference_value_id, 'AUTOMATION_WORK_STATUS');
    IF p_automation_job_attempt_id IS NULL OR p_automation_audit_entry_id IS NULL OR p_attempt_number < 1
       OR p_started_at IS NULL OR p_completed_at IS NULL OR p_completed_at < p_started_at THEN RAISE EXCEPTION 'A completed immutable Job Attempt requires valid identifiers, sequence, and timing.'; END IF;
    UPDATE public.automation_work_request request SET work_status_reference_value_id = p_resulting_work_status_reference_value_id,
        updated_by = p_actor_user_id, updated_at = NOW(), version = request.version + 1
    WHERE request.automation_work_request_id = p_automation_work_request_id AND request.organization_id = p_organization_id
      AND request.version = p_expected_request_version AND request.deleted_at IS NULL
    RETURNING request.automation_work_request_id, request.hospital_id, request.claim_id, request.correlation_id
    INTO v_id, v_hospital_id, v_claim_id, v_correlation_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Work Request is stale, inactive, or outside the tenant.'; END IF;
    INSERT INTO public.automation_job_attempt (automation_job_attempt_id, automation_work_request_id, attempt_number,
        job_status_reference_value_id, provider_code, model_identifier, policy_version, external_correlation_reference,
        failure_classification, failure_summary, started_at, completed_at, created_by, updated_by)
    VALUES (p_automation_job_attempt_id, v_id, p_attempt_number, p_job_status_reference_value_id,
        NULLIF(BTRIM(p_provider_code), ''), NULLIF(BTRIM(p_model_identifier), ''), NULLIF(BTRIM(p_policy_version), ''),
        NULLIF(BTRIM(p_external_correlation_reference), ''), NULLIF(BTRIM(p_failure_classification), ''),
        NULLIF(BTRIM(p_failure_summary), ''), p_started_at, p_completed_at, p_actor_user_id, p_actor_user_id);
    PERFORM public.append_automation_command_audit(p_automation_audit_entry_id, p_organization_id, v_hospital_id, v_claim_id,
        'AUTOMATION_WORK_REQUEST', v_id, 'JOB_ATTEMPT_RECORDED', v_correlation_id,
        jsonb_build_object('attemptNumber', p_attempt_number, 'jobStatusReferenceValueId', p_job_status_reference_value_id), p_actor_user_id);
    RETURN p_automation_job_attempt_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_automation_review_case(
    p_automation_review_case_id UUID, p_automation_audit_entry_id UUID, p_organization_id UUID,
    p_hospital_id UUID, p_claim_id UUID, p_automation_work_request_id UUID,
    p_review_type_reference_value_id UUID, p_review_status_reference_value_id UUID,
    p_correlation_id UUID, p_summary VARCHAR, p_actor_user_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.assert_automation_active_actor(p_actor_user_id); PERFORM public.assert_automation_hospital_scope(p_organization_id,p_hospital_id);
    PERFORM public.assert_automation_claim_scope(p_organization_id,p_hospital_id,p_claim_id);
    PERFORM public.assert_automation_reference_value(p_review_type_reference_value_id,'AUTOMATION_REVIEW_TYPE');
    PERFORM public.assert_automation_reference_value(p_review_status_reference_value_id,'AUTOMATION_REVIEW_STATUS');
    IF NOT EXISTS (SELECT 1 FROM public.automation_work_request request WHERE request.automation_work_request_id=p_automation_work_request_id AND request.organization_id=p_organization_id AND request.hospital_id IS NOT DISTINCT FROM p_hospital_id AND request.claim_id IS NOT DISTINCT FROM p_claim_id AND request.deleted_at IS NULL) THEN RAISE EXCEPTION 'Work Request is not active within the requested tenant scope.'; END IF;
    INSERT INTO public.automation_review_case (automation_review_case_id,organization_id,hospital_id,claim_id,automation_work_request_id,review_type_reference_value_id,review_status_reference_value_id,correlation_id,summary,created_by,updated_by)
    VALUES (p_automation_review_case_id,p_organization_id,p_hospital_id,p_claim_id,p_automation_work_request_id,p_review_type_reference_value_id,p_review_status_reference_value_id,p_correlation_id,NULLIF(BTRIM(p_summary),''),p_actor_user_id,p_actor_user_id);
    PERFORM public.append_automation_command_audit(p_automation_audit_entry_id,p_organization_id,p_hospital_id,p_claim_id,'AUTOMATION_REVIEW_CASE',p_automation_review_case_id,'REVIEW_CASE_CREATED',p_correlation_id,NULL,p_actor_user_id);
    RETURN p_automation_review_case_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_automation_review_decision(
    p_automation_review_decision_id UUID, p_automation_audit_entry_id UUID, p_organization_id UUID,
    p_automation_review_case_id UUID, p_expected_case_version INTEGER, p_decision_sequence INTEGER,
    p_decision_code VARCHAR, p_final_value JSONB, p_decision_reason VARCHAR, p_review_status_reference_value_id UUID,
    p_actor_user_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_hospital_id UUID; v_claim_id UUID; v_correlation_id UUID; v_id UUID;
BEGIN
    PERFORM public.assert_automation_active_actor(p_actor_user_id); PERFORM public.assert_automation_safe_json(p_final_value);
    PERFORM public.assert_automation_reference_value(p_review_status_reference_value_id,'AUTOMATION_REVIEW_STATUS');
    IF p_decision_sequence < 1 OR NULLIF(BTRIM(p_decision_code),'') IS NULL THEN RAISE EXCEPTION 'Decision sequence and code are required.'; END IF;
    IF UPPER(BTRIM(p_decision_code)) IN ('CORRECT','OVERRIDE') AND NULLIF(BTRIM(p_decision_reason),'') IS NULL THEN RAISE EXCEPTION 'Correction or override decisions require a reason.'; END IF;
    UPDATE public.automation_review_case review_case SET review_status_reference_value_id=p_review_status_reference_value_id,updated_by=p_actor_user_id,updated_at=NOW(),version=review_case.version+1
    WHERE review_case.automation_review_case_id=p_automation_review_case_id AND review_case.organization_id=p_organization_id AND review_case.version=p_expected_case_version AND review_case.deleted_at IS NULL
    RETURNING review_case.automation_review_case_id,review_case.hospital_id,review_case.claim_id,review_case.correlation_id INTO v_id,v_hospital_id,v_claim_id,v_correlation_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Review Case is stale, inactive, or outside the tenant.'; END IF;
    INSERT INTO public.automation_review_decision (automation_review_decision_id,automation_review_case_id,decision_sequence,decision_code,final_value,decision_reason,reviewer_user_id,decided_at,created_by,updated_by)
    VALUES (p_automation_review_decision_id,v_id,p_decision_sequence,BTRIM(p_decision_code),p_final_value,NULLIF(BTRIM(p_decision_reason),''),p_actor_user_id,NOW(),p_actor_user_id,p_actor_user_id);
    PERFORM public.append_automation_command_audit(p_automation_audit_entry_id,p_organization_id,v_hospital_id,v_claim_id,'AUTOMATION_REVIEW_CASE',v_id,'REVIEW_DECISION_RECORDED',v_correlation_id,jsonb_build_object('decisionCode',BTRIM(p_decision_code)),p_actor_user_id);
    RETURN p_automation_review_decision_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_automation_owner_command_request(
    p_automation_owner_command_request_id UUID,p_automation_audit_entry_id UUID,p_organization_id UUID,p_hospital_id UUID,p_claim_id UUID,p_automation_review_case_id UUID,
    p_target_context VARCHAR,p_command_type VARCHAR,p_command_payload JSONB,p_command_status_reference_value_id UUID,p_correlation_id UUID,p_idempotency_key VARCHAR,p_actor_user_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_existing_id UUID;
BEGIN
    PERFORM public.assert_automation_active_actor(p_actor_user_id); PERFORM public.assert_automation_hospital_scope(p_organization_id,p_hospital_id); PERFORM public.assert_automation_claim_scope(p_organization_id,p_hospital_id,p_claim_id); PERFORM public.assert_automation_reference_value(p_command_status_reference_value_id,'AUTOMATION_OWNER_COMMAND_STATUS'); PERFORM public.assert_automation_safe_json(p_command_payload);
    IF p_automation_review_case_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.automation_review_case review_case WHERE review_case.automation_review_case_id=p_automation_review_case_id AND review_case.organization_id=p_organization_id AND review_case.hospital_id IS NOT DISTINCT FROM p_hospital_id AND review_case.claim_id IS NOT DISTINCT FROM p_claim_id AND review_case.deleted_at IS NULL) THEN RAISE EXCEPTION 'Review Case is not active within the requested tenant scope.'; END IF;
    IF NULLIF(BTRIM(p_target_context),'') IS NULL OR NULLIF(BTRIM(p_command_type),'') IS NULL OR NULLIF(BTRIM(p_idempotency_key),'') IS NULL THEN RAISE EXCEPTION 'Target context, command type, and idempotency key are required.'; END IF;
    SELECT automation_owner_command_request_id INTO v_existing_id FROM public.automation_owner_command_request command_request WHERE command_request.organization_id=p_organization_id AND command_request.target_context=BTRIM(p_target_context) AND command_request.idempotency_key=BTRIM(p_idempotency_key) AND command_request.deleted_at IS NULL;
    IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;
    INSERT INTO public.automation_owner_command_request (automation_owner_command_request_id,organization_id,hospital_id,claim_id,automation_review_case_id,target_context,command_type,command_payload,command_status_reference_value_id,correlation_id,idempotency_key,created_by,updated_by)
    VALUES (p_automation_owner_command_request_id,p_organization_id,p_hospital_id,p_claim_id,p_automation_review_case_id,BTRIM(p_target_context),BTRIM(p_command_type),p_command_payload,p_command_status_reference_value_id,p_correlation_id,BTRIM(p_idempotency_key),p_actor_user_id,p_actor_user_id);
    PERFORM public.append_automation_command_audit(p_automation_audit_entry_id,p_organization_id,p_hospital_id,p_claim_id,'AUTOMATION_OWNER_COMMAND_REQUEST',p_automation_owner_command_request_id,'OWNER_COMMAND_REQUESTED',p_correlation_id,NULL,p_actor_user_id);
    RETURN p_automation_owner_command_request_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_payer_dispatch_task(
    p_payer_dispatch_task_id UUID,p_automation_audit_entry_id UUID,p_organization_id UUID,p_hospital_id UUID,p_claim_id UUID,p_claim_product_reference_value_id UUID,p_hospital_insurance_partner_integration_id UUID,
    p_dispatch_channel_reference_value_id UUID,p_dispatch_status_reference_value_id UUID,p_submission_intent_reference UUID,p_credential_secret_reference VARCHAR,p_correlation_id UUID,p_idempotency_key VARCHAR,p_actor_user_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_existing_id UUID;
BEGIN
    PERFORM public.assert_automation_active_actor(p_actor_user_id); PERFORM public.assert_automation_hospital_scope(p_organization_id,p_hospital_id); PERFORM public.assert_automation_claim_scope(p_organization_id,p_hospital_id,p_claim_id); PERFORM public.assert_automation_reference_value(p_claim_product_reference_value_id,'CLAIM_PRODUCT'); PERFORM public.assert_automation_reference_value(p_dispatch_channel_reference_value_id,'AUTOMATION_DISPATCH_CHANNEL'); PERFORM public.assert_automation_reference_value(p_dispatch_status_reference_value_id,'AUTOMATION_DISPATCH_STATUS');
    IF NOT EXISTS (SELECT 1 FROM public.hospital_insurance_partner_integration integration JOIN public.reference_values status_value ON status_value.id=integration.operational_status_reference_value_id JOIN public.reference_categories status_category ON status_category.id=status_value.category_id WHERE integration.hospital_insurance_partner_integration_id=p_hospital_insurance_partner_integration_id AND integration.organization_id=p_organization_id AND integration.hospital_id=p_hospital_id AND integration.deleted_at IS NULL AND status_category.code='HOSPITAL_PAYER_INTEGRATION_STATUS' AND status_value.code='ACTIVE' AND status_value.is_active=TRUE AND status_value.deleted_at IS NULL) THEN RAISE EXCEPTION 'Hospital-Payer Integration is not active within the requested tenant.'; END IF;
    IF p_submission_intent_reference IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.claim_submission_intents intent WHERE intent.claim_submission_intent_id=p_submission_intent_reference AND intent.organization_id=p_organization_id AND intent.claim_id=p_claim_id AND intent.deleted_at IS NULL) THEN RAISE EXCEPTION 'Claim Submission Intent is not active for the Claim.'; END IF;
    IF NULLIF(BTRIM(p_idempotency_key),'') IS NULL OR (p_credential_secret_reference IS NOT NULL AND p_credential_secret_reference ~* '(password|token|cookie|session)') THEN RAISE EXCEPTION 'Dispatch requires a valid idempotency key and, when used, an opaque non-secret reference.'; END IF;
    SELECT payer_dispatch_task_id INTO v_existing_id FROM public.payer_dispatch_task task WHERE task.organization_id=p_organization_id AND task.claim_id=p_claim_id AND task.idempotency_key=BTRIM(p_idempotency_key) AND task.deleted_at IS NULL; IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;
    INSERT INTO public.payer_dispatch_task (payer_dispatch_task_id,organization_id,hospital_id,claim_id,claim_product_reference_value_id,hospital_insurance_partner_integration_id,dispatch_channel_reference_value_id,dispatch_status_reference_value_id,submission_intent_reference,credential_secret_reference,correlation_id,idempotency_key,created_by,updated_by)
    VALUES (p_payer_dispatch_task_id,p_organization_id,p_hospital_id,p_claim_id,p_claim_product_reference_value_id,p_hospital_insurance_partner_integration_id,p_dispatch_channel_reference_value_id,p_dispatch_status_reference_value_id,p_submission_intent_reference,NULLIF(BTRIM(p_credential_secret_reference),''),p_correlation_id,BTRIM(p_idempotency_key),p_actor_user_id,p_actor_user_id);
    PERFORM public.append_automation_command_audit(p_automation_audit_entry_id,p_organization_id,p_hospital_id,p_claim_id,'PAYER_DISPATCH_TASK',p_payer_dispatch_task_id,'PAYER_DISPATCH_QUEUED',p_correlation_id,NULL,p_actor_user_id); RETURN p_payer_dispatch_task_id;
END; $$;

COMMENT ON FUNCTION public.create_automation_work_request IS 'Creates one tenant-scoped, idempotent automation request and sanitized audit entry.';
COMMENT ON FUNCTION public.record_automation_job_attempt IS 'Records a terminal immutable job attempt and advances its Work Request atomically.';
COMMENT ON FUNCTION public.create_payer_dispatch_task IS 'Queues an idempotent non-secret payer dispatch task after tenant, claim, integration, and submission-intent validation.';

COMMIT;
