
export enum ClaimStatus {
  DRAFT = 'Draft',
  PENDING_MEDICAL_REVIEW = 'Pending Medical Review',
  PENDING_MEDICAL_TEAM = 'Pending Medical Team',
  MEDICAL_APPROVED = 'Medical Approved',
  MEDICAL_QUERY_RAISED = 'Medical Query Raised',
  MEDICAL_QUERY_REPLIED = 'Medical Query Replied',
  MEDICAL_REJECTED = 'Medical Rejected',
  SENT_TO_INSURANCE = 'Sent to Insurance/TPA',
  PRE_AUTH_INITIATED = 'Pre Auth initiated',
  PRE_AUTH_APPROVED = 'Pre Auth Approved',
  INITIAL_QUERY_PENDING = 'Initial Query Pending',
  QUERY_REPLY_DONE = 'Query reply done',
  PRE_AUTH_REJECTED = 'Pre Auth Rejected',
  ENHANCEMENT = 'Enhancement Initiated',
  ENHANCEMENT_APPROVED = 'Enhancement Approved',
  ENHANCEMENT_QUERY_RAISED = 'Enhancement Query Raised',
  ENHANCEMENT_QUERY_RESOLVED = 'Enhancement Query Resolved',
  ENHANCEMENT_REJECTED = 'Enhancement Rejected',
  DISCHARGE_INITIATED = 'Discharge Initiated',
  DISCHARGE_QUERY_RAISED = 'Discharge Query Raised',
  DISCHARGE_QUERY_REPLY = 'Discharge Query Replied',
  DISCHARGE_REJECTED = 'Discharge Rejected',
  DISCHARGE_APPROVED = 'Discharged Approved',
  DISCHARGE_RECONSIDERATION_RAISED = 'Discharge Reconsideration Raised',
  DISCHARGE_RECONSIDERATION_APPROVED = 'Discharge Reconsideration Approved',
  FILE_DISPATCH_PENDING = 'File Dispatch Pending',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED',
  ACCOUNT_RECONCILIATION = 'Account Reconciliation',
  BANK_RECONCILIATION_COMPLETED = 'Bank Reconciliation Completed',
  KYP_PENDING = 'Pending (KYP)',
  KYP_ACCEPTED = 'KYP Accepted',
  KYP_COMPLETED = 'KYP Completed',
  KYP_QUERY_PENDING = 'KYP Query Pending',
  KYP_QUERY_REPLIED = 'KYP Query Replied',
  KYP_REJECTED = 'KYP Rejected',
  KYP_PENDING_APPROVAL = 'KYP Pending Approval',
  
  // Reimbursement / Partner Processing Specific
  ASSESSMENT_SUBMITTED = 'Assessment Submitted',
  ASSESSMENT_INITIATED = 'Assessment initiated',
  ASSESSMENT_APPROVED = 'Assessment Approved',
  ASSESSMENT_QUERY_PENDING = 'Assessment Query Pending',
  ASSESSMENT_QUERY_REPLIED = 'Assessment Query Replied',
  ASSESSMENT_REJECTED = 'Assessment Rejected',
  SETTLED = 'Settled',
  
  // ICA & Pre-Post Stages
  NEW_REGISTRATION = 'New Registration',
  WELCOME_CALL_DONE = 'Welcome call done',
  FILE_PICKUP_SCHEDULED = 'File Pick-up Scheduled',
  FILE_PICKUP_IN_PROGRESS = 'File Pick-up in process',
  FILE_PICKED_UP_DONE = 'File Picked up done',
  
  // Specific stages for ICA and Pre-Post
  PENDING_WITH_MEDICAL_SCRUTINY = 'Pending with medical scrutiny',
  HOSPITAL_QUERY_PENDING = 'Query Pending with Hospital',
  INTERNAL_QUERY_PENDING = 'Internal Query pending',
  MEDICALLY_FILE_APPROVED = 'Medically file Approved',
  QUERY_DOCUMENTS_RECEIVED = 'Query documents received',
  PENDING_WITH_INSURER_MEDICAL_TEAM = 'Pending with insurer Medical Team',
  CLAIM_PENDING_WITH_INSURER_MEDICAL = 'Claim Pending with insurer Medical',
  FILE_DISPATCHED = 'File Dispatched',
  CLAIM_UNDER_PROCESS = 'Claim under process',
  CLAIM_UNDER_QUERY = 'Claim Under query',
  CLAIM_QUERY_RESOLVED = 'Claim Query Resolved',
  CLAIM_APPROVED = 'Claim Approved',
  PARTIAL_SETTLEMENT_RECOVERABLE = 'Partially Claim Settled - Recoverable',
  PARTIAL_SETTLEMENT_NON_RECOVERABLE = 'Partially Claim Settled - Non-Recoverable',
  COMPLETE_SETTLEMENT = 'Complete Settlement',
}

