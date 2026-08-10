-- ============================================================================
-- ClaimNX Phase 5: Organization Member Management
-- Post-migration validation (READ ONLY)
-- ============================================================================

SELECT
    to_regclass('public.organization_members') IS NOT NULL AS organization_members_table_exists,
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'organization_members'
          AND column_name = 'id'
          AND data_type = 'uuid'
          AND is_nullable = 'NO'
    ) AS legacy_uuid_primary_key_column_exists,
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.contype = 'f'
          AND constraint_record.conrelid = 'public.hospital_members'::REGCLASS
          AND constraint_record.confrelid = 'public.organization_members'::REGCLASS
    ) AS hospital_member_foreign_key_preserved,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.organization_members'::REGCLASS
          AND conname = 'fk_organization_members_created_by_user'
    ) AS created_by_foreign_key_exists,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.organization_members'::REGCLASS
          AND conname = 'fk_organization_members_updated_by_user'
    ) AS updated_by_foreign_key_exists,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.organization_members'::REGCLASS
          AND conname = 'fk_organization_members_deleted_by_user'
    ) AS deleted_by_foreign_key_exists,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.organization_members'::REGCLASS
          AND conname = 'ck_organization_members_status'
    ) AS status_check_exists,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.organization_members'::REGCLASS
          AND conname = 'ck_organization_members_version'
    ) AS version_check_exists,
    EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.organization_members'::REGCLASS
          AND conname = 'ck_organization_members_soft_delete_consistency'
    ) AS soft_delete_check_exists,
    EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'organization_members'
          AND indexname = 'uq_organization_members_organization_user_active'
    ) AS active_unique_index_exists,
    EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'organization_members'
          AND indexname = 'idx_organization_members_organization_active'
    ) AS organization_active_index_exists,
    EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'organization_members'
          AND indexname = 'idx_organization_members_user_active'
    ) AS user_active_index_exists,
    NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = 'public.organization_members'::REGCLASS
          AND constraint_record.contype = 'u'
          AND CARDINALITY(constraint_record.conkey) = 2
          AND constraint_record.conkey @> ARRAY[
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.organization_members'::REGCLASS AND attname = 'organization_id' AND NOT attisdropped),
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.organization_members'::REGCLASS AND attname = 'user_id' AND NOT attisdropped)
          ]
    ) AS legacy_global_unique_constraint_removed,
    COUNT(*) FILTER (
        WHERE created_by IS NULL
           OR updated_by IS NULL
           OR version < 1
           OR (deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = TRUE)
           OR (deleted_at IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE)
           OR status NOT IN ('ACTIVE', 'SUSPENDED')
    ) = 0 AS records_meet_new_rules,
    COUNT(*) FILTER (
        WHERE deleted_at IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE
    ) AS active_non_deleted_member_count
FROM public.organization_members;
