-- ClaimNX Phase 7: Insurance Foundation - Physical Design Preflight (READ ONLY)
-- Run in Supabase SQL Editor as role postgres. This script performs no writes.
-- Objective: discover legacy insurance schema before the approved Phase 7 design.

-- 1. Find all public tables whose names indicate insurance-domain data.
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND (table_name ILIKE '%insurance%'
       OR table_name ILIKE '%insurer%'
       OR table_name ILIKE '%payer%'
       OR table_name ILIKE '%tpa%'
       OR table_name ILIKE '%policy%'
       OR table_name ILIKE '%plan%'
       OR table_name ILIKE '%product%'
       OR table_name ILIKE '%coverage%'
       OR table_name ILIKE '%network%')
ORDER BY table_name;

-- 2. Authoritative columns/types/nullability for every discovered candidate.
SELECT table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name ILIKE '%insurance%'
       OR table_name ILIKE '%insurer%'
       OR table_name ILIKE '%payer%'
       OR table_name ILIKE '%tpa%'
       OR table_name ILIKE '%policy%'
       OR table_name ILIKE '%plan%'
       OR table_name ILIKE '%product%'
       OR table_name ILIKE '%coverage%'
       OR table_name ILIKE '%network%')
ORDER BY table_name, ordinal_position;

-- 3. Existing primary key, uniqueness, check, and foreign-key rules.
SELECT table_name, constraint_name, constraint_type, is_deferrable,
       initially_deferred
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND (table_name ILIKE '%insurance%'
       OR table_name ILIKE '%insurer%'
       OR table_name ILIKE '%payer%'
       OR table_name ILIKE '%tpa%'
       OR table_name ILIKE '%policy%'
       OR table_name ILIKE '%plan%'
       OR table_name ILIKE '%product%'
       OR table_name ILIKE '%coverage%'
       OR table_name ILIKE '%network%')
ORDER BY table_name, constraint_type, constraint_name;

-- 4. All incoming/outgoing foreign-key dependencies for candidate tables.
SELECT source_table.relname AS source_table,
       source_column.attname AS source_column,
       foreign_key.conname AS constraint_name,
       target_table.relname AS target_table,
       target_column.attname AS target_column,
       pg_get_constraintdef(foreign_key.oid) AS constraint_definition
FROM pg_constraint AS foreign_key
JOIN pg_class AS source_table ON source_table.oid = foreign_key.conrelid
JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
JOIN pg_class AS target_table ON target_table.oid = foreign_key.confrelid
JOIN pg_namespace AS target_schema ON target_schema.oid = target_table.relnamespace
JOIN LATERAL unnest(foreign_key.conkey) WITH ORDINALITY AS source_key(attnum, position) ON TRUE
JOIN LATERAL unnest(foreign_key.confkey) WITH ORDINALITY AS target_key(attnum, position)
  ON target_key.position = source_key.position
JOIN pg_attribute AS source_column
  ON source_column.attrelid = source_table.oid AND source_column.attnum = source_key.attnum
JOIN pg_attribute AS target_column
  ON target_column.attrelid = target_table.oid AND target_column.attnum = target_key.attnum
WHERE foreign_key.contype = 'f'
  AND source_schema.nspname = 'public' AND target_schema.nspname = 'public'
  AND (source_table.relname ILIKE '%insurance%'
       OR source_table.relname ILIKE '%insurer%'
       OR source_table.relname ILIKE '%payer%'
       OR source_table.relname ILIKE '%tpa%'
       OR source_table.relname ILIKE '%policy%'
       OR source_table.relname ILIKE '%plan%'
       OR source_table.relname ILIKE '%product%'
       OR source_table.relname ILIKE '%coverage%'
       OR source_table.relname ILIKE '%network%'
       OR target_table.relname ILIKE '%insurance%'
       OR target_table.relname ILIKE '%insurer%'
       OR target_table.relname ILIKE '%payer%'
       OR target_table.relname ILIKE '%tpa%'
       OR target_table.relname ILIKE '%policy%'
       OR target_table.relname ILIKE '%plan%'
       OR target_table.relname ILIKE '%product%'
       OR target_table.relname ILIKE '%coverage%'
       OR target_table.relname ILIKE '%network%')
ORDER BY source_table.relname, foreign_key.conname, source_key.position;

-- 5. Existing indexes, including partial uniqueness rules.
SELECT tablename AS table_name, indexname AS index_name, indexdef AS index_definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename ILIKE '%insurance%'
       OR tablename ILIKE '%insurer%'
       OR tablename ILIKE '%payer%'
       OR tablename ILIKE '%tpa%'
       OR tablename ILIKE '%policy%'
       OR tablename ILIKE '%plan%'
       OR tablename ILIKE '%product%'
       OR tablename ILIKE '%coverage%'
       OR tablename ILIKE '%network%')
ORDER BY tablename, indexname;

-- 6. Estimated record volumes without selecting from unknown business tables.
SELECT class_record.relname AS table_name,
       class_record.reltuples::BIGINT AS estimated_row_count
FROM pg_class AS class_record
JOIN pg_namespace AS schema_record ON schema_record.oid = class_record.relnamespace
WHERE schema_record.nspname = 'public'
  AND class_record.relkind = 'r'
  AND (class_record.relname ILIKE '%insurance%'
       OR class_record.relname ILIKE '%insurer%'
       OR class_record.relname ILIKE '%payer%'
       OR class_record.relname ILIKE '%tpa%'
       OR class_record.relname ILIKE '%policy%'
       OR class_record.relname ILIKE '%plan%'
       OR class_record.relname ILIKE '%product%'
       OR class_record.relname ILIKE '%coverage%'
       OR class_record.relname ILIKE '%network%')
ORDER BY class_record.relname;

-- 7. Required existing dependency owners for the approved Phase 7 model.
SELECT to_regclass('public.organizations') IS NOT NULL AS organizations_table_exists,
       to_regclass('public.users') IS NOT NULL AS users_table_exists,
       to_regclass('public.reference_categories') IS NOT NULL AS reference_categories_table_exists,
       to_regclass('public.reference_values') IS NOT NULL AS reference_values_table_exists,
       to_regclass('public.hospitals') IS NOT NULL AS hospitals_table_exists;

-- Validation: share every result grid (an empty candidate-table result is valid).
-- Pause: do not run a migration until the physical database design is approved.
