
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { formatDate, formatDateTime, parseDate } from '../utils';
import { Claim, ClaimStatus } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, LineChart, Line, Legend, ComposedChart
} from 'recharts';
import { 
  Activity, TrendingUp, Clock, AlertCircle, Calendar, 
  Filter, ChevronDown, ArrowUpRight, ArrowDownRight, 
  IndianRupee, Briefcase, Zap, Timer, Plus, BrainCircuit, X, Download,
  ClipboardList, ShieldAlert, BarChart3, PieChart as PieChartIcon,
  TrendingDown, CheckCircle2, History, Building2, HelpCircle, PlusCircle, ShieldCheck, Users,
  Search, Building, XCircle, FileText, Layers
} from 'lucide-react';
import { Query, RecoveryRecord, HospitalUser, Product } from '../types';
import { DashboardAnnouncementsWidget } from './SystemAnnouncements';

interface DashboardProps {
  claims: Claim[];
  queries: Query[];
  recoveries: RecoveryRecord[];
  hospitals: any[];
  setHospitals: React.Dispatch<React.SetStateAction<any[]>>;
  currentUser: HospitalUser | null;
  users: HospitalUser[];
  setUsers: React.Dispatch<React.SetStateAction<HospitalUser[]>>;
  canAccess: (key: string) => boolean;
}

type TimeFrame = 'Daily' | 'Monthly' | 'Quarterly' | 'Yearly';
type DashboardTab = 'Business' | 'Operations' | 'Recovery' | 'Management';

