-- ============================================================================
-- ClaimNX Phase 5: Organization Member Management
-- Physical Design Readiness Summary (READ ONLY)
-- ============================================================================
-- Run this after the preflight. It returns one compact row that is easy to
-- review in a screenshot. It makes no database changes.
-- ============================================================================

WITH active_duplicates AS (
    SELECT organization_id, user_id
    FROM public.organization_members
    WHERE status = 'ACTIVE'
      AND deleted_at IS NULL
      AND COALESCE(is_deleted, FALSE) = FALSE
    GROUP BY organization_id, user_id
    HAVING COUNT(*) > 1
),
inbound_dependencies AS (
    SELECT COUNT(*) AS dependency_count
    FROM pg_constraint constraint_record
    JOIN pg_namespace dependent_schema
      ON dependent_schema.oid = (
          SELECT relnamespace
          FROM pg_class
          WHERE oid = constraint_record.conrelid
      )
    WHERE constraint_record.contype = 'f'
      AND constraint_record.confrelid = 'public.organization_members'::regclass
      AND dependent_schema.nspname = 'public'
)
SELECT
    COUNT(*) AS total_members,
    COUNT(*) FILTER (
        WHERE status = 'ACTIVE'
          AND deleted_at IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE
    ) AS active_non_deleted_members,
    COUNT(*) FILTER (
        WHERE status = 'SUSPENDED'
          AND deleted_at IS NULL
          AND COALESCE(is_deleted, FALSE) = FALSE
    ) AS suspended_non_deleted_members,
    COUNT(*) FILTER (
        WHERE created_by IS NULL OR updated_by IS NULL
    ) AS members_missing_audit_actor,
    COUNT(*) FILTER (
        WHERE created_at IS NULL OR updated_at IS NULL
    ) AS members_missing_audit_timestamp,
    COUNT(*) FILTER (
        WHERE version IS NULL OR version < 1
    ) AS members_with_invalid_version,
    COUNT(*) FILTER (
        WHERE (deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = TRUE)
           OR (deleted_at IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE)
    ) AS soft_delete_flag_mismatches,
    (SELECT COUNT(*) FROM active_duplicates) AS active_duplicate_pairs,
    (SELECT dependency_count FROM inbound_dependencies) AS inbound_foreign_key_count,
    to_regclass('public.organization_member_access_scopes') IS NOT NULL
        AS access_scopes_table_exists,
    to_regclass('public.hospital_members') IS NOT NULL
        AS hospital_members_table_exists
FROM public.organization_members;
