
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { notificationService } from './services/notificationService';
import { dualStorageService, DISABLE_FIRESTORE } from './services/dualStorageService';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Menu,
  FileSearch,
  FileText,
  Hospital,
  Activity,
  BarChart3,
  Database,
  Download,
  LogOut,
  PlusSquare,
  ClipboardList,
  UserCheck,
  Users,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  BriefcaseMedical,
  Search,
  User,
  Bell,
  CheckCircle2,
  Clock,
  Zap,
  X,
  Calculator,
  Calendar,
  History as HistoryIcon,
  AlertTriangle,
  HardDrive,
  Globe2,
  Mail,
  Sparkles,
  ThumbsUp,
  Heart,
  ChevronRight,
  ArrowRightLeft,
  TrendingUp,
  Coins,
  Gavel,
  Tv,
  ReceiptIndianRupee
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import CashlessDashboard from './components/CashlessDashboard';
import ClaimFormWizard from './components/ClaimFormWizard';
import ReimbursementDashboard from './components/ReimbursementDashboard';
import PartnerProcessingForm from './components/PartnerProcessingForm';
import ClaimProcessCenter from './components/ClaimProcessCenter';
import AdminPanel from './components/AdminPanel';
import MedicalUnderwritingDashboard from './components/MedicalUnderwritingDashboard';
import KYPDashboard from './components/KYPDashboard';
import ManageClaims from './components/ManageClaims';
import ManageHospital from './components/ManageHospital';
import UserManagement from './components/UserManagement';
import MISView from './components/MISView';
import PatientDashboard from './components/PatientDashboard';
import ManualDiagnosisReview from './components/ManualDiagnosisReview';
import CRMDashboard from './components/CRMDashboard';
import CRMManualHandling from './components/CRMManualHandling';
import Login from './components/Login';
import ChatBot from './components/ChatBot';
import BusinessAnalytics from './components/BusinessAnalytics';
import ReconciliationSystem from './components/ReconciliationSystem';
import UserProfile from './components/UserProfile';
import { Toaster, toast } from 'sonner';
import { authApi, claimsApi, usersApi, patientsApi, configApi } from './services/api';
import { claimnxSessionService } from './services/claimnx-session-service';
import ReconciliationDashboard from './components/ReconciliationDashboard';
import SalesDashboard from './components/SalesDashboard';
import SalesManagerDashboard from './components/SalesManagerDashboard';
import { alertService } from './services/alertService';
import AutomatedReportingSystem from './components/AutomatedReportingSystem';
import ReportDownloadCenter from './components/ReportDownloadCenter';
import PerformanceTrackingDashboard from './components/PerformanceTrackingDashboard';
import LiveClaimsTracker from './components/LiveClaimsTracker';
import InvoiceManagement from './components/InvoiceManagement';
import { SystemAnnouncementsBanner, DashboardAnnouncementsWidget } from './components/SystemAnnouncements';
import { 
  Claim, 
  ClaimStatus, 
  FormField, 
  HospitalUser, 
  ClaimStage, 
  InsuranceEntity, 
  Role,
  Query,
  RecoveryRecord,
  ReconciliationRecord,
  Alert,
  KYPPolicy,
  Product
} from './types';

const INSURANCE_LIST = [
  "Star Health Insurance Co.Ltd.",
  "Tata AIG General Insurance Co. Ltd.",
  "The New India Assurance Co. Ltd",
  "The Oriental Insurance Co. Ltd.",
  "United India Insurance Co. Ltd.",
  "National Insurance Co. Ltd.",
  "HDFC ERGO General Insurance Co.Ltd.",
  "ICICI LOMBARD General Insurance Co. Ltd.",
  "Mazagon Dock Shipbuilders",
  "Other Insurance company Limited",
  "Niva Bupa Health Insurance Co Ltd",
  "Care Health Insurance co Ltd",
  "Acko General Insurance Ltd.",
  "Aditya Birla Health Insurance Co. Ltd.",
  "Bajaj General Insurance Co. Ltd",
  "Cholamandalam MS General Insurance Co. Ltd.",
  "Manipal Cigna Health Insurance Company Limited",
  "Navi General Insurance Ltd.",
  "Edelweiss General Insurance Co. Ltd.",
  "Central Generali India Insurance Co. Ltd.",
  "Go Digit General Insurance Ltd",
  "IFFCO TOKIO General Insurance Co. Ltd.",
  "Zurick Kotak General Insurance Co. Ltd.",
  "Liberty General Insurance Ltd.",
  "Magma HDI General Insurance Co. Ltd.",
  "Raheja QBE General Insurance Co. Ltd.",
  "Indusind General Insurance co ltd",
  "Galaxy Health Insurance Company limited",
  "Narayana Health Insurance Company Limited",
  "Protec General Insurance Company Limited",
  "Kiwi General Insurance Company Limited"
];

const TPA_LIST = [
  "Medi Assist Insurance TPA Private Limited", "MDIndia Health Insurance TPA Private Limited",
  "Paramount Health Services & Insurance TPA Private Limited", "Heritage Health Insurance TPA Private Limited",
  "Family Health Plan Insurance TPA Limited", "Raksha Health Insurance TPA Private Limited",
  "Vidal Health Insurance TPA Private Limited", "Anyuta Insuance TPA In Health Care Private Limited",
  "East West Assist Insurance TPA Private Limited", "Medsave Health Insurance TPA Limited",
  "Genins India Insurance TPA Limited", "Alankit Insurance TPA Limited", "Health India Insurance TPA Private Limited",
  "Good Health India Insurance TPA Limited", "Vipul Medcorp Insurance TPA Private Limited",
  "Park Mediclaim Insurance TPA Private Limited", "Health Assist Insurance TPA Private Limited",
  "Anmol Medicare Insurance TPA Limited", "Grand Insurance TPA Private Limited", "Rothshield Insurance TPA Limited",
  "Ericson Insurance TPA Private Limited", "Health Insurance TPA of India Limited",
  "Vision Digital Insurance TPA Private Limited", "Happy Insurance TPA Services Pvt. Ltd"
];

const DASHED_INSURERS = [
  "The New India Assurance Co. Ltd", "The Oriental Insurance Co. Ltd.", "United India Insurance Co. Ltd.",
  "National Insurance Co. Ltd.", "Acko General Insurance Ltd.", "Navi General Insurance Ltd.",
  "Edelweiss General Insurance Co. Ltd.", "Zurick Kotak General Insurance Co. Ltd.", "Liberty General Insurance Ltd.",
  "Raheja QBE General Insurance Co. Ltd."
];

const DASHED_TPAS = [
  "Paramount Health Services & Insurance TPA Private Limited", "Heritage Health Insurance TPA Private Limited",
  "Raksha Health Insurance TPA Private Limited", "Vidal Health Insurance TPA Private Limited",
  "Anyuta Insuance TPA In Health Care Private Limited", "East West Assist Insurance TPA Private Limited",
  "Genins India Insurance TPA Limited", "Alankit Insurance TPA Limited", "Good Health India Insurance TPA Limited",
  "Vipul Medcorp Insurance TPA Private Limited", "Park Mediclaim Insurance TPA Private Limited",
  "Health Assist Insurance TPA Private Limited", "Anmol Medicare Insurance TPA Limited",
  "Grand Insurance TPA Private Limited", "Rothshield Insurance TPA Limited", "Ericson Insurance TPA Private Limited",
  "Health Insurance TPA of India Limited", "Vision Digital Insurance TPA Private Limited", "Happy Insurance TPA Services Pvt. Ltd"
];

