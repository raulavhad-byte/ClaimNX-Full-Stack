BEGIN;

-- Phase 7: command boundary for Contacts owned by the Insurance Partner
-- aggregate. UUIDs are supplied by the application; this migration creates no
-- business identifiers.

CREATE OR REPLACE FUNCTION public.create_insurance_partner_contact(
    p_insurance_partner_contact_id UUID,
    p_insurance_partner_id UUID,
    p_contact_type_reference_value_id UUID,
    p_contact_name VARCHAR,
    p_designation VARCHAR,
    p_email_address VARCHAR,
    p_phone_number VARCHAR,
    p_mobile_number VARCHAR,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF p_insurance_partner_contact_id IS NULL
       OR p_insurance_partner_id IS NULL
       OR p_contact_type_reference_value_id IS NULL
       OR p_actor_user_id IS NULL
       OR NULLIF(BTRIM(p_contact_name), '') IS NULL
       OR NULLIF(BTRIM(p_phone_number), '') IS NULL THEN
        RAISE EXCEPTION 'Contact ID, Insurance Partner, Contact Type, Contact Name, Phone Number, and audit actor are required.';
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
        SELECT 1 FROM public.insurance_entities AS partner
         WHERE partner.id = p_insurance_partner_id
           AND partner.deleted_at IS NULL
           AND COALESCE(partner.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Active Insurance Partner was not found.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.insurance_partner_contact AS contact
         WHERE contact.insurance_partner_contact_id = p_insurance_partner_contact_id
    ) THEN
        RAISE EXCEPTION 'Insurance Partner Contact identifier already exists.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM public.reference_values AS value
          JOIN public.reference_categories AS category ON category.id = value.category_id
         WHERE value.id = p_contact_type_reference_value_id
           AND category.code = 'INSURANCE_CONTACT_TYPE'
           AND value.is_active = TRUE
           AND value.deleted_at IS NULL
           AND COALESCE(value.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Insurance Contact Type Reference Value is invalid or inactive.';
    END IF;

    IF NULLIF(BTRIM(p_email_address), '') IS NOT NULL
       AND BTRIM(p_email_address) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
        RAISE EXCEPTION 'Email Address is invalid.';
    END IF;

    INSERT INTO public.insurance_partner_contact (
        insurance_partner_contact_id, insurance_partner_id,
        contact_type_reference_value_id, contact_name, designation,
        email_address, phone_number, mobile_number, is_primary,
        created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_insurance_partner_contact_id, p_insurance_partner_id,
        p_contact_type_reference_value_id, BTRIM(p_contact_name),
        NULLIF(BTRIM(p_designation), ''), NULLIF(BTRIM(p_email_address), ''),
        BTRIM(p_phone_number), NULLIF(BTRIM(p_mobile_number), ''), FALSE,
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );

    RETURN p_insurance_partner_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_insurance_partner_contact(
    p_insurance_partner_contact_id UUID,
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
    v_contact public.insurance_partner_contact%ROWTYPE;
    v_contact_type_reference_value_id UUID;
    v_updated_contact_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1
       OR p_actor_user_id IS NULL OR p_patch IS NULL
       OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::JSONB THEN
        RAISE EXCEPTION 'Expected version, audit actor, and a non-empty Contact patch are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users AS user_record
         WHERE user_record.id = p_actor_user_id
           AND LOWER(BTRIM(user_record.status)) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    SELECT contact.* INTO v_contact
      FROM public.insurance_partner_contact AS contact
      JOIN public.insurance_entities AS partner ON partner.id = contact.insurance_partner_id
     WHERE contact.insurance_partner_contact_id = p_insurance_partner_contact_id
       AND contact.insurance_partner_id = p_insurance_partner_id
       AND contact.deleted_at IS NULL
       AND partner.deleted_at IS NULL
       AND COALESCE(partner.is_deleted, FALSE) = FALSE;
    IF NOT FOUND THEN RETURN NULL; END IF;

    IF p_patch ? 'contactName' AND NULLIF(BTRIM(p_patch ->> 'contactName'), '') IS NULL THEN
        RAISE EXCEPTION 'Contact Name cannot be blank.';
    END IF;
    IF p_patch ? 'phoneNumber' AND NULLIF(BTRIM(p_patch ->> 'phoneNumber'), '') IS NULL THEN
        RAISE EXCEPTION 'Phone Number cannot be blank.';
    END IF;
    IF p_patch ? 'emailAddress'
       AND NULLIF(BTRIM(p_patch ->> 'emailAddress'), '') IS NOT NULL
       AND BTRIM(p_patch ->> 'emailAddress') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
        RAISE EXCEPTION 'Email Address is invalid.';
    END IF;

    v_contact_type_reference_value_id := COALESCE(
        NULLIF(p_patch ->> 'contactTypeReferenceValueId', '')::UUID,
        v_contact.contact_type_reference_value_id
    );
    IF NOT EXISTS (
        SELECT 1
          FROM public.reference_values AS value
          JOIN public.reference_categories AS category ON category.id = value.category_id
         WHERE value.id = v_contact_type_reference_value_id
           AND category.code = 'INSURANCE_CONTACT_TYPE'
           AND value.is_active = TRUE
           AND value.deleted_at IS NULL
           AND COALESCE(value.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Insurance Contact Type Reference Value is invalid or inactive.';
    END IF;

    UPDATE public.insurance_partner_contact AS contact
       SET contact_type_reference_value_id = v_contact_type_reference_value_id,
           contact_name = CASE WHEN p_patch ? 'contactName' THEN BTRIM(p_patch ->> 'contactName') ELSE contact.contact_name END,
           designation = CASE WHEN p_patch ? 'designation' THEN NULLIF(BTRIM(p_patch ->> 'designation'), '') ELSE contact.designation END,
           email_address = CASE WHEN p_patch ? 'emailAddress' THEN NULLIF(BTRIM(p_patch ->> 'emailAddress'), '') ELSE contact.email_address END,
           phone_number = CASE WHEN p_patch ? 'phoneNumber' THEN BTRIM(p_patch ->> 'phoneNumber') ELSE contact.phone_number END,
           mobile_number = CASE WHEN p_patch ? 'mobileNumber' THEN NULLIF(BTRIM(p_patch ->> 'mobileNumber'), '') ELSE contact.mobile_number END,
           updated_by = p_actor_user_id,
           updated_at = NOW(),
           version = contact.version + 1
     WHERE contact.insurance_partner_contact_id = p_insurance_partner_contact_id
       AND contact.insurance_partner_id = p_insurance_partner_id
       AND contact.version = p_expected_version
       AND contact.deleted_at IS NULL
     RETURNING contact.insurance_partner_contact_id INTO v_updated_contact_id;

    RETURN v_updated_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_insurance_partner_primary_contact(
    p_insurance_partner_contact_id UUID,
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
    v_contact_type_reference_value_id UUID;
    v_set_contact_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Expected version and audit actor are required.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.users AS user_record
         WHERE user_record.id = p_actor_user_id
           AND LOWER(BTRIM(user_record.status)) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    SELECT contact.contact_type_reference_value_id
      INTO v_contact_type_reference_value_id
      FROM public.insurance_partner_contact AS contact
      JOIN public.insurance_entities AS partner ON partner.id = contact.insurance_partner_id
     WHERE contact.insurance_partner_contact_id = p_insurance_partner_contact_id
       AND contact.insurance_partner_id = p_insurance_partner_id
       AND contact.version = p_expected_version
       AND contact.deleted_at IS NULL
       AND partner.deleted_at IS NULL
       AND COALESCE(partner.is_deleted, FALSE) = FALSE
     FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;

    UPDATE public.insurance_partner_contact AS contact
       SET is_primary = FALSE,
           updated_by = p_actor_user_id,
           updated_at = NOW(),
           version = contact.version + 1
     WHERE contact.insurance_partner_id = p_insurance_partner_id
       AND contact.contact_type_reference_value_id = v_contact_type_reference_value_id
       AND contact.insurance_partner_contact_id <> p_insurance_partner_contact_id
       AND contact.deleted_at IS NULL
       AND contact.is_primary = TRUE;

    UPDATE public.insurance_partner_contact AS contact
       SET is_primary = TRUE,
           updated_by = p_actor_user_id,
           updated_at = NOW(),
           version = contact.version + 1
     WHERE contact.insurance_partner_contact_id = p_insurance_partner_contact_id
       AND contact.insurance_partner_id = p_insurance_partner_id
       AND contact.version = p_expected_version
       AND contact.deleted_at IS NULL
     RETURNING contact.insurance_partner_contact_id INTO v_set_contact_id;

    RETURN v_set_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_insurance_partner_contact(
    p_insurance_partner_contact_id UUID,
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
    v_deleted_contact_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Expected version and audit actor are required.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.users AS user_record
         WHERE user_record.id = p_actor_user_id
           AND LOWER(BTRIM(user_record.status)) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    UPDATE public.insurance_partner_contact AS contact
       SET deleted_by = p_actor_user_id,
           deleted_at = NOW(),
           updated_by = p_actor_user_id,
           updated_at = NOW(),
           version = contact.version + 1
     WHERE contact.insurance_partner_contact_id = p_insurance_partner_contact_id
       AND contact.insurance_partner_id = p_insurance_partner_id
       AND contact.version = p_expected_version
       AND contact.deleted_at IS NULL
       AND EXISTS (
            SELECT 1 FROM public.insurance_entities AS partner
             WHERE partner.id = p_insurance_partner_id
               AND partner.deleted_at IS NULL
               AND COALESCE(partner.is_deleted, FALSE) = FALSE
       )
     RETURNING contact.insurance_partner_contact_id INTO v_deleted_contact_id;

    RETURN v_deleted_contact_id;
END;
$$;

COMMENT ON FUNCTION public.create_insurance_partner_contact IS
    'Creates a non-primary Contact owned by an active Insurance Partner Aggregate.';
COMMENT ON FUNCTION public.update_insurance_partner_contact IS
    'Updates an active Insurance Partner Contact with child-level optimistic concurrency.';
COMMENT ON FUNCTION public.set_insurance_partner_primary_contact IS
    'Selects one active Contact as primary for its Insurance Partner and Contact Type.';
COMMENT ON FUNCTION public.soft_delete_insurance_partner_contact IS
    'Soft deletes an Insurance Partner Contact with child-level optimistic concurrency.';

COMMIT;
