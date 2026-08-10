BEGIN;

-- Phase 7: platform-owned Insurance Partner command boundary.
-- These functions require application-generated UUIDs and use optimistic
-- concurrency. Platform authorization remains enforced by the API/service.

CREATE OR REPLACE FUNCTION public.create_insurance_partner(
    p_insurance_partner_id UUID,
    p_partner_code VARCHAR,
    p_display_name VARCHAR,
    p_legal_name VARCHAR,
    p_partner_type_reference_value_id UUID,
    p_operational_status_reference_value_id UUID,
    p_registration_number VARCHAR,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_partner_type_name VARCHAR(150);
    v_status_code VARCHAR(100);
    v_created_partner_id UUID;
BEGIN
    IF p_insurance_partner_id IS NULL
       OR NULLIF(BTRIM(p_partner_code), '') IS NULL
       OR NULLIF(BTRIM(p_display_name), '') IS NULL
       OR p_partner_type_reference_value_id IS NULL
       OR p_operational_status_reference_value_id IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Insurance Partner ID, code, display name, type, status, and audit actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_actor_user_id
          AND LOWER(BTRIM(status)) = 'active'
          AND COALESCE(is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    SELECT value.name
      INTO v_partner_type_name
    FROM public.reference_values AS value
    JOIN public.reference_categories AS category ON category.id = value.category_id
    WHERE value.id = p_partner_type_reference_value_id
      AND category.code = 'INSURANCE_PARTNER_TYPE'
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_partner_type_name IS NULL THEN
        RAISE EXCEPTION 'Insurance Partner Type Reference Value is invalid or inactive.';
    END IF;

    SELECT value.code
      INTO v_status_code
    FROM public.reference_values AS value
    JOIN public.reference_categories AS category ON category.id = value.category_id
    WHERE value.id = p_operational_status_reference_value_id
      AND category.code = 'INSURANCE_PARTNER_STATUS'
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_status_code NOT IN ('DRAFT', 'ACTIVE', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Insurance Partner Status Reference Value is invalid.';
    END IF;

    INSERT INTO public.insurance_entities (
        id,
        partner_code,
        display_name,
        legal_name,
        partner_type_reference_value_id,
        operational_status_reference_value_id,
        registration_number,
        name,
        type,
        created_by,
        created_at,
        updated_by,
        updated_at,
        is_deleted,
        version
    )
    VALUES (
        p_insurance_partner_id,
        BTRIM(p_partner_code),
        BTRIM(p_display_name),
        NULLIF(BTRIM(p_legal_name), ''),
        p_partner_type_reference_value_id,
        p_operational_status_reference_value_id,
        NULLIF(BTRIM(p_registration_number), ''),
        BTRIM(p_display_name),
        v_partner_type_name,
        p_actor_user_id,
        NOW(),
        p_actor_user_id,
        NOW(),
        FALSE,
        1
    )
    RETURNING id INTO v_created_partner_id;

    RETURN v_created_partner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_insurance_partner(
    p_insurance_partner_id UUID,
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
    v_partner_type_id UUID;
    v_partner_type_name VARCHAR(150);
    v_updated_partner_id UUID;
BEGIN
    IF p_insurance_partner_id IS NULL
       OR p_actor_user_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
       OR p_patch IS NULL
       OR jsonb_typeof(p_patch) <> 'object'
       OR p_patch = '{}'::JSONB THEN
        RAISE EXCEPTION 'Insurance Partner, expected version, audit actor, and a non-empty patch are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_actor_user_id
          AND LOWER(BTRIM(status)) = 'active'
          AND COALESCE(is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    IF (p_patch ? 'partnerCode' AND NULLIF(BTRIM(p_patch ->> 'partnerCode'), '') IS NULL)
       OR (p_patch ? 'displayName' AND NULLIF(BTRIM(p_patch ->> 'displayName'), '') IS NULL) THEN
        RAISE EXCEPTION 'Partner Code and Display Name cannot be blank.';
    END IF;

    v_partner_type_id := CASE
        WHEN p_patch ? 'partnerTypeReferenceValueId'
            THEN NULLIF(p_patch ->> 'partnerTypeReferenceValueId', '')::UUID
        ELSE NULL
    END;

    IF p_patch ? 'partnerTypeReferenceValueId' THEN
        SELECT value.name
          INTO v_partner_type_name
        FROM public.reference_values AS value
        JOIN public.reference_categories AS category ON category.id = value.category_id
        WHERE value.id = v_partner_type_id
          AND category.code = 'INSURANCE_PARTNER_TYPE'
          AND value.is_active = TRUE
          AND value.deleted_at IS NULL
          AND COALESCE(value.is_deleted, FALSE) = FALSE;

        IF v_partner_type_name IS NULL THEN
            RAISE EXCEPTION 'Insurance Partner Type Reference Value is invalid or inactive.';
        END IF;
    END IF;

    UPDATE public.insurance_entities AS partner
    SET partner_code = CASE WHEN p_patch ? 'partnerCode' THEN BTRIM(p_patch ->> 'partnerCode') ELSE partner.partner_code END,
        display_name = CASE WHEN p_patch ? 'displayName' THEN BTRIM(p_patch ->> 'displayName') ELSE partner.display_name END,
        legal_name = CASE WHEN p_patch ? 'legalName' THEN NULLIF(BTRIM(p_patch ->> 'legalName'), '') ELSE partner.legal_name END,
        registration_number = CASE WHEN p_patch ? 'registrationNumber' THEN NULLIF(BTRIM(p_patch ->> 'registrationNumber'), '') ELSE partner.registration_number END,
        partner_type_reference_value_id = COALESCE(v_partner_type_id, partner.partner_type_reference_value_id),
        name = CASE WHEN p_patch ? 'displayName' THEN BTRIM(p_patch ->> 'displayName') ELSE partner.name END,
        type = COALESCE(v_partner_type_name, partner.type),
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = partner.version + 1
    WHERE partner.id = p_insurance_partner_id
      AND partner.version = p_expected_version
      AND partner.deleted_at IS NULL
      AND partner.is_deleted = FALSE
    RETURNING partner.id INTO v_updated_partner_id;

    RETURN v_updated_partner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_insurance_partner_status(
    p_insurance_partner_id UUID,
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
    v_status_code VARCHAR(100);
    v_updated_partner_id UUID;
BEGIN
    IF p_insurance_partner_id IS NULL
       OR p_expected_version IS NULL OR p_expected_version < 1
       OR p_operational_status_reference_value_id IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Insurance Partner, expected version, status, and audit actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_actor_user_id
          AND LOWER(BTRIM(status)) = 'active'
          AND COALESCE(is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    SELECT value.code INTO v_status_code
    FROM public.reference_values AS value
    JOIN public.reference_categories AS category ON category.id = value.category_id
    WHERE value.id = p_operational_status_reference_value_id
      AND category.code = 'INSURANCE_PARTNER_STATUS'
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_status_code NOT IN ('DRAFT', 'ACTIVE', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Insurance Partner Status Reference Value is invalid.';
    END IF;

    UPDATE public.insurance_entities AS partner
    SET operational_status_reference_value_id = p_operational_status_reference_value_id,
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = partner.version + 1
    WHERE partner.id = p_insurance_partner_id
      AND partner.version = p_expected_version
      AND partner.deleted_at IS NULL
      AND partner.is_deleted = FALSE
    RETURNING partner.id INTO v_updated_partner_id;

    RETURN v_updated_partner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_insurance_partner(
    p_insurance_partner_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_deleted_partner_id UUID;
BEGIN
    IF p_insurance_partner_id IS NULL
       OR p_expected_version IS NULL OR p_expected_version < 1
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Insurance Partner, expected version, and audit actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_actor_user_id
          AND LOWER(BTRIM(status)) = 'active'
          AND COALESCE(is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.insurance_product_plan
        WHERE insurance_partner_id = p_insurance_partner_id AND deleted_at IS NULL
    ) OR EXISTS (
        SELECT 1 FROM public.organization_insurance_partner_enablement
        WHERE insurance_partner_id = p_insurance_partner_id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Insurance Partner cannot be retired while active Plans or Organization Enablements exist.';
    END IF;

    UPDATE public.insurance_entities AS partner
    SET is_deleted = TRUE,
        deleted_by = p_actor_user_id,
        deleted_at = NOW(),
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = partner.version + 1
    WHERE partner.id = p_insurance_partner_id
      AND partner.version = p_expected_version
      AND partner.deleted_at IS NULL
      AND partner.is_deleted = FALSE
    RETURNING partner.id INTO v_deleted_partner_id;

    RETURN v_deleted_partner_id;
END;
$$;

COMMENT ON FUNCTION public.create_insurance_partner IS
    'Creates one platform-owned Insurance Partner with an application-generated UUID.';
COMMENT ON FUNCTION public.update_insurance_partner IS
    'Updates Insurance Partner root attributes with optimistic concurrency. Returns NULL on stale or inactive target.';
COMMENT ON FUNCTION public.set_insurance_partner_status IS
    'Updates Insurance Partner lifecycle status with optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_insurance_partner IS
    'Soft retires an unused Insurance Partner; Claims retain their historical payer UUID reference.';

COMMIT;
