
import React, { useState, useMemo } from 'react';
import { formatDate, formatDateTime } from '../utils';
import { Claim, ClaimStatus, ClaimStage, HospitalUser, FormField } from '../types';
import { 
  Search, Filter, Trash2, Edit2, 
  ChevronRight, Clock, ShieldCheck, Activity,
  AlertTriangle, PlayCircle, MoreVertical,
  X, Save, Info, History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { claimsApi } from '../services/api';
import { toast } from 'sonner';

import SuperAdminClaimEditor from './SuperAdminClaimEditor';

interface AdminClaimsListProps {
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  stages: ClaimStage[];
  fields: FormField[];
  hospitalUser: HospitalUser;
}

const AdminClaimsList: React.FC<AdminClaimsListProps> = ({ 
  claims, 
  setClaims, 
  stages,
  fields,
  hospitalUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const isSuperAdmin = hospitalUser.role === 'Super Admin';

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const matchesSearch = c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (c.formData?.insurer_claim_no || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchTerm, statusFilter]);

  const handleDeleteClick = (id: string) => {
    if (!isSuperAdmin) return;
    setClaimToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (claimToDelete) {
      try {
        await claimsApi.delete(claimToDelete);
        setClaims(prev => prev.filter(c => c.id !== claimToDelete));
        toast.success("Claim deleted successfully");
      } catch (err: any) {
        toast.error("Failed to delete claim: " + err.message);
      } finally {
        setIsDeleteModalOpen(false);
        setClaimToDelete(null);
      }
    }
  };

  const handlePurgeAllClaims = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL claims across all products? This action cannot be undone.")) {
      return;
    }
    
    setIsDeletingAll(true);
    try {
      await claimsApi.deleteAll();
      setClaims([]);
      toast.success("All dummy claims removed successfully from all products");
    } catch (err: any) {
      toast.error("Failed to remove claims: " + err.message);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleSaveClaimEdit = () => {
    if (!editingClaim || !isSuperAdmin) return;
    setClaims(prev => prev.map(c => c.id === editingClaim.id ? editingClaim : c));
    setIsEditModalOpen(false);
    setEditingClaim(null);
  };

  const getStatusStyle = (status: string) => {
    if (status.includes('Approved')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (status.includes('Rejected')) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (status.includes('Initiated') || status.includes('Pending')) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (status.includes('Settlement') || status === 'Settled') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search all claims..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" 
          />
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 outline-none focus:ring-4 focus:ring-blue-50"
          >
            <option value="All">All Statuses</option>
            {Object.values(ClaimStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {isSuperAdmin && (
            <button
              onClick={handlePurgeAllClaims}
              disabled={isDeletingAll || claims.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-rose-650 hover:bg-rose-700 disabled:bg-rose-100 disabled:text-rose-400 text-white rounded-2xl text-xs font-bold transition-all shadow-sm shadow-rose-100 cursor-pointer"
            >
              {isDeletingAll ? 'Purging...' : 'Purge All Claims'}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-[2rem]">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Patient / Hospital</th>
              <th className="px-6 py-4">Insurer / TPA</th>
              <th className="px-6 py-4">Current Status</th>
              <th className="px-6 py-4">Admission Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClaims.map(claim => (
              <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                         <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{claim.patientName}</span>
                         <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200">
                            {claim.formData?.hosp_name || claim.formData?.hospitalName || 'Unknown'}
                         </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-600 uppercase">{claim.insuranceProvider}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{claim.formData?.tpa_provider || 'Direct'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tight ${getStatusStyle(claim.status)}`}>
                    {claim.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                  {formatDate(claim.admissionDate)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <Link 
                      to={`/process-claim/${claim.id}?source=admin`} 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Journey"
                    >
                      <PlayCircle size={18} />
                    </Link>
                    {isSuperAdmin && (
                      <>
                        <button 
                          onClick={() => { setEditingClaim(claim); setIsEditModalOpen(true); }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Modify Details"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(claim.id)}
                          className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Claim"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredClaims.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest italic">No claims found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Confirm Deletion</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">This action is permanent</p>
              </div>
              <p className="text-sm font-medium text-slate-600">
                Are you sure you want to delete this claim? All associated records and history will be permanently removed from the system.
              </p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-xl"
              >
                Delete Permanently
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPER ADMIN EDIT VIEW */}
      {isEditModalOpen && editingClaim && (
        <SuperAdminClaimEditor 
          claim={editingClaim}
          onSave={(updatedClaim) => {
            setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));
            setIsEditModalOpen(false);
            setEditingClaim(null);
          }}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingClaim(null);
          }}
          stages={stages}
          fields={fields}
          currentUser={hospitalUser}
        />
      )}
    </div>
  );
};

export default AdminClaimsList;
