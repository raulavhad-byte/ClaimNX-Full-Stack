-- ============================================================================
-- ClaimNX Phase 6 - Workflow Physical Design Discovery (READ ONLY)
-- ============================================================================
-- Objective: inventory all existing public Workflow-family tables after the
-- legacy preflight identified dependencies beyond instances and queues.
--
-- Safety: this file contains SELECT statements only. It changes nothing.
-- Run Section 1 first and share the result before running any later section.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Complete public Workflow-family table and column inventory
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
  AND table_name LIKE 'workflow_%'
ORDER BY table_name, ordinal_position;

-- ---------------------------------------------------------------------------
-- 2. Workflow-family foreign keys: both internal and connections to external
--    ClaimNX domains. Run after Section 1 if the result needs more detail.
-- ---------------------------------------------------------------------------
SELECT
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
  AND source_schema.nspname = 'public'
  AND source_table.relname LIKE 'workflow_%'
ORDER BY source_table.relname, foreign_key.conname, source_key.position;

-- ---------------------------------------------------------------------------
-- 3. Workflow-family record counts
--    The exact table list was confirmed by the 2026-07-30 inventory.
-- ---------------------------------------------------------------------------
SELECT 'workflow_assignments' AS table_name, COUNT(*) AS total_records FROM public.workflow_assignments
UNION ALL SELECT 'workflow_attachments', COUNT(*) FROM public.workflow_attachments
UNION ALL SELECT 'workflow_comments', COUNT(*) FROM public.workflow_comments
UNION ALL SELECT 'workflow_definitions', COUNT(*) FROM public.workflow_definitions
UNION ALL SELECT 'workflow_escalation_rules', COUNT(*) FROM public.workflow_escalation_rules
UNION ALL SELECT 'workflow_escalations', COUNT(*) FROM public.workflow_escalations
UNION ALL SELECT 'workflow_history', COUNT(*) FROM public.workflow_history
UNION ALL SELECT 'workflow_instances', COUNT(*) FROM public.workflow_instances
UNION ALL SELECT 'workflow_notifications', COUNT(*) FROM public.workflow_notifications
UNION ALL SELECT 'workflow_queues', COUNT(*) FROM public.workflow_queues
UNION ALL SELECT 'workflow_sla', COUNT(*) FROM public.workflow_sla
UNION ALL SELECT 'workflow_states', COUNT(*) FROM public.workflow_states
UNION ALL SELECT 'workflow_tasks', COUNT(*) FROM public.workflow_tasks
UNION ALL SELECT 'workflow_transitions', COUNT(*) FROM public.workflow_transitions
ORDER BY table_name;
-- ---------------------------------------------------------------------------
