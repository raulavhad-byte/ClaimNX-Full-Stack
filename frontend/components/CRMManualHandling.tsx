import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ShieldAlert,
  Mail,
  Globe,
  ChevronLeft,
  Send,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileText,
  File,
  Upload,
  History,
  MessageSquare,
  Zap,
  ArrowRight,
  Loader2,
  ClipboardCheck,
  Maximize2,
  Plus,
  X,
  Trash2,
  Clock,
  User,
  FileSearch,
  Activity,
  Download,
} from "lucide-react";
import { dualStorageService, DISABLE_FIRESTORE } from "../services/dualStorageService";
import {
  Claim,
  ClaimStatus,
  HospitalUser,
  InsuranceEntity,
  PatientDocument,
} from "../types";
import { useNavigate, useParams } from "react-router-dom";
import { auditService } from "../services/auditService";
import { emailTemplateService } from "../services/emailTemplateService";
import { configApi, usersApi } from "../services/api";
import { toast } from "sonner";

import { formatDate, formatTimelineEventTAT } from "../utils";
import FALLetterForm, { FALLetterData } from "./FALLetterForm";

interface CRMManualHandlingProps {
  claims: Claim[];
  hospitals: HospitalUser[];
  onUpdate: (claim: Claim) => void;
  insurers: InsuranceEntity[];
  tpas: InsuranceEntity[];
  currentUser: HospitalUser;
  onUpdateInsurer?: (insurer: InsuranceEntity) => void;
  onUpdateHospital?: (hospital: HospitalUser) => void;
}

