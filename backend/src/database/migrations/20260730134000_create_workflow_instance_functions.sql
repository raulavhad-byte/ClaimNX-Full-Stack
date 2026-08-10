-- ============================================================================
-- ClaimNX Phase 6: Workflow Instance command functions
-- ============================================================================
-- Organization-scoped Workflow Instance commands. Each successful lifecycle
-- mutation writes exactly one append-only Workflow History event.
-- UUIDs are supplied by the NestJS application layer.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.start_workflow_instance(
    p_workflow_instance_id UUID,
    p_workflow_history_id UUID,
    p_organization_id UUID,
    p_instance_reference VARCHAR,
    p_workflow_definition_id UUID,
    p_hospital_id UUID,
    p_source_type VARCHAR,
    p_source_id UUID,
    p_priority VARCHAR,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_initial_state_id UUID;
    v_definition_version INTEGER;
BEGIN
    IF p_workflow_instance_id IS NULL
       OR p_workflow_history_id IS NULL
       OR p_organization_id IS NULL
       OR NULLIF(BTRIM(p_instance_reference), '') IS NULL
       OR p_workflow_definition_id IS NULL
       OR p_hospital_id IS NULL
       OR NULLIF(BTRIM(p_source_type), '') IS NULL
       OR p_source_id IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Instance, History, Organization, reference, Definition, Hospital, source, and actor are required.';
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
        RAISE EXCEPTION 'Workflow Instance actor must be an active Organization Member.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.hospitals hospital
        WHERE hospital.id = p_hospital_id
          AND hospital.organization_id = p_organization_id
          AND hospital.deleted_at IS NULL
          AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Workflow Instance Hospital must be active and belong to the Organization.';
    END IF;

    SELECT definition.definition_version, state.id
    INTO v_definition_version, v_initial_state_id
    FROM public.workflow_definitions definition
    JOIN public.workflow_states state
      ON state.workflow_definition_id = definition.id
     AND state.is_initial = TRUE
     AND state.is_terminal = FALSE
     AND state.deleted_at IS NULL
     AND COALESCE(state.is_deleted, FALSE) = FALSE
    WHERE definition.id = p_workflow_definition_id
      AND definition.status = 'ACTIVE'
      AND definition.deleted_at IS NULL
      AND COALESCE(definition.is_deleted, FALSE) = FALSE;

    IF v_initial_state_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Instance requires an active Definition with one non-terminal initial State.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workflow_instances instance
        WHERE instance.organization_id = p_organization_id
          AND LOWER(BTRIM(instance.instance_reference)) = LOWER(BTRIM(p_instance_reference))
          AND instance.deleted_at IS NULL
          AND COALESCE(instance.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'An active Workflow Instance already uses reference % in this Organization.', p_instance_reference;
    END IF;

    INSERT INTO public.workflow_instances (
        id, instance_reference, workflow_definition_id, workflow_definition_version,
        organization_id, hospital_id, source_type, source_id, current_state_id,
        status, priority, opened_at, created_by, created_at, updated_by, updated_at,
        version
    ) VALUES (
        p_workflow_instance_id, BTRIM(p_instance_reference), p_workflow_definition_id,
        v_definition_version, p_organization_id, p_hospital_id, BTRIM(p_source_type),
        p_source_id, v_initial_state_id, 'OPEN', p_priority, NOW(), p_actor_user_id,
        NOW(), p_actor_user_id, NOW(), 1
    );

    INSERT INTO public.workflow_history (
        id, organization_id, workflow_instance_id, event_type, description,
        event_payload, performed_by_user_id, occurred_at, created_by, created_at,
        updated_by, updated_at, version
    ) VALUES (
        p_workflow_history_id, p_organization_id, p_workflow_instance_id,
        'INSTANCE_STARTED', 'Workflow Instance started at its Definition initial State.',
        jsonb_build_object(
            'workflow_definition_id', p_workflow_definition_id,
            'workflow_definition_version', v_definition_version,
            'initial_state_id', v_initial_state_id,
            'source_type', BTRIM(p_source_type),
            'source_id', p_source_id
        ),
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );

    RETURN p_workflow_instance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_workflow_instance(
    p_workflow_instance_id UUID,
    p_workflow_history_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_target_state_id UUID,
    p_description TEXT,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_definition_id UUID;
    v_current_state_id UUID;
    v_current_state_terminal BOOLEAN;
    v_target_state_terminal BOOLEAN;
    v_requires_comment BOOLEAN;
    v_approval_required BOOLEAN;
    v_updated_instance_id UUID;
BEGIN
    IF p_workflow_instance_id IS NULL
       OR p_workflow_history_id IS NULL
       OR p_organization_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
       OR p_target_state_id IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Instance, History, Organization, expected version, target State, and actor are required.';
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
        RAISE EXCEPTION 'Workflow Instance actor must be an active Organization Member.';
    END IF;

    SELECT instance.workflow_definition_id, instance.current_state_id, current_state.is_terminal
    INTO v_definition_id, v_current_state_id, v_current_state_terminal
    FROM public.workflow_instances instance
    JOIN public.workflow_states current_state
      ON current_state.id = instance.current_state_id
     AND current_state.workflow_definition_id = instance.workflow_definition_id
    WHERE instance.id = p_workflow_instance_id
      AND instance.organization_id = p_organization_id
      AND instance.status = 'OPEN'
      AND instance.deleted_at IS NULL
      AND COALESCE(instance.is_deleted, FALSE) = FALSE
    FOR UPDATE OF instance;

    IF v_definition_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF COALESCE(v_current_state_terminal, FALSE) THEN
        RAISE EXCEPTION 'A terminal Workflow Instance cannot transition normally.';
    END IF;

    SELECT transition.requires_comment, transition.approval_required, target_state.is_terminal
    INTO v_requires_comment, v_approval_required, v_target_state_terminal
    FROM public.workflow_transitions transition
    JOIN public.workflow_states target_state
      ON target_state.id = transition.to_state_id
     AND target_state.workflow_definition_id = v_definition_id
     AND target_state.deleted_at IS NULL
     AND COALESCE(target_state.is_deleted, FALSE) = FALSE
    WHERE transition.workflow_definition_id = v_definition_id
      AND transition.from_state_id = v_current_state_id
      AND transition.to_state_id = p_target_state_id
      AND transition.deleted_at IS NULL
      AND COALESCE(transition.is_deleted, FALSE) = FALSE;

    IF v_target_state_terminal IS NULL THEN
        RAISE EXCEPTION 'Target State is not an approved active transition for this Workflow Instance.';
    END IF;

    IF COALESCE(v_requires_comment, FALSE)
       AND NULLIF(BTRIM(p_description), '') IS NULL THEN
        RAISE EXCEPTION 'A transition comment is required by the Workflow Definition.';
    END IF;

    IF COALESCE(v_approval_required, FALSE) THEN
        RAISE EXCEPTION 'Approval-required Workflow transitions are not supported by the current Phase 6 command set.';
    END IF;

    UPDATE public.workflow_instances instance
    SET current_state_id = p_target_state_id,
        status = CASE WHEN v_target_state_terminal THEN 'CLOSED' ELSE 'OPEN' END,
        closed_at = CASE WHEN v_target_state_terminal THEN NOW() ELSE NULL END,
        closure_reason = CASE WHEN v_target_state_terminal THEN NULLIF(BTRIM(p_description), '') ELSE NULL END,
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = instance.version + 1
    WHERE instance.id = p_workflow_instance_id
      AND instance.organization_id = p_organization_id
      AND instance.version = p_expected_version
      AND instance.status = 'OPEN'
      AND instance.deleted_at IS NULL
      AND COALESCE(instance.is_deleted, FALSE) = FALSE
    RETURNING instance.id INTO v_updated_instance_id;

    IF v_updated_instance_id IS NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.workflow_history (
        id, organization_id, workflow_instance_id, event_type, description,
        event_payload, performed_by_user_id, occurred_at, created_by, created_at,
        updated_by, updated_at, version
    ) VALUES (
        p_workflow_history_id, p_organization_id, p_workflow_instance_id,
        'STATE_TRANSITIONED',
        COALESCE(NULLIF(BTRIM(p_description), ''), 'Workflow Instance state transitioned.'),
        jsonb_build_object(
            'from_state_id', v_current_state_id,
            'to_state_id', p_target_state_id,
            'instance_status', CASE WHEN v_target_state_terminal THEN 'CLOSED' ELSE 'OPEN' END
        ),
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );

    RETURN v_updated_instance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_workflow_instance(
    p_workflow_instance_id UUID,
    p_workflow_history_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_closure_reason VARCHAR,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_instance_id UUID;
BEGIN
    IF p_workflow_instance_id IS NULL
       OR p_workflow_history_id IS NULL
       OR p_organization_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
       OR NULLIF(BTRIM(p_closure_reason), '') IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Instance, History, Organization, expected version, cancellation reason, and actor are required.';
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
        RAISE EXCEPTION 'Workflow Instance actor must be an active Organization Member.';
    END IF;

    UPDATE public.workflow_instances instance
    SET status = 'CANCELLED',
        closed_at = NOW(),
        closure_reason = BTRIM(p_closure_reason),
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = instance.version + 1
    WHERE instance.id = p_workflow_instance_id
      AND instance.organization_id = p_organization_id
      AND instance.version = p_expected_version
      AND instance.status = 'OPEN'
      AND instance.deleted_at IS NULL
      AND COALESCE(instance.is_deleted, FALSE) = FALSE
    RETURNING instance.id INTO v_updated_instance_id;

    IF v_updated_instance_id IS NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.workflow_history (
        id, organization_id, workflow_instance_id, event_type, description,
        event_payload, performed_by_user_id, occurred_at, created_by, created_at,
        updated_by, updated_at, version
    ) VALUES (
        p_workflow_history_id, p_organization_id, p_workflow_instance_id,
        'INSTANCE_CANCELLED', BTRIM(p_closure_reason),
        jsonb_build_object('closure_reason', BTRIM(p_closure_reason)),
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );

    RETURN v_updated_instance_id;
END;
$$;

COMMENT ON FUNCTION public.start_workflow_instance IS
    'Starts a tenant-scoped Workflow Instance at an active Definition initial State and appends history atomically.';
COMMENT ON FUNCTION public.transition_workflow_instance IS
    'Transitions an open tenant-scoped Workflow Instance through an approved Definition path and appends history atomically.';
COMMENT ON FUNCTION public.cancel_workflow_instance IS
    'Cancels an open tenant-scoped Workflow Instance using optimistic concurrency and appends history atomically.';

COMMIT;
