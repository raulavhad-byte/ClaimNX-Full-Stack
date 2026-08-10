BEGIN;

CREATE TABLE IF NOT EXISTS hospital_members (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    hospital_id UUID NOT NULL,

    organization_member_id UUID NOT NULL,

    department_id UUID,

    designation VARCHAR(100),

    joining_date DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,

    deleted_at TIMESTAMPTZ,
    deleted_by UUID,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT uk_hospital_member
        UNIQUE (hospital_id, organization_member_id),

    CONSTRAINT chk_hospital_member_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'SUSPENDED'
            )
        ),

    CONSTRAINT fk_hospital_member_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospitals(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_hospital_member_org_member
        FOREIGN KEY (organization_member_id)
        REFERENCES organization_members(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_hospital_member_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

);

COMMENT ON TABLE hospital_members IS
'Represents the assignment of organization members to hospitals and optionally to departments.';

COMMENT ON COLUMN hospital_members.hospital_id IS
'Reference to the hospital.';

COMMENT ON COLUMN hospital_members.organization_member_id IS
'Reference to the organization membership.';

COMMENT ON COLUMN hospital_members.department_id IS
'Optional reference to the assigned department.';

COMMENT ON COLUMN hospital_members.designation IS
'Operational designation within the hospital.';

COMMENT ON COLUMN hospital_members.status IS
'Current assignment status.';

CREATE INDEX IF NOT EXISTS idx_hospital_member_hospital
ON hospital_members (hospital_id);

CREATE INDEX IF NOT EXISTS idx_hospital_member_org_member
ON hospital_members (organization_member_id);

CREATE INDEX IF NOT EXISTS idx_hospital_member_department
ON hospital_members (department_id);

CREATE INDEX IF NOT EXISTS idx_hospital_member_status
ON hospital_members (status);

COMMIT;