
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Calendar, FileText, RefreshCw, ChevronRight } from 'lucide-react';
import { Claim, ClaimStatus } from '../types';

interface DownloadReportsProps {
  claims: Claim[];
}

const DownloadReports: React.FC<DownloadReportsProps> = ({ claims }) => {
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

  const rawReportTypes = [
    { id: 'Business', name: 'Business Report', description: 'Full claim details with financial metrics' },
    { id: 'Admission', name: 'Admission Report', description: 'Daily admission flow and pre-auth status' },
    { id: 'Discharge', name: 'Discharge Report', description: 'Discharge summaries and final bill details' },
    { id: 'Outstanding', name: 'Outstanding Report', description: 'Pending settlements and aging analysis' },
    { id: 'TAT', name: 'TAT Report', description: 'Turnaround time analysis for all stages' },
    { id: 'File Dispatch Pending', name: 'File Dispatch Pending', description: 'Cases pending physical file dispatch' }
  ];

  const reportTypes = rawReportTypes.filter(r => isReportAllowed(r.id));

  const [selectedReport, setSelectedReport] = useState<string | null>(() => reportTypes[0]?.id || null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

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
    if (!selectedReport || !startDate || !endDate) return;
    setIsDownloading(true);

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredClaims = claims.filter(c => {
      const date = new Date(c.createdAt);
      return date >= start && date <= end;
    });

    let headers: string[] = [];
    let rows: any[] = [];

    switch (selectedReport) {
      case 'Business':
        headers = [
          "Sr.No", "Month", "Final Bill Vs Final AL %", "Final AL Vs Settlement %", "Claim Settled (In Days)",
          "Settlement Pending TAT (In Days)", "Ageing", "Case ID", "IPD number", "Hospital Name",
          "Patient Name", "TPA Name", "Insurer Name", "UHID/TPA Card Number", "Policy Number",
          "Claim No.", "Corporate Name", "Date of Admission", "Date of Discharge", "Treating Doctor",
          "Diagnosis", "Package Expenses", "Room Rent Expenses", "Professional Expenses", "Pharmacy Expenses",
          "Other Investigation Expenses", "Diagnostics Other Amt", "Total Bill Amt", "Final Bill Date",
          "Final Approval Amt", "MOU Discount", "Co-Payment", "Non-Medical Expenses", "Proportionate Expenses",
          "Sub-Limit", "Tariff Deductions", "Other Ded", "Total Amt", "Paid by Patient Amt",
          "Final Approved Deduction Reason", "File Dispatch Date", "File Dispatch tracking Number",
          "File Courier Company Name", "Claim Status", "UTR Date", "UTR NO", "Net Settled (Bank Credit)",
          "Total Settled Amount", "TDS Deducted (Rs.)", "Partial Diff", "Outstanding", "Partial Payment Reason",
          "Rejection remark", "Pre Auth Approved TAT (HH:MM)", "Final AL TAT (HH:MM)", "Pre-Auth Query Raised",
          "Final AL Query Raised"
        ];
        rows = filteredClaims.map((c, i) => {
          const fd = c.formData || {};
          const history = c.history || [];
          const disDateStr = fd.dis_date || fd.adm_exp_discharge;
          const disDate = disDateStr ? new Date(disDateStr) : null;
          const monthVal = disDate ? disDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-') : '';
          const finalBill = Number(fd.dis_total_bill || 0);
          const finalApp = Number(fd.fin_app_amt || 0);
          
          // Aggregate settlement values from history
          const settlementStatuses = [
            ClaimStatus.COMPLETE_SETTLEMENT,
            ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
            ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE
          ];
          
          const settlementEvents = history.filter(h => settlementStatuses.includes(h.status as ClaimStatus));
          
          let totalNetSettled = 0;
          let totalInclTds = 0;
          let totalTds = 0;
          
          if (settlementEvents.length > 0) {
            settlementEvents.forEach(ev => {
              const sd = ev.stageData || {};
              totalNetSettled += Number(sd.set_net_settled || 0);
              totalInclTds += Number(sd.set_incl_tds || 0);
              totalTds += Number(sd.set_tds || 0);
            });
          } else {
            // Fallback to formData if no history events found (for legacy data)
            totalNetSettled = Number(fd.set_net_settled || 0);
            totalInclTds = Number(fd.set_incl_tds || 0);
            totalTds = Number(fd.set_tds || 0);
          }

          const billVsAl = (finalBill > 0 && finalApp > 0) ? ((finalApp / finalBill) * 100).toFixed(2) + '%' : '';
          const alVsSet = (finalApp > 0 && totalInclTds > 0) ? ((totalInclTds / finalApp) * 100).toFixed(2) + '%' : '';
          
          let settledDays = '';
          let pendingDays = '';
          let ageing = 'NA';
          const isSettled = c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE;
          if (isSettled && fd.settlement_date && disDate) {
            const setDate = new Date(fd.settlement_date);
            settledDays = Math.ceil((setDate.getTime() - disDate.getTime()) / (1000 * 60 * 60 * 24)).toString();
          } else if (disDate) {
            const days = Math.floor((new Date().getTime() - disDate.getTime()) / (1000 * 60 * 60 * 24));
            pendingDays = days.toString();
            ageing = getAgeingBucket(days);
          }

          const preAuthInit = history.find(h => h.status === ClaimStatus.PRE_AUTH_INITIATED);
          const preAuthApp = history.find(h => h.status === ClaimStatus.PRE_AUTH_APPROVED);
          const disInit = history.find(h => h.status === ClaimStatus.DISCHARGE_INITIATED);
          const disApp = history.find(h => h.status === ClaimStatus.DISCHARGE_APPROVED);
          const fileDispatch = history.find(h => h.status === ClaimStatus.FILE_DISPATCHED);
          const rejection = history.find(h => h.status.includes('Rejected'));

          // Outstanding is 0 if non-recoverable or complete
          const outstanding = (c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE)
            ? 0
            : (finalApp - totalInclTds);

          // Partial Diff captures the remaining amount
          const partialDiff = (finalApp - totalInclTds);

          return [
            i + 1, monthVal, billVsAl, alVsSet, settledDays, pendingDays, ageing, c.caseReferenceId, fd.p_uhid || '',
            fd.hosp_name || '', c.patientName, fd.tpa_provider || '', c.insuranceProvider, fd.p_card_id || '',
            c.policyNumber, fd.insurer_claim_no || '', fd.p_employee_id || '', formatDateExport(c.admissionDate),
            formatDateExport(disDateStr), fd.dr_name || '', c.diagnosis, fd.dis_pkg_exp || '', fd.dis_room_rent || '',
            fd.dis_prof_exp || '', fd.dis_pharm_exp || '', fd.dis_inv_exp || '', fd.dis_diag_other || '', finalBill,
            formatDateExport(disDateStr), finalApp, fd.fin_mou_disc || '', fd.fin_copay || '', fd.fin_non_med || '',
            fd.fin_prop_exp || '', fd.fin_sub_limit || '', fd.fin_tariff_ded || '', fd.fin_other_ded || '',
            fd.fin_total_amt || '', fd.fin_patient_paid || '', fd.deduction_comment || '',
            fileDispatch ? formatDateExport(fileDispatch.date) : '', fd.tracking_no || '', fd.courier_name || '',
            c.status, formatDateExport(fd.settlement_date), fd.utr_number || '', totalNetSettled || '',
            totalInclTds, totalTds || '', partialDiff || '', outstanding,
            fd.partial_remark_type || '', rejection?.comment || '', getTimeDiffStr(preAuthInit?.date, preAuthApp?.date),
            getTimeDiffStr(disInit?.date, disApp?.date), history.filter(h => h.status === ClaimStatus.INITIAL_QUERY_PENDING).length,
            history.filter(h => h.status === ClaimStatus.DISCHARGE_QUERY_RAISED).length
          ];
        });
        break;

      case 'Admission':
        headers = ["Sr.No", "Case ID", "Patient Name", "Hospital", "Admission Date", "TPA/Insurer", "Estimated Amount", "Pre-Auth Status"];
        rows = filteredClaims.map((c, i) => [
          i + 1, c.caseReferenceId, c.patientName, c.formData?.hosp_name || '', formatDateExport(c.admissionDate),
          c.insuranceProvider, c.estimatedCost, c.status
        ]);
        break;

      case 'Discharge':
        headers = ["Sr.No", "Case ID", "Patient Name", "Hospital", "Admission Date", "Discharge Date", "Total Bill", "Final Approval", "Status"];
        rows = filteredClaims.map((c, i) => [
          i + 1, c.caseReferenceId, c.patientName, c.formData?.hosp_name || '', formatDateExport(c.admissionDate),
          formatDateExport(c.formData?.dis_date || c.formData?.adm_exp_discharge), c.formData?.dis_total_bill || 0,
          c.formData?.fin_app_amt || 0, c.status
        ]);
        break;

      case 'Outstanding':
        headers = ["Sr.No", "Case ID", "Patient Name", "Hospital", "Final Approval", "Total Settled", "Outstanding", "Ageing"];
        rows = filteredClaims.map((c, i) => {
          const finalApp = Number(c.formData?.fin_app_amt || 0);
          const settled = Number(c.formData?.set_incl_tds || 0);
          const disDate = c.formData?.dis_date ? new Date(c.formData.dis_date) : null;
          const days = disDate ? Math.floor((new Date().getTime() - disDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          return [
            i + 1, c.caseReferenceId, c.patientName, c.formData?.hosp_name || '', finalApp, settled,
            (finalApp - settled), getAgeingBucket(days)
          ];
        });
        break;

      case 'TAT':
        headers = ["Sr.No", "Case ID", "Patient Name", "Pre-Auth TAT (HH:MM)", "Discharge TAT (HH:MM)", "Total TAT (Days)"];
        rows = filteredClaims.map((c, i) => {
          const history = c.history || [];
          const paInit = history.find(h => h.status === ClaimStatus.PRE_AUTH_INITIATED);
          const paApp = history.find(h => h.status === ClaimStatus.PRE_AUTH_APPROVED);
          const disInit = history.find(h => h.status === ClaimStatus.DISCHARGE_INITIATED);
          const disApp = history.find(h => h.status === ClaimStatus.DISCHARGE_APPROVED);
          const totalDays = Math.ceil((new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return [
            i + 1, c.caseReferenceId, c.patientName, getTimeDiffStr(paInit?.date, paApp?.date),
            getTimeDiffStr(disInit?.date, disApp?.date), totalDays
          ];
        });
        break;

      case 'File Dispatch Pending':
        headers = ["Sr.No", "Case ID", "Patient Name", "Hospital", "Discharge Date", "Status"];
        rows = filteredClaims.filter(c => c.status === ClaimStatus.DISCHARGE_APPROVED).map((c, i) => [
          i + 1, c.caseReferenceId, c.patientName, c.formData?.hosp_name || '',
          formatDateExport(c.formData?.dis_date || c.formData?.adm_exp_discharge), c.status
        ]);
        break;
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `claimnx_${selectedReport.toLowerCase()}_report_${startDate}_to_${endDate}.xlsx`);
    
    setTimeout(() => setIsDownloading(false), 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Download size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Download MIS Reports</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Select report type and date range to export</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">1. Select Report Type</label>
            <div className="grid grid-cols-1 gap-2">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                    selectedReport === report.id 
                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                    : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-black uppercase tracking-tight ${selectedReport === report.id ? 'text-blue-700' : 'text-slate-700'}`}>
                      {report.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{report.description}</p>
                  </div>
                  {selectedReport === report.id && <ChevronRight size={16} className="text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {selectedReport && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">2. Select Date Range</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase px-1">From Date</p>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase px-1">To Date</p>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {startDate && endDate && (
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isDownloading ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Download size={16} className="mr-2" />}
                    {isDownloading ? 'Generating Report...' : `Download ${selectedReport} Report`}
                  </button>
                )}
              </div>
            )}
            
            {!selectedReport && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-[2rem]">
                <FileText size={48} className="text-slate-200 mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Please select a report type<br />from the list to continue
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadReports;
