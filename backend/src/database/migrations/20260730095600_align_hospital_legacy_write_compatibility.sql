BEGIN;

-- Phase 5 compatibility correction for new Hospital writes.
-- The legacy columns remain populated until the legacy API is retired, while
-- active uniqueness is governed by the Organization-scoped Phase 5 indexes.

DO $$
DECLARE
    legacy_unique_constraint RECORD;
BEGIN
    FOR legacy_unique_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) LIKE '%(hospital_code)%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.hospitals DROP CONSTRAINT %I',
            legacy_unique_constraint.conname
        );
    END LOOP;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'chk_hospitals_status'
    ) THEN
        ALTER TABLE public.hospitals
            DROP CONSTRAINT chk_hospitals_status;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.hospitals'::regclass
          AND conname = 'ck_hospitals_legacy_status'
    ) THEN
        ALTER TABLE public.hospitals
            ADD CONSTRAINT ck_hospitals_legacy_status
            CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED'));
    END IF;
END $$;

COMMENT ON COLUMN public.hospitals.hospital_name IS
    'Legacy compatibility column. New Phase 5 writes mirror display_name until legacy API retirement.';

COMMENT ON COLUMN public.hospitals.hospital_type IS
    'Legacy compatibility column. New Phase 5 writes mirror the approved Hospital Type display value.';

COMMENT ON COLUMN public.hospitals.status IS
    'Legacy compatibility column. New Phase 5 writes mirror the Operational Status reference code.';

COMMIT;
