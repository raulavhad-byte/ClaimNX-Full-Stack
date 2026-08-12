
import React, { useMemo, useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Clock, 
  Mail, 
  Globe, 
  CheckCircle2, 
  ChevronDown,
  Check,
  ChevronRight, 
  Search, 
  Filter,
  ArrowUpRight,
  TrendingUp,
  History,
  Zap,
  ShieldAlert,
  Send,
  ExternalLink,
  MoreVertical,
  BarChart3,
  Users,
  Trophy,
  ArrowRight,
  Calendar,
  Bell,
  X,
  MessageSquare,
  ArrowDownRight,
  Target,
  Activity,
  User,
  Loader2,
  RefreshCw,
  FileText,
  Eye,
  Download,
  FileSearch,
  ShieldCheck,
  File,
  PlusCircle,
  Hospital,
  Upload,
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
import { Claim, ClaimStatus, HospitalUser, CRMPerformanceMetrics, CRMUserPerformance, AuditLog, TimelineEvent, FormField, InsuranceEntity, KYPPolicy, Product, ReminderLog } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';
import { auditService } from '../services/auditService';
import DownloadReportModal from './DownloadReportModal';
import { toast } from 'sonner';
import PendingTAT from './PendingTAT';
import { formatDate, formatDateTime } from '../utils';

interface CRMDashboardProps {
  claims: Claim[];
  hospitals: HospitalUser[];
  currentUser: HospitalUser;
  users: HospitalUser[];
  onUpdateClaim: (claim: Claim) => void;
  fields: FormField[];
  insurers: InsuranceEntity[];
  tpas: InsuranceEntity[];
  permissions?: string[];
  kypPolicies?: KYPPolicy[];
  setKypPolicies?: React.Dispatch<React.SetStateAction<KYPPolicy[]>>;
  onUpdateInsurer?: (insurer: InsuranceEntity) => void;
}

const CRMDashboard: React.FC<CRMDashboardProps> = ({ 
  claims, 
  hospitals, 
  currentUser, 
  users, 
  onUpdateClaim, 
  fields, 
  insurers, 
  tpas, 
  permissions = [],
  kypPolicies = [],
  setKypPolicies = () => {},
  onUpdateInsurer
}) => {
  const navigate = useNavigate();
  const canCreateClaim = useMemo(() => {
    if (permissions.includes('all')) return true;
    return permissions.some(p => p.startsWith('claims:') || p.startsWith('edit_claims:'));
  }, [permissions]);
  const [filterHospital, setFilterHospital] = useState<string[]>(['all']);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterFailureType, setFilterFailureType] = useState('all');
  const [filterTATRange, setFilterTATRange] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'action-pending' | 'pre-auth-initiated' | 'pre-auth-approved' | 'enhancement-pending' | 'discharge-initiated' | 'discharge-reconsideration' | 'emails'>('action-pending');
  const [searchQuery, setSearchQuery] = useState('');
  const isManager = useMemo(() => {
    const managerRoles = ['CRM Manager', 'Sales Manager', 'Reconciliation Manager', 'Medical Manager', 'Department Head', 'Super Admin', 'Admin'];
    const hasOversightPermission = currentUser.permissionsMatrix?.crm_oversight === true || 
                                   permissions.includes('crm:crm_main:oversight') || 
                                   currentUser.permissionsMatrix?.team_view === true;
    
    return managerRoles.includes(currentUser.role) || currentUser.isAdmin || hasOversightPermission;
  }, [currentUser, permissions]);

  const [viewMode, setViewMode] = useState<'self' | 'manager'>('self');
  const [performancePeriod, setPerformancePeriod] = useState<'today' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('today');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [showQuickAction, setShowQuickAction] = useState<Claim | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [showHospitalSelect, setShowHospitalSelect] = useState(false);

  const assignedHospitals = useMemo(() => {
    if (currentUser.role === 'Super Admin' || currentUser.isAdmin) return hospitals;
    if (!currentUser.assignedHospitalIds || currentUser.assignedHospitalIds.length === 0) return [];
    return hospitals.filter(h => currentUser.assignedHospitalIds?.includes(h.id));
  }, [hospitals, currentUser]);

  const handleNewAdmission = () => {
    if (assignedHospitals.length > 1) {
      setShowHospitalSelect(true);
    } else if (assignedHospitals.length === 1) {
      navigate(`/new-claim?hospitalId=${assignedHospitals[0].id}&source=crm`);
    } else {
      navigate('/new-claim?source=crm');
    }
  };
  const [assignmentConflict, setAssignmentConflict] = useState<{ claim: Claim, assignedUser: HospitalUser } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newFailedCount, setNewFailedCount] = useState(0);
  const [showPatientDashboard, setShowPatientDashboard] = useState<Claim | null>(null);
  const [patientDashboardTab, setPatientDashboardTab] = useState<'timeline' | 'documents' | 'info'>('info');
  const [queryReply, setQueryReply] = useState<{ eventId: string, comment: string } | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string, data: string, type: string } | null>(null);

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState(false);
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

  // Emails Inbox State (similar to Finance Tab)
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

  const [showEmailDraftModal, setShowEmailDraftModal] = useState(false);
  const [isComposerMaximized, setIsComposerMaximized] = useState(false);
  const [isComposerMinimized, setIsComposerMinimized] = useState(false);
  const [isComposerBold, setIsComposerBold] = useState(false);
  const [isComposerItalic, setIsComposerItalic] = useState(false);
  const [isComposerUnderline, setIsComposerUnderline] = useState(false);
  const [composerAlign, setComposerAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [composerList, setComposerList] = useState<'none' | 'bullet' | 'number'>('none');
  const [selectedEmailHospital, setSelectedEmailHospital] = useState<string>('All');
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [emailDraftData, setEmailDraftData] = useState({
    id: '', // added to update existing drafts
    hospitalId: '',
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachments: [] as File[]
  });

  const [currentEmailFolder, setCurrentEmailFolder] = useState<'Inbox' | 'Sent' | 'Draft' | 'Outbox'>('Inbox');
  const [emailsDb, setEmailsDb] = useState<any[]>([]);

  // Email/RPA integrations are optional. A hospital-submitted admission is a
  // CRM work item from the moment it is created, regardless of integration
  // status. Older records did not persist caseSource, so a claim with a
  // hospital assignment and no explicit source is treated as hospital-originated.
  const isHospitalInitiatedClaim = (claim: Claim) => {
    const source = String(claim.caseSource || claim.formData?.caseSource || '').trim().toLowerCase();
    if (source === 'hospital' || source === 'hospital user') return true;
    return !source && Boolean(claim.hospitalId || claim.formData?.hospitalId);
  };

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

  const filteredEmails = useMemo(() => {
    return emailsDb.filter(log => {
      let matchesFolder = false;
      if (currentEmailFolder === 'Inbox') matchesFolder = log.status === 'Received';
      else if (currentEmailFolder === 'Sent') matchesFolder = log.status === 'Sent' || log.status === 'Responded';
      else if (currentEmailFolder === 'Draft') matchesFolder = log.status === 'Draft';
      else if (currentEmailFolder === 'Outbox') matchesFolder = log.status === 'Queued';

      if (!matchesFolder) return false;

      const query = emailSearchQuery.toLowerCase();
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
  }, [emailsDb, currentEmailFolder, emailSearchQuery, selectedEmailHospital]);

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
As per our records, the file has been processed.

Kindly provide an update on the settlement status at the earliest.

Regards,
CRM Team`;

    const emailHeaderQuote = `\n\n\n----- Original Message -----\nFrom: CRM Team (ClaimNX)\nTo: ${emailLog.recipient}\nSent: ${new Date(emailLog.sentDate).toLocaleString()}\nSubject: ${originalSubject}\n\n${originalBody}`;

    if (actionType === 'reply') {
      toVal = emailLog.recipient;
      subjectVal = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
      bodyVal = `Dear ${emailLog.recipientType} Team,

[Write your reply here]

Regards,
CRM Team${emailHeaderQuote}`;
    } else if (actionType === 'replyAll') {
      toVal = emailLog.recipient;
      ccVal = 'billing@claimnx.com, operations@claimnx.com';
      bccVal = 'archive@claimnx.com';
      subjectVal = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
      bodyVal = `Dear ${emailLog.recipientType} Team,

[Write your reply to all here]

Regards,
CRM Team${emailHeaderQuote}`;
    } else if (actionType === 'forward') {
      toVal = '';
      subjectVal = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`;
      bodyVal = `Dear Team,

Forwarding the claim query settlement status update for your reference.

[Add forwarding comments here]

Regards,
CRM Team

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
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await auditService.getLogs();
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch logs for dashboard", err);
      }
    };
    fetchLogs();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showHospitalDropdown && !target.closest('.hospital-filter-container')) {
        setShowHospitalDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHospitalDropdown]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute for TAT
    return () => clearInterval(timer);
  }, []);

  // Safe Auto-Refresh Mechanism
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Pause if user is performing an action (Quick Action modal open or submitting)
      if (showQuickAction || isSubmitting || isAutoRefreshPaused) {
        console.log("Auto-refresh paused due to user action");
        return;
      }
      
      handleRefresh();
    }, 45000); // 45 seconds interval

    return () => clearInterval(refreshInterval);
  }, [showQuickAction, isSubmitting, isAutoRefreshPaused]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    setLastUpdated(new Date());
  };

  // Real performance data calculation
  const performanceData: CRMUserPerformance[] = useMemo(() => {
    const now = new Date();

    const getMetrics = (userId: string, period: 'today' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): CRMPerformanceMetrics => {
      const filterByPeriod = (dateStr: string) => {
        const date = new Date(dateStr);
        if (period === 'today') return date.toDateString() === now.toDateString();
        if (period === 'weekly') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= weekAgo;
        }
        if (period === 'monthly') {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return date >= monthAgo;
        }
        if (period === 'quarterly') {
          const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          return date >= quarterAgo;
        }
        return true;
      };

      const userLogs = logs.filter(l => l.userId === userId && filterByPeriod(l.timestamp));
      const userClaims = claims.filter(c => c.assignedCrmUserId === userId);
      
      const handledIds = new Set(userLogs.filter(l => l.resourceType === 'Claim').map(l => l.resourceId));
      const casesHandled = handledIds.size;
      
      const casesClosed = userClaims.filter(c => 
        (c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.CLAIM_APPROVED) &&
        filterByPeriod(c.updatedAt)
      ).length;
      
      const pendingCases = userClaims.filter(c => 
        !['Complete Settlement', 'Claim Approved', 'Pre Auth Rejected', 'Enhancement Rejected', 'Discharge Rejected'].includes(c.status)
      ).length;

      // Calculate TAT Adherence based on logs
      // For each claim handled, check if the time between logs is > 1h
      let totalActions = userLogs.length;
      let delayedActions = 0;
      // Simplified TAT check: if a claim is currently pending and TAT exceeded, it's a miss
      const currentDelayed = userClaims.filter(c => {
        const updatedAt = new Date(c.updatedAt).getTime();
        const diffHours = (now.getTime() - updatedAt) / (1000 * 60 * 60);
        return c.status.includes('Pending') && diffHours > 1;
      }).length;

      const tatAdherence = casesHandled > 0 ? Math.max(0, Math.min(100, Math.round(((casesHandled - currentDelayed) / casesHandled) * 100))) : 100;
      const successRate = casesHandled > 0 ? Math.round((casesClosed / casesHandled) * 100) : 0;
      const avgProcessingTime = 22; // Mock average

      return {
        casesHandled,
        casesClosed,
        pendingCases,
        tatAdherence,
        successRate,
        avgProcessingTime
      };
    };

    return users.filter(u => {
      if (u.entityType !== 'User') return false;
      
      // Super Admin/Admin sees everyone
      if (currentUser.role === 'Super Admin' || currentUser.isAdmin) return true;
      
      // If I have reports, show them (Manager view)
      const hasReports = users.some(user => user.reportsToId === currentUser.id);
      if (hasReports) {
        return u.reportsToId === currentUser.id;
      }
      
      // If I report to someone, show my team (Peer view)
      if (currentUser.reportsToId) {
        return u.reportsToId === currentUser.reportsToId;
      }
      
      // Always show self in leaderboard
      return u.id === currentUser.id;
    }).map(u => {
      const manager = users.find(manager => manager.id === u.reportsToId);
      return {
        userId: u.id,
        userName: u.displayName ? u.displayName.split(' (')[0] : 'Unknown',
        reportsToName: manager?.displayName ? manager.displayName.split(' (')[0] : 'N/A',
        today: getMetrics(u.id, 'today'),
        weekly: getMetrics(u.id, 'weekly'),
        monthly: getMetrics(u.id, 'monthly'),
        quarterly: getMetrics(u.id, 'quarterly'),
        yearly: getMetrics(u.id, 'yearly')
      };
    });
  }, [users, claims, logs, refreshTrigger]);

  const currentPerformance = useMemo(() => {
    if (viewMode === 'self') {
      const selfPerf = performanceData.find(p => p.userId === currentUser.id);
      return selfPerf ? selfPerf[performancePeriod] : {
        casesHandled: 0, casesClosed: 0, pendingCases: 0, tatAdherence: 100, successRate: 0, avgProcessingTime: 0
      };
    } else {
      // Team average/sum
      const metrics = performanceData.map(p => p[performancePeriod]);
      if (metrics.length === 0) return {
        casesHandled: 0, casesClosed: 0, pendingCases: 0, tatAdherence: 100, successRate: 0, avgProcessingTime: 0
      };
      
      return {
        casesHandled: metrics.reduce((acc, m) => acc + m.casesHandled, 0),
        casesClosed: metrics.reduce((acc, m) => acc + m.casesClosed, 0),
        pendingCases: metrics.reduce((acc, m) => acc + m.pendingCases, 0),
        tatAdherence: Math.round(metrics.reduce((acc, m) => acc + m.tatAdherence, 0) / metrics.length),
        successRate: Math.round(metrics.reduce((acc, m) => acc + m.successRate, 0) / metrics.length),
        avgProcessingTime: Math.round(metrics.reduce((acc, m) => acc + m.avgProcessingTime, 0) / metrics.length)
      };
    }
  }, [performanceData, viewMode, performancePeriod, currentUser.id]);

  // Filter claims based on CRM role requirements
  const baseFilteredClaims = useMemo(() => {
    let filtered = claims;

    // 0. Geographic Restrictions
    if (currentUser.role !== 'Super Admin' && !currentUser.isAdmin) {
      const userZones = currentUser.zones || [];
      const userStates = currentUser.states || [];
      const userDistricts = currentUser.districts || [];

      if (userZones.length > 0 || userStates.length > 0 || userDistricts.length > 0) {
        filtered = filtered.filter(c => {
          const hospId = c.formData?.hospitalId || c.hospitalId;
          const hosp = hospitals.find(h => h.id === hospId);
          const claimZone = hosp?.zone || c.formData?.hosp_zone || '';
          const claimState = hosp?.state || c.formData?.hosp_state || c.formData?.p_state || '';
          const claimDistrict = hosp?.district || c.formData?.hosp_district || c.formData?.p_district || '';

          const zoneMatch = userZones.length === 0 || userZones.includes(claimZone);
          const stateMatch = userStates.length === 0 || userStates.includes(claimState);
          const districtMatch = userDistricts.length === 0 || userDistricts.includes(claimDistrict);

          return zoneMatch && stateMatch && districtMatch;
        });
      }
    }

    // 0.1 CRM Role specific visibility
    if (currentUser.role === 'Claims Processing Executive' || currentUser.role === 'CRM Manager') {
      filtered = filtered.filter(c => {
        const kyp = kypPolicies.find(p => p.claimId === c.id);
        const isKypActive = kyp && !['Completed', 'Rejected'].includes(kyp.status);
        
        const isStatusMatch = [
          ClaimStatus.PENDING_MEDICAL_REVIEW,
          ClaimStatus.MEDICAL_QUERY_RAISED,
          ClaimStatus.MEDICAL_QUERY_REPLIED,
          ClaimStatus.MEDICAL_APPROVED,
          ClaimStatus.MEDICAL_REJECTED,
          ClaimStatus.PRE_AUTH_INITIATED,
          ClaimStatus.KYP_PENDING,
          ClaimStatus.KYP_ACCEPTED,
          ClaimStatus.KYP_COMPLETED,
          ClaimStatus.KYP_REJECTED,
          ClaimStatus.KYP_QUERY_PENDING,
          ClaimStatus.KYP_QUERY_REPLIED
        ].includes(c.status);

        const isIcaOrPrePost = (c.product as any) === Product.ICA || 
                               (c.product as any) === Product.PRE_POST || 
                               (c.product as any) === 'ICA' || 
                               (c.product as any) === 'Pre & Post';

        return isStatusMatch || isKypActive || isIcaOrPrePost;
      });
    }

    // 1. Hospital-based visibility
    if (currentUser.role === 'Claims Processing Executive' && currentUser.assignedHospitalIds) {
      filtered = filtered.filter(c => currentUser.assignedHospitalIds?.includes(c.formData?.hospitalId || ''));
    }

    // 2. Manager view filtering
    if (viewMode === 'manager') {
      if (selectedUser !== 'all') {
        filtered = filtered.filter(c => c.assignedCrmUserId === selectedUser);
      }
    } else if (viewMode === 'self') {
      filtered = filtered.filter(c => c.assignedCrmUserId === currentUser.id || !c.assignedCrmUserId);
    }

    // 3. Filter by hospital selection
    if (!filterHospital.includes('all')) {
      filtered = filtered.filter(c => filterHospital.includes(c.formData?.hospitalId || ''));
    }

    // 4. Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // 5. Filter by stage
    if (filterStage !== 'all') {
      filtered = filtered.filter(c => {
        const stage = Object.values(ClaimStatus).indexOf(c.status);
        if (filterStage === 'pre-auth') return stage <= 9;
        if (filterStage === 'enhancement') return stage >= 10 && stage <= 12;
        if (filterStage === 'discharge') return stage >= 13 && stage <= 19;
        if (filterStage === 'settlement') return stage >= 20;
        return true;
      });
    }

    // 7. Filter by Failure Type
    if (filterFailureType !== 'all') {
      filtered = filtered.filter(c => c.failureType === filterFailureType);
    }

    // 8. Filter by TAT Range
    if (filterTATRange !== 'all') {
      filtered = filtered.filter(c => {
        const tat = getTATStatus(c);
        return tat.level === filterTATRange;
      });
    }

    // 9. Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.patientName.toLowerCase().includes(q) || 
        c.id.toLowerCase().includes(q) ||
        c.insuranceProvider.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [claims, currentUser, filterHospital, filterStatus, filterStage, searchQuery, viewMode, selectedUser, filterFailureType, filterTATRange, currentTime, refreshTrigger]);

  const crmClaims = useMemo(() => {
    let filtered = baseFilteredClaims;
    
    // 6. Action Pending Bucket Logic
    if (activeTab === 'action-pending') {
      filtered = filtered.filter(c => 
        isHospitalInitiatedClaim(c) ||
        c.submissionStatus === 'Failed' || 
        c.status === ClaimStatus.MEDICAL_REJECTED || 
        c.status === ClaimStatus.DISCHARGE_INITIATED ||
        c.status === ClaimStatus.MEDICAL_QUERY_RAISED ||
        c.status === ClaimStatus.MEDICAL_QUERY_REPLIED ||
        (c.product as any) === Product.ICA || 
        (c.product as any) === Product.PRE_POST || 
        (c.product as any) === 'ICA' || 
        (c.product as any) === 'Pre & Post'
      );
    } else if (activeTab === 'pre-auth-initiated') {
      filtered = filtered.filter(c => c.status === ClaimStatus.PRE_AUTH_INITIATED);
    } else if (activeTab === 'pre-auth-approved') {
      filtered = filtered.filter(c => c.status === ClaimStatus.PRE_AUTH_APPROVED);
    } else if (activeTab === 'enhancement-pending') {
      filtered = filtered.filter(c => c.status === ClaimStatus.ENHANCEMENT);
    } else if (activeTab === 'discharge-initiated') {
      filtered = filtered.filter(c => c.status === ClaimStatus.DISCHARGE_INITIATED);
    } else if (activeTab === 'discharge-reconsideration') {
      filtered = filtered.filter(c => c.status === ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED);
    }

    return filtered;
  }, [baseFilteredClaims, activeTab]);

  const handleReplyQuery = async () => {
    if (!queryReply || !showPatientDashboard) return;
    
    setIsReplying(true);
    try {
      // Find the KYP policy for this claim
      const policy = kypPolicies.find(p => p.claimId === showPatientDashboard.id);
      if (policy) {
        // Update KYP status back to Accepted
        const updatedPolicy: KYPPolicy = {
          ...policy,
          status: 'Query Replied',
          lastUpdatedDate: new Date().toISOString()
        };
        setKypPolicies(prev => prev.map(p => p.id === policy.id ? updatedPolicy : p));
      }

      // Add reply event to claim history
      const replyEvent: TimelineEvent = {
        id: `KYP-REPLY-${Date.now()}`,
        status: ClaimStatus.KYP_QUERY_REPLIED,
        comment: queryReply.comment,
        date: new Date().toISOString(),
        type: 'status_change'
      };

      // Do not alter main case status if it's already in main workflow
      const kypStatuses = [
        ClaimStatus.KYP_PENDING,
        ClaimStatus.KYP_ACCEPTED,
        ClaimStatus.KYP_QUERY_PENDING,
        ClaimStatus.KYP_QUERY_REPLIED,
        ClaimStatus.KYP_COMPLETED,
        ClaimStatus.KYP_REJECTED
      ];
      
      let nextStatus = showPatientDashboard.status;
      const isPartnerProcessing = showPatientDashboard.product === Product.PARTNER_PROCESSING || 
                                 String(showPatientDashboard.product).includes('Partner');

      if (kypStatuses.includes(showPatientDashboard.status) || showPatientDashboard.status === ClaimStatus.ASSESSMENT_QUERY_PENDING) {
        nextStatus = isPartnerProcessing ? ClaimStatus.ASSESSMENT_QUERY_REPLIED : ClaimStatus.KYP_QUERY_REPLIED;
        
        if (showPatientDashboard.queryRaisedBy === 'Medical Underwriting') {
          nextStatus = isPartnerProcessing ? ClaimStatus.ASSESSMENT_QUERY_REPLIED : ClaimStatus.PENDING_MEDICAL_REVIEW;
        } else if (showPatientDashboard.queryRaisedBy === 'KYP') {
          nextStatus = isPartnerProcessing ? ClaimStatus.ASSESSMENT_INITIATED : ClaimStatus.KYP_QUERY_REPLIED;
        }
      }

      const updatedClaim: Claim = {
        ...showPatientDashboard,
        status: nextStatus,
        history: [replyEvent, ...showPatientDashboard.history],
        updatedAt: new Date().toISOString()
      };

      onUpdateClaim(updatedClaim);
      setShowPatientDashboard(updatedClaim);
      setQueryReply(null);
      toast.success("Query replied successfully");
    } catch (error) {
      toast.error("Failed to reply to query");
    } finally {
      setIsReplying(false);
    }
  };

  const stats = useMemo(() => {
    const failed = baseFilteredClaims.filter(c => 
      isHospitalInitiatedClaim(c) ||
      c.submissionStatus === 'Failed' || 
      c.status === ClaimStatus.MEDICAL_REJECTED || 
      c.status === ClaimStatus.DISCHARGE_INITIATED ||
      c.status === ClaimStatus.MEDICAL_QUERY_RAISED ||
      c.status === ClaimStatus.MEDICAL_QUERY_REPLIED ||
      (c.product as any) === Product.ICA || 
      (c.product as any) === Product.PRE_POST || 
      (c.product as any) === 'ICA' || 
      (c.product as any) === 'Pre & Post'
    ).length;
    const preAuthInitiated = baseFilteredClaims.filter(c => c.status === ClaimStatus.PRE_AUTH_INITIATED).length;
    const preAuthApproved = baseFilteredClaims.filter(c => c.status === ClaimStatus.PRE_AUTH_APPROVED).length;
    const enhancementPending = baseFilteredClaims.filter(c => c.status === ClaimStatus.ENHANCEMENT).length;
    const dischargeInitiated = baseFilteredClaims.filter(c => c.status === ClaimStatus.DISCHARGE_INITIATED).length;
    const dischargeReconsideration = baseFilteredClaims.filter(c => c.status === ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED).length;
    const approvalPending = baseFilteredClaims.filter(c => c.status.includes('Pending') || c.status.includes('Initiated')).length;

    return { 
      failed, 
      preAuthInitiated, 
      preAuthApproved, 
      enhancementPending, 
      dischargeInitiated, 
      dischargeReconsideration,
      approvalPending 
    };
  }, [baseFilteredClaims]);

  useEffect(() => {
    const failed = claims.filter(c => 
      isHospitalInitiatedClaim(c) ||
      c.submissionStatus === 'Failed' || 
      c.status === ClaimStatus.MEDICAL_REJECTED || 
      c.status === ClaimStatus.DISCHARGE_INITIATED ||
      c.status === ClaimStatus.MEDICAL_QUERY_RAISED ||
      c.status === ClaimStatus.MEDICAL_QUERY_REPLIED ||
      (c.product as any) === Product.ICA || 
      (c.product as any) === Product.PRE_POST || 
      (c.product as any) === 'ICA' || 
      (c.product as any) === 'Pre & Post'
    ).length;
    if (failed > stats.failed) {
      setNewFailedCount(prev => prev + (failed - stats.failed));
    }
  }, [claims, stats.failed]);

  const getHospitalName = (id: string) => {
    return hospitals.find(h => h.id === id)?.hospitalName || 'Unknown Hospital';
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    return formatDateTime(dateStr);
  };

  const createBlobUrl = (dataOrBase64: string, mimeType: string = 'application/pdf'): string => {
    if (!dataOrBase64) return '';
    if (dataOrBase64.startsWith('blob:') || dataOrBase64.startsWith('http://') || dataOrBase64.startsWith('https://')) {
      return dataOrBase64;
    }
    try {
      let base64 = dataOrBase64;
      if (base64.includes(',')) {
        base64 = base64.split(',')[1];
      }
      base64 = base64.replace(/\s/g, '');
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("Error creating Blob URL:", err);
      if (dataOrBase64.startsWith('data:')) return dataOrBase64;
      return `data:${mimeType};base64,${dataOrBase64}`;
    }
  };

  const handleDownload = (name: string, data: string, type: string) => {
    if (data === "[STRIPPED_FOR_LOCAL_CACHE]") {
      toast.error("This test file was stripped. Please upload a new file to view or download it.");
      return;
    }
    const link = document.createElement('a');
    link.href = data;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (fileName: string, fileData: string, mimeType?: string) => {
    if (!fileData) {
      toast.error("Document data is empty or not available.");
      return;
    }

    const trimmedData = fileData.trim();
    if (trimmedData === "[STRIPPED_FOR_LOCAL_CACHE]") {
      toast.error("This test file was stripped. Please upload a new file to view or download it.");
      setPreviewFile({
        name: fileName,
        data: "[STRIPPED_FOR_LOCAL_CACHE]",
        type: mimeType || 'application/pdf'
      });
      return;
    }

    let resolvedMime = mimeType || "application/pdf";
    const nameLower = fileName.toLowerCase();
    if (nameLower.endsWith(".png")) resolvedMime = "image/png";
    else if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) resolvedMime = "image/jpeg";
    else if (nameLower.endsWith(".pdf")) resolvedMime = "application/pdf";
    else if (nameLower.endsWith(".xls")) resolvedMime = "application/vnd.ms-excel";
    else if (nameLower.endsWith(".xlsx")) resolvedMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    let finalPreviewUrl = trimmedData;
    if (resolvedMime === 'application/pdf' || nameLower.endsWith('.pdf')) {
      finalPreviewUrl = createBlobUrl(trimmedData, 'application/pdf');
    } else if (resolvedMime.startsWith('image/')) {
      if (!trimmedData.startsWith("data:") && !trimmedData.startsWith("http://") && !trimmedData.startsWith("https://") && !trimmedData.startsWith("blob:")) {
        finalPreviewUrl = `data:${resolvedMime};base64,${trimmedData}`;
      }
    } else if (!trimmedData.startsWith("data:") && !trimmedData.startsWith("http://") && !trimmedData.startsWith("https://") && !trimmedData.startsWith("blob:")) {
      finalPreviewUrl = `data:${resolvedMime};base64,${trimmedData}`;
    }

    setPreviewFile({
      name: fileName,
      data: finalPreviewUrl,
      type: resolvedMime
    });
  };

  const getTATStatus = (claim: Claim) => {
    const updatedAt = new Date(claim.updatedAt).getTime();
    const now = currentTime.getTime();
    const diffMins = (now - updatedAt) / (1000 * 60);

    if (diffMins >= 15) {
      return { level: 'critical', label: 'T.A.T Exceeded (15m+)', color: 'text-rose-600 bg-rose-50 border-rose-100' };
    }
    if (diffMins >= 10) {
      return { level: 'warning', label: 'Pending (10-15m)', color: 'text-[#B8860B] bg-amber-50 border-amber-100' };
    }
    return { level: 'normal', label: 'On Track (<10m)', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  };

  const [quickActionStage, setQuickActionStage] = useState('');
  const [quickActionRemarks, setQuickActionRemarks] = useState('');

  useEffect(() => {
    if (showQuickAction) {
      setQuickActionStage('Pre-Auth'); // Default or derive from status
      setQuickActionRemarks('');
    }
  }, [showQuickAction]);

  const handleQuickUpdate = (claimId: string, updates: Partial<Claim>, actionType?: 'Email' | 'Portal') => {
    const claim = claims.find(c => c.id === claimId);
    if (claim) {
      const finalRemarks = quickActionRemarks ? `${quickActionRemarks}${actionType ? ` (${actionType} Submission)` : ''}` : (actionType ? `Manual ${actionType} Submission` : '');
      
      const updatedClaim: Claim = { 
        ...claim, 
        ...updates, 
        updatedAt: new Date().toISOString(),
        submissionStatus: actionType ? 'Success' : claim.submissionStatus,
        manualSubmissionType: actionType || claim.manualSubmissionType,
        manualSubmissionAt: actionType ? new Date().toISOString() : claim.manualSubmissionAt,
        history: [
          {
            id: `crm-${Date.now()}`,
            status: (updates.status as ClaimStatus) || claim.status,
            type: 'status_change',
            date: new Date().toISOString(),
            comment: finalRemarks || 'Quick update from dashboard'
          },
          ...claim.history
        ]
      };
      
      onUpdateClaim(updatedClaim);
      auditService.log({
        userId: currentUser.id,
        userName: currentUser.displayName,
        action: actionType ? `Manual ${actionType} Submission` : `Quick Update: ${Object.keys(updates).join(', ')}`,
        resourceId: claimId,
        resourceType: 'Claim',
        newValues: { ...updates, remarks: quickActionRemarks }
      });
      setShowQuickAction(null);
    }
  };

  const triggerAction = async (claimId: string, type: 'Email' | 'Portal') => {
    setIsSubmitting(`${claimId}-${type}`);
    // Process action immediately
    handleQuickUpdate(claimId, { status: showQuickAction?.status || ClaimStatus.PRE_AUTH_INITIATED }, type);
    setIsSubmitting(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Failed Case Toast Notification */}
      {newFailedCount > 0 && (
        <div className="fixed top-24 right-8 z-[100] animate-in slide-in-from-right-8 fade-in duration-500">
          <div className="bg-rose-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20 backdrop-blur-md">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Action Required</p>
              <p className="text-[11px] font-bold opacity-90">{newFailedCount} new failed case(s) added to bucket.</p>
            </div>
            <button 
              onClick={() => { setNewFailedCount(0); setActiveTab('action-pending'); }}
              className="ml-4 px-4 py-2 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
            >
              View Bucket
            </button>
            <button onClick={() => setNewFailedCount(0)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">CRM Command Center</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Real-time Workflow & Performance Monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Updated</p>
            <p className="text-[11px] font-bold text-slate-600">{lastUpdated.toLocaleTimeString()}</p>
          </div>

          <button 
            onClick={handleRefresh}
            className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm active:rotate-180 duration-500"
          >
            <RefreshCw size={20} />
          </button>

          <button 
            onClick={() => setShowDownloadModal(true)}
            className="px-6 py-3 bg-[#000080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all active:scale-95 flex items-center"
          >
            <Download size={16} className="mr-2" />
            Download Report
          </button>

          <button 
            onClick={() => setShowManualModal(true)}
            className="px-6 py-3 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/20 hover:bg-orange-600 transition-all active:scale-95 flex items-center"
          >
            <Send size={16} className="mr-2" />
            Manual Dispatch
          </button>

          {canCreateClaim && (
            <button 
              onClick={handleNewAdmission}
              className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center"
            >
              <PlusCircle size={16} className="mr-2" />
              New Admission
            </button>
          )}



          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
            >
              <Bell size={20} />
              {stats.approvalPending > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {stats.approvalPending}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Critical Alerts</h4>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                  {crmClaims.filter(c => getTATStatus(c).level === 'critical').map(c => (
                    <div key={c.id} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">TAT EXCEEDED</span>
                        <span className="text-[9px] font-bold text-rose-400">{new Date(c.updatedAt).toLocaleTimeString()}</span>
                      </div>
                      <Link to={`/process-claim/${c.id}?source=crm`} className="text-xs font-bold text-slate-800 hover:text-rose-600 transition-colors">{c.patientName}</Link>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Case {c.id} is pending approval for over 1 hour. Immediate action required.</p>
                      <button 
                        onClick={() => { navigate(`/crm-handle/${c.id}`); setShowNotifications(false); }}
                        className="text-[9px] font-black text-rose-600 uppercase tracking-widest flex items-center"
                      >
                        Handle Now <ArrowRight size={12} className="ml-1" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Dashboard Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><Activity size={20} /></div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Workflow Dashboard
            </h3>
          </div>
        </div>



        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <PerformanceCard 
            label="Action Pending" 
            value={stats.failed} 
            icon={ShieldAlert} 
            color="rose" 
            isCritical={stats.failed > 0} 
            onClick={() => setActiveTab('action-pending')}
          />
          <PerformanceCard 
            label="Pre-Auth Initiated" 
            value={stats.preAuthInitiated} 
            icon={Zap} 
            color="blue" 
            onClick={() => setActiveTab('pre-auth-initiated')}
          />
          <PerformanceCard 
            label="Pre-Auth Approved" 
            value={stats.preAuthApproved} 
            icon={CheckCircle2} 
            color="emerald" 
            onClick={() => setActiveTab('pre-auth-approved')}
          />
          <PerformanceCard 
            label="Enhancement Pending" 
            value={stats.enhancementPending} 
            icon={ArrowUpRight} 
            color="amber" 
            onClick={() => setActiveTab('enhancement-pending')}
          />
          <PerformanceCard 
            label="Discharge Initiated" 
            value={stats.dischargeInitiated} 
            icon={ExternalLink} 
            color="indigo" 
            onClick={() => setActiveTab('discharge-initiated')}
          />
          <PerformanceCard 
            label="Discharge Recon" 
            value={stats.dischargeReconsideration} 
            icon={RefreshCw} 
            color="purple" 
            onClick={() => setActiveTab('discharge-reconsideration')}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8">
        {/* Case Listing & Workflow */}
        <div className="space-y-6">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('action-pending')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 relative whitespace-nowrap ${activeTab === 'action-pending' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ShieldAlert size={16} />
              Action Pending
              {stats.failed > 0 && (
                <>
                  <span className="ml-1 px-2 py-0.5 bg-white text-rose-600 rounded-full text-[10px] font-black">
                    {stats.failed}
                  </span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
                </>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <BarChart3 size={16} />
              All Cases
            </button>

            <button 
              onClick={() => setActiveTab('emails')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'emails' ? 'bg-[#000080] text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Mail size={16} />
              Emails
            </button>
            
            {/* Hidden tabs that can still be activated via cards */}
            {['pre-auth-initiated', 'pre-auth-approved', 'enhancement-pending', 'discharge-initiated', 'discharge-reconsideration'].includes(activeTab) && (
              <div className="flex items-center ml-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 animate-in fade-in slide-in-from-left-2">
                Filtered: {activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                <button onClick={() => setActiveTab('all')} className="ml-2 hover:text-blue-800"><X size={12} /></button>
              </div>
            )}
          </div>

          {activeTab === 'emails' ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search Emails..." 
                      className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-50 focus:border-rose-600 transition-all w-full md:w-64"
                      value={emailSearchQuery}
                      onChange={(e) => setEmailSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <select 
                      className="pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-rose-600 appearance-none cursor-pointer"
                      value={selectedEmailHospital}
                      onChange={(e) => setSelectedEmailHospital(e.target.value)}
                    >
                      <option value="All">All Hospitals</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.hospitalName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
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
                  className="px-6 py-3 bg-[#000080] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95 flex items-center"
                >
                  <PlusCircle size={16} className="mr-2" />
                  Draft New Email
                </button>
              </div>

              {/* CRM Dashboard Emails category folder tabs bar */}
              <div className="px-8 py-4 bg-white border-b border-slate-100 flex flex-wrap gap-2 items-center">
                {[
                  { key: 'Inbox', label: 'Inbox', icon: Inbox, color: 'text-indigo-600' },
                  { key: 'Sent', label: 'Sent', icon: Send, color: 'text-emerald-600' },
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
                          ? 'bg-[#000080]/10 border border-[#000080]/20 text-[#000080]' 
                          : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-600 hover:bg-[#000080]/5'
                      }`}
                    >
                      <folder.icon size={14} className={isActive ? 'text-[#000080]' : folder.color} />
                      <span>{folder.label}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-[#000080] text-white' : 'bg-slate-100 text-slate-500'
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
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-8 py-5">Date / Time</th>
                      <th className="px-8 py-5">Claim NO</th>
                      <th className="px-8 py-5">{currentEmailFolder === 'Inbox' ? 'Sender' : 'Recipient'}</th>
                      <th className="px-8 py-5">Subject / Template</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmails.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                          No emails in {currentEmailFolder} folder
                        </td>
                      </tr>
                    ) : (
                      filteredEmails.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-6">
                            <p className="text-xs font-black text-slate-700">{formatDate(log.sentDate)}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {log.scheduledTime ? `Sched: ${new Date(log.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : new Date(log.sentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs font-mono font-bold text-slate-700">{log.claimId}</p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs font-black text-slate-700">{currentEmailFolder === 'Inbox' ? log.sender : log.recipient}</p>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-widest rounded">{log.recipientType}</span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs font-bold text-slate-700 truncate max-w-xs">{log.subject || log.templateUsed}</p>
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
                                    className="px-3 py-1.5 bg-[#000080] text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-black transition-all"
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
                                    className="p-2 text-rose-600 hover:bg-rose-55 hover:text-rose-700 transition-all rounded"
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
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-emerald-700 transition-all"
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
                                    className="p-2 text-rose-600 hover:bg-rose-55 hover:text-rose-700 transition-all rounded"
                                    title="Cancel sending"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => setSelectedEmailForView(log)}
                                    className="p-2 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-all text-slate-500"
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
          ) : (
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by Patient, ID or Insurer..." 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-50 focus:border-rose-600 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Multi-select Hospital Filter */}
                <div className="relative hospital-filter-container">
                  <button 
                    onClick={() => setShowHospitalDropdown(!showHospitalDropdown)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-600 outline-none focus:ring-4 focus:ring-rose-50 uppercase tracking-widest flex items-center gap-2 min-w-[160px] justify-between"
                  >
                    <span className="truncate max-w-[120px]">
                      {filterHospital.includes('all') 
                        ? 'All Hospitals' 
                        : filterHospital.length === 1 
                          ? hospitals.find(h => h.id === filterHospital[0])?.hospitalName || '1 Hospital'
                          : `${filterHospital.length} Hospitals`}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${showHospitalDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showHospitalDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 max-h-64 overflow-y-auto">
                      <button 
                        onClick={() => {
                          setFilterHospital(['all']);
                          setShowHospitalDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center justify-between"
                      >
                        All Hospitals
                        {filterHospital.includes('all') && <Check size={14} className="text-rose-600" />}
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      {hospitals
                        .filter(h => !currentUser.assignedHospitalIds || currentUser.assignedHospitalIds.includes(h.id))
                        .map(h => {
                          const isSelected = filterHospital.includes(h.id);
                          return (
                            <button 
                              key={h.id}
                              onClick={() => {
                                let next;
                                if (isSelected) {
                                  next = filterHospital.filter(id => id !== h.id);
                                  if (next.length === 0) next = ['all'];
                                } else {
                                  next = filterHospital.filter(id => id !== 'all');
                                  next.push(h.id);
                                }
                                setFilterHospital(next);
                              }}
                              className="w-full px-4 py-2 text-left text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-50 flex items-center justify-between"
                            >
                              <span className="truncate mr-2">{h.hospitalName}</span>
                              {isSelected && <Check size={14} className="text-rose-600" />}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
                
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-600 outline-none focus:ring-4 focus:ring-rose-50 uppercase tracking-widest"
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                >
                  <option value="all">All Stages</option>
                  <option value="pre-auth">Pre-Auth</option>
                  <option value="enhancement">Enhancement</option>
                  <option value="discharge">Discharge</option>
                  <option value="settlement">Settlement</option>
                </select>

                {activeTab === 'action-pending' && (
                  <>
                    <select 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-600 outline-none focus:ring-4 focus:ring-rose-50 uppercase tracking-widest"
                      value={filterFailureType}
                      onChange={(e) => setFilterFailureType(e.target.value)}
                    >
                      <option value="all">All Failures</option>
                      <option value="Email">Email Failed</option>
                      <option value="Portal">Portal Failed</option>
                    </select>
                    
                    <select 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-600 outline-none focus:ring-4 focus:ring-rose-50 uppercase tracking-widest"
                      value={filterTATRange}
                      onChange={(e) => setFilterTATRange(e.target.value)}
                    >
                      <option value="all">All TAT</option>
                      <option value="critical">Critical ({'>'}1h)</option>
                      <option value="warning">Warning (30-60m)</option>
                      <option value="normal">Normal ({'<'}30m)</option>
                    </select>
                  </>
                )}

                {viewMode === 'manager' && (
                  <select 
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-600 outline-none focus:ring-4 focus:ring-rose-50 uppercase tracking-widest shadow-sm"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="all">All My Executives</option>
                    {users.filter(u => {
                      if (u.role !== 'Claims Processing Executive') return false;
                      if (currentUser.role === 'Super Admin' || currentUser.isAdmin) return true;
                      return u.reportsToId === currentUser.id;
                    }).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.displayName ? u.displayName.split(' (')[0] : (u.username || 'User')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Claims Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Case & Workflow</th>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                    <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospital & TPA</th>
                    {activeTab === 'action-pending' ? (
                      <>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Failure Type</th>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TAT</th>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned CRM</th>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stage</th>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status & Action</th>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">TAT</th>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stage</th>
                        <th className="px-3 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {crmClaims.length > 0 ? crmClaims.map((claim) => {
                    const getStatusRowColor = () => {
                      if (claim.submissionStatus === 'Failed' || claim.status === ClaimStatus.MEDICAL_REJECTED) {
                        return 'bg-rose-50/40 hover:bg-rose-100/50';
                      }
                      if (claim.status === ClaimStatus.PRE_AUTH_INITIATED) {
                        return 'bg-amber-50/40 hover:bg-amber-100/50';
                      }
                      if (claim.status === ClaimStatus.PRE_AUTH_APPROVED) {
                        return 'bg-emerald-50/40 hover:bg-emerald-100/50';
                      }
                      if (claim.status === ClaimStatus.ENHANCEMENT) {
                        return 'bg-blue-50/40 hover:bg-blue-100/50';
                      }
                      if (claim.status === ClaimStatus.DISCHARGE_INITIATED) {
                        return 'bg-indigo-50/40 hover:bg-indigo-100/50';
                      }
                      if (claim.status === ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED) {
                        return 'bg-orange-50/40 hover:bg-orange-100/50';
                      }
                      return 'hover:bg-slate-50/50';
                    };

                    return (
                      <tr key={claim.id} className={`${getStatusRowColor()} transition-colors group border-b border-white/50`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                              claim.submissionStatus === 'Failed' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {claim.submissionStatus === 'Failed' ? <ShieldAlert size={16} /> : <Activity size={16} />}
                            </div>
                            <div>
                              <Link to={`/process-claim/${claim.id}?source=crm`} className="text-xs font-black text-slate-800 hover:text-rose-600 transition-colors">{claim.patientName}</Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{claim.id}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                  {claim.status.includes('Pre Auth') || claim.status.includes('MEDICAL') || claim.status === ClaimStatus.INITIAL_QUERY_PENDING || claim.status.includes('Enhancement') ? 'Pre auth & Enhancement' : 
                                   claim.status.includes('Discharge') ? 'Discharge' : 'Settlement'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest">
                            {claim.product || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[120px]">{getHospitalName(claim.formData?.hospitalId || '')}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{claim.formData?.tpa_provider || claim.insuranceProvider}</p>
                        </td>
                        {activeTab === 'action-pending' ? (
                          <>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                                  {isHospitalInitiatedClaim(claim) ? 'Hospital admission awaiting CRM action' :
                                   claim.failureType === 'RPA' ? 'RPA portal failed' :
                                   claim.failureType === 'Email' ? 'Email integration failed' : 
                                   claim.failureType === 'Portal' ? 'Portal failed' : 'System Failed'}
                                </p>
                              </div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Last: {formatDate(claim.updatedAt)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <PendingTAT 
                                startTime={claim.updatedAt} 
                                completedTime={claim.manualSubmissionAt} 
                                type="crm" 
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                                  <User size={12} className="text-slate-400" />
                                </div>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight">
                                  {users.find(u => u.id === claim.assignedCrmUserId)?.displayName || 'Unassigned'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-left">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                  claim.status === ClaimStatus.INITIAL_QUERY_PENDING ? 'bg-yellow-400 text-yellow-950' :
                                  claim.status === ClaimStatus.PRE_AUTH_INITIATED ? 'bg-yellow-400 text-yellow-950' :
                                  'bg-yellow-400 text-yellow-950'
                                }`}>
                                  {claim.status}
                                </span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${claim.status.includes('Approved') ? 'bg-emerald-500' : claim.status.includes('Rejected') ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{claim.status}</p>
                                </div>
                                {claim.status.includes('Pending') && (
                                  <div className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100">
                                    <span className="text-[8px] font-black uppercase tracking-widest">Action Required</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <PendingTAT 
                                startTime={claim.updatedAt} 
                                completedTime={claim.manualSubmissionAt} 
                                type="crm" 
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-left">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                  claim.status === ClaimStatus.INITIAL_QUERY_PENDING ? 'bg-yellow-400 text-yellow-950' :
                                  claim.status === ClaimStatus.PRE_AUTH_INITIATED ? 'bg-yellow-400 text-yellow-950' :
                                  'bg-yellow-400 text-yellow-950'
                                }`}>
                                  {claim.status}
                                </span>
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              {(claim.status === ClaimStatus.PRE_AUTH_INITIATED || (claim.status === ClaimStatus.INITIAL_QUERY_PENDING && claim.submissionStatus === 'Failed')) && (
                                <button 
                                  onClick={async () => {
                                    setIsSubmitting(claim.id);
                                    try {
                                      const updatedClaim: Claim = {
                                        ...claim,
                                        status: ClaimStatus.PRE_AUTH_INITIATED,
                                        submissionStatus: 'Success',
                                        manualSubmissionAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                        history: [
                                          {
                                            id: Date.now().toString(),
                                            date: new Date().toISOString(),
                                            status: ClaimStatus.PRE_AUTH_INITIATED as any,
                                            comment: 'Case manually submitted to Insurer/TPA via CRM.',
                                            type: 'status_change'
                                          },
                                          ...(claim.history || [])
                                        ]
                                      };
                                      onUpdateClaim(updatedClaim);
                                      toast.success("Case submitted to Insurer/TPA successfully");
                                    } catch (e) {
                                      toast.error("Failed to submit case");
                                    } finally {
                                      setIsSubmitting(null);
                                    }
                                  }}
                                  disabled={isSubmitting === claim.id}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
                                >
                                  {isSubmitting === claim.id ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                  Send to Insurer
                                </button>
                              )}
                              
                              <button 
                                onClick={async () => {
                                  if (claim.assignedCrmUserId && claim.assignedCrmUserId !== currentUser.id) {
                                    const assignedUser = users.find(u => u.id === claim.assignedCrmUserId);
                                    if (assignedUser) {
                                      setAssignmentConflict({ claim, assignedUser });
                                      return;
                                    }
                                  }
                                  
                                  // If unassigned, assign to self
                                  if (!claim.assignedCrmUserId) {
                                    const updatedClaim: Claim = {
                                      ...claim,
                                      assignedCrmUserId: currentUser.id,
                                      updatedAt: new Date().toISOString(),
                                      history: [
                                        {
                                          id: Date.now().toString(),
                                          date: new Date().toISOString(),
                                          status: claim.status as any,
                                          comment: `Case picked up by ${currentUser.displayName}`,
                                          type: 'status_change'
                                        },
                                        ...(claim.history || [])
                                      ]
                                    };
                                    onUpdateClaim(updatedClaim);
                                  }
                                  
                                  navigate(`/crm-handle/${claim.id}`);
                                }}
                                className={`px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95 ${claim.assignedCrmUserId ? 'animate-blink' : ''}`}
                              >
                                Handle
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <CheckCircle2 size={32} />
                          </div>
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No cases matching filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

        {/* Manager Insights (Moved below table for full width support) */}
        {viewMode === 'manager' && (
          <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl space-y-6 mt-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-rose-400"><ShieldAlert size={20} /></div>
              <h3 className="text-sm font-black uppercase tracking-tight">Manager Insights</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Bottleneck Alert</p>
                <p className="text-[11px] font-medium leading-relaxed text-slate-300">Certain regional cases are aging 30% faster than average. Consider re-assigning resources.</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Top Performer</p>
                <p className="text-[11px] font-medium leading-relaxed text-slate-300">Rahul Avhad has achieved 98% TAT adherence this week. Best for high-priority cases.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Modal */}
      {showQuickAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Quick Case Action</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Case: {showQuickAction.id}</p>
                </div>
              </div>
              <button onClick={() => setShowQuickAction(null)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"><X size={20} /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Stage</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-50"
                    value={quickActionStage}
                    onChange={(e) => setQuickActionStage(e.target.value)}
                  >
                    <option>Pre-Auth</option>
                    <option>Enhancement</option>
                    <option>Discharge</option>
                    <option>Settlement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-50"
                    value={showQuickAction.status}
                    onChange={(e) => setShowQuickAction({ ...showQuickAction, status: e.target.value as ClaimStatus })}
                  >
                    {Object.values(ClaimStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Remarks</label>
                <textarea 
                  placeholder="Add your manual processing remarks here..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-50 min-h-[100px]"
                  value={quickActionRemarks}
                  onChange={(e) => setQuickActionRemarks(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => triggerAction(showQuickAction.id, 'Email')}
                  disabled={!!isSubmitting}
                  className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border transition-all disabled:opacity-50 ${
                    showQuickAction.failureType === 'Email' ? 'bg-rose-50 border-rose-200 text-rose-600 ring-4 ring-rose-50' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showQuickAction.failureType === 'Email' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}>
                    {isSubmitting === `${showQuickAction.id}-Email` ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Resend Email</span>
                  {showQuickAction.failureType === 'Email' && <span className="text-[8px] font-bold uppercase">Action Required</span>}
                </button>
                <button 
                  onClick={() => triggerAction(showQuickAction.id, 'Portal')}
                  disabled={!!isSubmitting}
                  className={`flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border transition-all disabled:opacity-50 ${
                    showQuickAction.failureType === 'Portal' ? 'bg-rose-50 border-rose-200 text-rose-600 ring-4 ring-rose-50' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showQuickAction.failureType === 'Portal' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {isSubmitting === `${showQuickAction.id}-Portal` ? <Loader2 size={20} className="animate-spin" /> : <Globe size={20} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Open Portal</span>
                  {showQuickAction.failureType === 'Portal' && <span className="text-[8px] font-bold uppercase">Action Required</span>}
                </button>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  onClick={() => { navigate(`/process-claim/${showQuickAction.id}?source=crm`, { state: { from: '/crm-dashboard' } }); setShowQuickAction(null); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink size={14} />
                  Open Full Case
                </button>
                <button 
                  onClick={() => handleQuickUpdate(showQuickAction.id, { status: showQuickAction.status })}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Dashboard Modal */}
      {showPatientDashboard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <User size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Patient Dashboard</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {showPatientDashboard.patientName} • Case ID: {showPatientDashboard.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                  {(['info', 'documents', 'timeline'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setPatientDashboardTab(tab)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        patientDashboardTab === tab 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const cId = showPatientDashboard.id;
                    setShowPatientDashboard(null);
                    navigate(`/patient-dashboard/${encodeURIComponent(showPatientDashboard.patientName)}?claimId=${encodeURIComponent(cId)}&source=crm`);
                  }}
                  className="px-4 py-2 bg-[#000080] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <ArrowUpRight size={14} /> View Full Patient Dashboard
                </button>
                <button 
                  onClick={() => setShowPatientDashboard(null)} 
                  className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
              {patientDashboardTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-50 pb-2">Personal Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                          <Link to={`/process-claim/${showPatientDashboard.id}?source=crm`} className="text-sm font-black text-slate-800 hover:text-rose-600 transition-colors">{showPatientDashboard.patientName}</Link>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Patient ID</p>
                          <p className="text-sm font-black text-slate-800">{showPatientDashboard.patientId}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Age / Gender</p>
                          <p className="text-sm font-black text-slate-800">{showPatientDashboard.formData?.p_age || 'N/A'} / {showPatientDashboard.formData?.p_gender || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
                          <p className="text-sm font-black text-slate-800">{showPatientDashboard.formData?.p_contact || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-slate-50 pb-2">Insurance Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Provider</p>
                          <p className="text-sm font-black text-slate-800">{showPatientDashboard.insuranceProvider}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Corporate Name</p>
                          <p className="text-sm font-black text-slate-800">{showPatientDashboard.formData?.corp_name || 'Individual Policy'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest border-b border-slate-50 pb-2">Clinical Context</h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Diagnosis</p>
                          <p className="text-sm font-black text-slate-800">{showPatientDashboard.diagnosis}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Admission Date</p>
                            <p className="text-sm font-black text-slate-800">{formatDate(showPatientDashboard.admissionDate)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Est. Cost</p>
                            <p className="text-sm font-black text-slate-800">₹{(showPatientDashboard.estimatedCost || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">Current Status</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stage</p>
                          <p className="text-sm font-black text-blue-400 uppercase">{showPatientDashboard.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last Updated</p>
                          <p className="text-sm font-black text-slate-200">{formatDateForDisplay(showPatientDashboard.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {patientDashboardTab === 'documents' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {/* Collect all documents from history and initial attached docs */}
                    {[
                      ...(showPatientDashboard.history.filter(h => h.fileData || h.stageData?.documents).flatMap(h => {
                        const docs = [];
                        if (h.fileData) {
                          docs.push({
                            name: h.fileName || 'document.pdf',
                            data: h.fileData,
                            type: h.status,
                            date: h.date,
                            mimeType: 'application/pdf'
                          });
                        }
                        if (h.stageData?.documents) {
                          (h.stageData.documents as any[]).forEach(d => {
                            docs.push({
                              ...d,
                              date: h.date
                            });
                          });
                        }
                        return docs;
                      })),
                      ...(showPatientDashboard.formData?.attachedDocs || []).map((d: any) => ({
                        ...d,
                        date: showPatientDashboard.createdAt
                      }))
                    ].map((doc, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            doc.type?.includes('Policy') ? 'bg-blue-50 text-blue-600' : 
                            doc.type?.includes('Medical') ? 'bg-emerald-50 text-emerald-600' : 
                            'bg-slate-50 text-slate-600'
                          }`}>
                            <File size={24} />
                          </div>
                          <button 
                            onClick={() => handlePreview(doc.name, doc.data, doc.mimeType)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Download size={18} />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.type || 'Supporting Doc'}</p>
                          <p className="text-xs font-black text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(doc.date)}</p>
                        </div>
                        <button 
                          onClick={() => handlePreview(doc.name, doc.data, doc.mimeType)}
                          className="w-full mt-4 py-2 bg-[#000080] text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Eye size={12} />
                          VIEW
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Documentation & Audit Trail Section */}
                  <div className="space-y-6 max-w-4xl mx-auto pt-6 border-t border-slate-100">
                    <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100 flex justify-between items-center mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                          <FileSearch size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Documentation & Audit Trail</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Registry of All Stage Updates</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {showPatientDashboard.history.map((event, idx) => {
                        const allDocs: Array<{ name: string; data?: string; mimeType?: string }> = [];
                        if (event.fileData) {
                          allDocs.push({
                            name: event.fileName || 'document.pdf',
                            data: event.fileData,
                            mimeType: 'application/pdf'
                          });
                        }
                        if (event.stageData?.documents) {
                          (event.stageData.documents as any[]).forEach(d => {
                            if (d.name && !allDocs.some(e => e.name.trim().toLowerCase() === d.name.trim().toLowerCase())) {
                              allDocs.push({
                                name: d.name,
                                data: d.data,
                                mimeType: d.mimeType || d.type || 'application/pdf'
                              });
                            }
                          });
                        }

                        return (
                          <div key={event.id || idx} className="relative pl-8 border-l-2 border-slate-100 last:border-0 pb-6">
                            <div className="absolute -left-[7px] top-2 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white shadow-sm"></div>
                            
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{event.status}</h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100 flex items-center shadow-sm">
                                      <Clock size={12} className="mr-1.5 text-indigo-500" />
                                      {formatDateForDisplay(event.date)}
                                    </p>
                                    {(event.userName || 'System') && (
                                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100 flex items-center shadow-sm">
                                        <User size={12} className="mr-1.5 text-blue-500" />
                                        {event.userName || 'System'} {event.userRole ? `(${event.userRole})` : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {allDocs.length > 0 && (
                                  <div className="flex flex-col gap-1.5 items-end">
                                    {allDocs.map((doc, dIdx) => (
                                      <button
                                        key={dIdx}
                                        onClick={() => handlePreview(doc.name, doc.data, doc.mimeType)}
                                        className="px-4 py-1.5 bg-[#000080] hover:bg-blue-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                      >
                                        <Eye size={12} className="shrink-0" />
                                        <span>{allDocs.length > 1 ? `VIEW (${dIdx + 1})` : 'VIEW'}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {event.comment && (
                                <div className="mt-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100/80">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remarks</p>
                                  <p className="text-xs font-semibold text-slate-700 italic">"{event.comment}"</p>
                                </div>
                              )}

                              {event.stageData && Object.keys(event.stageData).filter(k => !['fileData', 'fileName', 'documents'].includes(k)).length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                    <Activity size={12} className="mr-1.5 text-slate-400" /> Stage Data Snapshot
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    {Object.entries(event.stageData).map(([key, val]) => {
                                      if (['fileData', 'fileName', 'fileType', 'documents', 'current_date', 'claim_id'].includes(key) || !val) return null;
                                      return (
                                        <div key={key}>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/_/g, ' ')}</p>
                                          <p className="text-xs font-bold text-slate-800 break-words">{String(val)}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {(showPatientDashboard.history.filter(h => h.fileData || h.stageData?.documents).length === 0 && !showPatientDashboard.formData?.attachedDocs?.length) && (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-4">
                        <FileSearch size={32} />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No documents uploaded yet.</p>
                    </div>
                  )}
                </div>
              )}

              {patientDashboardTab === 'timeline' && (
                <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-800 tracking-tight">Timeline</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">
                        {showPatientDashboard.history.length}
                      </span>
                    </div>
                    <Maximize2 size={16} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                  </div>

                  <div className="space-y-6">
                    {showPatientDashboard.history.map((event, idx) => {
                      const allDocs: Array<{ name: string; data?: string; mimeType?: string }> = [];
                      if (event.fileData) {
                        allDocs.push({
                          name: event.fileName || 'document.pdf',
                          data: event.fileData,
                          mimeType: 'application/pdf'
                        });
                      }
                      if (event.stageData?.documents) {
                        (event.stageData.documents as any[]).forEach(d => {
                          if (d.name && !allDocs.some(e => e.name.trim().toLowerCase() === d.name.trim().toLowerCase())) {
                            allDocs.push({
                              name: d.name,
                              data: d.data,
                              mimeType: d.mimeType || d.type || 'application/pdf'
                            });
                          }
                        });
                      }

                      // Compute stage amounts
                      const stageAmt = event.stageData?.final_bill_amount || event.stageData?.finalBillAmount ? { label: 'Final Bill Amount', amount: event.stageData?.final_bill_amount || event.stageData?.finalBillAmount, color: 'font-black text-slate-800' } :
                        event.stageData?.enhancement_approved || event.stageData?.approved_enhancement ? { label: 'Enhancement Approved', amount: event.stageData?.enhancement_approved || event.stageData?.approved_enhancement, color: 'font-black text-emerald-600' } :
                        event.stageData?.enhancement_amount || event.stageData?.enhancement_requested ? { label: 'Enhancement Requested', amount: event.stageData?.enhancement_amount || event.stageData?.enhancement_requested, color: 'font-black text-blue-600' } :
                        event.stageData?.estimated_cost || showPatientDashboard.estimatedCost ? { label: 'Estimated Cost', amount: event.stageData?.estimated_cost || showPatientDashboard.estimatedCost, color: 'font-black text-blue-600' } : null;

                      // Compute TAT
                      let tatStr = '00:03';
                      if (idx < showPatientDashboard.history.length - 1) {
                        const nextDate = showPatientDashboard.history[idx + 1].date;
                        if (nextDate && event.date) {
                          const diff = Math.abs(new Date(event.date).getTime() - new Date(nextDate).getTime());
                          const mins = Math.floor(diff / (1000 * 60));
                          tatStr = `00:${mins.toString().padStart(2, '0')}`;
                        }
                      }

                      return (
                        <div key={event.id || idx} className="relative pl-8 border-l-2 border-slate-100 last:border-0 pb-6">
                          <div className="absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#000080] border-2 border-white shadow-sm ring-4 ring-blue-50 z-10"></div>
                          
                          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{event.status}</h4>
                              {idx === 0 && (
                                <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-full uppercase tracking-wider shadow-sm">
                                  LATEST ACTION
                                </span>
                              )}
                            </div>

                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              COMMENT: <span className="normal-case italic text-xs font-semibold text-slate-600">"{event.comment || 'No remarks provided'}"</span>
                            </p>

                            {stageAmt && (
                              <p className="text-[10px] font-black text-slate-500 my-2">
                                {stageAmt.label}: <span className={`ml-1 text-xs ${stageAmt.color}`}>₹{Number(stageAmt.amount).toLocaleString('en-IN')}</span>
                              </p>
                            )}

                            <div className="flex items-end justify-between mt-4 pt-3 border-t border-slate-100">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDateForDisplay(event.date)}</p>
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                    <Clock size={10} /> TAT: {tatStr}
                                  </span>
                                </div>
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mt-1 block">
                                  ACTION BY: {(event.userName || 'System').toUpperCase()} {event.userRole ? `(${event.userRole.toUpperCase()})` : ''}
                                </p>
                              </div>

                              {allDocs.length > 0 && (
                                <div className="flex flex-col gap-1.5 items-end">
                                  {allDocs.map((doc, dIdx) => (
                                    <button
                                      key={dIdx}
                                      onClick={() => handlePreview(doc.name, doc.data, doc.mimeType)}
                                      className="px-4 py-1.5 bg-[#000080] hover:bg-blue-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                    >
                                      <Eye size={12} className="shrink-0" />
                                      <span>{allDocs.length > 1 ? `VIEW (${dIdx + 1})` : 'VIEW'}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Reply to KYP Query */}
                            {event.status === ClaimStatus.KYP_QUERY_PENDING && !showPatientDashboard.history.some(h => h.status === ClaimStatus.KYP_QUERY_REPLIED && new Date(h.date) > new Date(event.date)) && (
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                {queryReply?.eventId === event.id ? (
                                  <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <textarea 
                                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 min-h-[100px]"
                                      placeholder="Type your reply here..."
                                      value={queryReply.comment}
                                      onChange={(e) => setQueryReply({ ...queryReply, comment: e.target.value })}
                                    />
                                    <div className="flex items-center justify-end gap-4">
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => setQueryReply(null)}
                                          className="px-4 py-3 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest"
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          onClick={handleReplyQuery}
                                          disabled={!queryReply.comment.trim() || isReplying}
                                          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center"
                                        >
                                          {isReplying ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
                                          Submit Reply
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setQueryReply({ eventId: event.id, comment: '' })}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                                  >
                                    <MessageSquare size={14} />
                                    Reply to Query
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Conflict Modal */}
      <AnimatePresence>
        {assignmentConflict && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
                  <ShieldAlert size={40} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Case Already Assigned</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    <span className="font-black text-slate-800">{assignmentConflict.assignedUser.displayName}</span> is already processing this case.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Handler</p>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{assignmentConflict.assignedUser.displayName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setAssignmentConflict(null)}
                    className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const updatedClaim: Claim = {
                        ...assignmentConflict.claim,
                        assignedCrmUserId: currentUser.id,
                        updatedAt: new Date().toISOString(),
                        history: [
                          {
                            id: Date.now().toString(),
                            date: new Date().toISOString(),
                            status: assignmentConflict.claim.status as any,
                            comment: `Case re-assigned to ${currentUser.displayName} from ${assignmentConflict.assignedUser.displayName}`,
                            type: 'status_change'
                          },
                          ...(assignmentConflict.claim.history || [])
                        ]
                      };
                      onUpdateClaim(updatedClaim);
                      setAssignmentConflict(null);
                      navigate(`/crm-handle/${assignmentConflict.claim.id}`);
                    }}
                    className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    Assign Self
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hospital Selection Modal */}
      <AnimatePresence>
        {showHospitalSelect && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">Select Hospital</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Choose the hospital for new admission</p>
                </div>
                <button 
                  onClick={() => setShowHospitalSelect(false)}
                  className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {assignedHospitals.map(hospital => (
                    <button
                      key={hospital.id}
                      onClick={() => {
                        setShowHospitalSelect(false);
                        navigate(`/new-claim?hospitalId=${hospital.id}&source=crm`);
                      }}
                      className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-3xl hover:border-blue-500 hover:bg-blue-50/30 transition-all group text-left"
                    >
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Hospital size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 uppercase truncate">{hospital.hospitalName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{hospital.district}, {hospital.state}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-6 bg-slate-50/50 border-t border-slate-50 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">You are currently managing {assignedHospitals.length} hospitals</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Download Report Modal */}
      <DownloadReportModal 
        isOpen={showDownloadModal} 
        onClose={() => setShowDownloadModal(false)} 
        claims={claims} 
        hospitals={hospitals as any} 
      />

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
                  <div className="w-12 h-12 bg-[#000080] text-white rounded-2xl flex items-center justify-center shadow-lg">
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                        placeholder="hospital@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">CC Emails</label>
                      <input 
                        type="text"
                        value={manualRequest.cc}
                        onChange={(e) => setManualRequest({...manualRequest, cc: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                        placeholder="comma separated emails..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email Subject</label>
                    <input 
                      type="text"
                      value={manualRequest.subject}
                      onChange={(e) => setManualRequest({...manualRequest, subject: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      placeholder="Enter subject..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email Draft (Body)</label>
                    <textarea 
                      value={manualRequest.body}
                      onChange={(e) => setManualRequest({...manualRequest, body: e.target.value})}
                      rows={6}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all resize-none"
                      placeholder="Compose report message..."
                    />
                    <p className="text-[9px] text-slate-400 mt-2 font-medium italic">Note: Report PDF will be attached automatically.</p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <AlertCircle className="text-amber-600 shrink-0" size={16} />
                    <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                      Manual trigger will use the latest available data as of today for the selected hospital only.
                    </p>
                  </div>
                </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
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
                  className="flex-[2] py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 disabled:opacity-50 disabled:grayscale"
                >
                  Dispatch Report Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Draft Modal */}
      <AnimatePresence>
        {showEmailDraftModal && (
          <div className={
            isComposerMinimized 
              ? "fixed bottom-0 right-12 z-[151] w-80 bg-white border border-slate-300 rounded-t-xl shadow-2xl"
              : isComposerMaximized
                ? "fixed inset-8 z-[151] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200"
                : "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          }>
            <motion.div 
              style={{ height: isComposerMinimized ? '40px' : isComposerMaximized ? '100%' : '820px', maxHeight: isComposerMinimized ? '40px' : '95vh' }}
              className={
                isComposerMinimized
                  ? "w-full flex flex-col"
                  : isComposerMaximized
                    ? "w-full h-full flex flex-col"
                    : "bg-white w-full max-w-5xl lg:max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col"
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
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Attached Files ({emailDraftData.attachments.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {emailDraftData.attachments.map((file, i) => (
                            <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm">
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
                  <div className="bg-slate-50 border-t border-slate-200 py-1.5 px-4 flex flex-wrap gap-1 items-center justify-between text-slate-500">
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
                        className={`p-1.5 rounded transition-all cursor-pointer ${composerAlign !== 'left' ? 'bg-slate-200 text-slate-950 border border-slate-300' : 'hover:bg-slate-100 hover:text-slate-700'}`}
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
                          const senderEmail = getHospitalFromEmail(emailDraftData.hospitalId);
                          
                          // If there's an existing draft, remove it or overwrite it
                          const draftId = emailDraftData.id || `email-sent-${Date.now()}`;
                          const cleanList = emailsDb.filter(m => m.id !== draftId);

                          const newEmailItem = {
                            id: draftId.startsWith('email-draft-') ? `email-sent-${Date.now()}` : draftId,
                            claimId: subjectClaimId,
                            sentDate: new Date().toISOString(),
                            sender: senderEmail,
                            recipient: emailDraftData.to,
                            recipientType: 'Insurer',
                            subject: emailDraftData.subject,
                            body: emailDraftData.body,
                            status: 'Sent',
                            templateUsed: emailDraftData.subject.includes('Urgent') ? 'Urgent' : 'Standard',
                            hospitalId: emailDraftData.hospitalId || 'HOSP-001',
                            cc: emailDraftData.cc,
                            bcc: emailDraftData.bcc
                          };
                          
                          saveEmailsToStorage([newEmailItem, ...cleanList]);
                          toast.success(`Email sent successfully from ${senderEmail}`);
                          setShowEmailDraftModal(false);
                          setIsComposerMinimized(false);
                          setIsComposerMaximized(false);
                        }}
                        className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                      >
                        Send
                      </button>

                      {/* Save Draft Button */}
                      <button 
                        type="button" 
                        onClick={() => {
                          const subjectClaimId = emailDraftData.subject.match(/CLM-\d+/i)?.[0] || 'CLM-003';
                          const senderEmail = getHospitalFromEmail(emailDraftData.hospitalId);
                          const draftId = emailDraftData.id || `email-draft-${Date.now()}`;
                          const existingIdx = emailsDb.findIndex(m => m.id === draftId);

                          const draftItem = {
                            id: draftId,
                            claimId: subjectClaimId,
                            sentDate: new Date().toISOString(),
                            sender: senderEmail,
                            recipient: emailDraftData.to || '',
                            recipientType: 'Insurer',
                            subject: emailDraftData.subject || '(No Subject)',
                            body: emailDraftData.body || '',
                            status: 'Draft',
                            templateUsed: emailDraftData.subject ? (emailDraftData.subject.includes('Urgent') ? 'Urgent' : 'Standard') : 'Standard',
                            hospitalId: emailDraftData.hospitalId || 'HOSP-001',
                            cc: emailDraftData.cc,
                            bcc: emailDraftData.bcc
                          };

                          let newList;
                          if (existingIdx > -1) {
                            newList = [...emailsDb];
                            newList[existingIdx] = draftItem;
                          } else {
                            newList = [draftItem, ...emailsDb];
                          }

                          saveEmailsToStorage(newList);
                          toast.success('Draft saved successfully!');
                          setShowEmailDraftModal(false);
                          setIsComposerMinimized(false);
                          setIsComposerMaximized(false);
                        }}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-full flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        Save Draft
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
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100/80 text-slate-600 hover:text-slate-800 font-bold text-[10px] rounded-full uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm ml-1"
                        title="Attach Files"
                      >
                        <Paperclip size={12} className="text-slate-500" />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl lg:max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col h-[750px] max-h-[92vh]"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">View Email</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Sent on {new Date(selectedEmailForView.sentDate).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setSelectedEmailForView(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">From</p>
                      <p className="text-sm font-semibold text-slate-800">{(selectedEmailForView as any).sender || "CRM Team (ClaimNX)"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">To</p>
                      <p className="text-sm font-semibold text-slate-800">{selectedEmailForView.recipient}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                    <p className="text-base font-black text-slate-900">{(selectedEmailForView as any).subject || `${selectedEmailForView.templateUsed} - Claim ${selectedEmailForView.claimId}`}</p>
                  </div>
                  <div className="p-8 bg-slate-50 rounded-2xl border border-slate-150 min-h-[320px] shadow-sm flex flex-col">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap select-text flex-1">
                      {(selectedEmailForView as any).body || `Dear ${selectedEmailForView.recipientType} Team,

This is a follow-up regarding the outstanding settlement for Claim NO: ${selectedEmailForView.claimId}.
As per our records, the file has been processed.

Kindly provide an update on the settlement status at the earliest.

Regards,
CRM Team`}
                    </p>
                  </div>
                  
                  {/* Quick Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button 
                      onClick={() => handleEmailAction('reply', selectedEmailForView)}
                      className="px-5 py-2.5 border border-slate-200 hover:border-blue-700 bg-white hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Reply size={14} />
                      Reply
                    </button>
                    <button 
                      onClick={() => handleEmailAction('replyAll', selectedEmailForView)}
                      className="px-5 py-2.5 border border-slate-200 hover:border-blue-700 bg-white hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                    >
                      <ReplyAll size={14} />
                      Reply All
                    </button>
                    <button 
                      onClick={() => handleEmailAction('forward', selectedEmailForView)}
                      className="px-5 py-2.5 border border-slate-200 hover:border-blue-700 bg-white hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Forward size={14} />
                      Forward
                    </button>
                  </div>

                  {/* Attachments Section */}
                  {emailViewDocuments && emailViewDocuments.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <FileText size={12} className="text-slate-400" />
                        Attachments ({emailViewDocuments.length})
                      </p>
                      
                      {emailViewDocuments.length === 1 ? (
                        // Single attachment: Show beautifully as an attachment file card
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/50 transition-all">
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
                            className="px-4 py-2 bg-slate-200 hover:bg-[#000080] hover:text-white text-slate-700 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5"
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>
                      ) : (
                        // Multiple attachments: Show as beautiful hyperlinks to download each
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {emailViewDocuments.map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100/50 transition-all">
                              <FileText size={14} className="text-rose-500 shrink-0" />
                              <button
                                onClick={() => handlePreview(doc.name, doc.data, doc.mimeType)}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800 text-left hover:underline truncate flex-1"
                                title={`Click to download ${doc.name}`}
                              >
                                {doc.name}
                              </button>
                              <Download size={12} className="text-slate-400" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                <button 
                  onClick={() => {
                    emailViewDocuments.forEach(doc => {
                      if (doc.data === "[STRIPPED_FOR_LOCAL_CACHE]") {
                        return;
                      }
                      let resolvedMime = doc.mimeType || "application/pdf";
                      const nameLower = doc.name.toLowerCase();
                      if (nameLower.endsWith(".png")) resolvedMime = "image/png";
                      else if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) resolvedMime = "image/jpeg";
                      else if (nameLower.endsWith(".pdf")) resolvedMime = "application/pdf";
                      else if (nameLower.endsWith(".xls")) resolvedMime = "application/vnd.ms-excel";
                      else if (nameLower.endsWith(".xlsx")) resolvedMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                      
                      let dataUrl = doc.data;
                      if (
                        !dataUrl.startsWith("data:") &&
                        !dataUrl.startsWith("http://") &&
                        !dataUrl.startsWith("https://") &&
                        !dataUrl.startsWith("/")
                      ) {
                        dataUrl = `data:${resolvedMime};base64,${dataUrl}`;
                      }
                      handleDownload(doc.name, dataUrl, resolvedMime);
                    });
                    toast.success(`${emailViewDocuments.length} document(s) download initiated`);
                  }}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-[#000080] shadow-xl flex items-center justify-center gap-2"
                >
                  <FileText size={14} /> Download Documents
                </button>
                <button 
                  onClick={() => setSelectedEmailForView(null)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[300] flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl flex justify-between items-center mb-6">
            <h3 className="text-white text-lg font-bold truncate max-w-md">{previewFile.name}</h3>
            <div className="flex items-center gap-4">
              {previewFile.data !== "[STRIPPED_FOR_LOCAL_CACHE]" && (
                <button 
                  onClick={() => handleDownload(previewFile.name, previewFile.data, previewFile.type)} 
                  className="px-6 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center"
                >
                  <Download size={16} className="mr-2" /> Download
                </button>
              )}
              <button 
                onClick={() => setPreviewFile(null)} 
                className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="w-full max-w-6xl flex-1 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative flex items-center justify-center">
             {previewFile.data === "[STRIPPED_FOR_LOCAL_CACHE]" ? (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-950/50">
                 <AlertCircle size={64} className="mb-6 text-rose-500 animate-pulse" />
                 <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">This test file was stripped</h4>
                 <p className="max-w-md text-sm text-slate-400 leading-relaxed font-semibold">
                   This file is mock/stripped metadata. Please upload a new file in the claim process center to view or download it.
                 </p>
                 <div className="mt-8">
                   <button 
                     onClick={() => setPreviewFile(null)}
                     className="px-6 py-2.5 bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20"
                   >
                     Close Preview
                   </button>
                 </div>
               </div>
             ) : previewFile.type?.startsWith('image/') ? (
               <img src={previewFile.data} className="w-full h-full object-contain" alt="Preview" />
             ) : (
               <iframe src={previewFile.data} className="w-full h-full bg-white" title="Preview"></iframe>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

const PerformanceCard = ({ label, value, icon: Icon, color, isCritical, onClick }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100'
  };

  const bgColors: any = {
    blue: 'bg-blue-50/50',
    emerald: 'bg-emerald-50/50',
    amber: 'bg-amber-50/50',
    rose: 'bg-rose-50/50',
    indigo: 'bg-indigo-50/50',
    slate: 'bg-slate-50/50',
    purple: 'bg-purple-50/50'
  };

  return (
    <div 
      onClick={onClick}
      className={`${bgColors[color] || 'bg-white'} p-4 rounded-2xl border ${isCritical ? 'border-rose-200 shadow-rose-50' : 'border-slate-200 shadow-sm'} shadow-sm space-y-3 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 ${colors[color] || 'bg-slate-50 text-slate-600'} rounded-lg flex items-center justify-center border animate-pulse-slow`}>
          <Icon size={16} />
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className={`text-sm font-black ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>{value}</p>
        </div>
      </div>
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
        <div className={`h-full ${isCritical ? 'bg-rose-500' : color === 'rose' ? 'bg-rose-500' : 'bg-slate-400'} w-3/4`}></div>
      </div>
    </div>
  );
};

export default CRMDashboard;
