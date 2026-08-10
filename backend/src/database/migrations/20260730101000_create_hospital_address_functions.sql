BEGIN;

-- Address writes remain inside the Hospital Aggregate. These functions keep
-- child optimistic concurrency independent from unrelated root/child updates.

CREATE OR REPLACE FUNCTION public.create_hospital_address(
    p_hospital_address_id UUID,
    p_hospital_id UUID,
    p_organization_id UUID,
    p_address_type_reference_value_id UUID,
    p_address_line1 VARCHAR(255),
    p_address_line2 VARCHAR(255),
    p_landmark VARCHAR(255),
    p_country_id UUID,
    p_state_id UUID,
    p_city_id UUID,
    p_postal_code VARCHAR(20),
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF p_hospital_address_id IS NULL OR p_hospital_id IS NULL
       OR p_organization_id IS NULL OR p_actor_user_id IS NULL
       OR NULLIF(BTRIM(p_address_line1), '') IS NULL
       OR NULLIF(BTRIM(p_postal_code), '') IS NULL THEN
        RAISE EXCEPTION 'Address, Hospital, Organization, audit actor, address line 1, and postal code are required.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN
        RAISE EXCEPTION 'Audit actor does not exist.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.hospitals hospital
        WHERE hospital.id = p_hospital_id
          AND hospital.organization_id = p_organization_id
          AND hospital.deleted_at IS NULL
          AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Active Hospital was not found in the Organization tenant.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.hospital_address WHERE hospital_address_id = p_hospital_address_id) THEN
        RAISE EXCEPTION 'Hospital Address identifier already exists.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.reference_values value
        JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_address_type_reference_value_id
          AND category.code = 'HOSPITAL_ADDRESS_TYPE'
          AND value.is_active = TRUE AND value.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Address Type Reference Value is invalid or inactive.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.countries country
        JOIN public.states state ON state.country_id = country.id
        JOIN public.cities city ON city.state_id = state.id
        WHERE country.id = p_country_id AND state.id = p_state_id AND city.id = p_city_id
    ) THEN
        RAISE EXCEPTION 'City must belong to State and State must belong to Country.';
    END IF;

    INSERT INTO public.hospital_address (
        hospital_address_id, hospital_id, address_type_reference_value_id,
        address_line1, address_line2, landmark, country_id, state_id, city_id,
        postal_code, is_primary, created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_hospital_address_id, p_hospital_id, p_address_type_reference_value_id,
        BTRIM(p_address_line1), NULLIF(BTRIM(p_address_line2), ''), NULLIF(BTRIM(p_landmark), ''),
        p_country_id, p_state_id, p_city_id, BTRIM(p_postal_code), FALSE,
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );
    RETURN p_hospital_address_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_hospital_address(
    p_hospital_address_id UUID,
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
    v_address public.hospital_address%ROWTYPE;
    v_address_type_id UUID;
    v_country_id UUID;
    v_state_id UUID;
    v_city_id UUID;
    v_updated_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1
       OR p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object'
       OR p_patch = '{}'::JSONB THEN
        RAISE EXCEPTION 'Expected version and a non-empty address patch are required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN
        RAISE EXCEPTION 'Audit actor does not exist.';
    END IF;

    SELECT address.* INTO v_address
    FROM public.hospital_address address
    JOIN public.hospitals hospital ON hospital.id = address.hospital_id
    WHERE address.hospital_address_id = p_hospital_address_id
      AND address.hospital_id = p_hospital_id
      AND hospital.organization_id = p_organization_id
      AND address.deleted_at IS NULL
      AND hospital.deleted_at IS NULL
      AND COALESCE(hospital.is_deleted, FALSE) = FALSE;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    IF p_patch ? 'addressLine1' AND NULLIF(BTRIM(p_patch ->> 'addressLine1'), '') IS NULL THEN
        RAISE EXCEPTION 'Address Line 1 cannot be blank.';
    END IF;
    IF p_patch ? 'postalCode' AND NULLIF(BTRIM(p_patch ->> 'postalCode'), '') IS NULL THEN
        RAISE EXCEPTION 'Postal Code cannot be blank.';
    END IF;

    v_address_type_id := COALESCE(NULLIF(p_patch ->> 'addressTypeReferenceValueId', '')::UUID, v_address.address_type_reference_value_id);
    v_country_id := COALESCE(NULLIF(p_patch ->> 'countryId', '')::UUID, v_address.country_id);
    v_state_id := COALESCE(NULLIF(p_patch ->> 'stateId', '')::UUID, v_address.state_id);
    v_city_id := COALESCE(NULLIF(p_patch ->> 'cityId', '')::UUID, v_address.city_id);

    IF NOT EXISTS (
        SELECT 1 FROM public.reference_values value
        JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = v_address_type_id AND category.code = 'HOSPITAL_ADDRESS_TYPE'
          AND value.is_active = TRUE AND value.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Address Type Reference Value is invalid or inactive.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.countries country
        JOIN public.states state ON state.country_id = country.id
        JOIN public.cities city ON city.state_id = state.id
        WHERE country.id = v_country_id AND state.id = v_state_id AND city.id = v_city_id
    ) THEN
        RAISE EXCEPTION 'City must belong to State and State must belong to Country.';
    END IF;

    UPDATE public.hospital_address address
    SET address_type_reference_value_id = v_address_type_id,
        address_line1 = CASE WHEN p_patch ? 'addressLine1' THEN BTRIM(p_patch ->> 'addressLine1') ELSE address.address_line1 END,
        address_line2 = CASE WHEN p_patch ? 'addressLine2' THEN NULLIF(BTRIM(p_patch ->> 'addressLine2'), '') ELSE address.address_line2 END,
        landmark = CASE WHEN p_patch ? 'landmark' THEN NULLIF(BTRIM(p_patch ->> 'landmark'), '') ELSE address.landmark END,
        country_id = v_country_id, state_id = v_state_id, city_id = v_city_id,
        postal_code = CASE WHEN p_patch ? 'postalCode' THEN BTRIM(p_patch ->> 'postalCode') ELSE address.postal_code END,
        updated_by = p_actor_user_id, updated_at = NOW(), version = address.version + 1
    WHERE address.hospital_address_id = p_hospital_address_id
      AND address.hospital_id = p_hospital_id
      AND address.version = p_expected_version
      AND address.deleted_at IS NULL
    RETURNING address.hospital_address_id INTO v_updated_id;
    RETURN v_updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_hospital_address(
    p_hospital_address_id UUID,
    p_hospital_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_deleted_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN
        RAISE EXCEPTION 'Expected Address version is required.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.hospitals hospital
        WHERE hospital.id = p_hospital_id
          AND hospital.primary_address_id = p_hospital_address_id
          AND hospital.organization_id = p_organization_id
          AND hospital.deleted_at IS NULL
          AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'The current primary Address cannot be deleted. Select another primary Address first.';
    END IF;
    UPDATE public.hospital_address address
    SET deleted_by = p_actor_user_id, deleted_at = NOW(), updated_by = p_actor_user_id,
        updated_at = NOW(), version = address.version + 1
    WHERE address.hospital_address_id = p_hospital_address_id
      AND address.hospital_id = p_hospital_id
      AND address.version = p_expected_version
      AND address.deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM public.hospitals hospital
          WHERE hospital.id = p_hospital_id AND hospital.organization_id = p_organization_id
            AND hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE
      )
    RETURNING address.hospital_address_id INTO v_deleted_id;
    RETURN v_deleted_id;
END;
$$;

COMMENT ON FUNCTION public.create_hospital_address IS 'Creates a non-primary Address owned by an active Hospital Aggregate.';
COMMENT ON FUNCTION public.update_hospital_address IS 'Updates one active Hospital Address with child-level optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_hospital_address IS 'Soft deletes one non-primary Hospital Address with child-level optimistic concurrency.';

COMMIT;
