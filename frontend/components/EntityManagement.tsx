import React, { useState } from 'react';
import { Trash2, Edit2, User, Building, Briefcase } from 'lucide-react';
import { HospitalUser } from '../types';

interface EntityManagementProps {
  users: HospitalUser[];
  setUsers: React.Dispatch<React.SetStateAction<HospitalUser[]>>;
  hospitals: any[];
  setHospitals: React.Dispatch<React.SetStateAction<any[]>>;
  currentUser: HospitalUser | null;
}

const EntityManagement: React.FC<EntityManagementProps> = ({ users, setUsers, hospitals, setHospitals, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'User' | 'Partner' | 'Hospital'>('User');

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const handleDelete = (type: 'User' | 'Partner' | 'Hospital', id: string) => {
    if (!isSuperAdmin) return;
    if (type === 'User') {
      setUsers(users.filter(u => u.id !== id));
    } else {
      setHospitals(hospitals.filter(h => h.id !== id));
    }
  };

  const renderList = () => {
    if (activeTab === 'User') {
      return (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase">Name</th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase">Role</th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
              {isSuperAdmin && <th className="pb-4 text-[10px] font-black text-slate-400 uppercase text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-slate-50">
                <td className="py-4 text-xs font-bold text-slate-700">{user.displayName}</td>
                <td className="py-4 text-xs font-bold text-slate-500">{user.role}</td>
                <td className="py-4 text-xs font-bold text-slate-500">{user.status}</td>
                {isSuperAdmin && (
                  <td className="py-4 text-right">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete('User', user.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else {
      const data = activeTab === 'Hospital' ? hospitals.filter(h => h.entityType === 'Hospital') : hospitals.filter(h => h.entityType === 'Partner');
      return (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase">Name</th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase">Location</th>
              {isSuperAdmin && <th className="pb-4 text-[10px] font-black text-slate-400 uppercase text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id} className="border-b border-slate-50">
                <td className="py-4 text-xs font-bold text-slate-700">{item.name}</td>
                <td className="py-4 text-xs font-bold text-slate-500">{item.district}, {item.state}</td>
                {isSuperAdmin && (
                  <td className="py-4 text-right">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(activeTab, item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
      <div className="flex space-x-4 mb-6">
        {(['User', 'Partner', 'Hospital'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? 'bg-[#000080] text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {tab}s
          </button>
        ))}
      </div>
      {renderList()}
    </div>
  );
};

export default EntityManagement;
