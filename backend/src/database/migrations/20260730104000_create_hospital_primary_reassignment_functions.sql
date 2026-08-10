BEGIN;

CREATE OR REPLACE FUNCTION public.set_hospital_primary_address(
    p_hospital_id UUID, p_organization_id UUID, p_hospital_address_id UUID,
    p_expected_hospital_version INTEGER, p_actor_user_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_hospital_id UUID;
BEGIN
    IF p_expected_hospital_version IS NULL OR p_expected_hospital_version < 1 THEN RAISE EXCEPTION 'Expected Hospital version is required.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN RAISE EXCEPTION 'Audit actor does not exist.'; END IF;
    SELECT hospital.id INTO v_hospital_id FROM public.hospitals hospital
    WHERE hospital.id = p_hospital_id AND hospital.organization_id = p_organization_id
      AND hospital.version = p_expected_hospital_version AND hospital.deleted_at IS NULL
      AND COALESCE(hospital.is_deleted, FALSE) = FALSE FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.hospital_address address WHERE address.hospital_address_id = p_hospital_address_id
        AND address.hospital_id = p_hospital_id AND address.deleted_at IS NULL FOR UPDATE) THEN
        RAISE EXCEPTION 'Primary Address must be active and owned by the Hospital.';
    END IF;
    UPDATE public.hospital_address address SET is_primary = FALSE, updated_by = p_actor_user_id, updated_at = NOW(), version = address.version + 1
    WHERE address.hospital_id = p_hospital_id AND address.deleted_at IS NULL AND address.is_primary = TRUE AND address.hospital_address_id <> p_hospital_address_id;
    UPDATE public.hospital_address address SET is_primary = TRUE, updated_by = p_actor_user_id, updated_at = NOW(), version = address.version + 1
    WHERE address.hospital_address_id = p_hospital_address_id AND address.hospital_id = p_hospital_id AND address.deleted_at IS NULL;
    UPDATE public.hospitals hospital SET primary_address_id = p_hospital_address_id, updated_by = p_actor_user_id, updated_at = NOW(), version = hospital.version + 1
    WHERE hospital.id = p_hospital_id AND hospital.organization_id = p_organization_id AND hospital.version = p_expected_hospital_version;
    RETURN p_hospital_address_id;
END; $$;

CREATE OR REPLACE FUNCTION public.set_hospital_primary_contact(
    p_hospital_id UUID, p_organization_id UUID, p_hospital_contact_id UUID,
    p_expected_hospital_version INTEGER, p_actor_user_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_contact_type_id UUID; v_hospital_id UUID;
BEGIN
    IF p_expected_hospital_version IS NULL OR p_expected_hospital_version < 1 THEN RAISE EXCEPTION 'Expected Hospital version is required.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN RAISE EXCEPTION 'Audit actor does not exist.'; END IF;
    SELECT hospital.id INTO v_hospital_id FROM public.hospitals hospital
    WHERE hospital.id = p_hospital_id AND hospital.organization_id = p_organization_id
      AND hospital.version = p_expected_hospital_version AND hospital.deleted_at IS NULL
      AND COALESCE(hospital.is_deleted, FALSE) = FALSE FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT contact.contact_type_reference_value_id INTO v_contact_type_id FROM public.hospital_contact contact
    WHERE contact.hospital_contact_id = p_hospital_contact_id AND contact.hospital_id = p_hospital_id AND contact.deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Primary Contact must be active and owned by the Hospital.'; END IF;
    UPDATE public.hospital_contact contact SET is_primary = FALSE, updated_by = p_actor_user_id, updated_at = NOW(), version = contact.version + 1
    WHERE contact.hospital_id = p_hospital_id AND contact.contact_type_reference_value_id = v_contact_type_id
      AND contact.deleted_at IS NULL AND contact.is_primary = TRUE AND contact.hospital_contact_id <> p_hospital_contact_id;
    UPDATE public.hospital_contact contact SET is_primary = TRUE, updated_by = p_actor_user_id, updated_at = NOW(), version = contact.version + 1
    WHERE contact.hospital_contact_id = p_hospital_contact_id AND contact.hospital_id = p_hospital_id AND contact.deleted_at IS NULL;
    UPDATE public.hospitals hospital SET primary_contact_id = p_hospital_contact_id, updated_by = p_actor_user_id, updated_at = NOW(), version = hospital.version + 1
    WHERE hospital.id = p_hospital_id AND hospital.organization_id = p_organization_id AND hospital.version = p_expected_hospital_version;
    RETURN p_hospital_contact_id;
END; $$;

COMMENT ON FUNCTION public.set_hospital_primary_address IS 'Atomically selects one active Address as the Hospital primary Address using root optimistic concurrency.';
COMMENT ON FUNCTION public.set_hospital_primary_contact IS 'Atomically selects one active Contact as the Hospital primary Contact using root optimistic concurrency.';
COMMIT;
