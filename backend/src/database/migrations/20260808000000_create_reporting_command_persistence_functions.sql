-- ClaimNX Phase 11 - Reporting & BI command persistence functions.
--
-- Purpose:
--   Persist Reporting aggregate commands through tenant-scoped PostgreSQL
--   functions. Application code generates UUIDs and supplies an expected
--   version for every mutable command.
--
-- Security:
--   This migration never accepts SQL identifiers from a caller and never
--   stores report output, credentials, recipient secrets, or raw payloads.

BEGIN;

-- Fail early if this migration is applied before the approved Reporting
-- physical schema. This makes a deployment failure explicit and recoverable.
DO $$
DECLARE
  required_table TEXT;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'report_definitions',
    'report_schedules',
    'report_executions',
    'organization_members',
    'reference_values'
  ]
  LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'Phase 11 command persistence prerequisite table public.% does not exist', required_table;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_reporting_active_actor(
  p_organization_id UUID,
  p_actor_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_organization_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Organization and actor are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = p_organization_id
      AND membership.user_id = p_actor_user_id
      AND membership.status = 'ACTIVE'
      AND membership.deleted_at IS NULL
      AND COALESCE(membership.is_deleted, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Actor is not an active member of the requested Organization';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_reporting_reference_value(
  p_reference_value_id UUID,
  p_category_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_reference_value_id IS NULL THEN
    RAISE EXCEPTION 'Reference value is required for category %', p_category_code;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reference_values value
    JOIN public.reference_categories category ON category.id = value.category_id
    WHERE value.id = p_reference_value_id
      AND category.code = p_category_code
      AND value.organization_id IS NULL
      AND value.is_active = TRUE
      AND value.deleted_at IS NULL
      AND COALESCE(value.is_deleted, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Reference value % is not an active global % value', p_reference_value_id, p_category_code;
  END IF;
END;
$$;

-- Definition lifecycle is deliberately small: draft definitions are created,
-- then activated or retired. The report specification remains application-owned
-- and is already held in the approved report_definitions physical table.
CREATE OR REPLACE FUNCTION public.set_report_definition_status(
  p_report_definition_id UUID,
  p_organization_id UUID,
  p_expected_version INTEGER,
  p_status_reference_value_id UUID,
  p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_id UUID;
BEGIN
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'Expected Report Definition version is required';
  END IF;

  PERFORM public.assert_reporting_active_actor(p_organization_id, p_actor_user_id);
  PERFORM public.assert_reporting_reference_value(p_status_reference_value_id, 'REPORT_STATUS');

  UPDATE public.report_definitions definition
  SET status_reference_value_id = p_status_reference_value_id,
      updated_by = p_actor_user_id,
      updated_at = NOW(),
      version = definition.version + 1
  WHERE definition.report_definition_id = p_report_definition_id
    AND definition.organization_id = p_organization_id
    AND definition.version = p_expected_version
    AND definition.deleted_at IS NULL
    AND COALESCE(definition.is_deleted, FALSE) = FALSE
  RETURNING definition.report_definition_id INTO v_updated_id;

  RETURN v_updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_report_schedule_status(
  p_report_schedule_id UUID,
  p_organization_id UUID,
  p_expected_version INTEGER,
  p_status_reference_value_id UUID,
  p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_id UUID;
BEGIN
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'Expected Report Schedule version is required';
  END IF;

  PERFORM public.assert_reporting_active_actor(p_organization_id, p_actor_user_id);
  PERFORM public.assert_reporting_reference_value(p_status_reference_value_id, 'REPORT_SCHEDULE_STATUS');

  UPDATE public.report_schedules schedule
  SET status_reference_value_id = p_status_reference_value_id,
      updated_by = p_actor_user_id,
      updated_at = NOW(),
      version = schedule.version + 1
  WHERE schedule.report_schedule_id = p_report_schedule_id
    AND schedule.organization_id = p_organization_id
    AND schedule.version = p_expected_version
    AND schedule.deleted_at IS NULL
    AND COALESCE(schedule.is_deleted, FALSE) = FALSE
  RETURNING schedule.report_schedule_id INTO v_updated_id;

  RETURN v_updated_id;
END;
$$;

-- Executions are immutable operational evidence except for their controlled
-- lifecycle status. The transition is atomic and tenant-scoped.
CREATE OR REPLACE FUNCTION public.set_report_execution_status(
  p_report_execution_id UUID,
  p_organization_id UUID,
  p_expected_version INTEGER,
  p_status_reference_value_id UUID,
  p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_id UUID;
BEGIN
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'Expected Report Execution version is required';
  END IF;

  PERFORM public.assert_reporting_active_actor(p_organization_id, p_actor_user_id);
  PERFORM public.assert_reporting_reference_value(p_status_reference_value_id, 'REPORT_EXECUTION_STATUS');

  UPDATE public.report_executions execution
  SET status_reference_value_id = p_status_reference_value_id,
      updated_by = p_actor_user_id,
      updated_at = NOW(),
      version = execution.version + 1
  WHERE execution.report_execution_id = p_report_execution_id
    AND execution.organization_id = p_organization_id
    AND execution.version = p_expected_version
    AND execution.deleted_at IS NULL
    AND COALESCE(execution.is_deleted, FALSE) = FALSE
  RETURNING execution.report_execution_id INTO v_updated_id;

  RETURN v_updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_report_schedule(
  p_report_schedule_id UUID,
  p_organization_id UUID,
  p_expected_version INTEGER,
  p_actor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_id UUID;
BEGIN
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'Expected Report Schedule version is required';
  END IF;

  PERFORM public.assert_reporting_active_actor(p_organization_id, p_actor_user_id);

  UPDATE public.report_schedules schedule
  SET deleted_by = p_actor_user_id,
      deleted_at = NOW(),
      is_deleted = TRUE,
      updated_by = p_actor_user_id,
      updated_at = NOW(),
      version = schedule.version + 1
  WHERE schedule.report_schedule_id = p_report_schedule_id
    AND schedule.organization_id = p_organization_id
    AND schedule.version = p_expected_version
    AND schedule.deleted_at IS NULL
    AND COALESCE(schedule.is_deleted, FALSE) = FALSE
  RETURNING schedule.report_schedule_id INTO v_deleted_id;

  RETURN v_deleted_id;
END;
$$;

COMMENT ON FUNCTION public.set_report_definition_status(UUID, UUID, INTEGER, UUID, UUID) IS
  'Changes a tenant-scoped Report Definition lifecycle status using optimistic concurrency.';
COMMENT ON FUNCTION public.set_report_schedule_status(UUID, UUID, INTEGER, UUID, UUID) IS
  'Changes a tenant-scoped Report Schedule lifecycle status using optimistic concurrency.';
COMMENT ON FUNCTION public.set_report_execution_status(UUID, UUID, INTEGER, UUID, UUID) IS
  'Changes a tenant-scoped Report Execution lifecycle status using optimistic concurrency.';
COMMENT ON FUNCTION public.soft_delete_report_schedule(UUID, UUID, INTEGER, UUID) IS
  'Soft retires a tenant-scoped Report Schedule using optimistic concurrency.';

COMMIT;
