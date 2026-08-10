BEGIN;

-- Phase 8: platform-owned Claim Processing vocabulary.
-- No product, lifecycle, or child status is persisted as uncontrolled text.

INSERT INTO public.reference_categories (code, name, description, is_system)
SELECT source.code, source.name, source.description, TRUE
FROM (VALUES
    ('CLAIM_PRODUCT', 'Claim Product', 'ClaimNX product discriminator. ICA represents the Cashless and Pre-Authorization pathway.'),
    ('CLAIM_TYPE', 'Claim Type', 'Controlled classification of an initial Claim.'),
    ('CLAIM_LIFECYCLE_STATUS', 'Claim Lifecycle Status', 'Business lifecycle status owned by the Claim aggregate.'),
    ('CLAIM_AUTHORIZATION_TYPE', 'Claim Authorization Type', 'Controlled type of a payer authorization.'),
    ('CLAIM_AUTHORIZATION_STATUS', 'Claim Authorization Status', 'Controlled lifecycle status of a Claim authorization.'),
    ('CLAIM_QUERY_TYPE', 'Claim Query Type', 'Controlled classification of a payer query.'),
    ('CLAIM_QUERY_STATUS', 'Claim Query Status', 'Controlled lifecycle status of a Claim query.'),
    ('CLAIM_SUBMISSION_STATUS', 'Claim Submission Status', 'Controlled state of a non-secret Claim submission intent.')
) AS source(code, name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.reference_categories category WHERE category.code = source.code
);

WITH required_values (category_code, code, name, description, display_order, is_default) AS (
    VALUES
        ('CLAIM_PRODUCT', 'ICA', 'ICA - Cashless / Pre-Authorization', 'Cashless and Pre-Authorization Claim pathway.', 1, TRUE),
        ('CLAIM_PRODUCT', 'PRE_POST', 'Pre and Post', 'Pre/Post treatment Claim pathway.', 2, FALSE),
        ('CLAIM_PRODUCT', 'PARTNER_PROCESSING', 'Partner Processing', 'Framework only in Phase 8; operational transitions are blocked.', 3, FALSE),
        ('CLAIM_PRODUCT', 'KYP', 'Know Your Policy', 'Framework only in Phase 8; operational transitions are blocked.', 4, FALSE),
        ('CLAIM_TYPE', 'CASHLESS_PREAUTH', 'Cashless Pre-Authorization', 'Initial ICA Claim type.', 1, TRUE),
        ('CLAIM_TYPE', 'PRE_TREATMENT', 'Pre-Treatment', 'Initial Pre/Post Claim type.', 2, FALSE),
        ('CLAIM_TYPE', 'POST_TREATMENT', 'Post-Treatment', 'Initial Pre/Post Claim type.', 3, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'DRAFT', 'Draft', 'Claim is incomplete.', 1, TRUE),
        ('CLAIM_LIFECYCLE_STATUS', 'READY_FOR_REVIEW', 'Ready for Review', 'Claim awaits business review.', 2, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'READY_FOR_SUBMISSION', 'Ready for Submission', 'Claim passed review and has an eligible payer route.', 3, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'SUBMISSION_REQUESTED', 'Submission Requested', 'Submission intent is recorded; delivery is not yet verified.', 4, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'SUBMITTED', 'Submitted', 'Delivery is verified.', 5, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'QUERY_RAISED', 'Query Raised', 'Payer requested additional information.', 6, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'PAYER_RESPONSE_RECEIVED', 'Payer Response Received', 'A payer response awaits interpretation.', 7, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'APPROVED', 'Approved', 'Payer approval recorded.', 8, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'REJECTED', 'Rejected', 'Payer rejection recorded.', 9, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'CANCELLED', 'Cancelled', 'Claim stopped before final closure.', 10, FALSE),
        ('CLAIM_LIFECYCLE_STATUS', 'CLOSED', 'Closed', 'Claim operational lifecycle concluded.', 11, FALSE),
        ('CLAIM_AUTHORIZATION_TYPE', 'PREAUTH', 'Pre-Authorization', 'Payer pre-authorization.', 1, TRUE),
        ('CLAIM_AUTHORIZATION_STATUS', 'PENDING', 'Pending', 'Authorization is pending.', 1, TRUE),
        ('CLAIM_AUTHORIZATION_STATUS', 'APPROVED', 'Approved', 'Authorization is approved.', 2, FALSE),
        ('CLAIM_AUTHORIZATION_STATUS', 'REJECTED', 'Rejected', 'Authorization is rejected.', 3, FALSE),
        ('CLAIM_QUERY_TYPE', 'DOCUMENT', 'Document Query', 'Additional document requested.', 1, TRUE),
        ('CLAIM_QUERY_TYPE', 'CLINICAL', 'Clinical Query', 'Additional clinical information requested.', 2, FALSE),
        ('CLAIM_QUERY_STATUS', 'OPEN', 'Open', 'Query requires a response.', 1, TRUE),
        ('CLAIM_QUERY_STATUS', 'RESPONDED', 'Responded', 'Response has been supplied.', 2, FALSE),
        ('CLAIM_QUERY_STATUS', 'CLOSED', 'Closed', 'Query is concluded.', 3, FALSE),
        ('CLAIM_SUBMISSION_STATUS', 'REQUESTED', 'Requested', 'Submission intent created.', 1, TRUE),
        ('CLAIM_SUBMISSION_STATUS', 'VERIFIED_SUBMITTED', 'Verified Submitted', 'Delivery verified by an authorized result.', 2, FALSE),
        ('CLAIM_SUBMISSION_STATUS', 'FAILED', 'Failed', 'Non-secret submission failure recorded.', 3, FALSE)
)
INSERT INTO public.reference_values (
    category_id, organization_id, code, name, description, display_order, is_default, is_active
)
SELECT category.id, NULL, value.code, value.name, value.description,
       value.display_order, value.is_default, TRUE
FROM required_values value
JOIN public.reference_categories category ON category.code = value.category_code
WHERE NOT EXISTS (
    SELECT 1 FROM public.reference_values existing
    WHERE existing.category_id = category.id
      AND existing.organization_id IS NULL
      AND existing.code = value.code
      AND existing.deleted_at IS NULL
      AND COALESCE(existing.is_deleted, FALSE) = FALSE
);

DO $$
DECLARE required_count INTEGER := 30; active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM public.reference_values value
    JOIN public.reference_categories category ON category.id = value.category_id
    WHERE category.code IN ('CLAIM_PRODUCT','CLAIM_TYPE','CLAIM_LIFECYCLE_STATUS','CLAIM_AUTHORIZATION_TYPE','CLAIM_AUTHORIZATION_STATUS','CLAIM_QUERY_TYPE','CLAIM_QUERY_STATUS','CLAIM_SUBMISSION_STATUS')
      AND value.organization_id IS NULL AND value.is_active = TRUE
      AND value.deleted_at IS NULL AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF active_count <> required_count THEN
        RAISE EXCEPTION 'Phase 8 Claim reference data is incomplete. Expected %, found %.', required_count, active_count;
    END IF;
END $$;

COMMIT;
