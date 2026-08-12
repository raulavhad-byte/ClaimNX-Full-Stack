import React, { useState, useMemo, useEffect, useRef } from "react";
import { formatDate as stdFormatDate, formatDateTime, formatClaimTAT, getClaimStageStartTime, parseDate, safeHtml2Canvas } from "../utils";
import { Link, useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  FileQuestion,
  PlayCircle,
  ArrowLeft,
  Search,
  Download,
  History as HistoryIcon,
  Activity,
  XCircle,
  Layers,
  Plus,
  TrendingUp,
  ArrowRight,
  Kanban,
  Hash,
  Zap,
  Hospital,
  Banknote,
  FileSearch,
  ShieldPlus,
  ChevronRight,
  LayoutDashboard,
  Filter,
  Calendar,
  User,
  MoreVertical,
  Settings,
  CheckSquare,
  Square,
  Timer,
  AlertTriangle,
  Lock,
  Eye,
  MoreHorizontal,
  ChevronDown,
  Upload,
  RotateCcw,
  FolderOpen,
  RefreshCw,
  Database,
  IndianRupee,
  PlusCircle,
  FileText,
  Mail,
  ArrowUpDown,
} from "lucide-react";
import {
  KYPPolicy,
  Claim,
  ClaimStatus,
  ClaimStage,
  FormField,
  InsuranceEntity,
  ROLE_STAGE_ENTITLEMENTS,
} from "../types";
import FollowUpEmailModal from "./FollowUpEmailModal";
import { emailTemplateService } from "../services/emailTemplateService";
import { EmailTemplate } from "./EmailTemplatesManager";
import { motion, AnimatePresence } from "motion/react";

interface CashlessDashboardProps {
  claims: Claim[];
  stages: ClaimStage[];
  fields: FormField[];
  userPermissions?: string[];
  setClaims?: React.Dispatch<React.SetStateAction<Claim[]>>;
  kypPolicies?: KYPPolicy[];
  hospitalId?: string;
  hospitalProfile?: any;
  insurers?: InsuranceEntity[];
  tpas?: InsuranceEntity[];
}

const ALL_COLUMNS = [
  { id: "caseId", label: "CASE ID" },
  { id: "uhid", label: "UHID" },
  { id: "hospitalName", label: "HOSPITAL NAME" },
  { id: "patientName", label: "PATIENT NAME" },
  { id: "claimId", label: "CLAIM NO" },
  { id: "memberId", label: "MEMBER ID" },
  { id: "insurer", label: "INSURANCE COMPANY" },
  { id: "tpa", label: "TPA NAME" },
  { id: "diagnosis", label: "PRIMARY DIAGNOSIS" },
  { id: "estimate", label: "EST. / FINAL BILL", align: "right" },
  { id: "approvedAmt", label: "APPROVED AMT", align: "right" },
  { id: "pre_auth_app_amt", label: "Initial Approved Amt", align: "right" },
  { id: "pre_auth_app_comment", label: "Initial Comment" },
  { id: "enh_amt_req", label: "Enhancement Amt", align: "right" },
  { id: "enh_app_amt", label: "Enhancement App. Amt", align: "right" },
  { id: "fin_app_amt", label: "Final Approval Amt", align: "right" },
  { id: "bank_amt_rec", label: "Bank Amt Received", align: "right" },
  { id: "bank_fund_status", label: "Bank Fund Status" },
  { id: "set_incl_tds", label: "Settled (Incl TDS)", align: "right" },
  { id: "admissionDate", label: "ADM. DATE" },
  { id: "dischargeDate", label: "DISCH. DATE" },
  { id: "status", label: "STATUS" },
  { id: "tat", label: "TAT", align: "center" },
];

const DEFAULT_COLS = [
  "caseId",
  "uhid",
  "patientName",
  "claimId",
  "estimate",
  "approvedAmt",
  "admissionDate",
  "dischargeDate",
  "status",
  "tat",
];

const SETTLEMENT_PENDING_STATUSES = [
  ClaimStatus.FILE_DISPATCH_PENDING, // Added dispatch pending here as it starts the settlement flow
  ClaimStatus.FILE_DISPATCHED,
  ClaimStatus.CLAIM_UNDER_PROCESS,
  ClaimStatus.CLAIM_UNDER_QUERY,
  ClaimStatus.CLAIM_QUERY_RESOLVED,
  ClaimStatus.CLAIM_APPROVED,
];

const PAYMENT_RECEIVED_GROUP = [
  ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
  ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
  ClaimStatus.COMPLETE_SETTLEMENT,
];

const REGISTRATION_LOGISTICS_GROUP: ClaimStatus[] = [];

const INITIAL_APPROVAL_PENDING_STATUSES = [
  ClaimStatus.PENDING_MEDICAL_REVIEW,
  ClaimStatus.PENDING_MEDICAL_TEAM,
  ClaimStatus.MEDICAL_QUERY_RAISED,
  ClaimStatus.PRE_AUTH_INITIATED,
  ClaimStatus.QUERY_REPLY_DONE,
  ClaimStatus.MEDICAL_QUERY_REPLIED,
  ClaimStatus.ENHANCEMENT,
];

const INITIAL_QUERY_PENDING_GROUP = [
  ClaimStatus.INITIAL_QUERY_PENDING,
  ClaimStatus.ENHANCEMENT_QUERY_RAISED,
];

const PRE_AUTH_APPROVED_GROUP = [
  ClaimStatus.PRE_AUTH_APPROVED,
  ClaimStatus.ENHANCEMENT_APPROVED,
  ClaimStatus.ENHANCEMENT_REJECTED,
];

const DISCHARGE_INITIATED_GROUP = [
  ClaimStatus.DISCHARGE_INITIATED,
  ClaimStatus.DISCHARGE_QUERY_REPLY,
  ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
];

const DISCHARGE_APPROVED_GROUP = [
  ClaimStatus.DISCHARGE_APPROVED,
  ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
];

const DRAFT_GROUP = [ClaimStatus.DRAFT];

