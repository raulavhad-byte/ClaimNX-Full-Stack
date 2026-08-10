BEGIN;

-- ============================================================================
-- ORGANIZATION_TYPE
-- ============================================================================

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
    rc.id,
    NULL,
    v.code,
    v.name,
    v.description,
    v.display_order,
    TRUE,
    TRUE
FROM reference_categories rc
CROSS JOIN (
    VALUES
        ('HOSPITAL_GROUP', 'Hospital Group', 'Hospital Group Organization', 1),
        ('HOSPITAL', 'Hospital', 'Hospital Organization', 2),
        ('CLINIC', 'Clinic', 'Clinic Organization', 3),
        ('TPA', 'Third Party Administrator', 'Third Party Administrator', 4),
        ('INSURANCE_COMPANY', 'Insurance Company', 'Insurance Company', 5),
        ('CORPORATE', 'Corporate', 'Corporate Organization', 6)
) AS v(code, name, description, display_order)
WHERE rc.code = 'ORGANIZATION_TYPE';

-- ============================================================================
-- HOSPITAL_TYPE
-- ============================================================================

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
    rc.id,
    NULL,
    v.code,
    v.name,
    v.description,
    v.display_order,
    TRUE,
    TRUE
FROM reference_categories rc
CROSS JOIN (
    VALUES
        ('GENERAL', 'General Hospital', 'General Hospital', 1),
        ('MULTI_SPECIALITY', 'Multi Speciality Hospital', 'Multi Speciality Hospital', 2),
        ('SINGLE_SPECIALITY', 'Single Speciality Hospital', 'Single Speciality Hospital', 3),
        ('DAY_CARE', 'Day Care Centre', 'Day Care Centre', 4),
        ('CLINIC', 'Clinic', 'Clinic', 5)
) AS v(code, name, description, display_order)
WHERE rc.code = 'HOSPITAL_TYPE';

-- ============================================================================
-- DEPARTMENT_TYPE
-- ============================================================================

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
    rc.id,
    NULL,
    v.code,
    v.name,
    v.description,
    v.display_order,
    TRUE,
    TRUE
FROM reference_categories rc
CROSS JOIN (
    VALUES
        ('BILLING', 'Billing', 'Billing Department', 1),
        ('CASHLESS', 'Cashless', 'Cashless Department', 2),
        ('FINANCE', 'Finance', 'Finance Department', 3),
        ('RECOVERY', 'Recovery', 'Recovery Department', 4),
        ('MEDICAL_RECORDS', 'Medical Records', 'Medical Records Department', 5)
) AS v(code, name, description, display_order)
WHERE rc.code = 'DEPARTMENT_TYPE';

-- ============================================================================
-- DESIGNATION
-- ============================================================================

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
    rc.id,
    NULL,
    v.code,
    v.name,
    v.description,
    v.display_order,
    TRUE,
    TRUE
FROM reference_categories rc
CROSS JOIN (
    VALUES
        ('HOSPITAL_ADMIN', 'Hospital Admin', 'Hospital Administrator', 1),
        ('BILLING_EXECUTIVE', 'Billing Executive', 'Billing Executive', 2),
        ('CASHLESS_EXECUTIVE', 'Cashless Executive', 'Cashless Executive', 3),
        ('FINANCE_EXECUTIVE', 'Finance Executive', 'Finance Executive', 4),
        ('RECOVERY_EXECUTIVE', 'Recovery Executive', 'Recovery Executive', 5)
) AS v(code, name, description, display_order)
WHERE rc.code = 'DESIGNATION';

COMMIT;