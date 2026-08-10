BEGIN;

CREATE TABLE IF NOT EXISTS organization_members (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    user_id UUID NOT NULL,

    employee_code VARCHAR(50),

    designation VARCHAR(100),

    joining_date DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT uk_org_member
        UNIQUE (organization_id, user_id),

    CONSTRAINT chk_org_member_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'SUSPENDED'
            )
        ),

    CONSTRAINT fk_org_member_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_org_member_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);

COMMENT ON TABLE organization_members IS
'Represents the assignment of IAM users to an organization.';

COMMENT ON COLUMN organization_members.organization_id IS
'Reference to the organization.';

COMMENT ON COLUMN organization_members.user_id IS
'Reference to the IAM user.';

COMMENT ON COLUMN organization_members.employee_code IS
'Organization-specific employee identifier.';

COMMENT ON COLUMN organization_members.designation IS
'Business designation within the organization.';

COMMENT ON COLUMN organization_members.status IS
'Current membership status.';

CREATE INDEX IF NOT EXISTS idx_org_member_organization
ON organization_members (organization_id);

CREATE INDEX IF NOT EXISTS idx_org_member_user
ON organization_members (user_id);

CREATE INDEX IF NOT EXISTS idx_org_member_status
ON organization_members (status);

COMMIT;