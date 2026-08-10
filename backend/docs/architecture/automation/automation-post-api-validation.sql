-- ClaimNX Phase 10 AI & Automation post-API validation (READ ONLY).
-- Run after automation-api-integration-test.ps1. Every *_ready result must be true.

SELECT
    NOT EXISTS (
        SELECT 1
        FROM public.automation_work_request request
        WHERE request.deleted_at IS NULL
          AND (
              request.organization_id IS NULL
              OR request.hospital_id IS NULL
              OR request.created_by IS NULL
              OR request.updated_by IS NULL
              OR request.version < 1
          )
    ) AS active_work_request_scope_and_audit_ready,
    NOT EXISTS (
        SELECT 1
        FROM public.payer_dispatch_task dispatch
        WHERE dispatch.deleted_at IS NULL
          AND (
              dispatch.organization_id IS NULL
              OR dispatch.hospital_id IS NULL
              OR dispatch.created_by IS NULL
              OR dispatch.updated_by IS NULL
              OR dispatch.version < 1
              OR dispatch.credential_secret_reference ~* '(password|token|bearer|authorization|cookie|session)'
          )
    ) AS active_dispatch_scope_and_secret_reference_ready,
    NOT EXISTS (
        SELECT 1
        FROM public.automation_audit_entry entry
        WHERE entry.payload_summary::TEXT ~* '(password|token|bearer|authorization|cookie|session)'
    ) AS audit_entries_sanitized,
    EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.automation_job_attempt'::REGCLASS
          AND tgname = 'trg_automation_job_attempt_append_only'
          AND NOT tgisinternal
    ) AS job_attempt_append_only_enabled,
    EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.automation_audit_entry'::REGCLASS
          AND tgname = 'trg_automation_audit_entry_append_only'
          AND NOT tgisinternal
    ) AS audit_append_only_enabled,
    (SELECT COUNT(*) FROM public.automation_work_request WHERE deleted_at IS NULL) AS active_work_request_count,
    (SELECT COUNT(*) FROM public.automation_job_attempt) AS job_attempt_count,
    (SELECT COUNT(*) FROM public.automation_review_case WHERE deleted_at IS NULL) AS active_review_case_count,
    (SELECT COUNT(*) FROM public.payer_dispatch_task WHERE deleted_at IS NULL) AS active_dispatch_task_count;
