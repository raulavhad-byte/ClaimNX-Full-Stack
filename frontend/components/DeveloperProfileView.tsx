
import React, { useState } from 'react';
import { DeveloperProfile } from '../types';
import { Code, Server, Terminal, Save, CheckCircle, Github, Cpu, Layers } from 'lucide-react';

interface DeveloperProfileViewProps {
  profile: DeveloperProfile;
  onUpdate: (p: DeveloperProfile) => void;
}

const DeveloperProfileView: React.FC<DeveloperProfileViewProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState<DeveloperProfile>({ ...profile });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Portal Development Profile</h1>
          <p className="text-slate-500">Manage developer identity and portal-level configurations.</p>
        </div>
        {saved && (
          <div className="flex items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 animate-in zoom-in">
            <CheckCircle size={16} className="mr-2" />
            <span className="text-sm font-bold">Changes Saved</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Developer Name</label>
                <div className="relative">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Email</label>
                <input 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal Version</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    value={formData.version}
                    onChange={e => setFormData({...formData, version: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Role</label>
                <input 
                  readOnly
                  value={formData.role}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm"
                />
              </div>
            </div>
            <button className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold flex items-center justify-center shadow-xl active:scale-95 transition-all">
              <Save size={18} className="mr-2" /> Update Dev Profile
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-6">
           <div className="bg-slate-900 p-6 rounded-3xl text-white relative overflow-hidden">
             <Code size={100} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
             <h4 className="font-bold text-lg mb-4 flex items-center"><Cpu size={20} className="mr-2 text-blue-400" /> Platform Core</h4>
             <div className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-400">Environment</span>
                 <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Production</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-400">API Health</span>
                 <span className="text-emerald-400 font-bold">99.9%</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-400">Extraction Engine</span>
                 <span className="text-blue-400 font-bold">Gemini 3 Flash</span>
               </div>
             </div>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <h4 className="font-bold text-slate-800 text-sm mb-4">Development Logs</h4>
             <div className="space-y-4">
               <div className="border-l-2 border-blue-500 pl-4 py-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">May 24, 2024</p>
                 <p className="text-xs font-semibold text-slate-700">Separated Portal Admin from Institutional Profile.</p>
               </div>
               <div className="border-l-2 border-slate-200 pl-4 py-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">May 22, 2024</p>
                 <p className="text-xs font-semibold text-slate-700">Updated IRDAI Part C Form Logic.</p>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperProfileView;
