-- ============================================================================
-- ClaimNX Phase 6: Workflow Platform integrity, constraints, and indexes
-- ============================================================================
-- Applies tenant isolation, audit foreign keys, optimistic concurrency,
-- soft-delete consistency, graph integrity, and approved active indexes.
-- ============================================================================

BEGIN;

-- Script 2 established the audit standard for the legacy history table except
-- for its optional soft-delete actor. Add it here before audit foreign keys
-- and consistency constraints are introduced.
ALTER TABLE public.workflow_history
    ADD COLUMN IF NOT EXISTS deleted_by UUID;

DO $$
DECLARE
    workflow_table TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM public.workflow_definitions)
       OR EXISTS (SELECT 1 FROM public.workflow_states)
       OR EXISTS (SELECT 1 FROM public.workflow_transitions)
       OR EXISTS (SELECT 1 FROM public.workflow_instances)
       OR EXISTS (SELECT 1 FROM public.workflow_queues)
       OR EXISTS (SELECT 1 FROM public.workflow_tasks)
       OR EXISTS (SELECT 1 FROM public.workflow_sla)
       OR EXISTS (SELECT 1 FROM public.workflow_history)
       OR EXISTS (SELECT 1 FROM public.workflow_task_history) THEN
        RAISE EXCEPTION
            'Phase 6 Workflow integrity migration blocked: data exists and requires a reviewed conversion.';
    END IF;

    FOREACH workflow_table IN ARRAY ARRAY[
        'workflow_definitions', 'workflow_states', 'workflow_transitions',
        'workflow_instances', 'workflow_queues', 'workflow_tasks',
        'workflow_sla', 'workflow_history', 'workflow_task_history'
    ]
    LOOP
        EXECUTE FORMAT(
            'ALTER TABLE public.%I ALTER COLUMN created_by SET NOT NULL, ALTER COLUMN updated_by SET NOT NULL',
            workflow_table
        );
    END LOOP;
END $$;

