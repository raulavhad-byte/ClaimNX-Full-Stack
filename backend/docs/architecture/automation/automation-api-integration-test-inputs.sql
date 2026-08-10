-- ClaimNX Phase 10 AI & Automation REST API test inputs (READ ONLY).
-- Run in Supabase SQL Editor. Copy the single returned row into the
-- PowerShell test command. Do not place credentials or secrets in this file.

WITH active_membership AS (
    SELECT membership.organization_id, membership.user_id AS actor_user_id
    FROM public.organization_members membership
    WHERE membership.user_id = '09a6e607-4846-4d4d-9ad3-86ae90310f18'::UUID
      AND membership.status = 'ACTIVE'
      AND membership.deleted_at IS NULL
      AND COALESCE(membership.is_deleted, FALSE) = FALSE
    LIMIT 1
), reference_ids AS (
    SELECT
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'CLAIM_PRODUCT' AND value.code = 'ICA' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS ica_claim_product_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_WORK_PURPOSE' AND value.code = 'CLAIM_READINESS_SCORING' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS work_purpose_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_WORK_STATUS' AND value.code = 'QUEUED' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS queued_work_status_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_WORK_STATUS' AND value.code = 'IN_PROGRESS' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS in_progress_work_status_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_WORK_STATUS' AND value.code = 'COMPLETED' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS completed_work_status_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_JOB_STATUS' AND value.code = 'SUCCEEDED' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS succeeded_job_status_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_REVIEW_TYPE' AND value.code = 'READINESS_EXCEPTION' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS review_type_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_REVIEW_STATUS' AND value.code = 'OPEN' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS open_review_status_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_REVIEW_STATUS' AND value.code = 'APPROVED' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS approved_review_status_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_OWNER_COMMAND_STATUS' AND value.code = 'PENDING' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS pending_command_status_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_DISPATCH_CHANNEL' AND value.code = 'EMAIL' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS email_dispatch_channel_reference_value_id,
        (SELECT value.id FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id WHERE category.code = 'AUTOMATION_DISPATCH_STATUS' AND value.code = 'QUEUED' AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL LIMIT 1) AS queued_dispatch_status_reference_value_id
), active_claim AS (
    SELECT claim.id AS claim_id, claim.hospital_id
    FROM public.claims claim
    JOIN active_membership membership ON membership.organization_id = claim.organization_id
    WHERE claim.deleted_at IS NULL
      AND COALESCE(claim.is_deleted, FALSE) = FALSE
    ORDER BY claim.created_at DESC
    LIMIT 1
), active_integration AS (
    SELECT integration.hospital_insurance_partner_integration_id
    FROM public.hospital_insurance_partner_integration integration
    JOIN active_membership membership ON membership.organization_id = integration.organization_id
    JOIN active_claim claim ON claim.hospital_id = integration.hospital_id
    JOIN public.reference_values status_value ON status_value.id = integration.operational_status_reference_value_id
    JOIN public.reference_categories status_category ON status_category.id = status_value.category_id
    WHERE integration.deleted_at IS NULL
      AND status_category.code = 'HOSPITAL_PAYER_INTEGRATION_STATUS'
      AND status_value.code = 'ACTIVE'
    LIMIT 1
)
SELECT membership.organization_id, membership.actor_user_id, claim.hospital_id, claim.claim_id,
       integration.hospital_insurance_partner_integration_id, reference_ids.*
FROM active_membership membership
CROSS JOIN active_claim claim
CROSS JOIN active_integration integration
CROSS JOIN reference_ids;
