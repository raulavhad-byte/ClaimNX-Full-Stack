-- Database-enforced claim visibility for operational queues.
--
-- Finance/Accounts/Reconciliation users receive only claims from their own
-- hospital, explicitly assigned hospitals, or hospitals that match every
-- geographical scope they have configured. Zone membership is resolved from
-- zones -> zone_states -> states; it is never trusted from the browser.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_hospitals_state_district_active
  ON public.hospitals (state, district, id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_claims_status_hospital_active
  ON public.claims (status, hospital_id, created_at DESC)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE OR REPLACE FUNCTION public.claims_visible_to_user(
  p_actor_user_id UUID,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_patient_id TEXT DEFAULT NULL,
  p_hospital_id TEXT DEFAULT NULL,
  p_payer_id TEXT DEFAULT NULL
)
RETURNS SETOF public.claims
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH actor AS (
    SELECT
      user_record.id,
      UPPER(COALESCE(user_record.role, '')) AS role_name,
      user_record.hospital_id,
      COALESCE(user_record.profile_data, '{}'::jsonb) AS profile_data
    FROM public.users AS user_record
    WHERE user_record.id = p_actor_user_id
      AND user_record.status = 'Active'
      AND COALESCE(user_record.is_deleted, FALSE) = FALSE
  ),
  scope AS (
    SELECT
      actor.*,
      ARRAY(
        SELECT jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(actor.profile_data -> 'assignedHospitalIds') = 'array'
              THEN actor.profile_data -> 'assignedHospitalIds'
            ELSE '[]'::jsonb
          END
        )
      ) AS assigned_hospital_ids,
      ARRAY(
        SELECT jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(actor.profile_data -> 'zones') = 'array'
              THEN actor.profile_data -> 'zones'
            ELSE '[]'::jsonb
          END
        )
      ) AS zones,
      ARRAY(
        SELECT jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(actor.profile_data -> 'states') = 'array'
              THEN actor.profile_data -> 'states'
            ELSE '[]'::jsonb
          END
        )
      ) AS states,
      ARRAY(
        SELECT jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(actor.profile_data -> 'districts') = 'array'
              THEN actor.profile_data -> 'districts'
            ELSE '[]'::jsonb
          END
        )
      ) AS districts
    FROM actor
  )
  SELECT claim.*
  FROM public.claims AS claim
  CROSS JOIN scope
  JOIN public.hospitals AS hospital
    ON hospital.id = claim.hospital_id
   AND COALESCE(hospital.is_deleted, FALSE) = FALSE
  WHERE COALESCE(claim.is_deleted, FALSE) = FALSE
    AND (p_status IS NULL OR claim.status = p_status)
    AND (p_priority IS NULL OR claim.priority = p_priority)
    AND (p_patient_id IS NULL OR claim.patient_id::text = p_patient_id)
    AND (p_hospital_id IS NULL OR claim.hospital_id::text = p_hospital_id)
    AND (p_payer_id IS NULL OR claim.payer_id::text = p_payer_id)
    AND (
      scope.role_name IN ('SUPER ADMIN', 'ADMIN', 'PRIMARY ADMIN')
      OR hospital.id = scope.hospital_id
      OR hospital.id::text = ANY(scope.assigned_hospital_ids)
      OR (
        (cardinality(scope.zones) + cardinality(scope.states) + cardinality(scope.districts)) > 0
        AND (
          cardinality(scope.zones) = 0
          OR EXISTS (
            SELECT 1
            FROM public.zones AS zone
            JOIN public.zone_states AS zone_state ON zone_state.zone_id = zone.id
            JOIN public.states AS state ON state.id = zone_state.state_id
            WHERE EXISTS (
              SELECT 1 FROM unnest(scope.zones) AS permitted_zone
              WHERE LOWER(BTRIM(zone.name)) = LOWER(BTRIM(permitted_zone))
                 OR LOWER(BTRIM(zone.code)) = LOWER(BTRIM(permitted_zone))
            )
              AND LOWER(BTRIM(state.name)) = LOWER(BTRIM(hospital.state))
          )
        )
        AND (
          cardinality(scope.states) = 0 OR EXISTS (
            SELECT 1 FROM unnest(scope.states) AS permitted_state
            WHERE LOWER(BTRIM(hospital.state)) = LOWER(BTRIM(permitted_state))
          )
        )
        AND (
          cardinality(scope.districts) = 0 OR EXISTS (
            SELECT 1 FROM unnest(scope.districts) AS permitted_district
            WHERE LOWER(BTRIM(hospital.district)) = LOWER(BTRIM(permitted_district))
          )
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.claims_visible_to_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claims_visible_to_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;
