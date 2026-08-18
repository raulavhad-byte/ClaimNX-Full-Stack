import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  User, 
  Calendar, 
  Phone, 
  Stethoscope, 
  Plus, 
  X,
  Upload,
  FileText,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Claim, ClaimStatus, HospitalUser, InsuranceEntity, Product } from '../types';
import { claimsApi, reimbursementApi } from '../services/api';
import { FastDOBPicker } from './FastDOBPicker';

interface PartnerProcessingFormProps {
  hospitalProfile: HospitalUser;
  onSave?: (claim: Claim) => void;
  product?: string;
  insurers?: InsuranceEntity[];
  tpas?: InsuranceEntity[];
}

const PartnerProcessingForm: React.FC<PartnerProcessingFormProps> = ({ 
  hospitalProfile,
  onSave,
  product: productProp,
  insurers = [],
  tpas = []
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const product = productProp || location.state?.product || 'Partner Processing';

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    patientName: '',
    gender: '',
    p_uhid: '',
    dob: '',
    mobileNo: '',
    emailId: '',
    admissionDate: '',
    expectedDischargeDate: '',
    diagnosis: '',
    estimateAmt: '',
    policyNumber: '',
    memberId: '',
    insuranceProvider: '',
    isTpaCase: 'No',
    tpa_provider: '',
    caseSource: 'Internal User',
    // Recovery & Recon Specific Fields
    claimId: '',
    parentCaseId: '',
    dischargeDate: '',
    finalBillAmt: '',
    finalApprovalAmt: ''
  });

  const validateField = (name: string, value: string) => {
    let error = '';
    const isKYP = product === Product.KYP;
    const isRecovery = product === Product.RECOVERY_RECONCILIATION;
    const isPrePost = product === Product.PRE_POST;

    if (!value && [
      'patientName', 'diagnosis', 'gender', 'mobileNo',
      !isKYP && !isRecovery && 'p_uhid',
      !isKYP && !isRecovery && 'insuranceProvider',
      !isKYP && !isRecovery && 'admissionDate',
      isRecovery && 'claimId',
      isRecovery && 'dischargeDate',
      isRecovery && 'finalBillAmt',
      isRecovery && 'finalApprovalAmt'
      , isPrePost && 'parentCaseId'
    ].filter(Boolean).includes(name)) {
      error = 'This field is mandatory';
    }

    if (name === 'mobileNo' && value) {
      if (!/^\d{10}$/.test(value)) {
        error = 'Mobile number must be 10 digits.';
      }
    }

    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    if (name === 'mobileNo') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    validateField(name, finalValue);
  };

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    policy: null,
    kyc: null,
    treatment: null,
    finalBill: null,
    finalApproval: null,
    completeFile: null
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | File, key: string) => {
    const isFile = typeof File === 'function' && e instanceof File;
    const file = isFile ? (e as File) : (e as React.ChangeEvent<HTMLInputElement>).target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [key]: file }));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert file"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For KYP, we don't need admissionDate as a mandatory field for the initial form
    const isKYP = product === Product.KYP;
    const isRecovery = product === Product.RECOVERY_RECONCILIATION;
    const isPrePost = product === Product.PRE_POST;
    const newErrors: { [key: string]: string } = {};

    const mandatoryFields = [
      'patientName', 'diagnosis', 'gender', 'mobileNo',
      !isKYP && !isRecovery && 'p_uhid',
      !isKYP && !isRecovery && 'insuranceProvider',
      !isKYP && !isRecovery && 'admissionDate',
      isRecovery && 'claimId',
      isRecovery && 'dischargeDate',
      isRecovery && 'finalBillAmt',
      isRecovery && 'finalApprovalAmt'
      , isPrePost && 'parentCaseId'
    ].filter(Boolean) as string[];

    mandatoryFields.forEach(field => {
       const key = field as keyof typeof formData;
       const val = formData[key];
       if (!val || (typeof val === 'string' && val.trim() === '')) {
         newErrors[field] = 'This field is mandatory';
       }
    });

    if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
      newErrors.mobileNo = 'Mobile number must be 10 digits.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all mandatory fields correctly");
      return;
    }

    setIsLoading(true);
    try {
      // Process files
      const attachedDocs: any[] = [];
      // For Partner Processing, we start with ASSESSMENT_INITIATED as per Point 7 requirement
      const initialStatus = (product === Product.RECOVERY_RECONCILIATION)
        ? ClaimStatus.FILE_DISPATCHED
        : (product === Product.ICA || product === Product.PRE_POST)
        ? ClaimStatus.NEW_REGISTRATION
        : (product === Product.PARTNER_PROCESSING) 
        ? ClaimStatus.ASSESSMENT_INITIATED
        : (product === Product.KYP) 
        ? (hospitalProfile?.valueAddedServices?.medicalScrutinyRequired ? ClaimStatus.PENDING_MEDICAL_REVIEW : ClaimStatus.KYP_PENDING)
        : ClaimStatus.ASSESSMENT_INITIATED;
      
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          let typeLabel = 'Treatment Documents';
          if (key === 'policy') typeLabel = 'Policy Documents';
          if (key === 'kyc') typeLabel = 'KYC documents';
          if (key === 'treatment') typeLabel = 'Treatment Documents';
          if (key === 'finalBill') typeLabel = 'Final Bill';
          if (key === 'finalApproval') typeLabel = 'Final Approval';
          if (key === 'completeFile') typeLabel = 'Complete File Attachment';

          const base64Data = await fileToBase64(file);

          attachedDocs.push({
            type: typeLabel,
            name: file.name,
            lastModified: file.lastModified,
            size: file.size,
            data: base64Data,
            mimeType: file.type || 'application/pdf'
          });
        }
      }

      let generatedCaseRef = `REF-${Date.now()}`;
      if (product === Product.PARTNER_PROCESSING) {
        try {
          const { data: allClaims } = await claimsApi.getAll();
          const pps = (allClaims || []).filter((c: any) => 
            c.product === Product.PARTNER_PROCESSING || 
            (c.caseReferenceId && c.caseReferenceId.startsWith('PP'))
          );
          
          let maxNum = 100;
          pps.forEach((c: any) => {
            if (c.caseReferenceId && c.caseReferenceId.startsWith('PP')) {
              const valPart = c.caseReferenceId.slice(2);
              const val = parseInt(valPart, 10);
              if (!isNaN(val) && val > maxNum) {
                maxNum = val;
              }
            }
          });
          
          if (maxNum === 100) {
            maxNum = 100 + pps.length + 1;
          } else {
            maxNum = maxNum + 1;
          }
          generatedCaseRef = `PP${maxNum}`;
        } catch (e) {
          console.error("Failed to generate custom PP Case Reference ID:", e);
          generatedCaseRef = 'PP101';
        }
      }

      const newClaim: any = {
        id: product === Product.RECOVERY_RECONCILIATION && formData.claimId 
          ? `${formData.claimId}-${Date.now()}` 
          : `CLM-${Date.now()}`,
        caseReferenceId: generatedCaseRef,
        patientId: `PAT-${Date.now()}`,
        patientName: formData.patientName,
        insuranceProvider: formData.insuranceProvider || 'Direct',
        policyNumber: formData.policyNumber || 'N/A',
        estimatedCost: product === Product.RECOVERY_RECONCILIATION 
          ? parseFloat(formData.finalBillAmt) 
          : parseFloat(formData.estimateAmt) || 0,
        outstandingAmount: product === Product.RECOVERY_RECONCILIATION 
          ? parseFloat(formData.finalApprovalAmt) 
          : 0,
        diagnosis: formData.diagnosis,
        admissionDate: formData.admissionDate,
        dischargeDate: formData.dischargeDate,
        claimType: 'Reimbursement',
        caseSource: formData.caseSource || 'Internal User',
        // CRITICAL: product field ensures data isolation between Reimbursement sub-processes
        product: product,
        status: initialStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        formData: {
          ...formData,
          adm_date: formData.admissionDate,
          dis_date: formData.dischargeDate,
          hospitalId: hospitalProfile.hospitalId || hospitalProfile.parentHospitalId || hospitalProfile.id,
          attachedDocs: attachedDocs,
          // Store sub-process specific data isolation flag
          reimbursement_sub_process: product
        },
        history: [{
          id: `HIST-${Date.now()}`,
          status: initialStatus,
          comment: product === Product.PARTNER_PROCESSING 
            ? `New Case created for Partner Processing and routed to Policy Audit Team for initial assessment.`
            : `Case created for ${product} and routed simultaneously to Medical Underwriting and Policy Audit Team`,
          date: new Date().toISOString(),
          type: 'status_change',
          userName: hospitalProfile.displayName || hospitalProfile.username || 'System',
          stageData: {
            documents: attachedDocs
          },
          userRole: hospitalProfile.role || 'Hospital User'
        }]
      };

      const productCodeMap: Record<string, 'ICA' | 'PRE_POST' | 'PARTNER_PROCESSING' | 'KYP' | 'RECOVERY_RECON'> = {
        [Product.ICA]: 'ICA',
        [Product.PRE_POST]: 'PRE_POST',
        [Product.PARTNER_PROCESSING]: 'PARTNER_PROCESSING',
        [Product.KYP]: 'KYP',
        [Product.RECOVERY_RECONCILIATION]: 'RECOVERY_RECON',
      };
      const productCode = productCodeMap[product];
      const hospitalId = hospitalProfile.hospitalId || hospitalProfile.parentHospitalId || hospitalProfile.id;
      if (!productCode || !hospitalId) {
        throw new Error('The reimbursement product or hospital scope is missing.');
      }

      // The reimbursement case is the system of record.  Do this first so a
      // rejected server-side validation never leaves a browser/legacy-only
      // claim record that users may mistake for a live operational case.
      const reimbursementCase = await reimbursementApi.create({
          productCode,
          hospitalId,
          claimId: product === Product.RECOVERY_RECONCILIATION ? formData.claimId || undefined : undefined,
          parentCaseId: product === Product.PRE_POST ? formData.parentCaseId : undefined,
          totalClaimedAmount: Number(newClaim.estimatedCost || 0),
          metadata: {
            ...formData,
            patientName: formData.patientName || null,
            policyNumber: formData.policyNumber || null,
            diagnosis: formData.diagnosis || null,
            source: formData.caseSource || 'Internal User',
            attachedDocuments: attachedDocs.map((document: any) => ({
              id: document?.id ?? null,
              name: document?.name ?? null,
              type: document?.type ?? null,
            })),
          },
      });

      // This temporary compatibility record lets unchanged patient/claim
      // screens continue to open the case.  Workflow state and authorisation
      // remain in the backend reimbursement case above.
      newClaim.formData.reimbursementCaseId = reimbursementCase?.id;
      let persistedClaim: any;
      if (onSave) {
        persistedClaim = await onSave(newClaim);
      } else {
        persistedClaim = (await claimsApi.create(newClaim)).data;
      }
      toast.success(`${product} case submitted successfully`);
      const segmentMap: Record<string, string> = {
        [Product.PARTNER_PROCESSING]: 'partner-processing',
        [Product.ICA]: 'ica',
        [Product.PRE_POST]: 'pre-post',
        [Product.KYP]: 'know-your-policy',
        [Product.RECOVERY_RECONCILIATION]: 'recovery-recon'
      };
      const segment = segmentMap[product] || 'partner-processing';
      navigate(`/reimbursement/${segment}`);
    } catch (error: any) {
      console.error("Error creating case:", error);
      toast.error("Failed to submit case");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 w-full px-4 sm:px-6">
      <div className="flex items-center justify-between">
         <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={24} />
         </button>
         <h1 className="text-xl font-black text-[#000080] uppercase tracking-tight">New {product} Case</h1>
         <div className="w-10"></div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 content-end items-end">
              {/* Row 1: Insurance Company, TPA Toggle, TPA Selection (Conditional) */}
              <div className="space-y-1.5 flex flex-col justify-center lg:col-span-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                    <ShieldCheck size={12} className="mr-1.5" /> Insurance Company <span className="text-rose-500 ml-1">*</span>
                 </label>
                 <select 
                   name="insuranceProvider"
                   value={formData.insuranceProvider}
                   onChange={handleInputChange}
                   className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.insuranceProvider ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all appearance-none`}
                   required
                 >
                   <option value="">Select Insurer</option>
                   {insurers.map(insurer => (
                     <option key={insurer.id} value={insurer.name}>{insurer.name}</option>
                   ))}
                   {insurers.length === 0 && (
                     <>
                       <option value="Star Health">Star Health</option>
                       <option value="HDFC ERGO">HDFC ERGO</option>
                       <option value="ICICI Lombard">ICICI Lombard</option>
                       <option value="Care Health">Care Health</option>
                       <option value="Niva Bupa">Niva Bupa</option>
                       <option value="Other">Other</option>
                     </>
                   )}
                 </select>
                 {errors.insuranceProvider && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.insuranceProvider}</p>}
              </div>

              <div className="space-y-1.5 flex flex-col justify-center lg:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                   Is this a TPA Case?
                </label>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 h-[54px]">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, isTpaCase: "Yes" }));
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isTpaCase === "Yes" ? 'bg-[#000080] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, isTpaCase: "No", tpa_provider: "" }));
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isTpaCase === "No" ? 'bg-[#000080] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}
                  >
                    No
                  </button>
                </div>
              </div>

              {formData.isTpaCase === "Yes" ? (
                <div className="space-y-1.5 flex flex-col justify-center animate-in fade-in slide-in-from-left-2 transition-all lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                      Select TPA <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <select 
                    name="tpa_provider"
                    value={formData.tpa_provider}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.tpa_provider ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all appearance-none`}
                    required
                  >
                    <option value="">Select TPA</option>
                    {tpas.map(tpa => (
                        <option key={tpa.id} value={tpa.name}>{tpa.name}</option>
                    ))}
                    {tpas.length === 0 && (
                      <>
                        <option value="Medi Assist">Medi Assist</option>
                        <option value="TPA India">TPA India</option>
                        <option value="MD India">MD India</option>
                        <option value="Raksha TPA">Raksha TPA</option>
                        <option value="Heritage Health">Heritage Health</option>
                      </>
                    )}
                  </select>
                  {errors.tpa_provider && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.tpa_provider}</p>}
                </div>
              ) : (
                <div className="lg:col-span-1" />
              )}

              {product !== Product.RECOVERY_RECONCILIATION && product !== Product.KYP ? (
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                    <ShieldCheck size={12} className="mr-1.5" /> UHID/IPD NO. <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="p_uhid"
                    value={formData.p_uhid}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.p_uhid ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-mono`}
                    placeholder="UHID / IP No."
                    required={product !== Product.KYP && product !== Product.RECOVERY_RECONCILIATION}
                  />
                  {errors.p_uhid && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.p_uhid}</p>}
                </div>
              ) : product === Product.RECOVERY_RECONCILIATION ? (
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                      <ShieldCheck size={12} className="mr-1.5" /> Claim ID <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.claimId}
                    onChange={e => setFormData(prev => ({ ...prev, claimId: e.target.value }))}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-mono"
                    placeholder="G-88123"
                    required
                  />
                </div>
              ) : (
                <div className="lg:col-span-1" />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {product === Product.PRE_POST && (
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                    <FileText size={12} className="mr-1.5" /> Verified Parent ICA Reimbursement Case ID <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <input
                    type="text" name="parentCaseId" value={formData.parentCaseId} onChange={handleInputChange}
                    className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.parentCaseId ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-mono`}
                    placeholder="Select or enter the verified ICA reimbursement case UUID" required
                  />
                  <p className="text-[9px] font-medium text-slate-400 ml-1">Pre/Post bills can only be processed against a verified ICA master case.</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                    <User size={12} className="mr-1.5" /> Patient Name <span className="text-rose-500 ml-1">*</span>
                </label>
                <input 
                  type="text" 
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.patientName ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-sans`}
                  placeholder="Enter full name"
                  required
                />
                {errors.patientName && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.patientName}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                    <User size={12} className="mr-1.5" /> Gender <span className="text-rose-500 ml-1">*</span>
                </label>
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.gender ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all appearance-none`}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.gender}</p>}
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                    <Calendar size={12} className="mr-1.5" /> Date of Birth
                 </label>
                  <FastDOBPicker 
                    value={formData.dob}
                    onChange={(val) => handleInputChange({ target: { name: 'dob', value: val } } as any)}
                  />
              </div>

               {/* Row 3: Mobile Number, Admission Date, Discharge Date */}
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                    <Phone size={12} className="mr-1.5" /> Mobile Number <span className="text-rose-500 ml-1">*</span>
                 </label>
                 <input 
                   type="tel" 
                   name="mobileNo"
                   value={formData.mobileNo}
                   onChange={handleInputChange}
                   className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.mobileNo ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all shadow-none`}
                   placeholder="10-digit mobile"
                   required
                 />
                 {errors.mobileNo && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.mobileNo}</p>}
              </div>

              {/* Row 3: Admission Date, Discharge Date, Diagnosis, Estimate */}
              {product !== Product.KYP && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                      <Calendar size={12} className="mr-1.5" /> Admission Date <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <div className="relative group">
                    <input 
                      type="date" 
                      name="admissionDate"
                      value={formData.admissionDate}
                      onChange={handleInputChange}
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
                      className={`w-full px-5 py-3.5 pr-4 bg-slate-50 border ${errors.admissionDate ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-mono cursor-pointer select-none`}
                      required={product !== Product.KYP && product !== Product.RECOVERY_RECONCILIATION}
                    />
                  </div>
                  {errors.admissionDate && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.admissionDate}</p>}
                </div>
              )}

              {product !== Product.KYP && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                      <Calendar size={12} className="mr-1.5" /> Discharge Date
                  </label>
                  <div className="relative group">
                    <input 
                      type="date" 
                      name="dischargeDate"
                      value={formData.dischargeDate}
                      onChange={handleInputChange}
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
                      className="w-full px-5 py-3.5 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-mono cursor-pointer select-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                     <Stethoscope size={12} className="mr-1.5" /> Diagnosis <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.diagnosis ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all`}
                    placeholder="Enter full diagnosis"
                    required
                  />
                  {errors.diagnosis && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.diagnosis}</p>}
               </div>

               {product !== Product.RECOVERY_RECONCILIATION && (
                 <>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                         <FileText size={12} className="mr-1.5" /> Policy Number
                     </label>
                     <input 
                       type="text" 
                       name="policyNumber"
                       value={formData.policyNumber}
                       onChange={handleInputChange}
                       className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.policyNumber ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-mono`}
                       placeholder="Policy ID"
                     />
                     {errors.policyNumber && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.policyNumber}</p>}
                   </div>

                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                         <FileText size={12} className="mr-1.5" /> Member ID
                     </label>
                     <input 
                       type="text" 
                       name="memberId"
                       value={formData.memberId}
                       onChange={handleInputChange}
                       className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.memberId ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-mono`}
                       placeholder="Member ID"
                     />
                     {errors.memberId && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.memberId}</p>}
                   </div>

                  {product !== Product.KYP && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                          Estimate Amount (₹)
                      </label>
                      <input 
                        type="number" 
                        name="estimateAmt"
                        value={formData.estimateAmt}
                        onChange={handleInputChange}
                        className={`w-full px-5 py-3.5 bg-slate-50 border ${errors.estimateAmt ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all`}
                        placeholder="0.00"
                      />
                      {errors.estimateAmt && <p className="text-[9px] font-bold text-rose-500 ml-1 uppercase">{errors.estimateAmt}</p>}
                    </div>
                  )}
                 </>
               )}

               {product === Product.RECOVERY_RECONCILIATION && (
                 <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                          Final Bill (₹) <span className="text-rose-500 ml-1">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          value={formData.finalBillAmt}
                          onChange={e => setFormData(prev => ({ ...prev, finalBillAmt: e.target.value }))}
                          className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                          placeholder="65,000"
                          required
                        />
                        <FileUploadMini label="Bill" fileName={files.finalBill?.name} file={files.finalBill} onChange={e => handleFileChange(e, 'finalBill')} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                          Final Approval amt (₹) <span className="text-rose-500 ml-1">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          value={formData.finalApprovalAmt}
                          onChange={e => setFormData(prev => ({ ...prev, finalApprovalAmt: e.target.value }))}
                          className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                          placeholder="60,000"
                          required
                        />
                        <FileUploadMini label="Approv" fileName={files.finalApproval?.name} file={files.finalApproval} onChange={e => handleFileChange(e, 'finalApproval')} />
                      </div>
                    </div>
                 </div>
               )}
            </div>

            {/* Case Source hidden as it is auto-captured as 'Internal User' */}

         {/* File Uploads */}
         {product !== Product.RECOVERY_RECONCILIATION && (
           <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] border-b border-slate-100 pb-3 flex items-center">
                 <Upload size={14} className="mr-2 text-blue-600" /> Documents & Supporting Files {product === Product.KYP && '(Policy Documents)'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FileUploadBox 
                   label="Policy Documents" 
                   fileName={files.policy?.name} 
                   file={files.policy}
                   onChange={e => handleFileChange(e, 'policy')} 
                 />
                 {product !== Product.KYP && (
                   <>
                     <FileUploadBox 
                       label="KYC Documents" 
                       fileName={files.kyc?.name} 
                       file={files.kyc}
                       onChange={e => handleFileChange(e, 'kyc')} 
                     />
                     <FileUploadBox 
                       label="Treatment Documents" 
                       fileName={files.treatment?.name} 
                       file={files.treatment}
                       onChange={e => handleFileChange(e, 'treatment')} 
                     />
                   </>
                 )}
              </div>
           </div>
         )}

         <div className="flex gap-4 pt-6 border-t border-slate-50">
            <button 
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-8 py-4 bg-slate-50 text-slate-400 rounded-[1.5rem] border border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
               Cancel
            </button>
            <button 
              disabled={isLoading}
              className="flex-[2] px-8 py-4 bg-gradient-to-r from-[#000080] to-blue-700 text-white rounded-[1.5rem] shadow-xl shadow-blue-200 text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
               {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               <span>
                 {product === Product.KYP 
                   ? 'Submit Case for KYP' 
                   : product === Product.RECOVERY_RECONCILIATION 
                   ? 'Submit Claim' 
                   : 'Submit case for Assessment'}
               </span>
            </button>
         </div>
      </form>

      <div className="flex items-center gap-3 p-5 bg-blue-50/50 rounded-3xl border border-blue-100">
         <AlertCircle className="text-blue-600 shrink-0" size={20} />
         <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tight leading-relaxed">
            Ensure all medical reports and valid policy copies are uploaded. Incomplete cases may face delays in assessment.
         </p>
      </div>
    </div>
  );
};

