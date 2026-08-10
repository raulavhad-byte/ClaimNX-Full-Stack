
import React, { useState, useMemo } from 'react';
import { Claim, ClaimStatus, HospitalUser } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, LineChart, Line, Legend, ComposedChart
} from 'recharts';
import { 
  Activity, TrendingUp, Clock, AlertCircle, Calendar, 
  Filter, ChevronDown, ArrowUpRight, ArrowDownRight, 
  IndianRupee, Briefcase, Zap, Timer, Plus, LayoutDashboard, 
  ShieldCheck, BarChart3, PieChart as PieChartIcon, Hospital
} from 'lucide-react';

interface DashboardHubProps {
  claims: Claim[];
  currentUser: HospitalUser | null;
  users: HospitalUser[];
  permissions?: string[];
}

type DashboardType = 'Operations' | 'Recovery' | 'Management';

const DashboardHub: React.FC<DashboardHubProps> = ({ claims, currentUser, users, permissions = [] }) => {
  const canAccess = (key: string) => {
    if (permissions.includes('all')) return true;
    return permissions.includes(key);
  };

  const availableDashboards = useMemo(() => {
    const dashs: DashboardType[] = [];
    if (canAccess('dashboards:visibility:overview')) dashs.push('Operations');
    if (canAccess('dashboards:visibility:recon')) dashs.push('Recovery');
    if (canAccess('dashboards:visibility:mis')) dashs.push('Management');
    return dashs;
  }, [permissions]);

  const [activeDashboard, setActiveDashboard] = useState<DashboardType>(availableDashboards[0] || 'Operations');
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Set active dashboard to first available if current becomes unavailable
  React.useEffect(() => {
    if (availableDashboards.length > 0 && !availableDashboards.includes(activeDashboard)) {
      setActiveDashboard(availableDashboards[0]);
    }
  }, [availableDashboards]);

  const isManager = useMemo(() => {
    if (!users || !currentUser) return false;
    return users.some(u => u.reportsToId === currentUser?.id);
  }, [users, currentUser]);

  const getSubordinateIds = (managerId: string): string[] => {
    if (!users) return [];
    const subs = users.filter(u => u.reportsToId === managerId);
    let ids = subs.map(u => u.id);
    subs.forEach(s => {
      ids = [...ids, ...getSubordinateIds(s.id)];
    });
    return ids;
  };

  const accessibleClaims = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') return claims;

    const subordinateIds = getSubordinateIds(currentUser.id);
    
    if (isManager && viewMode === 'team') {
      if (selectedUser !== 'all') {
        return claims.filter(c => 
          c.assignedReconUserId === selectedUser || 
          c.assignedMedicalUserId === selectedUser || 
          c.assignedOpsUserId === selectedUser ||
          c.createdBy === selectedUser
        );
      }
      return claims.filter(c => 
        subordinateIds.includes(c.assignedReconUserId || '') || 
        subordinateIds.includes(c.assignedMedicalUserId || '') || 
        subordinateIds.includes(c.assignedOpsUserId || '') ||
        subordinateIds.includes(c.createdBy || '') ||
        c.assignedReconUserId === currentUser.id ||
        c.assignedMedicalUserId === currentUser.id ||
        c.assignedOpsUserId === currentUser.id ||
        c.createdBy === currentUser.id
      );
    }

    return claims.filter(c => 
      c.assignedReconUserId === currentUser.id || 
      c.assignedMedicalUserId === currentUser.id || 
      c.assignedOpsUserId === currentUser.id ||
      c.createdBy === currentUser.id
    );
  }, [claims, currentUser, users, isManager, viewMode, selectedUser]);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const getAgingDays = (admissionDate: string) => {
    const start = new Date(admissionDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAgingBucket = (days: number) => {
    if (days <= 30) return '0-30 Days';
    if (days <= 60) return '31-60 Days';
    if (days <= 90) return '61-90 Days';
    return 'Above 90 Days';
  };

  // --- OPERATIONS DATA ---
  const operationsData = useMemo(() => {
    const received = accessibleClaims.length;
    const pending = accessibleClaims.filter(c => c.status !== ClaimStatus.COMPLETE_SETTLEMENT && c.status !== ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE).length;
    const inQuery = accessibleClaims.filter(c => c.status.toLowerCase().includes('query')).length;
    
    const stageMap: Record<string, number> = {};
    accessibleClaims.forEach(c => {
      stageMap[c.status] = (stageMap[c.status] || 0) + 1;
    });
    
    const stageDistribution = Object.entries(stageMap).map(([name, value]) => ({ name, value }));

    return { received, pending, inQuery, stageDistribution };
  }, [accessibleClaims]);

  // --- RECOVERY DATA ---
  const recoveryData = useMemo(() => {
    const totalRecovery = accessibleClaims
      .filter(c => c.status === ClaimStatus.COMPLETE_SETTLEMENT || c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE)
      .reduce((acc, c) => acc + Number(c.formData?.set_incl_tds || 0), 0);
    
    const pendingRecovery = accessibleClaims
      .filter(c => c.status !== ClaimStatus.COMPLETE_SETTLEMENT && c.status !== ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE)
      .reduce((acc, c) => acc + Number(c.formData?.fin_app_amt || c.formData?.pre_auth_app_amt || c.estimatedCost || 0), 0);

    const insurerMap: Record<string, number> = {};
    accessibleClaims.forEach(c => {
      const amount = Number(c.formData?.set_incl_tds || 0);
      if (amount > 0) {
        insurerMap[c.insuranceProvider] = (insurerMap[c.insuranceProvider] || 0) + amount;
      }
    });
    const recoveryByInsurer = Object.entries(insurerMap).map(([name, value]) => ({ name, value }));

    const hospitalMap: Record<string, number> = {};
    accessibleClaims.forEach(c => {
      const amount = Number(c.formData?.set_incl_tds || 0);
      const hospital = c.formData?.hosp_name || 'Main Hospital';
      if (amount > 0) {
        hospitalMap[hospital] = (hospitalMap[hospital] || 0) + amount;
      }
    });
    const recoveryByHospital = Object.entries(hospitalMap).map(([name, value]) => ({ name, value }));

    return { totalRecovery, pendingRecovery, recoveryByInsurer, recoveryByHospital };
  }, [accessibleClaims]);

  // --- MANAGEMENT DATA ---
  const managementData = useMemo(() => {
    const agingMap: Record<string, number> = {
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      'Above 90 Days': 0
    };
    
    accessibleClaims.forEach(c => {
      if (c.status !== ClaimStatus.COMPLETE_SETTLEMENT && c.status !== ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE) {
        const days = getAgingDays(c.admissionDate);
        const bucket = getAgingBucket(days);
        agingMap[bucket]++;
      }
    });
    const agingDistribution = Object.entries(agingMap).map(([name, value]) => ({ name, value }));

    const highRiskClaims = accessibleClaims
      .filter(c => c.status !== ClaimStatus.COMPLETE_SETTLEMENT && c.status !== ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE)
      .map(c => ({
        ...c,
        aging: getAgingDays(c.admissionDate),
        amount: Number(c.formData?.fin_app_amt || c.formData?.pre_auth_app_amt || c.estimatedCost || 0)
      }))
      .filter(c => c.aging > 60 || c.amount > 500000)
      .sort((a, b) => b.aging - a.aging)
      .slice(0, 5);

    // Recovery Trends (Mocking some monthly data based on current claims)
    const trendMap: Record<string, number> = {};
    accessibleClaims.forEach(c => {
      if (c.status === ClaimStatus.COMPLETE_SETTLEMENT) {
        const date = new Date(c.formData?.settlement_date || c.updatedAt);
        const month = date.toLocaleString('default', { month: 'short' });
        trendMap[month] = (trendMap[month] || 0) + Number(c.formData?.set_incl_tds || 0);
      }
    });
    const recoveryTrends = Object.entries(trendMap).map(([name, value]) => ({ name, value }));

    return { agingDistribution, highRiskClaims, recoveryTrends };
  }, [accessibleClaims]);

  const COLORS = ['#000080', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight uppercase">Executive Command Center</h1>
          <p className="text-slate-500 text-xs lg:text-sm font-medium uppercase tracking-widest">Multi-Dimensional Performance Intelligence.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">


          <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner overflow-x-auto no-scrollbar">
            {availableDashboards.map(type => (
              <button 
                key={type}
                onClick={() => setActiveDashboard(type)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeDashboard === type ? 'bg-white text-[#000080] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {type} Dashboard
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeDashboard === 'Operations' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Claims Received" value={operationsData.received} icon={Briefcase} color="blue" />
            <StatCard label="Claims Pending" value={operationsData.pending} icon={Clock} color="amber" />
            <StatCard label="In Query Status" value={operationsData.inQuery} icon={AlertCircle} color="rose" />
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center">
              <PieChartIcon size={16} className="mr-2 text-blue-600" /> Stage Distribution
            </h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={operationsData.stageDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {operationsData.stageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeDashboard === 'Recovery' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard label="Total Recovery" value={formatCurrency(recoveryData.totalRecovery)} icon={IndianRupee} color="emerald" />
            <StatCard label="Pending Recovery" value={formatCurrency(recoveryData.pendingRecovery)} icon={TrendingUp} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center">
                <BarChart3 size={16} className="mr-2 text-emerald-600" /> Recovery by Insurer
              </h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recoveryData.recoveryByInsurer}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `₹${val/100000}L`} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center">
                <Hospital size={16} className="mr-2 text-blue-600" /> Recovery by Hospital
              </h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recoveryData.recoveryByHospital}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `₹${val/100000}L`} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="#000080" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeDashboard === 'Management' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center">
                <TrendingUp size={16} className="mr-2 text-indigo-600" /> Recovery Trends
              </h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={managementData.recoveryTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `₹${val/100000}L`} />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center">
                <Clock size={16} className="mr-2 text-amber-600" /> Outstanding Claims Aging
              </h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={managementData.agingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
              <AlertCircle size={16} className="mr-2 text-rose-600" /> High-Risk Claims (Aging &gt; 60 Days or Amount &gt; 5L)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Insurer</th>
                    <th className="px-6 py-4">Aging</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managementData.highRiskClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-800">{claim.patientName}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">{claim.insuranceProvider}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black ${claim.aging > 90 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                          {claim.aging} Days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-slate-800">{formatCurrency(claim.amount)}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{claim.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} flex flex-col justify-between h-40 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
        <Icon size={20} className="opacity-40" />
      </div>
      <h3 className="text-3xl font-black tracking-tighter">{value}</h3>
    </div>
  );
};

export default DashboardHub;
