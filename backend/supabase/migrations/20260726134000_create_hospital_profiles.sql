BEGIN;

-- ============================================================================
-- TABLE: hospital_profiles
-- Description:
-- Stores operational profile information for hospitals.
-- ============================================================================

CREATE TABLE hospital_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid(),

    hospital_id UUID NOT NULL,

    legal_name VARCHAR(255) NOT NULL,

    display_name VARCHAR(255),

    short_name VARCHAR(100),

    description TEXT,

    website VARCHAR(500),

    established_date DATE,

    bed_capacity INTEGER,

    is_teaching_hospital BOOLEAN NOT NULL DEFAULT FALSE,

    is_emergency_available BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    updated_at TIMESTAMPTZ,
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT pk_hospital_profiles
        PRIMARY KEY (id),

    CONSTRAINT fk_hospital_profiles_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id),

    CONSTRAINT uq_hospital_profiles_hospital
        UNIQUE (hospital_id),

    CONSTRAINT chk_hospital_profiles_bed_capacity
        CHECK (
            bed_capacity IS NULL
            OR bed_capacity >= 0
        ),

    CONSTRAINT chk_hospital_profiles_version
        CHECK (version > 0)
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE hospital_profiles IS
'Stores operational profile information for hospitals.';

COMMENT ON COLUMN hospital_profiles.hospital_id IS
'Reference to the hospital.';

COMMENT ON COLUMN hospital_profiles.legal_name IS
'Registered legal name of the hospital.';

COMMENT ON COLUMN hospital_profiles.display_name IS
'Business display name.';

COMMENT ON COLUMN hospital_profiles.short_name IS
'Short display name.';

COMMENT ON COLUMN hospital_profiles.description IS
'General description of the hospital.';

COMMENT ON COLUMN hospital_profiles.website IS
'Official website URL.';

COMMENT ON COLUMN hospital_profiles.established_date IS
'Hospital establishment date.';

COMMENT ON COLUMN hospital_profiles.bed_capacity IS
'Licensed bed capacity.';

COMMENT ON COLUMN hospital_profiles.is_teaching_hospital IS
'Indicates whether the hospital is a teaching institution.';

COMMENT ON COLUMN hospital_profiles.is_emergency_available IS
'Indicates whether emergency services are available.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_hospital_profiles_hospital
    ON hospital_profiles(hospital_id);

CREATE INDEX idx_hospital_profiles_active
    ON hospital_profiles(is_active);

CREATE INDEX idx_hospital_profiles_deleted
    ON hospital_profiles(is_deleted);

COMMIT;