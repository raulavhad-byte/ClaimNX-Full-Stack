BEGIN;

-- Phase 5 Hospital root integrity omitted from the initial compatibility evolution.
-- This migration is additive and validates all existing root records before
-- enforcing the approved foreign-key and active-uniqueness rules.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.hospitals
        WHERE NULLIF(BTRIM(hospital_code), '') IS NULL
           OR NULLIF(BTRIM(display_name), '') IS NULL
           OR hospital_type_reference_value_id IS NULL
           OR operational_status_reference_value_id IS NULL
           OR created_by IS NULL
           OR updated_by IS NULL
    ) THEN
        RAISE EXCEPTION 'Hospital root integrity cannot be enforced until reference and audit values are complete.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.hospitals hospital
        LEFT JOIN public.reference_values hospital_type
            ON hospital_type.id = hospital.hospital_type_reference_value_id
        LEFT JOIN public.reference_values operational_status
            ON operational_status.id = hospital.operational_status_reference_value_id
        LEFT JOIN public.reference_values ownership_type
            ON ownership_type.id = hospital.ownership_type_reference_value_id
        LEFT JOIN public.users created_user
            ON created_user.id = hospital.created_by
        LEFT JOIN public.users updated_user
            ON updated_user.id = hospital.updated_by
        LEFT JOIN public.users deleted_user
            ON deleted_user.id = hospital.deleted_by
        WHERE hospital_type.id IS NULL
           OR operational_status.id IS NULL
           OR (hospital.ownership_type_reference_value_id IS NOT NULL AND ownership_type.id IS NULL)
           OR created_user.id IS NULL
           OR updated_user.id IS NULL
           OR (hospital.deleted_by IS NOT NULL AND deleted_user.id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Hospital root contains invalid Reference Data or audit-user references.';
    END IF;
END $$;

ALTER TABLE public.hospitals
    ALTER COLUMN hospital_code SET NOT NULL,
    ALTER COLUMN display_name SET NOT NULL,
    ALTER COLUMN hospital_type_reference_value_id SET NOT NULL,
    ALTER COLUMN operational_status_reference_value_id SET NOT NULL,
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN updated_by SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'fk_hospitals_hospital_type'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT fk_hospitals_hospital_type
            FOREIGN KEY (hospital_type_reference_value_id)
            REFERENCES public.reference_values(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'fk_hospitals_ownership_type'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT fk_hospitals_ownership_type
            FOREIGN KEY (ownership_type_reference_value_id)
            REFERENCES public.reference_values(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'fk_hospitals_operational_status'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT fk_hospitals_operational_status
            FOREIGN KEY (operational_status_reference_value_id)
            REFERENCES public.reference_values(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'fk_hospitals_created_by_user'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT fk_hospitals_created_by_user
            FOREIGN KEY (created_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'fk_hospitals_updated_by_user'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT fk_hospitals_updated_by_user
            FOREIGN KEY (updated_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'fk_hospitals_deleted_by_user'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT fk_hospitals_deleted_by_user
            FOREIGN KEY (deleted_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'ck_hospitals_version'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT ck_hospitals_version
            CHECK (version >= 1);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hospitals_organization_hospital_code_active
    ON public.hospitals (organization_id, hospital_code)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hospitals_organization_hospital_name_active
    ON public.hospitals (organization_id, display_name)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_hospitals_organization_active
    ON public.hospitals (organization_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

COMMIT;
