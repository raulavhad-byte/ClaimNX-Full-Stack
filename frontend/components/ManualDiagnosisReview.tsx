
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, XCircle, Clock, Search, Filter, 
  ChevronRight, ArrowLeft, Loader2, AlertCircle,
  Database, User, Hospital, Plus, Upload, Download,
  Edit2, Trash2, Save, X, FileSpreadsheet, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { dualStorageService } from '../services/dualStorageService';
import { ManualDiagnosis, MasterDiagnosis, HospitalUser } from '../types';
import { formatDate } from '../utils';
import { toast } from 'sonner';

interface Props {
  currentUser?: HospitalUser;
}

const ManualDiagnosisReview: React.FC<Props> = ({ currentUser }) => {
  // Master List State
  const [masterList, setMasterList] = useState<MasterDiagnosis[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof MasterDiagnosis, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDiagnosis, setEditingDiagnosis] = useState<MasterDiagnosis | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);
  const [bulkUploadSuccess, setBulkUploadSuccess] = useState<number>(0);
  const [bulkUploadDuplicates, setBulkUploadDuplicates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    description: ''
  });

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  useEffect(() => {
    fetchMasterList();
  }, []);

  const fetchMasterList = async () => {
    setMasterLoading(true);
    try {
      const data = await dualStorageService.getAll('masterDiagnoses');
      setMasterList(data);
    } catch (err: any) {
      console.error("Error fetching master list:", err);
      setError("Failed to load master diagnosis list.");
    } finally {
      setMasterLoading(false);
    }
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setMasterLoading(true);
    try {
      const standardizedName = formData.name.trim().toUpperCase();
      
      const diagnosisData = {
        ...formData,
        name: standardizedName,
        addedBy: currentUser?.id || 'system',
        addedByName: currentUser?.displayName || 'System',
        modifiedBy: currentUser?.id || 'system',
        modifiedByName: currentUser?.displayName || 'System',
      };

      if (editingDiagnosis) {
        await dualStorageService.save('masterDiagnoses', { ...formData, name: standardizedName, modifiedBy: currentUser?.id || 'system' }, editingDiagnosis.id);
      } else {
        // Check for duplicates
        const exists = masterList.some(d => d.name.toUpperCase() === standardizedName);
        if (exists) {
          toast.error("A diagnosis with this name already exists in the master list.");
          setMasterLoading(false);
          return;
        }
        await dualStorageService.save('masterDiagnoses', diagnosisData);
      }
      
      setShowAddModal(false);
      setEditingDiagnosis(null);
      setFormData({ name: '', code: '', category: '', description: '' });
      fetchMasterList();
    } catch (error) {
      console.error("Error saving master diagnosis:", error);
    } finally {
      setMasterLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    setBulkUploadError(null);
    setBulkUploadSuccess(0);
    setBulkUploadDuplicates([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const validDiagnoses = data
          .filter(row => row.Name || row.name || row.Diagnosis || row.diagnosis)
          .map(row => ({
            name: (row.Name || row.name || row.Diagnosis || row.diagnosis).trim().toUpperCase(),
            code: row.Code || row.code || row.ICD || row.icd || '',
            category: row.Category || row.category || '',
            description: row.Description || row.description || '',
            addedBy: currentUser?.id || 'system',
            addedByName: currentUser?.displayName || 'System',
            modifiedBy: currentUser?.id || 'system',
            modifiedByName: currentUser?.displayName || 'System',
          }));

        if (validDiagnoses.length === 0) {
          setBulkUploadError("No valid diagnosis data found in the Excel file. Please ensure you have a 'Name' or 'Diagnosis' column.");
          setIsBulkUploading(false);
          return;
        }

        let addedCount = 0;
        const duplicates: string[] = [];
        for (const item of validDiagnoses) {
          const exists = masterList.some(d => d.name.toUpperCase() === item.name);
          if (exists) {
            duplicates.push(item.name);
          } else {
            await dualStorageService.save('masterDiagnoses', item);
            addedCount++;
          }
        }

        setBulkUploadSuccess(addedCount);
        setBulkUploadDuplicates(duplicates);
        fetchMasterList();
      } catch (error) {
        console.error("Bulk upload error:", error);
        setBulkUploadError("Failed to process Excel file. Please ensure it follows the correct format.");
      } finally {
        setIsBulkUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSort = (key: keyof MasterDiagnosis) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredMaster = masterList
    .filter(d => 
      d.name.toLowerCase().includes(masterSearch.toLowerCase()) || 
      d.code?.toLowerCase().includes(masterSearch.toLowerCase()) ||
      d.category?.toLowerCase().includes(masterSearch.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in duration-500 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Database size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Diagnosis Master List</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Medical Registry & Standard Terminologies</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center text-rose-600 animate-in slide-in-from-top-4">
          <AlertCircle className="mr-4 shrink-0" size={24} />
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1">System Error</p>
            <p className="text-sm font-bold">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto p-2 hover:bg-rose-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search master diagnosis list..." 
            value={masterSearch}
            onChange={(e) => setMasterSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all"
          />
        </div>
        
        {isSuperAdmin && (
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleBulkUpload} 
              accept=".xlsx, .xls" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isBulkUploading}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
            >
              {isBulkUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Bulk Upload
            </button>
            <button
              onClick={() => {
                setEditingDiagnosis(null);
                setFormData({ name: '', code: '', category: '', description: '' });
                setShowAddModal(true);
              }}
              className="px-6 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-amber-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={14} />
              Add Diagnosis
            </button>
          </div>
        )}
      </div>

      {bulkUploadError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in slide-in-from-top-2">
          <AlertCircle size={18} />
          <p className="text-[10px] font-black uppercase tracking-widest">{bulkUploadError}</p>
        </div>
      )}

      {bulkUploadSuccess > 0 && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col gap-2 text-emerald-600 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle size={18} />
            <p className="text-[10px] font-black uppercase tracking-widest">Successfully uploaded {bulkUploadSuccess} new diagnoses!</p>
            <button onClick={() => setBulkUploadSuccess(0)} className="ml-auto text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
          </div>
          {bulkUploadDuplicates.length > 0 && (
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest ml-7">
              Note: {bulkUploadDuplicates.length} duplicates were skipped.
            </p>
          )}
        </div>
      )}

      {masterLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 size={40} className="animate-spin text-amber-600" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading master list...</p>
        </div>
      ) : filteredMaster.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
          <AlertCircle size={40} className="text-slate-300" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No diagnoses found in master list</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:text-amber-600 transition-colors"
                  onClick={() => handleSort('code')}
                >
                  Code {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:text-amber-600 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Diagnosis Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:text-amber-600 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:text-amber-600 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  Audit Info {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                {isSuperAdmin && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMaster.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest">
                      {d.code || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{d.name}</p>
                    {d.description && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{d.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {d.category || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                        <Plus size={10} className="mr-1" /> {d.addedByName || 'System'} • {formatDate(d.createdAt)}
                      </p>
                      {d.modifiedByName && (
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center">
                          <Edit2 size={10} className="mr-1" /> {d.modifiedByName} • {formatDate(d.updatedAt)}
                        </p>
                      )}
                    </div>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingDiagnosis(d);
                          setFormData({
                            name: d.name,
                            code: d.code || '',
                            category: d.category || '',
                            description: d.description || ''
                          });
                          setShowAddModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  {editingDiagnosis ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {editingDiagnosis ? 'Edit Diagnosis' : 'Add New Diagnosis'}
                  </h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Master List Management</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveMaster} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Diagnosis Name *</label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. ACUTE APPENDICITIS"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-400 transition-all uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">ICD/Internal Code</label>
                  <input 
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    placeholder="e.g. K35.8"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-400 transition-all uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-400 transition-all"
                  >
                    <option value="">Select Category</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Medical">Medical</option>
                    <option value="Critical Care">Critical Care</option>
                    <option value="Maternity">Maternity</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief details about the diagnosis..."
                    rows={3}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-400 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={masterLoading}
                  className="flex-[2] py-4 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {masterLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingDiagnosis ? 'Update Diagnosis' : 'Save Diagnosis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualDiagnosisReview;
