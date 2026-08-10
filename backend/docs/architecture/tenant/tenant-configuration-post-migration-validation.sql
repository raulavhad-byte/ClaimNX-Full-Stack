-- Tenant Configuration post-migration validation (read only)
-- Expected result: every structural flag is true and both record counts are 0.

SELECT
    to_regclass('public.configuration_definitions') IS NOT NULL AS configuration_definitions_table_exists,
    to_regclass('public.organization_configurations') IS NOT NULL AS organization_configurations_table_exists,
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'organization_configurations'
          AND column_name = 'configuration_definition_id'
          AND is_nullable = 'NO'
    ) AS override_definition_required,
    EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.organization_configurations'::regclass
          AND conname = 'fk_organization_configurations_definition'
          AND contype = 'f'
    ) AS override_definition_fk_exists,
    EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.configuration_definitions'::regclass
          AND conname = 'pk_configuration_definitions'
          AND contype = 'p'
    ) AS definition_primary_key_exists,
    EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_configuration_definitions_key_active'
    ) AS active_definition_key_uniqueness_exists,
    EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_organization_configurations_org_definition_active'
    ) AS active_organization_definition_uniqueness_exists,
    (SELECT COUNT(*) FROM public.configuration_definitions) AS configuration_definition_records,
    (SELECT COUNT(*) FROM public.organization_configurations) AS organization_configuration_records;
