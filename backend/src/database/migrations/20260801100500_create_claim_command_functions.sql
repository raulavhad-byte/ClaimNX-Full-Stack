BEGIN;

-- Phase 8 Claim command persistence. UUIDs are supplied by the application.
DO $$
BEGIN
    IF to_regclass('public.claims') IS NULL
       OR to_regclass('public.claim_stages') IS NULL
       OR to_regclass('public.claim_authorizations') IS NULL
       OR to_regclass('public.claim_queries') IS NULL
       OR to_regclass('public.claim_submission_intents') IS NULL THEN
        RAISE EXCEPTION 'Phase 8 Claim command functions require the approved Claim Processing schema.';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_claim(
    p_claim_id UUID,
    p_claim_status_history_id UUID,
    p_organization_id UUID,
    p_hospital_id UUID,
    p_patient_id UUID,
    p_claim_product_reference_value_id UUID,
    p_claim_type_reference_value_id UUID,
    p_draft_lifecycle_status_reference_value_id UUID,
    p_hospital_insurance_partner_integration_id UUID,
    p_currency_code CHAR(3),
    p_total_claimed_amount NUMERIC,
    p_authorization_reference VARCHAR,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_claim_number VARCHAR(64);
    v_product_code TEXT;
    v_draft_code TEXT;
    v_partner_id UUID;
BEGIN
    IF p_claim_id IS NULL OR p_claim_status_history_id IS NULL OR p_organization_id IS NULL
       OR p_hospital_id IS NULL OR p_claim_product_reference_value_id IS NULL
       OR p_claim_type_reference_value_id IS NULL OR p_draft_lifecycle_status_reference_value_id IS NULL
       OR p_actor_user_id IS NULL OR BTRIM(COALESCE(p_currency_code, '')) = ''
       OR p_total_claimed_amount IS NULL OR p_total_claimed_amount < 0 THEN
        RAISE EXCEPTION 'Claim identity, tenant, Hospital, product, type, Draft status, currency, amount, and actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users actor
        WHERE actor.id = p_actor_user_id AND LOWER(COALESCE(actor.status, '')) = 'active'
          AND COALESCE(actor.is_deleted, FALSE) = FALSE
    ) THEN RAISE EXCEPTION 'Claim actor must be an active IAM User.'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.hospitals hospital
        WHERE hospital.id = p_hospital_id AND hospital.organization_id = p_organization_id
          AND hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE
    ) THEN RAISE EXCEPTION 'Claim Hospital must be active and belong to the requested Organization.'; END IF;

    SELECT value.code INTO v_product_code
    FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
    WHERE value.id = p_claim_product_reference_value_id AND category.code = 'CLAIM_PRODUCT'
      AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF v_product_code NOT IN ('ICA', 'PRE_POST', 'PARTNER_PROCESSING', 'KYP') THEN
        RAISE EXCEPTION 'Claim Product reference value is invalid.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_claim_type_reference_value_id AND category.code = 'CLAIM_TYPE'
          AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL
          AND COALESCE(value.is_deleted, FALSE) = FALSE
    ) THEN RAISE EXCEPTION 'Claim Type reference value is invalid.'; END IF;

    SELECT value.code INTO v_draft_code
    FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
    WHERE value.id = p_draft_lifecycle_status_reference_value_id AND category.code = 'CLAIM_LIFECYCLE_STATUS'
      AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF v_draft_code <> 'DRAFT' THEN RAISE EXCEPTION 'A new Claim must start with the DRAFT lifecycle status.'; END IF;

    IF p_hospital_insurance_partner_integration_id IS NOT NULL THEN
        SELECT integration.insurance_partner_id INTO v_partner_id
        FROM public.hospital_insurance_partner_integration integration
        JOIN public.reference_values status_value ON status_value.id = integration.operational_status_reference_value_id
        WHERE integration.hospital_insurance_partner_integration_id = p_hospital_insurance_partner_integration_id
          AND integration.organization_id = p_organization_id AND integration.hospital_id = p_hospital_id
          AND integration.deleted_at IS NULL AND status_value.code = 'ACTIVE';
        IF v_partner_id IS NULL THEN RAISE EXCEPTION 'Claim Hospital-Payer Integration must be active and tenant scoped.'; END IF;
    END IF;

    v_claim_number := public.allocate_claim_number(p_organization_id);

    INSERT INTO public.claims (
        id, hospital_id, patient_id, payer_id, status, amount, approved_amount, is_deleted,
        organization_id, claim_number, claim_product_reference_value_id, claim_type_reference_value_id,
        lifecycle_status_reference_value_id, hospital_insurance_partner_integration_id, currency_code,
        total_claimed_amount, authorization_reference, created_by, created_at, updated_by, updated_at, version, last_updated_by
    ) VALUES (
        p_claim_id, p_hospital_id, p_patient_id, v_partner_id, v_draft_code, p_total_claimed_amount, NULL, FALSE,
        p_organization_id, v_claim_number, p_claim_product_reference_value_id, p_claim_type_reference_value_id,
        p_draft_lifecycle_status_reference_value_id, p_hospital_insurance_partner_integration_id, UPPER(BTRIM(p_currency_code)),
        p_total_claimed_amount, NULLIF(BTRIM(p_authorization_reference), ''), p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1, p_actor_user_id
    );

    INSERT INTO public.claim_stages (
        id, claim_id, status, comment, user_id, stage_data, organization_id,
        claim_product_reference_value_id, from_lifecycle_status_reference_value_id,
        to_lifecycle_status_reference_value_id, transition_reason, actor_user_id, occurred_at,
        event_data, created_by, updated_by, updated_at, version
    ) VALUES (
        p_claim_status_history_id, p_claim_id, v_draft_code, 'Claim created as Draft.', p_actor_user_id,
        jsonb_build_object('event', 'CLAIM_CREATED', 'claim_number', v_claim_number), p_organization_id,
        p_claim_product_reference_value_id, NULL, p_draft_lifecycle_status_reference_value_id,
        'Claim created.', p_actor_user_id, NOW(),
        jsonb_build_object('event', 'CLAIM_CREATED', 'claim_number', v_claim_number, 'product', v_product_code),
        p_actor_user_id, p_actor_user_id, NOW(), 1
    );
    RETURN p_claim_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_claim_lifecycle(
    p_claim_id UUID, p_organization_id UUID, p_hospital_id UUID, p_expected_version INTEGER,
    p_target_lifecycle_status_reference_value_id UUID, p_claim_status_history_id UUID,
    p_transition_reason TEXT, p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_claim public.claims%ROWTYPE;
    v_target_code TEXT;
    v_source_status_code TEXT;
    v_source_status_reference_value_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR p_actor_user_id IS NULL
       OR p_claim_status_history_id IS NULL THEN RAISE EXCEPTION 'Expected version, actor, and history identity are required.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users actor WHERE actor.id = p_actor_user_id
        AND LOWER(COALESCE(actor.status, '')) = 'active' AND COALESCE(actor.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Claim actor must be an active IAM User.';
    END IF;
    SELECT * INTO v_claim FROM public.claims claim
    WHERE claim.id = p_claim_id AND claim.organization_id = p_organization_id AND claim.hospital_id = p_hospital_id
      AND claim.version = p_expected_version AND claim.deleted_at IS NULL AND COALESCE(claim.is_deleted, FALSE) = FALSE
    FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT value.code INTO v_target_code
    FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
    WHERE value.id = p_target_lifecycle_status_reference_value_id AND category.code = 'CLAIM_LIFECYCLE_STATUS'
      AND value.organization_id IS NULL AND value.is_active = TRUE AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF v_target_code IS NULL THEN RAISE EXCEPTION 'Target Claim lifecycle status is invalid.'; END IF;
    IF BTRIM(COALESCE(p_transition_reason, '')) = '' THEN RAISE EXCEPTION 'Claim lifecycle transition reason is required.'; END IF;
    v_source_status_code := v_claim.status;
    v_source_status_reference_value_id := v_claim.lifecycle_status_reference_value_id;

    UPDATE public.claims claim SET
        status = v_target_code, lifecycle_status_reference_value_id = p_target_lifecycle_status_reference_value_id,
        updated_by = p_actor_user_id, updated_at = NOW(), last_updated_by = p_actor_user_id,
        version = claim.version + 1
    WHERE claim.id = v_claim.id
    RETURNING * INTO v_claim;

    INSERT INTO public.claim_stages (
        id, claim_id, status, comment, user_id, stage_data, organization_id,
        claim_product_reference_value_id, from_lifecycle_status_reference_value_id,
        to_lifecycle_status_reference_value_id, transition_reason, actor_user_id, occurred_at,
        event_data, created_by, updated_by, updated_at, version
    ) VALUES (
        p_claim_status_history_id, v_claim.id, v_target_code, BTRIM(p_transition_reason), p_actor_user_id,
        jsonb_build_object('event', 'CLAIM_LIFECYCLE_TRANSITION', 'from_status', v_source_status_code, 'to_status', v_target_code),
        p_organization_id, v_claim.claim_product_reference_value_id, v_source_status_reference_value_id,
        p_target_lifecycle_status_reference_value_id, BTRIM(p_transition_reason), p_actor_user_id, NOW(),
        jsonb_build_object('event', 'CLAIM_LIFECYCLE_TRANSITION', 'from_status', v_source_status_code, 'to_status', v_target_code),
        p_actor_user_id, p_actor_user_id, NOW(), 1
    );
    RETURN v_claim.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_claim_authorization(
    p_claim_authorization_id UUID, p_organization_id UUID, p_hospital_id UUID, p_claim_id UUID,
    p_authorization_type_reference_value_id UUID, p_authorization_status_reference_value_id UUID,
    p_authorization_number VARCHAR, p_approved_amount NUMERIC, p_valid_from TIMESTAMPTZ,
    p_valid_until TIMESTAMPTZ, p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users actor WHERE actor.id = p_actor_user_id
        AND LOWER(COALESCE(actor.status, '')) = 'active' AND COALESCE(actor.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Claim actor must be an active IAM User.';
    END IF;
    IF p_approved_amount IS NOT NULL AND p_approved_amount < 0 THEN RAISE EXCEPTION 'Authorization approved amount cannot be negative.'; END IF;
    IF p_valid_until IS NOT NULL AND p_valid_from IS NOT NULL AND p_valid_until < p_valid_from THEN RAISE EXCEPTION 'Authorization valid-until cannot precede valid-from.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.claims claim WHERE claim.id = p_claim_id AND claim.organization_id = p_organization_id
        AND claim.hospital_id = p_hospital_id AND claim.deleted_at IS NULL AND COALESCE(claim.is_deleted,FALSE)=FALSE) THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_authorization_type_reference_value_id AND category.code = 'CLAIM_AUTHORIZATION_TYPE'
          AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted,FALSE)=FALSE)
       OR NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_authorization_status_reference_value_id AND category.code = 'CLAIM_AUTHORIZATION_STATUS'
          AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted,FALSE)=FALSE) THEN
        RAISE EXCEPTION 'Claim Authorization reference values are invalid.';
    END IF;
    INSERT INTO public.claim_authorizations (claim_authorization_id, organization_id, claim_id, authorization_type_reference_value_id, authorization_status_reference_value_id, authorization_number, approved_amount, valid_from, valid_until, created_by, updated_by)
    VALUES (p_claim_authorization_id, p_organization_id, p_claim_id, p_authorization_type_reference_value_id, p_authorization_status_reference_value_id, NULLIF(BTRIM(p_authorization_number), ''), p_approved_amount, p_valid_from, p_valid_until, p_actor_user_id, p_actor_user_id);
    RETURN p_claim_authorization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_claim_query(
    p_claim_query_id UUID, p_organization_id UUID, p_hospital_id UUID, p_claim_id UUID,
    p_query_type_reference_value_id UUID, p_query_status_reference_value_id UUID,
    p_payer_query_reference VARCHAR, p_query_text TEXT, p_due_at TIMESTAMPTZ, p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users actor WHERE actor.id = p_actor_user_id
        AND LOWER(COALESCE(actor.status, '')) = 'active' AND COALESCE(actor.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Claim actor must be an active IAM User.';
    END IF;
    IF BTRIM(COALESCE(p_query_text, '')) = '' THEN RAISE EXCEPTION 'Claim Query text is required.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.claims claim WHERE claim.id = p_claim_id AND claim.organization_id = p_organization_id
        AND claim.hospital_id = p_hospital_id AND claim.deleted_at IS NULL AND COALESCE(claim.is_deleted,FALSE)=FALSE) THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_query_type_reference_value_id AND category.code = 'CLAIM_QUERY_TYPE'
          AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted,FALSE)=FALSE)
       OR NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_query_status_reference_value_id AND category.code = 'CLAIM_QUERY_STATUS'
          AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted,FALSE)=FALSE) THEN
        RAISE EXCEPTION 'Claim Query reference values are invalid.';
    END IF;
    INSERT INTO public.claim_queries (claim_query_id, organization_id, claim_id, query_type_reference_value_id, query_status_reference_value_id, payer_query_reference, query_text, due_at, created_by, updated_by)
    VALUES (p_claim_query_id, p_organization_id, p_claim_id, p_query_type_reference_value_id, p_query_status_reference_value_id, NULLIF(BTRIM(p_payer_query_reference), ''), BTRIM(p_query_text), p_due_at, p_actor_user_id, p_actor_user_id);
    RETURN p_claim_query_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_claim_submission_intent(
    p_claim_submission_intent_id UUID, p_organization_id UUID, p_hospital_id UUID, p_claim_id UUID,
    p_hospital_insurance_partner_integration_id UUID, p_channel_reference_value_id UUID,
    p_submission_status_reference_value_id UUID, p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users actor WHERE actor.id = p_actor_user_id
        AND LOWER(COALESCE(actor.status, '')) = 'active' AND COALESCE(actor.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Claim actor must be an active IAM User.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.claims claim WHERE claim.id = p_claim_id AND claim.organization_id = p_organization_id
        AND claim.hospital_id = p_hospital_id AND claim.deleted_at IS NULL AND COALESCE(claim.is_deleted,FALSE)=FALSE) THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.hospital_insurance_partner_integration integration JOIN public.reference_values status_value ON status_value.id = integration.operational_status_reference_value_id
        WHERE integration.hospital_insurance_partner_integration_id = p_hospital_insurance_partner_integration_id AND integration.organization_id = p_organization_id
          AND integration.hospital_id = p_hospital_id AND integration.submission_channel_reference_value_id = p_channel_reference_value_id
          AND integration.deleted_at IS NULL AND status_value.code = 'ACTIVE') THEN
        RAISE EXCEPTION 'Claim Submission Intent requires an active Hospital-Payer Integration in the same tenant scope.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_channel_reference_value_id AND category.code = 'HOSPITAL_PAYER_INTEGRATION_CHANNEL'
          AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted,FALSE)=FALSE)
       OR NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_submission_status_reference_value_id AND category.code = 'CLAIM_SUBMISSION_STATUS' AND value.code = 'REQUESTED'
          AND value.is_active = TRUE AND value.deleted_at IS NULL AND COALESCE(value.is_deleted,FALSE)=FALSE) THEN
        RAISE EXCEPTION 'Claim Submission Intent channel or initial status is invalid.';
    END IF;
    INSERT INTO public.claim_submission_intents (claim_submission_intent_id, organization_id, claim_id, hospital_insurance_partner_integration_id, channel_reference_value_id, submission_status_reference_value_id, created_by, updated_by)
    VALUES (p_claim_submission_intent_id, p_organization_id, p_claim_id, p_hospital_insurance_partner_integration_id, p_channel_reference_value_id, p_submission_status_reference_value_id, p_actor_user_id, p_actor_user_id);
    RETURN p_claim_submission_intent_id;
END;
$$;

COMMENT ON FUNCTION public.create_claim IS 'Creates a Draft Phase 8 Claim and append-only Claim Status History event atomically.';
COMMENT ON FUNCTION public.transition_claim_lifecycle IS 'Persists a tenant-scoped Claim lifecycle transition and append-only history atomically.';
COMMENT ON FUNCTION public.create_claim_authorization IS 'Creates an Authorization child owned by an active tenant-scoped Claim.';
COMMENT ON FUNCTION public.create_claim_query IS 'Creates a Query child owned by an active tenant-scoped Claim.';
COMMENT ON FUNCTION public.create_claim_submission_intent IS 'Creates a non-secret Submission Intent for an active Claim and approved Hospital-Payer route.';

COMMIT;
