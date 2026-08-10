-- ClaimNX Phase 8 Claim Command Persistence migration validation (READ ONLY)
-- Expected: all function checks return true. This script changes no data.
SELECT
    to_regprocedure('public.create_claim(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,character,numeric,character varying,uuid)') IS NOT NULL AS create_claim_exists,
    to_regprocedure('public.transition_claim_lifecycle(uuid,uuid,uuid,integer,uuid,uuid,text,uuid)') IS NOT NULL AS transition_claim_lifecycle_exists,
    to_regprocedure('public.create_claim_authorization(uuid,uuid,uuid,uuid,uuid,uuid,character varying,numeric,timestamp with time zone,timestamp with time zone,uuid)') IS NOT NULL AS create_claim_authorization_exists,
    to_regprocedure('public.create_claim_query(uuid,uuid,uuid,uuid,uuid,uuid,character varying,text,timestamp with time zone,uuid)') IS NOT NULL AS create_claim_query_exists,
    to_regprocedure('public.create_claim_submission_intent(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid)') IS NOT NULL AS create_claim_submission_intent_exists,
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.claim_stages'::regclass AND tgname = 'trg_claim_stages_append_only' AND NOT tgisinternal) AS claim_status_history_append_only;
