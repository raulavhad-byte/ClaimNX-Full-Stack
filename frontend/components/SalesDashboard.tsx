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
  Bell,
  FileSpreadsheet,
  Globe2
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
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, isAfter, isBefore, addDays } from 'date-fns';
import { Claim, HospitalUser, SalesTarget, SalesVisit, SalesDashboardData } from '../types';
import { salesService } from '../services/salesService';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface SalesDashboardProps {
  claims: Claim[];
  hospitals: HospitalUser[];
  currentUser: HospitalUser;
  users: HospitalUser[];
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ claims, hospitals, currentUser, users }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'visits'>('dashboard');
  const [dateRangeType, setDateRangeType] = useState('Current Month');
  const [dateRange, setDateRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [geoFilter, setGeoFilter] = useState({ zone: 'all', state: 'all' });
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [visits, setVisits] = useState<SalesVisit[]>([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  // Form states
  const [newVisit, setNewVisit] = useState({
    hospitalId: '',
    hospitalName: '',
    doctorName: '',
    hospitalBed: '',
    contactPerson: '',
    purpose: '',
    outcome: 'Pending' as 'Pending' | 'Follow-up' | 'Activation done',
    followUpDate: '',
    activationDate: '',
    remarks: ''
  });

  const [newTarget, setNewTarget] = useState({
    userId: '',
    period: 'Monthly' as const,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    targetAmount: 0,
    cashlessTarget: 0,
    reimbursementTarget: 0
  });

  const isManager = useMemo(() => {
    const managerRoles = ['Sales Manager', 'Sales Head', 'Manager', 'Department Head', 'Super Admin', 'Admin'];
    return managerRoles.includes(currentUser.role) || currentUser.isAdmin;
  }, [currentUser.role, currentUser.isAdmin]);

  const hospitalMap = useMemo(() => {
    const map = new Map<string, HospitalUser>();
    hospitals.forEach(h => map.set(h.id, h));
    return map;
  }, [hospitals]);

  useEffect(() => {
    const unsubTargets = salesService.subscribeToTargets(
      isManager ? null : currentUser.id,
      (allTargets) => {
        if (currentUser.role === 'Super Admin' || currentUser.isAdmin) {
          setTargets(allTargets);
        } else if (isManager) {
          const reportsToMe = users.filter(u => u.reportsToId === currentUser.id).map(u => u.id);
          setTargets(allTargets.filter(t => t.userId === currentUser.id || reportsToMe.includes(t.userId)));
        } else {
          setTargets(allTargets.filter(t => t.userId === currentUser.id));
        }
      }
    );
    const unsubVisits = salesService.subscribeToVisits(
      isManager ? null : currentUser.id,
      (allVisits) => {
        if (currentUser.role === 'Super Admin' || currentUser.isAdmin) {
          setVisits(allVisits);
        } else if (isManager) {
          const reportsToMe = users.filter(u => u.reportsToId === currentUser.id).map(u => u.id);
          setVisits(allVisits.filter(v => v.userId === currentUser.id || reportsToMe.includes(v.userId)));
        } else {
          setVisits(allVisits.filter(v => v.userId === currentUser.id));
        }
      }
    );

    return () => {
      unsubTargets();
      unsubVisits();
    };
  }, [currentUser.id, currentUser.role, currentUser.isAdmin, isManager, users]);

  const managerZones = useMemo(() => {
    const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.isAdmin;
    if (isSuperAdmin) {
      const zones = new Set<string>();
      hospitals.forEach(h => { if (h.zone) zones.add(h.zone); });
      return Array.from(zones).sort();
    }
    return currentUser.zones || [];
  }, [currentUser.zones, hospitals, currentUser.role, currentUser.isAdmin]);

  const managerStates = useMemo(() => {
    const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.isAdmin;
    if (isSuperAdmin) {
      const states = new Set<string>();
      hospitals.forEach(h => { if (h.state) states.add(h.state); });
      return Array.from(states).sort();
    }
    return currentUser.states || [];
  }, [currentUser.states, hospitals, currentUser.role, currentUser.isAdmin]);

  const filteredClaims = useMemo(() => {
    let filtered = claims;

    // 0. Geographic Restrictions & Filters
    filtered = filtered.filter(c => {
      const hospId = c.hospitalId || c.formData?.hospitalId;
      const hosp = hospitalMap.get(hospId || '');
      if (!hosp) return false;

      // UI Filters
      const zoneFilterMatch = geoFilter.zone === 'all' || hosp.zone === geoFilter.zone;
      const stateFilterMatch = geoFilter.state === 'all' || hosp.state === geoFilter.state;
      if (!zoneFilterMatch || !stateFilterMatch) return false;

      // Access Control
      if (currentUser.role !== 'Super Admin' && !currentUser.isAdmin) {
        const userZones = currentUser.zones || [];
        const userStates = currentUser.states || [];
        const userDistricts = currentUser.districts || [];

        if (userZones.length > 0 || userStates.length > 0 || userDistricts.length > 0) {
          const zoneMatch = userZones.length === 0 || (hosp.zone && userZones.includes(hosp.zone));
          const stateMatch = userStates.length === 0 || (hosp.state && userStates.includes(hosp.state));
          const districtMatch = userDistricts.length === 0 || (hosp.district && userDistricts.includes(hosp.district));

          if (!(zoneMatch && stateMatch && districtMatch)) return false;
        }
      }
      return true;
    });

    return filtered.filter(c => {
      const date = new Date(c.createdAt);
      const inRange = isWithinInterval(date, { start: dateRange.start, end: dateRange.end });
      const hospitalMatch = selectedHospital === 'all' || c.hospitalId === selectedHospital;
      
      // 1. Hierarchy filtering
      if (!isManager) {
        return inRange && hospitalMatch && c.createdBy === currentUser.id;
      }
      
      // If manager, show their own and their reports'
      const reportsToMe = users.filter(u => u.reportsToId === currentUser.id).map(u => u.id);
      const isMineOrReport = c.createdBy === currentUser.id || (c.createdBy && reportsToMe.includes(c.createdBy));
      
      return inRange && hospitalMatch && (currentUser.role === 'Super Admin' || currentUser.isAdmin || isMineOrReport);
    });
  }, [claims, dateRange, selectedHospital, geoFilter, currentUser, hospitalMap, isManager, users]);

  const performance = useMemo(() => {
    const data = salesService.getPerformanceData(filteredClaims, isManager ? undefined : currentUser.id);
    
    // Calculate targets
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const userTargets = targets.filter(t => isManager ? true : t.userId === currentUser.id);
    const monthlyTarget = userTargets.find(t => t.period === 'Monthly' && t.month === currentMonth && t.year === currentYear)?.targetAmount || 0;
    
    return {
      ...data,
      monthlyTarget,
      achievement: monthlyTarget > 0 ? (data.monthly / monthlyTarget) * 100 : 0
    };
  }, [filteredClaims, targets, currentUser, isManager]);

  const hospitalPerformance = useMemo(() => {
    const stats: Record<string, { name: string, cases: number, revenue: number }> = {};
    
    filteredClaims.forEach(c => {
      if (!c.hospitalId) return;
      if (!stats[c.hospitalId]) {
        stats[c.hospitalId] = { 
          name: hospitalMap.get(c.hospitalId)?.hospitalName || 'Unknown',
          cases: 0, 
          revenue: 0 
        };
      }
      stats[c.hospitalId].cases += 1;
      stats[c.hospitalId].revenue += (Number(c.formData?.fin_app_amt) || Number(c.estimatedCost) || 0);
    });

    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [filteredClaims, hospitalMap]);

  const trendData = useMemo(() => {
    const days: Record<string, { date: string, revenue: number, cases: number }> = {};
    
    filteredClaims.forEach(c => {
      const day = format(new Date(c.createdAt), 'dd-MM-yyyy');
      if (!days[day]) {
        days[day] = { date: day, revenue: 0, cases: 0 };
      }
      days[day].revenue += (Number(c.formData?.fin_app_amt) || Number(c.estimatedCost) || 0);
      days[day].cases += 1;
    });

    return Object.values(days);
  }, [filteredClaims]);

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
        'Hospital Name': v.hospitalName,
        'Contact Person': v.contactPerson,
        'Doctor Name': v.doctorName || 'N/A',
        'Purpose': v.purpose,
        'Outcome': v.outcome,
        'Follow-up Date': v.followUpDate ? format(new Date(v.followUpDate), 'dd-MM-yyyy') : 'N/A',
        'Visit Date': format(new Date(v.visitDate), 'dd-MM-yyyy'),
        'Remarks': v.remarks,
        'Logged By': v.userName
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales Visits");
      XLSX.writeFile(wb, `Sales_Visits_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Excel report generated successfully');
    } catch (error) {
      toast.error('Failed to generate Excel report');
    }
  };

  const handleAddVisit = async () => {
    if (!newVisit.hospitalName) {
      toast.error('Hospital name is required');
      return;
    }

    console.log('Attempting to log visit...', {
      currentUserId: currentUser.id,
      hospitalName: newVisit.hospitalName
    });

    try {
      const visitData: any = {
        userId: currentUser.id,
        userName: currentUser.displayName || 'Anonymous',
        hospitalName: newVisit.hospitalName,
        doctorName: newVisit.doctorName || '',
        hospitalBed: newVisit.hospitalBed || '',
        contactPerson: newVisit.contactPerson || '',
        purpose: newVisit.purpose || '',
        outcome: newVisit.outcome,
        remarks: newVisit.remarks || '',
        visitDate: new Date().toISOString()
      };

      if (newVisit.hospitalId) visitData.hospitalId = newVisit.hospitalId;
      if (newVisit.outcome === 'Follow-up' && newVisit.followUpDate) {
        visitData.followUpDate = newVisit.followUpDate;
      }
      if (newVisit.outcome === 'Activation done' && newVisit.activationDate) {
        visitData.activationDate = newVisit.activationDate;
      }

      await salesService.addVisit(visitData);
      setShowVisitModal(false);
      setNewVisit({
        hospitalId: '',
        hospitalName: '',
        doctorName: '',
        hospitalBed: '',
        contactPerson: '',
        purpose: '',
        outcome: 'Pending',
        followUpDate: '',
        activationDate: '',
        remarks: ''
      });
      toast.success('Visit logged successfully');
    } catch (error: any) {
      console.error('Error logging visit:', error);
      toast.error('Failed to log visit: ' + (error.message || 'Permission Denied'));
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
        type: 'Revenue',
        assignedById: currentUser.id,
        assignedByName: currentUser.displayName
      });
      setShowTargetModal(false);
      toast.success('Target assigned successfully');
    } catch (error) {
      toast.error('Failed to assign target');
    }
  };

  const handleDateRangeChange = (type: string) => {
    setDateRangeType(type);
    const now = new Date();
    switch (type) {
      case 'Current Month':
        setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
        break;
      case 'Last Month':
        const lastMonth = subMonths(now, 1);
        setDateRange({ start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
        break;
      case 'Last Quarter':
        const lastQuarterStart = subMonths(startOfMonth(now), 3);
        setDateRange({ start: lastQuarterStart, end: endOfMonth(subMonths(now, 1)) });
        break;
    }
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Sales Dashboard</h1>
          <p className="text-slate-500 font-bold text-xs mt-1 tracking-widest uppercase opacity-60">
            {isManager ? 'Managerial Overview & Team Performance' : 'Personal Performance & Field Activities'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-[#000080] text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('visits')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'visits' ? 'bg-[#000080] text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Visits
            </button>
          </div>
          
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm mb-10 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <Calendar size={16} className="text-slate-400" />
          <select 
            value={dateRangeType}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="bg-transparent text-xs font-black text-slate-700 uppercase tracking-widest outline-none"
          >
            <option value="Current Month">Current Month</option>
            <option value="Last Month">Last Month</option>
            <option value="Last Quarter">Last Quarter</option>
            <option value="Custom Range">Custom Range</option>
          </select>
        </div>

        {dateRangeType === 'Custom Range' && (
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
          <Globe2 size={16} className="text-slate-400" />
          <select 
            value={geoFilter.zone}
            onChange={(e) => setGeoFilter({...geoFilter, zone: e.target.value, state: 'all'})}
            className="bg-transparent text-xs font-black text-slate-700 uppercase tracking-widest outline-none"
          >
            <option value="all">All Zones</option>
            {managerZones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <MapPin size={16} className="text-slate-400" />
          <select 
            value={geoFilter.state}
            onChange={(e) => setGeoFilter({...geoFilter, state: e.target.value})}
            className="bg-transparent text-xs font-black text-slate-700 uppercase tracking-widest outline-none"
          >
            <option value="all">All States</option>
            {managerStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <Building2 size={16} className="text-slate-400" />
          <select 
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            className="bg-transparent text-xs font-black text-slate-700 uppercase tracking-widest outline-none"
          >
            <option value="all">All Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.hospitalName}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={() => setShowVisitModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#0d9488] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0f766e] transition-all shadow-lg shadow-teal-900/10"
          >
            <Plus size={16} /> Log New Visit
          </button>
          {isManager && (
            <button 
              onClick={() => setShowTargetModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#000080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/10"
            >
              <Target size={16} /> Assign Target
            </button>
          )}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-10">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard 
              label="Daily Business" 
              value={`₹${performance.daily.toLocaleString()}`} 
              trend="+12%" 
              up={true} 
              icon={Activity} 
              color="blue" 
            />
            <KPICard 
              label="Weekly Business" 
              value={`₹${performance.weekly.toLocaleString()}`} 
              trend="+8%" 
              up={true} 
              icon={TrendingUp} 
              color="emerald" 
            />
            <KPICard 
              label="Monthly Business" 
              value={`₹${performance.monthly.toLocaleString()}`} 
              trend="-3%" 
              up={false} 
              icon={Briefcase} 
              color="amber" 
            />
            <KPICard 
              label="Yearly Business" 
              value={`₹${performance.yearly.toLocaleString()}`} 
              trend="+15%" 
              up={true} 
              icon={LayoutDashboard} 
              color="indigo" 
            />
          </div>

          {/* Reminders & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                  <Bell size={20} className="text-amber-500" />
                  Follow-up Reminders
                </h3>
                {reminders.length > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg">
                    {reminders.length} DUE
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                {reminders.length > 0 ? (
                  reminders.map((reminder) => (
                    <div key={reminder.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                          {format(new Date(reminder.followUpDate!), 'dd-MM-yyyy')}
                        </span>
                        <Clock size={14} className="text-slate-400" />
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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending follow-ups</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                  <Clock size={20} className="text-blue-500" />
                  Recent Field Visits
                </h3>
                <button 
                  onClick={() => setActiveTab('visits')}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  View All Visits
                </button>
              </div>
              
              <div className="space-y-4">
                {visits.slice(0, 4).map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{visit.hospitalName}</p>
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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No visits logged yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Target vs Achievement & Product Mix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Target vs Achievement</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Monthly performance tracking</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-[#000080] tracking-tight">{performance.achievement.toFixed(1)}%</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Achieved</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Progress</span>
                    <span className="text-[10px] font-black text-slate-800 tracking-widest">₹{performance.monthly.toLocaleString()} / ₹{performance.monthlyTarget.toLocaleString()}</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(performance.achievement, 100)}%` }}
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</p>
                    <p className="text-lg font-black text-slate-800">₹{performance.monthlyTarget.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Achieved</p>
                    <p className="text-lg font-black text-emerald-600">₹{performance.monthly.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                    <p className="text-lg font-black text-amber-600">₹{Math.max(0, performance.monthlyTarget - performance.monthly).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-10">Product Mix</h3>
              <div className="h-64 mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Cashless', value: performance.productWise.cashless.revenue },
                        { name: 'Reimbursement', value: performance.productWise.reimbursement.revenue }
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#000080" />
                      <Cell fill="#0d9488" />
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#000080]" />
                    <span className="text-xs font-bold text-slate-700">Cashless</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">₹{performance.productWise.cashless.revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#0d9488]" />
                    <span className="text-xs font-bold text-slate-700">Reimbursement</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">₹{performance.productWise.reimbursement.revenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Performance & Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Hospital Performance</h3>
                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</button>
              </div>
              <div className="space-y-6">
                {hospitalPerformance.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{h.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h.cases} Cases</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">₹{h.revenue.toLocaleString()}</p>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${(h.revenue / hospitalPerformance[0].revenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-10">Revenue Trends</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#000080" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#000080" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      tickFormatter={(val) => `₹${val/1000}k`}
                    />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#000080" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visits Today</p>
                <p className="text-2xl font-black text-slate-800">{visits.filter(v => v.visitDate.startsWith(new Date().toISOString().split('T')[0])).length}</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Activations This Week</p>
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
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Recent Field Visits</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search visits..."
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
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospital</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Person</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Outcome</th>
                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <Building2 size={14} />
                          </div>
                          <span className="text-sm font-black text-slate-800">{visit.hospitalName}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-sm font-bold text-slate-600">{visit.contactPerson}</td>
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
                      <td className="px-10 py-6 text-right">
                        <button className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Visit Modal */}
      <AnimatePresence>
        {showVisitModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Log New Field Visit</h2>
                <button onClick={() => setShowVisitModal(false)} className="text-slate-400 hover:text-slate-600"><AlertCircle /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hospital Name</label>
                  <input 
                    type="text" 
                    value={newVisit.hospitalName}
                    onChange={(e) => setNewVisit({...newVisit, hospitalName: e.target.value})}
                    placeholder="Enter Hospital Name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Doctor Name</label>
                    <input 
                      type="text" 
                      value={newVisit.doctorName}
                      onChange={(e) => setNewVisit({...newVisit, doctorName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hospital Bed</label>
                    <input 
                      type="text" 
                      value={newVisit.hospitalBed}
                      onChange={(e) => setNewVisit({...newVisit, hospitalBed: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contact Person</label>
                    <input 
                      type="text" 
                      value={newVisit.contactPerson}
                      onChange={(e) => setNewVisit({...newVisit, contactPerson: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Outcome</label>
                    <select 
                      value={newVisit.outcome}
                      onChange={(e) => setNewVisit({...newVisit, outcome: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Activation done">Activation done</option>
                    </select>
                  </div>
                </div>

                {newVisit.outcome === 'Follow-up' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Follow-up Date</label>
                    <input 
                      type="date" 
                      value={newVisit.followUpDate}
                      onChange={(e) => setNewVisit({...newVisit, followUpDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </motion.div>
                )}

                {newVisit.outcome === 'Activation done' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Activation Date</label>
                    <input 
                      type="date" 
                      value={newVisit.activationDate}
                      onChange={(e) => setNewVisit({...newVisit, activationDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </motion.div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Purpose of Visit</label>
                  <input 
                    type="text" 
                    value={newVisit.purpose}
                    onChange={(e) => setNewVisit({...newVisit, purpose: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks</label>
                  <textarea 
                    value={newVisit.remarks}
                    onChange={(e) => setNewVisit({...newVisit, remarks: e.target.value})}
                    className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button onClick={() => setShowVisitModal(false)} className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100">Cancel</button>
                <button onClick={handleAddVisit} className="flex-[2] px-6 py-4 bg-[#0d9488] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-[#0f766e]">Save Visit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <button onClick={() => setShowTargetModal(false)} className="text-slate-400 hover:text-slate-600"><AlertCircle /></button>
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
                    {users.filter(u => 
                      u.role === 'Sales' && 
                      (currentUser.role === 'Super Admin' || currentUser.isAdmin || u.reportsToId === currentUser.id)
                    ).map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Amount (₹)</label>
                    <input 
                      type="number" 
                      value={newTarget.targetAmount}
                      onChange={(e) => setNewTarget({...newTarget, targetAmount: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cashless Target (₹)</label>
                    <input 
                      type="number" 
                      value={newTarget.cashlessTarget}
                      onChange={(e) => setNewTarget({...newTarget, cashlessTarget: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reimbursement Target (₹)</label>
                    <input 
                      type="number" 
                      value={newTarget.reimbursementTarget}
                      onChange={(e) => setNewTarget({...newTarget, reimbursementTarget: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
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

const KPICard = ({ label, value, trend, up, icon: Icon, color }: any) => {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6 group hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
};

const InsightCard = ({ icon: Icon, title, desc, color }: any) => {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <div className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all cursor-default group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClasses[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{title}</h4>
        <p className="text-[10px] font-bold text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
};

export default SalesDashboard;
