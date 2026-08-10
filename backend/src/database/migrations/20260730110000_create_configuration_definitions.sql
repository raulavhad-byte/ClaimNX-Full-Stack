BEGIN;

-- Platform-governed catalogue for Tenant Configuration. UUIDs are supplied
-- by the application; business identifiers do not receive database defaults.
CREATE TABLE IF NOT EXISTS public.configuration_definitions (
    configuration_definition_id UUID NOT NULL,
    configuration_key VARCHAR(150) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    configuration_category VARCHAR(100) NOT NULL,
    value_type VARCHAR(20) NOT NULL,
    default_value TEXT,
    validation_rule JSONB,
    override_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_configuration_definitions PRIMARY KEY (configuration_definition_id),
    CONSTRAINT ck_configuration_definitions_key_not_blank CHECK (BTRIM(configuration_key) <> ''),
    CONSTRAINT ck_configuration_definitions_display_name_not_blank CHECK (BTRIM(display_name) <> ''),
    CONSTRAINT ck_configuration_definitions_category_not_blank CHECK (BTRIM(configuration_category) <> ''),
    CONSTRAINT ck_configuration_definitions_value_type CHECK (value_type IN ('BOOLEAN', 'INTEGER', 'STRING', 'ENUM', 'JSON')),
    CONSTRAINT ck_configuration_definitions_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_configuration_definitions_version CHECK (version >= 1),
    CONSTRAINT fk_configuration_definitions_created_by_user FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_configuration_definitions_updated_by_user FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_configuration_definitions_deleted_by_user FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_configuration_definitions_key_active
    ON public.configuration_definitions (LOWER(BTRIM(configuration_key)))
    WHERE deleted_at IS NULL AND status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_configuration_definitions_category_active
    ON public.configuration_definitions (configuration_category)
    WHERE deleted_at IS NULL AND status = 'ACTIVE';

COMMENT ON TABLE public.configuration_definitions IS
    'Platform-governed catalogue of allowed Tenant Configuration keys, types, defaults, and override policy.';

COMMIT;