export enum Product {
  CPC = 'CPC',
  BG_DESK = 'BG DESK',
  PARTNER_PROCESSING = 'Partner Processing',
  ICA = 'ICA',
  PRE_POST = 'Pre & Post',
  KYP = 'Know Your Policy',
  RECOVERY_RECONCILIATION = 'Recovery & Recon'
}

export type SectionType = 'tpa_hospital' | 'patient' | 'medical' | 'admission' | 'declaration' | 'stage_process';
export type AutomationType = 'Portal' | 'Email' | 'RPA Automated';
export type ClaimPriority = 'Standard' | 'Urgent' | 'Critical';
export type AgreementType = 'Per Case' | 'Monthly Billing' | 'Percentage';

export interface WalletTransaction {
  id: string;
  date: string;
  type: 'Credit' | 'Debit';
  amount: number;
  description: string;
  referenceId?: string;
  gateway?: 'Razorpay' | 'Paytm' | 'Wallet';
  gatewayTxnId?: string;
  gatewayOrderId?: string;
  reconciliationStatus?: 'Reconciled (Auto Match)' | 'Pending Match' | 'Reconciliation Checked';
  bankRef?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  products?: Product[];
  canCreateRoles?: string[]; // List of Role Names this role is allowed to create
  allowedReports?: string[]; // List of report types this role is allowed to download
  users: number;
  status: 'Active' | 'Inactive';
}

export interface SMTPConfig {
  id: string;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  status: 'Connected' | 'Disconnected' | 'Pending';
}

export interface PaymentGatewayConfig {
  provider: 'Razorpay' | 'PayTM' | 'Stripe';
  keyId: string;
  keySecret?: string;
  isActive: boolean;
}

export interface RegionalContact {
  id: string;
  state: string;
  district: string;
  zone: string;
  claimEmail: string;
  settlementEmail: string;
}

export interface InsuranceEntity {
  id: string;
  name: string;
  emailId: string;
  settlementEmail?: string;
  portalLink: string;
  type: 'Insurer' | 'TPA';
  automationType: AutomationType;
  onPanel: boolean;
  rpaSupported: boolean;
  autoEmailEnabled: boolean;
  templateName?: string;
  portalId?: string;
  portalPassword?: string;
  tariffFileName?: string;
  startDate?: string;
  endDate?: string;
  // Regional Config (Default/Headquarters)
  state?: string;
  district?: string;
  zone?: string;
  // Specific Regional Overrides
  regionalContacts?: RegionalContact[];
}

export interface Patient {
  id: string;
  fullName: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  mobileNo?: string;
  address?: string;
  chronicConditions?: Record<string, any>;
  createdAt: string;
}

export interface ManualDiagnosis {
  id: string;
  diagnosis: string;
  claimId: string;
  hospitalId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface MasterDiagnosis {
  id: string;
  code?: string;
  name: string;
  description?: string;
  category?: string;
  addedBy: string;
  addedByName?: string;
  modifiedBy?: string;
  modifiedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  caseReferenceId: string;
  /** Server-allocated ClaimNX business identifier; never the database UUID. */
  claimNumber?: string;
  patientId: string;
  patientName: string;
  insuranceProvider: string;
  policyNumber: string;
  estimatedCost: number;
  diagnosis: string;
  admissionDate: string;
  dischargeDate?: string;
  product?: Product;
  caseSource?: 'Website' | 'Mobile App' | 'Internal User' | 'Hospital';
  claimType?: 'Cashless' | 'Reimbursement';
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
  formData: Record<string, any>;
  history: TimelineEvent[];
  priority?: ClaimPriority;
  aiInsights?: ClaimAIInsights;
  hospitalId?: string;
  insuranceCompanyId?: string;
  
  // CRM / Failed Submission Tracking
  submissionStatus?: 'Success' | 'Failed' | 'Pending';
  failureReason?: string;
  failureType?: 'Email' | 'Portal' | 'RPA';
  assignedCrmUserId?: string;
  assignedCrmUserName?: string;
  /** Tracks a CRM claim from acceptance through completion of the CRM action. */
  crmReviewStatus?: 'Under Review' | 'Processed';
  crmDecision?: {
    decision: 'Completed';
    comment: string;
    attachments?: Array<{ id?: string; name?: string; mimeType?: string }>;
    completedAt: string;
    completedByUserId: string;
    completedByUserName: string;
  };
  assignedReconUserId?: string;
  assignedMedicalUserId?: string;
  assignedMedicalUserName?: string;
  assignedOpsUserId?: string;
  assignedOpsUserName?: string;
  createdBy?: string;
  manualSubmissionType?: 'Email' | 'Portal';
  manualSubmissionAt?: string;
  isPriority?: boolean;
  queryRaisedBy?: 'Medical Underwriting' | 'Insurer' | 'TPA' | 'KYP';
  originatingStatus?: ClaimStatus;
  isMedicallyApproved?: boolean;
  isAccepted?: boolean;
  isKypAccepted?: boolean;
  
  // Reconciliation Fields
  paidAmount?: number;
  outstandingAmount?: number;
  lastFollowUpDate?: string;
  settlementStatus?: 'Pending' | 'Partial' | 'Full';
  settlementProof?: string;
  reconciliationRemarks?: string;
  fileDispatchedDate?: string;
  
  // Automation & AI
  remindersSent?: number;
  lastReminderDate?: string;
  externalReferenceId?: string;
  externalIntegStatus?: 'Queued' | 'Synced' | 'Failed';
  aiFollowUpSuggestion?: {
    priority: 'High' | 'Medium' | 'Low';
    recommendedAction: 'Call' | 'Email' | 'Escalation';
    reason: string;
    score: number;
  };
}

export interface ReconciliationSettings {
  reminderFrequencyDays: number;
  enableAiSuggestions: boolean;
  enableForecasting: boolean;
  recoveryTargets: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  scoringWeights: {
    aging: number;
    amount: number;
    reminders: number;
    insurerBehavior: number;
  };
}

export interface ReminderLog {
  id: string;
  claimId: string;
  sentDate: string;
  recipient: string;
  recipientType: 'Insurer' | 'TPA' | 'Hospital';
  status: 'Sent' | 'Delivered' | 'Failed' | 'Responded';
  templateUsed: string;
}

export interface RoomInfo {
  type: string;
  count: number;
  bedsPerRoom: number;
  images: number;
  amenities: number;
}

export interface UploadedFile {
  name: string;
  data: string;
  mimeType: string;
  startDate?: string;
  endDate?: string;
  uploadedAt: string;
}

export interface DocumentStatus {
  name: string;
  validity: string;
  count: number;
  status: 'Complete' | 'Incomplete';
  startDate?: string;
  endDate?: string;
  files?: UploadedFile[];
}

export interface UserPermissionsMatrix {
  overview: boolean;
  claim_directory: boolean;
  mis_view: boolean;
  hospital_manage: boolean;
  user_manage: boolean;
  can_edit: boolean;
  system_admin: boolean;
  patient_dashboard?: boolean;
  
