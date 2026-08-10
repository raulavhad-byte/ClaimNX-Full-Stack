
import React, { useState, useMemo, useEffect } from 'react';
import { formatDate as utilsFormatDate, formatDateTime } from '../utils';
import { auditService } from '../services/auditService';
import { AuditLog } from '../types';
import { 
  Search, Filter, Clock, User, Activity, 
  FileText, ShieldCheck, LogIn, Database,
  ChevronDown, ChevronUp, ArrowRight, Calendar
} from 'lucide-react';

const AuditTrailView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const data = await auditService.getLogs();
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resourceId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'All' || log.resourceType === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [logs, searchTerm, typeFilter]);

  const getIcon = (type: AuditLog['resourceType']) => {
    switch (type) {
      case 'Auth': return <LogIn size={16} className="text-blue-500" />;
      case 'Claim': return <Activity size={16} className="text-indigo-500" />;
      case 'Document': return <FileText size={16} className="text-amber-500" />;
      case 'User': return <User size={16} className="text-purple-500" />;
      default: return <Database size={16} className="text-slate-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return {
      date: utilsFormatDate(dateStr),
      time: new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">System Audit Trail</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Compliance & Activity Monitoring</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-12 pr-10 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none w-full sm:w-48"
              >
                <option value="All">All Types</option>
                <option value="Auth">Authentication</option>
                <option value="Claim">Claims</option>
                <option value="Document">Documents</option>
                <option value="User">User Management</option>
                <option value="System">System</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource ID</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading audit records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const { date, time } = formatDate(log.timestamp);
                  const isExpanded = expandedLog === log.id;
                  
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{date}</span>
                            <span className="text-[10px] font-medium text-slate-400">{time}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase">
                              {log.userName?.slice(0, 2) || log.userId.slice(0, 2)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{log.userName || 'System'}</span>
                              <span className="text-[10px] font-medium text-slate-400">{log.userId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-800">{log.action}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getIcon(log.resourceType)}
                            <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{log.resourceType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{log.resourceId}</code>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-8 py-6 bg-slate-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-300">
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous State</h4>
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-[11px] font-mono text-slate-600 overflow-auto max-h-40">
                                  {log.previousValues ? (
                                    <pre>{JSON.stringify(log.previousValues, null, 2)}</pre>
                                  ) : (
                                    <span className="italic opacity-50">No previous state recorded</span>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New State</h4>
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-[11px] font-mono text-slate-600 overflow-auto max-h-40">
                                  {log.newValues ? (
                                    <pre>{JSON.stringify(log.newValues, null, 2)}</pre>
                                  ) : (
                                    <span className="italic opacity-50">No new state recorded</span>
                                  )}
                                </div>
                              </div>
                              {log.ipAddress && (
                                <div className="md:col-span-2 flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                                  <div className="flex items-center gap-1">
                                    <Activity size={12} /> IP: {log.ipAddress}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <ShieldCheck size={12} /> Verified Session
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 rounded-full text-slate-300"><Search size={32} /></div>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No audit logs found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailView;
