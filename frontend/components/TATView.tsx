
import React, { useEffect, useMemo, useState } from 'react';
import { Claim, ClaimStatus } from '../types';
import { Timer, Clock, ArrowUpRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatClaimTAT, getClaimStageStartTime, parseDate } from '../utils';

interface TATViewProps {
  claims: Claim[];
}

const TATView: React.FC<TATViewProps> = ({ claims }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const tatMetrics = useMemo(() => {
    const activeClaims = claims.filter((claim) => ![
      ClaimStatus.SETTLED,
      ClaimStatus.COMPLETE_SETTLEMENT,
      ClaimStatus.REJECTED,
      ClaimStatus.MEDICAL_REJECTED,
    ].includes(claim.status));
    const averageHours = activeClaims.length
      ? activeClaims.reduce((total, claim) => total + Math.max(0, now.getTime() - parseDate(getClaimStageStartTime(claim)).getTime()), 0) / activeClaims.length / 3_600_000
      : 0;
    const countBy = (statuses: ClaimStatus[]) => claims.filter((claim) => statuses.includes(claim.status)).length;
    const displayHours = (hours: number) => hours >= 24 ? `${(hours / 24).toFixed(1)} days` : `${hours.toFixed(1)} hrs`;

    return [
      { label: 'Active Stage TAT', time: displayHours(averageHours), icon: Clock, color: 'blue', trend: `${activeClaims.length} active`, status: activeClaims.length ? 'Live' : 'No active cases' },
      { label: 'Medical Review Queue', time: `${countBy([ClaimStatus.PENDING_MEDICAL_REVIEW, ClaimStatus.MEDICAL_QUERY_RAISED])} cases`, icon: Timer, color: 'amber', trend: 'Live queue', status: 'Live' },
      { label: 'Pre-Auth Queue', time: `${countBy([ClaimStatus.PRE_AUTH_INITIATED, ClaimStatus.INITIAL_QUERY_PENDING, ClaimStatus.ENHANCEMENT_INITIATED])} cases`, icon: AlertTriangle, color: 'indigo', trend: 'Live queue', status: 'Live' },
      { label: 'Completed Claims', time: `${countBy([ClaimStatus.SETTLED, ClaimStatus.COMPLETE_SETTLEMENT])} cases`, icon: CheckCircle, color: 'emerald', trend: 'Actual data', status: 'Completed' },
    ];
  }, [claims, now]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">TAT Tracking (Turnaround Time)</h1>
        <p className="text-slate-500">Monitor processing efficiency and bottleneck analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tatMetrics.map((metric) => (
          <div key={metric.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-${metric.color}-50 text-${metric.color}-600`}>
              <metric.icon size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{metric.time}</span>
              <span className={`text-[10px] font-bold ${metric.trend.startsWith('+') ? 'text-rose-500' : 'text-emerald-500'}`}>{metric.trend}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${metric.status === 'Delayed' ? 'text-amber-600' : 'text-emerald-600'}`}>{metric.status}</span>
              <ArrowUpRight size={14} className="text-slate-300" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Processing Timeline Breakdown</h3>
        </div>
        <div className="p-8 space-y-3">
          {claims.length === 0 ? <p className="text-sm text-slate-400">No claims available for TAT tracking.</p> : claims.slice(0, 8).map((claim) => (
            <div key={claim.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
              <div><p className="font-bold text-slate-800">{claim.patientName || 'Unnamed patient'}</p><p className="text-xs text-slate-400">{claim.status}</p></div>
              <span className="font-black text-blue-600">{formatClaimTAT(claim, now)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TATView;
