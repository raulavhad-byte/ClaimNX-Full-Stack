BEGIN;

-- Phase 7: command boundary for the independent Insurance Product Plan
-- aggregate. UUIDs are supplied by the application layer.

CREATE OR REPLACE FUNCTION public.create_insurance_product_plan(
    p_insurance_product_plan_id UUID,
    p_insurance_partner_id UUID,
    p_plan_code VARCHAR,
    p_plan_name VARCHAR,
    p_description TEXT,
    p_operational_status_reference_value_id UUID,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_status_code VARCHAR(100);
BEGIN
    IF p_insurance_product_plan_id IS NULL
       OR p_insurance_partner_id IS NULL
       OR NULLIF(BTRIM(p_plan_code), '') IS NULL
       OR NULLIF(BTRIM(p_plan_name), '') IS NULL
       OR p_operational_status_reference_value_id IS NULL
       OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Plan ID, Insurance Partner, Plan Code, Plan Name, status, and audit actor are required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users AS user_record
         WHERE user_record.id = p_actor_user_id
           AND LOWER(BTRIM(user_record.status)) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.insurance_entities AS partner
         WHERE partner.id = p_insurance_partner_id
           AND partner.deleted_at IS NULL
           AND COALESCE(partner.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Active Insurance Partner was not found.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.insurance_product_plan AS plan
         WHERE plan.insurance_product_plan_id = p_insurance_product_plan_id
    ) THEN
        RAISE EXCEPTION 'Insurance Product Plan identifier already exists.';
    END IF;

    SELECT value.code INTO v_status_code
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE value.id = p_operational_status_reference_value_id
       AND category.code = 'INSURANCE_PLAN_STATUS'
       AND value.is_active = TRUE
       AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF v_status_code NOT IN ('DRAFT', 'ACTIVE', 'INACTIVE') THEN
        RAISE EXCEPTION 'Insurance Plan Status Reference Value is invalid.';
    END IF;

    INSERT INTO public.insurance_product_plan (
        insurance_product_plan_id, insurance_partner_id, plan_code, plan_name,
        description, operational_status_reference_value_id,
        created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_insurance_product_plan_id, p_insurance_partner_id, BTRIM(p_plan_code),
        BTRIM(p_plan_name), NULLIF(BTRIM(p_description), ''),
        p_operational_status_reference_value_id,
        p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );
    RETURN p_insurance_product_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_insurance_product_plan(
    p_insurance_product_plan_id UUID,
    p_insurance_partner_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID,
    p_patch JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_plan public.insurance_product_plan%ROWTYPE;
    v_status_reference_value_id UUID;
    v_status_code VARCHAR(100);
    v_updated_plan_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1
       OR p_actor_user_id IS NULL OR p_patch IS NULL
       OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::JSONB THEN
        RAISE EXCEPTION 'Expected version, audit actor, and a non-empty Plan patch are required.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.users AS user_record
         WHERE user_record.id = p_actor_user_id
           AND LOWER(BTRIM(user_record.status)) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    SELECT plan.* INTO v_plan
      FROM public.insurance_product_plan AS plan
      JOIN public.insurance_entities AS partner ON partner.id = plan.insurance_partner_id
     WHERE plan.insurance_product_plan_id = p_insurance_product_plan_id
       AND plan.insurance_partner_id = p_insurance_partner_id
       AND plan.deleted_at IS NULL
       AND partner.deleted_at IS NULL
       AND COALESCE(partner.is_deleted, FALSE) = FALSE;
    IF NOT FOUND THEN RETURN NULL; END IF;

    IF p_patch ? 'planCode' AND NULLIF(BTRIM(p_patch ->> 'planCode'), '') IS NULL THEN
        RAISE EXCEPTION 'Plan Code cannot be blank.';
    END IF;
    IF p_patch ? 'planName' AND NULLIF(BTRIM(p_patch ->> 'planName'), '') IS NULL THEN
        RAISE EXCEPTION 'Plan Name cannot be blank.';
    END IF;

    v_status_reference_value_id := COALESCE(
        NULLIF(p_patch ->> 'operationalStatusReferenceValueId', '')::UUID,
        v_plan.operational_status_reference_value_id
    );
    SELECT value.code INTO v_status_code
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE value.id = v_status_reference_value_id
       AND category.code = 'INSURANCE_PLAN_STATUS'
       AND value.is_active = TRUE
       AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF v_status_code NOT IN ('DRAFT', 'ACTIVE', 'INACTIVE') THEN
        RAISE EXCEPTION 'Insurance Plan Status Reference Value is invalid.';
    END IF;

    UPDATE public.insurance_product_plan AS plan
       SET plan_code = CASE WHEN p_patch ? 'planCode' THEN BTRIM(p_patch ->> 'planCode') ELSE plan.plan_code END,
           plan_name = CASE WHEN p_patch ? 'planName' THEN BTRIM(p_patch ->> 'planName') ELSE plan.plan_name END,
           description = CASE WHEN p_patch ? 'description' THEN NULLIF(BTRIM(p_patch ->> 'description'), '') ELSE plan.description END,
           operational_status_reference_value_id = v_status_reference_value_id,
           updated_by = p_actor_user_id,
           updated_at = NOW(),
           version = plan.version + 1
     WHERE plan.insurance_product_plan_id = p_insurance_product_plan_id
       AND plan.insurance_partner_id = p_insurance_partner_id
       AND plan.version = p_expected_version
       AND plan.deleted_at IS NULL
     RETURNING plan.insurance_product_plan_id INTO v_updated_plan_id;
    RETURN v_updated_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_insurance_product_plan_status(
    p_insurance_product_plan_id UUID,
    p_insurance_partner_id UUID,
    p_expected_version INTEGER,
    p_operational_status_reference_value_id UUID,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_status_code VARCHAR(100);
    v_updated_plan_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1
       OR p_operational_status_reference_value_id IS NULL OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Expected version, Plan status, and audit actor are required.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.users AS user_record
         WHERE user_record.id = p_actor_user_id
           AND LOWER(BTRIM(user_record.status)) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;
    SELECT value.code INTO v_status_code
      FROM public.reference_values AS value
      JOIN public.reference_categories AS category ON category.id = value.category_id
     WHERE value.id = p_operational_status_reference_value_id
       AND category.code = 'INSURANCE_PLAN_STATUS'
       AND value.is_active = TRUE AND value.deleted_at IS NULL
       AND COALESCE(value.is_deleted, FALSE) = FALSE;
    IF v_status_code NOT IN ('DRAFT', 'ACTIVE', 'INACTIVE') THEN
        RAISE EXCEPTION 'Insurance Plan Status Reference Value is invalid.';
    END IF;

    UPDATE public.insurance_product_plan AS plan
       SET operational_status_reference_value_id = p_operational_status_reference_value_id,
           updated_by = p_actor_user_id, updated_at = NOW(), version = plan.version + 1
     WHERE plan.insurance_product_plan_id = p_insurance_product_plan_id
       AND plan.insurance_partner_id = p_insurance_partner_id
       AND plan.version = p_expected_version
       AND plan.deleted_at IS NULL
       AND EXISTS (
            SELECT 1 FROM public.insurance_entities AS partner
             WHERE partner.id = p_insurance_partner_id AND partner.deleted_at IS NULL
               AND COALESCE(partner.is_deleted, FALSE) = FALSE
       )
     RETURNING plan.insurance_product_plan_id INTO v_updated_plan_id;
    RETURN v_updated_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_insurance_product_plan(
    p_insurance_product_plan_id UUID,
    p_insurance_partner_id UUID,
    p_expected_version INTEGER,
    p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_deleted_plan_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR p_actor_user_id IS NULL THEN
        RAISE EXCEPTION 'Expected version and audit actor are required.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.users AS user_record
         WHERE user_record.id = p_actor_user_id
           AND LOWER(BTRIM(user_record.status)) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
    ) THEN
        RAISE EXCEPTION 'Audit actor does not exist or is inactive.';
    END IF;

    UPDATE public.insurance_product_plan AS plan
       SET deleted_by = p_actor_user_id, deleted_at = NOW(),
           updated_by = p_actor_user_id, updated_at = NOW(), version = plan.version + 1
     WHERE plan.insurance_product_plan_id = p_insurance_product_plan_id
       AND plan.insurance_partner_id = p_insurance_partner_id
       AND plan.version = p_expected_version
       AND plan.deleted_at IS NULL
       AND EXISTS (
            SELECT 1 FROM public.insurance_entities AS partner
             WHERE partner.id = p_insurance_partner_id AND partner.deleted_at IS NULL
               AND COALESCE(partner.is_deleted, FALSE) = FALSE
       )
     RETURNING plan.insurance_product_plan_id INTO v_deleted_plan_id;
    RETURN v_deleted_plan_id;
END;
$$;

COMMENT ON FUNCTION public.create_insurance_product_plan IS
    'Creates an Insurance Product Plan owned by an active Insurance Partner.';
COMMENT ON FUNCTION public.update_insurance_product_plan IS
    'Updates an Insurance Product Plan using optimistic concurrency.';
COMMENT ON FUNCTION public.set_insurance_product_plan_status IS
    'Changes the lifecycle status of an Insurance Product Plan using optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_insurance_product_plan IS
    'Soft deletes an Insurance Product Plan using optimistic concurrency.';

COMMIT;
