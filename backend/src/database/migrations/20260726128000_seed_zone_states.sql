BEGIN;

-- ============================================================================
-- SEED DATA: zone_states
-- Description: Maps Indian States and Union Territories to Operational Zones.
-- ============================================================================

INSERT INTO zone_states (
    zone_id,
    state_id,
    created_at
)
SELECT
    z.id,
    s.id,
    CURRENT_TIMESTAMP
FROM zones z
JOIN countries c
    ON c.id = z.country_id
JOIN (
    VALUES
        -- NORTH
        ('NORTH','IN-DL'),
        ('NORTH','IN-HR'),
        ('NORTH','IN-PB'),
        ('NORTH','IN-HP'),
        ('NORTH','IN-JK'),
        ('NORTH','IN-LA'),
        ('NORTH','IN-CH'),
        ('NORTH','IN-UT'),

        -- WEST
        ('WEST','IN-MH'),
        ('WEST','IN-GJ'),
        ('WEST','IN-GA'),
        ('WEST','IN-DN'),

        -- SOUTH
        ('SOUTH','IN-KA'),
        ('SOUTH','IN-KL'),
        ('SOUTH','IN-TN'),
        ('SOUTH','IN-TG'),
        ('SOUTH','IN-AP'),
        ('SOUTH','IN-PY'),
        ('SOUTH','IN-LD'),

        -- EAST
        ('EAST','IN-WB'),
        ('EAST','IN-OR'),
        ('EAST','IN-BR'),
        ('EAST','IN-JH'),
        ('EAST','IN-AN'),

        -- CENTRAL
        ('CENTRAL','IN-MP'),
        ('CENTRAL','IN-CT'),
        ('CENTRAL','IN-UP'),
        ('CENTRAL','IN-RJ'),

        -- NORTH EAST
        ('NORTH_EAST','IN-AS'),
        ('NORTH_EAST','IN-AR'),
        ('NORTH_EAST','IN-MN'),
        ('NORTH_EAST','IN-ML'),
        ('NORTH_EAST','IN-MZ'),
        ('NORTH_EAST','IN-NL'),
        ('NORTH_EAST','IN-SK'),
        ('NORTH_EAST','IN-TR')
) AS m(zone_code, state_code)
    ON m.zone_code = z.code
JOIN states s
    ON s.country_id = c.id
   AND s.code = m.state_code
WHERE c.code = 'IND'
ON CONFLICT DO NOTHING;

COMMIT;