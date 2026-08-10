-- ============================================================================
-- ClaimNX Phase 7: Insurance Product Plan command-functions integration test
-- Purpose: verifies Plan create, update, stale-write protection, lifecycle,
--          retirement, and the Partner-retirement dependency rule.
-- The final ROLLBACK leaves no test data.
-- Run after migrations 20260730140500 and 20260730140700.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_actor_user_id UUID;
    v_partner_type_reference_value_id UUID;
    v_partner_draft_status_reference_value_id UUID;
    v_plan_draft_status_reference_value_id UUID;
    v_plan_active_status_reference_value_id UUID;
    v_partner_id UUID := gen_random_uuid();
    v_plan_id UUID := gen_random_uuid();
    v_partner_code VARCHAR(50) := 'TEST_INS_' || REPLACE(SUBSTRING(v_partner_id::TEXT FROM 1 FOR 8), '-', '');
    v_plan_code VARCHAR(80) := 'TEST_PLAN_' || REPLACE(SUBSTRING(v_plan_id::TEXT FROM 1 FOR 8), '-', '');
    v_created_plan_id UUID;
    v_updated_plan_id UUID;
    v_status_plan_id UUID;
    v_deleted_plan_id UUID;
    v_retired_partner_id UUID;
    v_stale_result UUID;
BEGIN
    SELECT user_record.id INTO v_actor_user_id
      FROM public.users AS user_record
     WHERE LOWER(BTRIM(user_record.status)) = 'active'
       AND COALESCE(user_record.is_deleted, FALSE) = FALSE
     ORDER BY user_record.created_at, user_record.id LIMIT 1;

    SELECT value.id INTO v_partner_type_reference_value_id
      FROM public.reference_values AS value JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_TYPE' AND value.code = 'INSURER'
       AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;
    SELECT value.id INTO v_partner_draft_status_reference_value_id
      FROM public.reference_values AS value JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_STATUS' AND value.code = 'DRAFT'
       AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;
    SELECT value.id INTO v_plan_draft_status_reference_value_id
      FROM public.reference_values AS value JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PLAN_STATUS' AND value.code = 'DRAFT'
       AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;
    SELECT value.id INTO v_plan_active_status_reference_value_id
      FROM public.reference_values AS value JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PLAN_STATUS' AND value.code = 'ACTIVE'
       AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_actor_user_id IS NULL OR v_partner_type_reference_value_id IS NULL
       OR v_partner_draft_status_reference_value_id IS NULL
       OR v_plan_draft_status_reference_value_id IS NULL
       OR v_plan_active_status_reference_value_id IS NULL THEN
        RAISE EXCEPTION 'Insurance Product Plan test prerequisites are incomplete.';
    END IF;

    PERFORM public.create_insurance_partner(
        v_partner_id, v_partner_code, 'ClaimNX Plan Command Test Partner', NULL,
        v_partner_type_reference_value_id, v_partner_draft_status_reference_value_id,
        NULL, v_actor_user_id
    );

    v_created_plan_id := public.create_insurance_product_plan(
        v_plan_id, v_partner_id, v_plan_code, 'ClaimNX Test Plan',
        'Initial plan description', v_plan_draft_status_reference_value_id, v_actor_user_id
    );
    IF v_created_plan_id <> v_plan_id
       OR NOT EXISTS (
            SELECT 1 FROM public.insurance_product_plan AS plan
             WHERE plan.insurance_product_plan_id = v_plan_id
               AND plan.version = 1 AND plan.deleted_at IS NULL
       ) THEN
        RAISE EXCEPTION 'Insurance Product Plan create assertion failed.';
    END IF;

    v_updated_plan_id := public.update_insurance_product_plan(
        v_plan_id, v_partner_id, 1, v_actor_user_id,
        jsonb_build_object('planName', 'ClaimNX Test Plan Updated', 'description', 'Updated plan description')
    );
    IF v_updated_plan_id <> v_plan_id
       OR NOT EXISTS (
            SELECT 1 FROM public.insurance_product_plan AS plan
             WHERE plan.insurance_product_plan_id = v_plan_id
               AND plan.plan_name = 'ClaimNX Test Plan Updated' AND plan.version = 2
       ) THEN
        RAISE EXCEPTION 'Insurance Product Plan update assertion failed.';
    END IF;

    v_stale_result := public.update_insurance_product_plan(
        v_plan_id, v_partner_id, 1, v_actor_user_id,
        jsonb_build_object('planName', 'This stale update must not persist')
    );
    IF v_stale_result IS NOT NULL THEN
        RAISE EXCEPTION 'Insurance Product Plan stale-write protection assertion failed.';
    END IF;

    v_status_plan_id := public.set_insurance_product_plan_status(
        v_plan_id, v_partner_id, 2, v_plan_active_status_reference_value_id, v_actor_user_id
    );
    IF v_status_plan_id <> v_plan_id
       OR NOT EXISTS (
            SELECT 1 FROM public.insurance_product_plan AS plan
             WHERE plan.insurance_product_plan_id = v_plan_id
               AND plan.operational_status_reference_value_id = v_plan_active_status_reference_value_id
               AND plan.version = 3
       ) THEN
        RAISE EXCEPTION 'Insurance Product Plan status assertion failed.';
    END IF;

    BEGIN
        PERFORM public.soft_delete_insurance_partner(v_partner_id, 1, v_actor_user_id);
        RAISE EXCEPTION 'Insurance Partner retirement was not blocked by its active Plan.';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM NOT LIKE 'Insurance Partner cannot be retired while active Plans or Organization Enablements exist.%' THEN
                RAISE;
            END IF;
    END;

    v_deleted_plan_id := public.soft_delete_insurance_product_plan(v_plan_id, v_partner_id, 3, v_actor_user_id);
    IF v_deleted_plan_id <> v_plan_id
       OR NOT EXISTS (
            SELECT 1 FROM public.insurance_product_plan AS plan
             WHERE plan.insurance_product_plan_id = v_plan_id
               AND plan.deleted_at IS NOT NULL AND plan.deleted_by = v_actor_user_id
               AND plan.version = 4
       ) THEN
        RAISE EXCEPTION 'Insurance Product Plan retirement assertion failed.';
    END IF;

    v_retired_partner_id := public.soft_delete_insurance_partner(v_partner_id, 1, v_actor_user_id);
    IF v_retired_partner_id <> v_partner_id THEN
        RAISE EXCEPTION 'Temporary Insurance Partner cleanup assertion failed.';
    END IF;
END;
$$;

ROLLBACK;
