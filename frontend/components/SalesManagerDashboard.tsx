import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  Target, 
  Calendar, 
  MapPin, 
  Plus, 
  Download, 
  Filter,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Briefcase,
  PieChart as PieChartIcon,
  BarChart3,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  FileText,
  LayoutDashboard,
  UserCheck,
  Map as MapIcon,
  Globe,
  ChevronDown,
  ArrowRight,
  Zap,
  ShieldAlert,
  BriefcaseMedical,
  TrendingDown,
  Layers,
  X,
  Bell,
  FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
  Scatter
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, isAfter, isBefore, addDays } from 'date-fns';
import { Claim, HospitalUser, SalesTarget, SalesVisit, SalesLead, SalesManagerDashboardData } from '../types';
import { salesService } from '../services/salesService';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface SalesManagerDashboardProps {
  claims: Claim[];
  hospitals: HospitalUser[];
  currentUser: HospitalUser;
  users: HospitalUser[];
}

const SalesManagerDashboard: React.FC<SalesManagerDashboardProps> = ({ claims, hospitals, currentUser, users }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'visits' | 'geography' | 'targets'>('overview');
  const [timeFilter, setTimeFilter] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom Range'>('Monthly');
  const [dateRange, setDateRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
  const [geoFilter, setGeoFilter] = useState({ zone: 'all', state: 'all', city: 'all' });
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [visits, setVisits] = useState<SalesVisit[]>([]);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newTarget, setNewTarget] = useState<{
    userId: string;
    period: 'Monthly' | 'Quarterly' | 'Yearly';
    year: number;
    month: number;
    targetAmount: number;
    cashlessTarget: number;
    reimbursementTarget: number;
    onboardingTarget: number;
    type: 'Revenue' | 'Onboarding' | 'Product-wise';
  }>({
    userId: '',
    period: 'Monthly',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    targetAmount: 0,
    cashlessTarget: 0,
    reimbursementTarget: 0,
    onboardingTarget: 0,
    type: 'Revenue'
  });

  // Access Control: Manager can only view their assigned geography
  const isSuperAdmin = currentUser.isAdmin || currentUser.role === 'Super Admin';
  
  const hospitalMap = useMemo(() => {
    const map = new Map<string, HospitalUser>();
    hospitals.forEach(h => map.set(h.id, h));
    return map;
  }, [hospitals]);

  const managerZones = useMemo(() => {
    if (isSuperAdmin) {
      const zones = new Set<string>();
      hospitals.forEach(h => { if (h.zone) zones.add(h.zone); });
      return Array.from(zones).sort();
    }
    return currentUser.zones || [];
  }, [currentUser.zones, hospitals, isSuperAdmin]);

  const managerStates = useMemo(() => {
    if (isSuperAdmin) {
      const states = new Set<string>();
      hospitals.forEach(h => { if (h.state) states.add(h.state); });
      return Array.from(states).sort();
    }
    return currentUser.states || [];
  }, [currentUser.states, hospitals, isSuperAdmin]);

  // Filtered Team Members
  const teamMembers = useMemo(() => {
    return users.filter(u => {
      if (isSuperAdmin) return u.role === 'Sales';
      
      const reportsToMe = u.reportsToId === currentUser.id;
      const inZone = u.zone && managerZones.includes(u.zone);
      const inState = u.state && managerStates.includes(u.state);
      
      // Must be Sales role AND (report to me OR be in my geography)
      return u.role === 'Sales' && (reportsToMe || inZone || inState);
    });
  }, [users, isSuperAdmin, managerZones, managerStates, currentUser.id]);

  const teamUserIds = useMemo(() => teamMembers.map(m => m.id), [teamMembers]);

  useEffect(() => {
    // Subscribe to all relevant data
    const unsubTargets = salesService.subscribeToTargets(null, (allTargets) => {
      if (isSuperAdmin) {
        setTargets(allTargets);
      } else {
        setTargets(allTargets.filter(t => t.userId === currentUser.id || teamUserIds.includes(t.userId)));
      }
    });
    const unsubVisits = salesService.subscribeToVisits(null, (allVisits) => {
      if (isSuperAdmin) {
        setVisits(allVisits);
      } else {
        setVisits(allVisits.filter(v => v.userId === currentUser.id || teamUserIds.includes(v.userId)));
      }
    });
    const unsubLeads = salesService.subscribeToLeads({}, (allLeads) => {
      if (isSuperAdmin) {
        setLeads(allLeads);
      } else {
        setLeads(allLeads.filter(l => l.userId === currentUser.id || teamUserIds.includes(l.userId)));
      }
    });

    return () => {
      unsubTargets();
      unsubVisits();
      unsubLeads();
    };
    // Use a stringified version of teamUserIds to ensure stability if the array reference changes but content doesn't
  }, [isSuperAdmin, currentUser.id, JSON.stringify(teamUserIds)]);

  // Filtered Data based on Geography and Time
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const hospital = hospitalMap.get(c.hospitalId || '');
      if (!hospital) return false;

      // Geography Filter
      const zoneMatch = geoFilter.zone === 'all' || hospital.zone === geoFilter.zone;
      const stateMatch = geoFilter.state === 'all' || hospital.state === geoFilter.state;
      const cityMatch = geoFilter.city === 'all' || hospital.location === geoFilter.city; // location used as city

      // Manager Access Control
      const reportsToMe = users.filter(u => u.reportsToId === currentUser.id).map(u => u.id);
      const isMineOrReport = c.createdBy === currentUser.id || (c.createdBy && reportsToMe.includes(c.createdBy));

      const hasGeoAccess = (hospital.zone && managerZones.includes(hospital.zone)) || 
                           (hospital.state && managerStates.includes(hospital.state));

      const hasAccess = isSuperAdmin || isMineOrReport || hasGeoAccess;

      if (!hasAccess) return false;

      // Time Filter
      const date = new Date(c.createdAt);
      let timeMatch = false;
      const now = new Date();
      if (timeFilter === 'Daily') timeMatch = isWithinInterval(date, { start: startOfDay(now), end: endOfDay(now) });
      else if (timeFilter === 'Weekly') timeMatch = isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) });
      else if (timeFilter === 'Monthly') timeMatch = isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
      else if (timeFilter === 'Yearly') timeMatch = date.getFullYear() === now.getFullYear();
      else if (timeFilter === 'Custom Range') timeMatch = isWithinInterval(date, { start: dateRange.start, end: dateRange.end });

      return zoneMatch && stateMatch && cityMatch && timeMatch;
    });
  }, [claims, hospitalMap, geoFilter, timeFilter, dateRange, isSuperAdmin, currentUser.id, managerZones, managerStates, users]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalBusiness = filteredClaims.reduce((acc, c) => acc + (Number(c.formData?.fin_app_amt) || Number(c.estimatedCost) || 0), 0);
    const cashlessBusiness = filteredClaims.filter(c => c.formData?.p_type === 'Cashless').reduce((acc, c) => acc + (Number(c.formData?.fin_app_amt) || 0), 0);
    const reimbursementBusiness = filteredClaims.filter(c => c.formData?.p_type === 'Reimbursement').reduce((acc, c) => acc + (Number(c.formData?.fin_app_amt) || 0), 0);
    const activeHospitals = new Set(filteredClaims.map(c => c.hospitalId)).size;
    
    // New Tie-ups (MTD)
    const startOfMonthDate = startOfMonth(new Date());
    const newTieUps = hospitals.filter(h => {
      const createdDate = new Date(h.createdAt);
      const inRange = createdDate >= startOfMonthDate;
      const hasAccess = isSuperAdmin || (h.zone && managerZones.includes(h.zone)) || (h.state && managerStates.includes(h.state));
      return inRange && hasAccess;
    }).length;

    return {
      totalBusiness,
      cashlessBusiness,
      reimbursementBusiness,
      activeHospitals,
      newTieUps
    };
  }, [filteredClaims, hospitals, isSuperAdmin, managerZones, managerStates]);

  // Target vs Achievement
  const performance = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Manager's own target (if any)
    const selfTarget = targets.find(t => t.userId === currentUser.id && t.period === 'Monthly' && t.month === currentMonth && t.year === currentYear)?.targetAmount || 0;
    const selfAchieved = claims.filter(c => c.createdBy === currentUser.id && new Date(c.createdAt) >= startOfMonth(new Date())).reduce((acc, c) => acc + (Number(c.formData?.fin_app_amt) || 0), 0);

    // Team targets
    const teamTarget = targets.filter(t => teamUserIds.includes(t.userId) && t.period === 'Monthly' && t.month === currentMonth && t.year === currentYear).reduce((acc, t) => acc + t.targetAmount, 0);
    const teamAchieved = claims.filter(c => teamUserIds.includes(c.createdBy || '') && new Date(c.createdAt) >= startOfMonth(new Date())).reduce((acc, c) => acc + (Number(c.formData?.fin_app_amt) || 0), 0);

    return {
      self: { target: selfTarget, achieved: selfAchieved, percentage: selfTarget > 0 ? (selfAchieved / selfTarget) * 100 : 0 },
      team: { target: teamTarget, achieved: teamAchieved, percentage: teamTarget > 0 ? (teamAchieved / teamTarget) * 100 : 0 }
    };
  }, [targets, claims, currentUser, teamUserIds]);

  // Sales Lead Analysis
  const leadAnalysis = useMemo(() => {
    return teamMembers.map(member => {
      const memberClaims = claims.filter(c => c.createdBy === member.id && new Date(c.createdAt) >= startOfMonth(new Date()));
      const revenue = memberClaims.reduce((acc, c) => acc + (Number(c.formData?.fin_app_amt) || 0), 0);
      const target = targets.find(t => t.userId === member.id && t.period === 'Monthly' && t.month === (new Date().getMonth() + 1))?.targetAmount || 0;
      const memberVisits = visits.filter(v => v.userId === member.id && new Date(v.visitDate) >= startOfMonth(new Date())).length;
      
      // Conversion rate: Leads to Active Business (simplified)
      const memberLeads = leads.filter(l => l.userId === member.id);
      const closedLeads = memberLeads.filter(l => l.stage === 'Active Business').length;
      const conversionRate = memberLeads.length > 0 ? (closedLeads / memberLeads.length) * 100 : 0;

      return {
        userId: member.id,
        userName: member.displayName,
        revenue,
        target,
        visits: memberVisits,
        conversionRate,
        achievement: target > 0 ? (revenue / target) * 100 : 0
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [teamMembers, claims, targets, visits, leads]);

  // Geography Analysis (Drill-down)
  const geographyData = useMemo(() => {
    const zones: Record<string, any> = {};
    
    filteredClaims.forEach(c => {
      const hospital = hospitalMap.get(c.hospitalId || '');
      if (!hospital || !hospital.zone) return;

      if (!zones[hospital.zone]) {
        zones[hospital.zone] = { name: hospital.zone, revenue: 0, states: {} };
      }
      zones[hospital.zone].revenue += (Number(c.formData?.fin_app_amt) || 0);

      if (hospital.state) {
        if (!zones[hospital.zone].states[hospital.state]) {
          zones[hospital.zone].states[hospital.state] = { name: hospital.state, revenue: 0, cities: {} };
        }
        zones[hospital.zone].states[hospital.state].revenue += (Number(c.formData?.fin_app_amt) || 0);

        const city = hospital.location || 'Unknown';
        if (!zones[hospital.zone].states[hospital.state].cities[city]) {
          zones[hospital.zone].states[hospital.state].cities[city] = { name: city, revenue: 0, hospitals: new Set() };
        }
        zones[hospital.zone].states[hospital.state].cities[city].revenue += (Number(c.formData?.fin_app_amt) || 0);
        zones[hospital.zone].states[hospital.state].cities[city].hospitals.add(hospital.id);
      }
    });

    return Object.values(zones).map(z => ({
      ...z,
      states: Object.values(z.states).map((s: any) => ({
        ...s,
        cities: Object.values(s.cities).map((ci: any) => ({
          ...ci,
          hospitals: ci.hospitals.size
        }))
      }))
    }));
  }, [filteredClaims, hospitals]);

  // Sales Funnel Analysis
  const funnelData = useMemo(() => {
    const stages = [
      'Lead Generated',
      'Hospital Visit Done',
      'Proposal Shared',
      'Tie-up Closed',
      'Active Business'
    ];

    const counts = stages.map(stage => {
      const count = leads.filter(l => l.stage === stage).length;
      return { stage, count };
    });

    const total = leads.length;
    return counts.map(c => ({
      ...c,
      percentage: total > 0 ? (c.count / total) * 100 : 0
    }));
  }, [leads]);

  // AI-Driven Insights
  const insights = useMemo(() => {
    const list: { type: 'Follow-up' | 'Growth' | 'Prediction', message: string, priority: 'High' | 'Medium' | 'Low' }[] = [];
    
    // Growth Potential
    geographyData.forEach(z => {
      if (z.revenue < 500000) {
        list.push({ type: 'Growth', message: `${z.name} Zone has high growth potential with current revenue below ₹5L.`, priority: 'Medium' });
      }
    });

    // Follow-up
    leads.filter(l => l.stage !== 'Active Business').slice(0, 3).forEach(l => {
      list.push({ type: 'Follow-up', message: `Hospital ${l.hospitalName} is in ${l.stage} stage. Needs immediate follow-up.`, priority: 'High' });
    });

    // Prediction
    if (performance.team.percentage < 50 && new Date().getDate() > 20) {
      list.push({ type: 'Prediction', message: `Low probability of achieving team target this month. Current achievement at ${performance.team.percentage.toFixed(0)}%.`, priority: 'High' });
    } else if (performance.team.percentage > 80) {
      list.push({ type: 'Prediction', message: `High probability of exceeding team target. Current achievement at ${performance.team.percentage.toFixed(0)}%.`, priority: 'Low' });
    }

    return list;
  }, [geographyData, leads, performance]);

  const reminders = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = addDays(now, 3);
    
    return visits.filter(v => {
      if (v.outcome !== 'Follow-up' || !v.followUpDate) return false;
      const followUp = new Date(v.followUpDate);
      return isAfter(followUp, startOfDay(now)) && isBefore(followUp, endOfDay(threeDaysFromNow));
    }).sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime());
  }, [visits]);

  const exportToExcel = () => {
    try {
      const exportData = visits.map(v => ({
        'Sales Person': v.userName,
        'Hospital Name': v.hospitalName,
        'Contact Person': v.contactPerson,
        'Doctor Name': v.doctorName || 'N/A',
        'Purpose': v.purpose,
        'Outcome': v.outcome,
        'Follow-up Date': v.followUpDate ? format(new Date(v.followUpDate), 'dd-MM-yyyy') : 'N/A',
        'Visit Date': format(new Date(v.visitDate), 'dd-MM-yyyy'),
        'Remarks': v.remarks
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Team Sales Visits");
      XLSX.writeFile(wb, `Team_Sales_Visits_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Excel report generated successfully');
    } catch (error) {
      toast.error('Failed to generate Excel report');
    }
  };

  const handleAddTarget = async () => {
    try {
      const user = users.find(u => u.id === newTarget.userId);
      await salesService.addTarget({
        userId: newTarget.userId,
        userName: user?.displayName || '',
        period: newTarget.period,
        year: newTarget.year,
        month: newTarget.month,
        targetAmount: newTarget.targetAmount,
        cashlessTarget: newTarget.cashlessTarget,
        reimbursementTarget: newTarget.reimbursementTarget,
        onboardingTarget: newTarget.onboardingTarget,
        type: newTarget.type,
        assignedById: currentUser.id,
        assignedByName: currentUser.displayName
      });
      setShowTargetModal(false);
      toast.success('Target assigned successfully');
    } catch (error) {
      toast.error('Failed to assign target');
    }
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Sales Dashboard</h1>
          <p className="text-slate-500 font-bold text-xs mt-1 tracking-widest uppercase opacity-60">
            Strategic Overview, Team Performance & Geographical Analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            {(['overview', 'team', 'visits', 'geography', 'targets'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#000080] text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm mb-10 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <Calendar size={16} className="text-slate-400" />
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="bg-transparent text-xs font-black text-slate-700 uppercase tracking-widest outline-none"
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="Custom Range">Custom Range</option>
          </select>
        </div>

        {timeFilter === 'Custom Range' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
              <input 
                type="date" 
                value={format(dateRange.start, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
              <input 
                type="date" 
                value={format(dateRange.end, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <Globe size={16} className="text-slate-400" />
          <select 
            value={geoFilter.zone}
            onChange={(e) => setGeoFilter({...geoFilter, zone: e.target.value, state: 'all', city: 'all'})}
            className="bg-transparent text-xs font-black text-slate-700 uppercase tracking-widest outline-none"
          >
            <option value="all">All Zones</option>
            {managerZones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <MapIcon size={16} className="text-slate-400" />
          <select 
            value={geoFilter.state}
            onChange={(e) => setGeoFilter({...geoFilter, state: e.target.value, city: 'all'})}
            className="bg-transparent text-xs font-black text-slate-700 uppercase tracking-widest outline-none"
          >
            <option value="all">All States</option>
            {managerStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={() => setShowTargetModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#000080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/10"
          >
            <Target size={16} /> Assign Target
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-10">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <KPICard label="Total Business" value={`₹${(kpis.totalBusiness / 100000).toFixed(2)}L`} icon={Activity} color="blue" />
            <KPICard label="Cashless" value={`₹${(kpis.cashlessBusiness / 100000).toFixed(2)}L`} icon={Zap} color="emerald" />
            <KPICard label="Reimbursement" value={`₹${(kpis.reimbursementBusiness / 100000).toFixed(2)}L`} icon={Briefcase} color="amber" />
            <KPICard label="Active Hospitals" value={kpis.activeHospitals.toString()} icon={Building2} color="indigo" />
            <KPICard label="New Tie-ups (MTD)" value={kpis.newTieUps.toString()} icon={Plus} color="teal" />
          </div>

          {/* Team Reminders & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                  <Bell size={20} className="text-amber-500" />
                  Team Reminders
                </h3>
                {reminders.length > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg">
                    {reminders.length} DUE
                  </span>
                )}
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {reminders.length > 0 ? (
                  reminders.map((reminder) => (
                    <div key={reminder.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                          {format(new Date(reminder.followUpDate!), 'dd-MM-yyyy')}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{reminder.userName}</span>
                      </div>
                      <p className="text-sm font-black text-slate-800 mb-1">{reminder.hospitalName}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact: {reminder.contactPerson}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <CheckCircle2 size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending team follow-ups</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                  <Clock size={20} className="text-blue-500" />
                  Recent Team Visits
                </h3>
                <button 
                  onClick={() => setActiveTab('visits')}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  View All Team Visits
                </button>
              </div>
              
              <div className="space-y-4">
                {visits.slice(0, 5).map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">
                        {visit.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-800">{visit.hospitalName}</p>
                          <span className="text-[10px] font-bold text-slate-400">• {visit.userName}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {format(new Date(visit.visitDate), 'dd-MM-yyyy')} • {visit.purpose}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      visit.outcome === 'Activation done' ? 'bg-emerald-50 text-emerald-600' :
                      visit.outcome === 'Follow-up' ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {visit.outcome}
                    </span>
                  </div>
                ))}
                {visits.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No team visits logged yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Target vs Achievement (Self + Team) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manager Performance (Self)</h3>
                <span className="text-2xl font-black text-[#000080]">{performance.self.percentage.toFixed(1)}%</span>
              </div>
              <div className="space-y-6">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(performance.self.percentage, 100)}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</p>
                    <p className="text-lg font-black text-slate-800">₹{performance.self.target.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Achieved</p>
                    <p className="text-lg font-black text-emerald-600">₹{performance.self.achieved.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Team Performance</h3>
                <span className="text-2xl font-black text-emerald-600">{performance.team.percentage.toFixed(1)}%</span>
              </div>
              <div className="space-y-6">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(performance.team.percentage, 100)}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Team Target</p>
                    <p className="text-lg font-black text-slate-800">₹{performance.team.target.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Team Achieved</p>
                    <p className="text-lg font-black text-emerald-600">₹{performance.team.achieved.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights & Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-10">Sales Funnel Analysis</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="stage" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                      width={150}
                    />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#000080', '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'][index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-10">AI Strategic Insights</h3>
              <div className="space-y-6">
                {insights.map((insight, i) => (
                  <InsightCard 
                    key={i}
                    icon={insight.type === 'Growth' ? ArrowUpRight : insight.type === 'Follow-up' ? Clock : Zap}
                    title={insight.type}
                    desc={insight.message}
                    color={insight.priority === 'High' ? 'amber' : insight.priority === 'Medium' ? 'blue' : 'emerald'}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-10">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Team Performance Analysis</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search sales person..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <button className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
                  Export Performance
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Person</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue (MTD)</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Achievement</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Visits</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversion</th>
                    <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leadAnalysis.filter(l => l.userName.toLowerCase().includes(searchQuery.toLowerCase())).map((lead) => (
                    <tr key={lead.userId} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">
                            {lead.userName.charAt(0)}
                          </div>
                          <span className="text-sm font-black text-slate-800">{lead.userName}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-sm font-black text-slate-800">₹{lead.revenue.toLocaleString()}</td>
                      <td className="px-10 py-6 text-sm font-bold text-slate-500">₹{lead.target.toLocaleString()}</td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full min-w-[100px] overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${lead.achievement >= 100 ? 'bg-emerald-500' : lead.achievement >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(lead.achievement, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-700">{lead.achievement.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-sm font-bold text-slate-600">{lead.visits}</td>
                      <td className="px-10 py-6 text-sm font-bold text-slate-600">{lead.conversionRate.toFixed(1)}%</td>
                      <td className="px-10 py-6 text-right">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          lead.achievement >= 90 ? 'bg-emerald-50 text-emerald-600' :
                          lead.achievement >= 50 ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {lead.achievement >= 90 ? 'Top Performer' : lead.achievement >= 50 ? 'On Track' : 'Needs Support'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Team Visits</p>
                <p className="text-2xl font-black text-slate-800">{visits.length}</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Closed Tie-ups</p>
                <p className="text-2xl font-black text-slate-800">{visits.filter(v => v.outcome === 'Activation done').length}</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Follow-ups</p>
                <p className="text-2xl font-black text-slate-800">{visits.filter(v => v.outcome === 'Follow-up').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Team Field Visits</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search visits..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                >
                  <FileSpreadsheet size={14} />
                  Export Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Person</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospital</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Outcome</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visits.filter(v => 
                    v.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    v.hospitalName.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-6">
                        <span className="text-sm font-black text-slate-800">{visit.userName}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <Building2 size={14} />
                          </div>
                          <span className="text-sm font-bold text-slate-700">{visit.hospitalName}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-sm font-bold text-slate-600">{visit.purpose}</td>
                      <td className="px-10 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          visit.outcome === 'Activation done' ? 'bg-emerald-50 text-emerald-600' :
                          visit.outcome === 'Follow-up' ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {visit.outcome}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-sm font-bold text-slate-400">
                        {format(new Date(visit.visitDate), 'dd-MM-yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'geography' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 space-y-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">Regional Revenue Split</h3>
              {geographyData.map(zone => (
                <div key={zone.name} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:border-blue-500 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Globe size={20} />
                      </div>
                      <span className="text-sm font-black text-slate-800">{zone.name} Zone</span>
                    </div>
                    <span className="text-sm font-black text-[#000080]">₹{(zone.revenue / 100000).toFixed(2)}L</span>
                  </div>
                  <div className="space-y-3">
                    {zone.states.map((state: any) => (
                      <div key={state.name} className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>{state.name}</span>
                        <span>₹{(state.revenue / 100000).toFixed(2)}L</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-10">Geographical Drill-down</h3>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={geographyData.flatMap(z => z.states.flatMap((s: any) => s.cities))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#000080" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal */}
      <AnimatePresence>
        {showTargetModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Assign Sales Target</h2>
                <button onClick={() => setShowTargetModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sales Person</label>
                  <select 
                    value={newTarget.userId}
                    onChange={(e) => setNewTarget({...newTarget, userId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  >
                    <option value="">Select User</option>
                    {teamMembers.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Period</label>
                    <select 
                      value={newTarget.period}
                      onChange={(e) => setNewTarget({...newTarget, period: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Type</label>
                    <select 
                      value={newTarget.type}
                      onChange={(e) => setNewTarget({...newTarget, type: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="Revenue">Revenue-based</option>
                      <option value="Onboarding">Hospital Onboarding</option>
                      <option value="Product-wise">Product-wise</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Amount (₹)</label>
                  <input 
                    type="number" 
                    value={newTarget.targetAmount}
                    onChange={(e) => setNewTarget({...newTarget, targetAmount: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                {newTarget.type === 'Product-wise' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cashless (₹)</label>
                      <input 
                        type="number" 
                        value={newTarget.cashlessTarget}
                        onChange={(e) => setNewTarget({...newTarget, cashlessTarget: Number(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reimbursement (₹)</label>
                      <input 
                        type="number" 
                        value={newTarget.reimbursementTarget}
                        onChange={(e) => setNewTarget({...newTarget, reimbursementTarget: Number(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                )}
                {newTarget.type === 'Onboarding' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hospitals to Onboard</label>
                    <input 
                      type="number" 
                      value={newTarget.onboardingTarget}
                      onChange={(e) => setNewTarget({...newTarget, onboardingTarget: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                )}
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button onClick={() => setShowTargetModal(false)} className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100">Cancel</button>
                <button onClick={handleAddTarget} className="flex-[2] px-6 py-4 bg-[#000080] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-blue-800">Assign Target</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const KPICard = ({ label, value, icon: Icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    teal: 'bg-teal-50 text-teal-600'
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
      <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center mb-6`}>
        <Icon size={24} />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
    </div>
  );
};

const InsightCard = ({ icon: Icon, title, desc, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <div className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all">
      <div className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">{title}</p>
        <p className="text-[10px] font-bold text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
};

export default SalesManagerDashboard;
