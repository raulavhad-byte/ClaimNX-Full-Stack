
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatTAT } from '../utils';

interface PendingTATProps {
  startTime: string;
  completedTime?: string;
  type: 'crm' | 'medical' | 'kyp';
}

const PendingTAT: React.FC<PendingTATProps> = ({ startTime, completedTime, type }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (completedTime) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Keep operational dashboards live while a case is pending.
    
    return () => clearInterval(timer);
  }, [completedTime]);

  const calculateTAT = () => {
    if (!startTime) return { minutes: 0, text: '00:00', isExceeded: false, color: 'slate' };
    
    const start = new Date(startTime);
    const end = completedTime ? new Date(completedTime) : currentTime;
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const diffHrs = Math.floor(diffMins / 60);
    
    const timeText = formatTAT(startTime, completedTime ? completedTime : currentTime);
    
    let color = 'emerald';
    let isExceeded = false;

    if (type === 'crm') {
      // CRM: 15min target. 10m green, 10-15y, 15+r
      if (diffMins >= 15) {
        color = 'rose';
        isExceeded = true;
      } else if (diffMins >= 10) {
        color = 'amber';
      }
    } else if (type === 'medical') {
      // Medical: 20min target. 15m green, 15-20y, 20+r
      if (diffMins >= 20) {
        color = 'rose';
        isExceeded = true;
      } else if (diffMins >= 15) {
        color = 'amber';
      }
    } else if (type === 'kyp') {
      // KYP: 3h target. 2h green, 2-3h y, 3h+ r
      if (diffHrs >= 3) {
        color = 'rose';
        isExceeded = true;
      } else if (diffHrs >= 2) {
        color = 'amber';
      }
    }

    return { minutes: diffMins, text: timeText, isExceeded, color };
  };

  const tat = calculateTAT();
  const labelPrefix = completedTime ? 'Approved TAT' : 'Pending TAT';

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-[#B8860B] border-amber-100', // Dark yellow
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    slate: 'bg-slate-50 text-slate-500 border-slate-100'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm border ${colorClasses[tat.color]}`}>
      <Clock size={12} className={!completedTime && tat.isExceeded ? 'animate-pulse' : ''} />
      <span className="whitespace-nowrap">
        {tat.text}
      </span>
    </div>
  );
};

export default PendingTAT;
