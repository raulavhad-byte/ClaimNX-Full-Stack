-- ============================================================================
-- ClaimNX Phase 5: Organization Member Management
-- Evolve legacy public.organization_members safely in place.
-- ============================================================================
-- This migration is forward-only and transactional.
-- It preserves public.organization_members(id) because public.hospital_members
-- depends on that primary-key identity.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    organization_members_relation REGCLASS;
    hospital_members_relation REGCLASS;
    status_attribute_number SMALLINT;
    legacy_unique_constraint RECORD;
    status_check_constraint RECORD;
BEGIN
    -- Hard safety guards: fail before any schema change.
    IF to_regclass('public.organization_members') IS NULL THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: public.organization_members does not exist.';
    END IF;

    IF to_regclass('public.hospital_members') IS NULL THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: public.hospital_members does not exist.';
    END IF;

    organization_members_relation := 'public.organization_members'::REGCLASS;
    hospital_members_relation := 'public.hospital_members'::REGCLASS;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.contype = 'f'
          AND constraint_record.conrelid = hospital_members_relation
          AND constraint_record.confrelid = organization_members_relation
    ) THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: Hospital Member foreign-key dependency is missing.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.created_by IS NULL
           OR member.updated_by IS NULL
    ) THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: audit actor remediation is incomplete.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.organization_members member
        LEFT JOIN public.users created_by_user
          ON created_by_user.id = member.created_by
        LEFT JOIN public.users updated_by_user
          ON updated_by_user.id = member.updated_by
        LEFT JOIN public.users deleted_by_user
          ON deleted_by_user.id = member.deleted_by
        WHERE created_by_user.id IS NULL
           OR updated_by_user.id IS NULL
           OR (member.deleted_by IS NOT NULL AND deleted_by_user.id IS NULL)
    ) THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: one or more audit actors do not exist in public.users.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.version IS NULL
           OR member.version < 1
    ) THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: invalid member version detected.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE (member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = TRUE)
           OR (member.deleted_at IS NOT NULL AND COALESCE(member.is_deleted, FALSE) = FALSE)
    ) THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: soft-delete timestamp and flag are inconsistent.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.status NOT IN ('ACTIVE', 'SUSPENDED')
           OR member.status IS NULL
    ) THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: legacy INACTIVE or invalid status exists.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE member.deleted_at IS NULL
          AND COALESCE(member.is_deleted, FALSE) = FALSE
        GROUP BY member.organization_id, member.user_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration blocked: active duplicate Organization/User membership exists.';
    END IF;

    -- Mandatory audit values are now proven safe to enforce.
    ALTER TABLE public.organization_members
        ALTER COLUMN created_by SET NOT NULL,
        ALTER COLUMN updated_by SET NOT NULL;

    -- Add audit actor foreign keys only when an equivalent relationship is absent.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.contype = 'f'
          AND constraint_record.conrelid = organization_members_relation
          AND constraint_record.confrelid = 'public.users'::REGCLASS
          AND constraint_record.conkey = ARRAY[
              (SELECT attribute_record.attnum
               FROM pg_attribute attribute_record
               WHERE attribute_record.attrelid = organization_members_relation
                 AND attribute_record.attname = 'created_by'
                 AND attribute_record.attisdropped = FALSE)
          ]
    ) THEN
        ALTER TABLE public.organization_members
            ADD CONSTRAINT fk_organization_members_created_by_user
            FOREIGN KEY (created_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.contype = 'f'
          AND constraint_record.conrelid = organization_members_relation
          AND constraint_record.confrelid = 'public.users'::REGCLASS
          AND constraint_record.conkey = ARRAY[
              (SELECT attribute_record.attnum
               FROM pg_attribute attribute_record
               WHERE attribute_record.attrelid = organization_members_relation
                 AND attribute_record.attname = 'updated_by'
                 AND attribute_record.attisdropped = FALSE)
          ]
    ) THEN
        ALTER TABLE public.organization_members
            ADD CONSTRAINT fk_organization_members_updated_by_user
            FOREIGN KEY (updated_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.contype = 'f'
          AND constraint_record.conrelid = organization_members_relation
          AND constraint_record.confrelid = 'public.users'::REGCLASS
          AND constraint_record.conkey = ARRAY[
              (SELECT attribute_record.attnum
               FROM pg_attribute attribute_record
               WHERE attribute_record.attrelid = organization_members_relation
                 AND attribute_record.attname = 'deleted_by'
                 AND attribute_record.attisdropped = FALSE)
          ]
    ) THEN
        ALTER TABLE public.organization_members
            ADD CONSTRAINT fk_organization_members_deleted_by_user
            FOREIGN KEY (deleted_by)
            REFERENCES public.users(id)
            ON DELETE RESTRICT;
    END IF;

    -- Replace all existing checks that apply to the legacy status column.
    SELECT attribute_record.attnum
      INTO status_attribute_number
      FROM pg_attribute attribute_record
     WHERE attribute_record.attrelid = organization_members_relation
       AND attribute_record.attname = 'status'
       AND attribute_record.attisdropped = FALSE;

    FOR status_check_constraint IN
        SELECT constraint_record.conname
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = organization_members_relation
          AND constraint_record.contype = 'c'
          AND status_attribute_number = ANY(constraint_record.conkey)
    LOOP
        EXECUTE FORMAT(
            'ALTER TABLE public.organization_members DROP CONSTRAINT %I',
            status_check_constraint.conname
        );
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = organization_members_relation
          AND constraint_record.conname = 'ck_organization_members_status'
    ) THEN
        ALTER TABLE public.organization_members
            ADD CONSTRAINT ck_organization_members_status
            CHECK (status IN ('ACTIVE', 'SUSPENDED'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = organization_members_relation
          AND constraint_record.conname = 'ck_organization_members_version'
    ) THEN
        ALTER TABLE public.organization_members
            ADD CONSTRAINT ck_organization_members_version
            CHECK (version >= 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = organization_members_relation
          AND constraint_record.conname = 'ck_organization_members_soft_delete_consistency'
    ) THEN
        ALTER TABLE public.organization_members
            ADD CONSTRAINT ck_organization_members_soft_delete_consistency
            CHECK (
                (deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE)
                OR
                (deleted_at IS NOT NULL AND COALESCE(is_deleted, FALSE) = TRUE)
            );
    END IF;

    -- The replacement index is created before legacy global uniqueness is removed.
    CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_members_organization_user_active
        ON public.organization_members (organization_id, user_id)
        WHERE deleted_at IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE;

    CREATE INDEX IF NOT EXISTS idx_organization_members_organization_active
        ON public.organization_members (organization_id)
        WHERE deleted_at IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE;

    CREATE INDEX IF NOT EXISTS idx_organization_members_user_active
        ON public.organization_members (user_id)
        WHERE deleted_at IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE;

    CREATE INDEX IF NOT EXISTS idx_organization_members_status_active
        ON public.organization_members (status)
        WHERE deleted_at IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE;

    -- Remove only a two-column legacy global unique constraint on Organization/User.
    FOR legacy_unique_constraint IN
        SELECT constraint_record.conname
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = organization_members_relation
          AND constraint_record.contype = 'u'
          AND CARDINALITY(constraint_record.conkey) = 2
          AND constraint_record.conkey @> ARRAY[
              (SELECT attribute_record.attnum
               FROM pg_attribute attribute_record
               WHERE attribute_record.attrelid = organization_members_relation
                 AND attribute_record.attname = 'organization_id'
                 AND attribute_record.attisdropped = FALSE),
              (SELECT attribute_record.attnum
               FROM pg_attribute attribute_record
               WHERE attribute_record.attrelid = organization_members_relation
                 AND attribute_record.attname = 'user_id'
                 AND attribute_record.attisdropped = FALSE)
          ]
    LOOP
        EXECUTE FORMAT(
            'ALTER TABLE public.organization_members DROP CONSTRAINT %I',
            legacy_unique_constraint.conname
        );
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.contype = 'f'
          AND constraint_record.conrelid = hospital_members_relation
          AND constraint_record.confrelid = organization_members_relation
    ) THEN
        RAISE EXCEPTION 'Phase 5 Organization Member migration validation failed: Hospital Member foreign-key dependency was not preserved.';
    END IF;
END $$;

COMMENT ON TABLE public.organization_members IS
    'Tenant-scoped IAM User membership. Phase 5 core lifecycle owner; IAM owns roles and permissions.';

COMMENT ON COLUMN public.organization_members.id IS
    'Legacy Organization Member UUID primary key retained for Hospital Member foreign-key compatibility.';

COMMENT ON COLUMN public.organization_members.employee_code IS
    'Legacy compatibility column. New Phase 5 core membership writes do not manage employee metadata.';

COMMENT ON COLUMN public.organization_members.designation IS
    'Legacy compatibility column. New Phase 5 core membership writes do not manage employee metadata.';

COMMENT ON COLUMN public.organization_members.joining_date IS
    'Legacy compatibility column. New Phase 5 core membership writes do not manage employee metadata.';

COMMIT;
