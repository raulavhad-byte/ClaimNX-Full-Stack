BEGIN;

-- ============================================================================
-- SEED DATA: access_scopes
-- Description: Seed master access scope types used by the authorization engine.
-- ============================================================================

INSERT INTO access_scopes (
    code,
    name,
    description,
    display_order,
    is_active
)
VALUES
(
    'COUNTRY',
    'Country',
    'Access to all resources within a country.',
    1,
    TRUE
),
(
    'ZONE',
    'Zone',
    'Access to all resources within an operational zone.',
    2,
    TRUE
),
(
    'STATE',
    'State',
    'Access to all resources within a state.',
    3,
    TRUE
),
(
    'CITY',
    'City',
    'Access to all resources within a city.',
    4,
    TRUE
),
(
    'HOSPITAL',
    'Hospital',
    'Access restricted to a specific hospital.',
    5,
    TRUE
),
(
    'DEPARTMENT',
    'Department',
    'Access restricted to a specific department.',
    6,
    TRUE
)
ON CONFLICT (code) DO NOTHING;

COMMIT;