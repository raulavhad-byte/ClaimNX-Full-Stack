-- ============================================================================
-- ClaimNX Phase 6: Workflow Definition command-function integration test
-- ============================================================================
-- Objective: validate create, activate, stale-version protection, and retire.
-- Safety: this script ends with ROLLBACK, so it leaves no database records.
-- Run only after 20260730133000 has succeeded.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_actor_user_id UUID;
    v_definition_id UUID := gen_random_uuid();
    v_open_state_id UUID := gen_random_uuid();
    v_closed_state_id UUID := gen_random_uuid();
    v_transition_id UUID := gen_random_uuid();
    v_created_definition_id UUID;
    v_activated_definition_id UUID;
    v_stale_result UUID;
    v_retired_definition_id UUID;
BEGIN
    SELECT user_record.id
    INTO v_actor_user_id
    FROM public.users user_record
    WHERE user_record.status = 'Active'
      AND COALESCE(user_record.is_deleted, FALSE) = FALSE
      AND user_record.deleted_at IS NULL
    ORDER BY user_record.created_at
    LIMIT 1;

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Integration test requires one active ClaimNX User.';
    END IF;

    SELECT public.create_workflow_definition(
        v_definition_id,
        'TEST_DEF_' || REPLACE(v_definition_id::TEXT, '-', ''),
        'Workflow Definition Integration Test',
        'Transactional test; rolled back after validation.',
        FALSE,
        v_actor_user_id,
        jsonb_build_array(
            jsonb_build_object(
                'id', v_open_state_id,
                'code', 'OPEN',
                'name', 'Open',
                'display_order', 1,
                'is_initial', TRUE,
                'is_terminal', FALSE
            ),
            jsonb_build_object(
                'id', v_closed_state_id,
                'code', 'CLOSED',
                'name', 'Closed',
                'display_order', 2,
                'is_initial', FALSE,
                'is_terminal', TRUE
            )
        ),
        jsonb_build_array(
            jsonb_build_object(
                'id', v_transition_id,
                'from_state_id', v_open_state_id,
                'to_state_id', v_closed_state_id,
                'requires_comment', FALSE,
                'approval_required', FALSE
            )
        )
    ) INTO v_created_definition_id;

    IF v_created_definition_id <> v_definition_id
       OR (SELECT status FROM public.workflow_definitions WHERE id = v_definition_id) <> 'DRAFT'
       OR (SELECT version FROM public.workflow_definitions WHERE id = v_definition_id) <> 1
       OR (SELECT COUNT(*) FROM public.workflow_states WHERE workflow_definition_id = v_definition_id) <> 2
       OR (SELECT COUNT(*) FROM public.workflow_states WHERE workflow_definition_id = v_definition_id AND is_initial = TRUE) <> 1
       OR (SELECT COUNT(*) FROM public.workflow_transitions WHERE workflow_definition_id = v_definition_id) <> 1 THEN
        RAISE EXCEPTION 'Workflow Definition create function validation failed.';
    END IF;

    SELECT public.activate_workflow_definition(v_definition_id, 1, v_actor_user_id)
    INTO v_activated_definition_id;

    IF v_activated_definition_id <> v_definition_id
       OR (SELECT status FROM public.workflow_definitions WHERE id = v_definition_id) <> 'ACTIVE'
       OR (SELECT version FROM public.workflow_definitions WHERE id = v_definition_id) <> 2 THEN
        RAISE EXCEPTION 'Workflow Definition activation validation failed.';
    END IF;

    SELECT public.activate_workflow_definition(v_definition_id, 1, v_actor_user_id)
    INTO v_stale_result;
    IF v_stale_result IS NOT NULL THEN
        RAISE EXCEPTION 'Workflow Definition stale-version protection failed.';
    END IF;

    SELECT public.retire_workflow_definition(v_definition_id, 2, v_actor_user_id)
    INTO v_retired_definition_id;

    IF v_retired_definition_id <> v_definition_id
       OR (SELECT status FROM public.workflow_definitions WHERE id = v_definition_id) <> 'INACTIVE'
       OR (SELECT version FROM public.workflow_definitions WHERE id = v_definition_id) <> 3 THEN
        RAISE EXCEPTION 'Workflow Definition retirement validation failed.';
    END IF;
END;
$$;

ROLLBACK;
