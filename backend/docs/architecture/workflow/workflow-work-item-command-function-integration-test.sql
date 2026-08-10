-- ============================================================================
-- ClaimNX Phase 6: Work Item and SLA command integration test
-- ============================================================================
-- Objective: Verify Work Item, SLA, history, lifecycle, and optimistic
-- concurrency commands together.
-- Safety: This is a transaction test. It always ends with ROLLBACK.
-- Action: Run this complete file in Supabase SQL Editor after migration 136000.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_organization_id UUID;
    v_actor_user_id UUID;
    v_hospital_id UUID;
    v_definition_id UUID := gen_random_uuid();
    v_initial_state_id UUID := gen_random_uuid();
    v_definition_code VARCHAR := 'TEST_WI_DEF_' || REPLACE(gen_random_uuid()::TEXT, '-', '');
    v_instance_id UUID := gen_random_uuid();
    v_instance_history_id UUID := gen_random_uuid();
    v_task_a_id UUID := gen_random_uuid();
    v_task_a_history_create_id UUID := gen_random_uuid();
    v_task_a_history_pause_id UUID := gen_random_uuid();
    v_task_a_history_resume_id UUID := gen_random_uuid();
    v_task_a_history_transition_id UUID := gen_random_uuid();
    v_sla_a_id UUID := gen_random_uuid();
    v_task_b_id UUID := gen_random_uuid();
    v_task_b_history_create_id UUID := gen_random_uuid();
    v_task_b_history_delete_id UUID := gen_random_uuid();
    v_sla_b_id UUID := gen_random_uuid();
    v_task_a_version INTEGER;
    v_task_b_version INTEGER;
    v_sla_a_version INTEGER;
    v_created_task_id UUID;
    v_updated_sla_id UUID;
    v_transitioned_task_id UUID;
    v_deleted_task_id UUID;
