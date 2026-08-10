BEGIN;

-- Phase 5: Hospital Aggregate child tables.
-- UUIDs have no database defaults; the application creates UUIDs for normal operations.

CREATE TABLE IF NOT EXISTS hospital_address (
    hospital_address_id UUID NOT NULL,
    hospital_id UUID NOT NULL,
    address_type_reference_value_id UUID NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    landmark VARCHAR(255),
    country_id UUID NOT NULL,
    state_id UUID NOT NULL,
    city_id UUID NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_hospital_address PRIMARY KEY (hospital_address_id),
    CONSTRAINT fk_hospital_address_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_address_address_type FOREIGN KEY (address_type_reference_value_id) REFERENCES reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_address_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_address_state FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_address_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_address_created_by_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_address_updated_by_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_address_deleted_by_user FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_hospital_address_version CHECK (version >= 1),
    CONSTRAINT ck_hospital_address_line1_not_blank CHECK (BTRIM(address_line1) <> ''),
    CONSTRAINT ck_hospital_address_postal_code_not_blank CHECK (BTRIM(postal_code) <> '')
);

CREATE TABLE IF NOT EXISTS hospital_contact (
    hospital_contact_id UUID NOT NULL,
    hospital_id UUID NOT NULL,
    contact_type_reference_value_id UUID NOT NULL,
    contact_name VARCHAR(200) NOT NULL,
    designation VARCHAR(150),
    email_address VARCHAR(320),
    phone_number VARCHAR(30) NOT NULL,
    mobile_number VARCHAR(30),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_hospital_contact PRIMARY KEY (hospital_contact_id),
    CONSTRAINT fk_hospital_contact_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_contact_contact_type FOREIGN KEY (contact_type_reference_value_id) REFERENCES reference_values(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_contact_created_by_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_contact_updated_by_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hospital_contact_deleted_by_user FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_hospital_contact_version CHECK (version >= 1),
    CONSTRAINT ck_hospital_contact_name_not_blank CHECK (BTRIM(contact_name) <> ''),
    CONSTRAINT ck_hospital_contact_phone_not_blank CHECK (BTRIM(phone_number) <> '')
);

CREATE INDEX IF NOT EXISTS idx_hospital_address_hospital_active
    ON hospital_address (hospital_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hospital_address_city_id
    ON hospital_address (city_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hospital_address_primary_active
    ON hospital_address (hospital_id)
    WHERE deleted_at IS NULL AND is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_hospital_contact_hospital_active
    ON hospital_contact (hospital_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hospital_contact_primary_type_active
    ON hospital_contact (hospital_id, contact_type_reference_value_id)
    WHERE deleted_at IS NULL AND is_primary = TRUE;

COMMIT;