// Helper to determine valid next steps based on current status
const getNextStatusOptions = (
  status: ClaimStatus,
): (ClaimStatus | "REOPEN CASE")[] => {
  switch (status) {
    case ClaimStatus.PENDING_MEDICAL_REVIEW:
      return [
        ClaimStatus.MEDICAL_QUERY_RAISED,
        ClaimStatus.PRE_AUTH_APPROVED,
        ClaimStatus.INITIAL_QUERY_PENDING,
        ClaimStatus.PRE_AUTH_REJECTED,
      ];

    case ClaimStatus.PENDING_MEDICAL_TEAM:
      return [
        ClaimStatus.MEDICAL_QUERY_RAISED,
        ClaimStatus.PRE_AUTH_APPROVED,
        ClaimStatus.INITIAL_QUERY_PENDING,
        ClaimStatus.PRE_AUTH_REJECTED,
      ];

    case ClaimStatus.MEDICAL_QUERY_RAISED:
      return [ClaimStatus.MEDICAL_QUERY_REPLIED];

    case ClaimStatus.MEDICAL_QUERY_REPLIED:
      return [
        ClaimStatus.PENDING_MEDICAL_REVIEW,
        ClaimStatus.PRE_AUTH_APPROVED,
        ClaimStatus.INITIAL_QUERY_PENDING,
        ClaimStatus.PRE_AUTH_REJECTED,
      ];

    case ClaimStatus.DRAFT:
      return [ClaimStatus.PRE_AUTH_INITIATED];

    case ClaimStatus.PRE_AUTH_INITIATED:
      return [
        ClaimStatus.PRE_AUTH_APPROVED,
        ClaimStatus.INITIAL_QUERY_PENDING,
        ClaimStatus.PRE_AUTH_REJECTED,
      ];

    case ClaimStatus.PRE_AUTH_APPROVED:
      return [
        ClaimStatus.ENHANCEMENT,
        ClaimStatus.DISCHARGE_INITIATED,
        ClaimStatus.PRE_AUTH_REJECTED,
      ];

    case ClaimStatus.INITIAL_QUERY_PENDING:
      return [
        ClaimStatus.QUERY_REPLY_DONE,
        ClaimStatus.PRE_AUTH_APPROVED,
        ClaimStatus.PRE_AUTH_REJECTED,
      ];

    case ClaimStatus.QUERY_REPLY_DONE:
      return [
        ClaimStatus.PRE_AUTH_APPROVED,
        ClaimStatus.INITIAL_QUERY_PENDING,
        ClaimStatus.PRE_AUTH_REJECTED,
      ];

    case ClaimStatus.PRE_AUTH_REJECTED:
      return ["REOPEN CASE"];

    case ClaimStatus.ENHANCEMENT:
      return [
        ClaimStatus.ENHANCEMENT_APPROVED,
        ClaimStatus.ENHANCEMENT_QUERY_RAISED,
        ClaimStatus.ENHANCEMENT_REJECTED,
      ];

    case ClaimStatus.ENHANCEMENT_APPROVED:
      return [ClaimStatus.ENHANCEMENT, ClaimStatus.DISCHARGE_INITIATED];

    case ClaimStatus.ENHANCEMENT_QUERY_RAISED:
      return [
        ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
        ClaimStatus.ENHANCEMENT_REJECTED,
      ];

    case ClaimStatus.ENHANCEMENT_QUERY_RESOLVED:
      return [
        ClaimStatus.ENHANCEMENT_APPROVED,
        ClaimStatus.ENHANCEMENT_QUERY_RAISED,
        ClaimStatus.ENHANCEMENT_REJECTED,
      ];

    case ClaimStatus.ENHANCEMENT_REJECTED:
      return [ClaimStatus.ENHANCEMENT, ClaimStatus.DISCHARGE_INITIATED];

    case ClaimStatus.DISCHARGE_INITIATED:
      return [
        ClaimStatus.DISCHARGE_QUERY_RAISED,
        ClaimStatus.DISCHARGE_REJECTED,
        ClaimStatus.DISCHARGE_APPROVED,
      ];

    case ClaimStatus.DISCHARGE_QUERY_RAISED:
      return [
        ClaimStatus.DISCHARGE_QUERY_REPLY,
        ClaimStatus.DISCHARGE_REJECTED,
      ];

    case ClaimStatus.DISCHARGE_QUERY_REPLY:
      return [
        ClaimStatus.DISCHARGE_QUERY_RAISED,
        ClaimStatus.DISCHARGE_REJECTED,
        ClaimStatus.DISCHARGE_APPROVED,
      ];

    case ClaimStatus.DISCHARGE_REJECTED:
      return [
        ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
        ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
      ];

    case ClaimStatus.DISCHARGE_APPROVED:
      return [
        ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
        ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
        ClaimStatus.FILE_DISPATCHED,
      ];

    case ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED:
      return [
        ClaimStatus.FILE_DISPATCHED,
        ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
      ];

    case ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED:
      return [
        ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
        ClaimStatus.DISCHARGE_REJECTED,
      ];

    case ClaimStatus.FILE_DISPATCH_PENDING:
      return [ClaimStatus.FILE_DISPATCHED];

    case ClaimStatus.FILE_DISPATCHED:
      return [
        ClaimStatus.CLAIM_UNDER_PROCESS,
        ClaimStatus.CLAIM_UNDER_QUERY,
        ClaimStatus.CLAIM_APPROVED,
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
        ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
        ClaimStatus.COMPLETE_SETTLEMENT,
      ];

    case ClaimStatus.CLAIM_UNDER_PROCESS:
      return [
        ClaimStatus.CLAIM_UNDER_QUERY,
        ClaimStatus.CLAIM_APPROVED,
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
        ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
        ClaimStatus.COMPLETE_SETTLEMENT,
      ];

    case ClaimStatus.CLAIM_UNDER_QUERY:
      return [
        ClaimStatus.CLAIM_QUERY_RESOLVED,
        ClaimStatus.CLAIM_APPROVED,
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
        ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
        ClaimStatus.COMPLETE_SETTLEMENT,
      ];

    case ClaimStatus.CLAIM_QUERY_RESOLVED:
      return [
        ClaimStatus.CLAIM_UNDER_QUERY,
        ClaimStatus.CLAIM_APPROVED,
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
        ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
        ClaimStatus.COMPLETE_SETTLEMENT,
      ];

    case ClaimStatus.CLAIM_APPROVED:
      return [
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
        ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
        ClaimStatus.COMPLETE_SETTLEMENT,
      ];

    case ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE:
      return [
        ClaimStatus.COMPLETE_SETTLEMENT,
        ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
      ];

    case ClaimStatus.COMPLETE_SETTLEMENT:
    case ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE:
      return [];

    default:
      return [];
  }
};

