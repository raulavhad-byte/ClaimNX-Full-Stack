-- ClaimNX Phase 8: Claim Processing - Legacy Database Preflight (READ ONLY)
-- Run each SELECT in Supabase SQL Editor. This file changes no data.

-- 1. Existing Claim-related tables.
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND (
    table_name ILIKE '%claim%'
    OR table_name ILIKE '%preauth%'
    OR table_name ILIKE '%authorization%'
    OR table_name ILIKE '%query%'
    OR table_name ILIKE '%submission%'
  )
ORDER BY table_name;

-- 2. Columns on every discovered Claim-related table.
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
  AND (
    table_name ILIKE '%claim%'
    OR table_name ILIKE '%preauth%'
    OR table_name ILIKE '%authorization%'
    OR table_name ILIKE '%query%'
    OR table_name ILIKE '%submission%'
  )
ORDER BY table_name, ordinal_position;

-- 3. Foreign keys into or out of Claim-related tables.
SELECT
  source_table.relname AS source_table,
  source_column.attname AS source_column,
  foreign_key.conname AS constraint_name,
  target_table.relname AS target_table,
  target_column.attname AS target_column,
  pg_get_constraintdef(foreign_key.oid) AS constraint_definition
FROM pg_constraint AS foreign_key
JOIN pg_class AS source_table ON source_table.oid = foreign_key.conrelid
JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
JOIN pg_class AS target_table ON target_table.oid = foreign_key.confrelid
JOIN unnest(foreign_key.conkey) WITH ORDINALITY AS source_key(attnum, position) ON TRUE
JOIN unnest(foreign_key.confkey) WITH ORDINALITY AS target_key(attnum, position)
  ON target_key.position = source_key.position
JOIN pg_attribute AS source_column
  ON source_column.attrelid = source_table.oid AND source_column.attnum = source_key.attnum
JOIN pg_attribute AS target_column
  ON target_column.attrelid = target_table.oid AND target_column.attnum = target_key.attnum
WHERE foreign_key.contype = 'f'
  AND source_schema.nspname = 'public'
  AND (
    source_table.relname ILIKE '%claim%'
    OR source_table.relname ILIKE '%preauth%'
    OR source_table.relname ILIKE '%authorization%'
    OR source_table.relname ILIKE '%query%'
    OR source_table.relname ILIKE '%submission%'
    OR target_table.relname ILIKE '%claim%'
    OR target_table.relname ILIKE '%preauth%'
    OR target_table.relname ILIKE '%authorization%'
    OR target_table.relname ILIKE '%query%'
    OR target_table.relname ILIKE '%submission%'
  )
ORDER BY source_table.relname, foreign_key.conname, source_key.position;

-- 4. Constraints and indexes on Claim-related tables.
SELECT
  table_record.relname AS table_name,
  constraint_record.conname AS constraint_name,
  constraint_record.contype AS constraint_type,
  pg_get_constraintdef(constraint_record.oid) AS constraint_definition
FROM pg_constraint AS constraint_record
JOIN pg_class AS table_record ON table_record.oid = constraint_record.conrelid
JOIN pg_namespace AS schema_record ON schema_record.oid = table_record.relnamespace
WHERE schema_record.nspname = 'public'
  AND table_record.relname ILIKE '%claim%'
ORDER BY table_record.relname, constraint_record.conname;

SELECT tablename AS table_name, indexname AS index_name, indexdef AS index_definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename ILIKE '%claim%'
ORDER BY tablename, indexname;

-- 5. Known prerequisite tables.
SELECT
  to_regclass('public.organizations') IS NOT NULL AS organizations_table_exists,
  to_regclass('public.hospitals') IS NOT NULL AS hospitals_table_exists,
  to_regclass('public.users') IS NOT NULL AS users_table_exists,
  to_regclass('public.reference_categories') IS NOT NULL AS reference_categories_table_exists,
  to_regclass('public.reference_values') IS NOT NULL AS reference_values_table_exists,
  to_regclass('public.workflow_instances') IS NOT NULL AS workflow_instances_table_exists,
  to_regclass('public.hospital_insurance_partner_integration') IS NOT NULL AS hospital_payer_integration_table_exists;

-- Pause. Do not apply a Phase 8 migration until every result has been reviewed.
