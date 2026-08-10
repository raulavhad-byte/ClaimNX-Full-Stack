BEGIN;

-- Retain the legacy physical table while introducing its canonical Phase 8 role.
ALTER TABLE public.claim_stages
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS claim_product_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS from_lifecycle_status_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS to_lifecycle_status_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS transition_reason TEXT,
    ADD COLUMN IF NOT EXISTS actor_user_id UUID,
    ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS event_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version INTEGER;

UPDATE public.claim_stages
   SET occurred_at = COALESCE(occurred_at, created_at),
       event_data = COALESCE(event_data, stage_data, '{}'::JSONB),
       actor_user_id = COALESCE(actor_user_id, user_id),
       version = COALESCE(version, 1)
 WHERE occurred_at IS NULL OR actor_user_id IS NULL OR version IS NULL;

ALTER TABLE public.claim_stages
    ALTER COLUMN version SET DEFAULT 1,
    ALTER COLUMN version SET NOT NULL,
    ALTER COLUMN occurred_at SET DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.claim_stages'::regclass AND conname = 'fk_claim_stages_organization') THEN
        ALTER TABLE public.claim_stages ADD CONSTRAINT fk_claim_stages_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claim_stages ADD CONSTRAINT fk_claim_stages_product FOREIGN KEY (claim_product_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claim_stages ADD CONSTRAINT fk_claim_stages_from_lifecycle FOREIGN KEY (from_lifecycle_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claim_stages ADD CONSTRAINT fk_claim_stages_to_lifecycle FOREIGN KEY (to_lifecycle_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claim_stages ADD CONSTRAINT fk_claim_stages_actor FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claim_stages ADD CONSTRAINT fk_claim_stages_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claim_stages ADD CONSTRAINT fk_claim_stages_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT NOT VALID;
        ALTER TABLE public.claim_stages ADD CONSTRAINT fk_claim_stages_deleted_by FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT NOT VALID;
    END IF;
END $$;

ALTER TABLE public.claim_stages
    ADD CONSTRAINT ck_claim_stages_phase_8_version CHECK (version >= 1) NOT VALID,
    ADD CONSTRAINT ck_claim_stages_phase_8_active_audit CHECK (
        organization_id IS NULL
        OR (actor_user_id IS NOT NULL AND created_by IS NOT NULL AND updated_by IS NOT NULL
            AND claim_product_reference_value_id IS NOT NULL
            AND to_lifecycle_status_reference_value_id IS NOT NULL)
    ) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_claim_stages_organization_claim_occurred
    ON public.claim_stages (organization_id, claim_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_claim_status_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Claim Status History is append-only. UPDATE and DELETE are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_stages_append_only ON public.claim_stages;
CREATE TRIGGER trg_claim_stages_append_only
BEFORE UPDATE OR DELETE ON public.claim_stages
FOR EACH ROW EXECUTE FUNCTION public.prevent_claim_status_history_mutation();

COMMENT ON TABLE public.claim_stages IS 'Phase 8 append-only Claim Status History compatibility table. Legacy columns are retained for historical reads.';
COMMENT ON COLUMN public.claim_stages.event_data IS 'Non-secret structured transition context. Credentials, tokens, and external payloads are prohibited.';

COMMIT;
