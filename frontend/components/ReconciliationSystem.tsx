
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Claim, 
  ClaimStatus, 
  ReconciliationRecord, 
  ReconciliationReport,
  ReconciliationDiscrepancy,
  BankEntry
} from '../types';
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  Download,
  FileText,
  TrendingUp,
  BarChart3,
  ChevronRight,
  ShieldCheck,
  Zap,
  Upload,
  FileSpreadsheet,
  X
} from 'lucide-react';

interface ReconciliationSystemProps {
  claims: Claim[];
  reconciliations: ReconciliationRecord[];
}

const ReconciliationSystem: React.FC<ReconciliationSystemProps> = ({ claims, reconciliations }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Overview' | 'Matched' | 'Discrepancies' | 'Bank Statement' | 'Pending'>('Overview');
  const [bankEntries, setBankEntries] = useState<BankEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [reconciliationResults, setReconciliationResults] = useState<{
    utrFound: number;
    matched: number;
    notMatched: number;
    unidentified: number;
    matchedList: { utr: string; amount: number; patient: string }[];
    unidentifiedList: { utr: string; amount: number; description: string }[];
  }>({
    utrFound: 0,
    matched: 0,
    notMatched: 0,
    unidentified: 0,
    matchedList: [],
    unidentifiedList: []
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock Reconciliation Reports based on claims and bank entries
  const reports: ReconciliationReport[] = useMemo(() => {
    return claims
      .filter(c => c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.CLAIM_APPROVED || c.status === ClaimStatus.ACCOUNT_RECONCILIATION)
      .map(c => {
        const billAmt = c.formData?.dis_total_bill || c.estimatedCost;
        const settledAmt = c.formData?.fin_app_amt || (billAmt * 0.85);
        const utrNo = c.formData?.utr_no || c.formData?.set_utr_no || c.formData?.utr_number || c.formData?.utr || c.formData?.utrNumber;
        const claimNo = c.formData?.insurer_claim_no || c.id;
        const ipdNo = c.formData?.p_uhid || '';
        const rawFormData = JSON.stringify(c.formData || '').toLowerCase();
        
        // Try to find matching bank entry
        const matchingBankEntry = bankEntries.find(be => 
          be.utrNumber === utrNo || 
          (utrNo && be.description.includes(utrNo)) ||
          (be.utrNumber && utrNo && be.utrNumber.includes(utrNo))
        );

        const bankAmt = matchingBankEntry ? matchingBankEntry.amount : (c.formData?.set_incl_tds || 0);
        
        const discrepancies: ReconciliationDiscrepancy[] = [];
        
        if (settledAmt < billAmt * 0.7) {
          discrepancies.push({
            type: 'Short Settlement',
            severity: 'High',
            description: 'Settlement is less than 70% of the total bill.',
            amount: billAmt - settledAmt
          });
        }
        
        if (bankAmt > 0 && Math.abs(settledAmt - bankAmt) > 1) {
          discrepancies.push({
            type: 'Payment Mismatch',
            severity: 'Medium',
            description: `Bank credit (₹${bankAmt.toLocaleString()}) does not match the approved settlement amount (₹${settledAmt.toLocaleString()}).`,
            amount: Math.abs(settledAmt - bankAmt)
          });
        }

        if (bankAmt === 0 && utrNo) {
          discrepancies.push({
            type: 'Missing Entry',
            severity: 'Medium',
            description: 'UTR found in portal but no matching bank entry found.',
            amount: settledAmt
          });
        }

        return {
          id: `REP-${c.id}`,
          claimId: c.id,
          patientName: c.patientName,
          hospitalBill: billAmt,
          insuranceSettlement: settledAmt,
          bankPayment: bankAmt,
          deductions: billAmt - settledAmt,
          utrNo: utrNo || '',
          claimNo: claimNo || '',
          ipdNo: ipdNo || '',
          discrepancies,
          status: bankAmt > 0 && discrepancies.length === 0 ? 'Matched' : (bankAmt > 0 || utrNo ? 'Discrepancy' : 'Pending'),
          reconciledAt: new Date().toISOString(),
          rawFormData
        };
      });
  }, [claims, bankEntries]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Simulate parsing bank statement
    setTimeout(() => {
      const mockBankEntries: BankEntry[] = [
        {
          id: 'BE-001',
          date: '2024-03-15',
          amount: 45000,
          utrNumber: 'N123456789',
          description: 'NEFT INWARD: STAR HEALTH SETTLEMENT'
        },
        {
          id: 'BE-002',
          date: '2024-03-16',
          amount: 125000,
          utrNumber: 'UTR987654321',
          description: 'RTGS: HDFC ERGO GENERAL INSURANCE'
        },
        {
          id: 'BE-003',
          date: '2024-03-17',
          amount: 8500,
          utrNumber: 'N555444333',
          description: 'NEFT: ICICI LOMBARD'
        },
        {
          id: 'BE-004',
          date: '2024-03-18',
          amount: 15000,
          utrNumber: 'UTR000999888',
          description: 'NEFT: UNIDENTIFIED PAYMENT'
        },
        {
          id: 'BE-005',
          date: '2024-03-19',
          amount: 62000,
          utrNumber: 'N777888999',
          description: 'NEFT: RELIANCE GENERAL'
        },
        {
          id: 'BE-006',
          date: '2024-03-20',
          amount: 28500,
          utrNumber: 'UTR111222333',
          description: 'RTGS: ADITYA BIRLA HEALTH'
        },
        {
          id: 'BE-007',
          date: '2024-03-21',
          amount: 12000,
          utrNumber: 'N444555666',
          description: 'NEFT: UNKNOWN SOURCE REF 444'
        }
      ];
      
      setBankEntries(mockBankEntries);
      
      const matchedList: { utr: string; amount: number; patient: string }[] = [];
      const unidentifiedList: { utr: string; amount: number; description: string }[] = [];

      claims.forEach(c => {
        const utrNo = c.formData?.utr_no || c.formData?.set_utr_no;
        if (!utrNo) return;
        
        const matchingEntry = mockBankEntries.find(be => 
          be.utrNumber === utrNo || be.description.includes(utrNo)
        );

        if (matchingEntry) {
          matchedList.push({
            utr: utrNo,
            amount: matchingEntry.amount,
            patient: c.patientName
          });
        }
      });

      mockBankEntries.forEach(be => {
        const isMatched = claims.some(c => {
          const utrNo = c.formData?.utr_no || c.formData?.set_utr_no;
          return utrNo && (be.utrNumber === utrNo || be.description.includes(utrNo));
        });

        if (!isMatched && be.utrNumber) {
          unidentifiedList.push({
            utr: be.utrNumber,
            amount: be.amount,
            description: be.description
          });
        }
      });

      const notMatchedCount = claims.filter(c => {
        const utrNo = c.formData?.utr_no || c.formData?.set_utr_no;
        return utrNo && !mockBankEntries.some(be => be.utrNumber === utrNo || be.description.includes(utrNo));
      }).length;

      setReconciliationResults({
        utrFound: mockBankEntries.filter(be => be.utrNumber).length,
        matched: matchedList.length,
        notMatched: notMatchedCount,
        unidentified: unidentifiedList.length,
        matchedList,
        unidentifiedList
      });

      setIsUploading(false);
      setShowResultsModal(true);
      setActiveTab('Overview');
    }, 1500);
  };

  const filteredReports = reports.filter(r => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = r.patientName.toLowerCase().includes(searchLower) || 
                          r.claimId.toLowerCase().includes(searchLower) ||
                          (r.utrNo || '').toLowerCase().includes(searchLower) ||
                          (r.claimNo || '').toLowerCase().includes(searchLower) ||
                          (r.ipdNo || '').toLowerCase().includes(searchLower) ||
                          (r.rawFormData || '').includes(searchLower);
    
    return (activeTab === 'Overview' || 
     (activeTab === 'Matched' && r.status === 'Matched') || 
     (activeTab === 'Discrepancies' && r.status === 'Discrepancy') ||
     (activeTab === 'Pending' && r.status === 'Pending')) &&
     matchesSearch;
  });

  const stats = useMemo(() => {
    const matchedReports = reports.filter(r => r.status === 'Matched');
    const discrepancyReports = reports.filter(r => r.status === 'Discrepancy');
    
    return {
      total: reports.length,
      matched: matchedReports.length,
      discrepancies: discrepancyReports.length,
      totalHospitalBill: reports.reduce((acc, r) => acc + r.hospitalBill, 0),
      totalInsuranceApproved: reports.reduce((acc, r) => acc + r.insuranceSettlement, 0),
      totalBankPaid: reports.reduce((acc, r) => acc + r.bankPayment, 0),
      // Amount that is actually matched in bank
      reconciledAmount: matchedReports.reduce((acc, r) => acc + r.bankPayment, 0),
      // Total value of discrepancies
      discrepancyValue: discrepancyReports.reduce((acc, r) => {
        return acc + r.discrepancies.reduce((dAcc, d) => dAcc + d.amount, 0);
      }, 0)
    };
  }, [reports]);

  return (
    <div className="p-8 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <ArrowRightLeft size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Account Reconciliation</h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Three-Way Matching: Bill vs Approval vs Bank</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-slate-700 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload Bank Statement'}
            </button>
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
              <Zap size={14} fill="currentColor" /> Run Auto-Match
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><BarChart3 size={20} /></div>
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">+12%</span>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Reconciled</p>
            <h3 className="text-2xl font-black text-slate-800">₹{(stats.reconciledAmount / 100000).toFixed(1)}L</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><CheckCircle2 size={20} /></div>
              <span className="text-[10px] font-black text-slate-400">Success Rate</span>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Matched Cases</p>
            <h3 className="text-2xl font-black text-slate-800">{((stats.matched / stats.total) * 100 || 0).toFixed(0)}%</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><AlertTriangle size={20} /></div>
              <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">{stats.discrepancies} Alert</span>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Discrepancy Amount</p>
            <h3 className="text-2xl font-black text-slate-800">₹{(stats.discrepancyValue / 1000).toFixed(1)}K</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><TrendingUp size={20} /></div>
              <span className="text-[10px] font-black text-indigo-400">Efficiency</span>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Avg. TAT</p>
            <h3 className="text-2xl font-black text-slate-800">4.2 Days</h3>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                {['Overview', 'Matched', 'Discrepancies', 'Bank Statement'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTab === tab 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search Claim, UTR, IPD..." 
                  className="pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all w-full lg:w-80"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'Bank Statement' ? (
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5">Description</th>
                    <th className="px-8 py-5">UTR / NEFT Reference</th>
                    <th className="px-8 py-5">Amount</th>
                    <th className="px-8 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-xs font-bold text-slate-600">{entry.date}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-slate-800">{entry.description}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-mono font-bold text-indigo-600">{entry.utrNumber || 'N/A'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-emerald-600">₹{entry.amount.toLocaleString()}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="text-[10px] font-black text-rose-600 uppercase hover:underline flex items-center gap-1 ml-auto">
                          <X size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bankEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                            <FileSpreadsheet size={32} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-400">No bank entries uploaded</p>
                            <p className="text-xs font-bold text-slate-300">Upload a bank statement to start reconciliation</p>
                          </div>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 bg-indigo-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md"
                          >
                            Upload Now
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Claim Details</th>
                    <th className="px-8 py-5">Hospital Bill</th>
                    <th className="px-8 py-5">Insurance Approval</th>
                    <th className="px-8 py-5">Bank Payment</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">{report.patientName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{report.claimId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-slate-700">₹{report.hospitalBill.toLocaleString()}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-indigo-600">₹{report.insuranceSettlement.toLocaleString()}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-emerald-600">
                          {report.bankPayment > 0 ? `₹${report.bankPayment.toLocaleString()}` : 'Pending'}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border w-fit ${
                            report.status === 'Matched' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : report.status === 'Discrepancy'
                                ? 'bg-rose-50 text-rose-600 border-rose-100'
                                : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                            {report.status}
                          </span>
                          {report.discrepancies.length > 0 && (
                            <p className="text-[9px] font-bold text-rose-400 italic">
                              {report.discrepancies[0].type}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => navigate(`/process-claim/${report.claimId}`, { state: { from: '/reconciliation' } })}
                          className="text-[10px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-1 ml-auto"
                        >
                          View Details <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                            <Search size={32} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-400">No reconciliation records found</p>
                            <p className="text-xs font-bold text-slate-300">Try adjusting your search or filters</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-900/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10">
            <h4 className="text-lg font-black uppercase tracking-tight mb-2">Smart Reconciliation AI</h4>
            <p className="text-indigo-200 text-xs font-medium max-w-md">
              Our AI engine automatically matches bank UTRs with insurance settlement letters. 
              Matched cases are automatically marked as 'Settled' in the registry.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">System Integrity</p>
              <p className="text-sm font-black">99.9% Accurate</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-300 border border-white/10">
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>

      </div>

      {/* Reconciliation Results Modal */}
      {showResultsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 bg-indigo-50/50 flex-shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <ShieldCheck size={24} />
                </div>
                <button 
                  onClick={() => setShowResultsModal(false)}
                  className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Reconciliation Analysis</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Detailed Bank Statement Breakdown</p>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto flex-grow custom-scrollbar">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Total UTRs</p>
                  <p className="text-xl font-black text-slate-800">{reconciliationResults.utrFound}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-emerald-600 text-[9px] font-black uppercase tracking-widest mb-1">Matched</p>
                  <p className="text-xl font-black text-emerald-700">{reconciliationResults.matched}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                  <p className="text-rose-600 text-[9px] font-black uppercase tracking-widest mb-1">Not Matched</p>
                  <p className="text-xl font-black text-rose-700">{reconciliationResults.notMatched}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-amber-600 text-[9px] font-black uppercase tracking-widest mb-1">Unidentified</p>
                  <p className="text-xl font-black text-amber-700">{reconciliationResults.unidentified}</p>
                </div>
              </div>

              {/* Detailed Lists */}
              <div className="space-y-6">
                {reconciliationResults.matchedList.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Successfully Matched
                    </h4>
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-slate-100/50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-2">Patient</th>
                            <th className="px-4 py-2">UTR Number</th>
                            <th className="px-4 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reconciliationResults.matchedList.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 font-bold text-slate-700">{item.patient}</td>
                              <td className="px-4 py-2 font-mono text-indigo-600">{item.utr}</td>
                              <td className="px-4 py-2 text-right font-black text-emerald-600">₹{item.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {reconciliationResults.unidentifiedList.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-500" /> Unidentified Payments (Ghost Credits)
                    </h4>
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-slate-100/50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-2">Description</th>
                            <th className="px-4 py-2">UTR Number</th>
                            <th className="px-4 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reconciliationResults.unidentifiedList.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 font-bold text-slate-700 truncate max-w-[150px]">{item.description}</td>
                              <td className="px-4 py-2 font-mono text-amber-600">{item.utr}</td>
                              <td className="px-4 py-2 text-right font-black text-slate-800">₹{item.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-indigo-900 text-white p-6 rounded-3xl relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">Analysis Insight</p>
                  <p className="text-xs font-medium leading-relaxed">
                    The system successfully reconciled {reconciliationResults.matched} claims. 
                    We found {reconciliationResults.unidentified} payments that aren't mapped to any claim—these might be advance payments or settlements for claims not yet in the registry.
                  </p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex-shrink-0">
              <button 
                onClick={() => setShowResultsModal(false)}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                Close Analysis & Sync Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationSystem;
