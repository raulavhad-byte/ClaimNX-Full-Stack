-- ============================================================================
-- ClaimNX Phase 6: Work Item and SLA command functions
-- ============================================================================
-- Work Item commands are Organization-scoped. Current Queue and direct
-- Organization Member assignment are owned by the Work Item aggregate.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_work_item(
    p_workflow_task_id UUID, p_workflow_task_history_id UUID, p_workflow_sla_id UUID,
    p_organization_id UUID, p_workflow_instance_id UUID, p_workflow_state_id UUID,
    p_type VARCHAR, p_title VARCHAR, p_description TEXT, p_queue_id UUID,
    p_assigned_organization_member_id UUID, p_priority VARCHAR,
    p_sla_target_minutes INTEGER, p_actor_user_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_assigned_user_id UUID; v_task_id UUID;
BEGIN
    IF p_workflow_task_id IS NULL OR p_workflow_task_history_id IS NULL OR p_organization_id IS NULL
       OR p_workflow_instance_id IS NULL OR NULLIF(BTRIM(p_type), '') IS NULL
       OR NULLIF(BTRIM(p_title), '') IS NULL OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Work Item, History, Organization, Instance, type, title, and actor are required.';
    END IF;
    IF (p_workflow_sla_id IS NULL) <> (p_sla_target_minutes IS NULL)
       OR (p_sla_target_minutes IS NOT NULL AND p_sla_target_minutes < 1) THEN
        RAISE EXCEPTION 'SLA identifier and positive target minutes must be supplied together.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.organization_members member
        WHERE member.organization_id = p_organization_id AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE' AND member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Work Item actor must be an active Organization Member.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.workflow_instances instance
        WHERE instance.id = p_workflow_instance_id AND instance.organization_id = p_organization_id
          AND instance.status = 'OPEN' AND instance.deleted_at IS NULL AND COALESCE(instance.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Work Item parent Instance must be open, active, and belong to the Organization.';
    END IF;
    IF p_workflow_state_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.workflow_states state
        JOIN public.workflow_instances instance ON instance.workflow_definition_id = state.workflow_definition_id
        WHERE instance.id = p_workflow_instance_id AND state.id = p_workflow_state_id
          AND state.deleted_at IS NULL AND COALESCE(state.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Work Item State must belong to the parent Instance Definition.';
    END IF;
    IF p_queue_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.workflow_queues queue
        WHERE queue.id = p_queue_id AND queue.organization_id = p_organization_id AND queue.is_active = TRUE
          AND queue.deleted_at IS NULL AND COALESCE(queue.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Work Item Queue must be active and belong to the Organization.';
    END IF;
    IF p_assigned_organization_member_id IS NOT NULL THEN
        SELECT member.user_id INTO v_assigned_user_id FROM public.organization_members member
        WHERE member.id = p_assigned_organization_member_id AND member.organization_id = p_organization_id
          AND member.status = 'ACTIVE' AND member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = FALSE;
        IF v_assigned_user_id IS NULL THEN RAISE EXCEPTION 'Work Item direct assignee must be an active Organization Member.'; END IF;
    END IF;
    INSERT INTO public.workflow_tasks (
        id, organization_id, workflow_instance_id, workflow_state_id, type, title, description,
        queue_id, assigned_organization_member_id, assigned_to_user_id, status, priority,
        due_at, created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_workflow_task_id, p_organization_id, p_workflow_instance_id, p_workflow_state_id,
        BTRIM(p_type), BTRIM(p_title), p_description, p_queue_id, p_assigned_organization_member_id,
        v_assigned_user_id, 'OPEN', p_priority,
        CASE WHEN p_sla_target_minutes IS NULL THEN NULL ELSE NOW() + make_interval(mins => p_sla_target_minutes) END,
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    ) RETURNING id INTO v_task_id;
    IF p_workflow_sla_id IS NOT NULL THEN
        INSERT INTO public.workflow_sla (
            id, organization_id, workflow_instance_id, workflow_task_id, target_minutes, started_at,
            due_at, is_overdue, created_by, created_at, updated_by, updated_at, version
        ) VALUES (
            p_workflow_sla_id, p_organization_id, p_workflow_instance_id, p_workflow_task_id,
            p_sla_target_minutes, NOW(), NOW() + make_interval(mins => p_sla_target_minutes), FALSE,
            p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
        );
    END IF;
    INSERT INTO public.workflow_task_history (
        workflow_task_history_id, organization_id, workflow_task_id, event_type, event_payload,
        description, occurred_by, occurred_at, created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_workflow_task_history_id, p_organization_id, p_workflow_task_id, 'WORK_ITEM_CREATED',
        jsonb_build_object('workflow_instance_id', p_workflow_instance_id, 'queue_id', p_queue_id,
                           'assigned_organization_member_id', p_assigned_organization_member_id,
                           'workflow_sla_id', p_workflow_sla_id),
        'Work Item created.', p_actor_user_id, NOW(), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );
    RETURN v_task_id;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_work_item(
    p_workflow_task_id UUID, p_workflow_task_history_id UUID, p_organization_id UUID,
    p_expected_version INTEGER, p_queue_id UUID, p_assigned_organization_member_id UUID,
    p_actor_user_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_assigned_user_id UUID; v_updated_task_id UUID;
BEGIN
    IF p_workflow_task_id IS NULL OR p_workflow_task_history_id IS NULL OR p_organization_id IS NULL
       OR p_expected_version IS NULL OR p_expected_version < 1 OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Work Item, History, Organization, expected version, and actor are required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.organization_members member WHERE member.organization_id = p_organization_id
        AND member.user_id = p_actor_user_id AND member.status = 'ACTIVE' AND member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Work Item actor must be an active Organization Member.';
    END IF;
    IF p_queue_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.workflow_queues queue WHERE queue.id = p_queue_id
        AND queue.organization_id = p_organization_id AND queue.is_active = TRUE AND queue.deleted_at IS NULL AND COALESCE(queue.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Work Item Queue must be active and belong to the Organization.';
    END IF;
    IF p_assigned_organization_member_id IS NOT NULL THEN
        SELECT member.user_id INTO v_assigned_user_id FROM public.organization_members member WHERE member.id = p_assigned_organization_member_id
          AND member.organization_id = p_organization_id AND member.status = 'ACTIVE' AND member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = FALSE;
        IF v_assigned_user_id IS NULL THEN RAISE EXCEPTION 'Work Item direct assignee must be an active Organization Member.'; END IF;
    END IF;
    UPDATE public.workflow_tasks task SET queue_id = p_queue_id, assigned_organization_member_id = p_assigned_organization_member_id,
        assigned_to_user_id = v_assigned_user_id, updated_by = p_actor_user_id, updated_at = NOW(), version = task.version + 1
    WHERE task.id = p_workflow_task_id AND task.organization_id = p_organization_id AND task.version = p_expected_version
      AND task.status IN ('OPEN', 'IN_PROGRESS') AND task.deleted_at IS NULL AND COALESCE(task.is_deleted, FALSE) = FALSE
    RETURNING task.id INTO v_updated_task_id;
    IF v_updated_task_id IS NULL THEN RETURN NULL; END IF;
    INSERT INTO public.workflow_task_history (workflow_task_history_id, organization_id, workflow_task_id, event_type, event_payload, description, occurred_by, occurred_at, created_by, created_at, updated_by, updated_at, version)
    VALUES (p_workflow_task_history_id, p_organization_id, p_workflow_task_id, 'WORK_ITEM_ASSIGNED',
        jsonb_build_object('queue_id', p_queue_id, 'assigned_organization_member_id', p_assigned_organization_member_id),
        'Work Item assignment updated.', p_actor_user_id, NOW(), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1);
    RETURN v_updated_task_id;
END; $$;

CREATE OR REPLACE FUNCTION public.transition_work_item(
    p_workflow_task_id UUID, p_workflow_task_history_id UUID, p_organization_id UUID,
    p_expected_version INTEGER, p_target_status VARCHAR, p_description TEXT, p_actor_user_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_current_status VARCHAR; v_updated_task_id UUID;
BEGIN
    IF p_workflow_task_id IS NULL OR p_workflow_task_history_id IS NULL OR p_organization_id IS NULL
       OR p_expected_version IS NULL OR p_expected_version < 1 OR NULLIF(BTRIM(p_target_status), '') IS NULL OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Work Item, History, Organization, expected version, target status, and actor are required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.organization_members member WHERE member.organization_id = p_organization_id
        AND member.user_id = p_actor_user_id AND member.status = 'ACTIVE' AND member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = FALSE) THEN RAISE EXCEPTION 'Work Item actor must be an active Organization Member.'; END IF;
    SELECT task.status INTO v_current_status FROM public.workflow_tasks task WHERE task.id = p_workflow_task_id
      AND task.organization_id = p_organization_id AND task.deleted_at IS NULL AND COALESCE(task.is_deleted, FALSE) = FALSE FOR UPDATE;
    IF v_current_status IS NULL THEN RETURN NULL; END IF;
    IF NOT ((v_current_status = 'OPEN' AND BTRIM(p_target_status) IN ('IN_PROGRESS', 'CANCELLED'))
         OR (v_current_status = 'IN_PROGRESS' AND BTRIM(p_target_status) IN ('COMPLETED', 'CANCELLED'))) THEN
        RAISE EXCEPTION 'The requested Work Item status transition is not allowed.';
    END IF;
    UPDATE public.workflow_tasks task SET status = BTRIM(p_target_status), updated_by = p_actor_user_id, updated_at = NOW(), version = task.version + 1
    WHERE task.id = p_workflow_task_id AND task.organization_id = p_organization_id AND task.version = p_expected_version
      AND task.status = v_current_status AND task.deleted_at IS NULL AND COALESCE(task.is_deleted, FALSE) = FALSE RETURNING task.id INTO v_updated_task_id;
    IF v_updated_task_id IS NULL THEN RETURN NULL; END IF;
    IF BTRIM(p_target_status) IN ('COMPLETED', 'CANCELLED') THEN
        UPDATE public.workflow_sla sla SET resolved_at = NOW(), updated_by = p_actor_user_id, updated_at = NOW(), version = sla.version + 1
        WHERE sla.organization_id = p_organization_id AND sla.workflow_task_id = p_workflow_task_id AND sla.resolved_at IS NULL
          AND sla.deleted_at IS NULL AND COALESCE(sla.is_deleted, FALSE) = FALSE;
    END IF;
    INSERT INTO public.workflow_task_history (workflow_task_history_id, organization_id, workflow_task_id, event_type, event_payload, description, occurred_by, occurred_at, created_by, created_at, updated_by, updated_at, version)
    VALUES (p_workflow_task_history_id, p_organization_id, p_workflow_task_id, 'WORK_ITEM_STATUS_CHANGED',
        jsonb_build_object('from_status', v_current_status, 'to_status', BTRIM(p_target_status)),
        COALESCE(NULLIF(BTRIM(p_description), ''), 'Work Item status transitioned.'), p_actor_user_id, NOW(), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1);
    RETURN v_updated_task_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_work_item_sla(
    p_workflow_task_id UUID, p_workflow_sla_id UUID, p_workflow_task_history_id UUID,
    p_organization_id UUID, p_expected_work_item_version INTEGER, p_expected_sla_version INTEGER,
    p_target_minutes INTEGER, p_pause BOOLEAN, p_pause_reason TEXT, p_actor_user_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_sla_id UUID; v_sla_paused_at TIMESTAMPTZ; v_task_id UUID; v_event_type VARCHAR;
BEGIN
    IF p_workflow_task_id IS NULL OR p_workflow_sla_id IS NULL OR p_workflow_task_history_id IS NULL
       OR p_organization_id IS NULL OR p_expected_work_item_version IS NULL OR p_expected_work_item_version < 1
       OR p_expected_sla_version IS NULL OR p_expected_sla_version < 1 OR p_target_minutes IS NULL
       OR p_target_minutes < 1 OR p_pause IS NULL OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Work Item, SLA, History, Organization, versions, positive target minutes, pause flag, and actor are required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.organization_members member WHERE member.organization_id = p_organization_id
        AND member.user_id = p_actor_user_id AND member.status = 'ACTIVE' AND member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Work Item actor must be an active Organization Member.';
    END IF;
    SELECT task.id INTO v_task_id FROM public.workflow_tasks task WHERE task.id = p_workflow_task_id
      AND task.organization_id = p_organization_id AND task.version = p_expected_work_item_version
      AND task.status IN ('OPEN', 'IN_PROGRESS') AND task.deleted_at IS NULL AND COALESCE(task.is_deleted, FALSE) = FALSE FOR UPDATE;
    IF v_task_id IS NULL THEN RETURN NULL; END IF;
    SELECT sla.paused_at INTO v_sla_paused_at FROM public.workflow_sla sla WHERE sla.id = p_workflow_sla_id
      AND sla.organization_id = p_organization_id AND sla.workflow_task_id = p_workflow_task_id
      AND sla.version = p_expected_sla_version AND sla.resolved_at IS NULL
      AND sla.deleted_at IS NULL AND COALESCE(sla.is_deleted, FALSE) = FALSE FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF p_pause AND v_sla_paused_at IS NOT NULL THEN RAISE EXCEPTION 'SLA is already paused.'; END IF;
    IF NOT p_pause AND v_sla_paused_at IS NULL AND NULLIF(BTRIM(p_pause_reason), '') IS NOT NULL THEN
        RAISE EXCEPTION 'Pause reason is permitted only when pausing an SLA.';
    END IF;
    UPDATE public.workflow_sla sla
    SET target_minutes = p_target_minutes,
        due_at = CASE
            WHEN p_pause THEN NOW() + make_interval(mins => p_target_minutes)
            WHEN v_sla_paused_at IS NOT NULL THEN NOW() + make_interval(mins => p_target_minutes)
            ELSE sla.started_at + make_interval(mins => p_target_minutes)
        END,
        paused_at = CASE WHEN p_pause THEN NOW() ELSE NULL END,
        pause_reason = CASE WHEN p_pause THEN NULLIF(BTRIM(p_pause_reason), '') ELSE NULL END,
        updated_by = p_actor_user_id, updated_at = NOW(), version = sla.version + 1
    WHERE sla.id = p_workflow_sla_id AND sla.organization_id = p_organization_id
      AND sla.workflow_task_id = p_workflow_task_id AND sla.version = p_expected_sla_version
      AND sla.resolved_at IS NULL AND sla.deleted_at IS NULL AND COALESCE(sla.is_deleted, FALSE) = FALSE
    RETURNING sla.id INTO v_sla_id;
    IF v_sla_id IS NULL THEN RETURN NULL; END IF;
    UPDATE public.workflow_tasks task SET due_at = (SELECT due_at FROM public.workflow_sla WHERE id = v_sla_id),
        updated_by = p_actor_user_id, updated_at = NOW(), version = task.version + 1
    WHERE task.id = p_workflow_task_id AND task.organization_id = p_organization_id
      AND task.version = p_expected_work_item_version AND task.deleted_at IS NULL AND COALESCE(task.is_deleted, FALSE) = FALSE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Work Item version changed while updating SLA.'; END IF;
    v_event_type := CASE WHEN p_pause THEN 'SLA_PAUSED' WHEN v_sla_paused_at IS NOT NULL THEN 'SLA_RESUMED' ELSE 'SLA_UPDATED' END;
    INSERT INTO public.workflow_task_history (workflow_task_history_id, organization_id, workflow_task_id, event_type, event_payload, description, occurred_by, occurred_at, created_by, created_at, updated_by, updated_at, version)
    VALUES (p_workflow_task_history_id, p_organization_id, p_workflow_task_id, v_event_type,
        jsonb_build_object('workflow_sla_id', p_workflow_sla_id, 'target_minutes', p_target_minutes, 'paused', p_pause),
        CASE WHEN p_pause THEN 'Work Item SLA paused.' WHEN v_sla_paused_at IS NOT NULL THEN 'Work Item SLA resumed.' ELSE 'Work Item SLA updated.' END,
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1);
    RETURN v_sla_id;
END; $$;

CREATE OR REPLACE FUNCTION public.soft_delete_work_item(
    p_workflow_task_id UUID, p_workflow_task_history_id UUID, p_organization_id UUID,
    p_expected_version INTEGER, p_actor_user_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_deleted_task_id UUID;
BEGIN
    IF p_workflow_task_id IS NULL OR p_workflow_task_history_id IS NULL OR p_organization_id IS NULL
       OR p_expected_version IS NULL OR p_expected_version < 1 OR p_actor_user_id IS NULL THEN RAISE EXCEPTION 'Work Item, History, Organization, expected version, and actor are required.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.organization_members member WHERE member.organization_id = p_organization_id
        AND member.user_id = p_actor_user_id AND member.status = 'ACTIVE' AND member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = FALSE) THEN RAISE EXCEPTION 'Work Item actor must be an active Organization Member.'; END IF;
    UPDATE public.workflow_tasks task SET status = 'CANCELLED', deleted_by = p_actor_user_id, deleted_at = NOW(), is_deleted = TRUE,
        updated_by = p_actor_user_id, updated_at = NOW(), version = task.version + 1
    WHERE task.id = p_workflow_task_id AND task.organization_id = p_organization_id AND task.version = p_expected_version
      AND task.deleted_at IS NULL AND COALESCE(task.is_deleted, FALSE) = FALSE RETURNING task.id INTO v_deleted_task_id;
    IF v_deleted_task_id IS NULL THEN RETURN NULL; END IF;
    UPDATE public.workflow_sla sla SET resolved_at = COALESCE(sla.resolved_at, NOW()), deleted_by = p_actor_user_id, deleted_at = NOW(), is_deleted = TRUE,
        updated_by = p_actor_user_id, updated_at = NOW(), version = sla.version + 1 WHERE sla.organization_id = p_organization_id
      AND sla.workflow_task_id = p_workflow_task_id AND sla.deleted_at IS NULL AND COALESCE(sla.is_deleted, FALSE) = FALSE;
    INSERT INTO public.workflow_task_history (workflow_task_history_id, organization_id, workflow_task_id, event_type, event_payload, description, occurred_by, occurred_at, created_by, created_at, updated_by, updated_at, version)
    VALUES (p_workflow_task_history_id, p_organization_id, p_workflow_task_id, 'WORK_ITEM_RETIRED', '{}'::JSONB, 'Work Item retired.', p_actor_user_id, NOW(), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1);
    RETURN v_deleted_task_id;
END; $$;

COMMENT ON FUNCTION public.create_work_item IS 'Creates a tenant-scoped Work Item, optional SLA marker, and Work Item history atomically.';
COMMENT ON FUNCTION public.assign_work_item IS 'Updates a Work Item current Queue and direct Organization Member assignment with optimistic concurrency.';
COMMENT ON FUNCTION public.transition_work_item IS 'Transitions an active Work Item lifecycle and records Work Item history atomically.';
COMMENT ON FUNCTION public.update_work_item_sla IS 'Updates, pauses, or resumes an active Work Item SLA marker using Work Item and SLA optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_work_item IS 'Soft retires a Work Item and its active SLA marker with optimistic concurrency.';

COMMIT;
