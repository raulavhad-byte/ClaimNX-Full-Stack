-- Read-only context for the controlled Phase 5 Create Hospital API test.

WITH active_membership AS (
    SELECT organization_id, user_id
    FROM public.organization_members
    WHERE user_id = '09a6e607-4846-4d4d-9ad3-86ae90310f18'
      AND status = 'ACTIVE'
      AND deleted_at IS NULL
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1
), reference_ids AS (
    SELECT
        (ARRAY_AGG(reference_value.id) FILTER (WHERE reference_category.code = 'HOSPITAL_TYPE' AND reference_value.code = 'GENERAL'))[1] AS hospital_type_reference_value_id,
        (ARRAY_AGG(reference_value.id) FILTER (WHERE reference_category.code = 'OWNERSHIP_TYPE' AND reference_value.code = 'PRIVATE'))[1] AS ownership_type_reference_value_id,
        (ARRAY_AGG(reference_value.id) FILTER (WHERE reference_category.code = 'OPERATIONAL_STATUS' AND reference_value.code = 'DRAFT'))[1] AS draft_operational_status_reference_value_id,
        (ARRAY_AGG(reference_value.id) FILTER (WHERE reference_category.code = 'HOSPITAL_ADDRESS_TYPE' AND reference_value.code = 'REGISTERED'))[1] AS address_type_reference_value_id,
        (ARRAY_AGG(reference_value.id) FILTER (WHERE reference_category.code = 'HOSPITAL_CONTACT_TYPE' AND reference_value.code = 'ADMINISTRATIVE'))[1] AS contact_type_reference_value_id
    FROM public.reference_values reference_value
    JOIN public.reference_categories reference_category
        ON reference_category.id = reference_value.category_id
    WHERE reference_value.is_active = TRUE
      AND reference_value.deleted_at IS NULL
      AND COALESCE(reference_value.is_deleted, FALSE) = FALSE
), ahmedabad AS (
    SELECT country.id AS country_id, state.id AS state_id, city.id AS city_id
    FROM public.countries country
    JOIN public.states state ON state.country_id = country.id
    JOIN public.cities city ON city.state_id = state.id
    WHERE LOWER(country.name) = 'india'
      AND LOWER(state.name) = 'gujarat'
      AND LOWER(city.name) = 'ahmedabad'
    LIMIT 1
)
SELECT
    active_membership.organization_id,
    active_membership.user_id AS actor_user_id,
    reference_ids.*,
    ahmedabad.country_id,
    ahmedabad.state_id,
    ahmedabad.city_id
FROM active_membership
CROSS JOIN reference_ids
CROSS JOIN ahmedabad;
