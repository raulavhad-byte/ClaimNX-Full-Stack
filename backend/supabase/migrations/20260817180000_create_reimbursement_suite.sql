BEGIN;

-- Product-specific workflow state is deliberately separate from the legacy
-- cashless claim status.  A case may link to a master claim, but each product
-- owns its own state machine, evidence and audit trail.
CREATE TABLE IF NOT EXISTS reimbursement_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  claim_id UUID REFERENCES claims(id) ON DELETE RESTRICT,
  parent_case_id UUID REFERENCES reimbursement_cases(id) ON DELETE RESTRICT,
  product_code TEXT NOT NULL CHECK (product_code IN ('ICA','PRE_POST','PARTNER_PROCESSING','KYP','RECOVERY_RECON')),
  case_reference TEXT NOT NULL,
  status_code TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
  payer_id UUID,
  total_claimed_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (total_claimed_amount >= 0),
  approved_amount NUMERIC(18,2) CHECK (approved_amount IS NULL OR approved_amount >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (organization_id, case_reference),
  CONSTRAINT ck_reimbursement_cases_pre_post_parent CHECK (product_code <> 'PRE_POST' OR parent_case_id IS NOT NULL),
  CONSTRAINT ck_reimbursement_cases_recovery_claim CHECK (product_code <> 'RECOVERY_RECON' OR claim_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS reimbursement_workflow_stages (
  product_code TEXT NOT NULL CHECK (product_code IN ('ICA','PRE_POST','PARTNER_PROCESSING','KYP','RECOVERY_RECON')),
  status_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  display_order SMALLINT NOT NULL CHECK (display_order > 0),
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (product_code, status_code),
  UNIQUE (product_code, display_order)
);

CREATE TABLE IF NOT EXISTS reimbursement_case_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES reimbursement_cases(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  product_code TEXT NOT NULL,
  from_status_code TEXT,
  to_status_code TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reimbursement_case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES reimbursement_cases(id) ON DELETE RESTRICT,
  document_id UUID REFERENCES documents(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')),
  verified_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, document_id, document_type)
);

CREATE TABLE IF NOT EXISTS pre_post_details (
  case_id UUID PRIMARY KEY REFERENCES reimbursement_cases(id) ON DELETE RESTRICT,
  parent_claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE RESTRICT,
  window_type TEXT NOT NULL CHECK (window_type IN ('PRE_HOSPITALIZATION','POST_HOSPITALIZATION','COMBINED')),
  window_start_date DATE NOT NULL,
  window_end_date DATE NOT NULL,
  total_pre_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (total_pre_amount >= 0),
  total_post_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (total_post_amount >= 0),
  grand_total_claimed NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (grand_total_claimed >= 0),
  master_annexure_document_id UUID REFERENCES documents(id) ON DELETE RESTRICT,
  CONSTRAINT ck_pre_post_window_dates CHECK (window_end_date >= window_start_date)
);

CREATE TABLE IF NOT EXISTS partner_claim_metadata (
  case_id UUID PRIMARY KEY REFERENCES reimbursement_cases(id) ON DELETE RESTRICT,
  partner_id UUID NOT NULL,
  partner_external_reference TEXT NOT NULL,
  ingestion_channel TEXT NOT NULL CHECK (ingestion_channel IN ('API','WEBHOOK','SFTP','BULK_UPLOAD')),
  payload_hash TEXT NOT NULL,
  webhook_url TEXT,
  fee_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  consent_document_id UUID REFERENCES documents(id) ON DELETE RESTRICT,
  digital_docket_document_id UUID REFERENCES documents(id) ON DELETE RESTRICT,
  UNIQUE (partner_id, partner_external_reference)
);

CREATE TABLE IF NOT EXISTS kyp_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES reimbursement_cases(id) ON DELETE RESTRICT,
  claim_id UUID REFERENCES claims(id) ON DELETE RESTRICT,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  policy_document_id UUID REFERENCES documents(id) ON DELETE RESTRICT,
  base_sum_insured NUMERIC(18,2) CHECK (base_sum_insured IS NULL OR base_sum_insured >= 0),
  cumulative_bonus NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (cumulative_bonus >= 0),
  total_effective_cover NUMERIC(18,2) CHECK (total_effective_cover IS NULL OR total_effective_cover >= 0),
  policy_start_date DATE,
  policy_end_date DATE,
  policy_type TEXT CHECK (policy_type IN ('INDIVIDUAL','FLOATER','CORPORATE')),
  extraction_confidence NUMERIC(5,4) CHECK (extraction_confidence IS NULL OR extraction_confidence BETWEEN 0 AND 1),
  certificate_document_id UUID REFERENCES documents(id) ON DELETE RESTRICT,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_kyp_policy_dates CHECK (policy_end_date IS NULL OR policy_start_date IS NULL OR policy_end_date >= policy_start_date)
);

CREATE TABLE IF NOT EXISTS kyp_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyp_assessment_id UUID NOT NULL REFERENCES kyp_assessments(id) ON DELETE RESTRICT,
  clause_type TEXT NOT NULL,
  limit_amount NUMERIC(18,2) CHECK (limit_amount IS NULL OR limit_amount >= 0),
  limit_percentage NUMERIC(5,2) CHECK (limit_percentage IS NULL OR limit_percentage BETWEEN 0 AND 100),
  clause_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kyp_admissibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyp_assessment_id UUID NOT NULL REFERENCES kyp_assessments(id) ON DELETE RESTRICT,
  icd_code TEXT,
  waiting_period_months SMALLINT CHECK (waiting_period_months IS NULL OR waiting_period_months >= 0),
  inception_date DATE,
  is_covered BOOLEAN NOT NULL,
  exclusion_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recovery_cases (
  case_id UUID PRIMARY KEY REFERENCES reimbursement_cases(id) ON DELETE RESTRICT,
  payer_settlement_reference TEXT NOT NULL,
  initial_approved_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (initial_approved_amount >= 0),
  total_disallowed_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (total_disallowed_amount >= 0),
  recovered_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (recovered_amount >= 0),
  write_off_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (write_off_amount >= 0),
  recovery_probability NUMERIC(5,2) CHECK (recovery_probability IS NULL OR recovery_probability BETWEEN 0 AND 100),
  bank_ledger_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recovery_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_case_id UUID NOT NULL REFERENCES recovery_cases(case_id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN ('ROOM_RENT_CAPPING','PROPORTIONATE_DEDUCTION','NON_MEDICAL_ITEMS','INVESTIGATION_DISALLOWED','REASONABLE_CUSTOMARY_CUT','OTHER')),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  is_recoverable BOOLEAN NOT NULL,
  recovery_probability NUMERIC(5,2) CHECK (recovery_probability IS NULL OR recovery_probability BETWEEN 0 AND 100),
  comment TEXT,
  CONSTRAINT ck_recovery_other_comment CHECK (category <> 'OTHER' OR BTRIM(COALESCE(comment, '')) <> '')
);

INSERT INTO reimbursement_workflow_stages (product_code, status_code, display_name, display_order, is_terminal) VALUES
  ('ICA','DRAFT','Draft',1,FALSE),('ICA','INTAKE_REVIEW_PENDING','Intake Review Pending',2,FALSE),('ICA','MEDICAL_AUDIT','Medical Audit',3,FALSE),('ICA','FINANCIAL_AUDIT','Financial Audit',4,FALSE),('ICA','DOCKET_READY','Docket Ready',5,FALSE),('ICA','DISPATCHED_TO_PAYER','Dispatched to Payer',6,FALSE),('ICA','PAYER_INGESTED','Payer Ingested & Acknowledged',7,FALSE),('ICA','PAYER_QUERY_RAISED','Payer Query Raised',8,FALSE),('ICA','PAYER_QUERY_RESPONDED','Payer Query Responded',9,FALSE),('ICA','SETTLEMENT_APPROVED','Settlement Approved',10,FALSE),('ICA','PAYMENT_CREDITED','Payment Credited',11,FALSE),('ICA','REJECTED','Claim Repudiated / Rejected',12,FALSE),('ICA','CLOSED','Closed / Handed Off to Recon',13,TRUE),
  ('PRE_POST','DRAFT','Draft / Accumulating Bills',1,FALSE),('PRE_POST','CHRONOLOGICAL_INDEXING_PENDING','Chronological Indexing Pending',2,FALSE),('PRE_POST','MEDICAL_NEXUS_AUDIT','Medical Nexus Audit',3,FALSE),('PRE_POST','TARIFF_DISALLOWANCE_AUDIT','Tariff & Disallowance Audit',4,FALSE),('PRE_POST','DOCKET_COMPILED','Pre-Post Docket Compiled',5,FALSE),('PRE_POST','DISPATCHED','Dispatched to Insurer/TPA',6,FALSE),('PRE_POST','PAYER_INGESTED','Payer Ingested & Linked',7,FALSE),('PRE_POST','QUERY_RECEIVED','Query Received',8,FALSE),('PRE_POST','QUERY_RESPONDED','Query Responded',9,FALSE),('PRE_POST','SETTLED_DISBURSED','Settled & Disbursed',10,FALSE),('PRE_POST','REJECTED','Rejected / Disallowed',11,FALSE),('PRE_POST','CLOSED','Closed',12,TRUE),
  ('PARTNER_PROCESSING','PARTNER_INGESTED','Partner Ingested / Staged',1,FALSE),('PARTNER_PROCESSING','SCHEMA_VALIDATION','Schema & Data Scope Validation',2,FALSE),('PARTNER_PROCESSING','ELIGIBILITY_SANCTION_CHECK','Eligibility & Sanction Check',3,FALSE),('PARTNER_PROCESSING','DOCUMENT_COMPLETENESS_GATE','Partner Document Completeness Gate',4,FALSE),('PARTNER_PROCESSING','OPERATIONAL_HANDOVER_ACCEPTED','Operational Handover Accepted',5,FALSE),('PARTNER_PROCESSING','ASSIGNED_TO_PARTNER_DESK','Assigned to Partner Desk Tier',6,FALSE),('PARTNER_PROCESSING','B2B_AUDIT_PRE_SCORING','B2B Audit & Pre-Scoring',7,FALSE),('PARTNER_PROCESSING','PAYER_SUBMISSION','Payer Submission via Partner Route',8,FALSE),('PARTNER_PROCESSING','PARTNER_QUERY_RELAY','Partner Query Relay',9,FALSE),('PARTNER_PROCESSING','PARTNER_QUERY_RESPONSE_RECEIVED','Partner Query Response Received',10,FALSE),('PARTNER_PROCESSING','PARTNER_SETTLEMENT_RECONCILED','Partner Settlement Reconciled',11,FALSE),('PARTNER_PROCESSING','SETTLEMENT_WEBHOOK_DISPATCHED','Partner Settlement Webhook Dispatched',12,FALSE),('PARTNER_PROCESSING','CLOSED','Closed / Partner Billing Billed',13,TRUE),
  ('KYP','POLICY_SCHEDULE_UPLOADED','Policy Schedule Uploaded',1,FALSE),('KYP','OCR_CLAUSE_INGESTION','OCR / Clause Ingestion',2,FALSE),('KYP','CLAUSE_VERIFICATION_PENDING','Clause Verification Pending',3,FALSE),('KYP','MEDICAL_ADMISSIBILITY_EVALUATION','Medical Admissibility Evaluation',4,FALSE),('KYP','ROOM_RENT_ICU_CAPPING','Room Rent & ICU Capping Calculation',5,FALSE),('KYP','KYP_CERTIFICATE_GENERATED','KYP Certificate Generated',6,FALSE),('KYP','CERTIFIED_ATTACHED','Certified & Attached to Claim',7,FALSE),('KYP','AMENDED_REEVALUATED','Amended / Re-Evaluated',8,FALSE),
  ('RECOVERY_RECON','DEDUCTION_IDENTIFIED','Deduction Identified & Ingested',1,FALSE),('RECOVERY_RECON','FEASIBILITY_SCORING','Deduction Classification & Recovery Feasibility Scoring',2,FALSE),('RECOVERY_RECON','LEVEL_1_DOCKET_COMPILED','Level 1 Grievance Docket Compiled',3,FALSE),('RECOVERY_RECON','LEVEL_1_DISPATCHED','Level 1 Grievance Dispatched',4,FALSE),('RECOVERY_RECON','PAYER_ACKNOWLEDGED','Payer Grievance Acknowledged',5,FALSE),('RECOVERY_RECON','LEVEL_1_DECISION_RECEIVED','Level 1 Decision Received',6,FALSE),('RECOVERY_RECON','LEVEL_2_ESCALATION','Level 2 Escalation',7,FALSE),('RECOVERY_RECON','OMBUDSMAN_HEARING','Ombudsman Hearing / Award Scheduled',8,FALSE),('RECOVERY_RECON','FINAL_RECOVERY_RECONCILED','Final Recovery Received & Bank Reconciled',9,FALSE),('RECOVERY_RECON','WRITE_OFF_APPROVED','Unrecoverable Write-Off Approved',10,FALSE),('RECOVERY_RECON','CLOSED','Recon Closed & Final Ledger Balanced',11,TRUE)
ON CONFLICT (product_code, status_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_reimbursement_cases_scope_product_status ON reimbursement_cases(organization_id, hospital_id, product_code, status_code) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_reimbursement_transitions_case_occurred ON reimbursement_case_transitions(case_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_reimbursement_documents_case_type ON reimbursement_case_documents(case_id, document_type);
CREATE INDEX IF NOT EXISTS idx_partner_metadata_partner_external_ref ON partner_claim_metadata(partner_id, partner_external_reference);
CREATE INDEX IF NOT EXISTS idx_recovery_deductions_case ON recovery_deductions(recovery_case_id);

-- Product transitions are audit evidence, never mutable operational data.
CREATE OR REPLACE FUNCTION prevent_reimbursement_transition_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'reimbursement_case_transitions are immutable'; END; $$;
DROP TRIGGER IF EXISTS trg_prevent_reimbursement_transition_mutation ON reimbursement_case_transitions;
CREATE TRIGGER trg_prevent_reimbursement_transition_mutation BEFORE UPDATE OR DELETE ON reimbursement_case_transitions FOR EACH ROW EXECUTE FUNCTION prevent_reimbursement_transition_mutation();

ALTER TABLE reimbursement_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_case_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_post_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_claim_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyp_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyp_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyp_admissibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_deductions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE reimbursement_cases, reimbursement_workflow_stages,
  reimbursement_case_transitions, reimbursement_case_documents, pre_post_details,
  partner_claim_metadata, kyp_assessments, kyp_clauses, kyp_admissibility_rules,
  recovery_cases, recovery_deductions FROM anon, authenticated;

COMMIT;
