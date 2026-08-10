  -- ============================================================================
  -- ClaimNX Phase 9: Financial Command Persistence Post-migration Validation
  -- READ ONLY — run only after 20260801110300 has been applied successfully.
  -- Expected: every result column is true.
  -- ============================================================================

  SELECT
    to_regprocedure('public.create_financial_remittance_batch(uuid,uuid,uuid,uuid,uuid,uuid,uuid,character varying,timestamp with time zone,character, numeric,numeric,character varying,text,uuid)') IS NOT NULL AS create_remittance_batch_exists,
    to_regprocedure('public.create_financial_remittance_line_item(uuid,uuid,uuid,uuid,uuid,uuid,character varying,character varying,numeric,numeric,numeric,character,jsonb,uuid)') IS NOT NULL AS create_remittance_line_item_exists,
    to_regprocedure('public.create_financial_remittance_evidence(uuid,uuid,uuid,uuid,character varying,character varying,character varying,bigint,character varying,uuid)') IS NOT NULL AS create_remittance_evidence_exists,
    to_regprocedure('public.create_financial_claim_settlement(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,character varying,character varying,timestamp with time zone,character,numeric,numeric,numeric,numeric,numeric,numeric,numeric,text,uuid)') IS NOT NULL AS create_settlement_exists,
    to_regprocedure('public.create_financial_settlement_deduction(uuid,uuid,uuid,uuid,uuid,character varying,text,numeric,character,uuid)') IS NOT NULL AS create_deduction_exists,
    to_regprocedure('public.create_financial_recovery(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,character varying,timestamp with time zone,timestamp with time zone,character,numeric,numeric,numeric,text,uuid)') IS NOT NULL AS create_recovery_exists,
    to_regprocedure('public.create_financial_posting(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,timestamp with time zone,character,character varying,character varying,numeric,text,uuid)') IS NOT NULL AS create_posting_exists,
    to_regprocedure('public.create_financial_bank_statement_line(uuid,uuid,uuid,character varying,character varying,timestamp with time zone,date,character,numeric,numeric,text,uuid,uuid)') IS NOT NULL AS create_bank_statement_line_exists,
    to_regprocedure('public.create_financial_bank_match(uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,timestamp with time zone,text,uuid)') IS NOT NULL AS create_bank_match_exists,
    to_regprocedure('public.assert_financial_active_actor(uuid)') IS NOT NULL AS active_actor_guard_exists,
    to_regprocedure('public.assert_financial_hospital_scope(uuid,uuid)') IS NOT NULL AS hospital_scope_guard_exists,
    to_regprocedure('public.assert_financial_reference_value(uuid,text)') IS NOT NULL AS reference_guard_exists,
    EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.financial_posting'::regclass
        AND tgname = 'trg_financial_posting_append_only'
        AND NOT tgisinternal
    ) AS financial_posting_append_only_enabled;
