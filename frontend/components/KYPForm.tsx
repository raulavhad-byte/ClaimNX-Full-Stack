
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  X, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  FileText, 
  Info,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw, 
  Trash2,
  Clock,
  Eye,
  Download,
  Maximize2,
  Minimize2,
  FileSearch,
  Layout,
  Upload,
  FileCheck,
  Globe,
  Zap,
  Activity,
  Plus,
  Paperclip,
  History
} from 'lucide-react';
import { formatDate, formatDateTime, safeHtml2Canvas } from '../utils';
import { KYPPolicy, KYPStatus, Claim, ClaimStatus, Product, HospitalUser, InsuranceEntity } from '../types';
import { toast } from 'sonner';
import { auditService } from '../services/auditService';
import { documentsApi } from '../services/api';
import jsPDF from 'jspdf';

interface KYPFormProps {
  policy: KYPPolicy | null;
  claim?: Claim | null;
  hospitals?: HospitalUser[];
  onClose: () => void;
  onSave: (policy: KYPPolicy) => void;
  onUpdateClaim?: (claim: Claim) => void;
  currentUser?: any;
  viewMode?: boolean;
  insurers?: InsuranceEntity[];
}

const KYPForm: React.FC<KYPFormProps> = ({ policy, claim, hospitals = [], onClose, onSave, onUpdateClaim, currentUser, viewMode = false, insurers = [] }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<KYPPolicy>(() => {
    const base: KYPPolicy = policy ? { ...policy } : {
      id: Math.random().toString(36).substr(2, 9),
      policyNumber: claim?.policyNumber || '',
      insuredName: claim?.patientName || '',
      patientName: claim?.patientName || '',
      gender: (claim?.formData?.gender as any) || '',
      dob: claim?.formData?.dob || '',
      mobileNo: claim?.formData?.mobile_no || '',
      emailId: claim?.formData?.email_id || '',
      diagnosisName: claim?.diagnosis || '',
      companyName: claim?.insuranceProvider || '',
      tpaName: claim?.formData?.tpa_provider || '',
      policyType: 'Retail',
      sumInsured: parseFloat(String(claim?.formData?.p_sum_insured || '').replace(/[^0-9.]/g, '')) || Number(claim?.formData?.sum_insured) || Number(claim?.estimatedCost) || 0,
      balanceSI: parseFloat(String(claim?.formData?.p_sum_insured || '').replace(/[^0-9.]/g, '')) || Number(claim?.formData?.sum_insured) || Number(claim?.estimatedCost) || 0,
      status: 'Pending (KYP)',
      product_type: Product.KYP,
      source: 'INTERNAL USER',
      lastUpdatedDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      claimId: claim?.id,
      patientId: claim?.patientId,
    };
    if (base && !base.insurerProductName) {
      base.insurerProductName = claim?.formData?.insurer_product_name || (base.productName ? base.productName + ' - Core Tier' : '');
    }
    return base;
  });

  const getAvailableTransitions = (currentStatus: KYPStatus): KYPStatus[] => {
    switch (currentStatus) {
      case 'Pending (KYP)':
      case 'Pending':
        return ['Approved', 'Query Pending', 'Rejected'];
      case 'Query Pending':
        return ['Query Replied', 'Approved', 'Rejected'];
      case 'Query Replied':
        return ['Approved', 'Query Pending', 'Rejected'];
      case 'Approved':
      case 'Rejected':
        return []; 
      default:
        return [];
    }
  };

  const transitions = useMemo(() => getAvailableTransitions(formData.status), [formData.status]);

  const StatusBadge = ({ status }: { status: KYPStatus }) => {
    const config: Record<KYPStatus, { color: string, bg: string, icon: any }> = {
      'Pending (KYP)': { color: 'text-indigo-700', bg: 'bg-indigo-50', icon: Clock },
      'Pending': { color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
      'Approved': { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
      'Query Pending': { color: 'text-orange-700', bg: 'bg-orange-50', icon: AlertTriangle },
      'Rejected': { color: 'text-rose-700', bg: 'bg-rose-50', icon: ShieldAlert },
      'Query Replied': { color: 'text-blue-700', bg: 'bg-blue-50', icon: RefreshCw },
      'KYP Accepted': { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
      'KYP Completed': { color: 'text-blue-700', bg: 'bg-blue-50', icon: ShieldCheck },
      'KYP Query Pending': { color: 'text-orange-700', bg: 'bg-orange-50', icon: AlertTriangle },
      'KYP Query Replied': { color: 'text-indigo-700', bg: 'bg-indigo-50', icon: RefreshCw },
      'KYP Rejected': { color: 'text-rose-700', bg: 'bg-rose-50', icon: ShieldAlert },
      'KYP Pending Approval': { color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock }
    };

    const { color, bg, icon: Icon } = config[status] || config['Pending'];

    return (
      <div className={`px-4 py-1.5 rounded-xl border border-current/10 ${bg} ${color} flex items-center gap-2 text-[10px] font-black uppercase tracking-widest`}>
        <Icon size={12} />
        {status}
      </div>
    );
  };

  const [showPreview, setShowPreview] = useState(false);
  const [showDocViewer, setShowDocViewer] = useState(true);
  const [isDocMaximized, setIsDocMaximized] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [policyFile, setPolicyFile] = useState<string | null>(null);
  const [persistedClaimDocs, setPersistedClaimDocs] = useState<{ url: string; name: string }[]>([]);

  // Auto-show preview in view mode for completed cases
  useEffect(() => {
    if (viewMode && (policy?.status === 'Approved' || policy?.status === 'KYP Accepted' || policy?.status === 'KYP Completed' || (policy?.status as string) === 'Accepted')) {
      setShowPreview(true);
    }
  }, [viewMode, policy?.status]);
  
  // Claim uploads are stored privately by the backend. Fetch signed previews
  // instead of relying on obsolete inline/base64 document data in browser
  // state, which is intentionally stripped before persistence.
  useEffect(() => {
    let active = true;
    if (!claim?.id) {
      setPersistedClaimDocs([]);
      return () => { active = false; };
    }

    void (async () => {
      try {
        const records = await documentsApi.listClaimDocuments(claim.id);
        const previews = await Promise.all(records.map(async (record: any) => {
          const preview = await documentsApi.previewClaimDocument(record.id);
          return {
            url: preview?.preview_url ?? preview?.data?.preview_url ?? '',
            name: record.file_name ?? record.name ?? 'Claim document',
          };
        }));
        if (active) setPersistedClaimDocs(previews.filter((document) => document.url));
      } catch (error) {
        console.warn('Unable to load persisted claim documents for Policy Audit.', error);
        if (active) setPersistedClaimDocs([]);
      }
    })();

    return () => { active = false; };
  }, [claim?.id]);

  // Handle multiple documents from the secure store, claim history, and
  // legacy local state during migration.
  const claimDocs = useMemo(() => {
    const allDocs: {url: string, name: string}[] = [...persistedClaimDocs];
    
    // Add processed/uploaded policy file if it exists in state
    if (policyFile) {
      allDocs.push({ url: policyFile, name: 'Analyzed Policy' });
    }

    // Extract documents from claim history (admission, queries, etc.)
    if (claim?.history) {
      claim.history.forEach(event => {
        if (event.stageData?.documents) {
          event.stageData.documents.forEach((doc: any) => {
            let url = '';
            let name = '';
            
            if (typeof doc === 'string') {
              url = doc;
              name = `Document ${allDocs.length + 1}`;
            } else {
              // Handle structured doc object from ClaimFormWizard or other components
              url = doc.url || (doc.data ? `data:${doc.mimeType || 'application/pdf'};base64,${doc.data}` : '');
              name = doc.name || doc.type || `Document ${allDocs.length + 1}`;
            }

            if (url) {
              // Avoid duplicates if same URL is found
              if (!allDocs.some(d => d.url === url)) {
                allDocs.push({ url, name });
              }
            }
          });
        }
      });
    }

    // Also check claim.formData for any uploaded documents directly
    if (claim?.formData?.uploadedDocuments) {
       claim.formData.uploadedDocuments.forEach((doc: any) => {
          let url = doc.url || (doc.data ? `data:${doc.mimeType || 'application/pdf'};base64,${doc.data}` : '');
          if (url && !allDocs.some(d => d.url === url)) {
            allDocs.push({
              url,
              name: doc.name || doc.type || 'Upload'
            });
          }
       });
    }

    if (claim?.formData?.attachedDocs) {
      claim.formData.attachedDocs.forEach((doc: any) => {
        let url = (doc.data && typeof doc.data === 'string') ? (doc.data.startsWith('data:') ? doc.data : `data:application/pdf;base64,${doc.data}`) : '';
        if (url && !allDocs.some(d => d.url === url)) {
          allDocs.push({
            url,
            name: doc.name || doc.type || 'Attached Doc'
          });
        }
      });
    }

    return allDocs;
  }, [claim, policyFile, persistedClaimDocs]);

  const [viewingDocument, setViewingDocument] = useState<{ url: string, name: string } | null>(null);

  // Initialize with first document if available, prioritize "Policy Documents"
  useEffect(() => {
    if (!viewingDocument && claimDocs.length > 0) {
      const policyDoc = claimDocs.find(d => d.name.toLowerCase().includes('policy'));
      setViewingDocument(policyDoc || claimDocs[0]);
    }
  }, [claimDocs, viewingDocument]);

  const canEdit = useMemo(() => {
    const editRoles = ['Manager', 'Super Admin', 'KYP Head', 'Admin', 'Hospital Partner'];
    return editRoles.includes(currentUser?.role) || currentUser?.isAdmin;
  }, [currentUser]);

  const canApprove = useMemo(() => {
    const approveRoles = ['Manager', 'Super Admin', 'KYP Head', 'Admin'];
    return approveRoles.includes(currentUser?.role) || currentUser?.isAdmin;
  }, [currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File) => {
    if (!canEdit) {
      toast.error("You do not have permission to upload documents");
      return;
    }
    const isFile = typeof File === 'function' && e instanceof File;
    const file = isFile ? (e as File) : (e as React.ChangeEvent<HTMLInputElement>).target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setPolicyFile(url);
        setViewingDocument({ url, name: file.name });
        toast.success("Policy document uploaded successfully");
        // Audit log for document upload
        auditService.log({
          userId: currentUser?.id || 'system',
          userName: currentUser?.displayName || 'System User',
          action: 'UPLOAD_POLICY_DOCUMENT',
          resourceId: formData.id,
          resourceType: 'Document',
          details: `Uploaded policy document ${file.name} for case ${formData.id}`
        });
        // Auto-fill upon upload
        handleSimulateAI();
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-fill from claim if it's a new policy
  useEffect(() => {
    if (!policy && claim) {
      const autoFilledData: Partial<KYPPolicy> = {
        claimId: claim.id,
        policyNumber: claim.policyNumber || claim.formData?.policy_number || '',
        insuredName: claim.patientName || claim.formData?.patient_name || '',
        patientName: claim.patientName || claim.formData?.patient_name || '',
        gender: (claim.formData?.gender as any) || '',
        dob: claim.formData?.dob || '',
        mobileNo: claim.formData?.mobile_no || '',
        emailId: claim.formData?.email_id || '',
        companyName: claim.insuranceProvider || claim.formData?.insurance_provider || '',
        diagnosisName: claim.diagnosis || claim.formData?.diagnosis || '',
        sumInsured: parseFloat(String(claim.formData?.p_sum_insured || '').replace(/[^0-9.]/g, '')) || Number(claim.formData?.sum_insured) || Number(claim.estimatedCost) || 0,
        balanceSI: parseFloat(String(claim.formData?.p_sum_insured || '').replace(/[^0-9.]/g, '')) || Number(claim.formData?.balance_si) || Number(claim.formData?.balance_s_i) || Number(claim.estimatedCost) || 0,
        // Map other fields from claim.formData if they exist
        tpaName: claim.formData?.tpa_provider || '',
        productName: claim.formData?.product_name || '',
        insurerProductName: claim.formData?.insurer_product_name || (claim.formData?.product_name ? claim.formData.product_name + ' - Core Tier' : ''),
        policyType: (claim.formData?.policy_type as any) || 'Retail',
        roomRentLimit: claim.formData?.room_rent_limit || claim.formData?.room_rent || '',
        icuLimit: claim.formData?.icu_limit || '',
        copayPercentage: Number(claim.formData?.copayment) || Number(claim.formData?.co_pay) || 0,
        maternityCover: claim.formData?.limit_maternity || claim.formData?.maternity_limit || '',
        preHospDays: Number(claim.formData?.pre_hosp_days) || 0,
        postHospDays: Number(claim.formData?.post_hosp_days) || 0,
        opdCoverage: !!claim.formData?.opd_limit,
        maternityBenefit: !!(claim.formData?.limit_maternity || claim.formData?.maternity_limit),
      };
      setFormData(prev => ({ ...prev, ...autoFilledData, id: prev.id }));
      
      // Expand sections that have data
      setExpandedSections(prev => ({
        ...prev,
        basic: true,
        insured: true,
        coverage: !!autoFilledData.sumInsured,
        room: !!(autoFilledData.roomRentLimit || autoFilledData.icuLimit),
        sublimits: !!(autoFilledData.copayPercentage || autoFilledData.maternityCover),
        prepost: !!(autoFilledData.preHospDays || autoFilledData.postHospDays),
        diagnosis: !!autoFilledData.diagnosisName
      }));

      toast.info("Auto-filled details from admission record");
    }
  }, [claim, policy]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: policy ? true : false,
    insured: policy ? true : false,
    coverage: policy ? true : false,
    room: false,
    waiting: false,
    sublimits: false,
    prepost: false,
    diagnosis: false,
    remarks: false,
    timeline: policy ? true : false
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [showCommentModal, setShowCommentModal] = useState<{ show: boolean, type: KYPStatus | '', comment: string }>({ show: false, type: '', comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (policy) {
      setAiSuggestions(policy.aiSuggestions || []);
      setAlerts(policy.alerts || []);
    }
  }, [policy]);

  const combinedHistory = useMemo(() => {
    const rawHistory = [...(formData.history || []), ...(claim?.history || [])];
    const seen = new Set();
    return rawHistory
      .filter(item => {
        const key = item.id || `${item.date}-${item.status}-${item.comment?.substring(0, 20)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [formData.history, claim?.history]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (field: keyof KYPPolicy, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'patientName' && !policy) {
        newData.insuredName = value;
      }
      return newData;
    });
  };

  const handleSimulateAI = () => {
    setIsExtracting(true);
    toast.info("OCR is extracting data from policy document...");
    
    setTimeout(() => {
      // Use claim data for more "correct" auto-fill if available
      const extractedData: Partial<KYPPolicy> = {
        policyNumber: claim?.policyNumber || claim?.id || ('POL-' + Math.floor(Math.random() * 100000000)),
        productName: claim?.formData?.product_name || 'Optima Restore',
        insurerProductName: claim?.formData?.insurer_product_name || 'Optima Restore Regular Standard 2026',
        companyName: claim?.insuranceProvider || 'HDFC ERGO',
        tpaName: claim?.formData?.tpa_provider || 'In-House',
        sumInsured: parseFloat(String(claim?.formData?.p_sum_insured || '').replace(/[^0-9.]/g, '')) || Number(claim?.formData?.sum_insured) || claim?.estimatedCost || 500000,
        balanceSI: (parseFloat(String(claim?.formData?.p_sum_insured || '').replace(/[^0-9.]/g, '')) || Number(claim?.formData?.sum_insured) || claim?.estimatedCost || 500000) * 0.8, // Simulate some prior usage
        firstInceptionDate: '2021-05-15',
        effectiveDate: '2025-05-15',
        expiryDate: '2026-05-14',
        admissionDate: new Date().toISOString().split('T')[0],
        expectedDischargeDate: new Date().toISOString().split('T')[0],
        roomRentLimit: 'Single Private AC Room',
        icuLimit: 'No Limit',
        initialWaitingPeriod: '30 Days',
        specificWaitingPeriod: '2 Years',
        pedWaitingPeriod: '3 Years',
        restoreBenefit: true,
        copayPercentage: 0,
        preHospitalizationDays: 60,
        postHospitalizationDays: 180,
        ayushTreatment: true,
        ambulanceCover: 'Up to ₹2000 per hospitalization'
      };

      setFormData(prev => ({ ...prev, ...extractedData }));
      setAiSuggestions([
        "Room rent limit detected as 'Single Private AC Room'",
        "Restore benefit is applicable for this policy",
        "Waiting period for PED is 3 years",
        "Co-pay is not applicable for this retail policy"
      ]);
      setAlerts([
        "Policy is active and valid",
        "High balance SI available (₹5,00,000)"
      ]);
      setIsExtracting(false);
      toast.success("OCR Extraction Complete!");
    }, 800);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('kyp-preview-content');
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
      pdf.save(`${formData.patientName || formData.insuredName || 'KYP_Summary'}.pdf`);
      toast.success("KYP PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSubmit = (status: KYPStatus, comment?: string) => {
    // Only enforce strict fields if it's an existing policy being submitted or approved
    if (policy && status === 'Approved') {
      if (!formData.policyNumber || !formData.insuredName || !formData.sumInsured || !formData.companyName) {
        toast.error("Please fill mandatory fields: Policy Number, Insured Name, Sum Insured, Insurance Company before approval");
        return;
      }
    } else if (!policy && !formData.patientName) {
      toast.error("Patient Name is required for registration");
      return;
    }

    if (!formData.companyName) {
      toast.error("Insurance Company is required");
      return;
    }

    if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
      toast.error("Mobile Number (must be exactly 10 digits)");
      return;
    }



    setIsSubmitting(true);

    // Audit log for status change or update
    const historyItem: any = {
      id: `hist-${Date.now()}`,
      status: status as any,
      date: new Date().toISOString(),
      comment: comment || (status === formData.status ? `Updated policy data` : `Status changed to ${status}`),
      type: 'status_change',
      userName: currentUser?.displayName || currentUser?.username || 'System'
    };

    auditService.log({
      userId: currentUser?.id || 'system',
      userName: currentUser?.displayName || 'System User',
      action: status === formData.status ? 'UPDATE_POLICY_DATA' : 'KYP_STATUS_CHANGE',
      resourceId: formData.id,
      resourceType: 'Claim',
      details: status === formData.status ? `Updated policy data for case ${formData.id}` : `Changed status to ${status} for case ${formData.id}`,
      previousValues: { status: formData.status },
      newValues: { status }
    });

    // Auto-approval logic: If submitting from Pending (KYP), auto-update to Approved
    let finalStatus = status;
    if ((formData.status === 'Pending (KYP)' || formData.status === 'Pending') && status === 'Approved') {
      finalStatus = 'Approved';
    }

    const finalPolicy: KYPPolicy = {
      ...formData as KYPPolicy,
      status: finalStatus,
      remarks: comment || formData.remarks,
      lastUpdatedDate: new Date().toISOString(),
      aiSuggestions,
      alerts,
      history: [historyItem, ...(formData.history || [])],
      assignedUserId: formData.assignedUserId || currentUser?.id || 'sys-user',
      assignedUserName: formData.assignedUserName || currentUser?.displayName || currentUser?.username || 'CRM User',
      isAccepted: true
    };

    // Also update the claim status if linked
    if (claim && onUpdateClaim) {
      let nextClaimStatus: ClaimStatus | undefined;
      
      const isPartnerProcessing = claim.product === Product.PARTNER_PROCESSING || 
                                 String(claim.product).includes('Partner');
      
      const isCashlessClaim = claim.product === Product.CPC || 
                             claim.product === Product.BG_DESK || 
                             (!claim.product && claim.claimType !== 'Reimbursement');

      let queryRaisedBy: 'KYP' | 'Medical Underwriting' | 'Insurer' | 'TPA' | undefined = undefined;

      switch (finalStatus) {
        case 'Approved':
        case 'KYP Accepted':
        case 'KYP Completed':
          // Process medical scrutiny requirement check
          const activeHospitalId = claim?.hospitalId || currentUser?.hospitalId;
          const activeHospital = hospitals.find(h => h.id === activeHospitalId);
          const isMedicalScrutinyRequired = activeHospital?.valueAddedServices?.medicalScrutinyRequired ?? true; // Default true if not found

          // For Partner Processing (and rest products follow their business logic)
          // For Cashless specifically, we update to claim.status to keep current process stage unmodified
          if (isCashlessClaim) {
            nextClaimStatus = claim.status;
          } else if (isPartnerProcessing) {
            nextClaimStatus = claim.status; // No stage change impact for Partner Processing
          } else {
            nextClaimStatus = isPartnerProcessing 
              ? (isMedicalScrutinyRequired ? ClaimStatus.PENDING_MEDICAL_REVIEW : ClaimStatus.KYP_ACCEPTED)
              : ClaimStatus.KYP_ACCEPTED;
          }
          break;
        case 'Query Pending':
        case 'KYP Query Pending':
          queryRaisedBy = 'KYP';
          nextClaimStatus = isPartnerProcessing ? ClaimStatus.ASSESSMENT_QUERY_PENDING : (isCashlessClaim ? claim.status : ClaimStatus.KYP_QUERY_PENDING);
          break;
        case 'Query Replied':
        case 'KYP Query Replied':
          nextClaimStatus = isPartnerProcessing ? claim.status : (isCashlessClaim ? claim.status : ClaimStatus.KYP_QUERY_REPLIED);
          break;
        case 'Rejected':
        case 'KYP Rejected':
          nextClaimStatus = isPartnerProcessing ? claim.status : (isCashlessClaim ? claim.status : ClaimStatus.KYP_REJECTED);
          break;
        case 'KYP Pending Approval':
          nextClaimStatus = isCashlessClaim ? claim.status : ClaimStatus.KYP_PENDING_APPROVAL;
          break;
      }

      // Guarantee absolutely that for cashless claims, we do NOT change the claim stage (status)
      if (isCashlessClaim) {
        nextClaimStatus = claim.status;
      }

      // Formulate custom timeline event status that reflects the actual KYP status
      let kypTimelineStatus = 'KYP Submitted';
      if (finalStatus === 'Approved') {
        kypTimelineStatus = 'KYP Approved';
      } else if (finalStatus === 'KYP Completed') {
        kypTimelineStatus = 'KYP Completed';
      } else if (finalStatus === 'KYP Accepted' || (finalStatus as any) === 'Accepted') {
        kypTimelineStatus = 'KYP Accepted';
      } else if (finalStatus === 'Query Pending' || finalStatus === 'KYP Query Pending') {
        kypTimelineStatus = 'KYP Query Raised';
      } else if (finalStatus === 'Query Replied' || finalStatus === 'KYP Query Replied') {
        kypTimelineStatus = 'KYP Query Replied';
      } else if (finalStatus === 'Rejected' || finalStatus === 'KYP Rejected') {
        kypTimelineStatus = 'KYP Rejected';
      } else if (finalStatus === 'KYP Pending Approval') {
        kypTimelineStatus = 'KYP Pending Approval';
      } else {
        kypTimelineStatus = `KYP ${finalStatus}`;
      }

      if (nextClaimStatus || isCashlessClaim || true) { // Always update claim to sync data
        const updatedClaim: Claim = {
          ...claim,
          status: nextClaimStatus || claim.status, 
          queryRaisedBy: queryRaisedBy || claim.queryRaisedBy,
          policyNumber: formData.policyNumber || claim.policyNumber,
          insuranceProvider: formData.companyName || claim.insuranceProvider,
          formData: {
            ...claim.formData,
            memberId: formData.memberId || claim.formData?.memberId,
            tpa_provider: formData.tpaName || claim.formData?.tpa_provider,
            p_policy_no: formData.policyNumber || claim.formData?.p_policy_no,
            insurance_company: formData.companyName || claim.insuranceProvider,
            product_name: formData.productName || claim.formData?.product_name,
            insurer_product_name: formData.insurerProductName || claim.formData?.insurer_product_name,
          },
          history: [
            {
              id: `ev-kyp-${Date.now()}`,
              status: kypTimelineStatus as any,
              date: new Date().toISOString(),
              comment: comment || `KYP Analysis Submitted: Policy details updated and verified.`,
              type: 'status_change',
              userName: currentUser?.displayName || currentUser?.username || 'KYP System',
              stageData: {
                kypData: finalPolicy,
                isKypEvent: true
              }
            },
            ...(claim.history || [])
          ]
        };
        onUpdateClaim(updatedClaim);
        toast.success("Policy analysis submitted and admission data updated.");
      }
    }

    onSave(finalPolicy);
    if (onClose) onClose();
    setIsSubmitting(false);
    setShowCommentModal({ show: false, type: '', comment: '' });
    toast.success(`KYP Case processed: ${finalStatus}`);
  };

  const isFieldMissing = (value: any) => !value || value === '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
      <style>{`
        .kyp-view-mode-active input, 
        .kyp-view-mode-active select, 
        .kyp-view-mode-active textarea {
          pointer-events: none !important;
          background-color: #f1f5f9 !important;
          opacity: 0.75 !important;
          cursor: not-allowed !important;
        }
      `}</style>
      {/* Regular Backdrops - Hidden in "Only Preview" mode */}
      {!(viewMode && showPreview) && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      )}
      
      {/* Main Form Container - Hidden in "Only Preview" mode */}
      {!(viewMode && showPreview) && (
        <div className={`relative bg-slate-50 w-full ${isDocMaximized ? 'max-w-full' : (showDocViewer ? 'max-w-[95vw]' : 'max-w-6xl')} h-full ${isDocMaximized ? 'max-h-full' : 'max-h-[95vh]'} ${isDocMaximized ? 'rounded-none' : 'rounded-[2.5rem]'} shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300`}>
          {/* Header */}
          <div className={`px-8 py-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 ${isDocMaximized ? 'hidden' : ''}`}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {viewMode ? 'Know Your Policy Summary' : policy ? 'Edit Policy Details' : 'Create New Policy Entry'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KYP Case ID: {formData.id || 'New'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {viewMode && (
              <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200 flex items-center shadow-sm">
                <Eye size={12} className="mr-2" /> View Mode
              </div>
            )}
            <button 
              onClick={() => {
                setShowDocViewer(!showDocViewer);
                if (isDocMaximized) setIsDocMaximized(false);
              }}
              className={`flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showDocViewer ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}
            >
              <FileSearch size={14} className="mr-2" />
              {showDocViewer ? 'Hide Document' : 'Show Document'}
            </button>
            {(formData.patientName || claim?.patientName) && (
              <button 
                onClick={() => {
                  onClose();
                  const targetClaimId = claim?.id || formData?.claimId || formData?.id || 'CPC-101';
                  navigate(`/process-claim/${targetClaimId}?source=kyp_dashboard`);
                }}
                className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
              >
                <Layout size={14} className="mr-2" />
                View Patient Dashboard
              </button>
            )}
            <button 
              onClick={() => setShowPreview(true)}
              className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
            >
              <Eye size={14} className="mr-2" />
              Preview KYP
            </button>
            <button 
              onClick={handleSimulateAI}
              disabled={isExtracting}
              className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
            >
              {isExtracting ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Sparkles size={14} className="mr-2" />}
              OCR Extraction
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Document Viewer (Left Side) */}
          {showDocViewer && (
            <div className={`${isDocMaximized ? 'w-full' : 'w-1/2'} h-full border-r border-slate-200 bg-slate-100 flex flex-col transition-all duration-500 ease-in-out`}>
              <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Policy Document Preview</span>
                    {claimDocs.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {claimDocs.map((doc, idx) => {
                          // Try to get a short name for the button
                          let shortName = `DOC ${idx + 1}`;
                          if (doc.name.includes('Policy')) shortName = 'POL';
                          if (doc.name.includes('Aadhar')) shortName = 'ID';
                          if (doc.name.includes('Consultation')) shortName = 'CONS';
                          if (doc.name.includes('Investigation')) shortName = 'REPT';
                          if (doc.name.includes('Admission')) shortName = 'ADM';

                          return (
                            <button
                              key={idx}
                              onClick={() => setViewingDocument(doc)}
                              className={`px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest transition-all ${
                                viewingDocument?.url === doc.url 
                                  ? 'bg-indigo-600 text-white shadow-sm scale-105 z-10' 
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title={doc.name}
                            >
                              {shortName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {claimDocs.length > 0 && (
                    <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                      {viewingDocument?.name || 'Loading document...'}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsDocMaximized(!isDocMaximized)}
                    className="flex items-center gap-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-400"
                  >
                    {isDocMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    <span className="text-[8px] font-black uppercase"> {isDocMaximized ? 'Exit Full Screen' : 'Full Screen'} </span>
                  </button>
                </div>
              </div>
              <div className="flex-1 p-2 overflow-y-auto flex items-center justify-center relative bg-slate-200/30">
                {/* File Upload Trigger (Only if no file) */}
                {!viewingDocument ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/50 backdrop-blur-[2px]">
                    <label 
                      className="group flex flex-col items-center justify-center p-12 bg-white border-4 border-dashed border-slate-200 rounded-[3rem] cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all active:scale-95 shadow-2xl shadow-slate-300/50"
                      onDragOver={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                      }}
                      onDrop={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (!canEdit) return;
                        const file = evt.dataTransfer.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                      }}
                    >
                      <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
                        <Upload size={40} />
                      </div>
                      <span className="text-lg font-black text-slate-800 uppercase tracking-tight">Upload Policy Document</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">PDF, PNG, JPG (Max 5MB)</span>
                      <div className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 group-hover:bg-blue-700 transition-colors">Select File to Extract</div>
                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} disabled={!canEdit} />
                    </label>
                  </div>
                ) : (
                  /* Actual Document Viewer */
                  <div className="w-full h-full flex flex-col items-center justify-center p-1">
                    <div className="w-full h-full bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col">
                      <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                         <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center">
                            <FileText size={12} className="mr-2 text-blue-500" /> {viewingDocument.name}
                         </span>
                         <div className="flex items-center gap-2">
                           {viewingDocument.url !== policyFile && (
                             <button 
                               onClick={() => setViewingDocument(policyFile ? { url: policyFile, name: 'Policy Document' } : null)}
                               className="px-2 py-1 bg-blue-100 text-blue-600 rounded-md text-[8px] font-black uppercase tracking-widest hover:bg-blue-200 transition-all"
                             >
                               Back to Policy
                             </button>
                           )}
                           <button 
                             onClick={() => {
                               if (viewingDocument.url === policyFile) setPolicyFile(null);
                               setViewingDocument(null);
                             }}
                             className="p-1.5 hover:bg-rose-50 text-rose-400 rounded-lg transition-all"
                           >
                              <Trash2 size={14} />
                           </button>
                         </div>
                      </div>
                      <div className="flex-1 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {viewingDocument.url?.startsWith('data:image/') ? (
                          <img src={viewingDocument.url} alt="Policy Document" className="max-w-full max-h-full object-contain" />
                        ) : viewingDocument.url?.startsWith('data:application/pdf') ? (
                          <iframe src={viewingDocument.url} className="w-full h-full border-none" title="Policy Document PDF" />
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-4 p-10">
                             <div className="w-24 h-24 bg-white text-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
                                <FileCheck size={48} />
                             </div>
                             <div className="text-center">
                               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Document Loaded</h3>
                               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ready for Review</p>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Form Area */}
          <div className={`${showDocViewer && !isDocMaximized ? 'w-1/2' : isDocMaximized ? 'hidden' : 'flex-1'} overflow-y-auto p-8 space-y-6 custom-scrollbar ${viewMode ? 'kyp-view-mode-active' : ''}`}>
            
            {/* Transition Control Bar - Hidden as per requirement */}
            {/* 
            {transitions.length > 0 && (
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Available Transitions:</span>
                  <div className="flex gap-2">
                    {transitions.map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setShowCommentModal({ show: true, type: t, comment: '' });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
                          t === 'Approved' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                          t === 'Rejected' ? 'bg-rose-600 text-white hover:bg-rose-700' :
                          'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Status:</div>
                   <StatusBadge status={formData.status} />
                </div>
              </div>
            )}
            */}
            
            {/* NEW CASE REGISTRATION SECTION */}
            {!policy && (
              <FormSection 
                title="NEW CASE REGISTRATION" 
                icon={Plus} 
                expanded={true} 
                onToggle={() => {}}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <FormField 
                    label="Patient Name" 
                    required 
                    value={formData.patientName} 
                    onChange={(v) => handleChange('patientName', v)} 
                  />
                  <FormSelect 
                    label="Gender" 
                    options={['Male', 'Female', 'Other']} 
                    value={formData.gender || ''} 
                    onChange={(v) => handleChange('gender', v as any)} 
                  />
                  <FormField 
                    label="Date of Birth" 
                    type="date" 
                    value={formData.dob} 
                    onChange={(v) => handleChange('dob', v)} 
                  />
                  <FormField 
                    label="Mobile No" 
                    value={formData.mobileNo} 
                    onChange={(v) => handleChange('mobileNo', v)} 
                  />
                  <FormField 
                    label="Email ID" 
                    value={formData.emailId} 
                    onChange={(v) => handleChange('emailId', v)} 
                  />
                  <FormField 
                    label="Diagnosis" 
                    value={formData.diagnosisName} 
                    onChange={(v) => handleChange('diagnosisName', v)} 
                  />
                  <FormField 
                    label="Insurer" 
                    type="select"
                    options={insurers.map(i => i.name)}
                    value={formData.companyName} 
                    onChange={(v) => handleChange('companyName', v)} 
                    required
                  />
                  <FormField 
                    label="TPA" 
                    value={formData.tpaName} 
                    onChange={(v) => handleChange('tpaName', v)} 
                  />
                </div>

                <div className="border-t border-slate-100 pt-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Documents & Supporting Files</h4>
                  {!policyFile ? (
                    <label 
                      className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                      onDragOver={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                      }}
                      onDrop={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (!canEdit) return;
                        const file = evt.dataTransfer.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                      }}
                    >
                      <Upload size={24} className="text-slate-400 mb-2" />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Upload Policy Documents</span>
                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm">
                          <FileCheck size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-900 uppercase tracking-tight">Policy Document Loaded</p>
                          <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Ready for analysis after saving</p>
                        </div>
                      </div>
                      <button onClick={() => setPolicyFile(null)} className="p-2 text-rose-400 hover:bg-white rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </FormSection>
            )}

            {/* Policy detailed analysis (Only for existing cases) */}
            {policy && (
              <>
                <FormSection 
                  title="POLICY DOCUMENT ANALYSIS" 
                  icon={FileText} 
                  expanded={expandedSections.basic} 
                  onToggle={() => toggleSection('basic')}
                >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormSelect 
                  label="Case Source" 
                  required
                  options={['WEBSITE', 'APP', 'INTERNAL USER']} 
                  value={formData.source} 
                  onChange={(v) => handleChange('source' as any, v)} 
                />
                <FormField 
                  label="Policy Number" 
                  required 
                  value={formData.policyNumber} 
                  onChange={(v) => handleChange('policyNumber', v)} 
                />
                <FormSelect 
                  label="Policy Type" 
                  options={['Retail', 'Corporate']} 
                  value={formData.policyType} 
                  onChange={(v) => handleChange('policyType', v)} 
                />

                <FormField 
                  label="Insurer Product Name" 
                  value={formData.insurerProductName || ''} 
                  onChange={(v) => handleChange('insurerProductName', v)} 
                />
                <FormField 
                  label="Company Name" 
                  type="select"
                  options={insurers.map(i => i.name)}
                  value={formData.companyName} 
                  onChange={(v) => handleChange('companyName', v)} 
                  required
                />
                <FormField 
                  label="TPA Name" 
                  value={formData.tpaName} 
                  onChange={(v) => handleChange('tpaName', v)} 
                />
                <FormField 
                  label="First Inception Date" 
                  type="date" 
                  value={formData.firstInceptionDate} 
                  onChange={(v) => handleChange('firstInceptionDate', v)} 
                />
                <FormField 
                  label="Effective Date" 
                  type="date" 
                  value={formData.effectiveDate} 
                  onChange={(v) => handleChange('effectiveDate', v)} 
                />
                <FormField 
                  label="Expiry Date" 
                  type="date" 
                  value={formData.expiryDate} 
                  onChange={(v) => handleChange('expiryDate', v)} 
                />
              </div>
            </FormSection>

            {/* Section 2: Insured Details */}
            <FormSection 
              title="SECTION 2: INSURED DETAILS" 
              icon={Info} 
              expanded={expandedSections.insured} 
              onToggle={() => toggleSection('insured')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField 
                  label="Insured Name" 
                  required 
                  value={formData.insuredName} 
                  onChange={(v) => handleChange('insuredName', v)} 
                />
                <FormField 
                  label="Member ID" 
                  value={formData.memberId} 
                  onChange={(v) => handleChange('memberId', v)} 
                />
                <FormField 
                  label="Patient Name (if different)" 
                  value={formData.patientName} 
                  onChange={(v) => handleChange('patientName', v)} 
                />
              </div>
            </FormSection>

            {/* Section 3: Coverage Details */}
            <FormSection 
              title="SECTION 3: COVERAGE DETAILS" 
              icon={ShieldCheck} 
              expanded={expandedSections.coverage} 
              onToggle={() => toggleSection('coverage')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField 
                  label="Sum Insured" 
                  type="number" 
                  required 
                  value={formData.sumInsured} 
                  onChange={(v) => handleChange('sumInsured', v)} 
                />
                <FormField 
                  label="Balance Sum Insured" 
                  type="number" 
                  value={formData.balanceSI} 
                  onChange={(v) => handleChange('balanceSI', v)} 
                />
                <FormField 
                  label="Effective Coverage" 
                  value={formData.effectiveCoverage} 
                  onChange={(v) => handleChange('effectiveCoverage', v)} 
                />
                <FormField 
                  label="Bonus / Super Bonus" 
                  value={formData.bonusSuperBonus} 
                  onChange={(v) => handleChange('bonusSuperBonus', v)} 
                />
                <FormSelect 
                  label="Restore Benefit" 
                  options={['Yes', 'No']} 
                  value={formData.restoreBenefit ? 'Yes' : 'No'} 
                  onChange={(v) => handleChange('restoreBenefit', v === 'Yes')} 
                />
              </div>
            </FormSection>

            {/* Section 4: Room & Hospital Benefits */}
            <FormSection 
              title="SECTION 4: ROOM & HOSPITAL BENEFITS" 
              icon={Info} 
              expanded={expandedSections.room} 
              onToggle={() => toggleSection('room')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField 
                  label="Room Rent Limit" 
                  value={formData.roomRentLimit} 
                  onChange={(v) => handleChange('roomRentLimit', v)} 
                />
                <FormField 
                  label="ICU Limit" 
                  value={formData.icuLimit} 
                  onChange={(v) => handleChange('icuLimit', v)} 
                />
                <FormField 
                  label="Hospital Daily Cash" 
                  value={formData.hospitalDailyCash} 
                  onChange={(v) => handleChange('hospitalDailyCash', v)} 
                />
                <FormSelect 
                  label="AYUSH Treatment" 
                  options={['Yes', 'No']} 
                  value={formData.ayushTreatment ? 'Yes' : 'No'} 
                  onChange={(v) => handleChange('ayushTreatment', v === 'Yes')} 
                />
                <FormField 
                  label="Ambulance Cover" 
                  value={formData.ambulanceCover} 
                  onChange={(v) => handleChange('ambulanceCover', v)} 
                />
              </div>
            </FormSection>

            {/* Section 5: Waiting Period */}
            <FormSection 
              title="SECTION 5: WAITING PERIOD" 
              icon={Clock} 
              expanded={expandedSections.waiting} 
              onToggle={() => toggleSection('waiting')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField 
                  label="Initial (30 days)" 
                  value={formData.initialWaitingPeriod} 
                  onChange={(v) => handleChange('initialWaitingPeriod', v)} 
                />
                <FormField 
                  label="Specific (2 Years)" 
                  value={formData.specificWaitingPeriod} 
                  onChange={(v) => handleChange('specificWaitingPeriod', v)} 
                />
                <FormField 
                  label="PED (3 Years)" 
                  value={formData.pedWaitingPeriod} 
                  onChange={(v) => handleChange('pedWaitingPeriod', v)} 
                />
                <FormSelect 
                  label="Waived Off" 
                  options={['Yes', 'No']} 
                  value={formData.waivedOff ? 'Yes' : 'No'} 
                  onChange={(v) => handleChange('waivedOff', v === 'Yes')} 
                />
              </div>
            </FormSection>

            {/* Section 6: Sub-Limits & Co-Pay */}
            <FormSection 
              title="SECTION 6: SUB-LIMITS & CO-PAY" 
              icon={ShieldAlert} 
              expanded={expandedSections.sublimits} 
              onToggle={() => toggleSection('sublimits')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField 
                  label="Co-Pay %" 
                  type="number" 
                  value={formData.copayPercentage} 
                  onChange={(v) => handleChange('copayPercentage', v)} 
                />
                <FormField 
                  label="Sub-limit (e.g., Cataract ₹50,000)" 
                  value={formData.subLimits} 
                  onChange={(v) => handleChange('subLimits', v)} 
                />
              </div>
            </FormSection>

            {/* Section 7: Pre & Post Hospitalization */}
            <FormSection 
              title="SECTION 7: PRE & POST HOSPITALIZATION" 
              icon={Clock} 
              expanded={expandedSections.prepost} 
              onToggle={() => toggleSection('prepost')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField 
                  label="Pre Hospitalization Days" 
                  type="number" 
                  value={formData.preHospitalizationDays} 
                  onChange={(v) => handleChange('preHospitalizationDays', v)} 
                />
                <FormField 
                  label="Post Hospitalization Days" 
                  type="number" 
                  value={formData.postHospitalizationDays} 
                  onChange={(v) => handleChange('postHospitalizationDays', v)} 
                />
              </div>
            </FormSection>

            {/* Section 8: Diagnosis / Case Info */}
            <FormSection 
              title="SECTION 8: DIAGNOSIS / CASE INFO" 
              icon={Info} 
              expanded={expandedSections.diagnosis} 
              onToggle={() => toggleSection('diagnosis')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField 
                  label="Diagnosis Name" 
                  value={formData.diagnosisName} 
                  onChange={(v) => handleChange('diagnosisName', v)} 
                />
                <FormField 
                  label="Fracture / Disease (if applicable)" 
                  value={formData.fractureDisease} 
                  onChange={(v) => handleChange('fractureDisease', v)} 
                />
              </div>
            </FormSection>

            <FormSection 
              title="SECTION 9: REMARKS" 
              icon={FileText} 
              expanded={expandedSections.remarks} 
              onToggle={() => toggleSection('remarks')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField 
                  label="Remarks" 
                  type="textarea" 
                  value={formData.remarks} 
                  onChange={(v) => handleChange('remarks', v)} 
                />
                <FormField 
                  label="Intimation Number" 
                  value={formData.intimationNumber} 
                  onChange={(v) => handleChange('intimationNumber', v)} 
                />
              </div>
            </FormSection>
          </>
        )}
      </div>

      {/* Side Panel: OCR Suggestions & Alerts (Only for existing policies) */}
      {policy && (
        <div className="w-full lg:w-[480px] bg-white border-l border-slate-200 p-6 space-y-8 overflow-y-auto custom-scrollbar">
          {/* OCR Suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sparkles size={16} />
              </div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">OCR Suggestions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiSuggestions.length > 0 ? aiSuggestions.map((s, i) => (
                <div key={i} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex gap-3 animate-in slide-in-from-right-2" style={{ animationDelay: `${i * 100}ms` }}>
                  <ArrowRight size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-indigo-700 leading-relaxed">{s}</p>
                </div>
              )) : (
                <p className="text-[11px] text-slate-400 italic">No suggestions available. Try OCR Extraction.</p>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Policy Alerts</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alerts.length > 0 ? alerts.map((a, i) => (
                <div key={i} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 animate-in slide-in-from-right-2" style={{ animationDelay: `${i * 100}ms` }}>
                  <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium text-amber-700 leading-relaxed">{a}</p>
                </div>
              )) : (
                <p className="text-[11px] text-slate-400 italic font-medium">No active alerts.</p>
              )}
              {isFieldMissing(formData.policyNumber) && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-3">
                  <ShieldAlert size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-rose-700 leading-relaxed">Data Not Found – Please Fill Policy Number</p>
                </div>
              )}
              {isFieldMissing(formData.insuredName) && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-3">
                  <ShieldAlert size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-rose-700 leading-relaxed">Data Not Found – Please Fill Insured Name</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-12 border-t border-slate-100 pt-8 mt-4">
            {/* Query Reply Documents */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Paperclip size={16} />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Query Reply Docs</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {claim?.history?.filter(h => h.status === ClaimStatus.KYP_QUERY_REPLIED || h.status === ClaimStatus.QUERY_REPLY_DONE || h.comment?.toLowerCase().includes('document')).map((h, i) => (
                  <div key={i} className={`flex flex-col p-3 border rounded-xl transition-all ${viewingDocument?.name === (h.comment || 'Related Document') ? 'bg-blue-600 border-blue-600 text-white' : 'bg-blue-50/50 border-blue-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`p-1.5 rounded-lg shadow-sm ${viewingDocument?.name === (h.comment || 'Related Document') ? 'bg-white/20 text-white' : 'bg-white text-blue-600'}`}>
                            <FileText size={10} />
                          </div>
                          <div className="overflow-hidden">
                             <p className={`text-[9px] font-black uppercase truncate max-w-[150px] ${viewingDocument?.name === (h.comment || 'Related Document') ? 'text-white' : 'text-slate-800'}`}>{h.comment || 'Related Document'}</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => {
                          setViewingDocument({ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', name: h.comment || 'Query Document' });
                          toast.info(`Viewing document from query history: ${h.comment || 'Document'}`);
                        }}
                        className={`p-1 rounded-lg transition-all ${viewingDocument?.name === (h.comment || 'Related Document') ? 'hover:bg-blue-500 text-white' : 'hover:bg-blue-100 text-blue-600'}`}
                      >
                        <Eye size={10} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                       <p className={`text-[8px] font-bold uppercase ${viewingDocument?.name === (h.comment || 'Related Document') ? 'text-blue-100' : 'text-slate-400'}`}>{formatDate(h.date)}</p>
                       <span className={`text-[8px] font-black uppercase ${viewingDocument?.name === (h.comment || 'Related Document') ? 'text-white/70' : 'text-blue-400'}`}>Verified</span>
                    </div>
                  </div>
                ))}
                {(!claim?.history || claim.history.filter(h => h.status === ClaimStatus.KYP_QUERY_REPLIED || h.status === ClaimStatus.QUERY_REPLY_DONE || h.comment?.toLowerCase().includes('document')).length === 0) && (
                  <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 col-span-full">
                    <Paperclip size={16} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-[9px] text-slate-400 italic font-medium uppercase tracking-widest">No query documents found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Case Activity Timeline - Moved below query reply docs as requested */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                  <History size={16} />
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Case activity Timeline</h3>
              </div>
              <div className="space-y-4">
                {(combinedHistory && combinedHistory.length > 0) ? (
                  combinedHistory.map((item, idx) => (
                    <TimelineItem 
                      key={item.id || idx}
                      title={item.status as string}
                      date={item.date}
                      user={item.userName || 'System'}
                      details={item.comment || 'Status updated'}
                      icon={
                        (item.status as string) === 'Approved' || (item.status as string) === 'KYP Accepted' || (item.status as string) === 'KYP Completed' ? CheckCircle2 :
                        (item.status as string) === 'Rejected' || (item.status as string) === 'KYP Rejected' ? X :
                        (item.status as string) === 'Query Pending' || (item.status as string) === 'KYP Query Pending' ? HelpCircle :
                        (item.status as string) === 'Query Replied' || (item.status as string) === 'KYP Query Replied' || (item.status as string) === 'Pending (KYP)' ? RefreshCw :
                        Clock
                      }
                      color={
                        (item.status as string) === 'Approved' || (item.status as string) === 'KYP Accepted' || (item.status as string) === 'KYP Completed' ? 'emerald' :
                        (item.status as string) === 'Rejected' || (item.status as string) === 'KYP Rejected' ? 'rose' :
                        (item.status as string) === 'Query Pending' || (item.status as string) === 'KYP Query Pending' ? 'orange' :
                        (item.status as string) === 'Query Replied' || (item.status as string) === 'KYP Query Replied' || (item.status as string) === 'Pending (KYP)' ? 'blue' :
                        'indigo'
                      }
                      documents={item.stageData?.documents || []}
                      onPreviewDoc={(doc: any) => {
                        let url = '';
                        let name = '';
                        
                        if (typeof doc === 'string') {
                          url = doc;
                          name = 'Document';
                        } else {
                          url = doc.url || (doc.data ? `data:${doc.mimeType || 'application/pdf'};base64,${doc.data}` : '');
                          name = doc.name || doc.type || 'Document';
                        }
                        
                        if (url) {
                          setViewingDocument({ url, name });
                          setShowDocViewer(true);
                          toast.info(`Viewing ${name} from timeline`);
                        }
                      }}
                    />
                  ))
                ) : (
                  <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Clock className="mx-auto text-slate-300 mb-2" size={16} />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No activity recorded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Footer Actions */}
        <div className={`px-8 py-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 ${isDocMaximized ? 'hidden' : ''}`}>
          <div className="flex items-center gap-4">
             {viewMode ? (
               <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                 <AlertTriangle className="text-amber-500" size={16} />
                 <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                   Viewing Mode: Actions and updates are disabled for this session.
                 </p>
               </div>
             ) : (
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Confirm all details from the policy document before submitting. <br/>
                <span className="text-amber-500">Submission will auto-correct admission records if approved.</span>
               </p>
             )}
          </div>
          <div className="flex items-center space-x-3">
            {!viewMode && formData.status !== 'Approved' && formData.status !== 'Rejected' && (
              <button 
                onClick={() => handleSubmit(formData.status)}
                disabled={isSubmitting}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center"
              >
                <Save size={16} className="mr-2" /> Save Draft
              </button>
            )}
            
            {!viewMode && formData.status !== 'Approved' && formData.status !== 'Rejected' && (
              <button 
                onClick={() => setShowCommentModal({ show: true, type: 'Query Pending', comment: '' })}
                className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center"
              >
                <HelpCircle size={16} className="mr-2" /> Raise Query
              </button>
            )}
            {!viewMode && formData.status !== 'Approved' && formData.status !== 'Rejected' && (
              <button 
                onClick={() => setShowCommentModal({ show: true, type: 'Rejected', comment: '' })}
                className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center"
              >
                <Trash2 size={16} className="mr-2" /> Reject Case
              </button>
            )}
            
            {/* Submit button */}
            {!viewMode && !['Approved', 'Rejected', 'KYP Completed', 'KYP Rejected'].includes(formData.status) && (
              <button 
                onClick={() => handleSubmit(canApprove ? 'Approved' : 'KYP Pending Approval')}
                disabled={isSubmitting}
                className={`relative px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 min-w-[200px] cursor-pointer active:scale-95 disabled:grayscale disabled:opacity-50 overflow-hidden group
                  ${canApprove ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
              >
                <CheckCircle2 size={16} className="pointer-events-none group-hover:scale-110 transition-transform" /> 
                <span className="pointer-events-none">{formData.status === 'Query Replied' || formData.status === 'KYP Query Replied' ? 'Process Reply' : 'Submit'}</span>
              </button>
            )}

            {!viewMode && ['Approved', 'Rejected', 'KYP Completed', 'KYP Rejected'].includes(formData.status) && (
              <button 
                onClick={() => handleSubmit(formData.status as any, "Edited and saved approved KYP details")}
                disabled={isSubmitting}
                className="px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2 min-w-[200px] cursor-pointer active:scale-95 disabled:grayscale overflow-hidden group"
              >
                <Save size={16} className="pointer-events-none group-hover:scale-110 transition-transform" /> <span className="pointer-events-none">Save Changes</span>
              </button>
            )}

            {!viewMode && (formData.status as string).includes('Pending') && (formData.status as string).includes('Query') && (
               <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 border border-amber-100 rounded-xl">
                 <Clock className="text-amber-500" size={14} />
                 <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest italic">
                   Awaiting reply from concerned user (Submit Override Enabled)
                 </p>
               </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCommentModal({ ...showCommentModal, show: false })}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                {showCommentModal.type === 'Query Pending' ? 'Raise Query' : 
                 showCommentModal.type === 'Query Replied' ? 'Query Reply Details' : 'Rejection Remarks'}
              </h3>
              <button onClick={() => setShowCommentModal({ ...showCommentModal, show: false })} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                {showCommentModal.type === 'Query Replied' && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Clock size={12} /> Transaction Date (Auto-filled)
                    </p>
                    <p className="text-sm font-bold text-blue-900">{formatDate(new Date().toISOString())}</p>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Comments / Remarks {showCommentModal.type === 'Query Replied' && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[120px]"
                    placeholder={
                      showCommentModal.type === 'Query Pending' ? 'Enter query details...' : 
                      showCommentModal.type === 'Query Replied' ? 'Mandatory: Enter remarks for query reply...' :
                      'Enter rejection details...'
                    }
                    value={showCommentModal.comment}
                    onChange={(e) => setShowCommentModal({ ...showCommentModal, comment: e.target.value })}
                  />
                </div>
              </div>
              <button 
                onClick={() => handleSubmit(showCommentModal.type as KYPStatus, showCommentModal.comment)}
                disabled={!showCommentModal.comment.trim() || isSubmitting}
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center group ${
                  showCommentModal.type === 'Query Pending' ? 'bg-blue-600 text-white hover:bg-blue-700' : 
                  showCommentModal.type === 'Query Replied' ? 'bg-indigo-600 text-white hover:bg-indigo-700' :
                  'bg-rose-600 text-white hover:bg-rose-700'
                } disabled:opacity-50`}
              >
                {isSubmitting ? <RefreshCw size={14} className="mr-2 animate-spin pointer-events-none" /> : <CheckCircle2 size={14} className="mr-2 pointer-events-none group-hover:scale-110 transition-transform" />}
                <span className="pointer-events-none">{showCommentModal.type === 'Query Pending' ? 'Submit Query' : 
                 showCommentModal.type === 'Query Replied' ? 'Submit Reply' : 'Submit Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-8">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => {
            setShowPreview(false);
            if (viewMode) onClose();
          }}></div>
          <div className="relative bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">KYP Summary Preview</h3>
              <div className="flex gap-3">
                <button 
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isGeneratingPdf ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Download size={14} className="mr-2" />}
                  Download PDF
                </button>
                <button onClick={() => {
                  setShowPreview(false);
                  if (viewMode) onClose();
                }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-100">
              <div id="kyp-preview-content" className="bg-white p-12 shadow-xl rounded-lg mx-auto max-w-[800px] min-h-[1100px] text-slate-800 font-sans">
                {/* PDF Header */}
                <div className="border-b-4 border-blue-900 pb-6 mb-8 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">Know Your Policy</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Standardized Policy Analysis Report</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Case ID: {formData.id || 'NEW'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generated: {formatDate(new Date())}</p>
                  </div>
                </div>

                {/* Grid Layout for Sections */}
                <div className="space-y-8">
                  {/* Section 1 & 2 */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">1. Policy Basic Details</h4>
                      <div className="space-y-2">
                        {/* Policy No Hidden */}
                        <PreviewRow label="Policy Type" value={formData.policyType} />
                        <PreviewRow label="Insurer Product Name" value={formData.insurerProductName || 'N/A'} />
                        <PreviewRow label="Company" value={formData.companyName} />
                        <PreviewRow label="TPA" value={formData.tpaName} />
                        <PreviewRow label="Effective" value={formData.effectiveDate} />
                        <PreviewRow label="Expiry" value={formData.expiryDate} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">2. Insured Details</h4>
                      <div className="space-y-2">
                        <PreviewRow label="Insured Name" value={formData.insuredName} />
                        <PreviewRow label="Member ID" value={formData.memberId} />
                        <PreviewRow label="Patient Name" value={formData.patientName} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3 & 4 */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">3. Coverage Details</h4>
                      <div className="space-y-2">
                        <PreviewRow label="Sum Insured" value={formData.sumInsured ? `₹${Number(formData.sumInsured).toLocaleString('en-IN')}` : 'N/A'} />
                        <PreviewRow label="Balance Sum Insured" value={formData.balanceSI ? `₹${Number(formData.balanceSI).toLocaleString('en-IN')}` : 'N/A'} />
                        <PreviewRow label="Effective Coverage" value={formData.effectiveCoverage || 'N/A'} />
                        <PreviewRow label="Bonus" value={formData.bonusSuperBonus} />
                        <PreviewRow label="Restore" value={formData.restoreBenefit ? 'Yes' : 'No'} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">4. Room & Benefits</h4>
                      <div className="space-y-2">
                        <PreviewRow label="Room Limit" value={formData.roomRentLimit} />
                        <PreviewRow label="ICU Limit" value={formData.icuLimit} />
                        <PreviewRow label="Daily Cash" value={formData.hospitalDailyCash} />
                        <PreviewRow label="AYUSH" value={formData.ayushTreatment ? 'Yes' : 'No'} />
                      </div>
                    </div>
                  </div>

                  {/* Section 5 & 6 */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">5. Waiting Periods</h4>
                      <div className="space-y-2">
                        <PreviewRow label="Initial" value={formData.initialWaitingPeriod} />
                        <PreviewRow label="Specific" value={formData.specificWaitingPeriod} />
                        <PreviewRow label="PED" value={formData.pedWaitingPeriod} />
                        <PreviewRow label="Waived" value={formData.waivedOff ? 'Yes' : 'No'} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">6. Sub-Limits & Co-Pay</h4>
                      <div className="space-y-2">
                        <PreviewRow label="Co-Pay %" value={`${formData.copayPercentage}%`} />
                        <PreviewRow label="Sub-Limits" value={formData.subLimits} />
                      </div>
                    </div>
                  </div>

                  {/* Section 7 & 8 */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">7. Pre/Post Hosp.</h4>
                      <div className="space-y-2">
                        <PreviewRow label="Pre-Hosp" value={`${formData.preHospitalizationDays} Days`} />
                        <PreviewRow label="Post-Hosp" value={`${formData.postHospitalizationDays} Days`} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">8. Diagnosis Info</h4>
                      <div className="space-y-2">
                        <PreviewRow label="Diagnosis" value={formData.diagnosisName} />
                        <PreviewRow label="Case Info" value={formData.fractureDisease} />
                      </div>
                    </div>
                  </div>

                  {/* Section 9 */}
                  <div>
                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">9. Remarks & Intimation</h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[80px]">
                      <p className="text-xs font-medium text-slate-600 leading-relaxed">{formData.remarks || 'No remarks provided.'}</p>
                    </div>
                    <div className="mt-4">
                      <PreviewRow label="Intimation No" value={formData.intimationNumber} />
                    </div>
                  </div>
                </div>

                {/* PDF Footer */}
                <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-900 rounded flex items-center justify-center text-white text-[8px] font-bold">NX</div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Generated by ClaimNX KYP System</span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">
                    This is a system generated standardized policy summary.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const PreviewRow = ({ label, value }: any) => (
  <div className="flex justify-between items-baseline gap-4">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{label}</span>
    <div className="h-[1px] flex-1 border-b border-slate-100 border-dotted"></div>
    <span className="text-[11px] font-black text-slate-700 uppercase">{value || 'N/A'}</span>
  </div>
);

const FormSection = ({ title, icon: Icon, children, expanded, onToggle }: any) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
    <button 
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg text-slate-400">
          <Icon size={16} />
        </div>
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">{title}</h3>
      </div>
      {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
    </button>
    {expanded && (
      <div className="p-6 animate-in slide-in-from-top-2 duration-300">
        {children}
      </div>
    )}
  </div>
);

const FormField = ({ label, value, onChange, type = 'text', required, placeholder, options = [] }: any) => {
  const isMissing = required && (!value || value === '');
  const isMobile = label.toLowerCase().includes("mobile") || label.toLowerCase().includes("phone") || label.toLowerCase().includes("contact");
  const displayType = isMobile ? 'text' : type;
  
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
        {label} {required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {type === 'select' ? (
        <div className="relative group">
          <select
            className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer ${isMissing ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100 focus:border-blue-500'}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select Insurance Company...</option>
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
      ) : type === 'textarea' ? (
        <textarea 
          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[100px] ${isMissing ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100 focus:border-blue-500'}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="relative group">
          <input 
            type={displayType}
            className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all ${isMissing ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100 focus:border-blue-500'} ${type === "date" ? "cursor-pointer select-none" : ""}`}
            value={value || ''}
            onChange={(e) => {
              let val = e.target.value;
              if (isMobile) {
                val = val.replace(/\D/g, '').slice(0, 10);
                onChange(val);
              } else {
                onChange(type === 'number' ? parseFloat(val) : val);
              }
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
            placeholder={placeholder}
          />
        </div>
      )}
      {isMissing && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wide">Data Not Found – Please Fill</p>}
    </div>
  );
};

const FormSelect = ({ label, options, value, onChange, required }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
      {label} {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
    <select 
      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select Option</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

export default KYPForm;

const TimelineItem = ({ title, date, user, details, icon: Icon, color, documents, onPreviewDoc }: any) => {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 ${colors[color] || colors.indigo} transition-all shadow-sm`}>
          <Icon size={14} />
        </div>
        <div className="flex-1 w-[2px] bg-slate-100 my-2 group-last:hidden"></div>
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{title}</h4>
          <span className="text-[8px] font-bold text-slate-400">{formatDate(date)}</span>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase tracking-widest">By {user}</span>
        </div>
        <p className="text-[10px] font-medium text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100/50 italic">
          {details}
        </p>

        {documents && documents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {documents.map((doc: any, idx: number) => (
              <button 
                key={idx} 
                onClick={() => onPreviewDoc && onPreviewDoc(doc)}
                className="flex items-center gap-1.5 px-2 py-1 bg-white text-blue-600 rounded-md text-[8px] font-black uppercase tracking-tight border border-blue-50 shadow-sm hover:bg-blue-50 transition-all"
              >
                <Paperclip size={8} />
                {doc.name || 'Document'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