  // Dashboard Permissions
  cashless_dashboard: boolean;
  crm_dashboard: boolean;
  recon_dashboard: boolean;
  medical_underwriting: boolean;
  sales_dashboard: boolean;
  
  // Functional Permissions
  claims_view: boolean;
  claims_edit_stage: boolean;
  documents_upload: boolean;
  reconciliation_approve: boolean;
  financial_view: boolean;
  dashboards_view: boolean;
  legal_manage: boolean;
  recovery_manage: boolean;
  
  // UI & Access Permissions
  team_view: boolean;
  sidebar: boolean;
  tab_bar: boolean;
  nav_bar: boolean;
  ui_profile?: boolean;
  
  // Manager Oversight Permissions
  crm_oversight: boolean;
  recon_oversight: boolean;
  medical_oversight: boolean;
  kyp_oversight: boolean;
  
  // Hospital Management Tab Permissions
  tab_hospital_profile?: boolean;
  tab_team_access?: boolean;
  tab_payer_config?: boolean;
  tab_digital_assets?: boolean;
  tab_nhcx_onboarding?: boolean;
  tab_email_integration?: boolean;
  tab_wallet_billing?: boolean;
  tab_value_added_services?: boolean;

  // Attendance Permissions
  attendance_view?: boolean;
  attendance_manage?: boolean;
}

export interface ValueAddedServiceConfig {
  vasEnabled?: boolean;
  hospitalManageEnabled?: boolean;
  kypEnabled: boolean;
  rpaEnabled: boolean;
  aiInsightsEnabled: boolean;
  digitalAssetsEnabled: boolean;
  nhcxEnabled: boolean;
  medicalScrutinyRequired: boolean;
  liveClaimsTrackerEnabled?: boolean;
}

export interface HospitalUser {
  id: string;
  username: string; 
  password?: string; // For mock credential management
  displayName: string;
  role: string; 
  status: 'Active' | 'Inactive';
  statusReason?: string;
  createdAt: string;
  hospitalName: string;
  displayNameFull?: string;
  website?: string;
  address: string;
  state?: string;
  district?: string;
  location?: string;
  zone?: string; // New field
  pinCode?: string;
  gstNo?: string;
  panNo?: string;
  registrationNo?: string;
  registrationAuthority?: string;
  regStartDate?: string;
  regEndDate?: string;
  rohiniId: string;
  emailId: string;
  mobileNo: string;
  hospitalId?: string;
  firebase_uid?: string; // Link to Firebase Auth
  valueAddedServices?: ValueAddedServiceConfig;
  doctorName: string;
  doctorMobileNo: string;
  tpaPersonName?: string;
  tpaPersonMobile?: string;
  bankName?: string;
  accountNo?: string;
  accountHolderName?: string;
  ifscCode?: string;
  bankAddress?: string;
  invoiceEmail?: string;
  agreementType?: AgreementType;
  agreementValue?: number;
  agreementStartDate?: string;
  agreementRenewalDate?: string;
  agreementStageValues?: { stage: string; value: number; category?: string }[];
  agreementInvoiceCategories?: string[];
  agreementPercentageBase?: 'Final Approval Amount' | 'Settled Amount';
  portalCredentials: PortalCredential[];
  smtpConfigs?: SMTPConfig[];
  paymentGateway?: PaymentGatewayConfig;
  walletBalance: number;
  perCaseCharge: number;
  transactions?: WalletTransaction[];
  permissions?: string[];
  hospitalSeal?: string;
  doctorStamp?: string;
  hospitalSealStoragePath?: string;
  doctorStampStoragePath?: string;
  authorizedSignatory?: string;
  reportsToId?: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  employeeCode?: string;
  empCode?: string;
  department?: string;
  joiningDate?: string;
  rooms?: RoomInfo[];
  facilities?: string[];
  documents?: DocumentStatus[];
  // Staff User Fields (merged)
  zones?: string[];
  states?: string[];
  districts?: string[];
  designation?: string;
  isAdmin?: boolean;
  profileImage?: string;
  permissionsMatrix?: UserPermissionsMatrix;
  allowedStages?: string[]; // Specific stages this user can access
  assignedHospitalIds?: string[]; // For CRM users to see multiple hospitals
  entityType?: 'User' | 'Hospital' | 'Partner'; // Distinguish between different entity types
  products?: Product[]; // Products assigned to the entity
  defaultProduct?: string; // Default landing product
  
