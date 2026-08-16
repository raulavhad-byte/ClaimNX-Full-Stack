import React, { useState } from 'react';
import { INTEGRATIONS } from '../constants';
import { ApiDocs } from './ApiDocs';
import { AuthConfig } from './AuthConfig';
import { 
  Hospital, 
  ShieldCheck, 
  Landmark, 
  FileText, 
  ChevronRight, 
  Activity,
  Settings2,
  Code2,
  ShieldAlert
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  Hospital: <Hospital size={20} />,
  ShieldCheck: <ShieldCheck size={20} />,
  Landmark: <Landmark size={20} />,
  FileText: <FileText size={20} />
};

export const IntegrationPortal: React.FC = () => {
  const [selectedId, setSelectedId] = useState(() => INTEGRATIONS[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<'docs' | 'auth'>('docs');

  const selectedSystem = INTEGRATIONS.find(s => s?.id === selectedId);

  if (!selectedSystem) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-300 p-4 md:p-8 font-sans flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-400 mb-5"><Code2 size={28} /></div>
        <h1 className="text-xl font-bold text-zinc-100">No integrations configured</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">Integration definitions will appear here once they are configured for this tenant.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
            <Settings2 size={24} className="text-zinc-100" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">System Admin <span className="text-zinc-500 font-medium">/ API Integrations</span></h1>
        </div>
        <p className="text-zinc-500 max-w-2xl">
          Manage and monitor enterprise-grade API connections. Configure authentication, 
          review validation schemas, and access technical documentation for core system integrations.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-2">
          <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4 px-2">Integration Systems</h2>
          {INTEGRATIONS.map((system) => (
            <button
              key={system.id}
              onClick={() => setSelectedId(system.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                selectedId === system.id 
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-lg' 
                  : 'bg-transparent border-transparent hover:bg-zinc-900/50 text-zinc-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedId === system.id ? 'bg-zinc-800' : 'bg-zinc-900/50'}`}>
                  {iconMap[system.icon]}
                </div>
                <span className="text-sm font-semibold">{system.name}</span>
              </div>
              {selectedId === system.id && <ChevronRight size={16} className="text-zinc-600" />}
            </button>
          ))}

          <div className="mt-12 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-500/80 mb-2">
              <ShieldAlert size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">System Health</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">API Uptime</span>
                <span className="text-emerald-500 font-mono">99.98%</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[99.98%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
          {/* System Overview Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-zinc-100">{selectedSystem.name}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase border border-emerald-500/20">Active</span>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-xl">{selectedSystem.description}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
                  <Activity size={14} /> Logs
                </button>
                <button className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
                  <Code2 size={14} /> Test API
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 mb-8">
              <button
                onClick={() => setActiveTab('docs')}
                className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === 'docs' 
                    ? 'border-zinc-100 text-zinc-100' 
                    : 'border-transparent text-zinc-600 hover:text-zinc-400'
                }`}
              >
                API Documentation
              </button>
              <button
                onClick={() => setActiveTab('auth')}
                className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === 'auth' 
                    ? 'border-zinc-100 text-zinc-100' 
                    : 'border-transparent text-zinc-600 hover:text-zinc-400'
                }`}
              >
                Authentication Config
              </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {activeTab === 'docs' ? (
                <ApiDocs endpoints={selectedSystem.endpoints} />
              ) : (
                <AuthConfig method={selectedSystem.authMethod} />
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between px-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            <span>Last Updated: 2026-03-14 05:50 UTC</span>
            <span>API Version: v1.4.2-stable</span>
          </div>
        </div>
      </div>
    </div>
  );
};
