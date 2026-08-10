BEGIN;

-- Approved initial Tenant Configuration catalogue.
-- The platform administrator was verified in the Phase 5 preflight.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = '09a6e607-4846-4d4d-9ad3-86ae90310f18'::UUID
    ) THEN
        RAISE EXCEPTION 'Approved Tenant Configuration audit user does not exist.';
    END IF;
END $$;

WITH approved_definitions (
    configuration_definition_id,
    configuration_key,
    display_name,
    configuration_category,
    value_type,
    default_value,
    validation_rule,
    override_allowed,
    status
) AS (
    VALUES
        (
            'e1b1178b-64dc-462f-b9f1-8b9c5a84b401'::UUID,
            'platform.time_zone',
            'Platform Time Zone',
            'Platform',
            'STRING',
            'Asia/Kolkata',
            '{"validation":"IANA_TIME_ZONE"}'::JSONB,
            TRUE,
            'ACTIVE'
        ),
        (
            'e1b1178b-64dc-462f-b9f1-8b9c5a84b402'::UUID,
            'platform.default_currency',
            'Platform Default Currency',
            'Platform',
            'STRING',
            'INR',
            '{"validation":"ISO_4217_CURRENCY"}'::JSONB,
            TRUE,
            'ACTIVE'
        ),
        (
            'e1b1178b-64dc-462f-b9f1-8b9c5a84b403'::UUID,
            'platform.date_format',
            'Platform Date Format',
            'Platform',
            'ENUM',
            'DD/MM/YYYY',
            '{"allowedValues":["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"]}'::JSONB,
            TRUE,
            'ACTIVE'
        ),
        (
            'e1b1178b-64dc-462f-b9f1-8b9c5a84b404'::UUID,
            'platform.feature.document_uploads_enabled',
            'Document Uploads Enabled',
            'Feature Management',
            'BOOLEAN',
            'true',
            '{"validation":"BOOLEAN"}'::JSONB,
            TRUE,
            'ACTIVE'
        ),
        (
            'e1b1178b-64dc-462f-b9f1-8b9c5a84b405'::UUID,
            'platform.feature.notifications_enabled',
            'Notifications Enabled',
            'Feature Management',
            'BOOLEAN',
            'true',
            '{"validation":"BOOLEAN"}'::JSONB,
            TRUE,
            'ACTIVE'
        )
)
INSERT INTO public.configuration_definitions (
    configuration_definition_id,
    configuration_key,
    display_name,
    configuration_category,
    value_type,
    default_value,
    validation_rule,
    override_allowed,
    status,
    created_by,
    created_at,
    updated_by,
    updated_at,
    version
)
SELECT
    definition.configuration_definition_id,
    definition.configuration_key,
    definition.display_name,
    definition.configuration_category,
    definition.value_type,
    definition.default_value,
    definition.validation_rule,
    definition.override_allowed,
    definition.status,
    '09a6e607-4846-4d4d-9ad3-86ae90310f18'::UUID,
    NOW(),
    '09a6e607-4846-4d4d-9ad3-86ae90310f18'::UUID,
    NOW(),
    1
FROM approved_definitions definition
WHERE NOT EXISTS (
    SELECT 1
    FROM public.configuration_definitions existing_definition
    WHERE LOWER(BTRIM(existing_definition.configuration_key)) = LOWER(BTRIM(definition.configuration_key))
      AND existing_definition.deleted_at IS NULL
      AND existing_definition.status = 'ACTIVE'
);

COMMIT;
