-- Phase 10 post-migration validation. Read-only apart from raising an error when incomplete.
BEGIN;

DO $$
DECLARE required_table_count INTEGER := 11; actual_table_count INTEGER; required_value_count INTEGER := 50; actual_value_count INTEGER;
BEGIN
 SELECT COUNT(*) INTO actual_table_count
 FROM pg_class table_record JOIN pg_namespace schema_record ON schema_record.oid=table_record.relnamespace
 WHERE schema_record.nspname='public' AND table_record.relkind='r'
   AND table_record.relname IN ('automation_work_request','automation_job_attempt','automation_review_case','automation_extraction_candidate','automation_inference_result','automation_review_decision','automation_owner_command_request','payer_dispatch_task','payer_dispatch_attempt','payer_dispatch_verification','automation_audit_entry');
 IF actual_table_count <> required_table_count THEN RAISE EXCEPTION 'Phase 10 validation failed: expected % tables, found %.',required_table_count,actual_table_count; END IF;

 SELECT COUNT(*) INTO actual_value_count
 FROM public.reference_values value JOIN public.reference_categories category ON category.id=value.category_id
 WHERE category.code IN ('AUTOMATION_WORK_PURPOSE','AUTOMATION_WORK_STATUS','AUTOMATION_JOB_STATUS','AUTOMATION_REVIEW_TYPE','AUTOMATION_REVIEW_STATUS','AUTOMATION_INFERENCE_TYPE','AUTOMATION_OWNER_COMMAND_STATUS','AUTOMATION_DISPATCH_CHANNEL','AUTOMATION_DISPATCH_STATUS','AUTOMATION_VERIFICATION_STATUS')
   AND value.organization_id IS NULL AND value.is_active=TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted,FALSE)=FALSE;
 IF actual_value_count <> required_value_count THEN RAISE EXCEPTION 'Phase 10 validation failed: expected % active global reference values, found %.',required_value_count,actual_value_count; END IF;

 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.automation_audit_entry'::regclass AND tgname='trg_automation_audit_entry_append_only' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.payer_dispatch_verification'::regclass AND tgname='trg_payer_dispatch_verification_append_only' AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Phase 10 validation failed: append-only protection is incomplete.';
 END IF;
END $$;

COMMIT;
