BEGIN;

-- Phase 7: tenant-scoped authorization commands for operational use of a
-- platform Insurance Partner. A caller must be an active member of the tenant.

CREATE OR REPLACE FUNCTION public.assert_active_insurance_enablement_actor(
    p_organization_id UUID,
    p_actor_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF p_organization_id IS NULL OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Organization tenant and audit actor are required.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organizations AS organization
         WHERE organization.id = p_organization_id
           AND organization.status = 'ACTIVE'
           AND organization.deleted_at IS NULL
           AND COALESCE(organization.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Organization tenant must be active.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.users AS user_record
         WHERE user_record.id = p_actor_user_id
           AND LOWER(BTRIM(user_record.status)) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members AS member
         WHERE member.organization_id = p_organization_id
           AND member.user_id = p_actor_user_id
           AND member.status = 'ACTIVE'
           AND member.deleted_at IS NULL
           AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Actor must be an active Organization member.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_active_insurance_partner(
    p_insurance_partner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM public.insurance_entities AS partner
          JOIN public.reference_values AS status_value
            ON status_value.id = partner.operational_status_reference_value_id
          JOIN public.reference_categories AS status_category
            ON status_category.id = status_value.category_id
         WHERE partner.id = p_insurance_partner_id
           AND partner.deleted_at IS NULL
           AND COALESCE(partner.is_deleted, FALSE) = FALSE
           AND status_category.code = 'INSURANCE_PARTNER_STATUS'
           AND status_value.code = 'ACTIVE'
           AND status_value.is_active = TRUE
           AND status_value.deleted_at IS NULL
           AND COALESCE(status_value.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Insurance Partner must be active to be enabled for an Organization.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_insurance_enablement_status(
    p_operational_status_reference_value_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_status_code VARCHAR(100);
BEGIN
    SELECT value.code INTO v_status_code
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE value.id = p_operational_status_reference_value_id
       AND category.code = 'ORGANIZATION_PARTNER_ENABLEMENT_STATUS'
       AND value.is_active = TRUE
       AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF v_status_code NOT IN ('ACTIVE', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Organization Partner Enablement Status Reference Value is invalid.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization_insurance_partner_enablement(
    p_organization_insurance_partner_enablement_id UUID,
    p_organization_id UUID,
    p_insurance_partner_id UUID,
    p_tenant_partner_code VARCHAR,
    p_operational_status_reference_value_id UUID,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF p_organization_insurance_partner_enablement_id IS NULL
       OR p_insurance_partner_id IS NULL
       OR p_operational_status_reference_value_id IS NULL THEN
        RAISE EXCEPTION 'Organization Partner Enablement ID, Partner, and status are required.';
    END IF;
    PERFORM public.assert_active_insurance_enablement_actor(p_organization_id, p_actor_user_id);
    PERFORM public.assert_active_insurance_partner(p_insurance_partner_id);
    PERFORM public.assert_insurance_enablement_status(p_operational_status_reference_value_id);

    IF EXISTS (
        SELECT 1 FROM public.organization_insurance_partner_enablement AS enablement
         WHERE enablement.organization_insurance_partner_enablement_id = p_organization_insurance_partner_enablement_id
    ) THEN
        RAISE EXCEPTION 'Organization Partner Enablement identifier already exists.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.organization_insurance_partner_enablement AS enablement
         WHERE enablement.organization_id = p_organization_id
           AND enablement.insurance_partner_id = p_insurance_partner_id
           AND enablement.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'An active Organization Partner Enablement already exists.';
    END IF;

    INSERT INTO public.organization_insurance_partner_enablement (
        organization_insurance_partner_enablement_id, organization_id, insurance_partner_id,
        tenant_partner_code, operational_status_reference_value_id,
        created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_organization_insurance_partner_enablement_id, p_organization_id, p_insurance_partner_id,
        NULLIF(BTRIM(p_tenant_partner_code), ''), p_operational_status_reference_value_id,
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );
    RETURN p_organization_insurance_partner_enablement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_insurance_partner_enablement(
    p_organization_insurance_partner_enablement_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID,
    p_patch JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_enablement public.organization_insurance_partner_enablement%ROWTYPE;
    v_status_reference_value_id UUID;
    v_updated_enablement_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1
       OR p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::JSONB THEN
        RAISE EXCEPTION 'Expected version and a non-empty Enablement patch are required.';
    END IF;
    PERFORM public.assert_active_insurance_enablement_actor(p_organization_id, p_actor_user_id);

    SELECT enablement.* INTO v_enablement
      FROM public.organization_insurance_partner_enablement AS enablement
     WHERE enablement.organization_insurance_partner_enablement_id = p_organization_insurance_partner_enablement_id
       AND enablement.organization_id = p_organization_id
       AND enablement.deleted_at IS NULL;
    IF NOT FOUND THEN RETURN NULL; END IF;

    v_status_reference_value_id := COALESCE(
        NULLIF(p_patch ->> 'operationalStatusReferenceValueId', '')::UUID,
        v_enablement.operational_status_reference_value_id
    );
    PERFORM public.assert_insurance_enablement_status(v_status_reference_value_id);

    UPDATE public.organization_insurance_partner_enablement AS enablement
       SET tenant_partner_code = CASE WHEN p_patch ? 'tenantPartnerCode' THEN NULLIF(BTRIM(p_patch ->> 'tenantPartnerCode'), '') ELSE enablement.tenant_partner_code END,
           operational_status_reference_value_id = v_status_reference_value_id,
           updated_by = p_actor_user_id, updated_at = NOW(), version = enablement.version + 1
     WHERE enablement.organization_insurance_partner_enablement_id = p_organization_insurance_partner_enablement_id
       AND enablement.organization_id = p_organization_id
       AND enablement.version = p_expected_version
       AND enablement.deleted_at IS NULL
     RETURNING enablement.organization_insurance_partner_enablement_id INTO v_updated_enablement_id;
    RETURN v_updated_enablement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_organization_insurance_partner_enablement_status(
    p_organization_insurance_partner_enablement_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_operational_status_reference_value_id UUID,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_updated_enablement_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN
        RAISE EXCEPTION 'Expected Enablement version is required.';
    END IF;
    PERFORM public.assert_active_insurance_enablement_actor(p_organization_id, p_actor_user_id);
    PERFORM public.assert_insurance_enablement_status(p_operational_status_reference_value_id);

    UPDATE public.organization_insurance_partner_enablement AS enablement
       SET operational_status_reference_value_id = p_operational_status_reference_value_id,
           updated_by = p_actor_user_id, updated_at = NOW(), version = enablement.version + 1
     WHERE enablement.organization_insurance_partner_enablement_id = p_organization_insurance_partner_enablement_id
       AND enablement.organization_id = p_organization_id
       AND enablement.version = p_expected_version
       AND enablement.deleted_at IS NULL
     RETURNING enablement.organization_insurance_partner_enablement_id INTO v_updated_enablement_id;
    RETURN v_updated_enablement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_organization_insurance_partner_enablement(
    p_organization_insurance_partner_enablement_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_deleted_enablement_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN
        RAISE EXCEPTION 'Expected Enablement version is required.';
    END IF;
    PERFORM public.assert_active_insurance_enablement_actor(p_organization_id, p_actor_user_id);

    UPDATE public.organization_insurance_partner_enablement AS enablement
       SET deleted_by = p_actor_user_id, deleted_at = NOW(),
           updated_by = p_actor_user_id, updated_at = NOW(), version = enablement.version + 1
     WHERE enablement.organization_insurance_partner_enablement_id = p_organization_insurance_partner_enablement_id
       AND enablement.organization_id = p_organization_id
       AND enablement.version = p_expected_version
       AND enablement.deleted_at IS NULL
     RETURNING enablement.organization_insurance_partner_enablement_id INTO v_deleted_enablement_id;
    RETURN v_deleted_enablement_id;
END;
$$;

COMMENT ON FUNCTION public.create_organization_insurance_partner_enablement IS
    'Enables an active platform Insurance Partner for an active Organization tenant.';
COMMENT ON FUNCTION public.update_organization_insurance_partner_enablement IS
    'Updates a tenant-scoped Insurance Partner Enablement using optimistic concurrency.';
COMMENT ON FUNCTION public.set_organization_insurance_partner_enablement_status IS
    'Changes tenant Partner Enablement lifecycle status using optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_organization_insurance_partner_enablement IS
    'Soft deletes a tenant-scoped Insurance Partner Enablement using optimistic concurrency.';

COMMIT;
