
import React from 'react';
import { Claim } from '../types';
import { Timer, Clock, ArrowUpRight, CheckCircle, AlertTriangle } from 'lucide-react';

interface TATViewProps {
  claims: Claim[];
}

const TATView: React.FC<TATViewProps> = ({ claims }) => {
  // Mock TAT logic: normally would subtract admission/submission from approval date
  const tatMetrics = [
    { label: "Internal Processing", time: "1.2 hrs", icon: Clock, color: "blue", trend: "-15m", status: "Fast" },
    { label: "Insurer Response", time: "4.8 hrs", icon: Timer, color: "amber", trend: "+1.2h", status: "Delayed" },
    { label: "Query Resolution", time: "2.5 hrs", icon: AlertTriangle, color: "indigo", trend: "-30m", status: "Healthy" },
    { label: "Final Authorization", time: "0.8 hrs", icon: CheckCircle, color: "emerald", trend: "-5m", status: "Fast" },
  ];

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
        <div className="p-8">
          <div className="relative">
            <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 rounded-full"></div>
            <div className="relative flex justify-between">
              <TimelineStep label="Case Registered" time="10:00 AM" status="complete" />
              <TimelineStep label="AI Extraction" time="10:02 AM" status="complete" />
              <TimelineStep label="TPA Submitted" time="10:15 AM" status="complete" />
              <TimelineStep label="Insurer Query" time="1:45 PM" status="active" />
              <TimelineStep label="Approval" time="---" status="pending" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineStep = ({ label, time, status }: any) => {
  const colors: any = {
    complete: "bg-emerald-500 ring-emerald-100",
    active: "bg-blue-500 ring-blue-100 animate-pulse",
    pending: "bg-slate-200 ring-transparent",
  };
  return (
    <div className="flex flex-col items-center text-center space-y-3 z-10">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ${colors[status]} border-4 border-white`}>
        {status === 'complete' && <CheckCircle size={16} className="text-white" />}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-800">{label}</p>
        <p className="text-[10px] font-medium text-slate-400">{time}</p>
      </div>
    </div>
  );
};

export default TATView;
