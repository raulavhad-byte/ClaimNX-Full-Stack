BEGIN;

-- Phase 8 additive evolution of the legacy Claim root. No legacy table is dropped.
DO $$
BEGIN
    IF to_regclass('public.claims') IS NULL
       OR to_regclass('public.hospitals') IS NULL
       OR to_regclass('public.organizations') IS NULL
       OR to_regclass('public.users') IS NULL
       OR to_regclass('public.reference_values') IS NULL
       OR to_regclass('public.hospital_insurance_partner_integration') IS NULL THEN
        RAISE EXCEPTION 'Phase 8 requires Claim, Hospital, Organization, IAM, Reference Data, and Hospital-Payer Integration tables.';
    END IF;
END $$;

ALTER TABLE public.claims
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS claim_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS claim_product_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS claim_type_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS lifecycle_status_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS hospital_insurance_partner_integration_id UUID,
    ADD COLUMN IF NOT EXISTS currency_code CHAR(3),
    ADD COLUMN IF NOT EXISTS total_claimed_amount NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS authorization_reference VARCHAR(120),
    ADD COLUMN IF NOT EXISTS external_submission_reference VARCHAR(200),
    ADD COLUMN IF NOT EXISTS closure_reason TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_by UUID,
    ADD COLUMN IF NOT EXISTS version INTEGER;

UPDATE public.claims claim
SET organization_id = hospital.organization_id
FROM public.hospitals hospital
WHERE claim.organization_id IS NULL
  AND claim.hospital_id = hospital.id;

UPDATE public.claims SET version = 1 WHERE version IS NULL OR version < 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.claims'::regclass AND conname = 'fk_claims_organization') THEN
        ALTER TABLE public.claims ADD CONSTRAINT fk_claims_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.claims'::regclass AND conname = 'fk_claims_product_reference_value') THEN
        ALTER TABLE public.claims ADD CONSTRAINT fk_claims_product_reference_value FOREIGN KEY (claim_product_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claims ADD CONSTRAINT fk_claims_type_reference_value FOREIGN KEY (claim_type_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claims ADD CONSTRAINT fk_claims_lifecycle_status_reference_value FOREIGN KEY (lifecycle_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claims ADD CONSTRAINT fk_claims_hospital_payer_integration FOREIGN KEY (hospital_insurance_partner_integration_id) REFERENCES public.hospital_insurance_partner_integration(hospital_insurance_partner_integration_id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claims ADD CONSTRAINT fk_claims_created_by_user FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claims ADD CONSTRAINT fk_claims_updated_by_user FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claims ADD CONSTRAINT fk_claims_deleted_by_user FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT NOT VALID;
    END IF;
END $$;

ALTER TABLE public.claims
    ALTER COLUMN version SET DEFAULT 1,
    ALTER COLUMN version SET NOT NULL;

ALTER TABLE public.claims
    ADD CONSTRAINT ck_claims_phase_8_version CHECK (version >= 1) NOT VALID,
    ADD CONSTRAINT ck_claims_phase_8_amounts_non_negative CHECK (
        (total_claimed_amount IS NULL OR total_claimed_amount >= 0)
        AND (approved_amount IS NULL OR approved_amount >= 0)
    ) NOT VALID,
    ADD CONSTRAINT ck_claims_phase_8_currency_code CHECK (currency_code IS NULL OR currency_code = UPPER(currency_code)) NOT VALID,
    ADD CONSTRAINT ck_claims_phase_8_active_audit CHECK (
        deleted_at IS NOT NULL OR COALESCE(is_deleted, FALSE) = TRUE
        OR (organization_id IS NOT NULL AND claim_number IS NOT NULL
            AND claim_product_reference_value_id IS NOT NULL
            AND claim_type_reference_value_id IS NOT NULL
            AND lifecycle_status_reference_value_id IS NOT NULL
            AND created_by IS NOT NULL AND updated_by IS NOT NULL)
    ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_claims_organization_claim_number_active
    ON public.claims (organization_id, claim_number)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_claims_organization_hospital_active
    ON public.claims (organization_id, hospital_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_claims_organization_product_status_active
    ON public.claims (organization_id, claim_product_reference_value_id, lifecycle_status_reference_value_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_claims_hospital_payer_integration_active
    ON public.claims (hospital_insurance_partner_integration_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

COMMENT ON TABLE public.claims IS 'Phase 8 Claim aggregate root. Legacy columns remain only for compatibility; active writes use tenant-scoped canonical columns.';
COMMENT ON COLUMN public.claims.claim_product_reference_value_id IS 'Immutable Claim Product reference. ICA is the Cashless and Pre-Authorization pathway.';
COMMENT ON COLUMN public.claims.hospital_insurance_partner_integration_id IS 'Approved non-secret Hospital-Payer route. No secret is stored on the Claim.';
COMMENT ON COLUMN public.claims.claim_number IS 'Immutable Organization-scoped ClaimNX business identifier allocated server-side.';

COMMIT;
