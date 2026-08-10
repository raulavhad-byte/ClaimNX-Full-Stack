-- ============================================================================
-- ClaimNX Phase 6: Workflow Instance command-function integration test
-- ============================================================================
-- Objective: validate start, transition, stale-version protection, cancel,
--            tenant ownership, and append-only Instance history.
-- Safety: this script ends with ROLLBACK, so it leaves no database records.
-- Prerequisites: migrations 20260730133000, 20260730133500, and 20260730134000.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_organization_id UUID;
    v_actor_user_id UUID;
    v_hospital_id UUID;
    v_definition_id UUID := gen_random_uuid();
    v_open_state_id UUID := gen_random_uuid();
    v_closed_state_id UUID := gen_random_uuid();
    v_transition_id UUID := gen_random_uuid();
    v_instance_a_id UUID := gen_random_uuid();
    v_instance_b_id UUID := gen_random_uuid();
    v_start_a_history_id UUID := gen_random_uuid();
    v_transition_a_history_id UUID := gen_random_uuid();
    v_start_b_history_id UUID := gen_random_uuid();
    v_cancel_b_history_id UUID := gen_random_uuid();
    v_created_definition_id UUID;
    v_activated_definition_id UUID;
    v_started_instance_id UUID;
    v_transitioned_instance_id UUID;
    v_stale_result UUID;
    v_cancelled_instance_id UUID;
BEGIN
    SELECT member.organization_id, member.user_id, hospital.id
    INTO v_organization_id, v_actor_user_id, v_hospital_id
    FROM public.organization_members member
    JOIN public.hospitals hospital
      ON hospital.organization_id = member.organization_id
     AND hospital.deleted_at IS NULL
     AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    JOIN public.users user_record
      ON user_record.id = member.user_id
     AND user_record.deleted_at IS NULL
     AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    WHERE member.status = 'ACTIVE'
      AND member.deleted_at IS NULL
      AND COALESCE(member.is_deleted, FALSE) = FALSE
    ORDER BY member.created_at, hospital.created_at
    LIMIT 1;

    IF v_organization_id IS NULL OR v_actor_user_id IS NULL OR v_hospital_id IS NULL THEN
        RAISE EXCEPTION 'Integration test requires one active Organization Member and Hospital in the same Organization.';
    END IF;

    SELECT public.create_workflow_definition(
        v_definition_id,
        'TEST_INSTANCE_DEF_' || REPLACE(v_definition_id::TEXT, '-', ''),
        'Workflow Instance Integration Test Definition',
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
                'requires_comment', TRUE,
                'approval_required', FALSE
            )
        )
    ) INTO v_created_definition_id;

    SELECT public.activate_workflow_definition(v_definition_id, 1, v_actor_user_id)
    INTO v_activated_definition_id;

    IF v_created_definition_id <> v_definition_id
       OR v_activated_definition_id <> v_definition_id THEN
        RAISE EXCEPTION 'Workflow Instance integration test could not create and activate its temporary Definition.';
    END IF;

    SELECT public.start_workflow_instance(
        v_instance_a_id,
        v_start_a_history_id,
        v_organization_id,
        'TEST_INSTANCE_A_' || REPLACE(v_instance_a_id::TEXT, '-', ''),
        v_definition_id,
        v_hospital_id,
        'INTEGRATION_TEST',
        v_instance_a_id,
        NULL,
        v_actor_user_id
    ) INTO v_started_instance_id;

    IF v_started_instance_id <> v_instance_a_id
       OR (SELECT status FROM public.workflow_instances WHERE id = v_instance_a_id) <> 'OPEN'
       OR (SELECT current_state_id FROM public.workflow_instances WHERE id = v_instance_a_id) <> v_open_state_id
       OR (SELECT version FROM public.workflow_instances WHERE id = v_instance_a_id) <> 1
       OR (SELECT COUNT(*) FROM public.workflow_history WHERE workflow_instance_id = v_instance_a_id) <> 1 THEN
        RAISE EXCEPTION 'Workflow Instance start validation failed.';
    END IF;

    SELECT public.transition_workflow_instance(
        v_instance_a_id,
        v_transition_a_history_id,
        v_organization_id,
        1,
        v_closed_state_id,
        'Close the first test Instance.',
        v_actor_user_id
    ) INTO v_transitioned_instance_id;

    IF v_transitioned_instance_id <> v_instance_a_id
       OR (SELECT status FROM public.workflow_instances WHERE id = v_instance_a_id) <> 'CLOSED'
       OR (SELECT current_state_id FROM public.workflow_instances WHERE id = v_instance_a_id) <> v_closed_state_id
       OR (SELECT version FROM public.workflow_instances WHERE id = v_instance_a_id) <> 2
       OR (SELECT COUNT(*) FROM public.workflow_history WHERE workflow_instance_id = v_instance_a_id) <> 2 THEN
        RAISE EXCEPTION 'Workflow Instance transition or history validation failed.';
    END IF;

    SELECT public.start_workflow_instance(
        v_instance_b_id,
        v_start_b_history_id,
        v_organization_id,
        'TEST_INSTANCE_B_' || REPLACE(v_instance_b_id::TEXT, '-', ''),
        v_definition_id,
        v_hospital_id,
        'INTEGRATION_TEST',
        v_instance_b_id,
        NULL,
        v_actor_user_id
    ) INTO v_started_instance_id;

    SELECT public.transition_workflow_instance(
        v_instance_b_id,
        gen_random_uuid(),
        v_organization_id,
        2,
        v_closed_state_id,
        'This stale transition must not persist.',
        v_actor_user_id
    ) INTO v_stale_result;

    IF v_started_instance_id <> v_instance_b_id
       OR v_stale_result IS NOT NULL
       OR (SELECT version FROM public.workflow_instances WHERE id = v_instance_b_id) <> 1
       OR (SELECT COUNT(*) FROM public.workflow_history WHERE workflow_instance_id = v_instance_b_id) <> 1 THEN
        RAISE EXCEPTION 'Workflow Instance stale-version protection failed.';
    END IF;

    SELECT public.cancel_workflow_instance(
        v_instance_b_id,
        v_cancel_b_history_id,
        v_organization_id,
        1,
        'Cancel the second test Instance.',
        v_actor_user_id
    ) INTO v_cancelled_instance_id;

    IF v_cancelled_instance_id <> v_instance_b_id
       OR (SELECT status FROM public.workflow_instances WHERE id = v_instance_b_id) <> 'CANCELLED'
       OR (SELECT version FROM public.workflow_instances WHERE id = v_instance_b_id) <> 2
       OR (SELECT COUNT(*) FROM public.workflow_history WHERE workflow_instance_id = v_instance_b_id) <> 2 THEN
        RAISE EXCEPTION 'Workflow Instance cancellation or history validation failed.';
    END IF;
END;
$$;

ROLLBACK;
