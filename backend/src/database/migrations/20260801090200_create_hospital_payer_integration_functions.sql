BEGIN;

-- Command persistence for the Hospital–Payer Integration aggregate.
-- Every write is tenant-scoped, audited, and uses optimistic concurrency.

CREATE OR REPLACE FUNCTION public.assert_active_hospital_partner_integration_hospital(
    p_organization_id UUID,
    p_hospital_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.hospitals AS hospital
        WHERE hospital.id = p_hospital_id
          AND hospital.organization_id = p_organization_id
          AND hospital.deleted_at IS NULL
          AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Hospital must exist, be active, and belong to the Organization tenant.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_hospital_partner_integration_partner(
    p_insurance_partner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    PERFORM public.assert_active_insurance_partner(p_insurance_partner_id);

    IF NOT EXISTS (
        SELECT 1
        FROM public.insurance_entities AS partner
        JOIN public.reference_values AS type_value
          ON type_value.id = partner.partner_type_reference_value_id
        JOIN public.reference_categories AS type_category
          ON type_category.id = type_value.category_id
        WHERE partner.id = p_insurance_partner_id
          AND type_category.code = 'INSURANCE_PARTNER_TYPE'
          AND type_value.code IN ('INSURER', 'TPA')
          AND type_value.is_active = TRUE
          AND type_value.deleted_at IS NULL
          AND COALESCE(type_value.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Hospital–Payer Integration requires an active Insurer or TPA Insurance Partner.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_active_hospital_partner_enablement(
    p_organization_id UUID,
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
        FROM public.organization_insurance_partner_enablement AS enablement
        JOIN public.reference_values AS status_value
          ON status_value.id = enablement.operational_status_reference_value_id
        JOIN public.reference_categories AS status_category
          ON status_category.id = status_value.category_id
        WHERE enablement.organization_id = p_organization_id
          AND enablement.insurance_partner_id = p_insurance_partner_id
          AND enablement.deleted_at IS NULL
          AND status_category.code = 'ORGANIZATION_PARTNER_ENABLEMENT_STATUS'
          AND status_value.code = 'ACTIVE'
          AND status_value.is_active = TRUE
          AND status_value.deleted_at IS NULL
          AND COALESCE(status_value.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Insurance Partner must have an active Organization Partner Enablement before Hospital configuration.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_hospital_partner_integration_configuration(
    p_submission_channel_reference_value_id UUID,
    p_payer_email_address VARCHAR,
    p_notification_email_address VARCHAR,
    p_portal_url VARCHAR,
    p_portal_user_name VARCHAR,
    p_credential_secret_reference VARCHAR,
    p_operational_status_reference_value_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_channel_code VARCHAR(100);
    v_status_code VARCHAR(100);
BEGIN
    SELECT value.code INTO v_channel_code
    FROM public.reference_values AS value
    JOIN public.reference_categories AS category ON category.id = value.category_id
    WHERE value.id = p_submission_channel_reference_value_id
      AND category.code = 'HOSPITAL_PAYER_INTEGRATION_CHANNEL'
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;

    SELECT value.code INTO v_status_code
    FROM public.reference_values AS value
    JOIN public.reference_categories AS category ON category.id = value.category_id
    WHERE value.id = p_operational_status_reference_value_id
      AND category.code = 'HOSPITAL_PAYER_INTEGRATION_STATUS'
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_channel_code NOT IN ('EMAIL', 'RPA_PORTAL', 'API') THEN
        RAISE EXCEPTION 'Hospital–Payer Integration Channel Reference Value is invalid.';
    END IF;
    IF v_status_code NOT IN ('DRAFT', 'ACTIVE', 'INACTIVE') THEN
        RAISE EXCEPTION 'Hospital–Payer Integration Status Reference Value is invalid.';
    END IF;
    IF p_payer_email_address IS NOT NULL
       AND BTRIM(p_payer_email_address) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
        RAISE EXCEPTION 'Payer email address format is invalid.';
    END IF;
    IF p_notification_email_address IS NOT NULL
       AND BTRIM(p_notification_email_address) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
        RAISE EXCEPTION 'Notification email address format is invalid.';
    END IF;

    IF v_status_code = 'ACTIVE' AND v_channel_code = 'EMAIL'
       AND NULLIF(BTRIM(p_payer_email_address), '') IS NULL THEN
        RAISE EXCEPTION 'An active Email integration requires a payer email address.';
    END IF;
    IF v_status_code = 'ACTIVE' AND v_channel_code = 'RPA_PORTAL'
       AND (
           NULLIF(BTRIM(p_portal_url), '') IS NULL
           OR NULLIF(BTRIM(p_portal_user_name), '') IS NULL
           OR NULLIF(BTRIM(p_credential_secret_reference), '') IS NULL
       ) THEN
        RAISE EXCEPTION 'An active RPA Portal integration requires an HTTPS portal URL, portal user name, and external credential secret reference.';
    END IF;
    IF v_status_code = 'ACTIVE' AND v_channel_code = 'API' THEN
        RAISE EXCEPTION 'API integration is reserved for a future approved connector and cannot be activated in Phase 7.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_hospital_insurance_partner_integration(
    p_hospital_insurance_partner_integration_id UUID,
    p_organization_id UUID,
    p_hospital_id UUID,
    p_insurance_partner_id UUID,
    p_integration_code VARCHAR,
    p_submission_channel_reference_value_id UUID,
    p_payer_email_address VARCHAR,
    p_notification_email_address VARCHAR,
    p_portal_url VARCHAR,
    p_portal_user_name VARCHAR,
    p_credential_secret_reference VARCHAR,
    p_operational_status_reference_value_id UUID,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF p_hospital_insurance_partner_integration_id IS NULL
       OR p_hospital_id IS NULL
       OR p_insurance_partner_id IS NULL
       OR NULLIF(BTRIM(p_integration_code), '') IS NULL THEN
        RAISE EXCEPTION 'Integration ID, Hospital, Insurance Partner, and Integration Code are required.';
    END IF;

    PERFORM public.assert_active_insurance_enablement_actor(p_organization_id, p_actor_user_id);
    PERFORM public.assert_active_hospital_partner_integration_hospital(p_organization_id, p_hospital_id);
    PERFORM public.assert_hospital_partner_integration_partner(p_insurance_partner_id);
    PERFORM public.assert_active_hospital_partner_enablement(p_organization_id, p_insurance_partner_id);
    PERFORM public.assert_hospital_partner_integration_configuration(
        p_submission_channel_reference_value_id, p_payer_email_address, p_notification_email_address,
        p_portal_url, p_portal_user_name, p_credential_secret_reference, p_operational_status_reference_value_id
    );

    INSERT INTO public.hospital_insurance_partner_integration (
        hospital_insurance_partner_integration_id, organization_id, hospital_id, insurance_partner_id,
        integration_code, submission_channel_reference_value_id, payer_email_address,
        notification_email_address, portal_url, portal_user_name, credential_secret_reference,
        operational_status_reference_value_id, created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_hospital_insurance_partner_integration_id, p_organization_id, p_hospital_id, p_insurance_partner_id,
        BTRIM(p_integration_code), p_submission_channel_reference_value_id, NULLIF(BTRIM(p_payer_email_address), ''),
        NULLIF(BTRIM(p_notification_email_address), ''), NULLIF(BTRIM(p_portal_url), ''),
        NULLIF(BTRIM(p_portal_user_name), ''), NULLIF(BTRIM(p_credential_secret_reference), ''),
        p_operational_status_reference_value_id, p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );

    RETURN p_hospital_insurance_partner_integration_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_hospital_insurance_partner_integration(
    p_hospital_insurance_partner_integration_id UUID,
    p_organization_id UUID,
    p_hospital_id UUID,
    p_expected_version INTEGER,
    p_integration_code VARCHAR,
    p_submission_channel_reference_value_id UUID,
    p_payer_email_address VARCHAR,
    p_notification_email_address VARCHAR,
    p_portal_url VARCHAR,
    p_portal_user_name VARCHAR,
    p_credential_secret_reference VARCHAR,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_status_reference_value_id UUID;
    v_updated_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR NULLIF(BTRIM(p_integration_code), '') IS NULL THEN
        RAISE EXCEPTION 'Expected Version and Integration Code are required.';
    END IF;
    PERFORM public.assert_active_insurance_enablement_actor(p_organization_id, p_actor_user_id);
    PERFORM public.assert_active_hospital_partner_integration_hospital(p_organization_id, p_hospital_id);

    SELECT integration.operational_status_reference_value_id INTO v_status_reference_value_id
    FROM public.hospital_insurance_partner_integration AS integration
    WHERE integration.hospital_insurance_partner_integration_id = p_hospital_insurance_partner_integration_id
      AND integration.organization_id = p_organization_id
      AND integration.hospital_id = p_hospital_id
      AND integration.deleted_at IS NULL;
    IF v_status_reference_value_id IS NULL THEN
        RETURN NULL;
    END IF;
    PERFORM public.assert_hospital_partner_integration_configuration(
        p_submission_channel_reference_value_id, p_payer_email_address, p_notification_email_address,
        p_portal_url, p_portal_user_name, p_credential_secret_reference, v_status_reference_value_id
    );

    UPDATE public.hospital_insurance_partner_integration AS integration
    SET integration_code = BTRIM(p_integration_code),
        submission_channel_reference_value_id = p_submission_channel_reference_value_id,
        payer_email_address = NULLIF(BTRIM(p_payer_email_address), ''),
        notification_email_address = NULLIF(BTRIM(p_notification_email_address), ''),
        portal_url = NULLIF(BTRIM(p_portal_url), ''),
        portal_user_name = NULLIF(BTRIM(p_portal_user_name), ''),
        credential_secret_reference = NULLIF(BTRIM(p_credential_secret_reference), ''),
        updated_by = p_actor_user_id, updated_at = NOW(), version = integration.version + 1
    WHERE integration.hospital_insurance_partner_integration_id = p_hospital_insurance_partner_integration_id
      AND integration.organization_id = p_organization_id
      AND integration.hospital_id = p_hospital_id
      AND integration.version = p_expected_version
      AND integration.deleted_at IS NULL
    RETURNING integration.hospital_insurance_partner_integration_id INTO v_updated_id;
    RETURN v_updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_hospital_insurance_partner_integration_status(
    p_hospital_insurance_partner_integration_id UUID,
    p_organization_id UUID,
    p_hospital_id UUID,
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
    v_integration public.hospital_insurance_partner_integration%ROWTYPE;
    v_requested_status_code VARCHAR(100);
    v_updated_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN
        RAISE EXCEPTION 'Expected Version is required.';
    END IF;
    PERFORM public.assert_active_insurance_enablement_actor(p_organization_id, p_actor_user_id);
    PERFORM public.assert_active_hospital_partner_integration_hospital(p_organization_id, p_hospital_id);

    SELECT * INTO v_integration
    FROM public.hospital_insurance_partner_integration AS integration
    WHERE integration.hospital_insurance_partner_integration_id = p_hospital_insurance_partner_integration_id
      AND integration.organization_id = p_organization_id
      AND integration.hospital_id = p_hospital_id
      AND integration.deleted_at IS NULL;
    IF NOT FOUND THEN RETURN NULL; END IF;

    SELECT value.code INTO v_requested_status_code
    FROM public.reference_values AS value
    JOIN public.reference_categories AS category ON category.id = value.category_id
    WHERE value.id = p_operational_status_reference_value_id
      AND category.code = 'HOSPITAL_PAYER_INTEGRATION_STATUS'
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF v_requested_status_code = 'ACTIVE' THEN
        PERFORM public.assert_hospital_partner_integration_partner(v_integration.insurance_partner_id);
        PERFORM public.assert_active_hospital_partner_enablement(p_organization_id, v_integration.insurance_partner_id);
    END IF;
    PERFORM public.assert_hospital_partner_integration_configuration(
        v_integration.submission_channel_reference_value_id, v_integration.payer_email_address,
        v_integration.notification_email_address, v_integration.portal_url, v_integration.portal_user_name,
        v_integration.credential_secret_reference, p_operational_status_reference_value_id
    );

    UPDATE public.hospital_insurance_partner_integration AS integration
    SET operational_status_reference_value_id = p_operational_status_reference_value_id,
        updated_by = p_actor_user_id, updated_at = NOW(), version = integration.version + 1
    WHERE integration.hospital_insurance_partner_integration_id = p_hospital_insurance_partner_integration_id
      AND integration.organization_id = p_organization_id
      AND integration.hospital_id = p_hospital_id
      AND integration.version = p_expected_version
      AND integration.deleted_at IS NULL
    RETURNING integration.hospital_insurance_partner_integration_id INTO v_updated_id;
    RETURN v_updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_hospital_insurance_partner_integration(
    p_hospital_insurance_partner_integration_id UUID,
    p_organization_id UUID,
    p_hospital_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_deleted_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN
        RAISE EXCEPTION 'Expected Version is required.';
    END IF;
    PERFORM public.assert_active_insurance_enablement_actor(p_organization_id, p_actor_user_id);

    UPDATE public.hospital_insurance_partner_integration AS integration
    SET deleted_by = p_actor_user_id, deleted_at = NOW(),
        updated_by = p_actor_user_id, updated_at = NOW(), version = integration.version + 1
    WHERE integration.hospital_insurance_partner_integration_id = p_hospital_insurance_partner_integration_id
      AND integration.organization_id = p_organization_id
      AND integration.hospital_id = p_hospital_id
      AND integration.version = p_expected_version
      AND integration.deleted_at IS NULL
    RETURNING integration.hospital_insurance_partner_integration_id INTO v_deleted_id;
    RETURN v_deleted_id;
END;
$$;

COMMENT ON FUNCTION public.create_hospital_insurance_partner_integration IS
    'Creates non-secret Hospital-specific Insurer or TPA routing configuration after tenant, Hospital, partner, and enablement validation.';
COMMENT ON FUNCTION public.update_hospital_insurance_partner_integration IS
    'Updates Hospital–Payer Integration routing configuration with optimistic concurrency.';
COMMENT ON FUNCTION public.set_hospital_insurance_partner_integration_status IS
    'Changes Hospital–Payer Integration lifecycle with activation prerequisite validation.';
COMMENT ON FUNCTION public.soft_delete_hospital_insurance_partner_integration IS
    'Soft retires Hospital–Payer Integration configuration with optimistic concurrency.';

COMMIT;
