BEGIN;

-- Phase 7: remediate legacy Insurance Partner audit fields and enforce the
-- approved root constraints. The migration chooses exactly one active,
-- non-deleted Super Admin as the audited migration actor. It fails rather than
-- choosing arbitrarily when that portable bootstrap condition is not met.

DO $$
DECLARE
    migration_actor_user_id UUID;
    super_admin_count INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO super_admin_count
    FROM public.users AS user_record
    JOIN public.roles AS role_record
      ON role_record.id = user_record.role_id
    WHERE LOWER(BTRIM(role_record.name)) = 'super admin'
      AND LOWER(BTRIM(user_record.status)) = 'active'
      AND COALESCE(user_record.is_deleted, FALSE) = FALSE;

    IF super_admin_count <> 1 THEN
        RAISE EXCEPTION
            'Phase 7 Insurance audit remediation requires exactly one active Super Admin; found %.',
            super_admin_count;
    END IF;

    SELECT user_record.id
      INTO migration_actor_user_id
    FROM public.users AS user_record
    JOIN public.roles AS role_record
      ON role_record.id = user_record.role_id
    WHERE LOWER(BTRIM(role_record.name)) = 'super admin'
      AND LOWER(BTRIM(user_record.status)) = 'active'
      AND COALESCE(user_record.is_deleted, FALSE) = FALSE;

    UPDATE public.insurance_entities AS partner
    SET created_by = COALESCE(partner.created_by, migration_actor_user_id),
        updated_by = COALESCE(partner.updated_by, migration_actor_user_id),
        created_at = COALESCE(partner.created_at, NOW()),
        updated_at = COALESCE(partner.updated_at, NOW()),
        is_deleted = COALESCE(partner.is_deleted, FALSE),
        version = GREATEST(COALESCE(partner.version, 1), 1)
    WHERE partner.created_by IS NULL
       OR partner.updated_by IS NULL
       OR partner.created_at IS NULL
       OR partner.updated_at IS NULL
       OR partner.is_deleted IS NULL
       OR partner.version IS NULL
       OR partner.version < 1;

    IF EXISTS (
        SELECT 1
        FROM public.insurance_entities AS partner
        WHERE partner.created_by IS NULL
           OR partner.updated_by IS NULL
           OR partner.created_at IS NULL
           OR partner.updated_at IS NULL
           OR partner.partner_type_reference_value_id IS NULL
           OR partner.operational_status_reference_value_id IS NULL
           OR NULLIF(BTRIM(partner.partner_code), '') IS NULL
           OR NULLIF(BTRIM(partner.display_name), '') IS NULL
           OR partner.version IS NULL
           OR partner.version < 1
           OR (partner.deleted_at IS NULL AND COALESCE(partner.is_deleted, FALSE) = TRUE)
           OR (partner.deleted_at IS NOT NULL AND COALESCE(partner.is_deleted, FALSE) = FALSE)
    ) THEN
        RAISE EXCEPTION 'Phase 7 Insurance Partner audit remediation did not complete successfully.';
    END IF;
END $$;

ALTER TABLE public.insurance_entities
    ALTER COLUMN partner_code SET NOT NULL,
    ALTER COLUMN display_name SET NOT NULL,
    ALTER COLUMN partner_type_reference_value_id SET NOT NULL,
    ALTER COLUMN operational_status_reference_value_id SET NOT NULL,
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_by SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN is_deleted SET NOT NULL,
    ALTER COLUMN version SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.insurance_entities'::REGCLASS
          AND conname = 'fk_insurance_partner_type'
    ) THEN
        ALTER TABLE public.insurance_entities
            ADD CONSTRAINT fk_insurance_partner_type
                FOREIGN KEY (partner_type_reference_value_id)
                REFERENCES public.reference_values(id)
                ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.insurance_entities'::REGCLASS
          AND conname = 'fk_insurance_partner_status'
    ) THEN
        ALTER TABLE public.insurance_entities
            ADD CONSTRAINT fk_insurance_partner_status
                FOREIGN KEY (operational_status_reference_value_id)
                REFERENCES public.reference_values(id)
                ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.insurance_entities'::REGCLASS
          AND conname = 'fk_insurance_partner_created_by_user'
    ) THEN
        ALTER TABLE public.insurance_entities
            ADD CONSTRAINT fk_insurance_partner_created_by_user
                FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
            ADD CONSTRAINT fk_insurance_partner_updated_by_user
                FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
            ADD CONSTRAINT fk_insurance_partner_deleted_by_user
                FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.insurance_entities'::REGCLASS
          AND conname = 'ck_insurance_partner_version'
    ) THEN
        ALTER TABLE public.insurance_entities
            ADD CONSTRAINT ck_insurance_partner_version CHECK (version >= 1),
            ADD CONSTRAINT ck_insurance_partner_code_not_blank CHECK (BTRIM(partner_code) <> ''),
            ADD CONSTRAINT ck_insurance_partner_display_name_not_blank CHECK (BTRIM(display_name) <> ''),
            ADD CONSTRAINT ck_insurance_partner_soft_delete_consistency
                CHECK (
                    (deleted_at IS NULL AND is_deleted = FALSE)
                    OR (deleted_at IS NOT NULL AND is_deleted = TRUE)
                );
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_insurance_partner_code_active
    ON public.insurance_entities (partner_code)
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_insurance_partner_display_name_active
    ON public.insurance_entities (LOWER(BTRIM(display_name)))
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_insurance_partner_status_active
    ON public.insurance_entities (operational_status_reference_value_id)
    WHERE deleted_at IS NULL AND is_deleted = FALSE;

COMMENT ON COLUMN public.insurance_entities.created_by IS
    'Phase 7 required creation audit actor. Legacy records are remediated by the approved migration actor.';

COMMENT ON COLUMN public.insurance_entities.version IS
    'Phase 7 optimistic-concurrency version. Starts at 1 and increments on every successful mutable command.';

COMMIT;
