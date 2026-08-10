BEGIN;

-- ============================================================================
-- TABLE: organization_type_roles
-- Description:
-- Maps organization types to the roles that can be assigned within them.
-- ============================================================================

CREATE TABLE organization_type_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    organization_type_id UUID NOT NULL,

    role_id UUID NOT NULL,

    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    is_assignable BOOLEAN NOT NULL DEFAULT TRUE,

    display_order INTEGER NOT NULL DEFAULT 1,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    updated_at TIMESTAMPTZ,
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT pk_organization_type_roles
        PRIMARY KEY (id),

    CONSTRAINT fk_organization_type_roles_organization_type
        FOREIGN KEY (organization_type_id)
        REFERENCES reference_values(id),

    CONSTRAINT fk_organization_type_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id),

    CONSTRAINT uq_organization_type_roles
        UNIQUE (
            organization_type_id,
            role_id
        ),

    CONSTRAINT chk_organization_type_roles_display_order
        CHECK (display_order > 0),

    CONSTRAINT chk_organization_type_roles_version
        CHECK (version > 0)
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organization_type_roles IS
'Defines which roles are available for each organization type.';

COMMENT ON COLUMN organization_type_roles.organization_type_id IS
'Reference to the organization type.';

COMMENT ON COLUMN organization_type_roles.role_id IS
'Reference to the IAM role.';

COMMENT ON COLUMN organization_type_roles.is_default IS
'Indicates whether the role is assigned by default.';

COMMENT ON COLUMN organization_type_roles.is_assignable IS
'Indicates whether tenant administrators can assign this role.';

COMMENT ON COLUMN organization_type_roles.display_order IS
'Display order in user interfaces.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_otr_org_type
    ON organization_type_roles (organization_type_id);

CREATE INDEX idx_otr_role
    ON organization_type_roles (role_id);

CREATE INDEX idx_otr_active
    ON organization_type_roles (is_active);

CREATE INDEX idx_otr_deleted
    ON organization_type_roles (is_deleted);

CREATE INDEX idx_otr_display_order
    ON organization_type_roles (display_order);

COMMIT;