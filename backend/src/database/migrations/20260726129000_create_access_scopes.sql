BEGIN;

-- ============================================================================
-- TABLE: access_scopes
-- Description: Master list of access scope types used throughout ClaimNX.
-- ============================================================================

CREATE TABLE access_scopes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

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

    CONSTRAINT pk_access_scopes
        PRIMARY KEY (id),

    CONSTRAINT uk_access_scopes_code
        UNIQUE (code),

    CONSTRAINT uk_access_scopes_name
        UNIQUE (name),

    CONSTRAINT chk_access_scopes_display_order
        CHECK (display_order > 0),

    CONSTRAINT chk_access_scopes_version
        CHECK (version > 0)
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE access_scopes IS
'Master list of access scope types used for authorization.';

COMMENT ON COLUMN access_scopes.code IS
'Unique access scope code.';

COMMENT ON COLUMN access_scopes.name IS
'Access scope name.';

COMMENT ON COLUMN access_scopes.description IS
'Description of the access scope.';

COMMENT ON COLUMN access_scopes.display_order IS
'Display order.';

COMMENT ON COLUMN access_scopes.is_active IS
'Whether the access scope is active.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_access_scopes_active
    ON access_scopes(is_active);

CREATE INDEX idx_access_scopes_deleted
    ON access_scopes(is_deleted);

CREATE INDEX idx_access_scopes_display_order
    ON access_scopes(display_order);

COMMIT;