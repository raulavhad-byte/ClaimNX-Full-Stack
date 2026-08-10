BEGIN;

-- Phase 7: Insurance Foundation child and independent aggregate tables.
-- UUID values are supplied by the application layer; no business UUID column
-- in these tables has a database-generated default.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.insurance_entities
        WHERE partner_code IS NOT NULL
          AND display_name IS NOT NULL
          AND partner_type_reference_value_id IS NOT NULL
          AND operational_status_reference_value_id IS NOT NULL
          AND created_by IS NOT NULL
          AND updated_by IS NOT NULL
          AND deleted_at IS NULL
          AND is_deleted = FALSE
          AND version >= 1
    ) THEN
        RAISE EXCEPTION 'Phase 7 Insurance Foundation requires one active, remediated Insurance Partner root.';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM public.reference_values AS value
        JOIN public.reference_categories AS category ON category.id = value.category_id
        WHERE category.code IN (
            'INSURANCE_CONTACT_TYPE',
            'INSURANCE_PLAN_STATUS',
            'ORGANIZATION_PARTNER_ENABLEMENT_STATUS'
        )
          AND value.organization_id IS NULL
          AND value.is_active = TRUE
          AND value.deleted_at IS NULL
          AND COALESCE(value.is_deleted, FALSE) = FALSE
    ) < 9 THEN
        RAISE EXCEPTION 'Phase 7 Insurance Foundation required Reference Data is incomplete.';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.insurance_partner_contact (
    insurance_partner_contact_id UUID NOT NULL,
    insurance_partner_id UUID NOT NULL,
    contact_type_reference_value_id UUID NOT NULL,
    contact_name VARCHAR(200) NOT NULL,
    designation VARCHAR(150),
    email_address VARCHAR(320),
    phone_number VARCHAR(30) NOT NULL,
    mobile_number VARCHAR(30),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_insurance_partner_contact PRIMARY KEY (insurance_partner_contact_id),
    CONSTRAINT fk_insurance_partner_contact_partner
        FOREIGN KEY (insurance_partner_id) REFERENCES public.insurance_entities(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_partner_contact_type
        FOREIGN KEY (contact_type_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_partner_contact_created_by_user
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_partner_contact_updated_by_user
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_partner_contact_deleted_by_user
        FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_insurance_partner_contact_version CHECK (version >= 1),
    CONSTRAINT ck_insurance_partner_contact_name_not_blank CHECK (BTRIM(contact_name) <> ''),
    CONSTRAINT ck_insurance_partner_contact_phone_not_blank CHECK (BTRIM(phone_number) <> '')
);

CREATE TABLE IF NOT EXISTS public.insurance_product_plan (
    insurance_product_plan_id UUID NOT NULL,
    insurance_partner_id UUID NOT NULL,
    plan_code VARCHAR(80) NOT NULL,
    plan_name VARCHAR(200) NOT NULL,
    description TEXT,
    operational_status_reference_value_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_insurance_product_plan PRIMARY KEY (insurance_product_plan_id),
    CONSTRAINT fk_insurance_product_plan_partner
        FOREIGN KEY (insurance_partner_id) REFERENCES public.insurance_entities(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_product_plan_status
        FOREIGN KEY (operational_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_product_plan_created_by_user
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_product_plan_updated_by_user
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_product_plan_deleted_by_user
        FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_insurance_product_plan_version CHECK (version >= 1),
    CONSTRAINT ck_insurance_product_plan_code_not_blank CHECK (BTRIM(plan_code) <> ''),
    CONSTRAINT ck_insurance_product_plan_name_not_blank CHECK (BTRIM(plan_name) <> '')
);

CREATE TABLE IF NOT EXISTS public.organization_insurance_partner_enablement (
    organization_insurance_partner_enablement_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    insurance_partner_id UUID NOT NULL,
    tenant_partner_code VARCHAR(80),
    operational_status_reference_value_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_org_insurance_partner_enablement PRIMARY KEY (organization_insurance_partner_enablement_id),
    CONSTRAINT fk_org_partner_enablement_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_org_partner_enablement_partner
        FOREIGN KEY (insurance_partner_id) REFERENCES public.insurance_entities(id) ON DELETE RESTRICT,
    CONSTRAINT fk_org_partner_enablement_status
        FOREIGN KEY (operational_status_reference_value_id) REFERENCES public.reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_org_partner_enablement_created_by_user
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_org_partner_enablement_updated_by_user
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_org_partner_enablement_deleted_by_user
        FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_org_partner_enablement_version CHECK (version >= 1),
    CONSTRAINT ck_org_partner_enablement_code_not_blank
        CHECK (tenant_partner_code IS NULL OR BTRIM(tenant_partner_code) <> '')
);

CREATE INDEX IF NOT EXISTS idx_insurance_partner_contact_partner_active
    ON public.insurance_partner_contact (insurance_partner_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_insurance_partner_contact_primary_type_active
    ON public.insurance_partner_contact (insurance_partner_id, contact_type_reference_value_id)
    WHERE deleted_at IS NULL AND is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_insurance_product_plan_partner_active
    ON public.insurance_product_plan (insurance_partner_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_product_plan_status_active
    ON public.insurance_product_plan (operational_status_reference_value_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_insurance_product_plan_partner_code_active
    ON public.insurance_product_plan (insurance_partner_id, plan_code)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_insurance_product_plan_partner_name_active
    ON public.insurance_product_plan (insurance_partner_id, LOWER(BTRIM(plan_name)))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_partner_enablement_organization_active
    ON public.organization_insurance_partner_enablement (organization_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_partner_enablement_partner_active
    ON public.organization_insurance_partner_enablement (insurance_partner_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_partner_enablement_active
    ON public.organization_insurance_partner_enablement (organization_id, insurance_partner_id)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE public.insurance_partner_contact IS
    'Phase 7 child Contact entity owned by the Insurance Partner aggregate.';

COMMENT ON TABLE public.insurance_product_plan IS
    'Phase 7 independent Insurance Product Plan aggregate; benefits and coverage are explicitly out of scope.';

COMMENT ON TABLE public.organization_insurance_partner_enablement IS
    'Phase 7 tenant-scoped authorization to operationally use a platform Insurance Partner.';

COMMIT;
