-- ClaimNX Phase 9 Financial Management REST API test context (READ ONLY).
-- Run this in Supabase SQL Editor before financial-api-integration-test.ps1.
-- Copy the seven UUID values from the one returned row into the PowerShell command.

WITH reference_ids AS (
  SELECT
    (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'CLAIM_PRODUCT' AND value.code = 'ICA' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE LIMIT 1) AS claim_product_reference_value_id,
    (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'FINANCIAL_REMITTANCE_SOURCE_TYPE' AND value.code = 'EMAIL' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE LIMIT 1) AS remittance_source_type_reference_value_id,
    (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'FINANCIAL_REMITTANCE_STATUS' AND value.code = 'RECEIVED' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE LIMIT 1) AS remittance_status_reference_value_id
)
SELECT
  membership.organization_id,
  hospital.id AS hospital_id,
  partner.id AS insurance_partner_id,
  reference_ids.claim_product_reference_value_id,
  reference_ids.remittance_source_type_reference_value_id,
  reference_ids.remittance_status_reference_value_id
FROM public.organization_members membership
JOIN public.hospitals hospital
  ON hospital.organization_id = membership.organization_id
 AND hospital.deleted_at IS NULL
 AND COALESCE(hospital.is_deleted, FALSE) = FALSE
JOIN public.insurance_entities partner
  ON partner.deleted_at IS NULL
 AND COALESCE(partner.is_deleted, FALSE) = FALSE
CROSS JOIN reference_ids
WHERE membership.user_id = '09a6e607-4846-4d4d-9ad3-86ae90310f18'::uuid
  AND membership.status = 'ACTIVE'
  AND membership.deleted_at IS NULL
  AND COALESCE(membership.is_deleted, FALSE) = FALSE
ORDER BY hospital.display_name, partner.display_name;
