BEGIN;

-- ============================================================================
-- TABLE: states
-- Description: Administrative states or union territories within a country.
-- ============================================================================

CREATE TABLE states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    country_id UUID NOT NULL,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,

    gst_state_code VARCHAR(2),
    is_union_territory BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    updated_at TIMESTAMPTZ,
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT fk_states_country
        FOREIGN KEY (country_id)
        REFERENCES countries(id),

    CONSTRAINT uk_states_country_code
        UNIQUE (country_id, code),

    CONSTRAINT uk_states_country_name
        UNIQUE (country_id, name),

    CONSTRAINT chk_states_version
        CHECK (version > 0)
);

COMMENT ON TABLE states IS
'Administrative states and union territories.';

COMMENT ON COLUMN states.country_id IS
'Reference to the parent country.';

COMMENT ON COLUMN states.code IS
'Unique state code within the country.';

COMMENT ON COLUMN states.name IS
'Official state or union territory name.';

COMMENT ON COLUMN states.gst_state_code IS
'GST state code used for taxation.';

COMMENT ON COLUMN states.is_union_territory IS
'Indicates whether this record represents a union territory.';

CREATE INDEX idx_states_country
    ON states(country_id);

CREATE INDEX idx_states_name
    ON states(name);

CREATE INDEX idx_states_active
    ON states(is_active);

CREATE INDEX idx_states_deleted
    ON states(is_deleted);

COMMIT;