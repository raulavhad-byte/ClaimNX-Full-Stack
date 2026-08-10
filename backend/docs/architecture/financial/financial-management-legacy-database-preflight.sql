-- ============================================================================
-- ClaimNX Phase 9 - Financial Management
-- Legacy Database Preflight (READ ONLY)
-- ============================================================================
-- Objective: discover existing financial/settlement/recovery/reconciliation
--            structures and dependencies before approving any Phase 9 physical
--            database design.
-- Safety: this script contains SELECT statements only. It makes no changes.
-- Action: run the complete script in Supabase SQL Editor as the postgres role.
-- Validation: share every result grid. An empty candidate-table result is valid.
-- Do not run a Phase 9 migration until the results have been reviewed.
-- ============================================================================

-- 1. Confirm mandatory Phase 9 dependency owners exist.
SELECT
    to_regclass('public.organizations') IS NOT NULL AS organizations_table_exists,
    to_regclass('public.hospitals') IS NOT NULL AS hospitals_table_exists,
    to_regclass('public.users') IS NOT NULL AS users_table_exists,
    to_regclass('public.claims') IS NOT NULL AS claims_table_exists,
    to_regclass('public.claim_stages') IS NOT NULL AS claim_stages_table_exists,
    to_regclass('public.insurance_entities') IS NOT NULL AS insurance_partners_table_exists,
    to_regclass('public.organization_insurance_partner_enablement') IS NOT NULL
        AS organization_partner_enablement_table_exists,
    to_regclass('public.hospital_insurance_partner_integration') IS NOT NULL
        AS hospital_payer_integration_table_exists,
    to_regclass('public.reference_categories') IS NOT NULL AS reference_categories_table_exists,
    to_regclass('public.reference_values') IS NOT NULL AS reference_values_table_exists;

-- 2. Discover all existing Finance-related candidate tables.
SELECT
    table_record.table_name,
    table_record.table_type
FROM information_schema.tables AS table_record
WHERE table_record.table_schema = 'public'
  AND table_record.table_type = 'BASE TABLE'
  AND (
      table_record.table_name ILIKE '%financial%'
      OR table_record.table_name ILIKE '%remittance%'
      OR table_record.table_name ILIKE '%settlement%'
      OR table_record.table_name ILIKE '%deduction%'
      OR table_record.table_name ILIKE '%recovery%'
      OR table_record.table_name ILIKE '%reconciliation%'
      OR table_record.table_name ILIKE '%bank%'
      OR table_record.table_name ILIKE '%ledger%'
      OR table_record.table_name ILIKE '%posting%'
      OR table_record.table_name ILIKE '%writeoff%'
      OR table_record.table_name ILIKE '%payment%'
      OR table_record.table_name ILIKE '%refund%'
  )
ORDER BY table_record.table_name;

-- 3. Discover finance-oriented columns in any public table. This identifies
--    legacy financial data embedded in other aggregates such as claims.
SELECT
    column_record.table_name,
    column_record.ordinal_position,
    column_record.column_name,
    column_record.data_type,
    column_record.udt_name,
    column_record.is_nullable,
    column_record.column_default
FROM information_schema.columns AS column_record
WHERE column_record.table_schema = 'public'
  AND (
      column_record.table_name IN ('claims', 'claim_stages')
      OR column_record.table_name ILIKE '%financial%'
      OR column_record.table_name ILIKE '%remittance%'
      OR column_record.table_name ILIKE '%settlement%'
      OR column_record.table_name ILIKE '%deduction%'
      OR column_record.table_name ILIKE '%recovery%'
      OR column_record.table_name ILIKE '%reconciliation%'
      OR column_record.table_name ILIKE '%bank%'
      OR column_record.table_name ILIKE '%ledger%'
      OR column_record.table_name ILIKE '%posting%'
      OR column_record.table_name ILIKE '%writeoff%'
      OR column_record.table_name ILIKE '%payment%'
      OR column_record.column_name ILIKE '%amount%'
      OR column_record.column_name ILIKE '%settlement%'
      OR column_record.column_name ILIKE '%remittance%'
      OR column_record.column_name ILIKE '%deduction%'
      OR column_record.column_name ILIKE '%recovery%'
      OR column_record.column_name ILIKE '%reconciliation%'
      OR column_record.column_name ILIKE '%writeoff%'
      OR column_record.column_name ILIKE '%payment%'
      OR column_record.column_name ILIKE '%ledger%'
      OR column_record.column_name ILIKE '%posting%'
      OR column_record.column_name ILIKE '%bank%'
  )
ORDER BY column_record.table_name, column_record.ordinal_position;

