BEGIN;

CREATE TABLE IF NOT EXISTS report_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE report_automation_configs
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES report_email_templates(id) ON DELETE SET NULL;

INSERT INTO report_email_templates (name, subject, body)
VALUES (
  'Standard Hospital Daily Summary',
  'Daily Operations Pulse: {{hospitalName}}',
  E'Hello {{hospitalName}},\n\nYour performance report for {{dateRange}} is ready.\n\nKPI Summary:\n- Total Cases: {{totalCases}}\n- Approved: {{approvedCases}}\n- Approval Ratio: {{approvalRatio}}%\n\n--- ENCLOSED RECONCILIATION SUMMARY ---\n{{reconciliationSummary}}\n\n--- AGING ANALYSIS ---\n{{agingAnalysis}}\n\nView full details here: {{portalLink}}\n\nRegards,\nClaimNX Team'
)
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_report_email_templates_status ON report_email_templates(status, updated_at DESC);

COMMIT;
