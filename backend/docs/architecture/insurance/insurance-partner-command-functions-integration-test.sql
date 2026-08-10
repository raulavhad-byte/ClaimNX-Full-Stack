-- ============================================================================
-- ClaimNX Phase 7: Insurance Partner command-functions integration test
-- Purpose: verifies create, update, status change, stale-write protection, and
--          soft retirement. The final ROLLBACK leaves no test record behind.
-- Run only after migration 20260730140500_create_insurance_partner_functions.sql.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_actor_user_id UUID;
    v_partner_type_reference_value_id UUID;
    v_draft_status_reference_value_id UUID;
    v_active_status_reference_value_id UUID;
    v_partner_id UUID := gen_random_uuid();
    v_created_partner_id UUID;
    v_updated_partner_id UUID;
    v_status_partner_id UUID;
    v_retired_partner_id UUID;
    v_stale_result UUID;
    v_code VARCHAR(50) := 'TEST_INS_' || REPLACE(SUBSTRING(v_partner_id::TEXT FROM 1 FOR 8), '-', '');
BEGIN
    SELECT user_record.id
      INTO v_actor_user_id
      FROM public.users AS user_record
     WHERE LOWER(BTRIM(user_record.status)) = 'active'
       AND COALESCE(user_record.is_deleted, FALSE) = FALSE
     ORDER BY user_record.created_at, user_record.id
     LIMIT 1;

    SELECT value.id
      INTO v_partner_type_reference_value_id
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_TYPE'
       AND value.code = 'INSURER'
       AND value.is_active = TRUE
       AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;

    SELECT value.id
      INTO v_draft_status_reference_value_id
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_STATUS'
       AND value.code = 'DRAFT'
       AND value.is_active = TRUE
       AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;

    SELECT value.id
      INTO v_active_status_reference_value_id
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_STATUS'
       AND value.code = 'ACTIVE'
       AND value.is_active = TRUE
       AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_actor_user_id IS NULL
       OR v_partner_type_reference_value_id IS NULL
       OR v_draft_status_reference_value_id IS NULL
       OR v_active_status_reference_value_id IS NULL THEN
        RAISE EXCEPTION 'Insurance Partner test prerequisites are incomplete.';
    END IF;

    v_created_partner_id := public.create_insurance_partner(
        v_partner_id,
        v_code,
        'ClaimNX Insurance Command Test',
        'ClaimNX Insurance Command Test Private Limited',
        v_partner_type_reference_value_id,
        v_draft_status_reference_value_id,
        'TEST-REG-001',
        v_actor_user_id
    );

    IF v_created_partner_id <> v_partner_id
       OR NOT EXISTS (
            SELECT 1
              FROM public.insurance_entities AS partner
             WHERE partner.id = v_partner_id
               AND partner.version = 1
               AND partner.deleted_at IS NULL
               AND COALESCE(partner.is_deleted, FALSE) = FALSE
       ) THEN
        RAISE EXCEPTION 'Insurance Partner create assertion failed.';
    END IF;

    v_updated_partner_id := public.update_insurance_partner(
        v_partner_id,
        1,
        v_actor_user_id,
        jsonb_build_object(
            'displayName', 'ClaimNX Insurance Command Test Updated',
            'registrationNumber', 'TEST-REG-002'
        )
    );

    IF v_updated_partner_id <> v_partner_id
       OR NOT EXISTS (
            SELECT 1
              FROM public.insurance_entities AS partner
             WHERE partner.id = v_partner_id
               AND partner.display_name = 'ClaimNX Insurance Command Test Updated'
               AND partner.version = 2
       ) THEN
        RAISE EXCEPTION 'Insurance Partner update assertion failed.';
    END IF;

    v_stale_result := public.update_insurance_partner(
        v_partner_id,
        1,
        v_actor_user_id,
        jsonb_build_object('displayName', 'This stale update must not persist')
    );

    IF v_stale_result IS NOT NULL THEN
        RAISE EXCEPTION 'Insurance Partner stale-write protection assertion failed.';
    END IF;

    v_status_partner_id := public.set_insurance_partner_status(
        v_partner_id,
        2,
        v_active_status_reference_value_id,
        v_actor_user_id
    );

    IF v_status_partner_id <> v_partner_id
       OR NOT EXISTS (
            SELECT 1
              FROM public.insurance_entities AS partner
             WHERE partner.id = v_partner_id
               AND partner.operational_status_reference_value_id = v_active_status_reference_value_id
               AND partner.version = 3
       ) THEN
        RAISE EXCEPTION 'Insurance Partner status assertion failed.';
    END IF;

    v_retired_partner_id := public.soft_delete_insurance_partner(
        v_partner_id,
        3,
        v_actor_user_id
    );

    IF v_retired_partner_id <> v_partner_id
       OR NOT EXISTS (
            SELECT 1
              FROM public.insurance_entities AS partner
             WHERE partner.id = v_partner_id
               AND partner.deleted_at IS NOT NULL
               AND partner.deleted_by = v_actor_user_id
               AND partner.version = 4
               AND partner.is_deleted = TRUE
       ) THEN
        RAISE EXCEPTION 'Insurance Partner retirement assertion failed.';
    END IF;
END;
$$;

ROLLBACK;