  // Reconciliation specific
  reconciliationPerformance?: {
    recoveredMTD: number;
    casesClosedMTD: number;
  };
  
  // Department/Multi-Branch Config
  parentHospitalId?: string; // ID of the Main Branch or Department Head
  invoiceGenerationType?: 'Centralized' | 'Decentralized' | 'Individual';
  nhcxConfig?: {
    hfrId: string;
    nodeId: string;
    publicKey: string;
    endpointUrl: string;
    status: 'Pending' | 'Verified' | 'Active';
  };
  apiConfig?: {
    webhookUrl?: string;
    apiKey?: string;
    externalIntegEnabled?: boolean;
    autoUpdateEnabled?: boolean;
  };
}

export interface PortalCredential {
  entityId: string;
  username: string;
  password?: string;
  startDate?: string;
  endDate?: string;
  rateListName?: string;
  rateListData?: string;
  rateListType?: string;
}

export interface TimelineEvent {
  id: string;
  status: ClaimStatus | 'REOPEN CASE';
  comment?: string;
  date: string;
  amount?: string;
  refId?: string;
  fileName?: string;
  fileData?: string;
  fileType?: string;
  type: 'status_change' | 'document_upload' | 'admission' | 'medical_decision' | 'query_reply';
  stageData?: Record<string, any>;
  emailSent?: boolean;
  userName?: string;
  userRole?: string;
}

export interface ClaimStage {
  id: string;
  name: string;
  key: string;
  description: string;
  icon: string;
  statuses: ClaimStatus[];
  mappedFieldIds: string[];
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
  options?: string[];
  required: boolean;
  section: SectionType;
  placeholder?: string;
}

export interface PatientDocument {
  id: string;
  patientName: string;
  mobileNo?: string;
  emailId?: string;
  documentType: 'Insurance Policy' | 'KYC (Aadhar/PAN)' | 'Treatment Reports' | 'Discharge Summary' | 'Other';
  fileName: string;
  fileData: string; // Base64 encoded file data
  uploadedAt: string;
  status: 'Pending' | 'Linked' | 'Rejected';
  linkedClaimId?: string;
  hospitalId?: string;
}

export interface DeveloperProfile {
  name: string;
  email: string;
  version: string;
  role: string;
}

/**
 * Interface representing an insured person in a policy
 */
export interface InsuredPerson {
  name: string;
  dob?: string;
  gender?: string;
}

/**
 * Interface for AI Prediction of Claim Outcome
 */
export interface ClaimPrediction {
  likelyNextStage: string;
  estimatedResolutionTime: string;
  confidenceScore: number;
  reasoning: string;
  riskFactors: string[];
}

/**
 * AI Powered Automation Interfaces
 */

export interface ClaimRiskScore {
  score: number; // 0-100
  likelihood: 'High' | 'Medium' | 'Low';
  factors: string[];
  recommendation: string;
}

export interface RecoveryForecast {
  days30: number;
  days60: number;
  days90: number;
  confidence: number;
}

export interface QuerySuggestion {
  suggestedResponse: string;
  confidence: number;
  relevantPastClaims: string[]; // IDs
}

export interface DuplicateDetection {
  isPotentialDuplicate: boolean;
  matchingClaimIds: string[];
  matchConfidence: number;
  reason: string;
}

export interface FraudRisk {
  riskLevel: 'High' | 'Medium' | 'Low' | 'None';
  suspiciousPatterns: string[];
  score: number;
}

export interface ClaimAIInsights {
  riskScore?: ClaimRiskScore;
  forecast?: RecoveryForecast;
  duplicateDetection?: DuplicateDetection;
  fraudRisk?: FraudRisk;
  lastAnalyzedAt: string;
}

/**
 * Interface representing data extracted from medical reports or insurance policies by AI
 */
export interface MedicalReportExtraction {
  // Common Fields
  patientName?: string;
  diagnosis?: string;
  age?: number;
  gender?: string;
  recommendedTreatment?: string;
  estimatedCost?: number;
  icdCode?: string;
  dob?: string; // Date of Birth
  doctorName?: string;
  doctorContact?: string;
  m_clinical_findings?: string;
  admissionDate?: string;
  hospitalName?: string;
  
