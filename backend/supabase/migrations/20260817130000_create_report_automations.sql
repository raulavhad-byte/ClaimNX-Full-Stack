BEGIN;

CREATE TABLE IF NOT EXISTS report_automation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency JSONB NOT NULL,
  recipient_hospital_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_channels JSONB NOT NULL DEFAULT '["Email"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED')),
  last_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES report_automation_configs(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  sender_mail_account_id UUID REFERENCES mail_accounts(id) ON DELETE SET NULL,
  report_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED')),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_automation_configs_active ON report_automation_configs(status, last_run_at);
CREATE INDEX IF NOT EXISTS idx_report_automation_logs_config ON report_automation_logs(config_id, created_at DESC);

COMMIT;
