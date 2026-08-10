BEGIN;

-- Phase 7: Insurance Foundation controlled Reference Data.
-- Reference Data remains the owner. This migration is idempotent and creates
-- no Insurance Partner, Product/Plan, Contact, or tenant Enablement records.

INSERT INTO public.reference_categories (code, name, description, is_system)
SELECT source.code, source.name, source.description, TRUE
FROM (
    VALUES
        ('INSURANCE_PARTNER_TYPE', 'Insurance Partner Type', 'Classifies platform insurance partners such as insurers and TPAs.'),
        ('INSURANCE_PARTNER_STATUS', 'Insurance Partner Status', 'Lifecycle classifications for Insurance Partner master data.'),
        ('INSURANCE_CONTACT_TYPE', 'Insurance Contact Type', 'Business contact classifications for Insurance Partners.'),
        ('INSURANCE_PLAN_STATUS', 'Insurance Plan Status', 'Lifecycle classifications for Insurance Product Plans.'),
        ('ORGANIZATION_PARTNER_ENABLEMENT_STATUS', 'Organization Partner Enablement Status', 'Lifecycle classifications for tenant Partner enablements.')
) AS source(code, name, description)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.reference_categories AS category
    WHERE category.code = source.code
);

WITH values_to_seed(category_code, code, name, description, display_order, is_default) AS (
    VALUES
        ('INSURANCE_PARTNER_TYPE', 'INSURER', 'Insurer', 'Licensed insurance carrier or payer.', 1, TRUE),
        ('INSURANCE_PARTNER_TYPE', 'TPA', 'Third Party Administrator', 'Third party administrator or claims administrator.', 2, FALSE),

        ('INSURANCE_PARTNER_STATUS', 'DRAFT', 'Draft', 'Partner record is incomplete and not operational.', 1, FALSE),
        ('INSURANCE_PARTNER_STATUS', 'ACTIVE', 'Active', 'Partner is available for operational use.', 2, TRUE),
        ('INSURANCE_PARTNER_STATUS', 'SUSPENDED', 'Suspended', 'Partner is temporarily unavailable for new operational use.', 3, FALSE),

        ('INSURANCE_CONTACT_TYPE', 'OPERATIONAL', 'Operational Contact', 'Primary operational communication contact.', 1, TRUE),
        ('INSURANCE_CONTACT_TYPE', 'BILLING', 'Billing Contact', 'Billing and finance communication contact.', 2, FALSE),
        ('INSURANCE_CONTACT_TYPE', 'ESCALATION', 'Escalation Contact', 'Operational escalation communication contact.', 3, FALSE),
        ('INSURANCE_CONTACT_TYPE', 'INTEGRATION', 'Integration Contact', 'Technical or integration communication contact.', 4, FALSE),

        ('INSURANCE_PLAN_STATUS', 'DRAFT', 'Draft', 'Plan is incomplete and not operational.', 1, FALSE),
        ('INSURANCE_PLAN_STATUS', 'ACTIVE', 'Active', 'Plan is available for operational use.', 2, TRUE),
        ('INSURANCE_PLAN_STATUS', 'INACTIVE', 'Inactive', 'Plan is not available for new operational use.', 3, FALSE),

        ('ORGANIZATION_PARTNER_ENABLEMENT_STATUS', 'ACTIVE', 'Active', 'Organization may operationally use the Partner.', 1, TRUE),
        ('ORGANIZATION_PARTNER_ENABLEMENT_STATUS', 'SUSPENDED', 'Suspended', 'Organization may not create new work using the Partner.', 2, FALSE)
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
    source.code,
    source.name,
    source.description,
    source.display_order,
    source.is_default,
    TRUE
FROM values_to_seed AS source
JOIN public.reference_categories AS category
  ON category.code = source.category_code
WHERE NOT EXISTS (
    SELECT 1
    FROM public.reference_values AS value
    WHERE value.category_id = category.id
      AND value.organization_id IS NULL
      AND value.code = source.code
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE
);

DO $$
DECLARE
    required_value_count INTEGER;
    active_value_count INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO required_value_count
    FROM (
        VALUES
            ('INSURANCE_PARTNER_TYPE', 'INSURER'),
            ('INSURANCE_PARTNER_TYPE', 'TPA'),
            ('INSURANCE_PARTNER_STATUS', 'DRAFT'),
            ('INSURANCE_PARTNER_STATUS', 'ACTIVE'),
            ('INSURANCE_PARTNER_STATUS', 'SUSPENDED'),
            ('INSURANCE_CONTACT_TYPE', 'OPERATIONAL'),
            ('INSURANCE_CONTACT_TYPE', 'BILLING'),
            ('INSURANCE_CONTACT_TYPE', 'ESCALATION'),
            ('INSURANCE_CONTACT_TYPE', 'INTEGRATION'),
            ('INSURANCE_PLAN_STATUS', 'DRAFT'),
            ('INSURANCE_PLAN_STATUS', 'ACTIVE'),
            ('INSURANCE_PLAN_STATUS', 'INACTIVE'),
            ('ORGANIZATION_PARTNER_ENABLEMENT_STATUS', 'ACTIVE'),
            ('ORGANIZATION_PARTNER_ENABLEMENT_STATUS', 'SUSPENDED')
    ) AS required_value(category_code, value_code);

    SELECT COUNT(*)
      INTO active_value_count
    FROM (
        VALUES
            ('INSURANCE_PARTNER_TYPE', 'INSURER'),
            ('INSURANCE_PARTNER_TYPE', 'TPA'),
            ('INSURANCE_PARTNER_STATUS', 'DRAFT'),
            ('INSURANCE_PARTNER_STATUS', 'ACTIVE'),
            ('INSURANCE_PARTNER_STATUS', 'SUSPENDED'),
            ('INSURANCE_CONTACT_TYPE', 'OPERATIONAL'),
            ('INSURANCE_CONTACT_TYPE', 'BILLING'),
            ('INSURANCE_CONTACT_TYPE', 'ESCALATION'),
            ('INSURANCE_CONTACT_TYPE', 'INTEGRATION'),
            ('INSURANCE_PLAN_STATUS', 'DRAFT'),
            ('INSURANCE_PLAN_STATUS', 'ACTIVE'),
            ('INSURANCE_PLAN_STATUS', 'INACTIVE'),
            ('ORGANIZATION_PARTNER_ENABLEMENT_STATUS', 'ACTIVE'),
            ('ORGANIZATION_PARTNER_ENABLEMENT_STATUS', 'SUSPENDED')
    ) AS required_value(category_code, value_code)
    JOIN public.reference_categories AS category
      ON category.code = required_value.category_code
    JOIN public.reference_values AS value
      ON value.category_id = category.id
     AND value.organization_id IS NULL
     AND value.code = required_value.value_code
     AND value.is_active = TRUE
     AND value.deleted_at IS NULL
     AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF active_value_count <> required_value_count THEN
        RAISE EXCEPTION
            'Phase 7 Insurance Reference Data validation failed: expected % active values, found %.',
            required_value_count,
            active_value_count;
    END IF;
END $$;

COMMIT;
