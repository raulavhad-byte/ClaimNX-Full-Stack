-- ============================================================================
-- ClaimNX Phase 7: Organization Partner Enablement command integration test
-- Purpose: verifies tenant-scoped create, update, lifecycle, stale-version
--          protection, soft deletion, and Partner cleanup.
-- The final ROLLBACK leaves no test data.
-- Run after migrations 20260730140500 and 20260730140800.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_organization_id UUID;
    v_actor_user_id UUID;
    v_partner_type_reference_value_id UUID;
    v_partner_active_status_reference_value_id UUID;
    v_enablement_active_status_reference_value_id UUID;
    v_enablement_suspended_status_reference_value_id UUID;
    v_partner_id UUID := gen_random_uuid();
    v_enablement_id UUID := gen_random_uuid();
    v_partner_code VARCHAR(50) := 'TEST_INS_' || REPLACE(SUBSTRING(v_partner_id::TEXT FROM 1 FOR 8), '-', '');
    v_created_enablement_id UUID;
    v_updated_enablement_id UUID;
    v_status_enablement_id UUID;
    v_deleted_enablement_id UUID;
    v_retired_partner_id UUID;
    v_stale_result UUID;
BEGIN
    SELECT member.organization_id, member.user_id
      INTO v_organization_id, v_actor_user_id
      FROM public.organization_members AS member
      JOIN public.organizations AS organization ON organization.id = member.organization_id
      JOIN public.users AS user_record ON user_record.id = member.user_id
     WHERE member.status = 'ACTIVE'
       AND member.deleted_at IS NULL
       AND COALESCE(member.is_deleted, FALSE) = FALSE
       AND organization.status = 'ACTIVE'
       AND organization.deleted_at IS NULL
       AND COALESCE(organization.is_deleted, FALSE) = FALSE
       AND LOWER(BTRIM(user_record.status)) = 'active'
       AND COALESCE(user_record.is_deleted, FALSE) = FALSE
     ORDER BY member.created_at, member.id
     LIMIT 1;

    SELECT value.id INTO v_partner_type_reference_value_id
      FROM public.reference_values AS value JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_TYPE' AND value.code = 'INSURER'
       AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;
    SELECT value.id INTO v_partner_active_status_reference_value_id
      FROM public.reference_values AS value JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'INSURANCE_PARTNER_STATUS' AND value.code = 'ACTIVE'
       AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;
    SELECT value.id INTO v_enablement_active_status_reference_value_id
      FROM public.reference_values AS value JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'ORGANIZATION_PARTNER_ENABLEMENT_STATUS' AND value.code = 'ACTIVE'
       AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;
    SELECT value.id INTO v_enablement_suspended_status_reference_value_id
      FROM public.reference_values AS value JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE category.code = 'ORGANIZATION_PARTNER_ENABLEMENT_STATUS' AND value.code = 'SUSPENDED'
       AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_organization_id IS NULL OR v_actor_user_id IS NULL
       OR v_partner_type_reference_value_id IS NULL OR v_partner_active_status_reference_value_id IS NULL
       OR v_enablement_active_status_reference_value_id IS NULL OR v_enablement_suspended_status_reference_value_id IS NULL THEN
        RAISE EXCEPTION 'Organization Partner Enablement test prerequisites are incomplete.';
    END IF;

    PERFORM public.create_insurance_partner(
        v_partner_id, v_partner_code, 'ClaimNX Enablement Test Partner', NULL,
        v_partner_type_reference_value_id, v_partner_active_status_reference_value_id,
        NULL, v_actor_user_id
    );

    v_created_enablement_id := public.create_organization_insurance_partner_enablement(
        v_enablement_id, v_organization_id, v_partner_id, 'TEST-TENANT-CODE',
        v_enablement_active_status_reference_value_id, v_actor_user_id
    );
    IF v_created_enablement_id <> v_enablement_id
       OR NOT EXISTS (
            SELECT 1 FROM public.organization_insurance_partner_enablement AS enablement
             WHERE enablement.organization_insurance_partner_enablement_id = v_enablement_id
               AND enablement.version = 1 AND enablement.deleted_at IS NULL
       ) THEN
        RAISE EXCEPTION 'Organization Partner Enablement create assertion failed.';
    END IF;

    v_updated_enablement_id := public.update_organization_insurance_partner_enablement(
        v_enablement_id, v_organization_id, 1, v_actor_user_id,
        jsonb_build_object('tenantPartnerCode', 'TEST-TENANT-CODE-UPDATED')
    );
    IF v_updated_enablement_id <> v_enablement_id
       OR NOT EXISTS (
            SELECT 1 FROM public.organization_insurance_partner_enablement AS enablement
             WHERE enablement.organization_insurance_partner_enablement_id = v_enablement_id
               AND enablement.tenant_partner_code = 'TEST-TENANT-CODE-UPDATED'
               AND enablement.version = 2
       ) THEN
        RAISE EXCEPTION 'Organization Partner Enablement update assertion failed.';
    END IF;

    v_stale_result := public.update_organization_insurance_partner_enablement(
        v_enablement_id, v_organization_id, 1, v_actor_user_id,
        jsonb_build_object('tenantPartnerCode', 'This stale update must not persist')
    );
    IF v_stale_result IS NOT NULL THEN
        RAISE EXCEPTION 'Organization Partner Enablement stale-write protection assertion failed.';
    END IF;

    v_status_enablement_id := public.set_organization_insurance_partner_enablement_status(
        v_enablement_id, v_organization_id, 2,
        v_enablement_suspended_status_reference_value_id, v_actor_user_id
    );
    IF v_status_enablement_id <> v_enablement_id
       OR NOT EXISTS (
            SELECT 1 FROM public.organization_insurance_partner_enablement AS enablement
             WHERE enablement.organization_insurance_partner_enablement_id = v_enablement_id
               AND enablement.operational_status_reference_value_id = v_enablement_suspended_status_reference_value_id
               AND enablement.version = 3
       ) THEN
        RAISE EXCEPTION 'Organization Partner Enablement status assertion failed.';
    END IF;

    v_deleted_enablement_id := public.soft_delete_organization_insurance_partner_enablement(
        v_enablement_id, v_organization_id, 3, v_actor_user_id
    );
    IF v_deleted_enablement_id <> v_enablement_id
       OR NOT EXISTS (
            SELECT 1 FROM public.organization_insurance_partner_enablement AS enablement
             WHERE enablement.organization_insurance_partner_enablement_id = v_enablement_id
               AND enablement.deleted_at IS NOT NULL AND enablement.deleted_by = v_actor_user_id
               AND enablement.version = 4
       ) THEN
        RAISE EXCEPTION 'Organization Partner Enablement retirement assertion failed.';
    END IF;

    v_retired_partner_id := public.soft_delete_insurance_partner(v_partner_id, 1, v_actor_user_id);
    IF v_retired_partner_id <> v_partner_id THEN
        RAISE EXCEPTION 'Temporary Insurance Partner cleanup assertion failed.';
    END IF;
END;
$$;

ROLLBACK;
