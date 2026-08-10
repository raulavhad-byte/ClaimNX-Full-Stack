-- ClaimNX Phase 11 Reporting command-persistence validation (READ ONLY).
-- Run after the base schema migration and command-persistence migration.

SELECT
    to_regclass('public.report_definitions') IS NOT NULL AS report_definitions_exists,
    to_regclass('public.report_schedules') IS NOT NULL AS report_schedules_exists,
    to_regclass('public.report_executions') IS NOT NULL AS report_executions_exists,
    to_regprocedure('public.set_report_definition_status(uuid,uuid,integer,uuid,uuid)') IS NOT NULL AS definition_status_command_exists,
    to_regprocedure('public.set_report_schedule_status(uuid,uuid,integer,uuid,uuid)') IS NOT NULL AS schedule_status_command_exists,
    to_regprocedure('public.set_report_execution_status(uuid,uuid,integer,uuid,uuid)') IS NOT NULL AS execution_status_command_exists,
    to_regprocedure('public.soft_delete_report_schedule(uuid,uuid,integer,uuid)') IS NOT NULL AS schedule_soft_delete_command_exists;

SELECT
    table_name,
    COUNT(*) FILTER (WHERE column_name = 'organization_id') = 1 AS organization_scope_exists,
    COUNT(*) FILTER (WHERE column_name = 'created_by') = 1 AS created_by_exists,
    COUNT(*) FILTER (WHERE column_name = 'updated_by') = 1 AS updated_by_exists,
    COUNT(*) FILTER (WHERE column_name = 'deleted_by') = 1 AS deleted_by_exists,
    COUNT(*) FILTER (WHERE column_name = 'deleted_at') = 1 AS deleted_at_exists,
    COUNT(*) FILTER (WHERE column_name = 'is_deleted') = 1 AS is_deleted_exists,
    COUNT(*) FILTER (WHERE column_name = 'version') = 1 AS version_exists
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('report_definitions', 'report_schedules', 'report_executions')
GROUP BY table_name
ORDER BY table_name;
