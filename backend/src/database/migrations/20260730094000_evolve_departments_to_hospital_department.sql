BEGIN;

-- Phase 5 Hospital Department compatibility evolution.
-- The legacy table is empty. It is renamed in place so the existing
-- hospital_members foreign key remains valid and no table is dropped.

DO $$
BEGIN
    IF to_regclass('public.departments') IS NULL
       AND to_regclass('public.hospital_department') IS NULL THEN
        RAISE EXCEPTION 'Neither public.departments nor public.hospital_department exists.';
    END IF;

    IF to_regclass('public.departments') IS NOT NULL
       AND to_regclass('public.hospital_department') IS NOT NULL THEN
        RAISE EXCEPTION 'Both legacy and target Department tables exist; manual review is required.';
    END IF;

    IF to_regclass('public.departments') IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.departments) THEN
        RAISE EXCEPTION 'Legacy departments contains data. A reviewed data migration is required before evolution.';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.departments') IS NOT NULL THEN
        ALTER TABLE public.departments RENAME TO hospital_department;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hospital_department'
          AND column_name = 'id'
    ) THEN
        ALTER TABLE public.hospital_department
            RENAME COLUMN id TO hospital_department_id;
    END IF;
END $$;

ALTER TABLE public.hospital_department
    ALTER COLUMN department_code TYPE VARCHAR(50),
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN updated_by SET NOT NULL;

ALTER TABLE public.hospital_department
    ADD COLUMN IF NOT EXISTS department_type_reference_value_id UUID,
    ADD COLUMN IF NOT EXISTS operational_status_reference_value_id UUID;

DO $$
DECLARE
    legacy_status_constraint TEXT;
BEGIN
    SELECT constraint_name
    INTO legacy_status_constraint
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'hospital_department'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'chk_departments_status';

    IF legacy_status_constraint IS NOT NULL THEN
        ALTER TABLE public.hospital_department
            RENAME CONSTRAINT chk_departments_status
            TO ck_hospital_department_legacy_status;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'departments_pkey'
    ) THEN
        ALTER TABLE public.hospital_department
            RENAME CONSTRAINT departments_pkey TO pk_hospital_department;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'fk_departments_hospital'
    ) THEN
        ALTER TABLE public.hospital_department
            RENAME CONSTRAINT fk_departments_hospital
            TO fk_hospital_department_hospital;
    END IF;
END $$;

DO $$
DECLARE
    legacy_unique_constraint RECORD;
BEGIN
    FOR legacy_unique_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) LIKE '%department_code%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.hospital_department DROP CONSTRAINT %I',
            legacy_unique_constraint.conname
        );
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'fk_hospital_department_department_type'
    ) THEN
        ALTER TABLE public.hospital_department
            ADD CONSTRAINT fk_hospital_department_department_type
            FOREIGN KEY (department_type_reference_value_id)
            REFERENCES public.reference_values(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'fk_hospital_department_operational_status'
    ) THEN
        ALTER TABLE public.hospital_department
            ADD CONSTRAINT fk_hospital_department_operational_status
            FOREIGN KEY (operational_status_reference_value_id)
            REFERENCES public.reference_values(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'fk_hospital_department_created_by_user'
    ) THEN
        ALTER TABLE public.hospital_department
            ADD CONSTRAINT fk_hospital_department_created_by_user
            FOREIGN KEY (created_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'fk_hospital_department_updated_by_user'
    ) THEN
        ALTER TABLE public.hospital_department
            ADD CONSTRAINT fk_hospital_department_updated_by_user
            FOREIGN KEY (updated_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'fk_hospital_department_deleted_by_user'
    ) THEN
        ALTER TABLE public.hospital_department
            ADD CONSTRAINT fk_hospital_department_deleted_by_user
            FOREIGN KEY (deleted_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'ck_hospital_department_version'
    ) THEN
        ALTER TABLE public.hospital_department
            ADD CONSTRAINT ck_hospital_department_version
            CHECK (version >= 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospital_department'::regclass
          AND conname = 'ck_hospital_department_deleted_audit_pair'
    ) THEN
        ALTER TABLE public.hospital_department
            ADD CONSTRAINT ck_hospital_department_deleted_audit_pair
            CHECK (
                (deleted_at IS NULL AND deleted_by IS NULL)
                OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
            );
    END IF;
END $$;

ALTER TABLE public.hospital_department
    ALTER COLUMN operational_status_reference_value_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hospital_department_hospital_active
    ON public.hospital_department (hospital_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_hospital_department_operational_status_active
    ON public.hospital_department (operational_status_reference_value_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hospital_department_hospital_department_code_active
    ON public.hospital_department (hospital_id, department_code)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hospital_department_hospital_department_name_active
    ON public.hospital_department (hospital_id, department_name)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

COMMENT ON TABLE public.hospital_department IS
    'Hospital Aggregate child entity for operational departments. Evolved in place from legacy public.departments.';

COMMENT ON COLUMN public.hospital_department.status IS
    'Legacy status retained only for backward compatibility. New application writes use operational_status_reference_value_id.';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.hospital_department) THEN
        RAISE EXCEPTION 'Hospital Department evolution expected an empty legacy table.';
    END IF;
END $$;

COMMIT;
