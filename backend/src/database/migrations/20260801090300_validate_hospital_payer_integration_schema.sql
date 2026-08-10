BEGIN;

-- Post-migration architecture gate. This is intentionally read-only except for
-- raising an exception if the approved Hospital–Payer Integration model is incomplete.

DO $$
DECLARE
    v_reference_value_count INTEGER;
BEGIN
    IF to_regclass('public.hospital_insurance_partner_integration') IS NULL THEN
        RAISE EXCEPTION 'Hospital–Payer Integration table was not created.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hospital_insurance_partner_integration'
          AND column_name = 'organization_id'
          AND is_nullable = 'NO'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hospital_insurance_partner_integration'
          AND column_name = 'credential_secret_reference'
    ) OR EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hospital_insurance_partner_integration'
          AND (
              column_name ILIKE '%password%'
              OR column_name ILIKE '%token%'
              OR column_name ILIKE '%secret_value%'
          )
    ) THEN
        RAISE EXCEPTION 'Hospital–Payer Integration secret and tenant column design is invalid.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'uq_hospitals_organization_hospital'
          AND contype = 'u'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_insurance_partner_integration'::regclass
          AND conname = 'fk_hospital_partner_integration_hospital_tenant'
          AND contype = 'f'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_insurance_partner_integration'::regclass
          AND conname = 'ck_hospital_partner_integration_soft_delete_audit'
          AND contype = 'c'
    ) THEN
        RAISE EXCEPTION 'Hospital–Payer Integration tenancy or soft-delete constraints are incomplete.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_hospital_partner_integration_hospital_code_active'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_hospital_partner_integration_hospital_partner_active'
    ) THEN
        RAISE EXCEPTION 'Hospital–Payer Integration active uniqueness indexes are incomplete.';
    END IF;

    SELECT COUNT(*) INTO v_reference_value_count
    FROM public.reference_values AS value
    JOIN public.reference_categories AS category ON category.id = value.category_id
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

    IF v_reference_value_count <> 6 THEN
        RAISE EXCEPTION 'Hospital–Payer Integration required reference values are incomplete. Found %.', v_reference_value_count;
    END IF;
END;
$$;

COMMIT;
