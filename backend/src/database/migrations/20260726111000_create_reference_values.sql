BEGIN;

-- ============================================================================
-- TABLE: reference_values
-- ============================================================================
CREATE TABLE IF NOT EXISTS reference_values
(
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    category_id UUID NOT NULL,

    organization_id UUID,

    code VARCHAR(100) NOT NULL,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    display_order INTEGER NOT NULL DEFAULT 0,

    attributes JSONB,

    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT pk_reference_values
        PRIMARY KEY (id),

    CONSTRAINT fk_reference_values_category
        FOREIGN KEY (category_id)
        REFERENCES reference_categories(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_reference_values_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uk_reference_values_category_code
        UNIQUE (category_id, organization_id, code)
);

-- ============================================================================
-- TABLE COMMENT
-- ============================================================================
COMMENT ON TABLE reference_values IS
'Stores values belonging to reference categories. Values may be global or organization specific.';

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================
COMMENT ON COLUMN reference_values.id IS
'Primary key of the reference value.';

COMMENT ON COLUMN reference_values.category_id IS
'Reference category identifier.';

COMMENT ON COLUMN reference_values.organization_id IS
'Organization identifier. NULL indicates a global system value.';

COMMENT ON COLUMN reference_values.code IS
'System unique code within the category.';

COMMENT ON COLUMN reference_values.name IS
'Display name shown in the application.';

COMMENT ON COLUMN reference_values.description IS
'Detailed description of the reference value.';

COMMENT ON COLUMN reference_values.display_order IS
'Controls ordering in dropdowns and lists.';

COMMENT ON COLUMN reference_values.attributes IS
'Additional configurable business attributes stored as JSONB.';

COMMENT ON COLUMN reference_values.is_default IS
'Indicates whether this is the default value within the category.';

COMMENT ON COLUMN reference_values.is_active IS
'Indicates whether the value is available for use.';

COMMENT ON COLUMN reference_values.created_at IS
'Record creation timestamp.';

COMMENT ON COLUMN reference_values.created_by IS
'User who created the record.';

COMMENT ON COLUMN reference_values.updated_at IS
'Record last updated timestamp.';

COMMENT ON COLUMN reference_values.updated_by IS
'User who last updated the record.';

COMMENT ON COLUMN reference_values.deleted_at IS
'Soft deletion timestamp.';

COMMENT ON COLUMN reference_values.deleted_by IS
'User who soft deleted the record.';

COMMENT ON COLUMN reference_values.is_deleted IS
'Soft delete indicator.';

COMMENT ON COLUMN reference_values.version IS
'Optimistic locking version number.';

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_reference_values_category
ON reference_values(category_id);

CREATE INDEX IF NOT EXISTS idx_reference_values_organization
ON reference_values(organization_id);

CREATE INDEX IF NOT EXISTS idx_reference_values_code
ON reference_values(code);

CREATE INDEX IF NOT EXISTS idx_reference_values_name
ON reference_values(name);

CREATE INDEX IF NOT EXISTS idx_reference_values_display_order
ON reference_values(display_order);

CREATE INDEX IF NOT EXISTS idx_reference_values_is_default
ON reference_values(is_default);

CREATE INDEX IF NOT EXISTS idx_reference_values_is_active
ON reference_values(is_active);

CREATE INDEX IF NOT EXISTS idx_reference_values_is_deleted
ON reference_values(is_deleted);

COMMIT;