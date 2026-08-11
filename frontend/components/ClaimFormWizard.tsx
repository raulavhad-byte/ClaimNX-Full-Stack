import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  User,
  BriefcaseMedical,
  Landmark,
  ShieldCheck,
  MapPin,
  Phone,
  CalendarDays,
  Hash,
  CreditCard,
  Stethoscope,
  Activity,
  Banknote,
  Building,
  Building2,
  ChevronDown,
  UserCheck,
  Upload,
  Sparkles,
  FileText,
  AlertCircle,
  Users,
  X,
  Paperclip,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  CheckSquare,
  Wallet,
  Bot,
  Zap,
  Download,
  Baby,
  History as HistoryIcon,
  FileUp,
  Package,
  Plus,
  Mail,
  ShieldAlert,
  Printer,
} from "lucide-react";
import {
  FormField,
  Claim,
  HospitalUser,
  InsuranceEntity,
  ClaimStatus,
  MedicalReportExtraction,
  Product,
} from "../types";
import {
  extractDataFromPolicy,
  extractMedicalData,
} from "../services/geminiService";
import { auditService } from "../services/auditService";
import { dualStorageService } from "../services/dualStorageService";
import DiagnosisAutocomplete from "./DiagnosisAutocomplete";
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
import ClaimFormTemplate from "./ClaimFormTemplate";
import { FastDOBPicker } from "./FastDOBPicker";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { isValidYearFormat, checkDateReasonability, formatDate, safeHtml2Canvas } from "../utils";
import { documentsApi } from "../services/api";

interface ClaimFormWizardProps {
  fields: FormField[];
  onSave: (claim: Claim, options?: { preventNavigation?: boolean }) => any;
  onUpdate?: (claim: Claim) => void;
  currentUser: HospitalUser;
  claims: Claim[];
  insurers: InsuranceEntity[];
  tpas: InsuranceEntity[];
  hospitalContextId?: string;
  hospitals: HospitalUser[];
  roomCategories?: string[];
  apiConfig?: any;
}

interface AttachedDocument {
  type: string;
  name: string;
  file?: File;
  fileData?: string;
}

function base64ToFile(data: string, name: string, mimeType: string): File {
  const bytes = atob(data);
  const values = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    values[index] = bytes.charCodeAt(index);
  }
  return new File([values], name, { type: mimeType || 'application/octet-stream' });
}

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

const InputField = ({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  options = [],
  required = false,
  placeholder = "",
  className = "",
  disabled = false,
  onBlur = () => {},
  error = "",
}: any) => {
  const isMobile = label.toLowerCase().includes("mobile") || label.toLowerCase().includes("phone") || label.toLowerCase().includes("contact");
  const displayType = isMobile ? "text" : type;

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center ml-1">
        {Icon && <Icon size={12} className="mr-1.5 text-slate-400" />}
        {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {type === "select" ? (
        <div className="relative group">
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className="w-full h-10 pl-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all appearance-none cursor-pointer"
          >
            <option value="">Select...</option>
            {options.map((o: string) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500"
          />
        </div>
      ) : type === "textarea" ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all min-h-[80px] resize-none placeholder:text-slate-300"
        />
      ) : type === "radio" ? (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt: string) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                onBlur();
              }}
              className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wide border transition-all flex-1 ${value === opt ? "bg-blue-900 text-white border-blue-900 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : type === "date" && (label === "Date of Birth" || label.toLowerCase().includes("birth") || label.toLowerCase().includes("dob")) ? (
        <FastDOBPicker
          value={value || ""}
          onChange={onChange}
          disabled={disabled || false}
          placeholder={placeholder || label}
        />
      ) : (
        <div className="relative group">
          <input
            type={displayType}
            value={value || ""}
            onChange={(e) => {
              let val = e.target.value;
              if (isMobile) {
                val = val.replace(/\D/g, '').slice(0, 10);
              }
              onChange(val);
            }}
            onKeyDown={(e) => {
              if (type === "date") {
                if (e.key !== "Tab" && e.key !== "Escape") {
                  e.preventDefault();
                }
              }
            }}
            onClick={(e) => {
              if (type === "date") {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {
                  console.log("showPicker not supported", err);
                }
              }
            }}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full h-10 px-3 bg-slate-50 border ${error ? "border-rose-300 focus:ring-rose-50 focus:border-rose-400" : "border-slate-200 focus:ring-blue-50 focus:border-blue-400"} rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 transition-all placeholder:text-slate-300 ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100" : ""} ${type === "date" ? "cursor-pointer select-none" : ""}`}
          />
        </div>
      )}
      {error && (
        <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1 animate-in fade-in duration-200">
          {error}
        </p>
      )}
    </div>
  );
};

const PolicyDataRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex flex-col space-y-2">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
      {label}
    </span>
    <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 break-words">
      {value || "N/A"}
    </div>
  </div>
);

