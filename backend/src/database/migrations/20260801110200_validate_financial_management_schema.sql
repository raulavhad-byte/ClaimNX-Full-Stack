  BEGIN;

  CREATE OR REPLACE FUNCTION public.prevent_financial_posting_mutation()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN
      RAISE EXCEPTION 'Financial postings are append-only. Create a compensating posting instead.';
  END;
  $$;

  DROP TRIGGER IF EXISTS trg_financial_posting_append_only ON public.financial_posting;
  CREATE TRIGGER trg_financial_posting_append_only
  BEFORE UPDATE OR DELETE ON public.financial_posting
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_posting_mutation();

  DO $$
  DECLARE required_table_count INTEGER; actual_table_count INTEGER;
  BEGIN
      SELECT COUNT(*) INTO actual_table_count
      FROM pg_tables
      WHERE schemaname='public' AND tablename IN (
        'financial_remittance_batch','financial_remittance_line_item','financial_remittance_evidence','financial_claim_settlement','financial_settlement_deduction','financial_recovery','financial_posting','financial_bank_statement_line','financial_bank_match');
      required_table_count := 9;
      IF actual_table_count <> required_table_count THEN
        RAISE EXCEPTION 'Phase 9 schema validation failed: expected % Finance tables, found %.', required_table_count, actual_table_count;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.financial_posting'::regclass AND tgname='trg_financial_posting_append_only' AND NOT tgisinternal) THEN
        RAISE EXCEPTION 'Phase 9 schema validation failed: Financial Posting append-only trigger is missing.';
      END IF;
  END $$;

  COMMIT;
