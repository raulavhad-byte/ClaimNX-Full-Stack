-- ============================================================================
-- ClaimNX Phase 6: Additive Workflow Platform evolution
-- ============================================================================
-- Adds approved Phase 6 columns and the Work Item history table.
-- Foreign keys, checks, and indexes are applied by the next reviewed script.
-- ============================================================================

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.workflow_definitions)
       OR EXISTS (SELECT 1 FROM public.workflow_states)
       OR EXISTS (SELECT 1 FROM public.workflow_transitions)
       OR EXISTS (SELECT 1 FROM public.workflow_instances)
       OR EXISTS (SELECT 1 FROM public.workflow_queues)
       OR EXISTS (SELECT 1 FROM public.workflow_tasks)
       OR EXISTS (SELECT 1 FROM public.workflow_sla)
       OR EXISTS (SELECT 1 FROM public.workflow_history) THEN
        RAISE EXCEPTION
            'Phase 6 Workflow additive migration blocked: Workflow data exists. A reviewed data migration is required.';
    END IF;
END $$;

ALTER TABLE public.workflow_instances
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS workflow_definition_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.workflow_queues
    ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.workflow_tasks
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS assigned_organization_member_id UUID;

ALTER TABLE public.workflow_sla
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paused_reason TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.workflow_history
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS event_payload JSONB,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.workflow_task_history (
    workflow_task_history_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    workflow_task_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_payload JSONB,
    description TEXT NOT NULL,
    occurred_by UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_workflow_task_history PRIMARY KEY (workflow_task_history_id)
);

-- Backfill is intentionally included even though the reviewed baseline is
-- empty. It makes the migration fail safely in any environment with records
-- that cannot be resolved through existing Hospital context.
UPDATE public.workflow_instances instance
SET organization_id = hospital.organization_id
FROM public.hospitals hospital
WHERE instance.organization_id IS NULL
  AND instance.hospital_id = hospital.id;

UPDATE public.workflow_queues queue
SET organization_id = hospital.organization_id
FROM public.hospitals hospital
WHERE queue.organization_id IS NULL
  AND queue.scope_hospital_id = hospital.id;

UPDATE public.workflow_tasks task
SET organization_id = instance.organization_id
FROM public.workflow_instances instance
WHERE task.organization_id IS NULL
  AND task.workflow_instance_id = instance.id;

UPDATE public.workflow_sla sla
SET organization_id = instance.organization_id
FROM public.workflow_instances instance
WHERE sla.organization_id IS NULL
  AND sla.workflow_instance_id = instance.id;

UPDATE public.workflow_history history
SET organization_id = instance.organization_id
FROM public.workflow_instances instance
WHERE history.organization_id IS NULL
  AND history.workflow_instance_id = instance.id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.workflow_instances WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.workflow_queues WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.workflow_tasks WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.workflow_sla WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.workflow_history WHERE organization_id IS NULL) THEN
        RAISE EXCEPTION
            'Phase 6 Workflow additive migration blocked: an Organization scope could not be resolved.';
    END IF;
END $$;

ALTER TABLE public.workflow_instances
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.workflow_queues
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.workflow_tasks
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.workflow_sla
    ALTER COLUMN organization_id SET NOT NULL,
    ALTER COLUMN workflow_task_id SET NOT NULL,
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN updated_by SET NOT NULL;

ALTER TABLE public.workflow_history
    ALTER COLUMN organization_id SET NOT NULL,
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN updated_by SET NOT NULL;

COMMENT ON TABLE public.workflow_task_history IS
    'Append-only Work Item history owned by the Workflow Task aggregate.';

COMMENT ON COLUMN public.workflow_tasks.assigned_organization_member_id IS
    'Approved current direct assignee. Must reference an active member in the same Organization.';

COMMENT ON COLUMN public.workflow_tasks.assigned_to_user_id IS
    'Legacy compatibility mirror. New Phase 6 assignment logic uses assigned_organization_member_id.';

COMMENT ON COLUMN public.workflow_states.default_queue_id IS
    'Legacy compatibility field. Platform Workflow Definitions do not own Organization Queues.';

COMMIT;
