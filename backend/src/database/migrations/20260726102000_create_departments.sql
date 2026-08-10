BEGIN;

CREATE TABLE IF NOT EXISTS departments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    department_code VARCHAR(30) NOT NULL,

    hospital_id UUID NOT NULL,

    department_name VARCHAR(200) NOT NULL,

    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT uk_departments_code
        UNIQUE (department_code),

    CONSTRAINT chk_departments_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'SUSPENDED'
            )
        ),

    CONSTRAINT fk_departments_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);

COMMENT ON TABLE departments IS
'Represents an operational department within a hospital.';

COMMENT ON COLUMN departments.department_code IS
'Unique business identifier for the department.';

COMMENT ON COLUMN departments.hospital_id IS
'Reference to the owning hospital.';

COMMENT ON COLUMN departments.department_name IS
'Display name of the department.';

COMMENT ON COLUMN departments.status IS
'Current lifecycle status of the department.';

CREATE INDEX IF NOT EXISTS idx_departments_name
ON departments (department_name);

CREATE INDEX IF NOT EXISTS idx_departments_hospital
ON departments (hospital_id);

CREATE INDEX IF NOT EXISTS idx_departments_status
ON departments (status);

COMMIT;