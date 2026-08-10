BEGIN;

------------------------------------------------------------------------------
-- Permission Modules
------------------------------------------------------------------------------

INSERT INTO permission_modules
(
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
VALUES
('dashboard',      'Dashboard',             'Dashboard and analytics.',                          10, TRUE, TRUE),
('iam',            'Identity & Access',     'Identity and access management.',                   20, TRUE, TRUE),
('organization',   'Organization',          'Organization management.',                          30, TRUE, TRUE),
('master_data',    'Master Data',           'Master reference data management.',                 40, TRUE, TRUE),
('patient',        'Patient',               'Patient management.',                               50, TRUE, TRUE),
('provider',       'Provider',              'Provider management.',                              60, TRUE, TRUE),
('payer',          'Payer',                 'Payer management.',                                 70, TRUE, TRUE),
('claims',         'Claims',                'Claims lifecycle management.',                      80, TRUE, TRUE),
('coding',         'Coding',                'Medical coding management.',                        90, TRUE, TRUE),
('billing',        'Billing',               'Billing operations.',                              100, TRUE, TRUE),
('payments',       'Payments',              'Payment posting and reconciliation.',              110, TRUE, TRUE),
('remittance',     'Remittance',            'Electronic remittance advice processing.',         120, TRUE, TRUE),
('denials',        'Denials',               'Denial management and appeals.',                   130, TRUE, TRUE),
('authorizations', 'Prior Authorizations',  'Prior authorization management.',                  140, TRUE, TRUE),
('scheduling',     'Scheduling',            'Appointment scheduling.',                           150, TRUE, TRUE),
('reporting',      'Reporting',             'Operational and analytical reporting.',            160, TRUE, TRUE),
('integrations',   'Integrations',          'External system integrations.',                    170, TRUE, TRUE),
('settings',       'Settings',              'Application configuration.',                       180, TRUE, TRUE),
('audit',          'Audit',                 'Audit logs and compliance.',                        190, TRUE, TRUE),
('notifications',  'Notifications',         'System notifications and messaging.',              200, TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;


------------------------------------------------------------------------------
-- Permission Sub Modules
------------------------------------------------------------------------------

INSERT INTO permission_sub_modules
(
    module_id,
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)

------------------------------------------------------------------------------
-- Dashboard
------------------------------------------------------------------------------

SELECT id,'dashboard','Dashboard','Dashboard widgets and metrics.',10,TRUE,TRUE
FROM permission_modules
WHERE code='dashboard'

UNION ALL

------------------------------------------------------------------------------
-- Identity & Access
------------------------------------------------------------------------------

SELECT id,'users','Users','User management.',10,TRUE,TRUE
FROM permission_modules
WHERE code='iam'

UNION ALL

SELECT id,'roles','Roles','Role management.',20,TRUE,TRUE
FROM permission_modules
WHERE code='iam'

UNION ALL

SELECT id,'permissions','Permissions','Permission management.',30,TRUE,TRUE
FROM permission_modules
WHERE code='iam'

UNION ALL

SELECT id,'permission_modules','Permission Modules','Permission module management.',40,TRUE,TRUE
FROM permission_modules
WHERE code='iam'

UNION ALL

SELECT id,'permission_sub_modules','Permission Sub Modules','Permission sub-module management.',50,TRUE,TRUE
FROM permission_modules
WHERE code='iam'

UNION ALL

SELECT id,'scope_types','Scope Types','Scope type management.',60,TRUE,TRUE
FROM permission_modules
WHERE code='iam'

------------------------------------------------------------------------------
-- Organization
------------------------------------------------------------------------------

UNION ALL

SELECT id,'organizations','Organizations','Organization management.',10,TRUE,TRUE
FROM permission_modules
WHERE code='organization'

UNION ALL

SELECT id,'facilities','Facilities','Facility management.',20,TRUE,TRUE
FROM permission_modules
WHERE code='organization'

UNION ALL

SELECT id,'departments','Departments','Department management.',30,TRUE,TRUE
FROM permission_modules
WHERE code='organization'

------------------------------------------------------------------------------
-- Master Data
------------------------------------------------------------------------------

UNION ALL

SELECT id,'countries','Countries','Country master.',10,TRUE,TRUE
FROM permission_modules
WHERE code='master_data'

UNION ALL

SELECT id,'states','States','State master.',20,TRUE,TRUE
FROM permission_modules
WHERE code='master_data'

UNION ALL

SELECT id,'cities','Cities','City master.',30,TRUE,TRUE
FROM permission_modules
WHERE code='master_data'

UNION ALL

SELECT id,'specialties','Specialties','Medical specialties.',40,TRUE,TRUE
FROM permission_modules
WHERE code='master_data'

UNION ALL

SELECT id,'diagnosis_codes','Diagnosis Codes','ICD diagnosis code management.',50,TRUE,TRUE
FROM permission_modules
WHERE code='master_data'

UNION ALL

SELECT id,'procedure_codes','Procedure Codes','Procedure code management.',60,TRUE,TRUE
FROM permission_modules
WHERE code='master_data'

------------------------------------------------------------------------------
-- Patient
------------------------------------------------------------------------------

UNION ALL

SELECT id,'patients','Patients','Patient management.',10,TRUE,TRUE
FROM permission_modules
WHERE code='patient'

UNION ALL

SELECT id,'patient_documents','Patient Documents','Patient document management.',20,TRUE,TRUE
FROM permission_modules
WHERE code='patient'

------------------------------------------------------------------------------
-- Provider
------------------------------------------------------------------------------

UNION ALL

SELECT id,'providers','Providers','Provider management.',10,TRUE,TRUE
FROM permission_modules
WHERE code='provider'

UNION ALL

SELECT id,'provider_credentials','Provider Credentials','Provider credential management.',20,TRUE,TRUE
FROM permission_modules
WHERE code='provider'

------------------------------------------------------------------------------
-- Payer
------------------------------------------------------------------------------

UNION ALL

SELECT id,'payers','Payers','Payer management.',10,TRUE,TRUE
FROM permission_modules
WHERE code='payer'

UNION ALL

SELECT id,'payer_contracts','Payer Contracts','Payer contract management.',20,TRUE,TRUE
FROM permission_modules
WHERE code='payer'

ON CONFLICT (module_id, code)
DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_system = EXCLUDED.is_system,
    is_active = EXCLUDED.is_active;
    
COMMIT;