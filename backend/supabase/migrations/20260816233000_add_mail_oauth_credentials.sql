BEGIN;

-- OAuth state is persisted as a one-time, hashed value.  The browser never
-- receives a database identifier and replayed callbacks are rejected.
CREATE TABLE IF NOT EXISTS mail_oauth_authorization_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('GMAIL', 'MICROSOFT_365', 'ZOHO')),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  requested_by UUID NOT NULL,
  requested_email_address TEXT NOT NULL,
  display_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens are encrypted by the application using AES-256-GCM before
-- reaching the database. No plain OAuth token is stored in mail_accounts.
CREATE TABLE IF NOT EXISTS mail_account_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_account_id UUID NOT NULL UNIQUE REFERENCES mail_accounts(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,
  initialization_vector TEXT NOT NULL,
  authentication_tag TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  key_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_oauth_states_active
  ON mail_oauth_authorization_states (provider, expires_at)
  WHERE consumed_at IS NULL;

COMMIT;
