
import React, { useState, useEffect, useRef } from 'react';
import { Claim, ClaimStatus } from '../types';
import { 
  Maximize2, Minimize2, Settings, ListFilter, 
  ChevronUp, ChevronDown, RefreshCw, Filter, 
  Activity, BriefcaseMedical, CheckCircle2, AlertCircle, Clock,
  X, CheckSquare, Hospital, User, ChevronRight, FileText, 
  IndianRupee, Calendar, Tags, LayoutList, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../utils';

interface LiveClaimsTrackerProps {
  claims: Claim[];
  hospitalName?: string;
  userName?: string;
}

const ALL_COLUMNS = [
  { id: 'ip_no', label: 'Hospital UHID / IPD', icon: FileText },
  { id: 'caseId', label: 'Claim No', icon: Building2 },
  { id: 'uhid', label: 'UHID', icon: FileText },
  { id: 'patientName', label: 'Patient Name', icon: User },
  { id: 'insurer', label: 'Payer', icon: User },
  { id: 'approvedAmt', label: 'Approved Amount', icon: IndianRupee },
  { id: 'status', label: 'Status', icon: LayoutList },
  { id: 'admissionDate', label: 'DOA', icon: Calendar },
  { id: 'dischargeDate', label: 'DOD', icon: Calendar },
];

const LiveClaimsTracker: React.FC<LiveClaimsTrackerProps> = ({ claims, hospitalName }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['ip_no', 'caseId', 'insurer', 'approvedAmt', 'status', 'admissionDate']);
  const [showSettings, setShowSettings] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [daysFilter, setDaysFilter] = useState<number>(3); 
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  
  // Close date filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowDateFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (id: string) => {
    if (visibleColumns.includes(id)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter(c => c !== id));
      }
    } else {
      if (visibleColumns.length < 8) {
        const newCols = ALL_COLUMNS
          .filter(col => [...visibleColumns, id].includes(col.id))
          .map(col => col.id);
        setVisibleColumns(newCols);
      }
    }
  };

  // Filter and sort claims
  const sortedClaims = React.useMemo(() => {
    const activeStatuses: ClaimStatus[] = [
      ClaimStatus.DRAFT,
      ClaimStatus.PENDING_MEDICAL_REVIEW,
      ClaimStatus.MEDICAL_APPROVED,
      ClaimStatus.MEDICAL_QUERY_RAISED,
      ClaimStatus.MEDICAL_QUERY_REPLIED,
      ClaimStatus.MEDICAL_REJECTED,
      ClaimStatus.SENT_TO_INSURANCE,
      ClaimStatus.PRE_AUTH_INITIATED,
      ClaimStatus.PRE_AUTH_APPROVED,
      ClaimStatus.INITIAL_QUERY_PENDING,
      ClaimStatus.QUERY_REPLY_DONE,
      ClaimStatus.PRE_AUTH_REJECTED,
      ClaimStatus.ENHANCEMENT,
      ClaimStatus.ENHANCEMENT_APPROVED,
      ClaimStatus.ENHANCEMENT_QUERY_RAISED,
      ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
      ClaimStatus.ENHANCEMENT_REJECTED,
      ClaimStatus.DISCHARGE_INITIATED,
      ClaimStatus.DISCHARGE_QUERY_RAISED,
      ClaimStatus.DISCHARGE_QUERY_REPLY,
      ClaimStatus.DISCHARGE_REJECTED,
      ClaimStatus.DISCHARGE_APPROVED,
      ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED,
      ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
      ClaimStatus.KYP_PENDING,
      ClaimStatus.KYP_ACCEPTED,
      ClaimStatus.KYP_QUERY_PENDING,
      ClaimStatus.KYP_QUERY_REPLIED,
      ClaimStatus.KYP_REJECTED,
      ClaimStatus.KYP_PENDING_APPROVAL
    ];

    let filtered = claims.filter(c => activeStatuses.includes(c.status));

    const now = new Date();
    filtered = filtered.filter(c => {
      const createdDate = new Date(c.createdAt);
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= daysFilter;
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [claims, daysFilter]);

  useEffect(() => {
    let interval: any;
    if (autoScroll && scrollRef.current && sortedClaims.length > 5) {
      interval = setInterval(() => {
        if (scrollRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 10) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            scrollRef.current.scrollBy({ top: 120, behavior: 'smooth' });
          }
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [autoScroll, sortedClaims]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const getStatusConfig = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('approved')) return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: CheckCircle2 };
    if (s.includes('rejected')) return { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20', icon: AlertCircle };
    if (s.includes('query')) return { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', icon: Clock };
    if (s.includes('initiated') || s.includes('pending')) return { color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20', icon: Activity };
    return { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: Clock };
  };

  const getGridTemplateColumns = () => {
    const colWidths = visibleColumns.map(colId => {
      switch (colId) {
        case 'patientName':
          return '2.2fr';
        case 'status':
          return '1.8fr';
        case 'insurer':
          return '1.2fr';
        case 'approvedAmt':
          return '1.2fr';
        case 'ip_no':
        case 'caseId':
        case 'uhid':
          return '1.1fr';
        default:
          return '1fr';
      }
    });
    return `${colWidths.join(' ')} 40px`;
  };

  return (
    <div className={`flex flex-col bg-[#040811] font-sans text-white transition-all ${
      isFullscreen 
        ? 'fixed inset-0 z-[999] rounded-none h-screen w-screen' 
        : 'h-[calc(100vh-120px)] lg:h-[calc(100vh-170px)] rounded-2xl border border-white/10 overflow-hidden shadow-2xl'
    }`}>
      {/* Top Header - Dark Mode */}
      <div className="bg-[#050a16] px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Hospital size={20} className="text-white" />
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white uppercase">{hospitalName || "ClaimNX"}</span>
             </div>
          </div>
          
          <div className="h-8 w-[1px] bg-white/10" />
          
          <h1 className="text-slate-300 text-sm font-bold flex items-center gap-2">
            Discharges Due Today : <span className="text-white font-black">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Last X Days Filter Button */}
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Filter size={14} />
              LAST {daysFilter} DAYS
            </button>

            <AnimatePresence>
              {showDateFilter && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-3 w-48 bg-[#0a1224] border border-white/10 rounded-xl shadow-2xl z-[110] overflow-hidden"
                >
                  <div className="p-3 border-b border-white/5 bg-white/5">
                    <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Time range</h5>
                  </div>
                  <div className="p-2 space-y-1">
                    {[3, 7, 15].map((v) => (
                      <button 
                        key={v}
                        onClick={() => { setDaysFilter(v); setShowDateFilter(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-colors ${daysFilter === v ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                      >
                        Last {v} Days
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-8 w-[1px] bg-white/10" />

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Auto Refresh</span>
               <button 
                 onClick={() => setAutoScroll(!autoScroll)}
                 className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${autoScroll ? 'bg-emerald-500' : 'bg-slate-800'}`}
               >
                  <span className={`absolute ${autoScroll ? 'left-2' : 'right-2'} top-2 text-[8px] font-black text-white`}>
                    {autoScroll ? 'ON' : ''}
                  </span>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${autoScroll ? 'left-8' : 'left-1'}`} />
               </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                 onClick={() => setShowSettings(!showSettings)}
                 className="p-2 text-slate-400 hover:text-white transition-colors"
                 title="Display Settings"
              >
                <Settings size={20} />
              </button>
              <button 
                onClick={toggleFullscreen}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Header - Dark themed with icons */}
      <div 
        className={`grid bg-[#050a16] border-b border-white/5 transition-all ${
          visibleColumns.length <= 4 ? 'py-5 px-6 md:px-10' :
          visibleColumns.length <= 6 ? 'py-4 px-5 md:px-8' : 'py-3.5 px-4 md:px-6'
        }`} 
        style={{ gridTemplateColumns: getGridTemplateColumns() }}
      >
         {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map((col) => (
           <div 
             key={col.id} 
             className={`font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ${
               visibleColumns.length <= 4 ? 'text-xs md:text-[13px]' :
               visibleColumns.length <= 6 ? 'text-[11px] md:text-xs' : 'text-[9px] md:text-[10px]'
             }`}
           >
             <col.icon size={visibleColumns.length <= 6 ? 14 : 12} className="opacity-60 shrink-0" />
             <span className="truncate">{col.label}</span>
           </div>
         ))}
         <div />
      </div>

      {/* Table Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar bg-[#040811] scroll-smooth"
      >
        <div className="divide-y divide-white/5">
          {sortedClaims.length > 0 ? sortedClaims.map((claim, idx) => (
            <motion.div 
              key={claim.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(idx * 0.05, 0.5) }}
              className={`grid items-center hover:bg-white/[0.02] transition-all border-b border-white/[0.02] ${
                visibleColumns.length <= 4 ? 'py-6 px-6 md:px-10' :
                visibleColumns.length <= 6 ? 'py-4.5 px-5 md:px-8' : 'py-3 px-4 md:px-6'
              }`}
              style={{ gridTemplateColumns: getGridTemplateColumns() }}
            >
              {visibleColumns.includes('ip_no') && (
                <div className="flex items-center gap-3">
                   <FileText size={visibleColumns.length <= 6 ? 18 : 16} className="text-slate-600 shrink-0" />
                   <span className={`font-black text-slate-100 font-mono tracking-tight leading-none ${
                     visibleColumns.length <= 4 ? 'text-lg md:text-xl' :
                     visibleColumns.length <= 6 ? 'text-base md:text-lg' : 'text-sm md:text-base'
                   }`}>
                     {claim.formData?.p_uhid || claim.formData?.p_ip_no || `IP${2026000000 + idx}`}
                   </span>
                </div>
              )}
              {visibleColumns.includes('caseId') && (
                <span className={`font-bold text-slate-300 tracking-tight leading-tight truncate pr-2 ${
                  visibleColumns.length <= 4 ? 'text-base md:text-lg' :
                  visibleColumns.length <= 6 ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                }`}>
                  {claim.formData?.insurer_claim_no || "PENDING"}
                </span>
              )}
              {visibleColumns.includes('uhid') && (
                <span className={`font-bold text-slate-300 leading-tight truncate pr-2 ${
                  visibleColumns.length <= 4 ? 'text-base md:text-lg' :
                  visibleColumns.length <= 6 ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                }`}>
                  {claim.formData?.p_uhid || 'N/A'}
                </span>
              )}
              {visibleColumns.includes('patientName') && (
                <span className={`font-black text-slate-100 whitespace-normal break-words pr-4 leading-tight ${
                  visibleColumns.length <= 4 ? 'text-xl md:text-2xl' :
                  visibleColumns.length <= 6 ? 'text-lg md:text-xl' : 'text-sm md:text-base'
                }`}>
                  {claim.patientName}
                </span>
              )}
              {visibleColumns.includes('insurer') && (
                <span className={`font-bold text-slate-400 whitespace-normal break-words pr-4 leading-tight ${
                  visibleColumns.length <= 4 ? 'text-base md:text-lg' :
                  visibleColumns.length <= 6 ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                }`}>
                  {claim.insuranceProvider}
                </span>
              )}
              {visibleColumns.includes('approvedAmt') && (() => {
                let amt = 0;
                if (claim.status === ClaimStatus.PRE_AUTH_APPROVED) {
                  amt = Number(claim.formData?.pre_auth_app_amt || 0);
                } else if (claim.status === ClaimStatus.ENHANCEMENT_APPROVED) {
                  amt = Number(claim.formData?.enh_app_amt || 0);
                } else if (claim.status === ClaimStatus.DISCHARGE_APPROVED) {
                  amt = Number(claim.formData?.fin_app_amt || 0);
                } else if (claim.status === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED) {
                  amt = Number(claim.formData?.fin_app_amt || 0);
                } else {
                  if (claim.formData?.fin_app_amt) {
                    amt = Number(claim.formData.fin_app_amt);
                  } else if (claim.formData?.enh_app_amt) {
                    amt = Number(claim.formData.enh_app_amt);
                  } else if (claim.formData?.pre_auth_app_amt) {
                    amt = Number(claim.formData.pre_auth_app_amt);
                  } else {
                    amt = Number(claim.formData?.adm_total_cost || claim.estimatedCost || 0);
                  }
                }
                return (
                  <span className={`font-black text-emerald-400 tracking-tight leading-none ${
                    visibleColumns.length <= 4 ? 'text-xl md:text-2xl' :
                    visibleColumns.length <= 6 ? 'text-lg md:text-xl' : 'text-sm md:text-base'
                  }`}>
                    ₹ {amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                );
              })()}
              {visibleColumns.includes('status') && (
                <div className="pr-2">
                   {(() => {
                      const config = getStatusConfig(claim.status);
                      const StatusIcon = config.icon;
                      return (
                        <div className={`flex items-center gap-2 border ${config.bg} ${config.border} ${config.color} w-fit rounded-full transition-all ${
                          visibleColumns.length <= 4 ? 'px-6 py-2.5' :
                          visibleColumns.length <= 6 ? 'px-4 py-2' : 'px-3 py-1'
                        }`}>
                           <StatusIcon size={
                             visibleColumns.length <= 4 ? 18 :
                             visibleColumns.length <= 6 ? 14 : 12
                           } className="shrink-0" />
                           <span className={`font-black uppercase tracking-wider leading-none text-center ${
                             visibleColumns.length <= 4 ? 'text-xs md:text-sm' :
                             visibleColumns.length <= 6 ? 'text-[10px] md:text-xs' : 'text-[9px]'
                           }`}>
                              {claim.status === ClaimStatus.DISCHARGE_APPROVED ? 'Discharge Approved' : claim.status}
                           </span>
                        </div>
                      );
                   })()}
                </div>
              )}
              {visibleColumns.includes('admissionDate') && (
                <span className={`font-bold text-slate-300 leading-none ${
                  visibleColumns.length <= 4 ? 'text-base md:text-lg' :
                  visibleColumns.length <= 6 ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                }`}>
                  {formatDate(claim.admissionDate)}
                </span>
              )}
              {visibleColumns.includes('dischargeDate') && (
                <span className={`font-bold text-slate-300 leading-none ${
                  visibleColumns.length <= 4 ? 'text-base md:text-lg' :
                  visibleColumns.length <= 6 ? 'text-sm md:text-base' : 'text-xs md:text-sm'
                }`}>
                  {claim.formData?.dis_date ? formatDate(claim.formData.dis_date) : '--'}
                </span>
              )}
              <div className="flex justify-end pr-2">
                 <ChevronRight size={visibleColumns.length <= 6 ? 18 : 16} className="text-slate-600 group-hover:text-white transition-colors" />
              </div>
            </motion.div>
          )) : (
            <div className="flex flex-col items-center justify-center h-full py-60 opacity-20 text-white">
               <BriefcaseMedical size={80} />
               <p className="mt-6 text-xl font-black uppercase tracking-[0.3em]">No active discharge records</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Status Bar */}
      <div className="bg-[#050a16] px-10 py-6 flex items-center justify-between border-t border-white/5">
         <div className="text-sm font-bold text-slate-400">
            Current Monitoring View: <span className="text-white uppercase tracking-widest ml-2">{sortedClaims.length} Discharge Records Active</span>
         </div>

         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Connection Active</span>
            </div>
         </div>
      </div>

      {/* Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-24 right-6 bg-[#0a1224] border border-white/10 p-6 rounded-2xl shadow-2xl z-[150] w-80"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
               <div className="flex items-center gap-2">
                  <Settings size={16} className="text-indigo-400" />
                  <h4 className="text-[12px] font-black uppercase text-white tracking-widest">Display Settings</h4>
               </div>
               <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            
            <div className="space-y-6">
               <div className="space-y-3">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Columns</span>
                     <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                       {visibleColumns.length}/8
                     </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                     {ALL_COLUMNS.map((col) => {
                       const isVisible = visibleColumns.includes(col.id);
                       const isDisabled = !isVisible && visibleColumns.length >= 8;

                       return (
                         <button
                           key={col.id}
                           disabled={isDisabled}
                           onClick={() => toggleColumn(col.id)}
                           className={`flex items-center justify-between p-3 rounded-xl transition-all text-left ${isVisible ? "bg-indigo-500/10 text-indigo-100 border border-indigo-500/30" : "bg-white/5 text-slate-500 border border-transparent hover:bg-white/10 hover:border-white/5"} ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
                         >
                           <div className="flex items-center gap-3">
                             <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${isVisible ? "bg-indigo-500" : "bg-white/5 border border-white/10"}`}>
                               {isVisible && <CheckSquare size={12} className="text-white" />}
                             </div>
                             <span className="text-[11px] font-bold uppercase tracking-tight">{col.label}</span>
                           </div>
                         </button>
                       );
                     })}
                  </div>
               </div>

               <div className="pt-4 border-t border-white/5 space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Fullscreen Mode</span>
                    <button 
                      onClick={toggleFullscreen}
                      className="p-1.5 bg-white/5 rounded-lg text-indigo-400"
                    >
                      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                 </div>
                 <p className="text-[9px] font-medium text-slate-500 uppercase italic leading-tight">
                   Optimized for high-resolution display terminals and public monitors.
                 </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveClaimsTracker;
