-- ============================================================================
-- ClaimNX Phase 5: Organization Member Management
-- Physical Database Design Preflight (READ ONLY)
-- ============================================================================
-- Objective:
--   Capture live-schema and data-readiness evidence before designing any
--   evolution of public.organization_members.
--
-- Safety:
--   This script contains SELECT statements only. It makes no database change.
--
-- How to run:
--   Supabase Dashboard → SQL Editor → New query → paste this entire file → Run.
--   Share a screenshot of the single results row before any migration is made.
-- ============================================================================

WITH organization_member_columns AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'column_name', column_name,
            'data_type', data_type,
            'nullable', is_nullable,
            'default', column_default
        )
        ORDER BY ordinal_position
    ) AS value
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_members'
),
organization_member_constraints AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'constraint_name', constraint_name,
            'constraint_type', constraint_type
        )
        ORDER BY constraint_type, constraint_name
    ) AS value
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'organization_members'
),
inbound_foreign_keys AS (
    SELECT jsonb_agg(
        jsonb_build_object(
            'constraint_name', constraint_name,
            'dependent_table', dependent_table,
            'dependent_column', dependent_column
        )
        ORDER BY dependent_table, dependent_column
    ) AS value
    FROM (
        SELECT
            constraint_record.conname AS constraint_name,
            dependent_table.relname AS dependent_table,
            dependent_column.attname AS dependent_column
        FROM pg_constraint constraint_record
        JOIN pg_class dependent_table
          ON dependent_table.oid = constraint_record.conrelid
        JOIN pg_namespace dependent_schema
          ON dependent_schema.oid = dependent_table.relnamespace
        JOIN LATERAL unnest(constraint_record.conkey) AS key_column(attnum)
          ON TRUE
        JOIN pg_attribute dependent_column
          ON dependent_column.attrelid = dependent_table.oid
         AND dependent_column.attnum = key_column.attnum
        WHERE constraint_record.contype = 'f'
          AND constraint_record.confrelid = 'public.organization_members'::regclass
          AND dependent_schema.nspname = 'public'
    ) dependencies
),
status_summary AS (
    SELECT jsonb_object_agg(status_key, record_count) AS value
    FROM (
        SELECT
            COALESCE(NULLIF(BTRIM(status), ''), '<NULL_OR_EMPTY>') AS status_key,
            COUNT(*) AS record_count
        FROM public.organization_members
        GROUP BY COALESCE(NULLIF(BTRIM(status), ''), '<NULL_OR_EMPTY>')
    ) statuses
),
data_quality AS (
    SELECT jsonb_build_object(
        'total_records', COUNT(*),
        'active_non_deleted_records', COUNT(*) FILTER (
            WHERE status = 'ACTIVE'
              AND deleted_at IS NULL
              AND COALESCE(is_deleted, FALSE) = FALSE
        ),
        'records_missing_audit_actor', COUNT(*) FILTER (
            WHERE created_by IS NULL OR updated_by IS NULL
        ),
        'records_missing_audit_timestamp', COUNT(*) FILTER (
            WHERE created_at IS NULL OR updated_at IS NULL
        ),
        'records_with_invalid_version', COUNT(*) FILTER (
            WHERE version IS NULL OR version < 1
        ),
        'soft_delete_flag_mismatch', COUNT(*) FILTER (
            WHERE (deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = TRUE)
               OR (deleted_at IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE)
        )
    ) AS value
    FROM public.organization_members
),
active_duplicate_summary AS (
    SELECT COUNT(*) AS value
    FROM (
        SELECT organization_id, user_id
        FROM public.organization_members
        WHERE status = 'ACTIVE'
          AND deleted_at IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE
        GROUP BY organization_id, user_id
        HAVING COUNT(*) > 1
    ) duplicate_memberships
),
related_record_counts AS (
    SELECT jsonb_build_object(
        'organization_members', (SELECT COUNT(*) FROM public.organization_members),
        'organization_member_access_scopes_table_exists',
            to_regclass('public.organization_member_access_scopes') IS NOT NULL,
        'hospital_members_table_exists',
            to_regclass('public.hospital_members') IS NOT NULL
    ) AS value
)
SELECT
    to_regclass('public.organization_members') IS NOT NULL AS organization_members_table_exists,
    to_regclass('public.organization_member_access_scopes') IS NOT NULL AS access_scopes_table_exists,
    to_regclass('public.hospital_members') IS NOT NULL AS hospital_members_table_exists,
    organization_member_columns.value AS organization_member_columns,
    organization_member_constraints.value AS organization_member_constraints,
    inbound_foreign_keys.value AS inbound_foreign_keys,
    status_summary.value AS status_summary,
    data_quality.value AS data_quality,
    active_duplicate_summary.value AS active_duplicate_pairs,
    related_record_counts.value AS related_record_counts
FROM organization_member_columns
CROSS JOIN organization_member_constraints
CROSS JOIN inbound_foreign_keys
CROSS JOIN status_summary
CROSS JOIN data_quality
CROSS JOIN active_duplicate_summary
CROSS JOIN related_record_counts;
