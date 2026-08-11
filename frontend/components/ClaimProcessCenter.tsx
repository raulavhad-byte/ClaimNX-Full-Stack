import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "motion/react";
import {
  Claim,
  ClaimStatus,
  ClaimStage,
  FormField,
  TimelineEvent,
  WalletTransaction,
  Role,
  HospitalUser,
  KYPPolicy,
  Product,
} from "../types";
import { emailTemplateService } from "../services/emailTemplateService";
import {
  ArrowLeft,
  CheckCircle,
  X,
  AlertCircle,
  FileText,
  UploadCloud,
  Eye,
  Download,
  Activity,
  Clock,
  ChevronRight,
  ShieldCheck,
  User,
  ClipboardList,
  BriefcaseMedical,
  Maximize2,
  PenTool,
  PlusSquare,
  Sparkles,
  Stethoscope,
  RotateCcw,
  Zap,
  Hash,
  Paperclip,
  File,
  Edit2,
  ChevronDown,
  FileSearch,
  Loader2,
  ExternalLink,
  Plus,
  XCircle,
  RefreshCw,
  Lock,
  Calendar,
  IndianRupee,
} from "lucide-react";
import {
  checkDateReasonability,
  isValidYearFormat,
  formatDate,
  formatDateTime,
  formatTAT,
  safeHtml2Canvas,
  safeFormatYmd,
} from "../utils";
import { auditService } from "../services/auditService";
import StarHealthTemplate from "./StarHealthTemplate";
import TataAigTemplate from "./TataAigTemplate";
import HdfcErgoTemplate from "./HdfcErgoTemplate";
import IciciLombardTemplate from "./IciciLombardTemplate";
import CareHealthTemplate from "./CareHealthTemplate";
import AdityaBirlaTemplate from "./AdityaBirlaTemplate";
import BajajAllianzTemplate from "./BajajAllianzTemplate";
import GenericIrdaiTemplate from "./GenericIrdaiTemplate";
import MediAssistTemplate from "./MediAssistTemplate";
import CholaMsTemplate from "./CholaMsTemplate";
import ManipalCignaTemplate from "./ManipalCignaTemplate";
import CentralGeneraliTemplate from "./CentralGeneraliTemplate";
import GoDigitTemplate from "./GoDigitTemplate";
import IffcoTokioTemplate from "./IffcoTokioTemplate";
import MagmaHdiTemplate from "./MagmaHdiTemplate";
import RelianceGeneralTemplate from "./RelianceGeneralTemplate";
import IndusindTemplate from "./IndusindTemplate";
import NivaBupaTemplate from "./NivaBupaTemplate";
import MdIndiaTemplate from "./MdIndiaTemplate";
import MedsaveTemplate from "./MedsaveTemplate";
import HealthIndiaTemplate from "./HealthIndiaTemplate";
import VidalHealthTemplate from "./VidalHealthTemplate";

interface ClaimProcessCenterProps {
  claims: Claim[];
  onUpdate: (claim: Claim) => void;
  onUpdateHospital?: (hospital: HospitalUser) => void;
  stages: ClaimStage[];
  fields: FormField[];
  userRole: string;
  roles: Role[];
  hospitalProfile: HospitalUser;
  kypPolicies?: KYPPolicy[];
  permissions?: any;
  canAccessStageAction?: (stageKey: string, action: string) => boolean;
}

const NATIONAL_INSURERS = [
  "National Insurance Co. Ltd",
  "The New India Assurance Co. Ltd",
  "The Oriental Insurance Co. Ltd",
  "United India Insurance Co. Ltd",
];

// Cashless Standard Flow
const getNextStatusOptions = (
  claim: Claim,
  hospitalProfile: HospitalUser,
): (ClaimStatus | "REOPEN CASE")[] => {
  const status = claim.status;
  const isMedScrutinyOff =
    hospitalProfile?.valueAddedServices?.medicalScrutinyRequired === false;

  // ICA & Pre-Post & Recovery & Recon Specific Transitions
  if (
    claim.product === Product.ICA ||
    claim.product === Product.PRE_POST ||
    claim.product === Product.RECOVERY_RECONCILIATION
  ) {
    switch (status) {
      case ClaimStatus.NEW_REGISTRATION:
        return [
          ClaimStatus.WELCOME_CALL_DONE,
          ClaimStatus.FILE_PICKUP_SCHEDULED,
        ];
      case ClaimStatus.WELCOME_CALL_DONE:
        return [ClaimStatus.FILE_PICKUP_SCHEDULED];
      case ClaimStatus.FILE_PICKUP_SCHEDULED:
        return [
          ClaimStatus.FILE_PICKUP_IN_PROGRESS,
          ClaimStatus.FILE_PICKED_UP_DONE,
        ];
      case ClaimStatus.FILE_PICKUP_IN_PROGRESS:
        return [ClaimStatus.FILE_PICKED_UP_DONE];
      case ClaimStatus.FILE_PICKED_UP_DONE:
        return [
          isMedScrutinyOff
            ? ClaimStatus.MEDICALLY_FILE_APPROVED
            : ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
          ClaimStatus.HOSPITAL_QUERY_PENDING,
          ClaimStatus.INTERNAL_QUERY_PENDING,
        ];
      case ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY:
        return [
          ClaimStatus.MEDICALLY_FILE_APPROVED,
          ClaimStatus.HOSPITAL_QUERY_PENDING,
          ClaimStatus.INTERNAL_QUERY_PENDING,
        ];
      case ClaimStatus.MEDICALLY_FILE_APPROVED:
        return [
          ClaimStatus.FILE_DISPATCHED,
          ClaimStatus.HOSPITAL_QUERY_PENDING,
          ClaimStatus.INTERNAL_QUERY_PENDING,
        ];
      case ClaimStatus.HOSPITAL_QUERY_PENDING:
        return [ClaimStatus.QUERY_DOCUMENTS_RECEIVED];
      case ClaimStatus.QUERY_DOCUMENTS_RECEIVED:
        return [
          ClaimStatus.HOSPITAL_QUERY_PENDING,
          ClaimStatus.INTERNAL_QUERY_PENDING,
          ClaimStatus.FILE_DISPATCHED,
        ];
      case ClaimStatus.INTERNAL_QUERY_PENDING:
        return [
          ClaimStatus.QUERY_DOCUMENTS_RECEIVED,
          ClaimStatus.HOSPITAL_QUERY_PENDING,
          ClaimStatus.FILE_DISPATCHED,
        ];
      case ClaimStatus.FILE_DISPATCHED:
        return [
          ClaimStatus.CLAIM_UNDER_QUERY,
          ClaimStatus.CLAIM_UNDER_PROCESS,
          ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
          ClaimStatus.CLAIM_APPROVED,
          ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
          ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
          ClaimStatus.COMPLETE_SETTLEMENT,
        ];
      case ClaimStatus.CLAIM_UNDER_PROCESS:
        return [
          ClaimStatus.CLAIM_UNDER_QUERY,
          ClaimStatus.CLAIM_UNDER_PROCESS,
          ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
          ClaimStatus.CLAIM_APPROVED,
          ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
          ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
          ClaimStatus.COMPLETE_SETTLEMENT,
        ];
      case ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM:
        return [
          ClaimStatus.CLAIM_UNDER_QUERY,
          ClaimStatus.CLAIM_UNDER_PROCESS,
          ClaimStatus.CLAIM_PENDING_WITH_INSURER_MEDICAL,
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
          ClaimStatus.CLAIM_UNDER_PROCESS,
          ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
          ClaimStatus.CLAIM_APPROVED,
          ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
          ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
          ClaimStatus.COMPLETE_SETTLEMENT,
        ];
      case ClaimStatus.CLAIM_APPROVED:
        return [
          ClaimStatus.CLAIM_APPROVED,
          ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
          ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
          ClaimStatus.COMPLETE_SETTLEMENT,
        ];
      case ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE:
        return [
          ClaimStatus.COMPLETE_SETTLEMENT,
          ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
          ClaimStatus.ACCOUNT_RECONCILIATION,
        ];
      case ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE:
        return [
          ClaimStatus.COMPLETE_SETTLEMENT,
          ClaimStatus.ACCOUNT_RECONCILIATION,
          ClaimStatus.BANK_RECONCILIATION_COMPLETED,
        ];
      case ClaimStatus.COMPLETE_SETTLEMENT:
        return [
          ClaimStatus.ACCOUNT_RECONCILIATION,
          ClaimStatus.BANK_RECONCILIATION_COMPLETED,
        ];
      case ClaimStatus.ACCOUNT_RECONCILIATION:
        return [ClaimStatus.BANK_RECONCILIATION_COMPLETED];
      case ClaimStatus.BANK_RECONCILIATION_COMPLETED:
        return [];
      default:
        return [];
    }
  }

  // Reimbursement Specific Flow
  if (claim.claimType === "Reimbursement") {
    switch (status) {
      case ClaimStatus.ASSESSMENT_SUBMITTED:
        return [ClaimStatus.ASSESSMENT_INITIATED];
      case ClaimStatus.ASSESSMENT_INITIATED:
        return [
          ClaimStatus.ASSESSMENT_APPROVED,
          ClaimStatus.ASSESSMENT_QUERY_PENDING,
          ClaimStatus.ASSESSMENT_REJECTED,
        ];
      case ClaimStatus.ASSESSMENT_APPROVED:
        return [
          ClaimStatus.ENHANCEMENT,
          ClaimStatus.DISCHARGE_INITIATED,
          ClaimStatus.ASSESSMENT_REJECTED,
        ];
      case ClaimStatus.ASSESSMENT_QUERY_PENDING:
        return [
          ClaimStatus.ASSESSMENT_APPROVED,
          ClaimStatus.QUERY_REPLY_DONE,
          ClaimStatus.ASSESSMENT_REJECTED,
        ];
      case ClaimStatus.QUERY_REPLY_DONE:
        return [
          ClaimStatus.ASSESSMENT_APPROVED,
          ClaimStatus.INITIAL_QUERY_PENDING,
          ClaimStatus.ASSESSMENT_REJECTED,
        ];
      case ClaimStatus.ASSESSMENT_REJECTED:
        return ["REOPEN CASE"];

      case ClaimStatus.ENHANCEMENT:
        return [
          ClaimStatus.ENHANCEMENT_APPROVED,
          ClaimStatus.ENHANCEMENT_REJECTED,
        ];
      case ClaimStatus.ENHANCEMENT_APPROVED:
        return [ClaimStatus.ENHANCEMENT, ClaimStatus.DISCHARGE_INITIATED];
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

      case ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED:
        return [
          ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
          ClaimStatus.DISCHARGE_REJECTED,
        ];
      case ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED:
        return []; // Should move to File Dispatch Pending after 24h logic elsewhere or manual
      case ClaimStatus.FILE_DISPATCH_PENDING:
        return [ClaimStatus.FILE_DISPATCHED];
      case ClaimStatus.FILE_DISPATCHED:
        return [ClaimStatus.CLAIM_UNDER_PROCESS];

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
        return [ClaimStatus.COMPLETE_SETTLEMENT];
      case ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE:
        return [ClaimStatus.SETTLED];
      case ClaimStatus.COMPLETE_SETTLEMENT:
        return [ClaimStatus.SETTLED, ClaimStatus.BANK_RECONCILIATION_COMPLETED];
      case ClaimStatus.SETTLED:
        return [
          ClaimStatus.ACCOUNT_RECONCILIATION,
          ClaimStatus.BANK_RECONCILIATION_COMPLETED,
        ];
      case ClaimStatus.ACCOUNT_RECONCILIATION:
        return [ClaimStatus.BANK_RECONCILIATION_COMPLETED];
      case ClaimStatus.SETTLEMENT_FAILED:
        return [
          ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
          ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
          ClaimStatus.COMPLETE_SETTLEMENT,
        ];

      default:
        return [];
    }
  }

  // Cashless Standard Flow
  switch (status) {
    case ClaimStatus.MEDICAL_QUERY_RAISED:
      return [ClaimStatus.MEDICAL_QUERY_REPLIED];
    case ClaimStatus.MEDICAL_QUERY_REPLIED:
      return [ClaimStatus.PENDING_MEDICAL_REVIEW];
    case ClaimStatus.PENDING_MEDICAL_REVIEW:
      return [ClaimStatus.MEDICAL_QUERY_RAISED];
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
      return [ClaimStatus.CLAIM_UNDER_PROCESS];
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
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
        ClaimStatus.COMPLETE_SETTLEMENT,
        ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
      ];
    case ClaimStatus.COMPLETE_SETTLEMENT:
    case ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE:
      return [ClaimStatus.ACCOUNT_RECONCILIATION];
    case ClaimStatus.ACCOUNT_RECONCILIATION:
      return [];
    case ClaimStatus.SETTLEMENT_FAILED:
      return [
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
        ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
        ClaimStatus.COMPLETE_SETTLEMENT,
      ];
    case ClaimStatus.BANK_RECONCILIATION_COMPLETED:
      return [];
    default:
      return [];
  }
};