const CashlessDashboard: React.FC<CashlessDashboardProps> = ({
  claims,
  stages,
  fields,
  userPermissions = [],
  setClaims,
  kypPolicies = [],
  hospitalId = "default-hospital",
  hospitalProfile,
  insurers = [],
  tpas = [],
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetProduct = searchParams.get('product');

  // Check if a specific status is permitted under stage visibility roles
  const isStatusPermitted = React.useCallback((status: string): boolean => {
    const role = hospitalProfile?.role?.toUpperCase();
    if (role === "SUPER ADMIN" || role === "ADMIN" || userPermissions.includes("all")) {
      return true;
    }
    let stageKey: string | null = null;
    for (const cat of ROLE_STAGE_ENTITLEMENTS) {
      const found = cat.stages.find((s) => s.status === status);
      if (found) {
        stageKey = found.key;
        break;
      }
    }
    if (!stageKey) return true;
    return userPermissions.includes(`stage_permissions:stage_${stageKey}:update`);
  }, [userPermissions, hospitalProfile?.role]);

  // Filter claims strictly by targetProduct if specified and permission visibility
  const filteredClaimsByProduct = useMemo(() => {
    const list = targetProduct
      ? claims.filter((c) => c.product === targetProduct)
      : claims;
    const permitted = list.filter((c) => isStatusPermitted(c.status));
    
    // Deduplicate by ID to prevent duplicate React keys
    const seen = new Set<string>();
    return permitted.filter((c) => {
      if (!c.id) return true;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [claims, targetProduct, isStatusPermitted]);

  // Filter visible stages based on permissions
  const visibleStages = useMemo(() => {
    // All cashless dashboard users should see all standard stages/phases (Pre auth & Enhancement, Discharge, Settlement)
    const allowedStages = stages;

    const EXCLUDED_STATUSES = [
      ClaimStatus.MEDICAL_APPROVED,
      ClaimStatus.MEDICAL_REJECTED,
      ClaimStatus.SENT_TO_INSURANCE,
      ClaimStatus.KYP_PENDING,
      ClaimStatus.KYP_ACCEPTED,
      ClaimStatus.KYP_COMPLETED,
      ClaimStatus.KYP_QUERY_PENDING,
      ClaimStatus.KYP_QUERY_REPLIED,
      ClaimStatus.KYP_REJECTED,
      ClaimStatus.KYP_PENDING_APPROVAL,
      ClaimStatus.ASSESSMENT_SUBMITTED,
      ClaimStatus.ASSESSMENT_INITIATED,
      ClaimStatus.ASSESSMENT_APPROVED,
      ClaimStatus.ASSESSMENT_QUERY_PENDING,
      ClaimStatus.ASSESSMENT_REJECTED,
      ClaimStatus.SETTLED,
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
      ClaimStatus.ACCOUNT_RECONCILIATION,
    ];

    return allowedStages.map((stage) => {
      return {
        ...stage,
        statuses: stage.statuses.filter(
          (status) => !EXCLUDED_STATUSES.includes(status) && isStatusPermitted(status),
        ),
      };
    }).filter((stage) => stage.statuses.length > 0);
  }, [stages, isStatusPermitted]);

  const isSuperPrivileged = useMemo(
    () =>
      userPermissions.includes("all") ||
      hospitalProfile.role?.toUpperCase() === "SUPER ADMIN" ||
      hospitalProfile.role?.toUpperCase() === "ADMIN",
    [userPermissions, hospitalProfile.role],
  );

  const hasFinancialAccess =
    isSuperPrivileged || userPermissions.includes("view_financials");

  const canCreateClaim = useMemo(() => {
    if (isSuperPrivileged) return true;
    return userPermissions.some(
      (p) => p.startsWith("claims:") || p.startsWith("edit_claims:"),
    );
  }, [userPermissions, isSuperPrivileged]);

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // KYP View State
  const [selectedKyp, setSelectedKyp] = useState<KYPPolicy | null>(null);
  const [showKypModal, setShowKypModal] = useState(false);

  // API Simulation State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Column Configuration State
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    hasFinancialAccess
      ? DEFAULT_COLS
      : DEFAULT_COLS.filter((c) => c !== "estimate" && c !== "approvedAmt"),
  );
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Sorting State - default desc (Newest to Oldest)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Patient History State
  const [patientToHistory, setPatientToHistory] = useState<string | null>(null);

  // Email Follow-up State
  const [selectedEmailClaim, setSelectedEmailClaim] = useState<Claim | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    setTemplates(emailTemplateService.getTemplates());
  }, []);

  const EMAIL_ICON_STATUSES = [
    ClaimStatus.PRE_AUTH_INITIATED,
    ClaimStatus.QUERY_REPLY_DONE,
    ClaimStatus.ENHANCEMENT,
    ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
    ClaimStatus.DISCHARGE_INITIATED,
    ClaimStatus.DISCHARGE_QUERY_REPLY,
    ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
  ];

  // Initialize selected stage if available or handle deep link
  useEffect(() => {
    if (location.state) {
      const { status } = location.state as { status: ClaimStatus };
      if (status) {
        const targetStage = visibleStages.find((s) =>
          s.statuses.includes(status),
        );
        if (targetStage) {
          setSelectedStageId(targetStage.id);
          setActiveStatus(status);
          return;
        }
      }
    }

    if (
      visibleStages.length > 0 &&
      (!selectedStageId || !visibleStages.find((s) => s.id === selectedStageId))
    ) {
      setSelectedStageId(visibleStages[0].id);
    }
  }, [visibleStages, location.state]);

  // Remove redundant listener that was moved to App.tsx
  // Listen for pending documents
  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (id: string) => {
    if (visibleColumns.includes(id)) {
      if (visibleColumns.length > 2) {
        // Prevent empty table
        setVisibleColumns(visibleColumns.filter((c) => c !== id));
      }
    } else {
      if (visibleColumns.length < 9) {
        // Insert based on ALL_COLUMNS order to maintain logical flow if possible
        const newCols = [...visibleColumns, id].sort((a, b) => {
          return (
            ALL_COLUMNS.findIndex((x) => x.id === a) -
            ALL_COLUMNS.findIndex((x) => x.id === b)
          );
        });
        setVisibleColumns(newCols);
      }
    }
  };

  // --- REFRESH LOGIC ---
  const handleRefresh = () => {
    setIsSyncing(true);
    setSyncMessage(null);

    // Simulate API delay / Refresh
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage("Dashboard Data Refreshed");

      // Auto-clear message
      setTimeout(() => setSyncMessage(null), 3000);
    }, 500);
  };

  const handleDownloadKyp = async (kyp: KYPPolicy) => {
    const element = document.getElementById("kyp-preview-content");
    if (!element) {
      // Fallback to text if element not found (shouldn't happen if modal is open)
      const summary = `
KNOW YOUR POLICY - STANDARDIZED POLICY ANALYSIS REPORT
Generated: ${stdFormatDate(new Date())}

1. POLICY BASIC DETAILS
Policy No: ${kyp.policyNumber}
Policy Type: ${kyp.policyType}
Product: ${kyp.productName || "N/A"}
Company: ${kyp.companyName}
TPA: ${kyp.tpaName}
Effective: ${kyp.effectiveDate || "N/A"}
Expiry: ${kyp.expiryDate || "N/A"}

2. INSURED DETAILS
Insured Name: ${kyp.insuredName}
Member ID: ${kyp.memberId || "N/A"}
Patient Name: ${kyp.patientName || kyp.insuredName}

3. COVERAGE DETAILS
Sum Insured: ₹ ${kyp.sumInsured?.toLocaleString() || "0"}
Balance SI: ₹ ${kyp.balanceSI?.toLocaleString() || "0"}
Bonus: ${kyp.bonusSuperBonus || "N/A"}
Restore: ${kyp.restoreBenefit ? "YES" : "NO"}

4. ROOM & BENEFITS
Room Limit: ${kyp.roomRentLimit || "N/A"}
ICU Limit: ${kyp.icuLimit || "N/A"}
Daily Cash: ${kyp.hospitalDailyCash || "N/A"}
Ayush: ${kyp.ayushTreatment ? "YES" : "NO"}

5. WAITING PERIODS
Initial: ${kyp.initialWaitingPeriod || "N/A"}
Specific: ${kyp.specificWaitingPeriod || "N/A"}
PED: ${kyp.pedWaitingPeriod || "N/A"}
Waived: ${kyp.waivedOff ? "YES" : "NO"}

6. SUB-LIMITS & CO-PAY
Co-Pay %: ${kyp.copayPercentage !== undefined ? kyp.copayPercentage + "%" : "UNDEFINED%"}
Sub-Limits: ${kyp.subLimits || "N/A"}
        `;

      const blob = new Blob([summary], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kyp.patientName || kyp.insuredName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const canvas = await safeHtml2Canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${kyp.patientName || kyp.insuredName}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- LOGIC HELPERS ---
  const isOver24Hours = (timestamp: string) => {
    const lastUpdate = new Date(timestamp).getTime();
    const now = new Date().getTime();
    return now - lastUpdate > 24 * 60 * 60 * 1000;
  };

  const canAccessUI = (perm: string) => {
    if (!userPermissions) return true;
    if (userPermissions.includes("all")) return true;
    const path = `ui_access:dashboard_controls:${perm}`;
    return userPermissions.some((p) => p === path || p.startsWith(`${path}:`));
  };

  const isOver12Hours = (timestamp: string) => {
    const lastUpdate = new Date(timestamp).getTime();
    const now = new Date().getTime();
    return now - lastUpdate > 12 * 60 * 60 * 1000;
  };

  const isExpectedDischargeDateExceeded = (claim: Claim) => {
    const expDischargeStr = claim.formData?.adm_exp_discharge;
    if (!expDischargeStr) return false;
    try {
      const expDate = new Date(expDischargeStr);
      if (isNaN(expDate.getTime())) return false;
      
      const today = new Date();
      const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const d2 = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      
      return d1.getTime() > d2.getTime();
    } catch (e) {
      return false;
    }
  };

  // --- DATA CALCULATIONS (OPTIMIZED) ---
  const stageCalculations = useMemo(() => {
    const baseClaims = filteredClaimsByProduct.filter((c) => c.claimType !== "Reimbursement");

    // 1. Group claims by status once
    const statusGroups: Record<string, Claim[]> = {};
    Object.values(ClaimStatus).forEach((s) => {
      statusGroups[s] = [];
    });

    baseClaims.forEach((c) => {
      if (statusGroups[c.status]) {
        statusGroups[c.status].push(c);
      } else {
        statusGroups[c.status] = [c];
      }
    });

    // 2. Helper for specialized filtering (e.g. Discharge fallback to Dispatch)
    const getSpecializedStatusClaims = (status: ClaimStatus) => {
      if (status === ClaimStatus.FILE_DISPATCH_PENDING) {
        const manualDispatch = baseClaims.filter(
          (c) =>
            (c.status === ClaimStatus.DISCHARGE_APPROVED &&
              isOver24Hours(c.updatedAt)) ||
            (c.status === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED &&
              isOver12Hours(c.updatedAt)),
        );
        return [
          ...(statusGroups[ClaimStatus.FILE_DISPATCH_PENDING] || []),
          ...manualDispatch,
        ];
      }
      if (DISCHARGE_APPROVED_GROUP.includes(status)) {
        return (statusGroups[status] || []).filter((c) => {
          if (status === ClaimStatus.DISCHARGE_APPROVED)
            return !isOver24Hours(c.updatedAt);
          if (status === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED)
            return !isOver12Hours(c.updatedAt);
          return true;
        });
      }
      return statusGroups[status] || [];
    };

    // 3. Pre-calculate stage metrics
    const stageMetrics: Record<string, { count: number; value: number }> = {};
    visibleStages.forEach((stage) => {
      let count = 0;
      let value = 0;
      stage.statuses.forEach((s) => {
        const sClaims = getSpecializedStatusClaims(s);
        count += sClaims.length;
        value += sClaims.reduce((sum, c) => {
          const amt =
            stage.key === "settlement"
              ? c.formData?.set_incl_tds || 0
              : c.formData?.fin_app_amt || c.estimatedCost || 0;
          return sum + Number(amt);
        }, 0);
      });
      stageMetrics[stage.id] = { count, value };
    });

    // 4. Pre-calculate status counts (folders and regular)
    const statusCounts: Record<string, number> = {};
    const allUniqueDisplayStatuses = new Set<string>();
    visibleStages.forEach((stage) => {
      stage.statuses.forEach((s) => allUniqueDisplayStatuses.add(s));
    });
    [
      "Settlement Pending",
      "Initial Approval Pending",
      "Initial Query Pending",
      "Pre Auth Approved",
      "Enhancement Alert",
      "DRAFT",
      ClaimStatus.DISCHARGE_INITIATED,
      ClaimStatus.DISCHARGE_APPROVED,
    ].forEach((s) => allUniqueDisplayStatuses.add(s));

    allUniqueDisplayStatuses.forEach((status) => {
      if (status === "Settlement Pending") {
        statusCounts[status] = SETTLEMENT_PENDING_STATUSES.reduce(
          (sum, s) => sum + getSpecializedStatusClaims(s).length,
          0,
        );
      } else if (status === "Registration & Logistics") {
        statusCounts[status] = REGISTRATION_LOGISTICS_GROUP.reduce(
          (sum, s) => sum + getSpecializedStatusClaims(s).length,
          0,
        );
      } else if (status === "Initial Approval Pending") {
        statusCounts[status] = INITIAL_APPROVAL_PENDING_STATUSES.reduce(
          (sum, s) => sum + getSpecializedStatusClaims(s).length,
          0,
        );
      } else if (status === "Initial Query Pending") {
        statusCounts[status] = INITIAL_QUERY_PENDING_GROUP.reduce(
          (sum, s) => sum + getSpecializedStatusClaims(s).length,
          0,
        );
      } else if (status === "Pre Auth Approved") {
        statusCounts[status] = PRE_AUTH_APPROVED_GROUP.reduce(
          (sum, s) => sum + getSpecializedStatusClaims(s).length,
          0,
        );
      } else if (status === "Enhancement Alert") {
        statusCounts[status] = baseClaims.filter((c) => {
          const hasExceeded = isExpectedDischargeDateExceeded(c);
          const isTargetStatus =
            c.status === ClaimStatus.PRE_AUTH_APPROVED ||
            c.status === ClaimStatus.ENHANCEMENT_APPROVED;
          return hasExceeded && isTargetStatus;
        }).length;
      } else if (status === ClaimStatus.DISCHARGE_INITIATED) {
        statusCounts[status] = DISCHARGE_INITIATED_GROUP.reduce(
          (sum, s) => sum + getSpecializedStatusClaims(s).length,
          0,
        );
      } else if (status === ClaimStatus.DISCHARGE_APPROVED) {
        statusCounts[status] = DISCHARGE_APPROVED_GROUP.reduce(
          (sum, s) => sum + getSpecializedStatusClaims(s).length,
          0,
        );
      } else if (status === "DRAFT") {
        statusCounts[status] = getSpecializedStatusClaims(ClaimStatus.DRAFT).length;
      } else {
        statusCounts[status] = getSpecializedStatusClaims(
          status as ClaimStatus,
        ).length;
      }
    });

    return { stageMetrics, statusCounts, getSpecializedStatusClaims };
  }, [claims, visibleStages]);

  const getFilteredStatusClaims = stageCalculations.getSpecializedStatusClaims;
  const getCountByStatus = (status: string) =>
    stageCalculations.statusCounts[status] || 0;
  const getStageMetrics = (stage: ClaimStage) =>
    stageCalculations.stageMetrics[stage.id] || { count: 0, value: 0 };

  const activeStage = visibleStages.find((s) => s.id === selectedStageId);

  // --- DERIVE DISPLAY STATUSES ---
  // Replaces the grouped statuses with folders
  const displayStatuses = useMemo(() => {
    if (!activeStage) return [];

    const grouped: string[] = [];
    let settlementGroupAdded = false;
    let registrationGroupAdded = false;
    // Removed paymentGroupAdded logic
    let initialAppGroupAdded = false;
    let initialQueryGroupAdded = false;
    let preAuthAppGroupAdded = false;
    let dischargeInitGroupAdded = false;
    let dischargeAppGroupAdded = false;
    let draftGroupAdded = false;

    activeStage.statuses.forEach((s) => {
      if (
        activeStage.key === "pre-auth" &&
        REGISTRATION_LOGISTICS_GROUP.includes(s)
      ) {
        if (!registrationGroupAdded) {
          grouped.push("Registration & Logistics");
          registrationGroupAdded = true;
        }
      } else if (
        activeStage.key === "settlement" &&
        SETTLEMENT_PENDING_STATUSES.includes(s)
      ) {
        if (!settlementGroupAdded) {
          grouped.push("Settlement Pending");
          settlementGroupAdded = true;
        }
      } else if (
        activeStage.key === "settlement" &&
        PAYMENT_RECEIVED_GROUP.includes(s)
      ) {
        // Ungrouped Payment Received: Show individual statuses
        grouped.push(s);
      } else if (
        activeStage.key === "pre-auth" &&
        INITIAL_QUERY_PENDING_GROUP.includes(s)
      ) {
        if (!initialQueryGroupAdded) {
          grouped.push("Initial Query Pending");
          initialQueryGroupAdded = true;
        }
      } else if (
        activeStage.key === "pre-auth" &&
        INITIAL_APPROVAL_PENDING_STATUSES.includes(s)
      ) {
        if (!initialAppGroupAdded) {
          grouped.push("Initial Approval Pending");
          initialAppGroupAdded = true;
        }
      } else if (
        activeStage.key === "pre-auth" &&
        PRE_AUTH_APPROVED_GROUP.includes(s)
      ) {
        if (!preAuthAppGroupAdded) {
          grouped.push("Pre Auth Approved");
          preAuthAppGroupAdded = true;
        }
      } else if (activeStage.key === "pre-auth" && DRAFT_GROUP.includes(s)) {
        if (!draftGroupAdded) {
          grouped.push("DRAFT");
          draftGroupAdded = true;
        }
      } else if (
        activeStage.key === "discharge" &&
        DISCHARGE_INITIATED_GROUP.includes(s)
      ) {
        if (!dischargeInitGroupAdded) {
          grouped.push(ClaimStatus.DISCHARGE_INITIATED);
          dischargeInitGroupAdded = true;
        }
      } else if (
        activeStage.key === "discharge" &&
        DISCHARGE_APPROVED_GROUP.includes(s)
      ) {
        if (!dischargeAppGroupAdded) {
          grouped.push(ClaimStatus.DISCHARGE_APPROVED);
          dischargeAppGroupAdded = true;
        }
      } else {
        // Avoid adding duplicates if they were part of a group already handled
        if (
          !SETTLEMENT_PENDING_STATUSES.includes(s) &&
          !PAYMENT_RECEIVED_GROUP.includes(s) &&
          !INITIAL_APPROVAL_PENDING_STATUSES.includes(s) &&
          !PRE_AUTH_APPROVED_GROUP.includes(s) &&
          !DISCHARGE_INITIATED_GROUP.includes(s) &&
          !DISCHARGE_APPROVED_GROUP.includes(s)
        ) {
          grouped.push(s);
        }
      }
    });

    if (activeStage.key === "pre-auth") {
      const draftIndex = grouped.indexOf("DRAFT");
      if (draftIndex !== -1) {
        grouped.splice(draftIndex, 0, "Enhancement Alert");
      } else {
        const rejIndex = grouped.indexOf("Pre Auth Rejected");
        if (rejIndex !== -1) {
          grouped.splice(rejIndex + 1, 0, "Enhancement Alert");
        } else {
          grouped.push("Enhancement Alert");
        }
      }
    }

    return grouped;
  }, [activeStage]);

  // --- EFFECT: Set default status when stage changes ---
  useEffect(() => {
    if (activeStage && displayStatuses.length > 0) {
      // Check if current activeStatus is valid for this stage
      const isValid = displayStatuses.includes(activeStatus || "");

      if (!isValid) {
        setActiveStatus(displayStatuses[0]);
      }
    }
  }, [selectedStageId, visibleStages, displayStatuses]);

  // --- LIST FILTERING ---
  const filteredClaims = useMemo(() => {
    if (!activeStatus) return [];

    // Filter by claim type (only show Cashless or undefined type, exclude Reimbursement)
    const baseClaims = filteredClaimsByProduct.filter((c) => c.claimType !== "Reimbursement");

    let result: Claim[] = [];

    if (activeStatus === "Registration & Logistics") {
      result = baseClaims.filter((c) =>
        REGISTRATION_LOGISTICS_GROUP.includes(c.status),
      );
    } else if (activeStatus === "Settlement Pending") {
      result = baseClaims.filter((c) =>
        SETTLEMENT_PENDING_STATUSES.includes(c.status),
      );
    } else if (activeStatus === "Initial Approval Pending") {
      result = baseClaims.filter((c) =>
        INITIAL_APPROVAL_PENDING_STATUSES.includes(c.status),
      );
    } else if (activeStatus === "Initial Query Pending") {
      result = baseClaims.filter((c) =>
        INITIAL_QUERY_PENDING_GROUP.includes(c.status),
      );
    } else if (activeStatus === "Pre Auth Approved") {
      result = baseClaims.filter((c) =>
        PRE_AUTH_APPROVED_GROUP.includes(c.status),
      );
    } else if (activeStatus === "Enhancement Alert") {
      result = baseClaims.filter((c) => {
        const hasExceeded = isExpectedDischargeDateExceeded(c);
        const isTargetStatus =
          c.status === ClaimStatus.PRE_AUTH_APPROVED ||
          c.status === ClaimStatus.ENHANCEMENT_APPROVED;
        return hasExceeded && isTargetStatus;
      });
    } else if (activeStatus === "DRAFT") {
      result = baseClaims.filter((c) => c.status === ClaimStatus.DRAFT);
    } else if (
      activeStatus === ClaimStatus.DISCHARGE_INITIATED &&
      activeStage?.key === "discharge"
    ) {
      result = baseClaims.filter((c) =>
        DISCHARGE_INITIATED_GROUP.includes(c.status),
      );
    } else if (
      activeStatus === ClaimStatus.DISCHARGE_APPROVED &&
      activeStage?.key === "discharge"
    ) {
      result = baseClaims.filter((c) => {
        if (c.status === ClaimStatus.DISCHARGE_APPROVED)
          return !isOver24Hours(c.updatedAt);
        if (c.status === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED)
          return !isOver12Hours(c.updatedAt);
        return false;
      });
    } else {
      // We need to apply the base claims filter here too
      result = baseClaims.filter((c) => {
        if (c.status === activeStatus) return true;
        // Handle DISCHARGE_APPROVED fallback logic if it's the active status
        if (
          activeStatus === ClaimStatus.DISCHARGE_APPROVED &&
          c.status === ClaimStatus.DISCHARGE_APPROVED
        )
          return !isOver24Hours(c.updatedAt);
        if (
          activeStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED &&
          c.status === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED
        )
          return !isOver12Hours(c.updatedAt);
        return false;
      });
    }

    if (searchTerm) {
      result = result.filter(
        (c) =>
          c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.formData?.insurer_claim_no || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          c.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Deduplicate to ensure React unique key requirement is satisfied under all conditions
    const seenIds = new Set<string>();
    const uniqueResult = result.filter((c) => {
      if (!c.id) return true;
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });

    return uniqueResult.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [claims, filteredClaimsByProduct, activeStatus, searchTerm, activeStage, sortOrder]);

  // --- VIEW METRICS ---
  const currentViewMetrics = useMemo(() => {
    const totalValue = filteredClaims.reduce((acc, c) => {
      const amt =
        selectedStageId === "4" || activeStage?.key === "settlement" // Settlement
          ? c.formData?.set_incl_tds || 0
          : c.formData?.fin_app_amt || c.estimatedCost || 0;
      return acc + Number(amt);
    }, 0);
    return { count: filteredClaims.length, totalValue };
  }, [filteredClaims, selectedStageId, activeStage]);

  // --- UI HELPERS ---
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  const getRandomColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-indigo-100 text-indigo-700",
      "bg-emerald-100 text-emerald-700",
      "bg-orange-100 text-orange-700",
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const renderCell = (claim: Claim, columnId: string) => {
    switch (columnId) {
      case "caseId": {
        const index = claims.findIndex((c) => c.id === claim.id);
        const caseId = index >= 0 ? 101 + index : "---";
        return (
          <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-widest shadow-sm">
            {caseId}
          </span>
        );
      }
      case "uhid":
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              {claim.formData?.p_uhid || "N/A"}
            </span>
          </div>
        );
      case "hospitalName":
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">
              {claim.formData?.hosp_name ||
                claim.formData?.hospitalName ||
                "Unknown"}
            </span>
          </div>
        );
      case "patientName":
        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${getRandomColor(claim.patientName)}`}
            >
              {getInitials(claim.patientName)}
            </div>
            <div className="flex flex-col text-left">
              <button
                onClick={() => setPatientToHistory(claim.patientName)}
                className="text-sm font-bold text-slate-800 leading-tight hover:text-blue-600 transition-colors text-left"
              >
                {claim.patientName}
              </button>
              {claim.status === ClaimStatus.DRAFT && (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-fit mt-1">
                  DRAFT SAVED
                </span>
              )}
            </div>
          </div>
        );
      case "claimId":
        return (
          <Link
            to={`/process-claim/${claim.id}?source=cashless`}
            className="text-sm font-black text-blue-600 uppercase hover:underline decoration-2"
            title="View Full Patient Dashboard"
          >
            {claim.formData?.insurer_claim_no || "PENDING"}
          </Link>
        );
      case "estimate": {
        const estAmt =
          claim.formData?.dis_total_bill || claim.estimatedCost || 0;
        return (
          <span className="text-sm font-bold text-slate-800">
            {hasFinancialAccess
              ? `Rs. ${Number(estAmt).toLocaleString("en-IN")}`
              : "****"}
          </span>
        );
      }
      case "approvedAmt": {
        let appAmt = 0;
        if (claim.status === ClaimStatus.PRE_AUTH_APPROVED) {
          appAmt = Number(claim.formData?.pre_auth_app_amt || 0);
        } else if (claim.status === ClaimStatus.ENHANCEMENT_APPROVED) {
          appAmt = Number(claim.formData?.enh_app_amt || 0);
        } else if (
          claim.status === ClaimStatus.DISCHARGE_APPROVED ||
          claim.status === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED ||
          claim.status === ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED
        ) {
          appAmt = Number(claim.formData?.fin_app_amt || 0);
        } else {
          appAmt = Number(
            claim.formData?.fin_app_amt ||
            claim.formData?.enh_app_amt ||
            claim.formData?.pre_auth_app_amt ||
            0
          );
        }
        return (
          <div className="flex flex-col items-end">
            <span
              className={`text-sm font-bold ${appAmt > 0 ? "text-emerald-600" : "text-slate-400"}`}
            >
              {hasFinancialAccess
                ? appAmt > 0
                  ? `Rs. ${Number(appAmt).toLocaleString("en-IN")}`
                  : "--"
                : "****"}
            </span>
            {appAmt > 0 && (
              <span className="text-xs font-bold text-rose-400">
                {(String(claim.createdAt || claim.id || "").charCodeAt(0) %
                  10) +
                  1}
                d left
              </span>
            )}
          </div>
        );
      }
      case "admissionDate":
        return (
          <span className="text-sm font-medium text-slate-600">
            {stdFormatDate(claim.admissionDate)}
          </span>
        );
      case "dischargeDate":
        return (
          <span className="text-sm font-medium text-slate-600">
            {stdFormatDate(
              claim.formData?.dis_date || claim.formData?.adm_exp_discharge,
            )}
          </span>
        );
      case "status":
        return (
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${claim.status === ClaimStatus.DRAFT ? "bg-amber-400" : claim.status.includes("Approved") ? "bg-emerald-500" : claim.status.includes("Rejected") ? "bg-rose-500" : "bg-amber-500"}`}
            ></span>
            <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">
              {(claim.status || "")
                .replace("Claim ", "")
                .replace("Pre Auth", "Pre-Auth")}
            </span>
          </div>
        );
      case "tat":
        // TAT Visualization Logic
        const diffMs = new Date().getTime() - parseDate(getClaimStageStartTime(claim)).getTime();
        const totalHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const timeText = formatClaimTAT(claim);
        
        const isHigh = totalHrs >= 4;
        const isNoTat = totalHrs === 0 && mins === 0;
        const isNew =
          claim.status === ClaimStatus.NEW_REGISTRATION ||
          claim.status === ClaimStatus.DRAFT;
        return (
          <div className="flex justify-center">
            <span
              className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${isNew || isNoTat ? "bg-slate-100 text-slate-400" : isHigh ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}
            >
              {timeText}
            </span>
          </div>
        );
      case "memberId":
        return (
          <span
            className="text-sm font-bold text-slate-600 truncate max-w-[140px]"
            title={claim.formData?.p_member_id}
          >
            {claim.formData?.p_member_id || "N/A"}
          </span>
        );
      case "insurer":
        return (
          <span
            className="text-sm font-bold text-slate-600 truncate max-w-[160px]"
            title={claim.insuranceProvider}
          >
            {claim.insuranceProvider}
          </span>
        );
      case "tpa":
        return (
          <span
            className="text-sm font-bold text-slate-600 truncate max-w-[160px]"
            title={claim.formData?.tpa_provider}
          >
            {claim.formData?.tpa_provider || "Direct"}
          </span>
        );
      case "diagnosis":
        return (
          <span
            className="text-sm font-bold text-slate-600 truncate max-w-[200px]"
            title={claim.diagnosis}
          >
            {claim.diagnosis}
          </span>
        );
      default: {
        const val = claim.formData?.[columnId] || (claim as any)[columnId];
        if (val === undefined || val === null || val === "")
          return <span className="text-slate-300">--</span>;

        const fieldDef = fields.find((f) => f.id === columnId);
        if (
          fieldDef?.type === "number" ||
          columnId.includes("amt") ||
          columnId.includes("bill")
        ) {
          return (
            <span className="text-sm font-bold text-slate-800">
              Rs. {Number(val).toLocaleString("en-IN")}
            </span>
          );
        }
        return (
          <span className="text-sm font-medium text-slate-600">
            {String(val)}
          </span>
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-2 lg:p-4 font-sans">

      <AnimatePresence>
        {showEmailModal && selectedEmailClaim && (
          <FollowUpEmailModal
            claim={selectedEmailClaim}
            hospitalProfile={hospitalProfile}
            templates={templates}
            insurers={insurers}
            tpas={tpas}
            onClose={() => {
              setShowEmailModal(false);
              setSelectedEmailClaim(null);
            }}
          />
        )}
      </AnimatePresence>

      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 bg-gradient-to-br from-[#000080] to-indigo-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">
                Cashless Control Center
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center">
                <Activity size={12} className="mr-1 text-[#0d9488]" /> Real-time
                Operations Registry
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleRefresh}
              disabled={isSyncing}
              className="flex items-center justify-center px-5 h-[40px] bg-[#008080] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#008080]/30 hover:bg-[#0066CC] hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap disabled:opacity-70 disabled:hover:translate-y-0"
            >
              <RefreshCw
                size={16}
                className={`mr-2 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Refreshing..." : "Refresh"}
            </button>

            {canCreateClaim && (
              <button
                onClick={() => navigate("/new-claim?source=cashless")}
                className="flex items-center justify-center px-5 h-[40px] bg-[#000080] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#000080]/30 hover:bg-[#10B981] hover:-translate-y-0.5 transition-all active:scale-95 whitespace-nowrap"
              >
                <PlusCircle size={16} className="mr-2" />
                New Admission
              </button>
            )}
          </div>
        </div>

        {syncMessage && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center text-emerald-700 text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
            <Database size={16} className="mr-2" /> {syncMessage}
          </div>
        )}
        {/* STAGE CARDS (METRICS) - COMPACT REDESIGN */}
        {visibleStages.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {visibleStages.map((stage, idx) => {
              const isActive = selectedStageId === stage.id;
              const { count, value } = getStageMetrics(stage);
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`relative p-5 rounded-[2rem] text-left transition-all duration-300 border flex flex-col justify-between min-h-[140px] ${
                    isActive
                      ? "bg-gradient-to-br from-[#000080] via-indigo-900 to-blue-900 border-[#000080] text-white shadow-2xl shadow-indigo-200 ring-4 ring-offset-4 ring-indigo-50/50 scale-[1.02]"
                      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-2 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className={`text-base font-black uppercase tracking-tight truncate ${isActive ? "text-white" : "text-slate-900"}`}
                      >
                        {stage.name}
                      </span>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse"></div>
                    )}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <span
                        className={`text-3xl font-black tracking-tighter leading-none ${isActive ? "text-white" : "text-slate-900"}`}
                      >
                        {count}
                      </span>
                      <span
                        className={`text-[10px] font-bold ml-1.5 uppercase tracking-widest ${isActive ? "text-slate-300" : "text-slate-400"}`}
                      >
                        Cases
                      </span>
                    </div>
                    {hasFinancialAccess && (
                      <div className="text-right">
                        <p
                          className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isActive ? "text-emerald-300/60" : "text-slate-400"}`}
                        >
                          Net Value
                        </p>
                        <p
                          className={`text-sm font-black ${isActive ? "text-emerald-400" : "text-emerald-700"}`}
                        >
                          ₹{(value / 100000).toFixed(1)}L
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Lock size={32} />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">
              Restricted Access
            </h3>
            <p className="text-xs text-slate-500 font-bold max-w-md mx-auto">
              Your role does not have permission to view specific workflow
              stages.
            </p>
          </div>
        )}

        {/* COMBINED STAGE METRICS & FORMULAS (SINGLE LINE) */}
        {(activeStage || activeStatus) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Stage Mapped Field Summary Cards (e.g. Total Bill Amt, Final Approval Amt, Total Settled Amt) */}
            {activeStage &&
              activeStage.mappedFieldIds &&
              activeStage.mappedFieldIds.map((fieldId) => {
                const fieldDef = fields.find((f) => f.id === fieldId);
                if (!fieldDef) return null;

                const stageClaims = filteredClaimsByProduct.filter((c) =>
                  activeStage.statuses.includes(c.status),
                );

                if (fieldDef.type === "number") {
                  const total = stageClaims.reduce(
                    (sum, c) => sum + Number(c.formData?.[fieldId] || 0),
                    0,
                  );
                  return (
                    <MetricCard
                      key={`stage-field-${fieldId}`}
                      label={fieldDef.label}
                      value={
                        total > 0
                          ? `₹${total.toLocaleString("en-IN")}`
                          : "--"
                      }
                      icon={IndianRupee}
                      color="emerald"
                    />
                  );
                } else {
                  const countWithValue = stageClaims.filter(
                    (c) => !!c.formData?.[fieldId],
                  ).length;
                  return (
                    <MetricCard
                      key={`stage-field-${fieldId}`}
                      label={fieldDef.label}
                      value={countWithValue}
                      icon={FileText}
                      color="blue"
                    />
                  );
                }
              })}

            {/* Transition Specific Formulas / Metrics */}
            {activeStatus &&
              (() => {
                const baseClaims = filteredClaimsByProduct.filter(
                  (c) => c.claimType !== "Reimbursement",
                );
                const transitionClaims = filteredClaims;

                const calculateAvgTAT = (statusList: string[]) => {
                  const targetClaims = baseClaims.filter((c) =>
                    statusList.includes(c.status),
                  );
                  if (targetClaims.length === 0) return "--";
                  const totalMs = targetClaims.reduce((sum, c) => {
                    const start = new Date(c.createdAt).getTime();
                    const end = new Date(c.updatedAt).getTime();
                    return sum + (end - start);
                  }, 0);
                  const avgHrs = (
                    totalMs /
                    targetClaims.length /
                    (1000 * 60 * 60)
                  ).toFixed(1);
                  return `${avgHrs}h`;
                };

                if (
                  activeStatus === "Initial Approval Pending" ||
                  activeStatus === ClaimStatus.PRE_AUTH_INITIATED
                ) {
                  return null;
                }

                if (
                  activeStatus === "Pre Auth Approved" ||
                  activeStatus === ClaimStatus.PRE_AUTH_APPROVED
                ) {
                  const totalApproved = transitionClaims.reduce(
                    (s, c) =>
                      s +
                      Number(c.formData?.pre_auth_app_amt || 0) +
                      Number(c.formData?.enh_app_amt || 0),
                    0,
                  );
                  const totalEst = transitionClaims.reduce(
                    (s, c) => s + (c.estimatedCost || 0),
                    0,
                  );
                  const approvalVariance =
                    totalEst > 0
                      ? ((totalApproved / totalEst) * 100).toFixed(1)
                      : "--";

                  return (
                    <>
                      <MetricCard
                        label="Total Approved"
                        value={`₹${totalApproved.toLocaleString("en-IN")}`}
                        icon={CheckCircle}
                        color="emerald"
                      />
                      <MetricCard
                        label="Approval Rate"
                        value={`${approvalVariance}%`}
                        icon={TrendingUp}
                        color="blue"
                        subtitle="Vs Estimated"
                      />
                    </>
                  );
                }

                if (activeStatus === ClaimStatus.INITIAL_QUERY_PENDING) {
                  const totalInitiated = baseClaims.filter(
                    (c) => c.status === ClaimStatus.PRE_AUTH_INITIATED,
                  ).length;
                  const queryRate =
                    totalInitiated > 0
                      ? (
                          (transitionClaims.length / totalInitiated) *
                          100
                        ).toFixed(1)
                      : "--";

                  return (
                    <>
                      <MetricCard
                        label="Query Rate"
                        value={`${queryRate}%`}
                        icon={AlertCircle}
                        color="amber"
                      />
                      <MetricCard
                        label="Open Queries"
                        value={transitionClaims.length}
                        icon={FileQuestion}
                        color="rose"
                      />
                      <MetricCard
                        label="Avg. Query Res"
                        value={calculateAvgTAT([ClaimStatus.QUERY_REPLY_DONE])}
                        icon={RotateCcw}
                        color="blue"
                      />
                    </>
                  );
                }

                if (activeStatus === ClaimStatus.PRE_AUTH_REJECTED) {
                  const totalInitiated = baseClaims.filter(
                    (c) => c.status === ClaimStatus.PRE_AUTH_INITIATED,
                  ).length;
                  const rejectionRate =
                    totalInitiated > 0
                      ? (
                          (transitionClaims.length / totalInitiated) *
                          100
                        ).toFixed(1)
                      : "--";

                  return (
                    <>
                      <MetricCard
                        label="Rejection Rate"
                        value={`${rejectionRate}%`}
                        icon={XCircle}
                        color="rose"
                      />
                      <MetricCard
                        label="Value at Risk"
                        value={`₹${transitionClaims.reduce((s, c) => s + (c.estimatedCost || 0), 0).toLocaleString("en-IN")}`}
                        icon={IndianRupee}
                        color="slate"
                      />
                      <MetricCard
                        label="Rejected Cases"
                        value={transitionClaims.length}
                        icon={AlertTriangle}
                        color="amber"
                      />
                    </>
                  );
                }

                if (activeStatus === ClaimStatus.ENHANCEMENT) {
                  const totalEnhRequested = transitionClaims.reduce(
                    (s, c) => s + Number(c.formData?.enh_amt_req || 0),
                    0,
                  );
                  const avgEnh =
                    transitionClaims.length > 0
                      ? (totalEnhRequested / transitionClaims.length).toFixed(0)
                      : "0";
                  return (
                    <>
                      <MetricCard
                        label="Enh. Pipeline"
                        value={`₹${totalEnhRequested.toLocaleString("en-IN")}`}
                        icon={PlusCircle}
                        color="indigo"
                      />
                      <MetricCard
                        label="Avg. Enh. Request"
                        value={`₹${Number(avgEnh).toLocaleString("en-IN")}`}
                        icon={IndianRupee}
                        color="blue"
                      />
                      <MetricCard
                        label="Case Count"
                        value={transitionClaims.length}
                        icon={Hash}
                        color="slate"
                      />
                    </>
                  );
                }

                if (
                  activeStatus === ClaimStatus.DISCHARGE_INITIATED ||
                  (activeStage && activeStage.name.toLowerCase().includes("discharge"))
                ) {
                  return (
                    <>
                      <MetricCard
                        label="Pending Disch."
                        value={transitionClaims.length}
                        icon={Hospital}
                        color="amber"
                      />
                      <MetricCard
                        label="Disch. Pipeline"
                        value={`₹${transitionClaims.reduce((s, c) => s + Number(c.formData?.dis_total_bill || 0), 0).toLocaleString("en-IN")}`}
                        icon={IndianRupee}
                        color="emerald"
                      />
                    </>
                  );
                }

                if (
                  activeStatus === "Settlement Pending" ||
                  activeStatus === ClaimStatus.CLAIM_APPROVED ||
                  (activeStage && activeStage.name.toLowerCase().includes("settlement"))
                ) {
                  const totalApp = transitionClaims.reduce(
                    (s, c) => s + Number(c.formData?.fin_app_amt || 0),
                    0,
                  );
                  const totalSet = transitionClaims.reduce(
                    (s, c) => s + Number(c.formData?.set_incl_tds || 0),
                    0,
                  );
                  const outstanding = totalApp - totalSet;
                  const recoveryRate =
                    totalApp > 0
                      ? ((totalSet / totalApp) * 100).toFixed(1)
                      : "--";

                  return (
                    <>
                      <MetricCard
                        label="Outstanding"
                        value={`₹${outstanding.toLocaleString("en-IN")}`}
                        icon={AlertTriangle}
                        color="rose"
                      />
                      <MetricCard
                        label="Recovery Rate"
                        value={`${recoveryRate}%`}
                        icon={TrendingUp}
                        color="emerald"
                      />
                      <MetricCard
                        label="Realized Value"
                        value={`₹${totalSet.toLocaleString("en-IN")}`}
                        icon={Banknote}
                        color="blue"
                      />
                      <MetricCard
                        label="Portfolio Yield"
                        value={
                          totalApp > 0
                            ? `${((totalSet / totalApp) * 100).toFixed(1)}%`
                            : "--"
                        }
                        icon={Zap}
                        color="indigo"
                      />
                    </>
                  );
                }

                return null;
              })()}
          </div>
        )}

        {/* FILTERS & TABLE */}
        {visibleStages.length > 0 && activeStage && (
          <>
            {/* STATUS FILTER BAR - COMPACT */}
            {true && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
                {displayStatuses.map((status) => {
                  const count = getCountByStatus(status);
                  const isStatusActive = activeStatus === status;
                  const isFolder = [
                    "Settlement Pending",
                    "Initial Approval Pending",
                    "Pre Auth Approved",
                    "Enhancement Alert",
                    "DRAFT",
                    ClaimStatus.DISCHARGE_INITIATED,
                    ClaimStatus.DISCHARGE_APPROVED,
                  ].includes(status);

                  return (
                    <button
                      key={status}
                      onClick={() => setActiveStatus(status)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-md border-2 ${
                        isStatusActive
                          ? "bg-gradient-to-r from-[#000080] to-indigo-800 text-white border-[#000080] scale-105 shadow-xl shadow-indigo-100"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-400 hover:shadow-lg"
                      }`}
                    >
                      {isFolder && (
                        <FolderOpen
                          size={16}
                          className={
                            isStatusActive ? "text-white" : "text-amber-500"
                          }
                        />
                      )}
                      <span>{status}</span>
                      {count > 0 && (
                        <span
                          className={`px-2 py-1 rounded-xl text-[10px] font-black ${isStatusActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-800"}`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TABLE CONTAINER */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col relative z-0 overflow-hidden">
              {/* Table Header Context */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  SHOWING {filteredClaims.length} RECORDS IN{" "}
                  {activeStatus?.toUpperCase()}
                </p>

                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={14}
                    />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 shadow-sm"
                    />
                  </div>

                  {isSuperPrivileged && (
                    <div className="relative" ref={settingsRef}>
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`flex items-center justify-center p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all active:scale-95 shadow-sm ${showSettings ? "ring-2 ring-indigo-50 border-indigo-200 text-indigo-600" : ""}`}
                        title="Column Layout Settings"
                      >
                        <Settings
                          size={18}
                          className={showSettings ? "animate-spin-slow" : ""}
                        />
                      </button>

                      {showSettings && (
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] p-5 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Settings size={14} className="text-indigo-600" />
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                Column Layout
                              </h3>
                            </div>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full ${visibleColumns.length >= 9 ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}
                            >
                              {visibleColumns.length}/9 Active
                            </span>
                          </div>

                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                            Select Up to 9 Columns to Display
                          </p>

                          <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {ALL_COLUMNS.map((col) => {
                              const isVisible = visibleColumns.includes(col.id);
                              const isDisabled =
                                !isVisible && visibleColumns.length >= 9;

                              return (
                                <button
                                  key={col.id}
                                  disabled={isDisabled}
                                  onClick={() => toggleColumn(col.id)}
                                  className={`flex items-center justify-between p-3 rounded-xl transition-all text-left ${isVisible ? "bg-indigo-50/50 text-indigo-700 font-bold border-indigo-100 border" : "bg-slate-50 text-slate-500 border-transparent border hover:bg-white hover:border-slate-200"} ${isDisabled ? "opacity-40 cursor-not-allowed grayscale" : ""}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center transition-all ${isVisible ? "bg-[#000080]" : "bg-white border border-slate-300"}`}
                                    >
                                      {isVisible && (
                                        <CheckSquare
                                          size={12}
                                          className="text-white"
                                        />
                                      )}
                                    </div>
                                    <span className="text-[10px] uppercase tracking-tight">
                                      {col.label}
                                    </span>
                                  </div>
                                  {isVisible && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <button
                              onClick={() => setVisibleColumns(DEFAULT_COLS)}
                              className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                            >
                              Reset Defaults
                            </button>
                            <button
                              onClick={() => setShowSettings(false)}
                              className="px-4 py-2 bg-[#000080] text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Patient List Sort Order Toggle */}
                  <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
                    title={sortOrder === 'desc' ? "Switch to Oldest → Newest" : "Switch to Newest → Oldest"}
                  >
                    <ArrowUpDown size={14} className={sortOrder === 'desc' ? "text-indigo-600" : "text-slate-400"} />
                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-600 whitespace-nowrap">
                      {sortOrder === 'desc' ? 'Newest → Oldest' : 'Oldest → Newest'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Table - Redesigned for better spacing and row structure */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-[#f8fafc] text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <tr className="border-b border-slate-100">
                      {visibleColumns.map((colId, index) => {
                        const colDef = ALL_COLUMNS.find((c) => c.id === colId);
                        return (
                          <th
                            key={colId}
                            className={`px-2 py-1.5 font-black ${colDef?.align === "right" ? "text-right" : colDef?.align === "center" ? "text-center" : "text-left"} ${index === 0 ? "pl-4" : ""}`}
                          >
                            {colDef?.label}
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-right pr-8 font-black">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600 bg-white">
                    {filteredClaims.length > 0 ? (
                      filteredClaims.map((claim) => (
                        <tr
                          key={claim.id}
                          className="hover:bg-blue-50/40 transition-all group"
                        >
                          {visibleColumns.map((colId, index) => {
                            const colDef = ALL_COLUMNS.find(
                              (c) => c.id === colId,
                            );
                            return (
                              <td
                                key={colId}
                                className={`px-2 py-1.5 ${colDef?.align === "right" ? "text-right" : colDef?.align === "center" ? "text-center" : "text-left"} ${index === 0 ? "pl-4" : ""}`}
                              >
                                {renderCell(claim, colId)}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-right pr-4">
                            <div className="relative inline-block text-left group/btn flex items-center gap-3 justify-end">
                              {EMAIL_ICON_STATUSES.includes(claim.status) && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedEmailClaim(claim);
                                    setShowEmailModal(true);
                                  }}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                  title="Send Follow Up Email"
                                >
                                  <Mail size={18} />
                                </button>
                              )}
                              {claim.status === ClaimStatus.DRAFT ? (
                                <Link
                                  to={`/edit-claim/${claim.id}`}
                                  className="inline-flex items-center justify-center w-32 px-5 py-2.5 bg-amber-500 border border-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider text-white hover:bg-amber-600 transition-all shadow-lg active:scale-95"
                                >
                                  RESUME CASE
                                </Link>
                              ) : (
                                <Link
                                  to={`/process-claim/${claim.id}?source=cashless`}
                                  className="inline-flex items-center justify-center w-32 px-5 py-2.5 bg-[#000080] border border-transparent rounded-xl text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                                >
                                  PROCESS CASE
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={visibleColumns.length + 1}
                          className="px-8 py-48 text-center"
                        >
                          <div className="flex flex-col items-center opacity-40">
                            <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-8 text-slate-300">
                              <FileSearch size={64} />
                            </div>
                            <p className="text-2xl font-black text-slate-400 uppercase tracking-[0.2em]">
                              No active cases in this stage
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="p-10 border-t border-slate-100 flex items-center justify-between bg-white">
                <div className="text-sm font-bold text-slate-400">
                  Page 1 of {Math.ceil(filteredClaims.length / 10) || 1}
                </div>
                <div className="flex gap-3">
                  <button className="w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50 transition-all">
                    <ChevronRight size={20} className="rotate-180" />
                  </button>
                  <button className="w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50 transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* KYP View Modal */}
        {showKypModal && selectedKyp && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#f1f5f9] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-8 py-4 bg-white flex items-center justify-between border-b border-slate-200">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                  KYP SUMMARY PREVIEW
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownloadKyp(selectedKyp)}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#0d9488] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#0f766e] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {isGeneratingPdf ? "Generating..." : "Download PDF"}
                  </button>
                  <button
                    onClick={() => setShowKypModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <XCircle size={28} />
                  </button>
                </div>
              </div>

              {/* Modal Content - The Document Look */}
              <div className="flex-1 overflow-y-auto p-10">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-12 max-w-4xl mx-auto min-h-[1000px] relative">
                  {/* Document Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-4xl font-black text-[#000080] tracking-tighter uppercase italic leading-none mb-1">
                        KNOW YOUR POLICY
                      </h1>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">
                        Standardized Policy Analysis Report
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                        Case ID: {selectedKyp.claimId || "NEW"}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Generated: {stdFormatDate(new Date())}
                      </p>
                    </div>
                  </div>

                  <div className="h-1.5 bg-[#000080] mb-12"></div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                    {/* 1. Policy Basic Details */}
                    <section>
                      <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[10px]">1.</span> Policy Basic
                        Details
                      </h3>
                      <div className="space-y-3">
                        <KypRow
                          label="Policy Type"
                          value={selectedKyp.policyType}
                        />
                        <KypRow
                          label="Product"
                          value={selectedKyp.productName || "N/A"}
                        />
                        <KypRow
                          label="Company"
                          value={selectedKyp.companyName}
                        />
                        <KypRow label="TPA" value={selectedKyp.tpaName} />
                        <KypRow
                          label="Effective"
                          value={selectedKyp.effectiveDate || "N/A"}
                        />
                        <KypRow
                          label="Expiry"
                          value={selectedKyp.expiryDate || "N/A"}
                        />
                      </div>
                    </section>

                    {/* 2. Insured Details */}
                    <section>
                      <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[10px]">2.</span> Insured Details
                      </h3>
                      <div className="space-y-3">
                        <KypRow
                          label="Insured Name"
                          value={selectedKyp.insuredName}
                        />
                        <KypRow
                          label="Member ID"
                          value={selectedKyp.memberId || "N/A"}
                        />
                        <KypRow
                          label="Patient Name"
                          value={
                            selectedKyp.patientName || selectedKyp.insuredName
                          }
                        />
                      </div>
                    </section>

                    {/* 3. Coverage Details */}
                    <section>
                      <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[10px]">3.</span> Coverage Details
                      </h3>
                      <div className="space-y-3">
                        <KypRow
                          label="Bonus"
                          value={selectedKyp.bonusSuperBonus || "N/A"}
                        />
                        <KypRow
                          label="Restore"
                          value={selectedKyp.restoreBenefit ? "YES" : "NO"}
                        />
                      </div>
                    </section>

                    {/* 4. Room & Benefits */}
                    <section>
                      <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[10px]">4.</span> Room & Benefits
                      </h3>
                      <div className="space-y-3">
                        <KypRow
                          label="Room Limit"
                          value={selectedKyp.roomRentLimit || "N/A"}
                        />
                        <KypRow
                          label="ICU Limit"
                          value={selectedKyp.icuLimit || "N/A"}
                        />
                        <KypRow
                          label="Daily Cash"
                          value={selectedKyp.hospitalDailyCash || "N/A"}
                        />
                        <KypRow
                          label="Ayush"
                          value={selectedKyp.ayushTreatment ? "YES" : "NO"}
                        />
                      </div>
                    </section>

                    {/* 5. Waiting Periods */}
                    <section>
                      <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[10px]">5.</span> Waiting Periods
                      </h3>
                      <div className="space-y-3">
                        <KypRow
                          label="Initial"
                          value={selectedKyp.initialWaitingPeriod || "N/A"}
                        />
                        <KypRow
                          label="Specific"
                          value={selectedKyp.specificWaitingPeriod || "N/A"}
                        />
                        <KypRow
                          label="PED"
                          value={selectedKyp.pedWaitingPeriod || "N/A"}
                        />
                        <KypRow
                          label="Waived"
                          value={selectedKyp.waivedOff ? "YES" : "NO"}
                        />
                      </div>
                    </section>

                    {/* 6. Sub-Limits & Co-Pay */}
                    <section>
                      <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[10px]">6.</span> Sub-Limits &
                        Co-Pay
                      </h3>
                      <div className="space-y-3">
                        <KypRow
                          label="Co-Pay %"
                          value={
                            selectedKyp.copayPercentage !== undefined
                              ? selectedKyp.copayPercentage + "%"
                              : "UNDEFINED%"
                          }
                        />
                        <KypRow
                          label="Sub-Limits"
                          value={selectedKyp.subLimits || "N/A"}
                        />
                      </div>
                    </section>

                    {/* 7. Pre/Post Hosp. */}
                    <section>
                      <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[10px]">7.</span> Pre/Post Hosp.
                      </h3>
                      <div className="space-y-3">
                        <KypRow
                          label="Pre-Hosp"
                          value={`${selectedKyp.preHospDays || 0} DAYS`}
                        />
                        <KypRow
                          label="Post-Hosp"
                          value={`${selectedKyp.postHospDays || 0} DAYS`}
                        />
                      </div>
                    </section>

                    {/* 8. Diagnosis Info */}
                    <section>
                      <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[10px]">8.</span> Diagnosis Info
                      </h3>
                      <div className="space-y-3">
                        <KypRow
                          label="Diagnosis"
                          value={selectedKyp.diagnosis || "N/A"}
                        />
                        <KypRow
                          label="Case Info"
                          value={selectedKyp.caseInfo || "N/A"}
                        />
                      </div>
                    </section>
                  </div>

                  {/* 9. Remarks & Intimation */}
                  <div className="mt-12">
                    <h3 className="text-xs font-black text-[#000080] border-b border-blue-100 pb-2 mb-6 uppercase tracking-widest flex items-center gap-2">
                      <span className="text-[10px]">9.</span> Remarks &
                      Intimation
                    </h3>
                    <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100 min-h-[100px] mb-8">
                      <p className="text-[11px] font-medium text-slate-600 italic">
                        {selectedKyp.remarks ||
                          "No specific remarks from medical underwriting."}
                      </p>
                    </div>

                    <div className="flex justify-between items-center p-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        Intimation No
                      </span>
                      <span className="text-[10px] font-black text-slate-800 uppercase">
                        {selectedKyp.intimationNo || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="absolute bottom-12 left-12 right-12 border-t pt-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 font-black text-[#000080] rounded border border-blue-100 flex items-center justify-center text-[8px] p-0.5">
                        NX
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Generated by ClaimNX KYP System
                      </span>
                    </div>
                    <p className="text-[8px] font-black text-slate-300 uppercase italic">
                      This is a system generated standardized policy summary.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient History Modal (Reflecting Here) */}
        {patientToHistory && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative bg-white w-full max-w-4xl h-full max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <HistoryIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Patient History
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {patientToHistory}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPatientToHistory(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                <div className="space-y-4">
                  {claims
                    .filter((c) => c.patientName === patientToHistory)
                    .filter((c, idx, self) => self.findIndex(t => t.id === c.id) === idx)
                    .map((claim) => (
                      <div
                        key={claim.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-all group"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-black text-slate-800 uppercase">
                                {claim.formData?.insurer_claim_no || "PENDING"}
                              </span>
                              <span
                                className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                                  claim.status.includes("Approved")
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {claim.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <span>{stdFormatDate(claim.admissionDate)}</span>
                              <span>{claim.insuranceProvider}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right mr-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                              Value
                            </p>
                            <p className="text-xs font-black text-slate-800">
                              ₹{(claim.estimatedCost || 0).toLocaleString()}
                            </p>
                          </div>
                          <Link
                            to={`/process-claim/${claim.id}?source=cashless`}
                            className="px-4 py-2 bg-[#000080] text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-blue-900 transition-all"
                          >
                            View Full Dashboard
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for KYP rows in document view
const KypRow: React.FC<{ label: string; value?: string | number }> = ({
  label,
  value,
}) => (
  <div className="flex items-baseline gap-2 group">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap pt-0.5">
      {label}
    </span>
    <div className="flex-1 border-b border-dotted border-slate-200 mb-1 group-hover:border-slate-400 transition-colors"></div>
    <span className="text-[11px] font-black text-slate-800 uppercase text-right">
      {value || "N/A"}
    </span>
  </div>
);

// Helper component for detail rows
const DetailRow: React.FC<{
  label: string;
  value?: string | number;
  isBold?: boolean;
  className?: string;
}> = ({ label, value, isBold, className }) => (
  <div className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
      {label}
    </span>
    <span
      className={`text-sm ${isBold ? "font-black" : "font-bold"} ${className || "text-slate-700"}`}
    >
      {value || "N/A"}
    </span>
  </div>
);

// New MetricCard component for transition metrics
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  icon: any;
  color: "emerald" | "rose" | "amber" | "blue" | "indigo" | "slate";
  subtitle?: string;
}> = ({ label, value, icon: Icon, color, subtitle }) => {
  const colorMap = {
    emerald:
      "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-100",
    amber:
      "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100",
    indigo:
      "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-100",
    slate:
      "bg-slate-50 text-slate-600 border-slate-100 group-hover:bg-slate-100",
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center group hover:border-indigo-300 transition-all">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-hover:text-indigo-500 transition-colors flex items-center justify-between">
        {label}
        {subtitle && (
          <span className="text-[8px] opacity-70 italic lowercase normal-case">
            {subtitle}
          </span>
        )}
      </p>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-colors ${colorMap[color]}`}>
          <Icon size={14} />
        </div>
        <p className="text-lg font-black text-slate-800 group-hover:text-indigo-900 leading-none tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
};

export default CashlessDashboard;
