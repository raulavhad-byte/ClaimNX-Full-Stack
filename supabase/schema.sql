-- PostgreSQL Schema for ClaimNX
-- Optimized for Supabase with Relations, Indexes, and Storage Policies

-- Enable standard UUID generation extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. Configuration & Security (Roles & Auth)
-- =========================================================================

-- 1.1 Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    can_create_roles JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. Core Entities (Hospitals, Users, Patients)
-- =========================================================================

-- 2.1 Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rohini_id TEXT UNIQUE,
    registration_no TEXT,
    address TEXT,
    city TEXT,
    district TEXT,
    state TEXT,
    pin_code TEXT,
    gst_no TEXT,
    pan_no TEXT,
    wallet_balance NUMERIC(15, 2) DEFAULT 0.00,
    parent_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Users Table (Links with Supabase Auth or Firebase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'Hospital',
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    firebase_uid TEXT UNIQUE, -- Link to external identity providers
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    mobile_no TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    dob DATE,
    contact TEXT,
    address TEXT,
    uhid TEXT, -- Unique Health ID
    chronic_conditions JSONB DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 3. Insurance & Payer Configurations
-- =========================================================================

-- 3.1 Insurance Entities Table (Insurers & TPAs)
CREATE TABLE IF NOT EXISTS insurance_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email_id TEXT,
    portal_link TEXT,
    type TEXT CHECK (type IN ('Insurer', 'TPA')),
    automation_type TEXT CHECK (automation_type IN ('Portal', 'Email', 'RPA', 'Manual')),
    on_panel BOOLEAN DEFAULT TRUE,
    rpa_supported BOOLEAN DEFAULT FALSE,
    auto_email_enabled BOOLEAN DEFAULT TRUE,
    template_name TEXT,
    data TEXT, -- Catch-all JSON string for additional metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 4. Claims Management
-- =========================================================================

-- 4.1 Claims Table
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_ref_id TEXT UNIQUE, -- Pre-auth code / Unique identifier
    patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE RESTRICT,
    payer_id UUID REFERENCES insurance_entities(id) ON DELETE RESTRICT,
    insurance_company TEXT, -- Denormalized insurance provider name
    tpa_provider TEXT, -- Denormalized TPA name
    policy_number TEXT,
    status TEXT DEFAULT 'Initiated',
    amount NUMERIC(15, 2) DEFAULT 0.00, -- Estimated or claim amount
    estimated_cost NUMERIC(15, 2) DEFAULT 0.00,
    approved_amount NUMERIC(15, 2) DEFAULT 0.00,
    settled_amount NUMERIC(15, 2) DEFAULT 0.00,
    diagnosis TEXT,
    admission_date TIMESTAMPTZ,
    discharge_date TIMESTAMPTZ,
    priority TEXT DEFAULT 'Standard' CHECK (priority IN ('Standard', 'Urgent', 'Critical')),
    form_data JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 4.2 Claim Stages (Timeline Tracking)
CREATE TABLE IF NOT EXISTS claim_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    comment TEXT,
    amount NUMERIC(15, 2) DEFAULT 0.00,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    stage_data JSONB DEFAULT '{}'::jsonb, -- Schema: { documents: Array<{ name: string, data: string, mimeType: string, uploadedAt: string }>, ... }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 Queries Table (Payer queries)
CREATE TABLE IF NOT EXISTS queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    raised_at TIMESTAMPTZ DEFAULT NOW(),
    replied_at TIMESTAMPTZ,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved')),
    reply_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 5. Wallet, Orders, Billing & Reconciliation
-- =========================================================================

-- 5.1 Orders Table (Recharges / Invoices / Payments)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(15, 2) NOT NULL,
    purpose TEXT,
    invoice_id TEXT,
    payment_method TEXT,
    upi_id TEXT,
    card_num TEXT,
    card_expiry TEXT,
    bank_selected TEXT,
    order_id TEXT, -- PG order id
    txn_id TEXT, -- PG transaction id
    bank_ref TEXT,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    data TEXT, -- Optional JSON metadata storage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 Reconciliations Table
CREATE TABLE IF NOT EXISTS reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id) ON DELETE RESTRICT,
    amount_received NUMERIC(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Paid', 'Fully Paid')),
    bank_ref_no TEXT,
    reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reconciled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.3 Recovery Records Table (For Deductions and Co-pays)
CREATE TABLE IF NOT EXISTS recovery_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    recoverable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    recovered_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Recovered')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.4 Legal Cases Table (Escalated claims)
CREATE TABLE IF NOT EXISTS legal_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    case_number TEXT UNIQUE NOT NULL,
    court_name TEXT,
    lawyer_name TEXT,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Hearing', 'Closed')),
    next_hearing_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 6. Files, Documents & Storage Systems
-- =========================================================================

-- 6.1 Patient Documents Table (KYC / Pre-admission uploads)
CREATE TABLE IF NOT EXISTS patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT NOT NULL,
    mobile_no TEXT NOT NULL,
    email_id TEXT,
    document_type TEXT,
    file_name TEXT,
    file_path TEXT, -- Supabase Storage file path reference
    file_data TEXT, -- Base64 fallback format
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 Documents Table (Comprehensive claim attachments)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage Bucket
    mime_type TEXT,
    category TEXT, -- 'Medical', 'ID Proof', 'Discharge Summary', 'Bill', etc.
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 7. Guidelines, Portals & Auditing
-- =========================================================================

-- 7.1 KYP Policies Table (Know Your Policy guidelines database)
CREATE TABLE IF NOT EXISTS kyp_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insurer_name TEXT NOT NULL,
    policy_code TEXT,
    policy_number TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.2 Form Fields Configuration Table
CREATE TABLE IF NOT EXISTS form_fields (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB,
    required BOOLEAN DEFAULT FALSE,
    section TEXT,
    placeholder TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.3 Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    entity_id TEXT,
    entity_type TEXT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 8. Triggers, Functions & Indexes
-- =========================================================================

-- Index declarations for high-performance querying
CREATE INDEX IF NOT EXISTS idx_claims_hospital_id ON claims(hospital_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_payer_id ON claims(payer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_contact ON patients(contact);
CREATE INDEX IF NOT EXISTS idx_patient_docs_hospital_id ON patient_documents(hospital_id);
CREATE INDEX IF NOT EXISTS idx_documents_claim_id ON documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_stages_claim_id ON claim_stages(claim_id);
CREATE INDEX IF NOT EXISTS idx_queries_claim_id ON queries(claim_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_claim_id ON reconciliations(claim_id);
CREATE INDEX IF NOT EXISTS idx_recovery_records_claim_id ON recovery_records(claim_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_claim_id ON legal_cases(claim_id);

-- Shared updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach update triggers to relevant tables
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_insurance_entities_updated_at BEFORE UPDATE ON insurance_entities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_queries_updated_at BEFORE UPDATE ON queries FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_reconciliations_updated_at BEFORE UPDATE ON reconciliations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_recovery_records_updated_at BEFORE UPDATE ON recovery_records FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_legal_cases_updated_at BEFORE UPDATE ON legal_cases FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_patient_documents_updated_at BEFORE UPDATE ON patient_documents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_kyp_policies_updated_at BEFORE UPDATE ON kyp_policies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_form_fields_updated_at BEFORE UPDATE ON form_fields FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =========================================================================
-- 9. Seed Data
-- =========================================================================

-- Seed Roles
INSERT INTO roles (id, name, description, permissions, can_create_roles) VALUES
('1', 'Admin', 'Full system access', '["all"]', '["Admin", "Hospital", "Reconciliation", "CRM Team", "Medical Team", "Hospital Cashless Desk", "Hospital Accounts", "KYP Team"]'),
('2', 'Hospital', 'Standard hospital user role', '["claims:claims_list:view", "claims:claims_list:create", "claims:claims_list:edit", "patient_dashboard"]', '[]'),
('3', 'Reconciliation', 'Reconciliation role', '["reconciliation_sidebar", "reconciliation_dashboard"]', '[]'),
('4', 'CRM Team', 'Customer relationship and claim operations tracker', '["crm:crm_main:view", "crm:crm_main:process", "crm:crm_main:oversight", "claims:claims_list:view", "claims:claims_list:edit"]', '[]'),
('5', 'Medical Team', 'Medical underwriting role', '["medical_underwriting", "claims:claims_list:view", "claims:claims_list:edit"]', '[]'),
('6', 'Hospital Cashless Desk', 'Desk level cashless processing', '["sidebar_hospital:sections:cashless", "claims:claims_list:view", "claims:claims_list:create", "claims:claims_list:edit"]', '[]'),
('7', 'Hospital Accounts', 'Hospital financial tracking role', '["sidebar_hospital:sections:cashless", "invoice_management"]', '[]'),
('8', 'KYP Team', 'Know Your Policy team', '["kyp_dashboard", "reimbursement_kyp"]', '[]')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    can_create_roles = EXCLUDED.can_create_roles;

-- =========================================================================
-- 10. Supabase Storage Buckets Config & Row Level Security (RLS) Template
-- =========================================================================

-- NOTE FOR SUPABASE DEPLOYMENT:
-- Please run the following queries in the Supabase SQL Editor to provision
-- the storage buckets for patient KYC documents and general claim attachments:
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('claim-documents', 'claim-documents', false) ON CONFLICT (id) DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', true) ON CONFLICT (id) DO NOTHING;
--
-- Example RLS policies for database tables:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = firebase_uid OR auth.uid()::text = id::text);
-- CREATE POLICY "Hospital staff can view their hospital's claims" ON claims FOR SELECT USING (hospital_id IN (SELECT hospital_id FROM users WHERE firebase_uid = auth.uid() OR id::text = auth.uid()::text));
