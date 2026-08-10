
import React, { useState } from 'react';
import { formatDate } from '../utils';
import { X, Calendar, Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Claim, ClaimStatus } from '../types';
import { toast } from 'sonner';

interface DownloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  claims: Claim[];
  hospitals: any[];
}

const DownloadReportModal: React.FC<DownloadReportModalProps> = ({ isOpen, onClose, claims, hospitals }) => {
  // 1. Get current logged in user and roles from local storage
  const userFromStorage = (() => {
    try {
      const email = localStorage.getItem('claimnx_manual_auth');
      if (email) {
        if (email === 'raulavhad@gmail.com') {
          return { role: 'Super Admin', username: email };
        }
        const savedUsers = localStorage.getItem('claimnx_hospital_users');
        if (savedUsers) {
          const users = JSON.parse(savedUsers);
          return users.find((u: any) => u.username === email || u.emailId === email);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  })();

  const activeUserRole = userFromStorage?.role || 'Hospital';

  const rolesFromStorage = (() => {
    try {
      const savedRoles = localStorage.getItem('claimnx_roles');
      if (savedRoles) {
        return JSON.parse(savedRoles);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  })();

  const isReportAllowed = (reportName: string) => {
    if (!activeUserRole) return true;
    const roleUpper = activeUserRole.toUpperCase();
    if (roleUpper === 'SUPER ADMIN' || roleUpper === 'PRIMARY ADMIN' || roleUpper === 'ADMIN') {
      return true; // Admin has full access
    }
    
    // Find the role definition
    const roleDef = rolesFromStorage.find((r: any) => r.name.toUpperCase() === roleUpper || r.id === activeUserRole);
    if (!roleDef) {
      // Default roles have default report access
      if (activeUserRole.toLowerCase() === 'hospital') {
        return ['Business', 'Admission', 'Discharge'].includes(reportName);
      }
      return true;
    }
    
    const allowed = roleDef.allowedReports || [];
    return allowed.some((r: string) => r.toLowerCase() === reportName.toLowerCase());
  };

  const reportTypes = ['Business', 'Admission', 'Discharge', 'Outstanding', 'TAT', 'File Dispatch Pending'].filter(type => isReportAllowed(type));

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReport, setSelectedReport] = useState(() => reportTypes[0] || 'Business');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const formatDateExport = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getTimeDiffStr = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return '';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs < 0) return '';
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getCappedTAT = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return '00:00';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs < 0) return '00:00';
    
    let totalMinutes = Math.floor(diffMs / 60000);
    // Cap at 24 hours (1440 minutes)
    if (totalMinutes > 1440) totalMinutes = 1440;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getDiffDays = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return '';
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
  };

  const getHistoryEvent = (history: any[], status: string) => {
    return [...history].reverse().find(h => h.status === status);
  };

  const getAgeingBucket = (days: number) => {
    if (days > 90) return "Above 90 Days";
    if (days > 60) return "60 to 90 Days";
    if (days > 45) return "45 to 60 days";
    if (days > 30) return "30 to 45 Days";
    if (days > 15) return "15 to 30 Days";
    if (days >= 0) return "0 to 15 Days";
    return "NA";
  };

  const handleDownload = () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsDownloading(true);

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredClaims = claims.filter(c => {
      const claimDate = new Date(c.createdAt);
      return claimDate >= start && claimDate <= end;
    });

    let headers: string[] = [];
    let rows: any[][] = [];

    if (selectedReport === 'Admission') {
      headers = [
        "Month ( Formula as per the admission date)", "Case ID", "IPD number,", "Hospital Name", "Patient Name", "TPA Name", 
        "Insurer Name", "UHID/TPA Card Number", "Policy Number", "Claim No.", "Corporate Name", 
        "Date of Admission", "Date of Discharge", "Treating Doctor", "Diagnosis", "Claim Status"
      ];
      rows = filteredClaims.map((c) => {
        const fd = c.formData || {};
        const admDate = c.admissionDate ? new Date(c.admissionDate) : null;
        const monthVal = admDate ? admDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-') : '';
        return [
          monthVal,
          c.caseReferenceId,
          fd.p_uhid || '',
          fd.hosp_name || hospitals.find(h => h.id === fd.hospitalId)?.name || '',
          c.patientName,
          fd.tpa_provider || '',
          c.insuranceProvider,
          fd.p_card_id || '',
          c.policyNumber,
          fd.insurer_claim_no || '',
          fd.p_employee_id || '',
          formatDateExport(c.admissionDate),
          formatDateExport(fd.dis_date || fd.adm_exp_discharge),
          fd.dr_name || '',
          c.diagnosis,
          c.status
        ];
      });
    } else if (selectedReport === 'Discharge') {
      headers = [
        "Month (Formula as per Discharge date)", "Final Bill Vs Final AL %", "Case ID", "IPD number,", "Hospital Name", 
        "Patient Name", "TPA Name", "Insurer Name", "UHID/TPA Card Number", "Policy Number", 
        "Claim No.", "Corporate Name", "Date of Admission", "Date of Discharge", "Treating Doctor", 
        "Diagnosis", "Package Expenses", "Room Rent Expenses", "Professional Expenses", 
        "Pharmacy Expenses", "Other Investigation Expenses", "Diagnostics Other Amt", 
        "Total Bill Amt", "Final Bill Date", "Final Approval Amt", "MOU Discount", "Co-Payment", 
        "Non-Medical Expenses", "Proportionate Expenses", "Sub-Limit", "Tariff Deductions", 
        "Other Deductions", "Total Amt", "Paid by Patient Amt", "Final Approved Deduction Reason", 
        "File Dispatch Date", "File Dispatch tracking Number", "File Courier Company Name", 
        "Claim Status", "Pre Auth Approved TAT (HH:MM)", "Final AL TAT (HH:MM)", 
        "Pre-Auth Query Raised", "Final AL Query Raised"
      ];
      rows = filteredClaims.map((c) => {
        const fd = c.formData || {};
        const history = c.history || [];
        const disDateStr = fd.dis_date || fd.adm_exp_discharge;
        const disDate = disDateStr ? new Date(disDateStr) : null;
        const monthVal = disDate ? disDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-') : '';
        
        const finalBill = Number(fd.dis_total_bill || 0);
        const finalApp = Number(fd.fin_app_amt || 0);
        const billVsAl = (finalBill > 0 && finalApp > 0) ? ((finalApp / finalBill) * 100).toFixed(2) + '%' : '';

        const preAuthInit = getHistoryEvent(history, ClaimStatus.PRE_AUTH_INITIATED);
        const preAuthApp = getHistoryEvent(history, ClaimStatus.PRE_AUTH_APPROVED);
        const preAuthTAT = getCappedTAT(preAuthInit?.date, preAuthApp?.date);

        const disInit = getHistoryEvent(history, ClaimStatus.DISCHARGE_INITIATED);
        const disApp = getHistoryEvent(history, ClaimStatus.DISCHARGE_APPROVED) || getHistoryEvent(history, ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED);
        const finalAlTAT = getCappedTAT(disInit?.date, disApp?.date);

        const fileDispatch = getHistoryEvent(history, ClaimStatus.FILE_DISPATCHED);
        const preAuthQueries = history.filter(h => h.status === ClaimStatus.INITIAL_QUERY_PENDING).length;
        const finalQueries = history.filter(h => h.status === ClaimStatus.DISCHARGE_QUERY_RAISED).length;

        return [
          monthVal,
          billVsAl,
          c.caseReferenceId,
          fd.p_uhid || '',
          fd.hosp_name || hospitals.find(h => h.id === fd.hospitalId)?.name || '',
          c.patientName,
          fd.tpa_provider || '',
          c.insuranceProvider,
          fd.p_card_id || '',
          c.policyNumber,
          fd.insurer_claim_no || '',
          fd.p_employee_id || '',
          formatDateExport(c.admissionDate),
          formatDateExport(disDateStr),
          fd.dr_name || '',
          c.diagnosis,
          fd.dis_pkg_exp || '',
          fd.dis_room_rent || '',
          fd.dis_prof_exp || '',
          fd.dis_pharm_exp || '',
          fd.dis_inv_exp || '',
          fd.dis_diag_other || '',
          finalBill || '',
          formatDateExport(disDateStr),
          finalApp || '',
          fd.fin_mou_disc || '',
          fd.fin_copay || '',
          fd.fin_non_med || '',
          fd.fin_prop_exp || '',
          fd.fin_sub_limit || '',
          fd.fin_tariff_ded || '',
          fd.fin_other_ded || '',
          fd.fin_total_amt || '',
          fd.fin_patient_paid || '',
          fd.deduction_comment || '',
          fileDispatch ? formatDateExport(fileDispatch.date) : '',
          fd.tracking_no || '',
          fd.courier_name || '',
          c.status,
          preAuthTAT,
          finalAlTAT,
          preAuthQueries,
          finalQueries
        ];
      });
    } else if (selectedReport === 'Outstanding') {
      headers = [
        "Month (As per discharge date)", "Settlement Pending TAT (In Days)", "Ageing", "Case ID", "IPD number,", 
        "Hospital Name", "Patient Name", "TPA Name", "Insurer Name", "UHID/TPA Card Number", 
        "Policy Number", "Claim No.", "Corporate Name", "Date of Admission", "Date of Discharge", 
        "Treating Doctor", "Diagnosis", "Total Bill Amt", "Final Approval Amt", "File Dispatch Date", 
        "File Dispatch tracking Number", "File Courier Company Name", "Claim Status", "Outstanding"
      ];
      rows = filteredClaims.map((c) => {
        const fd = c.formData || {};
        const history = c.history || [];
        const today = new Date();
        const disDateStr = fd.dis_date || fd.adm_exp_discharge;
        const disDate = disDateStr ? new Date(disDateStr) : null;
        const monthVal = disDate ? disDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-') : '';
        
        const finalBill = Number(fd.dis_total_bill || 0);
        const finalApp = Number(fd.fin_app_amt || 0);
        const settledInclTds = Number(fd.set_incl_tds || 0);
        const outstanding = (finalApp > 0 || settledInclTds > 0) ? (finalApp - settledInclTds) : 0;

        let pendingDays = '';
        let ageing = 'NA';
        if (disDate && c.status !== ClaimStatus.COMPLETE_SETTLEMENT) {
          const diffTime = today.getTime() - disDate.getTime();
          const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          pendingDays = days.toString();
          ageing = ageing = getAgeingBucket(days);
        }

        const fileDispatch = getHistoryEvent(history, ClaimStatus.FILE_DISPATCHED);

        return [
          monthVal,
          pendingDays,
          ageing,
          c.caseReferenceId,
          fd.p_uhid || '',
          fd.hosp_name || hospitals.find(h => h.id === fd.hospitalId)?.name || '',
          c.patientName,
          fd.tpa_provider || '',
          c.insuranceProvider,
          fd.p_card_id || '',
          c.policyNumber,
          fd.insurer_claim_no || '',
          fd.p_employee_id || '',
          formatDateExport(c.admissionDate),
          formatDateExport(disDateStr),
          fd.dr_name || '',
          c.diagnosis,
          finalBill || '',
          finalApp || '',
          fileDispatch ? formatDateExport(fileDispatch.date) : '',
          fd.tracking_no || '',
          fd.courier_name || '',
          c.status,
          outstanding
        ];
      });
    } else if (selectedReport === 'TAT') {
      headers = [
        "Month (As per discharge date)", "Case ID", "IPD number", "Hospital Name", "Patient Name", "TPA Name", 
        "Insurer Name", "Pre Auth initiated Date", "Pre Auth initiated Time", "Pre auth Approved Date", 
        "Pre auth Approved Time", "Pre auth Approved TAT (Formula =pre auth approved time - pre auth initiated time. If it exceeds 24 hrs then final TAT would be 24 Hrs. do not exceed 24 hrs.", "Discharge Initiated Date", 
        "Discharge Initiated Time", "Discharge Approved Date", "Discharge Approved Time", 
        "Discharge Approved TAT. (TAT Formula would be  =Discharged Approved time – Discharged Initiated time. If it exceeds 24 hrs then final TAT would be 24 Hrs. do not exceed 24 hrs.", "File Dispatched TAT. ( TAT Formula would be =File Dispatched Date – Discharge Date), TAT should in days.", "Settlement TAT. (TAT Formula would be =UTR Date - File Dispatched Date), TAT should in days."
      ];
      rows = filteredClaims.map((c) => {
        const fd = c.formData || {};
        const history = c.history || [];
        const disDateStr = fd.dis_date || fd.adm_exp_discharge;
        const disDate = disDateStr ? new Date(disDateStr) : null;
        const monthVal = disDate ? disDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-') : '';

        const preAuthInit = getHistoryEvent(history, ClaimStatus.PRE_AUTH_INITIATED);
        const preAuthApp = getHistoryEvent(history, ClaimStatus.PRE_AUTH_APPROVED);
        const disInit = getHistoryEvent(history, ClaimStatus.DISCHARGE_INITIATED);
        const disApp = getHistoryEvent(history, ClaimStatus.DISCHARGE_APPROVED) || getHistoryEvent(history, ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED);
        const fileDispatch = getHistoryEvent(history, ClaimStatus.FILE_DISPATCHED);

        const formatTime = (dateStr: string | undefined) => {
          if (!dateStr) return '';
          const d = new Date(dateStr);
          return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        };

        const preAuthTAT = getCappedTAT(preAuthInit?.date, preAuthApp?.date);
        const disAppTAT = getCappedTAT(disInit?.date, disApp?.date);
        const fileDispatchTAT = getDiffDays(disDateStr, fileDispatch?.date);
        const settlementTAT = getDiffDays(fileDispatch?.date, fd.settlement_date);

        return [
          monthVal,
          c.caseReferenceId,
          fd.p_uhid || '',
          fd.hosp_name || hospitals.find(h => h.id === fd.hospitalId)?.name || '',
          c.patientName,
          fd.tpa_provider || '',
          c.insuranceProvider,
          formatDateExport(preAuthInit?.date),
          formatTime(preAuthInit?.date),
          formatDateExport(preAuthApp?.date),
          formatTime(preAuthApp?.date),
          preAuthTAT,
          formatDateExport(disInit?.date),
          formatTime(disInit?.date),
          formatDateExport(disApp?.date),
          formatTime(disApp?.date),
          disAppTAT,
          fileDispatchTAT,
          settlementTAT
        ];
      });
    } else {
      // Business Report or File Dispatch Pending
      const commonHeaders = [
        "Month", "Final Bill Vs Final AL %", "Final AL Vs Settlement %", "Claim Settled (In Days)",
        "Settlement Pending TAT (In Days)", "Ageing", "Case ID", "IPD number,", "Hospital Name", "Patient Name",
        "TPA Name", "Insurer Name", "UHID/TPA Card Number", "Policy Number", "Claim No.", "Corporate Name",
        "Date of Admission", "Date of Discharge", "Treating Doctor", "Diagnosis", "Package Expenses",
        "Room Rent Expenses", "Professional Expenses", "Pharmacy Expenses", "Other Investigation Expenses",
        "Diagnostics Other Amt", "Total Bill Amt", "Final Bill Date", "Final Approval Amt", "MOU Discount",
        "Co-Payment", "Non-Medical Expenses", "Proportionate Expenses", "Sub-Limit", "Tariff Deductions",
        "Other Deductions", "Total Amt", "Paid by Patient Amt", "Final Approved Deduction Reason",
        "File Dispatch Date", "File Dispatch tracking Number", "File Courier Company Name", "Claim Status",
        "UTR Date", "UTR NO", "Net Settled (Bank Credit)", "Total Settled Amount", "TDS Deducted (Rs.)",
        "Partial Diff", "Outstanding", "Partial Payment Reason", "Rejection remark", "Pre Auth Approved TAT (HH:MM)",
        "Final AL TAT (HH:MM)", "Pre-Auth Query Raised", "Final AL Query Raised"
      ];
      headers = commonHeaders;

      rows = filteredClaims.map((c) => {
        const fd = c.formData || {};
        const history = c.history || [];
        const today = new Date();

        const disDateStr = fd.dis_date || fd.adm_exp_discharge;
        const disDate = disDateStr ? new Date(disDateStr) : null;
        const monthVal = disDate ? disDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-') : '';

        const finalBill = Number(fd.dis_total_bill || 0);
        const finalApp = Number(fd.fin_app_amt || 0);
        const settledInclTds = Number(fd.set_incl_tds || 0);
        const settledNet = Number(fd.set_net_settled || 0);

        const billVsAl = (finalBill > 0 && finalApp > 0) ? ((finalApp / finalBill) * 100).toFixed(2) + '%' : '';
        const alVsSet = (finalApp > 0 && settledInclTds > 0) ? ((settledInclTds / finalApp) * 100).toFixed(2) + '%' : '';

        let settledDays = '';
        let pendingDays = '';
        let ageing = 'NA';

        const isSettled = c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE;
        
        if (isSettled && fd.settlement_date && disDate) {
            const setDate = new Date(fd.settlement_date);
            const diffTime = setDate.getTime() - disDate.getTime();
            settledDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
            ageing = "NA";
        } else if (disDate) {
            const diffTime = today.getTime() - disDate.getTime();
            const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            pendingDays = days.toString();
            ageing = getAgeingBucket(days);
        }

        const preAuthInit = getHistoryEvent(history, ClaimStatus.PRE_AUTH_INITIATED);
        const preAuthApp = getHistoryEvent(history, ClaimStatus.PRE_AUTH_APPROVED);
        const preAuthTAT = getCappedTAT(preAuthInit?.date, preAuthApp?.date);

        const disInit = getHistoryEvent(history, ClaimStatus.DISCHARGE_INITIATED);
        const disApp = getHistoryEvent(history, ClaimStatus.DISCHARGE_APPROVED) || getHistoryEvent(history, ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED);
        const finalAlTAT = getCappedTAT(disInit?.date, disApp?.date);
        
        const fileDispatch = getHistoryEvent(history, ClaimStatus.FILE_DISPATCHED);
        const rejectionStatus = history.find(h => h.status.includes('Rejected'));
        const rejectionRemark = rejectionStatus ? (rejectionStatus.comment || '') : '';

        const preAuthQueries = history.filter(h => h.status === ClaimStatus.INITIAL_QUERY_PENDING).length;
        const finalQueries = history.filter(h => h.status === ClaimStatus.DISCHARGE_QUERY_RAISED).length;
        const outstanding = (finalApp > 0 || settledInclTds > 0) ? (finalApp - settledInclTds) : 0;

        return [
          monthVal,
          billVsAl,
          alVsSet,
          settledDays,
          pendingDays,
          ageing,
          c.caseReferenceId,
          fd.p_uhid || '',
          fd.hosp_name || hospitals.find(h => h.id === fd.hospitalId)?.name || '',
          c.patientName,
          fd.tpa_provider || '',
          c.insuranceProvider,
          fd.p_card_id || '',
          c.policyNumber,
          fd.insurer_claim_no || '',
          fd.p_employee_id || '',
          formatDateExport(c.admissionDate),
          formatDateExport(disDateStr),
          fd.dr_name || '',
          c.diagnosis,
          fd.dis_pkg_exp || '',
          fd.dis_room_rent || '',
          fd.dis_prof_exp || '',
          fd.dis_pharm_exp || '',
          fd.dis_inv_exp || '',
          fd.dis_diag_other || '',
          finalBill || '',
          formatDateExport(disDateStr),
          finalApp || '',
          fd.fin_mou_disc || '',
          fd.fin_copay || '',
          fd.fin_non_med || '',
          fd.fin_prop_exp || '',
          fd.fin_sub_limit || '',
          fd.fin_tariff_ded || '',
          fd.fin_other_ded || '',
          fd.fin_total_amt || '',
          fd.fin_patient_paid || '',
          fd.deduction_comment || '',
          fileDispatch ? formatDateExport(fileDispatch.date) : '',
          fd.tracking_no || '',
          fd.courier_name || '',
          c.status,
          formatDateExport(fd.settlement_date),
          fd.utr_number || '',
          settledNet || '',
          settledInclTds || '',
          fd.set_tds || '',
          fd.set_partial_amt || '',
          outstanding,
          fd.partial_remark_type || '',
          rejectionRemark,
          preAuthTAT,
          finalAlTAT,
          preAuthQueries,
          finalQueries
        ];
      });

      if (selectedReport === 'File Dispatch Pending') {
        rows = rows.filter(row => row[43] === ClaimStatus.DISCHARGE_APPROVED);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${selectedReport}_Report_${startDate}_to_${endDate}.xlsx`);

    setTimeout(() => {
      setIsDownloading(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Download Report</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select date range and report type</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedReport(type)}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                    selectedReport === type 
                      ? 'bg-[#000080] text-white border-[#000080] shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading || !startDate || !endDate}
            className="w-full py-4 bg-[#000080] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isDownloading ? (
              <RefreshCw className="animate-spin mr-2" size={18} />
            ) : (
              <Download className="mr-2" size={18} />
            )}
            {isDownloading ? 'Generating Report...' : 'Download Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadReportModal;