-- 4. Map every foreign key entering or leaving discovered finance candidates.
SELECT
    source_table.relname AS source_table,
    source_column.attname AS source_column,
    foreign_key.conname AS constraint_name,
    target_table.relname AS target_table,
    target_column.attname AS target_column,
    pg_get_constraintdef(foreign_key.oid) AS constraint_definition
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
  AND source_schema.nspname = 'public'
  AND target_schema.nspname = 'public'
  AND (
      source_table.relname ILIKE '%financial%'
      OR source_table.relname ILIKE '%remittance%'
      OR source_table.relname ILIKE '%settlement%'
      OR source_table.relname ILIKE '%deduction%'
      OR source_table.relname ILIKE '%recovery%'
      OR source_table.relname ILIKE '%reconciliation%'
      OR source_table.relname ILIKE '%bank%'
      OR source_table.relname ILIKE '%ledger%'
      OR source_table.relname ILIKE '%posting%'
      OR source_table.relname ILIKE '%writeoff%'
      OR source_table.relname ILIKE '%payment%'
      OR target_table.relname ILIKE '%financial%'
      OR target_table.relname ILIKE '%remittance%'
      OR target_table.relname ILIKE '%settlement%'
      OR target_table.relname ILIKE '%deduction%'
      OR target_table.relname ILIKE '%recovery%'
      OR target_table.relname ILIKE '%reconciliation%'
      OR target_table.relname ILIKE '%bank%'
      OR target_table.relname ILIKE '%ledger%'
      OR target_table.relname ILIKE '%posting%'
      OR target_table.relname ILIKE '%writeoff%'
      OR target_table.relname ILIKE '%payment%'
  )
ORDER BY source_table.relname, foreign_key.conname, source_key.position;

-- 5. Inspect constraints on the existing Claim aggregate. Phase 9 will add
--    financial records around Claims; it must not weaken Claim tenant rules.
SELECT
    constraint_record.table_name,
    constraint_record.constraint_name,
    constraint_record.constraint_type,
    constraint_record.is_deferrable,
    constraint_record.initially_deferred
FROM information_schema.table_constraints AS constraint_record
WHERE constraint_record.table_schema = 'public'
  AND constraint_record.table_name IN ('claims', 'claim_stages')
ORDER BY
    constraint_record.table_name,
    constraint_record.constraint_type,
    constraint_record.constraint_name;

-- 6. Inspect indexes on existing Claim and discovered Finance candidates.
SELECT
    index_record.tablename AS table_name,
    index_record.indexname AS index_name,
    index_record.indexdef AS index_definition
FROM pg_indexes AS index_record
WHERE index_record.schemaname = 'public'
  AND (
      index_record.tablename IN ('claims', 'claim_stages')
      OR index_record.tablename ILIKE '%financial%'
      OR index_record.tablename ILIKE '%remittance%'
      OR index_record.tablename ILIKE '%settlement%'
      OR index_record.tablename ILIKE '%deduction%'
      OR index_record.tablename ILIKE '%recovery%'
      OR index_record.tablename ILIKE '%reconciliation%'
      OR index_record.tablename ILIKE '%bank%'
      OR index_record.tablename ILIKE '%ledger%'
      OR index_record.tablename ILIKE '%posting%'
      OR index_record.tablename ILIKE '%writeoff%'
      OR index_record.tablename ILIKE '%payment%'
  )
ORDER BY index_record.tablename, index_record.indexname;

-- 7. Inventory current claim data relevant to safe financial adoption.
--    This does not alter existing records.
SELECT
    COUNT(*) AS total_claims,
    COUNT(*) FILTER (
        WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE
    ) AS active_claims,
    COUNT(*) FILTER (
        WHERE hospital_id IS NULL
    ) AS claims_missing_hospital,
    COUNT(*) FILTER (
        WHERE payer_id IS NULL
    ) AS claims_missing_payer,
    COUNT(*) FILTER (
        WHERE last_updated_by IS NULL
    ) AS claims_missing_legacy_audit_actor
FROM public.claims;

-- 8. Read current active reference categories/values that may overlap Finance.
SELECT
    category.code AS category_code,
    value.code AS value_code,
    value.id AS reference_value_id,
    value.name AS reference_value_name
FROM public.reference_categories AS category
JOIN public.reference_values AS value
    ON value.category_id = category.id
WHERE (
      category.code ILIKE '%FINANCIAL%'
      OR category.code ILIKE '%SETTLEMENT%'
      OR category.code ILIKE '%REMITTANCE%'
      OR category.code ILIKE '%RECOVERY%'
      OR category.code ILIKE '%RECONCILIATION%'
      OR category.code ILIKE '%DEDUCTION%'
      OR category.code ILIKE '%POSTING%'
  )
  AND value.organization_id IS NULL
  AND value.is_active = TRUE
  AND value.deleted_at IS NULL
  AND COALESCE(value.is_deleted, FALSE) = FALSE
ORDER BY category.code, value.code;

-- Expected review decision:
-- - Candidate tables may be empty: Phase 9 can introduce its approved foundation.
-- - Any discovered candidate with business records, inbound foreign keys, or
--   unclear ownership requires a remediation/migration plan before physical design.
-- - Do not create, rename, alter, or delete a table as part of this preflight.