const INITIAL_FIELDS: FormField[] = [
  { id: 'insurance_company', label: 'Insurance Company', type: 'select', options: INSURANCE_LIST, required: true, section: 'tpa_hospital' },
  { id: 'in_house_processing', label: 'In-House processing', type: 'radio', options: ['Yes', 'No'], required: true, section: 'tpa_hospital' },
  { id: 'tpa_provider', label: 'TPA Name', type: 'select', options: TPA_LIST, required: true, section: 'tpa_hospital' },
  { id: 'p_uhid', label: 'IPD / Application No / UHID', type: 'text', required: true, section: 'tpa_hospital' },
  { id: 'insurer_claim_no', label: 'Claim No', type: 'text', required: false, section: 'tpa_hospital' },
  { id: 'p_contact', label: 'Contact Number', type: 'number', required: true, section: 'tpa_hospital' },
  { id: 'p_name', label: 'Name of the Patient', type: 'text', required: true, section: 'tpa_hospital' },
  { id: 'p_gender', label: 'Gender', type: 'radio', options: ['Male', 'Female', 'Third Gender'], required: true, section: 'tpa_hospital' },
  { id: 'p_dob', label: 'Date of Birth', type: 'date', required: true, section: 'tpa_hospital' },
  { id: 'p_age_y', label: 'Age (Years)', type: 'number', required: true, section: 'tpa_hospital' },
  { id: 'p_policy_no', label: 'Policy Number', type: 'text', required: true, section: 'tpa_hospital' },
  { id: 'p_card_id', label: 'Insurer Card ID', type: 'text', required: true, section: 'tpa_hospital' },
  { id: 'p_employee_id', label: 'Employee ID', type: 'text', required: false, section: 'tpa_hospital' },
  { id: 'p_aadhaar', label: 'Aadhaar Number', type: 'text', required: false, section: 'tpa_hospital' },
  { id: 'p_pan', label: 'PAN Card Number', type: 'text', required: false, section: 'tpa_hospital' },
  { id: 'p_relative_contact', label: 'Attending Relative Contact', type: 'number', required: false, section: 'tpa_hospital' },
  { id: 'p_other_insurance', label: 'Any other insurance?', type: 'radio', options: ['Yes', 'No'], required: true, section: 'tpa_hospital' },
  { id: 'p_other_insurer_name', label: 'Other Insurer Name', type: 'text', required: false, section: 'tpa_hospital' },
  { id: 'p_family_physician', label: 'Family Physician?', type: 'radio', options: ['Yes', 'No'], required: false, section: 'tpa_hospital' },
  { id: 'p_family_physician_name', label: 'Family Physician Name', type: 'text', required: false, section: 'tpa_hospital' },
  { id: 'p_family_physician_contact', label: 'Physician Contact', type: 'number', required: false, section: 'tpa_hospital' },
  { id: 'p_address', label: 'Current Address', type: 'textarea', required: true, section: 'tpa_hospital' },
  { id: 'p_occupation', label: 'Occupation', type: 'text', required: false, section: 'tpa_hospital' },
  { id: 'dr_name', label: 'Treating Doctor Name', type: 'text', required: true, section: 'medical' },
  { id: 'dr_contact', label: 'Doctor Contact', type: 'number', required: true, section: 'medical' },
  { id: 'm_illness', label: 'Nature of Illness/Disease', type: 'textarea', required: true, section: 'medical' },
  { id: 'm_clinical_findings', label: 'Relevant Clinical Findings', type: 'textarea', required: false, section: 'medical' },
  { id: 'm_current_vitals', label: 'Current Vitals (BP, Temp, Pulse)', type: 'textarea', required: false, section: 'medical' },
  { id: 'm_weight_kg', label: 'Patient Weight (kg)', type: 'number', required: false, section: 'medical' },
  { id: 'm_height_cm', label: 'Patient Height (cm)', type: 'number', required: false, section: 'medical' },
  { id: 'm_duration', label: 'Duration of ailment (Days)', type: 'number', required: false, section: 'medical' },
  { id: 'm_first_cons_date', label: 'Date of First Consultation', type: 'date', required: false, section: 'medical' },
  { id: 'm_prev_hosp', label: 'Previous Hospitalization?', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_prev_hosp_details', label: 'Previous Hospitalization Details', type: 'textarea', required: false, section: 'medical' },
  { id: 'm_prov_diag', label: 'Provisional Diagnosis', type: 'textarea', required: true, section: 'medical' },
  { id: 'm_icd_code', label: 'ICD 10 Code', type: 'text', required: true, section: 'medical' },
  { id: 'm_treatment_type', label: 'Line of Treatment', type: 'select', options: ['Medical Management', 'Surgical Management', 'Intensive care', 'Investigation'], required: true, section: 'medical' },
  { id: 'm_surgery_name', label: 'Name of Surgery', type: 'text', required: false, section: 'medical' },
  { id: 'm_is_rta', label: 'Is it RTA?', type: 'radio', options: ['Yes', 'No'], required: true, section: 'medical' },
  { id: 'm_rta_date', label: 'Date of Injury', type: 'date', required: false, section: 'medical' },
  { id: 'm_fir_no', label: 'FIR No', type: 'textarea', required: false, section: 'medical' },
  { id: 'm_rta_police', label: 'Reported to Police?', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_substance_cause', label: 'Injury/Disease caused due to substance', type: 'textarea', required: false, section: 'medical' },
  { id: 'm_abuse_alcohol', label: 'Abuse/ alcohol consumption', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_test_conducted', label: 'Test conducted to establish this', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_history', label: 'Mandatory Past History of Chronic Illness', type: 'radio', options: ['Yes', 'No'], required: true, section: 'medical' },
  { id: 'm_chronic_diabetes_status', label: 'Diabetes', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_diabetes_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_heart_disease_status', label: 'Heart disease', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_heart_disease_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_hypertension_status', label: 'Hypertension', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_hypertension_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_hyperlipidemias_status', label: 'Hyperlipidemias', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_hyperlipidemias_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_osteoarthritis_status', label: 'Osteoarthritis', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_osteoarthritis_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_asthma_copd_status', label: 'Asthma/COPD/Bronchitis', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_asthma_copd_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_cancer_status', label: 'Cancer', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_cancer_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_alcohol_abuse_status', label: 'Alcohol/Drug abuse', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_alcohol_abuse_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_hiv_std_status', label: 'Any HIV/or STD Related ailment', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_hiv_std_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_stroke_status', label: 'Cerebrovascular Accident (Stroke)', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_stroke_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_liver_disease_status', label: 'Liver Disease', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_liver_disease_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_kidney_disease_status', label: 'Kidney Disease', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_kidney_disease_since', label: 'Since', type: 'text', placeholder: 'MM-YY', required: false, section: 'medical' },
  { id: 'm_chronic_other_status', label: 'Any other ailment', type: 'radio', options: ['Yes', 'No'], required: false, section: 'medical' },
  { id: 'm_chronic_other_details', label: 'Give details', type: 'textarea', required: false, section: 'medical' },
  { id: 'adm_date', label: 'Date of Admission', type: 'date', required: true, section: 'admission' },
  { id: 'adm_time', label: 'Time of Admission', type: 'text', required: false, section: 'admission', placeholder: 'HH:MM' },
  { id: 'adm_exp_discharge', label: 'Expected Discharge Date', type: 'date', required: true, section: 'admission' },
  { id: 'adm_stay_days', label: 'Expected Stay (Days)', type: 'number', required: true, section: 'admission' },
  { id: 'm_surgery_grade', label: 'Level/Grade of Surgery', type: 'text', required: false, section: 'admission' },
  { id: 'adm_room_type', label: 'Room Type', type: 'select', options: ['Executive', 'Suite Room', 'Deluex Room', 'Single AC Room', 'Single Room - Non AC', 'Triple Sharing', 'Twin Sharing', 'Multi Sharing', 'General Ward', 'Day Care'], required: true, section: 'admission' },
  { id: 'cost_room_rent', label: 'Per day room rent+ Nursing and Service charges + patients diet', type: 'number', required: false, section: 'admission' },
  { id: 'cost_investigation', label: 'Expected cost of investigation + diagnostic', type: 'number', required: false, section: 'admission' },
  { id: 'cost_icu', label: 'ICU Charges', type: 'number', required: false, section: 'admission' },
  { id: 'cost_ot', label: 'OT Charges', type: 'number', required: false, section: 'admission' },
  { id: 'cost_prof_fees', label: 'Professional fees surgeon + Anaesthetist fees + consultation charges', type: 'number', required: false, section: 'admission' },
  { id: 'cost_medicines', label: 'Medicines+ consumables + cost of Implants', type: 'number', required: false, section: 'admission' },
  { id: 'cost_other', label: 'Other Hospital expenses if any', type: 'number', required: false, section: 'admission' },
  { id: 'cost_package', label: 'All Inclusive package charges if any applicable', type: 'number', required: false, section: 'admission' },
  { id: 'adm_total_cost', label: 'Sum Total Expected Cost', type: 'number', required: true, section: 'admission' },
  
  // NEW FIELDS FOR DISCHARGE AND SETTLEMENT
  { id: 'dis_pkg_exp', label: 'Package Expenses', type: 'number', required: false, section: 'stage_process' },
  { id: 'dis_room_rent', label: 'Room Rent Expenses', type: 'number', required: false, section: 'stage_process' },
  { id: 'dis_prof_exp', label: 'Professional Expenses', type: 'number', required: false, section: 'stage_process' },
  { id: 'dis_pharm_exp', label: 'Pharmacy Expenses', type: 'number', required: false, section: 'stage_process' },
  { id: 'dis_inv_exp', label: 'Other Investigation Expenses', type: 'number', required: false, section: 'stage_process' },
  { id: 'dis_diag_other', label: 'Diagnostics Other Amt', type: 'number', required: false, section: 'stage_process' },
  
  { id: 'pre_auth_app_amt', label: 'Initial Approved Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'pre_auth_app_comment', label: 'Initial Approval Comment', type: 'textarea', required: false, section: 'stage_process' },
  { id: 'query_text', label: 'Query Comment', type: 'textarea', required: true, section: 'stage_process' },
  { id: 'pre_auth_rej_comment', label: 'Rejection Comment', type: 'textarea', required: true, section: 'stage_process' },
  { id: 'enh_amt_req', label: 'Enhancement Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'enh_comment', label: 'Enhancement Comment', type: 'textarea', required: false, section: 'stage_process' },
  { id: 'enh_app_amt', label: 'Enhancement Approved Amount', type: 'number', required: true, section: 'stage_process' },
  { id: 'enh_rej_comment', label: 'Enhancement Rejection Comment', type: 'textarea', required: true, section: 'stage_process' },
  { id: 'reopen_reason', label: 'Reason of Reopen case', type: 'textarea', required: true, section: 'stage_process' },
  { id: 'dis_date', label: 'Discharge Date', type: 'date', required: true, section: 'stage_process' },
  { id: 'dis_total_bill', label: 'Total Bill Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'dis_query_comment', label: 'Discharge Query Comment', type: 'textarea', required: true, section: 'stage_process' },
  { id: 'dis_rej_comment', label: 'Discharge Rejection Comment', type: 'textarea', required: true, section: 'stage_process' },
  
  // APPROVAL BREAKDOWN FIELDS
  { id: 'fin_app_amt', label: 'Final Approval Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'approved_amt', label: 'Approved Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'fin_mou_disc', label: 'MOU Discount', type: 'number', required: false, section: 'stage_process' },
  { id: 'fin_copay', label: 'Co-Payment', type: 'number', required: false, section: 'stage_process' },
  { id: 'fin_non_med', label: 'Non-Medical Expenses', type: 'number', required: false, section: 'stage_process' },
  { id: 'fin_prop_exp', label: 'Proportionate Expenses', type: 'number', required: false, section: 'stage_process' },
  { id: 'fin_sub_limit', label: 'Sub-Limit', type: 'number', required: false, section: 'stage_process' },
  { id: 'fin_tariff_ded', label: 'Tariff Deductions', type: 'number', required: false, section: 'stage_process' },
  { id: 'fin_other_ded', label: 'Other Deductions', type: 'number', required: false, section: 'stage_process' },
  { id: 'deduction_comment', label: 'Deduction Remarks', type: 'textarea', required: false, section: 'stage_process' },
  
  { id: 'fin_total_amt', label: 'Total Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'fin_patient_paid', label: 'Paid by Patient Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'courier_name', label: 'Courier Company Name', type: 'text', required: true, section: 'stage_process' },
  { id: 'tracking_no', label: 'Tracking Number', type: 'text', required: true, section: 'stage_process' },
  
  // BANKING FIELDS
  { id: 'bank_amt_rec', label: 'Amt Received in Account', type: 'number', required: true, section: 'stage_process' },
  { id: 'bank_fund_status', label: 'Mark Status', type: 'select', options: ['Fund Received', 'Partially Fund Received', 'Fund Not received'], required: true, section: 'stage_process' },
  
  { id: 'set_net_settled', label: 'Net Settled (Calc)', type: 'number', required: true, section: 'stage_process' },
  { id: 'set_tds', label: 'TDS (10%)', type: 'number', required: true, section: 'stage_process' },
  { id: 'set_incl_tds', label: 'Total Settled Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'set_partial_amt', label: 'Partially Settled Amt', type: 'number', required: true, section: 'stage_process' },
  { id: 'comment', label: 'Comment', type: 'textarea', required: false, section: 'stage_process' },
];

const INITIAL_STAGES: ClaimStage[] = [
  { 
    id: '1', 
    name: 'Pre auth & Enhancement', 
    key: 'pre-auth', 
    description: 'Authorization & Enhancement requests.', 
    icon: 'FileSearch', 
    statuses: [
        ClaimStatus.NEW_REGISTRATION,
        ClaimStatus.WELCOME_CALL_DONE,
        ClaimStatus.FILE_PICKUP_SCHEDULED,
        ClaimStatus.FILE_PICKUP_IN_PROGRESS,
        ClaimStatus.FILE_PICKED_UP_DONE,
        ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
        ClaimStatus.HOSPITAL_QUERY_PENDING,
        ClaimStatus.INTERNAL_QUERY_PENDING,
        ClaimStatus.MEDICALLY_FILE_APPROVED,
        ClaimStatus.QUERY_DOCUMENTS_RECEIVED,
        ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
        ClaimStatus.CLAIM_PENDING_WITH_INSURER_MEDICAL,
        ClaimStatus.PRE_AUTH_INITIATED, 
        ClaimStatus.PENDING_MEDICAL_REVIEW,
        ClaimStatus.PENDING_MEDICAL_TEAM,
        ClaimStatus.MEDICAL_QUERY_RAISED,
        ClaimStatus.MEDICAL_QUERY_REPLIED,
        ClaimStatus.QUERY_REPLY_DONE, 
        ClaimStatus.ENHANCEMENT,
        ClaimStatus.PRE_AUTH_APPROVED, 
        ClaimStatus.ENHANCEMENT_APPROVED, 
        ClaimStatus.ENHANCEMENT_REJECTED,
        ClaimStatus.INITIAL_QUERY_PENDING,
        ClaimStatus.PRE_AUTH_REJECTED,
        ClaimStatus.DRAFT
    ], 
    mappedFieldIds: ['pre_auth_app_amt', 'pre_auth_app_comment', 'query_text', 'enh_amt_req', 'enh_comment', 'enh_app_amt'] 
  },
  { 
    id: '3', 
    name: 'Discharge', 
    key: 'discharge', 
    description: 'Final bill submission.', 
    icon: 'Hospital', 
    statuses: [
      ClaimStatus.DISCHARGE_INITIATED, 
      ClaimStatus.DISCHARGE_APPROVED,
      ClaimStatus.DISCHARGE_QUERY_RAISED, 
      ClaimStatus.DISCHARGE_QUERY_REPLY, 
      ClaimStatus.DISCHARGE_REJECTED, 
      ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED, 
      ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED
    ], 
    mappedFieldIds: ['dis_total_bill', 'fin_app_amt', 'fin_mou_disc', 'fin_copay', 'fin_non_med', 'fin_prop_exp', 'fin_sub_limit', 'fin_tariff_ded', 'fin_other_ded'] 
  },
  { 
    id: '4', 
    name: 'Settlement', 
    key: 'settlement', 
    description: 'Payment tracking.', 
    icon: 'Banknote', 
    statuses: [
      ClaimStatus.FILE_DISPATCH_PENDING, 
      ClaimStatus.FILE_DISPATCHED, 
      ClaimStatus.CLAIM_UNDER_PROCESS, 
      ClaimStatus.CLAIM_UNDER_QUERY, 
      ClaimStatus.CLAIM_QUERY_RESOLVED, 
      ClaimStatus.CLAIM_APPROVED, 
      ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE, 
      ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE, 
      ClaimStatus.COMPLETE_SETTLEMENT, 
      ClaimStatus.ACCOUNT_RECONCILIATION, 
      ClaimStatus.SETTLEMENT_FAILED, 
      ClaimStatus.BANK_RECONCILIATION_COMPLETED
    ], 
    mappedFieldIds: ['bank_amt_rec', 'bank_fund_status', 'set_incl_tds', 'set_net_settled', 'set_tds', 'set_partial_amt'] 
  },
];

const INITIAL_ROLES: Role[] = [
  { 
    id: '1', 
    name: 'Super Admin', 
    description: 'Full system access with all management privileges.', 
    permissions: ['all'], 
    canCreateRoles: ['Super Admin', 'Admin', 'Operations Team', 'Recovery Team', 'Finance Team', 'Legal Team', 'Management', 'Hospital', 'Reconciliation', 'CRM Team', 'Medical Team', 'Hospital Cashless Desk', 'Hospital Accounts'],
    allowedReports: ['Business', 'Admission', 'Discharge', 'Outstanding', 'TAT', 'File Dispatch Pending'],
    users: 1,
    status: 'Active'
  },
  {
    id: '2',
    name: 'Admin',
    description: 'System administrator with broad management access.',
    permissions: [
      'sidebar_hospital:sections:group',
      'sidebar_hospital:sections:overview',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'claims:claims_list:edit',
      'sidebar_admin:sections:group',
      'sidebar_admin:sections:hospital',
      'sidebar_admin:sections:users',
      'sidebar_admin:sections:system',
      'nav_features:actions:view',
      'nav_features:actions:profile',
      'nav_features:actions:search',
      'nav_features:actions:notifications',
      'nav_features:actions:profile',
      'stage_access:phases:pre-auth',
      'stage_access:phases:discharge',
      'stage_access:phases:settlement'
    ],
    canCreateRoles: ['Admin', 'Operations Team', 'Recovery Team', 'Finance Team', 'Legal Team', 'Management', 'Hospital', 'Reconciliation', 'CRM Team', 'Medical Team', 'Hospital Cashless Desk', 'Hospital Accounts'],
    allowedReports: ['Business', 'Admission', 'Discharge', 'Outstanding', 'TAT', 'File Dispatch Pending'],
    users: 0,
    status: 'Active'
  },
  {
    id: '8',
    name: 'CRM Team',
    description: 'CRM role for handling failed submissions and manual portal entries.',
    permissions: [
      'sidebar_ops:sections:group',
      'sidebar_ops:sections:crm',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'claims:claims_list:edit',
      'nav_features:actions:view'
    ],
    users: 1,
    status: 'Active'
  },
  {
    id: '9',
    name: 'Recovery Team',
    description: 'Role for managing claims from File Dispatched to final settlement and tracking recoveries.',
    permissions: [
      'sidebar_ops:sections:group',
      'sidebar_ops:sections:recon',
      'functional_access:recovery:view',
      'functional_access:recovery:manage',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'sidebar_admin:sections:group',
      'sidebar_admin:sections:analytics',
      'nav_features:actions:view',
      'nav_features:actions:profile'
    ],
    users: 1,
    status: 'Active'
  },
  {
    id: '20',
    name: 'Finance Team',
    description: 'Financial role for system-wide billing, wallet management and reconciliation.',
    permissions: [
      'sidebar_hospital:sections:group',
      'sidebar_hospital:sections:overview',
      'functional_access:financial:view',
      'functional_access:financial:manage',
      'sidebar_admin:sections:group',
      'sidebar_admin:sections:hospital',
      'claims:claims_list:view',
      'nav_features:actions:view'
    ],
    users: 0,
    status: 'Active'
  },
  {
    id: '21',
    name: 'Legal Team',
    description: 'Role for managing legal cases and compliance oversight.',
    permissions: [
      'sidebar_ops:sections:group',
      'sidebar_ops:sections:legal',
      'functional_access:legal:view',
      'functional_access:legal:create',
      'functional_access:legal:edit',
      'functional_access:legal:delete',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'nav_features:actions:view'
    ],
    users: 0,
    status: 'Active'
  },
  {
    id: '22',
    name: 'Operations Team',
    description: 'General operations role for claim processing and workflow management.',
    permissions: [
      'sidebar_ops:sections:group',
      'sidebar_ops:sections:crm',
      'sidebar_ops:sections:audit',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'claims:claims_list:edit',
      'nav_features:actions:view',
      'nav_features:actions:profile'
    ],
    users: 0,
    status: 'Active'
  },
  {
    id: '23',
    name: 'Management',
    description: 'Executive role with read-only access to all dashboards and analytics.',
    permissions: [
      'sidebar_hospital:sections:group',
      'sidebar_hospital:sections:overview',
      'sidebar_hospital:sections:cashless',
      'sidebar_hospital:sections:mis',
      'sidebar_reimbursement:sections:group',
      'sidebar_sales:sections:group',
      'sidebar_sales:sections:dashboard',
      'sidebar_ops:sections:group',
      'sidebar_ops:sections:crm',
      'sidebar_ops:sections:recon',
      'sidebar_ops:sections:medical',
      'sidebar_ops:sections:audit',
      'sidebar_ops:sections:legal',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'sidebar_admin:sections:group',
      'sidebar_admin:sections:analytics',
      'nav_features:actions:view',
      'nav_features:actions:profile'
    ],
    users: 0,
    status: 'Active'
  },
  {
    id: '10',
    name: 'Medical Team',
    description: 'Medical Underwriting role for detailed medical scrutiny of claims.',
    permissions: [
      'sidebar_ops:sections:group',
      'sidebar_ops:sections:medical',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'claims:claims_list:edit',
      'nav_features:actions:view'
    ],
    users: 1,
    status: 'Active'
  },
  {
    id: '11',
    name: 'Policy Audit Team',
    description: 'Role for managing Policy Audit Team analysis and Operations extractions.',
    permissions: [
      'sidebar_ops:sections:group',
      'sidebar_ops:sections:audit',
      'sidebar_hospital:sections:group',
      'sidebar_hospital:sections:overview',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'claims:claims_list:edit',
      'nav_features:actions:view'
    ],
    products: [],
    users: 1,
    status: 'Active'
  },
  {
    id: '17',
    name: 'Hospital',
    description: 'Full administrative access for a single hospital unit.',
    permissions: [
      'sidebar_hospital:sections:group',
      'sidebar_hospital:sections:overview',
      'sidebar_hospital:sections:cashless',
      'sidebar_hospital:sections:directory',
      'sidebar_hospital:sections:mis',
      'sidebar_hospital:sections:patient_dashboard',
      'claims:claims_list:view',
      'claims:claims_list:edit',
      'sidebar_admin:sections:group',
      'sidebar_admin:sections:hospital',
      'nav_features:actions:view',
      'nav_features:actions:profile',
      'stage_access:phases:pre-auth',
      'stage_access:phases:discharge',
      'stage_access:phases:settlement'
    ],
    canCreateRoles: ['Hospital', 'Hospital Cashless Desk', 'Hospital Accounts'],
    users: 0,
    status: 'Active'
  },
  {
    id: '18',
    name: 'Hospital Cashless Desk',
    description: 'Operational role for managing cashless admissions and pre-auth.',
    permissions: [
      'sidebar_hospital:sections:group',
      'sidebar_hospital:sections:cashless',
      'sidebar_hospital:sections:patient_dashboard',
      'nav_features:actions:view',
      'nav_features:actions:profile',
      'stage_access:phases:pre-auth',
      'stage_access:phases:discharge',
      'stage_access:phases:settlement'
    ],
    users: 0,
    status: 'Active'
  },
  {
    id: '19',
    name: 'Hospital Accounts',
    description: 'Financial role for hospital billing and reconciliation.',
    permissions: [
      'sidebar_hospital:sections:group',
      'sidebar_hospital:sections:mis',
      'sidebar_hospital:sections:patient_dashboard',
      'sidebar_ops:sections:group',
      'sidebar_ops:sections:recon',
      'sidebar_hospital:sections:directory',
      'claims:claims_list:view',
      'nav_features:actions:view'
    ],
    users: 0,
    status: 'Active'
  }
];

const STAFF_ROLES = [
  'Super Admin', 'Admin', 'Operations Team', 'Recovery Team', 'Finance Team', 'Legal Team', 'Management',
  'Claims Processing Executive', 'Reconciliation Team', 'Medical Officer',
  'Manager', 'Operations Head', 'Sales Head', 'Hospital', 'Hospital Cashless Desk', 'Hospital Accounts', 'Operations', 'Sales'
];

const GlobalSearch = ({ 
  claims, 
  userProducts, 
  currentUser, 
  visibleHospitals 
}: { 
  claims: Claim[], 
  userProducts: Product[], 
  currentUser: HospitalUser, 
  visibleHospitals: any[] 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Claim[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'Case ID' | 'Claim No' | 'Patient Name' | 'UHID' | 'Policy No' | 'UTR No'>('Patient Name');
  const [selectedProduct, setSelectedProduct] = useState<Product | ''>('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const prefixMap: { [key in Product]?: string } = {
    [Product.CPC]: "CPC",
    [Product.BG_DESK]: "DESK",
    [Product.PARTNER_PROCESSING]: "PP",
    [Product.ICA]: "HN",
    [Product.PRE_POST]: "HN",
    [Product.RECOVERY_RECONCILIATION]: "RNR",
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  useEffect(() => {
    if (searchFilter === 'Case ID' && userProducts.length > 0 && !selectedProduct) {
      setSelectedProduct(userProducts[0]);
    }
  }, [searchFilter, userProducts, selectedProduct]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [results]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Auto-prefix logic for Case ID
    if (searchFilter === 'Case ID' && selectedProduct) {
      const prefix = prefixMap[selectedProduct as Product] + "-";
      
      // FIX: Validation - Only allow numbers after the hyphen
      if (val.startsWith(prefix)) {
        const afterHyphen = val.substring(prefix.length);
        const numericOnly = afterHyphen.replace(/[^0-9]/g, '');
        val = prefix + numericOnly;
      } else {
        // If the user tries to delete the prefix, or type something that doesn't start with it
        if (prefix.startsWith(val)) {
          val = prefix;
        } else {
          // If they typed something else, prepend prefix and keep only digits from the rest
          const rawValue = val.replace(prefixMap[selectedProduct as Product] || '', '').replace('-', '');
          const numericOnly = rawValue.replace(/[^0-9]/g, '');
          val = prefix + numericOnly;
        }
      }
    }

    setQuery(val);
    if (val.length > 1) { // Reduced from 2 to allow searching for shorter numbers in Case ID
      const baseFiltered = claims.filter(c => {
        const roleUpper = currentUser?.role?.toUpperCase();
        const isSuperAdmin = roleUpper === 'SUPER ADMIN';
        
        if (!isSuperAdmin) {
          // 1. HOSPITAL ISOLATION: Must belong to one of the user's assigned/allowed hospitals
          const assignedIds = currentUser?.assignedHospitalIds || [];
          const visibleHospIds = visibleHospitals?.map(h => h.id) || [];
          const myScopeId = currentUser ? (currentUser.hospitalId || currentUser.parentHospitalId || currentUser.id) : '';
          
          const allowedHospitalIds = [
            ...assignedIds,
            ...visibleHospIds,
            myScopeId
          ].filter(id => !!id);
          
          const claimHospId = c.formData?.hospitalId || c.hospitalId || '';
          if (!claimHospId || !allowedHospitalIds.includes(claimHospId)) {
            return false;
          }

          // 2. PRODUCT ISOLATION: Must belong to one of the user's assigned products
          const assignedProducts = currentUser?.products || userProducts || [];
          if (assignedProducts.length > 0) {
            const claimProduct = c.product;
            if (!claimProduct) {
              const matchesDefault = assignedProducts.includes(Product.CPC) || assignedProducts.includes(Product.BG_DESK);
              if (!matchesDefault) return false;
            } else {
              if (!assignedProducts.includes(claimProduct) && !(claimProduct === Product.KYP && assignedProducts.includes(Product.KYP))) {
                return false;
              }
            }
          }
        }
        return true;
      });

      const filtered = baseFiltered.filter(c => {
        const searchTerm = val.toLowerCase();
        
        switch (searchFilter) {
          case 'Patient Name':
            return c.patientName.toLowerCase().includes(searchTerm);
          case 'Case ID':
            return (c.caseReferenceId || c.claimNumber || '').toLowerCase().includes(searchTerm);
          case 'Claim No':
            return (c.formData?.insurer_claim_no || c.claimNumber || '').toLowerCase().includes(searchTerm);
          case 'UHID':
            return (c.formData?.p_uhid || '').toLowerCase().includes(searchTerm);
          case 'Policy No':
            return (c.policyNumber || '').toLowerCase().includes(searchTerm);
          case 'UTR No':
            return (c.formData?.utr_no || '').toLowerCase().includes(searchTerm);
          default:
            return false;
        }
      }).slice(0, 5);
      
      setResults(filtered);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (claimId: string) => {
    setQuery('');
    setIsOpen(false);
    navigate(`/process-claim/${claimId}`);
  };

  const triggerSearchSubmit = () => {
    if (results.length > 0) {
      const targetIdx = focusedIndex >= 0 && focusedIndex < results.length ? focusedIndex : 0;
      handleSelect(results[targetIdx].id);
    }
  };

  return (
    <div className="relative group w-full lg:w-auto" ref={wrapperRef}>
      <div className="flex items-center bg-white border border-slate-300 rounded-full px-4 py-2 w-full lg:w-[450px] shadow-sm focus-within:ring-2 focus-within:ring-slate-400/20 transition-all">
        <div className="flex items-center relative gap-1">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 focus:outline-none bg-transparent hover:bg-slate-50 px-2 py-1 rounded-full transition-all text-[#1e3f86] text-sm font-bold cursor-pointer select-none"
          >
            <span className="truncate">{searchFilter}</span>
            <ChevronDown size={14} className="text-[#1f3b79]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-[calc(100%+10px)] left-0 min-w-[140px] bg-white border border-slate-400 rounded-lg shadow-2xl z-50 py-0.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {(['Case ID', 'Claim No', 'Patient Name', 'UHID', 'Policy No', 'UTR No'] as const).map((filter) => {
                const isSelected = searchFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setSearchFilter(filter);
                      setIsDropdownOpen(false);
                      if (filter === 'Case ID') {
                        const initialProd = selectedProduct || userProducts[0] || '';
                        if (initialProd) {
                          setQuery(prefixMap[initialProd as Product] + "-");
                        } else {
                          setQuery('');
                        }
                      } else {
                        setQuery('');
                      }
                    }}
                    className={`text-center w-full py-2.5 px-4 text-xs font-bold transition-all duration-150 block cursor-pointer select-none ${
                      isSelected
                        ? "bg-green-600 text-white font-black hover:bg-green-700"
                        : "text-[#1e3f86] hover:bg-[#000080] hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          )}
          
          {searchFilter === 'Case ID' && userProducts.length > 0 && (
            <select
              value={selectedProduct}
              onChange={(e) => {
                const newProd = e.target.value as Product;
                setSelectedProduct(newProd);
                setQuery(prefixMap[newProd] + "-");
              }}
              className="bg-white rounded-lg text-[9px] font-black uppercase px-2 py-0.5 ml-2 border border-slate-200 outline-none text-blue-900 shadow-sm"
            >
              {userProducts.map(p => (
                prefixMap[p] && <option key={p} value={p}>{prefixMap[p]}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-1 ml-4 mr-2">
          <input 
            type="text" 
            placeholder={`Search using ${searchFilter}`} 
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
            value={query}
            onChange={handleSearch}
            onFocus={() => query.length > 1 && setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(prev => Math.min(prev + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(prev => Math.max(prev - 1, -1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                triggerSearchSubmit();
              }
            }}
          />
        </div>

        <div className="h-5 border-l border-slate-300 mx-1" />
        
        <button 
          type="button"
          onClick={triggerSearchSubmit}
          className="pl-2 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform focus:outline-none"
        >
          <Search className="text-blue-600 cursor-pointer" size={20} />
        </button>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-full lg:w-96 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
          <div className="py-2">
            <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100 mb-1">Search Results</p>
            {results.map((result, index) => {
              const isSelected = index === focusedIndex;
              return (
                <div 
                  key={result.id}
                  onClick={() => handleSelect(result.id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full text-left px-4 py-3 transition-colors border-b border-slate-50 last:border-0 flex items-center gap-3 group/item cursor-pointer
                    ${isSelected 
                      ? "bg-green-600 text-white" 
                      : "bg-white text-slate-800 hover:bg-[#000080]"
                    }
                  `}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-150
                    ${isSelected 
                      ? "bg-white text-green-700 shadow" 
                      : "bg-blue-50 text-blue-600 group-hover/item:bg-[#000080]/30 group-hover/item:text-white"
                    }
                  `}>
                    {result.patientName.charAt(0)}
                  </div>
                  <div className="overflow-hidden flex-grow">
                    <p className={`text-xs font-bold truncate transition-colors duration-150
                      ${isSelected ? "text-white" : "text-slate-800 group-hover/item:text-white"}
                    `}>{result.patientName}</p>
                    <div className="flex items-center gap-2 text-[9px] font-medium transition-colors duration-150">
                      <span className={`px-1.5 py-0.5 rounded truncate transition-colors duration-150
                        ${isSelected ? "bg-green-700/50 text-green-100" : "bg-slate-100 text-slate-600 group-hover/item:bg-[#1e3f86] group-hover/item:text-blue-100"}
                      `}>{result.id}</span>
                      <span className={`truncate transition-colors duration-150
                        ${isSelected ? "text-green-200" : "text-slate-500 group-hover/item:text-blue-200"}
                      `}>{result.formData?.p_uhid || 'No UHID'}</span>
                    </div>
                  </div>
                  <div className="ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setQuery('');
                         setIsOpen(false);
                         navigate(`/process-claim/${result.id}?source=cashless`);
                       }}
                       className={`p-2 rounded-lg transition-all shadow-sm
                         ${isSelected
                           ? "bg-green-700 text-white hover:bg-green-800"
                           : "bg-blue-50 text-blue-600 hover:bg-blue-100 group-hover/item:bg-white/20 group-hover/item:text-white"
                         }
                       `}
                       title="View Patient Dashboard"
                     >
                       <User size={14} />
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {isOpen && query.length > 1 && results.length === 0 && (
         <div className="absolute top-full left-0 mt-2 w-full lg:w-96 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 text-center">
            <p className="text-xs font-bold text-slate-400">No records found.</p>
         </div>
      )}
    </div>
  );
};

const FlashNotification = ({ notification, onClose }: { notification: any, onClose: () => void }) => {
  const [liked, setLiked] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!liked && !isClosing && notification?.type !== 'welcome') {
      const timer = setTimeout(() => {
         setIsClosing(true);
         setTimeout(onClose, 500); 
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose, liked, isClosing]);

  if (!notification) return null;

  const handleLike = () => {
     setLiked(true);
     setTimeout(() => {
        setIsClosing(true);
        setTimeout(onClose, 500);
     }, 2000);
  };

  const handleManualClose = () => {
     setIsClosing(true);
     setTimeout(onClose, 300);
  };

  if (notification.type === 'welcome') {
      return (
         <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-all duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
             <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-sm" onClick={handleManualClose}></div>

             <div className={`relative max-w-md w-full transform transition-all duration-500 ${isClosing ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'}`}>
                <div className="bg-gradient-to-br from-[#000080] to-blue-600 text-white p-1 rounded-3xl shadow-2xl shadow-blue-900/40">
                   <div className="bg-blue-900/40 backdrop-blur-xl rounded-[1.3rem] p-8 border border-white/10 relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>
                      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>

                      {liked ? (
                         <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-red-500/20">
                               <Heart className="text-red-400 fill-red-400 animate-pulse" size={40} />
                            </div>
                            <p className="text-2xl font-black text-center leading-tight">Glad to hear it!</p>
                            <p className="text-sm font-medium text-blue-200 text-center">Have a productive session.</p>
                         </div>
                      ) : (
                         <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="flex justify-end w-full absolute -top-2 -right-2">
                               <button onClick={handleManualClose} className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
                                  <X size={20} />
                               </button>
                            </div>
                            
                            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-yellow-300 shadow-inner mb-6 ring-4 ring-white/5">
                               <Sparkles size={32} fill="currentColor" />
                            </div>
                            
                            <div className="space-y-2 mb-8">
                               <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">{notification.title}</p>
                               <p className="text-2xl font-bold leading-tight">{notification.message}</p>
                            </div>

                            <div className="w-full space-y-4">
                               <button 
                                  onClick={handleLike}
                                  className="w-full bg-white text-[#000080] py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-50 active:scale-95 transition-all shadow-xl hover:shadow-2xl"
                               >
                                  <ThumbsUp size={20} /> Let's Go!
                               </button>
                               <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-300/50 w-full animate-[shrink_6s_linear_forwards] origin-left"></div>
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                </div>
             </div>
         </div>
      );
  }

  return (
    <div className={`fixed bottom-10 right-10 z-[100] bg-white text-slate-800 p-5 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] flex items-center space-x-4 max-w-sm border border-slate-100 transition-all duration-300 ${isClosing ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
       <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-200">
         <Zap size={24} fill="currentColor" />
       </div>
       <div className="flex-1 min-w-0">
         <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Status Updated</p>
         <p className="text-sm font-bold leading-tight truncate">{notification.patientName} → {notification.status}</p>
       </div>
       <button onClick={handleManualClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"><X size={18} /></button>
    </div>
  );
};const getEnergeticGreeting = (displayName: string) => {
  const hour = new Date().getHours();
  if (hour < 5) return { title: "Working late? 🌙", msg: `You're unstoppable, ${displayName}! Keep crushing it.` };
  if (hour < 12) return { title: "Good Morning! ☀️", msg: `Rise and shine, ${displayName}! Let's make today amazing.` };
  if (hour < 17) return { title: "Good Afternoon! 🚀", msg: `Keep the momentum going, ${displayName}! You're doing great.` };
  if (hour < 22) return { title: "Good Evening! 🌟", msg: `Finishing strong, ${displayName}! Great work today.` };
  return { title: "Hello Night Owl! 🦉", msg: `Your dedication is inspiring, ${displayName}!` };
};

const getScopeId = (user: HospitalUser) => {
    return user.hospitalId || user.parentHospitalId || user.id;
}

const SEED_INSURERS = [
  "Star Health Insurance Co.Ltd.", "Tata AIG General Insurance Co. Ltd.", "The New India Assurance Co. Ltd",
  "The Oriental Insurance Co. Ltd.", "United India Insurance Co. Ltd.", "National Insurance Co. Ltd.",
  "HDFC ERGO General Insurance Co.Ltd.", "ICICI LOMBARD General Insurance Co. Ltd.", "Mazagon Dock Shipbuilders",
  "Other Insurance company Limited", "Niva Bupa Health Insurance Co Ltd", "Care Health Insurance co Ltd",
  "Acko General Insurance Ltd.", "Aditya Birla Health Insurance Co. Ltd.", "Bajaj General Insurance Co. Ltd",
  "Cholamandalam MS General Insurance Co. Ltd.", "Manipal Cigna Health Insurance Company Limited",
  "Navi General Insurance Ltd.", "Edelweiss General Insurance Co. Ltd.", "Central Generali India Insurance Co. Ltd.",
  "Go Digit General Insurance Ltd", "IFFCO TOKIO General Insurance Co. Ltd.", "Zurick Kotak General Insurance Co. Ltd.",
  "Liberty General Insurance Ltd.", "Magma HDI General Insurance Co. Ltd.", "Raheja QBE General Insurance Co. Ltd.",
  "Ind", "General Insurance Co. Ltd.", "SBI General Insurance Co. Ltd.", "Shriram General Insurance Co. Ltd.",
  "Universal Sompo General Insurance Co. Ltd.", "Zuno General Insurance Co. Ltd.", "Max Life Insurance Co. Ltd.",
  "HDFC Life Insurance Co. Ltd.", "ICICI Prudential Life Insurance Co. Ltd.", "Kotak Mahindra Life Insurance Co. Ltd.",
  "LIC of India", "Reliance Nippon Life Insurance Co. Ltd.", "SBI Life Insurance Co. Ltd."
];

const SEED_TPAS = [
  "Medi Assist", "TPA India", "MD India", "Raksha TPA", "Heritage Health",
  "Family Health Plan (FHPL)", "HealthIndia TPA", "United Health Care Parekh", "Medsave", "Paramount TPA"
];

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [hospitalProfile, setHospitalProfile] = useState<HospitalUser>(() => {
    const defaultProfile = { 
      id: '', username: '', displayName: '', role: 'Hospital', 
      status: 'Active', createdAt: new Date().toISOString(), hospitalName: '',
      firstName: '', lastName: '', employeeCode: '', department: '', joiningDate: '',
      address: '', rohiniId: '', emailId: '', mobileNo: '',
      website: '',
      doctorName: '', doctorMobileNo: '', portalCredentials: [], registrationNo: '', authorizedSignatory: '',
      walletBalance: 0, perCaseCharge: 0,
      state: '', district: '', zone: '',
      invoiceGenerationType: 'Individual',
      entityType: 'User',
      valueAddedServices: {
        hospitalManageEnabled: true,
        medicalScrutinyRequired: true,
        kypEnabled: false,
        rpaEnabled: false,
        aiInsightsEnabled: false,
        digitalAssetsEnabled: false,
        nhcxEnabled: false
      }
    } as HospitalUser;

    try {
      const manualAuth = localStorage.getItem('claimnx_manual_auth');
      if (manualAuth) {
        if (manualAuth === 'raulavhad@gmail.com') {
          return {
            ...defaultProfile,
            id: 'primary-admin',
            username: 'raulavhad@gmail.com',
            role: 'Primary Admin',
            isAdmin: true
          };
        }
        const savedUsers = localStorage.getItem('claimnx_hospital_users');
        if (savedUsers) {
          const users = JSON.parse(savedUsers) as HospitalUser[];
          const found = users.find(u => u.username === manualAuth || u.emailId === manualAuth);
          if (found) return found;
        }
      }
      return defaultProfile;
    } catch (e) {
      return defaultProfile;
    }
  });

  // Business data is loaded from the API/Supabase only. Browser storage is
  // not a fallback for users or claims because it makes records appear saved
  // to one browser while remaining invisible to every other user.
  const [hospitalUsers, setHospitalUsers] = useState<HospitalUser[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [queries, setQueries] = useState<Query[]>([]);
  const [recoveries, setRecoveries] = useState<RecoveryRecord[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>([]);
  const [kypPolicies, setKypPolicies] = useState<KYPPolicy[]>(() => {
    try {
      const saved = localStorage.getItem('claimnx_kyp_policies');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Connector master data is database-owned. Do not seed or restore it from
  // browser storage, otherwise failed requests can make fictitious insurers
  // appear in the portal.
  const [insurers, setInsurers] = useState<InsuranceEntity[]>([]);
  const [tpas, setTpas] = useState<InsuranceEntity[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  // Roles are authorization data and must always come from the backend.
  // Do not restore browser-cached or seeded roles into the directory.
  const [roles, setRoles] = useState<Role[]>([]);
  const [stages, setStages] = useState<ClaimStage[]>(INITIAL_STAGES);
  const [systemConfig, setSystemConfig] = useState({ 
    autoExtract: true, 
    policyAnalysis: true, 
    tatTracking: true, 
    autoFollowUp: false, 
    emailDispatch: true,
    apiConfig: {
      webhookUrl: '',
      apiKey: '',
      externalIntegEnabled: false,
      autoUpdateEnabled: false
    }
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [latestNotification, setLatestNotification] = useState<any>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    // Application initialized
  }, []);
  
  // Auto-refresh logic for Live Claims Tracker
  useEffect(() => {
    let interval: any;
    if (isAuthenticated && isAuthReady && claimnxSessionService.getAccessToken()) {
      interval = setInterval(() => {
        if (window.location.pathname === '/live-tracker') {
          claimsApi.getAll((hospitalProfile.role?.toUpperCase() === 'SUPER ADMIN' || hospitalProfile.role?.toUpperCase() === 'ADMIN') ? undefined : getScopeId(hospitalProfile))
            .then(res => setClaims(res.data))
            .catch(err => console.error("Auto-refresh failed", err));
        }
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated, isAuthReady, hospitalProfile]);

  // Main API Data Sync
  useEffect(() => {
    if (isAuthenticated && isAuthReady && claimnxSessionService.getAccessToken()) {
      const fetchData = async () => {
        try {
          // Validate the JWT-backed session before loading any protected
          // portal resource. This prevents a stale dashboard from rendering
          // after the server revokes a session.
          const authenticatedUser = await authApi.getMe();
          setHospitalProfile((current) => ({
            ...current,
            ...(authenticatedUser?.profileData ?? authenticatedUser?.profile_data ?? {}),
            id: authenticatedUser?.id ?? current.id,
            username: authenticatedUser?.email ?? current.username,
            emailId: authenticatedUser?.email ?? current.emailId,
            displayName: authenticatedUser?.displayName ?? authenticatedUser?.display_name ?? current.displayName,
            role: authenticatedUser?.role ?? current.role,
            roleId: authenticatedUser?.roleId ?? current.roleId,
            hospitalId: authenticatedUser?.hospitalId ?? current.hospitalId,
            mobileNo: authenticatedUser?.mobileNo ?? authenticatedUser?.mobile_no ?? current.mobileNo,
            entityType: authenticatedUser?.entityType ?? authenticatedUser?.entity_type ?? current.entityType,
            permissions: Array.isArray(authenticatedUser?.permissions)
              ? authenticatedUser.permissions
              : [],
          }));

          // Load database-owned insurance master data first. A failure in an
          // unrelated module (such as claim filtering) must not restore the
          // old frontend seed list in the Connectors screen.
          const insurersRes = await configApi.getInsurers();
          setInsurers(insurersRes.data.filter((e: any) => e.type === 'Insurer'));
          setTpas(insurersRes.data.filter((e: any) => e.type === 'TPA'));

          const sessionUser = claimnxSessionService.getSession()?.user as Record<string, unknown> | undefined;
          const sessionRole = String(sessionUser?.role ?? hospitalProfile.role ?? '').trim().toUpperCase();
          const canLoadAdministrationData = [
            'SUPER ADMIN',
            'ADMIN',
            'PRIMARY ADMIN',
          ].includes(sessionRole);

          const isCentralOperationsUser = sessionRole === 'SUPER ADMIN' ||
            sessionRole === 'ADMIN' ||
            sessionRole === 'PRIMARY ADMIN' ||
            !sessionRole.startsWith('HOSPITAL');
          const [claimsRes, fieldsRes] = await Promise.all([
            // Operational users (Medical, CRM, KYP, Finance) need the claim
            // pool before their product/location assignment can be applied.
            // Hospital accounts remain strictly scoped to their own hospital.
            claimsApi.getAll(isCentralOperationsUser ? undefined : getScopeId(hospitalProfile)),
            configApi.getFields()
          ]);
          setClaims(claimsRes.data);

          // /users and /roles are system-administration resources. A normal
          // portal user must not request them during login, because the API
          // correctly rejects that request with 403.
          if (canLoadAdministrationData) {
            const [usersRes, rolesRes] = await Promise.all([
              usersApi.getAll(),
              configApi.getRoles(),
            ]);
            setHospitalUsers(usersRes.data);
            setRoles(rolesRes.data);
          } else {
            setHospitalUsers([]);
            setRoles([]);
          }
          
          setFields(fieldsRes.data);

          // Default stages if not from DB (could also have a stages API)
          setStages([
            { 
              id: '1', 
              name: 'Pre auth & Enhancement', 
              key: 'pre-auth', 
              description: 'Authorization & Enhancement requests.', 
              icon: 'FileSearch', 
              statuses: [
                  ClaimStatus.PRE_AUTH_INITIATED, 
                  ClaimStatus.PENDING_MEDICAL_REVIEW,
                  ClaimStatus.PENDING_MEDICAL_TEAM,
                  ClaimStatus.MEDICAL_QUERY_RAISED,
                  ClaimStatus.MEDICAL_QUERY_REPLIED,
                  ClaimStatus.QUERY_REPLY_DONE, 
                  ClaimStatus.ENHANCEMENT,
                  ClaimStatus.PRE_AUTH_APPROVED, 
                  ClaimStatus.ENHANCEMENT_APPROVED, 
                  ClaimStatus.ENHANCEMENT_REJECTED,
                  ClaimStatus.INITIAL_QUERY_PENDING,
                  ClaimStatus.PRE_AUTH_REJECTED,
                  ClaimStatus.DRAFT
              ], 
              mappedFieldIds: ['pre_auth_app_amt', 'query_text', 'enh_amt_req', 'enh_app_amt'] 
            },
            { 
              id: '3', 
              name: 'Discharge', 
              key: 'discharge', 
              description: 'Final bill submission.', 
              icon: 'Hospital', 
              statuses: [
                ClaimStatus.DISCHARGE_INITIATED, 
                ClaimStatus.DISCHARGE_APPROVED,
                ClaimStatus.DISCHARGE_QUERY_RAISED, 
                ClaimStatus.DISCHARGE_QUERY_REPLY, 
                ClaimStatus.DISCHARGE_REJECTED, 
                ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED, 
                ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED
              ], 
              mappedFieldIds: ['dis_total_bill', 'fin_app_amt'] 
            },
            { 
              id: '4', 
              name: 'Settlement', 
              key: 'settlement', 
              description: 'Payment tracking.', 
              icon: 'Banknote', 
              statuses: [
                ClaimStatus.FILE_DISPATCH_PENDING, 
                ClaimStatus.FILE_DISPATCHED, 
                ClaimStatus.CLAIM_UNDER_PROCESS, 
                ClaimStatus.CLAIM_UNDER_QUERY, 
                ClaimStatus.CLAIM_QUERY_RESOLVED, 
                ClaimStatus.CLAIM_APPROVED, 
                ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE, 
                ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE, 
                ClaimStatus.COMPLETE_SETTLEMENT, 
                ClaimStatus.ACCOUNT_RECONCILIATION, 
                ClaimStatus.SETTLEMENT_FAILED, 
                ClaimStatus.BANK_RECONCILIATION_COMPLETED
              ], 
              mappedFieldIds: ['set_incl_tds'] 
            },
          ]);
        } catch (error) {
          console.error("Error fetching data from API:", error);
          toast.error("Failed to refresh data from server");
        }
      };
      fetchData();
    }
  }, [isAuthenticated, isAuthReady, hospitalProfile.hospitalId, hospitalProfile.role]);

  useEffect(() => {
    const handleExpiredSession = () => {
      claimnxSessionService.clear();
      localStorage.removeItem('claimnx_manual_auth');
      setIsAuthenticated(false);
      toast.error('Your session has expired. Please sign in again.');
    };
    window.addEventListener('claimnx:session-expired', handleExpiredSession);
    return () => window.removeEventListener('claimnx:session-expired', handleExpiredSession);
  }, []);

  // Auth Session State
  useEffect(() => {
    // The local key identifies the last user only; a valid API session token
    // is required before rendering the authenticated application shell.
    if (localStorage.getItem('claimnx_manual_auth') && claimnxSessionService.getAccessToken()) {
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('claimnx_manual_auth');
      setIsAuthenticated(false);
    }
    setIsAuthReady(true);
  }, []);

  // Manual session recovery
  useEffect(() => {
    const manualEmail = localStorage.getItem('claimnx_manual_auth');
    if (manualEmail && claimnxSessionService.getAccessToken()) {
      if (hospitalUsers.length > 0) {
        const matchedUser = hospitalUsers.find(u => u.username === manualEmail);
        if (matchedUser) {
          setHospitalProfile(matchedUser);
        }
      } else if (manualEmail === 'raulavhad@gmail.com') {
         // Special case for primary admin if not in hospitalUsers seed yet
         // though it should be.
         setHospitalProfile({
           id: 'primary-admin',
           username: 'raulavhad@gmail.com',
           displayName: 'Raul Avhad',
           hospitalName: 'Apollo Hospitals',
           role: 'Primary Admin',
           hospitalId: 'H1',
           isAdmin: true,
           firebase_uid: 'bypassed-uid',
           status: 'Active',
           createdAt: new Date().toISOString(),
           address: 'Bypassed Session',
           rohiniId: '999999',
           emailId: 'raulavhad@gmail.com',
           mobileNo: '999999999',
           doctorName: 'Dr. Rahul',
           doctorMobileNo: '999999999',
           walletBalance: 0,
           perCaseCharge: 0,
           portalCredentials: []
         });
      }
      setIsAuthReady(true);
    }
  }, [hospitalUsers.length]); // Re-run when hospitalUsers.length arrives but also on mount
  useEffect(() => {
    const rahulEmail = 'raulavhad@gmail.com';
    
    // Fix hospitalProfile if it's Rahul
    if (hospitalProfile.username === rahulEmail || hospitalProfile.emailId === rahulEmail) {
      if (hospitalProfile.displayName !== 'Rahul Avhad' || hospitalProfile.role !== 'Super Admin' || hospitalProfile.entityType !== 'User') {
        setHospitalProfile(prev => ({
          ...prev,
          displayName: 'Rahul Avhad',
          role: 'Super Admin',
          emailId: rahulEmail,
          entityType: 'User'
        }));
      }
    }

    // Fix hospitalUsers list using functional update to avoid loop
    setHospitalUsers(prev => {
      const needsFix = prev.some(u => 
        (u.username === rahulEmail || u.emailId === rahulEmail) && 
        (u.displayName !== 'Rahul Avhad' || u.role !== 'Super Admin' || u.entityType !== 'User')
      );

      if (!needsFix) return prev;

      return prev.map(u => 
        (u.username === rahulEmail || u.emailId === rahulEmail) 
          ? { ...u, displayName: 'Rahul Avhad', role: 'Super Admin', emailId: rahulEmail, entityType: 'User' } 
          : u
      );
    });
  }, [hospitalProfile.username, hospitalProfile.emailId, hospitalProfile.displayName, hospitalProfile.role]);

  const [showProfileModule, setShowProfileModule] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'performance' | 'activity' | 'security' | 'notifications'>('profile');
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevClaimsRef = useRef<Claim[]>(claims);

  const visibleUsersList = useMemo(() => {
    const roleUpper = hospitalProfile.role?.toUpperCase();
    const isCentralClinicalRole = roleUpper?.includes('MEDICAL') || roleUpper?.includes('CLINICAL');
    if (['SUPER ADMIN', 'OPERATIONS', 'SALES', 'RECONCILIATION TEAM', 'MEDICAL UNDERWRITING', 'MEDICAL OFFICER', 'MEDICAL TEAM', 'DOCTOR', 'CONSULTANT', 'POLICY AUDIT TEAM', 'POLICY AUDIT TEAM ROLE', 'CRM TEAM'].includes(roleUpper || '') || isCentralClinicalRole) {
       return hospitalUsers;
    }
    const myScopeId = getScopeId(hospitalProfile);
    
    if (hospitalProfile.role === 'Department Head') {
       return hospitalUsers.filter(u => u.parentHospitalId === hospitalProfile.id || u.id === hospitalProfile.id);
    }
    
    // For standard Hospital/Partner Admin roles, only show users belonging to this scope
    return hospitalUsers.filter(u => u.hospitalId === myScopeId || u.parentHospitalId === myScopeId || u.id === myScopeId);
  }, [hospitalUsers, hospitalProfile]);

  const handleSetHospitalUsers = (updatedOrFn: HospitalUser[] | ((prev: HospitalUser[]) => HospitalUser[])) => {
    setHospitalUsers(prev => {
      let nextList: HospitalUser[];
      if (typeof updatedOrFn === 'function') {
        nextList = (updatedOrFn as any)(prev);
      } else {
        const visibleIds = visibleUsersList.map(u => u.id);
        const updatedIds = updatedOrFn.map(u => u.id);
        const deletedIds = visibleIds.filter(id => !updatedIds.includes(id));
        
        let temp = prev.filter(u => !deletedIds.includes(u.id));
        updatedOrFn.forEach(u => {
          const idx = temp.findIndex(existing => existing.id === u.id);
          if (idx > -1) {
            temp[idx] = u;
          } else {
            temp.unshift(u);
          }
        });
        nextList = temp;
      }
      return nextList;
    });
  };

  const handlePersistUserProfile = async (updatedUser: HospitalUser): Promise<void> => {
    if (!updatedUser.id) {
      throw new Error('Your profile is not linked to a saved user account.');
    }

    const response = await usersApi.update(updatedUser.id, updatedUser);
    const persistedUser = {
      ...updatedUser,
      ...response.data,
      password: undefined,
    } as HospitalUser;

    setHospitalProfile(persistedUser);
    setHospitalUsers((currentUsers) => currentUsers.map((currentUser) =>
      currentUser.id === persistedUser.id
        ? { ...currentUser, ...persistedUser }
        : currentUser,
    ));
  };

  const visibleHospitals = useMemo(() => {
    // Filter to show ONLY Hospitals (exclude Users and Partners)
    const onlyHospitals = visibleUsersList.filter(u => (u.entityType || (u.isAdmin ? 'Hospital' : 'User')) === 'Hospital');
    const normaliseLocation = (value?: string) => String(value || '').trim().toLocaleLowerCase();
    const isInLocationScope = (allowed: string[] | undefined, actual?: string) =>
      !allowed?.length || allowed.some(value => normaliseLocation(value) === normaliseLocation(actual));

    const roleUpper = hospitalProfile.role?.toUpperCase();
    if (roleUpper === 'SUPER ADMIN') return onlyHospitals;
    
    // Location-based access control (Zone, State, District) with multi-selection
    const hasLocationMapping = (hospitalProfile.zones && hospitalProfile.zones.length > 0) || 
                               (hospitalProfile.states && hospitalProfile.states.length > 0) || 
                               (hospitalProfile.districts && hospitalProfile.districts.length > 0);

    const isCentralUser = roleUpper && !roleUpper.startsWith('HOSPITAL') && hospitalProfile.role !== 'Hospital';

    if (hasLocationMapping || isCentralUser || ['Operations', 'Sales', 'Reconciliation Team'].includes(hospitalProfile.role)) {
        return onlyHospitals.filter(h => {
            // First check if user has specific assigned hospital IDs (respect assigned filters)
            const assignedIds = hospitalProfile.assignedHospitalIds || [];
            if (assignedIds.length > 0) {
               return assignedIds.includes(h.id);
            }
            
            // If they have location mapping, filter by location
            if (hasLocationMapping) {
                return isInLocationScope(hospitalProfile.zones, h.zone) &&
                  isInLocationScope(hospitalProfile.states, h.state) &&
                  isInLocationScope(hospitalProfile.districts, h.district);
            }
            
            // For general central users without specific restrictions, allow all
            return true;
        });
    }

    if (hospitalProfile.role === 'Department Head') {
        return onlyHospitals.filter(u => u.parentHospitalId === hospitalProfile.id || u.id === hospitalProfile.id);
    }

    if (hospitalProfile.role === 'Claims Processing Executive') {
        const assignedIds = hospitalProfile.assignedHospitalIds || [];
        return onlyHospitals.filter(h => assignedIds.includes(h.id) || h.id === hospitalProfile.hospitalId);
    }

    const myScopeId = getScopeId(hospitalProfile);
    return onlyHospitals.filter(h => h.id === myScopeId);
  }, [hospitalUsers, hospitalProfile]);

  // Network status monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const wasOffline = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.dismiss('offline-alert');
      if (wasOffline.current) {
        toast.success('Connection Restored', {
          description: 'Synchronizing your offline updates with the server...',
          duration: 5000,
          id: 'online-success',
          icon: <Globe2 size={18} className="text-emerald-500" />
        });
        wasOffline.current = false;
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
      toast.error('Network Connection Lost', {
        description: 'You are now working offline. Changes will be saved locally and updated automatically when you reconnect.',
        duration: Infinity,
        id: 'offline-alert',
        icon: <Globe2 size={18} className="text-rose-500" />
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync system config to localStorage
  useEffect(() => {
    try {
      dualStorageService.safeSetItem('claimnx_config', JSON.stringify(dualStorageService.stripLargeFields(systemConfig)));
      localStorage.setItem('claimnx_auth', isAuthenticated ? 'true' : 'false');
      dualStorageService.safeSetItem('claimnx_hospital', JSON.stringify(dualStorageService.stripLargeFields(hospitalProfile)));
      dualStorageService.safeSetItem('claimnx_roles', JSON.stringify(dualStorageService.stripLargeFields(roles)));
    } catch (e) {
      console.error("Local storage error:", e);
    }
  }, [systemConfig, isAuthenticated, hospitalProfile, roles]);

  // Handle sidebar and dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setShowRoleSwitcher(false); } 
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) { setShowNotifications(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter claims based on user role and assignment (DATA ISOLATION)
  const [roomCategories, setRoomCategories] = useState<string[]>([
    "Single Room AC",
    "Single Room Non AC/ Sharing Occupancy",
    "General Ward",
    "Sharing / Semi Private Room Non AC",
    "Semi Private Room AC",
    "Single Room Non AC",
    "Deluxe Room",
    "Super Deluxe",
    "Triple Sharing AC",
    "Private Room New",
    "private Room Old",
    "Executive Room",
    "Four Sharing Room AC",
    "Deluxe/Single Room AC",
    "Single Room AC/Deluxe",
    "Twin Sharing Non AC",
    "Multi Sharing AC",
    "Suite Room",
    "Private AC",
    "CCU"
  ]);

  const userProducts = useMemo(() => {
    return hospitalProfile.products || [];
  }, [hospitalProfile.products]);

  const visibleClaims = useMemo(() => {
    const roleUpper = hospitalProfile.role?.toUpperCase();
    const normalizedRole = hospitalProfile.role?.trim().toLowerCase().replace(/\s+role$/i, '');
    const assignedRole = roles.find((role) =>
      String(role.name ?? '').trim().toLowerCase().replace(/\s+role$/i, '') === normalizedRole,
    );
    const effectivePermissions = Array.isArray(hospitalProfile.permissions)
      ? hospitalProfile.permissions
      : assignedRole?.permissions ?? [];
    const isFinanceRole = /FINANCE|ACCOUNT|RECONCILIATION/.test(roleUpper || '') ||
      effectivePermissions.some((permission) => /recon|finance|account/i.test(String(permission)));

    // Claims are already scoped by the backend to the authenticated user.
    // Finance must retain all of those authorised claims; applying the older
    // browser-side product/location filter here can hide discharge-approved
    // work before it reaches the reconciliation queue.
    if (isFinanceRole) return claims;
    
    // PRODUCT-BASED DATA ISOLATION (Point 1 of requirement)
    let baseFiltered;
    if (roleUpper === 'SUPER ADMIN') {
      baseFiltered = claims; 
    } else if (hospitalProfile.role === 'Department Head') {
        const myBranchIds = hospitalUsers
            .filter(u => u.parentHospitalId === hospitalProfile.id || u.id === hospitalProfile.id)
            .map(u => u.id);
        baseFiltered = claims.filter(c => myBranchIds.includes(c.formData?.hospitalId || c.hospitalId || ''));
    } else if (hospitalProfile.role === 'Claims Processing Executive') {
        const assignedIds = hospitalProfile.assignedHospitalIds || [];
        baseFiltered = claims.filter(c => assignedIds.includes(c.formData?.hospitalId || c.hospitalId || ''));
    } else if (roleUpper && !roleUpper.startsWith('HOSPITAL') && hospitalProfile.role !== 'Hospital') {
        // Central roles (Admin, Medical Team, Policy Audit Team, CRM Team, Operations, Sales, Reconciliation, etc.)
        const assignedHospitalIds = hospitalProfile.assignedHospitalIds || [];
        // Do not depend on the optional hospital directory to populate an
        // operational queue. Claims retain their hospital/location snapshot,
        // which is the reliable source used by the scope checks below.
        baseFiltered = assignedHospitalIds.length > 0
          ? claims.filter(c => assignedHospitalIds.includes(c.formData?.hospitalId || c.hospitalId || ''))
          : claims;
    } else {
      const myScopeId = getScopeId(hospitalProfile);
      baseFiltered = claims.filter(c => {
          const claimHospId = c.formData?.hospitalId || c.hospitalId || ''; 
          return claimHospId === myScopeId;
      });
    }

    // Apply strict product and geographic segregation (Zone, State and District mapping)
    if (roleUpper !== 'SUPER ADMIN') {
      const userZones = hospitalProfile.zones || [];
      const userStates = hospitalProfile.states || [];
      const userDistricts = hospitalProfile.districts || [];
      const hasLocationFilter = userZones.length > 0 || userStates.length > 0 || userDistricts.length > 0;
      const normaliseLocation = (value?: string) => String(value || '').trim().toLocaleLowerCase();
      const isInLocationScope = (allowed: string[], actual?: string) =>
        allowed.length === 0 || allowed.some(value => normaliseLocation(value) === normaliseLocation(actual));

      return baseFiltered.filter(c => {
        // 1. PRODUCT FILTER
        if (userProducts.length > 0) {
          const claimProd = c.product as Product;
          let productMatch = false;
          if (!claimProd) {
            // If no product is set on the claim, assume it's Cashless (CPC or BG DESK) for isolation
            productMatch = userProducts.includes(Product.CPC) || userProducts.includes(Product.BG_DESK);
          } else {
            const isUserKYP = userProducts.includes(Product.KYP);
            if (isUserKYP && [Product.CPC, Product.BG_DESK, Product.PARTNER_PROCESSING, Product.KYP].includes(claimProd)) {
              productMatch = true;
            } else {
              productMatch = userProducts.includes(claimProd);
            }
          }
          if (!productMatch) return false;
        }

        // 2. GEOGRAPHIC FILTER (Zone, State & District mapping)
        if (hasLocationFilter) {
          const claimHospId = c.formData?.hospitalId || c.hospitalId || '';
          const hosp = hospitalUsers.find(u => u.id === claimHospId);
          const claimZone = hosp?.zone || c.formData?.hosp_zone || c.formData?.hospitalZone || c.formData?.hospital_zone || c.formData?.zone || c.formData?.hospital?.zone || '';
          const claimState = hosp?.state || c.formData?.hosp_state || c.formData?.hospitalState || c.formData?.hospital_state || c.formData?.p_state || c.formData?.state || c.formData?.hospital?.state || '';
          const claimDistrict = hosp?.district || c.formData?.hosp_district || c.formData?.hospitalDistrict || c.formData?.hospital_district || c.formData?.p_district || c.formData?.district || c.formData?.city || c.formData?.hospital?.district || c.formData?.hospital?.city || '';

          if (!isInLocationScope(userZones, claimZone) ||
              !isInLocationScope(userStates, claimState) ||
              !isInLocationScope(userDistricts, claimDistrict)) return false;
        }

        return true;
      });
    }

    return baseFiltered;
  }, [claims, hospitalProfile, hospitalUsers, roles]);

  const cashlessClaims = useMemo(() => {
    return visibleClaims.filter(c => {
      // PRODUCT ISOLATION: In the Cashless module, we ONLY show CPC and BG DESK
      return c.product === Product.CPC || 
             c.product === Product.BG_DESK || 
             (!c.product && c.claimType !== 'Reimbursement');
    });
  }, [visibleClaims]);

  // Filter alerts based on hospital scope
  const filteredAlerts = useMemo(() => {
    const roleUpper = hospitalProfile.role?.toUpperCase();
    if (roleUpper === 'SUPER ADMIN') return alerts;
    
    const allowedHospitalIds = visibleHospitals.map(h => h.id);
    return alerts.filter(alert => {
        const alertHospId = alert.hospitalId || '';
        return allowedHospitalIds.includes(alertHospId);
    });
  }, [alerts, hospitalProfile, visibleHospitals]);
  
  const currentScopeId = getScopeId(hospitalProfile);

  useEffect(() => {
    const totalHistory = claims.reduce((acc, c) => acc + (c.history?.length || 0), 0);
    const prevTotalHistory = prevClaimsRef.current.reduce((acc, c) => acc + (c.history?.length || 0), 0);

    if (totalHistory > prevTotalHistory) {
      const changedClaim = claims.find(c => {
         const oldC = prevClaimsRef.current.find(old => old.id === c.id);
         return !oldC || (c.history?.length || 0) > (oldC.history?.length || 0);
      });

      if (changedClaim && changedClaim.history && changedClaim.history.length > 0) {
         const latestEvent = changedClaim.history[0];
         if (latestEvent.type === 'status_change') {
            setLatestNotification({
               type: 'status_change',
               patientName: changedClaim.patientName,
               status: latestEvent.status
            });
         }
      }
    }
    prevClaimsRef.current = claims;
  }, [claims]);

  // Alert Service Integration
  useEffect(() => {
    const unsubscribe = alertService.subscribe((newAlerts) => {
      setAlerts(newAlerts);
      
      // Show flash notification for new high priority alerts
      const latest = newAlerts[0];
      if (latest && latest.status === 'Unread' && (latest.priority === 'High' || latest.priority === 'Critical')) {
        // Check if latest alert is in visible hospitals
        const allowedHospitalIds = visibleHospitals.map(h => h.id);
        const alertHospId = latest.hospitalId || '';
        
        const roleUpper = hospitalProfile.role?.toUpperCase();
        if (roleUpper === 'SUPER ADMIN' || allowedHospitalIds.includes(alertHospId)) {
          const timeDiff = new Date().getTime() - new Date(latest.createdAt).getTime();
          if (timeDiff < 5000) { // Only if created in last 5 seconds
            setLatestNotification({
              id: latest.id,
              title: latest.title,
              message: latest.message,
              type: latest.priority === 'Critical' ? 'error' : 'warning'
            });
          }
        }
      }
    });

    // Initial scan
    alertService.scanForAlerts(claims, queries, recoveries, reconciliations);

    // Periodic scan every 5 minutes
    const interval = setInterval(() => {
      alertService.scanForAlerts(claims, queries, recoveries, reconciliations);
    }, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
    // Removed visibleHospitals from dependencies to avoid loop if hospitalUsers changes
  }, [claims, queries, recoveries, reconciliations, hospitalProfile.role]);

  // Claims syncing handled via API polling and dualStorageService

  const unreadAlertsCount = useMemo(() => 
    filteredAlerts.filter(a => a.status === 'Unread').length
  , [filteredAlerts]);

  const notifications = useMemo(() => {
    // Combine alerts and history events
    const alertNotifications = filteredAlerts.map(a => ({
      id: a.id,
      claimId: a.claimId,
      title: a.title,
      message: a.message,
      date: a.createdAt,
      isRead: a.status !== 'Unread',
      priority: a.priority,
      type: 'alert' as const
    }));

    const historyEvents = visibleClaims.flatMap(c => 
      (c.history || []).filter(h => h.type === 'status_change').map(h => ({
        id: h.id,
        claimId: c.id,
        title: `Status Update: ${c.patientName}`,
        message: `Claim status changed to ${h.status}`,
        date: h.date,
        isRead: false,
        priority: 'Low' as const,
        type: 'history' as const
      }))
    );

    return [...alertNotifications, ...historyEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [filteredAlerts, visibleClaims]);

  const getTimeSince = (dateStr: string) => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setShowRoleSwitcher(false); } 
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) { setShowNotifications(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = (username: string) => { 
    // Authentication is primarily handled by Firebase and usersApi.sync in App.tsx
    // We update the local profile for immediate UI feedback if found, 
    // but the source of truth for isAuthenticated remains onAuthStateChanged.
    const sessionUser = claimnxSessionService.getSession()?.user as Record<string, unknown> | undefined;
    let matchedUser = hospitalUsers.find(u => u.username === username || u.emailId === username);
    if (matchedUser) {
      setHospitalProfile(matchedUser);
    } else if (sessionUser) {
      setHospitalProfile((current) => ({
        ...current,
        id: String(sessionUser.id ?? current.id),
        username,
        emailId: String(sessionUser.email ?? username),
        displayName: String(sessionUser.display_name ?? username.split('@')[0]),
        role: String(sessionUser.role ?? current.role),
        status: 'Active',
      }));
    } else if (username === 'raulavhad@gmail.com') {
      const primaryAdmin: HospitalUser = {
        id: 'primary-admin',
        username: 'raulavhad@gmail.com',
        displayName: 'Raul Avhad',
        hospitalName: 'Apollo Hospitals',
        role: 'Primary Admin',
        hospitalId: 'H1',
        isAdmin: true,
        firebase_uid: 'bypassed-uid',
        status: 'Active',
        createdAt: new Date().toISOString(),
        address: 'Bypassed Session',
        rohiniId: '999999',
        emailId: 'raulavhad@gmail.com',
        mobileNo: '999999999',
        doctorName: 'Dr. Rahul',
        doctorMobileNo: '999999999',
        walletBalance: 0,
        perCaseCharge: 0,
        portalCredentials: []
      };
      setHospitalProfile(primaryAdmin);
    }
    
    setIsAuthenticated(true); 
    navigate('/');

    let greetingName = 'User';
    if (matchedUser?.firstName) {
      greetingName = matchedUser.firstName;
    } else if (matchedUser?.displayName) {
      greetingName = matchedUser.displayName.split(' ')[0];
    } else if (username) {
      const emailLocalPart = username.split('@')[0];
      const namePart = emailLocalPart.split(/[\._-]/)[0];
      greetingName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    const greeting = getEnergeticGreeting(greetingName);
    setLatestNotification(null);
    setTimeout(() => {
       setLatestNotification({
          type: 'welcome',
          title: greeting.title,
          message: greeting.msg
       });
    }, 100);
  };
  
  const handleLogout = () => { 
    localStorage.removeItem('claimnx_manual_auth');
    claimnxSessionService.clear();
    setIsAuthenticated(false); 
  };

  const switchRole = (newRole: string) => {
    setHospitalProfile(prev => ({ ...prev, role: newRole }));
    setShowRoleSwitcher(false);
  };
  
  const handleSwitchHospital = (targetHospital: HospitalUser) => {
     setHospitalProfile(targetHospital);
     navigate('/');
  };

  const currentUserPermissions = useMemo(() => {
     if (hospitalProfile.role?.toUpperCase() === 'SUPER ADMIN' || hospitalProfile.role?.toUpperCase() === 'ADMIN') return ['all'];
     const normalizedProfileRole = hospitalProfile.role?.trim().toLowerCase().replace(/\s+role$/i, '');
     const roleObj = roles.find(r => {
       const normalizedRoleName = String(r.name ?? '').trim().toLowerCase().replace(/\s+role$/i, '');
       return normalizedRoleName === normalizedProfileRole || (normalizedProfileRole === 'hospital user' && normalizedRoleName === 'hospital');
     });
     let perms = Array.isArray(hospitalProfile.permissions)
       ? [...hospitalProfile.permissions]
       : roleObj
         ? [...roleObj.permissions]
         : [];

     // Map dynamic/granular tab selections in Manage Hospital to pre-existing permission tags
     if (perms.includes('sidebar_hospital_admin:sections:tab_hospital_profile')) perms.push('administration:hospital:profile');
     if (perms.includes('sidebar_hospital_admin:sections:tab_team_access')) perms.push('administration:hospital:team');
     if (perms.includes('sidebar_hospital_admin:sections:tab_payer_config')) perms.push('administration:hospital:payer');
     if (perms.includes('sidebar_hospital_admin:sections:tab_digital_assets')) perms.push('administration:hospital:assets');
     if (perms.includes('sidebar_hospital_admin:sections:tab_nhcx_onboarding')) perms.push('administration:hospital:nhcx');
     if (perms.includes('sidebar_hospital_admin:sections:tab_email_integration')) perms.push('administration:hospital:email');
     if (perms.includes('sidebar_hospital_admin:sections:tab_wallet_billing')) perms.push('administration:hospital:billing');

     // Map cashless phase access control (stage_access:phases:*) to granular stage permissions (stage_permissions:stage_*:update)
     if (perms.includes('stage_access:phases:pre-auth')) {
       perms.push('stage_permissions:stage_pre-auth:update');
       perms.push('stage_permissions:stage_pending_medical_review:update');
       perms.push('stage_permissions:stage_pending_medical_team:update');
       perms.push('stage_permissions:stage_medical_query_raised:update');
       perms.push('stage_permissions:stage_medical_query_replied:update');
       perms.push('stage_permissions:stage_pre_auth_initiated:update');
       perms.push('stage_permissions:stage_pre_auth_approved:update');
       perms.push('stage_permissions:stage_initial_query_pending:update');
       perms.push('stage_permissions:stage_query_reply_done:update');
       perms.push('stage_permissions:stage_pre_auth_rejected:update');
       perms.push('stage_permissions:stage_enhancement_initiated:update');
       perms.push('stage_permissions:stage_enhancement_approved:update');
       perms.push('stage_permissions:stage_enhancement_query_raised:update');
       perms.push('stage_permissions:stage_enhancement_query_resolved:update');
       perms.push('stage_permissions:stage_enhancement_rejected:update');
     }
     if (perms.includes('stage_access:phases:discharge')) {
       perms.push('stage_permissions:stage_discharge:update');
       perms.push('stage_permissions:stage_discharge_initiated:update');
       perms.push('stage_permissions:stage_discharge_query_raised:update');
       perms.push('stage_permissions:stage_discharge_query_reply:update');
       perms.push('stage_permissions:stage_discharge_rejected:update');
       perms.push('stage_permissions:stage_discharged_approved:update');
       perms.push('stage_permissions:stage_discharge_reconsideration_raised:update');
       perms.push('stage_permissions:stage_discharge_reconsideration_approved:update');
     }
     if (perms.includes('stage_access:phases:settlement')) {
       perms.push('stage_permissions:stage_settlement:update');
       perms.push('stage_permissions:stage_file_dispatch_pending:update');
       perms.push('stage_permissions:stage_file_dispatched:update');
       perms.push('stage_permissions:stage_claim_under_process:update');
       perms.push('stage_permissions:stage_claim_under_query:update');
       perms.push('stage_permissions:stage_claim_query_resolved:update');
       perms.push('stage_permissions:stage_claim_approved:update');
       perms.push('stage_permissions:stage_partially_claim_settled_recoverable:update');
       perms.push('stage_permissions:stage_partially_claim_settled_non_recoverable:update');
       perms.push('stage_permissions:stage_complete_settlement:update');
       perms.push('stage_permissions:stage_settlement_failed:update');
       perms.push('stage_permissions:stage_account_reconciliation:update');
       perms.push('stage_permissions:stage_bank_reconciliation_completed:update');
     }

     if (hospitalProfile.role?.toLowerCase() === 'policy audit team' || hospitalProfile.role?.toLowerCase() === 'policy audit team role') {
       if (!perms.includes('sidebar_ops:sections:audit')) {
         perms.push('sidebar_ops:sections:audit');
       }
       if (!perms.includes('sidebar_hospital:sections:group')) {
         perms.push('sidebar_hospital:sections:group');
       }
       if (!perms.includes('sidebar_ops:sections:group')) {
         perms.push('sidebar_ops:sections:group');
       }
     }
     return perms;
  }, [hospitalProfile.role, hospitalProfile.permissions, roles]);


  
  // Exposed for UserProfile to trigger clear all
  useEffect(() => {
    (window as any).clearAllNotifications = alertService.clearAll;
    return () => { delete (window as any).clearAllNotifications; };
  }, []);

  const hasProduct = (product: Product) => {
    if (hospitalProfile.role?.toUpperCase() === 'SUPER ADMIN') return true;
    if (userProducts.length > 0) return userProducts.includes(product);
    return true;
  };

  const canAccess = (navKey: string) => {
    // 0. Role Status Check
    const normalizedProfileRole = hospitalProfile.role?.trim().toLowerCase().replace(/\s+role$/i, '');
    const rObj = roles.find(r => {
      const normalizedRoleName = String(r.name ?? '').trim().toLowerCase().replace(/\s+role$/i, '');
      return normalizedRoleName === normalizedProfileRole || (normalizedProfileRole === 'hospital user' && normalizedRoleName === 'hospital');
    });
    if (rObj && rObj.status === 'Inactive') return false;

    // 1. Initial Identity Check
    const role = hospitalProfile.role?.toUpperCase();
    if (role === 'SUPER ADMIN' || role === 'PRIMARY ADMIN') return true;

    // Baseline permissions: Always allow profile and nav bar visibility by default
    if (['nav_bar', 'ui_profile'].includes(navKey)) return true;

    // 2. Individual Permission Matrix Overrides
    if (hospitalProfile.permissionsMatrix) {
       const matrix = hospitalProfile.permissionsMatrix as any;
       if (matrix[navKey] === true) return true;
    }

    // 3. User Role Permissions (Granular Matrix)
    if (currentUserPermissions.includes('all')) return true;

    // Granular Cascading checks for hospital_manage, system_admin, and business_analytics
    if (navKey === 'hospital_manage') {
      const hasAnyHospitalTab = [
        'sidebar_hospital_admin:sections:hospital',
        'sidebar_hospital_admin:sections:tab_hospital_profile',
        'sidebar_hospital_admin:sections:tab_team_access',
        'sidebar_hospital_admin:sections:tab_payer_config',
        'sidebar_hospital_admin:sections:tab_digital_assets',
        'sidebar_hospital_admin:sections:tab_nhcx_onboarding',
        'sidebar_hospital_admin:sections:tab_email_integration',
        'sidebar_hospital_admin:sections:tab_wallet_billing'
      ].some(p => currentUserPermissions.includes(p));
      if (hasAnyHospitalTab) return true;
    }

    if (navKey === 'system_admin') {
      const hasAnySysAdminTab = [
        'sidebar_admin:sections:system',
        'sidebar_admin:sections:sys_connectors',
        'sidebar_admin:sections:sys_builder',
        'sidebar_admin:sections:sys_stages',
        'sidebar_admin:sections:sys_roles',
        'sidebar_admin:sections:sys_financials',
        'sidebar_admin:sections:sys_claims_list',
        'sidebar_admin:sections:sys_logic',
        'sidebar_admin:sections:sys_templates',
        'sidebar_admin:sections:sys_diagnosis',
        'sidebar_admin:sections:sys_rooms',
        'sidebar_admin:sections:sys_reports',
        'sidebar_admin:sections:sys_integrations',
        'sidebar_admin:sections:sys_notifications'
      ].some(p => currentUserPermissions.includes(p));
      if (hasAnySysAdminTab) return true;
    }

    if (navKey === 'business_analytics' || navKey === 'mis_view') {
      const hasAnyAnalyticsTab = [
        'sidebar_admin:sections:analytics',
        'sidebar_admin:sections:ceo_suite',
        'sidebar_admin:sections:coo_hub'
      ].some(p => currentUserPermissions.includes(p));
      if (hasAnyAnalyticsTab) return true;
    }

    // 4. Matrix Mapping
    const navToModuleMap: Record<string, string> = {
       'overview': 'sidebar_hospital:sections:overview',
       'nav_overview': 'sidebar_hospital:sections:overview',
       'dashboards:visibility:overview': 'sidebar_hospital:sections:overview',
       'dashboards:visibility:recon': 'sidebar_hospital:sections:overview',
       'dashboards:visibility:mis': 'sidebar_hospital:sections:overview',
       'cashless_dashboard': 'sidebar_hospital:sections:cashless',
       'nav_cashless': 'sidebar_hospital:sections:cashless',
       'claim_directory': 'sidebar_hospital:sections:directory',
       'mis_view': 'sidebar_hospital:sections:mis',
       'nav_mis': 'sidebar_hospital:sections:mis',
       'patient_dashboard': 'sidebar_hospital:sections:patient_dashboard',

       'reimbursement_partner': 'sidebar_reimbursement:sections:partner',
       'reimbursement_ica': 'sidebar_reimbursement:sections:ica',
       'reimbursement_pre_post': 'sidebar_reimbursement:sections:pre_post',
       'reimbursement_kyp': 'sidebar_reimbursement:sections:kyp',
       'reimbursement_recovery': 'sidebar_reimbursement:sections:recovery',

       'crm_dashboard': 'sidebar_ops:sections:crm',
       'nav_crm': 'sidebar_ops:sections:crm',
       'reconciliation_dashboard': 'sidebar_ops:sections:recon',
       'recon_dashboard': 'sidebar_ops:sections:recon',
       'reconciliation_sidebar': 'sidebar_ops:sections:recon',
       'medical_underwriting': 'sidebar_ops:sections:medical',
       'nav_medical': 'sidebar_ops:sections:medical',
       'kyp_dashboard': 'sidebar_ops:sections:audit',
       'nav_kyp': 'sidebar_ops:sections:audit',
       'nav_legal': 'sidebar_ops:sections:legal',
       'legal_dashboard': 'sidebar_ops:sections:legal',
       'performance_tracking': 'sidebar_ops:sections:performance',

       'sales_dashboard': 'sidebar_sales:sections:dashboard',
       'nav_sales': 'sidebar_sales:sections:dashboard',
       'sales_manager': 'sidebar_sales:sections:manager',

       'business_analytics': 'sidebar_admin:sections:analytics',
       'invoice_management': 'sidebar_admin:sections:sys_invoices',
       'user_manage': 'sidebar_admin:sections:users',
       'system_admin': 'sidebar_admin:sections:system',

       'hospital_manage': 'sidebar_hospital_admin:sections:hospital',
       'value_added_service': 'sidebar_hospital_admin:sections:live_tracker',

       'ui_sidebar_hospital': 'sidebar_hospital:sections:group',
       'ui_sidebar_hospital_admin': 'sidebar_hospital_admin:sections:group',
       'ui_sidebar_reimbursement': 'sidebar_reimbursement:sections:group',
       'ui_sidebar_ops': 'sidebar_ops:sections:group',
       'ui_sidebar_sales': 'sidebar_sales:sections:group',
       'ui_sidebar_admin': 'sidebar_admin:sections:group',
       
       'nav_bar': 'nav_features:actions:view',
       'tab_bar': 'nav_features:actions:tab_bar',
       'ui_search': 'nav_features:actions:search',
       'ui_notifications': 'nav_features:actions:notifications',
       'ui_profile': 'nav_features:actions:profile',

       // Functional Access Mapping
       'legal_cases': 'functional_access:legal:view',
       'recovery_tracking': 'functional_access:recovery:view',
       'financial_oversight': 'functional_access:financial:view',
       
       'claims_view': 'claims:claims_list:view',
       'nav_claims': 'claims:claims_list:view',
       'edit_claims': 'claims:claims_list:edit'
    };

    if (navKey === 'patient_dashboard') {
      return true;
    }

    if (navKey.startsWith('stage_permissions:')) {
      const role = hospitalProfile.role?.toUpperCase();
      if (role === 'SUPER ADMIN' || role === 'ADMIN' || currentUserPermissions.includes('all')) return true;
      const parts = navKey.split(':');
      if (parts.length >= 2) {
        const stagePrefix = parts.slice(0, 2).join(':');
        return currentUserPermissions.includes(`${stagePrefix}:update`);
      }
    }

    const permPath = navToModuleMap[navKey] || navKey;
    return currentUserPermissions.some(p => p === permPath || p.startsWith(`${permPath}:`));
  };

  const getLandingPath = () => {
    // Priority 1: Always land on Overview (the first sidebar option) on refresh/load if permitted
    if (canAccess('nav_overview')) return '/';

    // 1. Product-Based Landing Page (Requirement A)
    const products = hospitalProfile?.products || [];
    if (products.length > 0) {
      // Check user's selected default landing product first
      const defaultProd = hospitalProfile?.defaultProduct;
      if (defaultProd && (products as string[]).includes(defaultProd)) {
        if (defaultProd === Product.PARTNER_PROCESSING && canAccess('reimbursement_partner')) return '/reimbursement/partner-processing';
        if (defaultProd === Product.ICA && canAccess('reimbursement_ica')) return '/reimbursement/ica';
        if (defaultProd === Product.PRE_POST && canAccess('reimbursement_pre_post')) return '/reimbursement/pre-post';
        if (defaultProd === Product.KYP && canAccess('reimbursement_kyp')) return '/reimbursement/know-your-policy';
        if (defaultProd === Product.RECOVERY_RECONCILIATION && canAccess('reimbursement_recovery')) return '/reimbursement/recovery-recon';
        if ((defaultProd === Product.CPC || defaultProd === Product.BG_DESK) && canAccess('nav_cashless')) return '/cashless-dashboard';
      }

      // Default Priority Redirection: Partner Processing, ICA, Pre & Post, KYP, Recovery, Cashless
      if (products.includes(Product.PARTNER_PROCESSING) && canAccess('reimbursement_partner')) return '/reimbursement/partner-processing';
      if (products.includes(Product.ICA) && canAccess('reimbursement_ica')) return '/reimbursement/ica';
      if (products.includes(Product.PRE_POST) && canAccess('reimbursement_pre_post')) return '/reimbursement/pre-post';
      if (products.includes(Product.KYP) && canAccess('reimbursement_kyp')) return '/reimbursement/know-your-policy';
      if (products.includes(Product.RECOVERY_RECONCILIATION) && canAccess('reimbursement_recovery')) return '/reimbursement/recovery-recon';
      if ((products.includes(Product.CPC) || products.includes(Product.BG_DESK)) && canAccess('nav_cashless')) return '/cashless-dashboard';
    }

    if (canAccess('nav_cashless')) return '/cashless-dashboard';
    if (canAccess('claim_directory')) return '/manage-claims';
    if (canAccess('nav_mis') || canAccess('mis_view')) return '/mis';
    if (canAccess('hospital_manage')) return '/manage-hospital';
    if (canAccess('value_added_service') && (hospitalProfile?.valueAddedServices?.liveClaimsTrackerEnabled || hospitalProfile?.role?.toUpperCase() === 'SUPER ADMIN')) return '/live-tracker';
    if (canAccess('reimbursement_partner')) return '/reimbursement/partner-processing';
    if (canAccess('reimbursement_ica')) return '/reimbursement/ica';
    if (canAccess('reimbursement_pre_post')) return '/reimbursement/pre-post';
    if (canAccess('reimbursement_kyp')) return '/reimbursement/know-your-policy';
    if (canAccess('reimbursement_recovery')) return '/reimbursement/recovery-recon';
    if (canAccess('nav_crm')) return '/crm-dashboard';
    if (canAccess('recon_dashboard')) return '/reconciliation-dashboard';
    if (canAccess('medical_underwriting') || canAccess('nav_medical')) return '/medical-underwriting';
    if (canAccess('kyp_dashboard')) return '/kyp-dashboard';
    if (canAccess('performance_tracking')) return '/performance-tracking';
    if (canAccess('nav_sales') || canAccess('sales_dashboard')) return '/sales-dashboard';
    if (canAccess('sales_manager')) return '/sales-manager-dashboard';
    if (canAccess('business_analytics')) return '/business-analytics';
    if (canAccess('user_manage')) return '/user-management';
    if (canAccess('system_admin')) return '/settings';
    if (canAccess('invoice_management')) return '/invoice-management';
    return null;
  };

  const [hasRedirectedOnLoad, setHasRedirectedOnLoad] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isAuthReady && !hasRedirectedOnLoad) {
      setHasRedirectedOnLoad(true);
      const landing = getLandingPath();
      if (landing) {
        navigate(landing);
      }
    }
  }, [isAuthenticated, isAuthReady, hasRedirectedOnLoad]);

  const canAccessStageAction = (stageKey: string, action: string) => {
    const role = hospitalProfile?.role?.toUpperCase();
    if (role === 'SUPER ADMIN' || role === 'ADMIN' || currentUserPermissions.includes('all')) return true;
    return currentUserPermissions.includes(`stage_permissions:stage_${stageKey}:update`);
  };
  
  const getNextCaseId = (product: Product) => {
    const prefixMap: { [key in Product]?: string } = {
      [Product.CPC]: "CPC",
      [Product.BG_DESK]: "DESK",
      [Product.PARTNER_PROCESSING]: "PP",
      [Product.ICA]: "HN",
      [Product.PRE_POST]: "HN",
      [Product.RECOVERY_RECONCILIATION]: "RNR",
    };

    const prefix = prefixMap[product] || "CLM";
    
    // Find all claims with this prefix and extract the numeric part
    const relevantIds = claims
      .map(c => c.id || "")
      .filter(id => id.startsWith(`${prefix}-`))
      .map(id => {
        const parts = id.split("-");
        const num = parseInt(parts[parts.length - 1]);
        return isNaN(num) ? 0 : num;
      });

    const maxId = relevantIds.length > 0 ? Math.max(...relevantIds) : 100;
    return `${prefix}-${maxId + 1}`;
  };

  const handleCreateClaim = async (claim: Claim, options?: { preventNavigation?: boolean }) => {
    try {
      const isUuid = (value: unknown): value is string =>
        typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

      // Resuming a saved draft must continue the exact same database claim.
      // Creating a second record here left the original UUID claim in Draft
      // while the new case moved through the workflow.
      const existingPersistedClaim = isUuid(claim.id) && claims.some((existing) => existing.id === claim.id);
      if (existingPersistedClaim) {
        const res = await claimsApi.update(claim.id, claim);
        setClaims((previous) => previous.map((existing) => existing.id === claim.id ? res.data : existing));
        toast.success('Claim resumed and updated successfully');
        if (!options?.preventNavigation) {
          navigate('/cashless-dashboard', { state: { claimId: res.data.id, status: res.data.status } });
        }
        return res.data;
      }

      // If we are finalizing a draft or using a temporary ID, delete the old draft claim
      const isDraftFinalization = claim.id?.startsWith('CL-DRAFT-') || claim.id?.startsWith('CL-') || claim.id?.startsWith('CLM-');
      if (isDraftFinalization && claim.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claim.id)) {
        try {
          await claimsApi.delete(claim.id);
        } catch (delErr) {
          console.warn("Could not delete previous draft claim from backend:", delErr);
        }
      }

      // Point 1: Generate product-wise Case ID if it's a temporary ID
      const finalId = (claim.id?.startsWith('CL-') || claim.id?.startsWith('CLM-') || !claim.id || isDraftFinalization)
        ? getNextCaseId(claim.product || Product.CPC)
        : claim.id;

      const getValidHospitalId = () => {
        const id = claim.hospitalId || claim.formData?.hospitalId || getScopeId(hospitalProfile);
        if (isUuid(id)) {
          return id;
        }
        const databaseHospital = visibleHospitals.find((hospital) => isUuid(hospital.id));
        if (databaseHospital) {
          return databaseHospital.id;
        }
        return '';
      };
      const resolvedHospitalId = getValidHospitalId();

      if (!resolvedHospitalId) {
        throw new Error('This account is not linked to a database hospital. Please complete Hospital Onboarding before creating a claim.');
      }

      const payerName = claim.formData?.in_house_processing === 'No'
        ? claim.formData?.tpa_provider
        : claim.formData?.insurance_company;
      const payer = [...insurers, ...tpas].find(
        (entity) => entity.name?.trim().toLowerCase() === String(payerName ?? claim.insuranceProvider ?? '').trim().toLowerCase(),
      );
      if (!payer || !isUuid(payer.id)) {
        throw new Error('Select an insurer or TPA that is available in the database before creating the claim.');
      }

      let patientId = claim.patientId;
      if (!isUuid(patientId)) {
        const patient = await patientsApi.create({
          name: claim.patientName,
          gender: claim.formData?.p_gender === 'Third Gender' ? 'Other' : claim.formData?.p_gender,
          dob: claim.formData?.p_dob || undefined,
          contact: claim.formData?.p_contact || undefined,
          address: claim.formData?.p_address || undefined,
          uhid: claim.formData?.p_uhid || undefined,
        });
        patientId = patient?.id;
      }
      if (!isUuid(patientId)) {
        throw new Error('Unable to create the patient record in the database.');
      }

      // Store a display-name snapshot with the claim. Operational queues use
      // hospital IDs for joins and tenancy, but must never render those IDs to
      // users when the directory cache is unavailable.
      const hospitalNameSnapshot = String(
        claim.formData?.hospitalName
        ?? claim.formData?.hospital_name
        ?? hospitalProfile.hospitalName
        ?? hospitalProfile.displayName
        ?? '',
      ).trim();

      const res = await claimsApi.create({
        hospital_id: resolvedHospitalId,
        patient_id: patientId,
        payer_id: payer.id,
        case_ref_id: finalId,
        status: claim.status,
        amount: Number(claim.estimatedCost || 0),
        estimated_cost: Number(claim.estimatedCost || 0),
        diagnosis: claim.diagnosis,
        admission_date: claim.admissionDate,
        priority: claim.priority,
        form_data: {
          ...claim.formData,
          caseSource: claim.caseSource || 'Internal User',
          policyNumber: claim.policyNumber,
          product: claim.product,
          hospitalName: hospitalNameSnapshot,
          hospital_name: hospitalNameSnapshot,
          // Persist a hospital location snapshot with every claim. This lets
          // role-based queues enforce Zone/State/District assignments without
          // exposing the full hospital directory to operational users.
          hosp_zone: claim.formData?.hosp_zone ?? hospitalProfile.zone ?? '',
          hosp_state: claim.formData?.hosp_state ?? hospitalProfile.state ?? '',
          hosp_district: claim.formData?.hosp_district ?? hospitalProfile.district ?? '',
        },
      });
      const persistedHospitalId = isUuid(res.data?.hospital_id)
        ? res.data.hospital_id
        : resolvedHospitalId;
      if (persistedHospitalId !== hospitalProfile.hospitalId) {
        setHospitalProfile((current) => ({
          ...current,
          hospitalId: persistedHospitalId,
        }));
      }
      const newClaim: Claim = {
        ...claim,
        id: res.data?.id ?? finalId,
        caseReferenceId: res.data?.claim_number ?? res.data?.case_ref_id ?? finalId,
        claimNumber: res.data?.claim_number ?? '',
        patientId,
        hospitalId: persistedHospitalId,
        formData: {
          ...claim.formData,
          hospitalId: persistedHospitalId,
          hospitalName: hospitalNameSnapshot,
          hospital_name: hospitalNameSnapshot,
        },
      };

      // Ensure absolutely no duplicate claims in frontend state
      setClaims(prev => [
        newClaim,
        ...prev.filter(c => c.id !== claim.id && c.id !== newClaim.id && c.id !== finalId)
      ]);
      
      // Point 5: KYP Workflow Implementation
      // When a new case is registered, status should be "Pending (KYP)"
      // and it should be visible in CRM Team (KYP) bucket for processing
      const isKYP = newClaim.product === Product.KYP || 
                    newClaim.product === Product.PARTNER_PROCESSING || 
                    newClaim.product === Product.CPC || 
                    newClaim.product === Product.BG_DESK || 
                    newClaim.claimType === 'Cashless' || 
                    !newClaim.product;
      
      if (isKYP) {
        const newPolicy: KYPPolicy = {
          id: `kyp-${Date.now()}`,
          claimId: newClaim.id,
          patientId: newClaim.patientId,
          policyNumber: newClaim.policyNumber || 'POL-UNSET',
          insuredName: newClaim.patientName,
          companyName: newClaim.insuranceProvider,
          tpaName: newClaim.formData?.tpa_provider || newClaim.formData?.tpa_name || newClaim.formData?.tpaName || 'Direct',
          policyType: 'Retail',
          sumInsured: parseFloat(String(newClaim.formData?.p_sum_insured || newClaim.formData?.sum_insured || '').replace(/[^0-9.]/g, '')) || 0,
          balanceSI: parseFloat(String(newClaim.formData?.p_balance_si || newClaim.formData?.balance_si || '').replace(/[^0-9.]/g, '')) || 0,
          status: 'Pending (KYP)',
          product_type: newClaim.product || Product.CPC,
          source: (newClaim.caseSource?.toUpperCase() as any) || 'INTERNAL USER',
          lastUpdatedDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          hospitalId: resolvedHospitalId,
          isAccepted: false,
          history: [
            {
              id: `hist-init-${Date.now()}`,
              status: 'Pending (KYP)' as any,
              date: new Date().toISOString(),
              comment: 'Case registered and initiated for Policy Audit Team analysis',
              type: 'status_change',
              userName: 'System'
            }
          ]
        };
        setKypPolicies(prev => [newPolicy, ...prev.filter(p => p.claimId !== newClaim.id)]);
      }
      
      toast.success("Claim created successfully");
      const preventNav = options?.preventNavigation || false;
      if (!preventNav) {
        if (newClaim.product === Product.KYP) {
          navigate('/reimbursement/know-your-policy');
        } else if (newClaim.product === Product.PARTNER_PROCESSING) {
          navigate('/reimbursement/partner-processing');
        } else if (newClaim.product === Product.ICA) {
          navigate('/reimbursement/ica');
        } else if (newClaim.product === Product.PRE_POST) {
          navigate('/reimbursement/pre-post');
        } else if (newClaim.product === Product.RECOVERY_RECONCILIATION) {
          navigate('/reimbursement/recovery-recon');
        } else {
          navigate('/cashless-dashboard', { state: { claimId: newClaim.id, status: newClaim.status } });
        }
      }
      return newClaim;
    } catch (error: any) {
      console.error("Error creating claim:", error);
      toast.error(error.response?.data?.message || "Failed to create claim on server");
    }
  };

  const handleUpdateClaim = async (updatedClaim: Claim) => {
    try {
      const prevClaim = claims.find(c => c.id === updatedClaim.id);
      const res = await claimsApi.update(updatedClaim.id, updatedClaim);
      setClaims(prev => prev.map(c => c.id === updatedClaim.id ? res.data : c));
      
      // Automatic Notification Trigger based on stage changes
      if (prevClaim && prevClaim.status !== updatedClaim.status) {
        notificationService.triggerStageNotification(updatedClaim, prevClaim.status);
      }
      
      toast.success("Claim updated");
      return res.data;
    } catch (error: any) {
      console.error("Error updating claim:", error);
      toast.error(error.response?.data?.message || "Failed to update claim on server");
    }
  };

  const handleUpdateInsurer = (updatedInsurer: InsuranceEntity) => {
    if (updatedInsurer.type === 'Insurer') {
      setInsurers(prev => prev.map(ins => ins.id === updatedInsurer.id ? updatedInsurer : ins));
    } else {
      setTpas(prev => prev.map(tpa => tpa.id === updatedInsurer.id ? updatedInsurer : tpa));
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 relative mb-4">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#000080] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-black text-[#000080] uppercase tracking-widest animate-pulse">Initializing ClaimNX...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  const isHospitalManageAllowed = canAccess('hospital_manage') && (
    hospitalProfile.valueAddedServices?.hospitalManageEnabled === true || 
    hospitalProfile.role?.toUpperCase() === 'SUPER ADMIN'
  );

  const isLiveClaimsTrackerAllowed =
    hospitalProfile.role?.toUpperCase() === 'SUPER ADMIN' ||
    (
      canAccess('value_added_service') &&
      hospitalProfile.valueAddedServices?.liveClaimsTrackerEnabled === true
    );

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex bg-slate-50 text-slate-900 font-sans overflow-hidden print:overflow-visible print:h-auto print:block">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-blue-900/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        {/* The sidebar is application chrome, not a permissioned module. Each
            individual link below remains permission-checked. Gating the
            container by an unmapped `sidebar` permission stranded non-admin
            users behind a menu button with nothing to open. */}
        <aside className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shrink-0 z-50 no-print print:hidden fixed lg:static h-full ${isSidebarOpen ? 'w-[280px] translate-x-0' : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0'}`}>
            <div className={`flex items-center overflow-hidden relative transition-all duration-300 ${isSidebarOpen ? 'p-6 space-x-3' : 'p-5 justify-center'}`}>
              <div className="w-10 h-10 shrink-0 relative filter drop-shadow-sm">
                   <svg viewBox="0 0 100 100" className="w-full h-full">
                      <defs>
                         <linearGradient id="sidebarShield" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1e3a8a" />
                            <stop offset="100%" stopColor="#3b82f6" />
                         </linearGradient>
                      </defs>
                      <path d="M50 95 C20 80 5 60 5 30 L50 5 L95 30 C95 60 80 80 50 95 Z" fill="url(#sidebarShield)" />
                      <text x="50" y="68" fontSize="40" fill="white" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">NX</text>
                   </svg>
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col justify-center animate-in fade-in duration-300">
                  <span className="font-black text-xl text-[#000080] tracking-tight uppercase leading-none">Claim<span className="text-blue-500">NX</span></span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-tight">The Next Generation<br />of Claims</span>
                </div>
              )}
            </div>
            <nav 
              style={{ width: isSidebarOpen ? '280px' : undefined }}
              className={`flex-1 py-4 space-y-6 overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'px-4' : 'px-2'}`}
            >
              {(canAccess('ui_sidebar_hospital') || canAccess('overview') || canAccess('cashless_dashboard') || canAccess('claim_directory') || canAccess('mis_view')) && (
                <div className="space-y-2">
                  {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pointer-events-none select-none">Hospital View</p>}
                  
                  {canAccess('overview') && (
                    <SidebarLink to="/" icon={LayoutDashboard} label="Overview" isOpen={isSidebarOpen} />
                  )}
                  {canAccess('cashless_dashboard') && (
                    <SidebarLink to="/cashless-dashboard" icon={Activity} label="Cashless Dashboard" isOpen={isSidebarOpen} matchPaths={['/new-claim', '/process-claim', '/edit-claim', '/patient-dashboard?source=cashless', '/new-claim?source=cashless', '/process-claim?source=cashless', '/edit-claim?source=cashless']} />
                  )}
                  {canAccess('claim_directory') && (
                    <SidebarLink to="/manage-claims" icon={FileSearch} label="Claims Directory" isOpen={isSidebarOpen} matchPaths={['/new-claim?source=directory', '/process-claim?source=directory', '/edit-claim?source=directory', '/patient-dashboard?source=directory']} />
                  )}
                  {canAccess('mis_view') && (
                    <SidebarLink to="/mis" icon={BarChart3} label="MIS Views" isOpen={isSidebarOpen} matchPaths={['/patient-dashboard?source=mis']} />
                  )}
                </div>
              )}
              
              {(canAccess('ui_sidebar_reimbursement') || canAccess('reimbursement_partner') || canAccess('reimbursement_ica') || canAccess('reimbursement_pre_post') || canAccess('reimbursement_kyp') || canAccess('reimbursement_recovery')) && (
                <div className="space-y-2">
                  {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pointer-events-none select-none">Reimbursement Section</p>}
                  
                  {canAccess('reimbursement_partner') && (
                    <SidebarLink 
                      to="/reimbursement/partner-processing?product=PARTNER_PROCESSING" 
                      icon={ShieldCheck} 
                      label="Partner Processing" 
                      isOpen={isSidebarOpen} 
                      matchPaths={['/reimbursement/partner-processing/new', '/patient-dashboard?source=Partner Processing', '/patient-dashboard?source=partner', '/process-claim?source=Partner Processing', '/process-claim?source=partner']} 
                    />
                  )}
                  {canAccess('reimbursement_ica') && (
                    <SidebarLink 
                      to="/reimbursement/ica?product=ICA" 
                      icon={Zap} 
                      label="ICA" 
                      isOpen={isSidebarOpen} 
                      matchPaths={['/reimbursement/ica/new', '/patient-dashboard?source=ICA', '/process-claim?source=ICA']} 
                    />
                  )}
                  {canAccess('reimbursement_pre_post') && (
                    <SidebarLink 
                      to="/reimbursement/pre-post?product=PRE_POST" 
                      icon={HistoryIcon} 
                      label="Pre & Post" 
                      isOpen={isSidebarOpen} 
                      matchPaths={['/reimbursement/pre-post/new', '/patient-dashboard?source=Pre & Post', '/process-claim?source=Pre & Post']} 
                    />
                  )}
                  {canAccess('reimbursement_kyp') && (
                    <SidebarLink 
                      to="/reimbursement/know-your-policy?product=KYP" 
                      icon={FileSearch} 
                      label="KYP" 
                      isOpen={isSidebarOpen} 
                      matchPaths={['/reimbursement/know-your-policy/new', '/patient-dashboard?source=Know Your Policy', '/patient-dashboard?source=kyp', '/process-claim?source=Know Your Policy', '/process-claim?source=kyp']} 
                    />
                  )}
                  {canAccess('reimbursement_recovery') && (
                    <SidebarLink 
                      to="/reimbursement/recovery-recon?product=RECOVERY_RECONCILIATION" 
                      icon={Coins} 
                      label="Recovery & Recon" 
                      isOpen={isSidebarOpen} 
                      matchPaths={['/reimbursement/recovery-recon/new', '/patient-dashboard?source=Recovery & Recon', '/process-claim?source=Recovery & Recon']} 
                    />
                  )}
                </div>
              )}

              {(canAccess('ui_sidebar_hospital_admin') || isHospitalManageAllowed || isLiveClaimsTrackerAllowed) && (
                <div className="space-y-2">
                  {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pointer-events-none select-none">Hospital Admin</p>}
                  {isHospitalManageAllowed && (
                    <SidebarLink to="/manage-hospital" icon={Hospital} label="Hospital Management" isOpen={isSidebarOpen} />
                  )}
                  {isLiveClaimsTrackerAllowed && (
                    <SidebarLink to="/live-tracker" icon={Tv} label="Live Claims Tracker" isOpen={isSidebarOpen} />
                  )}
                </div>
              )}

              {(canAccess('ui_sidebar_ops') || canAccess('nav_crm') || canAccess('recon_dashboard') || canAccess('medical_underwriting') || canAccess('kyp_dashboard') || canAccess('performance_tracking')) && (
                <div className="space-y-2">
                  {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pointer-events-none select-none">Operations View</p>}
                  {canAccess('nav_crm') && (
                    <SidebarLink to="/crm-dashboard" icon={ShieldAlert} label="CRM Dashboard" isOpen={isSidebarOpen} matchPaths={['/crm-handle', '/new-claim?source=crm', '/process-claim?source=crm', '/patient-dashboard?source=crm']} />
                  )}
                  {canAccess('recon_dashboard') && (
                    <SidebarLink to="/reconciliation-dashboard" icon={ShieldCheck} label="Finance Team" isOpen={isSidebarOpen} matchPaths={['/new-claim?source=recon', '/process-claim?source=recon', '/patient-dashboard?source=recon']} />
                  )}
                  {canAccess('medical_underwriting') && (
                    <SidebarLink to="/medical-underwriting" icon={BriefcaseMedical} label="Medical Underwriting" isOpen={isSidebarOpen} matchPaths={['/patient-dashboard?source=medical', '/process-claim?source=medical']} />
                  )}
                  {canAccess('kyp_dashboard') && (
                    <SidebarLink to="/kyp-dashboard" icon={FileText} label="Policy Audit Team" isOpen={isSidebarOpen} matchPaths={['/patient-dashboard?source=kyp_dashboard', '/process-claim?source=kyp_dashboard']} />
                  )}
                  {canAccess('performance_tracking') && (
                    <SidebarLink to="/performance-tracking" icon={Activity} label="Performance Tracking" isOpen={isSidebarOpen} />
                  )}
                </div>
              )}
              
              {(canAccess('ui_sidebar_sales') || canAccess('sales_dashboard') || canAccess('sales_manager')) && (
                <div className="space-y-2">
                  {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pointer-events-none select-none">Sales View</p>}
                  {canAccess('sales_dashboard') && (
                    <SidebarLink to="/sales-dashboard" icon={TrendingUp} label="Sales Dashboard" isOpen={isSidebarOpen} />
                  )}
                  {canAccess('sales_manager') && (
                    <SidebarLink to="/sales-manager-dashboard" icon={BarChart3} label="Sales Manager" isOpen={isSidebarOpen} />
                  )}
                </div>
              )}
              
              {(canAccess('ui_sidebar_admin') || canAccess('business_analytics') || canAccess('user_manage') || canAccess('system_admin') || canAccess('invoice_management')) && (
                <div className="space-y-2">
                  {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pointer-events-none select-none">Administration</p>}
                  
                  {canAccess('business_analytics') && (
                     <SidebarLink to="/business-analytics" icon={Globe2} label="Business Analytics" isOpen={isSidebarOpen} />
                  )}
                  
                  {canAccess('user_manage') && (
                     <SidebarLink to="/user-management" icon={Users} label="User Management" isOpen={isSidebarOpen} />
                  )}
                  {canAccess('invoice_management') && (
                     <SidebarLink to="/invoice-management" icon={ReceiptIndianRupee} label="Invoice Management" isOpen={isSidebarOpen} />
                  )}
                  {canAccess('system_admin') && (
                     <SidebarLink to="/settings" icon={Settings} label="System Admin" isOpen={isSidebarOpen} />
                  )}
                </div>
              )}
            </nav>
          </aside>

        <main className="flex-1 flex flex-col min-w-0 relative h-full print:h-auto print:block print:overflow-visible">
          <SystemAnnouncementsBanner currentUser={hospitalProfile} />
          {canAccess('nav_bar') && (
            <header className="h-auto min-h-[4rem] py-2 bg-white border-b border-slate-200 px-4 lg:px-8 flex flex-wrap items-center justify-between gap-4 shrink-0 z-30 sticky top-0 no-print print:hidden">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Menu size={20} /></button>
              </div>
              <div className="flex items-center space-x-4 md:space-x-6 order-2 md:order-3">
                {canAccess('ui_search') && (
                  <div className="hidden lg:block">
                    <GlobalSearch 
                      claims={visibleClaims} 
                      userProducts={userProducts} 
                      currentUser={hospitalProfile} 
                      visibleHospitals={visibleHospitals} 
                    />
                  </div>
                )}
                
                {canAccess('ui_notifications') && (
                  <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2.5 rounded-full hover:bg-slate-50 relative text-slate-500 hover:text-[#000080] transition-colors"
                  >
                    <Bell size={20} />
                    {unreadAlertsCount > 0 && (
                      <span className="absolute top-1.5 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white flex items-center justify-center">
                        {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                      </span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-3 w-96 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in slide-in-from-top-2 origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Notifications & Alerts</h3>
                        <div className="flex items-center gap-2">
                          {unreadAlertsCount > 0 && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{unreadAlertsCount} Unread</span>
                          )}
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => alertService.markAllAsRead()}
                          className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <CheckCircle2 size={10} /> Mark All Read
                        </button>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <button 
                          onClick={() => alertService.clearAll()}
                          className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <X size={10} /> Clear All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                      {notifications.length > 0 ? notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group relative ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
                              notif.priority === 'Critical' ? 'bg-red-100 text-red-600' :
                              notif.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                              notif.priority === 'Medium' ? 'bg-blue-100 text-blue-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {notif.type === 'alert' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-xs font-bold truncate pr-4 ${!notif.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                                  {getTimeSince(notif.date)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-3">
                                {notif.claimId && (
                                  <Link 
                                    to={`/process-claim/${notif.claimId}`}
                                    onClick={() => {
                                      setShowNotifications(false);
                                      if (notif.type === 'alert') alertService.markAsRead(notif.id);
                                    }}
                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center"
                                  >
                                    View Claim <ChevronRight size={10} className="ml-0.5" />
                                  </Link>
                                )}
                                {notif.type === 'alert' && !notif.isRead && (
                                  <button 
                                    onClick={() => alertService.markAsRead(notif.id)}
                                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                                  >
                                    Mark Read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-12 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell size={24} className="text-slate-300" />
                          </div>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No new updates</p>
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
                        <button 
                          onClick={() => {
                            setProfileInitialTab('notifications');
                            setShowNotifications(false);
                            setShowProfileModule(true);
                          }}
                          className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                        >
                          View All Notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {canAccess('ui_profile') && (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setShowRoleSwitcher(!showRoleSwitcher)} className="flex items-center text-right group cursor-pointer">
                  <div className="flex flex-col items-end leading-none mr-4">
                    <span className="text-sm font-black text-[#000080] uppercase tracking-tight mb-0.5 group-hover:text-blue-600 transition-colors">{hospitalProfile.displayName}</span>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center">{hospitalProfile.designation || hospitalProfile.role} <ChevronDown size={12} className={`ml-1 transition-transform ${showRoleSwitcher ? 'rotate-180' : ''}`} /></span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all overflow-hidden shadow-sm">
                    {hospitalProfile.photoURL ? (
                      <img src={hospitalProfile.photoURL} alt={hospitalProfile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                </button>
                {showRoleSwitcher && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-[100] overflow-hidden animate-in slide-in-from-top-2 origin-top-right ring-4 ring-slate-50">
                    <div className="p-6 bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#000080] to-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-200 overflow-hidden">
                                {hospitalProfile.photoURL ? (
                                  <img src={hospitalProfile.photoURL} alt={hospitalProfile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  hospitalProfile.displayName?.charAt(0)
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800 leading-tight">{hospitalProfile.displayName}</p>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{hospitalProfile.role}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center text-[10px] font-bold text-slate-500 bg-white p-2 rounded-xl border border-slate-100">
                               <Mail size={12} className="mr-2 text-slate-300" /> <span className="truncate">{hospitalProfile.emailId}</span>
                            </div>
                            <div className="flex items-center text-[10px] font-bold text-slate-500 bg-white p-2 rounded-xl border border-slate-100">
                               {hospitalProfile.entityType === 'Hospital' || hospitalProfile.role?.toUpperCase().startsWith('HOSPITAL') ? (
                                 <Hospital size={12} className="mr-2 text-slate-300" />
                               ) : (
                                 <BriefcaseMedical size={12} className="mr-2 text-slate-300" />
                               )}
                               <span className="truncate">
                                 {hospitalProfile.entityType === 'Hospital' || hospitalProfile.role?.toUpperCase().startsWith('HOSPITAL')
                                   ? hospitalProfile.hospitalName
                                   : hospitalProfile.designation || hospitalProfile.department || hospitalProfile.role}
                               </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                        <button 
                          onClick={() => {
                            setProfileInitialTab('profile');
                            setShowProfileModule(true);
                            setShowRoleSwitcher(false);
                          }} 
                          className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all text-xs font-black uppercase tracking-widest shadow-sm"
                        >
                          <User size={14} /> <span>My Identity</span>
                        </button>
                        <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all text-xs font-black uppercase tracking-widest shadow-sm"><LogOut size={14} /> <span>Sign Out</span></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
          )}
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 max-w-full p-4 lg:p-8 print:p-0 relative">
            {storageWarning && (
              <div className="sticky top-0 z-50 mb-4 mx-auto max-w-4xl p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2">
                 <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><HardDrive size={20} /></div>
                 <div className="flex-1">
                    <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Storage Limit Reached</p>
                    <p className="text-[11px] font-medium text-amber-700">{storageWarning}</p>
                 </div>
                 <button onClick={() => setStorageWarning(null)} className="p-2 text-amber-400 hover:text-amber-600"><X size={16} /></button>
              </div>
            )}
            <Routes>
              {/* GUARDED FLAT ROUTING: Simplified to prevent Error 300 bounces */}
              <Route path="/" element={
                 (canAccess('overview') || getLandingPath() === '/') ? (
                   <Dashboard claims={visibleClaims} queries={queries} recoveries={recoveries} hospitals={visibleHospitals} setHospitals={setHospitalUsers} currentUser={hospitalProfile} users={hospitalUsers} setUsers={setHospitalUsers} canAccess={canAccess} />
                 ) : getLandingPath() ? (
                   <Navigate to={getLandingPath()!} replace />
                 ) : (
                   <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-50"><div className="text-center max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"><div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><ShieldAlert size={32} /></div><h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2><p className="text-slate-500 text-xs font-medium leading-relaxed">Your account has been authenticated, but currently does not have access to any modules. Please contact your administrator to define your role permissions.</p></div></div>
                 )
              } />
              <Route path="/upload" element={<Navigate to="/" replace />} />
              <Route path="/cashless-dashboard" element={canAccess('nav_cashless') ? <CashlessDashboard claims={cashlessClaims} stages={stages} fields={fields} userPermissions={currentUserPermissions} setClaims={setClaims} kypPolicies={kypPolicies} hospitalId={currentScopeId} hospitalProfile={hospitalProfile} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/crm-dashboard" element={canAccess('nav_crm') ? <CRMDashboard claims={visibleClaims} hospitals={visibleHospitals} currentUser={hospitalProfile} users={hospitalUsers} onUpdateClaim={handleUpdateClaim} onUpdateInsurer={handleUpdateInsurer} fields={fields} insurers={insurers} tpas={tpas} permissions={currentUserPermissions} kypPolicies={kypPolicies} setKypPolicies={setKypPolicies} /> : <Navigate to="/" replace />} />
              <Route path="/crm-handle/:id" element={canAccess('nav_crm') ? <CRMManualHandling claims={visibleClaims} hospitals={hospitalUsers.filter((user) => (user.entityType || (user.isAdmin ? 'Hospital' : 'User')) === 'Hospital')} onUpdate={handleUpdateClaim} onUpdateInsurer={handleUpdateInsurer} onUpdateHospital={(updatedHospital) => {
                if (hospitalProfile && hospitalProfile.id === updatedHospital.id) {
                  setHospitalProfile(updatedHospital);
                }
                setHospitalUsers((prev) => prev.map((u) => u.id === updatedHospital.id ? updatedHospital : u));
              }} insurers={insurers} tpas={tpas} currentUser={hospitalProfile} /> : <Navigate to="/" replace />} />
              <Route path="/reconciliation-dashboard" element={canAccess('recon_dashboard') ? <ReconciliationDashboard claims={visibleClaims} hospitals={visibleHospitals} currentUser={hospitalProfile} users={hospitalUsers} onUpdateClaim={handleUpdateClaim} insurers={insurers} tpas={tpas} permissions={currentUserPermissions} /> : <Navigate to="/" replace />} />
              <Route path="/new-claim" element={
                  canAccess('nav_claims') || canAccess('edit_claims') 
                  ? <ClaimFormWizard 
                      fields={fields} 
                      onSave={handleCreateClaim}
                      currentUser={hospitalProfile} 
                      claims={visibleClaims} 
                      insurers={insurers} 
                      tpas={tpas} 
                      hospitals={visibleHospitals}
                      hospitalContextId={currentScopeId}
                      roomCategories={roomCategories}
                      apiConfig={systemConfig.apiConfig}
                    /> 
                  : <Navigate to="/" replace />
              } />
              <Route path="/edit-claim/:id" element={
                  canAccess('nav_claims') || canAccess('edit_claims')
                  ? <ClaimFormWizard 
                      fields={fields} 
                      onSave={handleCreateClaim}
                      onUpdate={handleUpdateClaim}
                      currentUser={hospitalProfile} 
                      claims={visibleClaims} 
                      insurers={insurers} 
                      tpas={tpas} 
                      hospitals={visibleHospitals}
                      hospitalContextId={currentScopeId}
                      roomCategories={roomCategories}
                      apiConfig={systemConfig.apiConfig}
                    /> 
                  : <Navigate to="/" replace />
              } />
              <Route path="/process-claim/:id" element={canAccess('claim_directory') || canAccess('claims_view') || canAccess('medical_underwriting') || canAccess('nav_medical') || canAccess('nav_crm') || canAccess('recon_dashboard') || canAccess('reconciliation_dashboard') ? <ClaimProcessCenter claims={visibleClaims} onUpdate={handleUpdateClaim} onUpdateHospital={setHospitalProfile} stages={stages} fields={fields} userRole={hospitalProfile.role} roles={roles} hospitalProfile={hospitalProfile} kypPolicies={kypPolicies} permissions={currentUserPermissions} canAccessStageAction={canAccessStageAction} canViewMedicalClaim={canAccess('medical_underwriting') || canAccess('nav_medical')} canViewCrmClaim={canAccess('nav_crm')} canViewReconClaim={canAccess('recon_dashboard') || canAccess('reconciliation_dashboard')} /> : <Navigate to="/" replace />} />
              <Route path="/patient-dashboard/:patientName" element={<PatientDashboard claims={visibleClaims} kypPolicies={kypPolicies} setKypPolicies={setKypPolicies} onUpdateClaim={handleUpdateClaim} hospitalProfile={hospitalProfile} setProfileInitialTab={setProfileInitialTab} setShowProfileModule={setShowProfileModule} canAccess={canAccess} insurers={insurers} tpas={tpas} />} />
              <Route path="/manage-claims" element={canAccess('claim_directory') ? <ManageClaims claims={cashlessClaims} stages={stages} setClaims={setClaims} insurers={insurers} tpas={tpas} permissions={currentUserPermissions} /> : <Navigate to="/" replace />} />
              <Route path="/manage-hospital" element={isHospitalManageAllowed ? <ManageHospital user={hospitalProfile} onUpdate={setHospitalProfile} insurers={insurers} tpas={tpas} setInsurers={setInsurers} setTpas={setTpas} users={visibleUsersList} setUsers={handleSetHospitalUsers} roles={roles} permissions={currentUserPermissions} /> : <Navigate to="/" replace />} />
              <Route path="/live-tracker" element={isLiveClaimsTrackerAllowed ? <LiveClaimsTracker claims={visibleClaims} hospitalName={hospitalProfile.hospitalName || hospitalProfile.displayName} userName={hospitalProfile.displayName} /> : <Navigate to="/" replace />} />
              
              <Route path="/user-management" element={canAccess('user_manage') ? <UserManagement users={visibleUsersList} setUsers={handleSetHospitalUsers} mode="hospital_partner" parentHospital={hospitalProfile} roles={roles} /> : <Navigate to="/" replace />} />
              
              {/* Business Analytics Route - Filter hospitals for Dept Head */}
              <Route path="/business-analytics" element={canAccess('business_analytics') || canAccess('mis_view') ? <BusinessAnalytics hospitals={visibleHospitals} claims={visibleClaims} onSwitchHospital={handleSwitchHospital} permissions={currentUserPermissions} /> : <Navigate to="/" replace />} />
              
              <Route path="/settings" element={canAccess('system_admin') ? <AdminPanel fields={fields} setFields={setFields} stages={stages} setStages={setStages} insurers={insurers} setInsurers={setInsurers} tpas={tpas} setTpas={setTpas} config={systemConfig} setConfig={setSystemConfig} roles={roles} setRoles={setRoles} hospitalUser={hospitalProfile} claims={claims} setClaims={setClaims} roomCategories={roomCategories} setRoomCategories={setRoomCategories} hospitals={visibleHospitals} hospitalUsers={visibleUsersList} permissions={currentUserPermissions} /> : <Navigate to="/" replace />} />
              <Route path="/invoice-management" element={canAccess('invoice_management') ? <InvoiceManagement hospitals={visibleHospitals} currentUser={hospitalProfile} claims={visibleClaims} /> : <Navigate to="/" replace />} />
              <Route path="/mis" element={canAccess('mis_view') ? <MISView claims={visibleClaims} hospitals={visibleHospitals} /> : <Navigate to="/" replace />} />
              <Route path="/reconciliation" element={canAccess('reconciliation_sidebar') ? <ReconciliationSystem claims={cashlessClaims} reconciliations={reconciliations} /> : <Navigate to="/" replace />} />
              <Route path="/automated-reports" element={canAccess('system_admin') ? <AutomatedReportingSystem hospitals={visibleHospitals} hospitalUsers={visibleUsersList} /> : <Navigate to="/" replace />} />
              <Route path="/report-download-center" element={<ReportDownloadCenter hospitalProfile={hospitalProfile} />} />
              <Route path="/performance-tracking" element={canAccess('performance_tracking') ? <PerformanceTrackingDashboard users={visibleUsersList} claims={visibleClaims} currentUser={hospitalProfile} /> : <Navigate to="/" replace />} />
              
              <Route path="/reimbursement/partner-processing" element={canAccess('reimbursement_partner') ? <ReimbursementDashboard claims={visibleClaims} hospitalProfile={hospitalProfile} product={Product.PARTNER_PROCESSING} onSave={handleCreateClaim} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/reimbursement/ica" element={canAccess('reimbursement_ica') ? <ReimbursementDashboard claims={visibleClaims} hospitalProfile={hospitalProfile} product={Product.ICA} onSave={handleCreateClaim} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/reimbursement/pre-post" element={canAccess('reimbursement_pre_post') ? <ReimbursementDashboard claims={visibleClaims} hospitalProfile={hospitalProfile} product={Product.PRE_POST} onSave={handleCreateClaim} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/reimbursement/know-your-policy" element={canAccess('reimbursement_kyp') ? <ReimbursementDashboard claims={visibleClaims} hospitalProfile={hospitalProfile} product={Product.KYP} onSave={handleCreateClaim} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/reimbursement/recovery-recon" element={canAccess('reimbursement_recovery') ? <ReimbursementDashboard claims={visibleClaims} hospitalProfile={hospitalProfile} product={Product.RECOVERY_RECONCILIATION} onSave={handleCreateClaim} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              
              <Route path="/reimbursement/partner-processing/new" element={canAccess('reimbursement_partner') ? <PartnerProcessingForm hospitalProfile={hospitalProfile} onSave={handleCreateClaim} product={Product.PARTNER_PROCESSING} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/reimbursement/ica/new" element={canAccess('reimbursement_ica') ? <PartnerProcessingForm hospitalProfile={hospitalProfile} onSave={handleCreateClaim} product={Product.ICA} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/reimbursement/pre-post/new" element={canAccess('reimbursement_pre_post') ? <PartnerProcessingForm hospitalProfile={hospitalProfile} onSave={handleCreateClaim} product={Product.PRE_POST} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/reimbursement/know-your-policy/new" element={canAccess('reimbursement_kyp') ? <PartnerProcessingForm hospitalProfile={hospitalProfile} onSave={handleCreateClaim} product={Product.KYP} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />
              <Route path="/reimbursement/recovery-recon/new" element={canAccess('reimbursement_recovery') ? <PartnerProcessingForm hospitalProfile={hospitalProfile} onSave={handleCreateClaim} product={Product.RECOVERY_RECONCILIATION} insurers={insurers} tpas={tpas} /> : <Navigate to="/" replace />} />

              <Route path="/medical-underwriting" element={canAccess('medical_underwriting') ? <MedicalUnderwritingDashboard claims={visibleClaims} visibleHospitals={visibleHospitals} currentUser={hospitalProfile} users={hospitalUsers} onUpdateClaim={handleUpdateClaim} /> : <Navigate to="/" replace />} />
              <Route path="/sales-dashboard" element={canAccess('sales_dashboard') ? <SalesDashboard claims={visibleClaims} hospitals={visibleHospitals} currentUser={hospitalProfile} users={hospitalUsers} /> : <Navigate to="/" replace />} />
              <Route path="/sales-manager-dashboard" element={canAccess('sales_dashboard') && (['MANAGER', 'SALES HEAD', 'SUPER ADMIN'].includes(hospitalProfile.role?.toUpperCase() || '')) ? <SalesManagerDashboard claims={visibleClaims} hospitals={visibleHospitals} currentUser={hospitalProfile} users={hospitalUsers} /> : <Navigate to="/" replace />} />
              <Route path="/kyp-dashboard" element={canAccess('kyp_dashboard') ? <KYPDashboard claims={visibleClaims} policies={kypPolicies} setPolicies={setKypPolicies} onUpdateClaim={handleUpdateClaim} hospitals={visibleHospitals} currentUser={hospitalProfile} insurers={insurers} /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          <div className="print:hidden">
             <ChatBot claims={visibleClaims} currentUser={hospitalProfile} />
             <FlashNotification notification={latestNotification} onClose={() => setLatestNotification(null)} />
          </div>

          {showProfileModule && (
            <UserProfile 
              user={hospitalProfile} 
              onUpdate={handlePersistUserProfile} 
              claims={claims} 
              allUsers={hospitalUsers}
              initialTab={profileInitialTab}
              notifications={notifications}
              onClose={() => setShowProfileModule(false)}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};

const SwitcherItem = ({ label, active, onClick, icon: Icon }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${active ? 'bg-blue-50 text-[#000080]' : 'text-slate-600 hover:bg-slate-50'}`}>
    <div className="flex items-center space-x-3">
      <Icon size={16} className={active ? 'text-blue-600' : 'text-slate-400'} />
      <span className="text-xs font-black uppercase tracking-tight">{label}</span>
    </div>
    {active && <div className="w-1.5 h-1.5 rounded-full bg-[#000080]"></div>}
  </button>
);

const SidebarLink = ({ to, icon: Icon, label, isOpen, matchPaths = [] }: any) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const source = searchParams.get('source');
  const product = searchParams.get('product');

  // Split 'to' into pathname and search for more accurate matching
  const [toPath, toSearch] = to.split('?');
  const toSearchParams = new URLSearchParams(toSearch || '');
  const toProduct = toSearchParams.get('product');
  
  const productMatch = toProduct ? (product ? product === toProduct : true) : true;
  
  const isActive = (location.pathname === toPath && productMatch) || 
                   (toPath !== '/' && location.pathname.startsWith(toPath) && !source && productMatch) ||
                   matchPaths.some(path => {
                     const [p, s] = path.split('?');
                     const pParams = s ? new URLSearchParams(s) : null;
                     
                     if (location.pathname.startsWith(p)) {
                       if (pParams) {
                         // If path specifies a source, it MUST match
                         const pSource = pParams.get('source');
                         const pProduct = pParams.get('product');
                         
                         const sourceMatch = pSource ? source === pSource : true;
                         const productMatch = pProduct ? product === pProduct : true;
                         
                         return sourceMatch && productMatch;
                       } else {
                         // If path is generic (no source specified in matchPath),
                         // it only matches if there is NO source in the actual URL.
                         return !source;
                       }
                     }
                     return false;
                   });
  return (
    <Link 
      to={to} 
      title={!isOpen ? label : ""}
      className={`flex items-center rounded-lg transition-all duration-300 ${isActive ? 'bg-[#000080] text-white shadow-md' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'} ${isOpen ? 'px-4 py-2.5 space-x-3' : 'p-3 justify-center'}`}
    >
      <Icon size={20} className="shrink-0" />
      <span className={`font-bold text-sm transition-all duration-300 overflow-hidden whitespace-nowrap ${isOpen ? 'opacity-100 max-w-xs ml-3' : 'opacity-0 max-w-0 ml-0'}`}>
        {label}
      </span>
    </Link>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Toaster position="top-right" richColors />
      <AppContent />
    </HashRouter>
  );
};

export default App;
