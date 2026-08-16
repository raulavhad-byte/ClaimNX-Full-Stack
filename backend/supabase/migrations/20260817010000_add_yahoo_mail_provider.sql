BEGIN;

ALTER TABLE mail_accounts DROP CONSTRAINT IF EXISTS mail_accounts_provider_check;
ALTER TABLE mail_accounts ADD CONSTRAINT mail_accounts_provider_check
  CHECK (provider IN ('GMAIL', 'MICROSOFT_365', 'YAHOO', 'ZOHO', 'IMAP_SMTP'));

ALTER TABLE mail_oauth_authorization_states DROP CONSTRAINT IF EXISTS mail_oauth_authorization_states_provider_check;
ALTER TABLE mail_oauth_authorization_states ADD CONSTRAINT mail_oauth_authorization_states_provider_check
  CHECK (provider IN ('GMAIL', 'MICROSOFT_365', 'YAHOO', 'ZOHO'));

COMMIT;
