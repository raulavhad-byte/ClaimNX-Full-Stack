-- ============================================================================
-- ClaimNX Phase 6: Workflow Queue command-function integration test
-- ============================================================================
-- Objective: validate Queue create, update, status lifecycle, stale-version
--            protection, and soft retirement.
-- Safety: this script ends with ROLLBACK, so it leaves no database records.
-- Prerequisite: migration 20260730135000 has succeeded.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_organization_id UUID;
    v_actor_user_id UUID;
    v_queue_id UUID := gen_random_uuid();
    v_queue_type VARCHAR;
    v_created_queue_id UUID;
    v_updated_queue_id UUID;
    v_deactivated_queue_id UUID;
    v_reactivated_queue_id UUID;
    v_stale_result UUID;
    v_deleted_queue_id UUID;
BEGIN
    SELECT member.organization_id, member.user_id
    INTO v_organization_id, v_actor_user_id
    FROM public.organization_members member
    JOIN public.users user_record
      ON user_record.id = member.user_id
     AND user_record.deleted_at IS NULL
     AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    WHERE member.status = 'ACTIVE'
      AND member.deleted_at IS NULL
      AND COALESCE(member.is_deleted, FALSE) = FALSE
    ORDER BY member.created_at
    LIMIT 1;

    SELECT type_match.value[1]
    INTO v_queue_type
    FROM pg_constraint constraint_record
    CROSS JOIN LATERAL regexp_matches(
        pg_get_constraintdef(constraint_record.oid),
        '''([^'']+)''',
        'g'
    ) AS type_match(value)
    WHERE constraint_record.conrelid = 'public.workflow_queues'::REGCLASS
      AND constraint_record.conname = 'chk_workflow_queues_type'
    LIMIT 1;

    IF v_organization_id IS NULL OR v_actor_user_id IS NULL OR v_queue_type IS NULL THEN
        RAISE EXCEPTION 'Integration test requires an active Organization Member and the legacy Workflow Queue type constraint.';
    END IF;

    SELECT public.create_workflow_queue(
        v_queue_id,
        v_organization_id,
        'TEST_QUEUE_' || REPLACE(v_queue_id::TEXT, '-', ''),
        'Workflow Queue Integration Test',
        v_queue_type,
        NULL,
        v_actor_user_id
    ) INTO v_created_queue_id;

    IF v_created_queue_id <> v_queue_id
       OR (SELECT is_active FROM public.workflow_queues WHERE id = v_queue_id) <> TRUE
       OR (SELECT version FROM public.workflow_queues WHERE id = v_queue_id) <> 1 THEN
        RAISE EXCEPTION 'Workflow Queue create validation failed.';
    END IF;

    SELECT public.update_workflow_queue(
        v_queue_id,
        v_organization_id,
        1,
        'TESTQ_' || REPLACE(v_queue_id::TEXT, '-', ''),
        'Workflow Queue Integration Test Updated',
        v_queue_type,
        NULL,
        v_actor_user_id
    ) INTO v_updated_queue_id;

    IF v_updated_queue_id <> v_queue_id
       OR (SELECT version FROM public.workflow_queues WHERE id = v_queue_id) <> 2 THEN
        RAISE EXCEPTION 'Workflow Queue update validation failed.';
    END IF;

    SELECT public.set_workflow_queue_status(
        v_queue_id, v_organization_id, 2, FALSE, v_actor_user_id
    ) INTO v_deactivated_queue_id;

    SELECT public.set_workflow_queue_status(
        v_queue_id, v_organization_id, 3, TRUE, v_actor_user_id
    ) INTO v_reactivated_queue_id;

    IF v_deactivated_queue_id <> v_queue_id
       OR v_reactivated_queue_id <> v_queue_id
       OR (SELECT is_active FROM public.workflow_queues WHERE id = v_queue_id) <> TRUE
       OR (SELECT version FROM public.workflow_queues WHERE id = v_queue_id) <> 4 THEN
        RAISE EXCEPTION 'Workflow Queue status lifecycle validation failed.';
    END IF;

    SELECT public.set_workflow_queue_status(
        v_queue_id, v_organization_id, 3, FALSE, v_actor_user_id
    ) INTO v_stale_result;

    IF v_stale_result IS NOT NULL
       OR (SELECT version FROM public.workflow_queues WHERE id = v_queue_id) <> 4 THEN
        RAISE EXCEPTION 'Workflow Queue stale-version protection failed.';
    END IF;

    SELECT public.soft_delete_workflow_queue(
        v_queue_id, v_organization_id, 4, v_actor_user_id
    ) INTO v_deleted_queue_id;

    IF v_deleted_queue_id <> v_queue_id
       OR (SELECT is_active FROM public.workflow_queues WHERE id = v_queue_id) <> FALSE
       OR (SELECT COALESCE(is_deleted, FALSE) FROM public.workflow_queues WHERE id = v_queue_id) <> TRUE
       OR (SELECT deleted_at IS NOT NULL FROM public.workflow_queues WHERE id = v_queue_id) <> TRUE
       OR (SELECT version FROM public.workflow_queues WHERE id = v_queue_id) <> 5 THEN
        RAISE EXCEPTION 'Workflow Queue soft retirement validation failed.';
    END IF;
END;
$$;

ROLLBACK;
