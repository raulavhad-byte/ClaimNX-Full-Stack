
import React, { useState } from 'react';
import { 
  Key, Plus, Edit2, Trash2, Search, Filter, 
  ShieldCheck, CheckCircle2, Lock, Tag, 
  Settings2, ChevronRight, X, Save
} from 'lucide-react';

interface PrivilegeMaster {
  id: string;
  key: string;
  label: string;
  category: string;
  description: string;
  status: 'Active' | 'Beta';
}

const ManagePrivileges: React.FC = () => {
  const [privileges, setPrivileges] = useState<PrivilegeMaster[]>([
    { id: '1', key: 'view_claims', label: 'View Claims', category: 'Claims', description: 'Allows viewing of insurance claim records.', status: 'Active' },
    { id: '2', key: 'edit_claims', label: 'Edit Claims', category: 'Claims', description: 'Allows editing and updating of claim data.', status: 'Active' },
    { id: '3', key: 'access_mis', label: 'Access MIS', category: 'Super Admin', description: 'Access to management information system reports.', status: 'Active' },
    { id: '4', key: 'manage_users', label: 'Manage Users', category: 'Super Admin', description: 'Create and disable hospital user accounts.', status: 'Active' },
    { id: '7', key: 'system_logic', label: 'Logic Config', category: 'Development', description: 'Configure AI and validation logic.', status: 'Beta' },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPrivilege, setNewPrivilege] = useState<Partial<PrivilegeMaster>>({
    category: 'Claims',
    status: 'Active'
  });

  const handleAdd = () => {
    if (!newPrivilege.label || !newPrivilege.key) return;
    const p: PrivilegeMaster = {
      id: Date.now().toString(),
      key: newPrivilege.key,
      label: newPrivilege.label,
      category: newPrivilege.category || 'General',
      description: newPrivilege.description || '',
      status: (newPrivilege.status as any) || 'Active'
    };
    setPrivileges([...privileges, p]);
    setIsAddModalOpen(false);
    setNewPrivilege({ category: 'Claims', status: 'Active' });
  };

  const deletePrivilege = (id: string) => {
    if (confirm('Deleting a privilege will remove it from all assigned roles. Proceed?')) {
      setPrivileges(privileges.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manage Privileges</h1>
          <p className="text-slate-500">Registry of all access keys available within the hospital portal.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center shadow-lg active:scale-95 transition-all hover:bg-black"
        >
          <Plus size={18} className="mr-2" /> Define New Privilege
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search privileges..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
             <button className="p-2 text-slate-400 hover:text-blue-600 rounded-lg border border-slate-100"><Filter size={18} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Privilege Label</th>
                <th className="px-6 py-4">System Key</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {privileges.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Key size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{p.label}</p>
                        <p className="text-[10px] text-slate-400 max-w-[200px] truncate">{p.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">{p.key}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center text-xs font-semibold text-slate-500">
                      <Tag size={12} className="mr-1.5 opacity-40" /> {p.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'Beta' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => deletePrivilege(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">New Privilege</h2>
                  <p className="text-xs text-slate-400">Define a new permission key</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Display Label</label>
                <input 
                  type="text" 
                  placeholder="e.g. Delete Claims"
                  value={newPrivilege.label || ''}
                  onChange={e => setNewPrivilege({...newPrivilege, label: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Key (Snake Case)</label>
                <input 
                  type="text" 
                  placeholder="e.g. delete_claims"
                  value={newPrivilege.key || ''}
                  onChange={e => setNewPrivilege({...newPrivilege, key: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                  <select 
                    value={newPrivilege.category}
                    onChange={e => setNewPrivilege({...newPrivilege, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Claims">Claims</option>
                    <option value="Medical">Medical</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Development">Development</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Release Status</label>
                  <select 
                    value={newPrivilege.status}
                    onChange={e => setNewPrivilege({...newPrivilege, status: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Beta">Beta / Testing</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                <textarea 
                  value={newPrivilege.description || ''}
                  onChange={e => setNewPrivilege({...newPrivilege, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-20 outline-none"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex space-x-3">
              <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black flex items-center justify-center">
                <Save size={18} className="mr-2" /> Save Privilege
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePrivileges;
