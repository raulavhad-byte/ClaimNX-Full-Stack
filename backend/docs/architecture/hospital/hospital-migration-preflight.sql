-- Read-only Phase 5 Hospital migration preflight.
-- Run this in Supabase SQL Editor before applying any Phase 5 migration.

SELECT
    hospital.id AS hospital_id,
    hospital.hospital_code,
    CASE
        WHEN hospital.created_by IS NULL OR hospital.updated_by IS NULL THEN 'BLOCKED: missing audit actor'
        WHEN NOT EXISTS (SELECT 1 FROM users user_record WHERE user_record.id = hospital.created_by) THEN 'BLOCKED: invalid created_by'
        WHEN NOT EXISTS (SELECT 1 FROM users user_record WHERE user_record.id = hospital.updated_by) THEN 'BLOCKED: invalid updated_by'
        ELSE 'READY'
    END AS audit_readiness,
    CASE
        WHEN NULLIF(BTRIM(COALESCE(hospital.address_line1, hospital.address)), '') IS NULL THEN 'BLOCKED: missing address'
        WHEN NULLIF(BTRIM(COALESCE(hospital.postal_code, hospital.pin_code)), '') IS NULL THEN 'BLOCKED: missing postal code'
        WHEN country.id IS NULL THEN 'BLOCKED: unmatched country'
        WHEN state.id IS NULL THEN 'BLOCKED: unmatched state'
        WHEN city.id IS NULL THEN 'BLOCKED: unmatched city'
        ELSE 'READY'
    END AS address_readiness,
    CASE
        WHEN NULLIF(BTRIM(hospital.contact_person), '') IS NULL THEN 'BLOCKED: missing contact person'
        WHEN NULLIF(BTRIM(hospital.phone), '') IS NULL THEN 'BLOCKED: missing phone'
        ELSE 'READY'
    END AS contact_readiness
FROM hospitals hospital
LEFT JOIN countries country ON LOWER(country.name) = LOWER(BTRIM(hospital.country))
LEFT JOIN states state ON state.country_id = country.id AND LOWER(state.name) = LOWER(BTRIM(hospital.state))
LEFT JOIN cities city ON city.state_id = state.id AND LOWER(city.name) = LOWER(BTRIM(hospital.city))
ORDER BY hospital.hospital_code;