const ClaimProcessCenter: React.FC<ClaimProcessCenterProps> = ({
  claims,
  onUpdate,
  onUpdateHospital,
  stages,
  fields,
  userRole,
  roles,
  hospitalProfile,
  kypPolicies = [],
  permissions,
  canAccessStageAction,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const source = searchParams.get("source");

  const claim = useMemo(() => claims.find((c) => c.id === id), [claims, id]);

  const isPartnerProcessing = useMemo(() => {
    return (claim?.product as any) === Product.PARTNER_PROCESSING || (claim?.product as any) === "Partner Processing" || source === "Partner Processing";
  }, [claim, source]);

  const [activeTab, setActiveTab] = useState<"patient" | "claim" | "insurance">(
    "patient",
  );
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    ClaimStatus | "REOPEN CASE" | null
  >(null);
  const [localFormData, setLocalFormData] = useState<any>({});
  const [isTimelineMinimized, setIsTimelineMinimized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedKyp, setSelectedKyp] = useState<KYPPolicy | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [claimNumberError, setClaimNumberError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    data: string;
    type: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [editedProfileData, setEditedProfileData] = useState<any>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const rateList = useMemo(() => {
    if (!claim || !hospitalProfile) return null;
    const credentials = hospitalProfile.portalCredentials || [];
    const normalizePayer = (value: unknown) => String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const findCredential = (provider: unknown) => {
      const normalizedProvider = normalizePayer(provider);
      return credentials.find((credential: any) => credential.rateListData && (
        credential.entityId === provider ||
        normalizePayer(credential.entityId) === normalizedProvider
      ));
    };

    const insurerName = claim.insuranceProvider;
    const tpaName = claim.formData?.tpa_provider;
    const isTpaCase = claim.formData?.in_house_processing === "No";

    // If it's a TPA case, only show rate list if insurer is one of the national insurers
    if (isTpaCase) {
      if (!NATIONAL_INSURERS.includes(insurerName)) return null;
      const tpaCreds = findCredential(tpaName);
      if (tpaCreds?.rateListData) return tpaCreds;
    }

    // Default: Show Insurer's rate list
    const insurerCreds = findCredential(insurerName);
    return insurerCreds?.rateListData ? insurerCreds : null;
  }, [claim, hospitalProfile]);

  const currentStage = useMemo(() => {
    if (!claim || !stages) return null;
    return stages.find((s) => s.statuses.includes(claim.status));
  }, [claim?.status, stages]);

  const currentStageKey = currentStage?.key || "unknown";

  const isViewAllowed = useMemo(() => {
    if (!currentStageKey || currentStageKey === "unknown") return true;
    const role = hospitalProfile?.role?.toUpperCase();
    if (role === 'SUPER ADMIN' || role === 'ADMIN' || (permissions && permissions.includes('all'))) return true;
    return permissions && permissions.includes(`stage_permissions:stage_${currentStageKey}:update`);
  }, [currentStageKey, hospitalProfile?.role, permissions]);

  if (claim && !isViewAllowed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-xl shadow-rose-900/10 animate-bounce">
          <Lock size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
            Access Restricted
          </h2>
          <p className="text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
            Your assigned role does not have permission to view cases in the{" "}
            <span className="text-[#000080] font-black">
              {currentStage?.name || "Current"}
            </span>{" "}
            stage.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const nextStageButtons = useMemo(() => {
    if (!claim || !canAccessStageAction) return [];

    // 1. Check if user has overall 'move' permission for this stage
    if (!canAccessStageAction(currentStageKey, "move")) return [];

    // Check if cashless claim is in a query reply status and medical scrutiny is required (enabled)
    const isQueryReplyScrutiny = [
      ClaimStatus.QUERY_REPLY_DONE,
      ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
      ClaimStatus.DISCHARGE_QUERY_REPLY
    ].includes(claim.status as ClaimStatus) && hospitalProfile?.valueAddedServices?.medicalScrutinyRequired !== false;

    const isMedicalOrAdmin = 
      userRole === "Medical Team" || 
      userRole === "Medical Officer" || 
      userRole === "Doctor" || 
      userRole === "Consultant" || 
      userRole === "Super Admin" || 
      userRole === "Admin" ||
      hospitalProfile?.role?.toUpperCase() === "SUPER ADMIN" ||
      hospitalProfile?.role?.toUpperCase() === "ADMIN";

    if (isQueryReplyScrutiny && !isMedicalOrAdmin) {
      return []; // Return no transition options for normal hospital desks/staff
    }

    const options = getNextStatusOptions(claim, hospitalProfile);

    return options.filter((opt) => {
      if (opt === "REOPEN CASE") return true;

      // 2. Further refine based on target status (e.g. Approve or Query)
      if (
        opt === ClaimStatus.CLAIM_APPROVED ||
        opt === ClaimStatus.COMPLETE_SETTLEMENT
      ) {
        return canAccessStageAction(currentStageKey, "approve");
      }

      if (
        opt === ClaimStatus.CLAIM_UNDER_QUERY ||
        opt === ClaimStatus.HOSPITAL_QUERY_PENDING ||
        opt === ClaimStatus.MEDICAL_QUERY_RAISED
      ) {
        return canAccessStageAction(currentStageKey, "query");
      }

      return true;
    });
  }, [claim?.status, currentStageKey, canAccessStageAction]);

  // Handle Today's date initialization when modal opens
  useEffect(() => {
    if (showStatusModal && !localFormData.current_date) {
      const today = new Date().toISOString().split("T")[0];
      setLocalFormData((prev: any) => ({
        ...prev,
        current_date: today,
      }));
    }
  }, [showStatusModal, localFormData.current_date]);

  const currentKyp = useMemo(() => {
    if (!claim) return null;
    return kypPolicies.find(
      (p) =>
        p.claimId === claim.id ||
        p.policyNumber === claim.policyNumber ||
        p.insuredName === claim.patientName,
    );
  }, [claim, kypPolicies]);

  // Combined data for Policy Intelligence Report
  const policyReportData = useMemo(() => {
    if (!claim) return null;
    const kyp = selectedKyp || currentKyp;

    // Merge or fallback
    return {
      p_sum_insured: kyp?.sumInsured || claim.formData?.p_sum_insured || "N/A",
      p_room_eligibility:
        kyp?.roomRentLimit || claim.formData?.p_room_eligibility || "N/A",
      p_icu_eligibility:
        kyp?.icuLimit || claim.formData?.p_icu_eligibility || "N/A",
      p_copay: claim.formData?.p_copay || "N/A",
      p_sub_limit: claim.formData?.p_sub_limit || "N/A",
      p_bonus: claim.formData?.p_bonus || "N/A",
      p_ncb: claim.formData?.p_ncb || "N/A",
      p_restore_benefit: claim.formData?.p_restore_benefit || "N/A",
      p_pre_hosp: claim.formData?.p_pre_hosp || "N/A",
      p_post_hosp: claim.formData?.p_post_hosp || "N/A",
      p_maternity: claim.formData?.p_maternity || "N/A",
      p_maternity_waiting: claim.formData?.p_maternity_waiting || "N/A",
      p_ped_waiting: claim.formData?.p_ped_waiting || "N/A",
      p_specific_waiting: claim.formData?.p_specific_waiting || "N/A",
    };
  }, [claim, selectedKyp, currentKyp]);

  const totalSettledAmt = useMemo(() => {
    const settlementStatuses = [
      ClaimStatus.COMPLETE_SETTLEMENT,
      ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
      ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
    ];

    return (claim?.history || [])
      .filter((h) => settlementStatuses.includes(h.status as ClaimStatus))
      .reduce((sum, ev) => sum + Number(ev.stageData?.set_incl_tds || 0), 0);
  }, [claim?.history]);

  const safeFloat = (val: any) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const getDuration = (start: string, end: string) => {
    return formatTAT(start, end);
  };

  const validateDateOnBlur = (key: string, value: string) => {
    if (!value) return;
    const result = checkDateReasonability(value, "other");
    if (!result.isReasonable) {
      toast.warning(
        `Unusual Date: You ${result.message}. Please double check if this is correct.`,
        {
          action: { label: "Correct", onClick: () => {} },
          cancel: {
            label: "Change",
            onClick: () => handleLocalInputChange(key, ""),
          },
          duration: 10000,
        },
      );
    }
  };

  const handleLocalInputChange = (key: string, value: any) => {
    // Year digit validation
    if (["current_date", "settlement_date"].includes(key) && value) {
      const yearStr = value.split("-")[0];
      if (yearStr && yearStr.length > 4) {
        toast.error("Year cannot exceed 4 digits. Please correct the date.");
        return;
      }
    }

    setLocalFormData((prev: any) => {
      const next = { ...prev, [key]: value };

      // Sync Claim IDs
      if (key === "insurer_claim_no" || key === "claim_id") {
        next.insurer_claim_no = value;
        next.claim_id = value;
      }

      // Auto-calculate discharge totals
      if (pendingStatus === ClaimStatus.DISCHARGE_INITIATED) {
        if (
          [
            "dis_pkg_exp",
            "dis_room_rent",
            "dis_prof_exp",
            "dis_pharm_exp",
            "dis_inv_exp",
            "dis_diag_other",
          ].includes(key)
        ) {
          const total =
            safeFloat(next.dis_pkg_exp) +
            safeFloat(next.dis_room_rent) +
            safeFloat(next.dis_prof_exp) +
            safeFloat(next.dis_pharm_exp) +
            safeFloat(next.dis_inv_exp) +
            safeFloat(next.dis_diag_other);
          next.dis_total_bill = total;
        }
      }

      // Auto-calculate account reconciliation
      if (pendingStatus === ClaimStatus.ACCOUNT_RECONCILIATION) {
        if (key === "bank_amt_rec") {
          const amt = safeFloat(value);
          const tds = Math.round(amt / 9); // Assuming Net = 90%, TDS = 10% -> Gross = 100%
          next.set_tds = tds;
          next.set_incl_tds = amt + tds;
        }
      }

      // Auto-calculate settlement totals
      if (
        pendingStatus === ClaimStatus.COMPLETE_SETTLEMENT ||
        pendingStatus === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE ||
        pendingStatus === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE
      ) {
        const approvedAmount = safeFloat(
          claim?.formData?.fin_app_amt ||
            claim?.formData?.pre_auth_app_amt ||
            0,
        );

        if (key === "set_net_settled") {
          let net = safeFloat(value);
          let tds = Math.round(net / 9); // Assuming Net = 90%, TDS = 10% -> Gross = 100%
          let inclTds = net + tds;

          // Limit to outstanding balance
          const previouslySettled = totalSettledAmt;
          const outstandingBalance = approvedAmount > previouslySettled ? approvedAmount - previouslySettled : 0;

          if (inclTds > outstandingBalance) {
            inclTds = outstandingBalance;
            net = Math.floor(inclTds * 0.9);
            tds = inclTds - net;
          }

          next.set_net_settled = net;
          next.set_tds = tds;
          next.set_incl_tds = inclTds;

          // Calculate remaining outstanding balance amount after this settlement
          const partialAmt =
            outstandingBalance > inclTds
              ? outstandingBalance - inclTds
              : 0;
          next.set_partial_amt = partialAmt;

          if (partialAmt <= 0) {
            next.target_settlement_status = ClaimStatus.COMPLETE_SETTLEMENT;
          } else {
            next.target_settlement_status = pendingStatus;
          }
        }
      }

      // Auto-calculate final approval totals
      if (
        pendingStatus === ClaimStatus.DISCHARGE_APPROVED ||
        pendingStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED
      ) {
        const totalAmtKeys = [
          "fin_app_amt",
          "fin_mou_disc",
          "fin_copay",
          "fin_non_med",
          "fin_prop_exp",
          "fin_sub_limit",
          "fin_tariff_ded",
          "fin_other_ded",
        ];
        const patientPaidKeys = [
          "fin_copay",
          "fin_non_med",
          "fin_prop_exp",
          "fin_sub_limit",
          "fin_tariff_ded",
          "fin_other_ded",
        ];

        if (totalAmtKeys.includes(key)) {
          next.fin_total_amt = totalAmtKeys.reduce(
            (acc, k) => acc + safeFloat(next[k]),
            0,
          );
          next.fin_patient_paid = patientPaidKeys.reduce(
            (acc, k) => acc + safeFloat(next[k]),
            0,
          );
        }
      }

      return next;
    });

    if (validationError) setValidationError(null);

    // Duplicate Claim No Check
    if (key === "insurer_claim_no" || key === "claim_id") {
      if (value && value.trim().length > 0) {
        const duplicate = claims.find(
          (c) =>
            c.id !== claim?.id &&
            (c.formData?.insurer_claim_no?.toLowerCase().trim() ===
              value.toLowerCase().trim() ||
              c.formData?.claim_id?.toLowerCase().trim() ===
                value.toLowerCase().trim()),
        );
        if (duplicate) {
          setClaimNumberError(
            `Duplicate Claim No found! Already exists for patient: ${duplicate.patientName}`,
          );
        } else {
          setClaimNumberError(null);
        }
      } else {
        setClaimNumberError(null);
      }
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement> | File,
    fieldKey: string = "documents",
  ) => {
    let file: File | null = null;
    const isFile = typeof File === 'function' && e instanceof File;
    if (isFile) {
      file = e as File;
    } else {
      const changeEvent = e as React.ChangeEvent<HTMLInputElement>;
      if (changeEvent && changeEvent.target && changeEvent.target.files) {
        file = changeEvent.target.files[0];
      }
    }

    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit");
      toast.error("File size exceeds 10MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(",")[1];

      if (fieldKey === "documents") {
        setLocalFormData((prev) => ({
          ...prev,
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type,
        }));
      } else {
        setLocalFormData((prev) => ({
          ...prev,
          [`${fieldKey}_data`]: base64Data,
          [`${fieldKey}_name`]: file.name,
          [`${fieldKey}_type`]: file.type,
        }));
      }

      setUploadError(null);
      setValidationError(null);
      toast.success("Document attached successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleMultipleFilesChange = (
    e: React.ChangeEvent<HTMLInputElement> | FileList | File[] | any
  ) => {
    let files: FileList | File[] | null = null;
    const isFileList = typeof FileList === 'function' && e instanceof FileList;
    if (isFileList || Array.isArray(e)) {
      files = e;
    } else if (e && typeof e === 'object' && 'target' in e) {
      files = e.target.files;
    } else {
      files = e;
    }
    if (!files || files.length === 0) return;

    const processFile = (file: File): Promise<{ fileData: string; fileName: string; fileType: string }> => {
      return new Promise((resolve, reject) => {
        if (file.size > 10 * 1024 * 1024) {
          reject(new Error(`File "${file.name}" size exceeds 10MB limit`));
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = (event.target?.result as string).split(",")[1];
          resolve({
            fileData: base64Data,
            fileName: file.name,
            fileType: file.type,
          });
        };
        reader.onerror = () => reject(new Error(`Failed to read file "${file.name}"`));
        reader.readAsDataURL(file);
      });
    };

    const filePromises = Array.from(files).map(processFile);
    Promise.all(filePromises)
      .then((newFiles) => {
        setLocalFormData((prev: any) => {
          const currentMultipleFiles = prev.multipleFiles || [];
          const filteredCurrent = currentMultipleFiles.filter(
            (cf: any) => !newFiles.some((nf) => nf.fileName === cf.fileName)
          );
          const updatedFiles = [...filteredCurrent, ...newFiles];
          return {
            ...prev,
            multipleFiles: updatedFiles,
            fileData: updatedFiles[0]?.fileData || "",
            fileName: updatedFiles[0]?.fileName || "",
            fileType: updatedFiles[0]?.fileType || "",
          };
        });
        toast.success(`${newFiles.length} document(s) attached successfully`);
      })
      .catch((err: any) => {
        setUploadError(err.message);
        toast.error(err.message);
      });
  };

  const handleRemoveMultipleFile = (fileNameToRemove: string) => {
    setLocalFormData((prev: any) => {
      const currentMultipleFiles = prev.multipleFiles || [];
      const updatedFiles = currentMultipleFiles.filter((f: any) => f.fileName !== fileNameToRemove);
      return {
        ...prev,
        multipleFiles: updatedFiles,
        fileData: updatedFiles[0]?.fileData || "",
        fileName: updatedFiles[0]?.fileName || "",
        fileType: updatedFiles[0]?.fileType || "",
      };
    });
    toast.success("Document removed");
  };

  const handlePreview = (name: string, data: string, type: string) => {
    setPreviewFile({ name, data, type: type || "application/pdf" });
  };

  const handleDownload = (name: string, data: string, type: string) => {
    const link = document.createElement("a");
    link.href = `data:${type};base64,${data}`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFieldsForStatus = (status: ClaimStatus | "REOPEN CASE") => {
    switch (status) {
      case ClaimStatus.WELCOME_CALL_DONE:
        return ["transaction_date_time", "comment"];
      case ClaimStatus.FILE_PICKUP_SCHEDULED:
        return [
          "transaction_date_time",
          "appointment_date_time",
          "pickup_person_name",
          "pickup_contact_number",
          "pickup_address",
          "comment",
        ];
      case ClaimStatus.FILE_PICKUP_IN_PROGRESS:
        return ["transaction_date_time", "comment"];
      case ClaimStatus.MEDICAL_QUERY_REPLIED:
        return ["current_date", "query_reply_comment", "documents"];
      case ClaimStatus.FILE_PICKED_UP_DONE:
        return ["file_pickup_date_time", "customer_name", "comment"];
      case ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY:
        return ["current_date", "comment", "documents"];
      case ClaimStatus.HOSPITAL_QUERY_PENDING:
        return ["current_date", "query_comment"];
      case ClaimStatus.INTERNAL_QUERY_PENDING:
        return ["current_date", "reason"];
      case ClaimStatus.FILE_DISPATCHED:
        return [
          "current_date",
          "file_dispatched_date",
          "courier_name",
          "tracking_no",
          "file_dispatch_comment",
          "documents",
          "documents_pod",
          "file_dispatched_declaration",
        ];
      case ClaimStatus.CLAIM_UNDER_PROCESS:
        return [
          "current_date",
          "comment",
        ];
      case ClaimStatus.CLAIM_UNDER_QUERY:
        return [
          "current_date",
          "insurer_claim_no",
          "query_text",
          "comment",
          "documents",
        ];
      case ClaimStatus.CLAIM_APPROVED:
        return [
          "current_date",
          "approved_amt",
          "finance_info",
          "comment",
          "documents",
        ];
      case ClaimStatus.COMPLETE_SETTLEMENT:
      case ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE:
      case ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE:
        return [
          "finance_info",
          "current_date",
          "comment",
          "settlement_date",
          "utr_number",
          "utr_date",
          "set_net_settled",
          "set_tds",
          "set_incl_tds",
          "set_partial_amt",
          "partial_remark_type",
          "target_settlement_status",
          "documents",
        ];
      case ClaimStatus.ACCOUNT_RECONCILIATION:
        return [
          "current_date",
          "comment",
          "finance_info",
          "settlement_date",
          "utr_number",
          "utr_date",
          "bank_amt_rec",
          "set_tds",
          "set_incl_tds",
          "bank_fund_status",
          "documents",
        ];
      case ClaimStatus.PRE_AUTH_APPROVED:
        return [
          "current_date",
          "insurer_claim_no",
          "pre_auth_app_amt",
          "pre_auth_app_comment",
          "documents",
        ];
      case ClaimStatus.INITIAL_QUERY_PENDING:
        return ["current_date", "insurer_claim_no", "query_text", "documents"];
      case ClaimStatus.QUERY_REPLY_DONE:
        return ["current_date", "insurer_claim_no", "comment", "documents"];
      case ClaimStatus.PRE_AUTH_REJECTED:
        return [
          "current_date",
          "insurer_claim_no",
          "remarks_reasons",
          "cancellation_declaration",
          "documents",
        ];
      case ClaimStatus.ENHANCEMENT:
        return [
          "current_date",
          "insurer_claim_no",
          "admissionDate",
          "dischargeDate",
          "enh_comment",
          "enh_amt_req",
          "documents",
        ];
      case ClaimStatus.DISCHARGE_INITIATED:
        return [
          "current_date",
          "insurer_claim_no",
          "comment",
          "admissionDate",
          "dis_date",
          "dis_pkg_exp",
          "dis_room_rent",
          "dis_prof_exp",
          "dis_pharm_exp",
          "dis_inv_exp",
          "dis_diag_other",
          "dis_total_bill",
          "documents",
        ];
      case "REOPEN CASE":
        return [
          "current_date",
          "insurer_claim_no",
          "reopen_reason",
          "documents",
        ];
      case ClaimStatus.ENHANCEMENT_APPROVED:
        return [
          "current_date",
          "insurer_claim_no",
          "enh_app_comment",
          "enh_app_amt",
          "documents",
        ];
      case ClaimStatus.ENHANCEMENT_REJECTED:
        return [
          "current_date",
          "insurer_claim_no",
          "enh_rej_comment",
          "comment",
          "documents",
        ];
      case ClaimStatus.ENHANCEMENT_QUERY_RAISED:
      case ClaimStatus.ENHANCEMENT_QUERY_RESOLVED:
        return ["transaction_date", "query_comment", "documents"];
      case ClaimStatus.DISCHARGE_QUERY_RAISED:
        return [
          "current_date",
          "insurer_claim_no",
          "dis_query_comment",
          "comment",
          "documents",
        ];
      case ClaimStatus.DISCHARGE_REJECTED:
        return [
          "current_date",
          "insurer_claim_no",
          "remarks_reasons",
          "cancellation_declaration",
          "documents",
        ];
      case ClaimStatus.DISCHARGE_APPROVED:
      case ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED:
        return [
          "current_date",
          "insurer_claim_no",
          "comment",
          "finance_info",
          "fin_app_amt",
          "fin_mou_disc",
          "fin_copay",
          "fin_non_med",
          "fin_prop_exp",
          "fin_sub_limit",
          "fin_tariff_ded",
          "fin_other_ded",
          "fin_total_amt",
          "fin_patient_paid",
          "documents",
        ];
      case ClaimStatus.DISCHARGE_QUERY_REPLY:
        return ["current_date", "insurer_claim_no", "comment", "documents"];
      case ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED:
        return [
          "current_date",
          "insurer_claim_no",
          "reconsideration_other_comment",
          "reconsideration_reason",
          "documents",
        ];
      default:
        return ["current_date", "insurer_claim_no", "comment"];
    }
  };

  const getDetailedComment = (event: TimelineEvent) => {
    if (event.stageData) {
      const keys = [
        "pre_auth_app_comment",
        "query_text",
        "pre_auth_rej_comment",
        "enh_comment",
        "enh_rej_comment",
        "dis_query_comment",
        "dis_rej_comment",
        "reopen_reason",
        "deduction_comment",
      ];
      for (const key of keys) {
        if (event.stageData[key]) return event.stageData[key];
      }
    }
    return event.comment || "Process updated.";
  };

  const getEventAmount = (event: TimelineEvent) => {
    if (event.type === "admission" && claim?.estimatedCost) {
      return {
        label: "Estimated Cost",
        amount: claim.estimatedCost,
        color: "text-blue-600",
      };
    }
    if (!event.stageData) return null;

    // Prioritize Total Settled Amt for settlement stages & bank reconciliation completed
    const statusStr = String(event.status).toLowerCase();
    if (
      event.status === ClaimStatus.COMPLETE_SETTLEMENT ||
      event.status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE ||
      event.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE ||
      event.status === ClaimStatus.BANK_RECONCILIATION_COMPLETED ||
      statusStr.includes("bank reconciliation completed")
    ) {
      const settleAmt = event.stageData.set_incl_tds || 
                        claim?.formData?.set_incl_tds || 
                        event.stageData.set_net_settled || 
                        claim?.formData?.set_net_settled || 
                        event.stageData.bank_amt_rec || 
                        claim?.formData?.bank_amt_rec || 0;
      return {
        label: "Total Settled Amt",
        amount: settleAmt,
        color: "text-emerald-700",
      };
    }

    const isFinalStage =
      statusStr.includes("file dispatched") ||
      statusStr.includes("under process") ||
      statusStr.includes("claim approved");

    if (isFinalStage) {
      const finalAmt = event.stageData.fin_app_amt || 
                       claim?.formData?.fin_app_amt || 
                       event.stageData.approved_amt || 
                       claim?.formData?.approved_amt || 
                       event.stageData.pre_auth_app_amt || 
                       claim?.formData?.pre_auth_app_amt || 
                       0;
      return {
        label: "Final Approval Amt",
        amount: finalAmt,
        color: "text-emerald-600",
      };
    }

    if (event.stageData.pre_auth_app_amt)
      return {
        label: "Final Approval Amt",
        amount: event.stageData.pre_auth_app_amt,
        color: "text-emerald-600",
      };
    if (event.stageData.enh_app_amt)
      return {
        label: "Enhancement Approved",
        amount: event.stageData.enh_app_amt,
        color: "text-emerald-600",
      };
    if (event.stageData.enh_amt_req)
      return {
        label: "Enhancement Requested",
        amount: event.stageData.enh_amt_req,
        color: "text-blue-600",
      };
    if (event.stageData.fin_app_amt)
      return {
        label: "Final Approval",
        amount: event.stageData.fin_app_amt,
        color: "text-emerald-600",
      };
    if (event.stageData.dis_total_bill) {
      return {
        label: "Final Bill Amount",
        amount: event.stageData.dis_total_bill,
        color: "text-slate-800",
      };
    }
    if (event.stageData.set_incl_tds)
      return {
        label: "Settled (Incl TDS)",
        amount: event.stageData.set_incl_tds,
        color: "text-emerald-700",
      };
    return null;
  };

  const openUpdateModal = async (status: ClaimStatus | "REOPEN CASE") => {
    setPendingStatus(status);
    setUploadError(null);
    setValidationError(null);
    const fieldIds = getFieldsForStatus(status);
    const initialData: Record<string, any> = {};
    fieldIds.forEach((fid) => {
      // Point 1-5: Do not auto-fill comments from previous stages
      if (
        fid === "comment" ||
        fid.includes("_comment") ||
        fid === "query_text" ||
        fid === "reopen_reason"
      ) {
        initialData[fid] = "";
      } else if (fid === "admissionDate") {
        initialData[fid] = safeFormatYmd(claim?.admissionDate || claim?.formData?.admissionDate || claim?.formData?.adm_date) || safeFormatYmd(new Date());
      } else if (fid === "dischargeDate" || fid === "dis_date") {
        initialData[fid] = safeFormatYmd(claim?.dischargeDate || claim?.formData?.dischargeDate || claim?.formData?.dis_date || claim?.formData?.adm_exp_discharge) || safeFormatYmd(new Date());
      } else if (fid.toLowerCase().includes("date")) {
        initialData[fid] = safeFormatYmd(claim?.formData?.[fid]) || safeFormatYmd(new Date());
      } else {
        initialData[fid] = claim?.formData?.[fid] || "";
      }
    });

    if (status === ClaimStatus.CLAIM_UNDER_QUERY) {
      initialData.query_text = "";
    }

    if (status === ClaimStatus.FILE_DISPATCHED) {
      initialData.file_dispatched_declaration = false;
    }

    const existingDisDate = claim?.formData?.dis_date;

    if (status === ClaimStatus.DISCHARGE_INITIATED) {
      const pkg = safeFloat(
        initialData.dis_pkg_exp || claim?.formData?.dis_pkg_exp,
      );
      const room = safeFloat(
        initialData.dis_room_rent || claim?.formData?.dis_room_rent,
      );
      const prof = safeFloat(
        initialData.dis_prof_exp || claim?.formData?.dis_prof_exp,
      );
      const pharm = safeFloat(
        initialData.dis_pharm_exp || claim?.formData?.dis_pharm_exp,
      );
      const inv = safeFloat(
        initialData.dis_inv_exp || claim?.formData?.dis_inv_exp,
      );
      const diag = safeFloat(
        initialData.dis_diag_other || claim?.formData?.dis_diag_other,
      );
      const total = pkg + room + prof + pharm + inv + diag;
      initialData.dis_total_bill = total;
    }

    if (
      status === ClaimStatus.COMPLETE_SETTLEMENT ||
      status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE ||
      status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE
    ) {
      const approvedAmount = safeFloat(
        claim?.formData?.fin_app_amt ||
          claim?.formData?.pre_auth_app_amt ||
          0,
      );
      const outstandingBalance = approvedAmount > totalSettledAmt ? approvedAmount - totalSettledAmt : 0;

      initialData.set_net_settled = "";
      initialData.set_tds = "";
      initialData.set_incl_tds = 0;
      initialData.set_partial_amt = outstandingBalance;
      initialData.settlement_date = new Date().toISOString().split("T")[0];
      initialData.utr_number = "";
      initialData.partial_remark_type = "Tariff Deductions";
      initialData.target_settlement_status = status;
    }

    if (status === ClaimStatus.ACCOUNT_RECONCILIATION) {
      initialData.bank_amt_rec = "";
      initialData.settlement_date = claim?.formData?.settlement_date || "";
      initialData.utr_number = claim?.formData?.utr_number || "";
      initialData.utr_date =
        claim?.formData?.utr_date || claim?.formData?.settlement_date || "";
    }

    const noFillStatuses = [
      ClaimStatus.PRE_AUTH_APPROVED,
      ClaimStatus.INITIAL_QUERY_PENDING,
      ClaimStatus.PRE_AUTH_REJECTED,
      ClaimStatus.QUERY_REPLY_DONE,
      ClaimStatus.ENHANCEMENT,
      ClaimStatus.ENHANCEMENT_APPROVED,
      ClaimStatus.DISCHARGE_INITIATED,
      ClaimStatus.DISCHARGE_APPROVED,
    ];

    const shouldAutoFillClaimId = !noFillStatuses.includes(
      status as ClaimStatus,
    );

    setLocalFormData({
      ...initialData,
      multipleFiles: [],
      current_date: safeFormatYmd(new Date()),
      dis_date: safeFormatYmd(initialData.dis_date || claim?.formData?.dis_date || claim?.dischargeDate) || safeFormatYmd(new Date()),
      admissionDate: safeFormatYmd(initialData.admissionDate || claim?.admissionDate || claim?.formData?.admissionDate || claim?.formData?.adm_date) || safeFormatYmd(new Date()),
      dischargeDate: safeFormatYmd(initialData.dischargeDate || claim?.dischargeDate || claim?.formData?.dischargeDate || claim?.formData?.dis_date) || "",
      settlement_date: safeFormatYmd(new Date()),
      claim_id:
        initialData.claim_id ||
        (shouldAutoFillClaimId
          ? claim?.id.substring(0, 10).toUpperCase() || ""
          : ""),
      insurer_claim_no:
        initialData.insurer_claim_no || claim?.formData?.insurer_claim_no || "",
      dis_total_bill:
        initialData.dis_total_bill || claim?.formData?.dis_total_bill || 0,
      topup_claim_id: initialData.topup_claim_id || claim?.formData?.topup_claim_id || "",
      topup_app_amt: initialData.topup_app_amt || claim?.formData?.topup_app_amt || "",
      topup_attachment_data: initialData.topup_attachment_data || claim?.formData?.topup_attachment_data || "",
      topup_attachment_name: initialData.topup_attachment_name || claim?.formData?.topup_attachment_name || "",
      topup_attachment_type: initialData.topup_attachment_type || claim?.formData?.topup_attachment_type || "",
    });
    setClaimNumberError(null);
    setShowStatusModal(true);
  };

  const handleAIAnalysis = async () => {
    if (!localFormData.fileData) {
      toast.error("Please upload clinical documents first");
      return;
    }

    setIsAnalyzing(true);
    // Simulate AI extraction logic
    setTimeout(() => {
      setLocalFormData((prev: any) => ({
        ...prev,
        dis_past_history:
          "HTN, Type 2 DM since 10 years on regular medication. No history of major surgery.",
        dis_non_medical_items:
          "Gloves, Mask, Sanitizer, Admission kit, Thermometer, BP Cuff (Disposable)",
        dis_clinical_summary:
          "Patient presented with acute clinical symptoms. Management was done as per standard protocol. Recovery was uneventful.",
        comment:
          "AI Extraction Successful. Past history and non-medical items populated based on discharge summary.",
      }));
      setIsAnalyzing(false);
      toast.success(
        "AI Analysis complete! Demographic and clinical data extracted.",
      );
    }, 2000);
  };

  const handleUpdateStatus = () => {
    if (claimNumberError || validationError) return;

    if (pendingStatus === ClaimStatus.PRE_AUTH_REJECTED || pendingStatus === ClaimStatus.DISCHARGE_REJECTED) {
      if (!localFormData.remarks_reasons) {
        setValidationError("Remarks / Reasons is mandatory for rejection transitions.");
        return;
      }
      if (localFormData.remarks_reasons === "Other" && (!localFormData.remarks_reasons_other || !localFormData.remarks_reasons_other.trim())) {
        setValidationError("Please specify the rejection or cancellation details under Specify Comment.");
        return;
      }
    }

    const targetStatusVal =
      (pendingStatus as any) === "REOPEN CASE"
        ? ClaimStatus.ASSESSMENT_INITIATED
        : (pendingStatus as ClaimStatus);

    // Require Claim No during specific pre-auth/query transitions
    if (
      [
        ClaimStatus.PRE_AUTH_APPROVED,
        ClaimStatus.INITIAL_QUERY_PENDING,
        ClaimStatus.PRE_AUTH_REJECTED,
      ].includes(targetStatusVal)
    ) {
      const claimNoVal = (
        localFormData.insurer_claim_no ||
        claim?.formData?.insurer_claim_no ||
        ""
      ).trim();
      if (!claimNoVal) {
        setValidationError(
          "Claim Number is mandatory for Pre-Auth Approval, Initial Query, or Pre-Auth Rejection transitions.",
        );
        return;
      }
    }

    if (
      pendingStatus === ClaimStatus.DISCHARGE_APPROVED ||
      pendingStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED
    ) {
      const total = safeFloat(localFormData.fin_total_amt);
      const bill = safeFloat(localFormData.dis_total_bill);
      if (Math.abs(total - bill) > 0.01) {
        setValidationError(
          `Total Amt (${total}) does not match with Total Bill Amount (${bill}). Please make correction in the section which you filled or correct the Total Bill Amt.`,
        );
        return;
      }
    }

    if (
      pendingStatus === ClaimStatus.COMPLETE_SETTLEMENT ||
      pendingStatus === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE ||
      pendingStatus === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE
    ) {
      const settledAmt = safeFloat(localFormData.set_incl_tds);
      const approvedAmt = safeFloat(
        claim?.formData?.fin_app_amt || claim?.formData?.pre_auth_app_amt || 0,
      );

      // Point 7: Settled amount should not exceed outstanding balance
      const previouslySettled = totalSettledAmt;
      const outstandingBalance = approvedAmt > previouslySettled ? approvedAmt - previouslySettled : 0;

      if (settledAmt > outstandingBalance && approvedAmt > 0) {
        setValidationError(
          `Current Settled Amt (₹${settledAmt.toLocaleString()}) cannot exceed Outstanding Balance (₹${outstandingBalance.toLocaleString()}).`,
        );
        return;
      }
    }

    if (pendingStatus === ClaimStatus.FILE_DISPATCHED && !isPartnerProcessing) {
      if (!localFormData.file_dispatched_declaration) {
        setValidationError(
          "Please tick the declaration to provide consent for settlement processing.",
        );
        return;
      }
    }

    const hasOptionalDocument = [
      ClaimStatus.CLAIM_APPROVED,
      ClaimStatus.ACCOUNT_RECONCILIATION,
    ].includes(pendingStatus as ClaimStatus);
    const requiresPOD = pendingStatus === ClaimStatus.FILE_DISPATCHED;

    const isMultipleUpload =
      pendingStatus === ClaimStatus.ENHANCEMENT ||
      pendingStatus === ClaimStatus.DISCHARGE_INITIATED;

    if (
      !hasOptionalDocument &&
      getFieldsForStatus(pendingStatus!).includes("documents")
    ) {
      if (isMultipleUpload) {
        if (!localFormData.multipleFiles || localFormData.multipleFiles.length === 0) {
          setValidationError("At least one document upload is mandatory for this transition.");
          return;
        }
      } else {
        if (!localFormData.fileData) {
          setValidationError("Document upload is mandatory for this transition.");
          return;
        }
      }
    }

    if (requiresPOD && !localFormData.documents_pod_data) {
      setValidationError(
        "POD Copy is mandatory for File Dispatched transition.",
      );
      return;
    }

    if (pendingStatus === ClaimStatus.CLAIM_APPROVED) {
      const approved = safeFloat(localFormData.approved_amt);
      const final = safeFloat(localFormData.fin_app_amt);
      if (approved !== final) {
        toast.warning(
          `Amount Mismatch: Approved Amt (${approved}) does not match Final Approval Amt (${final})`,
          {
            description: "Please verify the amounts before proceeding.",
            duration: 5000,
          },
        );
      }
    }

    // Duplicate Claim Number Check
    const activeClaimNo = (
      localFormData.insurer_claim_no ||
      claim?.formData?.insurer_claim_no ||
      ""
    ).trim();
    if (activeClaimNo) {
      const isDuplicate = claims.some(
        (c) =>
          c.id !== claim?.id &&
          c.formData?.insurer_claim_no?.toLowerCase().trim() ===
            activeClaimNo.toLowerCase().trim(),
      );
      if (isDuplicate) {
        setValidationError(
          `Duplicate Claim Number Detected: A claim already exists with Claim No: ${activeClaimNo}. Same claim No must be a unique ID.`,
        );
        return;
      }
    }

    setIsSaving(true);
    setTimeout(() => {
      let targetStatus: ClaimStatus =
        (pendingStatus as any) === "REOPEN CASE"
          ? ClaimStatus.ASSESSMENT_INITIATED
          : (pendingStatus as ClaimStatus);

      // Override target status if a specific settlement flow was selected or force Complete if no partial amount is left
      if (
        localFormData.target_settlement_status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE ||
        localFormData.target_settlement_status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE
      ) {
        targetStatus = localFormData.target_settlement_status as ClaimStatus;
      } else if (
        pendingStatus === ClaimStatus.COMPLETE_SETTLEMENT ||
        localFormData.target_settlement_status === ClaimStatus.COMPLETE_SETTLEMENT
      ) {
        targetStatus = ClaimStatus.COMPLETE_SETTLEMENT;
      } else if (
        pendingStatus === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE ||
        pendingStatus === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE
      ) {
        if (safeFloat(localFormData.set_partial_amt) <= 0) {
          targetStatus = ClaimStatus.COMPLETE_SETTLEMENT;
        } else if (localFormData.target_settlement_status) {
          targetStatus = localFormData.target_settlement_status as ClaimStatus;
        }
      } else if (localFormData.target_settlement_status) {
        targetStatus = localFormData.target_settlement_status as ClaimStatus;
      }

      // Ensure Medical Query Reply moves to Pending Medical Review per new requirement
      if (targetStatus === ClaimStatus.MEDICAL_QUERY_REPLIED) {
        targetStatus = ClaimStatus.PENDING_MEDICAL_REVIEW;
      }

      // Check if Medical Scrutiny is disabled (OFF)
      const isMedScrutinyOff = hospitalProfile?.valueAddedServices?.medicalScrutinyRequired === false;
      if (isMedScrutinyOff) {
        if (targetStatus === ClaimStatus.PENDING_MEDICAL_REVIEW) {
          if (claim?.product === Product.KYP) {
            targetStatus = ClaimStatus.KYP_PENDING;
          } else {
            targetStatus = ClaimStatus.PRE_AUTH_INITIATED;
          }
        } else if (targetStatus === ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY) {
          targetStatus = ClaimStatus.MEDICALLY_FILE_APPROVED;
        }
      }

      if (pendingStatus === ClaimStatus.ACCOUNT_RECONCILIATION) {
        if (localFormData.bank_fund_status === "Partially Fund Received") {
          targetStatus = ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE;
        } else if (localFormData.bank_fund_status === "Fund Not received") {
          targetStatus = ClaimStatus.SETTLEMENT_FAILED;
        } else if (localFormData.bank_fund_status === "Fund Received") {
          targetStatus = ClaimStatus.BANK_RECONCILIATION_COMPLETED;
        }
      }

      const stageSpecificData = { ...localFormData };
      delete stageSpecificData.fileData;

      // Capture previous values for audit log
      const previousValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      const amountFields = [
        "dis_total_bill",
        "fin_app_amt",
        "pre_auth_app_amt",
        "enh_app_amt",
        "set_incl_tds",
        "set_net_settled",
      ];

      amountFields.forEach((field) => {
        if (
          localFormData[field] !== undefined &&
          localFormData[field] !== claim?.formData?.[field]
        ) {
          previousValues[field] = claim?.formData?.[field];
          newValues[field] = localFormData[field];
        }
      });

      if (targetStatus === ClaimStatus.PRE_AUTH_APPROVED) {
        const hospitalData = { ...hospitalProfile };
        const perCaseCharge = hospitalData.perCaseCharge || 150;
        const currentBalance = hospitalData.walletBalance || 0;

        if (currentBalance >= perCaseCharge) {
          const tx: WalletTransaction = {
            id: `tx-bill-${Date.now()}`,
            date: new Date().toISOString(),
            type: "Debit",
            amount: perCaseCharge,
            description: `Processing Fee: ${claim?.patientName} (${claim?.id})`,
            referenceId: claim?.id,
          };
          hospitalData.walletBalance -= perCaseCharge;
          hospitalData.transactions = [
            tx,
            ...(hospitalData.transactions || []),
          ];
          if (onUpdateHospital) onUpdateHospital(hospitalData);
        }
      }

      // Handle multiple documents
      const stageDocuments = [];
      if (localFormData.multipleFiles && localFormData.multipleFiles.length > 0) {
        localFormData.multipleFiles.forEach((file: any) => {
          stageDocuments.push({
            name: file.fileName,
            data: file.fileData,
            mimeType: file.fileType || "application/pdf",
            uploadedAt: new Date().toISOString(),
          });
        });
      } else if (localFormData.fileData && localFormData.fileName) {
        stageDocuments.push({
          name: localFormData.fileName,
          data: localFormData.fileData,
          uploadedAt: new Date().toISOString(),
        });
      }
      if (
        localFormData.documents_pod_data &&
        localFormData.documents_pod_name
      ) {
        stageDocuments.push({
          name: localFormData.documents_pod_name,
          data: localFormData.documents_pod_data,
          uploadedAt: new Date().toISOString(),
        });
      }
      if (
        localFormData.topup_attachment_data &&
        localFormData.topup_attachment_name
      ) {
        stageDocuments.push({
          name: localFormData.topup_attachment_name,
          data: localFormData.topup_attachment_data,
          type: "Top Up Claim Approval",
          uploadedAt: new Date().toISOString(),
        });
      }

      if (
        [
          ClaimStatus.COMPLETE_SETTLEMENT,
          ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
          ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
        ].includes(targetStatus)
      ) {
        const utr = localFormData.utr_number || `UTR_TEMP_${Date.now()}`;
        const amt = Number(localFormData.set_incl_tds || 0);
        const dt = localFormData.utr_date || new Date().toISOString().split("T")[0];

        stageDocuments.push({
          name: `Settlement_Receipt_${utr}.pdf`,
          type: "Settlement Receipt",
          data: "data:application/pdf;base64,JVBERi0xLjQKJ...",
          uploadedAt: new Date().toISOString(),
          utrNumber: utr,
          utrDate: dt,
          settledAmt: amt,
        });
      }

      let commentVal =
        localFormData.comment ||
        localFormData.reopen_reason ||
        `Stage updated to ${targetStatus}.`;

      if (pendingStatus === ClaimStatus.PRE_AUTH_REJECTED || pendingStatus === ClaimStatus.DISCHARGE_REJECTED) {
        const selectedReason = localFormData.remarks_reasons;
        const subReason = (selectedReason === "Other" && localFormData.remarks_reasons_other) 
          ? `Other: ${localFormData.remarks_reasons_other}` 
          : selectedReason;
        commentVal = `Cancellation/Rejection Reason: ${subReason}.`;
        if (localFormData.cancellation_declaration) {
          commentVal += " (Cancellation Declaration Accepted - Auto-email/RPA sent)";
        }
      }

      const isFileDispatchedDeclTicked = !!localFormData.file_dispatched_declaration;
      if (pendingStatus === ClaimStatus.FILE_DISPATCHED) {
        commentVal = localFormData.comment || "Claim file successfully submitted to Insurer/TPA for Settlement";
      }

      const newEvent: TimelineEvent = {
        id: `ev-${Date.now()}`,
        status:
          (pendingStatus as any) === "REOPEN CASE"
            ? ("REOPEN CASE" as any)
            : targetStatus,
        date: new Date().toISOString(),
        comment: commentVal,
        fileName: localFormData.fileName,
        fileData: localFormData.fileData,
        type: "status_change",
        stageData: { ...stageSpecificData, documents: stageDocuments },
        userName:
          hospitalProfile.displayName || hospitalProfile.username || "System",
        userRole: hospitalProfile.role || "Hospital Staff",
      };

      if (localFormData.cancellation_declaration && localFormData.fileName) {
        toast.success(`Cancellation email with '${localFormData.fileName}' successfully dispatched to Insurer/TPA via RPA auto-email integration.`, {
          duration: 6000,
          description: "Portal status synced & email integration logs updated."
        });
      }

      if (pendingStatus === ClaimStatus.FILE_DISPATCHED && !isPartnerProcessing) {
        if (localFormData.rpa_email_failed) {
          toast.error(`Automation Error: RPA Upload and Email Integration FAILED!`, {
            duration: 10000,
            description: `The file dispatch encountered an authentication response failure from the TPA server. Routed directly to the Finance Team for manual initiation.`
          });
        } else if (isFileDispatchedDeclTicked) {
          const templates = emailTemplateService.getTemplates();
          const template = templates.find(t => t.id === 'settlement-initiation') || {
            subject: 'Settlement Document Submittion- Patient Name - {Patient_name} - Claim  No. {claim_no}'
          };
          const pName = claim?.patientName || "";
          const cNo = (localFormData.insurer_claim_no || claim?.formData?.insurer_claim_no || claim?.id || "").trim();
          const renderedSubject = template.subject
            .replace(/{Patient_name}/gi, pName)
            .replace(/{patientName}/gi, pName)
            .replace(/{claim_no}/gi, cNo)
            .replace(/{claimId}/gi, cNo);

          toast.success(`Claim file successfully dispatched via RPA & Auto-Email!`, {
            duration: 8000,
            description: `Sent Settlement Initiation draft with subject: "${renderedSubject}" including both enclosed files (Enclosure & POD target).`
          });
        } else {
          toast.warning(`Status updated to File Dispatched, but automation auto-send was bypassed (declaration unticked).`, {
            duration: 6000,
            description: "File not auto-sent. Manual transmission required."
          });
        }
      }

      const updatedClaim: Claim = {
        ...claim!,
        status: targetStatus,
        admissionDate: localFormData.admissionDate || localFormData.adm_date || claim!.admissionDate,
        dischargeDate: localFormData.dischargeDate || localFormData.dis_date || claim!.dischargeDate,
        formData: { 
          ...claim!.formData, 
          ...localFormData,
          admissionDate: localFormData.admissionDate || localFormData.adm_date || claim!.admissionDate,
          adm_date: localFormData.admissionDate || localFormData.adm_date || claim!.admissionDate,
          dischargeDate: localFormData.dischargeDate || localFormData.dis_date || claim!.dischargeDate,
          dis_date: localFormData.dischargeDate || localFormData.dis_date || claim!.dischargeDate,
          discharge_date: localFormData.dischargeDate || localFormData.dis_date || claim!.dischargeDate,
        },
        updatedAt: new Date().toISOString(),
        history: [newEvent, ...(claim!.history || [])],
        // Capture originating status when moving into medical review for the first time
        originatingStatus:
          targetStatus === ClaimStatus.PENDING_MEDICAL_REVIEW &&
          !claim?.originatingStatus
            ? claim?.status
            : claim?.originatingStatus,
        // Reset medical assignment if it's a medical query reply, enhancement or discharge initiation
        // so it goes back to "New" pools for review in Medical Underwriting
        ...([
          ClaimStatus.MEDICAL_QUERY_REPLIED,
          ClaimStatus.ENHANCEMENT,
          ClaimStatus.DISCHARGE_INITIATED,
          ClaimStatus.PENDING_MEDICAL_REVIEW,
        ].includes(pendingStatus as any)
          ? {
              isAccepted: false,
              isMedicallyApproved: false,
              assignedTo: undefined,
              assignedMedicalUserId: undefined,
              assignedMedicalUserName: undefined,
            }
          : {}),
      };

      // Audit Logging
      const currentUser = hospitalProfile.username || "unknown";

      // 1. Log Stage Update
      auditService.log({
        userId: currentUser,
        action: "CLAIM_STAGE_UPDATE",
        resourceType: "Claim",
        resourceId: claim!.id,
        previousValues: { status: claim?.status },
        newValues: { status: targetStatus },
      });

      // 2. Log Document Upload if present
      if (localFormData.fileData) {
        auditService.log({
          userId: currentUser,
          action: "DOCUMENT_UPLOAD",
          resourceType: "Document",
          resourceId: claim!.id,
          newValues: { fileName: localFormData.fileName },
        });
      }

      // 3. Log Amount Changes if any
      if (Object.keys(newValues).length > 0) {
        auditService.log({
          userId: currentUser,
          action: "AMOUNT_CHANGE",
          resourceType: "Claim",
          resourceId: claim!.id,
          previousValues,
          newValues,
        });
      }

      onUpdate(updatedClaim);
      setIsSaving(false);
      setShowStatusModal(false);
      setPendingStatus(null);
    }, 800);
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    return formatDate(dateStr);
  };

  if (!claim)
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Claim not found
      </div>
    );

  const currentStatusFields = pendingStatus
    ? getFieldsForStatus(pendingStatus)
    : [];
  const isEditingSameStatus = claim.status === pendingStatus;
  const isClaimUnderProcess = pendingStatus === ClaimStatus.CLAIM_UNDER_PROCESS;

  const DocumentsHistoryModal = () => (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <FileSearch size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                Documentation & Audit Trail
              </h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Digital Registry of All Stage Updates
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDocumentsModalOpen(false)}
            className="p-3 text-slate-400 hover:bg-white hover:text-slate-600 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30 space-y-8">
          {claim.history.map((event, idx) => (
            <div
              key={event.id || `${event.status}-${idx}`}
              className="relative pl-8 border-l-2 border-indigo-100 last:border-0 pb-8 last:pb-0"
            >
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm"></div>

              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      {event.status}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100 flex items-center shadow-sm">
                        <Clock size={12} className="mr-1.5 text-indigo-500" />{" "}
                        {formatDateTime(event.date)}
                      </p>
                      {event.userName && (
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100 flex items-center shadow-sm">
                          <User size={12} className="mr-1.5 text-blue-500" />{" "}
                          {event.userName}{" "}
                          {event.userRole ? `(${event.userRole})` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const allEventDocs: Array<{ name: string; data?: string; mimeType?: string; type?: string }> = [];

                    if (event.fileData) {
                      allEventDocs.push({
                        name: event.fileName || "document.pdf",
                        data: event.fileData,
                        mimeType: event.fileType || "application/pdf",
                        type: "Main Document"
                      });
                    }

                    if (event.stageData?.documents) {
                      const docs = event.stageData.documents as any[];
                      docs.forEach((d) => {
                        if (d.name) {
                          const nameLower = d.name.trim().toLowerCase();
                          const isDup = allEventDocs.some(
                            (existing) => existing.name.trim().toLowerCase() === nameLower,
                          );
                          if (!isDup) {
                            allEventDocs.push({
                              name: d.name,
                              data: d.data,
                              mimeType: d.mimeType || d.type,
                              type: d.type,
                            });
                          }
                        }
                      });
                    }

                    if (allEventDocs.length === 0) return null;

                    return (
                      <button
                        onClick={() => {
                          const doc = allEventDocs[0];
                          if (doc.data) {
                            handlePreview(
                              doc.name,
                              doc.data,
                              doc.mimeType || "application/pdf",
                            );
                          } else {
                            toast.info(
                              "This document is a system-generated record. Preview not available in demo.",
                            );
                          }
                        }}
                        className="flex items-center px-4 py-2 bg-[#000080] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-sm active:scale-95 text-left"
                      >
                        <Eye size={14} className="mr-2" /> VIEW
                      </button>
                    );
                  })()}
                </div>

                {(() => {
                  const allEventDocs: Array<{ name: string; data?: string; mimeType?: string; type?: string }> = [];

                  if (event.fileData) {
                    allEventDocs.push({
                      name: event.fileName || "document.pdf",
                      data: event.fileData,
                      mimeType: event.fileType || "application/pdf",
                      type: "Main Document"
                    });
                  }

                  if (event.stageData?.documents) {
                    const docs = event.stageData.documents as any[];
                    docs.forEach((d) => {
                      if (d.name) {
                        const nameLower = d.name.trim().toLowerCase();
                        const isDup = allEventDocs.some(
                          (existing) => existing.name.trim().toLowerCase() === nameLower,
                        );
                        if (!isDup) {
                          allEventDocs.push({
                            name: d.name,
                            data: d.data,
                            mimeType: d.mimeType || d.type,
                            type: d.type,
                          });
                        }
                      }
                    });
                  }

                  if (allEventDocs.length <= 1) return null;

                  return (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {allEventDocs.slice(1).map((doc, docIdx) => (
                        <button
                          key={docIdx}
                          onClick={() => {
                            if (doc.data) {
                              handlePreview(
                                doc.name,
                                doc.data,
                                doc.mimeType || doc.type,
                              );
                            } else {
                              toast.info(
                                "This document is a system-generated record. Preview not available in demo.",
                              );
                            }
                          }}
                          className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all text-left outline-none group w-full"
                        >
                          <div className="flex items-center overflow-hidden mr-2">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 shrink-0 bg-emerald-100 text-emerald-700">
                              <FileText size={18} />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800 truncate">
                                {doc.type || "Other Document"}
                              </p>
                              <p className="text-[9px] font-medium text-emerald-600 truncate">
                                {doc.name}
                              </p>
                            </div>
                          </div>
                          <Eye
                            size={14}
                            className="text-emerald-600 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity ml-auto"
                          />
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {event.comment && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Remarks
                    </p>
                    <p className="text-xs font-bold text-slate-700 italic">
                      "{getDetailedComment(event)}"
                    </p>
                  </div>
                )}

                {event.stageData && Object.keys(event.stageData).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Activity size={12} className="mr-1" /> Stage Data
                      Snapshot
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      {Object.entries(event.stageData).map(([key, val]) => {
                        if (
                          [
                            "claim_id",
                            "current_date",
                            "fileName",
                            "fileData",
                            "fileType",
                            "documents",
                            "documents_pod_data",
                            "documents_pod_name",
                            "documents_pod_type",
                            "topup_attachment_data",
                            "topup_attachment_name",
                            "topup_attachment_type",
                          ].includes(key)
                        )
                          return null;
                        if (!val) return null;
                        const fieldDef = fields.find((f) => f.id === key);
                        const label = fieldDef
                          ? fieldDef.label
                          : (key || "").replace(/_/g, " ");

                        return (
                          <div key={key}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              {label}
                            </p>
                            <p className="text-xs font-bold text-slate-800 break-words">
                              {String(val)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {claim.history.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm font-bold text-slate-400">
                No history records found.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={() => setIsDocumentsModalOpen(false)}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            Close Registry
          </button>
        </div>
      </div>
    </div>
  );

  const MedicalReviewModal = () => (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg">
              <Stethoscope size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Clinical Review
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Medical Data Analysis
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMedicalModalOpen(false)}
            className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100">
                <Activity size={16} className="text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  Diagnosis & Findings
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Primary Diagnosis
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {claim.formData?.m_prov_diag || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Nature of Illness
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {claim.formData?.m_illness || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Clinical Findings
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {claim.formData?.m_clinical_findings || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={() => setIsMedicalModalOpen(false)}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-[1600px] mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => {
                  if (source) {
                    const decodedSource = decodeURIComponent(source);
                    switch (decodedSource) {
                      case "medical":
                        navigate("/medical-underwriting", {
                          state: { selectedClaimId: id },
                        });
                        break;
                      case "crm":
                        navigate("/crm-dashboard");
                        break;
                      case "cashless":
                        navigate("/cashless-dashboard");
                        break;
                      case "directory":
                        navigate("/manage-claims");
                        break;
                      case "mis":
                        navigate("/mis");
                        break;
                      case "recon":
                        navigate("/reconciliation-dashboard");
                        break;
                      case "kyp":
                      case "kyp_dashboard":
                        navigate("/kyp-dashboard");
                        break;
                      case "partner":
                      case "Partner Processing":
                        navigate("/reimbursement/partner-processing");
                        break;
                      case "ICA":
                        navigate("/reimbursement/ica");
                        break;
                      case "Pre & Post":
                        navigate("/reimbursement/pre-post");
                        break;
                      case "Know Your Policy":
                        navigate("/reimbursement/know-your-policy");
                        break;
                      case "Recovery & Recon":
                        navigate("/reimbursement/recovery-recon");
                        break;
                      case "admin":
                        navigate("/settings");
                        break;
                      default:
                        navigate("/cashless-dashboard");
                    }
                  } else if (location.state?.from) {
                    navigate(location.state.from, {
                      state: { selectedClaimId: id },
                    });
                  } else {
                    navigate("/cashless-dashboard");
                  }
                }}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white transition-all text-slate-400 group"
              >
                <ArrowLeft
                  size={24}
                  className="group-hover:-translate-x-1 transition-transform"
                />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <Link
                    to={`/patient-dashboard/${claim.patientName}${source ? `?source=${source}` : ""}`}
                    className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none hover:text-blue-600 transition-colors mr-4 group flex items-center"
                  >
                    {claim.patientName}
                    <ChevronRight
                      size={24}
                      className="ml-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-all"
                    />
                  </Link>

                  <button
                    onClick={() => {
                      setSelectedKyp(currentKyp);
                      setIsPolicyModalOpen(true);
                    }}
                    className="px-4 py-1.5 bg-[#b91c1c] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-800 transition-all active:scale-95 flex items-center mr-2 animate-in fade-in duration-300"
                  >
                    <Sparkles size={12} className="mr-1.5" /> Know Your Policy
                  </button>

                  <div className="flex items-center space-x-2 ml-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border border-emerald-200">
                      LIVE CASE
                    </span>
                    {claim.priority && claim.priority !== "Standard" && (
                      <span
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${claim.priority === "Critical" ? "bg-rose-500 text-white" : "bg-amber-100 text-amber-700"}`}
                      >
                        {claim.priority}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3">
                    <span className="flex items-center">
                      <Hash size={12} className="mr-1" /> Claim No:{" "}
                      <span className="text-slate-800 ml-1 font-black">
                        {claim.formData?.insurer_claim_no || "N/A"}
                      </span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center">
                      <ShieldCheck size={12} className="mr-1" /> Insurer:{" "}
                      <span className="text-slate-800 ml-1 font-black">
                        {claim.insuranceProvider}
                      </span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center">
                      <BriefcaseMedical size={12} className="mr-1" /> TPA:{" "}
                      <span className="text-slate-800 ml-1 font-black">
                        {claim.formData?.tpa_provider || "Direct"}
                      </span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right h-full">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Active Status
                </p>
                <div
                  className={`px-8 py-3.5 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] flex items-center shadow-2xl border border-white/10`}
                >
                  <div
                    className={`w-2 h-2 rounded-full bg-white animate-pulse mr-3`}
                  ></div>
                  {claim.status}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-100">
            {(() => {
              const isQueryReplyScrutiny = [
                ClaimStatus.QUERY_REPLY_DONE,
                ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
                ClaimStatus.DISCHARGE_QUERY_REPLY
              ].includes(claim.status as ClaimStatus) && hospitalProfile?.valueAddedServices?.medicalScrutinyRequired !== false;

              const isMedicalOrAdmin = 
                userRole === "Medical Team" || 
                userRole === "Medical Officer" || 
                userRole === "Doctor" || 
                userRole === "Consultant" || 
                userRole === "Super Admin" || 
                userRole === "Admin" ||
                hospitalProfile?.role?.toUpperCase() === "SUPER ADMIN" ||
                hospitalProfile?.role?.toUpperCase() === "ADMIN";

              if (isQueryReplyScrutiny && !isMedicalOrAdmin) {
                return (
                  <div className="w-full p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                      <BriefcaseMedical size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                        <span>🩺</span> Under Medical Scrutiny (Clinical Review Active)
                      </h4>
                      <p className="text-xs text-blue-700/80 font-bold mt-1.5 max-w-3xl leading-relaxed">
                        This claim is currently undergoing mandatory medical scrutiny. Manual status overrides by general hospital desks are locked. Once approved by the clinical team, the claim will be dispatched to the Insurance Company via RPA bot or Email Integration.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {nextStageButtons.map((status, idx) => (
              <button
                key={`${status}-${idx}`}
                onClick={() => openUpdateModal(status)}
                className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center group active:scale-95 border-2 shadow-sm ${
                  status === claim.status
                    ? "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-600 hover:text-white"
                    : status === "REOPEN CASE"
                      ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white"
                      : "bg-[#000080] text-white border-[#000080]/10 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                }`}
              >
                {status === "REOPEN CASE" ? (
                  <RotateCcw size={14} className="mr-2" />
                ) : status === claim.status ? (
                  <PenTool size={14} className="mr-2" />
                ) : (
                  <Zap
                    size={14}
                    className="mr-2 text-blue-200 group-hover:text-white"
                  />
                )}
                {status === claim.status
                  ? `Edit: ${status}`
                  : `Update: ${status}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[650px] flex flex-col">
              <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center space-x-2">
                <TabButton
                  active={activeTab === "patient"}
                  onClick={() => setActiveTab("patient")}
                  icon={User}
                  label="Patient Identity"
                  color="blue"
                />
                <TabButton
                  active={activeTab === "claim"}
                  onClick={() => setActiveTab("claim")}
                  icon={ClipboardList}
                  label="Clinical & Financial"
                  color="indigo"
                />
                <TabButton
                  active={activeTab === "insurance"}
                  onClick={() => setActiveTab("insurance")}
                  icon={ShieldCheck}
                  label="Payer Governance"
                  color="emerald"
                />
              </div>
              <div className="p-12 flex-1 animate-in fade-in duration-500">
                {activeTab === "patient" && (
                  <div className="space-y-12">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={User}
                        title="Demographic Registry"
                        subtitle="Official patient identification data"
                        color="blue"
                      />
                      {canAccessStageAction &&
                        canAccessStageAction(currentStageKey, "edit") && (
                          <button
                            onClick={() => {
                              setEditedProfileData({ ...claim.formData });
                              setIsEditingProfile(true);
                            }}
                            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center"
                          >
                            <Edit2 size={16} className="mr-2" /> Modify Record
                          </button>
                        )}
                    </div>
                    {isEditingProfile ? (
                      <ProfileEditor
                        data={editedProfileData}
                        setData={setEditedProfileData}
                        fields={fields}
                        onCancel={() => setIsEditingProfile(false)}
                        onSave={() => {
                          setIsSaving(true);
                          setTimeout(() => {
                            onUpdate({
                              ...claim,
                              formData: {
                                ...claim.formData,
                                ...editedProfileData,
                              },
                              updatedAt: new Date().toISOString(),
                            });
                            setIsSaving(false);
                            setIsEditingProfile(false);
                          }, 800);
                        }}
                        isSaving={isSaving}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                        <DetailGroup title="Legal Identification">
                          <DataRow
                            label="Claim No"
                            value={
                              claim.formData?.insurer_claim_no || "Unassigned"
                            }
                            isBold
                          />
                          <DataRow
                            label="Patient Full Name"
                            value={claim.patientName}
                          />
                          <DataRow
                            label="Gender / Sex"
                            value={claim.formData?.p_gender}
                          />
                          <DataRow
                            label="Date of Birth"
                            value={claim.formData?.p_dob}
                          />
                          <DataRow
                            label="Age Reference"
                            value={`${claim.formData?.p_age_y} Years`}
                          />
                        </DetailGroup>
                        <DetailGroup title="Connectivity Hub">
                          <DataRow
                            label="Direct Mobile"
                            value={claim.formData?.p_contact}
                          />
                          <DataRow
                            label="Emergency Contact"
                            value={
                              claim.formData?.p_relative_contact ||
                              claim.formData?.p_alt_contact
                            }
                          />
                          <DataRow
                            label="UHID / IPD No"
                            value={claim.formData?.p_uhid}
                            isBold
                          />
                          <DataRow
                            label="Permanent Address"
                            value={
                              claim.formData?.p_address ||
                              "As per Policy Registry"
                            }
                          />
                        </DetailGroup>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "claim" && (
                  <div className="space-y-12">
                    <SectionHeader
                      icon={BriefcaseMedical}
                      title="Clinical & Fiscal Ledger"
                      subtitle="Medical justification and estimated cost structure"
                      color="indigo"
                    />

                    {/* Synchronized Case Data Section */}
                    <div className="bg-indigo-50/30 border border-indigo-100 rounded-[2rem] p-8 space-y-6">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
                        <div className="flex items-center space-x-3">
                          <Sparkles className="text-indigo-600" size={20} />
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            Synchronized Case Data
                          </h3>
                        </div>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-indigo-100">
                          Single Source of Truth
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Pre-Auth Approved Amount
                          </p>
                          <p className="text-xl font-black text-indigo-700">
                            ₹
                            {Number(
                              claim.formData?.pre_auth_app_amt || 0,
                            ).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[9px] font-medium text-slate-400 italic">
                            Reflects across all stages
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Latest Remarks
                          </p>
                          <p className="text-xs font-bold text-slate-700 line-clamp-2 italic">
                            "{claim.history[0]?.comment || "No remarks yet"}"
                          </p>
                          <button
                            onClick={() => setIsDocumentsModalOpen(true)}
                            className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                          >
                            View History
                          </button>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Latest Document
                          </p>
                          {claim.history.find((h) => h.fileData) ? (
                            <div className="flex items-center space-x-2">
                              <FileText size={14} className="text-indigo-600" />
                              <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                                {
                                  claim.history.find((h) => h.fileData)
                                    ?.fileName
                                }
                              </span>
                              <button
                                onClick={() => {
                                  const event = claim.history.find(
                                    (h) => h.fileData,
                                  );
                                  if (event)
                                    handlePreview(
                                      event.fileName!,
                                      event.fileData!,
                                      event.stageData?.mimeType ||
                                        "application/pdf",
                                    );
                                }}
                                className="p-1 hover:bg-indigo-100 rounded transition-colors"
                              >
                                <Eye size={12} className="text-indigo-600" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-400">
                              No documents uploaded
                            </p>
                          )}
                          <button
                            onClick={() => setIsDocumentsModalOpen(true)}
                            className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                          >
                            View All Documents
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                      <DetailGroup title="Clinical Context">
                        <DataRow
                          label="Primary Diagnosis"
                          value={claim.diagnosis}
                        />
                        <DataRow
                          label="ICD-10 Disease Code"
                          value={claim.formData?.m_icd_code}
                        />
                        <DataRow
                          label="Attending Medical Officer"
                          value={claim.formData?.dr_name}
                        />
                        <DataRow
                          label="Council Registration"
                          value={claim.formData?.dec_reg_no}
                        />
                      </DetailGroup>
                      <DetailGroup title="Admission Protocol">
                        <DataRow
                          label="Admission Date"
                          value={claim.admissionDate}
                        />
                        <DataRow
                          label="Estimated Stay"
                          value={`${claim.formData?.adm_stay_days} Operating Days`}
                        />
                        <DataRow
                          label="Aggregated Estimate"
                          value={`₹${claim.estimatedCost.toLocaleString("en-IN")}`}
                          isBold
                        />
                        <DataRow
                          label="Operational Route"
                          value={
                            claim.formData?.in_house_processing === "Yes"
                              ? "Institutional Processing"
                              : "TPA Mediated"
                          }
                        />
                      </DetailGroup>
                    </div>
                  </div>
                )}
                {activeTab === "insurance" && (
                  <div className="space-y-12">
                    <div className="flex items-center justify-between">
                      <SectionHeader
                        icon={ShieldCheck}
                        title="Payer Architecture"
                        subtitle="Carrier details and TPA linkage"
                        color="emerald"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                      <DetailGroup title="Primary Carrier">
                        <DataRow
                          label="Insurer"
                          value={claim.insuranceProvider}
                        />
                        <DataRow
                          label="Policy Document ID"
                          value={claim.policyNumber}
                          isBold
                        />
                        <DataRow
                          label="Payer Member Card"
                          value={claim.formData?.p_card_id}
                        />
                      </DetailGroup>
                      <DetailGroup title="Administrative Hook">
                        <DataRow
                          label="TPA"
                          value={
                            claim.formData?.tpa_provider ||
                            "Direct Carrier Logic"
                          }
                        />
                        <DataRow
                          label="Facility Rohini ID"
                          value={claim.formData?.hosp_rohini_id}
                        />
                        <DataRow
                          label="Dual Insurance"
                          value={
                            claim.formData?.p_other_insurance ||
                            "No Concurrent Policy"
                          }
                        />
                      </DetailGroup>
                    </div>

                    {currentKyp && (
                      <div className="bg-indigo-50/30 border border-indigo-100 p-6 rounded-3xl mt-8 animate-in fade-in duration-350">
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest mb-4 flex items-center">
                          <ShieldCheck
                            size={16}
                            className="mr-2 text-indigo-600"
                          />
                          Policy Audit (KYP) Verification Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Section 1: Basic Details
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              Policy No:{" "}
                              <span className="font-extrabold text-indigo-600">
                                {currentKyp.policyNumber}
                              </span>
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              Verified Name:{" "}
                              <span className="font-extrabold text-slate-800">
                                {currentKyp.insuredName}
                              </span>
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              Carrier / TPA:{" "}
                              <span className="font-medium text-slate-500">
                                {currentKyp.companyName} / {currentKyp.tpaName}
                              </span>
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              SI & Limits
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              Sum Insured:{" "}
                              <span className="font-extrabold text-slate-800">
                                ₹
                                {currentKyp.sumInsured?.toLocaleString("en-IN")}
                              </span>
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              Balance SI:{" "}
                              <span className="font-extrabold text-slate-800">
                                ₹{currentKyp.balanceSI?.toLocaleString("en-IN")}
                              </span>
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              Room rent / ICU Limit:{" "}
                              <span className="font-medium text-slate-500">
                                {currentKyp.roomRentLimit || "N/A"} /{" "}
                                {currentKyp.icuLimit || "N/A"}
                              </span>
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Waiting Period & Copay
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              Copay Percentage:{" "}
                              <span className="font-extrabold text-slate-800">
                                {currentKyp.copayPercentage}%
                              </span>
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              PED Waiting Period:{" "}
                              <span className="font-medium text-slate-500">
                                {currentKyp.pedWaitingPeriod || "N/A"}
                              </span>
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              Specific Treatment:{" "}
                              <span className="font-medium text-slate-500">
                                {currentKyp.specificWaitingPeriod || "N/A"}
                              </span>
                            </p>
                          </div>
                        </div>
                        {currentKyp.remarks && (
                          <div className="mt-4 pt-3 border-t border-indigo-100/50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Verifier Remarks
                            </p>
                            <p className="text-xs font-bold italic text-indigo-900 font-serif">
                              "{currentKyp.remarks}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Final Approval Amt
                </p>
                <p className="text-sm font-black text-slate-800">
                  ₹
                  {Number(claim.formData?.fin_app_amt || 0).toLocaleString(
                    "en-IN",
                  )}
                </p>
              </div>
              {claim.formData?.topup_claim_id && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Top Up Claim ID
                  </p>
                  <p className="text-xs font-black text-slate-700 font-mono uppercase">
                    {claim.formData?.topup_claim_id}
                  </p>
                </div>
              )}
              {claim.formData?.topup_app_amt !== undefined && claim.formData?.topup_app_amt !== "" && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Top Up Approved Amt
                  </p>
                  <p className="text-sm font-black text-indigo-600">
                    ₹{Number(claim.formData?.topup_app_amt).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Settled Amt
                </p>
                <p className="text-sm font-black text-emerald-600">
                  ₹{totalSettledAmt.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              {isViewAllowed ||
              (canAccessStageAction &&
                canAccessStageAction(currentStageKey, "upload_download")) ? (
                <>
                  <button
                    onClick={() => setIsDocumentsModalOpen(true)}
                    className="px-4 py-2 bg-[#000080] text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-sm active:scale-95"
                  >
                    View Documents
                  </button>
                  <button
                    onClick={() => {
                      if (rateList) {
                        handlePreview(
                          rateList.rateListName || "Rate List",
                          rateList.rateListData!,
                          "application/pdf",
                        );
                      } else {
                        toast.error(
                          "Rate list not uploaded for " +
                            (claim.formData?.tpa_provider &&
                            claim.formData?.tpa_provider !==
                              "Direct Carrier Logic"
                              ? claim.formData?.tpa_provider
                              : claim.insuranceProvider),
                        );
                      }
                    }}
                    className="px-4 py-2 bg-[#800000] text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-red-900 transition-all shadow-sm active:scale-95"
                  >
                    Rate List / SOC
                  </button>
                </>
              ) : (
                <div className="w-full p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Document Access Restricted
                  </p>
                </div>
              )}
            </div>

            {isViewAllowed ||
            (canAccessStageAction &&
              canAccessStageAction(currentStageKey, "timeline")) ? (
              <div
                className={`bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full`}
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center tracking-tight">
                    Timeline{" "}
                    <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-black rounded uppercase">
                      {claim.history.length}
                    </span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDocumentsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#000080] hover:bg-slate-100 rounded-lg transition-all"
                      title="Expand to Registry"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-8 overflow-y-auto max-h-[700px] custom-scrollbar">
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-12 pb-6">
                    {claim.history
                      .filter(
                        (event) =>
                          !(
                            claim.product === Product.RECOVERY_RECONCILIATION &&
                            (event.status === ClaimStatus.SETTLED ||
                              event.status === ClaimStatus.COMPLETE_SETTLEMENT)
                          ),
                      )
                      .map((event, idx) => {
                        const stageAmount = getEventAmount(event);
                        return (
                          <div key={event.id || `${event.status}-${idx}`} className="relative">
                            {/* Audit Badge */}
                            {idx === 0 && (
                              <div className="absolute -right-2 -top-2 px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-lg shadow-lg z-20 animate-bounce">
                                LATEST ACTION
                              </div>
                            )}
                            <div
                              className={`absolute -left-[32px] top-1 w-4 h-4 rounded-full border-4 border-white z-10 shadow-sm ${idx === 0 ? "bg-[#000080] ring-4 ring-blue-50" : "bg-slate-300"}`}
                            ></div>

                            <div className="space-y-1.5">
                              <h4 className="text-sm font-black text-slate-800 leading-tight tracking-tight uppercase">
                                {event.status}
                              </h4>
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                  {(() => {
                                    const commentStr = String(event.comment || "No remarks provided");
                                    const isMedicalUnderwritingEvent = 
                                      event.type === 'medical_decision' ||
                                      event.status === ClaimStatus.MEDICAL_APPROVED || 
                                      event.status === ClaimStatus.MEDICAL_QUERY_RAISED ||
                                      event.status === ClaimStatus.MEDICAL_REJECTED ||
                                      event.status === ClaimStatus.PENDING_MEDICAL_REVIEW ||
                                      String(event.status).toLowerCase().includes('medical') ||
                                      commentStr.toLowerCase().includes('medical underwriting') || 
                                      commentStr.toLowerCase().includes('medical scrutiny') ||
                                      commentStr.toLowerCase().includes('medical team') ||
                                      commentStr.toLowerCase().includes('clinically approved') ||
                                      commentStr.toLowerCase().includes('clinical review') ||
                                      commentStr.toLowerCase().includes('remarks:');

                                    return (
                                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                        COMMENT:{" "}
                                        <span className={`normal-case italic inline-block my-0.5 ${isMedicalUnderwritingEvent ? 'font-black text-slate-900' : 'font-normal text-slate-500'}`}>
                                          "{commentStr}"
                                        </span>
                                      </p>
                                    );
                                  })()}
                                </div>
                                {stageAmount && (
                                  <p className="text-[10px] font-black text-slate-600 mt-1 flex items-center">
                                    {stageAmount.label}:{" "}
                                    <span
                                      className={`ml-2 text-sm ${stageAmount.color}`}
                                    >
                                      ₹
                                      {Number(
                                        stageAmount.amount,
                                      ).toLocaleString("en-IN")}
                                    </span>
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center space-x-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      {formatDateTime(event.date)}
                                    </p>
                                    {idx < claim.history.length - 1 && (
                                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100 rounded flex items-center gap-1 uppercase tracking-widest">
                                        <Clock size={10} /> TAT:{" "}
                                        {getDuration(
                                          claim.history[idx + 1].date,
                                          event.date,
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  {event.userName && (
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                                      Action By: {event.userName}{" "}
                                      {event.userRole
                                        ? `(${event.userRole})`
                                        : ""}
                                    </p>
                                  )}
                                </div>
                                {(() => {
                                   const allEventDocs: Array<{ name: string; data?: string; mimeType?: string }> = [];

                                   if (event.fileData) {
                                     allEventDocs.push({
                                       name: event.fileName || "document.pdf",
                                       data: event.fileData,
                                       mimeType: event.stageData?.mimeType || "application/pdf"
                                     });
                                   }

                                   if (event.stageData?.documents) {
                                     const docs = event.stageData.documents as any[];
                                     docs.forEach((d) => {
                                       if (d.name) {
                                         const nameLower = d.name.trim().toLowerCase();
                                         const isDup = allEventDocs.some(
                                           (existing) => existing.name.trim().toLowerCase() === nameLower,
                                         );
                                         if (!isDup) {
                                           allEventDocs.push({
                                             name: d.name,
                                             data: d.data,
                                             mimeType: d.mimeType || "application/pdf",
                                           });
                                         }
                                       }
                                     });
                                   }

                                   if (allEventDocs.length === 0) return null;

                                   const canView = isViewAllowed || (canAccessStageAction && canAccessStageAction(currentStageKey, "upload_download"));
                                   if (!canView) return null;

                                   return (
                                     <div className="flex flex-col gap-1.5 mt-2 items-end">
                                       {allEventDocs.map((doc, docIdx) => (
                                         <button
                                           key={docIdx}
                                           onClick={() => {
                                             if (doc.data) {
                                               handlePreview(
                                                 doc.name,
                                                 doc.data,
                                                 doc.mimeType || "application/pdf",
                                               );
                                             } else {
                                               toast.info(
                                                 "Preview not available.",
                                               );
                                             }
                                           }}
                                           className="px-4 py-1.5 bg-[#000080] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all flex items-center shadow-md shrink-0 cursor-pointer"
                                           title={`View ${doc.name}`}
                                         >
                                           <Eye size={12} className="mr-1.5 shrink-0" />
                                           <span>{allEventDocs.length > 1 ? `VIEW (${docIdx + 1})` : "VIEW"}</span>
                                         </button>
                                       ))}
                                     </div>
                                   );
                                 })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm text-center">
                <Clock className="mx-auto text-slate-200 mb-4" size={48} />
                <h3 className="text-lg font-bold text-slate-400 uppercase tracking-tight">
                  Timeline Restricted
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  You do not have permission to view the case timeline
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDocumentsModalOpen && <DocumentsHistoryModal />}

      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[300] flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl flex justify-between items-center mb-6">
            <h3 className="text-white text-lg font-bold truncate max-w-md">
              {previewFile.name}
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  handleDownload(
                    previewFile.name,
                    previewFile.data,
                    previewFile.type,
                  )
                }
                className="px-6 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center"
              >
                <Download size={16} className="mr-2" /> Download
              </button>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="w-full max-w-6xl flex-1 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
            {previewFile.type?.startsWith("image/") ? (
              <img
                src={
                  previewFile.data.startsWith("data:") ||
                  previewFile.data.startsWith("http")
                    ? previewFile.data
                    : `data:${previewFile.type};base64,${previewFile.data}`
                }
                className="w-full h-full object-contain"
                alt="Preview"
              />
            ) : (
              <iframe
                src={
                  previewFile.data.startsWith("data:") ||
                  previewFile.data.startsWith("http")
                    ? previewFile.data
                    : `data:${previewFile.type || "application/pdf"};base64,${previewFile.data}`
                }
                className="w-full h-full"
                title="Preview"
              ></iframe>
            )}
          </div>
        </div>
      )}

      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#f1f5f9] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-4 bg-white flex items-center justify-between border-b border-slate-200">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                POLICY ANALYSIS SUMMARY
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    const element = document.getElementById(
                      "kyp-preview-content",
                    );
                    if (!element) return;

                    setIsGeneratingPdf(true);
                    try {
                      const canvas = await safeHtml2Canvas(element, {
                        scale: 2,
                        useCORS: true,
                      });
                      const imgData = canvas.toDataURL("image/png");
                      const pdf = new jsPDF("p", "mm", "a4");
                      const imgProps = pdf.getImageProperties(imgData);
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight =
                        (imgProps.height * pdfWidth) / imgProps.width;

                      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                      pdf.save(
                        `${selectedKyp.patientName || selectedKyp.insuredName}.pdf`,
                      );
                    } catch (error) {
                      console.error("PDF generation failed:", error);
                    } finally {
                      setIsGeneratingPdf(false);
                    }
                  }}
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
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <XCircle size={28} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-10">
              <div
                id="kyp-preview-content"
                className="bg-white rounded-xl shadow-xl border border-slate-200 p-12 max-w-4xl mx-auto min-h-[1000px] relative"
              >
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h1 className="text-4xl font-black text-[#000080] uppercase tracking-tight mb-1">
                      KNOW YOUR POLICY
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                      Automated Policy Extraction Report
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                      Case ID: {selectedKyp?.claimId || claim.id}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Generated: {formatDate(new Date().toISOString())}
                    </p>
                  </div>
                </div>

                <div className="h-1 bg-[#000080] mb-12"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      1. Policy Basic Details
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Policy No"
                        value={
                          selectedKyp?.policyNumber ||
                          claim.policyNumber ||
                          claim.formData?.p_policy_no ||
                          "N/A"
                        }
                      />
                      <KypRow
                        label="Policy Type"
                        value={
                          selectedKyp?.policyType ||
                          claim.formData?.p_policy_type ||
                          "N/A"
                        }
                      />
                      <KypRow
                        label="Company"
                        value={
                          selectedKyp?.companyName ||
                          claim.insuranceProvider ||
                          "N/A"
                        }
                      />
                      <KypRow
                        label="TPA"
                        value={
                          selectedKyp?.tpaName ||
                          claim.formData?.tpa_provider ||
                          "Direct"
                        }
                      />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      2. Insured Details
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Insured Name"
                        value={
                          selectedKyp?.insuredName || claim.patientName || "N/A"
                        }
                      />
                      <KypRow
                        label="Patient Name"
                        value={
                          selectedKyp?.patientName ||
                          selectedKyp?.insuredName ||
                          claim.patientName ||
                          "N/A"
                        }
                      />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      3. Coverage Details
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Sum Insured"
                        value={
                          selectedKyp?.sumInsured
                            ? `₹ ${selectedKyp.sumInsured.toLocaleString()}`
                            : claim.formData?.p_sum_insured
                              ? `₹ ${claim.formData.p_sum_insured}`
                              : "N/A"
                        }
                      />
                      <KypRow
                        label="Balance SI"
                        value={
                          selectedKyp?.balanceSI
                            ? `₹ ${selectedKyp.balanceSI.toLocaleString()}`
                            : "N/A"
                        }
                      />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      4. Eligibility & Limits
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Room Rent Limit"
                        value={
                          selectedKyp?.roomRentLimit ||
                          claim.formData?.p_room_eligibility ||
                          "N/A"
                        }
                      />
                      <KypRow
                        label="ICU Limit"
                        value={
                          selectedKyp?.icuLimit ||
                          claim.formData?.p_icu_eligibility ||
                          "N/A"
                        }
                      />
                      <KypRow
                        label="Co-Pay %"
                        value={
                          selectedKyp?.copayPercentage !== undefined
                            ? selectedKyp.copayPercentage + "%"
                            : claim.formData?.p_copay
                              ? claim.formData.p_copay + "%"
                              : "N/A"
                        }
                      />
                    </div>
                  </section>

                  {/* Section 5: Waiting Period */}
                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      5. Waiting Period
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Initial (30 Days)"
                        value={selectedKyp?.initialWaitingPeriod || "N/A"}
                      />
                      <KypRow
                        label="Specific (2 Years)"
                        value={selectedKyp?.specificWaitingPeriod || "N/A"}
                      />
                      <KypRow
                        label="PED (3-4 Years)"
                        value={selectedKyp?.pedWaitingPeriod || "N/A"}
                      />
                    </div>
                  </section>

                  {/* Section 6: Sub-Limits */}
                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      6. Sub-Limits
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Itemized Limits"
                        value={selectedKyp?.subLimits || "N/A"}
                      />
                    </div>
                  </section>

                  {/* Section 7: Pre & Post Hospitalization */}
                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      7. Pre & Post Hosp.
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Pre-Hosp Days"
                        value={
                          selectedKyp?.preHospitalizationDays ||
                          selectedKyp?.preHospDays ||
                          "N/A"
                        }
                      />
                      <KypRow
                        label="Post-Hosp Days"
                        value={
                          selectedKyp?.postHospitalizationDays ||
                          selectedKyp?.postHospDays ||
                          "N/A"
                        }
                      />
                    </div>
                  </section>

                  {/* Section 8: Diagnosis / Case Info */}
                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      8. Case / Clinical Info
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Diagnosis"
                        value={
                          selectedKyp?.diagnosisName ||
                          selectedKyp?.diagnosis ||
                          claim.diagnosis ||
                          "N/A"
                        }
                      />
                    </div>
                  </section>

                  {/* Section 9: Remarks */}
                  <section>
                    <h3 className="text-xs font-black text-[#000080] uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
                      9. Intimation & Remarks
                    </h3>
                    <div className="space-y-3">
                      <KypRow
                        label="Intimation No"
                        value={selectedKyp?.intimationNumber || "N/A"}
                      />
                      <KypRow
                        label="Remarks"
                        value={selectedKyp?.remarks || "N/A"}
                      />
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl border border-white/20 animate-in zoom-in duration-300 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-8 lg:p-10 bg-white border-b border-slate-100 flex justify-between items-center relative shrink-0">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-[#000080] text-white rounded-full flex items-center justify-center shadow-xl ring-8 ring-blue-50/50">
                  <ChevronRight size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">
                    Stage Navigator
                  </h3>
                  <div className="flex items-center space-x-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Active State:
                    </p>
                    <p className="text-[10px] font-black text-[#000080] uppercase tracking-[0.2em]">
                      {claim.status}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setPendingStatus(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 transition-all active:scale-90"
              >
                <X size={36} />
              </button>
            </div>

            {validationError && (
              <div className="px-8 lg:px-10 pt-6 shrink-0">
                <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-[1.5rem] flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 mt-0.5">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5">
                      Action Blocked
                    </p>
                    <p className="text-sm font-bold text-rose-700 leading-relaxed">
                      {validationError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-8 lg:p-10 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                <div className="p-6 bg-[#f0f7ff] rounded-[1.5rem] border border-[#000080]/10 flex items-center space-x-5">
                  <div className="w-10 h-10 bg-[#000080] text-white rounded-xl flex items-center justify-center shadow-lg">
                    <PenTool size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[9px] font-black text-[#000080]/60 uppercase tracking-[0.1em] mb-0.5">
                          Selected Transition
                        </p>
                        <h4 className="text-lg font-black text-[#000080] uppercase tracking-tight">
                          {pendingStatus}
                        </h4>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-8 pb-32">
                  {/* 1. Process / Product */}
                  {claim.claimType === "Reimbursement" &&
                    pendingStatus !== ClaimStatus.DISCHARGE_INITIATED && (
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#000080] text-white rounded-lg flex items-center justify-center shadow-md">
                            <ShieldCheck size={16} />
                          </div>
                          <p className="text-[10px] font-black text-[#000080] uppercase tracking-widest">
                            Process / Product
                          </p>
                        </div>
                        <p className="text-xs font-black text-[#000080] uppercase tracking-tight">
                          {claim.product || "Partner Processing"}
                        </p>
                      </div>
                    )}

                  {/* 3. Claim ID / Number */}
                  {(getFieldsForStatus(pendingStatus!).includes("claim_id") ||
                    getFieldsForStatus(pendingStatus!).includes(
                      "insurer_claim_no",
                    )) &&
                    pendingStatus !== ClaimStatus.DISCHARGE_INITIATED && (
                      <div className="space-y-4">
                        <InputGroup label="Claim No" required>
                          <input
                            type="text"
                            value={
                              localFormData.claim_id ||
                              localFormData.insurer_claim_no ||
                              claim.formData?.insurer_claim_no ||
                              ""
                            }
                            onChange={(e) =>
                              handleLocalInputChange(
                                localFormData.claim_id !== undefined
                                  ? "claim_id"
                                  : "insurer_claim_no",
                                e.target.value,
                              )
                            }
                            readOnly={!!claim.formData?.insurer_claim_no}
                            className={`w-full px-5 py-3.5 border rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-mono uppercase ${!!claim.formData?.insurer_claim_no ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" : "bg-slate-50 text-slate-700 " + (claimNumberError ? "border-rose-300" : "border-slate-200")}`}
                          />
                        </InputGroup>
                        {claimNumberError && (
                          <p className="text-[10px] font-black text-rose-500 flex items-center animate-in fade-in slide-in-from-top-1 ml-1">
                            <AlertCircle size={12} className="mr-1" />{" "}
                            {claimNumberError}
                          </p>
                        )}
                        {(pendingStatus === ClaimStatus.DISCHARGE_APPROVED ||
                          pendingStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED) && (
                          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <InputGroup label="Top Up Claim ID (Optional)">
                              <input
                                type="text"
                                value={localFormData.topup_claim_id || ""}
                                onChange={(e) =>
                                  handleLocalInputChange("topup_claim_id", e.target.value)
                                }
                                placeholder="Enter Top Up Claim ID (Optional)"
                                className="w-full h-10 px-4 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 focus:ring-4 focus:ring-blue-50 transition-all font-mono uppercase"
                              />
                            </InputGroup>
                          </div>
                        )}
                      </div>
                    )}

                  {getFieldsForStatus(pendingStatus!).map((fieldId, fIdx) => {
                    // Skip handled or special fields
                    if (
                      [
                        "current_date",
                        "claim_id",
                        "insurer_claim_no",
                        "comment",
                      ].includes(fieldId)
                    )
                      return null;

                    if (
                      (fieldId === "dis_total_bill" ||
                        fieldId === "fin_app_amt") &&
                      (pendingStatus === ClaimStatus.COMPLETE_SETTLEMENT ||
                        pendingStatus?.includes("Partially Settled"))
                    ) {
                      return null;
                    }

                    if (
                      fieldId === "ai_analysis_trigger" ||
                      fieldId === "documents" ||
                      fieldId === "documents_pod"
                    ) {
                      return null;
                    }

                    if (
                      fieldId === "fin_patient_paid" &&
                      (pendingStatus === ClaimStatus.DISCHARGE_APPROVED ||
                        pendingStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED)
                    ) {
                      return null;
                    }

                    if (
                      fieldId === "fin_total_amt" &&
                      (pendingStatus === ClaimStatus.DISCHARGE_APPROVED ||
                        pendingStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED)
                    ) {
                      const totalAmtValue = safeFloat(localFormData.fin_total_amt);
                      const totalBillValue = safeFloat(localFormData.dis_total_bill);
                      const isMatched = Math.abs(totalAmtValue - totalBillValue) <= 0.01;
                      const patientPaidValue = safeFloat(localFormData.fin_patient_paid);

                      return (
                        <div key={fieldId} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in duration-300">
                          {/* FIN TOTAL AMT */}
                          <div>
                            <InputGroup label="FIN TOTAL AMT" required>
                              <div
                                className={`flex items-center justify-between w-full h-12 px-4 border-2 rounded-2xl font-black text-xs transition-all duration-300 font-mono shadow-sm ${
                                  isMatched
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-emerald-50/50"
                                    : "bg-rose-50 border-rose-300 text-rose-700 shadow-rose-50/50 animate-pulse"
                                }`}
                              >
                                <span>₹{totalAmtValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full ${
                                  isMatched ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"
                                }`}>
                                  {isMatched ? "MATCHED" : "MISMATCH"}
                                </span>
                              </div>
                            </InputGroup>
                            <p className="text-[10px] text-slate-500 mt-1.5 ml-1 leading-normal">
                              Calculated total of all financial entries. Must match Total Bill (₹{totalBillValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}).
                            </p>
                          </div>

                          {/* FIN PATIENT PAID */}
                          <div>
                            <InputGroup label="FIN PATIENT PAID" required>
                              <div
                                className="flex items-center justify-between w-full h-12 px-4 border-2 border-amber-300 bg-amber-50 text-amber-800 rounded-2xl font-black text-xs font-mono shadow-sm shadow-amber-50/50"
                              >
                                <span>₹{patientPaidValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                                  PATIENT PAYABLE
                                </span>
                              </div>
                            </InputGroup>
                            <p className="text-[10px] text-slate-500 mt-1.5 ml-1 leading-normal">
                              Deductions & co-pay calculated total payable by patient.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (fieldId === "finance_info") {
                      const totalBill =
                        claim.formData?.dis_total_bill ||
                        claim.estimatedCost ||
                        0;
                      const finalApp =
                        claim.formData?.fin_app_amt ||
                        claim.formData?.pre_auth_app_amt ||
                        0;
                      const currentSettledValue =
                        safeFloat(localFormData.set_incl_tds) ||
                        safeFloat(localFormData.set_partial_amt);

                      const predictedTotal =
                        totalSettledAmt + currentSettledValue;
                      const isMatched =
                        finalApp > 0 && Math.abs(finalApp - predictedTotal) < 1;

                      const isPartialFlow =
                        pendingStatus?.includes("Partially") ||
                        pendingStatus?.includes("Partial");
                      const isCompleteFlow =
                        pendingStatus === ClaimStatus.COMPLETE_SETTLEMENT;

                      const isDischargeApprovedTransition =
                        (pendingStatus as any) === ClaimStatus.DISCHARGE_APPROVED ||
                        (pendingStatus as any) === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED;

                      if (isCompleteFlow || isPartialFlow) {
                        const previouslySettled = totalSettledAmt;
                        const currentSettlementAmount = safeFloat(localFormData.set_incl_tds);
                        const cumulativeSettledAmount = previouslySettled + currentSettlementAmount;
                        const outstandingBalanceAmount = finalApp > cumulativeSettledAmount ? finalApp - cumulativeSettledAmount : 0;

                        return (
                          <div key={fieldId} className="col-span-2 space-y-4">
                            <div className="grid grid-cols-2 shadow-sm rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-5 gap-y-4 gap-x-6 text-xs font-bold text-slate-700">
                              <div className="col-span-2 border-b border-indigo-100/50 pb-2 flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase text-[#000080] tracking-wider mb-0.5 flex items-center gap-1.5">
                                  <IndianRupee size={12} /> Settlement Calculations Summary
                                </h4>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                  Total Claim Amount
                                </p>
                                <p className="text-sm font-black text-slate-800">
                                  ₹{finalApp.toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">
                                  Previously Settled Amount
                                </p>
                                <p className="text-sm font-black text-slate-700">
                                  ₹{previouslySettled.toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">
                                  Current Settlement Amount
                                </p>
                                <p className="text-sm font-black text-[#000080]">
                                  ₹{currentSettlementAmount.toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                                  Total Settled Amount (Cumulative)
                                </p>
                                <p className="text-sm font-black text-emerald-700">
                                  ₹{cumulativeSettledAmount.toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div className="col-span-2 pt-3 border-t border-indigo-100/50">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">
                                  Outstanding Balance Amount
                                </p>
                                <p className="text-base font-black text-rose-700">
                                  ₹{outstandingBalanceAmount.toLocaleString("en-IN")}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={fieldId}
                          className="grid grid-cols-2 gap-4 p-5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl shadow-sm col-span-2"
                        >
                          {!isPartialFlow && (
                            <>
                              <div className={isDischargeApprovedTransition ? "col-span-2 text-center" : ""}>
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                  Total Bill Amt
                                </p>
                                <p className="text-sm font-black text-slate-800">
                                  ₹{Number(totalBill).toLocaleString("en-IN")}
                                </p>
                              </div>
                              {!isDischargeApprovedTransition && (
                                <div>
                                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                    Final Approval Amt
                                  </p>
                                  <p className="text-sm font-black text-slate-800">
                                    ₹{Number(localFormData.fin_app_amt || finalApp || 0).toLocaleString("en-IN")}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    }

                    if (fieldId === "reconsideration_reason") {
                      return (
                        <InputGroup
                          key={fieldId}
                          label="Reconsideration Reason"
                          required
                        >
                          <select
                            value={localFormData.reconsideration_reason}
                            onChange={(e) =>
                              handleLocalInputChange(
                                "reconsideration_reason",
                                e.target.value,
                              )
                            }
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                          >
                            <option value="">Select Reason...</option>
                            <option value="Tariff Deductions">
                              Tariff Deductions
                            </option>
                            <option value="Discount On package">
                              Discount On package
                            </option>
                            <option value="Over & Above Package">
                              Over & Above Package
                            </option>
                            <option value="Claim Rejection">
                              Claim Rejection
                            </option>
                            <option value="Other">Other</option>
                          </select>
                        </InputGroup>
                      );
                    }

                    if (fieldId === "partial_remark_type") {
                      const isRecoverable =
                        pendingStatus ===
                        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE;
                      const finalApp =
                        claim.formData?.fin_app_amt ||
                        claim.formData?.pre_auth_app_amt ||
                        0;
                      const currentSettValue =
                        safeFloat(localFormData.set_partial_amt) ||
                        safeFloat(localFormData.set_incl_tds);
                      const isMatched =
                        finalApp > 0 &&
                        Math.abs(
                          finalApp - (totalSettledAmt + currentSettValue),
                        ) < 1;

                      // Hide if Partially Settled Amt is 0 or if everything is perfectly settled
                      if (currentSettValue <= 0 || isMatched) return null;

                      const options = isRecoverable
                        ? [
                            "Tariff Deductions",
                            "Discount on Package",
                            "Non Medical Expenses",
                          ]
                        : [
                            "Tariff Deductions",
                            "MOU Discount",
                            "Non Medical Expenses",
                          ];

                      return (
                        <div
                          key={fieldId}
                          className="space-y-4 p-5 bg-amber-50 border-2 border-amber-100 rounded-2xl shadow-inner animate-in fade-in zoom-in duration-300"
                        >
                          <InputGroup label="Partially Settled Reason" required>
                            <select
                              value={localFormData.partial_remark_type}
                              onChange={(e) =>
                                handleLocalInputChange(
                                  "partial_remark_type",
                                  e.target.value,
                                )
                              }
                              className="w-full px-5 py-3.5 bg-white border-2 border-amber-200 rounded-xl text-sm font-black text-amber-700 outline-none focus:ring-4 focus:ring-amber-100 transition-all appearance-none"
                            >
                              <option value="">Select Reason...</option>
                              {options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </InputGroup>
                        </div>
                      );
                    }

                    if (fieldId === "file_pickup_date_time") {
                      return (
                        <InputGroup
                          key={fieldId}
                          label="File Pickup Date & Time"
                          required
                        >
                          <input
                            type="datetime-local"
                            value={localFormData.file_pickup_date_time || ""}
                            onChange={(e) =>
                              handleLocalInputChange(
                                "file_pickup_date_time",
                                e.target.value,
                              )
                            }
                            className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                          />
                        </InputGroup>
                      );
                    }

                    if (fieldId === "target_settlement_status") {
                      // Hide if Partially Settled Amt is 0 (Remark is hidden)
                      if (safeFloat(localFormData.set_partial_amt) <= 0)
                        return null;

                      return (
                        <div key={fieldId} className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500">
                          <InputGroup
                            label="Select Next Stage Flow"
                            required
                          >
                            <div className="relative group">
                              <select
                                value={
                                  localFormData.target_settlement_status || ""
                                }
                                onChange={(e) =>
                                  handleLocalInputChange(
                                    "target_settlement_status",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-5 py-4 bg-white border-2 border-emerald-200 rounded-xl text-sm font-black text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-100 transition-all appearance-none shadow-sm"
                              >
                                <option value="">Select Action...</option>
                                <option value={ClaimStatus.COMPLETE_SETTLEMENT}>
                                  Complete Settlement
                                </option>
                                <option
                                  value={
                                    ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE
                                  }
                                >
                                  Partially Claim Settled - Recoverable
                                </option>
                                <option
                                  value={
                                    ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE
                                  }
                                >
                                  Partially Claim Settled - Non Recoverable
                                </option>
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400 group-hover:text-emerald-600 transition-colors">
                                <ChevronDown size={20} />
                              </div>
                            </div>
                          </InputGroup>
                        </div>
                      );
                    }

                    if (fieldId === "bank_fund_status") {
                      return (
                        <InputGroup
                          key={fieldId}
                          label="Mark Fund Status"
                          required
                        >
                          <select
                            value={localFormData.bank_fund_status}
                            onChange={(e) =>
                              handleLocalInputChange(
                                "bank_fund_status",
                                e.target.value,
                              )
                            }
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                          >
                            <option value="">Select Status</option>
                            <option value="Fund Received">Fund Received</option>
                            <option value="Partially Fund Received">
                              Partially Fund Received
                            </option>
                            <option value="Fund Not received">
                              Fund Not received
                            </option>
                          </select>
                        </InputGroup>
                      );
                    }

                    if (fieldId === "remarks_reasons") {
                      return (
                        <div key={fieldId} className="col-span-2 space-y-4">
                          <InputGroup label="Remarks / Reasons" required>
                            <select
                              value={localFormData.remarks_reasons || ""}
                              onChange={(e) => {
                                handleLocalInputChange("remarks_reasons", e.target.value);
                                if (e.target.value !== "Other") {
                                  handleLocalInputChange("remarks_reasons_other", "");
                                }
                              }}
                              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                            >
                              <option value="">Select Reason...</option>
                              <option value="Patient paying Cash for reimbursement">Patient paying Cash for reimbursement</option>
                              <option value="Patient Not admitted">Patient Not admitted</option>
                              <option value="Surgery Postponed">Surgery Postponed</option>
                              <option value="Wrong Details in Approval">Wrong Details in Approval</option>
                              <option value="Medical / Clinical Cancellation">Medical / Clinical Cancellation</option>
                              <option value="Duplicate Claim">Duplicate Claim</option>
                              <option value="Admission date changed">Admission date changed</option>
                              <option value="Delay in Approval">Delay in Approval</option>
                              <option value="Other">Other (Allow to enter comment)</option>
                            </select>
                          </InputGroup>
                          {localFormData.remarks_reasons === "Other" && (
                            <InputGroup label="Specify Comment" required>
                              <textarea
                                value={localFormData.remarks_reasons_other || ""}
                                onChange={(e) =>
                                  handleLocalInputChange("remarks_reasons_other", e.target.value)
                                }
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all min-h-[80px] resize-none"
                                placeholder="Specify custom rejection/cancellation details..."
                              />
                            </InputGroup>
                          )}
                        </div>
                      );
                    }

                    if (fieldId === "cancellation_declaration") {
                      return (
                        <div key={fieldId} className="col-span-2 p-5 bg-rose-50/50 border-2 border-rose-100 rounded-2xl flex items-start gap-4 mt-2 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                          <input
                            type="checkbox"
                            id="cancellation_decl_checkbox"
                            checked={!!localFormData.cancellation_declaration}
                            onChange={(e) =>
                              handleLocalInputChange("cancellation_declaration", e.target.checked)
                            }
                            className="mt-1.5 h-5 w-5 rounded-md border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                          <label htmlFor="cancellation_decl_checkbox" className="text-xs leading-relaxed text-slate-700 font-bold select-none cursor-pointer">
                            I acknowledge that upon claim cancellation, the case may be cancelled from the insurer/TPA portal and/or email workflow, and further processing may not be possible without reopening the case through the authorized process.
                          </label>
                        </div>
                      );
                    }

                    if (fieldId === "file_dispatched_declaration") {
                      if (isPartnerProcessing) {
                        return null;
                      }
                      return (
                        <div key={fieldId} className="col-span-2 space-y-4 mt-2">
                          <div className="p-5 bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                            <input
                              type="checkbox"
                              id="file_dispatched_decl_checkbox"
                              checked={!!localFormData.file_dispatched_declaration}
                              onChange={(e) =>
                                handleLocalInputChange("file_dispatched_declaration", e.target.checked)
                              }
                              className="mt-1.5 h-5 w-5 rounded-md border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="file_dispatched_decl_checkbox" className="text-xs leading-relaxed text-slate-700 font-bold select-none cursor-pointer">
                              I hereby approve the submission of this claim file to the respective Insurance Company/TPA for settlement processing.
                            </label>
                          </div>
                        </div>
                      );
                    }

                    const fieldDef = fields.find((f) => f.id === fieldId);
                    let label =
                      fieldDef?.label ||
                      fieldId.replace(/_/g, " ").toUpperCase();
                    if (fieldId === "admissionDate") label = "Admission Date";
                    if (fieldId === "dischargeDate") label = "Discharge Date";
                    if (fieldId === "reason") label = "Reason for Pending";
                    if (
                      fieldId === "fin_app_amt" &&
                      (pendingStatus === ClaimStatus.DISCHARGE_APPROVED ||
                        pendingStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED)
                    )
                      label = "Final Approval Amt";
                    if (fieldId === "query_comment") label = "Query Comment";
                    if (fieldId === "query_reply_comment")
                      label = "Medical Query Reply Comment";
                    if (
                      fieldId === "current_date" &&
                      (pendingStatus === ClaimStatus.MEDICAL_QUERY_REPLIED ||
                        pendingStatus ===
                          ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY)
                    )
                      label = "Transaction Date";
                    if (fieldId === "approved_amt")
                      label = "Claim Approved Amt";
                    if (fieldId === "set_net_settled")
                      label = "Settled Net Amt";
                    if (fieldId === "set_incl_tds") label = "Total Settled Amt";
                    if (fieldId === "set_tds") label = "Settled TDS Amt";
                    if (fieldId === "set_partial_amt")
                      label = "Partially Settled Amt";
                    if (fieldId === "pickup_person_name")
                      label = "Pickup Person Name";
                    if (fieldId === "pickup_contact_number")
                      label = "Pickup Contact Number";
                    if (fieldId === "pickup_address")
                      label = "Pickup Full Address";
                    if (fieldId === "tracking_no")
                      label = "Courier Tracking No";
                    if (fieldId === "file_dispatched_date")
                      label = "File Dispatched Date";
                    if (fieldId === "transaction_date_time")
                      label = "Transaction Date & Time";
                    if (fieldId === "appointment_date_time")
                      label = "Appointment Date & Time";
                    if (fieldId === "file_pickup_date_time")
                      label = "File Pickup Date & Time";
                    if (fieldId === "file_dispatch_comment")
                      label = "File Dispatch Comment";
                    if (fieldId === "courier_name")
                      label = "Courier Company Name";
                    if (fieldId === "customer_name") label = "Customer Name";

                    if (
                      (fieldId === "dischargeDate" || fieldId === "dis_date") &&
                      (pendingStatus === ClaimStatus.ENHANCEMENT || pendingStatus === ClaimStatus.DISCHARGE_INITIATED)
                    ) {
                      return null;
                    }

                    if (
                      fieldId === "admissionDate" &&
                      (pendingStatus === ClaimStatus.ENHANCEMENT || pendingStatus === ClaimStatus.DISCHARGE_INITIATED)
                    ) {
                      const secondaryFieldId = pendingStatus === ClaimStatus.ENHANCEMENT ? "dischargeDate" : "dis_date";
                      const secondaryLabel = "Discharge Date";
                      return (
                        <div key={fieldId} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <InputGroup label="Admission Date" required>
                              <input
                                type="date"
                                value={localFormData.admissionDate || ""}
                                onKeyDown={(e) => e.preventDefault()}
                                onChange={(e) =>
                                  handleLocalInputChange("admissionDate", e.target.value)
                                }
                                className="w-full h-10 px-4 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 bg-slate-50 text-slate-700 font-verdana"
                              />
                            </InputGroup>
                          </div>
                          <div>
                            <InputGroup label={secondaryLabel} required>
                              <input
                                type="date"
                                value={localFormData[secondaryFieldId] || ""}
                                onKeyDown={(e) => e.preventDefault()}
                                onChange={(e) =>
                                  handleLocalInputChange(secondaryFieldId, e.target.value)
                                }
                                className="w-full h-10 px-4 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 bg-slate-50 text-slate-700 font-verdana"
                              />
                            </InputGroup>
                          </div>
                        </div>
                      );
                    }

                    if (
                      fieldId === "fin_app_amt" &&
                      (pendingStatus === ClaimStatus.DISCHARGE_APPROVED ||
                        pendingStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED)
                    ) {
                      return (
                        <div key={fieldId} className="col-span-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <InputGroup label="Final Approval Amt" required>
                                <input
                                  type="number"
                                  value={localFormData[fieldId]}
                                  onChange={(e) =>
                                    handleLocalInputChange(fieldId, e.target.value)
                                  }
                                  className="w-full h-10 px-4 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 focus:ring-4 focus:ring-blue-50 transition-all font-mono"
                                  placeholder="Enter Final Approval Amt"
                                />
                              </InputGroup>
                            </div>
                            <div>
                              <InputGroup label="Top Up Approved Amt (Optional)">
                                <input
                                  type="number"
                                  value={localFormData.topup_app_amt || ""}
                                  onChange={(e) =>
                                    handleLocalInputChange("topup_app_amt", e.target.value)
                                  }
                                  className="w-full h-10 px-4 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 focus:ring-4 focus:ring-blue-50 transition-all font-mono"
                                  placeholder="Enter Top Up Approved Amt (Optional)"
                                />
                              </InputGroup>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={fieldId}>
                        <InputGroup label={label} required>
                          {fieldId.includes("comment") ||
                          fieldId.includes("text") ||
                          fieldId === "reopen_reason" ||
                          fieldId === "reason" ? (
                            <textarea
                              value={localFormData[fieldId]}
                              onChange={(e) =>
                                handleLocalInputChange(fieldId, e.target.value)
                              }
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all min-h-[80px] resize-none"
                              placeholder={`Enter details for ${label.toLowerCase()}...`}
                            />
                          ) : (
                            <input
                              type={
                                fieldId.toLowerCase().includes("date")
                                  ? "date"
                                  : fieldDef?.type === "number" ||
                                    fieldId.includes("amt") ||
                                    fieldId.includes("bill") ||
                                    fieldId.includes("exp") ||
                                    fieldId.includes("disc") ||
                                    fieldId.includes("ded") ||
                                    fieldId.includes("limit")
                                    ? "number"
                                    : "text"
                              }
                              readOnly={
                                fieldId === "dis_total_bill" ||
                                fieldId === "fin_total_amt" ||
                                fieldId === "fin_patient_paid" ||
                                fieldId === "set_tds" ||
                                fieldId === "set_incl_tds" ||
                                fieldId === "set_partial_amt"
                              }
                              value={localFormData[fieldId]}
                              onChange={(e) =>
                                handleLocalInputChange(fieldId, e.target.value)
                              }
                              className={`w-full h-10 px-4 border rounded-xl text-xs font-bold outline-none focus:ring-4 transition-all 
                                          ${
                                            fieldId === "set_partial_amt"
                                              ? safeFloat(
                                                  localFormData[fieldId],
                                                ) === 0
                                                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                                : "bg-rose-50 border-rose-200 text-rose-600"
                                              : fieldId === "dis_total_bill" ||
                                                  fieldId === "fin_total_amt" ||
                                                  fieldId ===
                                                    "fin_patient_paid" ||
                                                  fieldId === "set_tds" ||
                                                  fieldId === "set_incl_tds" ||
                                                  fieldId === "set_partial_amt"
                                                ? "bg-slate-100 border-slate-200 text-slate-500"
                                                : "bg-slate-50 border-slate-200 text-slate-700 focus:ring-blue-50"
                                          }`}
                            />
                          )}
                        </InputGroup>
                      </div>
                    );
                  })}

                  {/* 3. Stage Comment */}
                  {getFieldsForStatus(pendingStatus!).includes("comment") && (
                    <InputGroup label="Stage Comment / Remarks" required>
                      <textarea
                        value={localFormData.comment}
                        onChange={(e) =>
                          handleLocalInputChange("comment", e.target.value)
                        }
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 transition-all min-h-[80px] resize-none"
                        placeholder="Enter stage remarks..."
                      />
                    </InputGroup>
                  )}
                  {/* Documents at the very end */}
                  {getFieldsForStatus(pendingStatus!).includes(
                    "ai_analysis_trigger",
                  ) && (
                    <div className="flex justify-center -mt-4 mb-2">
                      <button
                        onClick={handleAIAnalysis}
                        disabled={!localFormData.fileName || isAnalyzing}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:scale-105 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        {isAnalyzing
                          ? "Analyzing Documents..."
                          : "Auto-Fetch clinical Data (AI)"}
                      </button>
                    </div>
                  )}

                  {getFieldsForStatus(pendingStatus!).includes("documents") &&
                    (() => {
                      let label = "UPLOAD DOCUMENTS (MANDATORY)";
                      let optional = false;

                      switch (pendingStatus) {
                        case ClaimStatus.PRE_AUTH_APPROVED:
                          label = "Pre-Auth Approval Letter";
                          break;
                        case ClaimStatus.INITIAL_QUERY_PENDING:
                          label = "Initial Query Letter";
                          break;
                        case ClaimStatus.QUERY_REPLY_DONE:
                          label = "Query Reply Document";
                          break;
                        case ClaimStatus.PRE_AUTH_REJECTED:
                          label = "Pre-Auth Rejection Letter";
                          break;
                        case ClaimStatus.ENHANCEMENT:
                          label = "Enhancement Letter";
                          break;
                        case ClaimStatus.DISCHARGE_INITIATED:
                          label = "Discharge Documents";
                          break;
                        case "REOPEN CASE":
                          label = "Reopen Letter";
                          break;
                        case ClaimStatus.ENHANCEMENT_APPROVED:
                          label = "Enhancement Approval Letter";
                          break;
                        case ClaimStatus.ENHANCEMENT_REJECTED:
                          label = "Enhancement Rejection Letter";
                          break;
                        case ClaimStatus.DISCHARGE_QUERY_RAISED:
                          label = "Discharge Query Letter";
                          break;
                        case ClaimStatus.DISCHARGE_REJECTED:
                          label = "Discharge Rejection Letter";
                          break;
                        case ClaimStatus.DISCHARGE_APPROVED:
                          label = "Discharge Approval Letter";
                          break;
                        case ClaimStatus.DISCHARGE_QUERY_REPLY:
                          label = "Discharge Query Letter";
                          break;
                        case ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED:
                          label = "Discharge Reconsideration Letter";
                          break;
                        case ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED:
                          label = "Reconsideration Approval Letter";
                          break;
                        case ClaimStatus.FILE_DISPATCHED:
                          label = "CLAIM FILE";
                          break;
                        case ClaimStatus.CLAIM_UNDER_QUERY:
                          label = "Claim Query Letter";
                          break;
                        case ClaimStatus.CLAIM_APPROVED:
                          label = "Claim Approval Letter";
                          optional = true;
                          break;
                        case ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE:
                        case ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE:
                          label = "Settlement Document";
                          break;
                        case ClaimStatus.COMPLETE_SETTLEMENT:
                          label = "Settlement Letter";
                          break;
                        case ClaimStatus.ACCOUNT_RECONCILIATION:
                          label = "Bank Statement";
                          optional = true;
                          break;
                      }

                      const isMultipleUpload =
                        pendingStatus === ClaimStatus.ENHANCEMENT ||
                        pendingStatus === ClaimStatus.DISCHARGE_INITIATED;

                      return (
                        <div key="documents" className="space-y-4 col-span-2">
                          {isMultipleUpload ? (
                            <InputGroup
                              label={`${label.toUpperCase()} (MULTIPLE FILES ALLOWED - MANDATORY)`}
                              required={true}
                            >
                              <div className="space-y-4">
                                <div className="relative group">
                                  <input
                                    type="file"
                                    className="hidden"
                                    id="status-multiple-file-upload"
                                    onChange={handleMultipleFilesChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    multiple
                                  />
                                  <label
                                    htmlFor="status-multiple-file-upload"
                                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-[1.5rem] cursor-pointer transition-all bg-slate-50 border-slate-200 hover:bg-white hover:border-blue-400"
                                    onDragOver={(evt) => {
                                      evt.preventDefault();
                                      evt.stopPropagation();
                                    }}
                                    onDrop={(evt) => {
                                      evt.preventDefault();
                                      evt.stopPropagation();
                                      const files = evt.dataTransfer.files;
                                      if (files && files.length > 0) {
                                        handleMultipleFilesChange(files);
                                      }
                                    }}
                                  >
                                    <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                      <UploadCloud size={24} className="mb-1" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">
                                        SELECT MULTIPLE {label.toUpperCase()}
                                      </p>
                                      <p className="text-[9px] text-slate-400 mt-0.5">
                                        Drag & drop or click to upload
                                      </p>
                                    </div>
                                  </label>
                                </div>

                                {/* List of uploaded files */}
                                {localFormData.multipleFiles && localFormData.multipleFiles.length > 0 && (
                                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                    {localFormData.multipleFiles.map((file: any, index: number) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 transition-all text-xs font-bold"
                                      >
                                        <div className="flex items-center overflow-hidden mr-2">
                                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mr-2 shrink-0">
                                            <FileText size={16} />
                                          </div>
                                          <div className="overflow-hidden mr-1">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-indigo-800 truncate max-w-[220px]">
                                              {file.fileName}
                                            </p>
                                            <p className="text-[9px] text-slate-400">
                                              File #{index + 1}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handlePreview(file.fileName, file.fileData, file.fileType || "application/pdf");
                                            }}
                                            className="px-2.5 py-1.5 bg-[#000080] hover:bg-blue-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                          >
                                            <Eye size={10} /> View
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleRemoveMultipleFile(file.fileName);
                                            }}
                                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-all"
                                            title="Remove File"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </InputGroup>
                          ) : (
                            <InputGroup
                              label={`${label.toUpperCase()} (${optional ? "OPTIONAL" : "MANDATORY"})`}
                              required={!optional}
                            >
                              <div className="relative group">
                                <input
                                  type="file"
                                  className="hidden"
                                  id="status-file-upload"
                                  onChange={(e) => handleFileChange(e, "documents")}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                />
                                <label
                                  htmlFor="status-file-upload"
                                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-[1.5rem] cursor-pointer transition-all ${localFormData.fileName ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 hover:bg-white hover:border-blue-400"}`}
                                  onDragOver={(evt) => {
                                    evt.preventDefault();
                                    evt.stopPropagation();
                                  }}
                                  onDrop={(evt) => {
                                    evt.preventDefault();
                                    evt.stopPropagation();
                                    const file = evt.dataTransfer.files?.[0];
                                    if (file) {
                                      handleFileChange(file, "documents");
                                    }
                                  }}
                                >
                                  {localFormData.fileName ? (
                                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                      <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg mb-2">
                                        <CheckCircle size={24} />
                                      </div>
                                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate max-w-[200px]">
                                        {localFormData.fileName}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                      <UploadCloud size={32} className="mb-2" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">
                                        SELECT {label.toUpperCase()}
                                      </p>
                                    </div>
                                  )}
                                </label>
                              </div>
                            </InputGroup>
                          )}

                          {/* Top Up Claim Approval Attachment (Optional) kept directly after Discharge Approval Letter */}
                          {(pendingStatus === ClaimStatus.DISCHARGE_APPROVED ||
                            pendingStatus === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED) && (
                            <InputGroup label="Top Up Claim Approval Attachment (Optional)">
                              <div className="relative group">
                                <input
                                  type="file"
                                  className="hidden"
                                  id="topup-file-upload"
                                  onChange={(e) => handleFileChange(e, "topup_attachment")}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                />
                                <label
                                  htmlFor="topup-file-upload"
                                  className={`flex flex-col items-center justify-center w-full h-16 border border-dashed rounded-xl cursor-pointer transition-all ${
                                    localFormData.topup_attachment_name
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                      : "bg-slate-50/50 border-slate-200 hover:bg-white hover:border-blue-400 text-slate-400"
                                  }`}
                                  onDragOver={(evt) => {
                                    evt.preventDefault();
                                    evt.stopPropagation();
                                  }}
                                  onDrop={(evt) => {
                                    evt.preventDefault();
                                    evt.stopPropagation();
                                    const file = evt.dataTransfer.files?.[0];
                                    if (file) {
                                      handleFileChange(file, "topup_attachment");
                                    }
                                  }}
                                >
                                  {localFormData.topup_attachment_name ? (
                                    <div className="flex items-center gap-3 animate-in zoom-in duration-300 px-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-indigo-500 text-white rounded-md flex items-center justify-center shadow">
                                          <CheckCircle size={12} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest truncate max-w-[240px]">
                                          {localFormData.topup_attachment_name}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setLocalFormData((prev: any) => {
                                            const copy = { ...prev };
                                            delete copy.topup_attachment_data;
                                            delete copy.topup_attachment_name;
                                            delete copy.topup_attachment_type;
                                            return copy;
                                          });
                                        }}
                                        className="p-1 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-md transition-all"
                                        title="Remove file"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center group-hover:text-blue-500 transition-colors">
                                      <UploadCloud size={20} className="mb-0.5" />
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        SELECT ATTACHMENT
                                      </p>
                                    </div>
                                  )}
                                </label>
                              </div>
                            </InputGroup>
                          )}
                        </div>
                      );
                    })()}

                  {getFieldsForStatus(pendingStatus!).includes(
                    "documents_pod",
                  ) && (
                    <InputGroup
                      key="documents_pod"
                      label="POD COPY (MANDATORY)"
                      required
                    >
                      <div className="relative group">
                        <input
                          type="file"
                          className="hidden"
                          id="status-pod-file-upload"
                          onChange={(e) => handleFileChange(e, "documents_pod")}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <label
                          htmlFor="status-pod-file-upload"
                          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-[1.5rem] cursor-pointer transition-all ${localFormData.documents_pod_name ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 hover:bg-white hover:border-blue-400"}`}
                          onDragOver={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                          }}
                          onDrop={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            const file = evt.dataTransfer.files?.[0];
                            if (file) {
                              handleFileChange(file, "documents_pod");
                            }
                          }}
                        >
                          {localFormData.documents_pod_name ? (
                            <div className="flex flex-col items-center animate-in zoom-in duration-300">
                              <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg mb-2">
                                <CheckCircle size={24} />
                              </div>
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate max-w-[200px]">
                                {localFormData.documents_pod_name}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                              <UploadCloud size={32} className="mb-2" />
                              <p className="text-[10px] font-black uppercase tracking-widest">
                                Select POD Copy
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </InputGroup>
                  )}
                </div>
              </div>

              <div className="p-6 lg:p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-4 shrink-0 shadow-[0_-15px_50px_-20px_rgba(0,0,0,0.15)] z-20 sticky bottom-0">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setPendingStatus(null);
                  }}
                  className="w-full sm:w-1/3 py-5 bg-rose-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center"
                >
                  <X size={20} className="mr-2" /> Discard
                </button>
                {pendingStatus && (
                  <button
                    onClick={handleUpdateStatus}
                    disabled={
                      isSaving || !!claimNumberError || !!validationError
                    }
                    className="w-full sm:w-2/3 py-5 bg-emerald-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center group disabled:opacity-50 disabled:grayscale active:scale-95"
                  >
                    {isSaving ? (
                      <span className="animate-spin mr-3">⌛</span>
                    ) : (
                      <CheckCircle
                        size={24}
                        className="mr-3 group-hover:scale-110 transition-transform"
                      />
                    )}
                    {claim.status === pendingStatus
                      ? "Save Corrections"
                      : "Update Claim"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const InputGroup = ({ label, children, required }: any) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
      {label} {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, label, color }: any) => {
  const activeClass = `bg-${color}-50 text-${color}-600 border-${color}-100 shadow-sm`;
  const inactiveClass = `text-slate-500 hover:bg-white hover:text-slate-800 border-transparent`;
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-6 py-3 rounded-2xl border transition-all ${active ? activeClass : inactiveClass}`}
    >
      <Icon
        size={16}
        className={`mr-2 ${active ? `text-${color}-500` : "text-slate-400"}`}
      />
      <span className="text-[10px] font-black uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle, color }: any) => (
  <div className="flex items-center gap-4 mb-8">
    <div
      className={`w-14 h-14 bg-${color}-50 text-${color}-600 rounded-2xl flex items-center justify-center shadow-sm`}
    >
      <Icon size={28} />
    </div>
    <div>
      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
        {title}
      </h2>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {subtitle}
      </p>
    </div>
  </div>
);

const DetailGroup = ({ title, children }: any) => (
  <div className="space-y-6">
    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
      {title}
    </h3>
    <div className="space-y-5">{children}</div>
  </div>
);

const DataRow = ({ label, value, isBold }: any) => {
  const renderValue = (val: any) => {
    if (val === null || val === undefined) return "—";
    if (
      val &&
      typeof val === "object" &&
      ("seconds" in val || "_seconds" in val)
    ) {
      return formatDate(val);
    }
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch (e) {
        return "Object";
      }
    }
    return val;
  };

  return (
    <div className="flex justify-between items-baseline group">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-slate-500 transition-colors">
        {label}
      </span>
      <span
        className={`text-sm text-right ${isBold ? "font-black text-slate-900" : "font-bold text-slate-700"} border-b border-dashed border-transparent group-hover:border-slate-200 transition-all`}
      >
        {renderValue(value)}
      </span>
    </div>
  );
};

const KypRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) => (
  <div className="flex justify-between items-start gap-4">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-0.5">
      {label}
    </span>
    <span className="text-[11px] font-black text-slate-800 uppercase text-right max-w-[200px]">
      {value || "N/A"}
    </span>
  </div>
);

const PolicyDataRow = ({ label, value }: { label: string; value: any }) => {
  const renderValue = (val: any) => {
    if (val === null || val === undefined) return "N/A";
    if (
      val &&
      typeof val === "object" &&
      "seconds" in val &&
      "nanoseconds" in val
    ) {
      return formatDate(val);
    }
    if (typeof val === "object") return "Object";
    return val;
  };

  return (
    <div className="flex flex-col space-y-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}
      </span>
      <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 break-words">
        {renderValue(value)}
      </div>
    </div>
  );
};

const PROFILE_FIELDS = [
  { id: "insurer_claim_no", label: "Claim No", type: "text" },
  { id: "p_name", label: "Patient Name", type: "text" },
  { id: "p_contact", label: "Contact", type: "text" },
  { id: "p_email", label: "Email", type: "email" },
  { id: "p_dob", label: "Date of Birth", type: "date" },
  {
    id: "p_gender",
    label: "Gender",
    type: "select",
    options: ["Male", "Female", "Other"],
  },
  { id: "p_address", label: "Address", type: "text" },
];

const ProfileEditor = ({
  data,
  setData,
  fields,
  onCancel,
  onSave,
  isSaving,
}: any) => {
  // Simplified editor logic (reuse ClaimFormWizard logic if possible, or simple inputs)
  return (
    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6 animate-in fade-in slide-in-from-top-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {PROFILE_FIELDS.map((defaultField) => {
          // Try to find the field in the props, otherwise fallback to the default definition
          const field =
            (fields || []).find((f: any) => f.id === defaultField.id) ||
            defaultField;

          return (
            <div
              key={field.id}
              className={field.id === "p_address" ? "sm:col-span-2" : ""}
            >
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">
                {field.label}
              </label>
              {defaultField.type === "select" ? (
                <select
                  className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
                  value={data[field.id] || ""}
                  onChange={(e) =>
                    setData({ ...data, [field.id]: e.target.value })
                  }
                >
                  <option value="">Select...</option>
                  {defaultField.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative group">
                  <input
                    type={defaultField.type || "text"}
                    placeholder={`Enter ${field.label}`}
                    value={data[field.id] || ""}
                    onChange={(e) =>
                      setData({ ...data, [field.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (defaultField.type === "date") {
                        if (e.key !== "Tab" && e.key !== "Escape") {
                          e.preventDefault();
                        }
                      }
                    }}
                    onClick={(e) => {
                      if (defaultField.type === "date") {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) {
                          console.log("showPicker not supported", err);
                        }
                      }
                    }}
                    className={`w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 ${defaultField.type === "date" ? "cursor-pointer select-none" : ""}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-8 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default ClaimProcessCenter;