const LimitCard = ({ label, value, icon: Icon, color }: any) => {
  const isFallback =
    value?.includes("Standard Limit") ||
    value?.includes("Verification Required");
  const styles: any = {
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-100",
    blue: "bg-blue-50 text-blue-900 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-900 border-indigo-100",
    amber: "bg-amber-50 text-amber-900 border-amber-100", // For fallback
  };
  const activeColor = isFallback ? "amber" : color;

  return (
    <div
      className={`p-6 rounded-[2rem] border ${styles[activeColor]} relative overflow-hidden group hover:shadow-md transition-all`}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm`}
        >
          <Icon
            size={24}
            className={isFallback ? "text-amber-500" : `text-${color}-500`}
          />
        </div>
        {isFallback && (
          <AlertTriangle size={18} className="text-amber-500 animate-pulse" />
        )}
      </div>
      <div>
        <p
          className={`text-[10px] font-black uppercase tracking-widest mb-1 opacity-60`}
        >
          {label}
        </p>
        <p className="text-base font-black leading-tight">{value}</p>
      </div>
    </div>
  );
};

const BenefitItem = ({ label, value }: any) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
      {label}
    </p>
    <p
      className={`text-sm font-bold whitespace-pre-wrap break-words ${!value || value === "NA" ? "text-slate-300" : "text-slate-800"}`}
    >
      {value || "NA"}
    </p>
  </div>
);

const ClaimFormWizard: React.FC<ClaimFormWizardProps> = ({
  onSave,
  onUpdate,
  currentUser,
  claims,
  insurers,
  tpas,
  hospitalContextId,
  hospitals,
  roomCategories = [],
  apiConfig
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Load existing draft claim if id is present
  useEffect(() => {
    if (id && claims) {
      const claim = claims.find((c) => c.id === id);
      if (claim) {
        if (claim.formData) {
          setFormData((prev) => ({
            ...prev,
            ...claim.formData,
          }));
        }
        if (claim.history && claim.history.length > 0) {
          const allDocs: AttachedDocument[] = [];
          claim.history.forEach((event) => {
            if (event.stageData?.documents) {
              event.stageData.documents.forEach((d: any) => {
                if (!allDocs.some((existing) => existing.name === d.name)) {
                  allDocs.push({
                    type: d.type,
                    name: d.name,
                    fileData: d.data,
                  });
                }
              });
            }
          });
          if (allDocs.length > 0) {
            setAttachedDocs(allDocs);
          }
        }
      }
    }
  }, [id, claims]);

  const hospitalIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('hospitalId');
  }, [location.search]);

  const [currentStep, setCurrentStep] = useState(1);
  const searchParams = new URLSearchParams(location.search);
  const urlProduct = searchParams.get('product');

  const getInitialProduct = () => {
    if (urlProduct) {
      const pMap: Record<string, Product> = {
        'CPC': Product.CPC,
        'PARTNER_PROCESSING': Product.PARTNER_PROCESSING,
        'ICA': Product.ICA,
        'KYP': Product.KYP,
        'PRE_POST': Product.PRE_POST,
        'RECOVERY_RECONCILIATION': Product.RECOVERY_RECONCILIATION
      };
      return pMap[urlProduct] || Product.CPC;
    }
    return Product.CPC;
  };
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    hospitalIdFromUrl || hospitalContextId || null,
  );
  const [showHospitalSelection, setShowHospitalSelection] = useState(
    !hospitalIdFromUrl && !hospitalContextId && (currentUser.assignedHospitalIds?.length || 0) > 1,
  );

  useEffect(() => {
    if (!selectedHospitalId && currentUser.assignedHospitalIds?.length === 1) {
      setSelectedHospitalId(currentUser.assignedHospitalIds[0]);
    }
  }, [currentUser.assignedHospitalIds, selectedHospitalId]);

  // When hospital changes, update formData
  useEffect(() => {
    if (selectedHospitalId) {
      const hospital = hospitals.find((h) => h.id === selectedHospitalId);
      if (hospital) {
        setFormData((prev) => ({
          ...prev,
          hosp_name: hospital.hospitalName,
          hosp_address: hospital.address,
          hosp_rohini_id: hospital.rohiniId,
          hosp_email: hospital.emailId,
          hosp_mobile: hospital.mobileNo,
          hospitalSeal: hospital.hospitalSeal || "",
          doctorStamp: hospital.doctorStamp || "",
        }));
      }
    }
  }, [selectedHospitalId, hospitals]);

  // AI Processing States
  const [isProcessingPolicy, setIsProcessingPolicy] = useState(false);
  const [isProcessingMedical, setIsProcessingMedical] = useState(false);
  const [extractedMembers, setExtractedMembers] = useState<any[]>([]);
  const [medicalAnalysis, setMedicalAnalysis] =
    useState<MedicalReportExtraction | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isManualDiagnosis, setIsManualDiagnosis] = useState(false);

  // Modals
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isPatientProfileModalOpen, setIsPatientProfileModalOpen] =
    useState(false);
  const [selectedPatientClaim, setSelectedPatientClaim] =
    useState<Claim | null>(null);

  // Document Management
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocument[]>([]);
  const [additionalDocType, setAdditionalDocType] = useState(
    "Investigation Reports",
  );

  // Initialize form data with stamps and seals from current user profile
  const [formData, setFormData] = useState<Record<string, any>>({
    insurance_company: insurers[0]?.name || "",
    tpa_provider: tpas[0]?.name || "",
    p_gender: "Male",
    m_treatment_type: "Medical Management",
    m_chronic_history: "No", // Default No
    m_is_maternity: "No", // Default No
    in_house_processing: "Yes", // Default to Direct (No TPA)
    p_other_insurance: "No", // Default No
    p_family_physician: "No", // Default No
    m_is_rta: "No",
    m_rta_police: "No",
    m_abuse_alcohol: "No",
    m_test_conducted: "No",
    m_route_drug: "IV & ORAL", // Default Value
    dr_name: currentUser.doctorName || "",
    dr_contact: currentUser.doctorMobileNo || "",
    // Inject stamps and hospital details directly into initial state
    hospitalSeal: currentUser.hospitalSeal || "",
    doctorStamp: currentUser.doctorStamp || "",
    hosp_name: currentUser.hospitalName || "",
    hosp_address: currentUser.address || "",
    hosp_rohini_id: currentUser.rohiniId || "",
    hosp_email: currentUser.emailId || "",
    hosp_mobile: currentUser.mobileNo || "",
    p_dob: "",
    product: getInitialProduct(),
    adm_date: "",
    adm_exp_discharge: "",
    adm_room_type: "Single Room AC",
    adm_type: "Emergency",
    // Initial Fallback Values
    p_sum_insured:
      "Verification Required: Please validate with Patient or Insurer",
    p_room_eligibility: "Standard Limit: Typically 1% of Sum Insured",
    p_icu_eligibility: "Standard Limit: Typically 2% of Sum Insured",
    p_ai_analysis: "",
  });

  const patientHistory = useMemo(() => {
    if (!formData.p_policy_no) return [];

    return claims
      .filter((c) => {
        const isSameHospital =
          c.formData?.hosp_name === currentUser.hospitalName;
        const policyMatch = c.formData?.p_policy_no === formData.p_policy_no;
        return isSameHospital && policyMatch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [claims, formData.p_policy_no, currentUser.hospitalName]);

  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [generatedClaim, setGeneratedClaim] = useState<Claim | null>(null);
  const [activeTemplateName, setActiveTemplateName] =
    useState<string>("Generic IRDAI");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [emailError, setEmailError] = useState<string>("");

  const renderActiveTemplate = (dataToUse = formData) => {
    const isStarHealth = activeTemplateName === "Star Health Standard";
    const isTataAig = activeTemplateName === "Tata AIG Standard";
    const isHdfcErgo = activeTemplateName === "HDFC ERGO Standard";
    const isIciciLombard = activeTemplateName === "ICICI Lombard Standard";
    const isCareHealth = activeTemplateName === "Care Health Insurance Standard";
    const isAdityaBirla = activeTemplateName === "Aditya Birla Health Insurance Standard";
    const isBajajAllianz = activeTemplateName === "Bajaj Allianz General Insurance Standard";
    const isMediAssist = activeTemplateName === "Medi Assist TPA Standard";
    const isCholaMs = activeTemplateName === "Chola MS Standard";
    const isManipalCigna = activeTemplateName === "Manipal Cigna Standard";
    const isCentralGenerali = activeTemplateName === "Central Generali Standard";
    const isGoDigit = activeTemplateName === "Go Digit Standard";
    const isIffcoTokio = activeTemplateName === "IFFCO TOKIO Standard";
    const isMagmaHdi = activeTemplateName === "Magma HDI Standard";
    const isRelianceGeneral = activeTemplateName === "Reliance General Standard (2017)";
    const isIndusind = activeTemplateName === "Indusind Standard (2025)";
    const isNivaBupa = activeTemplateName === "Niva Bupa Health Insurance Standard";
    const isMdIndia = activeTemplateName === "MDIndia Standard";
    const isMedsave = activeTemplateName === "Medsave Standard";
    const isHealthIndia = activeTemplateName === "HealthIndia Standard";
    const isVidalHealth = activeTemplateName === "Vidal Health Standard";

    if (isStarHealth) return <StarHealthTemplate formData={dataToUse} />;
    if (isTataAig) return <TataAigTemplate formData={dataToUse} />;
    if (isHdfcErgo) return <HdfcErgoTemplate formData={dataToUse} />;
    if (isIciciLombard) return <IciciLombardTemplate formData={dataToUse} />;
    if (isCareHealth) return <CareHealthTemplate formData={dataToUse} />;
    if (isAdityaBirla) return <AdityaBirlaTemplate formData={dataToUse} />;
    if (isBajajAllianz) return <BajajAllianzTemplate formData={dataToUse} />;
    if (isMediAssist) return <MediAssistTemplate formData={dataToUse} />;
    if (isCholaMs) return <CholaMsTemplate formData={dataToUse} />;
    if (isManipalCigna) return <ManipalCignaTemplate formData={dataToUse} />;
    if (isCentralGenerali) return <CentralGeneraliTemplate formData={dataToUse} />;
    if (isGoDigit) return <GoDigitTemplate formData={dataToUse} />;
    if (isIffcoTokio) return <IffcoTokioTemplate formData={dataToUse} />;
    if (isMagmaHdi) return <MagmaHdiTemplate formData={dataToUse} />;
    if (isRelianceGeneral) return <RelianceGeneralTemplate formData={dataToUse} />;
    if (isIndusind) return <IndusindTemplate formData={dataToUse} />;
    if (isNivaBupa) return <NivaBupaTemplate formData={dataToUse} />;
    if (isMdIndia) return <MdIndiaTemplate formData={dataToUse} />;
    if (isMedsave) return <MedsaveTemplate formData={dataToUse} />;
    if (isHealthIndia) return <HealthIndiaTemplate formData={dataToUse} />;
    if (isVidalHealth) return <VidalHealthTemplate formData={dataToUse} />;
    return <GenericIrdaiTemplate formData={dataToUse} />;
  };

  // Effect to update stamps and hospital details if currentUser profile changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      hospitalSeal: currentUser.hospitalSeal || prev.hospitalSeal,
      doctorStamp: currentUser.doctorStamp || prev.doctorStamp,
      hosp_name: currentUser.hospitalName || prev.hosp_name,
      hosp_address: currentUser.address || prev.hosp_address,
      hosp_rohini_id: currentUser.rohiniId || prev.hosp_rohini_id,
      hosp_email: currentUser.emailId || prev.hosp_email,
      hosp_mobile: currentUser.mobileNo || prev.hosp_mobile,
    }));
  }, [currentUser]);

  // Handle pre-fill from navigation state (Patient Document Vault)
  useEffect(() => {
    const state = location.state as any;
    if (state?.preFill) {
      setFormData(prev => ({
        ...prev,
        p_name: state.preFill.p_name || prev.p_name,
        p_contact: state.preFill.p_contact || prev.p_contact,
        p_email: state.preFill.p_email || prev.p_email
      }));
    }

    if (state?.attachedDocs) {
      setAttachedDocs(state.attachedDocs.map((d: any) => ({
        type: d.type,
        name: d.name,
        fileData: d.fileData
      })));
      
      // Auto-trigger AI extraction if there's an insurance policy
      const policyDoc = state.attachedDocs.find((d: any) => d.type === 'Insurance Policy');
      if (policyDoc && policyDoc.fileData) {
        handleAIExtractionFromBase64(policyDoc.fileData, policyDoc.name);
      }
    }
  }, [location.state]);

  const handleAIExtractionFromBase64 = async (base64Data: string, fileName: string) => {
    setIsProcessingPolicy(true);
    setExtractedMembers([]);
    setFormData((prev) => ({ ...prev, p_ai_analysis: "Analysis pending..." }));

    try {
      // Determine type from file name extension or default to image/jpeg
      const extension = fileName.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'pdf' ? 'application/pdf' : 'image/jpeg';
      
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const data = await extractDataFromPolicy(cleanBase64, mimeType);
      
      // Filter out invalid members
      const validMembers = (data.insuredPersons || []).filter(
        (m) => m.name && m.name !== "NA",
      );
      setExtractedMembers(validMembers);

      const finalSumInsured = data.sumInsured && data.sumInsured !== "NA" ? data.sumInsured : "Verification Required";
      const finalRoomRent = data.eligibleRoom && data.eligibleRoom !== "NA" ? data.eligibleRoom : "Standard Limit";

      setFormData((prev) => ({
        ...prev,
        p_name: data.patientName && data.patientName !== "NA" ? data.patientName : prev.p_name,
        p_policy_no: data.policyNumber && data.policyNumber !== "NA" ? data.policyNumber : prev.p_policy_no,
        p_card_id: data.cardId && data.cardId !== "NA" ? data.cardId : prev.p_card_id,
        p_dob: data.dob && data.dob !== "NA" ? data.dob : prev.p_dob,
        p_gender: data.gender && data.gender !== "NA" ? data.gender : prev.p_gender,
        p_sum_insured: finalSumInsured,
        p_room_eligibility: finalRoomRent,
        insurance_company: data.insuranceCompany && data.insuranceCompany !== "NA" ? data.insuranceCompany : prev.insurance_company,
        tpa_provider: data.tpaName && data.tpaName !== "NA" ? data.tpaName : prev.tpa_provider,
        in_house_processing: data.tpaName && data.tpaName !== "NA" ? "No" : "Yes",
      }));
      
      setIsPolicyModalOpen(true);
    } catch (err) {
      console.error("AI Extraction failed", err);
      toast.error("AI Extraction failed for pre-filled document.");
    } finally {
      setIsProcessingPolicy(false);
    }
  };

  const CHRONIC_ILLNESSES = [
    { key: "diabetes", label: "Diabetes" },
    { key: "heart_disease", label: "Heart disease" },
    { key: "hypertension", label: "Hypertension" },
    { key: "hyperlipidemia", label: "Hyperlipidemia" },
    { key: "osteoarthritis", label: "Osteoarthritis" },
    { key: "asthma_copd", label: "Asthma/COPD/Bronchitis" },
    { key: "cancer", label: "Cancer" },
    { key: "alcohol_abuse", label: "Alcohol/Drug abuse" },
    { key: "hiv_std", label: "Any HIV/or STD Related ailment" },
    { key: "stroke", label: "Cerebrovascular Accident (Stroke)" },
    { key: "liver_disease", label: "Liver Disease" },
    { key: "kidney_disease", label: "Kidney Disease" },
    { key: "other", label: "Any other ailment", isComment: true },
  ];

  // Mandatory Documents Mapping based on Treatment Type
  const MANDATORY_DOCS: Record<string, string[]> = {
    "Medical Management": [
      "Insurance Policy",
      "Govt ID / Aadhar",
      "Admission Note",
      "Medical Record",
    ],
    "Surgical Management": [
      "Insurance Policy",
      "Govt ID / Aadhar",
      "Admission Note",
      "Medical Record",
      "Surgery Estimate",
    ],
    "Intensive care": [
      "Insurance Policy",
      "Govt ID / Aadhar",
      "Admission Note",
      "Medical Record",
    ],
    Investigation: ["Insurance Policy", "Govt ID / Aadhar", "Medical Record"],
    "Non-allopathic treatment": [
      "Insurance Policy",
      "Govt ID / Aadhar",
      "Admission Note",
      "Medical Record",
    ],
  };

  const calculateAge = (dob: string) => {
    if (!dob || dob === "NA") return "";
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validateDateOnBlur = (key: string, value: string) => {
    if (!value) return;
    const type = key === 'p_dob' ? 'dob' : 'other';
    const result = checkDateReasonability(value, type);
    
    if (!result.isReasonable) {
      toast.warning(
        `Unusual Date: You ${result.message}. Please double check if this is correct.`,
        {
          action: {
            label: "Correct",
            onClick: () => {}
          },
          cancel: {
            label: "Change",
            onClick: () => handleUpdate(key, "")
          },
          duration: 10000
        }
      );
    }
  };

  const handleUpdate = (key: string, value: any) => {
    // Year digit validation (exactly 4-digit requirement)
    if (["p_dob", "adm_date", "adm_exp_discharge", "p_policy_start", "p_policy_end"].includes(key) && value) {
      const yearStr = value.split('-')[0]; // Assuming YYYY-MM-DD
      if (yearStr && yearStr.length > 4) {
        toast.error("Year cannot exceed 4 digits. Please correct the date.");
        return;
      }
    }

    if (key === "p_email") {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setEmailError("Email ID must be in a valid format (e.g. patient@email.com)");
      } else {
        setEmailError("");
      }
    }

    setFormData((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "p_dob" && value) {
        next.p_age_y = calculateAge(value);
      }

      if (
        [
          "cost_room_rent",
          "cost_icu",
          "cost_ot",
          "cost_investigation",
          "cost_medicines",
          "cost_prof_fees",
          "cost_other",
          "cost_package",
        ].includes(key)
      ) {
        const total =
          Number(next.cost_room_rent || 0) +
          Number(next.cost_icu || 0) +
          Number(next.cost_ot || 0) +
          Number(next.cost_investigation || 0) +
          Number(next.cost_medicines || 0) +
          Number(next.cost_prof_fees || 0) +
          Number(next.cost_other || 0) +
          Number(next.cost_package || 0);
        next.adm_total_cost = total;
      }

      // T + 1 Logic Implementation
      if (key === "adm_date") {
        if (next.adm_stay_days && value) {
          const startDate = new Date(value);
          const daysToAdd = parseInt(next.adm_stay_days) - 1;
          if (daysToAdd >= 0) {
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + daysToAdd);
            next.adm_exp_discharge = endDate.toISOString().split("T")[0];
          }
        }
      }

      if (key === "adm_exp_discharge") {
        if (next.adm_date && value) {
          const start = new Date(next.adm_date);
          const end = new Date(value);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          next.adm_stay_days = diffDays + 1;
        }
      }

      if (key === "adm_stay_days") {
        if (next.adm_date && value) {
          const start = new Date(next.adm_date);
          const days = parseInt(value);
          if (days > 0) {
            const endDate = new Date(start);
            endDate.setDate(start.getDate() + (days - 1));
            next.adm_exp_discharge = endDate.toISOString().split("T")[0];
          }
        }
      }

      return next;
    });
  };

  const handlePolicyUpload = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    setUploadError(null);
    const isFile = typeof File === 'function' && e instanceof File;
    const file = isFile ? (e as File) : (e as React.ChangeEvent<HTMLInputElement>).target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`,
      );
      if (!isFile) {
        (e as React.ChangeEvent<HTMLInputElement>).target.value = "";
      }
      return;
    }

    setAttachedDocs((prev) => [
      ...prev,
      { type: "Insurance Policy", name: file.name, file },
    ]);

    auditService.log({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: "Document Uploaded",
      resourceId: "New Claim",
      resourceType: "Document",
      newValues: { type: "Insurance Policy", fileName: file.name },
    });

    setIsProcessingPolicy(true);
    setExtractedMembers([]);
    setIsPolicyModalOpen(false);
    setFormData((prev) => ({ ...prev, p_ai_analysis: "Analysis pending..." }));

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = (event.target?.result as string).split(",")[1];
        try {
          const data = await extractDataFromPolicy(base64Data, file.type);

          // SECOND PROMPT: Attempt to extract medical details from the same document
          let medicalData: MedicalReportExtraction | null = null;
          try {
            medicalData = await extractMedicalData(base64Data, file.type);
          } catch (mErr) {
            console.warn("Medical extraction from policy failed (optional)", mErr);
          }

          // Filter out invalid members
          const validMembers = (data.insuredPersons || []).filter(
            (m) => m.name && m.name !== "NA",
          );
          setExtractedMembers(validMembers);

          // Auto-select if only one member is found
          if (validMembers.length === 1) {
            handleSelectMember(validMembers[0]);
          }

          const finalSumInsured =
            data.sumInsured && data.sumInsured !== "NA"
              ? data.sumInsured
              : "Coverage specifications not captured. Please cross-verify with the patient for further clarity.";

          const finalRoomRent =
            data.eligibleRoom && data.eligibleRoom !== "NA"
              ? data.eligibleRoom
              : "As per standard policy terms, room rent is typically limited to 1% of the Sum Insured.";

          const finalIcuLimit =
            data.icuIccu && data.icuIccu !== "NA"
              ? data.icuIccu
              : "As per standard policy terms, ICU/ICCU charges are typically limited to 2% of the Sum Insured.";

          const extractedAge =
            data.dob && data.dob !== "NA"
              ? calculateAge(data.dob)
              : formData.p_age_y;

          setFormData((prev) => {
            const updates: any = {
              ...prev,
              p_name:
                data.patientName && data.patientName !== "NA"
                  ? data.patientName
                  : prev.p_name,
              p_policy_no:
                data.policyNumber && data.policyNumber !== "NA"
                  ? data.policyNumber
                  : prev.p_policy_no,
              p_card_id:
                data.cardId && data.cardId !== "NA"
                  ? data.cardId
                  : prev.p_card_id,
              p_dob: data.dob && data.dob !== "NA" ? data.dob : prev.p_dob,
              p_gender:
                data.gender && data.gender !== "NA"
                  ? data.gender
                  : prev.p_gender,
              p_age_y: extractedAge,

              p_sum_insured: finalSumInsured,
              p_room_eligibility: finalRoomRent,
              p_icu_eligibility: finalIcuLimit,
              p_copay: data.copay || "NA",
              p_sub_limit: data.subLimit || "NA",
              p_bonus: data.bonus || "NA",
              p_ncb: data.ncb || "NA",
              p_restore_benefit: data.restoreBenefit || "NA",
              p_super_bonus: data.superBonus || "NA",
              p_pre_hosp: data.preHospitalization || "NA",
              p_post_hosp: data.postHospitalization || "NA",
              p_ambulance: data.ambulanceCover || "NA",
              p_ayush: data.ayushTreatment || "NA",
              p_daily_cash: data.hospitalDailyCash || "NA",
              p_ai_analysis: data.aiAnalysisComment || "Analysis pending.",
              insurance_company:
                data.insuranceCompany && data.insuranceCompany !== "NA"
                  ? data.insuranceCompany
                  : prev.insurance_company,
              tpa_provider:
                data.tpaName && data.tpaName !== "NA"
                  ? data.tpaName
                  : prev.tpa_provider,
              corporate_name:
                data.corporateName && data.corporateName !== "NA"
                  ? data.corporateName
                  : prev.corporate_name,
              p_employee_id:
                data.employeeId && data.employeeId !== "NA"
                  ? data.employeeId
                  : prev.p_employee_id,
              in_house_processing:
                data.tpaName && data.tpaName !== "NA" ? "No" : "Yes",
            };

            // If medical data was found in the same document, auto-fill it
            if (medicalData && medicalData.diagnosis !== "NA") {
              if (
                medicalData.treatingDoctor &&
                medicalData.treatingDoctor !== "NA"
              )
                updates.dr_name = medicalData.treatingDoctor;
              if (medicalData.diagnosis && medicalData.diagnosis !== "NA")
                updates.m_prov_diag = medicalData.diagnosis;
              if (
                medicalData.natureOfIllness &&
                medicalData.natureOfIllness !== "NA"
              )
                updates.m_illness = medicalData.natureOfIllness;
              if (
                medicalData.criticalFindings &&
                medicalData.criticalFindings !== "NA"
              )
                updates.m_clinical_findings = medicalData.criticalFindings;
              if (
                medicalData.injuryDetails &&
                medicalData.injuryDetails !== "NA"
              ) {
                updates.m_injury_reason = medicalData.injuryDetails;
                updates.m_is_rta = "Yes";
              }
              if (medicalData.pastHistory && medicalData.pastHistory !== "NA") {
                updates.m_chronic_history = "Yes";
                updates.m_past_history = medicalData.pastHistory;
              }
              if (
                medicalData.treatmentProtocol &&
                medicalData.treatmentProtocol !== "NA"
              ) {
                updates.m_investigation_details = medicalData.treatmentProtocol;
              }
              if (medicalData.icdCode && medicalData.icdCode !== "NA") {
                updates.m_icd_code = medicalData.icdCode;
              }

              // Step 3 Auto-fill: Admission Logistics
              if (medicalData.admissionDate && medicalData.admissionDate !== "NA") {
                updates.adm_date = medicalData.admissionDate;
              }
              if (medicalData.admissionType) {
                updates.adm_type = medicalData.admissionType;
              }
              if (medicalData.estimatedStayDays) {
                updates.adm_stay_days = medicalData.estimatedStayDays;
              }

              // Step 3 Auto-fill: Financial Estimator
              if (medicalData.estimatedTotalCost) {
                updates.adm_total_cost = medicalData.estimatedTotalCost;
              }
              if (medicalData.costBreakdown) {
                const cb = medicalData.costBreakdown;
                if (cb.roomRent) updates.cost_room_rent = cb.roomRent;
                if (cb.icu) updates.cost_icu = cb.icu;
                if (cb.ot) updates.cost_ot = cb.ot;
                if (cb.professionalFees) updates.cost_prof_fees = cb.professionalFees;
                if (cb.medicines) updates.cost_medicines = cb.medicines;
                if (cb.investigation) updates.cost_investigation = cb.investigation;
                if (cb.others) updates.cost_others = cb.others;
              }

              // Backup for basic info
              if (
                !updates.p_name &&
                medicalData.patientName &&
                medicalData.patientName !== "NA"
              )
                updates.p_name = medicalData.patientName;
              if (
                !updates.p_policy_no &&
                medicalData.policyNumber &&
                medicalData.policyNumber !== "NA"
              )
                updates.p_policy_no = medicalData.policyNumber;
            }

            return updates;
          });
        } catch (err) {
          console.error("Policy extraction failed", err);
          toast.error("AI Policy Extraction failed due to document complexity. Please fill in details manually.");
        } finally {
          setIsProcessingPolicy(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File reading failed", error);
      setIsProcessingPolicy(false);
    }
  };

  const handleMedicalUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`,
      );
      e.target.value = "";
      return;
    }

    setAttachedDocs((prev) => [
      ...prev,
      { type: "Medical Record", name: file.name, file },
    ]);

    auditService.log({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: "Document Uploaded",
      resourceId: "New Claim",
      resourceType: "Document",
      newValues: { type: "Medical Record", fileName: file.name },
    });

    setIsProcessingMedical(true);
    setMedicalAnalysis(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = (event.target?.result as string).split(",")[1];
        try {
          const data = await extractMedicalData(base64Data, file.type);
          setMedicalAnalysis(data);

          const updates: any = {};
          if (data.diagnosis) updates.m_prov_diag = data.diagnosis;
          if (data.recommendedTreatment)
            updates.m_illness = data.recommendedTreatment;
          if (data.doctorName) updates.dr_name = data.doctorName;
          if (data.doctorContact) updates.dr_contact = data.doctorContact;

          if (data.chronicConditions) {
            let hasChronic = false;
            Object.entries(data.chronicConditions).forEach(
              ([key, val]: any) => {
                if (val && val.status) {
                  const formKey =
                    key === "alcoholDrugAbuse"
                      ? "alcohol_abuse"
                      : (key || "").replace(
                          /[A-Z]/g,
                          (letter) => `_${letter.toLowerCase()}`,
                        );
                  updates[`m_chronic_${formKey}_status`] = "Yes";
                  if (val.since)
                    updates[`m_chronic_${formKey}_since`] = val.since;
                  hasChronic = true;
                }
              },
            );
            if (hasChronic) updates.m_chronic_history = "Yes";
          }

          if (data.socialHabits?.alcohol?.status) {
            updates.m_abuse_alcohol = "Yes";
          }

          setFormData((prev) => ({ ...prev, ...updates }));
          setIsMedicalModalOpen(true);
        } catch (err) {
          console.error("Medical extraction failed", err);
          toast.error("AI Medical Extraction failed. Please fill in clinical details manually.");
        } finally {
          setIsProcessingMedical(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Medical file reading failed", error);
      setIsProcessingMedical(false);
    }
  };

  const handleSelectMember = (member: any) => {
    const age = member.dob ? calculateAge(member.dob) : formData.p_age_y;
    setFormData((prev) => ({
      ...prev,
      p_name: member.name,
      p_dob: member.dob || prev.p_dob,
      p_gender: member.gender || prev.p_gender,
      p_age_y: age,
    }));
  };

  const determineTemplateName = () => {
    const isTPA = formData.in_house_processing === "No";
    if (isTPA) {
      const selectedTpa = tpas.find((t) => t.name === formData.tpa_provider);
      return selectedTpa?.templateName || "Generic IRDAI (Dashed)";
    } else {
      const selectedInsurer = insurers.find(
        (i) => i.name === formData.insurance_company,
      );
      return selectedInsurer?.templateName || "Generic IRDAI (Dashed)";
    }
  };

  const hospitalProfile = useMemo(() => {
    return hospitals.find(h => h.id === (hospitalContextId || currentUser.hospitalId));
  }, [hospitals, hospitalContextId, currentUser]);

  useEffect(() => {
    const newTemplate = determineTemplateName();
    setActiveTemplateName(newTemplate);
  }, [
    formData.insurance_company,
    formData.tpa_provider,
    formData.in_house_processing,
  ]);

  const handleDownloadTemplatePDF = async () => {
    const element = document.getElementById("claim-template-printable");
    if (!element) {
      toast.error("Template container not found");
      return;
    }
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Preparing high-quality PDF. Please wait...");
    try {
      const originalStyle = element.style.height;
      element.style.height = "auto";

      const canvas = await safeHtml2Canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const oklchToRgb = (l: string, c: string, h: string, a?: string) => {
            let L = typeof l === 'string' && l.endsWith('%') ? parseFloat(l) / 100 : parseFloat(l);
            let C = parseFloat(c);
            let H = parseFloat(h);
            let alpha = a !== undefined ? (typeof a === 'string' && a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a)) : 1;

            if (isNaN(L)) L = 0;
            if (isNaN(C)) C = 0;
            if (isNaN(H)) H = 0;
            if (isNaN(alpha)) alpha = 1;

            // 1. OKLCH -> OKLAB
            const hRad = (H * Math.PI) / 180;
            const oklab_a = C * Math.cos(hRad);
            const oklab_b = C * Math.sin(hRad);

            // 2. OKLAB -> LMS
            const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
            const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
            const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

            const l_lms = l_ * l_ * l_;
            const m_lms = m_ * m_ * m_;
            const s_lms = s_ * s_ * s_;

            // 3. LMS -> Linear sRGB
            let r_lin = +4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
            let g_lin = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
            let b_lin = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;

            // 4. Linear sRGB -> sRGB (gamma correction)
            const transfer = (c_lin: number) => {
              return c_lin <= 0.0031308
                ? 12.92 * c_lin
                : 1.055 * Math.pow(c_lin, 1.0 / 2.4) - 0.055;
            };

            let r = Math.max(0, Math.min(255, Math.round(transfer(r_lin) * 255)));
            let g = Math.max(0, Math.min(255, Math.round(transfer(g_lin) * 255)));
            let b = Math.max(0, Math.min(255, Math.round(transfer(b_lin) * 255)));

            return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
          };

          const safeOklchToRgb = (l: string, c: string, h: string, a?: string) => {
            try {
              if (l.includes('var') || c.includes('var') || h.includes('var') || (a && a.includes('var'))) {
                return 'rgb(0, 0, 0)';
              }
              return oklchToRgb(l, c, h, a);
            } catch (err) {
              return 'rgb(0, 0, 0)';
            }
          };

          const oklchRegex = /oklch\(\s*([^\s,)]+)\s+([^\s,)]+)\s+([^\s,)/]+)(?:\s*\/\s*([^\s,)]+))?\s*\)/g;

          // Process all styles in cloned document
          const styles = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styles.length; i++) {
            const style = styles[i];
            if (style.innerHTML && style.innerHTML.includes("oklch")) {
              style.innerHTML = style.innerHTML.replace(oklchRegex, (match, l, c, h, a) => {
                return safeOklchToRgb(l, c, h, a);
              });
            }
          }

          // Process all element inline styles in cloned document
          const allElements = clonedDoc.getElementsByTagName("*");
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            const inlineStyle = el.getAttribute("style");
            if (inlineStyle && inlineStyle.includes("oklch")) {
              const updated = inlineStyle.replace(oklchRegex, (match, l, c, h, a) => {
                return safeOklchToRgb(l, c, h, a);
              });
              el.setAttribute("style", updated);
            }
          }
        }
      });

      element.style.height = originalStyle;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      const safePatientName = (generatedClaim?.patientName || formData.p_name || "Patient").replace(/\s+/g, "_");
      const safeTemplateName = activeTemplateName.replace(/\s+/g, "_");
      pdf.save(`PreAuth_Form_${safePatientName}_${safeTemplateName}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF download: " + err.message, { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const validateCurrentStep = () => {
    const errors: string[] = [];
    
    if (currentStep === 1) {
      if (!formData.insurance_company) errors.push("Insurance Company");
      if (!formData.p_name) errors.push("Patient Name");
      if (!formData.p_dob) errors.push("Date of Birth");
      if (!formData.p_contact) errors.push("Mobile Number");
      if (!formData.p_uhid) errors.push("UHID / IPD No.");
      if (!formData.p_policy_no) errors.push("Policy Number");
      
      if (formData.p_contact && !/^\d{10}$/.test(formData.p_contact)) {
        errors.push("Mobile Number (must be exactly 10 digits)");
      }
      if (formData.p_relative_contact && !/^\d{10}$/.test(formData.p_relative_contact)) {
        errors.push("Alt Contact Number (must be exactly 10 digits)");
      }
      if (formData.p_family_physician === "Yes" && formData.p_family_physician_contact && !/^\d{10}$/.test(formData.p_family_physician_contact)) {
        errors.push("Family Physician Contact (must be exactly 10 digits)");
      }
      if (formData.p_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.p_email)) {
        errors.push("Email ID (must be in a valid format, e.g. patient@email.com)");
      }
    } else if (currentStep === 2) {
      if (!formData.dr_name) errors.push("Treating Doctor Name");
      if (!formData.m_prov_diag) errors.push("Diagnosis");
      if (!formData.m_treatment_type) errors.push("Proposed line of treatment");
      if (!formData.m_illness) errors.push("Nature of illness");
      if (formData.m_treatment_type === "Surgical Management" && !formData.m_surgery_name) {
        errors.push("Name Of Surgery");
      }

      if (formData.dr_contact && !/^\d{10}$/.test(formData.dr_contact)) {
        errors.push("Doctor Contact Number (must be exactly 10 digits)");
      }
    } else if (currentStep === 3) {
      // Step 3 specific validations if any
    }

    if (errors.length > 0) {
      toast.error(`Required: ${errors.join(", ")}`);
      return false;
    }
    return true;
  };

  const handleSaveDraft = async (isExplicit: boolean = false) => {
    // Only save draft if at least some basic info like patient name is there
    if (!formData.p_name && !formData.p_uhid) {
      if (isExplicit) {
        toast.error("Please enter at least Patient Name or UHID to save a draft.");
      } else {
        navigate("/cashless-dashboard");
      }
      return;
    }

    setIsSaving(true);
    const existingClaim = id ? claims.find((c) => c.id === id) : null;
    const finalId = id || `CL-DRAFT-${Date.now()}`;
    const caseRefId = existingClaim?.caseReferenceId || `REF-DRAFT-${Math.floor(Math.random() * 999999)}`;
    const patId = existingClaim?.patientId || `P-${Math.floor(Math.random() * 9999)}`;

    const draftClaim: Claim = {
      ...existingClaim,
      id: finalId,
      caseReferenceId: caseRefId,
      patientId: patId,
      patientName: formData.p_name || "Untitled Draft",
      insuranceProvider: formData.insurance_company || "Unset",
      policyNumber: formData.p_policy_no || "Unset",
      estimatedCost: Number(formData.adm_total_cost || 0),
      diagnosis: formData.m_prov_diag || "Draft Phase",
      admissionDate: formData.adm_date || new Date().toISOString().split("T")[0],
      claimType: 'Cashless',
      product: formData.product || Product.CPC,
      status: ClaimStatus.DRAFT,
      createdBy: existingClaim?.createdBy || currentUser.id,
      createdAt: existingClaim?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hospitalId: selectedHospitalId || currentUser.hospitalId || "",
      history: [
        ...(existingClaim?.history || []),
        {
          id: `ev-draft-${Date.now()}`,
          status: ClaimStatus.DRAFT,
          date: new Date().toISOString(),
          type: "admission",
          userName: currentUser.displayName || currentUser.username || "System",
          userRole: currentUser.role || 'Hospital User',
          comment: id ? "Admission draft updated by user." : "Admission saved as draft by user.",
          stageData: {
            documents: []
          }
        }
      ],
      formData: {
        ...formData,
        hosp_name: currentUser.hospitalName,
        hosp_address: currentUser.address,
        hosp_rohini_id: currentUser.rohiniId,
        hosp_email: currentUser.emailId,
        hosp_mobile: currentUser.mobileNo,
        hospitalSeal: currentUser.hospitalSeal,
        doctorStamp: currentUser.doctorStamp,
      }
    };

    if (id && onUpdate) {
      onUpdate(draftClaim);
    } else {
      onSave(draftClaim);
    }
    toast.success("Admission saved as Draft successfully!");
    navigate("/cashless-dashboard");
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinalSave = () => {
    if (validateCurrentStep()) {
      handleSave();
    }
  };

  const handlePostSubmitChange = (key: string, value: any) => {
    const updatedFormData = { ...formData, [key]: value };

    if (key === "in_house_processing" && value === "Yes") {
      updatedFormData.tpa_provider = updatedFormData.insurance_company;
    }

    setFormData(updatedFormData);

    // Update generated claim object immediately so template can re-render
    if (generatedClaim) {
      const updatedClaim = { ...generatedClaim, formData: updatedFormData };
      setGeneratedClaim(updatedClaim);

      // Sync with App state (Patient Dashboard)
      if (onUpdate) {
        onUpdate(updatedClaim);
      }
    }

    // Reset Pre-Auth Status if critical fields change
    if (key === "insurance_company" || key === "tpa_provider") {
      // No longer needed in new workflow
    }

    let newTemplate = "Generic IRDAI (Dashed)";
    const isTPA = updatedFormData.in_house_processing === "No";

    if (isTPA) {
      const selectedTpa = tpas.find(
        (t) => t.name === updatedFormData.tpa_provider,
      );
      newTemplate = selectedTpa?.templateName || "Generic IRDAI (Dashed)";
    } else {
      const selectedInsurer = insurers.find(
        (i) => i.name === updatedFormData.insurance_company,
      );
      newTemplate = selectedInsurer?.templateName || "Generic IRDAI (Dashed)";
    }
    setActiveTemplateName(newTemplate);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const finalFormData = { ...formData };
    // Ensure hospitalId is set (context isolation)
    if (!finalFormData.hospitalId && hospitalContextId) {
      finalFormData.hospitalId = hospitalContextId;
    }

    if (finalFormData.in_house_processing === "Yes") {
      finalFormData.tpa_provider = finalFormData.insurance_company;
    }

    // Process attached documents to Base64
    const processedDocs = await Promise.all(
      attachedDocs.map(async (doc) => {
        if (doc.fileData) {
          return {
            name: doc.name,
            type: doc.type,
            data: doc.fileData.includes(",") ? doc.fileData.split(",")[1] : doc.fileData,
            mimeType: doc.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
          };
        }
        const base64Raw = await fileToBase64(doc.file!);
        const base64 = base64Raw.includes(",") ? base64Raw.split(",")[1] : base64Raw;
        return {
          name: doc.name,
          type: doc.type,
          data: base64,
          mimeType: doc.file!.type,
        };
      }),
    );

    // Add generated Pre-Auth form (High-Quality PDF generated from the beautiful offscreen template)
    let pdfBase64 = "";
    const offscreenElement = document.getElementById("claim-template-offscreen");
    if (offscreenElement) {
      try {
        const originalStyle = offscreenElement.style.height;
        offscreenElement.style.height = "auto";

        const canvas = await safeHtml2Canvas(offscreenElement, {
          scale: 1.5, // 1.5 scale balances high rendering quality and processing speed
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (clonedDoc) => {
            const oklchToRgb = (l: string, c: string, h: string, a?: string) => {
              let L = typeof l === 'string' && l.endsWith('%') ? parseFloat(l) / 100 : parseFloat(l);
              let C = parseFloat(c);
              let H = parseFloat(h);
              let alpha = a !== undefined ? (typeof a === 'string' && a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a)) : 1;

              if (isNaN(L)) L = 0;
              if (isNaN(C)) C = 0;
              if (isNaN(H)) H = 0;
              if (isNaN(alpha)) alpha = 1;

              // 1. OKLCH -> OKLAB
              const hRad = (H * Math.PI) / 180;
              const oklab_a = C * Math.cos(hRad);
              const oklab_b = C * Math.sin(hRad);

              // 2. OKLAB -> LMS
              const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
              const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
              const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

              const l_lms = l_ * l_ * l_;
              const m_lms = m_ * m_ * m_;
              const s_lms = s_ * s_ * s_;

              // 3. LMS -> Linear sRGB
              let r_lin = +4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
              let g_lin = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
              let b_lin = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;

              // 4. Linear sRGB -> sRGB (gamma correction)
              const transfer = (c_lin: number) => {
                return c_lin <= 0.0031308
                  ? 12.92 * c_lin
                  : 1.055 * Math.pow(c_lin, 1.0 / 2.4) - 0.055;
              };

              let r = Math.max(0, Math.min(255, Math.round(transfer(r_lin) * 255)));
              let g = Math.max(0, Math.min(255, Math.round(transfer(g_lin) * 255)));
              let b = Math.max(0, Math.min(255, Math.round(transfer(b_lin) * 255)));

              return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };

            const oklabToRgb = (l: string, a_: string, b_: string, alphaStr?: string) => {
              let L = typeof l === 'string' && l.endsWith('%') ? parseFloat(l) / 100 : parseFloat(l);
              let oklab_a = parseFloat(a_);
              let oklab_b = parseFloat(b_);
              let alpha = alphaStr !== undefined ? (typeof alphaStr === 'string' && alphaStr.endsWith('%') ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr)) : 1;

              if (isNaN(L)) L = 0;
              if (isNaN(oklab_a)) oklab_a = 0;
              if (isNaN(oklab_b)) oklab_b = 0;
              if (isNaN(alpha)) alpha = 1;

              const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
              const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
              const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

              const l_lms = l_ * l_ * l_;
              const m_lms = m_ * m_ * m_;
              const s_lms = s_ * s_ * s_;

              let r_lin = +4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
              let g_lin = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
              let b_lin = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;

              const transfer = (c_lin: number) => {
                return c_lin <= 0.0031308 ? 12.92 * c_lin : 1.055 * Math.pow(c_lin, 1.0 / 2.4) - 0.055;
              };

              let r = Math.max(0, Math.min(255, Math.round(transfer(r_lin) * 255)));
              let g = Math.max(0, Math.min(255, Math.round(transfer(g_lin) * 255)));
              let b = Math.max(0, Math.min(255, Math.round(transfer(b_lin) * 255)));

              return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };

            const safeOklchToRgb = (l: string, c: string, h: string, a?: string) => {
              try {
                if (l.includes('var') || c.includes('var') || h.includes('var') || (a && a.includes('var'))) {
                  return 'rgb(0, 0, 0)';
                }
                return oklchToRgb(l, c, h, a);
              } catch (err) {
                return 'rgb(0, 0, 0)';
              }
            };

            const safeOklabToRgb = (l: string, a_: string, b_: string, alpha?: string) => {
              try {
                if (l.includes('var') || a_.includes('var') || b_.includes('var') || (alpha && alpha.includes('var'))) {
                  return 'rgb(0, 0, 0)';
                }
                return oklabToRgb(l, a_, b_, alpha);
              } catch (err) {
                return 'rgb(0, 0, 0)';
              }
            };

            const oklchRegex = /oklch\(\s*([^\s,)]+)\s+([^\s,)]+)\s+([^\s,)/]+)(?:\s*\/\s*([^\s,)]+))?\s*\)/g;
            const oklabRegex = /oklab\(\s*([^\s,)]+)\s+([-0-9.]+)\s+([-0-9.]+)(?:\s*\/\s*([^\s,)]+))?\s*\)/g;

            // Process all styles in cloned document
            const styles = clonedDoc.getElementsByTagName("style");
            for (let i = 0; i < styles.length; i++) {
              const style = styles[i];
              if (style.innerHTML) {
                let text = style.innerHTML;
                if (text.includes("oklch")) {
                  text = text.replace(oklchRegex, (match, l, c, h, a) => {
                    return safeOklchToRgb(l, c, h, a);
                  });
                }
                if (text.includes("oklab")) {
                  text = text.replace(oklabRegex, (match, l, a_, b_, a) => {
                    return safeOklabToRgb(l, a_, b_, a);
                  });
                }
                style.innerHTML = text;
              }
            }

            // Process all element inline styles in cloned document
            const allElements = clonedDoc.getElementsByTagName("*");
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i];
              const inlineStyle = el.getAttribute("style");
              if (inlineStyle) {
                let updated = inlineStyle;
                if (updated.includes("oklch")) {
                  updated = updated.replace(oklchRegex, (match, l, c, h, a) => {
                    return safeOklchToRgb(l, c, h, a);
                  });
                }
                if (updated.includes("oklab")) {
                  updated = updated.replace(oklabRegex, (match, l, a_, b_, a) => {
                    return safeOklabToRgb(l, a_, b_, a);
                  });
                }
                el.setAttribute("style", updated);
              }
            }
          }
        });

        offscreenElement.style.height = originalStyle;

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
          heightLeft -= pdfHeight;
        }

        pdfBase64 = pdf.output('datauristring').split(',')[1];
      } catch (err) {
        console.error("Failed to generate offscreen template PDF:", err);
      }
    }

    if (!pdfBase64) {
      // Fallback to text-only PDF if offscreen generation fails
      const docPdf = new jsPDF();
      docPdf.setFontSize(20);
      docPdf.text('PRE-AUTHORIZATION REQUEST FORM', 105, 20, { align: 'center' });
      docPdf.setFontSize(12);
      docPdf.text(`Patient Name: ${finalFormData.p_name || 'N/A'}`, 20, 40);
      docPdf.text(`Policy Number: ${finalFormData.p_policy_no || 'N/A'}`, 20, 50);
      docPdf.text(`Insurance Company: ${finalFormData.insurance_company || 'N/A'}`, 20, 60);
      docPdf.text(`Hospital: ${hospitalProfile?.hospitalName || 'N/A'}`, 20, 70);
      docPdf.text(`Diagnosis: ${finalFormData.diagnosis || 'N/A'}`, 20, 80);
      docPdf.text(`Estimated Cost: ₹${finalFormData.estimatedCost || 'N/A'}`, 20, 90);
      docPdf.text(`Treatment Type: ${finalFormData.p_treatment_type || 'N/A'}`, 20, 100);
      docPdf.text('---------------------------------------------------------', 20, 110);
      docPdf.text('This is an automatically generated pre-authorization form.', 20, 120);
      docPdf.text('Generated Date: ' + new Date().toLocaleString(), 20, 130);
      
      pdfBase64 = docPdf.output('datauristring').split(',')[1];
    }

    processedDocs.push({
      name: `Pre-Auth-Form-${(finalFormData.p_name || "Patient").replace(/\s+/g, "-")}.pdf`,
      type: "Generated Pre-Auth Form",
      data: pdfBase64,
      mimeType: "application/pdf",
    });

    // Point 7: New Admissions fall to both Medical and CRM KYP bucket
    const activeHospitalId = selectedHospitalId || currentUser.hospitalId || "";
    const activeHospitalProfile = hospitals.find(h => h.id === activeHospitalId);
    // Medical scrutiny is the safe default. A hospital must explicitly turn
    // it off before a new admission can bypass the Medical Underwriting
    // queue. This also protects hospital users whose full profile is not
    // loaded into this browser session.
    const medicalScrutinyRequired =
      activeHospitalProfile?.valueAddedServices?.medicalScrutinyRequired !== false;
    const initialStatus = medicalScrutinyRequired
      ? ClaimStatus.PENDING_MEDICAL_REVIEW
      : ClaimStatus.PRE_AUTH_INITIATED;

    const newClaim: Claim = {
      id: id || `CL-${Date.now()}`,
      caseReferenceId: `REF-${Math.floor(Math.random() * 999999)}`,
      patientId: `P-${Math.floor(Math.random() * 9999)}`,
      patientName: finalFormData.p_name || "New Patient",
      insuranceProvider:
        finalFormData.insurance_company || "Insurance Provider",
      policyNumber: finalFormData.p_policy_no || "POL-UNSET",
      estimatedCost: Number(finalFormData.adm_total_cost || 0),
      diagnosis: finalFormData.m_prov_diag || "Pending Diagnosis",
      admissionDate:
        finalFormData.adm_date || new Date().toISOString().split("T")[0],
      claimType: 'Cashless',
      product: finalFormData.product || Product.CPC,
      status: initialStatus,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hospitalId: activeHospitalId,
      formData: {
        ...finalFormData,
        hosp_name: currentUser.hospitalName,
        hosp_address: currentUser.address,
        hosp_rohini_id: currentUser.rohiniId,
        hosp_email: currentUser.emailId,
        hosp_mobile: currentUser.mobileNo,
        hospitalSeal: currentUser.hospitalSeal,
        doctorStamp: currentUser.doctorStamp,
      },
      history: [
        {
          id: `ev-wiz-${Date.now()}`,
          status: initialStatus,
          date: new Date().toISOString(),
          type: "admission",
          userName: currentUser.displayName || currentUser.username || "System",
          userRole: currentUser.role || 'Hospital User',
          comment: "New Cashless Admission submitted. Case flow initiated simultaneously to Medical Underwriting and Policy Audit Team.",
          stageData: {
            // Binary data is uploaded only after the claim has a database UUID.
            // Keeping it out of claim state also prevents oversized JSON requests.
            documents: processedDocs.map(({ data, ...document }) => document),
          },
        },
      ],
    };

    setActiveTemplateName(determineTemplateName());

    // External Integration Sync
    if (apiConfig?.externalIntegEnabled && apiConfig?.webhookUrl) {
      try {
        console.log("Triggering external case processing sync...");
        const syncResponse = await fetch('/api/v1/external/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claim: newClaim,
            webhookUrl: apiConfig.webhookUrl,
            apiKey: apiConfig.apiKey
          })
        });
        const syncResult = await syncResponse.json();
        if (syncResult.status === 'success') {
          newClaim.externalReferenceId = syncResult.externalReference;
          newClaim.externalIntegStatus = 'Synced';
          toast.success("Case synced with external processing portal");
        }
      } catch (err) {
        console.error("External sync failed:", err);
        newClaim.externalIntegStatus = 'Failed';
      }
    }

    // Save manual diagnosis if applicable
    if (isManualDiagnosis && finalFormData.m_prov_diag) {
      try {
        await dualStorageService.save('manualDiagnoses', {
          diagnosisName: finalFormData.m_prov_diag,
          claimId: newClaim.id,
          hospitalId: hospitalContextId || currentUser.hospitalName,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to save manual diagnosis:", err);
      }
    }

    // Mark source patient documents as linked if they came from vault
    const navState = location.state as any;
    if (navState?.sourcePatientDocIds) {
      try {
        for (const docId of navState.sourcePatientDocIds) {
          await dualStorageService.save('patientDocuments', {
            status: 'Linked',
            linkedClaimId: newClaim.id
          }, docId);
        }
      } catch (err) {
        console.warn("Could not link vaulted documents:", err);
      }
    }

    const savedClaim = await onSave(newClaim, { preventNavigation: true } as any);
    const persistedClaim = savedClaim || newClaim;
    const persistedClaimId = String((persistedClaim as any)?.id || '');

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(persistedClaimId)) {
      const uploads = await Promise.allSettled(
        processedDocs.map((document) => documentsApi.uploadClaimFile({
          claimId: persistedClaimId,
          file: base64ToFile(document.data, document.name, document.mimeType),
          category: document.type,
        })),
      );
      const failedUploads = uploads.filter((upload) => upload.status === 'rejected');
      if (failedUploads.length) {
        console.error('Some claim documents could not be stored:', failedUploads);
        toast.error(`${failedUploads.length} claim document(s) could not be stored.`);
      }
    } else {
      console.warn('Claim was not persisted to the backend; skipping document upload.');
    }

    setGeneratedClaim(persistedClaim);
    setSubmissionComplete(true);
    setIsSaving(false);
  };

  // ... (PolicyAnalysisModal and MedicalReviewModal render code omitted for brevity as they are unchanged)
  const PolicyAnalysisModal = () => (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-[2.5rem] shadow-2xl w-full max-w-[90vw] xl:max-w-[1200px] overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh] border border-white/20">
        {/* ... Content ... */}
        <div className="px-10 py-8 bg-white border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 bg-[#000080] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/20">
              <Sparkles size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                Policy Intelligence
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                AI-Extracted Coverage & Limits
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPolicyModalOpen(false)}
            className="p-4 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LimitCard
              label="Sum Insured"
              value={formData.p_sum_insured}
              icon={Wallet}
              color="emerald"
            />
            <LimitCard
              label="Room Rent Limit"
              value={formData.p_room_eligibility}
              icon={Building}
              color="blue"
            />
            <LimitCard
              label="ICU / ICCU Limit"
              value={formData.p_icu_eligibility}
              icon={Activity}
              color="indigo"
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-50">
              <ShieldCheck size={20} className="text-[#000080]" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                Coverage Specifications
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8">
              <BenefitItem label="Co-Pay" value={formData.p_copay} />
              <BenefitItem label="Sub-Limit" value={formData.p_sub_limit} />
              <BenefitItem
                label="Bonus / NCB"
                value={`${formData.p_bonus} / ${formData.p_ncb}`}
              />
              <BenefitItem
                label="Restoration"
                value={formData.p_restore_benefit}
              />
              <BenefitItem label="Pre-Hosp" value={formData.p_pre_hosp} />
              <BenefitItem label="Post-Hosp" value={formData.p_post_hosp} />
              <BenefitItem label="Ambulance" value={formData.p_ambulance} />
              <BenefitItem label="Daily Cash" value={formData.p_daily_cash} />
            </div>
          </div>
          {formData.p_ai_analysis && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-8 rounded-[2rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Bot size={120} className="text-indigo-900" />
              </div>
              <div className="relative z-10 flex gap-6">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Zap size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-3">
                    AI Coverage Assessment
                  </h4>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed text-justify">
                    {formData.p_ai_analysis}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-8 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={() => setIsPolicyModalOpen(false)}
            className="px-10 py-4 bg-blue-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-blue-950 transition-all active:scale-95 flex items-center"
          >
            <CheckCircle size={18} className="mr-2" /> Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );

  const MedicalReviewModal = () => (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[80vw] xl:max-w-[1000px] overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh]">
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
                AI Analyzed Medical Data
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
            {medicalAnalysis?.approvalPrediction && (
              <div
                className={`p-6 rounded-2xl border flex items-start gap-4 ${medicalAnalysis.approvalPrediction.chance === "High" ? "bg-emerald-50 border-emerald-200" : medicalAnalysis.approvalPrediction.chance === "Medium" ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}
              >
                <div
                  className={`p-3 rounded-xl shrink-0 ${medicalAnalysis.approvalPrediction.chance === "High" ? "bg-emerald-100 text-emerald-700" : medicalAnalysis.approvalPrediction.chance === "Medium" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}
                >
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={`text-lg font-black uppercase tracking-tight ${medicalAnalysis.approvalPrediction.chance === "High" ? "text-emerald-800" : medicalAnalysis.approvalPrediction.chance === "Medium" ? "text-amber-800" : "text-rose-800"}`}
                    >
                      {medicalAnalysis.approvalPrediction.chance} Approval
                      Probability
                    </h3>
                  </div>
                  <p
                    className={`text-xs font-medium leading-relaxed ${medicalAnalysis.approvalPrediction.chance === "High" ? "text-emerald-700" : medicalAnalysis.approvalPrediction.chance === "Medium" ? "text-amber-700" : "text-rose-700"}`}
                  >
                    {medicalAnalysis.approvalPrediction.reason}
                  </p>
                </div>
              </div>
            )}
            {medicalAnalysis?.suggestedDocuments &&
              medicalAnalysis.suggestedDocuments.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100">
                    <CheckSquare size={16} className="text-blue-600" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Recommended Supporting Docs
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {medicalAnalysis.suggestedDocuments.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-xs font-bold text-slate-700">
                          {doc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    {medicalAnalysis?.diagnosis || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Nature of Illness
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {medicalAnalysis?.recommendedTreatment || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Clinical Findings
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {medicalAnalysis?.m_clinical_findings || "N/A"}
                  </p>
                </div>
              </div>
            </div>
            {(medicalAnalysis?.chronicConditions ||
              medicalAnalysis?.socialHabits) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100">
                  <AlertCircle size={16} className="text-rose-600" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    Risk Factors Identified
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {medicalAnalysis?.socialHabits?.tobacco?.status && (
                    <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black uppercase border border-rose-100">
                      Tobacco User
                    </span>
                  )}
                  {medicalAnalysis?.socialHabits?.alcohol?.status && (
                    <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black uppercase border border-rose-100">
                      Alcohol Consumption
                    </span>
                  )}
                  {medicalAnalysis?.chronicConditions?.diabetes?.status && (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase border border-amber-100">
                      Diabetes (
                      {medicalAnalysis.chronicConditions.diabetes.since ||
                        "Unknown"}
                      )
                    </span>
                  )}
                  {medicalAnalysis?.chronicConditions?.hypertension?.status && (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase border border-amber-100">
                      Hypertension
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={() => setIsMedicalModalOpen(false)}
            className="px-8 py-3 bg-blue-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-950 transition-all active:scale-95"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );

  if (submissionComplete && generatedClaim) {
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

    if (showHospitalSelection) {
      return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
          <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-200 text-center">
            <h2 className="text-2xl font-black text-slate-800 mb-6">
              Select Hospital
            </h2>
            <p className="text-slate-500 mb-8">
              Please select the hospital for which you want to create a new
              admission.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentUser.assignedHospitalIds?.map((id) => {
                const hospital = hospitals.find((h) => h.id === id);
                if (!hospital) return null;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedHospitalId(id);
                      setShowHospitalSelection(false);
                    }}
                    className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <p className="font-black text-slate-800">
                      {hospital.hospitalName}
                    </p>
                    <p className="text-xs text-slate-500">{hospital.address}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col space-y-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 no-print">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate("/cashless-dashboard")}
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
                onClick={() => navigate(`/process-claim/${generatedClaim.id}?source=cashless`)}
                className="px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center hover:bg-blue-50 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowUpRight size={16} className="mr-2" /> View Patient Dashboard
              </button>
              <button
                onClick={handleDownloadTemplatePDF}
                disabled={isGeneratingPdf}
                className="px-6 py-3 bg-[#000080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-blue-800 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Download size={16} className="mr-2" /> {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
              >
                <Printer size={16} className="mr-2" /> Print Form
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-start justify-between gap-6">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Insurance Company
              </label>
              <div className="relative group">
                <select
                  value={formData.insurance_company}
                  onChange={(e) =>
                    handlePostSubmitChange("insurance_company", e.target.value)
                  }
                  className="w-full h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                >
                  {insurers.map((i) => (
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
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border ${formData.in_house_processing === "Yes" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200"}`}
                >
                  In-House
                </button>
                <button
                  onClick={() =>
                    handlePostSubmitChange("in_house_processing", "No")
                  }
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border ${formData.in_house_processing === "No" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200"}`}
                >
                  TPA
                </button>
              </div>
              {formData.in_house_processing === "No" && (
                <div className="relative group">
                  <select
                    value={formData.tpa_provider}
                    onChange={(e) =>
                      handlePostSubmitChange("tpa_provider", e.target.value)
                    }
                    className="w-full h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select TPA...</option>
                    {tpas.map((t) => (
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
        <div id="claim-template-printable" className="bg-white print:block print:w-full print:h-full print:overflow-visible">
          {renderActiveTemplate(formData)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[95vw] xl:max-w-[1400px] mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* SINGLE RECTANGLE CONTAINER */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col relative min-h-[600px]">
          {/* Container Header */}
          <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div className="flex items-center space-x-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${currentStep === 1 ? "bg-blue-600" : currentStep === 2 ? "bg-indigo-600" : "bg-emerald-600"} text-white`}
              >
                {currentStep === 1 ? (
                  <User size={24} />
                ) : currentStep === 2 ? (
                  <BriefcaseMedical size={24} />
                ) : (
                  <Landmark size={24} />
                )}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                  {currentStep === 1
                    ? "Patient & Policy"
                    : currentStep === 2
                      ? "Clinical Details"
                      : "Admission & Fiscal"}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {currentStep === 1
                    ? "Demographic & Insurance Data"
                    : currentStep === 2
                      ? "Diagnosis & Medical History"
                      : "Logistics & Cost Estimation"}
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                Step {currentStep} of 3
              </span>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-10 lg:p-12">
            {/* STEP 1: PATIENT & POLICY */}
            {currentStep === 1 && (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                {/* Existing Claims for this Patient */}
                {patientHistory.length > 0 && (
                  <div className="bg-slate-50/80 rounded-[2rem] border border-slate-200 p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center">
                          <HistoryIcon size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight">
                            Previous admissions under the current policy
                          </h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Historical context at {currentUser.hospitalName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {patientHistory.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <button
                                onClick={() => {
                                  setSelectedPatientClaim(c);
                                  setIsPatientProfileModalOpen(true);
                                }}
                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 hover:underline text-left"
                              >
                                {c.patientName}
                              </button>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {c.diagnosis}
                              </p>
                            </div>
                            <div
                              className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                c.status === ClaimStatus.CLAIM_APPROVED
                                  ? "bg-emerald-50 text-emerald-600"
                                  : c.status === ClaimStatus.PRE_AUTH_REJECTED
                                    ? "bg-rose-50 text-rose-600"
                                    : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {c.status}
                            </div>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-slate-50">
                            <div className="flex justify-between text-[9px]">
                              <span className="font-bold text-slate-400 uppercase">
                                Admitted:
                              </span>
                              <span className="font-black text-slate-700">
                                {c.admissionDate}
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px]">
                              <span className="font-bold text-slate-400 uppercase">
                                Cost:
                              </span>
                              <span className="font-black text-slate-700">
                                ₹{c.estimatedCost.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px]">
                              <span className="font-bold text-slate-400 uppercase">
                                Policy:
                              </span>
                              <span className="font-black text-slate-700">
                                {c.policyNumber}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div 
                    className="bg-blue-50/50 rounded-3xl border-2 border-dashed border-blue-200 p-8 hover:border-blue-400 transition-all group relative"
                    onDragOver={(evt) => {
                      evt.preventDefault();
                      evt.stopPropagation();
                    }}
                    onDrop={(evt) => {
                      evt.preventDefault();
                      evt.stopPropagation();
                      if (isProcessingPolicy) return;
                      const file = evt.dataTransfer.files?.[0];
                      if (file) {
                        handlePolicyUpload(file);
                      }
                    }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <label
                        htmlFor="policy-upload"
                        className="cursor-pointer flex items-center flex-1"
                      >
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isProcessingPolicy ? "bg-white" : "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"} shadow-sm`}
                        >
                          {isProcessingPolicy ? (
                            <Loader2
                              size={24}
                              className="animate-spin text-blue-600"
                            />
                          ) : (
                            <Sparkles size={24} />
                          )}
                        </div>
                        <div className="ml-5">
                          <span className="block text-sm font-black text-slate-700 uppercase tracking-tight">
                            Upload Policy E-Card / Doc
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mt-1">
                            {isProcessingPolicy
                              ? "AI Analysis in Progress..."
                              : "Auto-Extract Benefits & Members (Max 5MB)"}
                          </span>
                        </div>
                      </label>
                      <input
                        type="file"
                        id="policy-upload"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={handlePolicyUpload}
                        disabled={isProcessingPolicy}
                      />

                      {extractedMembers.length > 0 && (
                        <div className="flex-1 bg-white/60 p-4 rounded-xl border border-blue-100/50">
                          <div className="flex items-center space-x-2 mb-2">
                            <Users size={14} className="text-blue-500" />
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                              Members Found
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {extractedMembers.map((member, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSelectMember(member)}
                                className="text-[10px] font-bold text-blue-600 underline hover:text-blue-800 transition-colors"
                              >
                                {member.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isProcessingPolicy ? (
                        <button
                          disabled
                          className="px-6 py-3 bg-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center cursor-not-allowed"
                        >
                          <Loader2 size={14} className="mr-2 animate-spin" />
                          Analyzing Policy...
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {uploadError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center space-x-2 text-rose-600 animate-in fade-in slide-in-from-top-1">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span className="text-[10px] font-bold">
                        {uploadError}
                      </span>
                    </div>
                  )}
                </div>

                {/* Insurance & Underwriting Context */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-100 pb-2">
                    <ShieldCheck size={14} />{" "}
                    <span>Insurance & Underwriting Context</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <InputField
                      label="Insurance Company"
                      icon={Building}
                      type="select"
                      options={insurers.map((i) => i.name)}
                      value={formData.insurance_company}
                      onChange={(v: any) => handleUpdate("insurance_company", v)}
                      required
                    />

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                      <InputField
                        label="Is this a TPA Case?"
                        type="radio"
                        options={["Yes", "No"]}
                        value={
                          formData.in_house_processing === "Yes" ? "No" : "Yes"
                        }
                        onChange={(v: any) =>
                          handleUpdate(
                            "in_house_processing",
                            v === "Yes" ? "No" : "Yes",
                          )
                        }
                      />
                    </div>

                    <div className="">
                      {formData.in_house_processing === "No" && (
                        <InputField
                          label="TPA Provider"
                          icon={ShieldCheck}
                          type="select"
                          options={tpas.map((t) => t.name)}
                          value={formData.tpa_provider}
                          onChange={(v: any) => handleUpdate("tpa_provider", v)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Contacts & Identifiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
                  <InputField
                    label="Mobile Number"
                    icon={Phone}
                    type="number"
                    value={formData.p_contact}
                    onChange={(v: any) => handleUpdate("p_contact", v)}
                    required
                    placeholder="9876543210"
                  />

                  <InputField
                    label="Email ID"
                    icon={Mail}
                    type="email"
                    value={formData.p_email}
                    onChange={(v: any) => handleUpdate("p_email", v)}
                    placeholder="patient@email.com"
                    error={emailError}
                  />

                  <InputField
                    label="Hospital UHID / IPD"
                    icon={Hash}
                    value={formData.p_uhid}
                    onChange={(v: any) => handleUpdate("p_uhid", v)}
                    required
                    placeholder="HOSP-UHID-XXXX"
                  />
                </div>

                {/* Row: Demographics & Policy side-by-side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-slate-100 mt-8">
                  {/* Patient Identification & Demographics */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-100 pb-2">
                      <User size={14} />{" "}
                      <span>Patient Identification & Demographics</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-x-5 gap-y-6">
                      {/* Line 1: Full Patient Name */}
                      <InputField
                        label="Full Patient Name"
                        icon={User}
                        value={formData.p_name}
                        onChange={(v: any) => handleUpdate("p_name", v)}
                        required
                        placeholder="Enter Full Name"
                        className="md:col-span-6"
                      />
                      {/* Line 2: Gender (Now below Name) */}
                      <InputField
                        label="Gender"
                        icon={UserCheck}
                        type="radio"
                        options={["Male", "Female", "THIRD GENDER"]}
                        value={formData.p_gender}
                        onChange={(v: any) => handleUpdate("p_gender", v)}
                        className="md:col-span-6 border-b border-slate-50 pb-2"
                      />

                      {/* Line 2: Date of Birth, Age */}
                      <InputField
                        label="Date of Birth"
                        icon={CalendarDays}
                        type="date"
                        value={formData.p_dob}
                        onChange={(v: any) => handleUpdate("p_dob", v)}
                        onBlur={() =>
                          validateDateOnBlur("p_dob", formData.p_dob)
                        }
                        required
                        className="md:col-span-4 lg:col-span-3"
                      />
                      <InputField
                        label="Age (Yrs)"
                        icon={Hash}
                        type="number"
                        value={formData.p_age_y}
                        onChange={(v: any) => handleUpdate("p_age_y", v)}
                        required
                        className="md:col-span-2 lg:col-span-3"
                      />
                    </div>
                  </div>

                  {/* Policy & Employment Information */}
                  <div className="space-y-6 lg:border-l lg:pl-12 lg:border-t-0 border-t border-slate-100 lg:mt-0 pt-8 lg:pt-0">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-100 pb-2">
                      <CreditCard size={14} />{" "}
                      <span>Policy & Employment Information</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-6">
                      {/* Line 1: Policy Number beside Corporate Name */}
                      <InputField
                        label="Policy Number"
                        icon={CreditCard}
                        value={formData.p_policy_no}
                        onChange={(v: any) => handleUpdate("p_policy_no", v)}
                        required
                        placeholder="POLICY-XXXX-XXXX"
                        className="md:col-span-1"
                      />
                      <InputField
                        label="Corporate Name"
                        icon={Building2}
                        value={formData.corporate_name}
                        onChange={(v: any) => handleUpdate("corporate_name", v)}
                        placeholder="Enter Corporate Name"
                        className="md:col-span-1"
                      />

                      {/* Line 2: Member card id beside Employee id */}
                      <InputField
                        label="Member Card ID"
                        icon={Hash}
                        value={formData.p_card_id}
                        onChange={(v: any) => handleUpdate("p_card_id", v)}
                        placeholder="Member ID"
                        className="md:col-span-1"
                      />
                      <InputField
                        label="Employee ID"
                        icon={User}
                        value={formData.p_employee_id}
                        onChange={(v: any) => handleUpdate("p_employee_id", v)}
                        placeholder="EMP-ID (Corp)"
                        className="md:col-span-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Patient Records & Context */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10 pt-8 border-t border-slate-100 mt-8">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-100 pb-2">
                      <Phone size={14} /> <span>Communication & Address</span>
                    </div>
                    <div className="grid grid-cols-1 gap-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                      <InputField
                        label="Alt Contact"
                        icon={Phone}
                        type="number"
                        value={formData.p_relative_contact}
                        onChange={(v: any) =>
                          handleUpdate("p_relative_contact", v)
                        }
                        placeholder="Relative Mobile (Optional)"
                      />
                      <InputField
                        label="Residential Address"
                        icon={MapPin}
                        type="textarea"
                        value={formData.p_address}
                        onChange={(v: any) => handleUpdate("p_address", v)}
                        placeholder="Permanent address... (Optional)"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-100 pb-2">
                      <ShieldAlert size={14} /> <span>Additional Declarations</span>
                    </div>

                    <div className="grid grid-cols-1 gap-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                      <div className="space-y-4">
                        <InputField
                          label="Do you have a Family Physician?"
                          type="radio"
                          options={["Yes", "No"]}
                          value={formData.p_family_physician}
                          onChange={(v: any) =>
                            handleUpdate("p_family_physician", v)
                          }
                        />
                        {formData.p_family_physician === "Yes" && (
                          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                            <InputField
                              label="Physician Name"
                              value={formData.p_family_physician_name}
                              onChange={(v: any) =>
                                handleUpdate("p_family_physician_name", v)
                              }
                              placeholder="Dr. Name"
                            />
                            <InputField
                              label="Physician Contact"
                              type="number"
                              value={formData.p_family_physician_contact}
                              onChange={(v: any) =>
                                handleUpdate("p_family_physician_contact", v)
                              }
                              placeholder="Mobile No"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <InputField
                          label="Any other Mediclaim / Health Insurance?"
                          type="radio"
                          options={["Yes", "No"]}
                          value={formData.p_other_insurance}
                          onChange={(v: any) =>
                            handleUpdate("p_other_insurance", v)
                          }
                        />
                        {formData.p_other_insurance === "Yes" && (
                          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                            <InputField
                              label="Other Insurance Company"
                              type="select"
                              options={insurers.map((i) => i.name)}
                              value={formData.p_other_insurer_name}
                              onChange={(v: any) =>
                                handleUpdate("p_other_insurer_name", v)
                              }
                            />
                            <InputField
                              label="Details"
                              type="textarea"
                              value={formData.p_other_insurance_details}
                              onChange={(v: any) =>
                                handleUpdate("p_other_insurance_details", v)
                              }
                              placeholder="Policy Number, SI, etc."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ... (Step 2 and Step 3 remain unchanged) ... */}
            {/* STEP 2: CLINICAL DETAILS */}
            {currentStep === 2 && (
              <div className="animate-in slide-in-from-right-4 duration-500 space-y-8">
                {/* Medical Document AI Upload (REMOVED: Now handled in Patient & Policy) */}
                {/* 
                <div className="space-y-2">
                  ...
                </div>
                */}

                {/* Doctor & Illness */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 border-b border-indigo-100 pb-2">
                      <Stethoscope size={14} />{" "}
                      <span>Treating Doctor & Diagnosis</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <InputField
                        label="Name of treating doctor"
                        value={formData.dr_name}
                        onChange={(v: any) => handleUpdate("dr_name", v)}
                        required
                      />
                      <InputField
                        label="Contact number"
                        type="number"
                        value={formData.dr_contact}
                        onChange={(v: any) => handleUpdate("dr_contact", v)}
                      />
                    </div>
                    <InputField
                      label="Nature of illness/Disease with presenting complaints"
                      type="textarea"
                      value={formData.m_illness}
                      onChange={(v: any) => handleUpdate("m_illness", v)}
                      required
                    />
                    <InputField
                      label="Relevant Critical Findings"
                      type="textarea"
                      value={formData.m_clinical_findings}
                      onChange={(v: any) =>
                        handleUpdate("m_clinical_findings", v)
                      }
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <InputField
                        label="Duration of ailment (Days)"
                        type="number"
                        value={formData.m_duration}
                        onChange={(v: any) => handleUpdate("m_duration", v)}
                      />
                      <InputField
                        label="Date of first consultation"
                        type="date"
                        value={formData.m_first_cons_date}
                        onChange={(v: any) =>
                          handleUpdate("m_first_cons_date", v)
                        }
                      />
                    </div>
                    <InputField
                      label="Past history of present ailment, if any"
                      type="textarea"
                      value={formData.m_past_history}
                      onChange={(v: any) => handleUpdate("m_past_history", v)}
                    />
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 border-b border-indigo-100 pb-2">
                      <Activity size={14} />{" "}
                      <span>Diagnosis & Treatment Protocol</span>
                    </div>
                    <DiagnosisAutocomplete
                      value={formData.m_prov_diag || ""}
                      onChange={(v: string, isManual: boolean) => {
                        handleUpdate("m_prov_diag", v);
                        setIsManualDiagnosis(isManual);
                      }}
                      required
                    />
                    <InputField
                      label="ICD 10 codes"
                      value={formData.m_icd_code}
                      onChange={(v: any) => handleUpdate("m_icd_code", v)}
                    />

                    <InputField
                      label="Proposed line of treatment"
                      type="select"
                      options={[
                        "Medical Management",
                        "Surgical Management",
                        "Intensive care",
                        "Investigation",
                        "Non-allopathic treatment",
                      ]}
                      value={formData.m_treatment_type}
                      onChange={(v: any) => handleUpdate("m_treatment_type", v)}
                      required
                    />

                    {(formData.m_treatment_type === "Medical Management" ||
                      formData.m_treatment_type === "Investigation") && (
                      <div className="p-4 bg-indigo-50/50 rounded-xl space-y-4 border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                        <InputField
                          label="If Investigation/Medical management details"
                          type="textarea"
                          value={formData.m_investigation_details}
                          onChange={(v: any) =>
                            handleUpdate("m_investigation_details", v)
                          }
                        />
                        <InputField
                          label="Route Of Drug Administration"
                          type="select"
                          options={["IV & ORAL", "IV", "ORAL", "OTHER"]}
                          value={formData.m_route_drug}
                          onChange={(v: any) => handleUpdate("m_route_drug", v)}
                        />
                      </div>
                    )}

                    {formData.m_treatment_type === "Surgical Management" && (
                      <div className="p-4 bg-indigo-50/50 rounded-xl space-y-4 border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                        <InputField
                          label="Name Of Surgery"
                          value={formData.m_surgery_name}
                          onChange={(v: any) =>
                            handleUpdate("m_surgery_name", v)
                          }
                          required
                        />
                        <InputField
                          label="ICD 10 PCS Code"
                          value={formData.m_icd_pcs_code}
                          onChange={(v: any) =>
                            handleUpdate("m_icd_pcs_code", v)
                          }
                        />
                      </div>
                    )}

                    {(formData.m_treatment_type ===
                      "Non-allopathic treatment" ||
                      ![
                        "Medical Management",
                        "Surgical Management",
                        "Intensive care",
                        "Investigation",
                      ].includes(formData.m_treatment_type)) &&
                      formData.m_treatment_type && (
                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                          <InputField
                            label="If other treatment, provide details"
                            type="textarea"
                            value={formData.m_other_treatment_details}
                            onChange={(v: any) =>
                              handleUpdate("m_other_treatment_details", v)
                            }
                          />
                        </div>
                      )}
                  </div>
                </div>

                {/* Injury & Accident */}
                <div className="space-y-5">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2 border-b border-rose-100 pb-2">
                    <AlertCircle size={14} />{" "}
                    <span>Injury & Accident Details</span>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-4 p-5 bg-rose-50/30 rounded-2xl border border-rose-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          In case of accident (Is it RTA?)
                        </span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="rta"
                              checked={formData.m_is_rta === "Yes"}
                              onChange={() => handleUpdate("m_is_rta", "Yes")}
                              className="accent-rose-600"
                            />
                            <span className="text-xs font-bold text-slate-700">
                              Yes
                            </span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="rta"
                              checked={
                                formData.m_is_rta === "No" || !formData.m_is_rta
                              }
                              onChange={() => handleUpdate("m_is_rta", "No")}
                              className="accent-rose-600"
                            />
                            <span className="text-xs font-bold text-slate-700">
                              No
                            </span>
                          </label>
                        </div>
                      </div>

                      {formData.m_is_rta === "Yes" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 pt-2">
                          <InputField
                            label="Date of Injury"
                            type="date"
                            value={formData.m_rta_date}
                            onChange={(v: any) => handleUpdate("m_rta_date", v)}
                          />
                          <InputField
                            label="Report to police"
                            type="select"
                            options={["Yes", "No"]}
                            value={formData.m_rta_police}
                            onChange={(v: any) =>
                              handleUpdate("m_rta_police", v)
                            }
                          />
                          <InputField
                            label="FIR NO"
                            value={formData.m_fir_no}
                            onChange={(v: any) => handleUpdate("m_fir_no", v)}
                          />
                          <InputField
                            label="Substance abuse/Alcohol?"
                            type="select"
                            options={["Yes", "No"]}
                            value={formData.m_abuse_alcohol}
                            onChange={(v: any) =>
                              handleUpdate("m_abuse_alcohol", v)
                            }
                          />
                          <InputField
                            label="Test conducted?"
                            type="select"
                            options={["Yes", "No"]}
                            value={formData.m_test_conducted}
                            onChange={(v: any) =>
                              handleUpdate("m_test_conducted", v)
                            }
                          />
                          <div className="md:col-span-2">
                            <InputField
                              label="How did injury occur"
                              type="textarea"
                              value={formData.m_injury_reason}
                              onChange={(v: any) => handleUpdate("m_injury_reason", v)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mandatory Past History - Toggle Logic */}
                <div className="space-y-5">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 border-b border-amber-100 pb-2 justify-between">
                    <div className="flex items-center">
                      <HistoryIcon size={14} className="mr-2" />{" "}
                      <span>Mandatory Past History</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.m_chronic_history === "Yes"}
                          onChange={() =>
                            handleUpdate("m_chronic_history", "Yes")
                          }
                          className="accent-amber-600"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Yes
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.m_chronic_history === "No"}
                          onChange={() =>
                            handleUpdate("m_chronic_history", "No")
                          }
                          className="accent-amber-600"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          No
                        </span>
                      </label>
                    </div>
                  </div>

                  {formData.m_chronic_history === "Yes" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 bg-amber-50/30 rounded-2xl border border-amber-100 animate-in fade-in slide-in-from-top-2">
                      {CHRONIC_ILLNESSES.map((ill) => {
                        const key = ill.key === "other" ? "other" : ill.key;
                        const statusKey = `m_chronic_${key}_status`;
                        const sinceKey = `m_chronic_${key}_since`;

                        return (
                          <div
                            key={ill.key}
                            className="p-3 bg-white rounded-xl border border-amber-100 shadow-sm hover:border-amber-300 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="text-[10px] font-bold text-slate-700 uppercase line-clamp-1"
                                title={ill.label}
                              >
                                {ill.label}
                              </span>
                              <input
                                type="checkbox"
                                checked={formData[statusKey] === "Yes"}
                                onChange={(e) =>
                                  handleUpdate(
                                    statusKey,
                                    e.target.checked ? "Yes" : "No",
                                  )
                                }
                                className="accent-amber-600 h-4 w-4 rounded cursor-pointer"
                              />
                            </div>
                            {formData[statusKey] === "Yes" && (
                              ill.isComment ? (
                                <input
                                  type="text"
                                  placeholder="Details..."
                                  value={formData[sinceKey] || ""}
                                  onChange={(e) =>
                                    handleUpdate(sinceKey, e.target.value)
                                  }
                                  className="w-full text-xs font-bold p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:border-amber-400"
                                />
                              ) : (
                                <div className="flex gap-1">
                                  <select
                                    value={formData[sinceKey]?.split('-')[0] || ""}
                                    onChange={(e) => {
                                      const m = e.target.value;
                                      const y = formData[sinceKey]?.split('-')[1] || "26";
                                      handleUpdate(sinceKey, m && y ? `${m}-${y}` : m ? `${m}-` : "");
                                    }}
                                    className="w-1/2 text-[10px] font-bold p-1 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:border-amber-400 cursor-pointer"
                                  >
                                    <option value="">Month</option>
                                    {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map(m => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={formData[sinceKey]?.split('-')[1] || ""}
                                    onChange={(e) => {
                                      const m = formData[sinceKey]?.split('-')[0] || "JAN";
                                      const y = e.target.value;
                                      handleUpdate(sinceKey, m && y ? `${m}-${y}` : y ? `-${y}` : "");
                                    }}
                                    className="w-1/2 text-[10px] font-bold p-1 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:border-amber-400 cursor-pointer"
                                  >
                                    <option value="">Year</option>
                                    {Array.from({ length: 41 }, (_, i) => {
                                      const yr = String(new Date().getFullYear() - i).substring(2);
                                      return <option key={yr} value={yr}>{yr}</option>;
                                    })}
                                  </select>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Maternity - Toggle Logic */}
                <div className="space-y-5">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-pink-600 uppercase tracking-widest mb-2 border-b border-pink-100 pb-2 justify-between">
                    <div className="flex items-center">
                      <Baby size={14} className="mr-2" />{" "}
                      <span>Maternity Details</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.m_is_maternity === "Yes"}
                          onChange={() => handleUpdate("m_is_maternity", "Yes")}
                          className="accent-pink-600"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Yes
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.m_is_maternity === "No"}
                          onChange={() => handleUpdate("m_is_maternity", "No")}
                          className="accent-pink-600"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          No
                        </span>
                      </label>
                    </div>
                  </div>

                  {formData.m_is_maternity === "Yes" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2 p-5 bg-pink-50/30 rounded-2xl border border-pink-100">
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <InputField
                            label="G"
                            placeholder="Gravida"
                            value={formData.m_mat_g}
                            onChange={(v: any) => handleUpdate("m_mat_g", v)}
                            className="bg-white"
                          />
                        </div>
                        <div className="flex-1">
                          <InputField
                            label="P"
                            placeholder="Para"
                            value={formData.m_mat_p}
                            onChange={(v: any) => handleUpdate("m_mat_p", v)}
                            className="bg-white"
                          />
                        </div>
                        <div className="flex-1">
                          <InputField
                            label="L"
                            placeholder="Living"
                            value={formData.m_mat_l}
                            onChange={(v: any) => handleUpdate("m_mat_l", v)}
                            className="bg-white"
                          />
                        </div>
                        <div className="flex-1">
                          <InputField
                            label="A"
                            placeholder="Abortions"
                            value={formData.m_mat_a}
                            onChange={(v: any) => handleUpdate("m_mat_a", v)}
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <InputField
                        label="Expected date of delivery"
                        type="date"
                        value={formData.m_mat_edd}
                        onChange={(v: any) => handleUpdate("m_mat_edd", v)}
                        onBlur={() => validateDateOnBlur("m_mat_edd", formData.m_mat_edd)}
                        className="bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: ADMISSION & FISCAL */}
            {currentStep === 3 && (
              <div className="animate-in slide-in-from-right-4 duration-500 space-y-10">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  {/* Left Column: Admission Logistics */}
                  <div className="space-y-5">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 border-b border-emerald-100 pb-2">
                      <Building size={14} /> <span>Admission Logistics</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <InputField
                        label="Admission Type"
                        type="select"
                        options={["Emergency", "Planned"]}
                        value={formData.adm_type}
                        onChange={(v: any) => handleUpdate("adm_type", v)}
                        required
                      />
                      <InputField
                        label="Date of Admission"
                        icon={CalendarDays}
                        type="date"
                        value={formData.adm_date}
                        onChange={(v: any) => handleUpdate("adm_date", v)}
                        onBlur={() => validateDateOnBlur("adm_date", formData.adm_date)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <InputField
                        label="Time"
                        type="time"
                        value={formData.adm_time}
                        onChange={(v: any) => handleUpdate("adm_time", v)}
                        required
                      />
                      <InputField
                        label="Expected Discharge Date"
                        type="date"
                        value={formData.adm_exp_discharge}
                        onChange={(v: any) =>
                          handleUpdate("adm_exp_discharge", v)
                        }
                        onBlur={() => validateDateOnBlur("adm_exp_discharge", formData.adm_exp_discharge)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <InputField
                        label="Exp. Stay (Days)"
                        type="number"
                        value={formData.adm_stay_days}
                        onChange={(v: any) => handleUpdate("adm_stay_days", v)}
                        required
                      />
                      <InputField
                        label="Days in ICU"
                        type="number"
                        value={formData.adm_icu_days}
                        onChange={(v: any) => handleUpdate("adm_icu_days", v)}
                      />
                    </div>
                    <InputField
                      label="Room Category"
                      type="select"
                      options={roomCategories.length > 0 ? roomCategories : [
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
                        "CCU",
                        "NICU",
                        "Single Room AC,ICU",
                        "Economy, Day Care",
                        "Single Room AC/Private AC",
                        "General Ward/Economy",
                        "Deluex Non AC",
                        "HDU/Isolation",
                        "Twin Sharing/Semi Deluxe",
                        "ICU with ventilator",
                        "ICU without ventilator",
                        "Rehabiliation Room",
                      ]}
                      value={formData.adm_room_type}
                      onChange={(v: any) => handleUpdate("adm_room_type", v)}
                    />
                  </div>

                  {/* Right Column: Document Submission Section */}
                  <div className="space-y-5">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-100 pb-2">
                      <FileUp size={14} /> <span>Document Submission</span>
                    </div>

                    <div 
                      className="bg-blue-50/30 p-6 rounded-[1.5rem] border border-blue-100 space-y-6 shadow-sm min-h-[300px] relative"
                      onDragOver={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                      }}
                      onDrop={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        const file = evt.dataTransfer.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`);
                            return;
                          }
                          setAttachedDocs((prev) => [
                            ...prev,
                            { type: additionalDocType, name: file.name, file },
                          ]);
                          toast.success(`Successfully added dropped document: ${file.name}`);
                        }
                      }}
                    >
                      <div className="grid grid-cols-1 gap-4">
                        <InputField
                          label="Select Document Type"
                          type="select"
                          options={[
                            "Consultation Paper",
                            "Indoor Case Paper",
                            "Investigation Reports",
                            "Policy Copy / E-Card",
                            "Other Documents",
                          ]}
                          value={additionalDocType}
                          onChange={(v: any) => setAdditionalDocType(v)}
                        />
                        <div className="flex flex-col justify-end mt-2">
                          <label
                            htmlFor="fiscal-doc-upload"
                            className="h-11 px-6 bg-[#000080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center cursor-pointer hover:bg-blue-800 transition-all active:scale-95 shadow-md w-full"
                          >
                            <Plus size={16} className="mr-2" />
                            Choose & Add File
                          </label>
                          <input
                            type="file"
                            id="fiscal-doc-upload"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  toast.error(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`);
                                  e.target.value = "";
                                  return;
                                }
                                setAttachedDocs((prev) => [
                                  ...prev,
                                  { type: additionalDocType, name: file.name, file },
                                ]);
                                e.target.value = "";
                              }
                            }}
                          />
                        </div>
                      </div>

                      {attachedDocs.length > 0 && (
                        <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-2">
                            Uploaded Documents ({attachedDocs.length})
                          </span>
                          <div className="grid grid-cols-1 gap-2">
                            {attachedDocs.map((doc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-left-2 transition-all hover:border-blue-300"
                              >
                                <div className="flex items-center space-x-3 overflow-hidden">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                    <FileText size={16} />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs font-black text-slate-700 leading-tight truncate max-w-[120px] sm:max-w-none">
                                      {doc.name}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                      {doc.type}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setAttachedDocs((prev) =>
                                      prev.filter((_, i) => i !== idx),
                                    )
                                  }
                                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Estimator - Full Width Below */}
                <div className="space-y-5">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 border-b border-emerald-100 pb-2">
                    <Banknote size={14} /> <span>Financial Estimator</span>
                  </div>
                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200/60 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InputField
                            label="Room Rent + Nursing + Diet"
                            type="number"
                            value={formData.cost_room_rent}
                            onChange={(v: any) =>
                              handleUpdate("cost_room_rent", v)
                            }
                          />
                          <InputField
                            label="ICU Charges"
                            type="number"
                            value={formData.cost_icu}
                            onChange={(v: any) => handleUpdate("cost_icu", v)}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InputField
                            label="OT Charges"
                            type="number"
                            value={formData.cost_ot}
                            onChange={(v: any) => handleUpdate("cost_ot", v)}
                          />
                          <InputField
                            label="Investigation + Diagnostics"
                            type="number"
                            value={formData.cost_investigation}
                            onChange={(v: any) =>
                              handleUpdate("cost_investigation", v)
                            }
                          />
                        </div>
                        <InputField
                          label="Professional Fees (Surgeon + Anesthetist + Cons)"
                          type="number"
                          value={formData.cost_prof_fees}
                          onChange={(v: any) =>
                            handleUpdate("cost_prof_fees", v)
                          }
                        />
                        <InputField
                          label="Medicines + Consumables + Implants"
                          type="number"
                          value={formData.cost_medicines}
                          onChange={(v: any) =>
                            handleUpdate("cost_medicines", v)
                          }
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InputField
                            label="Other Expenses"
                            type="number"
                            value={formData.cost_other}
                            onChange={(v: any) => handleUpdate("cost_other", v)}
                          />
                          <InputField
                            label="All-Inclusive Package"
                            type="number"
                            value={formData.cost_package}
                            onChange={(v: any) =>
                              handleUpdate("cost_package", v)
                            }
                          />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200 mt-2">
                        <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                            Total Estimated Cost
                          </span>
                          <span className="text-xl font-black text-emerald-600">
                            ₹{" "}
                            {Number(
                              formData.adm_total_cost || 0,
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* Container Footer */}
          <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  currentStep > 1
                    ? setCurrentStep(currentStep - 1)
                    : navigate("/cashless-dashboard")
                }
                className={`px-6 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center transition-all active:scale-95 shadow-sm ${
                  currentStep === 1
                    ? "hover:bg-[#EF4444] hover:text-white hover:border-[#EF4444]"
                    : "hover:bg-slate-50"
                }`}
              >
                <ChevronLeft size={16} className="mr-2" />{" "}
                {currentStep === 1 ? "Cancel Admission" : "Back"}
              </button>

              <button
                type="button"
                onClick={() => handleSaveDraft(true)}
                disabled={isSaving}
                className="px-6 py-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center transition-all active:scale-95 shadow-sm disabled:opacity-50"
                title="Save this claim as draft progress"
              >
                <Save size={16} className="mr-2" />{" "}
                Save Draft
              </button>
            </div>

            <button
              onClick={() =>
                currentStep < 3 ? handleNext() : handleFinalSave()
              }
              disabled={isSaving}
              className="px-10 py-3.5 bg-blue-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-[#10B981] transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : currentStep === 3 ? (
                "Finalize Admission"
              ) : (
                "Next Step"
              )}
              {currentStep < 3 && <ChevronRight size={16} className="ml-2" />}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isPolicyModalOpen && <PolicyAnalysisModal />}
      {isMedicalModalOpen && <MedicalReviewModal />}

      {isPatientProfileModalOpen && selectedPatientClaim && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    Patient Profile
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Historical Data & Demographics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPatientProfileModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Full Name
                  </p>
                  <p className="text-sm font-black text-slate-700">
                    {selectedPatientClaim.patientName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Policy Number
                  </p>
                  <p className="text-sm font-black text-slate-700">
                    {selectedPatientClaim.policyNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Gender
                  </p>
                  <p className="text-sm font-black text-slate-700">
                    {selectedPatientClaim.formData?.p_gender || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Age / DOB
                  </p>
                  <p className="text-sm font-black text-slate-700">
                    {selectedPatientClaim.formData?.p_dob ? formatDate(selectedPatientClaim.formData.p_dob) : "N/A"}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Medical History Summary */}
              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center">
                  <Stethoscope size={14} className="mr-2 text-blue-500" />{" "}
                  Medical Summary
                </h4>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Primary Diagnosis
                    </span>
                    <span className="text-[11px] font-black text-slate-700">
                      {selectedPatientClaim.diagnosis}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Treatment Type
                    </span>
                    <span className="text-[11px] font-black text-slate-700">
                      {selectedPatientClaim.formData?.m_treatment_type || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Chronic History
                    </span>
                    <span className="text-[11px] font-black text-slate-700">
                      {selectedPatientClaim.formData?.m_chronic_history || "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center">
                  <Phone size={14} className="mr-2 text-blue-500" /> Contact
                  Details
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Mobile
                    </p>
                    <p className="text-[11px] font-black text-slate-700">
                      {selectedPatientClaim.formData?.p_mobile || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Email
                    </p>
                    <p className="text-[11px] font-black text-slate-700">
                      {selectedPatientClaim.formData?.p_email || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsPatientProfileModalOpen(false)}
                className="px-8 py-3 bg-blue-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-950 transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden high-fidelity offscreen pre-auth template element for automated PDF capture during save */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1000px", background: "white" }}>
        <div id="claim-template-offscreen">
          {renderActiveTemplate(formData)}
        </div>
      </div>
    </>
  );
};

export default ClaimFormWizard;