  treatingDoctor?: string;
  treatmentProtocol?: string;
  natureOfIllness?: string;
  criticalFindings?: string;
  injuryDetails?: string;
  pastHistory?: string;
  admissionType?: string;
  corporateName?: string;
  employeeId?: string;
  
  estimatedStayDays?: number;
  estimatedTotalCost?: number;
  costBreakdown?: {
    roomRent?: number;
    icu?: number;
    ot?: number;
    professionalFees?: number;
    medicines?: number;
    investigation?: number;
    others?: number;
  };

  // Social Habits (Identified from medical document)
  socialHabits?: {
    tobacco?: { status: boolean; details?: string };
    alcohol?: { status: boolean; details?: string };
    drugs?: { status: boolean; details?: string };
    paanGutkha?: { status: boolean; details?: string };
    others?: { status: boolean; details?: string };
  };

  // Chronic Conditions (Pre-existing diseases)
  chronicConditions?: {
    diabetes?: { status: boolean; since?: string };
    heartDisease?: { status: boolean; since?: string };
    hypertension?: { status: boolean; since?: string };
    hyperlipidemias?: { status: boolean; since?: string };
    osteoarthritis?: { status: boolean; since?: string };
    asthmaCopd?: { status: boolean; since?: string };
    cancer?: { status: boolean; since?: string };
    alcoholDrugAbuse?: { status: boolean; since?: string };
    hivStd?: { status: boolean; since?: string };
    stroke?: { status: boolean; since?: string };
    liverDisease?: { status: boolean; since?: string };
    kidneyDisease?: { status: boolean; since?: string };
    others?: { status: boolean; details?: string };
  };
  
  // AI Predictions for Cashless Approval
  approvalPrediction?: {
    chance: 'High' | 'Medium' | 'Low';
    reason: string;
  };
  suggestedDocuments?: string[];

  // Policy Specific Fields
  policyNumber?: string;
  cardId?: string;
  sumInsured?: string;
  bonus?: string;
  ncb?: string;
  restoreBenefit?: string;
  superBonus?: string;
  preHospitalization?: string;
  postHospitalization?: string;
  eligibleRoom?: string;
  icuIccu?: string;
  ambulanceCover?: string;
  ayushTreatment?: string;
  hospitalDailyCash?: string;
  copay?: string;
  subLimit?: string;
  aiAnalysisComment?: string;
  insuranceCompany?: string;
  tpaName?: string;
  insuredPersons?: InsuredPerson[];
}

export interface Query {
  id: string;
  claimId: string;
  queryText: string;
  raisedAt: string;
  repliedAt?: string;
  status: 'Pending' | 'Resolved';
  documentId?: string;
}

export interface RecoveryRecord {
  id: string;
  claimId: string;
  recoverableAmount: number;
  recoveredAmount: number;
  status: 'Pending' | 'Partial' | 'Recovered';
  reason?: string;
  updatedAt: string;
}

export interface ReconciliationRecord {
  id: string;
  batchId: string;
  hospitalId: string;
  totalAmount: number;
  matchedClaims: number;
  processedAt: string;
  fileId?: string;
}

export interface BillingRecord {
  id: string;
  claimId: string;
  patientName: string;
  billAmount: number;
  billDate: string;
  hospitalId: string;
}

export interface SettlementRecord {
  id: string;
  claimId: string;
  settledAmount: number;
  settlementDate: string;
  deductionAmount: number;
  deductionReason: string;
  utrNumber: string;
}

export interface BankEntry {
  id: string;
  date: string;
  amount: number;
  utrNumber: string;
  description: string;
}

export interface ReconciliationDiscrepancy {
  type: 'Short Settlement' | 'Payment Mismatch' | 'Missing Entry';
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  amount: number;
}

export interface ReconciliationReport {
  id: string;
  claimId: string;
  patientName: string;
  hospitalBill: number;
  insuranceSettlement: number;
  bankPayment: number;
  deductions: number;
  deductionReason?: string;
  utrNo?: string;
  claimNo?: string;
  ipdNo?: string;
  discrepancies: ReconciliationDiscrepancy[];
  status: 'Matched' | 'Discrepancy' | 'Pending';
  reconciledAt: string;
  rawFormData?: string;
}

export interface LegalCase {
  id: string;
  claimId: string;
  caseNumber: string;
  courtName?: string;
  lawyerName?: string;
  status: 'Open' | 'Hearing' | 'Closed';
  nextHearingDate?: string;
  updatedAt: string;
}

export interface CRMPerformanceMetrics {
  casesHandled: number;
  casesClosed: number;
  pendingCases: number;
  tatAdherence: number; // Percentage
  successRate: number; // Percentage
  avgProcessingTime: number; // In minutes
}

export interface CRMUserPerformance {
  userId: string;
  userName: string;
  reportsToName?: string;
  today: CRMPerformanceMetrics;
  weekly: CRMPerformanceMetrics;
  monthly: CRMPerformanceMetrics;
  quarterly: CRMPerformanceMetrics;
  yearly: CRMPerformanceMetrics;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  timestamp: string;
  resourceId: string;
  resourceType: 'Claim' | 'User' | 'Document' | 'Reconciliation' | 'Auth' | 'System' | 'Notification' | 'Legal' | 'Recovery' | 'Hospital';
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AlertType = 'Aging' | 'Compliance' | 'Deadline' | 'Financial' | 'System';
export type AlertPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type AlertStatus = 'Unread' | 'Read' | 'Resolved' | 'Archived';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  status: AlertStatus;
  title: string;
  message: string;
  hospitalId?: string;
  claimId?: string;
  createdAt: string;
  resolvedAt?: string;
  escalated?: boolean;
  emailSent?: boolean;
  metadata?: Record<string, any>;
}

export type KYPStatus = 'Pending (KYP)' | 'Approved' | 'Query Pending' | 'Rejected' | 'Query Replied' | 'Pending' | 'KYP Accepted' | 'KYP Completed' | 'KYP Query Pending' | 'KYP Query Replied' | 'KYP Rejected' | 'KYP Pending Approval';

export interface KYPPolicy {
  id: string;
  policyNumber: string;
  insuredName: string;
  companyName: string;
  tpaName: string;
  policyType: 'Retail' | 'Corporate';
  sumInsured: number;
  balanceSI: number;
  status: KYPStatus;
  product_type: string;
  source: 'WEBSITE' | 'APP' | 'INTERNAL USER';
  lastUpdatedDate: string;
  hospitalId?: string;
  
