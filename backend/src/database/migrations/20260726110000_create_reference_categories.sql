BEGIN;

-- ============================================================================
-- TABLE: reference_categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS reference_categories
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    code VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,

    is_system BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT pk_reference_categories
        PRIMARY KEY (id),

    CONSTRAINT uk_reference_categories_code
        UNIQUE (code),

    CONSTRAINT uk_reference_categories_name
        UNIQUE (name)
);

-- ============================================================================
-- TABLE COMMENT
-- ============================================================================
COMMENT ON TABLE reference_categories IS
'Stores business reference data categories used throughout the ClaimNX platform.';

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================
COMMENT ON COLUMN reference_categories.id IS
'Primary key of the reference category.';

COMMENT ON COLUMN reference_categories.code IS
'System-defined unique code for the reference category.';

COMMENT ON COLUMN reference_categories.name IS
'Display name of the reference category.';

COMMENT ON COLUMN reference_categories.description IS
'Detailed description of the reference category.';

COMMENT ON COLUMN reference_categories.is_system IS
'Indicates whether the category is system-defined and protected from deletion.';

COMMENT ON COLUMN reference_categories.created_at IS
'Timestamp when the record was created.';

COMMENT ON COLUMN reference_categories.created_by IS
'User who created the record.';

COMMENT ON COLUMN reference_categories.updated_at IS
'Timestamp when the record was last updated.';

COMMENT ON COLUMN reference_categories.updated_by IS
'User who last updated the record.';

COMMENT ON COLUMN reference_categories.deleted_at IS
'Timestamp when the record was soft deleted.';

COMMENT ON COLUMN reference_categories.deleted_by IS
'User who soft deleted the record.';

COMMENT ON COLUMN reference_categories.is_deleted IS
'Indicates whether the record has been soft deleted.';

COMMENT ON COLUMN reference_categories.version IS
'Optimistic locking version number.';

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_reference_categories_code
ON reference_categories(code);

CREATE INDEX IF NOT EXISTS idx_reference_categories_name
ON reference_categories(name);

CREATE INDEX IF NOT EXISTS idx_reference_categories_is_system
ON reference_categories(is_system);

CREATE INDEX IF NOT EXISTS idx_reference_categories_is_deleted
ON reference_categories(is_deleted);

COMMIT;