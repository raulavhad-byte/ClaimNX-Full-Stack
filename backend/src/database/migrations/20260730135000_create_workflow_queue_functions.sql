-- ============================================================================
-- ClaimNX Phase 6: Workflow Queue command functions
-- ============================================================================
-- Organization-scoped Queue commands. Legacy user, department, and role scope
-- fields are intentionally not accepted by Phase 6 core write commands.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_workflow_queue(
    p_workflow_queue_id UUID,
    p_organization_id UUID,
    p_code VARCHAR,
    p_name VARCHAR,
    p_type VARCHAR,
    p_scope_hospital_id UUID,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_workflow_queue_id IS NULL
       OR p_organization_id IS NULL
       OR NULLIF(BTRIM(p_code), '') IS NULL
       OR NULLIF(BTRIM(p_name), '') IS NULL
       OR NULLIF(BTRIM(p_type), '') IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Queue, Organization, code, name, type, and actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.organization_id = p_organization_id
          AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE'
          AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Workflow Queue actor must be an active Organization Member.';
    END IF;

    IF p_scope_hospital_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.hospitals hospital
           WHERE hospital.id = p_scope_hospital_id
             AND hospital.organization_id = p_organization_id
             AND hospital.deleted_at IS NULL
             AND COALESCE(hospital.is_deleted, FALSE) = FALSE
       ) THEN
        RAISE EXCEPTION 'Workflow Queue Hospital scope must be active and belong to the Organization.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workflow_queues queue
        WHERE queue.organization_id = p_organization_id
          AND LOWER(BTRIM(queue.code)) = LOWER(BTRIM(p_code))
          AND queue.deleted_at IS NULL
          AND COALESCE(queue.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'An active Workflow Queue already uses code % in this Organization.', p_code;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workflow_queues queue
        WHERE queue.organization_id = p_organization_id
          AND LOWER(BTRIM(queue.name)) = LOWER(BTRIM(p_name))
          AND queue.deleted_at IS NULL
          AND COALESCE(queue.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'An active Workflow Queue already uses name % in this Organization.', p_name;
    END IF;

    INSERT INTO public.workflow_queues (
        id, organization_id, code, name, type, scope_hospital_id, is_active,
        created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_workflow_queue_id, p_organization_id, BTRIM(p_code), BTRIM(p_name),
        BTRIM(p_type), p_scope_hospital_id, TRUE,
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );

    RETURN p_workflow_queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_workflow_queue(
    p_workflow_queue_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_code VARCHAR,
    p_name VARCHAR,
    p_type VARCHAR,
    p_scope_hospital_id UUID,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_queue_id UUID;
BEGIN
    IF p_workflow_queue_id IS NULL
       OR p_organization_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
       OR NULLIF(BTRIM(p_code), '') IS NULL
       OR NULLIF(BTRIM(p_name), '') IS NULL
       OR NULLIF(BTRIM(p_type), '') IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Queue, Organization, expected version, code, name, type, and actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.organization_id = p_organization_id
          AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE'
          AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Workflow Queue actor must be an active Organization Member.';
    END IF;

    IF p_scope_hospital_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.hospitals hospital
           WHERE hospital.id = p_scope_hospital_id
             AND hospital.organization_id = p_organization_id
             AND hospital.deleted_at IS NULL
             AND COALESCE(hospital.is_deleted, FALSE) = FALSE
       ) THEN
        RAISE EXCEPTION 'Workflow Queue Hospital scope must be active and belong to the Organization.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workflow_queues queue
        WHERE queue.organization_id = p_organization_id
          AND queue.id <> p_workflow_queue_id
          AND LOWER(BTRIM(queue.code)) = LOWER(BTRIM(p_code))
          AND queue.deleted_at IS NULL
          AND COALESCE(queue.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'An active Workflow Queue already uses code % in this Organization.', p_code;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workflow_queues queue
        WHERE queue.organization_id = p_organization_id
          AND queue.id <> p_workflow_queue_id
          AND LOWER(BTRIM(queue.name)) = LOWER(BTRIM(p_name))
          AND queue.deleted_at IS NULL
          AND COALESCE(queue.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'An active Workflow Queue already uses name % in this Organization.', p_name;
    END IF;

    UPDATE public.workflow_queues queue
    SET code = BTRIM(p_code),
        name = BTRIM(p_name),
        type = BTRIM(p_type),
        scope_hospital_id = p_scope_hospital_id,
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = queue.version + 1
    WHERE queue.id = p_workflow_queue_id
      AND queue.organization_id = p_organization_id
      AND queue.version = p_expected_version
      AND queue.is_active = TRUE
      AND queue.deleted_at IS NULL
      AND COALESCE(queue.is_deleted, FALSE) = FALSE
    RETURNING queue.id INTO v_updated_queue_id;

    RETURN v_updated_queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_workflow_queue_status(
    p_workflow_queue_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_is_active BOOLEAN,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_queue_id UUID;
BEGIN
    IF p_workflow_queue_id IS NULL
       OR p_organization_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
       OR p_is_active IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Queue, Organization, expected version, target status, and actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.organization_id = p_organization_id
          AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE'
          AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Workflow Queue actor must be an active Organization Member.';
    END IF;

    UPDATE public.workflow_queues queue
    SET is_active = p_is_active,
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = queue.version + 1
    WHERE queue.id = p_workflow_queue_id
      AND queue.organization_id = p_organization_id
      AND queue.version = p_expected_version
      AND queue.deleted_at IS NULL
      AND COALESCE(queue.is_deleted, FALSE) = FALSE
    RETURNING queue.id INTO v_updated_queue_id;

    RETURN v_updated_queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_workflow_queue(
    p_workflow_queue_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_queue_id UUID;
BEGIN
    IF p_workflow_queue_id IS NULL
       OR p_organization_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Queue, Organization, expected version, and actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.organization_id = p_organization_id
          AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE'
          AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Workflow Queue actor must be an active Organization Member.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workflow_tasks task
        WHERE task.organization_id = p_organization_id
          AND task.queue_id = p_workflow_queue_id
          AND task.deleted_at IS NULL
          AND COALESCE(task.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'A Workflow Queue with active Work Items cannot be retired.';
    END IF;

    UPDATE public.workflow_queues queue
    SET is_active = FALSE,
        deleted_by = p_actor_user_id,
        deleted_at = NOW(),
        is_deleted = TRUE,
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = queue.version + 1
    WHERE queue.id = p_workflow_queue_id
      AND queue.organization_id = p_organization_id
      AND queue.version = p_expected_version
      AND queue.deleted_at IS NULL
      AND COALESCE(queue.is_deleted, FALSE) = FALSE
    RETURNING queue.id INTO v_deleted_queue_id;

    RETURN v_deleted_queue_id;
END;
$$;

COMMENT ON FUNCTION public.create_workflow_queue IS
    'Creates an active Organization-scoped Workflow Queue. Legacy user, department, and role scopes are not written.';
COMMENT ON FUNCTION public.update_workflow_queue IS
    'Updates one active Organization-scoped Workflow Queue using optimistic concurrency.';
COMMENT ON FUNCTION public.set_workflow_queue_status IS
    'Activates or deactivates a non-retired Organization-scoped Workflow Queue using optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_workflow_queue IS
    'Soft retires an Organization-scoped Workflow Queue only when no active Work Item references it.';

COMMIT;
