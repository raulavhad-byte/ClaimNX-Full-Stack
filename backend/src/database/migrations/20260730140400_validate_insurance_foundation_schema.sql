BEGIN;

-- Phase 7: post-migration validation. This migration changes no business data.

DO $$
DECLARE
    required_reference_value_count INTEGER := 14;
    active_reference_value_count INTEGER;
BEGIN
    IF to_regclass('public.insurance_entities') IS NULL
       OR to_regclass('public.insurance_partner_contact') IS NULL
       OR to_regclass('public.insurance_product_plan') IS NULL
       OR to_regclass('public.organization_insurance_partner_enablement') IS NULL THEN
        RAISE EXCEPTION 'Phase 7 Insurance Foundation validation failed: one or more required tables are missing.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.claims'::REGCLASS
          AND conname = 'claims_payer_id_fkey'
          AND contype = 'f'
          AND confrelid = 'public.insurance_entities'::REGCLASS
    ) THEN
        RAISE EXCEPTION 'Phase 7 Insurance Foundation validation failed: Claim payer compatibility foreign key is missing.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.insurance_partner_contact'::REGCLASS
          AND conname = 'fk_insurance_partner_contact_partner'
          AND contype = 'f'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.insurance_product_plan'::REGCLASS
          AND conname = 'fk_insurance_product_plan_partner'
          AND contype = 'f'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.organization_insurance_partner_enablement'::REGCLASS
          AND conname = 'fk_org_partner_enablement_organization'
          AND contype = 'f'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.organization_insurance_partner_enablement'::REGCLASS
          AND conname = 'fk_org_partner_enablement_partner'
          AND contype = 'f'
    ) THEN
        RAISE EXCEPTION 'Phase 7 Insurance Foundation validation failed: required aggregate foreign keys are missing.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'uq_insurance_partner_code_active'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'uq_insurance_partner_contact_primary_type_active'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'uq_insurance_product_plan_partner_code_active'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'uq_org_partner_enablement_active'
    ) THEN
        RAISE EXCEPTION 'Phase 7 Insurance Foundation validation failed: required unique indexes are missing.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.insurance_entities AS partner
        WHERE partner.created_by IS NULL
           OR partner.updated_by IS NULL
           OR partner.created_at IS NULL
           OR partner.updated_at IS NULL
           OR partner.partner_code IS NULL
           OR partner.display_name IS NULL
           OR partner.partner_type_reference_value_id IS NULL
           OR partner.operational_status_reference_value_id IS NULL
           OR partner.version < 1
           OR partner.deleted_at IS NOT NULL
           OR partner.is_deleted <> FALSE
    ) THEN
        RAISE EXCEPTION 'Phase 7 Insurance Foundation validation failed: compatibility Partner audit is not ready.';
    END IF;

    SELECT COUNT(*)
      INTO active_reference_value_count
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
    JOIN public.reference_categories AS category ON category.code = required_value.category_code
    JOIN public.reference_values AS value
      ON value.category_id = category.id
     AND value.organization_id IS NULL
     AND value.code = required_value.value_code
     AND value.is_active = TRUE
     AND value.deleted_at IS NULL
     AND COALESCE(value.is_deleted, FALSE) = FALSE;

    IF active_reference_value_count <> required_reference_value_count THEN
        RAISE EXCEPTION
            'Phase 7 Insurance Foundation validation failed: expected % controlled values, found %.',
            required_reference_value_count,
            active_reference_value_count;
    END IF;
END $$;

COMMIT;
