import React, { useState, useMemo } from 'react';
import { 
  Download, FileText, FileSpreadsheet, Search, Filter, 
  Calendar, Info, ShieldCheck, Clock, ExternalLink,
  ChevronRight, ArrowDownToLine, PieChart, TrendingUp,
  Activity, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays } from 'date-fns';
import { HospitalUser } from '../types';

interface Report {
  id: string;
  name: string;
  type: 'Executive' | 'Operations' | 'Financial' | 'Performance';
  format: 'Excel' | 'PDF' | 'CSV';
  period: string;
  generatedAt: string;
  size: string;
  expiryDate: string;
  isNew?: boolean;
}

const ReportDownloadCenter: React.FC<{ hospitalProfile: HospitalUser }> = ({ hospitalProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const [reports] = useState<Report[]>([
    {
      id: 'rpt-99',
      name: 'Monthly Performance Analytics',
      type: 'Performance',
      format: 'PDF',
      period: 'April 2025',
      generatedAt: new Date().toISOString(),
      size: '2.4 MB',
      expiryDate: format(subDays(new Date(), -7), 'yyyy-MM-dd'),
      isNew: true
    },
    {
      id: 'rpt-98',
      name: 'Cashless Operations Audit',
      type: 'Operations',
      format: 'Excel',
      period: 'Q1 2025',
      generatedAt: subDays(new Date(), 2).toISOString(),
      size: '850 KB',
      expiryDate: format(subDays(new Date(), 5), 'yyyy-MM-dd')
    },
    {
      id: 'rpt-97',
      name: 'Financial Settlement Ledger',
      type: 'Financial',
      format: 'CSV',
      period: 'March 2025',
      generatedAt: subDays(new Date(), 15).toISOString(),
      size: '1.2 MB',
      expiryDate: format(subDays(new Date(), -15), 'yyyy-MM-dd')
    }
  ]);

  const filteredReports = reports.filter(rpt => {
    const matchesSearch = rpt.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || rpt.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                <FileText size={20} />
              </div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Report Download Center</h1>
           </div>
           <p className="text-slate-500 text-sm font-medium">Access your facility performance metrics and detailed financial audits.</p>
        </div>
        
        <div className="flex bg-slate-50 border border-slate-200 p-4 rounded-[2rem] items-center gap-6 shadow-sm">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last Generated</span>
              <span className="text-xs font-black text-slate-700 uppercase">Today, 09:30 AM</span>
           </div>
           <button onClick={() => window.location.reload()} title="Refresh this screen" className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all active:scale-95 shadow-sm">
              <RefreshCw size={20} />
           </button>
        </div>
      </div>

      {/* Stats row for Hospital View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <SummaryCard 
            icon={Activity} 
            label="Reporting Compliance" 
            value="100%" 
            sub="All mandated reports ready" 
            color="emerald" 
         />
         <SummaryCard 
            icon={Clock} 
            label="Next Scheduled Run" 
            value="Tomorrow" 
            sub="Daily Operations Summary" 
            color="blue" 
         />
         <SummaryCard 
            icon={ShieldCheck} 
            label="Secure Access" 
            value="Encrypted" 
            sub="TLS 1.3 Transmission" 
            color="indigo" 
         />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
           <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input 
                   type="text" 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   placeholder="Search reports by name..."
                   className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-50 transition-all shadow-sm"
                 />
              </div>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                 {['All', 'Performance', 'Financial', 'Operations'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterType === t ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                       {t}
                    </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="p-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map(rpt => (
                 <ReportCard key={rpt.id} report={rpt} />
              ))}
           </div>
           
           {filteredReports.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem]">
                 <AlertCircle size={48} className="text-slate-200 mb-4" />
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No reports found matching your criteria</p>
              </div>
           )}
        </div>
      </div>

      {/* Security Footer */}
      <div className="flex items-center justify-center py-10 opacity-50">
         <div className="flex flex-col items-center text-center max-w-sm">
            <div className="flex items-center gap-2 mb-2">
               <ShieldCheck size={14} className="text-slate-400" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Secure Delivery Center</span>
            </div>
            <p className="text-[8px] font-bold text-slate-400 leading-relaxed uppercase">
               All report download links are temporary and require active session authentication. Bima Garage adheres to strict HIPAA and GDPR data governance standards.
            </p>
         </div>
      </div>
    </div>
  );
};

const ReportCard = ({ report }: { report: Report }) => {
  const getFormatColor = (format: string) => {
    switch(format) {
      case 'PDF': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'Excel': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'CSV': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'Performance': return <TrendingUp size={16} />;
      case 'Financial': return <IndianRupee size={16} />;
      case 'Operations': return <Activity size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all group flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getFormatColor(report.format)}`}>
            .{report.format}
          </div>
          {report.isNew && (
            <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase animate-pulse">
               New
            </div>
          )}
        </div>

        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition-colors mb-1">{report.name}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{report.period}</p>

        <div className="space-y-4">
           <div className="flex items-center justify-between py-3 border-y border-slate-50">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report Type</span>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight flex items-center gap-2">
                 {report.type}
              </span>
           </div>
           
           <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Generated On</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{format(new Date(report.generatedAt), 'dd-MM-yyyy')}</span>
           </div>

           <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expires In</span>
              <span className="text-[10px] font-bold text-rose-500 uppercase">{format(new Date(report.expiryDate), 'dd-MM-yyyy')}</span>
           </div>
        </div>
      </div>

      <button className="mt-8 w-full py-4 bg-slate-50 text-slate-800 border border-slate-100 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm">
         <ArrowDownToLine size={18} /> Download {report.size}
      </button>
    </motion.div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, sub, color }: any) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 ${colors[color as keyof typeof colors]}`}>
          <Icon size={24} />
       </div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
          <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-1">{value}</h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{sub}</p>
       </div>
    </div>
  );
};

const IndianRupee = ({ size, className }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="m6 13 8.5 8" />
    <path d="M6 13h3" />
    <path d="M9 13c6.667 0 6.667-10 0-10" />
  </svg>
);

export default ReportDownloadCenter;