const Dashboard: React.FC<DashboardProps> = ({ claims, queries, recoveries, hospitals, setHospitals, currentUser, users, setUsers, canAccess }) => {
  const availableTabs = useMemo(() => {
    const tabs: DashboardTab[] = [];
    if (canAccess('dashboards:visibility:overview')) tabs.push('Business');
    if (canAccess('dashboards:visibility:overview')) tabs.push('Operations'); // Assuming Operations is also part of overview mapping for now or separate
    if (canAccess('dashboards:visibility:recon')) tabs.push('Recovery');
    if (canAccess('dashboards:visibility:mis')) tabs.push('Management');
    return tabs;
  }, [canAccess]);

  const [timeFilter, setTimeFilter] = useState<TimeFrame>('Monthly');
  const [activeTab, setActiveTab] = useState<DashboardTab>(availableTabs[0] || 'Business');
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<string | null>(null);
  const [showAgingModal, setShowAgingModal] = useState(false);
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');

  // State for Operations Insurer & TPA Analytics
  const [opsEntityType, setOpsEntityType] = useState<'insurer' | 'tpa'>('insurer');
  const [opsSearchTerm, setOpsSearchTerm] = useState<string>('');
  const [opsViewMode, setOpsViewMode] = useState<'chart' | 'table'>('chart');

  const handleAgingClick = (range: string) => {
    setSelectedAgingBucket(range);
    setShowAgingModal(true);
  };

  const handleExport = (type: string) => {
    let dataToExport: any[] = [];
    const filename = `${type}_Report_${formatDate(new Date())}.xlsx`;

    switch (type) {
      case 'Business':
        dataToExport = accessibleClaims.map(c => ({
          'Claim No': c.formData?.insurer_claim_no || c.id,
          'Patient Name': c.formData?.patient_name,
          'Hospital': hospitals.find(h => h.id === c.formData?.hospitalId)?.name,
          'Total Bill': c.formData?.dis_total_bill,
          'Status': c.status,
          'Date': c.createdAt
        }));
        break;
      case 'Admission':
        dataToExport = accessibleClaims.filter(c => c.status.includes('Pre Auth')).map(c => ({
          'Claim No': c.formData?.insurer_claim_no || c.id,
          'Patient Name': c.formData?.patient_name,
          'Admission Date': c.formData?.doa,
          'Hospital': hospitals.find(h => h.id === c.formData?.hospitalId)?.name,
          'Status': c.status
        }));
        break;
      case 'Discharge':
        dataToExport = accessibleClaims.filter(c => c.status.includes('Discharge')).map(c => ({
          'Claim No': c.formData?.insurer_claim_no || c.id,
          'Patient Name': c.formData?.patient_name,
          'Discharge Date': c.formData?.dod,
          'Hospital': hospitals.find(h => h.id === c.formData?.hospitalId)?.name,
          'Status': c.status
        }));
        break;
      case 'Outstanding':
        dataToExport = accessibleClaims.filter(c => c.status.includes('Approved') && !c.status.includes('Settled')).map(c => ({
          'Claim No': c.formData?.insurer_claim_no || c.id,
          'Patient Name': c.formData?.patient_name,
          'Hospital': hospitals.find(h => h.id === c.formData?.hospitalId)?.name,
          'Approved Amount': c.formData?.approved_amount,
          'Aging': (() => {
            const created = parseDate(c.createdAt);
            if (isNaN(created.getTime())) return 'N/A';
            return Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + ' Days';
          })(),
          'Date': formatDate(c.createdAt)
        }));
        break;
      case 'TAT':
        dataToExport = accessibleClaims.map(c => ({
          'Claim No': c.formData?.insurer_claim_no || c.id,
          'Patient Name': c.formData?.patient_name,
          'Pre-Auth TAT': (c as any).tatMetrics?.preAuthTat,
          'Discharge TAT': (c as any).tatMetrics?.dischargeTat,
          'Total TAT': (c as any).tatMetrics?.totalTat
        }));
        break;
      case 'File Dispatch Pending':
        dataToExport = accessibleClaims.filter(c => c.status === ClaimStatus.DISCHARGE_APPROVED && !(c.status as string).includes('Settled')).map(c => ({
          'Claim No': c.formData?.insurer_claim_no || c.id,
          'Patient Name': c.formData?.patient_name,
          'Hospital': hospitals.find(h => h.id === c.formData?.hospitalId)?.name,
          'Discharge Date': c.formData?.dod
        }));
        break;
      default:
        dataToExport = accessibleClaims.map(c => ({ ...c.formData, status: c.status }));
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename);
  };

  const handleExportOpsAnalytics = (type: 'insurer' | 'tpa') => {
    const data = type === 'insurer' ? operationsData.insurerAnalytics : operationsData.tpaAnalytics;
    const label = type === 'insurer' ? 'Insurer' : 'TPA';
    const exportData = data.map(item => ({
      [`${label} Name`]: item.name,
      'Total Claims Intake': item.total,
      'Rejection Count': item.rejections,
      'Rejection Ratio (%)': `${item.rejectionRatio}%`,
      'Query Count': item.queries,
      'Query Ratio (%)': `${item.queryRatio}%`,
      'Risk Level': item.rejectionRatio > 15 || item.queryRatio > 30 ? 'High Risk' : item.rejectionRatio > 5 || item.queryRatio > 15 ? 'Moderate Risk' : 'Optimal'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${label}_Operations_Analytics`);
    XLSX.writeFile(wb, `${label}_Wise_Rejection_and_Query_Analytics_${formatDate(new Date())}.xlsx`);
  };
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedHospital, setSelectedHospital] = useState<string>('all');

  const isManager = useMemo(() => {
    if (!users || !currentUser) return false;
    const managerRoles = ['Manager', 'Operations Head', 'Sales Head', 'Sales National Head', 'COO', 'CEO'];
    return managerRoles.includes(currentUser.role) || users.some(u => u.reportsToId === currentUser?.id);
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
    
    let filtered = claims;

    // RBAC Access Scope
    const roleUpper = currentUser.role?.toUpperCase();
    if (roleUpper === 'SUPER ADMIN' || roleUpper === 'CEO' || roleUpper === 'COO') {
      // Full access
    } else if (roleUpper === 'OPERATIONS HEAD' || roleUpper === 'SALES NATIONAL HEAD') {
      if (currentUser.zones && currentUser.zones.length > 0) {
        filtered = filtered.filter(c => {
          const hosp = hospitals.find(h => h.id === c.formData?.hospitalId);
          return currentUser.zones?.includes(hosp?.zone || '');
        });
      }
    } else if (roleUpper === 'MANAGER' || roleUpper === 'SALES HEAD') {
      filtered = filtered.filter(c => {
        const hosp = hospitals.find(h => h.id === c.formData?.hospitalId);
        const zoneMatch = !currentUser.zones || currentUser.zones.length === 0 || currentUser.zones.includes(hosp?.zone || '');
        const stateMatch = !currentUser.states || currentUser.states.length === 0 || currentUser.states.includes(hosp?.state || '');
        const districtMatch = !currentUser.districts || currentUser.districts.length === 0 || currentUser.districts.includes(hosp?.district || '');
        return zoneMatch && stateMatch && districtMatch;
      });
    } else {
      // Default staff access
      const subordinateIds = getSubordinateIds(currentUser.id);
      if (isManager && viewMode === 'team') {
        if (selectedUser !== 'all') {
          filtered = filtered.filter(c => 
            c.assignedReconUserId === selectedUser || 
            c.assignedMedicalUserId === selectedUser || 
            c.assignedOpsUserId === selectedUser ||
            c.createdBy === selectedUser
          );
        } else {
          filtered = filtered.filter(c => 
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
      } else {
        filtered = filtered.filter(c => 
          c.assignedReconUserId === currentUser.id || 
          c.assignedMedicalUserId === currentUser.id || 
          c.assignedOpsUserId === currentUser.id ||
          c.createdBy === currentUser.id
        );
      }
    }

    // Drill-down Filters
    if (selectedHospital !== 'all') {
      filtered = filtered.filter(c => c.formData?.hospitalId === selectedHospital);
    }

    // PRODUCT ISOLATION (Point 1 of Requirement)
    if (currentUser?.products && currentUser.products.length > 0) {
      filtered = filtered.filter(c => currentUser.products?.includes(c.product as any));
    }

    return filtered;
  }, [claims, currentUser, users, isManager, viewMode, selectedUser, selectedHospital, hospitals]);

  const accessibleQueries = useMemo(() => {
    const claimIds = new Set(accessibleClaims.map(c => c.id));
    return queries.filter(q => claimIds.has(q.claimId));
  }, [queries, accessibleClaims]);

  const accessibleRecoveries = useMemo(() => {
    const claimIds = new Set(accessibleClaims.map(c => c.id));
    return recoveries.filter(r => claimIds.has(r.claimId));
  }, [recoveries, accessibleClaims]);

  // --- HELPER: DYNAMIC CURRENCY FORMATTER ---
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '₹0';
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // --- HELPER FUNCTIONS FOR DATE GROUPING ---
  const getGroupKey = (dateStr: any, frame: TimeFrame) => {
    const date = parseDate(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    if (frame === 'Daily') return formatDate(date).split('-').slice(0, 2).join('-');
    if (frame === 'Monthly') return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    if (frame === 'Quarterly') return `Q${Math.floor(date.getMonth() / 3) + 1} '${date.getFullYear().toString().slice(-2)}`;
    if (frame === 'Yearly') return date.getFullYear().toString();
    return '';
  };

  // Helper to get time difference in hours
  const getDurationHours = (start?: any, end?: any) => {
    if (!start || !end) return 0;
    const s = parseDate(start).getTime();
    const e = parseDate(end).getTime();
    if (isNaN(s) || isNaN(e)) return 0;
    return Math.max(0, (e - s) / (1000 * 60 * 60));
  };

  // --- SETTLED STATUSES ---
  const SETTLED_STATUSES = useMemo(() => [
    ClaimStatus.COMPLETE_SETTLEMENT,
    ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE,
    ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE,
    ClaimStatus.SETTLED,
    ClaimStatus.ACCOUNT_RECONCILIATION,
    ClaimStatus.BANK_RECONCILIATION_COMPLETED
  ], []);

  // --- AGGREGATION LOGIC ---
  const analyticsData = useMemo(() => {
    const groups: Record<string, { 
      name: string; 
      count: number; 
      amount: number; 
      finalApprovalAmount: number;
      settled: number;
      outstanding: number; 
      preAuthTatSum: number;
      preAuthCount: number;
      dischargeTatSum: number;
      dischargeCount: number;
      sortDate: number;
    }> = {};

    claims.forEach(c => {
      // Use Discharge Date for financial grouping if available, else Created Date
      const dateRef = c.formData?.dis_date || c.createdAt;
      const key = getGroupKey(dateRef, timeFilter);
      
      if (key === 'Invalid Date') return;
      
      if (!groups[key]) {
        groups[key] = { 
          name: key, count: 0, amount: 0, finalApprovalAmount: 0, settled: 0, outstanding: 0, 
          preAuthTatSum: 0, preAuthCount: 0, dischargeTatSum: 0, dischargeCount: 0, 
          sortDate: parseDate(dateRef).getTime()
        };
      }

      groups[key].count += 1;
      
      // Revenue Trend -> Capture Final Bill Amount (or Estimate if not final)
      const finalBillAmount = Number(c.formData?.dis_total_bill || c.estimatedCost || 0);
      groups[key].amount += finalBillAmount;

      const isSettled = SETTLED_STATUSES.includes(c.status as any);
      if (isSettled) {
        // Settled Amount (Use Actual Settled Amount from Bank)
        groups[key].settled += Number(c.formData?.set_incl_tds || c.formData?.set_incl_tds_amt || c.formData?.fin_app_amt || c.formData?.set_partial_amt || 0);
      } else {
        const finalAppAmt = Number(c.formData?.fin_app_amt || 0);
        groups[key].finalApprovalAmount += finalAppAmt;

        if (
            c.status.includes('Approved') || 
            c.status === ClaimStatus.FILE_DISPATCHED || 
            c.status.includes('Process') ||
            c.status.includes('Query') // Post-discharge queries count as outstanding pipeline
        ) {
          // Outstanding: Approved Amount waiting for settlement (using Final Approval Amt)
          groups[key].outstanding += finalAppAmt;
        }
      }

      // ACTUAL TAT Calculation
      // 1. Pre-Auth TAT
      const preAuthStart = c.history?.find(h => h.status === ClaimStatus.PRE_AUTH_INITIATED);
      const preAuthEnd = c.history?.find(h => h.status === ClaimStatus.PRE_AUTH_APPROVED || h.status === ClaimStatus.PRE_AUTH_REJECTED || h.status === ClaimStatus.INITIAL_QUERY_PENDING);
      
      if (preAuthStart && preAuthEnd) {
         const hours = getDurationHours(preAuthStart.date, preAuthEnd.date);
         groups[key].preAuthTatSum += hours;
         groups[key].preAuthCount++;
      }

      // 2. Discharge TAT
      const disStart = c.history?.find(h => h.status === ClaimStatus.DISCHARGE_INITIATED);
      const disEnd = c.history?.find(h => h.status === ClaimStatus.DISCHARGE_APPROVED || h.status === ClaimStatus.DISCHARGE_REJECTED);
      
      if (disStart && disEnd) {
         const hours = getDurationHours(disStart.date, disEnd.date);
         groups[key].dischargeTatSum += hours;
         groups[key].dischargeCount++;
      }
    });

    // Average out TATs and Sort
    const result = Object.values(groups).map(g => ({
      name: g.name,
      count: g.count,
      amount: g.amount,
      finalApprovalAmount: g.finalApprovalAmount,
      settled: g.settled,
      outstanding: g.outstanding,
      // Calculate averages, default to 0 if no data
      preAuthTat: g.preAuthCount > 0 ? +(g.preAuthTatSum / g.preAuthCount).toFixed(1) : 0,
      dischargeTat: g.dischargeCount > 0 ? +(g.dischargeTatSum / g.dischargeCount).toFixed(1) : 0,
      sortDate: g.sortDate
    })).sort((a, b) => a.sortDate - b.sortDate);

    return result;
  }, [accessibleClaims, timeFilter, SETTLED_STATUSES]);

  // --- KPI CALCULATIONS ---
  const stats = useMemo(() => {
    // Total Volume based on Final Bill Amount
    const totalVolume = accessibleClaims.reduce((acc, c) => acc + Number(c.formData?.dis_total_bill || c.estimatedCost || 0), 0);
    
    const totalCount = accessibleClaims.length;
    
    const approvedCount = accessibleClaims.filter(c => c.status.includes('Approved') || SETTLED_STATUSES.includes(c.status as any)).length;
    const rejectedCount = accessibleClaims.filter(c => c.status.includes('Rejected')).length;
    const queryCount = accessibleClaims.filter(c => c.status.includes('Query')).length;
    const closedCount = accessibleClaims.filter(c => SETTLED_STATUSES.includes(c.status as any)).length;
    const activeCount = totalCount - closedCount;

    const totalSettled = accessibleClaims.filter(c => SETTLED_STATUSES.includes(c.status as any))
                               .reduce((acc, c) => acc + Number(c.formData?.set_incl_tds || c.formData?.set_incl_tds_amt || c.formData?.fin_app_amt || c.formData?.set_partial_amt || 0), 0);
    
    // Outstanding Amount should be Final Approval Amt for eligible cases
    const totalOutstanding = accessibleClaims.filter(c => 
        !SETTLED_STATUSES.includes(c.status as any) && (
          c.status.includes('Approved') || 
          c.status.includes('Process') || 
          c.status === ClaimStatus.FILE_DISPATCHED ||
          c.status.includes('Query')
        )
    ).reduce((acc, c) => {
        const val = Number(c.formData?.fin_app_amt || 0);
        return acc + val;
    }, 0);
    
    // Actual Avg Pre-Auth TAT Calculation
    let totalPreAuthHours = 0;
    let preAuthCount = 0;
    let actionPendingCount = 0;
    
    // Insurer Performance for TAT Chart (Actual Data)
    const insurerMap: Record<string, { name: string, preAuthSum: number, preAuthCount: number, disSum: number, disCount: number }> = {};

    accessibleClaims.forEach(c => {
      // Overall Avg Pre-Auth TAT
      const paStart = c.history?.find(h => h.status === ClaimStatus.PRE_AUTH_INITIATED);
      const paEnd = c.history?.find(h => h.status === ClaimStatus.PRE_AUTH_APPROVED || h.status === ClaimStatus.PRE_AUTH_REJECTED);
      
      if (paStart && paEnd) {
         const hours = getDurationHours(paStart.date, paEnd.date);
         totalPreAuthHours += hours;
         preAuthCount++;
         
         // Per Insurer Stats
         const insName = (c.insuranceProvider || '').split(' ')[0]; // Short name
         if(!insurerMap[insName]) insurerMap[insName] = { name: insName, preAuthSum: 0, preAuthCount: 0, disSum: 0, disCount: 0 };
         
         insurerMap[insName].preAuthSum += hours;
         insurerMap[insName].preAuthCount++;
      }

      // Per Insurer Discharge TAT
      const disStart = c.history?.find(h => h.status === ClaimStatus.DISCHARGE_INITIATED);
      const disEnd = c.history?.find(h => h.status === ClaimStatus.DISCHARGE_APPROVED);
      
      if (disStart && disEnd) {
         const hours = getDurationHours(disStart.date, disEnd.date);
         const insName = (c.insuranceProvider || '').split(' ')[0];
         if(!insurerMap[insName]) insurerMap[insName] = { name: insName, preAuthSum: 0, preAuthCount: 0, disSum: 0, disCount: 0 };
         
         insurerMap[insName].disSum += hours;
         insurerMap[insName].disCount++;
      }

      // Action Pending (TAT > 1 hr)
      if (c.status !== ClaimStatus.COMPLETE_SETTLEMENT && c.status !== ClaimStatus.ACCOUNT_RECONCILIATION) {
        const lastUpdateDate = parseDate(c.updatedAt);
        const lastUpdate = lastUpdateDate.getTime();
        const now = new Date().getTime();
        if (!isNaN(lastUpdate) && (now - lastUpdate) / (1000 * 60 * 60) > 1) {
          actionPendingCount++;
        }
      }
    });

    const avgPreAuthTatVal = preAuthCount > 0 ? (totalPreAuthHours / preAuthCount).toFixed(1) : "0";
    const tatCompliance = preAuthCount > 0 ? Math.round((accessibleClaims.filter(c => {
      const start = c.history?.find(h => h.status === ClaimStatus.PRE_AUTH_INITIATED);
      const end = c.history?.find(h => h.status === ClaimStatus.PRE_AUTH_APPROVED);
      return start && end && getDurationHours(start.date, end.date) <= 2;
    }).length / preAuthCount) * 100) : 0;

    const tatData = Object.values(insurerMap)
      .map(i => ({ 
        name: i.name, 
        PreAuth: i.preAuthCount > 0 ? +(i.preAuthSum / i.preAuthCount).toFixed(1) : 0, 
        Discharge: i.disCount > 0 ? +(i.disSum / i.disCount).toFixed(1) : 0,
      }))
      .sort((a,b) => b.PreAuth - a.PreAuth)
      .slice(0, 6);

    // Hospital Stats
    const activeHospitals = new Set(accessibleClaims.map(c => c.formData?.hospitalId)).size;
    const totalHospitals = hospitals.filter(h => h.entityType === 'Hospital').length;

    // Recovery Stats
    const totalRecovered = accessibleRecoveries.reduce((acc, r) => acc + r.recoveredAmount, 0);
    const recoveryRate = totalOutstanding > 0 ? Math.round((totalRecovered / totalOutstanding) * 100) : 0;

    return {
      totalVolume,
      totalCount,
      totalSettled,
      totalOutstanding,
      tatData,
      avgPreAuthTatVal,
      approvedCount,
      rejectedCount,
      queryCount,
      closedCount,
      activeCount,
      actionPendingCount,
      tatCompliance,
      activeHospitals,
      totalHospitals,
      totalRecovered,
      recoveryRate,
      approvalRate: totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0,
      queryRate: totalCount > 0 ? Math.round((queryCount / totalCount) * 100) : 0,
      cashlessSplit: 85,
      reimbursementSplit: 15
    };
  }, [accessibleClaims, accessibleRecoveries, hospitals]);

  // --- NEW AGGREGATIONS FOR OPERATIONS, RECOVERY, MANAGEMENT ---
  
  const operationsData = useMemo(() => {
    const pendingCount = accessibleClaims.filter(c => 
      c.status !== ClaimStatus.COMPLETE_SETTLEMENT && 
      c.status !== ClaimStatus.DISCHARGE_REJECTED &&
      c.status !== ClaimStatus.PRE_AUTH_REJECTED
    ).length;

    const queryPending = accessibleQueries.filter(q => q.status === 'Pending').length;
    const queryResolved = accessibleQueries.filter(q => q.status === 'Resolved').length;

    const stageDist = [
      { name: 'Pre-Auth', value: accessibleClaims.filter(c => c.status.includes('Pre Auth')).length },
      { name: 'Enhancement', value: accessibleClaims.filter(c => c.status.includes('Enhancement')).length },
      { name: 'Discharge', value: accessibleClaims.filter(c => c.status.includes('Discharge')).length },
      { name: 'Settlement', value: accessibleClaims.filter(c => c.status.includes('Settlement') || c.status.includes('Process') || c.status === ClaimStatus.FILE_DISPATCHED).length },
    ];

    // --- INSURER & TPA REJECTION & QUERY ANALYTICS ---
    const claimQueryIds = new Set(accessibleQueries.map(q => q.claimId));

    let totalRejectedClaims = 0;
    let totalQueryClaims = 0;

    const insurerStatsMap: Record<string, { total: number; rejections: number; queries: number }> = {};
    const tpaStatsMap: Record<string, { total: number; rejections: number; queries: number }> = {};

    accessibleClaims.forEach(c => {
      const rawInsurer = c.insuranceProvider || c.formData?.insurer || c.formData?.insurance_company || 'Direct / Unspecified';
      const insurerName = rawInsurer.trim();

      const rawTpa = c.formData?.tpa_provider || c.formData?.tpa || 'Direct / No TPA';
      const tpaName = rawTpa.trim();

      const isRejected = (c.status || '').toLowerCase().includes('reject');
      const hasQuery = (c.status || '').toLowerCase().includes('query') || claimQueryIds.has(c.id);

      if (isRejected) totalRejectedClaims += 1;
      if (hasQuery) totalQueryClaims += 1;

      // Insurer Map
      if (!insurerStatsMap[insurerName]) {
        insurerStatsMap[insurerName] = { total: 0, rejections: 0, queries: 0 };
      }
      insurerStatsMap[insurerName].total += 1;
      if (isRejected) insurerStatsMap[insurerName].rejections += 1;
      if (hasQuery) insurerStatsMap[insurerName].queries += 1;

      // TPA Map
      if (!tpaStatsMap[tpaName]) {
        tpaStatsMap[tpaName] = { total: 0, rejections: 0, queries: 0 };
      }
      tpaStatsMap[tpaName].total += 1;
      if (isRejected) tpaStatsMap[tpaName].rejections += 1;
      if (hasQuery) tpaStatsMap[tpaName].queries += 1;
    });

    const insurerAnalytics = Object.entries(insurerStatsMap).map(([name, data]) => {
      const rejectionRatio = data.total > 0 ? Number(((data.rejections / data.total) * 100).toFixed(1)) : 0;
      const queryRatio = data.total > 0 ? Number(((data.queries / data.total) * 100).toFixed(1)) : 0;
      return {
        name,
        total: data.total,
        rejections: data.rejections,
        rejectionRatio,
        queries: data.queries,
        queryRatio
      };
    }).sort((a, b) => b.total - a.total);

    const tpaAnalytics = Object.entries(tpaStatsMap).map(([name, data]) => {
      const rejectionRatio = data.total > 0 ? Number(((data.rejections / data.total) * 100).toFixed(1)) : 0;
      const queryRatio = data.total > 0 ? Number(((data.queries / data.total) * 100).toFixed(1)) : 0;
      return {
        name,
        total: data.total,
        rejections: data.rejections,
        rejectionRatio,
        queries: data.queries,
        queryRatio
      };
    }).sort((a, b) => b.total - a.total);

    const totalClaims = accessibleClaims.length;
    const overallRejectionRatio = totalClaims > 0 ? Number(((totalRejectedClaims / totalClaims) * 100).toFixed(1)) : 0;
    const overallQueryRatio = totalClaims > 0 ? Number(((totalQueryClaims / totalClaims) * 100).toFixed(1)) : 0;

    return { 
      pendingCount, 
      queryPending, 
      queryResolved, 
      stageDist,
      insurerAnalytics,
      tpaAnalytics,
      totalClaims,
      totalRejectedClaims,
      overallRejectionRatio,
      totalQueryClaims,
      overallQueryRatio
    };
  }, [accessibleClaims, accessibleQueries]);

  const recoveryData = useMemo(() => {
    const totalRecoverable = accessibleRecoveries.reduce((sum, r) => sum + r.recoverableAmount, 0);
    const totalRecovered = accessibleRecoveries.reduce((sum, r) => sum + r.recoveredAmount, 0);
    const pendingRecovery = totalRecoverable - totalRecovered;

    const insurerRecovery: Record<string, number> = {};
    accessibleRecoveries.forEach(r => {
      const claim = accessibleClaims.find(c => c.id === r.claimId);
      if (claim) {
        const ins = (claim.insuranceProvider || '').split(' ')[0];
        insurerRecovery[ins] = (insurerRecovery[ins] || 0) + r.recoveredAmount;
      }
    });

    const insurerChartData = Object.entries(insurerRecovery).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const hospitalRecovery: Record<string, number> = {};
    accessibleRecoveries.forEach(r => {
      const claim = accessibleClaims.find(c => c.id === r.claimId);
      if (claim) {
        const hospId = claim.formData?.hospitalId;
        const hosp = hospitals.find(h => h.id === hospId)?.displayName || hospId || 'Unknown';
        hospitalRecovery[hosp] = (hospitalRecovery[hosp] || 0) + r.recoveredAmount;
      }
    });

    const hospitalChartData = Object.entries(hospitalRecovery).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      totalRecoverable, totalRecovered, pendingRecovery, insurerChartData, hospitalChartData
    };
  }, [accessibleRecoveries, accessibleClaims, hospitals]);

  const monthWiseRecon = useMemo(() => {
    // Generate last 7 months labels matching the "May-25" format
    const months: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // Set to 1st of the month to prevent end-of-month overflow (e.g. Feb 30th -> March 2nd)
      d.setMonth(d.getMonth() - i);
      // Format as "May-25"
      const monthStr = d.toLocaleDateString('en-GB', { month: 'short' });
      const yearStr = d.toLocaleDateString('en-GB', { year: '2-digit' });
      months.push(`${monthStr}-${yearStr}`);
    }

    const categories = [
      'Complete Settlement',
      'Partial Settled Recoverable',
      'Partial Settled - Non Recoverable',
      'Outstanding'
    ];

    const data: Record<string, Record<string, { count: number, amount: number }>> = {};
    
    // Initialize
    categories.forEach(cat => {
      data[cat] = {};
      months.forEach(m => {
        data[cat][m] = { count: 0, amount: 0 };
      });
      data[cat]['Total'] = { count: 0, amount: 0 };
    });

    accessibleClaims.forEach(c => {
      const finAppAmt = Number(c.formData?.fin_app_amt || 0);
      if (finAppAmt <= 0) return; // Only visible if patient final approval is received

      // Use Discharge Date if available, else Created At
      const dateRef = c.formData?.dis_date || c.createdAt;
      const d = parseDate(dateRef);
      if (isNaN(d.getTime())) return;
      
      const monthKey = `${d.toLocaleDateString('en-GB', { month: 'short' })}-${d.toLocaleDateString('en-GB', { year: '2-digit' })}`;
      if (!months.includes(monthKey)) return;

      let category = '';
      let amount = 0;

      // Classification logic based on status
      if (c.status === ClaimStatus.COMPLETE_SETTLEMENT || 
          c.status === ClaimStatus.ACCOUNT_RECONCILIATION || 
          c.status === ClaimStatus.SETTLED || 
          c.status === ClaimStatus.BANK_RECONCILIATION_COMPLETED) {
        category = 'Complete Settlement';
        amount = Number(c.formData?.set_incl_tds || c.formData?.set_incl_tds_amt || c.formData?.paid_amount || finAppAmt);
      } else if (c.status === ClaimStatus.PARTIAL_SETTLEMENT_RECOVERABLE) {
        category = 'Partial Settled Recoverable';
        amount = Number(c.formData?.set_incl_tds || c.formData?.set_incl_tds_amt || c.formData?.paid_amount || c.formData?.set_partial_amt || finAppAmt);
      } else if (c.status === ClaimStatus.PARTIAL_SETTLEMENT_NON_RECOVERABLE) {
        category = 'Partial Settled - Non Recoverable';
        amount = Number(c.formData?.set_incl_tds || c.formData?.set_incl_tds_amt || c.formData?.paid_amount || c.formData?.set_partial_amt || finAppAmt);
      } else {
        category = 'Outstanding';
        amount = finAppAmt;
      }

      if (category && data[category][monthKey]) {
        data[category][monthKey].count += 1;
        data[category][monthKey].amount += amount;
        data[category]['Total'].count += 1;
        data[category]['Total'].amount += amount;
      }
    });

    // Calculate Grand Totals
    const grandTotal: Record<string, { count: number, amount: number }> = {};
    months.forEach(m => {
      grandTotal[m] = { count: 0, amount: 0 };
      categories.forEach(cat => {
        grandTotal[m].count += data[cat][m].count;
        grandTotal[m].amount += data[cat][m].amount;
      });
    });
    grandTotal['Total'] = { count: 0, amount: 0 };
    categories.forEach(cat => {
      grandTotal['Total'].count += data[cat]['Total'].count;
      grandTotal['Total'].amount += data[cat]['Total'].amount;
    });

    return { months, categories, data, grandTotal };
  }, [accessibleClaims, accessibleRecoveries]);

  const funnelData = useMemo(() => {
    const intakeClaims = accessibleClaims;
    const preAuthClaims = accessibleClaims.filter(c => c.status.includes('Pre Auth'));
    const enhancementClaims = accessibleClaims.filter(c => c.status.includes('Enhancement'));
    const dischargeClaims = accessibleClaims.filter(c => c.status.includes('Discharge'));
    const approvedClaims = accessibleClaims.filter(c => c.status.includes('Approved') || SETTLED_STATUSES.includes(c.status as any));
    const settledClaims = accessibleClaims.filter(c => SETTLED_STATUSES.includes(c.status as any));

    const sumTotalBillOrEstimated = (claims: any[]) => claims.reduce((acc, c) => acc + Number(c.formData?.dis_total_bill || c.estimatedCost || 0), 0);
    const sumPreAuthApp = (claims: any[]) => claims.reduce((acc, c) => acc + Number(c.formData?.pre_auth_app_amt || c.formData?.dis_total_bill || c.estimatedCost || 0), 0);
    const sumEnhApp = (claims: any[]) => claims.reduce((acc, c) => acc + Number(c.formData?.enh_app_amt || c.formData?.pre_auth_app_amt || c.formData?.dis_total_bill || c.estimatedCost || 0), 0);
    const sumDischargeTotal = (claims: any[]) => claims.reduce((acc, c) => acc + Number(c.formData?.dis_total_bill || c.estimatedCost || 0), 0);
    const sumApprovedApp = (claims: any[]) => claims.reduce((acc, c) => {
      return acc + Number(c.formData?.fin_app_amt || c.formData?.set_incl_tds || c.formData?.set_incl_tds_amt || c.formData?.dis_total_bill || c.estimatedCost || 0);
    }, 0);
    const sumSettled = (claims: any[]) => claims.reduce((acc, c) => acc + Number(c.formData?.set_incl_tds || c.formData?.set_incl_tds_amt || c.formData?.fin_app_amt || c.formData?.set_partial_amt || 0), 0);

    return [
      { name: 'Intake', value: intakeClaims.length, amount: sumTotalBillOrEstimated(intakeClaims), fill: '#dbeafe' },
      { name: 'Pre-Auth', value: preAuthClaims.length, amount: sumPreAuthApp(preAuthClaims), fill: '#bfdbfe' },
      { name: 'Enhancement', value: enhancementClaims.length, amount: sumEnhApp(enhancementClaims), fill: '#93c5fd' },
      { name: 'Discharge', value: dischargeClaims.length, amount: sumDischargeTotal(dischargeClaims), fill: '#60a5fa' },
      { name: 'Approved', value: approvedClaims.length, amount: sumApprovedApp(approvedClaims), fill: '#3b82f6' },
      { name: 'Settled', value: settledClaims.length, amount: sumSettled(settledClaims), fill: '#10b981' }
    ];
  }, [accessibleClaims, SETTLED_STATUSES]);

  const managementData = useMemo(() => {
    const now = new Date();
    const aging = [
      { range: '0-30 Days', count: 0, amount: 0 },
      { range: '31-60 Days', count: 0, amount: 0 },
      { range: '61-90 Days', count: 0, amount: 0 },
      { range: '90+ Days', count: 0, amount: 0 },
    ];

    accessibleClaims.forEach(c => {
      if (SETTLED_STATUSES.includes(c.status as any)) return;
      const created = parseDate(c.createdAt);
      if (isNaN(created.getTime())) return;
      const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      
      const hasFinalApproval = Number(c.formData?.fin_app_amt || 0) > 0;
      if (!hasFinalApproval) return; // Only include claims with Final Approval Received

      const amount = Number(c.formData?.fin_app_amt || 0);
      
      if (diffDays <= 30) { 
        aging[0].count++; 
        aging[0].amount += amount;
      } else if (diffDays <= 60) { 
        aging[1].count++; 
        aging[1].amount += amount;
      } else if (diffDays <= 90) { 
        aging[2].count++; 
        aging[2].amount += amount;
      } else { 
        aging[3].count++; 
        aging[3].amount += amount;
      }
    });

    const highRiskCount = accessibleClaims.filter(c => (c.aiInsights?.riskScore?.score || 0) > 70).length;
    const approvalRate = accessibleClaims.length > 0 ? (accessibleClaims.filter(c => c.status.includes('Approved')).length / accessibleClaims.length) * 100 : 0;

    return { aging, highRiskCount, approvalRate };
  }, [accessibleClaims, SETTLED_STATUSES]);

  // --- COLORS ---
  const COLORS = ['#000080', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <>
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
            {activeTab === 'Business' ? 'Business Analytics' : 
             activeTab === 'Operations' ? 'Operations Dashboard' : 
             activeTab === 'Recovery' ? 'Recovery Dashboard' : 'Management Dashboard'}
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            {activeTab === 'Business' ? 'Cashless Claims Performance Intelligence' : 
             activeTab === 'Operations' ? 'Operational Efficiency & Workflow Tracking' : 
             activeTab === 'Recovery' ? 'Financial Recovery & Settlement Tracking' : 'Executive Oversight & Risk Management'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {currentUser?.role === 'Medical Officer' && (
            <button 
              onClick={() => setShowPerformancePanel(true)}
              className="flex items-center justify-center px-6 py-3.5 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95 whitespace-nowrap w-full sm:w-auto"
            >
              <TrendingUp size={16} className="mr-2" /> My Performance
            </button>
          )}



          <button 
            onClick={() => {
              // In a real app, this would fetch new data from Firebase
              window.location.reload();
            }}
            className="flex items-center justify-center p-3.5 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-200 transition-all active:scale-95"
            title="Refresh Dashboard"
          >
            <History size={16} />
          </button>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner overflow-x-auto no-scrollbar w-full sm:w-auto">
            {availableTabs.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-[#000080] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner overflow-x-auto no-scrollbar w-full sm:w-auto">
            {(['Daily', 'Monthly', 'Quarterly', 'Yearly'] as TimeFrame[]).map(tf => (
              <button 
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${timeFilter === tf ? 'bg-white text-[#000080] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'Business' && (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentUser.role === 'Manager' ? (
              <>
                <KpiCard label="Total Cases Assigned" value={stats.totalCount.toString()} subValue="Under your scope" icon={Briefcase} color="blue" />
                <KpiCard label="Action Pending" value={stats.actionPendingCount.toString()} subValue="TAT > 1 hr" icon={AlertCircle} color="amber" trend="Critical" />
                <KpiCard label="Cases Closed" value={stats.closedCount.toString()} subValue="Settled/Reconciled" icon={CheckCircle2} color="emerald" />
                <KpiCard label="Escalations" value="2" subValue="High priority" icon={ShieldAlert} color="rose" />
              </>
            ) : currentUser.role === 'Operations Head' ? (
              <>
                <KpiCard label="Total Active Cases" value={stats.activeCount.toString()} subValue="In pipeline" icon={Activity} color="blue" />
                <KpiCard label="Approval Rate" value={`${stats.approvalRate}%`} subValue="Overall success" icon={CheckCircle2} color="emerald" />
                <KpiCard label="Query Rate" value={`${stats.queryRate}%`} subValue="Efficiency metric" icon={HelpCircle} color="amber" />
                <KpiCard label="TAT Compliance" value={`${stats.tatCompliance}%`} subValue="SLA Met" icon={Timer} color="indigo" />
              </>
            ) : currentUser.role === 'Sales Head' || currentUser.role === 'Sales National Head' ? (
              <>
                <KpiCard label="Active Hospitals" value={stats.activeHospitals.toString()} subValue={`of ${stats.totalHospitals} total`} icon={Building2} color="blue" />
                <KpiCard label="Total Business" value={formatCurrency(stats.totalVolume)} subValue="Revenue generated" icon={TrendingUp} color="emerald" />
                <KpiCard label="Avg Cases/Hosp" value={(stats.totalCount / (stats.activeHospitals || 1)).toFixed(1)} subValue="Productivity" icon={Users} color="indigo" />
                <KpiCard label="New Onboarding" value="4" subValue="This month" icon={PlusCircle} color="amber" />
              </>
            ) : currentUser.role === 'COO' || currentUser.role === 'CEO' ? (
              <>
                <KpiCard label="Total Revenue" value={formatCurrency(stats.totalVolume)} subValue="Business Volume" icon={IndianRupee} color="blue" />
                <KpiCard label="Total Claims" value={stats.totalCount.toString()} subValue="Processed volume" icon={Briefcase} color="indigo" />
                <KpiCard label="Recovery Rate" value={`${stats.recoveryRate}%`} subValue="Performance" icon={ShieldCheck} color="emerald" />
                <KpiCard label="Avg TAT" value={`${stats.avgPreAuthTatVal} Hrs`} subValue="Operational speed" icon={Timer} color="amber" />
              </>
            ) : (
              <>
                <KpiCard label="Total Business Value" value={formatCurrency(stats.totalVolume)} subValue={`${stats.totalCount} Claims processed`} icon={Briefcase} trend="+12.5%" color="blue" />
                <KpiCard label="Outstanding (Pipeline)" value={formatCurrency(stats.totalOutstanding)} subValue="Approved but Unsettled" icon={Activity} trend="+5.2%" color="amber" />
                <KpiCard label="Total Settled (Realized)" value={formatCurrency(stats.totalSettled)} subValue="Credits in Bank" icon={IndianRupee} trend="+8.1%" color="emerald" />
                <KpiCard label="Avg Pre-Auth TAT" value={`${stats.avgPreAuthTatVal} Hrs`} subValue="Actual Average" icon={Timer} trend="Live" color="indigo" trendPositive />
              </>
            )}
          </div>

          {/* SYSTEM ANNOUNCEMENTS WIDGET */}
          {currentUser && (
            <div className="my-6">
              <DashboardAnnouncementsWidget currentUser={currentUser} />
            </div>
          )}

          {/* ROW 2: BUSINESS FLOW & OUTSTANDING */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* MAIN CHART: Business Volume & Revenue */}
            <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-8 h-[80px]" id="revenue-volume-trends-header">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                    <TrendingUp size={16} className="mr-2 text-blue-600" /> Revenue & Volume Trends
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Claim Count vs Final Bill Amount ({timeFilter})</p>
                </div>
                <div className="flex gap-4 text-[10px] font-bold uppercase">
                   <div className="flex items-center"><div className="w-3 h-3 bg-blue-100 rounded-sm mr-2"></div> Claim Count</div>
                   <div className="flex items-center"><div className="w-3 h-3 bg-[#000080] rounded-full mr-2"></div> Amount (₹)</div>
                </div>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => formatCurrency(val)} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', fontSize: '11px', marginBottom: '8px' }}
                      itemStyle={{ fontWeight: 700, fontSize: '11px' }}
                      formatter={(value: any, name: any) => {
                        const isAmount = name === 'amount';
                        const color = isAmount ? '#000080' : '#4f46e5'; // Navy for Amount, Indigo for Count
                        return [
                          <span style={{ color }}>{isAmount ? formatCurrency(value) : value}</span>,
                          <span style={{ color }}>{isAmount ? 'Revenue' : 'Count'}</span>
                        ];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="count" fill="#dbeafe" radius={[6, 6, 0, 0]} barSize={40} />
                    <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#000080" strokeWidth={3} dot={{r: 4, fill: '#000080', strokeWidth: 2, stroke: '#fff'}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* OUTSTANDING ANALYSIS */}
            <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
               <div className="mb-6">
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                    <AlertCircle size={16} className="mr-2 text-amber-500" /> Revenue Cycle
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Settled vs Outstanding ({timeFilter})</p>
               </div>
               <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={analyticsData}>
                        <defs>
                           <linearGradient id="colorSettled" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                          formatter={(value: any) => formatCurrency(value)}
                        />
                        <Area type="monotone" dataKey="settled" stackId="1" stroke="#10b981" fill="url(#colorSettled)" strokeWidth={2} />
                        <Area type="monotone" dataKey="outstanding" stackId="1" stroke="#f59e0b" fill="url(#colorOut)" strokeWidth={2} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
               
               <div className="flex flex-col gap-2 mt-4 text-[9px] font-medium text-slate-400">
                   <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> Settled: Amount credited to bank</div>
                   <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div> Outstanding: Approved Amount pending settlement</div>
               </div>
            </div>
          </div>

          {/* ROW 3: PROCESS VELOCITY (TAT) */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                      <Zap size={16} className="mr-2 text-indigo-600" /> Process Velocity (TAT Analysis)
                   </h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Actual Turnaround Time by Payer (Hrs)</p>
                </div>
                <Link to="/manage-claims" className="px-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">View All Payers</Link>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.tatData} layout="vertical" barCategoryGap={15}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                         <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} unit="h" />
                         <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 800}} />
                         <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} formatter={(val:number) => `${val}h`} />
                         <Legend verticalAlign="top" height={36} iconType="circle" />
                         <Bar dataKey="PreAuth" name="Pre-Auth (Hrs)" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                         <Bar dataKey="Discharge" name="Discharge (Hrs)" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                
                <div className="space-y-4">
                   <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600"><Timer size={20} /></div>
                         <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Fastest Approval</p>
                            <p className="text-lg font-black text-indigo-900">{stats.tatData[0]?.name || 'N/A'}</p>
                         </div>
                      </div>
                      <p className="text-2xl font-black text-indigo-600">{stats.tatData[0]?.PreAuth}h</p>
                   </div>
                   
                   <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <div className="p-3 bg-white rounded-xl shadow-sm text-amber-600"><Briefcase size={20} /></div>
                         <div>
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Settlement Lag</p>
                            <p className="text-lg font-black text-amber-900">Avg. Delay</p>
                         </div>
                      </div>
                      <p className="text-2xl font-black text-amber-600">~22 Days</p>
                   </div>
    
                   <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600"><Zap size={20} /></div>
                         <div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Discharge Efficiency</p>
                            <p className="text-lg font-black text-emerald-900">Target &lt; 4h</p>
                         </div>
                      </div>
                      <p className="text-2xl font-black text-emerald-600">85%</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Month wise reconciliation section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
             <div>
                <h2 className="text-sm font-black text-[#000080] uppercase tracking-widest flex items-center mb-6">
                   <BarChart3 size={16} className="mr-2" /> Month wise reconciliation
                </h2>
                
                {/* Count wise table */}
                <div className="space-y-4">
                  <div className="bg-[#000033] text-white px-4 py-2 rounded-t-xl text-xs font-black uppercase tracking-widest">Count wise</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                       <thead>
                          <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                             <th className="px-4 py-3 border border-slate-200">Month</th>
                             {monthWiseRecon.months.map(m => <th key={m} className="px-4 py-3 border border-slate-200 text-center">{m}</th>)}
                             <th className="px-4 py-3 border border-slate-200 text-center">Total</th>
                          </tr>
                       </thead>
                       <tbody className="text-[11px] font-bold text-slate-700">
                          {monthWiseRecon.categories.map(cat => (
                             <tr key={cat} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 border border-slate-200">{cat}</td>
                                {monthWiseRecon.months.map(m => (
                                   <td key={m} className="px-4 py-3 border border-slate-200 text-center tabular-nums">
                                      {monthWiseRecon.data[cat][m].count || '-'}
                                   </td>
                                ))}
                                <td className="px-4 py-3 border border-slate-200 text-center bg-slate-50 font-black">
                                   {monthWiseRecon.data[cat]['Total'].count}
                                </td>
                             </tr>
                          ))}
                          <tr className="bg-slate-100 font-black text-slate-900">
                             <td className="px-4 py-3 border border-slate-200">Grand Total</td>
                             {monthWiseRecon.months.map(m => (
                                <td key={m} className="px-4 py-3 border border-slate-200 text-center tabular-nums">
                                   {monthWiseRecon.grandTotal[m].count}
                                </td>
                             ))}
                             <td className="px-4 py-3 border border-slate-200 text-center bg-slate-200">
                                {monthWiseRecon.grandTotal['Total'].count}
                             </td>
                          </tr>
                       </tbody>
                    </table>
                  </div>
                </div>

                {/* Amount wise table */}
                <div className="space-y-4 mt-10">
                  <div className="bg-[#000033] text-white px-4 py-2 rounded-t-xl text-xs font-black uppercase tracking-widest">Amount wise</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                       <thead>
                          <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                             <th className="px-4 py-3 border border-slate-200">Month</th>
                             {monthWiseRecon.months.map(m => <th key={m} className="px-4 py-3 border border-slate-200 text-center">{m}</th>)}
                             <th className="px-4 py-3 border border-slate-200 text-center">Total</th>
                          </tr>
                       </thead>
                       <tbody className="text-[11px] font-bold text-slate-700">
                          {monthWiseRecon.categories.map(cat => (
                             <tr key={cat} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 border border-slate-200">{cat}</td>
                                {monthWiseRecon.months.map(m => (
                                   <td key={m} className="px-4 py-3 border border-slate-200 text-center tabular-nums">
                                      {monthWiseRecon.data[cat][m].amount ? monthWiseRecon.data[cat][m].amount.toLocaleString('en-IN') : '-'}
                                   </td>
                                ))}
                                <td className="px-4 py-3 border border-slate-200 text-center bg-slate-50 font-black">
                                   {monthWiseRecon.data[cat]['Total'].amount.toLocaleString('en-IN')}
                                </td>
                             </tr>
                          ))}
                          <tr className="bg-slate-100 font-black text-slate-900">
                             <td className="px-4 py-3 border border-slate-200">Grand Total</td>
                             {monthWiseRecon.months.map(m => (
                                <td key={m} className="px-4 py-3 border border-slate-200 text-center tabular-nums">
                                   {monthWiseRecon.grandTotal[m].amount.toLocaleString('en-IN')}
                                </td>
                             ))}
                             <td className="px-4 py-3 border border-slate-200 text-center bg-slate-200">
                                {monthWiseRecon.grandTotal['Total'].amount.toLocaleString('en-IN')}
                             </td>
                          </tr>
                       </tbody>
                    </table>
                  </div>
                </div>
             </div>
          </div>
        </>
      )}

      {activeTab === 'Operations' && (() => {
        const currentAnalytics = opsEntityType === 'insurer' 
          ? operationsData.insurerAnalytics 
          : operationsData.tpaAnalytics;

        const filteredAnalytics = currentAnalytics.filter(item => 
          item.name.toLowerCase().includes(opsSearchTerm.toLowerCase())
        );

        // Calculate entity summary highlights
        const maxRejectionEntity = [...currentAnalytics].sort((a, b) => b.rejectionRatio - a.rejectionRatio)[0];
        const maxQueryEntity = [...currentAnalytics].sort((a, b) => b.queryRatio - a.queryRatio)[0];
        const avgRejectionRatio = currentAnalytics.length > 0 
          ? (currentAnalytics.reduce((acc, curr) => acc + curr.rejectionRatio, 0) / currentAnalytics.length).toFixed(1)
          : '0.0';
        const avgQueryRatio = currentAnalytics.length > 0 
          ? (currentAnalytics.reduce((acc, curr) => acc + curr.queryRatio, 0) / currentAnalytics.length).toFixed(1)
          : '0.0';

        // Data for Pie / Donut charts
        const rejectionChartData = filteredAnalytics
          .filter(a => a.rejections > 0)
          .map(a => ({ name: a.name, value: a.rejections }));

        const queryChartData = filteredAnalytics
          .filter(a => a.queries > 0)
          .map(a => ({ name: a.name, value: a.queries }));

        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Operations KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard label="Claims Intake" value={stats.totalCount} subValue="Total operations volume" icon={ClipboardList} trend="Total" color="blue" />
              <KpiCard label="Active Pending" value={operationsData.pendingCount} subValue="In-flight pipeline" icon={Clock} trend="Active" color="amber" />
              <KpiCard label="Total Rejections" value={`${operationsData.totalRejectedClaims} (${operationsData.overallRejectionRatio}%)`} subValue="Overall rejection ratio" icon={AlertCircle} trend="Rejections" color="rose" />
              <KpiCard label="Total Queries" value={`${operationsData.totalQueryClaims} (${operationsData.overallQueryRatio}%)`} subValue="Overall query frequency" icon={HelpCircle} trend="Queries" color="blue" />
            </div>

            {/* Pipeline Stage Distribution & Query Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                  <PieChartIcon size={16} className="mr-2 text-blue-600" /> Stage Distribution
                </h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={operationsData.stageDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {operationsData.stageDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                  <History size={16} className="mr-2 text-indigo-600" /> Query Resolution Status
                </h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Pending', value: operationsData.queryPending },
                      { name: 'Resolved', value: operationsData.queryResolved }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                        <Cell fill="#f59e0b" />
                        <Cell fill="#10b981" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* INSURER & TPA WISE REJECTION & QUERY ANALYTICS SECTION */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-[#000080] rounded-2xl">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        Insurer & TPA Wise Rejection & Query Analytics
                      </h2>
                      <p className="text-xs font-semibold text-slate-500">
                        Operational ratio analysis of rejections and queries broken down by insurance companies & TPAs
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Entity Type Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button
                      onClick={() => setOpsEntityType('insurer')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${opsEntityType === 'insurer' ? 'bg-white text-[#000080] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <Building2 size={13} /> Insurer Wise
                    </button>
                    <button
                      onClick={() => setOpsEntityType('tpa')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${opsEntityType === 'tpa' ? 'bg-white text-[#000080] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <Building size={13} /> TPA Wise
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button
                      onClick={() => setOpsViewMode('chart')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${opsViewMode === 'chart' ? 'bg-white text-[#000080] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <BarChart3 size={13} /> Chart
                    </button>
                    <button
                      onClick={() => setOpsViewMode('table')}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${opsViewMode === 'table' ? 'bg-white text-[#000080] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <FileText size={13} /> Table
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Filter ${opsEntityType === 'insurer' ? 'Insurers' : 'TPAs'}...`}
                      value={opsSearchTerm}
                      onChange={(e) => setOpsSearchTerm(e.target.value)}
                      className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-44"
                    />
                    {opsSearchTerm && (
                      <button 
                        onClick={() => setOpsSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={() => handleExportOpsAnalytics(opsEntityType)}
                    className="px-4 py-2 bg-[#000080] hover:bg-blue-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    title={`Download ${opsEntityType === 'insurer' ? 'Insurer' : 'TPA'} Analytics Report`}
                  >
                    <Download size={13} /> Export Excel
                  </button>
                </div>
              </div>

              {/* Highlights Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total {opsEntityType === 'insurer' ? 'Insurers' : 'TPAs'}</p>
                  <p className="text-xl font-black text-slate-900">{currentAnalytics.length}</p>
                </div>
                <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Highest Rejection Ratio</p>
                  <p className="text-sm font-black text-rose-950 truncate" title={maxRejectionEntity ? `${maxRejectionEntity.name} (${maxRejectionEntity.rejectionRatio}%)` : 'N/A'}>
                    {maxRejectionEntity ? `${maxRejectionEntity.name}` : 'N/A'}
                  </p>
                  <p className="text-[11px] font-black text-rose-600">{maxRejectionEntity ? `${maxRejectionEntity.rejectionRatio}% ratio (${maxRejectionEntity.rejections} claims)` : '-'}</p>
                </div>
                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Highest Query Ratio</p>
                  <p className="text-sm font-black text-amber-950 truncate" title={maxQueryEntity ? `${maxQueryEntity.name} (${maxQueryEntity.queryRatio}%)` : 'N/A'}>
                    {maxQueryEntity ? `${maxQueryEntity.name}` : 'N/A'}
                  </p>
                  <p className="text-[11px] font-black text-amber-700">{maxQueryEntity ? `${maxQueryEntity.queryRatio}% ratio (${maxQueryEntity.queries} claims)` : '-'}</p>
                </div>
                <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Avg Ratios across Portfolio</p>
                  <div className="flex items-center gap-3 text-xs font-black text-slate-800">
                    <span className="text-rose-600" title="Average Rejection Ratio">Rej: {avgRejectionRatio}%</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-amber-600" title="Average Query Ratio">Que: {avgQueryRatio}%</span>
                  </div>
                </div>
              </div>

              {/* Chart / Diagrams View */}
              {opsViewMode === 'chart' ? (
                <div className="space-y-8 animate-in fade-in">
                  {/* Composed Chart: Rejections, Queries & Ratio % */}
                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          {opsEntityType === 'insurer' ? 'Insurer' : 'TPA'} Rejection & Query Volume & Ratio (%)
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-500">
                          Bars indicate absolute count; lines represent percentage ratio against total intake
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-rose-600"><span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> Rejections</span>
                        <span className="flex items-center gap-1.5 text-amber-600"><span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> Queries</span>
                        <span className="flex items-center gap-1.5 text-rose-700"><span className="w-3 h-0.5 bg-rose-600 inline-block"></span> Rejection %</span>
                        <span className="flex items-center gap-1.5 text-indigo-700"><span className="w-3 h-0.5 bg-indigo-600 inline-block"></span> Query %</span>
                      </div>
                    </div>

                    <div className="h-[360px] w-full">
                      {filteredAnalytics.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                          No {opsEntityType === 'insurer' ? 'Insurers' : 'TPAs'} found matching "{opsSearchTerm}"
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={filteredAnalytics.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
                              interval={0}
                              tickFormatter={(val) => val.length > 15 ? `${val.substring(0, 13)}...` : val}
                            />
                            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                              formatter={(value: any, name: any) => {
                                if (name === 'rejectionRatio') return [`${value}%`, 'Rejection Ratio'];
                                if (name === 'queryRatio') return [`${value}%`, 'Query Ratio'];
                                if (name === 'rejections') return [value, 'Rejections Count'];
                                if (name === 'queries') return [value, 'Queries Count'];
                                return [value, name];
                              }}
                            />
                            <Bar yAxisId="left" dataKey="rejections" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} name="rejections" />
                            <Bar yAxisId="left" dataKey="queries" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} name="queries" />
                            <Line yAxisId="right" type="monotone" dataKey="rejectionRatio" stroke="#e11d48" strokeWidth={3} dot={{ r: 4 }} name="rejectionRatio" />
                            <Line yAxisId="right" type="monotone" dataKey="queryRatio" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} name="queryRatio" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Distribution Diagrams */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertCircle size={14} className="text-rose-500" />
                        Rejection Breakdown by {opsEntityType === 'insurer' ? 'Insurer' : 'TPA'}
                      </h4>
                      <div className="h-[250px]">
                        {rejectionChartData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                            No rejections recorded
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={rejectionChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {rejectionChartData.map((entry, index) => (
                                  <Cell key={`rej-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <HelpCircle size={14} className="text-amber-500" />
                        Query Breakdown by {opsEntityType === 'insurer' ? 'Insurer' : 'TPA'}
                      </h4>
                      <div className="h-[250px]">
                        {queryChartData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                            No queries recorded
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={queryChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {queryChartData.map((entry, index) => (
                                  <Cell key={`que-cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Data Table View */}
              <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <table className="w-full text-left text-xs font-semibold">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">{opsEntityType === 'insurer' ? 'Insurer Name' : 'TPA Name'}</th>
                      <th className="px-6 py-4 text-center">Total Intake</th>
                      <th className="px-6 py-4 text-center">Rejections</th>
                      <th className="px-6 py-4 text-center">Rejection Ratio (%)</th>
                      <th className="px-6 py-4 text-center">Queries</th>
                      <th className="px-6 py-4 text-center">Query Ratio (%)</th>
                      <th className="px-6 py-4 text-center">Operational Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredAnalytics.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-bold">
                          No {opsEntityType === 'insurer' ? 'Insurer' : 'TPA'} records found matching your query
                        </td>
                      </tr>
                    ) : (
                      filteredAnalytics.map((item, idx) => {
                        const isHighRisk = item.rejectionRatio > 15 || item.queryRatio > 30;
                        const isModRisk = item.rejectionRatio > 5 || item.queryRatio > 15;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-black text-slate-900 flex items-center gap-2">
                              {opsEntityType === 'insurer' ? (
                                <Building2 size={16} className="text-blue-600 flex-shrink-0" />
                              ) : (
                                <Building size={16} className="text-indigo-600 flex-shrink-0" />
                              )}
                              <span>{item.name}</span>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-700">{item.total}</td>
                            <td className="px-6 py-4 text-center font-black text-rose-600 bg-rose-50/30">{item.rejections}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${item.rejectionRatio > 15 ? 'bg-rose-100 text-rose-800' : item.rejectionRatio > 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {item.rejectionRatio}%
                                </span>
                                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${item.rejectionRatio > 15 ? 'bg-rose-500' : item.rejectionRatio > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${Math.min(item.rejectionRatio, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-black text-amber-600 bg-amber-50/30">{item.queries}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${item.queryRatio > 25 ? 'bg-amber-100 text-amber-800' : item.queryRatio > 10 ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {item.queryRatio}%
                                </span>
                                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${item.queryRatio > 25 ? 'bg-amber-500' : item.queryRatio > 10 ? 'bg-blue-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${Math.min(item.queryRatio, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isHighRisk ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black">
                                  <AlertCircle size={12} /> High Rej/Query
                                </span>
                              ) : isModRisk ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black">
                                  <Clock size={12} /> Moderate
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black">
                                  <CheckCircle2 size={12} /> Optimal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'Recovery' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KpiCard label="Total Recoverable" value={formatCurrency(recoveryData.totalRecoverable)} subValue="Total amount to be recovered" icon={IndianRupee} trend="Target" color="blue" />
            <KpiCard label="Total Recovered" value={formatCurrency(recoveryData.totalRecovered)} subValue="Amount successfully realized" icon={CheckCircle2} trend="Realized" color="emerald" />
            <KpiCard label="Pending Recovery" value={formatCurrency(recoveryData.pendingRecovery)} subValue="Balance outstanding" icon={TrendingDown} trend="Outstanding" color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                <BarChart3 size={16} className="mr-2 text-blue-600" /> Recovery by Insurer
              </h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recoveryData.insurerChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrency(val)} />
                    <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="value" fill="#000080" radius={[0, 4, 4, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                <Building2 size={16} className="mr-2 text-indigo-600" /> Recovery by Hospital
              </h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recoveryData.hospitalChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => formatCurrency(val)} />
                    <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                <Timer size={16} className="mr-2 text-rose-600" /> Aging Analysis (Recon)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {managementData.aging.map((bucket, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleAgingClick(bucket.range)}
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                  >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-600">{bucket.range}</p>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{bucket.count}</h3>
                    <p className="text-[9px] font-bold text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                      View Details <ArrowUpRight size={10} className="ml-1" />
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                <IndianRupee size={16} className="mr-2 text-emerald-600" /> Outstanding Amount of Aging
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {managementData.aging.map((bucket, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleAgingClick(bucket.range)}
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left group"
                  >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600">{bucket.range}</p>
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter">{formatCurrency(bucket.amount)}</h3>
                    <p className="text-[9px] font-bold text-emerald-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                      View Details <ArrowUpRight size={10} className="ml-1" />
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'Management' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                    <TrendingUp size={16} className="mr-2 text-blue-600" /> Claim Funnel Analysis
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Conversion from Intake to Settlement</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <BrainCircuit size={16} />
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                      <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" axisLine={false} tickLine={false} tick={{fill: '#3b82f6', fontSize: 10, fontWeight: 700}} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" axisLine={false} tickLine={false} tick={{fill: '#10b981', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => formatCurrency(val)} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        formatter={(val: any, name: string) => {
                          if (name === "Count") return [val, "Value (Claims Count)"];
                          if (name === "Amount") return [formatCurrency(Number(val)), "Respective Amount"];
                          return [val, name];
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                      <Bar yAxisId="left" dataKey="value" name="Count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar yAxisId="right" dataKey="amount" name="Amount" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 border-t border-slate-100">
                  {funnelData.map((item) => (
                    <div key={item.name} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center flex flex-col justify-between">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.name}</p>
                      <div className="mt-2 space-y-1.5">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Value (Count)</p>
                          <p className="text-sm font-black text-indigo-600 tabular-nums">{item.value}</p>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200/50">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Respective Amount</p>
                          <p className="text-[10px] font-black text-[#10b981] tabular-nums">{formatCurrency(item.amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                <Timer size={16} className="mr-2 text-indigo-600" /> TAT Compliance Breakdown
              </h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Within SLA', value: stats.tatCompliance },
                        { name: 'Delayed', value: 100 - stats.tatCompliance }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-black text-emerald-700 uppercase">Avg Pre-Auth TAT</span>
                  <span className="text-sm font-black text-emerald-900">{stats.avgPreAuthTatVal} Hrs</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <span className="text-[10px] font-black text-rose-700 uppercase">Action Pending</span>
                  <span className="text-sm font-black text-rose-900">{stats.actionPendingCount} Cases</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: INSURER & HOSPITAL PERFORMANCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                <Building2 size={16} className="mr-2 text-amber-600" /> Insurer/TPA Performance
              </h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.tatData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 800}} />
                    <Tooltip />
                    <Bar dataKey="PreAuth" name="TAT (Hrs)" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                <Activity size={16} className="mr-2 text-emerald-600" /> Hospital Performance Matrix
              </h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={hospitals.filter(h => h.entityType === 'Hospital').slice(0, 6).map(h => ({
                    name: (h.hospitalName || h.displayName || '').split(' ')[0],
                    volume: accessibleClaims.filter(c => c.formData?.hospitalId === h.id).length,
                    revenue: accessibleClaims.filter(c => c.formData?.hospitalId === h.id).reduce((acc, c) => acc + Number(c.formData?.dis_total_bill || 0), 0)
                  }))}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="volume" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#000080" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 3: REVENUE ANALYTICS */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                  <IndianRupee size={16} className="mr-2 text-emerald-600" /> Revenue Analytics & Recovery
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total Volume vs Settled vs Recovered</p>
              </div>
              <div className="flex gap-4">
                <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Export Report</button>
              </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSettled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `₹${(val/100000).toFixed(1)}L`} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Area type="monotone" dataKey="finalApprovalAmount" name="Total Volume" stroke="#3b82f6" fill="url(#colorVolume)" strokeWidth={3} />
                  <Area type="monotone" dataKey="settled" name="Settled" stroke="#10b981" fill="url(#colorSettled)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>

    {showPerformancePanel && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><TrendingUp size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">My Performance Metrics</h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Medical Officer Efficiency & Quality Insights</p>
                </div>
              </div>
              <button onClick={() => setShowPerformancePanel(false)} className="p-3 text-slate-400 hover:bg-white hover:text-slate-600 rounded-xl transition-all"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Cases Reviewed (Today)</p>
                  <h3 className="text-3xl font-black text-blue-900">12</h3>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Avg Review Time</p>
                  <h3 className="text-3xl font-black text-emerald-900">18m</h3>
                </div>
                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Query Rate</p>
                  <h3 className="text-3xl font-black text-amber-900">8.5%</h3>
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Weekly Productivity</h4>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { day: 'Mon', count: 15 },
                      { day: 'Tue', count: 18 },
                      { day: 'Wed', count: 12 },
                      { day: 'Thu', count: 20 },
                      { day: 'Fri', count: 14 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Quality Metrics</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                        <span className="text-slate-500">Approval Accuracy</span>
                        <span className="text-emerald-600">98%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                        <span className="text-slate-500">Documentation Quality</span>
                        <span className="text-blue-600">92%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">AI Performance Insights</h4>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-700 leading-relaxed italic">
                      "Your review time for 'Cardiac' cases is 20% faster than the team average. Consider sharing your checklist with the team."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAgingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Timer size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Aging Analysis: {selectedAgingBucket}</h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Detailed Patient & Hospital Wise Breakdown</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleExport(`Aging_${selectedAgingBucket?.replace('+', 'Plus')}`)}
                  className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all"
                >
                  <Download size={14} className="mr-2" /> Export Excel
                </button>
                <button onClick={() => setShowAgingModal(false)} className="p-3 text-slate-400 hover:bg-white hover:text-slate-600 rounded-xl transition-all"><X size={24} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospital</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurer / TPA</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aging</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accessibleClaims.filter(c => {
                      if (SETTLED_STATUSES.includes(c.status as any)) return false;
                      const hasFinalApproval = Number(c.formData?.fin_app_amt || 0) > 0;
                      if (!hasFinalApproval) return false;
                      const created = parseDate(c.createdAt);
                      if (isNaN(created.getTime())) return false;
                      const diffDays = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                      if (selectedAgingBucket === '0-30 Days') return diffDays <= 30;
                      if (selectedAgingBucket === '31-60 Days') return diffDays > 30 && diffDays <= 60;
                      if (selectedAgingBucket === '61-90 Days') return diffDays > 60 && diffDays <= 90;
                      if (selectedAgingBucket === '90+ Days') return diffDays > 90;
                      return false;
                    }).slice(0, 30).map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                          <Link to={`/process-claim/${claim.id}?source=cashless`} className="text-sm font-black text-blue-600 hover:underline">{claim.formData?.patient_name || 'N/A'}</Link>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {claim.id}</p>
                        </td>
                        <td className="py-4">
                          <p className="text-xs font-bold text-slate-600">{hospitals.find(h => h.id === claim.formData?.hospitalId)?.name || 'N/A'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{claim.formData?.district}, {claim.formData?.state}</p>
                        </td>
                        <td className="py-4">
                          <p className="text-xs font-bold text-slate-600">{claim.formData?.insurance_company || 'N/A'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">TPA: {claim.formData?.tpa || 'Direct'}</p>
                        </td>
                        <td className="py-4 text-right">
                          <p className="text-sm font-black text-slate-800">{formatCurrency(Number(claim.formData?.fin_app_amt || 0))}</p>
                        </td>
                        <td className="py-4 text-center">
                          {(() => {
                            const created = parseDate(claim.createdAt);
                            const diffDays = !isNaN(created.getTime()) ? Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                            return (
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                diffDays > 90 
                                ? 'bg-rose-50 text-rose-600' 
                                : 'bg-slate-100 text-slate-600'
                              }`}>
                                {diffDays} Days
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {accessibleClaims.filter(c => {
                if (SETTLED_STATUSES.includes(c.status as any)) return false;
                const created = parseDate(c.createdAt);
                if (isNaN(created.getTime())) return false;
                const diffDays = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                if (selectedAgingBucket === '0-30 Days') return diffDays <= 30;
                if (selectedAgingBucket === '31-60 Days') return diffDays > 30 && diffDays <= 60;
                if (selectedAgingBucket === '61-90 Days') return diffDays > 60 && diffDays <= 90;
                if (selectedAgingBucket === '90+ Days') return diffDays > 90;
                return false;
              }).length > 30 && (
                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400">Showing first 30 cases. View all cases in the 
                    <Link to="/manage-claims" className="text-blue-600 ml-1 hover:underline">Claims Manager</Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const KpiCard = ({ label, value, subValue, icon: Icon, trend, color, trendPositive }: any) => {
  const styles: any = {
    blue: "bg-blue-50 text-[#000080] border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100"
  };

  return (
    <div className={`p-4 rounded-[2rem] border ${styles[color]} flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-lg transition-all`}>
       <div className={`absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={100} />
       </div>
       
       <div className="flex justify-between items-start relative z-10">
          <div>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{label}</p>
             <h3 className="text-3xl font-black tracking-tighter leading-none">{value}</h3>
          </div>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[9px] font-black ${trend.includes('+') || trendPositive ? 'bg-white/50 text-emerald-600' : 'bg-white/50 text-slate-500'}`}>
             {trend.includes('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
             <span>{trend}</span>
          </div>
       </div>
       
       <div className="relative z-10">
          <p className="text-[10px] font-bold opacity-60">{subValue}</p>
       </div>
    </div>
  );
};

export default Dashboard;
