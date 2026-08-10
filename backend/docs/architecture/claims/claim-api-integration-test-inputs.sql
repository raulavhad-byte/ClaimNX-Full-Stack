-- ClaimNX Phase 8: REST API integration-test inputs (READ ONLY)
-- Run in Supabase SQL Editor. Copy the single result row values into the
-- PowerShell command in claim-api-integration-test.ps1.

WITH reference_ids AS (
    SELECT
        MAX(value.id::TEXT) FILTER (WHERE category.code = 'CLAIM_PRODUCT' AND value.code = 'ICA') AS ica_claim_product_reference_value_id,
        MAX(value.id::TEXT) FILTER (WHERE category.code = 'CLAIM_TYPE' AND value.code = 'CASHLESS_PREAUTH') AS cashless_claim_type_reference_value_id,
        MAX(value.id::TEXT) FILTER (WHERE category.code = 'CLAIM_LIFECYCLE_STATUS' AND value.code = 'DRAFT') AS draft_lifecycle_status_reference_value_id,
        MAX(value.id::TEXT) FILTER (WHERE category.code = 'CLAIM_LIFECYCLE_STATUS' AND value.code = 'READY_FOR_REVIEW') AS ready_for_review_lifecycle_status_reference_value_id
    FROM public.reference_values value
    JOIN public.reference_categories category ON category.id = value.category_id
    WHERE category.code IN ('CLAIM_PRODUCT', 'CLAIM_TYPE', 'CLAIM_LIFECYCLE_STATUS')
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE
)
SELECT
    hospital.organization_id,
    hospital.id AS hospital_id,
    reference_ids.*
FROM public.hospitals hospital
CROSS JOIN reference_ids
WHERE hospital.deleted_at IS NULL
  AND COALESCE(hospital.is_deleted, FALSE) = FALSE
ORDER BY hospital.display_name;
