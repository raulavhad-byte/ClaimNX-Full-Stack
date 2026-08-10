BEGIN;

CREATE OR REPLACE FUNCTION public.create_hospital_contact(
    p_hospital_contact_id UUID, p_hospital_id UUID, p_organization_id UUID,
    p_contact_type_reference_value_id UUID, p_contact_name VARCHAR(200),
    p_designation VARCHAR(150), p_email_address VARCHAR(320),
    p_phone_number VARCHAR(30), p_mobile_number VARCHAR(30), p_actor_user_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
    IF p_hospital_contact_id IS NULL OR p_hospital_id IS NULL OR p_organization_id IS NULL
       OR p_actor_user_id IS NULL OR NULLIF(BTRIM(p_contact_name), '') IS NULL
       OR NULLIF(BTRIM(p_phone_number), '') IS NULL THEN
        RAISE EXCEPTION 'Contact, Hospital, Organization, audit actor, Contact Name, and Phone Number are required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN RAISE EXCEPTION 'Audit actor does not exist.'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.hospitals hospital WHERE hospital.id = p_hospital_id
          AND hospital.organization_id = p_organization_id AND hospital.deleted_at IS NULL
          AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ) THEN RAISE EXCEPTION 'Active Hospital was not found in the Organization tenant.'; END IF;
    IF EXISTS (SELECT 1 FROM public.hospital_contact WHERE hospital_contact_id = p_hospital_contact_id) THEN RAISE EXCEPTION 'Hospital Contact identifier already exists.'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_contact_type_reference_value_id AND category.code = 'HOSPITAL_CONTACT_TYPE'
          AND value.is_active = TRUE AND value.deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'Contact Type Reference Value is invalid or inactive.'; END IF;
    IF p_email_address IS NOT NULL AND NULLIF(BTRIM(p_email_address), '') IS NOT NULL
       AND BTRIM(p_email_address) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
        RAISE EXCEPTION 'Email Address is invalid.';
    END IF;
    INSERT INTO public.hospital_contact (
        hospital_contact_id, hospital_id, contact_type_reference_value_id, contact_name,
        designation, email_address, phone_number, mobile_number, is_primary,
        created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_hospital_contact_id, p_hospital_id, p_contact_type_reference_value_id, BTRIM(p_contact_name),
        NULLIF(BTRIM(p_designation), ''), NULLIF(BTRIM(p_email_address), ''), BTRIM(p_phone_number),
        NULLIF(BTRIM(p_mobile_number), ''), FALSE, p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );
    RETURN p_hospital_contact_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_hospital_contact(
    p_hospital_contact_id UUID, p_hospital_id UUID, p_organization_id UUID,
    p_expected_version INTEGER, p_actor_user_id UUID, p_patch JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_contact public.hospital_contact%ROWTYPE; v_contact_type_id UUID; v_updated_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR p_patch IS NULL
       OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::JSONB THEN
        RAISE EXCEPTION 'Expected version and a non-empty Contact patch are required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN RAISE EXCEPTION 'Audit actor does not exist.'; END IF;
    SELECT contact.* INTO v_contact FROM public.hospital_contact contact
    JOIN public.hospitals hospital ON hospital.id = contact.hospital_id
    WHERE contact.hospital_contact_id = p_hospital_contact_id AND contact.hospital_id = p_hospital_id
      AND hospital.organization_id = p_organization_id AND contact.deleted_at IS NULL
      AND hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF p_patch ? 'contactName' AND NULLIF(BTRIM(p_patch ->> 'contactName'), '') IS NULL THEN RAISE EXCEPTION 'Contact Name cannot be blank.'; END IF;
    IF p_patch ? 'phoneNumber' AND NULLIF(BTRIM(p_patch ->> 'phoneNumber'), '') IS NULL THEN RAISE EXCEPTION 'Phone Number cannot be blank.'; END IF;
    IF p_patch ? 'emailAddress' AND NULLIF(BTRIM(p_patch ->> 'emailAddress'), '') IS NOT NULL
       AND BTRIM(p_patch ->> 'emailAddress') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Email Address is invalid.'; END IF;
    v_contact_type_id := COALESCE(NULLIF(p_patch ->> 'contactTypeReferenceValueId', '')::UUID, v_contact.contact_type_reference_value_id);
    IF NOT EXISTS (
        SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = v_contact_type_id AND category.code = 'HOSPITAL_CONTACT_TYPE'
          AND value.is_active = TRUE AND value.deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'Contact Type Reference Value is invalid or inactive.'; END IF;
    UPDATE public.hospital_contact contact SET
        contact_type_reference_value_id = v_contact_type_id,
        contact_name = CASE WHEN p_patch ? 'contactName' THEN BTRIM(p_patch ->> 'contactName') ELSE contact.contact_name END,
        designation = CASE WHEN p_patch ? 'designation' THEN NULLIF(BTRIM(p_patch ->> 'designation'), '') ELSE contact.designation END,
        email_address = CASE WHEN p_patch ? 'emailAddress' THEN NULLIF(BTRIM(p_patch ->> 'emailAddress'), '') ELSE contact.email_address END,
        phone_number = CASE WHEN p_patch ? 'phoneNumber' THEN BTRIM(p_patch ->> 'phoneNumber') ELSE contact.phone_number END,
        mobile_number = CASE WHEN p_patch ? 'mobileNumber' THEN NULLIF(BTRIM(p_patch ->> 'mobileNumber'), '') ELSE contact.mobile_number END,
        updated_by = p_actor_user_id, updated_at = NOW(), version = contact.version + 1
    WHERE contact.hospital_contact_id = p_hospital_contact_id AND contact.hospital_id = p_hospital_id
      AND contact.version = p_expected_version AND contact.deleted_at IS NULL
    RETURNING contact.hospital_contact_id INTO v_updated_id;
    RETURN v_updated_id;
END; $$;

CREATE OR REPLACE FUNCTION public.soft_delete_hospital_contact(
    p_hospital_contact_id UUID, p_hospital_id UUID, p_organization_id UUID,
    p_expected_version INTEGER, p_actor_user_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_deleted_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN RAISE EXCEPTION 'Expected Contact version is required.'; END IF;
    IF EXISTS (
        SELECT 1 FROM public.hospitals hospital WHERE hospital.id = p_hospital_id
          AND hospital.primary_contact_id = p_hospital_contact_id AND hospital.organization_id = p_organization_id
          AND hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ) THEN RAISE EXCEPTION 'The current primary Contact cannot be deleted. Select another primary Contact first.'; END IF;
    UPDATE public.hospital_contact contact SET deleted_by = p_actor_user_id, deleted_at = NOW(),
        updated_by = p_actor_user_id, updated_at = NOW(), version = contact.version + 1
    WHERE contact.hospital_contact_id = p_hospital_contact_id AND contact.hospital_id = p_hospital_id
      AND contact.version = p_expected_version AND contact.deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM public.hospitals hospital WHERE hospital.id = p_hospital_id
            AND hospital.organization_id = p_organization_id AND hospital.deleted_at IS NULL
            AND COALESCE(hospital.is_deleted, FALSE) = FALSE
      ) RETURNING contact.hospital_contact_id INTO v_deleted_id;
    RETURN v_deleted_id;
END; $$;

COMMENT ON FUNCTION public.create_hospital_contact IS 'Creates a non-primary Contact owned by an active Hospital Aggregate.';
COMMENT ON FUNCTION public.update_hospital_contact IS 'Updates one active Hospital Contact with child-level optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_hospital_contact IS 'Soft deletes one non-primary Hospital Contact with child-level optimistic concurrency.';
COMMIT;
