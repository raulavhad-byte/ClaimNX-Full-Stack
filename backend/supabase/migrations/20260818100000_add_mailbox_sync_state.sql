BEGIN;

-- Provider cursors and scheduling state are deliberately separate from the
-- mailbox identity. This lets workers lease a sync safely across replicas.
CREATE TABLE IF NOT EXISTS mailbox_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_account_id UUID NOT NULL UNIQUE REFERENCES mail_accounts(id) ON DELETE CASCADE,
  provider_cursor JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_requested_at TIMESTAMPTZ,
  next_poll_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_reconcile_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_expires_at TIMESTAMPTZ,
  renewal_due_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  consecutive_empty_polls INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_empty_polls >= 0),
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  retry_after TIMESTAMPTZ,
  last_error_code TEXT,
  lease_token UUID,
  lease_expires_at TIMESTAMPTZ NOT NULL DEFAULT 'epoch'::timestamptz,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mailbox_sync_state_due
  ON mailbox_sync_state (lease_expires_at, next_poll_at, next_reconcile_at, renewal_due_at, retry_after);

CREATE TABLE IF NOT EXISTS mailbox_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_account_id UUID NOT NULL REFERENCES mail_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  messages_found INTEGER NOT NULL DEFAULT 0,
  messages_imported INTEGER NOT NULL DEFAULT 0,
  provider_calls INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mailbox_sync_events_account_created
  ON mailbox_sync_events (mail_account_id, created_at DESC);

COMMIT;
