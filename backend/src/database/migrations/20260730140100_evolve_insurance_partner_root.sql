BEGIN;

-- Phase 7: additive evolution of the legacy Insurance Partner root.
-- Compatibility boundary: public.claims.payer_id references
-- public.insurance_entities(id). This migration retains the table, all
-- existing UUIDs, legacy columns, and existing Claim foreign key.

DO $$
BEGIN
    IF to_regclass('public.insurance_entities') IS NULL THEN
        RAISE EXCEPTION 'Phase 7 Insurance migration failed: public.insurance_entities does not exist.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint AS constraint_record
        WHERE constraint_record.conrelid = 'public.claims'::REGCLASS
          AND constraint_record.contype = 'f'
          AND constraint_record.confrelid = 'public.insurance_entities'::REGCLASS
          AND constraint_record.conname = 'claims_payer_id_fkey'
    ) THEN
        RAISE EXCEPTION 'Phase 7 Insurance migration failed: claims.payer_id compatibility foreign key is missing.';
    END IF;

    IF (SELECT COUNT(*) FROM public.insurance_entities) <> 1 THEN
        RAISE EXCEPTION
            'Phase 7 Insurance migration expected exactly one reviewed legacy Partner record; found %.',
            (SELECT COUNT(*) FROM public.insurance_entities);
    END IF;
END $$;

ALTER TABLE public.insurance_entities
    ADD COLUMN IF NOT EXISTS partner_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS legal_name VARCHAR(300),
    ADD COLUMN IF NOT EXISTS partner_type_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS operational_status_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Deterministic mapping from the reviewed legacy Blue Cross record.
UPDATE public.insurance_entities AS partner
SET display_name = BTRIM(partner.name),
    partner_code = 'BLUE_CROSS',
    partner_type_reference_value_id = (
        SELECT value.id
        FROM public.reference_categories AS category
        JOIN public.reference_values AS value
          ON value.category_id = category.id
        WHERE category.code = 'INSURANCE_PARTNER_TYPE'
          AND value.organization_id IS NULL
          AND value.code = 'INSURER'
          AND value.is_active = TRUE
          AND value.deleted_at IS NULL
          AND COALESCE(value.is_deleted, FALSE) = FALSE
        LIMIT 1
    ),
    operational_status_reference_value_id = (
        SELECT value.id
        FROM public.reference_categories AS category
        JOIN public.reference_values AS value
          ON value.category_id = category.id
        WHERE category.code = 'INSURANCE_PARTNER_STATUS'
          AND value.organization_id IS NULL
          AND value.code = 'ACTIVE'
          AND value.is_active = TRUE
          AND value.deleted_at IS NULL
          AND COALESCE(value.is_deleted, FALSE) = FALSE
        LIMIT 1
    ),
    is_deleted = FALSE,
    version = GREATEST(COALESCE(partner.version, 1), 1)
WHERE partner.name = 'Blue Cross';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.insurance_entities AS partner
        WHERE NULLIF(BTRIM(partner.partner_code), '') IS NULL
           OR NULLIF(BTRIM(partner.display_name), '') IS NULL
           OR partner.partner_type_reference_value_id IS NULL
           OR partner.operational_status_reference_value_id IS NULL
           OR partner.version IS NULL
           OR partner.version < 1
           OR partner.deleted_at IS NOT NULL
           OR COALESCE(partner.is_deleted, FALSE) = TRUE
    ) THEN
        RAISE EXCEPTION
            'Phase 7 Insurance Partner mapping failed. Resolve legacy records or Reference Data before continuing.';
    END IF;
END $$;

COMMENT ON TABLE public.insurance_entities IS
    'Phase 7 Insurance Partner platform master. Existing table identity and Claim payer references are retained for compatibility.';

COMMENT ON COLUMN public.insurance_entities.name IS
    'Legacy compatibility column. New Phase 7 writes use display_name and mirror only where a legacy API requires it.';

COMMENT ON COLUMN public.insurance_entities.type IS
    'Legacy compatibility column. New Phase 7 writes use partner_type_reference_value_id.';

COMMENT ON COLUMN public.insurance_entities.partner_code IS
    'Phase 7 canonical platform Insurance Partner code. Active uniqueness is added after audit remediation.';

COMMENT ON COLUMN public.insurance_entities.display_name IS
    'Phase 7 canonical platform Insurance Partner display name.';

COMMIT;
