BEGIN;

CREATE TABLE IF NOT EXISTS organizations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_code VARCHAR(30) NOT NULL,
    organization_name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(250),

    organization_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    email VARCHAR(150),
    phone VARCHAR(30),
    website VARCHAR(250),

    tax_number VARCHAR(100),
    registration_number VARCHAR(100),

    logo_url TEXT,
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT uq_organizations_code
        UNIQUE (organization_code),

    CONSTRAINT chk_organizations_status
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);


COMMENT ON TABLE organizations IS
'Represents a tenant organization such as a hospital group or healthcare provider.';

COMMENT ON COLUMN organizations.organization_code IS
'Unique business identifier for the organization.';

COMMENT ON COLUMN organizations.organization_name IS
'Display name of the organization.';

COMMENT ON COLUMN organizations.organization_type IS
'Classification of the organization.';

COMMENT ON COLUMN organizations.status IS
'Current lifecycle status of the organization.';

CREATE INDEX IF NOT EXISTS idx_organizations_name
ON organizations (organization_name);

CREATE INDEX IF NOT EXISTS idx_organizations_status
ON organizations (status);

COMMIT;