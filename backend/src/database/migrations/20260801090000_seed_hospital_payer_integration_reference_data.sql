BEGIN;

-- Hospital–Payer Integration reference data. These are platform-owned values;
-- a Hospital may configure an integration only with one of these approved values.

INSERT INTO public.reference_categories (code, name, description, is_system)
SELECT source.code, source.name, source.description, TRUE
FROM (
    VALUES
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'Hospital Payer Integration Channel', 'Approved non-secret submission channel for a Hospital and Insurance Partner.'),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'Hospital Payer Integration Status', 'Lifecycle status for a Hospital and Insurance Partner integration.')
) AS source(code, name, description)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.reference_categories AS category
    WHERE category.code = source.code
);

WITH required_values (category_code, code, name, description, display_order, is_default) AS (
    VALUES
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'EMAIL', 'Email', 'Submit payer correspondence using the configured business email address.', 1, TRUE),
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'RPA_PORTAL', 'RPA Portal', 'Submit through a payer portal; credentials are referenced only through an external secret reference.', 2, FALSE),
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'API', 'API', 'Reserved for a future approved API connector; it cannot be activated in this phase.', 3, FALSE),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'DRAFT', 'Draft', 'Configuration is incomplete or awaiting activation.', 1, TRUE),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'ACTIVE', 'Active', 'Configuration is approved for operational use.', 2, FALSE),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'INACTIVE', 'Inactive', 'Configuration is retained but unavailable for operational use.', 3, FALSE)
)
INSERT INTO public.reference_values (
    category_id,
    organization_id,
    code,
    name,
    description,
    display_order,
    is_default,
    is_active
)
SELECT
    category.id,
    NULL,
    required_values.code,
    required_values.name,
    required_values.description,
    required_values.display_order,
    required_values.is_default,
    TRUE
FROM required_values
JOIN public.reference_categories AS category
  ON category.code = required_values.category_code
WHERE NOT EXISTS (
    SELECT 1
    FROM public.reference_values AS existing_value
    WHERE existing_value.category_id = category.id
      AND existing_value.organization_id IS NULL
      AND existing_value.code = required_values.code
      AND existing_value.deleted_at IS NULL
      AND COALESCE(existing_value.is_deleted, FALSE) = FALSE
);

DO $$
DECLARE
    required_value_count INTEGER;
    active_value_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO required_value_count
    FROM (VALUES
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'EMAIL'),
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'RPA_PORTAL'),
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'API'),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'DRAFT'),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'ACTIVE'),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'INACTIVE')
    ) AS required_value(category_code, value_code);

    SELECT COUNT(*) INTO active_value_count
    FROM public.reference_values AS value
    JOIN public.reference_categories AS category
      ON category.id = value.category_id
    WHERE (category.code, value.code) IN (
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'EMAIL'),
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'RPA_PORTAL'),
        ('HOSPITAL_PAYER_INTEGRATION_CHANNEL', 'API'),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'DRAFT'),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'ACTIVE'),
        ('HOSPITAL_PAYER_INTEGRATION_STATUS', 'INACTIVE')
    )
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF active_value_count <> required_value_count THEN
        RAISE EXCEPTION 'Hospital–Payer Integration reference data is incomplete. Expected %, found %.',
            required_value_count, active_value_count;
    END IF;
END;
$$;

COMMIT;
