-- Run after the API lifecycle test. Every result must be true.
SELECT
    to_regclass('public.organization_members') IS NOT NULL AS organization_members_table_exists,
    to_regclass('public.hospital_members') IS NOT NULL AS hospital_members_table_exists,
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.contype = 'f'
          AND constraint_record.conrelid = 'public.hospital_members'::regclass
          AND constraint_record.confrelid = 'public.organization_members'::regclass
    ) AS hospital_member_foreign_key_preserved,
    EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = 'public.organization_members'::regclass
          AND constraint_record.conname = 'ck_organization_members_soft_delete_consistency'
    ) AS soft_delete_constraint_preserved,
    NOT EXISTS (
        SELECT 1
        FROM public.organization_members member
        WHERE (member.deleted_at IS NULL AND COALESCE(member.is_deleted, FALSE) = TRUE)
           OR (member.deleted_at IS NOT NULL AND COALESCE(member.is_deleted, FALSE) = FALSE)
    ) AS member_soft_delete_data_consistent;
