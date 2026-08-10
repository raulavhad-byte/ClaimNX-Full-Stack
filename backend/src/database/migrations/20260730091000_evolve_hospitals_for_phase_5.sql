BEGIN;

-- Phase 5: additive Hospital root evolution.
-- Existing columns and rows are preserved for backward compatibility.

ALTER TABLE hospitals
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(250),
    ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS hospital_type_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS ownership_type_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS operational_status_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS primary_address_id UUID,
    ADD COLUMN IF NOT EXISTS primary_contact_id UUID,
    ADD COLUMN IF NOT EXISTS remarks VARCHAR(1000);

UPDATE hospitals
SET display_name = hospital_name
WHERE display_name IS NULL
  AND NULLIF(BTRIM(hospital_name), '') IS NOT NULL;

UPDATE hospitals
SET registration_number = registration_no
WHERE registration_number IS NULL
  AND NULLIF(BTRIM(registration_no), '') IS NOT NULL;

-- Map legacy text values to the Reference Data identifiers created in Phase 5.
UPDATE hospitals hospital
SET hospital_type_reference_value_id = (
    SELECT value.id
    FROM reference_values value
    JOIN reference_categories category ON category.id = value.category_id
    WHERE category.code = 'HOSPITAL_TYPE'
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND (
          UPPER(value.code) = TRIM(BOTH '_' FROM REGEXP_REPLACE(UPPER(BTRIM(hospital.hospital_type)), '[^A-Z0-9]+', '_', 'g'))
          OR LOWER(value.name) = LOWER(BTRIM(hospital.hospital_type))
    )
    ORDER BY CASE WHEN UPPER(value.code) = TRIM(BOTH '_' FROM REGEXP_REPLACE(UPPER(BTRIM(hospital.hospital_type)), '[^A-Z0-9]+', '_', 'g')) THEN 0 ELSE 1 END
    LIMIT 1
)
WHERE hospital.hospital_type_reference_value_id IS NULL
  AND NULLIF(BTRIM(hospital.hospital_type), '') IS NOT NULL;

UPDATE hospitals hospital
SET operational_status_reference_value_id = (
    SELECT value.id
    FROM reference_values value
    JOIN reference_categories category ON category.id = value.category_id
    WHERE category.code = 'OPERATIONAL_STATUS'
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND UPPER(value.code) = UPPER(BTRIM(hospital.status))
    LIMIT 1
)
WHERE hospital.operational_status_reference_value_id IS NULL
  AND NULLIF(BTRIM(hospital.status), '') IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM hospitals
        WHERE hospital_type_reference_value_id IS NULL
           OR operational_status_reference_value_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Phase 5 Hospital reference-data mapping failed. Resolve Hospital Type or Status values before continuing.';
    END IF;
END $$;

COMMIT;
