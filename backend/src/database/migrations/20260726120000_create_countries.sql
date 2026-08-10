BEGIN;

-- ============================================================================
-- TABLE: countries
-- Description: Master list of countries used throughout the ClaimNX platform.
-- ============================================================================

CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(10) NOT NULL,
    iso2 CHAR(2) NOT NULL,
    iso3 CHAR(3) NOT NULL,

    name VARCHAR(100) NOT NULL,

    phone_code VARCHAR(10),
    currency_code CHAR(3),
    timezone VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    updated_at TIMESTAMPTZ,
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT pk_countries PRIMARY KEY (id),

    CONSTRAINT uk_countries_code UNIQUE (code),
    CONSTRAINT uk_countries_iso2 UNIQUE (iso2),
    CONSTRAINT uk_countries_iso3 UNIQUE (iso3),
    CONSTRAINT uk_countries_name UNIQUE (name),

    CONSTRAINT chk_countries_version CHECK (version > 0)
);

-- ============================================================================
-- TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE countries IS
'Master list of countries supported by the ClaimNX platform.';

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN countries.id IS 'Primary key.';
COMMENT ON COLUMN countries.code IS 'Internal country code.';
COMMENT ON COLUMN countries.iso2 IS 'ISO 3166-1 Alpha-2 country code.';
COMMENT ON COLUMN countries.iso3 IS 'ISO 3166-1 Alpha-3 country code.';
COMMENT ON COLUMN countries.name IS 'Official country name.';
COMMENT ON COLUMN countries.phone_code IS 'International dialing code.';
COMMENT ON COLUMN countries.currency_code IS 'ISO 4217 currency code.';
COMMENT ON COLUMN countries.timezone IS 'Default timezone.';
COMMENT ON COLUMN countries.is_active IS 'Whether the country is active.';
COMMENT ON COLUMN countries.created_at IS 'Record creation timestamp.';
COMMENT ON COLUMN countries.created_by IS 'User who created the record.';
COMMENT ON COLUMN countries.updated_at IS 'Record last update timestamp.';
COMMENT ON COLUMN countries.updated_by IS 'User who last updated the record.';
COMMENT ON COLUMN countries.deleted_at IS 'Soft delete timestamp.';
COMMENT ON COLUMN countries.deleted_by IS 'User who deleted the record.';
COMMENT ON COLUMN countries.is_deleted IS 'Soft delete flag.';
COMMENT ON COLUMN countries.version IS 'Optimistic locking version.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_countries_is_active
    ON countries (is_active);

CREATE INDEX idx_countries_is_deleted
    ON countries (is_deleted);

CREATE INDEX idx_countries_name
    ON countries (name);

COMMIT;