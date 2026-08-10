-- Tenant Configuration Physical Database Design — Read-only preflight.
-- Run in Supabase SQL Editor and share the result. This script changes nothing.

-- 1. Existing table existence and record lifecycle summary.
SELECT
    to_regclass('public.organization_configurations') IS NOT NULL AS table_exists,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE) AS active_non_deleted_records,
    COUNT(*) FILTER (WHERE status = 'INACTIVE' AND deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE) AS inactive_non_deleted_records,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL OR COALESCE(is_deleted, FALSE) = TRUE) AS retired_records
FROM public.organization_configurations;

-- 2. Actual current columns and nullability.
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organization_configurations'
ORDER BY ordinal_position;

-- 3. Existing constraints and indexes.
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'organization_configurations'
ORDER BY constraint_type, constraint_name;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'organization_configurations'
ORDER BY indexname;

-- 4. Foreign keys in either direction. These determine compatibility limits.
SELECT
    source_table,
    source_column,
    constraint_name,
    target_table,
    target_column
FROM (
    SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        tc.constraint_name,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND (tc.table_name = 'organization_configurations' OR ccu.table_name = 'organization_configurations')
) foreign_keys
ORDER BY source_table, source_column;

-- 5. Current configuration keys and their active record counts.
SELECT
    config_key,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE) AS active_records,
    COUNT(DISTINCT organization_id) AS organizations_using_key
FROM public.organization_configurations
GROUP BY config_key
ORDER BY config_key;

-- 6. Audit readiness. Physical migration must not proceed with invalid active audit references.
SELECT
    COUNT(*) FILTER (WHERE created_by IS NULL OR updated_by IS NULL) AS records_missing_audit_actor,
    COUNT(*) FILTER (WHERE created_at IS NULL OR updated_at IS NULL) AS records_missing_audit_timestamp,
    COUNT(*) FILTER (WHERE version IS NULL OR version < 1) AS records_with_invalid_version
FROM public.organization_configurations;
