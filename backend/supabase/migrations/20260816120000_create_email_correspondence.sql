BEGIN;

CREATE TABLE IF NOT EXISTS mail_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  provider TEXT NOT NULL CHECK (provider IN ('GMAIL', 'MICROSOFT_365', 'ZOHO', 'IMAP_SMTP')),
  email_address TEXT NOT NULL,
  display_name TEXT,
  auth_type TEXT NOT NULL DEFAULT 'OAUTH2' CHECK (auth_type IN ('OAUTH2', 'PASSWORD', 'APP_KEY')),
  credential_reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AUTH_REQUIRED' CHECK (status IN ('ACTIVE', 'AUTH_REQUIRED', 'DISCONNECTED', 'SUSPENDED', 'ERROR')),
  inbound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  outbound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sync_cursor TEXT,
  last_sync_at TIMESTAMPTZ,
  subscription_id TEXT,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  UNIQUE (hospital_id, provider, email_address)
);

CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  claim_id UUID REFERENCES claims(id),
  mail_account_id UUID NOT NULL REFERENCES mail_accounts(id),
  provider_thread_id TEXT,
  correlation_id TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (mail_account_id, provider_thread_id),
  UNIQUE NULLS NOT DISTINCT (mail_account_id, correlation_id)
);

CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  thread_id UUID REFERENCES email_threads(id),
  claim_id UUID REFERENCES claims(id),
  mail_account_id UUID NOT NULL REFERENCES mail_accounts(id),
  provider TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  internet_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  from_address TEXT NOT NULL,
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject TEXT NOT NULL DEFAULT '',
  plain_text_body TEXT,
  sanitized_html_body TEXT,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  classification TEXT,
  classification_confidence NUMERIC(5,4),
  claim_match_method TEXT,
  claim_match_confidence NUMERIC(5,4),
  processing_status TEXT NOT NULL DEFAULT 'RECEIVED',
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mail_account_id, provider_message_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_messages_internet_message
  ON email_messages (mail_account_id, internet_message_id)
  WHERE internet_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  document_id UUID,
  provider_attachment_id TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  storage_reference TEXT,
  processing_status TEXT NOT NULL DEFAULT 'PENDING',
  ocr_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (email_message_id, provider_attachment_id)
);

CREATE TABLE IF NOT EXISTS email_processing_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email_message_id, attempt_number, stage)
);

CREATE TABLE IF NOT EXISTS email_review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES claims(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ASSIGNED', 'RESOLVED', 'DISMISSED')),
  candidate_claim_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_to UUID,
  resolved_by UUID,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mail_accounts_hospital_status ON mail_accounts (hospital_id, status) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_email_threads_claim ON email_threads (claim_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_hospital_received ON email_messages (hospital_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_claim_received ON email_messages (claim_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_processing ON email_messages (processing_status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_messages_classification ON email_messages (classification, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_review_tasks_open ON email_review_tasks (hospital_id, status, created_at DESC);

COMMIT;
