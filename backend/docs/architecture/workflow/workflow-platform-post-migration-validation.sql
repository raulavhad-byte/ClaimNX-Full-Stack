-- ============================================================================
-- ClaimNX Phase 6: Workflow Platform post-migration validation (READ ONLY)
-- ============================================================================
-- Objective: prove the approved Workflow Platform database foundation exists.
-- Action: run in Supabase SQL Editor after migrations 20260730130000,
--         20260730131000, and 20260730132000 have succeeded.
-- Expected: every *_exists and *_ready value is true; all record counts are 0.
-- ============================================================================

SELECT
    to_regclass('public.workflow_definitions') IS NOT NULL AS workflow_definitions_exists,
    to_regclass('public.workflow_states') IS NOT NULL AS workflow_states_exists,
    to_regclass('public.workflow_transitions') IS NOT NULL AS workflow_transitions_exists,
    to_regclass('public.workflow_instances') IS NOT NULL AS workflow_instances_exists,
    to_regclass('public.workflow_queues') IS NOT NULL AS workflow_queues_exists,
    to_regclass('public.workflow_tasks') IS NOT NULL AS workflow_tasks_exists,
    to_regclass('public.workflow_sla') IS NOT NULL AS workflow_sla_exists,
    to_regclass('public.workflow_history') IS NOT NULL AS workflow_history_exists,
    to_regclass('public.workflow_task_history') IS NOT NULL AS workflow_task_history_exists,
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workflow_instances'
          AND column_name = 'organization_id' AND is_nullable = 'NO'
    ) AS workflow_instance_tenant_scope_ready,
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workflow_tasks'
          AND column_name = 'assigned_organization_member_id'
    ) AS workflow_task_member_assignment_ready,
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workflow_history'
          AND column_name = 'deleted_by'
    ) AS workflow_history_audit_ready,
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workflow_states'
          AND column_name = 'is_initial'
          AND is_nullable = 'NO'
    ) AS workflow_initial_state_ready,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.workflow_instances'::regclass
          AND conname = 'fk_workflow_instances_organization_hospital'
    ) AS instance_hospital_tenant_fk_exists,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.workflow_tasks'::regclass
          AND conname = 'fk_workflow_tasks_organization_member'
    ) AS task_member_tenant_fk_exists,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.workflow_transitions'::regclass
          AND conname = 'fk_workflow_transitions_definition_from_state'
    ) AS transition_definition_graph_fk_exists,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.workflow_instances'::regclass
          AND conname = 'fk_workflow_instances_definition_current_state'
    ) AS instance_definition_graph_fk_exists,
    EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_workflow_instances_organization_reference_active'
    ) AS instance_organization_reference_unique_exists,
    EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_workflow_queues_organization_code_active'
    ) AS queue_organization_code_unique_exists,
    EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_workflow_states_definition_initial_active'
    ) AS definition_initial_state_unique_exists,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.workflow_instances'::regclass
          AND conname = 'uk_workflow_instances_reference'
    ) AS legacy_instance_global_unique_removed,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.workflow_queues'::regclass
          AND conname = 'uk_workflow_queues_code'
    ) AS legacy_queue_global_unique_removed,
    (SELECT COUNT(*) FROM public.workflow_definitions) AS workflow_definition_records,
    (SELECT COUNT(*) FROM public.workflow_states) AS workflow_state_records,
    (SELECT COUNT(*) FROM public.workflow_transitions) AS workflow_transition_records,
    (SELECT COUNT(*) FROM public.workflow_instances) AS workflow_instance_records,
    (SELECT COUNT(*) FROM public.workflow_queues) AS workflow_queue_records,
    (SELECT COUNT(*) FROM public.workflow_tasks) AS workflow_task_records,
    (SELECT COUNT(*) FROM public.workflow_sla) AS workflow_sla_records,
    (SELECT COUNT(*) FROM public.workflow_history) AS workflow_history_records,
    (SELECT COUNT(*) FROM public.workflow_task_history) AS workflow_task_history_records;
