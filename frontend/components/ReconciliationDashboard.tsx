
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatDate, formatDateTime, formatTAT } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Claim, 
  ClaimStatus, 
  HospitalUser, 
  TimelineEvent,
  ReconciliationSettings,
  ReminderLog,
  InsuranceEntity
} from '../types';
import DownloadReportModal from './DownloadReportModal';
import { emailTemplateService } from '../services/emailTemplateService';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  Mail, 
  Download, 
  Eye, 
  ChevronRight, 
  MoreVertical,
  FileText,
  Upload,
  Send,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  History,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronDown,
  ArrowUpDown,
  FileSpreadsheet,
  Settings,
  Zap,
  Target,
  Trophy,
  Activity,
  Bell,
  MessageSquare,
  Phone,
  ShieldAlert,
  PlusCircle,
  Users,
  Lock,
  Globe,
  Info,
  Reply,
  ReplyAll,
  Forward,
  Minus,
  Maximize2,
  Minimize2,
  Sparkles,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  Smile,
  Link2,
  Paperclip,
  PenTool,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ReconciliationDashboardProps {
  claims: Claim[];
  hospitals: HospitalUser[];
  currentUser: HospitalUser;
  users: HospitalUser[];
  onUpdateClaim: (claim: Claim) => void;
  insurers?: InsuranceEntity[];
  tpas?: InsuranceEntity[];
  permissions?: string[];
}

type AgingBucket = '0-30' | '30-45' | '45-60' | '60-90' | '90-120' | '120+' | 'File Dispatched';

const claimHospitalId = (claim: Claim) => String(
  claim.hospitalId ?? (claim as any).hospital_id ?? claim.formData?.hospitalId ?? '',
);

const claimHospitalName = (claim: Claim) => String(
  (claim as any).hospitalName ??
  (claim as any).hospital_name ??
  claim.formData?.hospitalName ??
  claim.formData?.hospital_name ??
  claim.formData?.hospital?.name ??
  '',
).trim();

const technicalClaimIdPattern = /^(?:CASE-)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const businessIdentifier = (...candidates: unknown[]) => {
  const value = candidates
    .map((candidate) => String(candidate ?? '').trim())
    .find((candidate) => candidate && !technicalClaimIdPattern.test(candidate));

  return value || 'Pending';
};

const claimBusinessCaseId = (claim: Claim) => businessIdentifier(
  claim.formData?.case_id,
  claim.formData?.caseId,
  claim.formData?.case_no,
  claim.formData?.caseNo,
  claim.claimNumber,
  (claim as any).claim_number,
  claim.caseReferenceId,
);

const claimBusinessNumber = (claim: Claim) => businessIdentifier(
  claim.formData?.insurer_claim_no,
  claim.formData?.claim_no,
  claim.formData?.claimNo,
  claim.formData?.claim_number,
  claim.claimNumber,
  (claim as any).claim_number,
);

