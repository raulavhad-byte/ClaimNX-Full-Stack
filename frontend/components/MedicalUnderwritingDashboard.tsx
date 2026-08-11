import React, { useState, useMemo, useEffect } from 'react';
import { Claim, HospitalUser, ClaimStatus, Product, ROLE_STAGE_ENTITLEMENTS } from '../types';
import { 
  Stethoscope, Activity, CheckCircle2, AlertTriangle, XCircle, Clock,
  Search, Filter, FileText, FileCheck, BrainCircuit, ZoomIn, Tag,
  ChevronRight, ChevronDown, Check, X, AlertCircle, FileWarning, Loader2, Eye,
  RefreshCw, TrendingUp, BarChart3, User, Zap, ShieldAlert, MessageSquare, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auditService } from '../services/auditService';
import { documentsApi } from '../services/api';
import { toast } from 'sonner';
import PendingTAT from './PendingTAT';
import { formatDate, parseDate } from '../utils';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const formatDateTime = (date: any): string => {
  const d = parseDate(date);
  if (isNaN(d.getTime())) return 'N/A';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};
import DownloadReportModal from './DownloadReportModal';
import { Download } from 'lucide-react';

interface MedicalUnderwritingDashboardProps {
  claims: Claim[];
  visibleHospitals: HospitalUser[];
  currentUser: HospitalUser;
  users: HospitalUser[];
  onUpdateClaim: (claim: Claim) => void;
}

