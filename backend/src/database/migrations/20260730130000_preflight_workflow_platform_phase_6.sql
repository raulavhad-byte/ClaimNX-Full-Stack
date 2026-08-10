-- ============================================================================
-- ClaimNX Phase 6: Workflow Platform migration preflight
-- ============================================================================
-- Forward-only, transactional safety gate.
-- This migration changes no schema or data. It proves the legacy database is
-- the reviewed empty baseline before any additive Workflow evolution can run.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    required_table TEXT;
    workflow_table_count INTEGER;
    workflow_foreign_key_count INTEGER;
BEGIN
    FOREACH required_table IN ARRAY ARRAY[
        'workflow_assignments',
        'workflow_attachments',
        'workflow_comments',
        'workflow_definitions',
        'workflow_escalation_rules',
        'workflow_escalations',
        'workflow_history',
        'workflow_instances',
        'workflow_notifications',
        'workflow_queues',
        'workflow_sla',
        'workflow_states',
        'workflow_tasks',
        'workflow_transitions'
    ]
    LOOP
        IF to_regclass('public.' || required_table) IS NULL THEN
            RAISE EXCEPTION
                'Phase 6 Workflow migration blocked: required table public.% does not exist.',
                required_table;
        END IF;
    END LOOP;

    SELECT COUNT(*)
      INTO workflow_table_count
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name LIKE 'workflow_%'
       AND table_type = 'BASE TABLE';

    IF workflow_table_count <> 14 THEN
        RAISE EXCEPTION
            'Phase 6 Workflow migration blocked: expected 14 public Workflow tables, found %.',
            workflow_table_count;
    END IF;

    IF EXISTS (SELECT 1 FROM public.workflow_assignments)
       OR EXISTS (SELECT 1 FROM public.workflow_attachments)
       OR EXISTS (SELECT 1 FROM public.workflow_comments)
       OR EXISTS (SELECT 1 FROM public.workflow_definitions)
       OR EXISTS (SELECT 1 FROM public.workflow_escalation_rules)
       OR EXISTS (SELECT 1 FROM public.workflow_escalations)
       OR EXISTS (SELECT 1 FROM public.workflow_history)
       OR EXISTS (SELECT 1 FROM public.workflow_instances)
       OR EXISTS (SELECT 1 FROM public.workflow_notifications)
       OR EXISTS (SELECT 1 FROM public.workflow_queues)
       OR EXISTS (SELECT 1 FROM public.workflow_sla)
       OR EXISTS (SELECT 1 FROM public.workflow_states)
       OR EXISTS (SELECT 1 FROM public.workflow_tasks)
       OR EXISTS (SELECT 1 FROM public.workflow_transitions) THEN
        RAISE EXCEPTION
            'Phase 6 Workflow migration blocked: legacy Workflow data exists. A reviewed data migration is required.';
    END IF;

    SELECT COUNT(*)
      INTO workflow_foreign_key_count
      FROM pg_constraint foreign_key
      JOIN pg_class source_table
        ON source_table.oid = foreign_key.conrelid
      JOIN pg_namespace source_schema
        ON source_schema.oid = source_table.relnamespace
     WHERE foreign_key.contype = 'f'
       AND source_schema.nspname = 'public'
       AND source_table.relname LIKE 'workflow_%';

    IF workflow_foreign_key_count <> 33 THEN
        RAISE EXCEPTION
            'Phase 6 Workflow migration blocked: expected 33 outbound Workflow foreign keys, found %.',
            workflow_foreign_key_count;
    END IF;

    IF to_regclass('public.organizations') IS NULL
       OR to_regclass('public.hospitals') IS NULL
       OR to_regclass('public.organization_members') IS NULL
       OR to_regclass('public.users') IS NULL THEN
        RAISE EXCEPTION
            'Phase 6 Workflow migration blocked: Organization, Hospital, Organization Member, or User dependency is missing.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hospitals'
          AND column_name = 'organization_id'
    ) THEN
        RAISE EXCEPTION
            'Phase 6 Workflow migration blocked: public.hospitals.organization_id is required for tenant derivation.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'organization_members'
          AND column_name IN ('id', 'organization_id', 'user_id', 'status')
        GROUP BY table_name
        HAVING COUNT(*) = 4
    ) THEN
        RAISE EXCEPTION
            'Phase 6 Workflow migration blocked: Organization Member tenancy columns are incomplete.';
    END IF;
END $$;

COMMIT;