  claimId?: string;
  patientId?: string;
  patientName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  mobileNo?: string;
  emailId?: string;
  admissionDate?: string;
  expectedDischargeDate?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Section 1: Policy Basic Details
  productName?: string;
  insurerProductName?: string;
  firstInceptionDate?: string;
  effectiveDate?: string;
  expiryDate?: string;
  
  // Section 2: Insured Details
  memberId?: string;
  
  // Section 3: Coverage Details
  effectiveCoverage?: string;
  bonusSuperBonus?: string;
  restoreBenefit?: boolean;
  
  // Section 4: Room & Hospital Benefits
  roomRentLimit?: string;
  icuLimit?: string;
  hospitalDailyCash?: string;
  ayushTreatment?: boolean;
  ambulanceCover?: string;
  
  // Section 5: Waiting Period
  initialWaitingPeriod?: string; // 30 days
  specificWaitingPeriod?: string; // 2 Years
  pedWaitingPeriod?: string; // 3 Years
  waivedOff?: boolean;
  
  // Section 6: Sub-Limits & Co-Pay
  copayPercentage?: number;
  subLimits?: string; // e.g., Cataract ₹50,000
  
  // Section 7: Pre & Post Hospitalization
  preHospitalizationDays?: number;
  preHospDays?: number;
  postHospitalizationDays?: number;
  postHospDays?: number;
  opdCoverage?: boolean;
  maternityBenefit?: boolean;
  maternityCover?: string;
  
  // Section 8: Diagnosis / Case Info
  diagnosisName?: string;
  diagnosis?: string;
  fractureDisease?: string;
  caseInfo?: string;
  
  // Section 9: Remarks
  remarks?: string;
  intimationNumber?: string;
  intimationNo?: string;
  
  // Metadata
  rawDocumentUrl?: string;
  aiExtractedData?: any;
  userEditedData?: any;
  aiSuggestions?: string[];
  alerts?: string[];
  
