-- ============================================================================
-- ClaimNX Phase 6: Workflow Definition command functions
-- ============================================================================
-- Platform-governed commands. Definition, State, and Transition changes are
-- persisted atomically. UUIDs are supplied by the NestJS application layer.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_workflow_definition(
    p_workflow_definition_id UUID,
    p_code VARCHAR,
    p_name VARCHAR,
    p_description TEXT,
    p_allows_reopen BOOLEAN,
    p_actor_user_id UUID,
    p_states JSONB,
    p_transitions JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_state_count INTEGER;
    v_initial_state_count INTEGER;
BEGIN
    IF p_workflow_definition_id IS NULL
       OR NULLIF(BTRIM(p_code), '') IS NULL
       OR NULLIF(BTRIM(p_name), '') IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Workflow Definition identifier, code, name, and audit actor are required.';
    END IF;

    IF jsonb_typeof(p_states) <> 'array' OR jsonb_array_length(p_states) = 0 THEN
        RAISE EXCEPTION 'A Workflow Definition requires at least one State.';
    END IF;

    IF jsonb_typeof(p_transitions) <> 'array' THEN
        RAISE EXCEPTION 'Workflow Transitions must be supplied as a JSON array.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users user_record
        WHERE user_record.id = p_actor_user_id
          AND COALESCE(user_record.is_deleted, FALSE) = FALSE
          AND user_record.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Workflow Definition audit actor must be an active ClaimNX User.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.workflow_definitions definition
        WHERE LOWER(BTRIM(definition.code)) = LOWER(BTRIM(p_code))
          AND definition.deleted_at IS NULL
          AND COALESCE(definition.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'An active Workflow Definition already uses code %.', p_code;
    END IF;

    INSERT INTO public.workflow_definitions (
        id, code, name, description, definition_version, status, allows_reopen,
        created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_workflow_definition_id, BTRIM(p_code), BTRIM(p_name), p_description,
        1, 'DRAFT', COALESCE(p_allows_reopen, FALSE),
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );

    INSERT INTO public.workflow_states (
        id, workflow_definition_id, code, name, display_order,
        sla_target_minutes, is_initial, is_terminal,
        created_by, created_at, updated_by, updated_at, version
    )
    SELECT
        state.id, p_workflow_definition_id, BTRIM(state.code), BTRIM(state.name),
        state.display_order, state.sla_target_minutes,
        COALESCE(state.is_initial, FALSE), COALESCE(state.is_terminal, FALSE),
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    FROM jsonb_to_recordset(p_states) AS state(
        id UUID,
        code TEXT,
        name TEXT,
        display_order INTEGER,
        sla_target_minutes INTEGER,
        is_initial BOOLEAN,
        is_terminal BOOLEAN
    );

    GET DIAGNOSTICS v_state_count = ROW_COUNT;
    IF v_state_count <> jsonb_array_length(p_states) THEN
        RAISE EXCEPTION 'Every supplied Workflow State must be valid.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.workflow_states state
        WHERE state.workflow_definition_id = p_workflow_definition_id
          AND (
              NULLIF(BTRIM(state.code), '') IS NULL
              OR NULLIF(BTRIM(state.name), '') IS NULL
              OR state.display_order < 1
              OR (state.sla_target_minutes IS NOT NULL AND state.sla_target_minutes < 1)
          )
    ) THEN
        RAISE EXCEPTION 'Workflow States require code, name, positive display order, and a positive SLA target when supplied.';
    END IF;

    SELECT COUNT(*) INTO v_initial_state_count
    FROM public.workflow_states state
    WHERE state.workflow_definition_id = p_workflow_definition_id
      AND state.is_initial = TRUE
      AND state.deleted_at IS NULL
      AND COALESCE(state.is_deleted, FALSE) = FALSE;

    IF v_initial_state_count <> 1 THEN
        RAISE EXCEPTION 'A Workflow Definition requires exactly one active initial State.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workflow_states state
        WHERE state.workflow_definition_id = p_workflow_definition_id
        GROUP BY LOWER(BTRIM(state.code))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Workflow State codes must be unique within a Definition.';
    END IF;

    INSERT INTO public.workflow_transitions (
        id, workflow_definition_id, from_state_id, to_state_id,
        requires_comment, approval_required,
        created_by, created_at, updated_by, updated_at, version
    )
    SELECT
        transition.id, p_workflow_definition_id,
        transition.from_state_id, transition.to_state_id,
        COALESCE(transition.requires_comment, FALSE),
        COALESCE(transition.approval_required, FALSE),
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    FROM jsonb_to_recordset(p_transitions) AS transition(
        id UUID,
        from_state_id UUID,
        to_state_id UUID,
        requires_comment BOOLEAN,
        approval_required BOOLEAN
    );

    IF EXISTS (
        SELECT 1 FROM public.workflow_transitions transition
        WHERE transition.workflow_definition_id = p_workflow_definition_id
          AND transition.from_state_id = transition.to_state_id
    ) THEN
        RAISE EXCEPTION 'A Workflow Transition cannot use the same source and target State.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.workflow_transitions transition
        LEFT JOIN public.workflow_states from_state
          ON from_state.id = transition.from_state_id
         AND from_state.workflow_definition_id = p_workflow_definition_id
        LEFT JOIN public.workflow_states to_state
          ON to_state.id = transition.to_state_id
         AND to_state.workflow_definition_id = p_workflow_definition_id
        WHERE transition.workflow_definition_id = p_workflow_definition_id
          AND (from_state.id IS NULL OR to_state.id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Each Workflow Transition must use States owned by the same Definition.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.workflow_transitions transition
        WHERE transition.workflow_definition_id = p_workflow_definition_id
        GROUP BY transition.from_state_id, transition.to_state_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Workflow Transition paths must be unique within a Definition.';
    END IF;

    RETURN p_workflow_definition_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_workflow_definition(
    p_workflow_definition_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_definition_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Expected Definition version and audit actor are required.';
    END IF;

    IF (SELECT COUNT(*) FROM public.workflow_states state
        WHERE state.workflow_definition_id = p_workflow_definition_id
          AND state.is_initial = TRUE
          AND state.deleted_at IS NULL
          AND COALESCE(state.is_deleted, FALSE) = FALSE) <> 1 THEN
        RAISE EXCEPTION 'A Workflow Definition must have exactly one active initial State before activation.';
    END IF;

    UPDATE public.workflow_definitions definition
    SET status = 'ACTIVE', updated_by = p_actor_user_id, updated_at = NOW(), version = definition.version + 1
    WHERE definition.id = p_workflow_definition_id
      AND definition.status = 'DRAFT'
      AND definition.version = p_expected_version
      AND definition.deleted_at IS NULL
      AND COALESCE(definition.is_deleted, FALSE) = FALSE
    RETURNING definition.id INTO v_definition_id;

    RETURN v_definition_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.retire_workflow_definition(
    p_workflow_definition_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_definition_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Expected Definition version and audit actor are required.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.workflow_instances instance
        WHERE instance.workflow_definition_id = p_workflow_definition_id
          AND instance.status = 'OPEN'
          AND instance.deleted_at IS NULL
          AND COALESCE(instance.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'A Workflow Definition with active Instances cannot be retired.';
    END IF;

    UPDATE public.workflow_definitions definition
    SET status = 'INACTIVE', updated_by = p_actor_user_id, updated_at = NOW(), version = definition.version + 1
    WHERE definition.id = p_workflow_definition_id
      AND definition.version = p_expected_version
      AND definition.deleted_at IS NULL
      AND COALESCE(definition.is_deleted, FALSE) = FALSE
    RETURNING definition.id INTO v_definition_id;

    RETURN v_definition_id;
END;
$$;

COMMENT ON FUNCTION public.create_workflow_definition IS
    'Creates one draft Workflow Definition and its complete State/Transition graph atomically.';
COMMENT ON FUNCTION public.activate_workflow_definition IS
    'Activates a complete Workflow Definition using optimistic concurrency.';
COMMENT ON FUNCTION public.retire_workflow_definition IS
    'Retires an unused Workflow Definition using optimistic concurrency.';

COMMIT;
