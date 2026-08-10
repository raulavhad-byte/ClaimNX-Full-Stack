
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dualStorageService } from '../services/dualStorageService';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  X,
  Calendar,
  FileText,
  ChevronRight,
  ArrowUpRight,
  Download,
  MoreVertical,
  ShieldCheck,
  TrendingUp,
  Activity,
  MessageSquare,
  Layout,
  ChevronDown,
  RefreshCw,
  ShieldAlert,
  Send
} from 'lucide-react';
import PendingTAT from './PendingTAT';
import { formatDate, formatDateTime } from '../utils';
import { KYPPolicy, KYPStatus, Claim, ClaimStatus, Product } from '../types';
import KYPForm from './KYPForm';
import { toast } from 'sonner';
import { DISABLE_FIRESTORE } from '../services/dualStorageService';

interface KYPDashboardProps {
  claims?: Claim[];
  policies?: KYPPolicy[];
  setPolicies?: React.Dispatch<React.SetStateAction<KYPPolicy[]>>;
  onUpdateClaim?: (claim: Claim) => void;
  currentUser?: any;
  hospitals?: any[];
  insurers?: any[];
}

const KYPDashboard: React.FC<KYPDashboardProps> = ({ 
  claims = [], 
  policies = [], 
  setPolicies = () => {},
  onUpdateClaim = () => {},
  currentUser,
  hospitals = [],
  insurers = []
}) => {
  const getHospitalName = (policy: KYPPolicy, linkedClaim?: Claim) => {
    const hId = policy.hospitalId || linkedClaim?.hospitalId || linkedClaim?.formData?.hospitalId;
    if (hId) {
      const hosp = hospitals.find(h => h.id === hId);
      if (hosp) {
        return hosp.hospitalName || hosp.displayName || hosp.name;
      }
    }
    return linkedClaim?.formData?.hospital_name || linkedClaim?.formData?.hospitalName || linkedClaim?.hospitalId || 'N/A';
  };

  const [searchParams] = useSearchParams();
  const claimIdFromUrl = searchParams.get('claimId');
  
  const isManager = useMemo(() => {
    const managerRoles = ['Manager', 'Super Admin', 'KYP Head', 'Admin'];
    return managerRoles.includes(currentUser?.role) || currentUser?.isAdmin;
  }, [currentUser]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<KYPStatus | 'All' | 'Under Review'>('Pending');
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualRequest, setManualRequest] = useState({ 
    hospitalId: '', 
    to: '', 
    cc: '', 
    subject: '', 
    body: '',
    templateId: 'template-1'
  });

  const reportingTemplates = [
    {
      id: 'template-1',
      name: 'Standard Hospital Daily Summary',
      subject: 'Daily Claims Report - {{hospitalName}}',
      body: 'Dear Team,\n\nPlease find attached the daily claims processing report for {{hospitalName}} for the period {{dateRange}}.\n\nRegards,\nReporting System'
    },
    {
      id: 'template-2',
      name: 'Weekly Performance Audit',
      subject: 'Weekly Performance Analysis - {{hospitalName}}',
      body: 'Hello,\n\nAttached is the weekly performance audit report for {{hospitalName}}.\n\nBest regards,\nOperations Team'
    }
  ];

  const handleManualHospitalChange = (hId: string) => {
    const hospital = hospitals.find(h => h.id === hId);
    const template = reportingTemplates.find(t => t.id === manualRequest.templateId) || reportingTemplates[0];
    
    if (hospital && template) {
      let subject = template.subject.replace(/{{hospitalName}}/g, hospital.hospitalName);
      let body = template.body.replace(/{{hospitalName}}/g, hospital.hospitalName)
                                .replace(/{{dateRange}}/g, format(new Date(), 'dd-MM-yyyy'));
      
      setManualRequest({
        ...manualRequest,
        hospitalId: hId,
        to: hospital.emailId || '',
        subject,
        body
      });
    } else {
      setManualRequest({ ...manualRequest, hospitalId: hId });
    }
  };

  const handleManualTemplateChange = (tId: string) => {
    const hospital = hospitals.find(h => h.id === manualRequest.hospitalId);
    const template = reportingTemplates.find(t => t.id === tId);
    
    if (hospital && template) {
      let subject = template.subject.replace(/{{hospitalName}}/g, hospital.hospitalName);
      let body = template.body.replace(/{{hospitalName}}/g, hospital.hospitalName)
                                .replace(/{{dateRange}}/g, format(new Date(), 'dd-MM-yyyy'));
      
      setManualRequest({
        ...manualRequest,
        templateId: tId,
        subject,
        body
      });
    } else {
      setManualRequest({ ...manualRequest, templateId: tId });
    }
  };

  const [selectedPolicy, setSelectedPolicy] = useState<KYPPolicy | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Strictly filter for Policy Audit Team products - Dedicated bucket
  const kypPolicies = useMemo(() => {
    const kypTargetProducts = [Product.CPC, Product.BG_DESK, Product.PARTNER_PROCESSING, Product.KYP];
    
    // Include all policies that match our target products or Cashless claim types
    const existingPolicies = policies.filter(p => {
      if (p.claimId) {
        const linkedClaim = claims.find(c => c.id === p.claimId);
        if (linkedClaim) {
          return kypTargetProducts.includes(linkedClaim.product as Product) || 
                 kypTargetProducts.includes(linkedClaim.product as any) ||
                 linkedClaim.claimType === 'Cashless' ||
                 linkedClaim.claimType?.toLowerCase() === 'cashless' ||
                 !linkedClaim.product;
        }
      }
      return kypTargetProducts.includes(p.product_type as Product) || 
             kypTargetProducts.includes(p.product_type as any) ||
             p.product_type?.toLowerCase() === 'cashless' ||
             !p.product_type;
    });
    
    // Add claims that should be in KYP bucket but don't have a policy record yet
    const kypClaims = claims.filter(c => {
      const isTargetProduct = kypTargetProducts.includes(c.product as Product) || 
                              kypTargetProducts.includes(c.product as any) || 
                              c.claimType === 'Cashless' || 
                              c.claimType?.toLowerCase() === 'cashless' ||
                              !c.product;
      const alreadyHasPolicy = existingPolicies.some(p => p.claimId === c.id);
      return isTargetProduct && !alreadyHasPolicy && c.status !== ClaimStatus.COMPLETE_SETTLEMENT;
    }).map(c => ({
      id: c.id,
      policyNumber: c.policyNumber || c.formData?.p_policy_no || 'POL-UNSET',
      insuredName: c.patientName,
      companyName: c.insuranceProvider || c.formData?.insurance_company || 'Insurance Provider',
      tpaName: c.formData?.tpa_provider || c.formData?.tpa_name || c.formData?.tpaName || c.formData?.insurance_company || 'Direct',
      policyType: 'Retail' as const,
      sumInsured: (Number(c.formData?.p_sum_insured || c.formData?.sum_insured) || 0),
      balanceSI: (Number(c.formData?.p_balance_si || c.formData?.balance_si) || 0),
      status: (c.status === ClaimStatus.ASSESSMENT_INITIATED ? 'Pending (KYP)' : 
               c.status === ClaimStatus.ASSESSMENT_QUERY_PENDING ? 'KYP Query Pending' : 
               c.status === ClaimStatus.ASSESSMENT_QUERY_REPLIED ? 'KYP Query Replied' : 
               c.status === ClaimStatus.KYP_PENDING ? 'Pending (KYP)' :
               c.status === ClaimStatus.KYP_QUERY_PENDING ? 'KYP Query Pending' :
               c.status === ClaimStatus.KYP_QUERY_REPLIED ? 'KYP Query Replied' :
               'Pending (KYP)') as any,
      product_type: String(c.product || Product.CPC),
      source: (c.caseSource?.toUpperCase() as any) || 'INTERNAL USER',
      lastUpdatedDate: c.updatedAt || c.createdAt,
      claimId: c.id,
      hospitalId: c.hospitalId || c.formData?.hospitalId,
      patientName: c.patientName,
      admissionDate: c.admissionDate,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      history: c.history,
      assignedUserId: c.assignedOpsUserId,
      assignedUserName: c.assignedOpsUserName,
      isAccepted: c.isKypAccepted || false,
    } as KYPPolicy));

    return [...existingPolicies, ...kypClaims];
  }, [policies, claims]);

  const stats = useMemo(() => {
    const counts: Record<string, { count: number, amount: number }> = {
      Total: { count: kypPolicies.length, amount: 0 },
      'Pending (KYP)': { count: 0, amount: 0 },
      Pending: { count: 0, amount: 0 },
      Approved: { count: 0, amount: 0 },
      'KYP Accepted': { count: 0, amount: 0 },
      'KYP Completed': { count: 0, amount: 0 },
      'Query Pending': { count: 0, amount: 0 },
      'KYP Query Pending': { count: 0, amount: 0 },
      'Query Replied': { count: 0, amount: 0 },
      'KYP Query Replied': { count: 0, amount: 0 },
      Rejected: { count: 0, amount: 0 },
      'KYP Rejected': { count: 0, amount: 0 },
      'KYP Pending Approval': { count: 0, amount: 0 },
      'Under Review': { count: 0, amount: 0 }
    };

    kypPolicies.forEach(p => {
      const amt = Number(p.sumInsured) || 0;
      counts.Total.amount += amt;

      const isPendingStatus = !p.isAccepted;

      const isApprovedStatus = p.isAccepted && (
        p.status === 'Approved' || 
        p.status === 'KYP Accepted' || 
        p.status === 'KYP Completed' || 
        p.status === 'KYP Pending Approval' || 
        (p.status as any) === ClaimStatus.KYP_ACCEPTED
      );
      
      const isQueryPendingStatus = p.isAccepted && (
        p.status === 'Query Pending' || 
        p.status === 'KYP Query Pending' ||
        (p.status as any) === ClaimStatus.ASSESSMENT_QUERY_PENDING ||
        (p.status as any) === ClaimStatus.KYP_QUERY_PENDING ||
        (p.status as any) === ClaimStatus.INITIAL_QUERY_PENDING ||
        (p.status as any) === ClaimStatus.MEDICAL_QUERY_RAISED
      );
      
      const isRejectedStatus = p.isAccepted && (
        p.status === 'Rejected' || 
        p.status === 'KYP Rejected' ||
        (p.status as any) === ClaimStatus.PRE_AUTH_REJECTED ||
        (p.status as any) === ClaimStatus.KYP_REJECTED
      );

      const isUnderReviewStatus = p.isAccepted && !isApprovedStatus && !isQueryPendingStatus && !isRejectedStatus;

      if (isPendingStatus) {
        counts['Pending (KYP)'].count++;
        counts['Pending (KYP)'].amount += amt;
      } else if (isUnderReviewStatus) {
        counts['Under Review'].count++;
        counts['Under Review'].amount += amt;
      } else if (isQueryPendingStatus) {
        counts['Query Pending'].count++;
        counts['Query Pending'].amount += amt;
      } else if (isApprovedStatus) {
        counts['Approved'].count++;
        counts['Approved'].amount += amt;
      } else if (isRejectedStatus) {
        counts['Rejected'].count++;
        counts['Rejected'].amount += amt;
      }
    });

    return counts;
  }, [kypPolicies]);

  const filteredPolicies = useMemo(() => {
    return kypPolicies.filter(p => {
      const matchesSearch = 
        p.policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.insuredName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isApprovedStatus = p.isAccepted && (
        p.status === 'Approved' || 
        p.status === 'KYP Accepted' || 
        p.status === 'KYP Completed' || 
        p.status === 'KYP Pending Approval' || 
        (p.status as any) === ClaimStatus.KYP_ACCEPTED
      );
      
      const isQueryPendingStatus = p.isAccepted && (
        p.status === 'Query Pending' || 
        p.status === 'KYP Query Pending' ||
        (p.status as any) === ClaimStatus.ASSESSMENT_QUERY_PENDING ||
        (p.status as any) === ClaimStatus.KYP_QUERY_PENDING ||
        (p.status as any) === ClaimStatus.INITIAL_QUERY_PENDING ||
        (p.status as any) === ClaimStatus.MEDICAL_QUERY_RAISED
      );
      
      const isRejectedStatus = p.isAccepted && (
        p.status === 'Rejected' || 
        p.status === 'KYP Rejected' ||
        (p.status as any) === ClaimStatus.PRE_AUTH_REJECTED ||
        (p.status as any) === ClaimStatus.KYP_REJECTED
      );

      const isUnderReviewStatus = p.isAccepted && !isApprovedStatus && !isQueryPendingStatus && !isRejectedStatus;

      const matchesStatus = statusFilter === 'All' || 
        (statusFilter === 'Pending' ? !p.isAccepted : 
         statusFilter === 'Under Review' ? isUnderReviewStatus :
         statusFilter === 'Approved' ? isApprovedStatus :
         statusFilter === 'Query Pending' ? isQueryPendingStatus :
         statusFilter === 'Rejected' ? isRejectedStatus :
         p.status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [kypPolicies, searchQuery, statusFilter]);

  const assignedHospitals = useMemo(() => {
    return hospitals.filter(h => {
      if (currentUser?.isAdmin || currentUser?.role === 'Super Admin') return true;
      const assignedIds = currentUser?.assignedHospitalIds || [];
      return assignedIds.includes(h.id);
    });
  }, [hospitals, currentUser]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadReport = () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error("Please select a date range");
      return;
    }

    setIsExporting(true);

    const start = new Date(exportStartDate);
    const end = new Date(exportEndDate);
    end.setHours(23, 59, 59, 999);

    const dataToExport = kypPolicies.filter(p => {
      const date = new Date(p.createdAt || p.lastUpdatedDate);
      return date >= start && date <= end;
    });

    if (dataToExport.length === 0) {
      toast.error("No data found for the selected date range");
      setIsExporting(false);
      return;
    }

    const headers = [
      'Hospital Name', 'Patient Name', 'Age', 'TPA Name', 'Insurer Name',
      'Diagnosis Name', 'Room Rent', 'ICU Limit',
      'Co -Pay', 'Sub-Limit', 'Member ID', 'Claim Status'
    ];

    const calculateAge = (dob?: string) => {
      if (!dob) return 'N/A';
      try {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age > 0 ? age : 'N/A';
      } catch (e) {
        return 'N/A';
      }
    };

    const csvData = dataToExport.map((p) => {
      const linkedClaim = claims.find(c => {
        if (p.claimId) return c.id === p.claimId;
        return c.patientName === p.patientName || c.patientName === p.insuredName;
      });
      const hospitalName = getHospitalName(p, linkedClaim);
      const age = calculateAge(p.dob || linkedClaim?.formData?.p_dob);

      return [
        hospitalName,
        p.patientName || p.insuredName,
        age,
        p.tpaName,
        p.companyName,
        p.diagnosisName || p.diagnosis || 'N/A',
        p.roomRentLimit || 'N/A',
        p.icuLimit || 'N/A',
        p.copayPercentage !== undefined ? `${p.copayPercentage}%` : 'N/A',
        p.subLimits || 'N/A',
        p.memberId || 'N/A',
        p.status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `KYP_Operations_Report_${exportStartDate}_to_${exportEndDate}.csv`;
    link.click();

    setTimeout(() => {
      setIsExporting(false);
      setShowExportModal(false);
      toast.success("Operations report downloaded successfully");
    }, 500);
  };

  const handleEdit = (policy: KYPPolicy, mode: boolean = false) => {
    setSelectedPolicy(policy);
    // Find and set the associated claim
    if (policy.claimId) {
      const claim = claims.find(c => c.id === policy.claimId);
      if (claim) {
        setSelectedClaim(claim);
      }
    }
    setViewMode(mode);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedPolicy(null);
    setViewMode(false);
    setShowForm(true);
  };

  const handleSavePolicy = (policy: KYPPolicy) => {
    // When an action is taken (Submit, Reject, Query), release assignment so it can be "Accepted" again
    // This allows the "Work" task to end and allows any user to pick up the next stage.
    const isApprovedStatus = ['Approved', 'KYP Accepted', 'KYP Completed', 'KYP Pending Approval'].includes(policy.status || '');
    const updatedPolicy: KYPPolicy = {
      ...policy,
      isAccepted: true,
      needsAssignmentAlert: false,
      lastUpdatedDate: new Date().toISOString()
    };

    setPolicies(prev => {
      const exists = prev.some(p => p.id === updatedPolicy.id);
      if (exists) {
        return prev.map(p => p.id === updatedPolicy.id ? updatedPolicy : p);
      }
      return [updatedPolicy, ...prev];
    });

    // Save policy state locally
    dualStorageService.save('kyp_policies', updatedPolicy, updatedPolicy.id);
    
    // Also update main claims list for visibility in Reimbursement section
    if (onUpdateClaim) {
      const claim = claims.find(c => c.id === updatedPolicy.claimId);
      if (claim) {
        const isPartnerProcessing = claim.product === Product.PARTNER_PROCESSING || String(claim.product).includes('Partner');
        const isCashless = claim.product === Product.CPC || claim.product === Product.BG_DESK;
        
        // Define terminal/active workflow statuses where we DON'T want KYP to override
        const mainWorkflowStatuses = [
          ClaimStatus.MEDICAL_APPROVED,
          ClaimStatus.MEDICAL_QUERY_RAISED,
          ClaimStatus.MEDICAL_QUERY_REPLIED,
          ClaimStatus.PRE_AUTH_INITIATED,
          ClaimStatus.PRE_AUTH_APPROVED,
          ClaimStatus.ENHANCEMENT,
          ClaimStatus.DISCHARGE_INITIATED
        ];

        let nextStatus = claim.status;
        const isApproved = ['Approved', 'KYP Accepted', 'KYP Completed'].includes(updatedPolicy.status);
        const isQuery = ['Query Pending', 'KYP Query Pending'].includes(updatedPolicy.status);
        
        if (isApproved) {
          if (isPartnerProcessing) {
            nextStatus = claim.status; // No stage change impact for Partner Processing
          } else if (isCashless) {
            // For cashless, do not change the main status as per independent processing requirement
            nextStatus = claim.status;
          } else {
            nextStatus = ClaimStatus.KYP_ACCEPTED;
          }
        } else if (isQuery) {
          if (isPartnerProcessing) {
            nextStatus = ClaimStatus.ASSESSMENT_QUERY_PENDING;
          } else if (isCashless) {
            // For cashless, status remains unchanged as per "Timeline only" requirement
            nextStatus = claim.status;
          } else {
            nextStatus = ClaimStatus.KYP_QUERY_PENDING;
          }
        } else if (updatedPolicy.status === 'Rejected' || updatedPolicy.status === 'KYP Rejected') {
          nextStatus = isPartnerProcessing ? claim.status : (isCashless ? claim.status : ClaimStatus.KYP_REJECTED);
        }

        onUpdateClaim({
          ...claim,
          status: nextStatus,
          queryRaisedBy: isQuery ? 'KYP' : claim.queryRaisedBy,
          // Ensure history is preserved if updated by form
          history: updatedPolicy.history || claim.history,
          isKypAccepted: true
        });
      }
    }
    
    setShowForm(false);
    setSelectedPolicy(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KYP Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight font-serif">Policy Audit Team</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Isolated Operations Management Module</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowExportModal(true)}
            className="bg-[#000080] text-white border border-[#000080] px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#000066] transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center"
          >
            <Download size={14} className="mr-2" /> Download Report
          </button>
          
          <button 
            onClick={() => setShowManualModal(true)}
            className="bg-orange-500 text-white border border-orange-500 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-900/20 active:scale-95 flex items-center"
          >
            <Send size={14} className="mr-2" /> Manual Dispatch
          </button>
          <button 
            onClick={handleCreate}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center"
          >
            <Plus size={14} className="mr-2" /> New Case (KYP)
          </button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <StatusCard 
          title="Pending Cases" 
          count={(stats['Pending (KYP)']?.count || 0) + (stats.Pending?.count || 0)} 
          amount={(stats['Pending (KYP)']?.amount || 0) + (stats.Pending?.amount || 0)}
          icon={Clock} 
          color="amber" 
          active={statusFilter === 'Pending'}
          onClick={() => setStatusFilter('Pending')}
        />
        <StatusCard 
          title="Under Review" 
          count={stats['Under Review']?.count || 0} 
          amount={stats['Under Review']?.amount || 0}
          icon={Activity} 
          color="blue" 
          active={statusFilter === 'Under Review'}
          onClick={() => setStatusFilter('Under Review')}
        />
        <StatusCard 
          title="Query Pending" 
          count={(stats['Query Pending']?.count || 0) + (stats['KYP Query Pending']?.count || 0)} 
          amount={(stats['Query Pending']?.amount || 0) + (stats['KYP Query Pending']?.amount || 0)}
          icon={AlertCircle} 
          color="orange" 
          active={statusFilter === 'Query Pending'}
          onClick={() => setStatusFilter('Query Pending')}
        />
        <StatusCard 
          title="Approved" 
          count={(stats.Approved?.count || 0) + (stats['KYP Accepted']?.count || 0) + (stats['KYP Completed']?.count || 0)} 
          amount={(stats.Approved?.amount || 0) + (stats['KYP Accepted']?.amount || 0) + (stats['KYP Completed']?.amount || 0)}
          icon={CheckCircle2} 
          color="emerald" 
          active={statusFilter === 'Approved'}
          onClick={() => setStatusFilter('Approved')}
        />
        <StatusCard 
          title="Rejected" 
          count={(stats.Rejected?.count || 0) + (stats['KYP Rejected']?.count || 0)} 
          amount={(stats.Rejected?.amount || 0) + (stats['KYP Rejected']?.amount || 0)}
          icon={XCircle} 
          color="rose" 
          active={statusFilter === 'Rejected'}
          onClick={() => setStatusFilter('Rejected')}
        />
        <StatusCard 
          title="Total Cases" 
          count={stats.Total.count} 
          amount={stats.Total.amount}
          icon={Activity} 
          color="indigo" 
          active={statusFilter === 'All'}
          onClick={() => setStatusFilter('All')}
        />
      </div>

      {/* Search & Global Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full text-[10px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search Policy No, Insured Name..." 
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('All');
              toast.success("Dashboard data refreshed");
            }}
            className="px-5 py-2 bg-amber-400 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all shadow-md shadow-amber-200 active:scale-95 flex items-center"
          >
            <RefreshCw size={12} className="mr-2" /> Refresh
          </button>
        </div>
      </div>

      {/* Operations Case Listing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
              <tr>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Hospital Name</th>
                <th className="px-6 py-4">Insured Name</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">TPA</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">{statusFilter === 'Approved' ? 'Approved By' : 'Assigned User / Approved By'}</th>
                <th className="px-6 py-4 text-center">TAT</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPolicies.map(policy => {
                const linkedClaim = claims.find(c => {
                  if (policy.claimId) return c.id === policy.claimId;
                  return c.patientName === policy.patientName || c.patientName === policy.insuredName;
                });
                
                const isApproved = policy.status === 'Approved' || policy.status === 'KYP Accepted' || policy.status === 'KYP Completed';

                return (
                  <tr key={policy.id} className="hover:bg-slate-50/50 transition-colors group whitespace-nowrap">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        policy.source === 'WEBSITE' ? 'bg-blue-50 text-blue-600' : 
                        policy.source === 'APP' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {policy.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 max-w-[150px] truncate" title={getHospitalName(policy, linkedClaim)}>
                      {getHospitalName(policy, linkedClaim)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 max-w-[200px] truncate" title={policy.insuredName}>{policy.insuredName}</td>
                    <td className="px-6 py-4 text-xs font-medium text-indigo-600 max-w-[150px] truncate" title={policy.productName || policy.product_type}>
                      {policy.productName || policy.product_type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600 max-w-[150px] truncate" title={policy.companyName}>{policy.companyName}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-400 max-w-[150px] truncate" title={policy.tpaName || 'Direct'}>{policy.tpaName || 'Direct'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={policy.status} stage={linkedClaim?.status} />
                    </td>
                    <td className="px-6 py-4">
                      {isApproved ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 mb-0.5">Approved By</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-black uppercase flex-shrink-0">
                              {(policy.assignedUserName || 'System').charAt(0)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight truncate max-w-[100px]" title={policy.assignedUserName || 'System'}>
                              {policy.assignedUserName || 'System'}
                            </span>
                          </div>
                        </div>
                      ) : policy.assignedUserName && policy.isAccepted ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black uppercase flex-shrink-0">
                            {policy.assignedUserName.charAt(0)}
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight truncate max-w-[100px]">{policy.assignedUserName}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <PendingTAT 
                        startTime={policy.createdAt || policy.lastUpdatedDate} 
                        completedTime={isApproved ? policy.lastUpdatedDate : undefined} 
                        type="kyp" 
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isApproved && (
                          <button 
                            onClick={() => handleEdit(policy, false)}
                            className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all border border-emerald-200 flex items-center bg-white cursor-pointer"
                            title="Edit Approved KYP Case"
                          >
                            <Edit3 size={12} className="mr-1.5" /> Edit
                          </button>
                        )}
                        <button 
                          onClick={() => handleEdit(policy, true)}
                          className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-slate-100 flex items-center"
                          title="View Case (Read Only)"
                        >
                          <Eye size={12} className="mr-1.5" /> View
                        </button>
                        
                        {!isApproved && policy.status !== 'Rejected' && policy.status !== 'KYP Rejected' && (
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => {
                                if (!policy.assignedUserId) {
                                  const updatedPolicy: KYPPolicy = {
                                    ...policy,
                                    assignedUserId: currentUser?.id || 'sys-user',
                                    assignedUserName: currentUser?.displayName || currentUser?.username || 'CRM User',
                                    isAccepted: true,
                                    needsAssignmentAlert: false,
                                    history: [
                                      {
                                        id: `hist-${Date.now()}`,
                                        status: policy.status as any,
                                        date: new Date().toISOString(),
                                        comment: `Case accepted and assigned to ${currentUser?.displayName || currentUser?.username || 'CRM User'}`,
                                        type: 'status_change',
                                        userName: currentUser?.displayName || currentUser?.username || 'System'
                                      },
                                      ...(policy.history || [])
                                    ]
                                  };
                                  
                                  if (policy.claimId) {
                                    const claim = claims.find(c => c.id === policy.claimId);
                                    if (claim) {
                                      onUpdateClaim({
                                        ...claim,
                                        assignedOpsUserId: currentUser?.id || 'sys-user',
                                        assignedOpsUserName: currentUser?.displayName || currentUser?.username || 'CRM User',
                                        isKypAccepted: true
                                      });
                                    }
                                  }

                                  setPolicies(prev => prev.map(p => p.id === policy.id ? updatedPolicy : p));
                                  toast.success("Case accepted moves to Under Review");
                                  setStatusFilter('Under Review');
                                  handleEdit(updatedPolicy, false);
                                } else {
                                  handleEdit(policy, policy.assignedUserId !== currentUser?.id);
                                }
                              }}
                              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                                !policy.assignedUserId 
                                  ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' 
                                  : (policy.assignedUserId === currentUser?.id ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed')
                              }`}
                              disabled={!!policy.assignedUserId && policy.assignedUserId !== currentUser?.id}
                            >
                              {policy.assignedUserId ? (policy.assignedUserId === currentUser?.id ? 'Work' : 'Occupied') : 'Accept'}
                            </button>

                            {policy.assignedUserId && policy.assignedUserId !== currentUser?.id && (
                              <button
                                onClick={() => {
                                  const updatedHistory = [
                                    {
                                      id: `hist-${Date.now()}`,
                                      status: policy.status as any,
                                      date: new Date().toISOString(),
                                      comment: `Case released/unassigned by ${currentUser?.displayName || currentUser?.username || 'User'}`,
                                      type: 'status_change' as any,
                                      userName: currentUser?.displayName || currentUser?.username || 'System'
                                    },
                                    ...(policy.history || [])
                                  ];

                                  const updatedPolicy: KYPPolicy = {
                                    ...policy,
                                    assignedUserId: undefined,
                                    assignedUserName: undefined,
                                    isAccepted: false,
                                    history: updatedHistory
                                  };

                                  if (policy.claimId) {
                                    const claim = claims.find(c => c.id === policy.claimId);
                                    if (claim) {
                                      onUpdateClaim({
                                        ...claim,
                                        assignedOpsUserId: '',
                                        assignedOpsUserName: '',
                                        isKypAccepted: false
                                      });
                                    }
                                  }

                                  setPolicies(prev => prev.map(p => p.id === policy.id ? updatedPolicy : p));
                                  toast.success("Case released and is now available to Accept");
                                }}
                                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                                title="Force release the assignment of this case"
                              >
                                Release
                              </button>
                            )}
                          </div>
                        )}
                        
                        {isApproved && (
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center">
                            <CheckCircle2 size={12} className="mr-1.5" /> Done
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredPolicies.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="text-slate-200" size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No isolated Operations records found</p>
          </div>
        )}
      </div>

      {/* KYP Form Modal */}
      {showForm && (
        <KYPForm 
          policy={selectedPolicy} 
          claim={selectedClaim}
          hospitals={hospitals}
          insurers={insurers}
          onClose={() => {
            setShowForm(false);
            setSelectedPolicy(null);
            setSelectedClaim(null);
            setViewMode(false);
          }} 
          onSave={handleSavePolicy}
          onUpdateClaim={onUpdateClaim}
          currentUser={currentUser}
          viewMode={viewMode}
        />
      )}

      {/* Export Parameters Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Export Operations Data</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select date range for KYP Report</p>
              </div>
              <button 
                onClick={() => setShowExportModal(false)} 
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                disabled={isExporting}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  disabled={isExporting}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadReport}
                  disabled={isExporting || !exportStartDate || !exportEndDate}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isExporting ? (
                    <RefreshCw className="animate-spin mr-2" size={18} />
                  ) : (
                    <Download className="mr-2" size={18} />
                  )}
                  {isExporting ? 'Exporting...' : 'Download CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Dispatch Modal */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#000080] text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Send size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Manual Report Dispatch</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Send on-demand hospital reports</p>
                  </div>
                </div>
                <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Hospital</label>
                      <select 
                        value={manualRequest.hospitalId}
                        onChange={(e) => handleManualHospitalChange(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-sans"
                      >
                        <option value="">Choose Hospital...</option>
                        {assignedHospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.hospitalName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">Use Template</label>
                      <select 
                        value={manualRequest.templateId}
                        onChange={(e) => handleManualTemplateChange(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-sans"
                      >
                        {reportingTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">Recipient Email (To)</label>
                      <input 
                        type="text"
                        value={manualRequest.to}
                        onChange={(e) => setManualRequest({...manualRequest, to: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-sans"
                        placeholder="hospital@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">CC Emails</label>
                      <input 
                        type="text"
                        value={manualRequest.cc}
                        onChange={(e) => setManualRequest({...manualRequest, cc: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-sans"
                        placeholder="comma separated emails..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">Email Subject</label>
                    <input 
                      type="text"
                      value={manualRequest.subject}
                      onChange={(e) => setManualRequest({...manualRequest, subject: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-sans"
                      placeholder="Enter subject..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">Email Draft (Body)</label>
                    <textarea 
                      value={manualRequest.body}
                      onChange={(e) => setManualRequest({...manualRequest, body: e.target.value})}
                      rows={6}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all resize-none font-sans"
                      placeholder="Compose report message..."
                    />
                    <p className="text-[9px] text-slate-400 mt-2 font-medium italic font-sans">Note: Report PDF will be attached automatically.</p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <AlertCircle className="text-amber-600 shrink-0" size={16} />
                    <p className="text-[10px] text-amber-800 font-bold leading-relaxed font-sans">
                      Manual trigger will use the latest available data as of today for the selected hospital only.
                    </p>
                  </div>
                </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    toast.success(`Report dispatch initiated for ${assignedHospitals.find(h => h.id === manualRequest.hospitalId)?.hospitalName || 'selected hospital'} to ${manualRequest.to}`);
                    setShowManualModal(false);
                    setManualRequest({ hospitalId: '', to: '', cc: '', subject: '', body: '', templateId: 'template-1' });
                  }}
                  disabled={!manualRequest.hospitalId || !manualRequest.to}
                  className="flex-[2] py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 disabled:opacity-50 disabled:grayscale font-sans"
                >
                  Dispatch Report Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusCard = ({ title, count, amount, icon: Icon, color, active, onClick }: any) => {
  const colorClasses: any = {
    amber: 'bg-amber-50 shadow-amber-200/40 border-amber-200 text-amber-900',
    indigo: 'bg-indigo-50 shadow-indigo-200/40 border-indigo-200 text-indigo-900',
    emerald: 'bg-emerald-50 shadow-emerald-200/40 border-emerald-200 text-emerald-900',
    blue: 'bg-blue-50 shadow-blue-200/40 border-blue-200 text-blue-900',
    rose: 'bg-rose-50 shadow-rose-200/40 border-rose-200 text-rose-900',
    orange: 'bg-orange-50 shadow-orange-200/40 border-orange-200 text-orange-900'
  };

  const activeClasses: any = {
    amber: 'bg-amber-100 ring-2 ring-amber-500/20 border-amber-500 shadow-md scale-[1.01]',
    indigo: 'bg-indigo-100 ring-2 ring-indigo-500/20 border-indigo-500 shadow-md scale-[1.01]',
    emerald: 'bg-emerald-100 ring-2 ring-emerald-500/20 border-emerald-500 shadow-md scale-[1.01]',
    blue: 'bg-blue-100 ring-2 ring-blue-500/20 border-blue-500 shadow-md scale-[1.01]',
    rose: 'bg-rose-100 ring-2 ring-rose-500/20 border-rose-500 shadow-md scale-[1.01]',
    orange: 'bg-orange-100 ring-2 ring-orange-500/20 border-orange-500 shadow-md scale-[1.01]'
  };

  const iconColors: any = {
    amber: 'bg-amber-500 text-white',
    indigo: 'bg-indigo-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    blue: 'bg-blue-500 text-white',
    rose: 'bg-rose-500 text-white',
    orange: 'bg-orange-500 text-white'
  };

  return (
    <button 
      onClick={onClick}
      className={`p-2.5 rounded-[1rem] border text-left transition-all hover:shadow-lg active:scale-95 ${colorClasses[color]} ${active ? activeClasses[color] : 'shadow-sm'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-xl shadow-lg ${active ? 'bg-white text-slate-800' : iconColors[color]}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-[8px] font-black uppercase tracking-[0.1em] mb-0.5 opacity-70 truncate">{title}</p>
      <div className="flex items-baseline gap-1">
        <h3 className="text-xl font-black tracking-tighter">{count}</h3>
        <span className="text-[8px] font-bold opacity-60">Cases</span>
      </div>
      <div className="mt-2 pt-2 border-t border-current border-opacity-10">
        <p className="text-[8px] font-black opacity-60 uppercase tracking-[0.05em]">Sum Insured</p>
        <p className="text-[10px] font-black">₹{(amount / 100000).toFixed(1)}L</p>
      </div>
    </button>
  );
};

const StatusBadge = ({ status, stage }: { status: KYPStatus, stage?: string }) => {
  const styles: any = {
    'Pending (KYP)': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'Approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'KYP Accepted': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'KYP Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Query Pending': 'bg-orange-100 text-orange-700 border-orange-200',
    'KYP Query Pending': 'bg-orange-100 text-orange-700 border-orange-200',
    'Query Replied': 'bg-blue-100 text-blue-700 border-blue-200',
    'KYP Query Replied': 'bg-blue-100 text-blue-700 border-blue-200',
    'Rejected': 'bg-rose-100 text-rose-700 border-rose-200',
    'KYP Rejected': 'bg-rose-100 text-rose-700 border-rose-200',
    'KYP Pending Approval': 'bg-amber-50 text-amber-600 border-amber-200'
  };

  const getLabel = () => {
    if (stage) {
      if (stage === ClaimStatus.KYP_ACCEPTED || stage === ClaimStatus.KYP_COMPLETED || stage === ClaimStatus.CLAIM_APPROVED || stage === ClaimStatus.MEDICAL_APPROVED) return 'Approved';
      if (stage === ClaimStatus.KYP_QUERY_PENDING || stage === ClaimStatus.HOSPITAL_QUERY_PENDING || stage === ClaimStatus.CLAIM_UNDER_QUERY) return 'Query Pending';
      if (stage === ClaimStatus.KYP_QUERY_REPLIED || stage === ClaimStatus.QUERY_REPLY_DONE) return 'Query Replied';
      if (stage === ClaimStatus.KYP_REJECTED || stage === ClaimStatus.MEDICAL_REJECTED) return 'Rejected';
      if (stage === ClaimStatus.KYP_PENDING_APPROVAL) return 'Pending Approval';
      if (stage === ClaimStatus.KYP_PENDING || stage === 'Pending (KYP)') return 'Pending';
      return stage;
    }
    
    const labelMap: Record<string, string> = {
      'Pending (KYP)': 'Pending',
      'Pending': 'Pending',
      'KYP Accepted': 'Approved',
      'KYP Completed': 'Approved',
      'KYP Query Pending': 'Query Pending',
      'KYP Query Replied': 'Query Replied',
      'KYP Rejected': 'Rejected',
      'KYP Pending Approval': 'Pending Approval'
    };
    return labelMap[status] || status;
  };

  const currentLabel = getLabel();
  const currentStatusStyle = styles[status] || (
    currentLabel === 'Approved' ? styles['Approved'] :
    currentLabel === 'Rejected' ? styles['Rejected'] :
    currentLabel === 'Query Pending' ? styles['Query Pending'] :
    currentLabel === 'Query Replied' ? styles['Query Replied'] :
    'bg-slate-100 text-slate-700 border-slate-200'
  );

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border ${currentStatusStyle}`}>
      {currentLabel}
    </span>
  );
};

export default KYPDashboard;