BEGIN
    SELECT member.organization_id, member.user_id
    INTO v_organization_id, v_actor_user_id
    FROM public.organization_members member
    WHERE member.status = 'ACTIVE'
      AND member.deleted_at IS NULL
      AND COALESCE(member.is_deleted, FALSE) = FALSE
    ORDER BY member.created_at, member.id
    LIMIT 1;

    SELECT hospital.id INTO v_hospital_id
    FROM public.hospitals hospital
    WHERE hospital.organization_id = v_organization_id
      AND hospital.deleted_at IS NULL
      AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ORDER BY hospital.created_at, hospital.id
    LIMIT 1;

    IF v_organization_id IS NULL OR v_actor_user_id IS NULL OR v_hospital_id IS NULL THEN
        RAISE EXCEPTION 'An active Organization Member and Hospital are required for this integration test.';
    END IF;

    PERFORM public.create_workflow_definition(
        v_definition_id, v_definition_code, 'Work Item Integration Test Definition',
        'Rollback-only integration definition.', FALSE, v_actor_user_id,
        jsonb_build_array(jsonb_build_object(
            'id', v_initial_state_id, 'code', 'INITIAL', 'name', 'Initial',
            'display_order', 1, 'sla_target_minutes', 60,
            'is_initial', TRUE, 'is_terminal', FALSE
        )),
        '[]'::JSONB
    );
    IF public.activate_workflow_definition(v_definition_id, 1, v_actor_user_id) <> v_definition_id THEN
        RAISE EXCEPTION 'Workflow Definition activation failed.';
    END IF;

    PERFORM public.start_workflow_instance(
        v_instance_id, v_instance_history_id, v_organization_id,
        'TEST_WI_INS_' || REPLACE(gen_random_uuid()::TEXT, '-', ''),
        v_definition_id, v_hospital_id, 'INTEGRATION_TEST', gen_random_uuid(),
        'NORMAL', v_actor_user_id
    );

    v_created_task_id := public.create_work_item(
        v_task_a_id, v_task_a_history_create_id, v_sla_a_id, v_organization_id,
        v_instance_id, v_initial_state_id, 'STANDARD', 'Work Item A',
        'Create, pause, resume, and complete test.', NULL, NULL, 'NORMAL', 60, v_actor_user_id
    );
    IF v_created_task_id <> v_task_a_id THEN RAISE EXCEPTION 'Work Item A creation failed.'; END IF;

    SELECT task.version INTO v_task_a_version
    FROM public.workflow_tasks task
    WHERE task.id = v_task_a_id;
    SELECT sla.version INTO v_sla_a_version
    FROM public.workflow_sla sla
    WHERE sla.id = v_sla_a_id;

    v_updated_sla_id := public.update_work_item_sla(
        v_task_a_id, v_sla_a_id, v_task_a_history_pause_id, v_organization_id,
        v_task_a_version, v_sla_a_version, 60, TRUE, 'Integration pause', v_actor_user_id
    );
    IF v_updated_sla_id <> v_sla_a_id THEN RAISE EXCEPTION 'SLA pause failed.'; END IF;

    SELECT task.version INTO v_task_a_version FROM public.workflow_tasks task WHERE task.id = v_task_a_id;
    SELECT sla.version INTO v_sla_a_version FROM public.workflow_sla sla WHERE sla.id = v_sla_a_id;
    v_updated_sla_id := public.update_work_item_sla(
        v_task_a_id, v_sla_a_id, v_task_a_history_resume_id, v_organization_id,
        v_task_a_version, v_sla_a_version, 60, FALSE, NULL, v_actor_user_id
    );
    IF v_updated_sla_id <> v_sla_a_id THEN RAISE EXCEPTION 'SLA resume failed.'; END IF;

    SELECT task.version INTO v_task_a_version FROM public.workflow_tasks task WHERE task.id = v_task_a_id;
    v_transitioned_task_id := public.transition_work_item(
        v_task_a_id, v_task_a_history_transition_id, v_organization_id,
        v_task_a_version, 'IN_PROGRESS', 'Integration lifecycle transition.', v_actor_user_id
    );
    IF v_transitioned_task_id <> v_task_a_id THEN RAISE EXCEPTION 'Work Item transition failed.'; END IF;

    v_created_task_id := public.create_work_item(
        v_task_b_id, v_task_b_history_create_id, v_sla_b_id, v_organization_id,
        v_instance_id, v_initial_state_id, 'STANDARD', 'Work Item B',
        'Create and retire test.', NULL, NULL, 'NORMAL', 60, v_actor_user_id
    );
    IF v_created_task_id <> v_task_b_id THEN RAISE EXCEPTION 'Work Item B creation failed.'; END IF;
    SELECT task.version INTO v_task_b_version FROM public.workflow_tasks task WHERE task.id = v_task_b_id;
    v_deleted_task_id := public.soft_delete_work_item(
        v_task_b_id, v_task_b_history_delete_id, v_organization_id, v_task_b_version, v_actor_user_id
    );
    IF v_deleted_task_id <> v_task_b_id THEN RAISE EXCEPTION 'Work Item soft deletion failed.'; END IF;

    IF (SELECT status FROM public.workflow_tasks WHERE id = v_task_a_id) <> 'IN_PROGRESS'
       OR (SELECT paused_at IS NULL FROM public.workflow_sla WHERE id = v_sla_a_id) IS NOT TRUE
       OR (SELECT resolved_at IS NULL FROM public.workflow_sla WHERE id = v_sla_a_id) IS NOT TRUE
       OR (SELECT deleted_at IS NOT NULL AND COALESCE(is_deleted, FALSE) = TRUE FROM public.workflow_tasks WHERE id = v_task_b_id) IS NOT TRUE
       OR (SELECT COUNT(*) FROM public.workflow_task_history WHERE workflow_task_id = v_task_a_id) <> 4
       OR (SELECT COUNT(*) FROM public.workflow_task_history WHERE workflow_task_id = v_task_b_id) <> 2 THEN
        RAISE EXCEPTION 'Work Item and SLA integration assertions failed.';
    END IF;
END;
$$;

ROLLBACK;
