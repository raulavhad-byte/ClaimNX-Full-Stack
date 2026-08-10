BEGIN;

-- UUID values are application generated for business entities.
CREATE TABLE IF NOT EXISTS public.claim_number_sequences (
    organization_id UUID NOT NULL PRIMARY KEY REFERENCES public.organizations(id) ON DELETE RESTRICT,
    last_allocated_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_claim_number_sequences_non_negative CHECK (last_allocated_number >= 0)
);

CREATE TABLE IF NOT EXISTS public.claim_authorizations (
    claim_authorization_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    claim_id UUID NOT NULL,
    authorization_type_reference_value_id UUID NOT NULL,
    authorization_status_reference_value_id UUID NOT NULL,
    authorization_number VARCHAR(120),
    approved_amount NUMERIC(18,2),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_claim_authorizations PRIMARY KEY (claim_authorization_id),
    CONSTRAINT fk_claim_authorizations_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_authorizations_claim FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_authorizations_type FOREIGN KEY (authorization_type_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_authorizations_status FOREIGN KEY (authorization_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_authorizations_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_authorizations_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_authorizations_deleted_by FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_claim_authorizations_version CHECK (version >= 1),
    CONSTRAINT ck_claim_authorizations_number_not_blank CHECK (authorization_number IS NULL OR BTRIM(authorization_number) <> ''),
    CONSTRAINT ck_claim_authorizations_amount_non_negative CHECK (approved_amount IS NULL OR approved_amount >= 0),
    CONSTRAINT ck_claim_authorizations_validity CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from),
    CONSTRAINT ck_claim_authorizations_soft_delete_audit CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.claim_queries (
    claim_query_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    claim_id UUID NOT NULL,
    query_type_reference_value_id UUID NOT NULL,
    query_status_reference_value_id UUID NOT NULL,
    payer_query_reference VARCHAR(160),
    query_text TEXT NOT NULL,
    response_text TEXT,
    raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_claim_queries PRIMARY KEY (claim_query_id),
    CONSTRAINT fk_claim_queries_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_queries_claim FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_queries_type FOREIGN KEY (query_type_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_queries_status FOREIGN KEY (query_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_queries_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_queries_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_queries_deleted_by FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_claim_queries_version CHECK (version >= 1),
    CONSTRAINT ck_claim_queries_text_not_blank CHECK (BTRIM(query_text) <> ''),
    CONSTRAINT ck_claim_queries_reference_not_blank CHECK (payer_query_reference IS NULL OR BTRIM(payer_query_reference) <> ''),
    CONSTRAINT ck_claim_queries_soft_delete_audit CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.claim_submission_intents (
    claim_submission_intent_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    claim_id UUID NOT NULL,
    hospital_insurance_partner_integration_id UUID NOT NULL,
    channel_reference_value_id UUID NOT NULL,
    submission_status_reference_value_id UUID NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_submitted_at TIMESTAMPTZ,
    external_submission_reference VARCHAR(200),
    failure_reason TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_claim_submission_intents PRIMARY KEY (claim_submission_intent_id),
    CONSTRAINT fk_claim_submission_intents_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_submission_intents_claim FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_submission_intents_integration FOREIGN KEY (hospital_insurance_partner_integration_id) REFERENCES public.hospital_insurance_partner_integration(hospital_insurance_partner_integration_id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_submission_intents_channel FOREIGN KEY (channel_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_submission_intents_status FOREIGN KEY (submission_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_submission_intents_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_submission_intents_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_submission_intents_deleted_by FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_claim_submission_intents_version CHECK (version >= 1),
    CONSTRAINT ck_claim_submission_intents_external_reference_not_blank CHECK (external_submission_reference IS NULL OR BTRIM(external_submission_reference) <> ''),
    CONSTRAINT ck_claim_submission_intents_soft_delete_audit CHECK ((deleted_at IS NULL AND deleted_by IS NULL) OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_claim_authorizations_organization_claim_active ON public.claim_authorizations (organization_id, claim_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_authorizations_claim_number_active ON public.claim_authorizations (claim_id, authorization_number) WHERE deleted_at IS NULL AND authorization_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claim_queries_organization_claim_active ON public.claim_queries (organization_id, claim_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_claim_queries_organization_status_active ON public.claim_queries (organization_id, query_status_reference_value_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_claim_submission_intents_organization_claim_active ON public.claim_submission_intents (organization_id, claim_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_claim_submission_intents_claim_open_active ON public.claim_submission_intents (claim_id) WHERE deleted_at IS NULL AND verified_submitted_at IS NULL;

CREATE OR REPLACE FUNCTION public.allocate_claim_number(p_organization_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE v_next_number BIGINT;
BEGIN
    INSERT INTO public.claim_number_sequences (organization_id, last_allocated_number)
    VALUES (p_organization_id, 0)
    ON CONFLICT (organization_id) DO NOTHING;

    UPDATE public.claim_number_sequences
       SET last_allocated_number = last_allocated_number + 1,
           updated_at = NOW()
     WHERE organization_id = p_organization_id
     RETURNING last_allocated_number INTO v_next_number;

    RETURN 'CLM-' || LPAD(v_next_number::TEXT, 10, '0');
END;
$$;

COMMENT ON FUNCTION public.allocate_claim_number(UUID) IS 'Allocates a non-reusable Organization-scoped ClaimNX Claim Number in the active database transaction.';
COMMENT ON TABLE public.claim_submission_intents IS 'Non-secret Claim submission request and verified-delivery evidence. It does not store credentials or payloads.';

COMMIT;
