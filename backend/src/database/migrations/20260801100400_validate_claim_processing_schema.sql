BEGIN;

-- Read-only structural assertions; this migration does not create or mutate business records.
DO $$
DECLARE required_reference_value_count INTEGER := 30; active_reference_value_count INTEGER;
BEGIN
    IF to_regclass('public.claims') IS NULL
       OR to_regclass('public.claim_stages') IS NULL
       OR to_regclass('public.claim_authorizations') IS NULL
       OR to_regclass('public.claim_queries') IS NULL
       OR to_regclass('public.claim_submission_intents') IS NULL
       OR to_regclass('public.claim_number_sequences') IS NULL THEN
        RAISE EXCEPTION 'Phase 8 validation failed: one or more Claim Processing tables are missing.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_claims_organization_claim_number_active')
       OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_claims_organization_product_status_active')
       OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_claim_submission_intents_claim_open_active') THEN
        RAISE EXCEPTION 'Phase 8 validation failed: required Claim Processing indexes are missing.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.claim_stages'::regclass AND tgname = 'trg_claim_stages_append_only' AND NOT tgisinternal) THEN
        RAISE EXCEPTION 'Phase 8 validation failed: Claim Status History append-only protection is missing.';
    END IF;

    SELECT COUNT(*) INTO active_reference_value_count
    FROM public.reference_values value
    JOIN public.reference_categories category ON category.id = value.category_id
    WHERE category.code IN ('CLAIM_PRODUCT','CLAIM_TYPE','CLAIM_LIFECYCLE_STATUS','CLAIM_AUTHORIZATION_TYPE','CLAIM_AUTHORIZATION_STATUS','CLAIM_QUERY_TYPE','CLAIM_QUERY_STATUS','CLAIM_SUBMISSION_STATUS')
      AND value.organization_id IS NULL AND value.is_active = TRUE
      AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF active_reference_value_count <> required_reference_value_count THEN
        RAISE EXCEPTION 'Phase 8 validation failed: expected % active controlled values, found %.', required_reference_value_count, active_reference_value_count;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.claims claim
        WHERE claim.deleted_at IS NULL
          AND COALESCE(claim.is_deleted, FALSE) = FALSE
          AND (claim.organization_id IS NULL OR claim.claim_number IS NULL
               OR claim.claim_product_reference_value_id IS NULL OR claim.claim_type_reference_value_id IS NULL
               OR claim.lifecycle_status_reference_value_id IS NULL OR claim.created_by IS NULL
               OR claim.updated_by IS NULL OR claim.version < 1)
    ) THEN
        RAISE EXCEPTION 'Phase 8 validation failed: an active Claim does not meet canonical tenant, lifecycle, audit, or version requirements.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.claims claim
        LEFT JOIN public.hospitals hospital ON hospital.id = claim.hospital_id
        WHERE claim.organization_id IS NOT NULL
          AND hospital.organization_id IS DISTINCT FROM claim.organization_id
    ) THEN
        RAISE EXCEPTION 'Phase 8 validation failed: Claim Organization and Hospital tenant scopes are inconsistent.';
    END IF;
END $$;

COMMIT;
