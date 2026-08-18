BEGIN;
ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mail_oauth_authorization_states ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_mail_accounts_internal_status ON mail_accounts(is_internal, status) WHERE NOT is_deleted;
COMMIT;
