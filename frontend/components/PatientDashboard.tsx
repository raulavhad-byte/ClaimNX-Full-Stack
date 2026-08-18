
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import { KYPPolicy, KYPStatus, Claim, ClaimStatus, Product, TimelineEvent, InsuranceEntity, ROLE_STAGE_ENTITLEMENTS } from '../types';
import { dualStorageService, DISABLE_FIRESTORE } from '../services/dualStorageService';
import KYPForm from './KYPForm';
import { FastDOBPicker } from './FastDOBPicker';
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
import { 
  User, 
  FileText, 
  Activity, 
  ArrowLeft, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  Clock,
  Wallet,
  Building,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  History,
  Eye,
  Download,
  FileSearch,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  MessageSquare,
  Upload,
  X,
  Plus,
  Maximize2,
  Minimize2,
  Sparkles,
  BrainCircuit,
  Stethoscope,
  Edit,
  Save,
  Zap,
  Loader2,
  BedDouble,
  HeartPulse,
  Paperclip,
  IndianRupee,
  ChevronDown,
  ArrowUpRight,
  Layers,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime, formatTimelineEventTAT, safeHtml2Canvas, safeFormatYmd } from '../utils';
import { clinicalAiService } from '../services/clinicalAiService';
import { documentsApi } from '../services/api';

