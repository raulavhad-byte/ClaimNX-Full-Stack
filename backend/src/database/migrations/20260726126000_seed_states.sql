BEGIN;

-- ============================================================================
-- SEED DATA: states
-- Description: Seed Indian States and Union Territories.
-- ============================================================================

INSERT INTO states (
    country_id,
    code,
    name,
    gst_state_code,
    is_union_territory,
    is_active
)
SELECT
    c.id,
    s.code,
    s.name,
    s.gst_state_code,
    s.is_union_territory,
    TRUE
FROM countries c
CROSS JOIN (
    VALUES
        -- ===========================
        -- States
        -- ===========================
        ('IN-AP','Andhra Pradesh','37',FALSE),
        ('IN-AR','Arunachal Pradesh','12',FALSE),
        ('IN-AS','Assam','18',FALSE),
        ('IN-BR','Bihar','10',FALSE),
        ('IN-CT','Chhattisgarh','22',FALSE),
        ('IN-GA','Goa','30',FALSE),
        ('IN-GJ','Gujarat','24',FALSE),
        ('IN-HR','Haryana','06',FALSE),
        ('IN-HP','Himachal Pradesh','02',FALSE),
        ('IN-JH','Jharkhand','20',FALSE),
        ('IN-KA','Karnataka','29',FALSE),
        ('IN-KL','Kerala','32',FALSE),
        ('IN-MP','Madhya Pradesh','23',FALSE),
        ('IN-MH','Maharashtra','27',FALSE),
        ('IN-MN','Manipur','14',FALSE),
        ('IN-ML','Meghalaya','17',FALSE),
        ('IN-MZ','Mizoram','15',FALSE),
        ('IN-NL','Nagaland','13',FALSE),
        ('IN-OR','Odisha','21',FALSE),
        ('IN-PB','Punjab','03',FALSE),
        ('IN-RJ','Rajasthan','08',FALSE),
        ('IN-SK','Sikkim','11',FALSE),
        ('IN-TN','Tamil Nadu','33',FALSE),
        ('IN-TG','Telangana','36',FALSE),
        ('IN-TR','Tripura','16',FALSE),
        ('IN-UP','Uttar Pradesh','09',FALSE),
        ('IN-UT','Uttarakhand','05',FALSE),
        ('IN-WB','West Bengal','19',FALSE),

        -- ===========================
        -- Union Territories
        -- ===========================
        ('IN-AN','Andaman and Nicobar Islands','35',TRUE),
        ('IN-CH','Chandigarh','04',TRUE),
        ('IN-DN','Dadra and Nagar Haveli and Daman and Diu','26',TRUE),
        ('IN-DL','Delhi','07',TRUE),
        ('IN-JK','Jammu and Kashmir','01',TRUE),
        ('IN-LA','Ladakh','38',TRUE),
        ('IN-LD','Lakshadweep','31',TRUE),
        ('IN-PY','Puducherry','34',TRUE)

) AS s(
    code,
    name,
    gst_state_code,
    is_union_territory
)
WHERE c.code = 'IND'
ON CONFLICT (country_id, code) DO NOTHING;

COMMIT;