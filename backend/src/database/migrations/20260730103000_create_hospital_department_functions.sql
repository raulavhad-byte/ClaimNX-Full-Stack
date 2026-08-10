BEGIN;

CREATE OR REPLACE FUNCTION public.create_hospital_department(
    p_hospital_department_id UUID, p_hospital_id UUID, p_organization_id UUID,
    p_department_code VARCHAR(50), p_department_name VARCHAR(200),
    p_department_type_reference_value_id UUID, p_operational_status_reference_value_id UUID,
    p_description TEXT, p_actor_user_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
    IF p_hospital_department_id IS NULL OR p_hospital_id IS NULL OR p_organization_id IS NULL
       OR p_actor_user_id IS NULL OR NULLIF(BTRIM(p_department_code), '') IS NULL
       OR NULLIF(BTRIM(p_department_name), '') IS NULL OR p_operational_status_reference_value_id IS NULL THEN
        RAISE EXCEPTION 'Department, Hospital, Organization, audit actor, Code, Name, and Operational Status are required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN RAISE EXCEPTION 'Audit actor does not exist.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.hospitals hospital WHERE hospital.id = p_hospital_id
        AND hospital.organization_id = p_organization_id AND hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE) THEN
        RAISE EXCEPTION 'Active Hospital was not found in the Organization tenant.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_operational_status_reference_value_id AND category.code = 'OPERATIONAL_STATUS'
          AND value.is_active = TRUE AND value.deleted_at IS NULL) THEN RAISE EXCEPTION 'Operational Status Reference Value is invalid or inactive.'; END IF;
    IF p_department_type_reference_value_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = p_department_type_reference_value_id AND category.code = 'DEPARTMENT_TYPE'
          AND value.is_active = TRUE AND value.deleted_at IS NULL
    ) THEN RAISE EXCEPTION 'Department Type Reference Value is invalid or inactive.'; END IF;
    INSERT INTO public.hospital_department (
        hospital_department_id, hospital_id, department_code, department_name, department_type_reference_value_id,
        operational_status_reference_value_id, description, is_deleted, created_by, created_at, updated_by, updated_at, version
    ) VALUES (
        p_hospital_department_id, p_hospital_id, BTRIM(p_department_code), BTRIM(p_department_name),
        p_department_type_reference_value_id, p_operational_status_reference_value_id, NULLIF(BTRIM(p_description), ''),
        FALSE, p_actor_user_id, NOW(), p_actor_user_id, NOW(), 1
    );
    RETURN p_hospital_department_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_hospital_department(
    p_hospital_department_id UUID, p_hospital_id UUID, p_organization_id UUID,
    p_expected_version INTEGER, p_actor_user_id UUID, p_patch JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_department public.hospital_department%ROWTYPE; v_department_type_id UUID; v_status_id UUID; v_updated_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 OR p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::JSONB THEN
        RAISE EXCEPTION 'Expected version and a non-empty Department patch are required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id) THEN RAISE EXCEPTION 'Audit actor does not exist.'; END IF;
    SELECT department.* INTO v_department FROM public.hospital_department department JOIN public.hospitals hospital ON hospital.id = department.hospital_id
    WHERE department.hospital_department_id = p_hospital_department_id AND department.hospital_id = p_hospital_id
      AND hospital.organization_id = p_organization_id AND department.deleted_at IS NULL
      AND COALESCE(department.is_deleted, FALSE) = FALSE AND hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF p_patch ? 'departmentCode' AND NULLIF(BTRIM(p_patch ->> 'departmentCode'), '') IS NULL THEN RAISE EXCEPTION 'Department Code cannot be blank.'; END IF;
    IF p_patch ? 'departmentName' AND NULLIF(BTRIM(p_patch ->> 'departmentName'), '') IS NULL THEN RAISE EXCEPTION 'Department Name cannot be blank.'; END IF;
    v_department_type_id := CASE WHEN p_patch ? 'departmentTypeReferenceValueId' THEN NULLIF(p_patch ->> 'departmentTypeReferenceValueId', '')::UUID ELSE v_department.department_type_reference_value_id END;
    v_status_id := COALESCE(NULLIF(p_patch ->> 'operationalStatusReferenceValueId', '')::UUID, v_department.operational_status_reference_value_id);
    IF v_department_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = v_department_type_id AND category.code = 'DEPARTMENT_TYPE' AND value.is_active = TRUE AND value.deleted_at IS NULL) THEN RAISE EXCEPTION 'Department Type Reference Value is invalid or inactive.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.reference_values value JOIN public.reference_categories category ON category.id = value.category_id
        WHERE value.id = v_status_id AND category.code = 'OPERATIONAL_STATUS' AND value.is_active = TRUE AND value.deleted_at IS NULL) THEN RAISE EXCEPTION 'Operational Status Reference Value is invalid or inactive.'; END IF;
    UPDATE public.hospital_department department SET
        department_code = CASE WHEN p_patch ? 'departmentCode' THEN BTRIM(p_patch ->> 'departmentCode') ELSE department.department_code END,
        department_name = CASE WHEN p_patch ? 'departmentName' THEN BTRIM(p_patch ->> 'departmentName') ELSE department.department_name END,
        department_type_reference_value_id = v_department_type_id, operational_status_reference_value_id = v_status_id,
        description = CASE WHEN p_patch ? 'description' THEN NULLIF(BTRIM(p_patch ->> 'description'), '') ELSE department.description END,
        updated_by = p_actor_user_id, updated_at = NOW(), version = department.version + 1
    WHERE department.hospital_department_id = p_hospital_department_id AND department.hospital_id = p_hospital_id
      AND department.version = p_expected_version AND department.deleted_at IS NULL AND COALESCE(department.is_deleted, FALSE) = FALSE
    RETURNING department.hospital_department_id INTO v_updated_id;
    RETURN v_updated_id;
END; $$;

CREATE OR REPLACE FUNCTION public.soft_delete_hospital_department(
    p_hospital_department_id UUID, p_hospital_id UUID, p_organization_id UUID,
    p_expected_version INTEGER, p_actor_user_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_deleted_id UUID;
BEGIN
    IF p_expected_version IS NULL OR p_expected_version < 1 THEN RAISE EXCEPTION 'Expected Department version is required.'; END IF;
    UPDATE public.hospital_department department SET is_deleted = TRUE, deleted_by = p_actor_user_id, deleted_at = NOW(),
        updated_by = p_actor_user_id, updated_at = NOW(), version = department.version + 1
    WHERE department.hospital_department_id = p_hospital_department_id AND department.hospital_id = p_hospital_id
      AND department.version = p_expected_version AND department.deleted_at IS NULL AND COALESCE(department.is_deleted, FALSE) = FALSE
      AND EXISTS (SELECT 1 FROM public.hospitals hospital WHERE hospital.id = p_hospital_id AND hospital.organization_id = p_organization_id
        AND hospital.deleted_at IS NULL AND COALESCE(hospital.is_deleted, FALSE) = FALSE)
    RETURNING department.hospital_department_id INTO v_deleted_id;
    RETURN v_deleted_id;
END; $$;

COMMENT ON FUNCTION public.create_hospital_department IS 'Creates a Department owned by an active Hospital Aggregate.';
COMMENT ON FUNCTION public.update_hospital_department IS 'Updates one active Hospital Department with child-level optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_hospital_department IS 'Soft deletes one Hospital Department with child-level optimistic concurrency.';
COMMIT;
