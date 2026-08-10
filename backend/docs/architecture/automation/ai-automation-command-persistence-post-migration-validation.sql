-- ClaimNX Phase 10: AI & Automation Command Persistence validation (READ ONLY)
-- Run only after 20260802100300_create_ai_automation_command_functions.sql succeeds.
SELECT
    to_regprocedure('public.create_automation_work_request(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,character varying,uuid,uuid,character varying,jsonb,uuid)') IS NOT NULL AS create_work_request_exists,
    to_regprocedure('public.start_automation_work_request(uuid,uuid,uuid,integer,uuid,uuid)') IS NOT NULL AS start_work_request_exists,
    to_regprocedure('public.record_automation_job_attempt(uuid,uuid,uuid,uuid,integer,integer,uuid,uuid,character varying,character varying,character varying,character varying,character varying,character varying,timestamp with time zone,timestamp with time zone,uuid)') IS NOT NULL AS record_job_attempt_exists,
    to_regprocedure('public.create_automation_review_case(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,character varying,uuid)') IS NOT NULL AS create_review_case_exists,
    to_regprocedure('public.record_automation_review_decision(uuid,uuid,uuid,uuid,integer,integer,character varying,jsonb,character varying,uuid,uuid)') IS NOT NULL AS record_review_decision_exists,
    to_regprocedure('public.create_automation_owner_command_request(uuid,uuid,uuid,uuid,uuid,uuid,character varying,character varying,jsonb,uuid,uuid,character varying,uuid)') IS NOT NULL AS create_owner_command_exists,
    to_regprocedure('public.create_payer_dispatch_task(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,character varying,uuid,character varying,uuid)') IS NOT NULL AS create_dispatch_task_exists,
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.automation_job_attempt'::regclass AND tgname='trg_automation_job_attempt_append_only' AND NOT tgisinternal) AS job_attempt_append_only,
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.automation_audit_entry'::regclass AND tgname='trg_automation_audit_entry_append_only' AND NOT tgisinternal) AS automation_audit_append_only;