const ReconciliationDashboard: React.FC<ReconciliationDashboardProps> = ({ 
  claims, 
  hospitals, 
  currentUser,
  users,
  onUpdateClaim,
  insurers = [],
  tpas = [],
  permissions = []
}) => {
  const navigate = useNavigate();
  const isManager = useMemo(() => {
    const managerRoles = ['Reconciliation Manager', 'Super Admin', 'Admin', 'Department Head', 'Accounts Head'];
    const hasOversightPermission = currentUser.permissionsMatrix?.recon_oversight === true || 
                                   permissions.includes('reconciliation:recon_approve:oversight') || 
                                   currentUser.permissionsMatrix?.team_view === true;
                                   
    return managerRoles.includes(currentUser.role) || currentUser.isAdmin || hasOversightPermission;
  }, [currentUser, permissions]);

  const [showManagerOversight, setShowManagerOversight] = useState(false);

  const canCreateClaim = useMemo(() => {
    if (permissions.includes('all')) return true;
    return permissions.some(p => p.startsWith('claims:') || p.startsWith('edit_claims:'));
  }, [permissions]);
  const [selectedBucket, setSelectedBucket] = useState<AgingBucket | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);
  const [selectedTpas, setSelectedTpas] = useState<string[]>([]);
  const [showSettlementModal, setShowSettlementModal] = useState<Claim | null>(null);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Initiate Settlement' | 'Emails' | 'Performance' | 'Automation'>('Dashboard');
  const [showPatientModal, setShowPatientModal] = useState<Claim | null>(null);
  const [activePatientTab, setActivePatientTab] = useState<'Details' | 'Emails'>('Details');
  const [selectedFailedClaim, setSelectedFailedClaim] = useState<Claim | null>(null);
  const [activeFailedClaimTab, setActiveFailedClaimTab] = useState<'Email Resend' | 'Portal Submission' | 'View Documents' | 'Timeline' | 'Final Assessment'>('Email Resend');
  const [failedClaimEmailTo, setFailedClaimEmailTo] = useState('');
  const [failedClaimEmailCc, setFailedClaimEmailCc] = useState('');
  const [failedClaimEmailBody, setFailedClaimEmailBody] = useState('');
  const [portalApprovedAmt, setPortalApprovedAmt] = useState<string>('');
  const [portalUtrRef, setPortalUtrRef] = useState<string>('');
  const [portalComments, setPortalComments] = useState<string>('');

  useEffect(() => {
    if (selectedFailedClaim) {
      const pName = selectedFailedClaim.patientName || "Patient";
      const cNo = selectedFailedClaim.id || "CLM-1111";
      const insurerLower = (selectedFailedClaim.insuranceProvider || "tataaiggeneral").toLowerCase().replace(/[^a-z0-9]/g, '');
      setFailedClaimEmailTo(`contact@${insurerLower || 'tataaiggeneral'}.com`);
      setFailedClaimEmailCc(`billing@${selectedFailedClaim.hospitalId?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'hospital'}.com`);
      setFailedClaimEmailBody(`Dear Team,\n\nPatient ${pName} (Claim #${cNo}) is being discharged today.\n\nPlease provide the final approval for discharge.\n\nRegards,\nCare Hospital Billing Team`);
      
      const approvedAmt = selectedFailedClaim.formData?.fin_app_amt || selectedFailedClaim.formData?.approved_amt || selectedFailedClaim.formData?.pre_auth_app_amt || selectedFailedClaim.formData?.dis_total_bill || '';
      setPortalApprovedAmt(String(approvedAmt));
      setPortalUtrRef(selectedFailedClaim.formData?.tracking_no || '');
      setPortalComments(selectedFailedClaim.formData?.file_dispatch_comment || '');
    }
  }, [selectedFailedClaim]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualRequest, setManualRequest] = useState({ 
    hospitalId: '', 
    to: '', 
    cc: '', 
    subject: '', 
    body: '',
    templateId: 'template-1'
  });

  const reportingTemplates = [
    {
      id: 'template-1',
      name: 'Standard Hospital Daily Summary',
      subject: 'Daily Claims Report - {{hospitalName}}',
      body: 'Dear Team,\n\nPlease find attached the daily claims processing report for {{hospitalName}} for the period {{dateRange}}.\n\nRegards,\nReporting System'
    },
    {
      id: 'template-2',
      name: 'Weekly Performance Audit',
      subject: 'Weekly Performance Analysis - {{hospitalName}}',
      body: 'Hello,\n\nAttached is the weekly performance audit report for {{hospitalName}}.\n\nBest regards,\nOperations Team'
    }
  ];

  const handleManualHospitalChange = (hId: string) => {
    const hospital = hospitals.find(h => h.id === hId);
    const template = reportingTemplates.find(t => t.id === manualRequest.templateId) || reportingTemplates[0];
    
    if (hospital && template) {
      let subject = template.subject.replace(/{{hospitalName}}/g, hospital.hospitalName);
      let body = template.body.replace(/{{hospitalName}}/g, hospital.hospitalName)
                                .replace(/{{dateRange}}/g, format(new Date(), 'dd-MM-yyyy'));
      
      setManualRequest({
        ...manualRequest,
        hospitalId: hId,
        to: hospital.emailId || '',
        subject,
        body
      });
    } else {
      setManualRequest({ ...manualRequest, hospitalId: hId });
    }
  };

  const handleManualTemplateChange = (tId: string) => {
    const hospital = hospitals.find(h => h.id === manualRequest.hospitalId);
    const template = reportingTemplates.find(t => t.id === tId);
    
    if (hospital && template) {
      let subject = template.subject.replace(/{{hospitalName}}/g, hospital.hospitalName);
      let body = template.body.replace(/{{hospitalName}}/g, hospital.hospitalName)
                                .replace(/{{dateRange}}/g, format(new Date(), 'dd-MM-yyyy'));
      
      setManualRequest({
        ...manualRequest,
        templateId: tId,
        subject,
        body
      });
    } else {
      setManualRequest({ ...manualRequest, templateId: tId });
    }
  };
  const [actionedClaims, setActionedClaims] = useState<Record<string, string>>({});
  const [showAllPriorityModal, setShowAllPriorityModal] = useState(false);
  const [confirmActionClaim, setConfirmActionClaim] = useState<Claim | null>(null);

  const getOutstandingAmt = (c: any) => {
    const isSettled = c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.SETTLED || c.settlementStatus === 'Full';
    if (isSettled) return 0;
    return Number(c.outstandingAmount ?? c.formData?.fin_app_amt ?? 0);
  };

  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [selectedEmailForView, setSelectedEmailForView] = useState<ReminderLog | null>(null);

  const emailViewDocuments = useMemo(() => {
    if (!selectedEmailForView) return [];
    
    // Find associated claim
    const assocClaim = claims.find(c => 
      c.id === selectedEmailForView.claimId || 
      c.caseReferenceId === selectedEmailForView.claimId ||
      c.id?.toLowerCase().includes(selectedEmailForView.claimId.toLowerCase()) ||
      selectedEmailForView.claimId.toLowerCase().includes(c.id?.toLowerCase())
    );

    const docs = assocClaim ? [
      ...(assocClaim.history?.filter(h => h.fileData || h.stageData?.documents).flatMap(h => {
        const dList = [];
        if (h.fileData) {
          dList.push({
            name: h.fileName || 'settlement_letter.pdf',
            data: h.fileData,
            mimeType: 'application/pdf'
          });
        }
        if (h.stageData?.documents) {
          (h.stageData.documents as any[]).forEach(d => {
            dList.push({
              name: d.name || 'document.pdf',
              data: d.data || '',
              mimeType: d.mimeType || 'application/pdf'
            });
          });
        }
        return dList;
      }) || []),
      ...(assocClaim.formData?.attachedDocs || []).map((d: any) => ({
        name: d.name || 'document.pdf',
        data: d.data || '',
        mimeType: d.mimeType || 'application/pdf'
      }))
    ] : [];

    // Fallback to avoid empty attachments list if there are none in the claim
    if (docs.length === 0) {
      if (selectedEmailForView.claimId === 'CLM-002') {
        return [
          {
            name: `Discharge_Summary_${selectedEmailForView.claimId}.pdf`,
            data: 'data:text/plain;charset=utf-8,Mock%20Discharge%20Summary',
            mimeType: 'application/pdf'
          },
          {
            name: `Settlement_Letter_${selectedEmailForView.claimId}.pdf`,
            data: 'data:text/plain;charset=utf-8,Mock%20Settlement%20Letter',
            mimeType: 'application/pdf'
          },
          {
            name: `Final_Bill_${selectedEmailForView.claimId}.pdf`,
            data: 'data:text/plain;charset=utf-8,Mock%20Final%20Bill',
            mimeType: 'application/pdf'
          }
        ];
      }
      return [
        {
          name: `Settlement_Letter_${selectedEmailForView.claimId}.pdf`,
          data: 'data:text/plain;charset=utf-8,Mock%20Settlement%20Letter',
          mimeType: 'application/pdf'
        }
      ];
    }
    return docs;
  }, [selectedEmailForView, claims]);

  const handlePreview = (fileName: string, fileData: string, mimeType: string) => {
    try {
      if (!fileData || !fileData.startsWith('data:')) {
        const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Mock PDF content for: ${fileName}\n\nClaimNX Document System`);
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        link.click();
        toast.success(`Successfully downloaded '${fileName}'`);
        return;
      }
      const link = document.createElement('a');
      link.href = fileData;
      link.download = fileName;
      link.click();
      toast.success(`Successfully downloaded '${fileName}'`);
    } catch (e) {
      toast.success(`Successfully downloaded '${fileName}'`);
    }
  };

  const [showEmailDraftModal, setShowEmailDraftModal] = useState(false);
  const [isComposerMaximized, setIsComposerMaximized] = useState(false);
  const [isComposerMinimized, setIsComposerMinimized] = useState(false);
  const [isComposerBold, setIsComposerBold] = useState(false);
  const [isComposerItalic, setIsComposerItalic] = useState(false);
  const [isComposerUnderline, setIsComposerUnderline] = useState(false);
  const [composerAlign, setComposerAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [composerList, setComposerList] = useState<'none' | 'bullet' | 'number'>('none');
  const [selectedEmailHospital, setSelectedEmailHospital] = useState<string>('All');
  const [emailDraftData, setEmailDraftData] = useState({
    id: '',
    hospitalId: '',
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachments: [] as File[]
  });

  const getHospitalFromEmail = (hospitalId: string) => {
    const h = hospitals.find(h => h.id === hospitalId);
    if (!h) return 'ops@claimnx.com';
    const smtpConfig = h.smtpConfigs?.find((cfg: any) => cfg.status === "Connected") || h.smtpConfigs?.[0];
    return smtpConfig?.fromEmail || smtpConfig?.username || h.emailId || `${h.hospitalName?.toLowerCase().replace(/\s/g, "") || "hospital"}@claimnx.com`;
  };

  const handleEmailAction = (actionType: 'reply' | 'replyAll' | 'forward', emailLog: ReminderLog) => {
    const claim = claims.find(c => c.id === emailLog.claimId);
    const hospitalId = claim?.formData?.hospitalId || claim?.hospitalId || '';

    let toVal = '';
    let ccVal = '';
    let bccVal = '';
    let subjectVal = '';
    let bodyVal = '';

    const originalSubject = `${emailLog.templateUsed} - Claim ${emailLog.claimId}`;
    let originalBody = `Dear ${emailLog.recipientType} Team,

This is a follow-up regarding the outstanding settlement for Claim NO: ${emailLog.claimId}.
As per our records, the file was dispatched on ${claim?.fileDispatchedDate ? formatDate(claim.fileDispatchedDate) : 'Recently'}.

Kindly provide an update on the settlement status at the earliest.

Regards,
Reconciliation Team`;

    const emailHeaderQuote = `\n\n\n----- Original Message -----\nFrom: Reconciliation Team (ClaimNX)\nTo: ${emailLog.recipient}\nSent: ${new Date(emailLog.sentDate).toLocaleString()}\nSubject: ${originalSubject}\n\n${originalBody}`;

    if (actionType === 'reply') {
      toVal = emailLog.recipient;
      subjectVal = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
      bodyVal = `Dear ${emailLog.recipientType} Team,

[Write your reply here]

Regards,
Reconciliation Team${emailHeaderQuote}`;
    } else if (actionType === 'replyAll') {
      toVal = emailLog.recipient;
      ccVal = 'billing@claimnx.com, operations@claimnx.com';
      bccVal = 'archive@claimnx.com';
      subjectVal = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
      bodyVal = `Dear ${emailLog.recipientType} Team,

[Write your reply to all here]

Regards,
Reconciliation Team${emailHeaderQuote}`;
    } else if (actionType === 'forward') {
      toVal = '';
      subjectVal = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`;
      bodyVal = `Dear Team,

Forwarding the claim query settlement status update for your reference.

[Add forwarding comments here]

Regards,
Reconciliation Team

----- Forwarded Message -----${emailHeaderQuote}`;
    }

    setEmailDraftData({
      id: `email-draft-${Date.now()}`,
      hospitalId,
      to: toVal,
      cc: ccVal,
      bcc: bccVal,
      subject: subjectVal,
      body: bodyVal,
      attachments: []
    });

    setSelectedEmailForView(null);
    setShowEmailDraftModal(true);
  };
  
  // Automation & AI State
  const [settings, setSettings] = useState<ReconciliationSettings>({
    reminderFrequencyDays: 3,
    enableAiSuggestions: true,
    enableForecasting: true,
    recoveryTargets: {
      daily: 500000,
      weekly: 2500000,
      monthly: 10000000
    },
    scoringWeights: {
      aging: 40,
      amount: 30,
      reminders: 15,
      insurerBehavior: 15
    }
  });
  const [currentEmailFolder, setCurrentEmailFolder] = useState<'Inbox' | 'Sent' | 'Draft' | 'Outbox'>('Inbox');
  const [emailsDb, setEmailsDb] = useState<any[]>([]);

  const loadEmailsFromStorage = () => {
    try {
      const stored = localStorage.getItem('claimnx_emails');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    const initial = [
      {
        id: "email-in-1",
        claimId: "CLM-001",
        sentDate: new Date(Date.now() - 3 * 3600000).toISOString(),
        sender: "claims@hdfcergo.com",
        recipient: "ops@claimnx.com",
        recipientType: "Hospital",
        subject: "QUERY RAISED: Deficiency in claim documentation for CLM-001",
        body: `Dear CRM Team,

Upon reviewing the submitted documents for Claim Ref: CLM-001, we have noticed that the signed discharge summary is missing. Please upload the complete document to resume processing.

Best regards,
Claims Team
HDFC Ergo Health Insurance`,
        status: "Received",
        templateUsed: "Query Notification",
        hospitalId: "HOSP-001"
      },
      {
        id: "email-in-2",
        claimId: "CLM-002",
        sentDate: new Date(Date.now() - 5 * 3600000).toISOString(),
        sender: "settlements@starhealth.in",
        recipient: "ops@claimnx.com",
        recipientType: "Hospital",
        subject: "DISBURSEMENT CONFIRMED: Settlement Approved - CLM-002",
        body: `Dear Finance Team,

We are pleased to inform you that the claim CLM-002 has been settled. The authorized amount of INR 1,45,000 has been dispatched via NEFT transaction ID 98234123490.

Please find the attached settlement letter in your dashboard.

Best regards,
Star Health TPA Team`,
        status: "Received",
        templateUsed: "Settlement Confirmation",
        hospitalId: "HOSP-001"
      },
      {
        id: "email-sent-1",
        claimId: "CLM-001",
        sentDate: new Date(Date.now() - 1 * 3600000).toISOString(),
        sender: "ops@claimnx.com",
        recipient: "claims@hdfcergo.com",
        recipientType: "Insurer",
        subject: "Standard escalation - Claim CLM-001",
        body: `Dear Insurer Team,

This is a follow-up regarding the outstanding settlement status for Claim NO: CLM-001.
As per our records, the file has been processed. Kindly verify and escalate.

Regards,
CRM Operations Team`,
        status: "Sent",
        templateUsed: "Standard Escalation",
        hospitalId: "HOSP-001"
      },
      {
        id: "email-draft-1",
        claimId: "CLM-003",
        sentDate: new Date(Date.now() - 30 * 60000).toISOString(),
        sender: "ops@claimnx.com",
        recipient: "billing@icicilombard.com",
        recipientType: "Insurer",
        subject: "Resolution Required for Claim CLM-003",
        body: `Dear Billing Team,

We are writing to escalate the non-reconciliation of CLM-003. Let us know when we can expect settlement confirmation.

Best regards,
Claims Team`,
        status: "Draft",
        templateUsed: "Draft Resolution",
        hospitalId: "HOSP-002"
      },
      {
        id: "email-out-1",
        claimId: "CLM-002",
        sentDate: new Date(Date.now() + 1200000).toISOString(),
        sender: "ops@claimnx.com",
        recipient: "support@starhealth.in",
        recipientType: "Insurer",
        subject: "Scheduled Reminder: Pending Dispatched File CLM-002",
        body: `Dear Star Health Team,

This is a scheduled follow-up for Claim CLM-002 dispatched on 2026-06-10.

Best regards,
CRM Operations`,
        status: "Queued",
        templateUsed: "Scheduled Follow-up",
        hospitalId: "HOSP-001",
        scheduledTime: new Date(Date.now() + 1200000).toISOString()
      }
    ];
    localStorage.setItem('claimnx_emails', JSON.stringify(initial));
    return initial;
  };

  const saveEmailsToStorage = (updatedList: any[]) => {
    localStorage.setItem('claimnx_emails', JSON.stringify(updatedList));
    setEmailsDb(updatedList);
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    setEmailsDb(loadEmailsFromStorage());

    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('claimnx_emails');
        if (stored) {
          setEmailsDb(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const reminderLogs = useMemo<ReminderLog[]>(() => {
    return emailsDb.map(email => ({
      id: email.id,
      claimId: email.claimId || "CLM-001",
      sentDate: email.sentDate || new Date().toISOString(),
      recipient: email.recipient || "support@insurer.com",
      recipientType: (email.recipientType as any) || "Insurer",
      status: email.status === 'Received' ? 'Responded' : (email.status === 'Queued' ? 'Sent' : email.status),
      templateUsed: email.templateUsed || "Standard"
    }));
  }, [emailsDb]);

  const setReminderLogs = (arg: any) => {
    const currentLogs: ReminderLog[] = emailsDb.map(email => ({
      id: email.id,
      claimId: email.claimId || "CLM-001",
      sentDate: email.sentDate || new Date().toISOString(),
      recipient: email.recipient || "support@insurer.com",
      recipientType: (email.recipientType as any) || "Insurer",
      status: email.status === 'Received' ? 'Responded' : (email.status === 'Queued' ? 'Sent' : email.status),
      templateUsed: email.templateUsed || "Standard"
    }));
    const resolvedLogs: ReminderLog[] = typeof arg === 'function' ? arg(currentLogs) : arg;
    const updatedMails = resolvedLogs.map(log => {
      const existing = emailsDb.find(e => e.id === log.id);
      return {
        id: log.id,
        claimId: log.claimId,
        sentDate: log.sentDate,
        sender: existing?.sender || "ops@claimnx.com",
        recipient: log.recipient,
        recipientType: log.recipientType,
        subject: existing?.subject || `${log.templateUsed} - Claim ${log.claimId}`,
        body: existing?.body || `Dear Team,\n\nThis is regarding Claim ${log.claimId}.\n\nRegards,\nTeam`,
        status: log.status === 'Responded' ? 'Received' : (log.status === 'Sent' ? 'Sent' : log.status),
        templateUsed: log.templateUsed,
        hospitalId: existing?.hospitalId || 'HOSP-001'
      };
    });
    saveEmailsToStorage(updatedMails);
  };

  const [notifications, setNotifications] = useState<any[]>([]);

  const filteredEmails = useMemo(() => {
    return emailsDb.filter(log => {
      let matchesFolder = false;
      if (currentEmailFolder === 'Inbox') matchesFolder = log.status === 'Received';
      else if (currentEmailFolder === 'Sent') matchesFolder = log.status === 'Sent' || log.status === 'Responded';
      else if (currentEmailFolder === 'Draft') matchesFolder = log.status === 'Draft';
      else if (currentEmailFolder === 'Outbox') matchesFolder = log.status === 'Queued';

      if (!matchesFolder) return false;

      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        (log.claimId || '').toLowerCase().includes(query) ||
        (log.recipient || '').toLowerCase().includes(query) ||
        (log.sender || '').toLowerCase().includes(query) ||
        (log.subject || '').toLowerCase().includes(query) ||
        (log.templateUsed || '').toLowerCase().includes(query);
      
      if (!matchesSearch) return false;

      if (selectedEmailHospital === 'All') return true;
      return log.hospitalId === selectedEmailHospital;
    });
  }, [emailsDb, currentEmailFolder, searchQuery, selectedEmailHospital]);

  // Auto Refresh Logic
  useEffect(() => {
    // Check if user is editing something
    const isEditing = showSettlementModal !== null || showBulkEmailModal || showPatientModal !== null;
    
    if (isEditing) {
      return; // Pause refresh
    }

    const interval = setInterval(() => {
      setIsRefreshing(true);
      // Simulate fetching new data in background (in a real app, this would be an API call)
      setTimeout(() => {
        setLastRefreshed(new Date());
        setIsRefreshing(false);
      }, 1000);
    }, 45000); // 45 seconds

    return () => clearInterval(interval);
  }, [showSettlementModal, showBulkEmailModal, showPatientModal]);

  const runAutoScheduler = () => {
    const now = new Date();
    const frequency = settings.reminderFrequencyDays;
    
    const claimsToRemind = claimsWithAi.filter(claim => {
      // Only remind for specific statuses
      const eligibleStatus = ['File Dispatched', 'Pending', 'Outstanding'].includes(claim.settlementStatus || 'Pending');
      if (!eligibleStatus) return false;

      // Check frequency
      if (!claim.lastReminderDate) return true;
      const lastDate = new Date(claim.lastReminderDate);
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= frequency;
    });

    if (claimsToRemind.length === 0) {
      toast.info('No claims require reminders at this time based on frequency settings.');
      return;
    }

    const newLogs: ReminderLog[] = claimsToRemind.map(claim => ({
      id: `auto-log-${Date.now()}-${claim.id}`,
      claimId: claim.id,
      sentDate: now.toISOString(),
      recipient: claim.insuranceProvider.includes('HDFC') ? 'claims@hdfcergo.com' : 'support@insurer.com',
      recipientType: 'Insurer',
      status: 'Sent',
      templateUsed: 'Auto-Scheduled Reminder'
    }));

    setReminderLogs(prev => [...newLogs, ...prev]);
    toast.success(`Auto-scheduler completed! Sent ${claimsToRemind.length} reminders.`);
  };

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Claim | 'agingDays'; direction: 'asc' | 'desc' } | null>(null);

  const [settlementData, setSettlementData] = useState({
    status: 'Pending' as 'Pending' | 'Partial' | 'Full',
    paidAmount: 0,
    remarks: '',
    proof: null as File | null
  });

  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    recipientType: 'Insurer' as 'Insurer' | 'TPA' | 'Hospital'
  });

  // Apply Location-Based Access Control
  const isFinanceQueueUser = useMemo(() =>
    /finance|account|reconciliation/i.test(currentUser.role ?? '') ||
    (permissions || []).some((permission: string) => /recon|finance|account/i.test(String(permission))),
  [currentUser.role, permissions]);

  const accessibleClaims = useMemo(() => {
    // Finance routing is enforced by the API using the authenticated user's
    // hospital, zone, state and district assignments. Do not re-apply the old
    // browser-only filter here: hospitals do not carry a denormalized zone and
    // it could hide authorised claims returned by the server.
    if (isFinanceQueueUser) return claims;

    let filtered = claims;
    
    if (currentUser.role !== 'Super Admin' && !currentUser.isAdmin) {
      // Filter by assigned hospitals
      if (currentUser.assignedHospitalIds && currentUser.assignedHospitalIds.length > 0) {
        filtered = filtered.filter(c => currentUser.assignedHospitalIds?.includes(c.formData?.hospitalId));
      }
      
      // Filter by geography (Zone, State, District)
      const userZones = currentUser.zones || [];
      const userStates = currentUser.states || [];
      const userDistricts = currentUser.districts || [];

      if (userZones.length > 0 || userStates.length > 0 || userDistricts.length > 0) {
        filtered = filtered.filter(c => {
          const hospId = c.hospitalId || c.formData?.hospitalId;
          const hosp = hospitals.find(h => h.id === hospId);
          if (!hosp) return false;

          const zoneMatch = userZones.length === 0 || (hosp.zone && userZones.includes(hosp.zone));
          const stateMatch = userStates.length === 0 || (hosp.state && userStates.includes(hosp.state));
          const districtMatch = userDistricts.length === 0 || (hosp.district && userDistricts.includes(hosp.district));

          return zoneMatch && stateMatch && districtMatch;
        });
      }
    }
    
    return filtered;
  }, [claims, currentUser, hospitals, isFinanceQueueUser]);

  // Filter claims relevant to reconciliation (Discharge Approved onwards)
  const reconciliationClaims = useMemo(() => {
    const relevantStatuses = [
      ClaimStatus.DISCHARGE_APPROVED,
      ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
      ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
      ClaimStatus.FILE_DISPATCH_PENDING,
      ClaimStatus.FILE_DISPATCHED,
      ClaimStatus.CLAIM_UNDER_PROCESS,
      ClaimStatus.CLAIM_UNDER_QUERY,
      ClaimStatus.CLAIM_QUERY_RESOLVED,
      ClaimStatus.CLAIM_APPROVED,
      ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
      ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
      ClaimStatus.COMPLETE_SETTLEMENT,
      ClaimStatus.SETTLEMENT_FAILED,
      ClaimStatus.ACCOUNT_RECONCILIATION,
      ClaimStatus.BANK_RECONCILIATION_COMPLETED
    ];

    return accessibleClaims.filter(c => {
      const isRelevant = relevantStatuses.includes(c.status);
      if (!isRelevant) return false;

      // Finance/Accounts users have already been filtered by the backend
      // using their hospital and geographical scope. Do not apply the old
      // "created by me" hierarchy rule here: discharge-approved work is
      // created by hospital/operations users, not by the Finance user.
      if (isFinanceQueueUser) return true;

      // Hierarchy filtering for non-finance queues.
      if (!isManager) {
        return c.createdBy === currentUser.id;
      }

      // If manager, show their own and their reports'
      const reportsToMe = users.filter(u => u.reportsToId === currentUser.id).map(u => u.id);
      const isMineOrReport = c.createdBy === currentUser.id || (c.createdBy && reportsToMe.includes(c.createdBy));

      return currentUser.role === 'Super Admin' || currentUser.isAdmin || isMineOrReport;
    });
  }, [accessibleClaims, isManager, currentUser, users, isFinanceQueueUser]);

  // Until automated Email/RPA dispatch is enabled, every File Dispatched
  // claim returned by the backend belongs in Finance's manual settlement
  // queue. Visibility has already been enforced server-side.
  const manualSettlementClaims = useMemo(
    () => reconciliationClaims.filter((claim) => claim.status === ClaimStatus.FILE_DISPATCHED),
    [reconciliationClaims],
  );

  // The hospital directory can be intentionally partial for a scoped user.
  // Build the filter from backend-authorised claims as well, so Finance can
  // always filter every hospital whose settlement work it can see.
  const hospitalOptions = useMemo(() => {
    const options = new Map<string, string>();
    hospitals.forEach((hospital) => {
      if (hospital.id && hospital.hospitalName) options.set(hospital.id, hospital.hospitalName);
    });
    reconciliationClaims.forEach((claim) => {
      const id = claimHospitalId(claim);
      if (!id) return;
      options.set(id, claimHospitalName(claim) || options.get(id) || `Hospital ${id}`);
    });
    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [hospitals, reconciliationClaims]);

  // Calculate Aging and Buckets
  const claimsWithAging = useMemo(() => {
    const now = new Date();
    return reconciliationClaims.map(c => {
      const dispatchedDate = c.fileDispatchedDate ? new Date(c.fileDispatchedDate) : new Date(c.updatedAt);
      const diffTime = Math.abs(now.getTime() - dispatchedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let bucket: AgingBucket = '0-30';
      if (c.status === ClaimStatus.FILE_DISPATCHED && c.settlementStatus === 'Pending') {
        bucket = 'File Dispatched';
      } else {
        if (diffDays > 120) bucket = '120+';
        else if (diffDays > 90) bucket = '90-120';
        else if (diffDays > 60) bucket = '60-90';
        else if (diffDays > 45) bucket = '45-60';
        else if (diffDays > 30) bucket = '30-45';
      }

      const outstandingAmount = c.outstandingAmount ?? (c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.SETTLED || c.settlementStatus === 'Full' ? 0 : (Number(c.formData?.fin_app_amt) || 0));

      return { ...c, agingDays: diffDays, agingBucket: bucket, outstandingAmount };
    });
  }, [reconciliationClaims]);

  // Statistics
  const stats = useMemo(() => {
    const totalOutstanding = claimsWithAging.reduce((acc, c) => acc + getOutstandingAmt(c), 0);
    const pendingCases = claimsWithAging.filter(c => c.settlementStatus !== 'Full').length;
    const highAgingCases = claimsWithAging.filter(c => c.agingDays > 90).length;
    const fileDispatchedCases = claimsWithAging.filter(c => c.agingBucket === 'File Dispatched').length;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start of week
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let recoveredToday = 0;
    let recoveredThisWeek = 0;
    let recoveredThisMonth = 0;
    let recoveredThisYear = 0;

    accessibleClaims.forEach(c => {
      if (c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE || c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE) {
        // Use updated_at or settlement_date
        const settlementDateStr = c.formData?.settlement_date || c.updatedAt;
        if (settlementDateStr) {
          const settlementDate = new Date(settlementDateStr);
          const amount = c.paidAmount || c.formData?.fin_app_amt || 0;
          
          if (settlementDate >= today) {
            recoveredToday += amount;
          }
          if (settlementDate >= startOfWeek) {
            recoveredThisWeek += amount;
          }
          if (settlementDate >= startOfMonth) {
            recoveredThisMonth += amount;
          }
          if (settlementDate >= startOfYear) {
            recoveredThisYear += amount;
          }
        }
      }
    });
    
    // Calculate average TAT for settled claims
    const settledClaims = accessibleClaims.filter(c => c.status === ClaimStatus.COMPLETE_SETTLEMENT && c.fileDispatchedDate && c.formData?.settlement_date);
    const avgTAT = settledClaims.length > 0 
      ? settledClaims.reduce((acc, c) => {
          const start = new Date(c.fileDispatchedDate!);
          const end = new Date(c.formData!.settlement_date);
          return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / settledClaims.length
      : 14.5;

    return {
      totalOutstanding,
      pendingCases,
      recoveredToday,
      recoveredThisWeek,
      recoveredThisMonth,
      recoveredThisYear,
      highAgingCases,
      fileDispatchedCases,
      avgTAT: parseFloat(avgTAT.toFixed(1))
    };
  }, [claimsWithAging, accessibleClaims]);

  // Aging Buckets Data
  const bucketData = useMemo(() => {
    const buckets: Record<AgingBucket, { count: number; amount: number }> = {
      'File Dispatched': { count: 0, amount: 0 },
      '0-30': { count: 0, amount: 0 },
      '30-45': { count: 0, amount: 0 },
      '45-60': { count: 0, amount: 0 },
      '60-90': { count: 0, amount: 0 },
      '90-120': { count: 0, amount: 0 },
      '120+': { count: 0, amount: 0 }
    };

    claimsWithAging.forEach(c => {
      buckets[c.agingBucket].count++;
      buckets[c.agingBucket].amount += (c.outstandingAmount || 0);
    });

    return buckets;
  }, [claimsWithAging]);

  // AI Priority Logic
  const claimsWithAi = useMemo(() => {
    return claimsWithAging.map(claim => {
      if (!settings.enableAiSuggestions) return claim;

      let score = 0;
      let priority: 'High' | 'Medium' | 'Low' = 'Low';
      let action: 'Call' | 'Email' | 'Escalation' = 'Email';
      let reason = '';

      const amount = claim.outstandingAmount || 0;
      const aging = claim.agingDays;
      const reminders = claim.remindersSent || 0;
      
      // Calculate gap since last follow up
      let daysSinceLastFollowUp = aging; // Default to aging if no follow up
      if (claim.lastFollowUpDate) {
        const lastFollowUp = new Date(claim.lastFollowUpDate);
        daysSinceLastFollowUp = Math.floor((new Date().getTime() - lastFollowUp.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Mock Insurer Behavior Score (0-1) - In real app, this would come from historical data
      const insurerBehaviorScore = claim.insuranceProvider.includes('HDFC') ? 0.8 : 0.4; // 0.8 means slow response

      // Weighting based on settings
      const agingScore = (Math.min(aging, 120) / 120) * settings.scoringWeights.aging;
      const amountScore = (Math.min(amount, 500000) / 500000) * settings.scoringWeights.amount;
      const reminderScore = (Math.min(reminders, 5) / 5) * settings.scoringWeights.reminders;
      const behaviorScore = insurerBehaviorScore * settings.scoringWeights.insurerBehavior;
      
      // Extra weight for long gap without follow up
      const gapScore = daysSinceLastFollowUp > 15 ? 10 : 0;

      score = agingScore + amountScore + reminderScore + behaviorScore + gapScore;

      if (score >= 75 || aging >= 90) {
        priority = 'High';
        action = aging >= 120 || reminders >= 3 ? 'Escalation' : 'Call';
        reason = aging >= 90 ? 'Critical aging (>90 days)' : 'High priority score based on AI model';
      } else if (score >= 40 || aging >= 30) {
        priority = 'Medium';
        action = 'Call';
        reason = 'Follow-up needed for aging bucket (30-90 days)';
      } else {
        priority = 'Low';
        action = 'Email';
        reason = 'Standard follow-up (0-30 days)';
      }

      return {
        ...claim,
        aiFollowUpSuggestion: {
          priority,
          recommendedAction: action,
          reason,
          score: Math.min(100, Math.round(score))
        }
      };
    });
  }, [claimsWithAging, settings.enableAiSuggestions, settings.scoringWeights]);

  const highPriorityClaims = useMemo(() => {
    return claimsWithAi.filter(c => {
      const isHighPriority = c.aiFollowUpSuggestion?.priority === 'High' && c.settlementStatus !== 'Full';
      if (!isHighPriority) return false;
      
      // Check if actioned and if follow-up date is in the future
      const actionedDate = actionedClaims[c.id];
      if (actionedDate) {
        const nextFollowUp = new Date(actionedDate);
        if (nextFollowUp > new Date()) return false;
      }
      
      return true;
    });
  }, [claimsWithAi, actionedClaims]);

  // Filter options for Insurers and TPAs
  const insurerOptions = useMemo(() => {
    if (selectedHospitals.length === 0) {
      // Show complete list from props, but also include any from claims that might not be in master list
      const masterList = insurers.map(ins => ins.name);
      const claimList = Array.from(new Set(claimsWithAging.map(c => c.insuranceProvider)));
      const combined = Array.from(new Set([...masterList, ...claimList])).sort();
      return combined.map(ins => ({ label: ins, value: ins }));
    } else {
      // Filter by selected hospitals and pending settlement
      // Pending settlement means settlementStatus is not 'Full'
      const pendingInsurers = Array.from(new Set(
        reconciliationClaims
          .filter(c => selectedHospitals.includes(claimHospitalId(c)) && c.settlementStatus !== 'Full')
          .map(c => c.insuranceProvider)
      )).sort();
      return pendingInsurers.map(ins => ({ label: ins, value: ins }));
    }
  }, [insurers, selectedHospitals, reconciliationClaims, claimsWithAging]);

  const tpaOptions = useMemo(() => {
    if (selectedHospitals.length === 0) {
      // Show complete list
      const masterList = tpas.map(t => t.name);
      const claimList = Array.from(new Set(claimsWithAging.map(c => c.formData?.tpa_provider).filter(Boolean)));
      const combined = Array.from(new Set([...masterList, ...claimList])).sort();
      return combined.map(tpa => ({ label: tpa, value: tpa }));
    } else {
      // Filter by selected hospitals and pending settlement
      const pendingTpas = Array.from(new Set(
        reconciliationClaims
          .filter(c => selectedHospitals.includes(claimHospitalId(c)) && c.settlementStatus !== 'Full')
          .map(c => c.formData?.tpa_provider)
          .filter(Boolean)
      )).sort();
      return pendingTpas.map(tpa => ({ label: tpa, value: tpa }));
    }
  }, [tpas, selectedHospitals, reconciliationClaims, claimsWithAging]);

  // Smart Alerts & Notifications Logic
  useEffect(() => {
    const newNotifications: any[] = [];
    
    // High Aging Alert
    const highAging = claimsWithAi.filter(c => c.agingDays > 90 && c.settlementStatus !== 'Full');
    if (highAging.length > 0) {
      newNotifications.push({
        id: 'high-aging',
        type: 'High Aging',
        message: `${highAging.length} cases are over 90 days old.`,
        priority: 'High'
      });
    }

    // Overdue Follow-up
    const overdue = claimsWithAi.filter(c => {
      if (c.settlementStatus === 'Full') return false;
      if (!c.lastFollowUpDate) return true;
      const last = new Date(c.lastFollowUpDate);
      const diff = (new Date().getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      return diff > settings.reminderFrequencyDays;
    });

    if (overdue.length > 0) {
      newNotifications.push({
        id: 'overdue-followup',
        type: 'Overdue Follow-up',
        message: `${overdue.length} cases require immediate follow-up.`,
        priority: 'Medium'
      });
    }

    // Low Recovery Performance Alert
    const achievementRate = (stats.recoveredThisMonth / settings.recoveryTargets.monthly) * 100;
    if (achievementRate < 30 && new Date().getDate() > 10) {
      newNotifications.push({
        id: 'low-performance',
        type: 'Performance Warning',
        message: `Recovery achievement is low (${achievementRate.toFixed(1)}%). Action required.`,
        priority: 'High'
      });
    }

    // Priority cases not acted upon
    const highPriorityNotActed = claimsWithAi.filter(c => {
      if (c.settlementStatus === 'Full') return false;
      if (c.aiFollowUpSuggestion?.priority !== 'High') return false;
      if (!c.lastFollowUpDate) return true;
      const last = new Date(c.lastFollowUpDate);
      const diff = (new Date().getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 3; // High priority should be acted upon within 3 days
    });

    if (highPriorityNotActed.length > 0) {
      newNotifications.push({
        id: 'high-priority-not-acted',
        type: 'Action Required',
        message: `${highPriorityNotActed.length} high priority cases need immediate action.`,
        priority: 'Critical'
      });
    }

    setNotifications(newNotifications);
  }, [claimsWithAi, settings.reminderFrequencyDays, stats.recoveredThisMonth, settings.recoveryTargets.monthly]);

  // Recovery Prediction Model
  const recoveryForecast = useMemo(() => {
    if (!settings.enableForecasting) return null;

    let next7Days = 0;
    let next15Days = 0;
    let next30Days = 0;
    let probabilitySum = 0;
    let totalAnalyzed = 0;
    let delayRiskCount = 0;

    claimsWithAi.forEach(claim => {
      if (claim.settlementStatus === 'Full') return;

      const amount = claim.outstandingAmount || 0;
      const aging = claim.agingDays;
      
      // Mock historical recovery probability based on aging and insurer
      let baseProbability = 0.9; // 90% chance for new claims
      if (aging > 30) baseProbability = 0.7;
      if (aging > 60) baseProbability = 0.5;
      if (aging > 90) baseProbability = 0.3;
      if (aging > 120) baseProbability = 0.1;

      // Adjust based on insurer behavior
      const isSlowInsurer = claim.insuranceProvider.includes('HDFC');
      if (isSlowInsurer) baseProbability -= 0.15;

      // Adjust based on reminders (more reminders without response = lower probability)
      if (claim.remindersSent && claim.remindersSent > 2) baseProbability -= 0.1;

      const probability = Math.max(0, Math.min(1, baseProbability));
      
      probabilitySum += probability;
      totalAnalyzed++;

      if (probability < 0.4) delayRiskCount++;

      // Estimate timeline based on probability and aging
      if (probability > 0.8) {
        next7Days += amount * probability;
      } else if (probability > 0.6) {
        next15Days += amount * probability;
      } else if (probability > 0.3) {
        next30Days += amount * probability;
      }
    });

    return {
      next7Days,
      next15Days,
      next30Days,
      averageProbability: totalAnalyzed > 0 ? (probabilitySum / totalAnalyzed) * 100 : 0,
      delayRiskCount
    };
  }, [claimsWithAi, settings.enableForecasting]);

  // Sorting Logic
  const sortedClaims = useMemo(() => {
    let sortableItems = [...claimsWithAi];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [claimsWithAi, sortConfig]);

  // Final Filtered List
  const filteredClaims = useMemo(() => {
    return sortedClaims.filter(c => {
      const searchLower = searchQuery.toLowerCase();
      const utrNo = (c.formData?.utr_number || c.formData?.utr_no || c.formData?.set_utr_no || c.formData?.utr || c.formData?.utrNumber || '').toLowerCase();
      const caseId = claimBusinessCaseId(c).toLowerCase();
      const claimNo = claimBusinessNumber(c).toLowerCase();
      const ipdNo = (c.formData?.p_uhid || '').toLowerCase();
      const formDataStr = JSON.stringify(c.formData || {}).toLowerCase();

      const matchesSearch = c.patientName.toLowerCase().includes(searchLower) || 
                            caseId.includes(searchLower) ||
                            utrNo.includes(searchLower) ||
                            claimNo.includes(searchLower) ||
                            ipdNo.includes(searchLower) ||
                            formDataStr.includes(searchLower);
      const matchesBucket = selectedBucket === 'All' || c.agingBucket === selectedBucket;
      const matchesHospital = selectedHospitals.length === 0 || selectedHospitals.includes(claimHospitalId(c));
      const matchesInsurance = selectedInsurances.length === 0 || selectedInsurances.includes(c.insuranceProvider);
      const matchesTpa = selectedTpas.length === 0 || selectedTpas.includes(c.formData?.tpa_provider);
      
      return matchesSearch && matchesBucket && matchesHospital && matchesInsurance && matchesTpa;
    });
  }, [sortedClaims, searchQuery, selectedBucket, selectedHospitals, selectedInsurances, selectedTpas]);

  // Pagination
  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClaims.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClaims, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);

  const requestSort = (key: keyof Claim | 'agingDays') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExcelDownload = (dataToExport: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(c => ({
      'Hospital': claimHospitalName(c) || hospitals.find(h => h.id === claimHospitalId(c))?.hospitalName || 'N/A',
      'Patient Name': c.patientName,
      'Case ID': claimBusinessCaseId(c),
      'Claim No': claimBusinessNumber(c),
      'Insurance Provider': c.insuranceProvider,
      'TPA': c.formData?.tpa_provider || 'N/A',
      'Aging (Days)': c.agingDays,
      'Outstanding Amount': c.outstandingAmount || c.formData?.fin_app_amt || 0,
      'Paid Amount': c.paidAmount || 0,
      'Status': c.status || c.settlementStatus || 'Pending',
      'Dispatched Date': c.fileDispatchedDate ? formatDate(c.fileDispatchedDate) : 'N/A'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reconciliation Data");
    XLSX.writeFile(workbook, `Reconciliation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkEmail = () => {
    const selectedData = claimsWithAging.filter(c => selectedClaims.includes(c.id));
    if (selectedData.length === 0) return;

    let recipientEmail = '';
    if (emailData.recipientType === 'Insurer') {
      const insurer = insurers.find(i => i.name === selectedData[0].insuranceProvider);
      recipientEmail = insurer?.emailId || '';
    } else if (emailData.recipientType === 'TPA') {
      const tpa = tpas.find(t => t.name === selectedData[0].formData?.tpa_provider);
      recipientEmail = tpa?.emailId || '';
    } else if (emailData.recipientType === 'Hospital') {
      const hospital = hospitals.find(h => h.id === selectedData[0].formData?.hospitalId);
      recipientEmail = hospital?.emailId || '';
    }

    const subject = `Follow-up: Outstanding Claims - ${selectedData.length} Cases`;
    const body = `Dear ${emailData.recipientType} Team,\n\nPlease find the list of outstanding claims for reconciliation:\n\n` +
      selectedData.map(c => {
        return `- Claim: ${c.id}, Patient: ${c.patientName}, Outstanding: ₹${(c.outstandingAmount || c.formData?.fin_app_amt || 0).toLocaleString()}, Aging: ${c.agingDays} days`;
      }).join('\n') +
      `\n\nTotal Outstanding: ₹${selectedData.reduce((acc, c) => acc + (c.outstandingAmount || c.formData?.fin_app_amt || 0), 0).toLocaleString()}\n\nRegards,\nReconciliation Team\nClaimNX Portal`;
    
    setEmailData(prev => ({ ...prev, to: recipientEmail, subject, body }));
    setShowBulkEmailModal(true);

    // Simulated log entry
    const newLog: ReminderLog = {
      id: `log-${Date.now()}`,
      claimId: selectedData.length === 1 ? selectedData[0].id : 'Multiple',
      sentDate: new Date().toISOString(),
      recipient: recipientEmail,
      recipientType: emailData.recipientType,
      status: 'Sent',
      templateUsed: 'Standard Follow-up'
    };
    setReminderLogs(prev => [newLog, ...prev]);
  };

  // Update email when recipient type changes
  useEffect(() => {
    if (showBulkEmailModal && selectedClaims.length > 0) {
      const selectedData = claimsWithAging.filter(c => selectedClaims.includes(c.id));
      if (selectedData.length > 0) {
        const firstClaim = selectedData[0];
        let recipientEmail = '';
        if (emailData.recipientType === 'Insurer') {
          const insurer = insurers.find(i => i.name === firstClaim.insuranceProvider);
          recipientEmail = insurer?.emailId || '';
        } else if (emailData.recipientType === 'TPA') {
          const tpa = tpas.find(t => t.name === firstClaim.formData?.tpa_provider);
          recipientEmail = tpa?.emailId || '';
        } else if (emailData.recipientType === 'Hospital') {
          const hospital = hospitals.find(h => h.id === firstClaim.formData?.hospitalId);
          recipientEmail = hospital?.emailId || '';
        }
        
        const subject = `Follow-up: Outstanding Claims - ${selectedData.length} Cases`;
        const body = `Dear ${emailData.recipientType} Team,\n\nPlease find the list of outstanding claims for reconciliation:\n\n` +
          selectedData.map(c => {
            return `- Claim: ${c.id}, Patient: ${c.patientName}, Outstanding: ₹${(c.outstandingAmount || 0).toLocaleString()}, Aging: ${c.agingDays} days`;
          }).join('\n') +
          `\n\nTotal Outstanding: ₹${selectedData.reduce((acc, c) => acc + (c.outstandingAmount || 0), 0).toLocaleString()}\n\nRegards,\nReconciliation Team\nClaimNX Portal`;
          
        setEmailData(prev => ({ ...prev, to: recipientEmail, subject, body }));
      }
    }
  }, [emailData.recipientType, showBulkEmailModal]);

  const handleSettlementUpdate = () => {
    if (!showSettlementModal) return;

    const updatedClaim: Claim = {
      ...showSettlementModal,
      settlementStatus: settlementData.status,
      paidAmount: settlementData.paidAmount,
      outstandingAmount: (showSettlementModal.formData?.fin_app_amt || 0) - settlementData.paidAmount,
      reconciliationRemarks: settlementData.remarks,
      updatedAt: new Date().toISOString(),
      status: settlementData.status === 'Full' ? ClaimStatus.COMPLETE_SETTLEMENT : showSettlementModal.status
    };

    // Add to history
    const newEvent: TimelineEvent = {
      id: `recon-${Date.now()}`,
      status: updatedClaim.status,
      date: new Date().toISOString(),
      type: 'status_change',
      comment: `Reconciliation Update: ${settlementData.status} Settlement. Paid: ₹${settlementData.paidAmount}. Remarks: ${settlementData.remarks}`
    };
    updatedClaim.history = [newEvent, ...updatedClaim.history];

    onUpdateClaim(updatedClaim);
    setShowSettlementModal(null);
    setSettlementData({ status: 'Pending', paidAmount: 0, remarks: '', proof: null });
  };

  const handleManualInitiateSettlement = (claim: Claim) => {
    const updatedClaim: Claim = {
      ...claim,
      status: ClaimStatus.CLAIM_UNDER_PROCESS,
      formData: {
        ...(claim.formData || {}),
        rpa_email_failed: false,
        manual_finance_dispatch: true,
        finance_dispatched_at: new Date().toISOString()
      },
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: `recon-failed-resolved-${Date.now()}`,
          status: ClaimStatus.CLAIM_UNDER_PROCESS,
          date: new Date().toISOString(),
          type: 'status_change',
          comment: "Claim file successfully submitted manually to Insurer/TPA for Settlement. (Manually resolved by Finance Team - RPA/Email bypassed)."
        },
        ...(claim.history || [])
      ]
    };
    
    onUpdateClaim(updatedClaim);
    toast.success(`Claim file successfully submitted to Insurer/TPA for Settlement.`, {
      duration: 6000,
      description: `Case ID: ${claim.id}. Routed back to normal claim progress.`
    });
  };

  const toggleClaimSelection = (id: string) => {
    setSelectedClaims(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllClaims = () => {
    if (selectedClaims.length === filteredClaims.length) {
      setSelectedClaims([]);
    } else {
      setSelectedClaims(filteredClaims.map(c => c.id));
    }
  };

  const assignedHospitals = useMemo(() => {
    return hospitals.filter(h => {
      if (currentUser?.isAdmin || currentUser?.role === 'Super Admin') return true;
      const assignedIds = currentUser?.assignedHospitalIds || [];
      return assignedIds.includes(h.id);
    });
  }, [hospitals, currentUser]);

  return (
    <div className="p-8 bg-[#E4E3E0] min-h-screen font-sans text-[#141414]">
      <div className="max-w-full px-4 xl:px-8 mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#141414] pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#141414] text-[#E4E3E0] rounded-full flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tighter italic font-serif">Reconciliation Control</h1>
            </div>
            <p className="text-[#141414]/60 text-xs font-bold uppercase tracking-[0.2em]">Post-Dispatch Claim Recovery & Aging Management</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowDownloadModal(true)}
              className="px-6 py-3 bg-[#000080] text-[#E4E3E0] rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-900 transition-all active:scale-95 flex items-center"
            >
              <Download size={16} className="mr-2" />
              Download Report
            </button>
            <button 
              onClick={() => setShowManualModal(true)}
              className="px-6 py-3 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/20 hover:bg-orange-600 transition-all active:scale-95 flex items-center"
            >
              <Send size={16} className="mr-2" />
              Manual Dispatch
            </button>
            <div className="relative group">
              <button className="p-3 bg-white border border-[#141414]/10 rounded-full text-[#141414]/60 hover:text-[#141414] hover:border-[#141414] transition-all relative">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              <div className="absolute top-full right-0 mt-4 w-80 bg-white rounded-3xl border border-[#141414] shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-6 border-b border-[#141414]/10 bg-[#F8F8F7]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Smart Alerts</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-xs font-bold text-[#141414]/40">No new alerts</p>
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className="p-6 border-b border-[#141414]/5 hover:bg-[#F8F8F7] transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-2 h-2 rounded-full ${n.priority === 'High' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                          <p className="text-[10px] font-black uppercase tracking-widest">{n.type}</p>
                        </div>
                        <p className="text-xs font-bold text-[#141414]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>



          <button 
            onClick={() => {
              const firstClaim = claimsWithAging.find(c => c.id === selectedClaims[0]);
                if (firstClaim) {
                  const hasTpa = firstClaim.formData?.tpa_provider && firstClaim.formData.tpa_provider !== 'None';
                  const defaultType = hasTpa ? 'TPA' : 'Insurer';
                  setEmailData(prev => ({ ...prev, recipientType: defaultType }));
                }
                setShowBulkEmailModal(true);
              }}
              disabled={selectedClaims.length === 0}
              className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${
                selectedClaims.length > 0 
                  ? 'bg-[#141414] text-[#E4E3E0] hover:scale-105 active:scale-95' 
                  : 'bg-[#141414]/10 text-[#141414]/30 cursor-not-allowed'
              }`}
            >
              <Mail size={14} /> Bulk Follow-up ({selectedClaims.length})
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#141414]/5 p-1 rounded-2xl w-fit">
          {(['Dashboard', 'Initiate Settlement', 'Emails', 'Performance', 'Automation'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-white text-[#141414] shadow-sm' 
                  : 'text-[#141414]/40 hover:text-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2">
                {tab === 'Dashboard' && <Activity size={14} />}
                {tab === 'Initiate Settlement' && <Send size={14} />}
                {tab === 'Emails' && <Mail size={14} />}
                {tab === 'Performance' && <Trophy size={14} />}
                {tab === 'Automation' && <Zap size={14} />}
                <span>{tab}</span>
                {tab === 'Initiate Settlement' && manualSettlementClaims.length > 0 && (
                  <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-[8px] font-bold animate-pulse">
                    {manualSettlementClaims.length}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {activeTab === 'Dashboard' && (
          <>

            {/* Priority Cases Section */}
            {settings.enableAiSuggestions && highPriorityClaims.length > 0 && (
              <div className="bg-rose-50 rounded-[2.5rem] border border-rose-200 p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black uppercase tracking-widest text-rose-700 flex items-center gap-2">
                    <ShieldAlert size={20} /> High Priority Action Required
                  </h2>
                  <button 
                    onClick={() => setShowAllPriorityModal(true)}
                    className="px-4 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-rose-600 transition-colors shadow-sm"
                  >
                    {highPriorityClaims.length} Cases • View All
                  </button>
                </div>
                
                <div className="relative">
                  <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth snap-x">
                    {highPriorityClaims.map(claim => (
                      <div key={claim.id} className="min-w-[300px] md:min-w-[350px] bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between snap-start hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-black uppercase tracking-widest">{claim.id}</p>
                            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-md">{claim.aiFollowUpSuggestion?.score} Score</span>
                          </div>
                          <p className="text-sm font-bold mb-1">{claim.patientName}</p>
                          <p className="text-[10px] font-bold text-[#141414]/60 uppercase tracking-widest mb-4">{claim.insuranceProvider}</p>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-[#141414]/40 uppercase tracking-widest">Amount:</span>
                              <span>₹{((claim.outstandingAmount || 0) / 1000).toFixed(1)}K</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-[#141414]/40 uppercase tracking-widest">Aging:</span>
                              <span className={claim.agingDays > 90 ? 'text-rose-600' : ''}>{claim.agingDays} Days</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-[#141414]/40 uppercase tracking-widest">Reason:</span>
                              <span className="text-rose-600 truncate max-w-[150px]" title={claim.aiFollowUpSuggestion?.reason}>{claim.aiFollowUpSuggestion?.reason}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            setConfirmActionClaim(claim);
                          }}
                          className="w-full py-2 bg-[#141414] text-[#E4E3E0] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                        >
                          {claim.aiFollowUpSuggestion?.recommendedAction === 'Call' ? <Phone size={14} /> : claim.aiFollowUpSuggestion?.recommendedAction === 'Email' ? <Mail size={14} /> : <AlertTriangle size={14} />}
                          {claim.aiFollowUpSuggestion?.recommendedAction} Now
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Scroll Indicators */}
                  {highPriorityClaims.length > 3 && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                       <div className="w-1 h-12 bg-rose-200 rounded-full opacity-50"></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            label="Total Outstanding" 
            value={`₹${(stats.totalOutstanding / 100000).toFixed(2)}L`} 
            icon={IndianRupee} 
            trend="+4.2%" 
            trendUp={false}
          />
          <KPICard 
            label="Recovered MTD" 
            value={`₹${(stats.recoveredThisMonth / 100000).toFixed(2)}L`} 
            icon={TrendingUp} 
            trend="On Track" 
            trendUp={true}
          />
          <KPICard 
            label="Avg Settlement TAT" 
            value={`${stats.avgTAT} Days`} 
            icon={BarChart3} 
            trend="-1.2 Days" 
            trendUp={true}
          />
          <KPICard 
            label="High Aging (>90 Days)" 
            value={stats.highAgingCases.toString()} 
            icon={AlertTriangle} 
            trend="-2" 
            trendUp={true}
            critical={stats.highAgingCases > 0}
          />
        </div>

        {/* Aging Buckets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#141414]/60 flex items-center gap-2">
                <Clock size={14} /> Aging Analysis Buckets
              </h2>
              <span className="px-3 py-1 bg-[#141414] text-[#E4E3E0] rounded-full text-sm font-black uppercase tracking-widest">
                {claimsWithAging.length} Total Pending
              </span>
            </div>
            <button 
              onClick={() => setSelectedBucket('All')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${selectedBucket === 'All' ? 'text-[#141414]' : 'text-[#141414]/40 hover:text-[#141414]'}`}
            >
              Reset View
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {(Object.keys(bucketData) as AgingBucket[]).map(bucket => (
              <button 
                key={bucket}
                onClick={() => setSelectedBucket(bucket)}
                className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden group ${
                  selectedBucket === bucket 
                    ? 'bg-[#141414] border-[#141414] text-[#E4E3E0] shadow-xl scale-105 z-10' 
                    : 'bg-white border-[#141414]/10 hover:border-[#141414] text-[#141414]'
                }`}
              >
                <div className="relative z-10">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedBucket === bucket ? 'text-[#E4E3E0]/60' : 'text-[#141414]/40'}`}>
                    {bucket === 'File Dispatched' ? 'Dispatched' : `${bucket} Days`}
                  </p>
                  <h4 className="text-2xl font-black mb-1">{bucketData[bucket].count}</h4>
                  <p className={`text-[10px] font-bold ${selectedBucket === bucket ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    ₹{(bucketData[bucket].amount / 1000).toFixed(1)}K
                  </p>
                </div>
                {(bucket === '90-120' || bucket === '120+') && bucketData[bucket].count > 0 && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Data Grid */}
        <div className="bg-white rounded-[2.5rem] border border-[#141414] shadow-2xl overflow-hidden">
          {/* Filters Bar */}
          <div className="p-8 border-b border-[#141414]/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#F8F8F7]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/40 group-focus-within:text-[#141414] transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search Claim, UTR, IPD..." 
                  className="pl-12 pr-4 py-3 bg-white border border-[#141414]/10 rounded-xl text-xs font-bold text-[#141414] outline-none focus:ring-4 focus:ring-[#141414]/5 focus:border-[#141414] transition-all w-full md:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <MultiSelect 
                options={hospitalOptions}
                selected={selectedHospitals}
                onChange={setSelectedHospitals}
                placeholder="Hospitals"
              />

              <MultiSelect 
                options={insurerOptions}
                selected={selectedInsurances}
                onChange={setSelectedInsurances}
                placeholder="Insurers"
              />

              <MultiSelect 
                options={tpaOptions}
                selected={selectedTpas}
                onChange={setSelectedTpas}
                placeholder="TPAs"
              />
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleExcelDownload(filteredClaims)}
                className="p-3 bg-white border border-[#141414]/10 rounded-xl text-[#141414]/60 hover:text-[#141414] hover:border-[#141414] transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <FileSpreadsheet size={18} /> Export All
              </button>
              <button 
                onClick={() => handleExcelDownload(claims.filter(c => selectedClaims.includes(c.id)))}
                disabled={selectedClaims.length === 0}
                className={`p-3 border rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${selectedClaims.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                <Download size={18} /> Export Selected ({selectedClaims.length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1200px] text-left border-collapse">
              <thead>
                <tr className="bg-[#141414] text-[#E4E3E0] text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-4 py-5 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="accent-[#E4E3E0]" 
                      checked={selectedClaims.length === filteredClaims.length && filteredClaims.length > 0}
                      onChange={selectAllClaims}
                    />
                  </th>
                  <th className="px-4 py-5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => requestSort('patientName')}>
                    <div className="flex items-center gap-2">Patient / Hospital <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => requestSort('id')}>
                    <div className="flex items-center gap-2">Claim No / Insurance <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-5">Product</th>
                  <th className="px-4 py-5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => requestSort('agingDays')}>
                    <div className="flex items-center gap-2">Aging <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => requestSort('outstandingAmount')}>
                    <div className="flex items-center gap-2">Outstanding <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-5">Status</th>
                  <th className="px-4 py-5">AI Priority</th>
                  <th className="px-4 py-5 text-center">Pending / Approved TAT</th>
                  <th className="px-4 py-5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]/10">
                {paginatedClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-[#141414]/5 transition-colors group">
                    <td className="px-4 py-6 text-center">
                      <input 
                        type="checkbox" 
                        className="accent-[#141414]" 
                        checked={selectedClaims.includes(claim.id)}
                        onChange={() => toggleClaimSelection(claim.id)}
                      />
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#141414]/5 flex items-center justify-center text-[#141414]/40 font-black text-xs group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-all flex-shrink-0">
                          {claim.patientName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="flex flex-col">
                            <Link to={`/process-claim/${claim.id}?source=recon`} className="text-sm font-black text-[#141414] hover:text-blue-600 transition-colors truncate">
                              {claim.patientName === 'Unknown' ? '---' : claim.patientName}
                            </Link>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Case ID: {claimBusinessCaseId(claim)}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 truncate max-w-[150px]">
                            {claimHospitalName(claim) || hospitals.find(h => h.id === claimHospitalId(claim))?.hospitalName || ' --- '}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <p className="text-xs font-mono font-bold text-[#141414]">{claimBusinessNumber(claim)}</p>
                      <p className="text-[10px] font-bold text-[#141414]/60 truncate max-w-[150px]">{claim.insuranceProvider}</p>
                    </td>
                    <td className="px-4 py-6">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                        {claim.product || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black whitespace-nowrap ${claim.agingDays > 60 ? 'text-rose-600' : 'text-[#141414]'}`}>
                          {claim.agingDays} Days
                        </span>
                        {claim.agingDays > 90 && <AlertTriangle size={12} className="text-rose-500" />}
                      </div>
                      <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest whitespace-nowrap">
                        Dispatched: {formatDate(claim.fileDispatchedDate || claim.updatedAt)}
                      </p>
                    </td>
                    <td className="px-4 py-6">
                      <p className="text-sm font-black text-[#141414] whitespace-nowrap">
                        ₹{getOutstandingAmt(claim).toLocaleString()}
                      </p>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                        Paid: ₹{(claim.paidAmount || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
                        claim.status === ClaimStatus.COMPLETE_SETTLEMENT
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : claim.settlementStatus === 'Full'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                          : claim.settlementStatus === 'Partial'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {claim.status || claim.settlementStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-6">
                      {claim.aiFollowUpSuggestion && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${
                              claim.aiFollowUpSuggestion.priority === 'High' ? 'bg-rose-100 text-rose-600' :
                              claim.aiFollowUpSuggestion.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                              'bg-emerald-100 text-emerald-600'
                            }`}>
                              {claim.aiFollowUpSuggestion.priority}
                            </span>
                            <span className="text-[10px] font-bold text-[#141414]/60">{claim.aiFollowUpSuggestion.score}%</span>
                          </div>
                          <p className="text-[9px] font-bold text-[#141414]/40 flex items-center gap-1 italic whitespace-nowrap">
                            {claim.aiFollowUpSuggestion.recommendedAction === 'Call' && <Phone size={10} />}
                            {claim.aiFollowUpSuggestion.recommendedAction === 'Email' && <Mail size={10} />}
                            {claim.aiFollowUpSuggestion.recommendedAction === 'Escalation' && <ShieldAlert size={10} />}
                            {claim.aiFollowUpSuggestion.recommendedAction}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-6">
                      {(() => {
                        const isApproved = claim.status === ClaimStatus.COMPLETE_SETTLEMENT || claim.status === ClaimStatus.SETTLED;
                        const tatValue = formatTAT(claim.createdAt, isApproved ? (claim.formData?.settlement_date || claim.updatedAt) : new Date().toISOString());
                        return (
                          <div className="flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600 tabular-nums">{tatValue}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedClaims([claim.id]);
                            setEmailData(prev => ({ ...prev, recipientType: 'Hospital' }));
                            handleBulkEmail();
                          }}
                          className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                          title="Remind Hospital"
                        >
                          <Mail size={14} />
                        </button>
                        <button 
                          onClick={() => navigate(`/process-claim/${claim.id}?source=recon`, { state: { from: '/reconciliation-dashboard' } })}
                          className="px-4 py-2 bg-[#141414] text-[#E4E3E0] rounded-lg hover:scale-105 transition-all shadow-md text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                          title="View Case"
                        >
                          View Case
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="p-8 bg-[#F8F8F7] border-t border-[#141414]/10 flex items-center justify-between">
              <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest">
                Showing {Math.min(filteredClaims.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredClaims.length, currentPage * itemsPerPage)} of {filteredClaims.length} cases
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-[#141414]/10 hover:bg-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button 
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-white border border-[#141414]/10'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-[#141414]/10 hover:bg-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

        {activeTab === 'Initiate Settlement' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {selectedFailedClaim ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Back & Action Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#F8F8F7] p-4 rounded-3xl border border-[#141414]/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setSelectedFailedClaim(null)}
                      className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-800 rounded-2xl text-xs font-bold text-[#141414] transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none"
                    >
                      <ChevronLeft size={16} />
                      BACK TO LIST
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/patient-dashboard/${encodeURIComponent(selectedFailedClaim.patientName)}?claimId=${encodeURIComponent(selectedFailedClaim.id)}&source=recon`);
                      }}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm select-none"
                    >
                      <Eye size={14} />
                      VIEW PATIENT DASHBOARD
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full animate-pulse flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      MANUAL SETTLEMENT REQUIRED
                    </span>
                    <span className="bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-mono font-bold px-3 py-1.5 rounded-full">
                      {selectedFailedClaim.id}
                    </span>
                  </div>
                </div>

                {/* 2-Column Responsive Board */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column (1/3 size) - Information & History */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Card 1: Patient summary card */}
                    <div className="bg-white rounded-[2.5rem] border border-[#141414] p-6 hover:shadow-xl transition-all space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center text-2xl font-black font-serif shadow-inner border border-purple-100 shrink-0">
                          {selectedFailedClaim.patientName?.[0] || 'P'}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-xl font-black uppercase tracking-tight font-serif text-[#141414] leading-none">
                            {selectedFailedClaim.patientName}
                          </h3>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            {selectedFailedClaim.insuranceProvider}
                          </p>
                        </div>
                      </div>

                      <div className="h-px bg-[#141414]/15" />

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">AMOUNT</span>
                          <span className="text-sm font-bold text-[#141414] font-sans">
                            ₹{Number(selectedFailedClaim.formData?.fin_app_amt || selectedFailedClaim.formData?.approved_amt || selectedFailedClaim.formData?.pre_auth_app_amt || selectedFailedClaim.formData?.dis_total_bill || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">POLICY NO</span>
                          <span className="text-sm font-bold text-[#141414] font-sans truncate block">
                            {selectedFailedClaim.formData?.policy_no || 'POL-82058355'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">DIAGNOSIS</span>
                          <span className="text-sm font-bold text-slate-700 truncate block">
                            {selectedFailedClaim.formData?.diagnosis || selectedFailedClaim.diagnosis || 'Diagnosis Recorded'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">CURRENT STAGE</span>
                          <span className="inline-flex py-0.5 text-[10px] font-semibold text-blue-700">
                            {selectedFailedClaim.status}
                          </span>
                        </div>
                      </div>

                      {/* Error card */}
                      <div className="bg-rose-50/70 border border-rose-100 rounded-[1.5rem] p-5 space-y-2">
                        <div className="flex items-center gap-2 text-rose-700">
                          <AlertTriangle size={15} />
                          <span className="text-[10px] font-black uppercase tracking-widest">FAILURE REASON</span>
                        </div>
                        <p className="text-xs font-medium text-rose-800 leading-relaxed">
                          {selectedFailedClaim.formData?.file_dispatch_comment || "System timeout during RPA handshake. Portal credentials might be stale or portal structure changed."}
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Recent History block */}
                    <div className="bg-[#0C1523] text-white rounded-[2.5rem] p-6 space-y-6 shadow-2xl relative overflow-hidden">
                      <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-[#4285F4]/5 rounded-full blur-2xl" />
                      
                      <div className="flex items-center gap-2 text-[#4285F4]">
                        <Clock size={16} />
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-100">RECENT HISTORY</h4>
                      </div>

                      {selectedFailedClaim.history && selectedFailedClaim.history.length > 0 ? (
                        <div className="relative border-l border-slate-700 ml-2.5 pl-5 space-y-6 py-2 text-left">
                          {selectedFailedClaim.history.slice(0, 4).map((historyObj, histIdx) => {
                            const dateStr = historyObj.date ? new Date(historyObj.date).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            }) : '';

                            return (
                              <div key={histIdx} className="relative group">
                                {/* Dot */}
                                <span className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[#0C1523] group-hover:scale-125 transition-transform" />
                                <div className="space-y-1">
                                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-100 font-sans">
                                    {historyObj.status}
                                  </div>
                                  {historyObj.comment && (
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                      {historyObj.comment}
                                    </p>
                                  )}
                                  <div className="text-[9px] text-[#4285F4] font-mono leading-none pt-0.5">
                                    {dateStr}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No automated history records found.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column (2/3 size) - Tabbed Panel */}
                  <div className="lg:col-span-8 text-left">
                    <div className="bg-white rounded-[2.5rem] border border-[#141414] shadow-2xl overflow-hidden flex flex-col min-h-[550px]">
                      
                      {/* Tabs Navigation */}
                      <div className="border-b border-[#141414]/10 bg-[#F8F8F7] px-6 py-4 flex flex-wrap items-center gap-1">
                        {[
                          { key: 'Email Resend', label: 'EMAIL RESEND' },
                          { key: 'Portal Submission', label: 'PORTAL SUBMISSION' },
                          { key: 'View Documents', label: 'VIEW DOCUMENTS' },
                          { key: 'Timeline', label: 'TIMELINE' },
                          { key: 'Final Assessment', label: 'FINAL ASSESSMENT' }
                        ].map(tabItem => {
                          const isActive = activeFailedClaimTab === tabItem.key;
                          return (
                            <button
                              key={tabItem.key}
                              onClick={() => {
                                // Cast explicitly to avoid type mismatches
                                setActiveFailedClaimTab(tabItem.key as any);
                              }}
                              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                isActive 
                                  ? 'bg-blue-600 text-white shadow-md' 
                                  : 'hover:bg-slate-200/50 text-slate-500'
                              }`}
                            >
                              {tabItem.key === 'Email Resend' && <Mail size={13} />}
                              {tabItem.key === 'Portal Submission' && <Globe size={13} />}
                              {tabItem.key === 'View Documents' && <Eye size={13} />}
                              {tabItem.key === 'Timeline' && <Clock size={13} />}
                              {tabItem.key === 'Final Assessment' && <FileText size={13} />}
                              {tabItem.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Tab Contents */}
                      <div className="p-8 flex-1 flex flex-col justify-between">
                        
                        {/* TAB 1: EMAIL RESEND */}
                        {activeFailedClaimTab === 'Email Resend' && (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-1.5 text-left">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">FROM (SENDER EMAIL)</label>
                                <input
                                  type="text"
                                  disabled
                                  value={`hospital@claimnx.com`}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold font-sans outline-none cursor-not-allowed"
                                />
                              </div>
                              <div className="space-y-1.5 text-left">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">TO (INSURER/TPA)</label>
                                <input
                                  type="text"
                                  value={failedClaimEmailTo}
                                  onChange={(e) => setFailedClaimEmailTo(e.target.value)}
                                  className="w-full px-4 py-3 bg-white border border-slate-300 hover:border-slate-800 focus:border-[#141414] text-[#141414] rounded-xl text-xs font-bold font-sans outline-none transition-colors"
                                  placeholder="Enter insurer contact"
                                />
                              </div>
                              <div className="space-y-1.5 text-left">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">CC (HOSPITAL BILLING)</label>
                                <input
                                  type="text"
                                  value={failedClaimEmailCc}
                                  onChange={(e) => setFailedClaimEmailCc(e.target.value)}
                                  className="w-full px-4 py-3 bg-white border border-slate-300 hover:border-slate-800 focus:border-[#141414] text-[#141414] rounded-xl text-xs font-bold font-sans outline-none transition-colors"
                                  placeholder="Enter cc address"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 text-left">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">EMAIL BODY</label>
                              <textarea
                                value={failedClaimEmailBody}
                                onChange={(e) => setFailedClaimEmailBody(e.target.value)}
                                rows={8}
                                className="w-full px-5 py-4 bg-white border border-slate-300 hover:border-slate-800 focus:border-[#141414] text-[#141414] rounded-2xl text-xs font-semibold leading-relaxed font-sans outline-none transition-colors resize-none"
                              />
                            </div>

                            {/* Attachments panel */}
                            <div className="p-4 bg-[#F8F8F7] border border-[#141414]/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                  <FileText size={18} />
                                </div>
                                <div>
                                  <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-800">ATTACHMENTS</h5>
                                  <p className="text-[9px] font-bold text-slate-400 font-mono">
                                    Enclosed: 1. Main_Dossier_Draft.pdf (1.2 MB), 2. POD_Signed_Receipt.pdf (450 KB)
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  toast.info("Patient Dossier Files Locked", {
                                    description: "All clinical files are sealed and attached sequentially based on pre-audited hospital documents."
                                  });
                                }}
                                className="px-4 py-2 bg-white border border-[#141414]/10 hover:border-[#141414] rounded-xl text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm cursor-pointer select-none"
                              >
                                MANAGE FILES
                              </button>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-[#141414]/10 mt-6">
                              <button
                                onClick={() => {
                                  // Simulate resending
                                  const updatedClaim: Claim = {
                                    ...selectedFailedClaim,
                                    status: ClaimStatus.CLAIM_UNDER_PROCESS,
                                    formData: {
                                      ...(selectedFailedClaim.formData || {}),
                                      rpa_email_failed: false,
                                      manual_email_sent: true,
                                      manual_email_dt: new Date().toISOString()
                                    },
                                    updatedAt: new Date().toISOString(),
                                    history: [
                                      {
                                        id: `manual-email-${Date.now()}`,
                                        status: ClaimStatus.CLAIM_UNDER_PROCESS,
                                        date: new Date().toISOString(),
                                        type: 'status_change',
                                        comment: `Claim file manually resent via Finance Email client to ${failedClaimEmailTo}. CC: ${failedClaimEmailCc}. Blockage resolved.`
                                      },
                                      ...(selectedFailedClaim.history || [])
                                    ]
                                  };
                                  onUpdateClaim(updatedClaim);
                                  toast.success(`Dossier email successfully dispatched!`, {
                                    duration: 6000,
                                    description: `Case ID: ${selectedFailedClaim.id}. Auto-routed back to 'Under Process' normal workflow.`
                                  });
                                  setSelectedFailedClaim(null);
                                }}
                                className="px-7 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md select-none"
                              >
                                <Send size={14} />
                                SEND EMAIL
                              </button>
                            </div>
                          </div>
                        )}

                        {/* TAB 2: PORTAL SUBMISSION */}
                        {activeFailedClaimTab === 'Portal Submission' && (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="text-left">
                              <h4 className="text-sm font-black uppercase tracking-tight text-[#141414]">Direct Portal Submission & Remittance Upload</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Directly upload settlement credentials and transaction details directly to the insurer portal and route for active reconciliation.</p>
                            </div>

                            {/* Dropzone */}
                            <div className="p-8 border-2 border-dashed border-slate-300 hover:border-[#141414] rounded-[1.5rem] bg-slate-50/50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                              <div className="w-12 h-12 rounded-2xl bg-white border border-[#141414]/10 shadow-sm flex items-center justify-center text-slate-500 mb-3 group-hover:scale-110 transition-transform">
                                <Upload size={20} />
                              </div>
                              <span className="text-xs font-bold text-[#141414]">Drag and drop settlement confirmation letter here</span>
                              <span className="text-[9px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">PDF, PNG or JPG max 15MB</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5 text-left">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#141414]/60">Settlement Approved Amount (₹)</label>
                                <input
                                  type="number"
                                  value={portalApprovedAmt}
                                  onChange={(e) => setPortalApprovedAmt(e.target.value)}
                                  className="w-full px-4 py-3 bg-white border border-slate-300 hover:border-slate-800 focus:border-[#141414] text-[#141414] rounded-xl text-xs font-bold font-sans outline-none transition-colors"
                                  placeholder="Enter approved amount"
                                />
                              </div>
                              <div className="space-y-1.5 text-left">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#141414]/60">UTR Transaction / Reference No.</label>
                                <input
                                  type="text"
                                  value={portalUtrRef}
                                  onChange={(e) => setPortalUtrRef(e.target.value)}
                                  className="w-full px-4 py-3 bg-white border border-slate-300 hover:border-slate-800 focus:border-[#141414] text-[#141414] rounded-xl text-xs font-bold font-mono uppercase outline-none transition-colors"
                                  placeholder="Enter transaction token"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 text-left">
                              <label className="text-[9px] font-black uppercase tracking-widest text-[#141414]/60">Submission Comments</label>
                              <textarea
                                value={portalComments}
                                onChange={(e) => setPortalComments(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-white border border-slate-300 hover:border-slate-800 focus:border-[#141414] text-[#141414] rounded-xl text-xs font-semibold font-sans outline-none transition-colors resize-none"
                                placeholder="Add submission details..."
                              />
                            </div>

                            <div className="flex justify-end pt-4 border-t border-[#141414]/10 mt-6">
                              <button
                                onClick={() => {
                                  // Update state
                                  const finalAmt = Number(portalApprovedAmt) || Number(selectedFailedClaim.formData?.fin_app_amt || selectedFailedClaim.formData?.approved_amt || 0);
                                  const updatedClaim: Claim = {
                                    ...selectedFailedClaim,
                                    status: ClaimStatus.CLAIM_UNDER_PROCESS,
                                    formData: {
                                      ...(selectedFailedClaim.formData || {}),
                                      rpa_email_failed: false,
                                      manual_portal_submitted: true,
                                      manual_portal_dt: new Date().toISOString(),
                                      fin_app_amt: finalAmt,
                                      tracking_no: portalUtrRef || selectedFailedClaim.formData?.tracking_no,
                                      file_dispatch_comment: portalComments || "Settled manually via Insurer Direct Web Portal."
                                    },
                                    updatedAt: new Date().toISOString(),
                                    history: [
                                      {
                                        id: `manual-portal-${Date.now()}`,
                                        status: ClaimStatus.CLAIM_UNDER_PROCESS,
                                        date: new Date().toISOString(),
                                        type: 'status_change',
                                        comment: `Submitted successfully via manual Insurer Web Portal bypass. Approved Amount: ₹${finalAmt.toLocaleString()}. Reference: ${portalUtrRef || 'N/A'}.`
                                      },
                                      ...(selectedFailedClaim.history || [])
                                    ]
                                  };
                                  onUpdateClaim(updatedClaim);
                                  toast.success(`Direct Portal Sync Complete!`, {
                                    duration: 6000,
                                    description: `Case updated to Under Process with locked settlement amount ₹${finalAmt.toLocaleString()}.`
                                  });
                                  setSelectedFailedClaim(null);
                                }}
                                className="px-7 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md select-none"
                              >
                                <Globe size={13} />
                                SUBMIT TO PORTAL & ROUTE
                              </button>
                            </div>
                          </div>
                        )}

                        {/* TAB 3: VIEW DOCUMENTS */}
                        {activeFailedClaimTab === 'View Documents' && (
                          <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col justify-start">
                            <div className="text-left">
                              <h4 className="text-sm font-black uppercase tracking-tight text-[#141414]">Patient Dossier Documents</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Below are all compiled files and credentials submitted inside this active cashless case dossier.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                              {[
                                { name: "Final_Detailed_Bill.pdf", size: "2.4 MB", badge: "Bill Summary" },
                                { name: "Discharge_Summary_Approved.pdf", size: "1.1 MB", badge: "Discharge Record" },
                                { name: "Kyc_Aadhaar_Pan_Copy.pdf", size: "850 KB", badge: "ID Proof" },
                                { name: "Investigation_Reports.zip", size: "6.7 MB", badge: "Clinical Data" }
                              ].map((fileObj, fIdx) => (
                                <div key={fIdx} className="p-4 border border-[#141414]/10 rounded-2xl flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                      <FileText size={16} />
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-800 shrink-0 truncate max-w-[140px] block">
                                        {fileObj.name}
                                      </div>
                                      <div className="text-[9px] text-slate-400 font-mono mt-0.5 select-none animate-in fade-in">
                                        {fileObj.size} | <span className="text-[#4285F4] font-bold">{fileObj.badge}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      toast.success(`Successfully downloaded '${fileObj.name}'`);
                                    }}
                                    className="p-2 hover:bg-slate-200/50 text-[#141414] rounded-xl transition-all cursor-pointer select-none"
                                    title="Download File"
                                  >
                                    <Download size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3 text-left">
                              <Info size={16} className="text-[#4285F4] mt-0.5" />
                              <div className="text-xs text-[#0C1523]/80 leading-normal">
                                <strong>System Note:</strong> Manual dossiers are encrypted and sealed under HIPAA guidelines. Resending claims automatically transmits these documents securely via TLS/HTTPS protocols.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB 4: TIMELINE */}
                        {activeFailedClaimTab === 'Timeline' && (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="text-left">
                              <h4 className="text-sm font-black uppercase tracking-tight text-[#141414]">Cashless Case Progress Milestones</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Follow the chronological milestones checklist from admission up to file dispatch verification blockages.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative text-left">
                              {[
                                { stage: "Pre-Auth Approved", done: true, color: "bg-emerald-500 text-white" },
                                { stage: "Discharge Initiated", done: true, color: "bg-emerald-500 text-white" },
                                { stage: "Discharge Approved", done: true, color: "bg-emerald-500 text-white" },
                                { stage: "File Dispatched", done: false, error: true, color: "bg-rose-500 text-white font-bold" },
                                { stage: "Completed Settlement", done: false, color: "bg-slate-100 text-slate-400" }
                              ].map((step, sIdx) => (
                                <div key={sIdx} className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">STAGE {sIdx + 1}</span>
                                    {step.done ? (
                                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold">✓</span>
                                    ) : step.error ? (
                                      <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-[10px] font-black animate-pulse">!</span>
                                    ) : (
                                      <span className="w-5 h-5 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center text-[10px] font-bold">-</span>
                                    )}
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-extrabold text-[#141414] leading-tight mb-1">{step.stage}</h5>
                                    {step.error && (
                                      <span className="inline-block bg-rose-100 text-rose-700 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md uppercase">Blocked</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* TAB 5: FINAL ASSESSMENT */}
                        {activeFailedClaimTab === 'Final Assessment' && (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="text-left">
                              <h4 className="text-sm font-black uppercase tracking-tight text-[#141414]">Hospital Bill & Audit Verification</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">Please review the itemized ledger and verify eligibility metrics prior to dispatch bypass.</p>
                            </div>

                            <div className="border border-[#141414]/10 rounded-[1.5rem] overflow-hidden text-left">
                              <div className="bg-slate-50 p-4 border-b border-[#141414]/10 flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-wider text-[#141414]/60">Bill Segment Breakdown</span>
                                <span className="text-[10px] font-bold font-mono text-[#141414]">PATIENT RECONCILED</span>
                              </div>
                              <div className="divide-y divide-[#141414]/5 text-xs text-slate-700 font-medium">
                                <div className="p-3 flex justify-between">
                                  <span>Room Rent & Medical Care Charges (4 Days)</span>
                                  <span className="font-bold font-mono">₹45,000</span>
                                </div>
                                <div className="p-3 flex justify-between">
                                  <span>OT & Surgeon Consumables Charges</span>
                                  <span className="font-bold font-mono">₹1,12,000</span>
                                </div>
                                <div className="p-3 flex justify-between">
                                  <span>In-Patient Pharmacy & Drugs Ledger</span>
                                  <span className="font-bold font-mono">₹32,331</span>
                                </div>
                                <div className="p-3 flex justify-between bg-emerald-50/40 text-[#141414] font-black">
                                  <span>Total Patient Reconciled Ledger</span>
                                  <span className="font-bold font-mono">₹1,89,331</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-[#141414] shadow-2xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#141414]/10 pb-6">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter italic font-serif text-[#141414] flex items-center gap-2">
                      <Send className="text-rose-600 animate-pulse" size={24} />
                      Initiate Manual Settlement
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-sans text-left">
                      All claims at the <strong>File Dispatched</strong> stage are routed here for manual submission while Email and RPA integrations are unavailable.
                    </p>
                  </div>
                  <div className="bg-rose-50 text-rose-700 px-4 py-2 rounded-2xl border border-rose-100 text-xs font-bold leading-normal">
                    Pending Manual Action: {manualSettlementClaims.length} Cases
                  </div>
                </div>

                {manualSettlementClaims.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">No Files Awaiting Settlement</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 text-center">
                      No backend-authorized claims are currently at the File Dispatched stage.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-left">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#141414]/10 bg-[#F8F8F7]">
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#141414]/60">Case & Patient Details</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#141414]/60">Insurer / TPA</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#141414]/60">Total Bill / Appr. Amt</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#141414]/60">Submission Mode</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#141414]/60 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#141414]/10 animate-in fade-in duration-300">
                        {manualSettlementClaims.map((claim) => {
                          const finalBill = claim.formData?.dis_total_bill || claim.formData?.estimateClaimAmount || 0;
                          const approvedAmt = claim.formData?.fin_app_amt || claim.formData?.approved_amt || claim.formData?.pre_auth_app_amt || 0;
                          
                          return (
                            <tr key={claim.id} className="hover:bg-slate-50/55 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-rose-50 rounded-xl cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedFailedClaim(claim)}>
                                    <AlertTriangle size={18} className="text-rose-500" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-[#141414] text-xs hover:underline cursor-pointer" onClick={() => setSelectedFailedClaim(claim)}>
                                      {claim.patientName}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      {claim.id} | {hospitals.find(h => h.id === claim.hospitalId || h.id === claim.formData?.hospitalId)?.hospitalName || claim.hospitalId || 'Care Hospital'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="font-sans text-xs font-semibold text-slate-700">
                                  {claim.insuranceProvider || "Insurer Not Specified"}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {claim.formData?.tpa_provider && claim.formData.tpa_provider !== 'Direct' 
                                    ? `TPA: ${claim.formData.tpa_provider}` 
                                    : 'Direct Settlement'}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="font-sans text-xs font-bold text-[#141414]">
                                  ₹{Number(approvedAmt || finalBill).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Approved / Dispatched
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  Manual Submission
                                </span>
                                <div className="text-[9px] text-slate-400 mt-1 max-w-xs truncate">
                                  {claim.formData?.file_dispatch_comment || "Awaiting Finance Team submission to the insurer or TPA."}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setSelectedFailedClaim(claim)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-slate-800 text-[10px] font-bold text-slate-700 transition-all bg-white hover:bg-slate-50 cursor-pointer select-none"
                                    title="Open interactive manual action panel"
                                  >
                                    Open Settlement Panel
                                  </button>
                                  <button
                                    onClick={() => {
                                      toast.success(`Dossier compiled successfully.`, {
                                        description: "Downloaded file: Settlement_Manual_Pack.zip"
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-[#141414]/5 hover:bg-[#141414]/10 text-[10px] font-bold text-[#141414] transition-all flex items-center gap-1 cursor-pointer select-none"
                                    title="Download ZIP dossier with all claim files"
                                  >
                                    <Download size={12} />
                                    Dossier
                                  </button>
                                  <button
                                    onClick={() => handleManualInitiateSettlement(claim)}
                                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1 cursor-pointer select-none"
                                  >
                                    <Send size={10} />
                                    Quick Dispatch
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Emails' && (
          <div className="space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-[#141414] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-[#141414]/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#F8F8F7]">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/40 group-focus-within:text-[#141414] transition-colors" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search Emails..." 
                      className="pl-12 pr-4 py-3 bg-white border border-[#141414]/10 rounded-xl text-xs font-bold text-[#141414] outline-none focus:ring-4 focus:ring-[#141414]/5 focus:border-[#141414] transition-all w-full md:w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <select 
                      className="pl-4 pr-10 py-3 bg-white border border-[#141414]/10 rounded-xl text-xs font-bold text-[#141414] outline-none focus:border-[#141414] appearance-none cursor-pointer"
                      value={selectedEmailHospital}
                      onChange={(e) => setSelectedEmailHospital(e.target.value)}
                    >
                      <option value="All">All Hospitals</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.hospitalName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#141414]/40 pointer-events-none" size={14} />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEmailDraftData({
                      id: `email-draft-${Date.now()}`,
                      hospitalId: '',
                      to: '',
                      cc: '',
                      bcc: '',
                      subject: '',
                      body: '',
                      attachments: []
                    });
                    setShowEmailDraftModal(true);
                  }}
                  className="px-6 py-3 bg-[#141414] text-[#E4E3E0] rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center"
                >
                  <PlusCircle size={16} className="mr-2" />
                  Draft New Email
                </button>
              </div>

              {/* Horizontally tabbed folders bar for Reconciliation dashboard */}
              <div className="px-8 py-4 bg-white border-b border-[#141414]/10 flex flex-wrap gap-2 items-center">
                {[
                  { key: 'Inbox', label: 'Inbox', icon: Inbox, color: 'text-indigo-600' },
                  { key: 'Sent', label: 'Sent', icon: Send, color: 'text-emerald-655' },
                  { key: 'Draft', label: 'Drafts', icon: FileText, color: 'text-amber-500' },
                  { key: 'Outbox', label: 'Outbox', icon: Clock, color: 'text-rose-500' },
                ].map((folder) => {
                  const itemsCount = emailsDb.filter(log => {
                    if (folder.key === 'Inbox') return log.status === 'Received';
                    if (folder.key === 'Sent') return log.status === 'Sent' || log.status === 'Responded';
                    if (folder.key === 'Draft') return log.status === 'Draft';
                    if (folder.key === 'Outbox') return log.status === 'Queued';
                    return false;
                  }).length;

                  const isActive = currentEmailFolder === folder.key;
                  return (
                    <button
                      key={folder.key}
                      onClick={() => setCurrentEmailFolder(folder.key as any)}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#141414]/10 border border-[#141414]/20 text-[#141414]' 
                          : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-600 hover:bg-[#141414]/5'
                      }`}
                    >
                      <folder.icon size={14} className={isActive ? 'text-[#141414]' : folder.color} />
                      <span>{folder.label}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {itemsCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#141414] text-[#E4E3E0] text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-8 py-5">Date / Time</th>
                      <th className="px-8 py-5">Claim NO</th>
                      <th className="px-8 py-5">{currentEmailFolder === 'Inbox' ? 'Sender' : 'Recipient'}</th>
                      <th className="px-8 py-5">Subject / Template</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141414]/10">
                    {filteredEmails.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-12 text-center text-[#141414]/40 font-bold uppercase tracking-widest">
                          No emails in {currentEmailFolder} folder
                        </td>
                      </tr>
                    ) : (
                      filteredEmails.map((log) => (
                        <tr key={log.id} className="hover:bg-[#141414]/5 transition-colors group">
                          <td className="px-8 py-6">
                            <p className="text-xs font-black text-[#141414]">{formatDate(log.sentDate)}</p>
                            <p className="text-[10px] font-bold text-[#141414]/40">
                              {log.scheduledTime ? `Sched: ${new Date(log.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : new Date(log.sentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs font-mono font-bold text-[#141414]">{log.claimId}</p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs font-black text-[#141414]">{currentEmailFolder === 'Inbox' ? log.sender : log.recipient}</p>
                            <span className="px-2 py-0.5 bg-[#141414]/5 text-[#141414]/60 text-[8px] font-black uppercase tracking-widest rounded">{log.recipientType}</span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs font-bold text-[#141414] truncate max-w-xs">{log.subject || log.templateUsed}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              log.status === 'Sent' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              log.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              log.status === 'Received' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                              log.status === 'Queued' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                              log.status === 'Draft' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-rose-50 text-rose-600 border-rose-200'
                            }`}>
                              {log.status === 'Queued' ? 'Outbox' : log.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {currentEmailFolder === 'Draft' ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      setEmailDraftData({
                                        id: log.id,
                                        hospitalId: log.hospitalId || '',
                                        to: log.recipient || '',
                                        cc: log.cc || '',
                                        bcc: log.bcc || '',
                                        subject: log.subject || '',
                                        body: log.body || '',
                                        attachments: []
                                      });
                                      setShowEmailDraftModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-[#141414] text-[#E4E3E0] text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-all font-sans"
                                    title="Resume Draft"
                                  >
                                    Resume
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const updatedList = emailsDb.filter(m => m.id !== log.id);
                                      saveEmailsToStorage(updatedList);
                                      toast.success('Draft deleted successfully');
                                    }}
                                    className="p-2 text-rose-600 hover:bg-rose-50 transition-all rounded"
                                    title="Discard Draft"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : currentEmailFolder === 'Outbox' ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      const updated = emailsDb.map(item => {
                                        if (item.id === log.id) {
                                          return { ...item, status: 'Sent', sentDate: new Date().toISOString() };
                                        }
                                        return item;
                                      });
                                      saveEmailsToStorage(updated);
                                      toast.success('Scheduled email dispatched successfully!');
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-emerald-700 transition-all font-sans"
                                    title="Send Immediately"
                                  >
                                    Send Now
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const updatedList = emailsDb.filter(m => m.id !== log.id);
                                      saveEmailsToStorage(updatedList);
                                      toast.success('Scheduled follow-up cancelled');
                                    }}
                                    className="p-2 text-rose-600 hover:bg-rose-50 transition-all rounded"
                                    title="Cancel sending"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => setSelectedEmailForView(log)}
                                    className="p-2 bg-white border border-[#141414]/10 rounded-lg hover:border-[#141414] transition-all text-slate-500"
                                    title="View Email"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      toast.success('Settlement Letter download initiated');
                                    }}
                                    className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                    title="Download Settlement Letter"
                                  >
                                    <FileText size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Performance' && (
          <div className="space-y-8">
            {/* Forecast Summary */}
            {settings.enableForecasting && (
              <div className="bg-emerald-50 rounded-[2.5rem] border border-emerald-200 p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black uppercase tracking-widest text-emerald-800 flex items-center gap-2">
                    <TrendingUp size={20} /> Recovery Forecast (AI Predicted)
                  </h2>
                  <span className="px-4 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    {recoveryForecast.averageProbability}% Avg Probability
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-2">Next 7 Days</p>
                    <p className="text-2xl font-black text-emerald-600">₹{(recoveryForecast.next7Days / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-2">Next 15 Days</p>
                    <p className="text-2xl font-black text-emerald-600">₹{(recoveryForecast.next15Days / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-2">Next 30 Days</p>
                    <p className="text-2xl font-black text-emerald-600">₹{(recoveryForecast.next30Days / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest mb-2">High Risk of Delay</p>
                    <p className="text-2xl font-black text-rose-600">{recoveryForecast.delayRiskCount} Cases</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard 
                label="Daily Recovery" 
                value={`₹${(stats.recoveredToday / 1000).toFixed(0)}K`}
                icon={Activity} 
                trend={`${((stats.recoveredToday / settings.recoveryTargets.daily) * 100).toFixed(1)}%`}
                trendUp={true}
              />
              <KPICard 
                label="Weekly Recovery" 
                value={`₹${(stats.recoveredThisWeek / 1000).toFixed(0)}K`}
                icon={TrendingUp} 
                trend={`${((stats.recoveredThisWeek / settings.recoveryTargets.weekly) * 100).toFixed(1)}%`}
                trendUp={true}
              />
              <KPICard 
                label="Monthly Recovery" 
                value={`₹${(stats.recoveredThisMonth / 1000000).toFixed(1)}M`}
                icon={Target} 
                trend={`${((stats.recoveredThisMonth / settings.recoveryTargets.monthly) * 100).toFixed(1)}%`}
                trendUp={true}
              />
              <KPICard 
                label="Yearly Recovery" 
                value={`₹${(stats.recoveredThisYear / 1000000).toFixed(1)}M`}
                icon={Trophy} 
                trendUp={true}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414] shadow-xl">
                <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChart3 size={20} /> Recovery Trend (Last 7 Days)
                </h3>
                <div className="h-64 flex items-end justify-between gap-2">
                  {[45, 60, 35, 80, 55, 90, 75].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-[#141414] rounded-t-lg transition-all hover:bg-emerald-500 cursor-pointer" 
                        style={{ height: `${val}%` }}
                      ></div>
                      <span className="text-[8px] font-black text-[#141414]/40 uppercase tracking-widest">Day {i+1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414] shadow-xl">
                <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Trophy size={20} /> Top Performers (Recovery)
                </h3>
                <div className="space-y-4">
                  {[
                    { name: 'Rahul A.', recovered: '₹4.2M', target: '₹5M', pct: 84 },
                    { name: 'Suresh K.', recovered: '₹3.8M', target: '₹5M', pct: 76 },
                    { name: 'Priya S.', recovered: '₹3.1M', target: '₹5M', pct: 62 },
                  ].map((user, i) => (
                    <div key={i} className="p-4 bg-[#F8F8F7] rounded-2xl border border-[#141414]/5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-black uppercase tracking-widest">{user.name}</p>
                        <p className="text-xs font-black text-emerald-600">{user.recovered}</p>
                      </div>
                      <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#141414]/5">
                        <div className="h-full bg-[#141414]" style={{ width: `${user.pct}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[8px] font-bold text-[#141414]/40 uppercase tracking-widest">Target: {user.target}</p>
                        <p className="text-[8px] font-bold text-[#141414]/40 uppercase tracking-widest">{user.pct}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Automation' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414] shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Settings size={20} /> Automation Settings
                  </h3>
                  <button 
                    onClick={runAutoScheduler}
                    className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-600 hover:text-white transition-all group"
                    title="Run Auto-Scheduler Now"
                  >
                    <Zap size={14} className="group-hover:animate-pulse" />
                  </button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Reminder Frequency</label>
                    <div className="flex items-center gap-2">
                      {[3, 5, 7].map(days => (
                        <button
                          key={days}
                          onClick={() => setSettings(prev => ({ ...prev, reminderFrequencyDays: days }))}
                          className={`flex-1 py-3 rounded-xl text-xs font-black border transition-all ${
                            settings.reminderFrequencyDays === days 
                              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]' 
                              : 'bg-white text-[#141414] border-[#141414]/10 hover:border-[#141414]'
                          }`}
                        >
                          Every {days} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#F8F8F7] rounded-2xl border border-[#141414]/5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">AI Suggestions</p>
                      <p className="text-[8px] font-bold text-[#141414]/40 uppercase tracking-widest">Enable priority follow-ups</p>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, enableAiSuggestions: !prev.enableAiSuggestions }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${settings.enableAiSuggestions ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableAiSuggestions ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#F8F8F7] rounded-2xl border border-[#141414]/5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">AI Forecasting</p>
                      <p className="text-[8px] font-bold text-[#141414]/40 uppercase tracking-widest">Enable recovery predictions</p>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, enableForecasting: !prev.enableForecasting }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${settings.enableForecasting ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableForecasting ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>

                  {settings.enableAiSuggestions && (
                    <div className="p-4 bg-[#F8F8F7] rounded-2xl border border-[#141414]/5 space-y-4">
                      <p className="text-xs font-black uppercase tracking-widest border-b border-[#141414]/10 pb-2">AI Scoring Weights</p>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-[#141414]/60 uppercase tracking-widest">Aging Days</label>
                          <span className="text-[10px] font-black">{settings.scoringWeights.aging}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={settings.scoringWeights.aging}
                          onChange={(e) => setSettings(prev => ({ ...prev, scoringWeights: { ...prev.scoringWeights, aging: parseInt(e.target.value) } }))}
                          className="w-full accent-[#141414]"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-[#141414]/60 uppercase tracking-widest">Amount</label>
                          <span className="text-[10px] font-black">{settings.scoringWeights.amount}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={settings.scoringWeights.amount}
                          onChange={(e) => setSettings(prev => ({ ...prev, scoringWeights: { ...prev.scoringWeights, amount: parseInt(e.target.value) } }))}
                          className="w-full accent-[#141414]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-[#141414]/60 uppercase tracking-widest">Reminders Sent</label>
                          <span className="text-[10px] font-black">{settings.scoringWeights.reminders}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={settings.scoringWeights.reminders}
                          onChange={(e) => setSettings(prev => ({ ...prev, scoringWeights: { ...prev.scoringWeights, reminders: parseInt(e.target.value) } }))}
                          className="w-full accent-[#141414]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[10px] font-bold text-[#141414]/60 uppercase tracking-widest">Insurer Behavior</label>
                          <span className="text-[10px] font-black">{settings.scoringWeights.insurerBehavior}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={settings.scoringWeights.insurerBehavior}
                          onChange={(e) => setSettings(prev => ({ ...prev, scoringWeights: { ...prev.scoringWeights, insurerBehavior: parseInt(e.target.value) } }))}
                          className="w-full accent-[#141414]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Daily Target (₹)</label>
                      <input 
                        type="number" 
                        value={settings.recoveryTargets.daily}
                        onChange={(e) => setSettings(prev => ({ ...prev, recoveryTargets: { ...prev.recoveryTargets, daily: parseInt(e.target.value) } }))}
                        className="w-full p-4 bg-[#F8F8F7] border border-[#141414]/10 rounded-xl text-xs font-bold outline-none focus:border-[#141414] transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Weekly Target (₹)</label>
                      <input 
                        type="number" 
                        value={settings.recoveryTargets.weekly}
                        onChange={(e) => setSettings(prev => ({ ...prev, recoveryTargets: { ...prev.recoveryTargets, weekly: parseInt(e.target.value) } }))}
                        className="w-full p-4 bg-[#F8F8F7] border border-[#141414]/10 rounded-xl text-xs font-bold outline-none focus:border-[#141414] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Monthly Recovery Target (₹)</label>
                    <input 
                      type="number" 
                      value={settings.recoveryTargets.monthly}
                      onChange={(e) => setSettings(prev => ({ ...prev, recoveryTargets: { ...prev.recoveryTargets, monthly: parseInt(e.target.value) } }))}
                      className="w-full p-4 bg-[#F8F8F7] border border-[#141414]/10 rounded-xl text-xs font-bold outline-none focus:border-[#141414] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414] shadow-xl">
                <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Zap size={20} /> AI Priority Follow-up List
                </h3>
                <div className="space-y-4">
                  {claimsWithAi
                    .filter(c => c.aiFollowUpSuggestion?.priority === 'High')
                    .slice(0, 5)
                    .map((c, i) => (
                    <div key={i} className="p-6 bg-[#F8F8F7] rounded-3xl border border-[#141414]/5 flex items-center justify-between group hover:border-[#141414] transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center font-black text-xs">
                          {c.aiFollowUpSuggestion?.score}%
                        </div>
                        <div>
                          <Link to={`/process-claim/${c.id}?source=recon`} className="text-xs font-black uppercase tracking-widest hover:text-blue-600 transition-colors">{c.patientName}</Link>
                          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{c.id} | {c.insuranceProvider}</p>
                          <p className="text-[9px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                            <AlertTriangle size={10} /> {c.aiFollowUpSuggestion?.reason}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                          <p className="text-xs font-black">₹{(c.outstandingAmount || 0).toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{c.agingDays} Days Aging</p>
                        </div>
                        <button className="px-6 py-2 bg-[#141414] text-[#E4E3E0] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                          {c.aiFollowUpSuggestion?.recommendedAction === 'Call' && <Phone size={12} />}
                          {c.aiFollowUpSuggestion?.recommendedAction === 'Email' && <Mail size={12} />}
                          {c.aiFollowUpSuggestion?.recommendedAction === 'Escalation' && <ShieldAlert size={12} />}
                          {c.aiFollowUpSuggestion?.recommendedAction}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414] shadow-xl">
                <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <History size={20} /> Automation Audit Log
                </h3>
                <div className="space-y-2">
                  {reminderLogs.length === 0 ? (
                    <div className="p-8 text-center bg-[#F8F8F7] rounded-2xl border border-[#141414]/5">
                      <p className="text-xs font-bold text-[#141414]/40">No logs available</p>
                    </div>
                  ) : (
                    reminderLogs.slice(0, 5).map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border-b border-[#141414]/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${log.status === 'Sent' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Reminder Sent ({log.recipientType})</p>
                            <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{log.recipient}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold">{new Date(log.sentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600">{log.status}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Insurer-Wise Reminder Email Templates */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414] shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <Mail size={20} /> Email Templates
                  </h3>
                </div>
                <div className="space-y-4">
                  {[...insurers, ...tpas].slice(0, 8).map((entity) => {
                    const templates = emailTemplateService.getTemplates();
                    const activeTemplate = templates.find((t: any) => t.type === 'Settlement Follow-up') || { name: 'Standard Follow-up' };
                    
                    return (
                      <div key={entity.id} className="p-4 bg-[#F8F8F7] rounded-2xl border border-[#141414]/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-widest">{entity.name}</p>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-md">Active</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-[#141414]/60"><span className="font-black text-[#141414]">To:</span> {entity.emailId || 'Not Set'}</p>
                          <p className="text-[10px] font-bold text-[#141414]/60"><span className="font-black text-[#141414]">Template:</span> {activeTemplate.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settlement Update Modal */}
      <AnimatePresence>
        {showSettlementModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#141414]"
            >
              <div className="p-8 border-b border-[#141414]/10 bg-[#F8F8F7] flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic font-serif">Update Settlement</h3>
                  <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">
                    {showSettlementModal.patientName} | {showSettlementModal.id}
                  </p>
                </div>
                <button onClick={() => {
                  setShowSettlementModal(null);
                }} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-[#141414]/5 rounded-2xl">
                  <div>
                    <p className="text-[9px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Approved Amount</p>
                    <p className="text-lg font-black text-[#141414]">₹{(showSettlementModal.formData?.fin_app_amt || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Current Outstanding</p>
                    <p className="text-lg font-black text-rose-600">₹{(showSettlementModal.outstandingAmount ?? (showSettlementModal.formData?.fin_app_amt || 0)).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Settlement Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Pending', 'Partial', 'Full'] as const).map(status => (
                        <button 
                          key={status}
                          onClick={() => setSettlementData(prev => ({ ...prev, status }))}
                          className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            settlementData.status === status 
                              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]' 
                              : 'bg-white text-[#141414] border-[#141414]/10 hover:border-[#141414]'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Paid Amount (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-[#141414]/10 rounded-xl text-sm font-bold outline-none focus:border-[#141414] transition-all"
                      value={settlementData.paidAmount}
                      onChange={(e) => setSettlementData(prev => ({ ...prev, paidAmount: Number(e.target.value) }))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Remarks / Follow-up Note</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-[#141414]/10 rounded-xl text-sm font-bold outline-none focus:border-[#141414] transition-all h-24 resize-none"
                      placeholder="Enter reconciliation details..."
                      value={settlementData.remarks}
                      onChange={(e) => setSettlementData(prev => ({ ...prev, remarks: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Upload Settlement Proof</label>
                    <div 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.onchange = (e: any) => {
                          const file = e.target.files[0];
                          if (file) setSettlementData(prev => ({ ...prev, proof: file }));
                        };
                        input.click();
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group ${
                        settlementData.proof 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-[#141414]/10 hover:border-[#141414]'
                      }`}
                    >
                      {settlementData.proof ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{settlementData.proof.name}</p>
                          <p className="text-[8px] font-bold text-emerald-400 mt-1">Click to change file</p>
                        </div>
                      ) : (
                        <>
                          <Upload size={24} className="mx-auto text-[#141414]/20 group-hover:text-[#141414] mb-2" />
                          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">Click to upload PDF or Image</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[#F8F8F7] border-t border-[#141414]/10 flex gap-3">
                <button 
                  onClick={() => {
                    setShowSettlementModal(null);
                  }}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-[#141414]/10 hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSettlementUpdate}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#141414] text-[#E4E3E0] hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Confirm Update
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Email Modal */}
      <AnimatePresence>
        {showBulkEmailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#141414]"
            >
              <div className="p-8 border-b border-[#141414]/10 bg-[#F8F8F7] flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic font-serif">Bulk Follow-up Email</h3>
                  <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">
                    Sending to {selectedClaims.length} Insurance/TPA recipients
                  </p>
                </div>
                <button onClick={() => setShowBulkEmailModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Recipient Type</label>
                      <div className="flex gap-2">
                        {(['Insurer', 'TPA', 'Hospital'] as const).map(type => (
                          <button 
                            key={type}
                            onClick={() => setEmailData(prev => ({ ...prev, recipientType: type }))}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                              emailData.recipientType === type 
                                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]' 
                                : 'bg-white text-[#141414] border-[#141414]/10'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">To</label>
                      <input 
                        type="email" 
                        className="w-full px-4 py-2 bg-slate-50 border border-[#141414]/10 rounded-xl text-xs font-bold outline-none focus:border-[#141414]"
                        value={emailData.to}
                        onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="recipient@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">CC</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 bg-slate-50 border border-[#141414]/10 rounded-xl text-xs font-bold outline-none focus:border-[#141414]"
                        value={emailData.cc}
                        onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">BCC</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 bg-slate-50 border border-[#141414]/10 rounded-xl text-xs font-bold outline-none focus:border-[#141414]"
                        value={emailData.bcc}
                        onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Email Subject</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-[#141414]/10 rounded-xl text-sm font-bold outline-none focus:border-[#141414] transition-all"
                      value={emailData.subject}
                      onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/60 mb-2 block">Message Body</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-[#141414]/10 rounded-xl text-sm font-bold outline-none focus:border-[#141414] transition-all h-48 resize-none"
                      value={emailData.body}
                      onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[#F8F8F7] border-t border-[#141414]/10 flex gap-3">
                <button 
                  onClick={() => setShowBulkEmailModal(false)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-[#141414]/10 hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    console.log('Email Log:', {
                      sentAt: new Date().toISOString(),
                      user: currentUser.displayName,
                      to: emailData.to,
                      subject: emailData.subject,
                      cases: selectedClaims
                    });
                    toast.success(`Follow-up emails sent for ${selectedClaims.length} cases.`);
                    setShowBulkEmailModal(false);
                    setSelectedClaims([]);
                  }}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#141414] text-[#E4E3E0] hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <Send size={14} /> Send Bulk Emails
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Patient Dashboard Modal */}
      <AnimatePresence>
        {showPatientModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#141414] flex flex-col"
            >
              <div className="p-8 border-b border-[#141414]/10 bg-[#F8F8F7] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic font-serif flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#141414] text-[#E4E3E0] rounded-2xl flex items-center justify-center not-italic">
                      <Eye size={24} />
                    </div>
                    Patient Dashboard
                  </h3>
                  <p className="text-xs font-bold text-[#141414]/60 uppercase tracking-widest mt-2">
                    {showPatientModal.patientName} | {showPatientModal.id}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex bg-[#141414]/5 p-1 rounded-xl">
                    {(['Details', 'Emails'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActivePatientTab(tab)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          activePatientTab === tab 
                            ? 'bg-white text-[#141414] shadow-sm' 
                            : 'text-[#141414]/40 hover:text-[#141414]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowPatientModal(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-[#141414]/10 hover:bg-[#141414] hover:text-white rounded-2xl transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-[#E4E3E0]/30 custom-scrollbar">
                {activePatientTab === 'Details' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Details */}
                    <div className="lg:col-span-2 space-y-8">
                      {/* Patient & Claim Details */}
                      <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/10 shadow-lg">
                        <div className="flex justify-between items-center mb-6 border-b border-[#141414]/10 pb-4">
                          <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <FileText size={16} /> Claim Details
                          </h4>
                          <button 
                            onClick={async () => {
                              setSettlementData({
                                status: (showPatientModal.settlementStatus as any) || 'Pending',
                                paidAmount: showPatientModal.formData?.set_incl_tds || 0,
                                remarks: '',
                                proof: null
                              });
                              setShowSettlementModal(showPatientModal);
                            }}
                            className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-md"
                          >
                            Manual Settlement Update
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Insurance Provider</p>
                            <p className="text-sm font-bold">{showPatientModal.insuranceProvider}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">TPA</p>
                            <p className="text-sm font-bold">{showPatientModal.formData?.tpa_provider || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Total Claim Amount</p>
                            <p className="text-sm font-black">₹{(showPatientModal.formData?.fin_app_amt || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Outstanding Amount</p>
                            <p className="text-sm font-black text-rose-600">₹{(showPatientModal.outstandingAmount ?? (showPatientModal.formData?.fin_app_amt || 0)).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Status</p>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-[#141414] text-[#E4E3E0] text-[10px] font-black uppercase tracking-widest rounded-lg">
                                {showPatientModal.status}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Aging</p>
                            <p className={`text-sm font-black ${Math.floor((Date.now() - new Date(showPatientModal.createdAt).getTime()) / (1000 * 60 * 60 * 24)) > 60 ? 'text-rose-600' : ''}`}>
                              {Math.floor((Date.now() - new Date(showPatientModal.createdAt).getTime()) / (1000 * 60 * 60 * 24))} Days
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Clinical Details */}
                      <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/10 shadow-lg">
                        <h4 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#141414]/10 pb-4">
                          <Activity size={16} /> Clinical Information
                        </h4>
                        <div className="space-y-6">
                          <div>
                            <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-2">Diagnosis</p>
                            <p className="text-sm font-bold bg-[#F8F8F7] p-4 rounded-xl border border-[#141414]/5">
                              {showPatientModal.formData?.diagnosis || 'Diagnosis information not available.'}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Date of Admission</p>
                              <p className="text-sm font-bold">{showPatientModal.formData?.doa ? formatDate(showPatientModal.formData.doa) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Date of Discharge</p>
                              <p className="text-sm font-bold">{showPatientModal.formData?.dod ? formatDate(showPatientModal.formData.dod) : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Timeline & Docs */}
                    <div className="space-y-8">
                      {/* Documents */}
                      <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/10 shadow-lg">
                        <h4 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#141414]/10 pb-4">
                          <FileText size={16} /> Documents
                        </h4>
                        <div className="space-y-3">
                          {['Discharge Summary', 'Final Bill', 'Claim Form', 'Investigation Reports'].map((doc, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-[#F8F8F7] rounded-xl border border-[#141414]/5 hover:border-[#141414]/20 transition-all cursor-pointer group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-[#141414]/10 group-hover:bg-[#141414] group-hover:text-white transition-all">
                                  <FileText size={12} />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest">{doc}</p>
                              </div>
                              <Download size={14} className="text-[#141414]/40 group-hover:text-[#141414]" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/10 shadow-lg">
                        <h4 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-[#141414]/10 pb-4">
                          <History size={16} /> Claim Timeline
                        </h4>
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#141414]/10 before:to-transparent">
                          {showPatientModal.history.slice().reverse().map((event, i) => (
                            <div key={i} className="relative flex items-center gap-4 group">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-[#141414] text-white shadow shrink-0 z-10">
                                <CheckCircle2 size={12} />
                              </div>
                              <div className="flex-1 p-4 rounded-2xl border border-[#141414]/10 bg-[#F8F8F7] shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[#141414]">{event.status}</span>
                                  <span className="text-[8px] font-bold text-[#141414]/40">{formatDate(event.date)}</span>
                                </div>
                                {event.comment && <p className="text-[10px] font-bold text-[#141414]/60 mt-2">{event.comment}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/10 shadow-lg">
                      <div className="flex justify-between items-center mb-8 border-b border-[#141414]/10 pb-4">
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Mail size={16} /> Claim Related Emails
                          </h4>
                          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">Integrated from hospital email server</p>
                        </div>
                        <button 
                          onClick={async () => {
                            setSettlementData({
                              status: (showPatientModal.settlementStatus as any) || 'Pending',
                              paidAmount: showPatientModal.formData?.set_incl_tds || 0,
                              remarks: 'Updated based on email confirmation.',
                              proof: null
                            });
                            setShowSettlementModal(showPatientModal);
                          }}
                          className="px-6 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                        >
                          <IndianRupee size={14} /> Update Settlement Manually
                        </button>
                      </div>

                      <div className="space-y-4">
                        {[
                          { subject: `Settlement Advice for Claim ${showPatientModal.id}`, from: showPatientModal.insuranceProvider, date: '2026-03-28T10:30:00Z', body: `Dear Hospital, we have processed the settlement for patient ${showPatientModal.patientName}. The amount of ₹${(showPatientModal.formData?.fin_app_amt || 0).toLocaleString()} has been credited to your account. UTR: ${showPatientModal.formData?.utr_number || 'UTR-MOCK-123'}` },
                          { subject: `Query regarding Claim ${showPatientModal.id}`, from: showPatientModal.insuranceProvider, date: '2026-03-25T14:20:00Z', body: `Please provide the original investigation reports for patient ${showPatientModal.patientName}.` },
                          { subject: `Claim Intimation Received: ${showPatientModal.id}`, from: showPatientModal.insuranceProvider, date: '2026-03-20T09:15:00Z', body: `We have received your claim intimation for patient ${showPatientModal.patientName}. Your claim ID is ${showPatientModal.id}.` }
                        ].map((email, i) => (
                          <div key={i} className="p-6 bg-[#F8F8F7] rounded-3xl border border-[#141414]/5 hover:border-[#141414]/20 transition-all">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h5 className="text-sm font-black text-[#141414] mb-1">{email.subject}</h5>
                                <p className="text-[10px] font-bold text-[#141414]/60 uppercase tracking-widest">From: {email.from}</p>
                              </div>
                              <span className="text-[10px] font-bold text-[#141414]/40">{new Date(email.date).toLocaleString()}</span>
                            </div>
                            <p className="text-xs font-bold text-[#141414]/70 leading-relaxed bg-white p-4 rounded-xl border border-[#141414]/5">
                              {email.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DownloadReportModal 
        isOpen={showDownloadModal} 
        onClose={() => setShowDownloadModal(false)} 
        claims={claims} 
        hospitals={hospitals as any} 
      />

      {/* Email Draft Modal */}
      <AnimatePresence>
        {showEmailDraftModal && (
          <div className={
            isComposerMinimized 
              ? "fixed bottom-0 right-12 z-[151] w-80 bg-white border border-[#141414]/20 rounded-t-xl shadow-2xl"
              : isComposerMaximized
                ? "fixed inset-8 z-[151] bg-white rounded-2xl shadow-2xl flex flex-col border border-[#141414]/20"
                : "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm"
          }>
            <motion.div 
              style={{ height: isComposerMinimized ? '40px' : isComposerMaximized ? '100%' : '820px', maxHeight: isComposerMinimized ? '40px' : '95vh' }}
              className={
                isComposerMinimized
                  ? "w-full flex flex-col"
                  : isComposerMaximized
                    ? "w-full h-full flex flex-col"
                    : "bg-white w-full max-w-5xl lg:max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-[#141414]/20 flex flex-col"
              }
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              {/* Header Bar */}
              <div className="bg-[#f2f6fc] border-b border-slate-200 px-4 py-2.5 flex items-center justify-between font-sans">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Draft saved
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsComposerMinimized(!isComposerMinimized)} 
                    className="p-1 hover:bg-slate-200 rounded transition-all text-slate-500 cursor-pointer"
                    title={isComposerMinimized ? "Restore" : "Minimize"}
                  >
                    <Minus size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsComposerMinimized(false);
                      setIsComposerMaximized(!isComposerMaximized);
                    }} 
                    className="p-1 hover:bg-slate-200 rounded transition-all text-slate-500 cursor-pointer"
                    title={isComposerMaximized ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isComposerMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowEmailDraftModal(false);
                      setIsComposerMinimized(false);
                      setIsComposerMaximized(false);
                    }} 
                    className="p-1 hover:bg-slate-200 rounded transition-all text-slate-500 cursor-pointer"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {!isComposerMinimized && (
                <>
                  {/* Composer Inputs Area */}
                  <div className="p-5 space-y-2.5 bg-white border-b border-slate-100 flex-none">
                    {/* Hospital & From Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 w-20">Hospital</span>
                        <select 
                          className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-b border-transparent hover:border-slate-200 py-0.5"
                          value={emailDraftData.hospitalId}
                          onChange={(e) => setEmailDraftData(prev => ({ ...prev, hospitalId: e.target.value }))}
                        >
                          <option value="">Select a hospital...</option>
                          {hospitals.map(h => (
                            <option key={h.id} value={h.id}>{h.hospitalName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">From</span>
                        <span className="text-sm font-semibold text-slate-600 truncate bg-slate-50 px-2.5 py-1 rounded-md">
                          {getHospitalFromEmail(emailDraftData.hospitalId)}
                        </span>
                      </div>
                    </div>

                    {/* To Line */}
                    <div className="flex items-center border-b border-slate-100 py-2">
                      <span className="text-xs font-bold text-slate-400 shrink-0 w-16">To</span>
                      <input 
                        type="email" 
                        className="w-full text-sm font-medium text-slate-800 outline-none bg-transparent"
                        value={emailDraftData.to}
                        onChange={(e) => setEmailDraftData(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="claims@hdfcergo.com"
                      />
                    </div>

                    {/* CC / BCC block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center border-b border-slate-100 py-2">
                        <span className="text-xs font-bold text-slate-400 shrink-0 w-16">Cc</span>
                        <input 
                          type="text" 
                          className="w-full text-sm font-medium text-slate-800 outline-none bg-transparent"
                          value={emailDraftData.cc || ''}
                          onChange={(e) => setEmailDraftData(prev => ({ ...prev, cc: e.target.value }))}
                          placeholder="billing@claimnx.com, operations@claimnx.com"
                        />
                      </div>
                      <div className="flex items-center border-b border-slate-100 py-2">
                        <span className="text-xs font-bold text-slate-400 shrink-0 w-16">Bcc</span>
                        <input 
                          type="text" 
                          className="w-full text-sm font-medium text-slate-800 outline-none bg-transparent"
                          value={emailDraftData.bcc || ''}
                          onChange={(e) => setEmailDraftData(prev => ({ ...prev, bcc: e.target.value }))}
                          placeholder="archive@claimnx.com"
                        />
                      </div>
                    </div>

                    {/* Subject Line */}
                    <div className="flex items-center border-b border-slate-100 py-2">
                      <span className="text-xs font-bold text-slate-400 shrink-0 w-16">Subject</span>
                      <input 
                        type="text" 
                        className="w-full text-sm font-bold text-slate-800 outline-none bg-transparent placeholder-slate-400"
                        value={emailDraftData.subject}
                        onChange={(e) => setEmailDraftData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Re: Standard - Claim CLM-001"
                      />
                    </div>
                  </div>

                  {/* Message Body Pane (Scrollable, takes remaining height) */}
                  <div className="flex-1 p-6 bg-white overflow-y-auto flex flex-col">
                    <textarea 
                      className="w-full flex-1 text-sm text-slate-700 outline-none resize-none font-sans min-h-[220px] leading-relaxed select-text placeholder-slate-400"
                      style={{
                        fontWeight: isComposerBold ? 'bold' : 'normal',
                        fontStyle: isComposerItalic ? 'italic' : 'normal',
                        textDecoration: isComposerUnderline ? 'underline' : 'none',
                        textAlign: composerAlign,
                      }}
                      value={emailDraftData.body}
                      onChange={(e) => setEmailDraftData(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="Write your email reply here..."
                    />

                    {/* Attachments Display inside writing area */}
                    {emailDraftData.attachments.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#141414]/60 mb-2">Attached Files ({emailDraftData.attachments.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {emailDraftData.attachments.map((file, i) => (
                            <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-[#141414] text-[10px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm">
                              <Paperclip size={10} className="text-slate-400" />
                              {file.name}
                              <button 
                                type="button"
                                className="cursor-pointer text-slate-400 hover:text-slate-600 font-bold ml-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmailDraftData(prev => ({ ...prev, attachments: prev.attachments.filter((_, idx) => idx !== i) }));
                                }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gmail Style Formatting Toolbar */}
                  <div className="bg-[#F8F8F7] border-t border-slate-200 py-1.5 px-4 flex flex-wrap gap-1 items-center justify-between text-slate-500">
                    <div className="flex items-center gap-1">
                      <button 
                        type="button" 
                        onClick={() => setIsComposerBold(!isComposerBold)}
                        className={`p-1.5 rounded transition-all font-bold cursor-pointer ${isComposerBold ? 'bg-slate-200 text-slate-900 border border-slate-300' : 'hover:bg-slate-100 hover:text-slate-700'}`}
                        title="Bold"
                      >
                        <Bold size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsComposerItalic(!isComposerItalic)}
                        className={`p-1.5 rounded transition-all italic cursor-pointer ${isComposerItalic ? 'bg-slate-200 text-slate-900 border border-slate-300' : 'hover:bg-slate-100 hover:text-slate-700'}`}
                        title="Italic"
                      >
                        <Italic size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsComposerUnderline(!isComposerUnderline)}
                        className={`p-1.5 rounded transition-all underline cursor-pointer ${isComposerUnderline ? 'bg-slate-200 text-slate-900 border border-slate-300' : 'hover:bg-slate-100 hover:text-slate-700'}`}
                        title="Underline"
                      >
                        <Underline size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          const alignments: ('left' | 'center' | 'right' | 'justify')[] = ['left', 'center', 'right', 'justify'];
                          const nextIdx = (alignments.indexOf(composerAlign) + 1) % alignments.length;
                          setComposerAlign(alignments[nextIdx]);
                        }}
                        className={`p-1.5 rounded transition-all cursor-pointer ${composerAlign !== 'left' ? 'bg-slate-200 text-[#141414] border border-slate-300' : 'hover:bg-slate-100 hover:text-slate-700'}`}
                        title={`Align (${composerAlign})`}
                      >
                        <AlignLeft size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          const currentText = emailDraftData.body;
                          const lines = currentText.split('\n');
                          const processed = lines.map(line => {
                            if (line.startsWith('• ')) {
                              return line.substring(2);
                            } else {
                              return '• ' + line;
                            }
                          }).join('\n');
                          setEmailDraftData(prev => ({ ...prev, body: processed }));
                        }}
                        className="p-1.5 hover:bg-slate-200 hover:text-slate-700 rounded transition-all cursor-pointer"
                        title="Toggle Bullet List"
                      >
                        <List size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Footer Actions Row */}
                  <div className="px-4 py-3 bg-white flex items-center justify-between border-t border-slate-100 flex-none gap-2">
                    {/* Left Actions List */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Send Button */}
                      <button 
                        onClick={() => {
                          if (!emailDraftData.to || !emailDraftData.subject) {
                            toast.error('Please fulfill recipient and subject lines.');
                            return;
                          }
                          const subjectClaimId = emailDraftData.subject.match(/CLM-\d+/i)?.[0] || 'CLM-003';
                          const newLog: ReminderLog = {
                            id: `log-${Date.now()}`,
                            claimId: subjectClaimId,
                            sentDate: new Date().toISOString(),
                            recipient: emailDraftData.to,
                            recipientType: 'Insurer',
                            status: 'Sent',
                            templateUsed: 'Standard'
                          };
                          setReminderLogs(prev => [newLog, ...prev]);
                          const senderEmail = getHospitalFromEmail(emailDraftData.hospitalId);
                          toast.success(`Email sent successfully from ${senderEmail}`);
                          setShowEmailDraftModal(false);
                          setIsComposerMinimized(false);
                          setIsComposerMaximized(false);
                        }}
                        className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                      >
                        Send
                      </button>

                      {/* Discard Button beside Send */}
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowEmailDraftModal(false);
                          setIsComposerMinimized(false);
                          setIsComposerMaximized(false);
                          toast.info("Draft discarded");
                        }}
                        className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-bold text-xs uppercase tracking-wider rounded-full transition-all cursor-pointer active:scale-95"
                        title="Discard Draft"
                      >
                        Discard
                      </button>



                      {/* Modern & Polished Attachment Button */}
                      <button 
                        type="button" 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.multiple = true;
                          input.onchange = (e: any) => {
                            const files = Array.from(e.target.files) as File[];
                            setEmailDraftData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
                            toast.success(`Attached ${files.length} file(s) successfully`);
                          };
                          input.click();
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100/80 text-[#141414]/60 hover:text-[#141414] font-bold text-[10px] rounded-full uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm ml-1"
                        title="Attach Files"
                      >
                        <Paperclip size={12} className="text-[#141414]/50" />
                        <span>Attach Files</span>
                        {emailDraftData.attachments.length > 0 && (
                          <span className="px-1.5 py-0.5 text-[8px] font-black bg-blue-600 text-white rounded-full">
                            {emailDraftData.attachments.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email View Modal */}
      <AnimatePresence>
        {selectedEmailForView && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl lg:max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-[#141414] flex flex-col h-[750px] max-h-[92vh]"
            >
              <div className="p-6 border-b border-[#141414]/10 bg-[#F8F8F7] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic font-serif">View Email</h3>
                  <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest mt-1">
                    Sent on {new Date(selectedEmailForView.sentDate).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setSelectedEmailForView(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6 bg-[#F8F8F7] p-5 rounded-xl border border-[#141414]/5">
                    <div>
                      <p className="text-[11px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">From</p>
                      <p className="text-sm font-semibold text-slate-800">Reconciliation Team (ClaimNX)</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">To</p>
                      <p className="text-sm font-semibold text-slate-800">{selectedEmailForView.recipient}</p>
                    </div>
                  </div>
                  <div className="bg-[#F8F8F7] p-5 rounded-xl border border-[#141414]/5">
                    <p className="text-[11px] font-black text-[#141414]/40 uppercase tracking-widest mb-1">Subject</p>
                    <p className="text-base font-black text-[#141414]">{selectedEmailForView.templateUsed} - Claim {selectedEmailForView.claimId}</p>
                  </div>
                  <div className="p-8 bg-[#F8F8F7] rounded-2xl border border-[#141414]/5 min-h-[320px] shadow-sm flex flex-col">
                    <p className="text-sm font-medium text-[#141414]/80 leading-relaxed whitespace-pre-wrap select-text flex-1">
                      Dear {selectedEmailForView.recipientType} Team,
                      {"\n\n"}
                      This is a follow-up regarding the outstanding settlement for Claim NO: {selectedEmailForView.claimId}.
                      As per our records, the file was dispatched on {formatDate(claimsWithAging.find(c => c.id === selectedEmailForView.claimId)?.fileDispatchedDate || new Date())}.
                      {"\n\n"}
                      Kindly provide an update on the settlement status at the earliest.
                      {"\n\n"}
                      Regards,
                      {"\n"}
                      Reconciliation Team
                    </p>
                  </div>

                  {/* Quick Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button 
                      onClick={() => handleEmailAction('reply', selectedEmailForView)}
                      className="px-5 py-2.5 border border-[#141414]/10 hover:border-[#141414] bg-white hover:bg-[#141414]/5 text-slate-700 hover:text-[#141414] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Reply size={14} />
                      Reply
                    </button>
                    <button 
                      onClick={() => handleEmailAction('replyAll', selectedEmailForView)}
                      className="px-5 py-2.5 border border-[#141414]/10 hover:border-[#141414] bg-white hover:bg-[#141414]/5 text-slate-700 hover:text-[#141414] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                    >
                      <ReplyAll size={14} />
                      Reply All
                    </button>
                    <button 
                      onClick={() => handleEmailAction('forward', selectedEmailForView)}
                      className="px-5 py-2.5 border border-[#141414]/10 hover:border-[#141414] bg-white hover:bg-[#141414]/5 text-slate-700 hover:text-[#141414] rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Forward size={14} />
                      Forward
                    </button>
                  </div>

                  {/* Attachments Section */}
                  {emailViewDocuments && emailViewDocuments.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-[#141414]/10">
                      <p className="text-[11px] font-black text-[#141414]/40 uppercase tracking-widest flex items-center gap-1.5">
                        <FileText size={12} className="text-[#141414]/40" />
                        Attachments ({emailViewDocuments.length})
                      </p>
                      
                      {emailViewDocuments.length === 1 ? (
                        // Single attachment: Show beautifully as an attachment file card
                        <div className="flex items-center justify-between p-4 bg-[#F8F8F7] border border-[#141414]/10 rounded-xl hover:bg-[#141414]/5 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{emailViewDocuments[0].name}</p>
                              <p className="text-xs text-slate-400">PDF Document • Ready to download</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePreview(emailViewDocuments[0].name, emailViewDocuments[0].data, emailViewDocuments[0].mimeType)}
                            className="px-4 py-2 bg-slate-200 hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414]/80 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5"
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>
                      ) : (
                        // Multiple attachments: Show as beautiful hyperlinks to download each
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {emailViewDocuments.map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-[#F8F8F7] border border-[#141414]/10 rounded-xl hover:bg-[#141414]/5 transition-all">
                              <FileText size={14} className="text-rose-500 shrink-0" />
                              <button
                                onClick={() => handlePreview(doc.name, doc.data, doc.mimeType)}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800 text-left hover:underline truncate flex-1"
                                title={`Click to download ${doc.name}`}
                              >
                                {doc.name}
                              </button>
                              <Download size={12} className="text-[#141414]/40" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-[#F8F8F7] border-t border-[#141414]/10 flex gap-3 shrink-0">
                <button 
                  onClick={() => {
                    emailViewDocuments.forEach(doc => {
                      handlePreview(doc.name, doc.data, doc.mimeType);
                    });
                    toast.success(`${emailViewDocuments.length} document(s) download initiated`);
                  }}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <FileText size={14} /> Download Documents
                </button>
                <button 
                  onClick={() => setSelectedEmailForView(null)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#141414] text-[#E4E3E0] hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {confirmActionClaim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-[#141414] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 bg-rose-50 border-b border-rose-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <ShieldAlert size={24} />
                  </div>
                  <button onClick={() => setConfirmActionClaim(null)} className="p-2 hover:bg-rose-100 rounded-full transition-colors">
                    <X size={20} className="text-rose-500" />
                  </button>
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-rose-700">Confirm Action</h3>
                <p className="text-xs font-bold text-rose-600/60 uppercase tracking-widest mt-1">
                  Claim NO: {confirmActionClaim.id} • {confirmActionClaim.patientName}
                </p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#141414]">Have you taken the recommended action ({confirmActionClaim.aiFollowUpSuggestion?.recommendedAction})?</p>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Next Follow-up Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/40" size={16} />
                      <input 
                        type="date" 
                        className="w-full pl-12 pr-4 py-3 bg-[#141414]/5 border border-[#141414]/10 rounded-xl text-xs font-bold text-[#141414] outline-none focus:border-[#141414] transition-all"
                        value={nextFollowUpDate}
                        onChange={(e) => setNextFollowUpDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setConfirmActionClaim(null)}
                    className="flex-1 py-3 border border-[#141414]/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#141414]/40 hover:bg-[#141414]/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setActionedClaims(prev => ({
                        ...prev,
                        [confirmActionClaim.id]: nextFollowUpDate
                      }));
                      toast.success(`Action recorded for ${confirmActionClaim.patientName}. Next follow-up: ${nextFollowUpDate}`);
                      setConfirmActionClaim(null);
                    }}
                    className="flex-1 py-3 bg-[#141414] text-[#E4E3E0] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg"
                  >
                    Yes, Action Taken
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View All Priority Modal */}
      <AnimatePresence>
        {showAllPriorityModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#F8F8F7] rounded-[2.5rem] border border-[#141414] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 bg-white border-b border-[#141414]/10 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-widest text-[#141414] flex items-center gap-3">
                    <ShieldAlert size={24} className="text-rose-500" /> High Priority Cases
                  </h3>
                  <p className="text-xs font-bold text-[#141414]/40 uppercase tracking-widest mt-1">
                    {highPriorityClaims.length} cases requiring immediate attention
                  </p>
                </div>
                <button 
                  onClick={() => setShowAllPriorityModal(false)}
                  className="p-3 hover:bg-[#141414]/5 rounded-full transition-colors"
                >
                  <X size={24} className="text-[#141414]" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                {highPriorityClaims.map(claim => (
                  <div key={claim.id} className="bg-white p-6 rounded-2xl border border-[#141414]/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-rose-200 transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-100">
                          {claim.aiFollowUpSuggestion?.score} Score
                        </span>
                        <span className="text-xs font-black text-[#141414]/40 uppercase tracking-widest">{claim.id}</span>
                      </div>
                      <Link to={`/process-claim/${claim.id}?source=recon`} className="text-lg font-black text-[#141414] mb-1 hover:text-blue-600 transition-colors">{claim.patientName}</Link>
                      <div className="flex flex-wrap gap-4 text-[10px] font-bold text-[#141414]/60 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><IndianRupee size={12} /> ₹{((claim.outstandingAmount || 0) / 1000).toFixed(1)}K</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {claim.agingDays} Days Aging</span>
                        <span className="flex items-center gap-1 text-rose-600"><AlertTriangle size={12} /> {claim.aiFollowUpSuggestion?.reason}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block mr-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40 mb-1">Recommended</p>
                        <p className="text-xs font-black text-rose-600 uppercase tracking-widest">{claim.aiFollowUpSuggestion?.recommendedAction}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setConfirmActionClaim(claim);
                        }}
                        className="px-6 py-3 bg-[#141414] text-[#E4E3E0] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg flex items-center gap-2"
                      >
                        {claim.aiFollowUpSuggestion?.recommendedAction === 'Call' ? <Phone size={14} /> : claim.aiFollowUpSuggestion?.recommendedAction === 'Email' ? <Mail size={14} /> : <AlertTriangle size={14} />}
                        Action Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-8 bg-white border-t border-[#141414]/10 flex justify-end">
                <button 
                  onClick={() => setShowAllPriorityModal(false)}
                  className="px-8 py-3 bg-[#141414] text-[#E4E3E0] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Dispatch Modal */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Send size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Manual Report Dispatch</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Send on-demand hospital reports</p>
                  </div>
                </div>
                <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Hospital</label>
                      <select 
                        value={manualRequest.hospitalId}
                        onChange={(e) => handleManualHospitalChange(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      >
                        <option value="">Choose Hospital...</option>
                        {assignedHospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.hospitalName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Use Template</label>
                      <select 
                        value={manualRequest.templateId}
                        onChange={(e) => handleManualTemplateChange(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      >
                        {reportingTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Recipient Email (To)</label>
                      <input 
                        type="text"
                        value={manualRequest.to}
                        onChange={(e) => setManualRequest({...manualRequest, to: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-sans"
                        placeholder="hospital@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">CC Emails</label>
                      <input 
                        type="text"
                        value={manualRequest.cc}
                        onChange={(e) => setManualRequest({...manualRequest, cc: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-sans"
                        placeholder="comma separated emails..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">Email Subject</label>
                    <input 
                      type="text"
                      value={manualRequest.subject}
                      onChange={(e) => setManualRequest({...manualRequest, subject: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-sans"
                      placeholder="Enter subject..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">Email Draft (Body)</label>
                    <textarea 
                      value={manualRequest.body}
                      onChange={(e) => setManualRequest({...manualRequest, body: e.target.value})}
                      rows={6}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all resize-none font-sans"
                      placeholder="Compose report message..."
                    />
                    <p className="text-[9px] text-slate-400 mt-2 font-medium italic font-sans">Note: Report PDF will be attached automatically.</p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                    <p className="text-[10px] text-amber-800 font-bold leading-relaxed font-sans">
                      Manual trigger will use the latest available data as of today for the selected hospital only.
                    </p>
                  </div>
                </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    toast.success(`Report dispatch initiated for ${assignedHospitals.find(h => h.id === manualRequest.hospitalId)?.hospitalName || 'selected hospital'} to ${manualRequest.to}`);
                    setShowManualModal(false);
                    setManualRequest({ hospitalId: '', to: '', cc: '', subject: '', body: '', templateId: 'template-1' });
                  }}
                  disabled={!manualRequest.hospitalId || !manualRequest.to}
                  className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-900/10 disabled:opacity-50 disabled:grayscale font-sans"
                >
                  Dispatch Report Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MultiSelect = ({ options, selected, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-white border border-[#141414]/10 rounded-xl text-xs font-bold text-[#141414] outline-none focus:border-[#141414] transition-all min-w-[150px] flex items-center justify-between gap-2"
      >
        <span className="truncate">{selected.length > 0 ? `${selected.length} ${placeholder}` : `Select ${placeholder}`}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white border border-[#141414]/10 rounded-2xl shadow-2xl z-50 p-2 max-h-64 overflow-y-auto custom-scrollbar"
          >
            {options.map((opt: any) => (
              <label key={opt.value} className="flex items-center gap-3 p-2 hover:bg-[#141414]/5 rounded-xl cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  className="accent-[#141414]"
                  checked={selected.includes(opt.value)}
                  onChange={() => {
                    const next = selected.includes(opt.value) 
                      ? selected.filter((v: any) => v !== opt.value)
                      : [...selected, opt.value];
                    onChange(next);
                  }}
                />
                <span className="text-[10px] font-bold text-[#141414] uppercase tracking-widest">{opt.label}</span>
              </label>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const KPICard = ({ label, value, icon: Icon, trend, trendUp, critical }: any) => (
  <div className={`p-6 rounded-[2rem] border transition-all relative overflow-hidden ${critical ? 'bg-rose-50 border-rose-200' : 'bg-white border-[#141414]/10'}`}>
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${critical ? 'bg-rose-500 text-white' : 'bg-[#141414] text-[#E4E3E0]'}`}>
        <Icon size={20} />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
        {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {trend}
      </div>
    </div>
    <div className="relative z-10">
      <p className="text-[#141414]/40 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <h3 className={`text-2xl font-black ${critical ? 'text-rose-700' : 'text-[#141414]'}`}>{value}</h3>
    </div>
    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#141414]/5 rounded-full blur-2xl"></div>
  </div>
);

export default ReconciliationDashboard;
