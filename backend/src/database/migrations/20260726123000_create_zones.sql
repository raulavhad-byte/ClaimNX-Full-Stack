BEGIN;

-- ============================================================================
-- TABLE: zones
-- Description: Business operational zones used for hospital operations,
-- reporting, access control, and territory management.
-- ============================================================================

CREATE TABLE zones (
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    country_id UUID NOT NULL,

    code VARCHAR(20) NOT NULL,
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

    CONSTRAINT pk_zones
        PRIMARY KEY (id),

    CONSTRAINT fk_zones_country
        FOREIGN KEY (country_id)
        REFERENCES countries(id),

    CONSTRAINT uk_zones_country_code
        UNIQUE (country_id, code),

    CONSTRAINT uk_zones_country_name
        UNIQUE (country_id, name),

    CONSTRAINT chk_zones_display_order
        CHECK (display_order > 0),

    CONSTRAINT chk_zones_version
        CHECK (version > 0)
);

-- ============================================================================
-- TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE zones IS
'Business operational zones used for regional management and access control.';

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN zones.id IS 'Primary key.';
COMMENT ON COLUMN zones.country_id IS 'Reference to the parent country.';
COMMENT ON COLUMN zones.code IS 'Unique zone code within the country.';
COMMENT ON COLUMN zones.name IS 'Zone name.';
COMMENT ON COLUMN zones.description IS 'Business description of the zone.';
COMMENT ON COLUMN zones.display_order IS 'Display order.';
COMMENT ON COLUMN zones.is_active IS 'Whether the zone is active.';
COMMENT ON COLUMN zones.created_at IS 'Record creation timestamp.';
COMMENT ON COLUMN zones.created_by IS 'User who created the record.';
COMMENT ON COLUMN zones.updated_at IS 'Record last update timestamp.';
COMMENT ON COLUMN zones.updated_by IS 'User who last updated the record.';
COMMENT ON COLUMN zones.deleted_at IS 'Soft delete timestamp.';
COMMENT ON COLUMN zones.deleted_by IS 'User who deleted the record.';
COMMENT ON COLUMN zones.is_deleted IS 'Soft delete flag.';
COMMENT ON COLUMN zones.version IS 'Optimistic locking version.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_zones_country
    ON zones(country_id);

CREATE INDEX idx_zones_name
    ON zones(name);

CREATE INDEX idx_zones_display_order
    ON zones(display_order);

CREATE INDEX idx_zones_is_active
    ON zones(is_active);

CREATE INDEX idx_zones_is_deleted
    ON zones(is_deleted);

COMMIT;