const CRMManualHandling: React.FC<CRMManualHandlingProps> = ({
  claims,
  hospitals,
  onUpdate,
  insurers,
  tpas,
  currentUser,
  onUpdateInsurer,
  onUpdateHospital,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const claim = claims.find((c) => c.id === id);

  const [activeTab, setActiveTab] = useState<
    "email" | "portal" | "documents" | "timeline" | "assessment"
  >("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Portal Credential States
  const [portalId, setPortalId] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [portalLink, setPortalLink] = useState("");
  const [isUpdatingPortal, setIsUpdatingPortal] = useState(false);

  // File Management States
  const [patientDocs, setPatientDocs] = useState<PatientDocument[]>([]);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<PatientDocument[]>([]);

  const handleDeletePatientDoc = async (docId: string) => {
    try {
      if (DISABLE_FIRESTORE) {
        const localKey = "claimnx_patientDocuments";
        let localDocs: any[] = [];
        try {
          localDocs = JSON.parse(localStorage.getItem(localKey) || "[]");
        } catch (err) {
          localDocs = [];
        }

        const filtered = localDocs.filter((d: any) => d.id !== docId);
        localStorage.setItem(localKey, JSON.stringify(filtered));

        // Update states immediately
        setPatientDocs((prev) => prev.filter((d) => d.id !== docId));
        setSelectedDocs((prev) => prev.filter((d) => d.id !== docId));
      } else {
        await dualStorageService.delete("patientDocuments", docId);
        setPatientDocs((prev) => prev.filter((d) => d.id !== docId));
        setSelectedDocs((prev) => prev.filter((d) => d.id !== docId));
      }
      toast.success("Attachment deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting patient document:", err);
      toast.error("Failed to delete attachment: " + err.message);
    }
  };

  // Final Assessment State
  const [assessmentData, setAssessmentData] = useState({
    finalBillAmount:
      claim?.formData?.dis_total_bill || claim?.estimatedCost || 0,
    approvedAmount: 0,
    deductions: 0,
    deductionReason: "",
    assessmentComments: "",
  });

  // Email States
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Update States
  const [newStatus, setNewStatus] = useState<ClaimStatus | "">("");
  const [remarks, setRemarks] = useState("");
  const [showFALForm, setShowFALForm] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; data: string; type: string } | null>(null);

  const insuranceEntity = useMemo(() => {
    const all = [...insurers, ...tpas];
    const normalizePayer = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const payer = normalizePayer(claim?.insuranceProvider || claim?.formData?.tpa_provider);
    return all.find((entity) =>
      normalizePayer(entity.id) === payer || normalizePayer(entity.name) === payer,
    );
  }, [claim, insurers, tpas]);

  const hospital = useMemo(() => {
    return hospitals.find(
      (h) =>
        h.id === claim?.hospitalId ||
        h.id === claim?.formData?.hospitalId ||
        h.id === currentUser?.hospitalId ||
        h.id === currentUser?.id,
    );
  }, [claim, hospitals, currentUser]);

  const payerCredential = useMemo(() => {
    if (!hospital) return undefined;
    const normalizePayer = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const payerValues = [
      insuranceEntity?.id,
      insuranceEntity?.name,
      claim?.insuranceProvider,
      claim?.formData?.tpa_provider,
    ].map(normalizePayer).filter(Boolean);
    return hospital.portalCredentials?.find((credential: any) =>
      payerValues.includes(normalizePayer(credential.entityId)),
    );
  }, [claim, hospital, insuranceEntity]);

  const smtpConfig = useMemo(() => {
    return (
      hospital?.smtpConfigs?.find((cfg: any) => cfg.status === "Connected") ||
      hospital?.smtpConfigs?.[0]
    );
  }, [hospital]);

  const fromEmail = useMemo(() => {
    return (
      smtpConfig?.fromEmail ||
      smtpConfig?.username ||
      hospital?.emailId ||
      `${hospital?.hospitalName?.toLowerCase().replace(/\s/g, "") || "hospital"}@claimnx.com`
    );
  }, [smtpConfig, hospital]);

  const [hasInitializedDocs, setHasInitializedDocs] = useState(false);
  const lastInitializedClaimId = useRef<string | null>(null);
  const patientDocsRef = useRef<PatientDocument[]>([]);

  useEffect(() => {
    if (claim && claim.id !== lastInitializedClaimId.current) {
      setHasInitializedDocs(false);
      lastInitializedClaimId.current = claim.id;
    }
  }, [claim?.id]);

  useEffect(() => {
    if (claim) {
      setEmailTo(insuranceEntity?.emailId || "");

      const templates = emailTemplateService.getTemplates();

      let templateType = "General";
      if (
        claim.status.includes("Pre Auth") ||
        claim.status.includes("Enhancement") ||
        claim.status.includes("Query")
      ) {
        templateType = "Pre-auth Follow-up";
      } else if (
        claim.status.includes("Discharge") ||
        claim.status.includes("Settlement")
      ) {
        templateType = "Settlement Follow-up";
      }

      const activeTemplate = templates.find(
        (t: any) => t.type === templateType,
      ) ||
        templates.find((t: any) => t.type === "General") || {
          body: "Dear Team,\n\nPlease find the attached documents for Claim NO: {claimId} (Patient: {patientName}).\n\nSubmission Type: Manual Fallback\n\nRegards,\n{hospitalName} Team",
        };

      let body = activeTemplate.body;
      body = body.replace(/{claimId}/g, claim.id);
      body = body.replace(/{patientName}/g, claim.patientName);
      body = body.replace(
        /{hospitalName}/g,
        hospital?.hospitalName || "ClaimNX CRM",
      );

      setEmailBody(body);
    }
  }, [claim, insuranceEntity, hospital]);

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
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

  const handlePreview = (
    fileName: string,
    fileData: string,
    mimeType?: string,
  ) => {
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

  if (!claim)
    return (
      <div className="p-10 text-center font-bold text-slate-400">
        Claim not found
      </div>
    );

  const isMedicalScrutinyRequired =
    hospital?.valueAddedServices?.medicalScrutinyRequired;
  const isSubmissionAllowed =
    !isMedicalScrutinyRequired ||
    claim.isMedicallyApproved ||
    claim.status === ClaimStatus.MEDICAL_APPROVED ||
    ![
      ClaimStatus.DRAFT,
      ClaimStatus.PENDING_MEDICAL_REVIEW,
      ClaimStatus.PENDING_MEDICAL_TEAM,
      ClaimStatus.MEDICAL_QUERY_RAISED,
      ClaimStatus.MEDICAL_QUERY_REPLIED,
      ClaimStatus.MEDICAL_REJECTED
    ].includes(claim.status) ||
    claim.history?.some(h => 
      h.status === ClaimStatus.MEDICAL_APPROVED || 
      h.status === ClaimStatus.ASSESSMENT_APPROVED || 
      h.type === 'medical_decision' || 
      String(h.status).toLowerCase().includes('medical approved') ||
      String(h.status).toLowerCase().includes('assessment approved')
    );

  useEffect(() => {
    if (insuranceEntity) {
      // Check if hospital has specific credentials for this entity
      // IMPORTANT: Check both entityId (new) and entityName (legacy/ManageHospital behavior)
      if (payerCredential) {
        setPortalId(payerCredential.username || "");
        setPortalPassword(payerCredential.password || "");
      } else {
        setPortalId(insuranceEntity.portalId || "");
        setPortalPassword(insuranceEntity.portalPassword || "");
      }
        setPortalLink((payerCredential as any)?.portalLink || insuranceEntity.portalLink || "");
    }
  }, [insuranceEntity, payerCredential]);

  useEffect(() => {
    if (!claim) return;

    const fetchLocalDocs = () => {
      const localKey = "claimnx_patientDocuments";
      let localDocs: any[] = [];
      try {
        localDocs = JSON.parse(localStorage.getItem(localKey) || "[]");
      } catch (e) {
        localDocs = [];
      }

      // Filter by linkedClaimId
      const filtered = localDocs.filter(
        (doc: any) => doc.linkedClaimId === claim.id,
      );

      // If we switched claims, reset initialization
      if (lastInitializedClaimId.current !== claim.id) {
        setHasInitializedDocs(false);
        lastInitializedClaimId.current = claim.id;
      }

      setPatientDocs(filtered);

      setSelectedDocs((currentSelected) => {
        if (!hasInitializedDocs) {
          return filtered;
        }
        const newDocs = filtered.filter(
          (d) => !patientDocsRef.current.some((pd) => pd.id === d.id),
        );
        return [...currentSelected, ...newDocs];
      });

      patientDocsRef.current = filtered;

      if (!hasInitializedDocs) {
        setHasInitializedDocs(true);
      }
    };

    fetchLocalDocs();

    const interval = setInterval(fetchLocalDocs, 1000);
    return () => clearInterval(interval);
  }, [claim?.id, hasInitializedDocs]);

  const handlePortalUpdate = async () => {
    if (!insuranceEntity) return;
    setIsUpdatingPortal(true);
    try {
      const updatedData = {
        portalId,
        portalPassword,
        portalLink,
      };

      const res = await configApi.updateInsurer(
        insuranceEntity.id,
        updatedData,
      );
      if (onUpdateInsurer) {
        onUpdateInsurer(res.data);
      }

      if (hospital) {
        const updatedPortalCredentials = [...(hospital.portalCredentials || [])];
        const credIndex = updatedPortalCredentials.findIndex(
          (c: any) =>
            c.entityId === insuranceEntity.id ||
            c.entityId === insuranceEntity.name,
        );

        const newCredObj = {
          entityId: insuranceEntity.name,
          username: portalId,
          password: portalPassword,
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          rateListName: "",
          rateListData: "",
        };

        if (credIndex >= 0) {
          updatedPortalCredentials[credIndex] = {
            ...updatedPortalCredentials[credIndex],
            username: portalId,
            password: portalPassword,
          };
        } else {
          updatedPortalCredentials.push(newCredObj);
        }

        const updatedHospital = {
          ...hospital,
          portalCredentials: updatedPortalCredentials,
        };

        await usersApi.update(hospital.id, updatedHospital);
        if (onUpdateHospital) {
          onUpdateHospital(updatedHospital);
        }
      }

      toast.success("Portal credentials updated successfully!");
    } catch (error) {
      console.error("Error updating portal details:", error);
      toast.error("Failed to update portal details.");
    } finally {
      setIsUpdatingPortal(false);
    }
  };

  const handleEmailSend = async () => {
    setIsSubmitting(true);
    // Process update immediately

    const updatedClaim: Claim = {
      ...claim,
      submissionStatus: "Success",
      manualSubmissionType: "Email",
      manualSubmissionAt: new Date().toISOString(),
      history: [
        {
          id: `crm-${Date.now()}`,
          status: claim.status,
          type: "status_change",
          date: new Date().toISOString(),
          comment: `Manual Email Submission to ${emailTo}. Attached ${selectedDocs.length} documents. Remarks: ${remarks}`,
          emailSent: true,
          stageData: {
            attachedDocs: selectedDocs.map((d) => d.fileName),
          },
        },
        ...claim.history,
      ],
    };

    onUpdate(updatedClaim);
    auditService.log({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: "Manual Email Submission",
      resourceId: claim.id,
      resourceType: "Claim",
      previousValues: { submissionStatus: claim.submissionStatus },
      newValues: {
        submissionStatus: "Success",
        method: "Email",
        recipient: emailTo,
      },
    });

    setIsSubmitting(false);
    navigate("/crm-dashboard");
  };

  const handlePortalSubmit = async () => {
    setIsSubmitting(true);
    // Process update immediately

    const updatedClaim: Claim = {
      ...claim,
      submissionStatus: "Success",
      manualSubmissionType: "Portal",
      manualSubmissionAt: new Date().toISOString(),
      history: [
        {
          id: `crm-${Date.now()}`,
          status: claim.status,
          type: "status_change",
          date: new Date().toISOString(),
          comment: `Manual Portal Submission. Remarks: ${remarks}`,
        },
        ...claim.history,
      ],
    };

    onUpdate(updatedClaim);
    auditService.log({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: "Manual Portal Submission",
      resourceId: claim.id,
      resourceType: "Claim",
      previousValues: { submissionStatus: claim.submissionStatus },
      newValues: { submissionStatus: "Success", method: "Portal" },
    });

    setIsSubmitting(false);
    navigate("/crm-dashboard");
  };

  const handleFALUpdate = async (falData: FALLetterData, isSubmit: boolean) => {
    setIsSubmitting(true);
    try {
      const fileName = `FAL_Letter_${claim.patientName}_${claim.id}.pdf`;
      const fileData = falData.pdfBase64 || undefined;

      const updatedClaim: Claim = {
        ...claim,
        status: claim.status,
        formData: {
          ...claim.formData,
          falLetterData: falData,
          // Sync existing fields for compatibility
          fin_app_amt: falData.summary.totalAssessmentAmount,
          fin_bill_amt: falData.summary.totalBillAmount,
          dis_total_bill: falData.summary.totalBillAmount,
        },
        history: [
          {
            id: `FAL-${Date.now()}`,
            date: new Date().toISOString(),
            status: isSubmit ? ClaimStatus.ASSESSMENT_SUBMITTED : claim.status,
            type: "status_change",
            comment: isSubmit
              ? `Final Assessment Letter (FAL) Submitted. Approved Amount: ₹${falData.summary.totalAssessmentAmount.toLocaleString()}`
              : `Final Assessment Letter (FAL) saved as Draft.`,
            fileName: isSubmit ? fileName : undefined,
            fileData: isSubmit ? fileData : undefined,
            stageData: {
              falData,
              documents: (isSubmit && fileData) ? [
                {
                  name: fileName,
                  data: fileData,
                  mimeType: "application/pdf"
                }
              ] : undefined
            },
          },
          ...(claim.history || []),
        ],
      };

      onUpdate(updatedClaim);
      toast.success(
        isSubmit
          ? "Final Assessment Submitted successfully."
          : "Draft saved successfully.",
      );
      if (isSubmit) {
        setShowFALForm(false);
      } else {
        setShowFALForm(false);
      }
    } catch (err) {
      toast.error("Failed to update FAL Letter data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              navigate("/crm-dashboard");
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          <button
            onClick={() =>
              navigate(`/process-claim/${encodeURIComponent(claim.id)}?source=crm`, {
                state: { from: "/crm-handle/" + claim.id },
              })
            }
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-[10px] uppercase tracking-widest transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
          >
            <Eye size={14} /> View Patient Dashboard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100">
            {claim.submissionStatus === 'Failed'
              ? `Failed ${claim.failureType || 'payer'} Submission`
              : 'Hospital Submission'}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
            {claim.caseReferenceId || claim.policyNumber || claim.insuranceProvider || 'Hospital claim'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Case Summary */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg">
                {claim.patientName.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {claim.patientName}
                </h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                  {claim.insuranceProvider}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <InfoItem
                label="Amount"
                value={`₹${claim.estimatedCost.toLocaleString()}`}
              />
              <InfoItem label="Policy No" value={claim.policyNumber} />
              <InfoItem label="Diagnosis" value={claim.diagnosis} />
              <InfoItem label="Current Stage" value={claim.status} />
            </div>

            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle size={16} />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Failure Reason
                </p>
              </div>
              <p className="text-xs font-bold text-rose-800 leading-relaxed">
                {claim.failureReason ||
                  "System timeout during RPA handshake. Portal credentials might be stale or portal structure changed."}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <History size={20} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">
                Recent History
              </h3>
            </div>
            <div className="space-y-4">
              {claim.history.slice(0, 3).map((event, idx) => (
                <div key={idx} className="flex gap-3 relative">
                  {idx !== 2 && (
                    <div className="absolute left-1.5 top-5 bottom-0 w-0.5 bg-white/10"></div>
                  )}
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0 ring-4 ring-white/5"></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                      {event.status}
                    </p>
                    <p className="text-[11px] font-medium opacity-70 line-clamp-2">
                      {event.comment}
                    </p>
                    <p className="text-[9px] font-bold opacity-40 mt-1">
                      {new Date(event.date).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Action Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              <TabButton
                active={activeTab === "email"}
                onClick={() => setActiveTab("email")}
                icon={Mail}
                label="Email Resend"
              />
              <TabButton
                active={activeTab === "portal"}
                onClick={() => setActiveTab("portal")}
                icon={Globe}
                label="Portal Submission"
              />
              <TabButton
                active={activeTab === "documents"}
                onClick={() => setActiveTab("documents")}
                icon={Eye}
                label="View Documents"
              />
              <TabButton
                active={activeTab === "timeline"}
                onClick={() => setActiveTab("timeline")}
                icon={History}
                label="Timeline"
              />
              <TabButton
                active={activeTab === "assessment"}
                onClick={() => setActiveTab("assessment")}
                icon={ClipboardCheck}
                label="Final Assessment"
              />
            </div>

            <div className="p-8">
              {activeTab === "email" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        From (Sender Email)
                      </label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={fromEmail}
                        className="w-full px-6 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed select-none lowercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        To (Insurer/TPA)
                      </label>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        CC (Hospital Billing)
                      </label>
                      <input
                        type="email"
                        value={emailCc}
                        onChange={(e) => setEmailCc(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Email Body
                    </label>
                    <textarea
                      rows={6}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 resize-none"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                          Attachments
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                          {selectedDocs.length} files selected
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowFileModal(true)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"
                    >
                      Manage Files
                    </button>
                  </div>

                  {selectedDocs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {selectedDocs.map((doc) => {
                        const sizeInKb = (
                          (doc.fileData.length * 0.75) /
                          1024
                        ).toFixed(1);
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText
                                size={12}
                                className="text-slate-400 shrink-0"
                              />
                              <span className="text-[10px] font-bold text-slate-600 truncate">
                                {doc.fileName}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                              {sizeInKb} KB
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showFileModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                              Manage Attachments ({selectedDocs.length})
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              Select files to include in email
                            </p>
                          </div>
                          <button
                            onClick={() => setShowFileModal(false)}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="p-8 max-h-[400px] overflow-y-auto space-y-3">
                          {patientDocs.length > 0 ? (
                            patientDocs.map((doc) => {
                              // Calculate approximate size from base64 (3/4 of string length)
                              const sizeInBytes = Math.round(
                                (doc.fileData.length * 3) / 4,
                              );
                              const sizeInKb = (sizeInBytes / 1024).toFixed(1);

                              const isSelected = selectedDocs.some(
                                (d) => d.id === doc.id,
                              );

                              return (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all bg-white"
                                >
                                  <div
                                    onClick={() => {
                                      if (!isSelected) {
                                        setSelectedDocs([...selectedDocs, doc]);
                                      } else {
                                        setSelectedDocs(
                                          selectedDocs.filter(
                                            (d) => d.id !== doc.id,
                                          ),
                                        );
                                      }
                                    }}
                                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}} // handled by parent div click
                                      className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500 pointer-events-none"
                                    />
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                                      <File size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-black text-slate-800 truncate pr-2">
                                          {doc.fileName}
                                        </p>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                                          {sizeInKb} KB
                                        </span>
                                      </div>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {doc.documentType}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePreview(
                                          doc.fileName,
                                          doc.fileData,
                                          doc.fileName.toLowerCase().endsWith(".png")
                                            ? "image/png"
                                            : doc.fileName.toLowerCase().endsWith(".jpg") ||
                                                doc.fileName.toLowerCase().endsWith(".jpeg")
                                              ? "image/jpeg"
                                              : "application/pdf"
                                        );
                                      }}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                      title="View Document"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePatientDoc(doc.id);
                                      }}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                      title="Delete Document"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                              No documents found for this claim
                            </p>
                          )}
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-3xl hover:bg-white hover:border-blue-300 cursor-pointer transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                Choose File to Upload
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                PDF, JPG, PNG up to 10MB
                              </p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (!files || !claim) return;

                                for (let i = 0; i < files.length; i++) {
                                  const file = files[i];
                                  const reader = new FileReader();

                                  reader.onload = async (event) => {
                                    const base64 = event.target
                                      ?.result as string;
                                    try {
                                      const newDocPayload: any = {
                                        patientName: claim.patientName,
                                        documentType: "Other",
                                        fileName: file.name,
                                        fileData: base64,
                                        uploadedAt: new Date().toISOString(),
                                        status: "Linked",
                                        linkedClaimId: claim.id,
                                        hospitalId:
                                          claim.hospitalId ||
                                          currentUser?.hospitalId ||
                                          "default_hospital",
                                      };

                                      if (DISABLE_FIRESTORE) {
                                        const localKey = "claimnx_patientDocuments";
                                        let localDocs = [];
                                        try {
                                          localDocs = JSON.parse(
                                            localStorage.getItem(localKey) || "[]",
                                          );
                                        } catch (err) {
                                          localDocs = [];
                                        }

                                        const newDocWithId: any = {
                                          ...newDocPayload,
                                          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                        };
                                        localDocs.push(newDocWithId);
                                        localStorage.setItem(
                                          localKey,
                                          JSON.stringify(localDocs),
                                        );

                                        // Update state immediately
                                        setPatientDocs((prev) => [
                                          ...prev,
                                          newDocWithId,
                                        ]);
                                        setSelectedDocs((prev) => [
                                          ...prev,
                                          newDocWithId,
                                        ]);
                                      } else {
                                        await dualStorageService.save(
                                          "patientDocuments",
                                          newDocPayload,
                                        );
                                      }
                                      toast.success(`Uploaded ${file.name}`);
                                    } catch (err) {
                                      toast.error(
                                        `Failed to upload ${file.name}`,
                                      );
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => setShowFileModal(false)}
                            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex flex-col items-end gap-2">
                    {!isSubmissionAllowed && (
                      <p className="text-xs text-red-500 font-medium">
                        Submission blocked: Medical scrutiny required and not
                        yet approved.
                      </p>
                    )}
                    <button
                      onClick={handleEmailSend}
                      disabled={isSubmitting || !isSubmissionAllowed}
                      className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <Send size={18} /> Send Email
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "portal" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
                          <Lock size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-tight">
                            Portal Credentials
                          </h3>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                            Reflected from Payer Config: {insuranceEntity?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (insuranceEntity) {
                              if (payerCredential) {
                                setPortalId(payerCredential.username || "");
                                setPortalPassword(payerCredential.password || "");
                              } else {
                                setPortalId(insuranceEntity.portalId || "");
                                setPortalPassword(
                                  insuranceEntity.portalPassword || "",
                                );
                              }
                              setPortalLink((payerCredential as any)?.portalLink || insuranceEntity.portalLink || "");
                              toast.info(
                                "Credentials reloaded from Payer Config",
                              );
                            }
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
                          title="Reload from Payer Config"
                        >
                          <History size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
                          title={
                            showPassword ? "Hide Password" : "View Password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                          Portal Username
                        </label>
                        <input
                          type="text"
                          value={portalId}
                          onChange={(e) => setPortalId(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold font-mono tracking-wider focus:bg-white/10 focus:border-blue-500/50 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                          Portal Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={portalPassword}
                            onChange={(e) => setPortalPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold font-mono tracking-wider focus:bg-white/10 focus:border-blue-500/50 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Portal Link
                      </label>
                      <input
                        type="url"
                        value={portalLink}
                        onChange={(e) => setPortalLink(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold font-mono tracking-wider focus:bg-white/10 focus:border-blue-500/50 outline-none transition-all"
                      />
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <a
                        href={portalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-50 transition-all shadow-xl"
                      >
                        <ExternalLink size={18} /> Open Insurer Portal
                      </a>
                      <button
                        onClick={handlePortalUpdate}
                        disabled={isUpdatingPortal}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl disabled:opacity-50"
                      >
                        {isUpdatingPortal ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <ClipboardCheck size={18} /> Active Save Credentials
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                        <ClipboardCheck size={18} />
                      </div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        Submission Checklist
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CheckItem label="Patient ID Verified" checked />
                      <CheckItem label="Diagnosis Mapped" checked />
                      <CheckItem label="Documents Uploaded" checked />
                      <CheckItem label="Estimated Cost Validated" checked />
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col items-end gap-2">
                    {!isSubmissionAllowed && (
                      <p className="text-xs text-red-500 font-medium">
                        Submission blocked: Medical scrutiny required and not
                        yet approved.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Collect all documents from history */}
                    {claim.history
                      .filter((h) => h.fileData || h.stageData?.documents)
                      .flatMap((h) => {
                        const docs = [];
                        if (h.fileData) {
                          docs.push({
                            name: h.fileName || "document.pdf",
                            data: h.fileData,
                            type: h.status,
                            date: h.date,
                            mimeType: "application/pdf",
                          });
                        }
                        if (h.stageData?.documents) {
                          (h.stageData.documents as any[]).forEach((d) => {
                            docs.push({
                              ...d,
                              date: h.date,
                            });
                          });
                        }
                        return docs;
                      })
                      .map((doc, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                doc.type?.includes("Policy")
                                  ? "bg-blue-50 text-blue-600"
                                  : doc.type?.includes("Medical")
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-slate-50 text-slate-600"
                              }`}
                            >
                              <File size={24} />
                            </div>
                            <button
                              onClick={() =>
                                handlePreview(doc.name, doc.data, doc.mimeType)
                              }
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Upload size={18} className="rotate-180" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {doc.type || "Supporting Doc"}
                            </p>
                            <p className="text-xs font-black text-slate-800 truncate">
                              {doc.name}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {formatDateForDisplay(doc.date)}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handlePreview(doc.name, doc.data, doc.mimeType)
                            }
                            className="w-full mt-4 py-2 bg-[#000080] text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Eye size={12} />
                            VIEW
                          </button>
                        </div>
                      ))}

                    {claim.history.filter(
                      (h) => h.fileData || h.stageData?.documents,
                    ).length === 0 && (
                      <div className="col-span-full py-20 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-4">
                          <FileText size={32} />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                          No documents uploaded yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-800 tracking-tight">Timeline</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">
                        {claim.history.length}
                      </span>
                    </div>
                    <Maximize2 size={16} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                  </div>

                  <div className="space-y-6">
                    {claim.history.map((event, idx) => {
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
                        event.stageData?.estimated_cost || claim.estimatedCost ? { label: 'Estimated Cost', amount: event.stageData?.estimated_cost || claim.estimatedCost, color: 'font-black text-blue-600' } : null;

                      const tatStr = formatTimelineEventTAT(event, claim.history[idx + 1]);

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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "assessment" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {showFALForm ? (
                    <FALLetterForm
                      claim={claim}
                      hospital={hospital}
                      patientDocs={patientDocs}
                      onUpdate={handleFALUpdate}
                      onClose={() => setShowFALForm(false)}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setActiveTab("email")}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all mr-2"
                            title="Back to Email"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                              Final Assessment Tool
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">
                              Generate Bima Garage branded assessment letter
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {claim.formData?.falLetterData && (
                            <button
                              onClick={() => setShowFALForm(true)}
                              className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-2"
                            >
                              <FileText size={18} />{" "}
                              {claim.formData?.falLetterData?.status ===
                              "Submitted"
                                ? "Preview Letter"
                                : "Continue FAL Draft"}
                            </button>
                          )}
                          <button
                            onClick={() => setShowFALForm(true)}
                            className={`px-6 py-3 ${claim.formData?.falLetterData ? "bg-slate-50 text-slate-600 border border-slate-200" : "bg-rose-600 text-white shadow-xl shadow-rose-100"} rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2`}
                          >
                            <Plus size={18} />{" "}
                            {claim.formData?.falLetterData
                              ? "Prepare New Assessment"
                              : "Prepare FAL Letter"}
                          </button>
                        </div>
                      </div>

                      {claim.formData?.falLetterData && (
                        <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 space-y-8 mt-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-6 gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  claim.formData.falLetterData.status === "Submitted"
                                    ? "bg-emerald-500 text-white"
                                    : "bg-amber-500 text-white"
                                }`}>
                                  {claim.formData.falLetterData.status}
                                </span>
                                {claim.formData.falLetterData.submittedAt && (
                                  <span className="text-[10px] font-bold text-slate-400">
                                    Submitted at: {new Date(claim.formData.falLetterData.submittedAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-lg font-black text-[#000080] uppercase tracking-tight mt-2 flex items-center gap-2">
                                <ClipboardCheck className="text-emerald-500" size={18} />
                                Final Assessment Summary
                              </h4>
                            </div>
                            {claim.formData.falLetterData.pdfBase64 && (
                              <button
                                onClick={() => {
                                  handlePreview(
                                    `FAL_Letter_${claim.patientName}_${claim.id}.pdf`,
                                    claim.formData.falLetterData!.pdfBase64!,
                                    "application/pdf"
                                  );
                                }}
                                className="px-5 py-3 bg-white text-[#000080] border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm self-start sm:self-center"
                              >
                                <Eye size={16} /> View/Download PDF
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Bill Amount</span>
                              <span className="text-lg font-black text-slate-800">₹{Number(claim.formData.falLetterData.summary?.totalBillAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Deductions</span>
                              <span className="text-lg font-black text-rose-600">₹{Number(claim.formData.falLetterData.summary?.otherDeductions || 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Admissible Amount</span>
                              <span className="text-lg font-black text-emerald-600">₹{Number(claim.formData.falLetterData.summary?.admissibleAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Assessment Amt</span>
                              <span className="text-lg font-black text-blue-600">₹{Number(claim.formData.falLetterData.summary?.totalAssessmentAmount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Assessment Worksheet Hidden as per request - Legacy UI Removed */}
                      {!claim.formData?.falLetterData && (
                        <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                            <FileText className="text-rose-600" size={32} />
                          </div>
                          <h4 className="text-slate-800 font-black uppercase tracking-widest mb-2">
                            Ready to Assess
                          </h4>
                          <p className="text-slate-500 text-xs text-center max-w-sm leading-relaxed">
                            Use the Final Assessment Tool to prepare the
                            itemized deduction letter and calculate the final
                            admissible amount for this case by seeing the Final
                            bill.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                   This file is mock/stripped metadata. Please upload a new file to view or download it.
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
               <iframe src={previewFile.data} className="w-full h-full bg-white rounded-2xl" title="Preview"></iframe>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ label, value }: any) => (
  <div className="space-y-1">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
      {label}
    </p>
    <p className="text-xs font-bold text-slate-700 truncate">{value}</p>
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 py-6 flex items-center justify-center gap-3 transition-all border-b-2 ${
      active
        ? "border-blue-600 text-blue-600 bg-blue-50/30"
        : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
    }`}
  >
    <Icon size={18} />
    <span className="text-[10px] font-black uppercase tracking-widest">
      {label}
    </span>
  </button>
);

const CheckItem = ({ label, checked }: any) => (
  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
    <div
      className={`w-5 h-5 rounded-md flex items-center justify-center ${checked ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}
    >
      <CheckCircle2 size={12} />
    </div>
    <span className="text-[11px] font-bold text-slate-600">{label}</span>
  </div>
);

const SectionTitle = ({ icon: Icon, label }: any) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center">
      <Icon size={18} />
    </div>
    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
      {label}
    </h3>
  </div>
);

export default CRMManualHandling;
