BEGIN;

-- ============================================================================
-- TABLE: cities
-- Description: Master list of cities within states.
-- ============================================================================

CREATE TABLE cities (
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    state_id UUID NOT NULL,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,

    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    updated_at TIMESTAMPTZ,
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT pk_cities
        PRIMARY KEY (id),

    CONSTRAINT fk_cities_state
        FOREIGN KEY (state_id)
        REFERENCES states(id),

    CONSTRAINT uk_cities_state_code
        UNIQUE (state_id, code),

    CONSTRAINT uk_cities_state_name
        UNIQUE (state_id, name),

    CONSTRAINT chk_cities_version
        CHECK (version > 0)
);

-- ============================================================================
-- TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE cities IS
'Master list of cities within states used across the ClaimNX platform.';

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN cities.id IS 'Primary key.';
COMMENT ON COLUMN cities.state_id IS 'Reference to the parent state.';
COMMENT ON COLUMN cities.code IS 'Unique city code within a state.';
COMMENT ON COLUMN cities.name IS 'Official city name.';
COMMENT ON COLUMN cities.latitude IS 'Latitude coordinate of the city.';
COMMENT ON COLUMN cities.longitude IS 'Longitude coordinate of the city.';
COMMENT ON COLUMN cities.is_active IS 'Whether the city is active.';
COMMENT ON COLUMN cities.created_at IS 'Record creation timestamp.';
COMMENT ON COLUMN cities.created_by IS 'User who created the record.';
COMMENT ON COLUMN cities.updated_at IS 'Record last updated timestamp.';
COMMENT ON COLUMN cities.updated_by IS 'User who last updated the record.';
COMMENT ON COLUMN cities.deleted_at IS 'Soft delete timestamp.';
COMMENT ON COLUMN cities.deleted_by IS 'User who deleted the record.';
COMMENT ON COLUMN cities.is_deleted IS 'Soft delete flag.';
COMMENT ON COLUMN cities.version IS 'Optimistic locking version.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_cities_state
    ON cities (state_id);

CREATE INDEX idx_cities_name
    ON cities (name);

CREATE INDEX idx_cities_is_active
    ON cities (is_active);

CREATE INDEX idx_cities_is_deleted
    ON cities (is_deleted);

COMMIT;