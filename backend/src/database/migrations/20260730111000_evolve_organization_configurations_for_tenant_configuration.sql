BEGIN;

-- Safe forward evolution of the legacy configuration table. Preflight proved
-- zero records and no inbound dependencies on 2026-07-30; abort if that has
-- changed rather than attempting an unreviewed data migration.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.organization_configurations) THEN
        RAISE EXCEPTION 'Tenant Configuration evolution requires an empty organization_configurations table. Create an approved data-migration plan first.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = 'organization_configurations'
          AND tc.table_name <> 'organization_configurations'
    ) THEN
        RAISE EXCEPTION 'Tenant Configuration evolution detected inbound foreign-key dependencies. Review is required before continuing.';
    END IF;
END $$;

ALTER TABLE public.organization_configurations
    ADD COLUMN IF NOT EXISTS configuration_definition_id UUID;

-- Legacy global uniqueness prevents soft-delete reuse. Replace it because the
-- new active uniqueness is Organisation + Definition scoped.
ALTER TABLE public.organization_configurations
    DROP CONSTRAINT IF EXISTS uk_org_configuration;

ALTER TABLE public.organization_configurations
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN updated_by SET NOT NULL,
    ALTER COLUMN configuration_definition_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_configurations'::regclass AND conname = 'fk_organization_configurations_definition') THEN
        ALTER TABLE public.organization_configurations
            ADD CONSTRAINT fk_organization_configurations_definition
            FOREIGN KEY (configuration_definition_id)
            REFERENCES public.configuration_definitions(configuration_definition_id)
            ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_configurations'::regclass AND conname = 'fk_organization_configurations_created_by_user') THEN
        ALTER TABLE public.organization_configurations
            ADD CONSTRAINT fk_organization_configurations_created_by_user FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_configurations'::regclass AND conname = 'fk_organization_configurations_updated_by_user') THEN
        ALTER TABLE public.organization_configurations
            ADD CONSTRAINT fk_organization_configurations_updated_by_user FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_configurations'::regclass AND conname = 'fk_organization_configurations_deleted_by_user') THEN
        ALTER TABLE public.organization_configurations
            ADD CONSTRAINT fk_organization_configurations_deleted_by_user FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_configurations'::regclass AND conname = 'ck_organization_configurations_key_not_blank') THEN
        ALTER TABLE public.organization_configurations
            ADD CONSTRAINT ck_organization_configurations_key_not_blank CHECK (BTRIM(config_key) <> '');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organization_configurations'::regclass AND conname = 'ck_organization_configurations_version') THEN
        ALTER TABLE public.organization_configurations
            ADD CONSTRAINT ck_organization_configurations_version CHECK (version >= 1);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_configurations_org_definition_active
    ON public.organization_configurations (organization_id, configuration_definition_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_organization_configurations_organization_active
    ON public.organization_configurations (organization_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_organization_configurations_definition_active
    ON public.organization_configurations (configuration_definition_id)
    WHERE deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

COMMENT ON TABLE public.organization_configurations IS
    'Organization-scoped Tenant Configuration Overrides. Legacy table retained and evolved forward in Phase 5.';
COMMENT ON COLUMN public.organization_configurations.config_key IS
    'Compatibility mirror of configuration_definitions.configuration_key. New writes derive it from the Definition.';
COMMENT ON COLUMN public.organization_configurations.config_value IS
    'Organization override value, validated against the governing Configuration Definition.';

COMMIT;