  // Assignment & Workflow
  assignedUserId?: string;
  assignedUserName?: string;
  isAccepted?: boolean;
  needsAssignmentAlert?: boolean; 
  history?: TimelineEvent[];
}

export type AuthMethod = 'MTLS' | 'OAUTH2' | 'API_KEY' | 'JWT';

export interface ApiValidationRule {
  field: string;
  rule: string;
  description: string;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
  validationRules?: ApiValidationRule[];
}

export interface IntegrationSystem {
  id: string;
  name: string;
  icon: string;
  description: string;
  authMethod: AuthMethod;
  endpoints: ApiEndpoint[];
}

export interface SalesTarget {
  id: string;
  userId: string;
  userName: string;
  period: 'Monthly' | 'Quarterly' | 'Yearly';
  year: number;
  month?: number; // 1-12 for Monthly
  quarter?: number; // 1-4 for Quarterly
  targetAmount: number;
  cashlessTarget: number;
  reimbursementTarget: number;
  onboardingTarget?: number; // Target for new hospital tie-ups
  assignedById: string;
  assignedByName: string;
  createdAt: string;
  updatedAt: string;
  type: 'Revenue' | 'Onboarding' | 'Product-wise';
}

export interface SalesLead {
  id: string;
  hospitalName: string;
  city: string;
  state: string;
  zone: string;
  contactPerson: string;
  contactNumber: string;
  stage: 'Lead Generated' | 'Hospital Visit Done' | 'Proposal Shared' | 'Tie-up Closed' | 'Active Business';
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  lastVisitDate?: string;
  potentialRevenue?: number;
}

export interface SalesVisit {
  id: string;
  userId: string;
  userName: string;
  hospitalId?: string;
  hospitalName: string;
  doctorName?: string;
  hospitalBed?: string;
  contactPerson: string;
  purpose: string;
  outcome: 'Follow-up' | 'Activation done' | 'Pending';
  followUpDate?: string;
  activationDate?: string;
  remarks: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  visitDate: string;
  createdAt: string;
}

export interface SalesPerformanceMetrics {
  revenue: number;
  volume: number;
  cashlessRevenue: number;
  cashlessVolume: number;
  reimbursementRevenue: number;
  reimbursementVolume: number;
}

export interface SalesDashboardData {
  kpis: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  targets: {
    monthly: { target: number; achieved: number };
    quarterly: { target: number; achieved: number };
    yearly: { target: number; achieved: number };
  };
  productWise: {
    cashless: { volume: number; revenue: number };
    reimbursement: { volume: number; revenue: number };
  };
  hospitalWise: {
    hospitalId: string;
    hospitalName: string;
    cases: number;
    revenue: number;
  }[];
  trends: {
    date: string;
    revenue: number;
    cases: number;
  }[];
}

export interface SalesManagerDashboardData extends SalesDashboardData {
  teamPerformance: {
    userId: string;
    userName: string;
    target: number;
    achieved: number;
    visits: number;
    conversionRate: number;
  }[];
  geographyPerformance: {
    zone: string;
    states: {
      state: string;
      cities: {
        city: string;
        revenue: number;
        hospitals: number;
      }[];
      revenue: number;
    }[];
    revenue: number;
  }[];
  funnel: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  insights: {
    title: string;
    description: string;
    impact: 'Positive' | 'Negative' | 'Neutral';
    type: 'Follow-up' | 'Growth' | 'Prediction';
    message: string;
    priority: 'High' | 'Medium' | 'Low';
    targetId?: string;
  }[];
}

export interface ReportFrequencyConfig {
  type: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  day?: string;
  time: string;
}

export interface ReportRecipientsConfig {
  zones?: string[];
  states?: string[];
  cities?: string[];
  hospitals?: string[];
  insuranceCompanies?: string[];
  tpas?: string[];
}

export interface ReportConfig {
  id: string;
  name: string;
  products: Product[];
  frequency: ReportFrequencyConfig;
  recipients: ReportRecipientsConfig;
  deliveryChannels: ('Email' | 'SMS' | 'Portal')[];
  emailTemplateId?: string;
  smsTemplateId?: string;
  lastRunAt?: string;
  status: 'Active' | 'Paused';
  createdBy: string;
  createdAt: string;
  templateId?: string;
}

export interface ReportDeliveryLog {
  id: string;
  configId: string;
  reportName: string;
  deliveredToId: string;
  deliveredToName: string;
  channel: 'Email' | 'SMS' | 'Portal' | 'Link';
  status: 'Sent' | 'Delivered' | 'Failed' | 'Downloaded';
  timestamp: string;
  error?: string;
  downloadUrl?: string;
  expiresAt?: string;
  metadata?: {
    totalCases?: number;
    approvedCases?: number;
    queryCases?: number;
    rejectedCases?: number;
    pendingCases?: number;
    settlementAmount?: number;
    avgTat?: number;
    outstandingCases?: number;
  };
}

export interface AutomatedReportTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'Email' | 'SMS';
  placeholders: string[];
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'WhatsApp' | 'SMS';
  content: string;
  placeholders: string[];
  status: 'Active' | 'Inactive';
  hospitalId?: string; 
  createdAt: string;
  updatedAt: string;
}

export interface StageNotificationConfig {
  stage: ClaimStatus;
  whatsappTemplateId?: string;
  smsTemplateId?: string;
  enabled: boolean;
}

export interface HospitalNotificationConfig {
  id: string;
  hospitalId: string;
  hospitalName: string;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  stageConfigs: StageNotificationConfig[];
}

