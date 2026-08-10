BEGIN;

-- Phase 5: guarded one-time migration of the two existing Hospital records.
-- This migration intentionally fails before inserting partial data if prerequisites are missing.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM hospitals hospital
        WHERE hospital.created_by IS NULL
           OR hospital.updated_by IS NULL
           OR NOT EXISTS (SELECT 1 FROM users user_record WHERE user_record.id = hospital.created_by)
           OR NOT EXISTS (SELECT 1 FROM users user_record WHERE user_record.id = hospital.updated_by)
    ) THEN
        RAISE EXCEPTION
            'Hospital audit actors are missing or invalid. Populate created_by and updated_by with valid public.users IDs before migrating child records.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM hospitals hospital
        WHERE NULLIF(BTRIM(COALESCE(hospital.address_line1, hospital.address)), '') IS NULL
           OR NULLIF(BTRIM(COALESCE(hospital.postal_code, hospital.pin_code)), '') IS NULL
           OR NULLIF(BTRIM(hospital.country), '') IS NULL
           OR NULLIF(BTRIM(hospital.state), '') IS NULL
           OR NULLIF(BTRIM(hospital.city), '') IS NULL
    ) THEN
        RAISE EXCEPTION
            'Legacy Hospital address data is incomplete. Resolve address, country, state, city, and postal code before migration.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM hospitals hospital
        LEFT JOIN countries country ON LOWER(country.name) = LOWER(BTRIM(hospital.country))
        LEFT JOIN states state ON state.country_id = country.id AND LOWER(state.name) = LOWER(BTRIM(hospital.state))
        LEFT JOIN cities city ON city.state_id = state.id AND LOWER(city.name) = LOWER(BTRIM(hospital.city))
        WHERE country.id IS NULL OR state.id IS NULL OR city.id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Legacy Hospital location mapping failed. Add matching Country, State, and City master data before migration.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM hospitals hospital
        WHERE NULLIF(BTRIM(hospital.contact_person), '') IS NULL
           OR NULLIF(BTRIM(hospital.phone), '') IS NULL
    ) THEN
        RAISE EXCEPTION
            'Legacy Hospital contact data is incomplete. Resolve contact_person and phone before migration.';
    END IF;
END $$;

INSERT INTO hospital_address (
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
    deleted_by,
    deleted_at,
    version
)
SELECT
    gen_random_uuid(),
    hospital.id,
    address_type.id,
    COALESCE(NULLIF(BTRIM(hospital.address_line1), ''), NULLIF(BTRIM(hospital.address), '')),
    NULLIF(BTRIM(hospital.address_line2), ''),
    NULL,
    country.id,
    state.id,
    city.id,
    COALESCE(NULLIF(BTRIM(hospital.postal_code), ''), NULLIF(BTRIM(hospital.pin_code), '')),
    TRUE,
    hospital.created_by,
    COALESCE(hospital.created_at, NOW()),
    hospital.updated_by,
    COALESCE(hospital.updated_at, NOW()),
    hospital.deleted_by,
    hospital.deleted_at,
    GREATEST(COALESCE(hospital.version, 1), 1)
FROM hospitals hospital
JOIN reference_categories address_category ON address_category.code = 'HOSPITAL_ADDRESS_TYPE'
JOIN reference_values address_type ON address_type.category_id = address_category.id
    AND address_type.organization_id IS NULL
    AND address_type.code = 'REGISTERED'
JOIN countries country ON LOWER(country.name) = LOWER(BTRIM(hospital.country))
JOIN states state ON state.country_id = country.id AND LOWER(state.name) = LOWER(BTRIM(hospital.state))
JOIN cities city ON city.state_id = state.id AND LOWER(city.name) = LOWER(BTRIM(hospital.city))
WHERE NOT EXISTS (
    SELECT 1
    FROM hospital_address existing_address
    WHERE existing_address.hospital_id = hospital.id
      AND existing_address.deleted_at IS NULL
);

INSERT INTO hospital_contact (
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
    deleted_by,
    deleted_at,
    version
)
SELECT
    gen_random_uuid(),
    hospital.id,
    contact_type.id,
    BTRIM(hospital.contact_person),
    NULL,
    NULLIF(BTRIM(hospital.email), ''),
    BTRIM(hospital.phone),
    NULL,
    TRUE,
    hospital.created_by,
    COALESCE(hospital.created_at, NOW()),
    hospital.updated_by,
    COALESCE(hospital.updated_at, NOW()),
    hospital.deleted_by,
    hospital.deleted_at,
    GREATEST(COALESCE(hospital.version, 1), 1)
FROM hospitals hospital
JOIN reference_categories contact_category ON contact_category.code = 'HOSPITAL_CONTACT_TYPE'
JOIN reference_values contact_type ON contact_type.category_id = contact_category.id
    AND contact_type.organization_id IS NULL
    AND contact_type.code = 'ADMINISTRATIVE'
WHERE NOT EXISTS (
    SELECT 1
    FROM hospital_contact existing_contact
    WHERE existing_contact.hospital_id = hospital.id
      AND existing_contact.deleted_at IS NULL
);

DO $$
DECLARE
    hospital_count INTEGER;
    address_count INTEGER;
    contact_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO hospital_count FROM hospitals WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;
    SELECT COUNT(*) INTO address_count FROM hospital_address WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO contact_count FROM hospital_contact WHERE deleted_at IS NULL;

    IF address_count <> hospital_count OR contact_count <> hospital_count THEN
        RAISE EXCEPTION
            'Phase 5 migration validation failed. Expected % active Addresses and Contacts; found % Addresses and % Contacts.',
            hospital_count, address_count, contact_count;
    END IF;
END $$;

COMMIT;