-- Composite target keys used to enforce Organization boundaries.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hospitals_organization_hospital
    ON public.hospitals (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_members_organization_member
    ON public.organization_members (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_instances_organization_instance
    ON public.workflow_instances (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_queues_organization_queue
    ON public.workflow_queues (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_tasks_organization_task
    ON public.workflow_tasks (organization_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_states_definition_state
    ON public.workflow_states (workflow_definition_id, id);

DO $$
DECLARE
    workflow_table TEXT;
    audit_column TEXT;
    constraint_name TEXT;
BEGIN
    -- Audit foreign keys for all approved Workflow aggregates and histories.
    FOREACH workflow_table IN ARRAY ARRAY[
        'workflow_definitions', 'workflow_states', 'workflow_transitions',
        'workflow_instances', 'workflow_queues', 'workflow_tasks',
        'workflow_sla', 'workflow_history', 'workflow_task_history'
    ]
    LOOP
        FOREACH audit_column IN ARRAY ARRAY['created_by', 'updated_by', 'deleted_by']
        LOOP
            constraint_name := FORMAT('fk_%s_%s_user', workflow_table, audit_column);
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = FORMAT('public.%I', workflow_table)::REGCLASS
                  AND conname = constraint_name
            ) THEN
                EXECUTE FORMAT(
                    'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.users(id) ON DELETE RESTRICT',
                    workflow_table,
                    constraint_name,
                    audit_column
                );
            END IF;
        END LOOP;
    END LOOP;

    -- New Organization and same-Organization aggregate references.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_instances_organization') THEN
        ALTER TABLE public.workflow_instances
            ADD CONSTRAINT fk_workflow_instances_organization
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_instances_organization_hospital') THEN
        ALTER TABLE public.workflow_instances
            ADD CONSTRAINT fk_workflow_instances_organization_hospital
            FOREIGN KEY (organization_id, hospital_id)
            REFERENCES public.hospitals(organization_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_queues_organization') THEN
        ALTER TABLE public.workflow_queues
            ADD CONSTRAINT fk_workflow_queues_organization
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_tasks_organization') THEN
        ALTER TABLE public.workflow_tasks
            ADD CONSTRAINT fk_workflow_tasks_organization
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_tasks_organization_instance') THEN
        ALTER TABLE public.workflow_tasks
            ADD CONSTRAINT fk_workflow_tasks_organization_instance
            FOREIGN KEY (organization_id, workflow_instance_id)
            REFERENCES public.workflow_instances(organization_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_tasks_organization_queue') THEN
        ALTER TABLE public.workflow_tasks
            ADD CONSTRAINT fk_workflow_tasks_organization_queue
            FOREIGN KEY (organization_id, queue_id)
            REFERENCES public.workflow_queues(organization_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_tasks_organization_member') THEN
        ALTER TABLE public.workflow_tasks
            ADD CONSTRAINT fk_workflow_tasks_organization_member
            FOREIGN KEY (organization_id, assigned_organization_member_id)
            REFERENCES public.organization_members(organization_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_sla_organization') THEN
        ALTER TABLE public.workflow_sla
            ADD CONSTRAINT fk_workflow_sla_organization
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_sla_organization_instance') THEN
        ALTER TABLE public.workflow_sla
            ADD CONSTRAINT fk_workflow_sla_organization_instance
            FOREIGN KEY (organization_id, workflow_instance_id)
            REFERENCES public.workflow_instances(organization_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_sla_organization_task') THEN
        ALTER TABLE public.workflow_sla
            ADD CONSTRAINT fk_workflow_sla_organization_task
            FOREIGN KEY (organization_id, workflow_task_id)
            REFERENCES public.workflow_tasks(organization_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_history_organization') THEN
        ALTER TABLE public.workflow_history
            ADD CONSTRAINT fk_workflow_history_organization
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_history_organization_instance') THEN
        ALTER TABLE public.workflow_history
            ADD CONSTRAINT fk_workflow_history_organization_instance
            FOREIGN KEY (organization_id, workflow_instance_id)
            REFERENCES public.workflow_instances(organization_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_task_history_organization') THEN
        ALTER TABLE public.workflow_task_history
            ADD CONSTRAINT fk_workflow_task_history_organization
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_task_history_organization_task') THEN
        ALTER TABLE public.workflow_task_history
            ADD CONSTRAINT fk_workflow_task_history_organization_task
            FOREIGN KEY (organization_id, workflow_task_id)
            REFERENCES public.workflow_tasks(organization_id, id) ON DELETE RESTRICT;
    END IF;

    -- Definition graph integrity.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_transitions_definition_from_state') THEN
        ALTER TABLE public.workflow_transitions
            ADD CONSTRAINT fk_workflow_transitions_definition_from_state
            FOREIGN KEY (workflow_definition_id, from_state_id)
            REFERENCES public.workflow_states(workflow_definition_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_transitions_definition_to_state') THEN
        ALTER TABLE public.workflow_transitions
            ADD CONSTRAINT fk_workflow_transitions_definition_to_state
            FOREIGN KEY (workflow_definition_id, to_state_id)
            REFERENCES public.workflow_states(workflow_definition_id, id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_instances_definition_current_state') THEN
        ALTER TABLE public.workflow_instances
            ADD CONSTRAINT fk_workflow_instances_definition_current_state
            FOREIGN KEY (workflow_definition_id, current_state_id)
            REFERENCES public.workflow_states(workflow_definition_id, id) ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
DECLARE
    workflow_table TEXT;
    constraint_name TEXT;
BEGIN
    FOREACH workflow_table IN ARRAY ARRAY[
        'workflow_definitions', 'workflow_states', 'workflow_transitions',
        'workflow_instances', 'workflow_queues', 'workflow_tasks',
        'workflow_sla', 'workflow_history', 'workflow_task_history'
    ]
    LOOP
        constraint_name := FORMAT('ck_%s_version', workflow_table);
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = constraint_name) THEN
            EXECUTE FORMAT(
                'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (version >= 1)',
                workflow_table, constraint_name
            );
        END IF;

        constraint_name := FORMAT('ck_%s_soft_delete_consistency', workflow_table);
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = constraint_name) THEN
            EXECUTE FORMAT(
                'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK ((deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE) OR (deleted_at IS NOT NULL AND COALESCE(is_deleted, FALSE) = TRUE))',
                workflow_table, constraint_name
            );
        END IF;
    END LOOP;
END $$;

ALTER TABLE public.workflow_states
    ADD CONSTRAINT ck_workflow_states_display_order CHECK (display_order >= 1),
    ADD CONSTRAINT ck_workflow_states_sla_target_minutes CHECK (sla_target_minutes IS NULL OR sla_target_minutes > 0);

ALTER TABLE public.workflow_sla
    ADD CONSTRAINT ck_workflow_sla_target_minutes CHECK (target_minutes > 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_definitions_code_active
    ON public.workflow_definitions (code)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_states_definition_code_active
    ON public.workflow_states (workflow_definition_id, code)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_states_definition_name_active
    ON public.workflow_states (workflow_definition_id, name)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_transitions_definition_path_active
    ON public.workflow_transitions (workflow_definition_id, from_state_id, to_state_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_instances_organization_reference_active
    ON public.workflow_instances (organization_id, instance_reference)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_queues_organization_code_active
    ON public.workflow_queues (organization_id, code)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_queues_organization_name_active
    ON public.workflow_queues (organization_id, name)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_sla_task_active
    ON public.workflow_sla (workflow_task_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_instances_organization_state_active
    ON public.workflow_instances (organization_id, current_state_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_instances_organization_source_active
    ON public.workflow_instances (organization_id, source_type, source_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_queues_organization_active
    ON public.workflow_queues (organization_id)
    WHERE is_active = TRUE AND deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_organization_status_active
    ON public.workflow_tasks (organization_id, status)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_organization_queue_active
    ON public.workflow_tasks (organization_id, queue_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_organization_member_active
    ON public.workflow_tasks (organization_id, assigned_organization_member_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_organization_due_active
    ON public.workflow_tasks (organization_id, due_at)
    WHERE due_at IS NOT NULL AND deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_sla_organization_due_active
    ON public.workflow_sla (organization_id, due_at)
    WHERE resolved_at IS NULL AND deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_workflow_history_organization_instance_occurred
    ON public.workflow_history (organization_id, workflow_instance_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_workflow_task_history_organization_task_occurred
    ON public.workflow_task_history (organization_id, workflow_task_id, occurred_at);

-- Replacement scoped uniqueness exists before the legacy global rules retire.
ALTER TABLE public.workflow_instances
    DROP CONSTRAINT IF EXISTS uk_workflow_instances_reference;

ALTER TABLE public.workflow_queues
    DROP CONSTRAINT IF EXISTS uk_workflow_queues_code;

COMMENT ON TABLE public.workflow_tasks IS
    'Phase 6 Work Item aggregate. Existing table identity retained for legacy compatibility.';

COMMENT ON TABLE public.workflow_history IS
    'Append-only Workflow Instance history. Normal update and delete operations are prohibited.';

COMMIT;