export const ROLE_STAGE_ENTITLEMENTS = [
  {
    category: 'Medical Review',
    stages: [
      { status: ClaimStatus.PENDING_MEDICAL_REVIEW, label: 'Pending Medical Review', key: 'pending_medical_review' },
      { status: ClaimStatus.PENDING_MEDICAL_TEAM, label: 'Pending Medical Team', key: 'pending_medical_team' },
      { status: ClaimStatus.MEDICAL_QUERY_RAISED, label: 'Medical Query Raised', key: 'medical_query_raised' },
      { status: ClaimStatus.MEDICAL_QUERY_REPLIED, label: 'Medical Query Replied', key: 'medical_query_replied' }
    ]
  },
  {
    category: 'Pre-Authorization',
    stages: [
      { status: ClaimStatus.PRE_AUTH_INITIATED, label: 'Pre Auth Initiated', key: 'pre_auth_initiated' },
      { status: ClaimStatus.PRE_AUTH_APPROVED, label: 'Pre Auth Approved', key: 'pre_auth_approved' },
      { status: ClaimStatus.INITIAL_QUERY_PENDING, label: 'Initial Query Pending', key: 'initial_query_pending' },
      { status: ClaimStatus.QUERY_REPLY_DONE, label: 'Query Reply Done', key: 'query_reply_done' },
      { status: ClaimStatus.PRE_AUTH_REJECTED, label: 'Pre Auth Rejected', key: 'pre_auth_rejected' }
    ]
  },
  {
    category: 'Enhancement',
    stages: [
      { status: ClaimStatus.ENHANCEMENT, label: 'Enhancement Initiated', key: 'enhancement_initiated' },
      { status: ClaimStatus.ENHANCEMENT_APPROVED, label: 'Enhancement Approved', key: 'enhancement_approved' },
      { status: ClaimStatus.ENHANCEMENT_QUERY_RAISED, label: 'Enhancement Query Raised', key: 'enhancement_query_raised' },
      { status: ClaimStatus.ENHANCEMENT_QUERY_RESOLVED, label: 'Enhancement Query Resolved', key: 'enhancement_query_resolved' },
      { status: ClaimStatus.ENHANCEMENT_REJECTED, label: 'Enhancement Rejected', key: 'enhancement_rejected' }
    ]
  },
  {
    category: 'Discharge',
    stages: [
      { status: ClaimStatus.DISCHARGE_INITIATED, label: 'Discharge Initiated', key: 'discharge_initiated' },
      { status: ClaimStatus.DISCHARGE_QUERY_RAISED, label: 'Discharge Query Raised', key: 'discharge_query_raised' },
      { status: ClaimStatus.DISCHARGE_QUERY_REPLY, label: 'Discharge Query Replied', key: 'discharge_query_reply' },
      { status: ClaimStatus.DISCHARGE_REJECTED, label: 'Discharge Rejected', key: 'discharge_rejected' },
      { status: ClaimStatus.DISCHARGE_APPROVED, label: 'Discharged Approved', key: 'discharged_approved' },
      { status: ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED, label: 'Discharge Reconsideration Raised', key: 'discharge_reconsideration_raised' },
      { status: ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED, label: 'Discharge Reconsideration Approved', key: 'discharge_reconsideration_approved' }
    ]
  },
  {
    category: 'File Dispatch',
    stages: [
      { status: ClaimStatus.FILE_DISPATCH_PENDING, label: 'File Dispatch Pending', key: 'file_dispatch_pending' },
      { status: ClaimStatus.FILE_DISPATCHED, label: 'File Dispatched', key: 'file_dispatched' }
    ]
  },
  {
    category: 'Claims Processing',
    stages: [
      { status: ClaimStatus.CLAIM_UNDER_PROCESS, label: 'Claim Under Process', key: 'claim_under_process' },
      { status: ClaimStatus.CLAIM_UNDER_QUERY, label: 'Claim Under Query', key: 'claim_under_query' },
      { status: ClaimStatus.CLAIM_QUERY_RESOLVED, label: 'Claim Query Resolved', key: 'claim_query_resolved' },
      { status: ClaimStatus.CLAIM_APPROVED, label: 'Claim Approved', key: 'claim_approved' },
      { status: ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE, label: 'Partially Claim Settled - Recoverable', key: 'partially_claim_settled_recoverable' },
      { status: ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE, label: 'Partially Claim Settled - Non-Recoverable', key: 'partially_claim_settled_non_recoverable' },
      { status: ClaimStatus.COMPLETE_SETTLEMENT, label: 'Complete Settlement', key: 'complete_settlement' }
    ]
  },
  {
    category: 'Reconciliation',
    stages: [
      { status: ClaimStatus.SETTLEMENT_FAILED, label: 'Settlement Failed', key: 'settlement_failed' },
      { status: ClaimStatus.ACCOUNT_RECONCILIATION, label: 'Account Reconciliation', key: 'account_reconciliation' },
      { status: ClaimStatus.BANK_RECONCILIATION_COMPLETED, label: 'Bank Reconciliation Completed', key: 'bank_reconciliation_completed' }
    ]
  }
];
