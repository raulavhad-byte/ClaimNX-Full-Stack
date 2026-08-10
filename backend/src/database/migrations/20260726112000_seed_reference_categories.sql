BEGIN;

INSERT INTO reference_categories
(
    code,
    name,
    description,
    is_system
)
VALUES

(
    'ORGANIZATION_TYPE',
    'Organization Type',
    'Types of organizations supported by the platform.',
    TRUE
),

(
    'HOSPITAL_TYPE',
    'Hospital Type',
    'Types of hospitals.',
    TRUE
),

(
    'DEPARTMENT_TYPE',
    'Department Type',
    'Types of hospital departments.',
    TRUE
),

(
    'DESIGNATION',
    'Designation',
    'Employee designations.',
    TRUE
),

(
    'GENDER',
    'Gender',
    'Supported gender values.',
    TRUE
),

(
    'BLOOD_GROUP',
    'Blood Group',
    'Supported blood groups.',
    TRUE
),

(
    'DOCUMENT_TYPE',
    'Document Type',
    'Supported document types.',
    TRUE
),

(
    'CLAIM_PRIORITY',
    'Claim Priority',
    'Claim priority levels.',
    TRUE
),

(
    'CLAIM_STATUS',
    'Claim Status',
    'Lifecycle statuses for claims.',
    TRUE
),

(
    'POLICY_TYPE',
    'Policy Type',
    'Insurance policy types.',
    TRUE
),

(
    'INSURANCE_TYPE',
    'Insurance Type',
    'Insurance company classifications.',
    TRUE
)

ON CONFLICT (code)
DO NOTHING;

COMMIT;