
import React, { useState, useMemo, useRef } from 'react';
import { formatDate, formatDateTime, parseDate, formatClaimTAT } from '../utils';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Claim, ClaimStatus, ClaimStage, InsuranceEntity } from '../types';
import { auditService } from '../services/auditService';
import { toast } from 'sonner';
// Removed XLSX import as per request
import { 
  Search, Filter, PlayCircle, X,
  Layers, Hospital, FileSearch, MoreVertical, ChevronRight, Clock, ShieldCheck, Activity,
  Sparkles, Brain, AlertTriangle, TrendingUp, Globe, Eye, Settings as SettingsIcon, Check,
  RotateCw, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManageClaimsProps {
  claims: Claim[];
  stages: ClaimStage[];
  setClaims?: React.Dispatch<React.SetStateAction<Claim[]>>;
  insurers?: InsuranceEntity[];
  tpas?: InsuranceEntity[];
  permissions?: string[];
}

const ALL_COLUMNS = [
  { id: 'case_id', label: 'Case ID' },
  { id: 'hospital_name', label: 'Hospital Name' },
  { id: 'uhid', label: 'UHID' },
  { id: 'patient_name', label: 'Patient Name' },
  { id: 'source', label: 'Source' },
  { id: 'product', label: 'Product' },
  { id: 'claim_no', label: 'Claim No' },
  { id: 'insurer', label: 'Insurance Company' },
  { id: 'tpa', label: 'TPA Name' },
  { id: 'bill_amt', label: 'Est./Final Bill' },
  { id: 'approved_amt', label: 'Approved Amt' },
  { id: 'adm_date', label: 'Admission Date' },
  { id: 'dis_date', label: 'Discharge Date' },
  { id: 'status', label: 'Status' },
  { id: 'tat', label: 'TAT' }
];

const DEFAULT_COLUMNS = ['case_id', 'hospital_name', 'uhid', 'patient_name', 'insurer', 'bill_amt', 'approved_amt', 'status', 'tat'];

const EXCLUDED_STATUSES = [
  ClaimStatus.MEDICAL_APPROVED,
  ClaimStatus.MEDICAL_REJECTED,
  ClaimStatus.SENT_TO_INSURANCE,
  ClaimStatus.KYP_PENDING,
  ClaimStatus.KYP_ACCEPTED,
  ClaimStatus.KYP_COMPLETED,
  ClaimStatus.KYP_QUERY_PENDING,
  ClaimStatus.KYP_QUERY_REPLIED,
  ClaimStatus.KYP_REJECTED,
  ClaimStatus.KYP_PENDING_APPROVAL,
  ClaimStatus.ASSESSMENT_SUBMITTED,
  ClaimStatus.ASSESSMENT_INITIATED,
  ClaimStatus.ASSESSMENT_APPROVED,
  ClaimStatus.ASSESSMENT_QUERY_PENDING,
  ClaimStatus.ASSESSMENT_REJECTED,
  ClaimStatus.SETTLED,
  ClaimStatus.NEW_REGISTRATION,
  ClaimStatus.WELCOME_CALL_DONE,
  ClaimStatus.FILE_PICKUP_SCHEDULED,
  ClaimStatus.FILE_PICKUP_IN_PROGRESS,
  ClaimStatus.FILE_PICKED_UP_DONE,
  ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
  ClaimStatus.HOSPITAL_QUERY_PENDING,
  ClaimStatus.INTERNAL_QUERY_PENDING,
  ClaimStatus.MEDICALLY_FILE_APPROVED,
  ClaimStatus.QUERY_DOCUMENTS_RECEIVED,
  ClaimStatus.PENDING_WITH_INSURER_MEDICAL_TEAM,
  ClaimStatus.CLAIM_PENDING_WITH_INSURER_MEDICAL,
  ClaimStatus.ASSESSMENT_QUERY_REPLIED
];

const ManageClaims: React.FC<ManageClaimsProps> = ({ 
  claims, 
  stages, 
  setClaims, 
  insurers = [], 
  tpas = [],
  permissions = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('claimnx_directory_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const itemsPerPage = 20;
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetProduct = searchParams.get('product');

  const filteredClaimsByProduct = useMemo(() => {
    if (!targetProduct) return claims;
    return claims.filter((c) => c.product === targetProduct);
  }, [claims, targetProduct]);

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => {
      let newColumns;
      if (prev.includes(columnId)) {
        if (prev.length <= 1) return prev; // Keep at least one
        newColumns = prev.filter(id => id !== columnId);
      } else {
        if (prev.length >= 9) {
           // If already at 9, don't add more
           return prev;
        }
        newColumns = [...prev, columnId];
      }
      localStorage.setItem('claimnx_directory_columns', JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast.success("Claims directory refreshed successfully.");
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const sortedAndFilteredClaims = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const filtered = filteredClaimsByProduct.filter(c => {
      const normalizedSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = String(c.patientName ?? '').toLowerCase().includes(normalizedSearchTerm) ||
                           String(c.id ?? '').toLowerCase().includes(normalizedSearchTerm) ||
                           String(c.formData?.insurer_claim_no ?? '').toLowerCase().includes(normalizedSearchTerm);
      
      if (!matchesSearch) return false;

      if (statusFilter !== 'All') {
        if (c.status !== statusFilter) return false;
      } else {
        if (EXCLUDED_STATUSES.includes(c.status as ClaimStatus)) return false;
      }

      // Date Range Filter (Default: up to 90 days, Custom Range: specific dates)
      const claimTime = new Date(c.updatedAt || c.createdAt).getTime();
      const isCustomFilterActive = startDate !== '' || endDate !== '';

      if (isCustomFilterActive) {
        if (startDate) {
          const startObj = new Date(startDate);
          startObj.setHours(0, 0, 0, 0);
          if (claimTime < startObj.getTime()) return false;
        }
        if (endDate) {
          const endObj = new Date(endDate);
          endObj.setHours(23, 59, 59, 999);
          if (claimTime > endObj.getTime()) return false;
        }
      } else {
        if (claimTime < ninetyDaysAgo.getTime()) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const isAOutstanding = a.status !== ClaimStatus.COMPLETE_SETTLEMENT && a.status !== ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE;
      const isBOutstanding = b.status !== ClaimStatus.COMPLETE_SETTLEMENT && b.status !== ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE;

      if (isAOutstanding && !isBOutstanding) return -1;
      if (!isAOutstanding && isBOutstanding) return 1;

      // If both are outstanding or both are settled, sort by last updated date (descending for latest first)
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [filteredClaimsByProduct, searchTerm, statusFilter, startDate, endDate]);

  const totalPages = Math.ceil(sortedAndFilteredClaims.length / itemsPerPage);
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredClaims.slice(start, start + itemsPerPage);
  }, [sortedAndFilteredClaims, currentPage]);

  const getStatusStyle = (status?: string) => {
    const normalizedStatus = status ?? '';
    if (normalizedStatus.includes('Approved')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (normalizedStatus.includes('Rejected')) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (normalizedStatus.includes('Initiated') || normalizedStatus.includes('Pending')) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (normalizedStatus.includes('Settlement')) return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight uppercase">Claim Directory</h1>
          <p className="text-slate-500 text-xs lg:text-sm font-medium uppercase tracking-widest">Clinical and Financial Record Ledger.</p>
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/30">
            {/* Row 1: Search, Status Filter, Refresh button, Settings button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  placeholder="Search case..." 
                  value={searchTerm ?? ''} 
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }} 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold shadow-xs" 
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  value={statusFilter ?? ''} 
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }} 
                  className="w-full sm:w-64 pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 appearance-none shadow-xs"
                >
                  <option value="All">All Statuses</option>
                  {Object.values(ClaimStatus)
                    .filter(s => !EXCLUDED_STATUSES.includes(s))
                    .map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-3 bg-emerald-600 border border-emerald-600 text-white hover:bg-[#000080] hover:border-[#000080] active:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center justify-center relative disabled:opacity-50"
                  title="Refresh Claims"
                >
                  <RotateCw size={18} className={`${isRefreshing ? 'animate-spin text-white' : 'transition-transform hover:scale-110 active:rotate-45 text-white'}`} />
                </button>

                <div className="relative">
                  <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`p-3 rounded-xl border transition-all ${isSettingsOpen ? 'bg-[#000080] border-[#000080] text-white shadow-lg ring-2 ring-blue-200' : 'bg-[#000080] border-[#000080] text-white hover:bg-blue-900 hover:border-blue-900'}`}
                    title="Column Settings"
                  >
                    <SettingsIcon size={18} />
                  </button>

                  <AnimatePresence>
                    {isSettingsOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-4"
                        >
                          <div className="flex items-center justify-between mb-4 px-1">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Visible Columns ({visibleColumns.length}/9)</p>
                            <button onClick={() => setVisibleColumns(DEFAULT_COLUMNS)} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-tighter">Reset</button>
                          </div>
                          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                            {ALL_COLUMNS.map(col => {
                              const isVisible = visibleColumns.includes(col.id);
                              const isDisabled = !isVisible && visibleColumns.length >= 9;
                              return (
                                <button
                                  key={col.id}
                                  disabled={isDisabled}
                                  onClick={() => toggleColumn(col.id)}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                                    isVisible 
                                      ? 'bg-blue-50 text-blue-700 font-bold' 
                                      : isDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-slate-50 text-slate-500 font-medium'
                                  }`}
                                >
                                  <span className="text-[11px] uppercase tracking-wide">{col.label}</span>
                                  {isVisible && <Check size={14} />}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-4 px-1 text-[10px] font-bold text-slate-400 italic">Max 9 columns allowed for readability.</p>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Row 2: Date Filters & Age Status Badge */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <Calendar size={14} className="text-[#000080]" />
                  <span>Interactive Calendar Scope:</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 font-sans">
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent outline-none text-xs font-bold text-slate-700"
                    />
                  </div>
                  
                  <span className="text-slate-400 text-xs font-bold font-mono">→</span>
                  
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent outline-none text-xs font-bold text-slate-700"
                    />
                  </div>

                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setCurrentPage(1);
                        toast.info("Scope reset to past 90 days log.");
                      }}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Show Last 90 Days
                    </button>
                  )}
                </div>
              </div>

              {/* Scope badge */}
              <div className={`self-start lg:self-auto px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                (startDate || endDate) 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-current ${!(startDate || endDate) ? 'animate-pulse' : ''}`} />
                {(startDate || endDate) 
                  ? `Custom Calendar Log Active` 
                  : `Upto 90 Days Active Log (Search calendar for older claims)`
                }
              </div>
            </div>
          </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-400 text-xs uppercase font-black tracking-[0.2em] border-b border-slate-100">
              <tr>
                {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                  <th key={col.id} className={`px-6 py-5 ${['bill_amt', 'approved_amt'].includes(col.id) ? 'text-right' : ['status', 'tat'].includes(col.id) ? 'text-center' : ''}`}>
                    {col.label}
                  </th>
                ))}
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedClaims.length > 0 ? paginatedClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-blue-50/30 transition-colors group">
                  {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                    <td key={col.id} className="px-6 py-5">
                      {col.id === 'case_id' && (
                        (() => {
                          const index = claims.findIndex(c => c.id === claim.id);
                          return <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">{index >= 0 ? 101 + index : '---'}</span>;
                        })()
                      )}

                      {col.id === 'hospital_name' && (
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">{claim.formData?.hosp_name || claim.formData?.hospitalName || 'Unknown'}</span>
                        </div>
                      )}
                      
                      {col.id === 'uhid' && <span className="text-base font-bold text-slate-600">{claim.formData?.p_uhid || 'N/A'}</span>}
                      
                      {col.id === 'patient_name' && (
                        <div className="flex flex-col">
                          <Link to={`/process-claim/${claim.id}?source=directory`} className="text-base font-black text-slate-800 hover:text-blue-600 transition-colors uppercase tracking-tight">{claim.patientName}</Link>
                        </div>
                      )}
                      
                      {col.id === 'source' && (
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter ${
                          claim.caseSource === 'Website' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          claim.caseSource === 'Mobile App' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {claim.caseSource || 'Internal'}
                        </span>
                      )}
                      
                      {col.id === 'product' && (
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 uppercase tracking-tighter`}>
                          {claim.product || 'Standard'}
                        </span>
                      )}
                      
                      {col.id === 'claim_no' && <span className="text-sm font-mono text-slate-500">{claim.formData?.insurer_claim_no || ''}</span>}
                      
                      {col.id === 'insurer' && (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <p className="text-base font-black text-slate-800 tracking-tight truncate max-w-[200px]" title={claim.insuranceProvider}>{claim.insuranceProvider}</p>
                            {/* Policy Number Hidden as per requirement */}
                          </div>
                          {insurers.find(i => i.name === claim.insuranceProvider)?.portalLink && (
                            <a href={insurers.find(i => i.name === claim.insuranceProvider)?.portalLink} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Open Portal">
                              <Globe size={14} />
                            </a>
                          )}
                        </div>
                      )}
                      
                      {col.id === 'tpa' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-600 truncate max-w-[200px]" title={claim.formData?.tpa_provider}>{claim.formData?.tpa_provider || 'Direct'}</span>
                          {tpas.find(t => t.name === claim.formData?.tpa_provider)?.portalLink && (
                            <a href={tpas.find(t => t.name === claim.formData?.tpa_provider)?.portalLink} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Open Portal">
                              <Globe size={14} />
                            </a>
                          )}
                        </div>
                      )}
                      
                      {col.id === 'bill_amt' && (
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black text-slate-900">₹{(claim.formData?.dis_total_bill || claim.estimatedCost || 0).toLocaleString('en-IN')}</span>
                          <span className="text-[11px] text-slate-400 font-bold uppercase">{claim.formData?.dis_total_bill ? 'Final' : 'Est.'}</span>
                        </div>
                      )}
                      
                      {col.id === 'approved_amt' && (() => {
                        let amt: number | null = null;
                        let label = '';
                        if (claim.status === ClaimStatus.PRE_AUTH_APPROVED) {
                          amt = claim.formData?.pre_auth_app_amt ? Number(claim.formData.pre_auth_app_amt) : null;
                          label = 'Pre-Auth';
                        } else if (claim.status === ClaimStatus.ENHANCEMENT_APPROVED) {
                          amt = claim.formData?.enh_app_amt ? Number(claim.formData.enh_app_amt) : null;
                          label = 'Enhancement';
                        } else if (claim.status === ClaimStatus.DISCHARGE_APPROVED) {
                          amt = claim.formData?.fin_app_amt ? Number(claim.formData.fin_app_amt) : null;
                          label = 'Discharge';
                        } else if (claim.status === ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED) {
                          amt = claim.formData?.fin_app_amt ? Number(claim.formData.fin_app_amt) : null;
                          label = 'Recon App.';
                        } else if (claim.status === ClaimStatus.SETTLED || claim.status === ClaimStatus.COMPLETE_SETTLEMENT) {
                          amt = claim.formData?.fin_app_amt ? Number(claim.formData.fin_app_amt) : null;
                          label = 'Settled';
                        } else {
                          if (claim.formData?.fin_app_amt) {
                            amt = Number(claim.formData.fin_app_amt);
                            label = 'Final';
                          } else if (claim.formData?.enh_app_amt) {
                            amt = Number(claim.formData.enh_app_amt);
                            label = 'Enhancement';
                          } else if (claim.formData?.pre_auth_app_amt) {
                            amt = Number(claim.formData.pre_auth_app_amt);
                            label = 'Pre-Auth';
                          }
                        }

                        return (
                          <div className="flex flex-col items-end">
                            <span className={`text-base font-black ${amt ? 'text-emerald-600' : 'text-slate-300'}`}>
                              {amt ? `₹${amt.toLocaleString('en-IN')}` : '--'}
                            </span>
                            {amt && label ? (
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
                            ) : null}
                          </div>
                        );
                      })()}
                      
                      {col.id === 'adm_date' && <span className="text-base font-bold text-slate-800 tracking-tight">{formatDate(claim.admissionDate)}</span>}
                      {col.id === 'dis_date' && <span className="text-base font-bold text-slate-800 tracking-tight">{formatDate(claim.formData?.dis_date)}</span>}
                      
                      {col.id === 'status' && (
                        <div className="text-center">
                          <span className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-tight whitespace-nowrap ${getStatusStyle(claim.status)}`}>
                            {claim.status}
                          </span>
                        </div>
                      )}
                      
                      {col.id === 'tat' && (
                        <div className="text-center">
                          <span className={`${getStatusStyle(claim.status)} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                            {formatClaimTAT(claim)}
                          </span>
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end space-x-2">
                       {(permissions.includes('all') || permissions.some(p => p.startsWith('claims:claims_list:'))) && (
                         <Link 
                           to={`/process-claim/${claim.id}?source=directory`} 
                           state={{ from: location.pathname }}
                           className="px-4 py-2.5 bg-[#000080] border border-transparent text-white rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white transition-all inline-flex items-center text-[11px] font-black uppercase tracking-widest group"
                         >
                           <Eye size={16} className="mr-2 group-hover:scale-110 transition-transform" />
                           View Claim
                         </Link>
                       )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-8 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest italic opacity-50">Empty Registry</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-slate-100">
          {paginatedClaims.length > 0 ? paginatedClaims.map((claim) => (
            <div 
              key={claim.id} 
              onClick={() => navigate(`/process-claim/${claim.id}?source=directory`)}
              className="block p-5 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-widest mb-1">{claim.formData?.insurer_claim_no || <span className="text-slate-200">PENDING</span>}</span>
                    <Link to={`/process-claim/${claim.id}?source=directory`} className="text-base font-black text-slate-800 uppercase tracking-tight leading-none hover:text-blue-600 transition-colors">{claim.patientName}</Link>
                 </div>
                 <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getStatusStyle(claim.status)}`}>
                   {claim.status}
                 </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-xs text-slate-500 font-bold uppercase tracking-widest">
                   <Activity size={12} className="mr-2 text-blue-400" /> {claim.insuranceProvider}
                </div>
                {(() => {
                  const insurer = insurers.find(i => i.name === claim.insuranceProvider);
                  const tpa = tpas.find(t => t.name === claim.formData?.tpa_provider);
                  const portalUrl = insurer?.portalLink || tpa?.portalLink;
                  return portalUrl ? (
                    <a 
                      href={portalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"
                    >
                      <Globe size={14} />
                    </a>
                  ) : null;
                })()}
              </div>
              <div className="flex justify-between items-end border-t border-slate-50 pt-3 mt-3">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Estimated Cost</span>
                    <span className="text-lg font-black text-slate-800">₹{claim.estimatedCost.toLocaleString('en-IN')}</span>
                 </div>
                 <div className="flex space-x-2">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                       <ChevronRight size={18} />
                    </div>
                 </div>
              </div>
            </div>
          )) : (
            <div className="px-6 py-20 text-center">
               <FileSearch size={40} className="mx-auto text-slate-200 mb-4" />
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching cases</p>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-8 py-5 rounded-[2rem] border border-slate-200 shadow-sm gap-4">
           <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              Showing <span className="text-indigo-600 mx-1">{(currentPage - 1) * itemsPerPage + 1}</span> to 
              <span className="text-indigo-600 mx-1">{Math.min(currentPage * itemsPerPage, sortedAndFilteredClaims.length)}</span> of 
              <span className="text-slate-600 mx-1">{sortedAndFilteredClaims.length}</span> entries
           </div>
           
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
              
              <div className="flex items-center gap-1">
                 {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum = currentPage > 3 ? currentPage - 2 + i : i + 1;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    if (pageNum < 1) pageNum = i + 1;
                    
                    if (pageNum > totalPages || pageNum < 1) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        {pageNum}
                      </button>
                    );
                 })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={18} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ManageClaims;
