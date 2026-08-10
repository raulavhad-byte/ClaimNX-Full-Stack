BEGIN;

-- Phase 5 transactional write boundary for the Hospital Aggregate.
-- New UUIDs are supplied by the application; this function never generates a
-- business identifier and either writes the complete aggregate or writes none.

CREATE OR REPLACE FUNCTION public.create_hospital_aggregate(
    p_hospital_id UUID,
    p_organization_id UUID,
    p_hospital_code VARCHAR(50),
    p_display_name VARCHAR(200),
    p_registration_number VARCHAR(100),
    p_hospital_type_reference_value_id UUID,
    p_ownership_type_reference_value_id UUID,
    p_operational_status_reference_value_id UUID,
    p_remarks TEXT,
    p_primary_address_id UUID,
    p_primary_contact_id UUID,
    p_actor_user_id UUID,
    p_addresses JSONB,
    p_contacts JSONB,
    p_departments JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_hospital_type_name VARCHAR(150);
    v_operational_status_code VARCHAR(100);
BEGIN
    IF p_hospital_id IS NULL
       OR p_organization_id IS NULL
       OR NULLIF(BTRIM(p_hospital_code), '') IS NULL
       OR NULLIF(BTRIM(p_display_name), '') IS NULL
       OR p_hospital_type_reference_value_id IS NULL
       OR p_operational_status_reference_value_id IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Hospital, Organization, Code, Display Name, Hospital Type, Operational Status, and audit actor are required.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization does not exist.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN
        RAISE EXCEPTION 'Audit actor does not exist.';
    END IF;

    SELECT name
    INTO v_hospital_type_name
    FROM public.reference_values
    WHERE id = p_hospital_type_reference_value_id
      AND is_active = TRUE
      AND deleted_at IS NULL;

    IF v_hospital_type_name IS NULL THEN
        RAISE EXCEPTION 'Hospital Type Reference Value does not exist or is inactive.';
    END IF;

    SELECT code
    INTO v_operational_status_code
    FROM public.reference_values
    WHERE id = p_operational_status_reference_value_id
      AND is_active = TRUE
      AND deleted_at IS NULL;

    IF v_operational_status_code NOT IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Operational Status Reference Value is invalid for Hospital creation.';
    END IF;

    IF p_addresses IS NULL THEN
        p_addresses := '[]'::JSONB;
    END IF;
    IF p_contacts IS NULL THEN
        p_contacts := '[]'::JSONB;
    END IF;
    IF p_departments IS NULL THEN
        p_departments := '[]'::JSONB;
    END IF;

    IF jsonb_typeof(p_addresses) <> 'array'
       OR jsonb_typeof(p_contacts) <> 'array'
       OR jsonb_typeof(p_departments) <> 'array' THEN
        RAISE EXCEPTION 'Hospital child collections must be JSON arrays.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.hospitals
        WHERE id = p_hospital_id
    ) THEN
        RAISE EXCEPTION 'Hospital identifier already exists.';
    END IF;

    IF p_primary_address_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM jsonb_to_recordset(p_addresses) AS address(
               hospital_address_id UUID,
               is_primary BOOLEAN
           )
           WHERE address.hospital_address_id = p_primary_address_id
             AND address.is_primary = TRUE
       ) THEN
        RAISE EXCEPTION 'Primary Address must be included in the new aggregate and marked primary.';
    END IF;

    IF p_primary_contact_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM jsonb_to_recordset(p_contacts) AS contact(
               hospital_contact_id UUID,
               is_primary BOOLEAN
           )
           WHERE contact.hospital_contact_id = p_primary_contact_id
             AND contact.is_primary = TRUE
       ) THEN
        RAISE EXCEPTION 'Primary Contact must be included in the new aggregate and marked primary.';
    END IF;

    INSERT INTO public.hospitals (
        id,
        organization_id,
        hospital_code,
        hospital_name,
        hospital_type,
        status,
        display_name,
        registration_number,
        hospital_type_reference_value_id,
        ownership_type_reference_value_id,
        operational_status_reference_value_id,
        primary_address_id,
        primary_contact_id,
        remarks,
        created_by,
        created_at,
        updated_by,
        updated_at,
        version
    )
    VALUES (
        p_hospital_id,
        p_organization_id,
        BTRIM(p_hospital_code),
        BTRIM(p_display_name),
        v_hospital_type_name,
        v_operational_status_code,
        BTRIM(p_display_name),
        NULLIF(BTRIM(p_registration_number), ''),
        p_hospital_type_reference_value_id,
        p_ownership_type_reference_value_id,
        p_operational_status_reference_value_id,
        p_primary_address_id,
        p_primary_contact_id,
        NULLIF(BTRIM(p_remarks), ''),
        p_actor_user_id,
        NOW(),
        p_actor_user_id,
        NOW(),
        1
    );

    INSERT INTO public.hospital_address (
        hospital_address_id,
        hospital_id,
        address_type_reference_value_id,
        address_line1,
        address_line2,
        landmark,
        country_id,
        state_id,
        city_id,
        postal_code,
        is_primary,
        created_by,
        created_at,
        updated_by,
        updated_at,
        version
    )
    SELECT
        address.hospital_address_id,
        p_hospital_id,
        address.address_type_reference_value_id,
        BTRIM(address.address_line1),
        NULLIF(BTRIM(address.address_line2), ''),
        NULLIF(BTRIM(address.landmark), ''),
        address.country_id,
        address.state_id,
        address.city_id,
        BTRIM(address.postal_code),
        COALESCE(address.is_primary, FALSE),
        p_actor_user_id,
        NOW(),
        p_actor_user_id,
        NOW(),
        1
    FROM jsonb_to_recordset(p_addresses) AS address(
        hospital_address_id UUID,
        address_type_reference_value_id UUID,
        address_line1 TEXT,
        address_line2 TEXT,
        landmark TEXT,
        country_id UUID,
        state_id UUID,
        city_id UUID,
        postal_code TEXT,
        is_primary BOOLEAN
    );

    INSERT INTO public.hospital_contact (
        hospital_contact_id,
        hospital_id,
        contact_type_reference_value_id,
        contact_name,
        designation,
        email_address,
        phone_number,
        mobile_number,
        is_primary,
        created_by,
        created_at,
        updated_by,
        updated_at,
        version
    )
    SELECT
        contact.hospital_contact_id,
        p_hospital_id,
        contact.contact_type_reference_value_id,
        BTRIM(contact.contact_name),
        NULLIF(BTRIM(contact.designation), ''),
        NULLIF(BTRIM(contact.email_address), ''),
        BTRIM(contact.phone_number),
        NULLIF(BTRIM(contact.mobile_number), ''),
        COALESCE(contact.is_primary, FALSE),
        p_actor_user_id,
        NOW(),
        p_actor_user_id,
        NOW(),
        1
    FROM jsonb_to_recordset(p_contacts) AS contact(
        hospital_contact_id UUID,
        contact_type_reference_value_id UUID,
        contact_name TEXT,
        designation TEXT,
        email_address TEXT,
        phone_number TEXT,
        mobile_number TEXT,
        is_primary BOOLEAN
    );

    INSERT INTO public.hospital_department (
        hospital_department_id,
        hospital_id,
        department_code,
        department_name,
        department_type_reference_value_id,
        operational_status_reference_value_id,
        description,
        created_by,
        created_at,
        updated_by,
        updated_at,
        version
    )
    SELECT
        department.hospital_department_id,
        p_hospital_id,
        BTRIM(department.department_code),
        BTRIM(department.department_name),
        department.department_type_reference_value_id,
        department.operational_status_reference_value_id,
        NULLIF(BTRIM(department.description), ''),
        p_actor_user_id,
        NOW(),
        p_actor_user_id,
        NOW(),
        1
    FROM jsonb_to_recordset(p_departments) AS department(
        hospital_department_id UUID,
        department_code TEXT,
        department_name TEXT,
        department_type_reference_value_id UUID,
        operational_status_reference_value_id UUID,
        description TEXT
    );

    RETURN p_hospital_id;
END;
$$;

COMMENT ON FUNCTION public.create_hospital_aggregate IS
    'Atomically creates the Hospital Aggregate and all supplied child entities. UUIDs are generated by the application.';

COMMIT;
