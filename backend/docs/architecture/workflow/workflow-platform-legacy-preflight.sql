-- ============================================================================
-- ClaimNX Phase 6 - Workflow Platform Legacy Database Preflight (READ ONLY)
-- ============================================================================
-- Objective: establish the current condition of legacy Workflow tables before
-- any Physical Database Design decision is made.
--
-- Safety: this file contains SELECT statements only. It creates, updates,
-- deletes, alters, or drops nothing.
--
-- Run each numbered section separately in Supabase SQL Editor. Capture a
-- screenshot of every result. Stop after Section 1 if either table is absent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table existence gate
-- Expected: both values are true. If either is false, stop and share this
-- result; do not run Sections 4 or 5.
-- ---------------------------------------------------------------------------
SELECT
    to_regclass('public.workflow_instances') IS NOT NULL AS workflow_instances_exists,
    to_regclass('public.workflow_queues') IS NOT NULL AS workflow_queues_exists;

-- ---------------------------------------------------------------------------
-- 2. Column, type, nullable, and default inventory
-- Safe whether or not the tables exist.
-- ---------------------------------------------------------------------------
SELECT
    table_name,
    ordinal_position,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('workflow_instances', 'workflow_queues')
ORDER BY table_name, ordinal_position;

-- ---------------------------------------------------------------------------
-- 3. Primary keys, unique/check constraints, and indexes
-- Safe whether or not the tables exist.
-- ---------------------------------------------------------------------------
SELECT
    constraint_record.table_name,
    constraint_record.constraint_name,
    constraint_record.constraint_type,
    constraint_record.constraint_definition
FROM (
    SELECT
        table_constraint.table_name,
        table_constraint.constraint_name,
        table_constraint.constraint_type,
        pg_get_constraintdef(constraint_catalog.oid, TRUE) AS constraint_definition
    FROM information_schema.table_constraints table_constraint
    JOIN pg_constraint constraint_catalog
      ON constraint_catalog.conname = table_constraint.constraint_name
    JOIN pg_class relation_catalog
      ON relation_catalog.oid = constraint_catalog.conrelid
    JOIN pg_namespace schema_catalog
      ON schema_catalog.oid = relation_catalog.relnamespace
    WHERE table_constraint.table_schema = 'public'
      AND schema_catalog.nspname = 'public'
      AND table_constraint.table_name IN ('workflow_instances', 'workflow_queues')
) AS constraint_record
ORDER BY constraint_record.table_name, constraint_record.constraint_type, constraint_record.constraint_name;

SELECT
    index_record.tablename AS table_name,
    index_record.indexname AS index_name,
    index_record.indexdef AS index_definition
FROM pg_indexes AS index_record
WHERE index_record.schemaname = 'public'
  AND index_record.tablename IN ('workflow_instances', 'workflow_queues')
ORDER BY index_record.tablename, index_record.indexname;

-- ---------------------------------------------------------------------------
-- 4. Inbound and outbound foreign-key dependency map
-- Safe whether or not the tables exist. This identifies other tables that
-- would be affected by any future evolution decision.
-- ---------------------------------------------------------------------------
SELECT
    source_schema.nspname AS source_schema,
    source_table.relname AS source_table,
    source_column.attname AS source_column,
    foreign_key.conname AS constraint_name,
    target_schema.nspname AS target_schema,
    target_table.relname AS target_table,
    target_column.attname AS target_column,
    pg_get_constraintdef(foreign_key.oid, TRUE) AS constraint_definition
FROM pg_constraint AS foreign_key
JOIN pg_class AS source_table
  ON source_table.oid = foreign_key.conrelid
JOIN pg_namespace AS source_schema
  ON source_schema.oid = source_table.relnamespace
JOIN pg_class AS target_table
  ON target_table.oid = foreign_key.confrelid
JOIN pg_namespace AS target_schema
  ON target_schema.oid = target_table.relnamespace
JOIN unnest(foreign_key.conkey) WITH ORDINALITY AS source_key(attnum, position)
  ON TRUE
JOIN unnest(foreign_key.confkey) WITH ORDINALITY AS target_key(attnum, position)
  ON target_key.position = source_key.position
JOIN pg_attribute AS source_column
  ON source_column.attrelid = source_table.oid
 AND source_column.attnum = source_key.attnum
JOIN pg_attribute AS target_column
  ON target_column.attrelid = target_table.oid
 AND target_column.attnum = target_key.attnum
WHERE foreign_key.contype = 'f'
  AND (
      (source_schema.nspname = 'public' AND source_table.relname IN ('workflow_instances', 'workflow_queues'))
      OR
      (target_schema.nspname = 'public' AND target_table.relname IN ('workflow_instances', 'workflow_queues'))
  )
ORDER BY source_schema, source_table, foreign_key.conname, source_key.position;

-- ---------------------------------------------------------------------------
-- 5. Data profile and audit/legacy-scope readiness.
-- Run only when Section 1 confirms that BOTH tables exist.
-- This query is aligned to the confirmed legacy columns from the 2026-07-30
-- inventory. `hospital_id` and `scope_hospital_id` are legacy scope values;
-- they are not evidence that the approved Phase 6 Organization scope exists.
-- ---------------------------------------------------------------------------
SELECT
    'workflow_instances' AS table_name,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE hospital_id IS NULL) AS records_missing_legacy_hospital_scope,
    COUNT(*) FILTER (WHERE created_by IS NULL OR updated_by IS NULL) AS records_missing_audit_actor,
    COUNT(*) FILTER (WHERE created_at IS NULL OR updated_at IS NULL) AS records_missing_audit_timestamp,
    COUNT(*) FILTER (WHERE version IS NULL OR version < 1) AS records_with_invalid_version,
    COUNT(*) FILTER (
        WHERE (deleted_at IS NULL AND is_deleted = TRUE)
           OR (deleted_at IS NOT NULL AND is_deleted = FALSE)
    ) AS soft_delete_flag_mismatches,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL OR is_deleted = TRUE) AS retired_records
FROM public.workflow_instances

UNION ALL

SELECT
    'workflow_queues' AS table_name,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE scope_hospital_id IS NULL) AS records_without_legacy_hospital_scope,
    COUNT(*) FILTER (WHERE created_by IS NULL OR updated_by IS NULL) AS records_missing_audit_actor,
    COUNT(*) FILTER (WHERE created_at IS NULL OR updated_at IS NULL) AS records_missing_audit_timestamp,
    COUNT(*) FILTER (WHERE version IS NULL OR version < 1) AS records_with_invalid_version,
    COUNT(*) FILTER (
        WHERE (deleted_at IS NULL AND is_deleted = TRUE)
           OR (deleted_at IS NOT NULL AND is_deleted = FALSE)
    ) AS soft_delete_flag_mismatches,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL OR is_deleted = TRUE) AS retired_records
FROM public.workflow_queues
ORDER BY table_name;

-- ---------------------------------------------------------------------------
-- 6. Legacy status/value distribution.
-- Run only after confirming from Section 2 that both tables have `status`.
-- ---------------------------------------------------------------------------
SELECT
    'workflow_instances' AS table_name,
    COALESCE(status, '<NULL>') AS legacy_status,
    COUNT(*) AS record_count
FROM public.workflow_instances
GROUP BY COALESCE(status, '<NULL>')

UNION ALL

SELECT
    'workflow_queues' AS table_name,
    COALESCE(status, '<NULL>') AS legacy_status,
    COUNT(*) AS record_count
FROM public.workflow_queues
GROUP BY COALESCE(status, '<NULL>')
ORDER BY table_name, legacy_status;
