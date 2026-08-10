-- ============================================================================
-- ClaimNX Phase 6: Validate Workflow command persistence
-- ============================================================================
-- Objective: Fail fast unless the complete Workflow command-persistence
-- foundation is present and internally consistent.
-- Why: Phase 6 application/API writes must not begin against a partial schema.
-- Action: Read-only validation migration. No business data is modified.
-- ============================================================================

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.workflow_definitions') IS NULL
       OR to_regclass('public.workflow_instances') IS NULL
       OR to_regclass('public.workflow_queues') IS NULL
       OR to_regclass('public.workflow_tasks') IS NULL
       OR to_regclass('public.workflow_sla') IS NULL
       OR to_regclass('public.workflow_history') IS NULL
       OR to_regclass('public.workflow_task_history') IS NULL THEN
        RAISE EXCEPTION 'Phase 6 Workflow command persistence validation failed: required Workflow tables are missing.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_tasks' AND column_name = 'organization_id')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_tasks' AND column_name = 'assigned_organization_member_id')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_sla' AND column_name = 'organization_id')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_sla' AND column_name = 'workflow_task_id')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_sla' AND column_name = 'paused_at')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflow_sla' AND column_name = 'pause_reason') THEN
        RAISE EXCEPTION 'Phase 6 Workflow command persistence validation failed: Work Item or SLA columns are missing.';
    END IF;

    IF (SELECT COUNT(*) FROM pg_proc procedure JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public' AND procedure.proname IN (
            'create_workflow_definition', 'activate_workflow_definition', 'retire_workflow_definition',
            'start_workflow_instance', 'transition_workflow_instance', 'cancel_workflow_instance',
            'create_workflow_queue', 'update_workflow_queue', 'set_workflow_queue_status', 'soft_delete_workflow_queue',
            'create_work_item', 'assign_work_item', 'transition_work_item', 'update_work_item_sla', 'soft_delete_work_item'
        )) <> 15 THEN
        RAISE EXCEPTION 'Phase 6 Workflow command persistence validation failed: one or more approved command functions are missing.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_tasks'::REGCLASS AND contype = 'f'
        AND conname = 'fk_workflow_tasks_organization_instance')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_tasks'::REGCLASS AND contype = 'f'
        AND conname = 'fk_workflow_tasks_organization_member')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_sla'::REGCLASS AND contype = 'f'
        AND conname = 'fk_workflow_sla_organization_task') THEN
        RAISE EXCEPTION 'Phase 6 Workflow command persistence validation failed: Work Item or SLA tenant foreign keys are missing.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_definitions'::REGCLASS
        AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%INACTIVE%')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_instances'::REGCLASS
        AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%CANCELLED%')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workflow_tasks'::REGCLASS
        AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%IN_PROGRESS%') THEN
        RAISE EXCEPTION 'Phase 6 Workflow command persistence validation failed: lifecycle status constraints are incomplete.';
    END IF;
END;
$$;

COMMIT;
