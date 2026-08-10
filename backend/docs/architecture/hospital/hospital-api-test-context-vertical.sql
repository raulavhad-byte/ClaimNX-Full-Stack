-- Read-only vertical display of the controlled Hospital API test context.

WITH test_context AS (
    SELECT *
    FROM (
        SELECT
            'e642c2fa-4c92-43b9-81cf-58f2f25fa4c6'::UUID AS organization_id,
            '09a6e607-4846-4d4d-9ad3-86ae90310f18'::UUID AS actor_user_id,
            (SELECT rv.id FROM public.reference_values rv JOIN public.reference_categories rc ON rc.id = rv.category_id WHERE rc.code = 'HOSPITAL_TYPE' AND rv.code = 'GENERAL' LIMIT 1) AS hospital_type_reference_value_id,
            (SELECT rv.id FROM public.reference_values rv JOIN public.reference_categories rc ON rc.id = rv.category_id WHERE rc.code = 'OWNERSHIP_TYPE' AND rv.code = 'PRIVATE' LIMIT 1) AS ownership_type_reference_value_id,
            (SELECT rv.id FROM public.reference_values rv JOIN public.reference_categories rc ON rc.id = rv.category_id WHERE rc.code = 'OPERATIONAL_STATUS' AND rv.code = 'DRAFT' LIMIT 1) AS operational_status_reference_value_id,
            (SELECT rv.id FROM public.reference_values rv JOIN public.reference_categories rc ON rc.id = rv.category_id WHERE rc.code = 'HOSPITAL_ADDRESS_TYPE' AND rv.code = 'REGISTERED' LIMIT 1) AS address_type_reference_value_id,
            (SELECT rv.id FROM public.reference_values rv JOIN public.reference_categories rc ON rc.id = rv.category_id WHERE rc.code = 'HOSPITAL_CONTACT_TYPE' AND rv.code = 'ADMINISTRATIVE' LIMIT 1) AS contact_type_reference_value_id,
            (SELECT country.id FROM public.countries country WHERE LOWER(country.name) = 'india' LIMIT 1) AS country_id,
            (SELECT state.id FROM public.states state JOIN public.countries country ON country.id = state.country_id WHERE LOWER(country.name) = 'india' AND LOWER(state.name) = 'gujarat' LIMIT 1) AS state_id,
            (SELECT city.id FROM public.cities city JOIN public.states state ON state.id = city.state_id JOIN public.countries country ON country.id = state.country_id WHERE LOWER(country.name) = 'india' AND LOWER(state.name) = 'gujarat' AND LOWER(city.name) = 'ahmedabad' LIMIT 1) AS city_id
    ) values_row
)
SELECT key AS context_key, value AS context_value
FROM test_context,
LATERAL jsonb_each_text(to_jsonb(test_context))
ORDER BY context_key;
