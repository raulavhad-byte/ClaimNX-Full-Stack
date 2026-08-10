import React, { useMemo, useState, useRef } from 'react';
import { 
  FileSearch, 
  ArrowRightLeft, 
  Search, 
  PlusCircle, 
  Filter, 
  Download,
  Activity,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  MoreVertical,
  Calendar,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Upload,
  IndianRupee,
  RefreshCw,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Claim, ClaimStatus, ClaimStage, HospitalUser, Product, TimelineEvent, InsuranceEntity } from '../types';
import { format } from 'date-fns';
import { formatTAT } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import FollowUpEmailModal from "./FollowUpEmailModal";
import { emailTemplateService } from "../services/emailTemplateService";
import { EmailTemplate } from "./EmailTemplatesManager";

interface ReimbursementDashboardProps {
  claims: Claim[];
  hospitalProfile: HospitalUser;
  product?: 'Partner Processing' | 'ICA' | 'Pre & Post' | 'Know Your Policy' | 'Recovery & Recon';
  onSave?: (claim: Claim) => Promise<void>;
  insurers?: InsuranceEntity[];
  tpas?: InsuranceEntity[];
}

const ReimbursementDashboard: React.FC<ReimbursementDashboardProps> = ({ 
  claims, 
  hospitalProfile,
  product = 'Partner Processing',
  onSave,
  insurers = [],
  tpas = []
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (product === Product.PARTNER_PROCESSING) return 'assessment_pending';
    if (product === Product.ICA || product === Product.PRE_POST) return 'new_registration';
    if (product === Product.RECOVERY_RECONCILIATION) return 'outstanding';
    if (product === Product.KYP || product === 'Know Your Policy') return 'all';
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeaderByProduct, setShowHeaderByProduct] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('reimbursement_dashboard_headers');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  
  React.useEffect(() => {
    localStorage.setItem('reimbursement_dashboard_headers', JSON.stringify(showHeaderByProduct));
  }, [showHeaderByProduct]);

  // Email Follow-up State
  const [selectedEmailClaim, setSelectedEmailClaim] = useState<Claim | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  React.useEffect(() => {
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
    ClaimStatus.ASSESSMENT_QUERY_PENDING,
    ClaimStatus.ASSESSMENT_QUERY_REPLIED,
    ClaimStatus.HOSPITAL_QUERY_PENDING,
    ClaimStatus.INTERNAL_QUERY_PENDING,
    ClaimStatus.CLAIM_UNDER_QUERY,
    ClaimStatus.CLAIM_QUERY_RESOLVED,
    ClaimStatus.KYP_QUERY_PENDING,
    ClaimStatus.KYP_QUERY_REPLIED
  ];

  const showHeader = showHeaderByProduct[product] !== false;
  const [isUploading, setIsUploading] = useState(false);
  const [showReportDateModal, setShowReportDateModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  React.useEffect(() => {
    if (product === Product.PARTNER_PROCESSING) setActiveTab('assessment_pending');
    else if (product === Product.ICA || product === Product.PRE_POST) setActiveTab('new_registration');
    else if (product === Product.RECOVERY_RECONCILIATION) setActiveTab('outstanding');
    else if (product === Product.KYP || product === 'Know Your Policy') setActiveTab('all');
    else setActiveTab('all');
  }, [product]);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      if (date && typeof date === 'object' && 'seconds' in date) {
        return format(new Date(date.seconds * 1000), 'dd-MM-yyyy');
      }
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return format(d, 'dd-MM-yyyy');
    } catch (e) {
      return 'N/A';
    }
  };

  const handleExportReport = () => {
    if (!showReportDateModal) {
      setShowReportDateModal(true);
      return;
    }

    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    end.setHours(23, 59, 59, 999);

    const isKYP = (product as string) === Product.KYP || (product as string) === 'Know Your Policy';
    const filteredReportClaims = claims.filter(c => {
      // Date filtering based on createdAt or admissionDate
      const claimDate = new Date(c.createdAt || c.admissionDate || new Date());
      if (claimDate < start || claimDate > end) return false;

      if (isKYP) return (c.product as string) === Product.KYP || (c.product as string) === 'KYP' || (c.product as string) === 'Know Your Policy';
      return c.product === product;
    });

    if (filteredReportClaims.length === 0) {
      toast.error("No cases found for the selected date range");
      return;
    }

    const reportData = filteredReportClaims.map((claim, index) => {
      const formData = claim.formData || {};
      
      // Calculate TATs from history
      let assessmentInitiatedTime: Date | null = null;
      let assessmentApprovedTime: Date | null = null;
      let dischargeInitiatedTime: Date | null = null;
      let dischargeApprovedTime: Date | null = null;
      let assessmentQueryCount = 0;
      let dischargeQueryCount = 0;
      let rejectionRemark = '';

      claim.history?.forEach(event => {
        const eventDate = new Date(event.date);
        if (isNaN(eventDate.getTime())) return;

        if (event.status === ClaimStatus.ASSESSMENT_INITIATED || event.status === ClaimStatus.PRE_AUTH_INITIATED) {
          if (!assessmentInitiatedTime) assessmentInitiatedTime = eventDate;
        }
        if (event.status === ClaimStatus.ASSESSMENT_APPROVED || event.status === ClaimStatus.PRE_AUTH_APPROVED) {
          assessmentApprovedTime = eventDate;
        }
        if (event.status === ClaimStatus.DISCHARGE_INITIATED) {
          if (!dischargeInitiatedTime) dischargeInitiatedTime = eventDate;
        }
        if (event.status === ClaimStatus.DISCHARGE_APPROVED || event.status === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED) {
          dischargeApprovedTime = eventDate;
        }
        if (event.status === ClaimStatus.ASSESSMENT_QUERY_PENDING || event.status === ClaimStatus.INITIAL_QUERY_PENDING) {
          assessmentQueryCount++;
        }
        if (event.status === ClaimStatus.DISCHARGE_QUERY_RAISED) {
          dischargeQueryCount++;
        }
        if (event.status === ClaimStatus.ASSESSMENT_REJECTED || event.status === ClaimStatus.DISCHARGE_REJECTED || event.status === ClaimStatus.MEDICAL_REJECTED) {
          rejectionRemark = event.comment || rejectionRemark;
        }
      });

      const getTAT = (start: Date | null, end: Date | null) => {
        if (!start || !end) return '';
        const diff = end.getTime() - start.getTime();
        if (diff < 0) return '00:00';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };

      const assessmentTAT = formatTAT(assessmentInitiatedTime?.toISOString(), assessmentApprovedTime?.toISOString());
      const dischargeTAT = formatTAT(dischargeInitiatedTime?.toISOString(), dischargeApprovedTime?.toISOString());

      const dischargeDate = claim.dischargeDate || formData.discharge_date;
      const utrDate = formData.utr_date;
      
      let claimSettledDays = '';
      if (dischargeDate && utrDate) {
        const dDate = new Date(dischargeDate);
        const uDate = new Date(utrDate);
        if (!isNaN(dDate.getTime()) && !isNaN(uDate.getTime())) {
          claimSettledDays = Math.floor((uDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24)).toString();
        }
      }

      let settlementPendingTAT = 0;
      if (dischargeDate) {
        const dDate = new Date(dischargeDate);
        if (!isNaN(dDate.getTime())) {
          settlementPendingTAT = Math.floor((new Date().getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      const ageing = settlementPendingTAT > 90 ? "Above 90 Days" :
                     settlementPendingTAT > 60 ? "60 to 90 Days" :
                     settlementPendingTAT > 45 ? "45 to 60 days" :
                     settlementPendingTAT > 30 ? "30 to 45 Days" :
                     settlementPendingTAT > 15 ? "15 to 30 Days" :
                     settlementPendingTAT > 0 ? "0 to 15 Days" : "NA";

      if (isKYP) {
        const kypEvent = claim.history?.find(h => h.stageData?.isKypEvent);
        const kypData = kypEvent?.stageData?.kypData || {};
        
        const calculateAge = (dob?: string) => {
          if (!dob) return 'N/A';
          try {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
            return age > 0 ? age : 'N/A';
          } catch (e) { return 'N/A'; }
        };

        const age = calculateAge(kypData.dob || formData.p_dob);

        return {
          "Hospital Name": hospitalProfile.hospitalName || '',
          "Patient Name": claim.patientName || kypData.patientName || '',
          "Age": age,
          "TPA Name": kypData.tpaName || formData.tpa_name || '',
          "Insurer Name": claim.insuranceProvider || kypData.companyName || '',
          "Diagnosis Name": kypData.diagnosisName || claim.diagnosis || '',
          "Sum Insured": kypData.sumInsured || formData.sum_insured || '',
          "Balance SI": kypData.balanceSI || formData.balance_si || '',
          "Room Rent": kypData.roomRentLimit || formData.room_rent_limit || '',
          "ICU Limit": kypData.icuLimit || formData.icu_limit || '',
          "Co -Pay": kypData.copayPercentage !== undefined ? `${kypData.copayPercentage}%` : (formData.co_pay ? `${formData.co_pay}%` : ''),
          "Sub-Limit": kypData.subLimits || formData.sub_limit || '',
          "Member ID": kypData.memberId || formData.p_member_id || '',
          "Policy Number": claim.policyNumber || kypData.policyNumber || '',
          "Claim Status": claim.status
        };
      }

      if (product === 'Recovery & Recon') {
        const finalBillAmt = parseFloat(formData.fin_bill_amt) || 0;
        const finalAppAmt = parseFloat(formData.fin_app_amt) || 0;
        const totalSettledAmt = claim.paidAmount || 0;
        const tdsDeducted = parseFloat(formData.tds_deducted) || 0;
        const netSettled = totalSettledAmt - tdsDeducted;
        const outstanding = finalAppAmt - totalSettledAmt;
        
        const monthYear = dischargeDate ? format(new Date(dischargeDate), 'MMM-yy') : '';
        const billVsAl = (finalBillAmt > 0 && finalAppAmt > 0) ? `${((finalAppAmt / finalBillAmt) * 100).toFixed(2)}%` : '';
        const alVsSettlement = (finalAppAmt > 0 && totalSettledAmt > 0) ? `${((totalSettledAmt / finalAppAmt) * 100).toFixed(2)}%` : '';

        return {
          "Month (Formula Discharge Date – “MMM-YY”)": monthYear,
          "Final Bill Vs Final AL - (Formula =Final Approval Amt/Final Bill) In % ratio": billVsAl,
          "Final AL Vs Settlement - (Formula =Including TDS/Final Approval Amt) In % ratio": alVsSettlement,
          "Claim Settled (In Days) - ": claimSettledDays,
          "Settlement Pending TAT (In Days) – (Formula = Today()-Discharge Date": settlementPendingTAT || '',
          "Ageing – (Formula =IF(SETTLEMENT PENDING TAT>90,\"Above 90 Days\",IF(SETTLEMENT PENDING TAT>60,\"60 to 90 Days\",IF(SETTLEMENT PENDING TAT>45,\"45 to 60 days\",IF(SETTLEMENT PENDING TAT>30,\"30 to 45 Days\",IF(SETTLEMENT PENDING TAT>15,\"15 to 30 Days\",IF(SETTLEMENT PENDING TAT>0,\"0 to 15 Days\",\"NA\"))))))": ageing,
          "Case ID (Ref. ID)": claim.caseReferenceId || '',
          "IPD number (IPD and UHID)": `${formData.p_ipd_no || ''} ${formData.p_uhid || ''}`.trim(),
          "Hospital Name": hospitalProfile.hospitalName || '',
          "Patient Name": claim.patientName || '',
          "TPA Name": formData.tpa_name || '',
          "Insurer Name": claim.insuranceProvider || '',
          "Claim No.": formData.insurer_claim_no || formData.claim_no || claim.id,
          "Date of Admission": formatDate(claim.admissionDate),
          "Date of Discharge": formatDate(dischargeDate),
          "Total Bill Amt": finalBillAmt || '',
          "Final Approval Amt": finalAppAmt || '',
          "File Dispatch Date": formatDate(claim.fileDispatchedDate),
          "File Dispatch tracking Number": formData.dispatch_tracking_no || '',
          "File Courier Company Name": formData.courier_company || '',
          "Claim Status": claim.status,
          "UTR Date": formatDate(formData.utr_date),
          "UTR NO": formData.utr_no || '',
          "Net Settled (Bank Credit)": netSettled || '',
          "Total Settled Amount": totalSettledAmt || '',
          "TDS Deducted (Rs.)": tdsDeducted || '',
          "Partial Diff": claim.outstandingAmount || '',
          "Outstanding (Formula = Final Approval Amt - Total Settled Amt)": outstanding || '',
          "Partial Payment Reason": formData.partial_reason || '',
          "Bank Reconciliation": formData.bank_reconciliation || (claim.status === ClaimStatus.BANK_RECONCILIATION_COMPLETED ? 'Completed' : 'Pending')
        };
      }

      if (product === 'ICA' || product === 'Pre & Post') {
        const totalSettledAmt = claim.paidAmount || 0;
        const finalBillAmt = parseFloat(formData.fin_bill_amt) || 0;
        const outstanding = finalBillAmt - totalSettledAmt;
        
        return {
          "Claim Settled (In Days)": claimSettledDays,
          "Settlement Pending TAT (In Days)": settlementPendingTAT || '',
          "Ageing": ageing,
          "Case ID (Ref. ID)": claim.caseReferenceId || '',
          "Hospital Name": hospitalProfile.hospitalName || '',
          "Patient Name": claim.patientName || '',
          "TPA Name": formData.tpa_name || '',
          "Insurer Name": claim.insuranceProvider || '',
          "Member ID": formData.p_member_id || '',
          "Policy Number": claim.policyNumber || '',
          "Claim No.": formData.claim_no || claim.id,
          "Date of Admission": formatDate(claim.admissionDate),
          "Date of Discharge": formatDate(dischargeDate),
          "Diagnosis Name": claim.diagnosis || '',
          "Final Bill Amt": finalBillAmt || '',
          "File Dispatch Date": formatDate(claim.fileDispatchedDate),
          "File Dispatch tracking Number": formData.dispatch_tracking_no || '',
          "File Courier Company Name": formData.courier_company || '',
          "Claim Status": claim.status,
          "UTR Date": formatDate(formData.utr_date),
          "UTR NO": formData.utr_no || '',
          "Total Settled Amount": totalSettledAmt || '',
          "Partial Diff": claim.outstandingAmount || '',
          "Outstanding": outstanding || '',
          "Partial Payment Reason": formData.partial_reason || '',
          "Rejection remark": rejectionRemark
        };
      }

      // Partner Processing format
      const finalBillAmt = parseFloat(formData.fin_bill_amt) || 0;
      const finalAppAmt = parseFloat(formData.fin_app_amt) || 0;
      const finalBillVsFinalAL = (finalBillAmt > 0 && finalAppAmt > 0) ? `${((finalAppAmt / finalBillAmt) * 100).toFixed(2)}%` : '';

      const totalSettledAmt = claim.paidAmount || 0;
        const outstanding = finalAppAmt - totalSettledAmt;
        
        return {
          "Final Bill Vs Final AL": finalBillVsFinalAL,
          "Claim Settled (In Days)": claimSettledDays,
          "Settlement Pending TAT (In Days)": settlementPendingTAT || '',
          "Ageing": ageing,
          "Case ID (Ref. ID)": claim.caseReferenceId || '',
          "IPD number (IPD and UHID)": `${formData.p_ipd_no || ''} ${formData.p_uhid || ''}`.trim(),
          "Hospital Name": hospitalProfile.hospitalName || '',
          "Patient Name": claim.patientName || '',
          "TPA Name": formData.tpa_name || '',
          "Insurer Name": claim.insuranceProvider || '',
          "Member ID": formData.p_member_id || '',
          "Policy Number": claim.policyNumber || '',
          "Claim No.": formData.claim_no || claim.id,
          "Corporate Name": formData.corporate_name || '',
          "Date of Admission": formatDate(claim.admissionDate),
          "Date of Discharge": formatDate(dischargeDate),
          "Treating Doctor": formData.treating_doctor || '',
          "Diagnosis Name": claim.diagnosis || '',
          "Package Expenses": formData.package_expenses || '',
          "Room Rent Expenses": formData.room_rent || '',
          "Professional Expenses": formData.professional_fees || '',
          "Pharmacy Expenses": formData.pharmacy_expenses || '',
          "Other Investigation Expenses": formData.investigation_expenses || '',
          "Diagnostics Other Amt": formData.other_diagnostics || '',
          "Final Bill Amt": finalBillAmt || '',
          "Final Bill Date (Discharge Date)": formatDate(dischargeDate),
          "Final Approval Amt": finalAppAmt || '',
          "MOU Discount": formData.mou_discount || '',
          "Co-Payment": formData.co_payment || '',
          "Non-Medical Expenses": formData.non_medical_expenses || '',
          "Proportionate Expenses": formData.proportionate_expenses || '',
          "Sub-Limit": formData.sub_limit || '',
          "Tariff Deductions": formData.tariff_deductions || '',
          "Other Deductions": formData.other_deductions || '',
          "Total Amt": formData.total_deductions || '',
          "Discharge Approved Deduction Reason": formData.discharge_deduction_reason || '',
          "File Dispatch Date": formatDate(claim.fileDispatchedDate),
          "File Dispatch tracking Number": formData.dispatch_tracking_no || '',
          "File Courier Company Name": formData.courier_company || '',
          "Claim Status": claim.status,
          "UTR Date": formatDate(formData.utr_date),
          "UTR NO": formData.utr_no || '',
          "Total Settled Amount": totalSettledAmt || '',
          "Partial Diff": claim.outstandingAmount || '',
          "Outstanding": outstanding || '',
        "Partial Payment Reason": formData.partial_reason || '',
        "Rejection remark": rejectionRemark,
        "Assessment Approved TAT (HH:MM)": assessmentTAT,
        "Discharge Approved TAT (HH:MM)": dischargeTAT,
        "Assessment Query Raised": assessmentQueryCount,
        "Discharge Query Raised": dischargeQueryCount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${product}_Report_${format(start, 'ddMMM')}_to_${format(end, 'ddMMM')}.xlsx`);
    toast.success("Excel report exported successfully");
    setShowReportDateModal(false);
  };

  const counts = useMemo(() => {
    const isPast24Hours = (dateStr: string | undefined) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      return (now.getTime() - date.getTime()) > (24 * 60 * 60 * 1000);
    };

    const isKYP = (product as string) === 'Know Your Policy' || (product as string) === Product.KYP;
    const baseClaims = claims.filter(c => 
      c.claimType === 'Reimbursement' && 
      (isKYP ? ((c.product as string) === Product.KYP || (c.product as string) === 'KYP' || (c.product as string) === 'Know Your Policy') : c.product === product)
    );
    
    if (product === 'Know Your Policy') {
      return {
        all: baseClaims.filter(c => 
          [
            ClaimStatus.KYP_PENDING, 
            ClaimStatus.KYP_PENDING_APPROVAL,
            ClaimStatus.KYP_QUERY_REPLIED,
            ClaimStatus.KYP_QUERY_PENDING,
            ClaimStatus.KYP_ACCEPTED,
            ClaimStatus.PENDING_MEDICAL_REVIEW,
            ClaimStatus.NEW_REGISTRATION,
            'Pending',
            'Pending Approval',
            'Query Replied',
            'Query Pending',
            'KYP Pending Approval',
            'KYP Accepted',
            'Pending Medical Review',
            'New Registration'
          ].includes(c.status as any)
        ).length,
        assessment: baseClaims.filter(c => 
          [
            ClaimStatus.KYP_ACCEPTED, 
            ClaimStatus.KYP_COMPLETED,
            'Approved',
            'KYP Accepted',
            'KYP Completed'
          ].includes(c.status as any)
        ).length, 
        discharge: baseClaims.filter(c => 
          c.status === ClaimStatus.KYP_QUERY_PENDING || 
          (c.status as string) === 'Query Pending'
        ).length, 
        dispatch: baseClaims.filter(c => 
          c.status === ClaimStatus.KYP_REJECTED || 
          (c.status as string) === 'Rejected' || 
          (c.status as string) === 'KYP Rejected'
        ).length,
        claim: 0,
        settled: 0,
      };
    }

    if (product === 'Recovery & Recon') {
      const settledCount = baseClaims.filter(c => 
        [ClaimStatus.COMPLETE_SETTLEMENT, ClaimStatus.BANK_RECONCILIATION_COMPLETED, ClaimStatus.ACCOUNT_RECONCILIATION].includes(c.status as any) ||
        c.settlementStatus === 'Full'
      ).length;

      return {
        outstanding: baseClaims.filter(c => 
          [
            ClaimStatus.FILE_DISPATCHED,
            ClaimStatus.CLAIM_UNDER_PROCESS,
            ClaimStatus.CLAIM_QUERY_RESOLVED,
            ClaimStatus.CLAIM_APPROVED,
            ClaimStatus.FILE_DISPATCH_PENDING,
            'Outstanding'
          ].includes(c.status as any) && c.settlementStatus !== 'Full'
        ).length,
        query: baseClaims.filter(c => c.status === ClaimStatus.CLAIM_UNDER_QUERY).length,
        complete: baseClaims.filter(c => c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.settlementStatus === 'Full').length,
        partial_recoverable: baseClaims.filter(c => c.status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE).length,
        partial_non_recoverable: baseClaims.filter(c => c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE).length,
        closed: baseClaims.filter(c => c.status === ClaimStatus.DISCHARGE_REJECTED || c.status === ClaimStatus.SETTLEMENT_FAILED).length,
        bank_recon: baseClaims.filter(c => c.status === ClaimStatus.BANK_RECONCILIATION_COMPLETED || c.status === ClaimStatus.ACCOUNT_RECONCILIATION).length,
        all: baseClaims.length - settledCount,
        settled: settledCount
      };
    }

    const isICAPrePost = product === 'ICA' || product === 'Pre & Post';
    const settledCount = baseClaims.filter(c => 
      [
        ClaimStatus.COMPLETE_SETTLEMENT,
        ClaimStatus.BANK_RECONCILIATION_COMPLETED,
        ClaimStatus.ACCOUNT_RECONCILIATION,
        ...(isICAPrePost ? [ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE, ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE] : [])
      ].includes(c.status as any)
    ).length;

    return {
      all: baseClaims.length - settledCount,
      new_registration: isICAPrePost ? baseClaims.filter(c => 
        c.status === ClaimStatus.NEW_REGISTRATION
      ).length : 0,
      under_review: isICAPrePost ? baseClaims.filter(c => 
        [
          ClaimStatus.WELCOME_CALL_DONE, 
          ClaimStatus.FILE_PICKUP_SCHEDULED, 
          ClaimStatus.FILE_PICKUP_IN_PROGRESS
        ].includes(c.status as any)
      ).length : 0,
      file_dispatch_pending: isICAPrePost ? baseClaims.filter(c => 
        [
          ClaimStatus.FILE_PICKED_UP_DONE,
          ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
          ClaimStatus.MEDICALLY_FILE_APPROVED,
          ClaimStatus.HOSPITAL_QUERY_PENDING,
          ClaimStatus.QUERY_DOCUMENTS_RECEIVED,
          ClaimStatus.INTERNAL_QUERY_PENDING
        ].includes(c.status as any)
      ).length : 0,
      file_dispatched: isICAPrePost ? baseClaims.filter(c => 
        c.status === ClaimStatus.FILE_DISPATCHED
      ).length : 0,
      pending_settlement: isICAPrePost ? baseClaims.filter(c => 
        [
          ClaimStatus.CLAIM_UNDER_QUERY,
          ClaimStatus.CLAIM_QUERY_RESOLVED,
          ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
          ClaimStatus.CLAIM_APPROVED
        ].includes(c.status as any)
      ).length : 0,
      claim_query: isICAPrePost ? baseClaims.filter(c => 
        c.status === ClaimStatus.CLAIM_UNDER_QUERY
      ).length : 0,
      settled: settledCount,
      
      // Legacy counts for non-ICA/PrePost
      assessment_pending: isICAPrePost ? 0 : baseClaims.filter(c => 
        [
          ClaimStatus.NEW_REGISTRATION, 
          ClaimStatus.WELCOME_CALL_DONE, 
          ClaimStatus.FILE_PICKUP_SCHEDULED, 
          ClaimStatus.FILE_PICKUP_IN_PROGRESS, 
          ClaimStatus.FILE_PICKED_UP_DONE,
          ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
          ClaimStatus.HOSPITAL_QUERY_PENDING,
          ClaimStatus.INTERNAL_QUERY_PENDING,
          ClaimStatus.QUERY_DOCUMENTS_RECEIVED,
          ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
          ClaimStatus.CLAIM_PENDING_WITH_INSURER_MEDICAL,
          ClaimStatus.QUERY_REPLY_DONE,
          ClaimStatus.INITIAL_QUERY_PENDING,
          ClaimStatus.ASSESSMENT_INITIATED,
          ClaimStatus.ENHANCEMENT,
          ClaimStatus.DISCHARGE_INITIATED,
          ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
          ClaimStatus.PENDING_MEDICAL_TEAM,
          ClaimStatus.PENDING_MEDICAL_REVIEW
        ].includes(c.status as any) || c.status.toLowerCase().includes('assessment started')
      ).length,
      query_pending: isICAPrePost ? 0 : baseClaims.filter(c => 
        c.status === ClaimStatus.ASSESSMENT_QUERY_PENDING || 
        c.status === ClaimStatus.DISCHARGE_QUERY_RAISED
      ).length,
      assessment_approval: isICAPrePost ? 0 : baseClaims.filter(c => 
        c.status === ClaimStatus.MEDICALLY_FILE_APPROVED || 
        c.status === ClaimStatus.ENHANCEMENT_APPROVED ||
        c.status.toLowerCase().includes('assessment approved') ||
        c.status.toLowerCase().includes('assessment completed')
      ).length,
      discharge: isICAPrePost ? 0 : baseClaims.filter(c => {
        const shouldBeInDispatch = c.status === ClaimStatus.DISCHARGE_APPROVED && isPast24Hours(c.updatedAt);
        // Exclude statuses that moved to Assessment Pending or are Enhancement Approved
        if ([ClaimStatus.DISCHARGE_INITIATED, ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED, ClaimStatus.ENHANCEMENT, ClaimStatus.ENHANCEMENT_APPROVED].includes(c.status as any)) {
          return false;
        }
        return (c.status === ClaimStatus.DISCHARGE_APPROVED && !shouldBeInDispatch) || 
               c.status.toLowerCase().includes('discharge') || 
               c.status.toLowerCase().includes('enhancement');
      }).length,
      dispatch: isICAPrePost ? 0 : baseClaims.filter(c => {
        const shouldBeInDispatch = c.status === ClaimStatus.DISCHARGE_APPROVED && isPast24Hours(c.updatedAt);
        return c.status === ClaimStatus.FILE_DISPATCHED || 
               c.status === ClaimStatus.FILE_PICKED_UP_DONE ||
               shouldBeInDispatch;
      }).length,
      claim: isICAPrePost ? 0 : baseClaims.filter(c => 
        [
          ClaimStatus.CLAIM_UNDER_PROCESS,
          ClaimStatus.CLAIM_UNDER_QUERY,
          ClaimStatus.CLAIM_QUERY_RESOLVED,
          ClaimStatus.CLAIM_APPROVED,
          ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE
        ].includes(c.status as any)
      ).length,
      settled_legacy: isICAPrePost ? 0 : baseClaims.filter(c => c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.BANK_RECONCILIATION_COMPLETED || c.status === ClaimStatus.ACCOUNT_RECONCILIATION).length,
      rejected: baseClaims.filter(c => c.status === ClaimStatus.ASSESSMENT_REJECTED || c.status === ClaimStatus.DISCHARGE_REJECTED).length,
    };
  }, [claims, product]);

  const filteredClaims = useMemo(() => {
    const isPast24Hours = (dateStr: string | undefined) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      return (now.getTime() - date.getTime()) > (24 * 60 * 60 * 1000);
    };

    const isKYP = (product as string) === 'Know Your Policy' || (product as string) === Product.KYP;

    return claims.filter(c => {
      const matchesProduct = isKYP 
        ? ((c.product as string) === Product.KYP || (c.product as string) === 'KYP' || (c.product as string) === 'Know Your Policy')
        : c.product === product;

      const isMatch = c.claimType === 'Reimbursement' && 
        matchesProduct &&
        (searchQuery === '' || 
         c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
         c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.formData?.p_uhid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.policyNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.formData?.insurer_claim_no?.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!isMatch) return false;

      // Recovery & Recon Bucket Logic
      if (product === 'Recovery & Recon') {
        switch (activeTab) {
          case 'outstanding':
            return [
              ClaimStatus.FILE_DISPATCHED,
              ClaimStatus.CLAIM_UNDER_PROCESS,
              ClaimStatus.CLAIM_QUERY_RESOLVED,
              ClaimStatus.CLAIM_APPROVED,
              ClaimStatus.FILE_DISPATCH_PENDING,
              'Outstanding'
            ].includes(c.status as any) && c.settlementStatus !== 'Full';
          case 'query':
            return c.status === ClaimStatus.CLAIM_UNDER_QUERY;
          case 'complete':
            return c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.settlementStatus === 'Full';
          case 'partial_recoverable':
            return c.status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE;
          case 'partial_non_recoverable':
            return c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE;
          case 'closed':
            return c.status === ClaimStatus.DISCHARGE_REJECTED || c.status === ClaimStatus.SETTLEMENT_FAILED;
          case 'bank_recon':
            return c.status === ClaimStatus.BANK_RECONCILIATION_COMPLETED || c.status === ClaimStatus.ACCOUNT_RECONCILIATION;
          case 'all':
          default:
            return true;
        }
      }

      // KYP Bucket Logic
      if (product === 'Know Your Policy') {
        switch (activeTab) {
          case 'all': 
            return [
              ClaimStatus.KYP_PENDING, 
              ClaimStatus.KYP_PENDING_APPROVAL,
              ClaimStatus.KYP_QUERY_REPLIED,
              ClaimStatus.KYP_QUERY_PENDING,
              ClaimStatus.KYP_ACCEPTED,
              ClaimStatus.PENDING_MEDICAL_REVIEW,
              ClaimStatus.NEW_REGISTRATION,
              'Pending',
              'Pending Approval',
              'Query Replied',
              'Query Pending',
              'KYP Pending Approval',
              'KYP Accepted',
              'Pending Medical Review',
              'New Registration'
            ].includes(c.status as any);
          case 'assessment': 
            return [
              ClaimStatus.KYP_ACCEPTED,
              ClaimStatus.KYP_COMPLETED,
              'Approved',
              'KYP Accepted',
              'KYP Completed'
            ].includes(c.status as any);
          case 'discharge': 
            return c.status === ClaimStatus.KYP_QUERY_PENDING || (c.status as string) === 'Query Pending';
          case 'dispatch': 
            return c.status === ClaimStatus.KYP_REJECTED || (c.status as string) === 'Rejected' || (c.status as string) === 'KYP Rejected';
          default:
            return true;
        }
      }

      // Default Bucket Logic
      const status = c.status;
      const lastUpdate = c.updatedAt;
      const shouldBeInDispatch = status === ClaimStatus.DISCHARGE_APPROVED && isPast24Hours(lastUpdate);

      const isICAPrePost = product === 'ICA' || product === 'Pre & Post';

      switch (activeTab) {
        case 'new_registration':
          return status === ClaimStatus.NEW_REGISTRATION;
        case 'under_review':
          return [
            ClaimStatus.WELCOME_CALL_DONE, 
            ClaimStatus.FILE_PICKUP_SCHEDULED, 
            ClaimStatus.FILE_PICKUP_IN_PROGRESS
          ].includes(status as any);
        case 'file_dispatch_pending':
          if (isICAPrePost) {
            return [
              ClaimStatus.FILE_PICKED_UP_DONE,
              ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
              ClaimStatus.MEDICALLY_FILE_APPROVED,
              ClaimStatus.HOSPITAL_QUERY_PENDING,
              ClaimStatus.QUERY_DOCUMENTS_RECEIVED,
              ClaimStatus.INTERNAL_QUERY_PENDING
            ].includes(status as any);
          }
          return [
            ClaimStatus.FILE_PICKUP_SCHEDULED, 
            ClaimStatus.FILE_PICKUP_IN_PROGRESS, 
            ClaimStatus.FILE_PICKED_UP_DONE,
            ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
            ClaimStatus.HOSPITAL_QUERY_PENDING,
            ClaimStatus.INTERNAL_QUERY_PENDING
          ].includes(status as any);
        case 'pending_settlement':
          if (isICAPrePost) {
            return [
              ClaimStatus.FILE_DISPATCHED,
              ClaimStatus.CLAIM_UNDER_QUERY,
              ClaimStatus.CLAIM_QUERY_RESOLVED,
              ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
              ClaimStatus.CLAIM_APPROVED
            ].includes(status as any);
          }
          return false;
        case 'claim_query':
          return status === ClaimStatus.CLAIM_UNDER_QUERY;
        case 'assessment_pending':
          return [
            ClaimStatus.NEW_REGISTRATION, 
            ClaimStatus.WELCOME_CALL_DONE, 
            ClaimStatus.FILE_PICKUP_SCHEDULED, 
            ClaimStatus.FILE_PICKUP_IN_PROGRESS, 
            ClaimStatus.FILE_PICKED_UP_DONE,
            ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
            ClaimStatus.HOSPITAL_QUERY_PENDING,
            ClaimStatus.INTERNAL_QUERY_PENDING,
            ClaimStatus.QUERY_DOCUMENTS_RECEIVED,
            ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
            ClaimStatus.CLAIM_PENDING_WITH_INSURER_MEDICAL,
            ClaimStatus.QUERY_REPLY_DONE,
            ClaimStatus.INITIAL_QUERY_PENDING,
            ClaimStatus.ASSESSMENT_INITIATED,
            ClaimStatus.ENHANCEMENT,
            ClaimStatus.DISCHARGE_INITIATED,
            ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
            ClaimStatus.PENDING_MEDICAL_TEAM,
            ClaimStatus.PENDING_MEDICAL_REVIEW
          ].includes(status as any) || status.toLowerCase().includes('assessment started');
        case 'query_pending':
          return status === ClaimStatus.ASSESSMENT_QUERY_PENDING || 
                 status === ClaimStatus.DISCHARGE_QUERY_RAISED;
        case 'assessment_approval':
          return status === ClaimStatus.MEDICALLY_FILE_APPROVED || 
                 status === ClaimStatus.ENHANCEMENT_APPROVED ||
                 status.toLowerCase().includes('assessment approved') ||
                 status.toLowerCase().includes('assessment completed');
        case 'discharge':
          if ([ClaimStatus.DISCHARGE_INITIATED, ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED, ClaimStatus.ENHANCEMENT, ClaimStatus.ENHANCEMENT_APPROVED].includes(status as any)) {
            return false;
          }
          return (status === ClaimStatus.DISCHARGE_APPROVED && !shouldBeInDispatch) || 
                 status.toLowerCase().includes('discharge') || 
                 status.toLowerCase().includes('enhancement');
        case 'file_dispatched':
        case 'dispatch':
          if (isICAPrePost) {
            return status === ClaimStatus.FILE_DISPATCHED;
          }
          return status === ClaimStatus.FILE_DISPATCHED || 
                 status === ClaimStatus.FILE_PICKED_UP_DONE ||
                 shouldBeInDispatch;
        case 'claim':
          if (isICAPrePost) {
            return status === ClaimStatus.CLAIM_UNDER_QUERY;
          }
          return [
            ClaimStatus.CLAIM_UNDER_PROCESS,
            ClaimStatus.CLAIM_UNDER_QUERY,
            ClaimStatus.CLAIM_QUERY_RESOLVED,
            ClaimStatus.CLAIM_APPROVED,
            ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE
          ].includes(status as any);
        case 'settled':
          if (isICAPrePost) {
            return [
              ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
              ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
              ClaimStatus.COMPLETE_SETTLEMENT
            ].includes(status as any);
          }
          return status === ClaimStatus.COMPLETE_SETTLEMENT || 
                 status === ClaimStatus.BANK_RECONCILIATION_COMPLETED ||
                 status === ClaimStatus.ACCOUNT_RECONCILIATION;
        case 'rejected':
          return status === ClaimStatus.ASSESSMENT_REJECTED || status === ClaimStatus.DISCHARGE_REJECTED;
        case 'all':
          return status !== ClaimStatus.COMPLETE_SETTLEMENT && status !== ClaimStatus.BANK_RECONCILIATION_COMPLETED;
        default:
          return true;
      }
    });
  }, [claims, product, searchQuery, activeTab]);

  const handleDownloadFormat = () => {
    const format = [
      {
        'Month (Formula Discharge Date – “MMM-YY”)': 'May-24',
        'Final Bill Vs Final AL - (Formula =Final Approval Amt/Final Bill) In % ratio': '92.31%',
        'Final AL Vs Settlement - (Formula =Including TDS/Final Approval Amt) In % ratio': '95.00%',
        'Claim Settled (In Days) - ': '15',
        'Settlement Pending TAT (In Days) – (Formula = Today()-Discharge Date': '10',
        'Ageing – (Formula =IF(SETTLEMENT PENDING TAT>90,"Above 90 Days",IF(SETTLEMENT PENDING TAT>60,"60 to 90 Days",IF(SETTLEMENT PENDING TAT>45,"45 to 60 days",IF(SETTLEMENT PENDING TAT>30,"30 to 45 Days",IF(SETTLEMENT PENDING TAT>15,"15 to 30 Days",IF(SETTLEMENT PENDING TAT>0,"0 to 15 Days","NA"))))))': '0 to 15 Days',
        'Case ID (Ref. ID)': 'REF123',
        'IPD number (IPD and UHID)': 'IPD789 UHID456',
        'Hospital Name': 'Sample Hospital',
        'Patient Name': 'John Doe',
        'TPA Name': 'Medi Assist Insurance TPA Private Limited',
        'Insurer Name': 'Star Health Insurance Co.Ltd.',
        'Claim No.': 'G-88123',
        'Date of Admission': '2024-05-01',
        'Date of Discharge': '2024-05-05',
        'Total Bill Amt': 65000,
        'Final Approval Amt': 60000,
        'File Dispatch Date': '2024-05-07',
        'File Dispatch tracking Number': 'AWB123456789',
        'File Courier Company Name': 'BlueDart',
        'Claim Status': 'Settled',
        'UTR Date': '2024-05-20',
        'UTR NO': 'UTR999000111',
        'Net Settled (Bank Credit)': 55000,
        'Total Settled Amount': 57000,
        'TDS Deducted (Rs.)': 2000,
        'Partial Diff': 3000,
        'Outstanding (Formula = Total Settled Amt-Final Approval Amt)': -3000,
        'Partial Payment Reason': 'Co-pay deduction',
        'Bank Reconciliation': 'Completed'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(format);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format");
    XLSX.writeFile(wb, "Recovery_Recon_Upload_Format.xlsx");
    toast.success("Format downloaded. Please fill and upload.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (onSave) {
          for (const row of data) {
            const uniqueSuffix = `-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newClaim: Claim = {
              id: (row['Claim ID'] || `CLM-${Math.floor(Math.random() * 100000)}`) + uniqueSuffix,
              caseReferenceId: `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              patientId: `P-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              patientName: row['Patient Name'] || 'Unknown',
              insuranceProvider: row['Insurance Company'] || 'Direct',
              policyNumber: 'N/A',
              estimatedCost: parseFloat(row['Final Bill']) || 0,
              outstandingAmount: parseFloat(row['Final Approval amt']) || 0,
              diagnosis: 'Bulk Uploaded Recovery',
              admissionDate: row['DOA'] || new Date().toISOString(),
              dischargeDate: row['DOD'],
              product: Product.RECOVERY_RECONCILIATION,
              claimType: 'Reimbursement',
              status: ClaimStatus.FILE_DISPATCHED,
              settlementStatus: 'Pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              hospitalId: hospitalProfile.hospitalId || hospitalProfile.id,
              formData: {
                p_name: row['Patient Name'],
                insurance_company: row['Insurance Company'],
                tpa_provider: row['TPA Name'],
                fin_app_amt: parseFloat(row['Final Approval amt']) || 0,
                hospitalId: hospitalProfile.hospitalId || hospitalProfile.id,
                doa: row['DOA'],
                dod: row['DOD']
              },
              history: [{
                id: `H-${Date.now()}`,
                status: ClaimStatus.FILE_DISPATCHED,
                date: new Date().toISOString(),
                type: 'status_change',
                comment: 'Case registered via bulk excel upload'
              }]
            };
            await onSave(newClaim);
          }
          toast.success(`Success! ${data.length} cases uploaded to Outstanding.`);
        } else {
          toast.error("onSave handler not provided.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse Excel file.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Group by stage for the funnel/overview
  const stats = useMemo(() => {
    const total = claims.filter(c => c.claimType === 'Reimbursement' && c.product === product).length;
    const pending = counts.all;
    const settled = counts.settled;
    const rejected = counts.rejected || 0;
    
    return { total, pending, settled, rejected };
  }, [claims, product, counts]);

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center">
             <Zap className="mr-3 text-blue-600" size={28} />
             {product} Dashboard
          </h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
             Reimbursement {product} Management System
          </p>
        </div>
        <div className="flex items-center gap-3">
             <button 
               onClick={() => {
                 setSearchQuery('');
                 toast.success(`${product} dashboard refreshed`);
               }}
               className="flex items-center gap-2 px-4 py-2.5 bg-[#008080] text-white rounded-2xl hover:bg-[#0066CC] transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#008080]/30 active:scale-95"
             >
                <RefreshCw size={14} /> Refresh
             </button>
             <button 
               onClick={() => setShowHeaderByProduct(prev => ({ ...prev, [product]: !showHeader }))}
               className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
             >
                {showHeader ? 'Minimize' : 'Show Stats'}
             </button>
             
             {product === 'Recovery & Recon' && (
             <>
               <button 
                 onClick={handleExportReport}
                 className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white border border-emerald-500 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all text-xs font-black uppercase tracking-widest group"
               >
                 <Download size={18} className="text-emerald-100 group-hover:scale-110 transition-transform" /> Report
               </button>
               <button 
                 onClick={handleDownloadFormat}
                 className="flex items-center gap-2 px-4 py-3 bg-white border border-blue-100 text-blue-700 rounded-2xl hover:bg-blue-50 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
               >
                 <FileSpreadsheet size={16} /> Format
               </button>
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading}
                 className="flex items-center gap-2 px-4 py-3 bg-[#000080]/10 text-[#000080] rounded-2xl border border-[#000080]/20 hover:bg-[#000080]/20 transition-all text-[10px] font-black uppercase tracking-widest"
               >
                 {isUploading ? <Activity size={16} className="animate-spin" /> : <Upload size={16} />} 
                 Upload
               </button>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleFileUpload} 
                 className="hidden" 
                 accept=".xlsx, .xls" 
               />
             </>
           )}

           {(product === 'ICA' || product === 'Pre & Post' || product === 'Partner Processing' || (product as string) === Product.KYP || (product as string) === 'Know Your Policy') && (
             <button 
               onClick={handleExportReport}
               className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white border border-emerald-500 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all text-xs font-black uppercase tracking-widest mr-3 group"
             >
               <Download size={18} className="text-emerald-100 group-hover:scale-110 transition-transform" /> Report
             </button>
           )}
           <button 
             onClick={() => {
               const pathMap: Record<string, string> = {
                 'Partner Processing': 'partner-processing',
                 'ICA': 'ica',
                 'Pre & Post': 'pre-post',
                 'Know Your Policy': 'know-your-policy',
                 'Recovery & Recon': 'recovery-recon'
               };
               const segment = pathMap[product] || 'partner-processing';
               navigate(`/reimbursement/${segment}/new`);
             }}
             className="flex items-center gap-2 px-5 py-3 bg-[#000080] text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all text-xs font-black uppercase tracking-widest"
           >
              <PlusCircle size={18} /> New Case Registration
           </button>
        </div>
      </div>

      <AnimatePresence>
        {showHeader && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={`grid grid-cols-1 ${product === 'Know Your Policy' ? 'md:grid-cols-6 lg:grid-cols-6' : product === 'Partner Processing' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 overflow-hidden`}
          >
             {product === 'Know Your Policy' ? (
               <>
                 <StatCard 
                   label="Total Cases" 
                   value={stats.total.toString()} 
                   icon={Activity} 
                   color="blue"
                 />
                 <StatCard 
                   label="Pending Cases" 
                   value={counts.all} 
                   icon={Clock} 
                   color="amber"
                 />
                 <StatCard 
                   label="Query Pending Cases" 
                   value={counts.discharge} 
                   icon={AlertTriangle} 
                   color="orange"
                 />
                 <StatCard 
                   label="Approved Cases" 
                   value={counts.assessment} 
                   icon={CheckCircle2} 
                   color="emerald"
                 />
                 <StatCard 
                   label="Rejected Cases" 
                   value={counts.dispatch} 
                   icon={XCircle} 
                   color="rose"
                 />
                 <StatCard 
                   label="Completed" 
                   value={counts.settled} 
                   icon={ShieldCheck} 
                   color="indigo"
                 />
               </>
             ) : (
               <>
                 <StatCard 
                   label="Total Cases" 
                   value={stats.total} 
                   icon={FileText} 
                   color="blue"
                 />
                 <StatCard 
                   label="In-Process" 
                   value={stats.pending} 
                   icon={Clock} 
                   color="amber"
                 />
                 <StatCard 
                   label="Settled" 
                   value={stats.settled} 
                   icon={ShieldCheck} 
                   color="emerald"
                 />
                 {product === 'Partner Processing' && (
                   <StatCard 
                     label="Rejected" 
                     value={stats.rejected} 
                     icon={XCircle} 
                     color="rose"
                   />
                 )}
               </>
             )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 min-h-[500px]">
         {product === 'Recovery & Recon' && (
           <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-center gap-3 overflow-x-auto py-4 no-scrollbar -mx-4 px-4 scroll-smooth flex-nowrap">
                 <TabButton label="Outstanding" count={counts.outstanding} active={activeTab === 'outstanding'} onClick={() => setActiveTab('outstanding')} color="amber" icon={Clock} />
                 <TabButton label="Query Pending" count={counts.query} active={activeTab === 'query'} onClick={() => setActiveTab('query')} color="orange" icon={AlertTriangle} />
                 <TabButton label="Settled" count={counts.complete} active={activeTab === 'complete'} onClick={() => setActiveTab('complete')} color="emerald" icon={CheckCircle2} />
                 <TabButton label="All Active" count={counts.all} active={activeTab === 'all'} onClick={() => setActiveTab('all')} color="indigo" icon={Activity} />
                 <TabButton label="Partial (Rec)" count={counts.partial_recoverable} active={activeTab === 'partial_recoverable'} onClick={() => setActiveTab('partial_recoverable')} color="indigo" icon={ArrowRightLeft} />
                 <TabButton label="Partial (Non-Rec)" count={counts.partial_non_recoverable} active={activeTab === 'partial_non_recoverable'} onClick={() => setActiveTab('partial_non_recoverable')} color="rose" icon={XCircle} />
              </div>

              <div className="flex items-center justify-end">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                       type="text" 
                       placeholder="Case ID, Claim No, Patient Name, UHID, Policy No, UTR No..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="pl-12 pr-6 py-3 bg-white border border-slate-300 rounded-full w-full lg:w-72 focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all text-sm font-medium shadow-sm"
                    />
                 </div>
              </div>
           </div>
         )}

         {product !== 'Know Your Policy' && product !== 'Recovery & Recon' && (
           <div className="flex flex-col gap-8 mb-10">
              <div className="flex items-center gap-3 overflow-x-auto py-4 no-scrollbar -mx-4 px-4 scroll-smooth flex-nowrap">
                 {(() => {
                   const isICAPrePost = product === 'ICA' || product === 'Pre & Post';
                   if (isICAPrePost) {
                     return (
                       <>
                          <TabButton label="New Registration" count={counts.new_registration} active={activeTab === 'new_registration'} onClick={() => setActiveTab('new_registration')} color="blue" icon={Activity} />
                          <TabButton label="Under Review" count={counts.under_review} active={activeTab === 'under_review'} onClick={() => setActiveTab('under_review')} color="blue" icon={Activity} />
                          <TabButton label="File Dispatch Pending" count={counts.file_dispatch_pending} active={activeTab === 'file_dispatch_pending'} onClick={() => setActiveTab('file_dispatch_pending')} color="amber" icon={Clock} />
                          <TabButton label="File Dispatched" count={counts.file_dispatched} active={activeTab === 'file_dispatched'} onClick={() => setActiveTab('file_dispatched')} color="slate" icon={History} />
                          <TabButton label="Pending Settlement" count={counts.pending_settlement} active={activeTab === 'pending_settlement'} onClick={() => setActiveTab('pending_settlement')} color="emerald" icon={ShieldCheck} />
                          <TabButton label="Claim Query" count={counts.claim_query} active={activeTab === 'claim_query'} onClick={() => setActiveTab('claim_query')} color="orange" icon={AlertTriangle} />
                          <TabButton label="Settled" count={counts.settled} active={activeTab === 'settled'} onClick={() => setActiveTab('settled')} color="teal" icon={ShieldCheck} />
                          <TabButton label="All Active" count={counts.all} active={activeTab === 'all'} onClick={() => setActiveTab('all')} color="indigo" icon={Activity} />
                        </>
                     );
                   }
                   return (
                     <>
                        <TabButton label="Assessment Pending" count={counts.assessment_pending} active={activeTab === 'assessment_pending'} onClick={() => setActiveTab('assessment_pending')} color="amber" icon={Clock} />
                        <TabButton label="Query Pending" count={counts.query_pending} active={activeTab === 'query_pending'} onClick={() => setActiveTab('query_pending')} color="orange" icon={AlertTriangle} />
                        <TabButton label="Assessment Approval" count={counts.assessment_approval} active={activeTab === 'assessment_approval'} onClick={() => setActiveTab('assessment_approval')} color="emerald" icon={CheckCircle2} />
                        <TabButton label="Discharge" count={counts.discharge} active={activeTab === 'discharge'} onClick={() => setActiveTab('discharge')} color="blue" icon={Activity} />
                        <TabButton label="Dispatch" count={counts.dispatch} active={activeTab === 'dispatch'} onClick={() => setActiveTab('dispatch')} color="slate" icon={History} />
                     </>
                   );
                 })()}
                  {product === 'Partner Processing' && (
                    <>
                      <TabButton label="Claim & Query" count={counts.claim} active={activeTab === 'claim'} onClick={() => setActiveTab('claim')} color="rose" icon={FileSearch} />
                 <TabButton label="Settled" count={counts.settled} active={activeTab === 'settled'} onClick={() => setActiveTab('settled')} color="teal" icon={ShieldCheck} />
                 <TabButton label="Rejected" count={counts.rejected} active={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')} color="red" icon={XCircle} />
                 <TabButton label="All Active" count={counts.all} active={activeTab === 'all'} onClick={() => setActiveTab('all')} color="indigo" icon={Activity} />
                    </>
                  )}
              </div>

              <div className="flex items-center justify-end">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                       type="text" 
                       placeholder="Case ID, Claim No, Patient Name, UHID, Policy No..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="pl-12 pr-6 py-3 bg-white border border-slate-300 rounded-full w-full lg:w-72 focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all text-sm font-medium shadow-sm"
                    />
                 </div>
              </div>
           </div>
         )}

         {product === 'Know Your Policy' && (
           <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-center gap-3 overflow-x-auto py-4 no-scrollbar -mx-4 px-4 scroll-smooth flex-nowrap">
                 <TabButton 
                   label="Pending"
                   count={counts.all}
                   active={activeTab === 'all'}
                   onClick={() => setActiveTab('all')}
                   color="amber"
                   icon={Clock}
                 />
                 <TabButton 
                   label="Approved"
                   count={counts.assessment}
                   active={activeTab === 'assessment'}
                   onClick={() => setActiveTab('assessment')}
                   color="emerald"
                   icon={CheckCircle2}
                 />
                 <TabButton 
                   label="Query Pending"
                   count={counts.discharge}
                   active={activeTab === 'discharge'}
                   onClick={() => setActiveTab('discharge')}
                   color="orange"
                   icon={AlertTriangle}
                 />
                 <TabButton 
                   label="Rejected"
                   count={counts.dispatch}
                   active={activeTab === 'dispatch'}
                   onClick={() => setActiveTab('dispatch')}
                   color="rose"
                   icon={XCircle}
                 />
              </div>

              <div className="flex items-center justify-end">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                       type="text" 
                       placeholder="Case ID, Patient Name, Policy No, UHID..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="pl-12 pr-6 py-3 bg-white border border-slate-300 rounded-full w-full lg:w-96 focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all text-sm font-medium shadow-sm"
                    />
                 </div>
              </div>
           </div>
         )}

         {/* Cases List */}
         <div className="space-y-4">
            {filteredClaims.length === 0 ? (
               <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                     <FileSearch size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No cases found in this section</p>
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-slate-50">
                           {product === 'Recovery & Recon' ? (
                             <>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Case ID</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Patient / Hospital Name</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance Company</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">TPA Name</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Final Bill Amt</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Final Approval Amt</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Settled Amt</th>
                              </>
                            ) : (
                              <>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Case ID</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Patient Details</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Adm Date</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Disch Date</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Claim Amt</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurer</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">TPA</th>
                             {product !== 'Know Your Policy' && <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim No</th>}
                              </>
                            )}
                            <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pending / Approved TAT</th>
                             <th className="pb-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredClaims.map((claim, idx) => {
                            const isApproved = claim.status === ClaimStatus.DISCHARGE_APPROVED || 
                                             claim.status === ClaimStatus.SETTLED ||
                                             claim.status === ClaimStatus.PRE_AUTH_APPROVED;
                            
                            const tatLabel = isApproved ? 'Approved TAT' : 'Pending TAT';
                            const tatValue = isApproved 
                              ? formatTAT(claim.history[0]?.date || claim.createdAt, claim.history.find(h => ([ClaimStatus.DISCHARGE_APPROVED, ClaimStatus.SETTLED] as any[]).includes(h.status))?.date || claim.updatedAt)
                              : formatTAT(claim.createdAt, new Date().toISOString());

                            return (
                           <tr key={`${claim.id}-${idx}`} className="group hover:bg-slate-50/50 transition-colors">
                              {product === 'Recovery & Recon' ? (
                                <>
                                      <td className="py-2 px-3 font-bold text-sm text-slate-600">
                                         {claim.caseReferenceId || (claim.id && claim.id.split('-')[0]) || '---'}
                                      </td>
                                      <td className="py-2 px-3">
                                         <div className="flex flex-col">
                                            <Link 
                                               to={`/process-claim/${claim.id}?source=${encodeURIComponent(product)}`}
                                               className="text-base font-black text-slate-800 tracking-tight hover:text-blue-600 transition-colors uppercase"
                                            >
                                               {claim.patientName}
                                            </Link>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                               {claim.formData?.hospital_name || claim.hospitalId || ''}
                                            </span>
                                         </div>
                                      </td>
                                  <td className="py-2 px-3">
                                     <p className="text-xs font-black text-indigo-500 uppercase tracking-widest leading-none">
                                       {claim.insuranceProvider}
                                     </p>
                                  </td>
                                  <td className="py-2 px-3">
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                                       {!claim.formData?.tpa_provider || claim.formData.tpa_provider === 'Direct' ? 'In-House' : claim.formData.tpa_provider}
                                     </p>
                                  </td>
                                  <td className="py-2 px-3 font-bold text-sm text-slate-600 text-right tabular-nums">
                                    <span className="flex items-center justify-end text-blue-600">
                                      <IndianRupee size={12} className="mr-0.5" />
                                      {(Number(claim.formData?.finalBillAmt) || 0).toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-bold text-sm text-slate-600 text-right tabular-nums">
                                    <span className="flex items-center justify-end text-emerald-600">
                                      <IndianRupee size={12} className="mr-0.5" />
                                      {(Number(claim.formData?.finalApprovalAmt) || 0).toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-bold text-sm text-slate-600 text-right tabular-nums">
                                    <span className="flex items-center justify-end text-indigo-600">
                                      <IndianRupee size={12} className="mr-0.5" />
                                      {(Number(claim.formData?.settledAmount) || claim.paidAmount || 0).toLocaleString()}
                                    </span>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2 px-3 font-bold text-sm text-slate-600 whitespace-nowrap">
                                     {claim.caseReferenceId || (claim.id && claim.id.split('-')[0]) || '---'}
                                  </td>
                                  <td className="py-2 px-3">
                                     <Link 
                                        to={`/process-claim/${claim.id}?source=${encodeURIComponent(product)}`}
                                        className="text-base font-black text-slate-800 tracking-tight hover:text-blue-600 transition-colors block leading-tight uppercase"
                                     >
                                        {claim.patientName}
                                     </Link>
                                  </td>
                                  <td className="py-2 px-3 font-bold text-sm text-slate-500 whitespace-nowrap">
                                     {formatDate(claim.admissionDate)}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-sm text-slate-500 whitespace-nowrap">
                                    {formatDate(claim.dischargeDate || claim.formData?.dis_date)}
                                  </td>
                                  <td className="py-2 px-3 text-right tabular-nums">
                                    <p className="text-sm font-black text-slate-700">₹{Number(claim.estimatedCost || 0).toLocaleString('en-IN')}</p>
                                  </td>
                                  <td className="py-2 px-3">
                                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest leading-none">
                                      {claim.insuranceProvider}
                                    </p>
                                  </td>
                                  <td className="py-2 px-3">
                                    <p className="text-xs font-black text-blue-400 uppercase tracking-widest leading-none">
                                      {!claim.formData?.tpa_provider || claim.formData.tpa_provider === 'Direct' ? 'In-House' : claim.formData.tpa_provider}
                                    </p>
                                  </td>
                                </>
                              )}
                              {product !== 'Know Your Policy' && product !== 'Recovery & Recon' && (
                                <td className="py-2 px-3">
                                  {claim.formData?.insurer_claim_no ? (
                                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-tight">
                                        {claim.formData.insurer_claim_no}
                                      </span>
                                  ) : (
                                      <span className="text-[10px] font-bold text-slate-300">PENDING</span>
                                  )}
                                </td>
                              )}
                              <td className="py-2 px-3">
                                 <StatusBadge status={claim.status} product={product} />
                              </td>
                              <td className="py-2 px-3">
                                 <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-bold text-slate-600 tabular-nums">{tatValue}</span>
                                 </div>
                              </td>
                              <td className="py-2 px-3">
                                 <div className="flex items-center gap-2 justify-end">
                                    {EMAIL_ICON_STATUSES.includes(claim.status) && (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setSelectedEmailClaim(claim);
                                          setShowEmailModal(true);
                                        }}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                                        title="Send Follow Up Email"
                                      >
                                        <Mail size={18} />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => {
                                         navigate(`/process-claim/${claim.id}?source=${encodeURIComponent(product)}`);
                                      }}
                                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 group cursor-pointer"
                                    >
                                       Process
                                       <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
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
      </div>
    </div>

    {/* Report Date Modal */}
    <AnimatePresence>
      {showReportDateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReportDateModal(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Calendar className="text-emerald-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Select Report Period</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReportDateModal(false)}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From Date</label>
                  <input 
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To Date</label>
                  <input 
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setShowReportDateModal(false)}
                  className="flex-1 py-4 px-6 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExportReport}
                  className="flex-2 py-4 px-6 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 group"
                >
                  <Download size={18} className="group-hover:scale-110 transition-transform" />
                  Generate Report
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Email Follow-up Modal */}
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
    </>
  );
};

const TabButton = ({ label, count, active, onClick, color, icon: Icon }: any) => {
  const colorMaps: Record<string, string> = {
    indigo: "border-indigo-100 text-indigo-700 hover:bg-indigo-50 bg-white shadow-indigo-100/30",
    emerald: "border-emerald-100 text-emerald-700 hover:bg-emerald-50 bg-white shadow-emerald-100/30",
    amber: "border-amber-100 text-amber-700 hover:bg-amber-50 bg-white shadow-amber-100/30",
    orange: "border-orange-100 text-orange-700 hover:bg-orange-50 bg-white shadow-orange-100/30",
    rose: "border-rose-100 text-rose-700 hover:bg-rose-50 bg-white shadow-rose-100/30",
    teal: "border-teal-100 text-teal-700 hover:bg-teal-50 bg-white shadow-teal-100/30",
    slate: "border-slate-100 text-slate-700 hover:bg-slate-50 bg-white shadow-slate-100/30",
    blue: "border-blue-100 text-blue-700 hover:bg-blue-50 bg-white shadow-blue-100/30"
  };

  const activeMaps: Record<string, string> = {
    indigo: "bg-[#000080] !text-white border-[#000080] shadow-blue-200",
    emerald: "bg-[#059669] !text-white border-[#059669] shadow-emerald-200",
    amber: "bg-[#D97706] !text-white border-[#D97706] shadow-amber-200",
    orange: "bg-[#EA580C] !text-white border-[#EA580C] shadow-orange-200",
    rose: "bg-[#DC2626] !text-white border-[#DC2626] shadow-rose-200",
    teal: "bg-[#0D9488] !text-white border-[#0D9488] shadow-teal-200",
    slate: "bg-[#334155] !text-white border-[#334155] shadow-slate-200",
    blue: "bg-[#2563EB] !text-white border-[#2563EB] shadow-blue-200"
  };

  const badgeMaps: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    rose: "bg-rose-50 text-rose-700",
    teal: "bg-teal-50 text-teal-700",
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700"
  };

  return (
    <button 
      onClick={onClick}
      className={`h-[50px] w-auto rounded-[14px] border-2 flex items-center justify-between px-3 transition-all active:scale-95 shadow-md flex-shrink-0 group ${active ? activeMaps[color] + ' shadow-xl -translate-y-1 scale-[1.02]' : colorMaps[color]}`}
    >
      <div className="flex items-center gap-2 flex-1 mr-2">
        {Icon && <Icon size={16} className={active ? 'text-white/90' : 'text-current opacity-60 group-hover:opacity-100 transition-opacity'} />}
        <span className="text-[11px] font-black uppercase tracking-tight whitespace-nowrap leading-none">{label}</span>
      </div>
      <span className={`px-2 py-1 rounded-lg text-[10px] font-black min-w-[28px] text-center transition-all ${active ? 'bg-white/20 text-white' : badgeMaps[color] + ' group-hover:scale-105'}`}>
        {count}
      </span>
    </button>
  );
};


const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colors: any = {
    blue: "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-100 ring-4 ring-blue-50 shadow-blue-100",
    amber: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-100 ring-4 ring-amber-50 shadow-amber-100",
    emerald: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-100 ring-4 ring-emerald-50 shadow-emerald-100",
    orange: "from-orange-500/10 to-amber-500/10 text-orange-600 border-orange-100 ring-4 ring-orange-50 shadow-orange-100",
    rose: "from-rose-500/10 to-pink-500/10 text-rose-600 border-rose-100 ring-4 ring-rose-50 shadow-rose-100"
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} p-6 rounded-[2rem] border relative overflow-hidden shadow-sm`}>
       <div className="flex items-center justify-between relative z-10">
          <div>
             <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">{label}</p>
             <h3 className="text-3xl font-black tracking-tight">{value}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center shadow-sm">
             <Icon size={24} />
          </div>
       </div>
    </div>
  );
};

const StatusBadge = ({ status, product }: { status: ClaimStatus, product?: string }) => {
  const isAssessment = status.toLowerCase().includes('assessment') || status === ClaimStatus.KYP_ACCEPTED || status === ClaimStatus.KYP_COMPLETED;
  const isRejection = status.toLowerCase().includes('rejected');
  const isApproval = status.toLowerCase().includes('approved') || status === ClaimStatus.KYP_ACCEPTED || status === ClaimStatus.KYP_COMPLETED;
  const isPending = status.toLowerCase().includes('pending') || status.toLowerCase().includes('initiated');
  const isQuery = status.toLowerCase().includes('query');

  const getLabel = () => {
    const s = status as any;
    if (product === 'Know Your Policy' || product === Product.KYP) {
      if (s === ClaimStatus.KYP_ACCEPTED || s === ClaimStatus.KYP_COMPLETED || s === ClaimStatus.CLAIM_APPROVED || s === ClaimStatus.MEDICAL_APPROVED || s === 'Approved' || s === 'KYP Accepted' || s === 'KYP Completed') return 'Approved';
      if (s === ClaimStatus.KYP_QUERY_PENDING || s === ClaimStatus.HOSPITAL_QUERY_PENDING || s === ClaimStatus.CLAIM_UNDER_QUERY || s === ClaimStatus.MEDICAL_QUERY_RAISED || s === 'Query Pending' || s === 'KYP Query Pending') return 'Query Pending';
      if (s === ClaimStatus.KYP_QUERY_REPLIED || s === ClaimStatus.QUERY_REPLY_DONE || s === ClaimStatus.DISCHARGE_QUERY_REPLY || s === 'Query Replied' || s === 'KYP Query Replied') return 'Query Replied';
      if (s === ClaimStatus.KYP_REJECTED || s === ClaimStatus.MEDICAL_REJECTED || s === ClaimStatus.SETTLEMENT_FAILED || s === 'Rejected' || s === 'KYP Rejected') return 'Rejected';
      if (s === ClaimStatus.KYP_PENDING_APPROVAL || s === 'KYP Pending Approval') return 'Pending Approval';
      if (s === ClaimStatus.KYP_PENDING || s === 'Pending' || s === 'Pending (KYP)' || s === ClaimStatus.PENDING_MEDICAL_REVIEW || s === 'Pending Medical Review' || s === ClaimStatus.NEW_REGISTRATION || s === 'New Registration') return 'Pending';
      return s || 'Pending';
    }
    return status;
  };

  const getColors = () => {
    const label = getLabel();
    if (label === 'Rejected' || label === ClaimStatus.DISCHARGE_REJECTED) return "bg-rose-50 text-rose-600 border-rose-100";
    if (label === 'Approved' || label === ClaimStatus.COMPLETE_SETTLEMENT) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (label === 'Query Pending' || label === ClaimStatus.CLAIM_UNDER_QUERY) return "bg-orange-50 text-orange-600 border-orange-100";
    if (label === 'Query Replied' || label === ClaimStatus.CLAIM_QUERY_RESOLVED) return "bg-blue-50 text-blue-600 border-blue-100";
    if (label === 'Pending' || label === 'Pending Approval' || label === 'Outstanding') return "bg-amber-50 text-amber-600 border-amber-100";
    
    if (label === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE) return "bg-indigo-50 text-indigo-600 border-indigo-100";
    if (label === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE) return "bg-rose-50 text-rose-600 border-rose-100/50";
    if (label === ClaimStatus.BANK_RECONCILIATION_COMPLETED || label === ClaimStatus.ACCOUNT_RECONCILIATION) return "bg-teal-50 text-teal-600 border-teal-100";
    
    // Fallback for non-KYP or complex statuses
    if (status.toLowerCase().includes('assessment')) return "bg-indigo-50 text-indigo-600 border-indigo-100";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${getColors()}`}>
       {getLabel()}
    </span>
  );
};

export default ReimbursementDashboard;
