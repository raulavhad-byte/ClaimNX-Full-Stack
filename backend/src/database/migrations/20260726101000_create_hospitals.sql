BEGIN;

CREATE TABLE IF NOT EXISTS hospitals (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    hospital_code VARCHAR(30) NOT NULL,

    organization_id UUID NOT NULL,

    hospital_name VARCHAR(200) NOT NULL,

    legal_name VARCHAR(250),

    rohini_id VARCHAR(50),

    hospital_type VARCHAR(50) NOT NULL,

    email VARCHAR(150),

    phone VARCHAR(30),

    website VARCHAR(250),

    address_line1 VARCHAR(255),

    address_line2 VARCHAR(255),

    city VARCHAR(100),

    state VARCHAR(100),

    country VARCHAR(100),

    postal_code VARCHAR(20),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT uk_hospitals_code
        UNIQUE (hospital_code),

    CONSTRAINT chk_hospitals_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'SUSPENDED'
            )
        ),

    CONSTRAINT fk_hospitals_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);

COMMENT ON TABLE hospitals IS
'Represents a healthcare facility or hospital branch that belongs to an organization.';

COMMENT ON COLUMN hospitals.hospital_code IS
'Unique business identifier for the hospital.';

COMMENT ON COLUMN hospitals.organization_id IS
'Reference to the owning organization.';

COMMENT ON COLUMN hospitals.hospital_name IS
'Display name of the hospital.';

COMMENT ON COLUMN hospitals.hospital_type IS
'Classification of the hospital.';

COMMENT ON COLUMN hospitals.status IS
'Current lifecycle status of the hospital.';

CREATE INDEX IF NOT EXISTS idx_hospitals_name
ON hospitals (hospital_name);

CREATE INDEX IF NOT EXISTS idx_hospitals_organization
ON hospitals (organization_id);

CREATE INDEX IF NOT EXISTS idx_hospitals_status
ON hospitals (status);

COMMIT;