export default function MedicalUnderwritingDashboard({ claims, visibleHospitals, currentUser, users, onUpdateClaim }: MedicalUnderwritingDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const configuredMedicalStages = useMemo(() => {
    const configuredKeys = currentUser.allowedStages || [];
    return new Set(
      ROLE_STAGE_ENTITLEMENTS
        .flatMap((group) => group.stages)
        .filter((stage) => configuredKeys.includes(stage.key))
        .map((stage) => stage.status),
    );
  }, [currentUser.allowedStages]);

  // Handle auto-selection from navigation state
  useEffect(() => {
    if (location.state?.selectedClaimId) {
      const claim = claims.find(c => c.id === location.state.selectedClaimId);
      if (claim) {
        setSelectedClaim(claim);
        // Clear state to avoid re-selection on every render
        navigate(location.pathname, { replace: true, state: { ...location.state, selectedClaimId: undefined } });
      }
    }
  }, [location.state, claims, navigate, location.pathname]);

  // Auto-refresh logic
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing cases...');
      // In a real app, this would fetch from API
    }, 300000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Refreshing cases
    setIsRefreshing(false);
    toast.success('Cases updated successfully');
  };

  const isManager = useMemo(() => {
    const managerRoles = ['Medical Head', 'Manager', 'Department Head', 'Super Admin', 'Admin'];
    const hasOversightPermission = currentUser.permissionsMatrix?.medical_oversight === true || 
                                   currentUser.permissionsMatrix?.team_view === true;
    // We'll also check if permissions prop exists if needed, but currentUser has permissionsMatrix
    return managerRoles.includes(currentUser.role) || currentUser.isAdmin || hasOversightPermission;
  }, [currentUser]);

  const [showUnderwritingOversight, setShowUnderwritingOversight] = useState(false);

  // Filter claims relevant to Medical Officer
  const medicalClaims = useMemo(() => {
    let filtered = claims;

    // 0. Geographic Restrictions
    if (currentUser.role !== 'Super Admin' && !currentUser.isAdmin) {
      const userZones = currentUser.zones || [];
      const userStates = currentUser.states || [];
      const userDistricts = currentUser.districts || [];

      if (userZones.length > 0 || userStates.length > 0 || userDistricts.length > 0) {
        filtered = filtered.filter(c => {
          const hospId = c.hospitalId || c.formData?.hospitalId;
          const hosp = users.find(h => h.id === hospId) || visibleHospitals.find(h => h.id === hospId);
          // Claim location is a database snapshot, so an officer's queue can
          // be filtered even when users.view is intentionally unavailable.
          const claimZone = hosp?.zone || c.formData?.hosp_zone || '';
          const claimState = hosp?.state || c.formData?.hosp_state || c.formData?.p_state || '';
          const claimDistrict = hosp?.district || c.formData?.hosp_district || c.formData?.p_district || '';
          const zoneMatch = userZones.length === 0 || userZones.includes(claimZone);
          const stateMatch = userStates.length === 0 || userStates.includes(claimState);
          const districtMatch = userDistricts.length === 0 || userDistricts.includes(claimDistrict);

          return zoneMatch && stateMatch && districtMatch;
        });
      }
    }

    return filtered.filter(c => {
      const hospital = visibleHospitals.find(h => h.id === (c.hospitalId || c.formData?.hospitalId || ''));
      const isScrutinyRequired = hospital?.valueAddedServices?.medicalScrutinyRequired !== false;

      // Exclusion for Recovery & Reconciliation
      if (c.product === Product.RECOVERY_RECONCILIATION) return false;

      // Inclusion check for relevant statuses
      const isStatusMatch = [
        ClaimStatus.PENDING_MEDICAL_REVIEW, 
        ClaimStatus.PENDING_MEDICAL_TEAM,
        ClaimStatus.KYP_PENDING,
        ClaimStatus.KYP_ACCEPTED,
        ClaimStatus.KYP_COMPLETED,
        ClaimStatus.ENHANCEMENT,
        ClaimStatus.DISCHARGE_INITIATED,
        ClaimStatus.MEDICAL_QUERY_RAISED,
        ClaimStatus.MEDICAL_QUERY_REPLIED,
        ClaimStatus.MEDICAL_APPROVED,
        ClaimStatus.MEDICAL_REJECTED,
        ClaimStatus.ASSESSMENT_INITIATED,
        ClaimStatus.ASSESSMENT_APPROVED,
        ClaimStatus.ASSESSMENT_QUERY_PENDING,
        ClaimStatus.ASSESSMENT_QUERY_REPLIED,
        ClaimStatus.PRE_AUTH_INITIATED,
        ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
        ClaimStatus.QUERY_REPLY_DONE,
        ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
        ClaimStatus.DISCHARGE_QUERY_REPLY
      ].includes(c.status as ClaimStatus);

      // Role-stage entitlements extend the standard medical queue. This lets
      // administrators route any configured pre-auth, enhancement, discharge
      // or medical-query stage to the Medical Officer for scrutiny.
      const isConfiguredMedicalStage = configuredMedicalStages.has(c.status as ClaimStatus);
      if (!isScrutinyRequired || (!isStatusMatch && !isConfiguredMedicalStage)) return false;

      // Hierarchy filtering: Allow clinical roles to see all cases in their assigned hospitals
      const isClinicalRole = [
        'medical officer',
        'medical team',
        'medical specialist',
        'medical head',
        'doctor',
        'consultant',
        'clinical review'
      ].includes((currentUser.role || '').toLowerCase());
      if (isManager || isClinicalRole || currentUser.isAdmin || currentUser.role === 'Super Admin') {
        return true;
      }

      // For other roles, only show their own cases
      return c.createdBy === currentUser.id;
    });
  }, [claims, visibleHospitals, currentUser, isManager, users, configuredMedicalStages]);

  const filteredClaims = useMemo(() => {
    return medicalClaims.filter(c => {
      const matchesSearch = 
        c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesHospital = selectedHospital === 'All' || (c.formData?.hospitalId || '') === selectedHospital;
      let matchesStatus = true;
      if (selectedStatus === 'All') {
        matchesStatus = true;
      } else if (selectedStatus === 'PendingBucket') {
        matchesStatus = !c.isAccepted && !c.isMedicallyApproved && [
          ClaimStatus.PENDING_MEDICAL_REVIEW, 
          ClaimStatus.PRE_AUTH_INITIATED,
          ClaimStatus.KYP_PENDING,
          ClaimStatus.KYP_ACCEPTED,
          ClaimStatus.KYP_COMPLETED, 
          ClaimStatus.ENHANCEMENT, 
          ClaimStatus.DISCHARGE_INITIATED,
          ClaimStatus.MEDICAL_QUERY_REPLIED,
          ClaimStatus.QUERY_REPLY_DONE,
          ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
          ClaimStatus.DISCHARGE_QUERY_REPLY,
          ClaimStatus.ASSESSMENT_INITIATED,
          ClaimStatus.ASSESSMENT_QUERY_REPLIED,
          ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
          ClaimStatus.NEW_REGISTRATION,
          ClaimStatus.FILE_DISPATCHED
        ].includes(c.status as ClaimStatus);
      } else if (selectedStatus === 'UnderReview') {
        matchesStatus = !!c.isAccepted && !c.isMedicallyApproved && ![
          ClaimStatus.MEDICAL_APPROVED, 
          ClaimStatus.MEDICAL_REJECTED,
          ClaimStatus.ASSESSMENT_APPROVED,
          ClaimStatus.ASSESSMENT_REJECTED,
          ClaimStatus.PRE_AUTH_APPROVED,
          ClaimStatus.PRE_AUTH_REJECTED,
          ClaimStatus.ENHANCEMENT_APPROVED,
          ClaimStatus.DISCHARGE_APPROVED,
          ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
          ClaimStatus.MEDICALLY_FILE_APPROVED,
          ClaimStatus.CLAIM_APPROVED,
          ClaimStatus.MEDICAL_QUERY_RAISED,
          ClaimStatus.ASSESSMENT_QUERY_PENDING,
          ClaimStatus.INITIAL_QUERY_PENDING,
          ClaimStatus.ENHANCEMENT_QUERY_RAISED,
          ClaimStatus.DISCHARGE_QUERY_RAISED
        ].includes(c.status as ClaimStatus);
      } else if (selectedStatus === ClaimStatus.MEDICAL_APPROVED) {
        matchesStatus = [
          ClaimStatus.MEDICAL_APPROVED, 
          ClaimStatus.ASSESSMENT_APPROVED,
          ClaimStatus.PRE_AUTH_APPROVED,
          ClaimStatus.ENHANCEMENT_APPROVED,
          ClaimStatus.DISCHARGE_APPROVED,
          ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
          ClaimStatus.MEDICALLY_FILE_APPROVED,
          ClaimStatus.CLAIM_APPROVED
        ].includes(c.status as ClaimStatus) || !!c.isMedicallyApproved;
      } else if (selectedStatus === ClaimStatus.MEDICAL_QUERY_RAISED) {
        matchesStatus = [ClaimStatus.MEDICAL_QUERY_RAISED, ClaimStatus.ASSESSMENT_QUERY_PENDING, ClaimStatus.INITIAL_QUERY_PENDING, ClaimStatus.ENHANCEMENT_QUERY_RAISED, ClaimStatus.DISCHARGE_QUERY_RAISED].includes(c.status as ClaimStatus);
      } else {
        matchesStatus = c.status === selectedStatus || (selectedStatus === ClaimStatus.MEDICAL_REJECTED && [ClaimStatus.MEDICAL_REJECTED, ClaimStatus.ASSESSMENT_REJECTED, ClaimStatus.PRE_AUTH_REJECTED].includes(c.status as ClaimStatus));
      }
      
      // AI Priority logic (mocked for now)
      const amount = c.estimatedCost || 0;
      const priority = amount > 100000 ? 'Critical' : (amount > 50000 ? 'Urgent' : 'Standard');
      const matchesPriority = selectedPriority === 'All' || priority === selectedPriority;

      return matchesSearch && matchesHospital && matchesStatus && matchesPriority;
    });
  }, [medicalClaims, searchQuery, selectedHospital, selectedStatus, selectedPriority, visibleHospitals]);

  // Default to Pending Review on load if nothing selected
  useEffect(() => {
    if (selectedStatus === 'All' && stats.pending > 0) {
      setSelectedStatus('PendingBucket');
    }
  }, []);

  const stats = useMemo(() => {
    const scrutinyClaims = claims.filter(c => {
      const hospital = visibleHospitals.find(h => h.id === (c.hospitalId || c.formData?.hospitalId));
      return hospital?.valueAddedServices?.medicalScrutinyRequired !== false;
    });

    return {
      total: medicalClaims.length,
      pending: medicalClaims.filter(c => 
        !c.isAccepted && !c.isMedicallyApproved && [
          ClaimStatus.PENDING_MEDICAL_REVIEW, 
          ClaimStatus.PRE_AUTH_INITIATED,
          ClaimStatus.KYP_PENDING, 
          ClaimStatus.KYP_ACCEPTED, 
          ClaimStatus.KYP_COMPLETED, 
          ClaimStatus.ENHANCEMENT, 
          ClaimStatus.DISCHARGE_INITIATED, 
          ClaimStatus.MEDICAL_QUERY_REPLIED, 
          ClaimStatus.QUERY_REPLY_DONE,
          ClaimStatus.ENHANCEMENT_QUERY_RESOLVED, 
          ClaimStatus.DISCHARGE_QUERY_REPLY,
          ClaimStatus.ASSESSMENT_INITIATED,
          ClaimStatus.ASSESSMENT_QUERY_REPLIED,
          ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
          ClaimStatus.NEW_REGISTRATION,
          ClaimStatus.FILE_DISPATCHED
        ].includes(c.status as ClaimStatus)
      ).length,
      underReview: medicalClaims.filter(c => c.isAccepted && !c.isMedicallyApproved && ![
        ClaimStatus.MEDICAL_APPROVED, 
        ClaimStatus.MEDICAL_REJECTED,
        ClaimStatus.ASSESSMENT_APPROVED,
        ClaimStatus.ASSESSMENT_REJECTED,
        ClaimStatus.PRE_AUTH_APPROVED,
        ClaimStatus.PRE_AUTH_REJECTED,
        ClaimStatus.ENHANCEMENT_APPROVED,
        ClaimStatus.DISCHARGE_APPROVED,
        ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
        ClaimStatus.MEDICALLY_FILE_APPROVED,
        ClaimStatus.CLAIM_APPROVED,
        ClaimStatus.MEDICAL_QUERY_RAISED,
        ClaimStatus.ASSESSMENT_QUERY_PENDING,
        ClaimStatus.INITIAL_QUERY_PENDING,
        ClaimStatus.ENHANCEMENT_QUERY_RAISED,
        ClaimStatus.DISCHARGE_QUERY_RAISED
      ].includes(c.status as ClaimStatus)).length,
      approved: medicalClaims.filter(c => 
        [
          ClaimStatus.MEDICAL_APPROVED, 
          ClaimStatus.ASSESSMENT_APPROVED,
          ClaimStatus.PRE_AUTH_APPROVED,
          ClaimStatus.ENHANCEMENT_APPROVED,
          ClaimStatus.DISCHARGE_APPROVED,
          ClaimStatus.DISCHARGE_RECONSIDERATION_APPROVED,
          ClaimStatus.MEDICALLY_FILE_APPROVED,
          ClaimStatus.CLAIM_APPROVED
        ].includes(c.status as ClaimStatus) || c.isMedicallyApproved
      ).length,
      queried: medicalClaims.filter(c => [ClaimStatus.MEDICAL_QUERY_RAISED, ClaimStatus.ASSESSMENT_QUERY_PENDING, ClaimStatus.INITIAL_QUERY_PENDING, ClaimStatus.ENHANCEMENT_QUERY_RAISED, ClaimStatus.DISCHARGE_QUERY_RAISED].includes(c.status as ClaimStatus)).length,
      rejected: medicalClaims.filter(c => [ClaimStatus.MEDICAL_REJECTED, ClaimStatus.ASSESSMENT_REJECTED, ClaimStatus.PRE_AUTH_REJECTED, ClaimStatus.ENHANCEMENT_REJECTED, ClaimStatus.DISCHARGE_REJECTED].includes(c.status as ClaimStatus)).length,
      avgTat: '3.8 hrs',
      performance: {
        today: 12,
        weekly: 58,
        monthly: 245,
        totalReviewed: 1240,
        approvalRate: 82,
        highRiskRatio: 15,
        queryEfficiency: 94
      }
    };
  }, [medicalClaims, claims, visibleHospitals]);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleReviewCase = async (claim: Claim) => {
    const isPendingStatus = [
      ClaimStatus.PENDING_MEDICAL_REVIEW, 
      ClaimStatus.KYP_PENDING,
      ClaimStatus.KYP_ACCEPTED,
      ClaimStatus.KYP_COMPLETED, 
      ClaimStatus.ENHANCEMENT, 
      ClaimStatus.DISCHARGE_INITIATED,
      ClaimStatus.MEDICAL_QUERY_REPLIED,
      ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
      ClaimStatus.ASSESSMENT_INITIATED,
      ClaimStatus.ASSESSMENT_QUERY_REPLIED,
      ClaimStatus.PRE_AUTH_INITIATED,
      ClaimStatus.PENDING_WITH_MEDICAL_SCRUTINY,
      ClaimStatus.NEW_REGISTRATION,
      ClaimStatus.FILE_DISPATCHED
    ].includes(claim.status as ClaimStatus);

    if (isPendingStatus) {
      const isEnhOrDis = claim.status === ClaimStatus.ENHANCEMENT || claim.status === ClaimStatus.DISCHARGE_INITIATED;
      const updatedClaim: Claim = {
        ...claim,
        originatingStatus: isEnhOrDis ? claim.status : ((claim.originatingStatus || claim.status) as ClaimStatus),
        assignedMedicalUserId: currentUser.id,
        assignedMedicalUserName: currentUser.displayName || currentUser.username || 'Medical Officer',
        isAccepted: true,
        status: ClaimStatus.PENDING_MEDICAL_TEAM,
        history: [
          {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: ClaimStatus.PENDING_MEDICAL_TEAM as any,
            comment: `Case accepted for clinical review by ${currentUser.displayName}. (Current Status: ${claim.status})`,
            type: 'status_change' as const
          },
          ...(claim.history || [])
        ]
      };
      onUpdateClaim(updatedClaim);
      setSelectedClaim(updatedClaim);
    } else {
      setSelectedClaim(claim);
    }
  };

  const handleQuickAction = (claim: Claim, action: 'approve' | 'reject' | 'query') => {
    // This would open a quick modal or just perform the action if simple
    setSelectedClaim(claim);
    // We'll let the review screen handle the actual submission for now to ensure remarks are added
  };

  if (selectedClaim) {
    return <MedicalReviewScreen 
      claim={selectedClaim} 
      currentUser={currentUser} 
      onBack={() => {
        setSelectedClaim(null);
      }} 
      onUpdateClaim={(updatedClaim) => {
        onUpdateClaim(updatedClaim);
      }} 
    />;
  }

  return (
    <div className="p-6 max-w-full mx-auto space-y-6 bg-slate-50/30 min-h-screen">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="text-blue-600" size={28} />
            Medical Underwriting
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">AI-Assisted Clinical Scrutiny & Decision Making</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border border-emerald-500 rounded-xl text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button 
            onClick={() => setShowPerformance(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <BarChart3 size={18} />
            My Performance
          </button>
          <button 
            onClick={() => setShowDownloadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#000080] text-white rounded-xl text-sm font-bold hover:bg-blue-900 transition-all shadow-md shadow-blue-100"
          >
            <Download size={18} />
            Download Report
          </button>
        </div>
      </div>



      {/* Bucket KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <KpiCard 
          title="Pending Review" 
          count={stats.pending}
          value={stats.pending} 
          icon={Clock} 
          color="orange" 
          onClick={() => setSelectedStatus(selectedStatus === 'PendingBucket' ? 'All' : 'PendingBucket')}
          active={selectedStatus === 'PendingBucket'}
        />
        <KpiCard 
          title="Under Review" 
          count={stats.underReview}
          value={stats.underReview} 
          icon={Activity} 
          color="blue" 
          onClick={() => setSelectedStatus(selectedStatus === 'UnderReview' ? 'All' : 'UnderReview')}
          active={selectedStatus === 'UnderReview'}
        />
        <KpiCard 
          title="Approved" 
          count={stats.approved}
          value={stats.approved} 
          icon={CheckCircle2} 
          color="green" 
          onClick={() => setSelectedStatus(selectedStatus === ClaimStatus.MEDICAL_APPROVED ? 'All' : ClaimStatus.MEDICAL_APPROVED)}
          active={selectedStatus === ClaimStatus.MEDICAL_APPROVED}
        />
        <KpiCard 
          title="Query Pending" 
          count={stats.queried}
          value={stats.queried} 
          icon={AlertTriangle} 
          color="yellow" 
          onClick={() => setSelectedStatus(selectedStatus === ClaimStatus.MEDICAL_QUERY_RAISED ? 'All' : ClaimStatus.MEDICAL_QUERY_RAISED)}
          active={selectedStatus === ClaimStatus.MEDICAL_QUERY_RAISED}
        />
        <KpiCard 
          title="Rejected" 
          count={stats.rejected}
          value={stats.rejected} 
          icon={XCircle} 
          color="red" 
          onClick={() => setSelectedStatus(selectedStatus === ClaimStatus.MEDICAL_REJECTED ? 'All' : ClaimStatus.MEDICAL_REJECTED)}
          active={selectedStatus === ClaimStatus.MEDICAL_REJECTED}
        />
        <KpiCard title="Avg Review TAT" value={stats.avgTat} icon={Zap} color="indigo" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search patient, ID, diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select 
          value={selectedHospital}
          onChange={(e) => setSelectedHospital(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none"
        >
          <option value="All">All Hospitals</option>
          {visibleHospitals.filter(h => h.entityType === 'Hospital').map(h => <option key={h.id} value={h.id}>{h.displayName}</option>)}
        </select>
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="PendingBucket">Pending Review (All New)</option>
          <option value="UnderReview">In-Scrutiny / Under Review</option>
          <option value={ClaimStatus.MEDICAL_QUERY_RAISED}>{ClaimStatus.MEDICAL_QUERY_RAISED}</option>
          <option value={ClaimStatus.MEDICAL_APPROVED}>{ClaimStatus.MEDICAL_APPROVED}</option>
          <option value={ClaimStatus.MEDICAL_REJECTED}>{ClaimStatus.MEDICAL_REJECTED}</option>
        </select>
        <select 
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none"
        >
          <option value="All">All Priorities</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>
      </div>

      {/* Case Listing */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-3 py-4">Case ID</th>
                <th className="px-3 py-4">Patient Name</th>
                <th className="px-3 py-4">Product</th>
                <th className="px-3 py-4">Hospital Name</th>
                <th className="px-3 py-4">Insurer Name</th>
                <th className="px-3 py-4">TPA Name</th>
                <th className="px-3 py-4">Diagnosis</th>
                <th className="px-3 py-4 text-right">Claim Amount</th>
                <th className="px-3 py-4">Status</th>
                <th className="px-3 py-4 text-center">TAT</th>
                <th className="px-3 py-4 text-center">
                  {selectedStatus === ClaimStatus.MEDICAL_APPROVED ? "Approved By" : "Assigned Doctor"}
                </th>
                <th className="px-3 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.map((claim, index) => {
                const amount = claim.estimatedCost || 0;
                
                const getStatusRowColor = (status: string) => {
                  switch (status) {
                    case ClaimStatus.PENDING_MEDICAL_REVIEW: return 'bg-amber-50/40 hover:bg-amber-100/50';
                    case ClaimStatus.MEDICAL_APPROVED: return 'bg-emerald-50/40 hover:bg-emerald-100/50';
                    case ClaimStatus.MEDICAL_QUERY_RAISED: return 'bg-orange-50/40 hover:bg-orange-100/50';
                    case ClaimStatus.MEDICAL_REJECTED: return 'bg-rose-50/40 hover:bg-rose-100/50';
                    default: 
                      if (claim.isAccepted && ![ClaimStatus.MEDICAL_APPROVED, ClaimStatus.MEDICAL_REJECTED, ClaimStatus.MEDICAL_QUERY_RAISED].includes(claim.status as any)) {
                        return 'bg-blue-50/40 hover:bg-blue-100/50';
                      }
                      return 'hover:bg-slate-50/50';
                  }
                };

                return (
                  <tr key={claim.id} className={`${getStatusRowColor(claim.status)} transition-colors group border-b border-white/50 ${claim.isAccepted ? 'border-l-4 border-l-blue-500' : ''}`}>
                    <td className="px-3 py-4">
                      <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest w-max shadow-sm">
                        {(() => {
                          const idx = claims.findIndex(c => c.id === claim.id);
                          return idx >= 0 ? 101 + idx : '---';
                        })()}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <Link to={`/process-claim/${claim.id}?source=medical`} className="font-black text-slate-900 hover:text-blue-600 transition-colors text-sm uppercase tracking-tight">
                        {claim.patientName}
                      </Link>
                    </td>
                    <td className="px-3 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                        {claim.product || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-700 max-w-[150px] truncate">
                        {visibleHospitals.find(h => h.id === (claim.formData?.hospitalId || ''))?.displayName || claim.formData?.hosp_name || claim.formData?.hospitalId || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-700 max-w-[150px] truncate">
                        {claim.insuranceProvider || claim.formData?.insurer || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-700 max-w-[150px] truncate">
                        {claim.formData?.tpa || 'Direct'}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-900 line-clamp-1 max-w-[200px]">{claim.diagnosis}</div>
                    </td>
                    <td className="px-3 py-4 font-bold text-slate-700 text-right">
                      ₹{Number(amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-4">
                      <motion.span 
                        animate={claim.isAccepted && ![ClaimStatus.MEDICAL_APPROVED, ClaimStatus.MEDICAL_REJECTED].includes(claim.status as any) ? { 
                          backgroundColor: ['rgba(187, 247, 208, 0.1)', 'rgba(34, 197, 94, 0.2)', 'rgba(187, 247, 208, 0.1)'],
                          borderColor: ['rgba(34, 197, 94, 0.2)', 'rgba(22, 163, 74, 0.6)', 'rgba(34, 197, 94, 0.2)'],
                        } : {}}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest text-center block ${
                          claim.isAccepted 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        } whitespace-nowrap`}
                      >
                        {claim.isMedicallyApproved || [ClaimStatus.MEDICAL_APPROVED, ClaimStatus.MEDICAL_REJECTED, ClaimStatus.ASSESSMENT_APPROVED, ClaimStatus.MEDICALLY_FILE_APPROVED].includes(claim.status as any) ? 'Done' : claim.status}
                      </motion.span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PendingTAT 
                        startTime={claim.updatedAt} 
                        completedTime={(claim.status === ClaimStatus.MEDICAL_APPROVED || claim.status === ClaimStatus.ASSESSMENT_APPROVED) ? claim.updatedAt : undefined} 
                        type="medical" 
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {selectedStatus === ClaimStatus.MEDICAL_APPROVED ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full shadow-xs">
                            {claim.assignedMedicalUserName || claim.formData?.approvedByUserName || 'Dr. Medical Officer'}
                          </span>
                        </div>
                      ) : (claim.assignedMedicalUserName && claim.isAccepted) ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm shrink-0">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            <span className="text-[10px] font-black uppercase tracking-wider">{claim.assignedMedicalUserName}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Clinical Desk</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {claim.isMedicallyApproved || [ClaimStatus.MEDICAL_APPROVED, ClaimStatus.MEDICAL_REJECTED, ClaimStatus.ASSESSMENT_APPROVED, ClaimStatus.MEDICALLY_FILE_APPROVED].includes(claim.status as any) ? (
                        <div className="flex items-center justify-center text-emerald-600 font-bold px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 whitespace-nowrap">
                          <CheckCircle2 size={16} className="mr-1.5" /> Done
                        </div>
                      ) : (
                        <motion.button 
                          onClick={() => handleReviewCase(claim)}
                          animate={claim.isAccepted && ![ClaimStatus.MEDICAL_APPROVED, ClaimStatus.MEDICAL_REJECTED].includes(claim.status as any)? {
                            backgroundColor: ['#10b981', '#059669', '#10b981'],
                            scale: [1, 1.02, 1]
                          } : {}}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 whitespace-nowrap ${
                            claim.isAccepted && ![ClaimStatus.MEDICAL_APPROVED, ClaimStatus.MEDICAL_REJECTED].includes(claim.status as any)
                              ? 'bg-emerald-500 text-white shadow-emerald-200' 
                              : 'bg-[#000080] text-white shadow-blue-900/20 hover:bg-blue-900 border border-transparent'
                          }`}
                        >
                          {claim.isAccepted && ![ClaimStatus.MEDICAL_APPROVED, ClaimStatus.MEDICAL_REJECTED].includes(claim.status as any) ? 'In-Scrutiny' : 'Accept Claim'}
                        </motion.button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredClaims.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-500">
                    <Stethoscope className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-lg font-medium text-slate-900">No cases found</p>
                    <p className="text-sm">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Panel */}
      <AnimatePresence>
        {showPerformance && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPerformance(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[100] flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">My Performance</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Medical Officer Insights</p>
                  </div>
                </div>
                <button onClick={() => setShowPerformance(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Core Metrics */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-600" />
                    Review Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <PerformanceMetric label="Today" value={stats.performance.today} />
                    <PerformanceMetric label="This Week" value={stats.performance.weekly} />
                    <PerformanceMetric label="This Month" value={stats.performance.monthly} />
                    <PerformanceMetric label="Total Lifetime" value={stats.performance.totalReviewed} />
                  </div>
                </div>

                {/* Outcome Distribution */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-600" />
                    Decision Outcomes
                  </h3>
                  <div className="space-y-3">
                    <OutcomeBar label="Approved" value={stats.approved} total={stats.total} color="bg-green-500" />
                    <OutcomeBar label="Rejected" value={stats.rejected} total={stats.total} color="bg-red-500" />
                    <OutcomeBar label="Queries Raised" value={stats.queried} total={stats.total} color="bg-yellow-500" />
                  </div>
                </div>

                {/* Smart Insights */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <BrainCircuit size={16} className="text-purple-600" />
                    Smart AI Insights
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <InsightCard 
                      icon={Zap} 
                      label="Approval Rate" 
                      value={`${stats.performance.approvalRate}%`} 
                      desc="Higher than team average (78%)"
                      color="green"
                    />
                    <InsightCard 
                      icon={ShieldAlert} 
                      label="High-Risk Detection" 
                      value={`${stats.performance.highRiskRatio}%`} 
                      desc="Cases flagged for clinical mismatch"
                      color="orange"
                    />
                    <InsightCard 
                      icon={Check} 
                      label="Query Efficiency" 
                      value={`${stats.performance.queryEfficiency}%`} 
                      desc="First-time resolution rate"
                      color="blue"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-4">
                  <span>Average Review TAT</span>
                  <span className="text-slate-900">{stats.avgTat}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[85%]" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Download Report Modal */}
      <DownloadReportModal 
        isOpen={showDownloadModal} 
        onClose={() => setShowDownloadModal(false)} 
        claims={claims} 
        hospitals={visibleHospitals as any} 
      />
    </div>
  );
}

function KpiCard({ title, value, count, icon: Icon, color, onClick, active }: { title: string, value: string | number, count?: number, icon: any, color: string, onClick?: () => void, active?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600 text-white',
    orange: 'bg-orange-600 text-white',
    green: 'bg-emerald-600 text-white',
    yellow: 'bg-amber-600 text-white',
    red: 'bg-rose-600 text-white',
    indigo: 'bg-indigo-600 text-white',
  };

  const bgColors: Record<string, string> = {
    blue: 'bg-blue-50/60',
    orange: 'bg-orange-50/60',
    green: 'bg-emerald-50/60',
    yellow: 'bg-amber-50/60',
    red: 'bg-rose-50/60',
    indigo: 'bg-indigo-50/60',
  };

  const activeMap: Record<string, string> = {
    blue: 'ring-4 ring-blue-500/20 border-blue-500 bg-blue-100/80 shadow-lg scale-[1.02]',
    orange: 'ring-4 ring-orange-500/20 border-orange-500 bg-orange-100/80 shadow-lg scale-[1.02]',
    green: 'ring-4 ring-emerald-500/20 border-emerald-500 bg-emerald-100/80 shadow-lg scale-[1.02]',
    yellow: 'ring-4 ring-amber-500/20 border-amber-500 bg-amber-100/80 shadow-lg scale-[1.02]',
    red: 'ring-4 ring-rose-500/20 border-rose-500 bg-rose-100/80 shadow-lg scale-[1.02]',
    indigo: 'ring-4 ring-indigo-500/20 border-indigo-500 bg-indigo-100/80 shadow-lg scale-[1.02]',
  };

  return (
    <button 
      onClick={onClick}
      className={`${bgColors[color] || 'bg-white'} p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between text-left transition-all hover:shadow-xl active:scale-95 ${active ? activeMap[color] : 'hover:border-slate-300'}`}
    >
      <div className="flex items-start justify-between mb-2 w-full">
        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-slate-800' : 'text-slate-500 opacity-60'}`}>
          {title} {count !== undefined ? `(${count})` : ''}
        </span>
        <div className={`p-3 rounded-2xl shadow-lg ${colorMap[color]} group-hover:scale-110 transition-transform`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tighter">{value}</div>
    </button>
  );
}

// --- Medical Review Screen ---

function MedicalReviewScreen({ claim, currentUser, onBack, onUpdateClaim }: { claim: Claim, currentUser: HospitalUser, onBack: () => void, onUpdateClaim: (claim: Claim) => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clinical' | 'documents' | 'timeline'>('clinical');
  const [decision, setDecision] = useState<'approve' | 'query' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [queryTemplate, setQueryTemplate] = useState('');
  const [isSubmittingRPA, setIsSubmittingRPA] = useState(false);
  const [previewFile, setPreviewFile] = useState<{name: string, data: string, type: string} | null>(null);
  const [storedDocuments, setStoredDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoadingDocuments(true);
    documentsApi.listClaimDocuments(claim.id)
      .then((documents) => {
        if (active) setStoredDocuments(documents);
      })
      .catch((error) => {
        // Legacy/in-memory claims may not have stored documents. Do not block
        // clinical review in that case.
        console.warn('Unable to load persisted claim documents', error);
        if (active) setStoredDocuments([]);
      })
      .finally(() => {
        if (active) setIsLoadingDocuments(false);
      });
    return () => { active = false; };
  }, [claim.id]);

  const handleSubmitDecision = async () => {
    if (!decision) {
      toast.error('Please select a decision first');
      return;
    }

    if (decision === 'approve') {
      setIsSubmittingRPA(true);
      try {
        // Simulating automated integration (RPA process or Email dispatch)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Future Provision: RPA / Portal / Email Integration
        // Determine submission method based on insurance provider setup
        // For now, we simulate the process
        const isPartnerProcessing = claim.product === Product.PARTNER_PROCESSING;
        const isCashless = claim.product === Product.CPC || claim.product === Product.BG_DESK;
        const isIcaOrPrePost = claim.product === Product.ICA || claim.product === Product.PRE_POST;

        let submissionMethod = isPartnerProcessing ? 'Manual Submission' : (Math.random() > 0.5 ? 'Portal' : 'Email'); 
        
        const isQueryReplyStatus = [
          ClaimStatus.QUERY_REPLY_DONE,
          ClaimStatus.ENHANCEMENT_QUERY_RESOLVED,
          ClaimStatus.DISCHARGE_QUERY_REPLY
        ].includes(claim.status as ClaimStatus);

        if (isQueryReplyStatus) {
          submissionMethod = Math.random() > 0.5 ? 'RPA (Auto-Submission)' : 'Email Integration';
        }

        const isSuccess = isPartnerProcessing ? true : (Math.random() > 0.1); 
        
        let targetStatus = claim.status;
        let isMedicallyApproved = true;

        const orgStatus = claim.originatingStatus;

        if (isPartnerProcessing) {
          targetStatus = ClaimStatus.ASSESSMENT_APPROVED;
        } else if (isIcaOrPrePost) {
          targetStatus = ClaimStatus.MEDICALLY_FILE_APPROVED;
        } else if (isCashless) {
          if (claim.status === ClaimStatus.QUERY_REPLY_DONE) {
            targetStatus = ClaimStatus.PRE_AUTH_APPROVED;
          } else if (claim.status === ClaimStatus.ENHANCEMENT_QUERY_RESOLVED) {
            targetStatus = ClaimStatus.ENHANCEMENT_APPROVED;
          } else if (claim.status === ClaimStatus.DISCHARGE_QUERY_REPLY) {
            targetStatus = ClaimStatus.DISCHARGE_APPROVED;
          } else {
            // Requirement: For Cashless, revert to previous status (Initiated stage)
            // If no originating status, default to Pre Auth Initiated
            const latestNonMedicalHistory = claim.history?.find(h => 
              h.status !== ClaimStatus.PENDING_MEDICAL_REVIEW && 
              h.status !== ClaimStatus.MEDICAL_QUERY_RAISED && 
              h.status !== ClaimStatus.MEDICAL_QUERY_REPLIED &&
              h.status !== ('medical_decision' as any)
            );
            if (claim.status === ClaimStatus.ENHANCEMENT || orgStatus === ClaimStatus.ENHANCEMENT || latestNonMedicalHistory?.status === ClaimStatus.ENHANCEMENT) {
              targetStatus = ClaimStatus.ENHANCEMENT;
            } else if (claim.status === ClaimStatus.DISCHARGE_INITIATED || orgStatus === ClaimStatus.DISCHARGE_INITIATED || latestNonMedicalHistory?.status === ClaimStatus.DISCHARGE_INITIATED) {
              targetStatus = ClaimStatus.DISCHARGE_INITIATED;
            } else {
              targetStatus = (!orgStatus || orgStatus === ClaimStatus.PENDING_MEDICAL_REVIEW) 
                ? ClaimStatus.PRE_AUTH_INITIATED 
                : orgStatus;
            }
          }
          isMedicallyApproved = true;
        } else {
          targetStatus = ClaimStatus.PRE_AUTH_APPROVED;
        }

        // Handle specific originating status overrides if not cashless
        if (!isCashless) {
          const hasDischargeInitiatedInHistory = claim.history?.some(h => h.status === ClaimStatus.DISCHARGE_INITIATED);
          if (orgStatus === ClaimStatus.DISCHARGE_INITIATED || hasDischargeInitiatedInHistory) {
            targetStatus = ClaimStatus.DISCHARGE_APPROVED;
          } else if (orgStatus === ClaimStatus.ENHANCEMENT || claim.history?.some(h => h.status === ClaimStatus.ENHANCEMENT)) {
            targetStatus = ClaimStatus.ENHANCEMENT_APPROVED;
          } else if (orgStatus === ClaimStatus.INITIAL_QUERY_PENDING || orgStatus === ClaimStatus.QUERY_REPLY_DONE) {
             targetStatus = ClaimStatus.PRE_AUTH_APPROVED;
          }
        }

        let comment = '';
        if (isQueryReplyStatus) {
          if (submissionMethod.includes('RPA')) {
            comment = `Medical Scrutiny Approved. Claim successfully processed and uploaded to insurer portal via RPA bot. Remarks: ${remarks || 'No remarks'}`;
          } else {
            comment = `Medical Scrutiny Approved. Notification and documents dispatched to Insurance Company via Email Integration. Remarks: ${remarks || 'No remarks'}`;
          }
        } else {
          comment = isSuccess 
            ? `Medical Underwriting Approved. ${isPartnerProcessing ? 'Sent for manual processing' : `Auto-submitted via ${submissionMethod}`}. Remarks: ${remarks || 'No remarks'}`
            : `Medical Underwriting Approved. ${submissionMethod} Submission Failed. Sent for manual handling. Remarks: ${remarks || 'No remarks'}`;
        }

        const updatedClaim: Claim = {
          ...claim,
          status: targetStatus,
          isMedicallyApproved: isMedicallyApproved,
          assignedMedicalUserName: claim.assignedMedicalUserName || currentUser.displayName || 'Dr. Medical Officer',
          isAccepted: false,
          submissionStatus: isSuccess ? 'Success' : 'Failed',
          failureType: isSuccess ? undefined : (submissionMethod.includes('RPA') ? 'RPA' : 'Email' as any),
          updatedAt: new Date().toISOString(),
          history: [
            {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              status: targetStatus as any,
              comment: comment,
              type: 'medical_decision' as const,
              userName: currentUser.displayName,
              userRole: currentUser.role
            },
            ...(claim.history || [])
          ]
        };
        
        auditService.log({
          userId: currentUser.id,
          userName: currentUser.displayName,
          action: 'Medical Decision Submitted',
          resourceId: claim.id,
          resourceType: 'Claim',
          previousValues: { status: claim.status },
          newValues: { status: updatedClaim.status, decision: 'approve', remarks, submissionMethod }
        });

        if (isSuccess) {
          if (isPartnerProcessing) {
            toast.success(`Case Approved. Sent for manual processing.`);
          } else if (isQueryReplyStatus) {
            if (submissionMethod.includes('RPA')) {
              toast.success(`Approved by Medical Team & Auto-Submitted to Insurer via RPA!`);
            } else {
              toast.success(`Approved by Medical Team & Sent to Insurer via Email Integration!`);
            }
          } else {
            toast.success(`Case Approved and Auto-Submitted via ${submissionMethod}.`);
          }
        } else {
          toast.warning(`Case Approved but ${submissionMethod} Submission Failed. Sent to CRM.`);
        }

        onUpdateClaim(updatedClaim);
        onBack();
      } catch (error) {
        console.error("Decision submission failed:", error);
        toast.error("Failed to submit decision. Please try again.");
      } finally {
        setIsSubmittingRPA(false);
      }
      return;
    }

    let newStatus = claim.status;
    if (decision === 'query') {
      newStatus = claim.product === Product.PARTNER_PROCESSING 
        ? ClaimStatus.ASSESSMENT_QUERY_PENDING 
        : ClaimStatus.MEDICAL_QUERY_RAISED;
    } else if (decision === 'reject') {
      newStatus = claim.product === Product.PARTNER_PROCESSING
        ? ClaimStatus.ASSESSMENT_REJECTED
        : ClaimStatus.INITIAL_QUERY_PENDING; // Rejection usually mapped to query bucket for CRM handling
    }

    const updatedClaim: Claim = {
      ...claim,
      status: newStatus,
      isAccepted: false,
      originatingStatus: claim.originatingStatus || claim.status,
      queryRaisedBy: 'Medical Underwriting',
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          status: newStatus as any,
          comment: `Medical Underwriting ${decision === 'query' ? 'Query' : 'Rejection'}: ${remarks || 'No remarks'}`,
          type: 'medical_decision' as const,
          userName: currentUser.displayName,
          userRole: currentUser.role
        },
        ...(claim.history || [])
      ]
    };

    auditService.log({
      userId: currentUser.id,
      userName: currentUser.displayName,
      action: 'Medical Decision Submitted',
      resourceId: claim.id,
      resourceType: 'Claim',
      previousValues: { status: claim.status },
      newValues: { status: newStatus, decision, remarks }
    });

    if (decision === 'query') {
      toast.info(`Query raised. Hospital notified.`);
    } else if (decision === 'reject') {
      toast.error(`Case Rejected. CRM notified.`);
    }

    onUpdateClaim(updatedClaim);
    onBack();
  };

  const allDocs = useMemo(() => {
    const seen = new Set<string>();
    const uniqueDocs: any[] = [];
    
    const addUnique = (doc: any) => {
      const id = doc.data || doc.url || doc.name;
      if (!id || seen.has(id)) return;
      seen.add(id);
      uniqueDocs.push(doc);
    };

    const historyDocs = claim.history?.flatMap(h => {
      const docs = [...(h.stageData?.documents || [])].map(d => ({
        ...d,
        uploadedAt: d.uploadedAt || h.date,
        type: d.type || 'Stage Document'
      }));
      if (h.fileData) {
        docs.push({
          name: h.fileName || 'Document',
          data: h.fileData,
          type: h.status || 'Stage Document',
          uploadedAt: h.date
        });
      }
      return docs;
    }) || [];
    
    historyDocs.forEach(addUnique);
    (claim.formData?.attachedDocs || []).forEach(d => {
      addUnique({
        ...d,
        uploadedAt: d.uploadedAt || claim.updatedAt || claim.createdAt || new Date().toISOString()
      });
    });
    (claim.formData?.uploadedDocuments || []).forEach(d => {
      addUnique({
        ...d,
        uploadedAt: d.uploadedAt || claim.updatedAt || claim.createdAt || new Date().toISOString()
      });
    });
    storedDocuments.forEach((document) => {
      addUnique({
        documentId: document.id,
        name: document.file_name || 'Claim Document',
        type: document.category || document.mime_type || 'Claim Document',
        mimeType: document.mime_type || 'application/pdf',
        uploadedAt: document.uploaded_at || document.created_at,
        fileSize: document.file_size,
      });
    });
    
    return uniqueDocs;
  }, [claim, storedDocuments]);

  const openDocumentPreview = async (document: any) => {
    try {
      if (document.documentId) {
        const preview = await documentsApi.previewClaimDocument(document.documentId);
        setPreviewFile({
          name: preview.file_name || document.name,
          data: preview.preview_url,
          type: preview.mime_type || document.mimeType || 'application/pdf',
        });
        return;
      }
      const data = document.data || document.url;
      if (!data) throw new Error('This document does not have preview data.');
      setPreviewFile({
        name: document.name,
        data,
        type: document.mimeType || (data.startsWith('data:image') ? 'image/png' : 'application/pdf'),
      });
    } catch (error) {
      console.error('Unable to preview claim document', error);
      toast.error('Unable to open this document preview.');
    }
  };

  const aiInsights = useMemo(() => {
    // Mock AI insights based on claim data
    const amount = claim.estimatedCost || 0;
    
    const insights = {
      diagnosisMatch: claim.diagnosis.toLowerCase().includes('fever') ? 'Mismatch' : 'Match',
      treatmentJustified: amount > 100000 ? 'Flagged' : 'Justified',
      redFlags: amount > 150000 ? ['High Claim Amount', 'Possible Duplicate Billing'] : [],
      missingDocs: !allDocs.some(d => d.type === 'Discharge Summary') ? ['Discharge Summary'] : [],
      summary: `Patient admitted for ${claim.diagnosis}. Proposed treatment is ${claim.formData?.m_treatment_type || 'standard care'}. Estimated stay is ${claim.formData?.adm_stay_days || 'N/A'} days.`,
      riskLevel: amount > 100000 ? 'High' : 'Low',
      suggestedDecision: amount > 100000 ? 'Query' : 'Approve'
    };
    return insights;
  }, [claim, allDocs]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Link to={`/process-claim/${claim.id}?source=medical`} className="hover:text-blue-600 transition-colors">{claim.patientName}</Link> 
              <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {claim.id}
              </span>
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {claim.formData?.hospitalId || 'Unknown Hospital'} • {claim.diagnosis}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/process-claim/${claim.id}?source=medical`, { state: { from: '/medical-underwriting', selectedClaimId: claim.id } })}
            className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 font-black text-xs uppercase tracking-widest transition-colors px-4 py-2 rounded-lg shadow-lg shadow-green-900/20 mr-4"
          >
            <Eye size={16} /> View Patient Dashboard
          </button>
          <div className="text-right mr-4">
            <div className="text-xs font-bold text-slate-500 uppercase">Claim Amount</div>
            <div className="text-xl font-black text-blue-700">₹{Number(claim.estimatedCost || 0).toLocaleString('en-IN')}</div>
          </div>
          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold border border-slate-200">
            {claim.status}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Details & Documents */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
          <div className="bg-white border-b border-slate-200 px-4 flex gap-6 shrink-0">
            <TabButton active={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} icon={Activity} label="Clinical Details" />
            <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={FileText} label="Documents" />
            <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} icon={Clock} label="Timeline" />
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {activeTab === 'clinical' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Patient & Admission */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={18} className="text-slate-500" />
                    Patient & Admission Details
                  </div>
                  <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-6">
                    <DetailItem label="Age / Gender" value={`${claim.formData?.pt_age || 'N/A'} / ${claim.formData?.pt_gender || 'N/A'}`} />
                    <DetailItem label="Date of Admission" value={claim.formData?.adm_date || 'N/A'} />
                    <DetailItem label="Expected Stay" value={`${claim.formData?.adm_stay_days || 'N/A'} Days`} />
                    <DetailItem label="Room Category" value={claim.formData?.adm_room_type || 'N/A'} />
                    <DetailItem label="Treating Doctor" value={claim.formData?.dr_name || 'N/A'} />
                    <DetailItem label="Doctor Reg No." value={claim.formData?.dec_reg_no || 'N/A'} />
                  </div>
                </div>

                {/* Clinical Details */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800 flex items-center gap-2">
                    <Stethoscope size={18} className="text-slate-500" />
                    Clinical Details
                  </div>
                  <div className="p-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DetailItem label="Provisional Diagnosis" value={claim.diagnosis} />
                      <DetailItem label="ICD Code" value={claim.formData?.m_icd_code || 'N/A'} />
                      <DetailItem label="Proposed Treatment" value={claim.formData?.m_treatment_type || 'N/A'} />
                      <DetailItem label="Procedure Code (CPT)" value={claim.formData?.m_procedure_code || 'N/A'} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">Clinical Notes / History</div>
                      <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                        {claim.formData?.m_clinical_notes || 'No clinical notes provided.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allDocs.map((doc: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => openDocumentPreview(doc)}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 group hover:border-blue-300 transition-colors cursor-pointer animate-in fade-in duration-300"
                    >
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                        <FileText size={22} className="text-blue-700 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate text-sm">{doc.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">{doc.type}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] font-medium text-slate-400">Uploaded:</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-full font-mono">{formatDateTime(doc.uploadedAt)}</span>
                        </div>
                      </div>
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <Eye size={18} />
                      </button>
                    </div>
                  ))}
                  {isLoadingDocuments && (
                    <div className="col-span-2 text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-3" />
                      <p className="text-sm font-medium text-slate-700">Loading claim documents…</p>
                    </div>
                  )}
                  {!isLoadingDocuments && allDocs.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                      <FileWarning className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p className="text-lg font-medium text-slate-900">No documents uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {claim.history?.map((event, idx) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-slate-900 text-sm">{event.status}</h4>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{formatDate(event.date)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{event.comment || 'Status updated'}</p>
                        
                        {/* Stage Uploaded Documents with direct View button/Eye icon */}
                        {(() => {
                          const eventDocs: any[] = [];
                          if (event.fileData) {
                            eventDocs.push({
                              name: event.fileName || 'Main Document',
                              data: event.fileData,
                              type: event.fileType || 'application/pdf'
                            });
                          }
                          if (event.stageData?.documents && Array.isArray(event.stageData.documents)) {
                            event.stageData.documents.forEach((d: any) => {
                              if (d.data || d.url) {
                                const nameLower = (d.name || '').trim().toLowerCase();
                                const isDup = eventDocs.some(
                                  (existing) => (existing.name || '').trim().toLowerCase() === nameLower
                                );
                                if (!isDup) {
                                  eventDocs.push({
                                    name: d.name || 'Document',
                                    data: d.data || d.url,
                                    type: d.mimeType || d.type || 'application/pdf'
                                  });
                                }
                              }
                            });
                          }
                          
                          if (eventDocs.length === 0) return null;
                          
                          return (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-2 animate-in slide-in-from-top-1 duration-200">
                              {eventDocs.map((doc, dIdx) => (
                                <button
                                  key={dIdx}
                                  onClick={() => setPreviewFile({
                                    name: doc.name,
                                    data: doc.data,
                                    type: doc.type || 'application/pdf'
                                  })}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#000080] text-white hover:bg-blue-900 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm select-none"
                                >
                                  <Eye size={12} className="shrink-0" />
                                  <span>{eventDocs.length > 1 ? `VIEW (${dIdx + 1})` : "VIEW"}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: AI Insights & Action */}
        <div className="w-[400px] bg-white flex flex-col shrink-0 overflow-hidden">
          {/* AI Insights */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-blue-50/30">
            <div className="flex items-center gap-2 text-blue-800 font-black uppercase tracking-tight text-sm mb-2">
              <BrainCircuit size={18} />
              AI Medical Scrutiny
            </div>

            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                <div className="text-xs font-bold text-blue-800 uppercase mb-2">AI Summary</div>
                <p className="text-sm text-slate-700 leading-relaxed">{aiInsights.summary}</p>
              </div>

              {/* Validations */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Diagnosis Validation</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${aiInsights.diagnosisMatch === 'Match' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {aiInsights.diagnosisMatch}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Treatment Justification</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${aiInsights.treatmentJustified === 'Justified' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {aiInsights.treatmentJustified}
                  </span>
                </div>
              </div>

              {/* Red Flags & Missing Docs */}
              {(aiInsights.redFlags.length > 0 || aiInsights.missingDocs.length > 0) && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3">
                  {aiInsights.redFlags.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-red-800 uppercase flex items-center gap-1.5 mb-2">
                        <AlertTriangle size={14} /> Red Flags Detected
                      </div>
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {aiInsights.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiInsights.missingDocs.length > 0 && (
                    <div className={aiInsights.redFlags.length > 0 ? 'pt-3 border-t border-red-200/50' : ''}>
                      <div className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1.5 mb-2">
                        <FileWarning size={14} /> Missing Documents
                      </div>
                      <ul className="list-disc list-inside text-sm text-orange-700 space-y-1">
                        {aiInsights.missingDocs.map((doc, i) => <li key={i}>{doc}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Suggested Decision */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl text-white shadow-md">
                <div className="text-xs font-bold text-slate-300 uppercase mb-1">AI Suggested Decision</div>
                <div className="flex items-center gap-2">
                  {aiInsights.suggestedDecision === 'Approve' ? <CheckCircle2 className="text-green-400" /> : 
                   aiInsights.suggestedDecision === 'Query' ? <AlertCircle className="text-yellow-400" /> : 
                   <XCircle className="text-red-400" />}
                  <span className="text-lg font-black">{aiInsights.suggestedDecision}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="p-5 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Medical Decision</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setDecision('approve')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${decision === 'approve' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50/50'}`}
                >
                  <CheckCircle2 size={16} /> Approve
                </button>
                <button 
                  onClick={() => setDecision('query')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${decision === 'query' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-slate-200 text-slate-600 hover:border-yellow-200 hover:bg-yellow-50/50'}`}
                >
                  <AlertCircle size={16} /> Query
                </button>
                <button 
                  onClick={() => setDecision('reject')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${decision === 'reject' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50/50'}`}
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>

              {decision === 'query' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <select 
                    value={queryTemplate}
                    onChange={(e) => {
                      setQueryTemplate(e.target.value);
                      if (e.target.value) setRemarks(e.target.value);
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  >
                    <option value="">Select Query Template...</option>
                    <option value="Please provide detailed discharge summary with line of treatment.">Missing detailed discharge summary</option>
                    <option value="Justification required for higher room category.">Room category justification</option>
                    <option value="Provide exact ICD/CPT codes for the procedure.">Missing ICD/CPT codes</option>
                    <option value="Mismatch in diagnosis and proposed treatment. Please clarify.">Diagnosis/Treatment mismatch</option>
                  </select>
                </div>
              )}

              <textarea
                placeholder="Add clinical remarks or medical justification..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
              />

              <button 
                onClick={handleSubmitDecision}
                disabled={!decision || isSubmittingRPA}
                className={`w-full py-4 text-white rounded-xl font-bold transition-all mt-4 relative overflow-hidden flex items-center justify-center gap-2
                  ${!decision || isSubmittingRPA 
                    ? 'bg-slate-300 cursor-not-allowed opacity-80 pointer-events-none' 
                    : 'bg-[#000080] hover:bg-blue-800 shadow-lg shadow-blue-100 hover:shadow-blue-200 active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer'}`}
              >
                {isSubmittingRPA ? (
                  <Loader2 className="animate-spin pointer-events-none" size={20} />
                ) : (
                  <span className="pointer-events-none">Submit Decision</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 flex flex-col items-center p-4 md:p-8 backdrop-blur-md"
          >
            <div className="w-full max-w-6xl flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <FileText className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{previewFile.name}</h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Document Preview</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="w-full max-w-6xl flex-1 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
              {previewFile.type?.startsWith('image/') ? (
                <img 
                  src={(previewFile.data.startsWith('data:') || previewFile.data.startsWith('http')) ? previewFile.data : `data:${previewFile.type};base64,${previewFile.data}`} 
                  className="w-full h-full object-contain" 
                  alt="Preview" 
                />
              ) : (
                <iframe 
                  src={(previewFile.data.startsWith('data:') || previewFile.data.startsWith('http')) ? previewFile.data : `data:application/pdf;base64,${previewFile.data}`} 
                  className="w-full h-full" 
                  title="Preview"
                ></iframe>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
        active 
          ? 'border-blue-600 text-blue-700 font-bold' 
          : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'
      }`}
    >
      <Icon size={16} />
      <span className="text-sm">{label}</span>
    </button>
  );
}

function PerformanceMetric({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function OutcomeBar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-900">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, label, value, desc, color }: { icon: any, label: string, value: string, desc: string, color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
  };
  return (
    <div className={`p-4 rounded-xl border flex items-start gap-4 ${colors[color]}`}>
      <div className="p-2 bg-white rounded-lg shadow-sm">
        <Icon size={18} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black">{value}</span>
          <span className="text-xs font-bold opacity-80">{label}</span>
        </div>
        <p className="text-[11px] font-medium opacity-70 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
