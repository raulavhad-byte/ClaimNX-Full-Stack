BEGIN;

-- ============================================================================
-- SEED DATA: zones
-- Description: Seed operational zones for India.
-- ============================================================================

INSERT INTO zones (
    country_id,
    code,
    name,
    description,
    display_order,
    is_active
)
SELECT
    c.id,
    z.code,
    z.name,
    z.description,
    z.display_order,
    TRUE
FROM countries c
CROSS JOIN (
    VALUES
        (
            'NORTH',
            'North',
            'Northern operational region',
            1
        ),
        (
            'SOUTH',
            'South',
            'Southern operational region',
            2
        ),
        (
            'EAST',
            'East',
            'Eastern operational region',
            3
        ),
        (
            'WEST',
            'West',
            'Western operational region',
            4
        ),
        (
            'CENTRAL',
            'Central',
            'Central operational region',
            5
        ),
        (
            'NORTH_EAST',
            'North East',
            'North Eastern operational region',
            6
        )
) AS z (
    code,
    name,
    description,
    display_order
)
WHERE c.code = 'IND'
ON CONFLICT (country_id, code) DO NOTHING;

COMMIT;