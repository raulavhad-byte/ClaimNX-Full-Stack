BEGIN;

CREATE OR REPLACE FUNCTION public.assert_tenant_configuration_value(
    p_configuration_key VARCHAR,
    p_value_type VARCHAR,
    p_validation_rule JSONB,
    p_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_allowed_values JSONB;
BEGIN
    IF p_value IS NULL THEN
        RAISE EXCEPTION 'Tenant Configuration override value is required.';
    END IF;

    IF LOWER(p_configuration_key) ~ '(^|\.)(secret|password|credential|api_key|token)(\.|$)' THEN
        RAISE EXCEPTION 'Tenant Configuration cannot store secrets or credentials.';
    END IF;

    CASE p_value_type
        WHEN 'BOOLEAN' THEN
            IF p_value NOT IN ('true', 'false') THEN
                RAISE EXCEPTION 'Boolean Configuration values must be true or false.';
            END IF;
        WHEN 'INTEGER' THEN
            IF p_value !~ '^-?(0|[1-9][0-9]*)$' THEN
                RAISE EXCEPTION 'Integer Configuration values must be whole numbers.';
            END IF;
        WHEN 'STRING' THEN
            IF BTRIM(p_value) = '' THEN
                RAISE EXCEPTION 'String Configuration values cannot be blank.';
            END IF;
        WHEN 'ENUM' THEN
            v_allowed_values := COALESCE(p_validation_rule -> 'allowedValues', '[]'::JSONB);
            IF NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(v_allowed_values) AS allowed_value(value)
                WHERE allowed_value.value = p_value
            ) THEN
                RAISE EXCEPTION 'Configuration value is not an approved enum value.';
            END IF;
        WHEN 'JSON' THEN
            RAISE EXCEPTION 'JSON Configuration values require approved schema validation before they can be written.';
        ELSE
            RAISE EXCEPTION 'Configuration Definition has an unsupported value type.';
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization_configuration_override(
    p_organization_configuration_id UUID,
    p_organization_id UUID,
    p_configuration_definition_id UUID,
    p_config_value TEXT,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_configuration_key VARCHAR;
    v_value_type VARCHAR;
    v_validation_rule JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.organizations organization
        WHERE organization.id = p_organization_id
          AND organization.status = 'ACTIVE'
          AND organization.deleted_at IS NULL
          AND COALESCE(organization.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Organization tenant must be active.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.organization_id = p_organization_id
          AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE'
          AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Actor must be an active Organization member.';
    END IF;

    SELECT definition.configuration_key, definition.value_type, definition.validation_rule
      INTO v_configuration_key, v_value_type, v_validation_rule
      FROM public.configuration_definitions definition
     WHERE definition.configuration_definition_id = p_configuration_definition_id
       AND definition.status = 'ACTIVE'
       AND definition.override_allowed = TRUE
       AND definition.deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configuration Definition must be active and allow Organization overrides.';
    END IF;

    PERFORM public.assert_tenant_configuration_value(
        v_configuration_key,
        v_value_type,
        v_validation_rule,
        p_config_value
    );

    IF EXISTS (
        SELECT 1
        FROM public.organization_configurations override
        WHERE override.organization_id = p_organization_id
          AND override.configuration_definition_id = p_configuration_definition_id
          AND override.deleted_at IS NULL
          AND COALESCE(override.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'An active Organization override already exists for this Configuration Definition.';
    END IF;

    INSERT INTO public.organization_configurations (
        id,
        organization_id,
        configuration_definition_id,
        config_key,
        config_value,
        status,
        created_by,
        created_at,
        updated_by,
        updated_at,
        version
    )
    VALUES (
        p_organization_configuration_id,
        p_organization_id,
        p_configuration_definition_id,
        v_configuration_key,
        p_config_value,
        'ACTIVE',
        p_actor_user_id,
        NOW(),
        p_actor_user_id,
        NOW(),
        1
    );

    RETURN p_organization_configuration_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_configuration_override(
    p_organization_configuration_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_config_value TEXT,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_configuration_key VARCHAR;
    v_value_type VARCHAR;
    v_validation_rule JSONB;
    v_updated_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN
        RAISE EXCEPTION 'Expected Organization Configuration version is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.organizations organization
        WHERE organization.id = p_organization_id AND organization.status = 'ACTIVE'
          AND organization.deleted_at IS NULL AND COALESCE(organization.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Organization tenant must be active.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members member
        WHERE member.organization_id = p_organization_id AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE' AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Actor must be an active Organization member.';
    END IF;

    SELECT definition.configuration_key, definition.value_type, definition.validation_rule
      INTO v_configuration_key, v_value_type, v_validation_rule
      FROM public.organization_configurations override
      JOIN public.configuration_definitions definition
        ON definition.configuration_definition_id = override.configuration_definition_id
     WHERE override.id = p_organization_configuration_id
       AND override.organization_id = p_organization_id
       AND override.deleted_at IS NULL
       AND COALESCE(override.is_deleted, FALSE) = FALSE
       AND definition.status = 'ACTIVE'
       AND definition.override_allowed = TRUE
       AND definition.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    PERFORM public.assert_tenant_configuration_value(v_configuration_key, v_value_type, v_validation_rule, p_config_value);

    UPDATE public.organization_configurations override
       SET config_value = p_config_value,
           updated_by = p_actor_user_id,
           updated_at = NOW(),
           version = override.version + 1
     WHERE override.id = p_organization_configuration_id
       AND override.organization_id = p_organization_id
       AND override.version = p_expected_version
       AND override.deleted_at IS NULL
       AND COALESCE(override.is_deleted, FALSE) = FALSE
     RETURNING override.id INTO v_updated_id;

    RETURN v_updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_organization_configuration_override_status(
    p_organization_configuration_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_target_status VARCHAR,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN
        RAISE EXCEPTION 'Expected Organization Configuration version is required.';
    END IF;
    IF p_target_status NOT IN ('ACTIVE', 'INACTIVE') THEN
        RAISE EXCEPTION 'Organization Configuration status must be ACTIVE or INACTIVE.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organizations organization
        WHERE organization.id = p_organization_id AND organization.status = 'ACTIVE'
          AND organization.deleted_at IS NULL AND COALESCE(organization.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Organization tenant must be active.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members member
        WHERE member.organization_id = p_organization_id AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE' AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Actor must be an active Organization member.';
    END IF;

    UPDATE public.organization_configurations override
       SET status = p_target_status,
           updated_by = p_actor_user_id,
           updated_at = NOW(),
           version = override.version + 1
     WHERE override.id = p_organization_configuration_id
       AND override.organization_id = p_organization_id
       AND override.version = p_expected_version
       AND override.deleted_at IS NULL
       AND COALESCE(override.is_deleted, FALSE) = FALSE
       AND EXISTS (
           SELECT 1
           FROM public.configuration_definitions definition
           WHERE definition.configuration_definition_id = override.configuration_definition_id
             AND definition.status = 'ACTIVE'
             AND definition.override_allowed = TRUE
             AND definition.deleted_at IS NULL
       )
     RETURNING override.id INTO v_updated_id;

    RETURN v_updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_organization_configuration_override(
    p_organization_configuration_id UUID,
    p_organization_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN
        RAISE EXCEPTION 'Expected Organization Configuration version is required.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organizations organization
        WHERE organization.id = p_organization_id AND organization.status = 'ACTIVE'
          AND organization.deleted_at IS NULL AND COALESCE(organization.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Organization tenant must be active.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members member
        WHERE member.organization_id = p_organization_id AND member.user_id = p_actor_user_id
          AND member.status = 'ACTIVE' AND member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Actor must be an active Organization member.';
    END IF;

    UPDATE public.organization_configurations override
       SET is_deleted = TRUE,
           deleted_by = p_actor_user_id,
           deleted_at = NOW(),
           updated_by = p_actor_user_id,
           updated_at = NOW(),
           version = override.version + 1
     WHERE override.id = p_organization_configuration_id
       AND override.organization_id = p_organization_id
       AND override.version = p_expected_version
       AND override.deleted_at IS NULL
       AND COALESCE(override.is_deleted, FALSE) = FALSE
     RETURNING override.id INTO v_deleted_id;

    RETURN v_deleted_id;
END;
$$;

COMMENT ON FUNCTION public.create_organization_configuration_override IS
    'Creates an active Organization Configuration override for an approved Definition.';
COMMENT ON FUNCTION public.update_organization_configuration_override IS
    'Updates an Organization Configuration override using optimistic concurrency.';
COMMENT ON FUNCTION public.set_organization_configuration_override_status IS
    'Activates or deactivates an Organization Configuration override using optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_organization_configuration_override IS
    'Soft retires an Organization Configuration override using optimistic concurrency.';

COMMIT;
