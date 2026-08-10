-- Read-only Phase 5 Hospital integration-test preflight.
-- Run in Supabase SQL Editor and share the result before any test Hospital is created.

SELECT
    'ACTIVE_MEMBERSHIP' AS record_type,
    organization_member.organization_id::TEXT AS organization_id,
    organization_member.user_id::TEXT AS actor_user_id,
    NULL::TEXT AS reference_category,
    NULL::TEXT AS reference_value_id,
    NULL::TEXT AS reference_value_code,
    NULL::TEXT AS reference_value_name
FROM public.organization_members organization_member
WHERE organization_member.user_id = '09a6e607-4846-4d4d-9ad3-86ae90310f18'
  AND organization_member.status = 'ACTIVE'
  AND organization_member.deleted_at IS NULL
  AND COALESCE(organization_member.is_deleted, FALSE) = FALSE

UNION ALL

SELECT
    'REFERENCE_VALUE' AS record_type,
    NULL::TEXT AS organization_id,
    NULL::TEXT AS actor_user_id,
    reference_category.code AS reference_category,
    reference_value.id::TEXT AS reference_value_id,
    reference_value.code AS reference_value_code,
    reference_value.name AS reference_value_name
FROM public.reference_values reference_value
JOIN public.reference_categories reference_category
    ON reference_category.id = reference_value.category_id
WHERE reference_category.code IN (
    'HOSPITAL_TYPE',
    'OWNERSHIP_TYPE',
    'OPERATIONAL_STATUS',
    'HOSPITAL_ADDRESS_TYPE',
    'HOSPITAL_CONTACT_TYPE',
    'DEPARTMENT_TYPE'
)
  AND reference_value.is_active = TRUE
  AND reference_value.deleted_at IS NULL
  AND COALESCE(reference_value.is_deleted, FALSE) = FALSE
ORDER BY record_type, reference_category, reference_value_code;
