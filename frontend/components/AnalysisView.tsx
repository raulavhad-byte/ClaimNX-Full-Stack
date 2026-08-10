
import React, { useMemo } from 'react';
import { formatDate, formatDateTime } from '../utils';
import { Link } from 'react-router-dom';
import { Claim, ClaimStatus } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, ComposedChart, Legend, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Users, Activity, CreditCard, Clock, 
  AlertCircle, CheckCircle2, Calendar, ArrowUpRight, ArrowDownRight,
  Wallet, Landmark, Percent, FileBarChart
} from 'lucide-react';

interface AnalysisViewProps {
  claims: Claim[];
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ claims }) => {
  
  // --- CORE ANALYTICS LOGIC ---
  const analytics = useMemo(() => {
    const now = new Date();
    const dayMs = 1000 * 60 * 60 * 24;
    
    let totalFinalBillAmt = 0;
    let totalFinalAppAmt = 0;
    let totalSettledAmt = 0;
    let settledCount = 0;
    let partialCount = 0;
    let totalSettlementDays = 0;
    let totalOutstandingAmt = 0;
    
    // Time Series Data for Charts
    const monthlyData: Record<string, { 
      month: string, 
      billed: number,
      approved: number, 
      settled: number, 
      outstanding: number,
      sortDate: number 
    }> = {};
    
    // Aging Buckets for Outstanding
    const aging = { '0-30 Days': 0, '30-60 Days': 0, '60-90 Days': 0, '90+ Days': 0 };
    
    // Cash Flow Forecast Buckets
    const forecast = { week1: 0, days15: 0, days30: 0 };

    // Ledger Lists
    const recentSettlements: Claim[] = [];

    claims.forEach(c => {
      // 1. Extract Financials
      const finalBill = Number(c.formData?.dis_total_bill || c.estimatedCost || 0);
      const finalApp = Number(c.formData?.fin_app_amt || 0); // Approved by Insurer
      const settled = Number(c.formData?.set_incl_tds || 0); // Credited to Bank
      
      const disDate = new Date(c.formData?.dis_date || c.createdAt);
      const monthKey = formatDate(disDate).split('-').slice(1).join('-');
      const sortDate = new Date(disDate.getFullYear(), disDate.getMonth(), 1).getTime();

      // Initialize Monthly Bucket
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, billed: 0, approved: 0, settled: 0, outstanding: 0, sortDate };
      }

      // 2. Identify State
      const isSettled = c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE;
      const isApprovedPending = [
        ClaimStatus.DISCHARGE_APPROVED, 
        ClaimStatus.FILE_DISPATCH_PENDING, 
        ClaimStatus.FILE_DISPATCHED, 
        ClaimStatus.CLAIM_UNDER_PROCESS, 
        ClaimStatus.CLAIM_APPROVED,
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE
      ].includes(c.status);

      // 3. Aggregate Totals
      if (finalBill > 0) {
        monthlyData[monthKey].billed += finalBill;
        totalFinalBillAmt += finalBill;
      }

      if (isSettled) {
        monthlyData[monthKey].settled += settled;
        monthlyData[monthKey].approved += finalApp; // Add to approved for historical comparison
        
        totalSettledAmt += settled;
        totalFinalAppAmt += finalApp;
        settledCount++;
        recentSettlements.push(c);

        // Calc Settlement TAT using settlement_date if available, else updatedAt
        const setDate = c.formData?.settlement_date ? new Date(c.formData.settlement_date) : new Date(c.updatedAt);
        const tatDays = Math.floor((setDate.getTime() - disDate.getTime()) / dayMs);
        if (tatDays > 0) totalSettlementDays += tatDays;

        // Partial Payment Logic (< 98% of approved usually means deductions beyond TDS)
        if (finalApp > 0 && settled < (finalApp * 0.98)) {
          partialCount++;
        }
      } else if (isApprovedPending) {
        // Outstanding Logic
        // For outstanding, we use Final Approved Amount if available, else Estimate
        const outstandingVal = finalApp > 0 ? finalApp : (c.estimatedCost * 0.8); 
        
        monthlyData[monthKey].outstanding += outstandingVal;
        monthlyData[monthKey].approved += outstandingVal; // It is approved, just not settled
        totalOutstandingAmt += outstandingVal;
        totalFinalAppAmt += outstandingVal;

        // Aging Analysis
        const ageDays = Math.floor((now.getTime() - disDate.getTime()) / dayMs);
        if (ageDays <= 30) aging['0-30 Days'] += outstandingVal;
        else if (ageDays <= 60) aging['30-60 Days'] += outstandingVal;
        else if (ageDays <= 90) aging['60-90 Days'] += outstandingVal;
        else aging['90+ Days'] += outstandingVal;
      }
    });

    // 4. Calculate Averages
    const avgSettlementTat = settledCount > 0 ? Math.floor(totalSettlementDays / settledCount) : 0;

    // 5. Generate Forecast based on Avg TAT
    // Re-iterate pending claims to bucket them into forecast based on their current age vs Avg TAT
    claims.forEach(c => {
      const isApprovedPending = [
        ClaimStatus.DISCHARGE_APPROVED, 
        ClaimStatus.FILE_DISPATCH_PENDING, 
        ClaimStatus.FILE_DISPATCHED, 
        ClaimStatus.CLAIM_UNDER_PROCESS, 
        ClaimStatus.CLAIM_APPROVED, 
        ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE
      ].includes(c.status);

      if (isApprovedPending) {
        const disDate = new Date(c.formData?.dis_date || c.createdAt);
        const ageDays = Math.floor((now.getTime() - disDate.getTime()) / dayMs);
        const daysToSettle = avgSettlementTat - ageDays;
        const amount = Number(c.formData?.fin_app_amt || c.estimatedCost * 0.8);

        // Logic:
        // If it's already older than avg TAT, expect it very soon (Week 1)
        // If it's close to avg TAT, expect in Week 1 or 15 Days
        if (daysToSettle <= 7) forecast.week1 += amount;
        else if (daysToSettle <= 15) forecast.days15 += amount;
        else forecast.days30 += amount;
      }
    });

    // Sort Charts
    const monthlyTrends = Object.values(monthlyData).sort((a,b) => a.sortDate - b.sortDate);
    recentSettlements.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return {
      totalFinalBillAmt,
      totalFinalAppAmt,
      totalSettledAmt,
      totalOutstandingAmt,
      settledCount,
      partialRatio: settledCount > 0 ? ((partialCount / settledCount) * 100).toFixed(1) : '0.0',
      avgSettlementTat,
      // Ratio: How much of the Billed Amount was Approved? (Disallowance)
      approvalYieldRatio: totalFinalBillAmt > 0 ? ((totalFinalAppAmt / totalFinalBillAmt) * 100).toFixed(1) : '0.0',
      // Ratio: How much of the Approved Amount was Settled? (Recovery)
      recoveryRatio: (totalFinalAppAmt - totalOutstandingAmt) > 0 ? ((totalSettledAmt / (totalFinalAppAmt - totalOutstandingAmt)) * 100).toFixed(1) : '0.0', 
      monthlyTrends,
      agingData: Object.entries(aging).map(([name, value]) => ({ name, value })),
      forecast,
      recentSettlements: recentSettlements.slice(0, 8) 
    };
  }, [claims]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ROW 1: KEY RATIOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          label="Approval Yield" 
          subLabel="Final App / Final Bill"
          value={`${analytics.approvalYieldRatio}%`} 
          icon={FileBarChart} 
          color="indigo" 
          trend="Disallowance Check"
        />
        <MetricCard 
          label="Recovery Ratio" 
          subLabel="Settled / Approved"
          value={`${analytics.recoveryRatio}%`}
          icon={Percent} 
          color="emerald" 
          trend="Revenue Realized"
        />
        <MetricCard 
          label="Settlement TAT" 
          subLabel="Discharge to Credit"
          value={`${analytics.avgSettlementTat} Days`} 
          icon={Clock} 
          color="amber" 
          trend="Cycle Velocity"
        />
        <MetricCard 
          label="Partial Payment %" 
          subLabel="Cases with Deductions"
          value={`${analytics.partialRatio}%`} 
          icon={AlertCircle} 
          color="rose" 
          trend="Audit Required"
        />
      </div>

      {/* ROW 2: FINANCIAL TRENDS & FORECAST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Monthly Trend Chart */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Revenue Realization Trends</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Approved Amount vs Actual Settlement Credit</p>
            </div>
            <div className="flex gap-6">
               <div className="flex items-center text-[10px] font-bold text-slate-500"><div className="w-3 h-3 bg-[#000080] mr-2 rounded-sm"></div> Final Approved (Expected)</div>
               <div className="flex items-center text-[10px] font-bold text-slate-500"><div className="w-3 h-3 bg-emerald-500 mr-2 rounded-full"></div> Settled (Received)</div>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(value) => `₹${(value/100000).toFixed(1)}L`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '12px' }}
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                  labelStyle={{ fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}
                />
                <Bar dataKey="approved" name="Approved" fill="#000080" radius={[6, 6, 0, 0]} barSize={40} />
                <Line type="monotone" dataKey="settled" name="Settled" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff', stroke: '#10b981'}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecasting Widget & Aging */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex-1 group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <Landmark className="absolute -right-6 -bottom-6 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-700" size={140} />
              <div className="relative z-10">
                 <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center">
                    <Wallet size={20} className="mr-3 text-emerald-400" /> Cash Flow Forecast
                 </h3>
                 <div className="space-y-8">
                    <div>
                       <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center"><Clock size={12} className="mr-1" /> Expected this week</p>
                       <p className="text-4xl font-black tracking-tighter">₹{(analytics.forecast.week1).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/10">
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Next 15 Days</p>
                          <p className="text-xl font-bold">₹{(analytics.forecast.days15).toLocaleString('en-IN')}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">15-30 Days</p>
                          <p className="text-xl font-bold">₹{(analytics.forecast.days30).toLocaleString('en-IN')}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex-1">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Outstanding Aging</h3>
                 <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">Total: ₹{(analytics.totalOutstandingAmt/100000).toFixed(1)}L</span>
              </div>
              <div className="h-[140px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.agingData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                       <XAxis type="number" hide />
                       <YAxis dataKey="name" type="category" width={70} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} />
                       <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }} formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                       <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                          {analytics.agingData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#ef4444'} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>

      {/* ROW 3: SETTLEMENT LEDGER */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Newly Settled Ledger</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Credits & Deductions Analysis</p>
               </div>
            </div>
            <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-slate-50 transition-all flex items-center">
               <ArrowDownRight size={14} className="mr-2" /> Download Report
            </button>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
               <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                     <th className="px-8 py-5">Patient / Case Ref</th>
                     <th className="px-8 py-5">Approval Date</th>
                     <th className="px-8 py-5">Settlement Date</th>
                     <th className="px-8 py-5 text-right">Final Bill</th>
                     <th className="px-8 py-5 text-right">Approved Amt</th>
                     <th className="px-8 py-5 text-right">TDS (10%)</th>
                     <th className="px-8 py-5 text-right">Net Credited</th>
                     <th className="px-8 py-5 text-center">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                  {analytics.recentSettlements.map(claim => (
                     <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                           <div className="flex flex-col">
                              <Link to={`/process-claim/${claim.id}?source=mis`} className="text-xs font-black text-slate-800 hover:text-blue-600 transition-colors">{claim.patientName}</Link>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{claim.insuranceProvider}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-xs text-slate-500">{claim.formData?.dis_date || 'N/A'}</td>
                        <td className="px-8 py-5 text-xs text-slate-500">{formatDate(claim.updatedAt)}</td>
                        <td className="px-8 py-5 text-right font-medium text-slate-400">₹{(claim.formData?.dis_total_bill || 0).toLocaleString('en-IN')}</td>
                        <td className="px-8 py-5 text-right font-black text-slate-800">₹{(claim.formData?.fin_app_amt || 0).toLocaleString('en-IN')}</td>
                        <td className="px-8 py-5 text-right text-rose-500 text-xs">-₹{(claim.formData?.set_tds || 0).toLocaleString('en-IN')}</td>
                        <td className="px-8 py-5 text-right font-black text-emerald-600 text-base">₹{(claim.formData?.set_net_settled || 0).toLocaleString('en-IN')}</td>
                        <td className="px-8 py-5 text-center">
                           <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest">Settled</span>
                        </td>
                     </tr>
                  ))}
                  {analytics.recentSettlements.length === 0 && (
                     <tr>
                        <td colSpan={8} className="px-8 py-16 text-center text-slate-400 font-bold uppercase text-xs">No recent settlements found in registry</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
};

const MetricCard = ({ label, value, subLabel, icon: Icon, color, trend }: any) => {
  const styles: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };

  return (
    <div className={`p-6 rounded-[2rem] border bg-white shadow-sm hover:shadow-lg transition-all group`}>
       <div className="flex justify-between items-start mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${styles[color]} group-hover:scale-110 transition-transform shadow-inner`}>
             <Icon size={28} />
          </div>
          {trend && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">{trend}</span>}
       </div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
          <h3 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{value}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center"><Activity size={12} className="mr-1" /> {subLabel}</p>
       </div>
    </div>
  );
};

export default AnalysisView;