interface PatientDashboardProps {
  claims: Claim[];
  kypPolicies: KYPPolicy[];
  setKypPolicies: React.Dispatch<React.SetStateAction<KYPPolicy[]>>;
  onUpdateClaim: (claim: Claim) => void | Promise<void>;
  hospitalProfile: any;
  setProfileInitialTab?: (tab: any) => void;
  setShowProfileModule?: (show: boolean) => void;
  canAccess: (permission: string) => boolean;
  insurers?: InsuranceEntity[];
  tpas?: InsuranceEntity[];
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ 
  claims, 
  kypPolicies, 
  setKypPolicies, 
  onUpdateClaim, 
  hospitalProfile,
  setProfileInitialTab,
  setShowProfileModule,
  canAccess,
  insurers = [],
  tpas = []
}) => {
  const { patientName } = useParams<{ patientName: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source');
  const productFilter = searchParams.get('product');
  const [showKypModal, setShowKypModal] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [selectedKyp, setSelectedKyp] = useState<KYPPolicy | null>(null);

  const [selectedStageKey, setSelectedStageKey] = useState<string>('');
  const [stageComment, setStageComment] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; data: string; type: string }>>([]);
  const [isSubmittingStageUpdate, setIsSubmittingStageUpdate] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<'interactive' | 'cashless-document'>(
    searchParams.get('view') === 'cashless' ? 'cashless-document' : 'interactive'
  );

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'cashless') {
      setViewMode('cashless-document');
    } else {
      setViewMode('interactive');
    }
  }, [searchParams]);

  const downloadPolicyPdf = async () => {
    const element = document.getElementById('policy-intelligence-report');
    if (!element) return;
    
    setIsGeneratingPdf(true);
    try {
      const canvas = await safeHtml2Canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Policy_Intelligence_${patientName}.pdf`);
      toast.success('Policy Intelligence PDF downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string, data: string, type: string } | null>(null);
  const [replyFileData, setReplyFileData] = useState<string | null>(null);
  const [replyFileName, setReplyFileName] = useState<string | null>(null);
  const [replyFileType, setReplyFileType] = useState<string | null>(null);
  const [replyFiles, setReplyFiles] = useState<Array<{ id: string, name: string, type: string, file: File }>>([]);

  const handleAddReplyFiles = (filesList: FileList | File[]) => {
    if (!filesList) return;
    const remainingSlots = 3 - replyFiles.length;
    const filesToProcess = Array.from(filesList).slice(0, remainingSlots);
    let hasSizeError = false;
    let countExceeded = Array.from(filesList).length > remainingSlots;

    filesToProcess.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        hasSizeError = true;
        return;
      }
      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
      setReplyFiles(prev => {
        if (prev.length >= 3) return prev;
        return [...prev, {
          id: fileId,
          name: file.name,
          type: file.type,
          file,
        }];
      });
    });

    if (hasSizeError) {
      toast.error("Some files exceed the 5MB size limit");
    }
    if (countExceeded) {
      toast.warning(`Only up to 3 files can be attached.`);
    } else {
      toast.success("Files attached successfully");
    }
  };

  // Edit Record State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSection, setEditingSection] = useState<'identity' | 'clinical' | 'payer' | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, boolean>>({});
  const isKYPView = source === 'Know Your Policy';

  const handleUpdateStatus = async (newStatus: KYPStatus) => {
    const patientKyp = kypPolicies.find(p => p.patientName === patientName || p.insuredName === patientName);
    if (!patientKyp) return;
    
    const res = confirm(`Are you sure you want to update the policy status to ${newStatus}?`);
    if (!res) return;

    const updatedPolicy = {
      ...patientKyp,
      status: newStatus,
      lastUpdatedDate: new Date().toISOString()
    };

    try {
      // Update state
      setKypPolicies(prev => prev.map(p => p.id === patientKyp.id ? updatedPolicy : p));
      
      // KYP policy state is persisted with the claim through the API.
      
      // If linked to a claim, we could update the claim status too if needed
      const linkedClaim = claims.find(c => c.id === patientKyp.claimId);
      if (linkedClaim) {
         const claimUpdate = {
            ...linkedClaim,
            status: newStatus as any,
            updatedAt: new Date().toISOString()
         };
         onUpdateClaim(claimUpdate);
      }

      toast.success(`Policy status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating policy status:", error);
      toast.error("Failed to update status");
    }
  };

  const canEdit = useMemo(() => {
    return hospitalProfile?.permissionsMatrix?.can_edit || hospitalProfile?.role === 'Admin' || hospitalProfile?.role === 'Super Admin';
  }, [hospitalProfile]);

  const handleEditClick = (section: 'identity' | 'clinical' | 'payer') => {
    console.log('handleEditClick clicked', section, 'latestClaim:', latestClaim);
    if (!latestClaim) {
      console.log('latestClaim not found, returning');
      toast.error('Claim data not found');
      return;
    }
    
    const initialForm: any = {};
    if (section === 'identity') {
      initialForm.patientName = latestClaim.patientName;
      initialForm.p_uhid = latestClaim.formData?.p_uhid || '';
      initialForm.p_contact = latestClaim.formData?.p_contact || latestClaim.formData?.p_mobile || '';
      initialForm.p_dob = latestClaim.formData?.p_dob || '';
      initialForm.p_gender = latestClaim.formData?.p_gender || '';
      initialForm.p_address = latestClaim.formData?.p_address || '';
    } else if (section === 'clinical') {
      initialForm.diagnosis = latestClaim.diagnosis || '';
      initialForm.m_icd_code = latestClaim.formData?.m_icd_code || '';
      initialForm.dr_name = latestClaim.formData?.dr_name || '';
      initialForm.admissionDate = latestClaim.admissionDate || '';
      initialForm.dischargeDate = latestClaim.dischargeDate || latestClaim.formData?.discharge_date || latestClaim.formData?.dis_date || '';
      initialForm.estimatedCost = String(latestClaim.estimatedCost || '');
      initialForm.adm_stay_days = String(latestClaim.formData?.adm_stay_days || '');
      initialForm.p_treatment_type = latestClaim.formData?.p_treatment_type || '';
    } else if (section === 'payer') {
      initialForm.insuranceProvider = latestClaim.insuranceProvider || '';
      initialForm.tpa_provider = latestClaim.formData?.tpa_provider || '';
      initialForm.policyNumber = latestClaim.policyNumber || '';
      initialForm.p_card_id = latestClaim.formData?.p_card_id || '';
      initialForm.insurer_claim_no = latestClaim.formData?.insurer_claim_no || '';
    }
    
    setEditingSection(section);
    setEditForm(initialForm);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!latestClaim) return;
    setIsSavingEdit(true);
    
    try {
      const updates: any = {
        formData: { ...(latestClaim.formData || {}) }
      };

      if (editingSection === 'identity') {
        if (editForm.patientName) updates.patientName = editForm.patientName;
        updates.formData.p_uhid = editForm.p_uhid;
        updates.formData.p_contact = editForm.p_contact;
        updates.formData.p_dob = editForm.p_dob;
        updates.formData.p_gender = editForm.p_gender;
        updates.formData.p_address = editForm.p_address;
        updates.formData.p_name = editForm.patientName; // Sync internal form name too
      } else if (editingSection === 'clinical') {
        updates.diagnosis = editForm.diagnosis;
        updates.admissionDate = editForm.admissionDate;
        updates.dischargeDate = editForm.dischargeDate || undefined;
        updates.estimatedCost = Number(editForm.estimatedCost);
        updates.formData.m_icd_code = editForm.m_icd_code;
        updates.formData.dr_name = editForm.dr_name;
        updates.formData.adm_stay_days = editForm.adm_stay_days;
        updates.formData.p_treatment_type = editForm.p_treatment_type;
        updates.formData.discharge_date = editForm.dischargeDate;
        updates.formData.dis_date = editForm.dischargeDate;
      } else if (editingSection === 'payer') {
        updates.insuranceProvider = editForm.insuranceProvider;
        updates.policyNumber = editForm.policyNumber;
        updates.formData.tpa_provider = editForm.tpa_provider;
        updates.formData.p_card_id = editForm.p_card_id;
        updates.formData.insurer_claim_no = editForm.insurer_claim_no;
        updates.formData.insurance_company = editForm.insuranceProvider; // Sync internal
        updates.formData.p_policy_no = editForm.policyNumber;
      }

      const newEvent = {
        id: `ev-edit-${Date.now()}`,
        status: latestClaim.status,
        date: new Date().toISOString(),
        comment: `Updated ${editingSection} information.`,
        type: 'status_change' as const,
        userName: hospitalProfile?.displayName || hospitalProfile?.username || 'System'
      };
      updates.history = [newEvent, ...(latestClaim.history || [])];

      await dualStorageService.save('claims', updates, latestClaim.id);
      
      const updatedClaim: Claim = {
        ...latestClaim,
        ...updates,
        formData: { ...latestClaim.formData, ...updates.formData }
      };
      
      if (onUpdateClaim) {
        onUpdateClaim(updatedClaim);
      } else {
        toast.success('Record updated successfully');
      }
      setShowEditModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update record');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getStageKeyByStatus = (status: string): string | null => {
    for (const cat of ROLE_STAGE_ENTITLEMENTS) {
      const found = cat.stages.find(s => s.status === status);
      if (found) return found.key;
    }
    return null;
  };

  // Stage permissions govern mutations only. A user who can open this
  // tenant-scoped dashboard must still be able to read the complete history.
  const configuredStages = useMemo(() => {
    return ROLE_STAGE_ENTITLEMENTS.flatMap(cat =>
      cat.stages.map(stage => ({
        ...stage,
        category: cat.category
      }))
    );
  }, []);

  const handleStageUpdateSubmit = async () => {
    if (!latestClaim || !selectedStageKey) return;
    
    const selectedStageObj = configuredStages.find(s => s.key === selectedStageKey);
    if (!selectedStageObj) return;

    const currentStageKey = getStageKeyByStatus(latestClaim.status);
    const hasUpdate = currentStageKey === null ||
      canAccess(`stage_permissions:stage_${currentStageKey}:update`);
    if (!hasUpdate) {
      toast.error("Unauthorized: You do not have permission to update this stage");
      return;
    }

    setIsSubmittingStageUpdate(true);
    try {
      const newEventId = `stage-update-${Date.now()}`;
      const newEvent = {
        id: newEventId,
        date: new Date().toISOString(),
        status: selectedStageObj.status as any,
        comment: stageComment || `Stage transitioned to ${selectedStageObj.label} by ${hospitalProfile?.displayName || hospitalProfile?.username || "User"}`,
        type: "status_change" as const,
        userName: hospitalProfile?.displayName || hospitalProfile?.username || "User",
        stageData: {
          documents: uploadedFiles,
          updatedAt: new Date().toISOString(),
          updatedBy: hospitalProfile?.username || "User",
          role: hospitalProfile?.role || "User Role",
          comments: stageComment
        }
      };

      const updates: any = {
        status: selectedStageObj.status,
        updatedAt: new Date().toISOString(),
        history: [newEvent, ...(latestClaim.history || [])]
      };

      await dualStorageService.save('claims', updates, latestClaim.id);

      const updatedClaim: Claim = {
        ...latestClaim,
        ...updates
      };

      onUpdateClaim(updatedClaim);
      toast.success(`Claim stage successfully updated to: ${selectedStageObj.label}`);
      
      setSelectedStageKey("");
      setStageComment("");
      setUploadedFiles([]);
    } catch (error) {
      console.error("Error updating claim stage:", error);
      toast.error("Failed to update claim stage");
    } finally {
      setIsSubmittingStageUpdate(false);
    }
  };

  // Reply Query State
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedClaimForReply, setSelectedClaimForReply] = useState<Claim | null>(null);
  const [replyComment, setReplyComment] = useState('');
  const [replyTransactionDate, setReplyTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isAiDrafterLoading, setIsAiDrafterLoading] = useState(false);
  const [isClinicalAiLoading, setIsClinicalAiLoading] = useState(false);
  const [clinicalInsights, setClinicalInsights] = useState<{ icd10: string[]; summary: string } | null>(null);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [activeClaimForDocs, setActiveClaimForDocs] = useState<Claim | null>(null);
  const [storedClaimDocuments, setStoredClaimDocuments] = useState<Array<{
    documentId: string;
    claimId: string;
    name: string;
    type: string;
    mimeType: string;
    uploadedAt?: string;
  }>>([]);
  const [overrideNextStatus, setOverrideNextStatus] = useState<ClaimStatus | null>(null);

  // Transition Dates Modal State
  const [showTransitionDateModal, setShowTransitionDateModal] = useState(false);
  const [pendingTransitionAction, setPendingTransitionAction] = useState<{ label: string, nextStatus: ClaimStatus, showReply: boolean } | null>(null);
  const [transitionAdmissionDate, setTransitionAdmissionDate] = useState('');
  const [transitionDischargeDate, setTransitionDischargeDate] = useState('');

  const getEnhancementActions = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.ENHANCEMENT:
        return [
          { label: 'Enhancement Approved', nextStatus: ClaimStatus.ENHANCEMENT_APPROVED, showReply: false },
          { label: 'Enhancement Query Raised', nextStatus: ClaimStatus.ENHANCEMENT_QUERY_RAISED, showReply: true },
          { label: 'Enhancement Rejected', nextStatus: ClaimStatus.ENHANCEMENT_REJECTED, showReply: false },
        ];
      case ClaimStatus.ENHANCEMENT_APPROVED:
        return [
          { label: 'Initiate Enhancement', nextStatus: ClaimStatus.ENHANCEMENT, showReply: false },
          { label: 'Discharge Initiated', nextStatus: ClaimStatus.DISCHARGE_INITIATED, showReply: false },
        ];
      case ClaimStatus.ENHANCEMENT_QUERY_RAISED:
        return [
          { label: 'Enhancement Query Resolved', nextStatus: ClaimStatus.ENHANCEMENT_QUERY_RESOLVED, showReply: true },
          { label: 'Enhancement Rejected', nextStatus: ClaimStatus.ENHANCEMENT_REJECTED, showReply: false },
        ];
      case ClaimStatus.ENHANCEMENT_QUERY_RESOLVED:
        return [
          { label: 'Enhancement Approved', nextStatus: ClaimStatus.ENHANCEMENT_APPROVED, showReply: false },
          { label: 'Enhancement Query Raised', nextStatus: ClaimStatus.ENHANCEMENT_QUERY_RAISED, showReply: true },
          { label: 'Enhancement Rejected', nextStatus: ClaimStatus.ENHANCEMENT_REJECTED, showReply: false },
        ];
      case ClaimStatus.ENHANCEMENT_REJECTED:
        return [
          { label: 'Enhancement Initiated', nextStatus: ClaimStatus.ENHANCEMENT, showReply: false },
          { label: 'Discharge Initiated', nextStatus: ClaimStatus.DISCHARGE_INITIATED, showReply: false },
        ];
      default:
        return [];
    }
  };

  const handleEnhancementAction = (action: { label: string, nextStatus: ClaimStatus, showReply: boolean }) => {
    if (!latestClaim) return;

    if (action.showReply) {
      setSelectedClaimForReply(latestClaim);
      setOverrideNextStatus(action.nextStatus);
      setShowReplyModal(true);
    } else if (action.nextStatus === ClaimStatus.ENHANCEMENT || action.nextStatus === ClaimStatus.DISCHARGE_INITIATED) {
      setPendingTransitionAction(action);
      // Pre-populate date states from current claim data
      const currentAdm = latestClaim.admissionDate || latestClaim.formData?.adm_date || '';
      const currentDis = latestClaim.dischargeDate || latestClaim.formData?.discharge_date || latestClaim.formData?.dis_date || '';
      // Strip time if it's formatted as ISO string to prevent datepicker rendering bugs
      setTransitionAdmissionDate(safeFormatYmd(currentAdm) || safeFormatYmd(new Date()));
      setTransitionDischargeDate(safeFormatYmd(currentDis) || safeFormatYmd(new Date()));
      setShowTransitionDateModal(true);
    } else {
      const promptRes = confirm(`Are you sure you want to update the claim status to ${action.label}?`);
      if (!promptRes) return;

      const newEvent = {
        id: `enh-${Date.now()}`,
        date: new Date().toISOString(),
        status: action.nextStatus as any,
        comment: `${action.label} initiated by ${hospitalProfile?.displayName || hospitalProfile?.username || 'Hospital User'}`,
        type: 'status_change' as const,
        userName: hospitalProfile?.displayName || hospitalProfile?.username || 'System',
      };

      const updatedClaim: Claim = {
        ...latestClaim,
        status: action.nextStatus,
        history: [newEvent, ...(latestClaim.history || [])]
      };
      
      onUpdateClaim(updatedClaim);
      toast.success(`Claim moved to ${action.label}`);
    }
  };

  const handleConfirmTransitionWithDates = () => {
    if (!latestClaim || !pendingTransitionAction) return;

    const newEvent = {
      id: `enh-${Date.now()}`,
      date: new Date().toISOString(),
      status: pendingTransitionAction.nextStatus as any,
      comment: `${pendingTransitionAction.label} initiated with Admission Date: ${transitionAdmissionDate || 'N/A'}, Discharge Date: ${transitionDischargeDate || 'N/A'} by ${hospitalProfile?.displayName || hospitalProfile?.username || 'Hospital User'}`,
      type: 'status_change' as const,
      userName: hospitalProfile?.displayName || hospitalProfile?.username || 'System',
    };

    const updatedClaim: Claim = {
      ...latestClaim,
      status: pendingTransitionAction.nextStatus,
      admissionDate: transitionAdmissionDate,
      dischargeDate: transitionDischargeDate || undefined,
      formData: {
        ...(latestClaim.formData || {}),
        adm_date: transitionAdmissionDate,
        discharge_date: transitionDischargeDate,
        dis_date: transitionDischargeDate,
      },
      history: [newEvent, ...(latestClaim.history || [])]
    };

    onUpdateClaim(updatedClaim);
    toast.success(`Claim moved to ${pendingTransitionAction.label} & dates synced!`);
    setShowTransitionDateModal(false);
    setPendingTransitionAction(null);
  };

  const patientClaims = useMemo(() => {
    const activeClaimId = searchParams.get('claimId');
    // Queue users always arrive with a concrete claim ID. Use it as the
    // authoritative anchor so duplicate names and URL formatting can never
    // open an empty or unrelated patient dashboard.
    if (activeClaimId) {
      const requestedClaim = claims.find((claim) => claim.id === activeClaimId);
      if (requestedClaim) {
        const patientId = requestedClaim.patientId;
        const relatedClaims = patientId
          ? claims.filter((claim) => claim.status !== ClaimStatus.DRAFT && claim.patientId === patientId)
          : [requestedClaim];
        return relatedClaims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }
    // First find the anchor claim for this patient name to get identification details
    // Use a case-insensitive search and handle potential URL encoding
    const decodedName = patientName ? decodeURIComponent(patientName).trim() : '';
    const nameToMatch = patientName ? patientName.trim() : '';
    const nonDraftClaims = claims.filter(c => c.status !== ClaimStatus.DRAFT);
    const anchorClaim = nonDraftClaims.find(c => {
      const pName = c.patientName?.trim() || '';
      const fdName = c.formData?.patient_name?.trim() || '';
      return pName.toLowerCase() === decodedName.toLowerCase() ||
             pName.toLowerCase() === nameToMatch.toLowerCase() ||
             fdName.toLowerCase() === decodedName.toLowerCase() ||
             fdName.toLowerCase() === nameToMatch.toLowerCase();
    });
    
    if (!anchorClaim) {
      // If no exact anchor, still try to find claims by name
      const directMatches = nonDraftClaims.filter(c => {
        const pName = c.patientName?.trim() || '';
        const fdName = c.formData?.patient_name?.trim() || '';
        return pName.toLowerCase() === decodedName.toLowerCase() ||
               fdName.toLowerCase() === decodedName.toLowerCase() ||
               pName.toLowerCase() === nameToMatch.toLowerCase() ||
               fdName.toLowerCase() === nameToMatch.toLowerCase();
      });
      if (directMatches.length > 0) return directMatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return [];
    }

    const targetMobile = anchorClaim.formData?.p_contact || anchorClaim.formData?.p_mobile || anchorClaim.formData?.mobileNo || (anchorClaim as any).mobileNo || anchorClaim.formData?.mobile_no;
    const targetPolicy = anchorClaim.policyNumber || anchorClaim.formData?.policyNumber || anchorClaim.formData?.p_policy_no || anchorClaim.formData?.policy_no;
    const targetCardId = anchorClaim.formData?.p_card_id || anchorClaim.formData?.memberId || anchorClaim.formData?.member_id;

    // Identify claims history based on Mobile Number, Policy Number, and Card ID
    const matchingClaims = nonDraftClaims.filter(c => {
      // Match by Name (base)
      const pName = c.patientName?.trim() || '';
      const fdName = c.formData?.patient_name?.trim() || '';
      if (pName.toLowerCase() === decodedName.toLowerCase() || 
          pName.toLowerCase() === nameToMatch.toLowerCase() ||
          fdName.toLowerCase() === decodedName.toLowerCase() ||
          fdName.toLowerCase() === nameToMatch.toLowerCase()) return true;
      
      // Match by Mobile
      if (targetMobile && (
        c.formData?.p_contact === targetMobile || 
        c.formData?.p_mobile === targetMobile || 
        c.formData?.mobileNo === targetMobile || 
        c.formData?.mobile_no === targetMobile
      )) return true;
      
      // Match by Policy
      if (targetPolicy && (
        c.policyNumber === targetPolicy || 
        c.formData?.policyNumber === targetPolicy || 
        c.formData?.p_policy_no === targetPolicy || 
        c.formData?.policy_no === targetPolicy
      )) return true;
      
      // Match by Card ID
      if (targetCardId && (
        c.formData?.p_card_id === targetCardId || 
        c.formData?.memberId === targetCardId || 
        c.formData?.member_id === targetCardId
      )) return true;

      return false;
    });

    // If productFilter is present, we refine to that product's context
    const initialList = productFilter 
      ? matchingClaims.filter(c => c.product === productFilter)
      : matchingClaims;

    const sortedClaims = initialList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const visibleSortedClaims = sortedClaims;

    // Process and enrich claim history in Partner Processing to show/hide Final Assessment Letter (FAL) based on Medical Underwriting approval
    return visibleSortedClaims.map(claim => {
      if (claim.product === Product.PARTNER_PROCESSING) {
        const isApprovedByMedical = claim.isMedicallyApproved || claim.history?.some(h => 
          h.status === ClaimStatus.ASSESSMENT_APPROVED || 
          h.type === 'medical_decision' || 
          String(h.status).toLowerCase().includes('medical approved') ||
          String(h.status).toLowerCase().includes('assessment approved')
        );

        let historyToRender = [...(claim.history || [])];

        if (claim.formData?.falLetterData?.status === 'Submitted' && isApprovedByMedical) {
          const hasFalEvent = historyToRender.some(h => 
            h.status === ClaimStatus.ASSESSMENT_SUBMITTED
          );
          
          if (!hasFalEvent) {
            const falDate = claim.formData.falLetterData.submittedAt || new Date().toISOString();
            // Dynamically inject the FAL submitted event to represent it in the timeline
            historyToRender.unshift({
              id: 'fal-dynamic-event-' + Date.now(),
              date: falDate,
              status: ClaimStatus.ASSESSMENT_SUBMITTED,
              comment: `Final Assessment Letter (FAL) Submitted. Approved Amount: ₹${Number(claim.formData.falLetterData.summary?.totalAssessmentAmount || 0).toLocaleString('en-IN')}`,
              type: 'status_change',
              stageData: {
                falData: claim.formData.falLetterData,
                documents: claim.formData.falLetterData.pdfBase64 ? [
                  {
                    name: `FAL_Letter_${claim.patientName}_${claim.id}.pdf`,
                    data: claim.formData.falLetterData.pdfBase64,
                    mimeType: 'application/pdf'
                  }
                ] : undefined
              }
            });
          }
        } else {
          // If the claim is not approved by medical underwriting yet, or FAL doesn't exist/draft:
          // Filter out any premature FAL submitted events
          historyToRender = historyToRender.filter(h => 
            h.status !== ClaimStatus.ASSESSMENT_SUBMITTED
          );
        }

        return {
          ...claim,
          history: historyToRender
        };
      }
      return claim;
    });
  }, [claims, patientName, productFilter, searchParams]);

  const latestClaim = patientClaims[0];

  const activeClaimId = searchParams.get('claimId');
  const activeClaim = useMemo(() => {
    if (activeClaimId) {
      return patientClaims.find(c => c.id === activeClaimId) || latestClaim;
    }
    return latestClaim;
  }, [patientClaims, activeClaimId, latestClaim]);

  // New-admission documents are stored by the backend rather than embedded in
  // claim JSON. Read that canonical registry for the patient dashboard,
  // including its document sidebar and timeline.
  const patientClaimIds = useMemo(
    () => [...new Set(patientClaims.map((claim) => claim.id).filter(Boolean))].sort().join('|'),
    [patientClaims],
  );

  useEffect(() => {
    let cancelled = false;
    const claimIds = patientClaimIds ? patientClaimIds.split('|') : [];
    if (claimIds.length === 0) {
      setStoredClaimDocuments([]);
      return () => { cancelled = true; };
    }

    Promise.all(claimIds.map(async (claimId) => {
      try {
        const documents = await documentsApi.listClaimDocuments(claimId);
        return documents.map((document: any) => ({
          documentId: String(document.id),
          claimId,
          name: document.file_name || 'Claim document',
          type: document.category || 'Admission document',
          mimeType: document.mime_type || 'application/pdf',
          uploadedAt: document.uploaded_at || document.created_at,
        }));
      } catch (error) {
        console.warn(`Unable to load documents for claim ${claimId}`, error);
        return [];
      }
    })).then((result) => {
      if (!cancelled) setStoredClaimDocuments(result.flat());
    });

    return () => { cancelled = true; };
  }, [patientClaimIds]);

  const getClaimDocuments = (claim: Claim) => {
    const legacyDocuments = [
      ...(claim.history || []).flatMap((historyItem) => [
        ...(historyItem.stageData?.documents || []),
        ...(historyItem.fileData ? [{
          name: historyItem.fileName || 'Stage document',
          data: historyItem.fileData,
          type: 'Stage document',
        }] : []),
      ]),
      ...((claim.formData?.attachedDocs || []).map((document: any) => ({
        name: document.name,
        data: document.data,
        type: document.type || 'Admission document',
        mimeType: document.mimeType,
      }))),
    ];
    const persistedDocuments = storedClaimDocuments.filter((document) => document.claimId === claim.id);
    const seen = new Set<string>();
    return [...legacyDocuments, ...persistedDocuments].filter((document: any) => {
      if (!document.name) return false;
      // A legacy cache entry and the canonical stored record can describe the
      // same upload. Keep one visible entry instead of showing it twice.
      const key = `${document.name}:${document.type || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const activeTemplateName = useMemo(() => {
    if (!activeClaim || !activeClaim.formData) return "Generic IRDAI (Dashed)";
    const isTPA = activeClaim.formData.in_house_processing === "No";
    if (isTPA) {
      const selectedTpa = tpas?.find((t) => t.name === activeClaim.formData.tpa_provider);
      return selectedTpa?.templateName || "Generic IRDAI (Dashed)";
    } else {
      const selectedInsurer = insurers?.find(
        (i) => i.name === activeClaim.formData.insurance_company,
      );
      return selectedInsurer?.templateName || "Generic IRDAI (Dashed)";
    }
  }, [activeClaim, insurers, tpas]);

  const handlePostSubmitChange = (key: string, value: any) => {
    if (!activeClaim) return;
    const currentFormData = activeClaim.formData || {};
    const updatedFormData = { ...currentFormData, [key]: value };

    if (key === "in_house_processing" && value === "Yes") {
      updatedFormData.tpa_provider = updatedFormData.insurance_company;
    }

    const updatedClaim: Claim = {
      ...activeClaim,
      insuranceProvider: key === "insurance_company" ? value : (updatedFormData.insurance_company || activeClaim.insuranceProvider),
      formData: updatedFormData
    };

    onUpdateClaim(updatedClaim);
  };

  const isStarHealth = activeTemplateName === "Star Health Standard";
  const isTataAig = activeTemplateName === "Tata AIG Standard";
  const isHdfcErgo = activeTemplateName === "HDFC ERGO Standard";
  const isIciciLombard = activeTemplateName === "ICICI Lombard Standard";
  const isCareHealth =
    activeTemplateName === "Care Health Insurance Standard";
  const isAdityaBirla =
    activeTemplateName === "Aditya Birla Health Insurance Standard";
  const isBajajAllianz =
    activeTemplateName === "Bajaj Allianz General Insurance Standard";
  const isMediAssist = activeTemplateName === "Medi Assist TPA Standard";
  const isCholaMs = activeTemplateName === "Chola MS Standard";
  const isManipalCigna = activeTemplateName === "Manipal Cigna Standard";
  const isCentralGenerali =
    activeTemplateName === "Central Generali Standard";
  const isGoDigit = activeTemplateName === "Go Digit Standard";
  const isIffcoTokio = activeTemplateName === "IFFCO TOKIO Standard";
  const isMagmaHdi = activeTemplateName === "Magma HDI Standard";
  const isRelianceGeneral =
    activeTemplateName === "Reliance General Standard (2017)";
  const isIndusind = activeTemplateName === "Indusind Standard (2025)";
  const isNivaBupa =
    activeTemplateName === "Niva Bupa Health Insurance Standard";
  const isMdIndia = activeTemplateName === "MDIndia Standard";
  const isMedsave = activeTemplateName === "Medsave Standard";
  const isHealthIndia = activeTemplateName === "HealthIndia Standard";
  const isVidalHealth = activeTemplateName === "Vidal Health Standard";

  const renderedTemplate = useMemo(() => {
    if (!activeClaim) return null;
    const formData = activeClaim.formData || {};
    if (isStarHealth) return <StarHealthTemplate formData={formData} />;
    if (isTataAig) return <TataAigTemplate formData={formData} />;
    if (isHdfcErgo) return <HdfcErgoTemplate formData={formData} />;
    if (isIciciLombard) return <IciciLombardTemplate formData={formData} />;
    if (isCareHealth) return <CareHealthTemplate formData={formData} />;
    if (isAdityaBirla) return <AdityaBirlaTemplate formData={formData} />;
    if (isBajajAllianz) return <BajajAllianzTemplate formData={formData} />;
    if (isMediAssist) return <MediAssistTemplate formData={formData} />;
    if (isCholaMs) return <CholaMsTemplate formData={formData} />;
    if (isManipalCigna) return <ManipalCignaTemplate formData={formData} />;
    if (isCentralGenerali) return <CentralGeneraliTemplate formData={formData} />;
    if (isGoDigit) return <GoDigitTemplate formData={formData} />;
    if (isIffcoTokio) return <IffcoTokioTemplate formData={formData} />;
    if (isMagmaHdi) return <MagmaHdiTemplate formData={formData} />;
    if (isRelianceGeneral) return <RelianceGeneralTemplate formData={formData} />;
    if (isIndusind) return <IndusindTemplate formData={formData} />;
    if (isNivaBupa) return <NivaBupaTemplate formData={formData} />;
    if (isMdIndia) return <MdIndiaTemplate formData={formData} />;
    if (isMedsave) return <MedsaveTemplate formData={formData} />;
    if (isHealthIndia) return <HealthIndiaTemplate formData={formData} />;
    if (isVidalHealth) return <VidalHealthTemplate formData={formData} />;
    return <GenericIrdaiTemplate formData={formData} />;
  }, [activeTemplateName, activeClaim]);

  const isFrozen = useMemo(() => {
    if (!latestClaim) return false;
    // Freeze claim once it moves out of initial registration phases
    return ![ClaimStatus.DRAFT, ClaimStatus.NEW_REGISTRATION].includes(latestClaim.status as any);
  }, [latestClaim]);

  const patientKyp = useMemo(() => {
    if (!latestClaim) return null;
    
    // Find all policies related to this patient/claim
    const relatedPolicies = kypPolicies.filter(p => 
      (p.claimId && patientClaims.some(c => c.id === p.claimId)) || 
      p.policyNumber === latestClaim.policyNumber ||
      p.insuredName === patientName
    );

    if (relatedPolicies.length === 0) return null;

    // Prioritize 'Completed' policies, then 'Accepted', then others
    const priorityOrder: Record<KYPStatus, number> = {
      'KYP Completed': -2,
      'KYP Accepted': -1,
      'Approved': 0,
      'Query Replied': 1,
      'KYP Query Replied': 1.5,
      'Pending (KYP)': 2,
      'KYP Pending Approval': 2.5,
      'Pending': 3,
      'Query Pending': 4,
      'KYP Query Pending': 4.5,
      'Rejected': 5,
      'KYP Rejected': 6
    };

    return [...relatedPolicies].sort((a, b) => 
      (priorityOrder[a.status] ?? 99) - (priorityOrder[b.status] ?? 99)
    )[0];
  }, [patientClaims, kypPolicies, patientName, latestClaim]);

  const kypData = patientKyp;

  const handleReplySubmit = async () => {
    if (!selectedClaimForReply || !replyComment.trim()) {
      toast.error('Please provide a comment for your reply.');
      return;
    }

    setIsSubmittingReply(true);
    
    // Process reply immediately
    const stageData: any = {
        comment: replyComment,
        transactionDate: replyTransactionDate,
    };

    if (replyFiles && replyFiles.length > 0) {
        stageData.documents = replyFiles.map(rf => ({
            name: rf.name,
            type: 'QUERY_REPLY',
            mimeType: rf.type,
        }));
    } else if (replyFileData) {
        stageData.documents = [
            {
                name: replyFileName || 'Reply_Document.pdf',
                data: replyFileData,
                type: replyFileType || 'application/pdf'
            }
        ];
    }

    const newEvent = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      status: ClaimStatus.QUERY_REPLY_DONE as any,
      comment: `Query Reply [Ref Date: ${replyTransactionDate}]: ${replyComment}`,
      type: 'query_reply' as const,
      userName: hospitalProfile?.displayName || hospitalProfile?.username || 'System',
      stageData
    };

    // Route back to sender
    let nextStatus = overrideNextStatus || ClaimStatus.QUERY_REPLY_DONE;
    let assignmentUpdates: any = {};

    if (!overrideNextStatus) {
      if (selectedClaimForReply.queryRaisedBy === 'Medical Underwriting' || selectedClaimForReply.status === ClaimStatus.MEDICAL_QUERY_RAISED) {
        // User update: medical query replied should move to Pending Medical Review or PRE_AUTH_INITIATED if scrutiny is disabled
        const isMedScrutinyOff = hospitalProfile?.valueAddedServices?.medicalScrutinyRequired === false;
        nextStatus = isMedScrutinyOff ? ClaimStatus.PRE_AUTH_INITIATED : ClaimStatus.PENDING_MEDICAL_REVIEW;
        
        // Reset medical assignment so it goes back to pool for scrutiny
        assignmentUpdates = {
            isAccepted: false,
            assignedTo: undefined,
            assignedMedicalUserId: undefined,
            assignedMedicalUserName: undefined
        };
      } else if (selectedClaimForReply.status === ClaimStatus.KYP_QUERY_PENDING) {
        nextStatus = ClaimStatus.KYP_PENDING;
        
        // Also update the KYP policy status back to 'Pending (KYP)' to flow back to CRM Pending bucket
        const targetPolicy = kypPolicies.find(p => p.claimId === selectedClaimForReply.id);
        if (targetPolicy && targetPolicy.id) {
          // The linked claim is the source of truth for this status update.
        }

        setKypPolicies(prev => prev.map(p => {
          if (p.claimId === selectedClaimForReply.id) {
            return { 
              ...p, 
              status: 'Pending (KYP)' as any, 
              lastUpdatedDate: new Date().toISOString(),
              remarks: `[CRM Query Reply ${replyTransactionDate}] ${replyComment.substring(0, 100)}${replyComment.length > 100 ? '...' : ''}`,
              isAccepted: false,
              assignedUserId: undefined,
              assignedUserName: undefined
            };
          }
          return p;
        }));
      }
    }

    const updatedClaim: Claim = {
      ...selectedClaimForReply,
      status: nextStatus,
      history: [newEvent, ...(selectedClaimForReply.history || [])],
      ...assignmentUpdates
    };

    await Promise.resolve(onUpdateClaim(updatedClaim));
    if (replyFiles.length > 0) {
      try {
        await Promise.all(replyFiles.map((replyFile) => documentsApi.uploadClaimFile({
          claimId: selectedClaimForReply.id,
          file: replyFile.file,
          category: 'QUERY_REPLY',
        })));
      } catch (error: any) {
        console.error('Query reply document persistence failed', error);
        toast.error(error?.message || 'The reply was saved, but one or more documents could not be stored.');
      }
    }
    setIsSubmittingReply(false);
    setShowReplyModal(false);
    setReplyComment('');
    setReplyFileData(null);
    setReplyFileName(null);
    setSelectedClaimForReply(null);
    setOverrideNextStatus(null);
    toast.success('Reply submitted successfully.');
  };

  const handleAiDraftReply = async () => {
    if (!selectedClaimForReply) return;
    
    // Find the latest query text from history
    const latestQuery = selectedClaimForReply.history?.find(h => 
      h.status === ClaimStatus.MEDICAL_QUERY_RAISED || 
      h.status === ClaimStatus.DISCHARGE_QUERY_RAISED ||
      h.status === ClaimStatus.CLAIM_UNDER_QUERY ||
      h.status === ClaimStatus.INITIAL_QUERY_PENDING
    );

    const queryText = latestQuery?.comment || "Please provide clinical justification for treatment.";
    
    setIsAiDrafterLoading(true);
    try {
      const draft = await clinicalAiService.draftQueryReply(selectedClaimForReply, queryText);
      setReplyComment(draft);
      toast.success('AI Draft generated. Please review and edit if needed.');
    } catch (error) {
      toast.error('AI Drafting failed. Service might be down.');
    } finally {
      setIsAiDrafterLoading(false);
    }
  };

  const loadClinicalIntelligence = async () => {
    if (!latestClaim) return;
    setIsClinicalAiLoading(true);
    try {
      const icd10 = await clinicalAiService.suggestICD10(latestClaim.diagnosis || 'Undiagnosed');
      setClinicalInsights({
        icd10,
        summary: `Patient ${latestClaim.patientName} is undergoing ${latestClaim.formData?.p_treatment_type || 'treatment'} for ${latestClaim.diagnosis || 'condition'}.`
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsClinicalAiLoading(false);
    }
  };

  useEffect(() => {
    if (latestClaim) {
      loadClinicalIntelligence();
    }
  }, [latestClaim?.id]);

  const rateList = useMemo(() => {
    if (!hospitalProfile?.portalCredentials || !latestClaim) return null;
    const credentials = hospitalProfile.portalCredentials;
    // Historic configurations keyed payer credentials by display name. Names
    // can differ only in case, punctuation, or legal suffixes between an
    // admission and the configuration screen, so never use strict equality
    // alone for a rate-list lookup.
    const normalizePayer = (value: unknown) => String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const findCredential = (provider: unknown) => {
      const normalizedProvider = normalizePayer(provider);
      return credentials.find((credential: any) => (credential.rateListData || credential.rateListStoragePath) && (
        credential.entityId === provider ||
        normalizePayer(credential.entityId) === normalizedProvider
      ));
    };
    
    const psuInsurers = [
      "New India Assurance",
      "National Insurance",
      "Oriental Insurance",
      "United India Insurance"
    ];
    
    // Check if official insurance company is a PSU
    const insuranceCompany = latestClaim.insuranceProvider;
    const tpaProvider = latestClaim.formData?.tpa_provider;
    
    const isPSU = psuInsurers.some(psu => 
      insuranceCompany.toLowerCase().includes(psu.toLowerCase())
    );

    let providerToSearch = '';
    
    // REQUIREMENT: If insurer is a PSU, strictly show the insurer's rate list (ignore TPA)
    if (isPSU) {
       providerToSearch = insuranceCompany;
    } 
    // For other companies, if a TPA is present and not 'Direct Carrier/NA', use TPA
    else if (tpaProvider && tpaProvider !== 'Direct Carrier Logic' && tpaProvider !== 'N/A') {
       providerToSearch = tpaProvider;
    } 
    else {
       providerToSearch = insuranceCompany;
    }
    
    // Find rate list for the determined provider
    const cred = findCredential(providerToSearch);
    
    // If it's NOT a PSU and TPA rate list wasn't found, try fallback to direct insurance
    if (!isPSU && !cred && providerToSearch !== insuranceCompany) {
       return findCredential(insuranceCompany);
    }
    
    return cred;
  }, [hospitalProfile, latestClaim]);

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

  const handlePreview = (name: string, data: string, type: string) => {
    let resolvedMime = type || "application/pdf";
    const nameLower = name.toLowerCase();
    if (nameLower.endsWith(".png")) resolvedMime = "image/png";
    else if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) resolvedMime = "image/jpeg";
    else if (nameLower.endsWith(".pdf")) resolvedMime = "application/pdf";

    let finalUrl = data;
    // The document service returns a short-lived signed Storage URL. It is
    // already browser-readable and must not be treated as base64 data.
    if (data.startsWith('http://') || data.startsWith('https://') || data.startsWith('blob:')) {
      setPreviewFile({ name, data, type: resolvedMime });
      return;
    }
    if (resolvedMime === 'application/pdf' || nameLower.endsWith('.pdf')) {
      finalUrl = createBlobUrl(data, 'application/pdf');
    } else if (resolvedMime.startsWith('image/')) {
      if (!data.startsWith('data:') && !data.startsWith('http') && !data.startsWith('blob:')) {
        finalUrl = `data:${resolvedMime};base64,${data}`;
      }
    }

    setPreviewFile({ name, data: finalUrl, type: resolvedMime });
  };

  const handleDownload = (name: string, data: string, type: string) => {
    const link = document.createElement('a');
    link.href = data.startsWith('http://') || data.startsWith('https://') || data.startsWith('blob:')
      ? data
      : `data:${type};base64,${data}`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openClaimDocument = async (document: any) => {
    try {
      if (document.documentId) {
        const preview = await documentsApi.previewClaimDocument(document.documentId);
        handlePreview(
          preview.file_name || document.name,
          preview.preview_url,
          preview.mime_type || document.mimeType || 'application/pdf',
        );
        return;
      }
      if (document.data) handlePreview(document.name, document.data, document.mimeType || document.type);
    } catch (error) {
      console.error('Unable to preview claim document', error);
      toast.error('Unable to open this document preview');
    }
  };

  const stats = useMemo(() => {
    const total = patientClaims.length;
    const approved = patientClaims.filter(c => c.status.includes('Approved') || c.status === ClaimStatus.COMPLETE_SETTLEMENT).length;
    const pending = patientClaims.filter(c => !c.status.includes('Approved') && !c.status.includes('Rejected') && c.status !== ClaimStatus.COMPLETE_SETTLEMENT).length;
    const rejected = patientClaims.filter(c => c.status.includes('Rejected')).length;
    
    const totalBill = patientClaims.reduce((acc, c) => acc + (Number(c.formData?.dis_total_bill) || c.estimatedCost || 0), 0);
    const totalApproved = patientClaims.reduce((acc, c) => acc + (Number(c.formData?.fin_app_amt) || 0), 0);

    return { total, approved, pending, rejected, totalBill, totalApproved };
  }, [patientClaims]);

  if (!patientName || patientClaims.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <User size={40} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-tight">Patient Not Found</h2>
        <p className="text-sm font-bold mt-2">We couldn't find any records for this patient.</p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-6 flex items-center px-6 py-3 bg-[#000080] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-800 transition-all"
        >
          <ArrowLeft size={16} className="mr-2" /> Go Back
        </button>
      </div>
    );
  }

  const formatUHID = (uhid: string | undefined): string => {
    if (!uhid) return 'N/A';
    return uhid.toUpperCase();
  };

  const handleBack = () => {
    if (source) {
      const decodedSource = decodeURIComponent(source);
      switch (decodedSource) {
        case 'medical': navigate('/medical-underwriting'); break;
        case 'crm': navigate('/crm-dashboard'); break;
        case 'cashless': navigate('/cashless-dashboard'); break;
        case 'directory': navigate('/manage-claims'); break;
        case 'mis': navigate('/mis'); break;
        case 'recon': navigate('/reconciliation-dashboard'); break;
        case 'kyp':
        case 'kyp_dashboard': navigate('/kyp-dashboard'); break;
        case 'partner': 
        case 'Partner Processing': navigate('/reimbursement/partner-processing'); break;
        case 'ICA': navigate('/reimbursement/ica'); break;
        case 'Pre & Post': navigate('/reimbursement/pre-post'); break;
        case 'Know Your Policy': navigate('/reimbursement/know-your-policy'); break;
        case 'Recovery & Recon': navigate('/reimbursement/recovery-recon'); break;
        case 'admin': navigate('/settings'); break;
        default: navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === ClaimStatus.KYP_ACCEPTED || status === ClaimStatus.KYP_COMPLETED || status === ClaimStatus.CLAIM_APPROVED || status === ClaimStatus.MEDICAL_APPROVED || status === ClaimStatus.DISCHARGE_APPROVED) return 'Approved';
    if (status === ClaimStatus.KYP_QUERY_PENDING || status === ClaimStatus.HOSPITAL_QUERY_PENDING || status === ClaimStatus.CLAIM_UNDER_QUERY || status === ClaimStatus.MEDICAL_QUERY_RAISED || status === ClaimStatus.DISCHARGE_QUERY_RAISED) return 'Query Pending';
    if (status === ClaimStatus.KYP_QUERY_REPLIED || status === ClaimStatus.QUERY_REPLY_DONE || status === ClaimStatus.DISCHARGE_QUERY_REPLY) return 'Query Replied';
    if (status === ClaimStatus.KYP_REJECTED || status === ClaimStatus.MEDICAL_REJECTED || status === ClaimStatus.SETTLEMENT_FAILED || status === ClaimStatus.DISCHARGE_REJECTED) return 'Rejected';
    if (status === ClaimStatus.KYP_PENDING_APPROVAL) return 'Pending Approval';
    if (status === ClaimStatus.KYP_PENDING || status === 'Pending (KYP)') return 'Pending';
    return status;
  };

  const getStatusColor = (status: string) => {
    const label = getStatusLabel(status);
    if (label === 'Approved') return 'bg-emerald-100 text-emerald-700';
    if (label === 'Rejected') return 'bg-rose-100 text-rose-700';
    if (label === 'Query Pending') return 'bg-orange-100 text-orange-700';
    if (label === 'Query Replied') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  };

  const LimitCard = ({ label, value, icon: Icon, color }: any) => (
    <div className={`p-6 rounded-3xl border-2 transition-all hover:scale-[1.02] duration-300 ${
      color === 'emerald' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
      color === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-800' :
      'bg-indigo-50 border-indigo-100 text-indigo-800'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${
          color === 'emerald' ? 'bg-emerald-200' :
          color === 'blue' ? 'bg-blue-200' :
          'bg-indigo-200'
        }`}>
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <div className="text-xl font-black">{value || 'N/A'}</div>
    </div>
  );

  const BenefitItemLine = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-xs font-bold text-slate-700">{value || 'N/A'}</span>
    </div>
  );

  const PolicyAnalysisModal = () => {
    const data = latestClaim?.formData || {};
    const kyp = (patientKyp || {}) as any;
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-slate-50 rounded-[2.5rem] shadow-2xl w-full max-w-[90vw] xl:max-w-[1000px] overflow-hidden flex flex-col max-h-[90vh] border border-white/20"
        >
          <div className="px-10 py-8 bg-white border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center space-x-5">
              <div className="w-16 h-16 bg-[#b91c1c] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/20">
                <Sparkles size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Policy Intelligence</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">AI-Extracted Coverage & Limits</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={downloadPolicyPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download PDF
              </button>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="p-4 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all active:scale-95"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div id="policy-intelligence-report" className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sum Insured hidden as per requirement */}
              <div className="hidden">
                <LimitCard label="Sum Insured" value={data.p_sum_insured} icon={Wallet} color="emerald" />
              </div>
              <LimitCard label="Room Rent Limit" value={kyp.roomRentLimit || data.p_room_eligibility} icon={Building} color="blue" />
              <LimitCard label="ICU / ICCU Limit" value={kyp.icuLimit || data.p_icu_eligibility} icon={Activity} color="indigo" />
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-slate-50">
                <ShieldCheck size={20} className="text-[#000080]" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Coverage Specifications</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                <BenefitItemLine label="Co-Pay" value={kyp.copayPercentage !== undefined ? `${kyp.copayPercentage}%` : data.p_copay} />
                <BenefitItemLine label="Sub-Limit" value={kyp.subLimits || data.p_sub_limit} />
                <BenefitItemLine label="Bonus / NCB" value={`${data.p_bonus || 'N/A'} / ${data.p_ncb || 'N/A'}`} />
                <BenefitItemLine label="Restoration" value={data.p_restore_benefit} />
                <BenefitItemLine label="Pre-Hosp" value={kyp.preHospitalizationDays || data.p_pre_hosp} />
                <BenefitItemLine label="Post-Hosp" value={kyp.postHospitalizationDays || data.p_post_hosp} />
                <BenefitItemLine label="Maternity Cover" value={kyp.maternityCover || data.p_maternity} />
                <BenefitItemLine label="Maternity Waiting" value={data.p_maternity_waiting} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-slate-50">
                <BrainCircuit size={20} className="text-indigo-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Waiting Periods & Exclusions</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <BenefitItemLine label="Initial Waiting" value={kyp.initialWaitingPeriod || 'N/A'} />
                <BenefitItemLine label="Ped Waiting Period" value={kyp.pedWaitingPeriod || data.p_ped_waiting} />
                <BenefitItemLine label="Specific Disease Waiting" value={kyp.specificWaitingPeriod || data.p_specific_waiting} />
                <BenefitItemLine label="Waived Off" value={kyp.waivedOff || 'N/A'} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-slate-50">
                <Activity size={20} className="text-rose-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Diagnosis & Intimation</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <BenefitItemLine label="Diagnosis" value={kyp.diagnosisName || kyp.diagnosis || 'N/A'} />
                <BenefitItemLine label="Intimation Number" value={kyp.intimationNumber || 'N/A'} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-slate-50">
                <FileText size={20} className="text-slate-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Case Remarks</h3>
              </div>
              <BenefitItemLine label="Remarks" value={kyp.remarks || 'N/A'} />
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  if (viewMode === 'cashless-document' && activeClaim) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20 mt-6 animate-in fade-in duration-500">
        <div className="flex flex-col space-y-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 no-print">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                const s = searchParams.get('source');
                if (s === 'cashless') {
                  navigate('/cashless-dashboard');
                } else {
                  handleBack();
                }
              }}
              className="flex items-center text-slate-500 hover:text-slate-800 font-bold uppercase text-[10px] tracking-widest group"
            >
              <ArrowLeft
                size={16}
                className="mr-2 group-hover:-translate-x-1 transition-transform"
              />{" "}
              Back to Hub
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  if (activeClaim) {
                    navigate(`/process-claim/${activeClaim.id}${source ? `?source=${encodeURIComponent(source)}` : '?source=cashless'}`);
                  } else {
                    setViewMode('interactive');
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('view');
                    navigate(`/patient-dashboard/${encodeURIComponent(patientName || activeClaim?.patientName || '')}?${newParams.toString()}`, { replace: true });
                  }
                }}
                className="px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center hover:bg-blue-50 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowUpRight size={16} className="mr-2" /> View Patient Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="px-8 py-3 bg-[#000080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-blue-800 transition-all active:scale-95 cursor-pointer"
              >
                <Download size={16} className="mr-2" /> Download PDF Record
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch justify-between gap-6">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Insurance Company
              </label>
              <div className="relative group">
                <select
                  value={activeClaim?.formData?.insurance_company || ''}
                  onChange={(e) =>
                    handlePostSubmitChange("insurance_company", e.target.value)
                  }
                  className="w-full h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                >
                  {(insurers || []).map((i) => (
                    <option key={i.id} value={i.name}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500"
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Processing Mode
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() =>
                    handlePostSubmitChange("in_house_processing", "Yes")
                  }
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border ${
                    activeClaim?.formData?.in_house_processing === "Yes"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  In-House
                </button>
                <button
                  onClick={() =>
                    handlePostSubmitChange("in_house_processing", "No")
                  }
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border ${
                    activeClaim?.formData?.in_house_processing === "No"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  TPA
                </button>
              </div>
              {activeClaim?.formData?.in_house_processing === "No" && (
                <div className="relative group">
                  <select
                    value={activeClaim?.formData?.tpa_provider || ''}
                    onChange={(e) =>
                      handlePostSubmitChange("tpa_provider", e.target.value)
                    }
                    className="w-full h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select TPA...</option>
                    {(tpas || []).map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white print:block print:w-full print:h-full print:overflow-visible">
          {renderedTemplate}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <AnimatePresence>
        {isPolicyModalOpen && <PolicyAnalysisModal />}
      </AnimatePresence>
      {/* ACTION BANNER FOR RECOVERY & RECON NEXT STEP */}
      {((latestClaim.product === Product.RECOVERY_RECONCILIATION) ||
        latestClaim.status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE ||
        latestClaim.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE) && 
       (latestClaim.status === ClaimStatus.COMPLETE_SETTLEMENT || 
        latestClaim.status === ClaimStatus.ACCOUNT_RECONCILIATION ||
        latestClaim.status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE ||
        latestClaim.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE) && (
        <AccountReconciliationPanel 
          claim={latestClaim} 
          onUpdate={onUpdateClaim} 
          source={source} 
        />
      )}


      {/* ACTION BANNER FOR POLICY AUDIT TEAM QUERY */}
      {(latestClaim.status === ClaimStatus.KYP_QUERY_PENDING) && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-[2.5rem] p-4 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Policy Audit Team Action Required</h3>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">Policy Audit Team has raised a query for this case. Please reply back.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedClaimForReply(latestClaim);
              setShowReplyModal(true);
            }}
            className="flex items-center gap-3 px-8 py-4 bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg active:scale-95 group relative z-10"
          >
            <MessageSquare size={18} /> Policy Audit Team Query Reply
          </button>
        </div>
      )}

      {/* ACTION BANNER FOR MEDICAL QUERY */}
      {(latestClaim.status === ClaimStatus.MEDICAL_QUERY_RAISED) && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-[2.5rem] p-4 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Stethoscope size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Medical Query Action Required</h3>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Medical Underwriting has raised a query. Please provide medical justification.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedClaimForReply(latestClaim);
              setShowReplyModal(true);
            }}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 group relative z-10"
          >
            <MessageSquare size={18} /> Medical Query Reply
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleBack}
            className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-20 h-20 bg-gradient-to-br from-[#000080] to-blue-600 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-100">
            {patientName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                {patientName}
              </h1>
              <button
                onClick={() => setIsPolicyModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#b91c1c] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-800 transition-all shadow-lg active:scale-95"
              >
                <Sparkles size={14} /> KNOW YOUR POLICY
              </button>
              {(latestClaim.status === ClaimStatus.KYP_QUERY_PENDING) && (
                <button 
                  onClick={() => {
                    setSelectedClaimForReply(latestClaim);
                    setShowReplyModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg active:scale-95"
                >
                  <MessageSquare size={14} /> KYP Query Reply
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                {/* Policy Number Hidden */}
              </span>
              <span className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center">
                <ShieldCheck size={14} className="mr-1.5" /> {String(latestClaim.insuranceProvider || '')}
              </span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Building2 size={14} className="mr-1.5" /> TPA: {String(latestClaim.formData?.tpa_provider || 'Direct')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {(latestClaim.status === ClaimStatus.KYP_QUERY_PENDING || latestClaim.status === ClaimStatus.HOSPITAL_QUERY_PENDING || latestClaim.status === ClaimStatus.CLAIM_UNDER_QUERY) && (
            <button 
              onClick={() => {
                setSelectedClaimForReply(latestClaim);
                setShowReplyModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 transition-all"
            >
              <MessageSquare size={16} /> KYP Query Reply
            </button>
          )}

          {patientKyp && patientKyp.status === 'Approved' && (
            <button 
              onClick={() => {
                setSelectedKyp(patientKyp);
                setShowKypModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#8B0000] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#660000] transition-all shadow-lg active:scale-95 transition-all"
            >
              <Eye size={16} /> Preview KYP
            </button>
          )}

          {activeClaim && (
            <button 
              onClick={() => setViewMode('cashless-document')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <FileText size={16} /> View Cashless Request
            </button>
          )}

          {patientKyp && !(patientKyp.status === 'Approved' || patientKyp.status === 'KYP Accepted' || patientKyp.status === 'KYP Completed') && (
            <div className="flex flex-col items-end">
              <div className={`px-6 py-3 rounded-2xl text-lg font-black uppercase tracking-widest border-2 shadow-sm ${
                patientKyp.status.includes('Query') ? 'bg-orange-500 text-white border-orange-400' :
                patientKyp.status.includes('Rejected') ? 'bg-rose-500 text-white border-rose-400' :
                'bg-amber-400 text-slate-900 border-amber-300'
              }`}>
                {patientKyp.status === 'KYP Query Pending' || patientKyp.status === 'Query Pending' ? 'Query Pending' : 
                 patientKyp.status === 'KYP Query Replied' || patientKyp.status === 'Query Replied' ? 'Query Replied' :
                 (patientKyp.status === 'KYP Rejected' || patientKyp.status === 'Rejected') ? 'Rejected' :
                 (patientKyp.status === 'Pending (KYP)' || patientKyp.status === 'Pending') ? 'Pending' :
                 patientKyp.status}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FINAL ASSESSMENT LETTER READY BANNER */}
      {latestClaim?.formData?.falLetterData?.status === 'Submitted' && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="flex items-center gap-6 relative z-10 animate-in fade-in slide-in-from-left duration-500">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <FileCheck size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Final Assessment Letter Ready</h3>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                Approved Amount: <span className="text-sm font-black text-emerald-700">₹{Number(latestClaim.formData.falLetterData.summary?.totalAssessmentAmount || 0).toLocaleString('en-IN')}</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Your Bima Garage branded Final Assessment Letter has been successfully processed. You can preview or download your copy below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10 w-full md:w-auto mt-4 md:mt-0 shrink-0">
            {latestClaim.formData.falLetterData.pdfBase64 ? (
              <>
                <button 
                  onClick={() => {
                    handlePreview(
                      `FAL_Letter_${latestClaim.patientName}_${latestClaim.id}.pdf`,
                      latestClaim.formData.falLetterData!.pdfBase64!,
                      'application/pdf'
                    );
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-[#000080] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                >
                  <Eye size={18} /> View Letter
                </button>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    let href = latestClaim.formData.falLetterData!.pdfBase64!;
                    if (!href.startsWith('data:')) {
                      href = `data:application/pdf;base64,${href}`;
                    }
                    link.href = href;
                    link.download = `FAL_Letter_${latestClaim.patientName}_${latestClaim.id}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success("FAL PDF download initiated.");
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-white text-emerald-600 border border-emerald-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Download size={18} /> Download
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">Pre-rendering PDF... Please refresh dashboard.</span>
            )}
          </div>
        </div>
      )}



      {/* STATS GRID */}
      {isKYPView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Sum Insured and Balance SI Hidden */}
          <div className="hidden">
            <StatCard label="Sum Insured" value={`₹${(Number(patientKyp?.sumInsured) || 0).toLocaleString('en-IN')}`} icon={ShieldCheck} color="blue" />
            <StatCard label="Balance SI" value={`₹${(Number(patientKyp?.balanceSI) || 0).toLocaleString('en-IN')}`} icon={CheckCircle2} color="emerald" />
          </div>
          <StatCard label="Room Rent" value={patientKyp?.roomRentLimit || 'As per Policy'} icon={BedDouble} color="blue" />
          <StatCard label="ICU Limit" value={patientKyp?.icuLimit || 'No Limit'} icon={HeartPulse} color="rose" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Claims" value={stats.total.toString()} icon={FileText} color="blue" />
          <StatCard label="Approved" value={stats.approved.toString()} icon={CheckCircle2} color="emerald" />
          <StatCard label="Pending" value={stats.pending.toString()} icon={Clock} color="amber" />
          <StatCard label="Total Bill Value" value={`₹${stats.totalBill.toLocaleString('en-IN')}`} icon={Activity} color="indigo" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CLAIMS HISTORY & TIMELINE */}
        <div className="lg:col-span-2 space-y-8">
          {isKYPView && patientKyp && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-lg shadow-blue-50/50">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg">
                      <ShieldCheck size={20} />
                    </div>
                    Captured Policy Details
                  </h2>
                  <Link 
                    to={`/kyp-dashboard?claimId=${latestClaim.id}`}
                    className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    View Full Analysis
                  </Link>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Policy Number & Sum Insured Hidden */}
                  <DetailBox label="Room Rent Limit" value={patientKyp.roomRentLimit || 'As per Policy'} />
                   <DetailBox label="Co-Pay" value={patientKyp.copayPercentage ? `${patientKyp.copayPercentage}%` : 'No Co-pay'} />
                  <DetailBox label="Maternity Cover" value={patientKyp.maternityCover || 'N/A'} />
                  <DetailBox label="Ambulance Cover" value={patientKyp.ambulanceCover || 'N/A'} />
               </div>

               {/* Actions for KYP - Hidden as per requirements, strictly controlled via KYP processing form */}
               <div className="mt-8 flex flex-wrap gap-4">
               </div>

               {/* KYP Query Reply Transitions - Hidden as per requirement */}
               {/* latestClaim.history?.some(h => (h.status as any) === ClaimStatus.KYP_QUERY_REPLIED || (h.status as any) === ClaimStatus.QUERY_REPLY_DONE || (h.status as any) === 'KYP Query Replied' || (h.status as any) === 'Query Replied') && (
                 <div className="mt-12 pt-12 border-t border-slate-50">
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <MessageSquare size={16} className="text-blue-500" />
                     KYP Query Reply Transitions
                   </h3>
                   <div className="overflow-hidden bg-slate-50/50 rounded-2xl border border-slate-100 mb-8">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-100/50">
                           <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-wider">Transaction Date</th>
                           <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-wider">Comment / Justification</th>
                           <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-wider">Documents</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {latestClaim.history
                           .filter(h => (h.status as any) === ClaimStatus.KYP_QUERY_REPLIED || (h.status as any) === ClaimStatus.QUERY_REPLY_DONE || (h.status as any) === 'KYP Query Replied' || (h.status as any) === 'Query Replied')
                           .map((h) => (
                             <tr key={h.id} className="hover:bg-white transition-colors">
                               <td className="py-3 px-4 text-[10px] font-bold text-slate-600">
                                 {h.comment?.includes('[Ref Date:') ? h.comment.split('[Ref Date:')[1].split(']')[0] : formatDate(h.date)}
                               </td>
                               <td className="py-3 px-4 text-[10px] font-medium text-slate-500">
                                 {h.comment?.includes(']: ') ? h.comment.split(']: ')[1] : h.comment}
                               </td>
                               <td className="py-3 px-4">
                                 <div className="flex flex-wrap gap-1">
                                   {h.stageData?.documents?.map((doc: any, dIdx: number) => (
                                     <div key={dIdx} className="flex items-center gap-1 px-1.5 py-0.5 bg-white text-blue-600 rounded border border-blue-50 text-[8px] font-bold">
                                       <Paperclip size={8} />
                                       {doc.name}
                                     </div>
                                   ))}
                                   {(!h.stageData?.documents || h.stageData.documents.length === 0) && (
                                     <span className="text-[8px] text-slate-300 font-bold">NO FILE</span>
                                   )}
                                 </div>
                               </td>
                             </tr>
                           ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               ) */}

               {/* Timeline for KYP */}
               <div className="mt-12 pt-12 border-t border-slate-50">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History size={16} className="text-blue-500" />
                    Policy Processing Timeline
                  </h3>
                  <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                    <TimelineItem 
                      title="Policy Registered" 
                      date={patientKyp.createdAt} 
                      status="COMPLETED"
                      comment="KYP Case successfully registered in system."
                      type="success"
                    />
                    {patientKyp.status === 'Query Pending' && (
                      <TimelineItem 
                        title="Query Raised" 
                        date={patientKyp.lastUpdatedDate} 
                        status="ACTION REQUIRED"
                        comment={patientKyp.remarks || "Further supporting documents required for policy verification."}
                        type="warning"
                        action={
                          <button 
                            onClick={() => {
                              setSelectedClaimForReply(latestClaim);
                              setShowReplyModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1 bg-[#000080] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm active:scale-95 ml-auto"
                          >
                            <MessageSquare size={12} /> KYP Query Reply
                          </button>
                        }
                      />
                    )}
                    {patientKyp.status === 'Query Replied' && (
                      <TimelineItem 
                        title="Query Replied" 
                        date={patientKyp.lastUpdatedDate} 
                        status="IN REVIEW"
                        comment="Response submitted by hospital user. Pending final approval."
                        type="info"
                      />
                    )}
                    {patientKyp.status === 'Approved' && (
                      <TimelineItem 
                        title="Policy Approved" 
                        date={patientKyp.lastUpdatedDate} 
                        status="COMPLETED"
                        comment="All policy benefits verified and approved for processing."
                        type="success"
                      />
                    )}
                    {patientKyp.status === 'Rejected' && (
                      <TimelineItem 
                        title="Policy Rejected" 
                        date={patientKyp.lastUpdatedDate} 
                        status="REJECTED"
                        comment={patientKyp.remarks || "Policy benefits could not be verified based on provided documents."}
                        type="danger"
                      />
                    )}
                  </div>
               </div>
            </div>
          )}

          {!isKYPView && (
            <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Claims History</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{patientClaims.length} Records Found</span>
              </div>
            </div>

            <div className="space-y-4">
              {patientClaims.map((claim) => (
                <div key={claim.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                  <Link 
                    to={`/process-claim/${claim.id}${source ? `?source=${encodeURIComponent(source)}` : ''}`}
                    className="block p-6 hover:bg-slate-50/80 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${
                          claim.status.includes('Approved') ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' :
                          claim.status.includes('Rejected') ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' :
                          'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                        }`}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                              {String(claim.formData?.insurer_claim_no || claim.formData?.claim_id || claim.id || '')}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${getStatusColor(claim.status)}`}>
                              {getStatusLabel(claim.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center"><Calendar size={12} className="mr-1" /> {formatDate(claim.admissionDate)}</span>
                <span className="flex items-center"><Building2 size={12} className="mr-1" /> {String(claim.insuranceProvider || '')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-6">
                        <div className="hidden sm:block">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Bill</p>
                          <p className="text-lg font-black text-slate-800">₹{(Number(claim.formData?.dis_total_bill) || claim.estimatedCost || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </Link>

                  {/* Timeline for this claim */}
                  {claim.history && claim.history.length > 0 && (
                    <div className={`px-8 pt-2 border-t border-slate-50 bg-slate-50/30 transition-all duration-300 ${expandedTimelines[claim.id] ? 'pb-8' : 'pb-3'}`}>
                      <div 
                        onClick={() => {
                          setExpandedTimelines(prev => ({
                            ...prev,
                            [claim.id]: !prev[claim.id]
                          }));
                        }}
                        className="flex items-center justify-between cursor-pointer select-none py-1 hover:text-blue-600 group/timeline"
                      >
                        <div className="flex items-center gap-2">
                           <History size={14} className="text-slate-400 group-hover/timeline:text-blue-500 transition-colors" />
                           <span className="text-[10px] font-black text-slate-400 group-hover/timeline:text-blue-600 uppercase tracking-widest transition-colors">Timeline</span>
                           {!expandedTimelines[claim.id] && (
                             <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-2 uppercase tracking-wide">
                               {claim.history.length} Event{claim.history.length > 1 ? 's' : ''} • Click to expand
                             </span>
                           )}
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTimelines(prev => ({
                              ...prev,
                              [claim.id]: !prev[claim.id]
                            }));
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-slate-600"
                        >
                          {expandedTimelines[claim.id] ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        </button>
                      </div>
                      {expandedTimelines[claim.id] && (
                        <div className="mt-4 space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                          {getClaimDocuments(claim).length > 0 && (
                            <div className="relative pl-8">
                              <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 bg-indigo-600">
                                <Paperclip size={10} className="text-white" />
                              </div>
                              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                                <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-2">Admission documents</p>
                                <div className="flex flex-wrap gap-2">
                                  {getClaimDocuments(claim).map((document: any, documentIndex: number) => (
                                    <button
                                      key={`${document.documentId || document.name}-${documentIndex}`}
                                      onClick={() => openClaimDocument(document)}
                                      className="flex items-center gap-1.5 bg-[#000080] text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-sm"
                                    >
                                      <Eye size={11} /> {document.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {claim.history
                            .filter(event => {
                              const isProductAllowed = !(claim.product === Product.RECOVERY_RECONCILIATION && (event.status === ClaimStatus.SETTLED || event.status === ClaimStatus.COMPLETE_SETTLEMENT));
                              return isProductAllowed;
                            })
                            .map((event, idx) => (
                            <div key={event.id} className="relative pl-8">
                              <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
                                event.stageData?.isKypEvent ? 'bg-indigo-600' :
                                event.type === 'admission' ? 'bg-blue-500' : 
                                (event.status.includes('Approved') || event.status === ClaimStatus.ASSESSMENT_SUBMITTED) ? 'bg-emerald-500' : 
                                event.status.includes('Rejected') ? 'bg-rose-500' : 'bg-amber-500'
                              }`}>
                                {event.stageData?.isKypEvent ? <Sparkles size={10} className="text-white" /> : 
                                 event.type === 'admission' ? <CheckCircle size={10} className="text-white" /> : <Clock size={10} className="text-white" />}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{event.status === ClaimStatus.ASSESSMENT_SUBMITTED ? 'Final Assessment Letter Ready' : String(event.status || '')}</p>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                      {formatDateTime(event.date)}
                                    </span>
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100 rounded flex items-center gap-1 uppercase tracking-widest">
                                      <Clock size={10} /> TAT: {formatTimelineEventTAT(event, claim.history[idx + 1])}
                                    </span>
                                    {(() => {
                                      if (!event.stageData) return null;
                                      const statusLower = String(event.status || '').toLowerCase();
                                      const isTargetStatusForFinalApproval = 
                                        statusLower.includes('file dispatched') || 
                                        statusLower.includes('under process') || 
                                        statusLower.includes('claim approved');

                                      let amountData = null;

                                      if (isTargetStatusForFinalApproval) {
                                        const amt = event.stageData.fin_app_amt || 
                                                    claim.formData?.fin_app_amt || 
                                                    event.stageData.approved_amt || 
                                                    claim.formData?.approved_amt || 
                                                    claim.formData?.pre_auth_app_amt || 0;
                                        if (amt !== undefined && amt !== null) {
                                          amountData = {
                                            label: 'Final Approval Amt',
                                            amount: amt,
                                            color: 'text-emerald-600',
                                            bg: 'bg-emerald-50',
                                            border: 'border-emerald-100'
                                          };
                                        }
                                      }

                                      if (!amountData) {
                                        if (event.status === ClaimStatus.BANK_RECONCILIATION_COMPLETED || statusLower.includes('bank reconciliation completed')) {
                                          const totalSettledAmt = event.stageData.set_incl_tds || 
                                                                  claim.formData?.set_incl_tds || 
                                                                  event.stageData.set_net_settled || 
                                                                  claim.formData?.set_net_settled || 0;
                                          amountData = {
                                            label: 'Total Settled Amt',
                                            amount: totalSettledAmt,
                                            color: 'text-sky-600',
                                            bg: 'bg-sky-50',
                                            border: 'border-sky-100'
                                          };
                                        } else if (event.stageData.fin_app_amt) {
                                          amountData = { 
                                            label: 'Approved', 
                                            amount: event.stageData.fin_app_amt, 
                                            color: 'text-emerald-600', 
                                            bg: 'bg-emerald-50', 
                                            border: 'border-emerald-100' 
                                          };
                                        } else if (event.stageData.dis_total_bill) {
                                          amountData = { 
                                            label: 'Final Bill Amount', 
                                            amount: event.stageData.dis_total_bill, 
                                            color: 'text-slate-800', 
                                            bg: 'bg-slate-50', 
                                            border: 'border-slate-100'
                                          };
                                        } else if (event.stageData.pre_auth_app_amt) {
                                          amountData = { 
                                            label: 'Approved', 
                                            amount: event.stageData.pre_auth_app_amt, 
                                            color: 'text-blue-600', 
                                            bg: 'bg-blue-50', 
                                            border: 'border-blue-100' 
                                          };
                                        } else if (event.stageData.enh_app_amt) {
                                          amountData = { 
                                            label: 'Approved', 
                                            amount: event.stageData.enh_app_amt, 
                                            color: 'text-indigo-600', 
                                            bg: 'bg-indigo-50', 
                                            border: 'border-indigo-100' 
                                          };
                                        } else if (event.stageData.requested_amt) {
                                          amountData = { 
                                            label: 'Requested', 
                                            amount: event.stageData.requested_amt, 
                                            color: 'text-slate-600', 
                                            bg: 'bg-slate-50', 
                                            border: 'border-slate-100' 
                                          };
                                        }
                                      }
                                      
                                      if (!amountData) return null;
                                      
                                      return (
                                        <span className={`text-[10px] font-black ${amountData.color} ${amountData.bg} px-2 py-0.5 rounded border ${amountData.border}`}>
                                          {amountData.label}: ₹{Number(amountData.amount).toLocaleString('en-IN')}
                                        </span>
                                      );
                                    })()}
                                    {(event.status === ClaimStatus.MEDICAL_QUERY_RAISED || event.status === ClaimStatus.MEDICAL_REJECTED || event.status === ClaimStatus.KYP_QUERY_PENDING) && idx === 0 && (
                                      <button 
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          
                                          setSelectedClaimForReply(claim);
                                          setShowReplyModal(true);
                                        }}
                                        className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm"
                                      >
                                        <MessageSquare size={10} /> Reply {event.status === ClaimStatus.MEDICAL_QUERY_RAISED ? 'Query' : event.status === ClaimStatus.KYP_QUERY_PENDING ? 'KYP Query' : 'Reject'}
                                      </button>
                                    )}
                                  </div>
                                  {(() => {
                                    const commentText = (() => {
                                      if (event.stageData) {
                                        const keys = ['pre_auth_app_comment', 'query_text', 'pre_auth_rej_comment', 'enh_comment', 'enh_rej_comment', 'dis_query_comment', 'dis_rej_comment', 'reopen_reason', 'deduction_comment', 'comment'];
                                        for (const key of keys) {
                                          const val = event.stageData[key];
                                          if (val) {
                                            if (typeof val === 'object' && val.seconds !== undefined) return formatDate(val);
                                            return String(val);
                                          }
                                        }
                                      }
                                      return event.comment || 'Process updated.';
                                    })();

                                    const isMedicalUnderwritingEvent = 
                                      event.type === 'medical_decision' ||
                                      event.status === ClaimStatus.MEDICAL_APPROVED || 
                                      event.status === ClaimStatus.MEDICAL_QUERY_RAISED ||
                                      event.status === ClaimStatus.MEDICAL_REJECTED ||
                                      event.status === ClaimStatus.PENDING_MEDICAL_REVIEW ||
                                      String(event.status).toLowerCase().includes('medical') ||
                                      (commentText && (
                                        commentText.toLowerCase().includes('medical underwriting') || 
                                        commentText.toLowerCase().includes('medical scrutiny') ||
                                        commentText.toLowerCase().includes('medical team') ||
                                        commentText.toLowerCase().includes('clinically approved') ||
                                        commentText.toLowerCase().includes('clinical review') ||
                                        commentText.toLowerCase().includes('remarks:')
                                      ));
                                    
                                    return (
                                      <p className={`text-[11px] mt-0.5 italic ${isMedicalUnderwritingEvent ? 'font-black text-slate-900' : 'font-normal text-slate-500'}`}>
                                        "{commentText}"
                                      </p>
                                    );
                                  })()}
                                  {event.userName && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                                        Action By: {event.userName}
                                      </p>
                                      {event.userRole && (
                                        <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                          {event.userRole}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {(() => {
                                    const isSettlementStatus = [
                                      ClaimStatus.COMPLETE_SETTLEMENT,
                                      ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
                                      ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
                                    ].includes(event.status as ClaimStatus) || 
                                    String(event.status).toLowerCase().includes('settle') ||
                                    String(event.status).toLowerCase().includes('settlement');

                                    if (isSettlementStatus && event.stageData) {
                                      return (
                                        <div className="mt-2 p-3 bg-[#000080]/5 rounded-xl border border-blue-100 max-w-md animate-in fade-in duration-300">
                                          <p className="text-[10px] font-black text-[#000080] uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <IndianRupee size={10} /> Settlement Details
                                          </p>
                                          <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-600 mt-1.5 pt-1.5 border-t border-[#000080]/5">
                                            <div>
                                              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">UTR Number</span>
                                              <span className="font-mono text-slate-800 font-bold">{event.stageData.utr_number || 'N/A'}</span>
                                            </div>
                                            <div>
                                              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">UTR Date</span>
                                              <span className="text-slate-700">{event.stageData.utr_date || event.stageData.settlement_date || 'N/A'}</span>
                                            </div>
                                            <div>
                                              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Settled Amt</span>
                                              <span className="text-emerald-700 font-black">₹{Number(event.stageData.set_incl_tds || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {event.stageData?.isKypEvent && event.stageData?.kypData && (
                                    <div className="mt-3 flex items-center gap-2">
                                      <button 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedKyp(event.stageData.kypData);
                                          setShowKypModal(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                                      >
                                        <Eye size={12} /> View KYP
                                      </button>
                                    </div>
                                  )}
                                  
                                  {event.stageData?.courier_dispatch_date && (
                                    <div className="mt-2 bg-white/50 border border-slate-100 rounded-lg p-2 flex items-center gap-2 max-w-fit">
                                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                                        <Calendar size={12} />
                                      </div>
                                      <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">File Dispatch Date</p>
                                        <p className="text-[10px] font-bold text-indigo-600">
                                          {typeof event.stageData.courier_dispatch_date === 'object' && event.stageData.courier_dispatch_date.seconds !== undefined 
                                            ? formatDate(event.stageData.courier_dispatch_date) 
                                            : String(event.stageData.courier_dispatch_date)}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {event.status === ClaimStatus.ASSESSMENT_SUBMITTED && event.stageData?.falData?.summary && (
                                    <div className="mt-3 p-3 bg-white border border-slate-200 rounded-2xl max-w-md space-y-2 shadow-sm animate-in fade-in duration-300">
                                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <FileCheck size={10} /> Final Assessment Details
                                      </p>
                                      <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-600 pt-1.5 border-t border-slate-100">
                                        <div>
                                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tight">Total Bill Amount</span>
                                          <span className="text-slate-800 font-bold">₹{Number(event.stageData.falData.summary.totalBillAmount || 0).toLocaleString()}</span>
                                        </div>
                                        <div>
                                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tight">Total Deductions</span>
                                          <span className="text-rose-600 font-bold">₹{Number(event.stageData.falData.summary.otherDeductions || 0).toLocaleString()}</span>
                                        </div>
                                        <div>
                                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tight">Admissible Amount</span>
                                          <span className="text-emerald-600 font-bold">₹{Number(event.stageData.falData.summary.admissibleAmount || 0).toLocaleString()}</span>
                                        </div>
                                        <div>
                                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tight">Total Assessment Amt</span>
                                          <span className="text-[#000080] font-black">₹{Number(event.stageData.falData.summary.totalAssessmentAmount || 0).toLocaleString()}</span>
                                        </div>
                                      </div>
                                      
                                      {(event.stageData?.falData?.pdfBase64 || event.fileData) && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const pdfData = event.stageData?.falData?.pdfBase64 || event.fileData;
                                              handlePreview(
                                                event.fileName || `FAL_Letter_${claim.patientName}_${claim.id}.pdf`,
                                                pdfData,
                                                "application/pdf"
                                              );
                                            }}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
                                          >
                                            <Eye size={12} /> View Letter
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Documents for this event */}
                                  {event.stageData?.documents && event.stageData.documents.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {event.stageData.documents.map((doc: any, dIdx: number) => (
                                        <button key={dIdx} 
                                      onClick={() => openClaimDocument(doc)}
                                      className="flex items-center gap-1.5 bg-[#000080] text-white px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all cursor-pointer shadow-sm">
                                      <Eye size={12} className="shrink-0" />
                                      <span>{event.stageData.documents.length > 1 ? `VIEW (${dIdx + 1})` : "VIEW"}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* PATIENT INFO & DOCUMENTS SIDEBAR */}
        <div className="space-y-6">

          {/* Embedded KYP Section for Partner Processing */}
          {source === 'Partner Processing' && (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-100 shadow-lg shadow-indigo-50/50">
              <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center">
                     <ShieldCheck size={18} className="mr-2 text-indigo-600" /> Know Your Policy Summary
                   </h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-6">
                     {kypData?.status === 'KYP Completed' ? 'CRM Verified Policy Report' : 'AI-Extracted Policy Intelligence'}
                   </p>
                 </div>
                 {kypData && (
                    <button 
                      onClick={() => setShowKypModal(true)}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      title="Expand to Full View"
                    >
                      <Maximize2 size={16} />
                    </button>
                 )}
              </div>
              
              <div className="space-y-6">
                {kypData?.status === 'KYP Completed' ? (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                      <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mr-2"></span>
                        9-Section Policy Preview
                      </p>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1 p-2 bg-white rounded-xl border border-indigo-50 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Section 1: Basic Details</p>
                           <p className="text-[10px] font-bold text-slate-700">{kypData.productName || 'N/A'} | {kypData.policyType}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                           <div className="p-2 bg-white rounded-xl border border-indigo-50 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SI / Balance</p>
                              <p className="text-[10px] font-bold text-slate-700">₹{kypData.sumInsured?.toLocaleString()} / ₹{kypData.balanceSI?.toLocaleString()}</p>
                           </div>
                           <div className="p-2 bg-white rounded-xl border border-indigo-50 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Room Limit</p>
                              <p className="text-[10px] font-bold text-slate-700 truncate">{kypData.roomRentLimit || 'N/A'}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                           <div className="p-2 bg-white rounded-xl border border-indigo-50 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Waiting Period</p>
                              <p className="text-[10px] font-bold text-slate-700 truncate">{kypData.pedWaitingPeriod || 'N/A'}</p>
                           </div>
                           <div className="p-2 bg-white rounded-xl border border-indigo-50 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Co-Pay / Sub-Limits</p>
                              <p className="text-[10px] font-bold text-slate-700 truncate">{kypData.copayPercentage}% | {kypData.subLimits || 'None'}</p>
                           </div>
                        </div>

                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                           <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[7px] font-black uppercase opacity-70">CRM REMARKS</p>
                                <p className="text-[9px] font-bold italic truncate max-w-[180px]">{kypData.remarks || 'No verified remarks provided.'}</p>
                              </div>
                              <CheckCircle2 size={12} className="opacity-80" />
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                       <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest flex items-center mb-1">
                          <BrainCircuit size={14} className="mr-2" /> Policy Intelligence
                       </p>
                       <p className="text-[9px] font-bold text-amber-700 leading-tight">These details are auto-extracted from the policy document by our AI engine and are awaiting CRM verification.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-6 border-b border-indigo-50">
                       <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">PED Waiting</p>
                         <p className="text-[11px] font-bold text-slate-700">{latestClaim?.formData?.p_ped_waiting || 'N/A'}</p>
                       </div>
                       <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Co-pay</p>
                         <p className="text-[11px] font-bold text-rose-600 tabular-nums">{latestClaim?.formData?.p_copay || 'N/A'}</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-indigo-900/60 uppercase tracking-widest mb-2 flex items-center">
                           <span className="w-1 h-1 bg-indigo-400 rounded-full mr-2"></span>
                           Room & Benefits
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Room Limit</p>
                              <p className="text-[10px] font-bold text-slate-700 leading-tight truncate">{latestClaim?.formData?.p_room_eligibility || 'N/A'}</p>
                           </div>
                           <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">ICU Limit</p>
                              <p className="text-[10px] font-bold text-slate-700 leading-tight truncate">{latestClaim?.formData?.p_icu_eligibility || 'N/A'}</p>
                           </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sum Insured Details</p>
                         <p className="text-sm font-black text-slate-800">₹{latestClaim?.formData?.p_sum_insured || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-8">
                 <button 
                  onClick={() => setIsPolicyModalOpen(true)}
                  className="w-full py-4 bg-gradient-to-r from-[#000080] to-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                   <FileText size={14} /> Full Policy Details
                 </button>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
              <User size={16} className="mr-2 text-blue-500" /> Patient Profile
            </h3>
            <div className="space-y-6">
              <InfoRow label="Full Name" value={patientName} />
              <InfoRow label="UHID" value={latestClaim.formData?.p_uhid || 'N/A'} />
              <InfoRow label="Primary Insurer" value={latestClaim.insuranceProvider} />
              <InfoRow label="Last Admission" value={formatDate(latestClaim.admissionDate)} />
            </div>
          </div>

          {/* PATIENT IDENTITY SECTION */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <ShieldCheck size={16} className="mr-2 text-emerald-500" /> Patient Identity
              </h3>
              {canEdit && !isFrozen && (
                <button 
                  onClick={() => handleEditClick('identity')}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-500 transition-colors"
                  title="Modify Record"
                >
                  <Edit size={14} />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <InfoRow label="Claim No" value={latestClaim.caseReferenceId} />
              <InfoRow label="Mobile NO" value={latestClaim.formData?.p_contact || latestClaim.formData?.p_mobile || 'N/A'} />
              <InfoRow label="Gender/DOB" value={`${latestClaim.formData?.p_gender || 'N/A'} / ${latestClaim.formData?.p_dob ? formatDate(latestClaim.formData.p_dob) : 'N/A'}`} />
              <InfoRow label="UHID" value={formatUHID(latestClaim.formData?.p_uhid) || 'N/A'} />
            </div>
          </div>

          {/* CLINICAL & FINANCIAL SECTION */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <BrainCircuit size={16} className="mr-2 text-indigo-500" /> Clinical & Financial
              </h3>
              {canEdit && !isFrozen && (
                <button 
                  onClick={() => handleEditClick('clinical')}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-500 transition-colors"
                  title="Modify Record"
                >
                  <Edit size={14} />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnosis</p>
                <p className="text-[11px] font-bold text-slate-700 leading-tight">{String(latestClaim.diagnosis || '')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="ICD Code" value={latestClaim.formData?.m_icd_code || 'N/A'} />
                <InfoRow label="Est. Cost" value={`₹${latestClaim.estimatedCost?.toLocaleString()}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Adm Date" value={latestClaim.admissionDate ? formatDate(latestClaim.admissionDate) : 'N/A'} />
                <InfoRow label="Disch Date" value={latestClaim.dischargeDate ? formatDate(latestClaim.dischargeDate) : 'N/A'} />
              </div>
              <InfoRow label="Doctor" value={latestClaim.formData?.dr_name || 'N/A'} />
            </div>
          </div>

          {/* PAYER GOVERNANCE SECTION */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <ShieldCheck size={16} className="mr-2 text-amber-500" /> Payer Governance
              </h3>
              {canEdit && !isFrozen && (
                <button 
                  onClick={() => handleEditClick('payer')}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-500 transition-colors"
                  title="Modify Record"
                >
                  <Edit size={14} />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <InfoRow label="Insurer" value={latestClaim.insuranceProvider} />
              {latestClaim.formData?.tpa_provider && (
                <InfoRow label="TPA" value={latestClaim.formData.tpa_provider} />
              )}
              <InfoRow label="Policy NO" value={latestClaim.policyNumber || 'N/A'} />
              <InfoRow label="Card ID" value={latestClaim.formData?.p_card_id || 'N/A'} />
            </div>
          </div>

          {/* VIEW DOCUMENTS SECTION */}
          <div className="bg-white p-3 rounded-[1.2rem] border border-slate-200 shadow-sm">
            <h3 className="text-[8px] font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center">
              <FileSearch size={10} className="mr-1.5 text-indigo-500" /> View Documents
            </h3>
            <div className="space-y-1">
              {(() => {
                const allDocs = patientClaims.flatMap((claim) => getClaimDocuments(claim));
                
                if (allDocs.length === 0) {
                  return (
                    <div className="py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">No documents</p>
                    </div>
                  );
                }

                return allDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100">
                        <FileText size={8} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-700 truncate max-w-[90px]">{doc.name}</p>
                        <p className="text-[6px] font-bold text-slate-400 uppercase tracking-tight">{doc.type}</p>
                        {doc.utrNumber && (
                          <p className="text-[6px] text-[#000080]/80 font-black mt-0.5 bg-blue-50 px-1 py-0.5 rounded border border-blue-100/50 italic scale-95 origin-left">
                            UTR: {doc.utrNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => openClaimDocument(doc)}
                      className="p-1 text-slate-300 hover:text-indigo-500 transition-colors disabled:opacity-30"
                      disabled={!doc.data && !doc.documentId}
                    >
                      <Eye size={12} />
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle size={16} className="text-blue-600" />
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Patient Note</span>
              </div>
              <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
                This patient has {String(stats.total)} claim records in the system. All financial values are based on processed claims.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Reply Query Modal */}
      <AnimatePresence>
        {showReplyModal && selectedClaimForReply && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Query Reply</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Patient: {patientName}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyComment('');
                    setSelectedClaimForReply(null);
                    setReplyFiles([]);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction Date</label>
                <div className="relative group">
                  <input 
                    type="date"
                    value={replyTransactionDate}
                    onChange={(e) => setReplyTransactionDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Tab" && e.key !== "Escape") {
                        e.preventDefault();
                      }
                    }}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        console.log("showPicker not supported", err);
                      }
                    }}
                    className="w-full px-5 py-3 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer select-none"
                  />
                </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Comment / Justification</label>
                    <button 
                      onClick={handleAiDraftReply}
                      disabled={isAiDrafterLoading}
                      className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                    >
                      {isAiDrafterLoading ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      AI Assist
                    </button>
                  </div>
                  <textarea 
                    value={replyComment}
                    onChange={(e) => setReplyComment(e.target.value)}
                    placeholder="Enter your detailed reply here..."
                    className="w-full h-32 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Attach Supporting Document (Optional) - Up to 3 files</label>
                  <div className="flex flex-col gap-3">
                    {replyFiles.length > 0 && (
                      <div className="space-y-2 mb-1">
                        {replyFiles.map((file) => (
                          <div key={file.id} className="flex justify-between items-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                                <FileCheck size={16} />
                              </div>
                              <div className="max-w-[240px]">
                                <p className="text-[11px] font-black text-emerald-800 truncate">{file.name}</p>
                                <p className="text-[8px] font-bold text-emerald-600 uppercase">File Attached</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setReplyFiles(prev => prev.filter(f => f.id !== file.id));
                              }}
                              className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"
                              type="button"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyFiles.length < 3 && (
                      <label 
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-3xl hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-all group relative"
                        onDragOver={(evt) => {
                          evt.preventDefault();
                          evt.stopPropagation();
                        }}
                        onDrop={(evt) => {
                          evt.preventDefault();
                          evt.stopPropagation();
                          const files = evt.dataTransfer.files;
                          if (files && files.length > 0) {
                            handleAddReplyFiles(files);
                          }
                        }}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mb-2 group-hover:bg-blue-100 group-hover:text-blue-500 transition-all">
                            <Upload size={20} />
                          </div>
                          <p className="text-[11px] font-black text-slate-600 uppercase tracking-tight">Click or Drag to upload file ({replyFiles.length}/3)</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">PDF, JPG or PNG (MAX. 5MB) • Up to 3 files</p>
                        </div>
                        <input 
                          type="file" 
                          multiple
                          className="hidden" 
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              handleAddReplyFiles(files);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button 
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyComment('');
                    setSelectedClaimForReply(null);
                    setReplyFiles([]);
                  }}
                  className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReplySubmit}
                  disabled={isSubmittingReply || !replyComment.trim()}
                  className="flex-[2] px-6 py-4 bg-[#000080] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingReply ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Update Case
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isGeneratingPdf && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[500] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Generating PDF Report...</p>
        </div>
      )}

      {/* Documents View Modal */}
      {showDocsModal && activeClaimForDocs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <FileSearch size={16} className="mr-2 text-indigo-500" /> View Documents
              </h3>
              <button 
                onClick={() => {
                  setShowDocsModal(false);
                  setActiveClaimForDocs(null);
                }}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
               <div className="space-y-3">
                 {(() => {
                   const claimDocs = getClaimDocuments(activeClaimForDocs);
                   if (claimDocs.length === 0) {
                     return (
                       <div className="py-12 text-center">
                         <FileText size={40} className="text-slate-200 mx-auto mb-3" />
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No documents for this case</p>
                       </div>
                     );
                   }
                   return claimDocs.map((doc: any, idx: number) => (
                     <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100">
                           <FileText size={18} />
                         </div>
                         <div className="min-w-0">
                           <p className="text-[11px] font-black text-slate-700 truncate max-w-[220px]">{doc.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.05em]">{doc.type}</p>
                           {doc.utrNumber && (
                             <p className="text-[9px] text-[#000080]/80 font-black mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 italic">
                               UTR: {doc.utrNumber} | Date: {doc.utrDate} | Amt: ₹{Number(doc.settledAmt || 0).toLocaleString('en-IN')}
                             </p>
                           )}
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         {(doc.data || doc.documentId) && (
                           <>
                             <button 
                               onClick={() => openClaimDocument(doc)}
                               className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                             >
                               <Eye size={18} />
                             </button>
                             <button 
                               onClick={async () => {
                                 if (doc.documentId) {
                                   try {
                                     const preview = await documentsApi.previewClaimDocument(doc.documentId);
                                     handleDownload(preview.file_name || doc.name, preview.preview_url, preview.mime_type || doc.mimeType || doc.type);
                                   } catch (error) {
                                     console.error('Unable to download claim document', error);
                                     toast.error('Unable to download this document');
                                   }
                                   return;
                                 }
                                 handleDownload(doc.name, doc.data, doc.mimeType || doc.type);
                               }}
                               className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                             >
                               <Download size={18} />
                             </button>
                           </>
                         )}
                       </div>
                     </div>
                   ));
                 })()}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-200">
                    <Edit size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Modify Record</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                      {editingSection === 'identity' ? 'Patient Identity' : editingSection === 'clinical' ? 'Clinical & Financial' : 'Payer Governance'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-[1_1_auto] min-h-[300px] overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-6">
                  {editingSection === 'identity' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Patient Name</label>
                        <input
                          type="text"
                          value={editForm.patientName || ''}
                          onChange={(e) => setEditForm({ ...editForm, patientName: e.target.value })}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">UHID</label>
                          <input
                            type="text"
                            value={editForm.p_uhid || ''}
                            onChange={(e) => setEditForm({ ...editForm, p_uhid: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mobile</label>
                          <input
                            type="text"
                            value={editForm.p_contact || ''}
                            onChange={(e) => setEditForm({ ...editForm, p_contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gender</label>
                          <select
                            value={editForm.p_gender || ''}
                            onChange={(e) => setEditForm({ ...editForm, p_gender: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">DOB</label>
                          <FastDOBPicker
                            value={editForm.p_dob || ''}
                            onChange={(val) => setEditForm({ ...editForm, p_dob: val })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Address</label>
                        <textarea
                          value={editForm.p_address || ''}
                          onChange={(e) => setEditForm({ ...editForm, p_address: e.target.value })}
                          rows={2}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                        />
                      </div>
                    </>
                  )}

                  {editingSection === 'clinical' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Diagnosis</label>
                        <input
                          type="text"
                          value={editForm.diagnosis || ''}
                          onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-indigo-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ICD Code</label>
                          <input
                            type="text"
                            value={editForm.m_icd_code || ''}
                            onChange={(e) => setEditForm({ ...editForm, m_icd_code: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Doctor Name</label>
                          <input
                            type="text"
                            value={editForm.dr_name || ''}
                            onChange={(e) => setEditForm({ ...editForm, dr_name: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Admission Date</label>
                          <input
                            type="datetime-local"
                            value={editForm.admissionDate || ''}
                            onChange={(e) => setEditForm({ ...editForm, admissionDate: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Discharge Date</label>
                          <input
                            type="date"
                            value={editForm.dischargeDate || ''}
                            onChange={(e) => setEditForm({ ...editForm, dischargeDate: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimated Cost</label>
                          <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                            <input
                              type="number"
                              value={editForm.estimatedCost || ''}
                              onChange={(e) => setEditForm({ ...editForm, estimatedCost: e.target.value })}
                              className="w-full pl-10 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-emerald-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exp. Stay (Days)</label>
                          <input
                            type="number"
                            value={editForm.adm_stay_days || ''}
                            onChange={(e) => setEditForm({ ...editForm, adm_stay_days: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Treatment Type</label>
                          <select
                            value={editForm.p_treatment_type || ''}
                            onChange={(e) => setEditForm({ ...editForm, p_treatment_type: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                          >
                            <option value="Surgical">Surgical</option>
                            <option value="Medical">Medical</option>
                            <option value="Non-Surgical">Non-Surgical</option>
                            <option value="Day Care">Day Care</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {editingSection === 'payer' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Insurance Provider</label>
                        <input
                          type="text"
                          value={editForm.insuranceProvider || ''}
                          onChange={(e) => setEditForm({ ...editForm, insuranceProvider: e.target.value })}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-indigo-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TPA Provider</label>
                        <input
                          type="text"
                          value={editForm.tpa_provider || ''}
                          onChange={(e) => setEditForm({ ...editForm, tpa_provider: e.target.value })}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Policy NO</label>
                          <input
                            type="text"
                            value={editForm.policyNumber || ''}
                            onChange={(e) => setEditForm({ ...editForm, policyNumber: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Card ID</label>
                          <input
                            type="text"
                            value={editForm.p_card_id || ''}
                            onChange={(e) => setEditForm({ ...editForm, p_card_id: e.target.value })}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Claim Number (Insurer)</label>
                        <input
                          type="text"
                          value={editForm.insurer_claim_no || ''}
                          onChange={(e) => setEditForm({ ...editForm, insurer_claim_no: e.target.value })}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono uppercase"
                          placeholder="If available, enter insurer claim no"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveEdit}
                  className="flex-[2] px-6 py-3 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10px] shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transition Dates Modal */}
      <AnimatePresence>
        {showTransitionDateModal && pendingTransitionAction && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setShowTransitionDateModal(false);
                setPendingTransitionAction(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#000080] text-white rounded-2xl shadow-lg shadow-blue-100">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Confirm Status Transition</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                      {pendingTransitionAction.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTransitionDateModal(false);
                    setPendingTransitionAction(null);
                  }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Please provide the <span className="font-extrabold text-slate-700">Admission Date</span> and <span className="font-extrabold text-slate-700">Discharge Date</span> for this case. This information is required for the transition to <span className="font-extrabold text-[#000080]">{pendingTransitionAction.label}</span> and will sync with the claim.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Admission Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={transitionAdmissionDate}
                      onKeyDown={(e) => e.preventDefault()}
                      onChange={(e) => setTransitionAdmissionDate(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-verdana"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Discharge Date
                    </label>
                    <input
                      type="date"
                      value={transitionDischargeDate}
                      onKeyDown={(e) => e.preventDefault()}
                      onChange={(e) => setTransitionDischargeDate(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-verdana"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransitionDateModal(false);
                    setPendingTransitionAction(null);
                  }}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!transitionAdmissionDate}
                  onClick={handleConfirmTransitionWithDates}
                  className="flex-[2] px-6 py-3 bg-[#000080] text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10px] shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} />
                  Confirm Update
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
              <button onClick={() => handleDownload(previewFile.name, previewFile.data, previewFile.type)} className="px-6 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center"><Download size={16} className="mr-2" /> Download</button>
              <button onClick={() => setPreviewFile(null)} className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"><X size={24} /></button>
            </div>
          </div>
          <div className="w-full max-w-6xl flex-1 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
             {previewFile.type?.startsWith('image/') ? (
               <img src={previewFile.data.startsWith('data:') || previewFile.data.startsWith('blob:') ? previewFile.data : `data:${previewFile.type};base64,${previewFile.data}`} className="w-full h-full object-contain" alt="Preview" />
             ) : (
               <iframe src={previewFile.data} className="w-full h-full bg-white" title="Preview"></iframe>
             )}
          </div>
        </div>
      )}

      {showKypModal && (
        <KYPForm 
          policy={selectedKyp} 
          insurers={insurers}
          onClose={() => {
            setShowKypModal(false);
            setSelectedKyp(null);
          }} 
          onSave={(updated) => {
            setKypPolicies(prev => {
              const exists = prev.some(p => p.id === updated.id);
              if (exists) return prev.map(p => p.id === updated.id ? updated : p);
              return [updated, ...prev];
            });
            setShowKypModal(false);
          }}
          viewMode={true}
        />
      )}
    </div>
  );
};

// Helper component for KYP rows in document view
const KypRow = ({ label, value }: { label: string; value?: any }) => {
  const safeValue = useMemo(() => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'object') {
      if (value.seconds !== undefined && value.nanoseconds !== undefined) {
        return formatDate(value);
      }
      return 'N/A';
    }
    return String(value);
  }, [value]);

  return (
    <div className="flex items-baseline gap-2 group">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="flex-1 border-b border-dotted border-slate-200 mb-1 group-hover:border-slate-400 transition-colors"></div>
      <span className="text-[11px] font-black text-slate-800 uppercase text-right">{safeValue}</span>
    </div>
  );
};

const DetailBox = ({ label, value }: { label: string; value: any }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-extrabold text-slate-700">{value || 'N/A'}</p>
  </div>
);

const TimelineItem = ({ title, date, status, comment, type, action }: any) => {
  const colors: any = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    danger: 'bg-rose-500'
  };

  return (
    <div className="relative pl-8 animate-in slide-in-from-left-2 duration-500">
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${colors[type]}`}>
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{title}</p>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {formatDateTime(date)}
          </span>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border border-current border-opacity-20 uppercase tracking-tighter ${
             type === 'success' ? 'bg-emerald-50 text-emerald-600' :
             type === 'warning' ? 'bg-amber-50 text-amber-600' : 
             type === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
          }`}>
            {status}
          </span>
          {action}
        </div>
        {(() => {
          const isMedicalUnderwritingEvent = 
            String(title).toLowerCase().includes('medical') || 
            String(title).toLowerCase().includes('underwriting') ||
            String(status).toLowerCase().includes('medical') || 
            String(comment).toLowerCase().includes('medical') ||
            String(comment).toLowerCase().includes('clinically approved') ||
            String(comment).toLowerCase().includes('remarks:');
            
          return (
            <p className={`text-[11px] italic ${isMedicalUnderwritingEvent ? 'font-black text-slate-900' : 'font-normal text-slate-500'}`}>
              "{comment}"
            </p>
          );
        })()}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${colorClasses[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string, value: any }) => {
  const safeValue = useMemo(() => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      if (value.seconds !== undefined && value.nanoseconds !== undefined) {
        return formatDate(value);
      }
      try {
        return JSON.stringify(value);
      } catch {
        return 'Object';
      }
    }
    return String(value);
  }, [value]);

  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-bold text-slate-700">{safeValue}</span>
    </div>
  );
};

export default PatientDashboard;

const AccountReconciliationPanel = ({ claim, onUpdate, source }: { claim: Claim, onUpdate: (c: Claim) => void, source: string | null }) => {
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const finalBillAmt = Number(claim.formData?.dis_total_bill || claim.formData?.final_bill_amount || 0);
  const finalApprovalAmt = Number(claim.formData?.fin_app_amt || claim.formData?.final_approval_amount || 0);

  const isAccountReconciliation = 
    claim.status === ClaimStatus.COMPLETE_SETTLEMENT || 
    claim.status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE || 
    claim.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE;

  const [formData, setFormData] = useState<any>({
    current_date: new Date().toISOString().split('T')[0],
    settlement_date: claim.formData?.settlement_date || new Date().toISOString().split('T')[0],
    utr_date: claim.formData?.utr_date || claim.formData?.settlement_date || new Date().toISOString().split('T')[0],
    bank_amt_rec: claim.formData?.bank_amt_rec || claim.formData?.set_net_settled || claim.formData?.set_partial_amt || '',
    set_tds: claim.formData?.set_tds || 0,
    set_incl_tds: claim.formData?.set_incl_tds || claim.formData?.set_partial_amt || 0,
    utr_number: claim.formData?.utr_number || '',
    bank_fund_status: claim.formData?.bank_fund_status || (claim.status?.includes("Partially") ? 'Partially Received' : 'Received'),
    comment: '',
    partially_settled_remark: claim.formData?.partially_settled_remark || claim.formData?.comment || '',
    other_partial_payment_remark: claim.formData?.other_partial_payment_remark || '',
    partial_settlement_reason: claim.formData?.partial_settlement_reason || claim.formData?.partial_remark_type || ''
  });

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev: any) => {
      const next = { ...prev, [key]: value };
      if (key === 'bank_amt_rec') {
        const amt = parseFloat(value) || 0;
        const tds = Math.round(amt / 9);
        next.set_tds = tds;
        next.set_incl_tds = amt + tds;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const targetStatus = isAccountReconciliation 
        ? ClaimStatus.ACCOUNT_RECONCILIATION 
        : ClaimStatus.BANK_RECONCILIATION_COMPLETED;

      const newEvent: TimelineEvent = {
        id: `ev-${Date.now()}`,
        status: targetStatus,
        date: new Date().toISOString(),
        comment: formData.comment || `Account reconciliation completed. Status: ${formData.bank_fund_status}`,
        type: 'status_change',
        stageData: {
          ...formData,
          finalBillAmt,
          finalApprovalAmt,
          updatedBy: 'Hospital User'
        }
      };

      const updatedClaim: Claim = {
        ...claim,
        status: targetStatus,
        formData: { ...claim.formData, ...formData },
        updatedAt: new Date().toISOString(),
        history: [newEvent, ...(claim.history || [])]
      };

      await onUpdate(updatedClaim);
      toast.success(`Claim updated to ${targetStatus}`);
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update claim");
    } finally {
      setIsSaving(false);
    }
  };

  const currentTotalSettled = Number(formData.set_incl_tds || 0);
  const isPartiallySettled = (currentTotalSettled > 0 && currentTotalSettled < finalApprovalAmt) || claim.status?.includes("Partially");

  const preAndCurrentSettlement = useMemo(() => {
    const totalClaim = finalApprovalAmt;
    const historyEvents = [...(claim.history || [])].reverse(); // oldest to newest
    const settlementStatuses = [
      ClaimStatus.COMPLETE_SETTLEMENT,
      ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
      ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
    ];

    const settleEvents = historyEvents.filter(h => settlementStatuses.includes(h.status as ClaimStatus));
    
    if (settleEvents.length === 0) {
      return {
        previous: 0,
        current: 0,
        cumulative: 0,
        outstanding: totalClaim
      };
    }

    // Latest settle event is the current settlement
    const latestEvent = settleEvents[settleEvents.length - 1];
    const previousEvents = settleEvents.slice(0, settleEvents.length - 1);

    const previousSec = previousEvents.reduce((sum, ev) => sum + Number(ev.stageData?.set_incl_tds || 0), 0);
    const currentSec = Number(latestEvent.stageData?.set_incl_tds || 0);
    const cumulativeSec = previousSec + currentSec;
    const outstandingSec = totalClaim > cumulativeSec ? totalClaim - cumulativeSec : 0;

    return {
      previous: previousSec,
      current: currentSec,
      cumulative: cumulativeSec,
      outstanding: outstandingSec
    };
  }, [claim.history, finalApprovalAmt]);

  if (!showForm) {
    return (
      <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-violet-800 p-6 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 mb-8 animate-in slide-in-from-top-4 duration-500 overflow-hidden relative group">
         <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
         <div className="flex items-center gap-6 relative z-10 flex-1">
           <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-inner shrink-0">
             <IndianRupee size={32} />
           </div>
           <div className="flex-1">
             <h3 className="text-xl font-black text-white uppercase tracking-tight">
               {isAccountReconciliation ? 'Account Reconciliation' : 'Bank Reconciliation'} Pending
             </h3>
             <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">
               {isAccountReconciliation 
                 ? 'Claim is settled. Update payment details to proceed.' 
                 : 'Payment received. Finalize bank reconciliation.'}
             </p>
             <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] font-black uppercase text-blue-100 tracking-wider">
               <div className="bg-white/10 px-2 py-1 rounded">Claim Amt: ₹{finalApprovalAmt.toLocaleString('en-IN')}</div>
               <div className="bg-white/10 px-2 py-1 rounded">Prev Settled: ₹{preAndCurrentSettlement.previous.toLocaleString('en-IN')}</div>
               <div className="bg-white/10 px-2 py-1 rounded text-emerald-300">Total Settled: ₹{preAndCurrentSettlement.cumulative.toLocaleString('en-IN')}</div>
               <div className="bg-white/10 px-2 py-1 rounded text-rose-300">Bal Outstanding: ₹{preAndCurrentSettlement.outstanding.toLocaleString('en-IN')}</div>
             </div>
           </div>
         </div>
         <button 
           onClick={() => setShowForm(true)}
           className="px-8 py-4 bg-white text-[#000080] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg active:scale-95 relative z-10 shrink-0"
         >
           Update Reconciliation
         </button>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-blue-100 p-8 rounded-[3rem] shadow-2xl mb-8 space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden">
       <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 -z-10"></div>
       <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-50/50 rounded-full -ml-16 -mb-16 -z-10"></div>

       <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
               <RefreshCw size={24} className={isSaving ? 'animate-spin' : ''} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                 {isAccountReconciliation ? 'Step 1: Account Reconciliation' : 'Step 2: Bank Reconciliation'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update final settlement and payment track details</p>
            </div>
          </div>
          <button onClick={() => setShowForm(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"><XCircle size={32} /></button>
       </div>

       {/* PREVIOUS STAGE DATA - READ ONLY */}
       <div className="grid grid-cols-1 md:grid-cols-5 gap-6 bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 shadow-inner text-center md:text-left">
          <div className="space-y-1 px-2 border-r border-slate-200">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Total Claim Amount</label>
             <div className="text-lg font-black text-slate-800">₹{finalApprovalAmt.toLocaleString('en-IN')}</div>
             <p className="text-[8px] font-bold text-indigo-500 uppercase">Approved Amt</p>
          </div>
          <div className="space-y-1 px-2 border-r border-slate-200">
             <label className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Previously Settled</label>
             <div className="text-lg font-black text-slate-700">₹{preAndCurrentSettlement.previous.toLocaleString('en-IN')}</div>
             <p className="text-[8px] font-bold text-slate-400 uppercase">Prior Transactions</p>
          </div>
          <div className="space-y-1 px-2 border-r border-slate-200">
             <label className="text-[9px] font-black text-blue-500 uppercase tracking-wider">Current Settlement</label>
             <div className="text-lg font-black text-[#000080]">₹{preAndCurrentSettlement.current.toLocaleString('en-IN')}</div>
             <p className="text-[8px] font-bold text-blue-400 uppercase">Current Transaction</p>
          </div>
          <div className="space-y-1 px-2 border-r border-slate-200">
             <label className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Total Settled (Cumulative)</label>
             <div className="text-lg font-black text-emerald-700">₹{preAndCurrentSettlement.cumulative.toLocaleString('en-IN')}</div>
             <p className="text-[8px] font-bold text-emerald-500 uppercase">Sum of Settled</p>
          </div>
          <div className="space-y-1 px-2">
             <label className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Outstanding Balance</label>
             <div className="text-lg font-black text-rose-700">₹{preAndCurrentSettlement.outstanding.toLocaleString('en-IN')}</div>
             <p className="text-[8px] font-bold text-rose-500 uppercase">Outstanding Amt</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount Received (₹)</label>
             <div className="relative group">
               <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
               <input 
                 type="number" 
                 value={formData.bank_amt_rec}
                 onChange={e => handleInputChange('bank_amt_rec', e.target.value)}
                 className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-base font-black text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                 placeholder="0.00"
               />
             </div>
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">TDS (Auto calculated)</label>
             <div className="px-6 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-base font-black text-emerald-700 flex items-center justify-between shadow-sm">
               <span>₹{formData.set_tds.toLocaleString()}</span>
               <span className="text-[8px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">10% Deducted</span>
             </div>
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-[#000080] uppercase tracking-widest">Total Settled (Incl TDS)</label>
             <div className={`px-6 py-4 border-2 rounded-2xl text-base font-black flex items-center justify-between shadow-sm transition-all ${isPartiallySettled ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-200 text-[#000080]'}`}>
               <span>₹{formData.set_incl_tds.toLocaleString()}</span>
               {isPartiallySettled && <AlertTriangle size={16} className="text-orange-500 animate-pulse" />}
             </div>
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Settlement Date</label>
             <input 
               type="date" 
               value={formData.settlement_date}
               disabled
               className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-400 outline-none font-mono cursor-not-allowed select-none"
             />
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">UTR No / Ref No</label>
             <div className="relative group">
               <input 
                 type="text" 
                 value={formData.utr_number}
                 disabled
                 className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-400 outline-none cursor-not-allowed select-none"
                 placeholder="UTRXXXXXX"
               />
             </div>
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">UTR Date</label>
             <input 
               type="date" 
               value={formData.utr_date}
               disabled
               className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-400 outline-none font-mono cursor-not-allowed select-none"
             />
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Settlement Type</label>
             <div className="relative">
               <select 
                 value={formData.bank_fund_status}
                 onChange={e => handleInputChange('bank_fund_status', e.target.value)}
                 className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-800 outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all"
               >
                  <option value="Received">Full Payment Received</option>
                  <option value="Partially Received">Partially Received</option>
                  <option value="Disputed">Disputed / Excess Deducted</option>
                  <option value="Under Review">Under Bank Review</option>
               </select>
               <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
             </div>
          </div>
          <div className="space-y-1.5 lg:col-span-1">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">General Remarks</label>
             <input 
               type="text" 
               value={formData.comment}
               onChange={e => handleInputChange('comment', e.target.value)}
               className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-blue-500 transition-all"
               placeholder="Notes for finance team..."
             />
          </div>
       </div>

       {/* CONDITIONAL PARTIAL SETTLEMENT SECTION */}
       <AnimatePresence>
         {isPartiallySettled && (
           <motion.div 
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: 'auto' }}
             exit={{ opacity: 0, height: 0 }}
             className="overflow-hidden"
           >
              <div className="bg-orange-50/50 border-2 border-orange-100 p-8 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-orange-800 uppercase tracking-tight">Partial Payment Justification</h4>
                    <p className="text-[9px] font-bold text-orange-500 uppercase">Difference of ₹{(finalApprovalAmt - formData.set_incl_tds).toLocaleString()} detected</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Reason for Partial Settlement</label>
                      <select 
                        value={formData.partial_settlement_reason}
                        onChange={e => handleInputChange('partial_settlement_reason', e.target.value)}
                        className="w-full px-5 py-4 bg-white border-2 border-orange-100 rounded-2xl text-sm font-black text-orange-800 outline-none focus:border-orange-500 transition-all cursor-pointer"
                      >
                         <option value="">Select Reason...</option>
                         <option value="Deduction - TDS">TDS Deduction Discrepancy</option>
                         <option value="Deduction - CoPay">Unnoted Co-Pay / Non-Medical</option>
                         <option value="Deduction - Policy">Policy Limit Hit</option>
                         <option value="System Error">Bank / System Charge Error</option>
                         <option value="Other">Other Reasons</option>
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Partially Settled Remark</label>
                      <input 
                        type="text" 
                        value={formData.partially_settled_remark}
                        onChange={e => handleInputChange('partially_settled_remark', e.target.value)}
                        className="w-full px-5 py-4 bg-white border-2 border-orange-100 rounded-2xl text-sm font-black text-orange-800 outline-none focus:border-orange-500 transition-all"
                        placeholder="Detailed reason for shortfall..."
                      />
                   </div>

                   {formData.partial_settlement_reason === 'Other' && (
                     <motion.div 
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="space-y-1.5 md:col-span-2"
                     >
                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Other Partial Payment Remark</label>
                        <textarea 
                          value={formData.other_partial_payment_remark}
                          onChange={e => handleInputChange('other_partial_payment_remark', e.target.value)}
                          className="w-full px-5 py-4 bg-white border-2 border-orange-200 rounded-2xl text-sm font-black text-orange-800 outline-none focus:border-orange-500 transition-all min-h-[100px]"
                          placeholder="Please specify internal reason for other partial payment..."
                        />
                     </motion.div>
                   )}
                </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       <div className="flex items-center justify-between pt-6 border-t border-slate-100 gap-6">
          <div className="flex gap-4 ml-auto">
             <button 
               onClick={() => setShowForm(false)} 
               className="px-10 py-5 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
             >
               Discard
             </button>
             <button 
               onClick={handleSubmit} 
               disabled={isSaving || !formData.bank_amt_rec || !formData.utr_number}
               className="px-10 py-5 bg-gradient-to-r from-[#000080] to-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-0.5 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center gap-3"
             >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isAccountReconciliation ? 'Complete Step 1: Recon' : 'Complete Step 2: Bank Clearance'}
             </button>
          </div>
       </div>
    </div>
  );
};
