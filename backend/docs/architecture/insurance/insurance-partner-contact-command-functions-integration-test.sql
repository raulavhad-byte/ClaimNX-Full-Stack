-- ============================================================================
-- ClaimNX Phase 7: Insurance Partner Contact command-functions integration test
-- Purpose: verifies child create, update, stale-write protection, primary
--          selection, and soft deletion. The final ROLLBACK leaves no data.
-- Run after migrations 20260730140500 and 20260730140600.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_actor_user_id UUID;
    v_partner_type_reference_value_id UUID;
    v_partner_status_reference_value_id UUID;
    v_contact_type_reference_value_id UUID;
    v_partner_id UUID := gen_random_uuid();
    v_contact_id UUID := gen_random_uuid();
    v_partner_code VARCHAR(50) := 'TEST_INS_' || REPLACE(SUBSTRING(v_partner_id::TEXT FROM 1 FOR 8), '-', '');
    v_created_contact_id UUID;
    v_updated_contact_id UUID;
    v_primary_contact_id UUID;
    v_deleted_contact_id UUID;
    v_retired_partner_id UUID;
    v_stale_result UUID;
BEGIN
    SELECT user_record.id INTO v_actor_user_id
      FROM public.users AS user_record
     WHERE LOWER(BTRIM(user_record.status)) = 'active'
       AND COALESCE(user_record.is_deleted, FALSE) = FALSE
     ORDER BY user_record.created_at, user_record.id
     LIMIT 1;

    SELECT value.id INTO v_partner_type_reference_value_id
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_TYPE' AND value.code = 'INSURER'
       AND value.is_active = TRUE AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;

    SELECT value.id INTO v_partner_status_reference_value_id
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_STATUS' AND value.code = 'DRAFT'
       AND value.is_active = TRUE AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;

    SELECT value.id INTO v_contact_type_reference_value_id
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_CONTACT_TYPE' AND value.code = 'OPERATIONAL'
       AND value.is_active = TRUE AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_actor_user_id IS NULL OR v_partner_type_reference_value_id IS NULL
       OR v_partner_status_reference_value_id IS NULL
       OR v_contact_type_reference_value_id IS NULL THEN
        RAISE EXCEPTION 'Insurance Partner Contact test prerequisites are incomplete.';
    END IF;

    IF public.create_insurance_partner(
        v_partner_id, v_partner_code, 'ClaimNX Contact Command Test Partner',
        NULL, v_partner_type_reference_value_id, v_partner_status_reference_value_id,
        NULL, v_actor_user_id
    ) <> v_partner_id THEN
        RAISE EXCEPTION 'Temporary Insurance Partner creation failed.';
    END IF;

    v_created_contact_id := public.create_insurance_partner_contact(
        v_contact_id, v_partner_id, v_contact_type_reference_value_id,
        'ClaimNX Contact Test User', 'Operations Lead',
        'insurance.contact.test@example.com', '+91-9000000000', NULL, v_actor_user_id
    );
    IF v_created_contact_id <> v_contact_id
       OR NOT EXISTS (
            SELECT 1 FROM public.insurance_partner_contact AS contact
             WHERE contact.insurance_partner_contact_id = v_contact_id
               AND contact.version = 1 AND contact.is_primary = FALSE
               AND contact.deleted_at IS NULL
       ) THEN
        RAISE EXCEPTION 'Insurance Partner Contact create assertion failed.';
    END IF;

    v_updated_contact_id := public.update_insurance_partner_contact(
        v_contact_id, v_partner_id, 1, v_actor_user_id,
        jsonb_build_object('designation', 'Operations Manager', 'mobileNumber', '+91-9111111111')
    );
    IF v_updated_contact_id <> v_contact_id
       OR NOT EXISTS (
            SELECT 1 FROM public.insurance_partner_contact AS contact
             WHERE contact.insurance_partner_contact_id = v_contact_id
               AND contact.designation = 'Operations Manager'
               AND contact.version = 2
       ) THEN
        RAISE EXCEPTION 'Insurance Partner Contact update assertion failed.';
    END IF;

    v_stale_result := public.update_insurance_partner_contact(
        v_contact_id, v_partner_id, 1, v_actor_user_id,
        jsonb_build_object('designation', 'This stale update must not persist')
    );
    IF v_stale_result IS NOT NULL THEN
        RAISE EXCEPTION 'Insurance Partner Contact stale-write protection assertion failed.';
    END IF;

    v_primary_contact_id := public.set_insurance_partner_primary_contact(
        v_contact_id, v_partner_id, 2, v_actor_user_id
    );
    IF v_primary_contact_id <> v_contact_id
       OR NOT EXISTS (
            SELECT 1 FROM public.insurance_partner_contact AS contact
             WHERE contact.insurance_partner_contact_id = v_contact_id
               AND contact.is_primary = TRUE AND contact.version = 3
       ) THEN
        RAISE EXCEPTION 'Insurance Partner Contact primary selection assertion failed.';
    END IF;

    v_deleted_contact_id := public.soft_delete_insurance_partner_contact(
        v_contact_id, v_partner_id, 3, v_actor_user_id
    );
    IF v_deleted_contact_id <> v_contact_id
       OR NOT EXISTS (
            SELECT 1 FROM public.insurance_partner_contact AS contact
             WHERE contact.insurance_partner_contact_id = v_contact_id
               AND contact.deleted_at IS NOT NULL AND contact.deleted_by = v_actor_user_id
               AND contact.version = 4
       ) THEN
        RAISE EXCEPTION 'Insurance Partner Contact retirement assertion failed.';
    END IF;

    v_retired_partner_id := public.soft_delete_insurance_partner(v_partner_id, 1, v_actor_user_id);
    IF v_retired_partner_id <> v_partner_id THEN
        RAISE EXCEPTION 'Temporary Insurance Partner cleanup assertion failed.';
    END IF;
END;
$$;

ROLLBACK;
