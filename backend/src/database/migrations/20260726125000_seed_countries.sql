BEGIN;

-- ============================================================================
-- SEED DATA: countries
-- Description: Seed master list of supported countries.
-- ============================================================================

INSERT INTO countries (
    code,
    iso2,
    iso3,
    name,
    phone_code,
    currency_code,
    timezone,
    is_active
)
VALUES
(
    'IND',
    'IN',
    'IND',
    'India',
    '+91',
    'INR',
    'Asia/Kolkata',
    TRUE
)
ON CONFLICT (code) DO NOTHING;

COMMIT;