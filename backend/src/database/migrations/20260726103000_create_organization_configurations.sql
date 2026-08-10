BEGIN;

CREATE TABLE IF NOT EXISTS organization_configurations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    config_key VARCHAR(150) NOT NULL,

    config_value TEXT,

    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT uk_org_configuration
        UNIQUE (organization_id, config_key),

    CONSTRAINT chk_org_configuration_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE'
            )
        ),

    CONSTRAINT fk_org_configuration_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);

COMMENT ON TABLE organization_configurations IS
'Stores configurable settings and feature flags for an organization.';

COMMENT ON COLUMN organization_configurations.organization_id IS
'Reference to the owning organization.';

COMMENT ON COLUMN organization_configurations.config_key IS
'Unique configuration key within an organization.';

COMMENT ON COLUMN organization_configurations.config_value IS
'Configuration value stored as text.';

COMMENT ON COLUMN organization_configurations.status IS
'Current lifecycle status of the configuration entry.';

CREATE INDEX IF NOT EXISTS idx_org_configuration_organization
ON organization_configurations (organization_id);

CREATE INDEX IF NOT EXISTS idx_org_configuration_key
ON organization_configurations (config_key);

CREATE INDEX IF NOT EXISTS idx_org_configuration_status
ON organization_configurations (status);

COMMIT;