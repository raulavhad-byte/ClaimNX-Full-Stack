BEGIN;

-- Phase 7 amendment: independent Hospital–Payer Integration aggregate.
-- It stores non-secret Hospital-specific payer-routing configuration only.
-- Passwords, API tokens, mailbox secrets, and portal secrets must never be stored here.

DO $$
BEGIN
    IF to_regclass('public.hospitals') IS NULL
       OR to_regclass('public.insurance_entities') IS NULL
       OR to_regclass('public.organization_insurance_partner_enablement') IS NULL
       OR to_regclass('public.reference_values') IS NULL
       OR to_regclass('public.users') IS NULL THEN
        RAISE EXCEPTION 'Hospital–Payer Integration requires the approved Hospital, Insurance Foundation, Reference Data, IAM, and enablement tables.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'uq_hospitals_organization_hospital'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'hospitals'
              AND indexname = 'uq_hospitals_organization_hospital'
        ) THEN
            ALTER TABLE public.hospitals
                ADD CONSTRAINT uq_hospitals_organization_hospital
                UNIQUE USING INDEX uq_hospitals_organization_hospital;
        ELSE
            ALTER TABLE public.hospitals
                ADD CONSTRAINT uq_hospitals_organization_hospital
                UNIQUE (organization_id, id);
        END IF;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.hospital_insurance_partner_integration (
    hospital_insurance_partner_integration_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    hospital_id UUID NOT NULL,
    insurance_partner_id UUID NOT NULL,
    integration_code VARCHAR(80) NOT NULL,
    submission_channel_reference_value_id UUID NOT NULL,
    payer_email_address VARCHAR(320),
    notification_email_address VARCHAR(320),
    portal_url VARCHAR(2048),
    portal_user_name VARCHAR(255),
    credential_secret_reference VARCHAR(512),
    operational_status_reference_value_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_hospital_insurance_partner_integration
        PRIMARY KEY (hospital_insurance_partner_integration_id),
    CONSTRAINT fk_hospital_partner_integration_hospital_tenant
        FOREIGN KEY (organization_id, hospital_id)
        REFERENCES public.hospitals (organization_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_partner_integration_partner
        FOREIGN KEY (insurance_partner_id)
        REFERENCES public.insurance_entities (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_partner_integration_channel
        FOREIGN KEY (submission_channel_reference_value_id)
        REFERENCES public.reference_values (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_partner_integration_status
        FOREIGN KEY (operational_status_reference_value_id)
        REFERENCES public.reference_values (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_partner_integration_created_by_user
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_partner_integration_updated_by_user
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_partner_integration_deleted_by_user
        FOREIGN KEY (deleted_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_hospital_partner_integration_version
        CHECK (version >= 1),
    CONSTRAINT ck_hospital_partner_integration_code_not_blank
        CHECK (BTRIM(integration_code) <> ''),
    CONSTRAINT ck_hospital_partner_integration_payer_email_not_blank
        CHECK (payer_email_address IS NULL OR BTRIM(payer_email_address) <> ''),
    CONSTRAINT ck_hospital_partner_integration_notification_email_not_blank
        CHECK (notification_email_address IS NULL OR BTRIM(notification_email_address) <> ''),
    CONSTRAINT ck_hospital_partner_integration_portal_url
        CHECK (portal_url IS NULL OR (BTRIM(portal_url) <> '' AND LOWER(BTRIM(portal_url)) LIKE 'https://%')),
    CONSTRAINT ck_hospital_partner_integration_portal_user_not_blank
        CHECK (portal_user_name IS NULL OR BTRIM(portal_user_name) <> ''),
    CONSTRAINT ck_hospital_partner_integration_secret_reference_not_blank
        CHECK (credential_secret_reference IS NULL OR BTRIM(credential_secret_reference) <> ''),
    CONSTRAINT ck_hospital_partner_integration_soft_delete_audit
        CHECK (
            (deleted_at IS NULL AND deleted_by IS NULL)
            OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hospital_partner_integration_hospital_code_active
    ON public.hospital_insurance_partner_integration (hospital_id, integration_code)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hospital_partner_integration_hospital_partner_active
    ON public.hospital_insurance_partner_integration (hospital_id, insurance_partner_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hospital_partner_integration_organization_hospital_active
    ON public.hospital_insurance_partner_integration (organization_id, hospital_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hospital_partner_integration_partner_active
    ON public.hospital_insurance_partner_integration (insurance_partner_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hospital_partner_integration_status_active
    ON public.hospital_insurance_partner_integration (operational_status_reference_value_id)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE public.hospital_insurance_partner_integration IS
    'Phase 7 independent Hospital-specific Insurer or TPA routing configuration. Credentials are stored only as an external secret reference.';

COMMENT ON COLUMN public.hospital_insurance_partner_integration.credential_secret_reference IS
    'Opaque pointer to an approved external secret manager. Never store a password, token, or credential value in this column.';

COMMENT ON COLUMN public.hospital_insurance_partner_integration.organization_id IS
    'Persisted tenant scope. Composite foreign key guarantees the selected Hospital belongs to the same Organization.';

COMMIT;
