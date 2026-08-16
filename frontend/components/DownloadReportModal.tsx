import React, { useState } from 'react';
import { X, Calendar, Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Claim } from '../types';
import { claimsApi } from '../services/api';
import { toast } from 'sonner';

interface DownloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  claims: Claim[];
  hospitals: any[];
}

const REPORT_TYPES = ['Business', 'Admission', 'Discharge', 'Outstanding', 'TAT', 'File Dispatch Pending'];

const DownloadReportModal: React.FC<DownloadReportModalProps> = ({ isOpen, onClose }) => {
  const userFromStorage = (() => {
    try {
      const email = localStorage.getItem('claimnx_manual_auth');
      if (!email) return null;
      if (email === 'raulavhad@gmail.com') return { role: 'Super Admin', username: email };
      const savedUsers = localStorage.getItem('claimnx_hospital_users');
      if (!savedUsers) return null;
      return JSON.parse(savedUsers).find((user: any) => user.username === email || user.emailId === email);
    } catch {
      return null;
    }
  })();

  const rolesFromStorage = (() => {
    try {
      return JSON.parse(localStorage.getItem('claimnx_roles') || '[]');
    } catch {
      return [];
    }
  })();

  const isReportAllowed = (reportName: string) => {
    const activeRole = userFromStorage?.role || 'Hospital';
    if (['SUPER ADMIN', 'PRIMARY ADMIN', 'ADMIN'].includes(activeRole.toUpperCase())) return true;
    const role = rolesFromStorage.find((item: any) => item.name?.toUpperCase() === activeRole.toUpperCase() || item.id === activeRole);
    if (!role) return activeRole.toLowerCase() !== 'hospital' || ['Business', 'Admission', 'Discharge'].includes(reportName);
    return (role.allowedReports || []).some((allowed: string) => allowed.toLowerCase() === reportName.toLowerCase());
  };

  const reportTypes = REPORT_TYPES.filter(isReportAllowed);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReport, setSelectedReport] = useState(() => reportTypes[0] || 'Business');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (startDate > endDate) {
      toast.error('Start date cannot be later than end date');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await claimsApi.downloadMisReport(selectedReport, startDate, endDate);
      const report = response.data as { headers?: string[]; rows?: any[][]; filename?: string };
      if (!Array.isArray(report.headers) || !Array.isArray(report.rows)) {
        throw new Error('The report service returned an invalid response.');
      }

      const worksheet = XLSX.utils.aoa_to_sheet([report.headers, ...report.rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, report.filename || `${selectedReport}_Report_${startDate}_to_${endDate}.xlsx`);
      toast.success(`${selectedReport} report downloaded`, {
        description: `${report.rows.length} claim record${report.rows.length === 1 ? '' : 's'} included.`,
      });
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Unable to generate report from the server');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Download Report</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Backend-generated MIS report</p>
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
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${selectedReport === type ? 'bg-[#000080] text-white border-[#000080] shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Start Date', value: startDate, setter: setStartDate },
              { label: 'End Date', value: endDate, setter: setEndDate },
            ].map(({ label, value, setter }) => (
              <div className="space-y-2" key={label}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={value}
                    onChange={(event) => setter(event.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading || !startDate || !endDate}
            className="w-full py-4 bg-[#000080] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isDownloading ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Download className="mr-2" size={18} />}
            {isDownloading ? 'Generating on server...' : 'Download Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadReportModal;
