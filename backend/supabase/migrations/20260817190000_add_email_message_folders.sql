BEGIN;

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT 'INBOX';

ALTER TABLE email_messages DROP CONSTRAINT IF EXISTS email_messages_folder_check;
ALTER TABLE email_messages ADD CONSTRAINT email_messages_folder_check
  CHECK (folder IN ('INBOX', 'SENT', 'DRAFTS', 'OUTBOX', 'SPAM'));

-- Existing outbound correspondence belongs in Sent; existing inbound data
-- remains Inbox unless a provider sync explicitly identifies it as Spam.
UPDATE email_messages SET folder = 'SENT'
WHERE direction = 'OUTBOUND' AND folder = 'INBOX';

CREATE INDEX IF NOT EXISTS idx_email_messages_account_folder_received
  ON email_messages(mail_account_id, folder, received_at DESC, sent_at DESC);

COMMIT;