const FileUploadMini = ({ label, fileName, file, onChange }: any) => {
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className="relative shrink-0"
        onDragOver={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }}
        onDrop={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          const fileDropped = evt.dataTransfer.files?.[0];
          if (fileDropped && onChange) {
            onChange(fileDropped);
          }
        }}
      >
        <input type="file" onChange={onChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
        <div className={`px-4 py-3.5 rounded-2xl border-2 border-dashed transition-all flex items-center gap-2 min-w-[120px] ${
          fileName 
            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-100' 
            : 'bg-[#000080] border-[#0000a0] text-white hover:bg-blue-900 shadow-lg shadow-blue-100'
        }`}>
          <Upload size={14} className="shrink-0" />
          <span className="text-[10px] font-black uppercase truncate max-w-[80px]">
            {fileName || label}
          </span>
        </div>
      </div>
      {fileName && (
        <button 
          type="button"
          onClick={handleView}
          className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center shrink-0 border border-slate-200"
          title="View File"
        >
          <FileText size={16} />
        </button>
      )}
    </div>
  );
};

const FileUploadBox = ({ label, fileName, file, onChange }: any) => {
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file) {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
    }
  };

  return (
    <div 
      className="relative group"
      onDragOver={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
      }}
      onDrop={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        const fileDropped = evt.dataTransfer.files?.[0];
        if (fileDropped && onChange) {
          onChange(fileDropped);
        }
      }}
    >
      <input 
        type="file" 
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
      />
      <div className={`p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-center h-full ${fileName ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50/30'}`}>
         {fileName ? (
           <>
             <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={20} />
             </div>
             <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter truncate w-full px-2">{fileName}</p>
             <button 
               type="button"
               onClick={handleView}
               className="mt-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors z-20"
             >
               View
             </button>
           </>
         ) : (
           <>
             <div className="w-10 h-10 rounded-xl bg-white text-slate-400 flex items-center justify-center shadow-sm group-hover:text-blue-500 transition-colors">
                <Plus size={20} />
             </div>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
           </>
         )}
      </div>
    </div>
  );
};

export default PartnerProcessingForm;
