import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Users, Calendar, Clock, BarChart3, 
  Target, Award, User, ChevronRight, ArrowUpRight, 
  ArrowDownRight, Filter, Search, CheckCircle2,
  FileText, Activity, IndianRupee, ShieldAlert, Award as AwardIcon, Sparkles, LayoutGrid, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HospitalUser, Claim, ClaimStatus, Product } from '../types';
import { format } from 'date-fns';

interface PerformanceTrackingDashboardProps {
  users: HospitalUser[];
  claims: Claim[];
  currentUser: HospitalUser;
}

// Recursive helper to get all direct/indirect reporting user IDs
const getReportingUsers = (managerId: string, allUsers: HospitalUser[]): string[] => {
  const directIds = allUsers.filter(u => u && u.reportsToId === managerId).map(u => u.id);
  let indirectIds: string[] = [];
  directIds.forEach(id => {
    indirectIds = [...indirectIds, ...getReportingUsers(id, allUsers)];
  });
  return [...directIds, ...indirectIds];
};

const PerformanceTrackingDashboard: React.FC<PerformanceTrackingDashboardProps> = ({ users = [], claims = [], currentUser }) => {
  // Determine manageable users (whichever team is reporting to this user direct or indirect)
  const manageableUsers = useMemo(() => {
    if (!currentUser) return [];
    const roleUpper = currentUser.role?.toUpperCase() || '';
    const isHighLevel = ['SUPER ADMIN', 'PRIMARY ADMIN', 'SALES HEAD', 'OPERATIONS HEAD'].includes(roleUpper);
    
    if (isHighLevel) {
      return users.filter(u => u && u.id !== currentUser.id);
    }
    
    const reporteeIds = getReportingUsers(currentUser.id, users);
    // Include only actual reportee teammates (excluding current user)
    return users.filter(u => u && u.id !== currentUser.id && reporteeIds.includes(u.id));
  }, [users, currentUser]);

  const userAllowedProducts = useMemo(() => {
    if (currentUser?.products && currentUser.products.length > 0) {
      return currentUser.products;
    }
    return Object.values(Product);
  }, [currentUser]);

  const [selectedProduct, setSelectedProduct] = useState<string>(() => {
    if (currentUser?.products && currentUser.products.length === 1) {
      return currentUser.products[0];
    }
    return 'All';
  });

  const [selectedUser, setSelectedUser] = useState<HospitalUser | null>(() => {
    const isHighLevel = ['SUPER ADMIN', 'PRIMARY ADMIN', 'SALES HEAD', 'OPERATIONS HEAD'].includes(currentUser?.role?.toUpperCase() || '');
    const hasReportees = users.some(u => u && u.reportsToId === currentUser?.id);
    return (isHighLevel || hasReportees) ? null : currentUser;
  });

  const [viewMode, setViewMode] = useState<'team' | 'individual'>(() => {
    const isHighLevel = ['SUPER ADMIN', 'PRIMARY ADMIN', 'SALES HEAD', 'OPERATIONS HEAD'].includes(currentUser?.role?.toUpperCase() || '');
    const hasReportees = users.some(u => u && u.reportsToId === currentUser?.id);
    return (isHighLevel || hasReportees) ? 'team' : 'individual';
  });

  const [searchTerm, setSearchTerm] = useState('');

  const allowedClaims = useMemo(() => {
    if (currentUser?.products && currentUser.products.length > 0) {
      return claims.filter(c => c && currentUser.products.includes(c.product as Product));
    }
    return claims;
  }, [claims, currentUser]);

  // Performance calculation helper for any team member, scoped by selected product
  const calculatePerformance = (userId: string, period: 'day' | 'week' | 'month' | 'year', prodFilter: string = selectedProduct) => {
    const now = new Date();
    const startTime = new Date();

    if (period === 'day') startTime.setHours(0, 0, 0, 0);
    else if (period === 'week') startTime.setDate(now.getDate() - 7);
    else if (period === 'month') startTime.setMonth(now.getMonth() - 1);
    else if (period === 'year') startTime.setFullYear(now.getFullYear() - 1);

    let userClaims = allowedClaims.filter(c => c && (c.createdBy === userId || c.assignedOpsUserId === userId || c.assignedCrmUserId === userId || c.assignedReconUserId === userId || c.assignedMedicalUserId === userId));
    
    if (prodFilter !== 'All') {
      userClaims = userClaims.filter(c => c.product === prodFilter);
    }

    const periodClaims = userClaims.filter(c => {
      const claimDate = new Date(c.createdAt);
      return claimDate >= startTime;
    });

    const settledClaims = periodClaims.filter(c => 
      [ClaimStatus.COMPLETE_SETTLEMENT, ClaimStatus.BANK_RECONCILIATION_COMPLETED, ClaimStatus.ACCOUNT_RECONCILIATION, ClaimStatus.SETTLED].includes(c.status)
    );

    const amountSettled = settledClaims.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const turnaroundTime = periodClaims.length > 0 ? 
      periodClaims.reduce((sum, c) => {
        const created = new Date(c.createdAt).getTime();
        const updated = new Date(c.updatedAt).getTime();
        return sum + (updated - created);
      }, 0) / periodClaims.length / (1000 * 60 * 60 * 24) : 0;

    return {
      total: periodClaims.length,
      settled: settledClaims.length,
      successRate: periodClaims.length > 0 ? Math.round((settledClaims.length / periodClaims.length) * 100) : 0,
      amount: amountSettled,
      avgTAT: Math.round(turnaroundTime * 10) / 10
    };
  };

  // Filter manageable users based on team search and product configuration
  const filteredUsers = useMemo(() => {
    return manageableUsers.filter(u => {
      if (!u) return false;
      const nameMatch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.role || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!nameMatch) return false;

      if (selectedProduct !== 'All') {
        const hasProd = u.products?.includes(selectedProduct as Product);
        const hasClaimWithProd = allowedClaims.some(c => c && (c.createdBy === u.id || c.assignedOpsUserId === u.id) && c.product === selectedProduct);
        return hasProd || hasClaimWithProd;
      }
      return true;
    });
  }, [manageableUsers, searchTerm, selectedProduct, allowedClaims]);

  // Aggregate stats across the entire reporting team
  const teamStats = useMemo(() => {
    const userIds = manageableUsers.map(u => u.id);
    let teamClaims = allowedClaims.filter(c => c && (
      userIds.includes(c.createdBy || '') || 
      userIds.includes(c.assignedOpsUserId || '') ||
      userIds.includes(c.assignedCrmUserId || '') ||
      userIds.includes(c.assignedReconUserId || '') ||
      userIds.includes(c.assignedMedicalUserId || '')
    ));

    if (selectedProduct !== 'All') {
      teamClaims = teamClaims.filter(c => c.product === selectedProduct);
    }

    const settledClaims = teamClaims.filter(c => 
      [ClaimStatus.COMPLETE_SETTLEMENT, ClaimStatus.BANK_RECONCILIATION_COMPLETED, ClaimStatus.ACCOUNT_RECONCILIATION, ClaimStatus.SETTLED].includes(c.status)
    );

    const totalAmount = settledClaims.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const avgTAT = teamClaims.length > 0 ? 
      teamClaims.reduce((sum, c) => {
        const created = new Date(c.createdAt).getTime();
        const updated = new Date(c.updatedAt).getTime();
        return sum + (updated - created);
      }, 0) / teamClaims.length / (1000 * 60 * 60 * 24) : 0;

    return {
      total: teamClaims.length,
      settled: settledClaims.length,
      successRate: teamClaims.length > 0 ? Math.round((settledClaims.length / teamClaims.length) * 100) : 0,
      amount: totalAmount,
      avgTAT: Math.round(avgTAT * 10) / 10
    };
  }, [manageableUsers, allowedClaims, selectedProduct]);

  // Top 5 rank list based on monthly tracking
  const topPerformers = useMemo(() => {
    const perfMap = filteredUsers.map(u => {
      const perf = calculatePerformance(u.id, 'month');
      return { ...u, ...perf };
    });

    return perfMap
      .filter(u => u.total > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredUsers, allowedClaims, selectedProduct]);

  const handleSelectUser = (user: HospitalUser) => {
    setSelectedUser(user);
    setViewMode('individual');
  };

  const handleResetToTeam = () => {
    setSelectedUser(null);
    setViewMode('team');
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen space-y-8">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Activity className="text-blue-600" size={32} />
            Operations & Performance Hub
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Tracking team operations, workloads, and real-time execution parameters
          </p>
        </div>

        {/* Filters and View Toggles */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Operations View Tabs */}
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={handleResetToTeam}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                viewMode === 'team'
                  ? 'bg-white text-blue-600 shadow-md shadow-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={13} />
              Operations View (Team)
            </button>
            <button
              disabled={!selectedUser}
              onClick={() => setViewMode('individual')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                viewMode === 'individual'
                  ? 'bg-white text-blue-600 shadow-md shadow-slate-200/80'
                  : 'text-slate-400 disabled:opacity-50'
              }`}
            >
              <User size={13} />
              Drilldown View
            </button>
          </div>

          {/* User Product Filter */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Product :</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-black text-[#000080] focus:ring-0 cursor-pointer"
            >
              {userAllowedProducts.length > 1 && <option value="All">All Allowed Products</option>}
              {userAllowedProducts.map(prod => (
                <option key={prod} value={prod}>{prod}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Team Reporting Directory */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Users className="text-blue-500" size={16} />
                Subordinate Hierarchy
              </h2>
              <span className="text-[9px] font-extrabold px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-500">
                {manageableUsers.length} total
              </span>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search staff members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredUsers.map(u => {
                const isActive = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left p-3 rounded-2xl flex items-center justify-between border transition-all group ${
                      isActive 
                        ? 'bg-blue-50/70 border-blue-200/80' 
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {(u.displayName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-black text-slate-800 truncate uppercase tracking-tight">{u.displayName}</p>
                        <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">{u.role || 'Process Associate'}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className={isActive ? 'text-blue-600' : 'text-slate-300 group-hover:translate-x-0.5 transition-transform'} />
                  </button>
                );
              })}
              {filteredUsers.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-400 italic">No subordinates match filters</p>
                </div>
              )}
            </div>
          </div>

          {/* High Performers Rank List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Award className="text-amber-500" size={16} />
                Top Performers
              </h3>
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Monthly</span>
            </div>

            <div className="space-y-3">
              {topPerformers.map((u, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50/50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-100 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase">{u.displayName}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#000080]">₹{(u.amount / 100000).toFixed(1)}L</p>
                    <p className="text-[9px] text-emerald-600 font-bold">{u.successRate}% Acc</p>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">No benchmark records found</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Primary Display Canvas */}
        <div className="lg:col-span-8 xl:col-span-9">
          <AnimatePresence mode="wait">
            {viewMode === 'team' ? (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Operations Summary Header */}
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/15 transition-all duration-1000"></div>
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 font-black text-[9px] uppercase tracking-[0.3em]">
                      <Sparkles size={14} className="animate-pulse" /> Operations Summary Overview
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                      Aggregate Team Performance
                    </h2>
                    <p className="text-slate-400 text-sm font-medium max-w-xl">
                      Real-time aggregation of operational metrics for {selectedProduct === 'All' ? 'all modules' : selectedProduct}. Ensure service levels remain aligned with institutional benchmarks.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Team Cases</p>
                        <p className="text-lg font-black text-white">{teamStats.total}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Settled Resolution</p>
                        <p className="text-lg font-black text-emerald-400">{teamStats.settled}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Turnaround Time (Avg)</p>
                        <p className="text-lg font-black text-blue-400">{teamStats.avgTAT} <span className="text-[10px] text-slate-400">Days</span></p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Assets Settled</p>
                        <p className="text-lg font-black text-white">₹{(teamStats.amount / 100000).toFixed(1)}L</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Workload & Detailed Table */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                        Workload Breakdown & Effectiveness
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold mt-1">Detailed productivity breakdown of users reporting under this operation view</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Member</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Assigned Products</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Cases</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Avg TAT</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Settled Amount</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Success Acc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {manageableUsers.map(u => {
                          const p = calculatePerformance(u.id, 'month');
                          return (
                            <tr 
                              key={u.id}
                              onClick={() => handleSelectUser(u)}
                              className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                            >
                              <td className="py-4 font-bold text-xs text-slate-800 group-hover:text-blue-600">
                                <span className="uppercase">{u.displayName}</span>
                                <p className="text-[9px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">{u.role || 'Associate'}</p>
                              </td>
                              <td className="py-4">
                                <div className="flex flex-wrap gap-1">
                                  {u.products && u.products.length > 0 ? (
                                    u.products.map(prod => (
                                      <span key={prod} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase tracking-widest">
                                        {prod}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[9px] text-slate-400 italic">No products mapped</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 text-center font-bold text-slate-700 text-xs">
                                {p.total}
                              </td>
                              <td className="py-4 text-center font-semibold text-slate-600 text-xs">
                                {p.avgTAT}d
                              </td>
                              <td className="py-4 text-right font-black text-[#000080] text-xs">
                                ₹{(p.amount / 100000).toFixed(2)}L
                              </td>
                              <td className="py-4 text-right">
                                <span className={`px-2 py-1 text-[9px] font-black rounded-lg ${
                                  p.successRate >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  p.successRate >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  'bg-slate-50 text-slate-500'
                                }`}>
                                  {p.successRate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              selectedUser && (
                <motion.div
                  key="individual"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8"
                >
                  {/* Selected User Hero Frame */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <button 
                      onClick={handleResetToTeam}
                      className="absolute top-6 right-6 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-slate-200"
                    >
                      <RotateCcw size={13} />
                      Back to Team View
                    </button>

                    <div className="flex items-center gap-6 mb-8 mt-4">
                      <div className="w-16 h-16 rounded-full bg-blue-600 shadow-md flex items-center justify-center text-white text-3xl font-black">
                        {(selectedUser.displayName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{selectedUser.displayName}</h2>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="px-2.5 py-1 bg-[#e8e9ff] text-[#523cf2] rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {selectedUser.role || 'Executive Developer'}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase">
                            <Clock size={13} /> Joined {selectedUser.createdAt ? format(new Date(selectedUser.createdAt), 'MMM yyyy') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                      <QuickStat label="Cases (Filtered)" value={allowedClaims.filter(c => c && c.createdBy === selectedUser.id && (selectedProduct === 'All' || c.product === selectedProduct)).length} icon={FileText} />
                      <QuickStat label="Resolution Yield" value={`${calculatePerformance(selectedUser.id, 'month').successRate}%`} icon={Target} />
                      <QuickStat label="Avg Turnaround" value={`${calculatePerformance(selectedUser.id, 'month').avgTAT} days`} icon={Clock} />
                      <QuickStat label="Aggregate Value" value={`₹${(calculatePerformance(selectedUser.id, 'month').amount / 100000).toFixed(1)}L`} icon={IndianRupee} />
                    </div>
                  </div>

                  {/* Operational Timeline Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <PerformanceCard 
                      title="Daily Performance" 
                      perf={calculatePerformance(selectedUser.id, 'day')} 
                      icon={Calendar} 
                      subLabel="Today's live metric state"
                    />
                    <PerformanceCard 
                      title="Weekly Performance" 
                      perf={calculatePerformance(selectedUser.id, 'week')} 
                      icon={Clock} 
                      subLabel="Past 7 operating days"
                    />
                    <PerformanceCard 
                      title="Monthly Performance" 
                      perf={calculatePerformance(selectedUser.id, 'month')} 
                      icon={BarChart3} 
                      subLabel="Current fiscal month"
                    />
                    <PerformanceCard 
                      title="Yearly Performance" 
                      perf={calculatePerformance(selectedUser.id, 'year')} 
                      icon={TrendingUp} 
                      subLabel="Past 365 days aggregate"
                    />
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const QuickStat = ({ label, value, icon: Icon }: any) => (
  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
    <div className="flex items-center gap-2 mb-1.5">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-lg font-black text-[#000080]">{value}</p>
  </div>
);

const PerformanceCard = ({ title, perf, icon: Icon, subLabel }: any) => (
  <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow group">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{title}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{subLabel}</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-4">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total Cases</p>
          <p className="text-xl font-black text-slate-800">{perf.total}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Success Rate</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-black text-emerald-600">{perf.successRate}%</p>
            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500" 
                style={{ width: `${perf.successRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amt Settled</p>
          <p className="text-xl font-black text-[#000080]">₹{(perf.amount / 100000).toFixed(2)}L</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Avg TAT</p>
          <p className="text-xl font-black text-blue-600">{perf.avgTAT}d</p>
        </div>
      </div>
    </div>
  </div>
);

export default PerformanceTrackingDashboard;
