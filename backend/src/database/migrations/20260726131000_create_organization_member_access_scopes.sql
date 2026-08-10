BEGIN;

-- ============================================================================
-- TABLE: organization_member_access_scopes
-- Description:
-- Assigns access scopes (Country, Zone, State, City, Hospital, Department,
-- etc.) to organization members.
-- ============================================================================

CREATE TABLE organization_member_access_scopes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    organization_member_id UUID NOT NULL,

    access_scope_id UUID NOT NULL,

    entity_id UUID NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    updated_at TIMESTAMPTZ,
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT pk_organization_member_access_scopes
        PRIMARY KEY (id),

    CONSTRAINT fk_organization_member_access_scopes_member
        FOREIGN KEY (organization_member_id)
        REFERENCES organization_members(id),

    CONSTRAINT fk_organization_member_access_scopes_scope
        FOREIGN KEY (access_scope_id)
        REFERENCES access_scopes(id),

    CONSTRAINT uq_organization_member_access_scope
        UNIQUE (
            organization_member_id,
            access_scope_id,
            entity_id
        ),

    CONSTRAINT chk_organization_member_access_scopes_version
        CHECK (version > 0)
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organization_member_access_scopes IS
'Assigns access scopes to organization members for authorization.';

COMMENT ON COLUMN organization_member_access_scopes.organization_member_id IS
'Organization member receiving the access scope.';

COMMENT ON COLUMN organization_member_access_scopes.access_scope_id IS
'Type of access scope (Country, Zone, State, City, Hospital, Department, etc.).';

COMMENT ON COLUMN organization_member_access_scopes.entity_id IS
'Identifier of the entity belonging to the selected access scope.';

COMMENT ON COLUMN organization_member_access_scopes.is_active IS
'Indicates whether this access assignment is active.';

COMMENT ON COLUMN organization_member_access_scopes.is_deleted IS
'Soft delete flag.';

COMMENT ON COLUMN organization_member_access_scopes.version IS
'Optimistic locking version.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_omas_member
    ON organization_member_access_scopes (organization_member_id);

CREATE INDEX idx_omas_scope
    ON organization_member_access_scopes (access_scope_id);

CREATE INDEX idx_omas_entity
    ON organization_member_access_scopes (entity_id);

CREATE INDEX idx_omas_active
    ON organization_member_access_scopes (is_active);

CREATE INDEX idx_omas_deleted
    ON organization_member_access_scopes (is_deleted);

CREATE INDEX idx_omas_member_scope
    ON organization_member_access_scopes (
        organization_member_id,
        access_scope_id
    );

COMMIT;