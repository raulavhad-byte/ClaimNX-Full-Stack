BEGIN;

-- The ClaimNX frontend must use the authenticated Nest API only.  These
-- tables contain PHI, financial data, identities, OAuth state, or secrets;
-- browser Supabase roles must not read or mutate them directly.  The backend
-- service-role client bypasses RLS and applies tenant/role checks itself.
ALTER TABLE IF EXISTS public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mail_account_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mail_oauth_authorization_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_processing_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_review_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_claim_settlement ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_recovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_posting ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_remittance_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_remittance_line_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_remittance_evidence ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'claims', 'patients', 'documents', 'users', 'user_sessions', 'audit_logs',
    'mail_accounts', 'mail_account_credentials', 'mail_oauth_authorization_states',
    'email_threads', 'email_messages', 'email_attachments',
    'email_processing_attempts', 'email_review_tasks',
    'report_automation_configs', 'report_automation_logs', 'report_email_templates',
    'financial_claim_settlement', 'financial_recovery', 'financial_posting',
    'financial_remittance_batch', 'financial_remittance_line_item',
    'financial_remittance_evidence'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    END IF;
  END LOOP;
END $$;

COMMIT;
