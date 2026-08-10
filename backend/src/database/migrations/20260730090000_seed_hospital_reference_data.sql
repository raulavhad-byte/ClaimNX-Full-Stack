BEGIN;

-- Phase 5: Hospital reference-data prerequisites.
-- Reference Data remains the owner of all values seeded here.

INSERT INTO reference_categories (code, name, description, is_system)
SELECT source.code, source.name, source.description, TRUE
FROM (
    VALUES
        ('OWNERSHIP_TYPE', 'Ownership Type', 'Ownership classifications for hospitals.'),
        ('OPERATIONAL_STATUS', 'Operational Status', 'Operational lifecycle statuses for platform entities.'),
        ('HOSPITAL_ADDRESS_TYPE', 'Hospital Address Type', 'Address classifications for hospitals.'),
        ('HOSPITAL_CONTACT_TYPE', 'Hospital Contact Type', 'Contact classifications for hospitals.')
) AS source(code, name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM reference_categories category
    WHERE category.code = source.code
);

WITH values_to_seed(category_code, code, name, description, display_order, is_default) AS (
    VALUES
        ('OWNERSHIP_TYPE', 'PRIVATE', 'Private', 'Privately owned healthcare organization.', 1, FALSE),
        ('OWNERSHIP_TYPE', 'PUBLIC', 'Public', 'Government-owned healthcare organization.', 2, FALSE),
        ('OWNERSHIP_TYPE', 'TRUST', 'Trust', 'Trust-owned healthcare organization.', 3, FALSE),
        ('OWNERSHIP_TYPE', 'CORPORATE', 'Corporate', 'Corporate-owned healthcare organization.', 4, FALSE),
        ('OPERATIONAL_STATUS', 'DRAFT', 'Draft', 'Configuration is incomplete and not operational.', 1, FALSE),
        ('OPERATIONAL_STATUS', 'ACTIVE', 'Active', 'Available for operational use.', 2, TRUE),
        ('OPERATIONAL_STATUS', 'INACTIVE', 'Inactive', 'Not available for operational use.', 3, FALSE),
        ('OPERATIONAL_STATUS', 'SUSPENDED', 'Suspended', 'Temporarily unavailable for operational use.', 4, FALSE),
        ('HOSPITAL_ADDRESS_TYPE', 'REGISTERED', 'Registered Address', 'Registered or legal address.', 1, TRUE),
        ('HOSPITAL_ADDRESS_TYPE', 'OPERATIONAL', 'Operational Address', 'Operational facility address.', 2, FALSE),
        ('HOSPITAL_ADDRESS_TYPE', 'BILLING', 'Billing Address', 'Billing correspondence address.', 3, FALSE),
        ('HOSPITAL_CONTACT_TYPE', 'ADMINISTRATIVE', 'Administrative Contact', 'Primary administrative contact.', 1, TRUE),
        ('HOSPITAL_CONTACT_TYPE', 'BILLING', 'Billing Contact', 'Billing and finance contact.', 2, FALSE),
        ('HOSPITAL_CONTACT_TYPE', 'EMERGENCY', 'Emergency Contact', 'Emergency operations contact.', 3, FALSE)
)
INSERT INTO reference_values (
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
    source.code,
    source.name,
    source.description,
    source.display_order,
    source.is_default,
    TRUE
FROM values_to_seed source
JOIN reference_categories category ON category.code = source.category_code
WHERE NOT EXISTS (
    SELECT 1
    FROM reference_values value
    WHERE value.category_id = category.id
      AND value.organization_id IS NULL
      AND value.code = source.code
);

-- Preserve unexpected legacy Hospital Type values as controlled global values.
WITH legacy_values AS (
    SELECT DISTINCT ON (normalized_code)
        normalized_code,
        display_name
    FROM (
        SELECT
            TRIM(BOTH '_' FROM REGEXP_REPLACE(UPPER(BTRIM(hospital_type)), '[^A-Z0-9]+', '_', 'g')) AS normalized_code,
            BTRIM(hospital_type) AS display_name
        FROM hospitals
        WHERE NULLIF(BTRIM(hospital_type), '') IS NOT NULL
    ) source
    WHERE normalized_code <> ''
    ORDER BY normalized_code, display_name
)
INSERT INTO reference_values (
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
    legacy.normalized_code,
    legacy.display_name,
    'Legacy Hospital Type migrated during Phase 5.',
    100,
    FALSE,
    TRUE
FROM legacy_values legacy
JOIN reference_categories category ON category.code = 'HOSPITAL_TYPE'
WHERE NOT EXISTS (
    SELECT 1
    FROM reference_values value
    WHERE value.category_id = category.id
      AND value.organization_id IS NULL
      AND value.code = legacy.normalized_code
);

COMMIT;
