BEGIN;

-- Phase 5 Hospital root update boundary. Child entities have independent
-- endpoints and versions; this function changes only Hospital root attributes.
CREATE OR REPLACE FUNCTION public.update_hospital_root(
    p_hospital_id UUID,
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
    v_hospital_type_id UUID;
    v_ownership_type_id UUID;
    v_operational_status_id UUID;
    v_hospital_type_name VARCHAR(150);
    v_operational_status_code VARCHAR(100);
    v_updated_hospital_id UUID;
BEGIN
    IF p_hospital_id IS NULL
       OR p_organization_id IS NULL
       OR p_actor_user_id IS NULL
       OR p_expected_version IS NULL
       OR p_expected_version < 1
       OR p_patch IS NULL
       OR jsonb_typeof(p_patch) <> 'object'
       OR p_patch = '{}'::JSONB THEN
        RAISE EXCEPTION 'Hospital, Organization, expected version, audit actor, and a non-empty root patch are required.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN
        RAISE EXCEPTION 'Audit actor does not exist.';
    END IF;

    IF p_patch ? 'displayName'
       AND NULLIF(BTRIM(p_patch ->> 'displayName'), '') IS NULL THEN
        RAISE EXCEPTION 'Display Name cannot be blank.';
    END IF;

    v_hospital_type_id := CASE
        WHEN p_patch ? 'hospitalTypeReferenceValueId'
            THEN (p_patch ->> 'hospitalTypeReferenceValueId')::UUID
        ELSE NULL
    END;
    v_ownership_type_id := CASE
        WHEN p_patch ? 'ownershipTypeReferenceValueId'
            THEN NULLIF(p_patch ->> 'ownershipTypeReferenceValueId', '')::UUID
        ELSE NULL
    END;
    v_operational_status_id := CASE
        WHEN p_patch ? 'operationalStatusReferenceValueId'
            THEN (p_patch ->> 'operationalStatusReferenceValueId')::UUID
        ELSE NULL
    END;

    IF v_hospital_type_id IS NOT NULL THEN
        SELECT value.name
        INTO v_hospital_type_name
        FROM public.reference_values value
        JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = v_hospital_type_id
          AND category.code = 'HOSPITAL_TYPE'
          AND value.is_active = TRUE
          AND value.deleted_at IS NULL;

        IF v_hospital_type_name IS NULL THEN
            RAISE EXCEPTION 'Hospital Type Reference Value is invalid or inactive.';
        END IF;
    END IF;

    IF p_patch ? 'ownershipTypeReferenceValueId'
       AND v_ownership_type_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.reference_values value
           JOIN public.reference_categories category ON category.id = value.category_id
           WHERE value.id = v_ownership_type_id
             AND category.code = 'OWNERSHIP_TYPE'
             AND value.is_active = TRUE
             AND value.deleted_at IS NULL
       ) THEN
        RAISE EXCEPTION 'Ownership Type Reference Value is invalid or inactive.';
    END IF;

    IF v_operational_status_id IS NOT NULL THEN
        SELECT value.code
        INTO v_operational_status_code
        FROM public.reference_values value
        JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = v_operational_status_id
          AND category.code = 'OPERATIONAL_STATUS'
          AND value.is_active = TRUE
          AND value.deleted_at IS NULL;

        IF v_operational_status_code NOT IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED') THEN
            RAISE EXCEPTION 'Operational Status Reference Value is invalid for Hospital update.';
        END IF;
    END IF;

    UPDATE public.hospitals hospital
    SET
        display_name = CASE
            WHEN p_patch ? 'displayName' THEN BTRIM(p_patch ->> 'displayName')
            ELSE hospital.display_name
        END,
        hospital_name = CASE
            WHEN p_patch ? 'displayName' THEN BTRIM(p_patch ->> 'displayName')
            ELSE hospital.hospital_name
        END,
        registration_number = CASE
            WHEN p_patch ? 'registrationNumber'
                THEN NULLIF(BTRIM(p_patch ->> 'registrationNumber'), '')
            ELSE hospital.registration_number
        END,
        hospital_type_reference_value_id = COALESCE(v_hospital_type_id, hospital.hospital_type_reference_value_id),
        hospital_type = COALESCE(v_hospital_type_name, hospital.hospital_type),
        ownership_type_reference_value_id = CASE
            WHEN p_patch ? 'ownershipTypeReferenceValueId' THEN v_ownership_type_id
            ELSE hospital.ownership_type_reference_value_id
        END,
        operational_status_reference_value_id = COALESCE(v_operational_status_id, hospital.operational_status_reference_value_id),
        status = COALESCE(v_operational_status_code, hospital.status),
        updated_by = p_actor_user_id,
        updated_at = NOW(),
        version = hospital.version + 1
    WHERE hospital.id = p_hospital_id
      AND hospital.organization_id = p_organization_id
      AND hospital.version = p_expected_version
      AND hospital.deleted_at IS NULL
      AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    RETURNING hospital.id INTO v_updated_hospital_id;

    RETURN v_updated_hospital_id;
END;
$$;

COMMENT ON FUNCTION public.update_hospital_root IS
    'Atomically updates Hospital root attributes using the expected aggregate version. Returns NULL when the row is stale, inactive, or outside the tenant.';

COMMIT;
