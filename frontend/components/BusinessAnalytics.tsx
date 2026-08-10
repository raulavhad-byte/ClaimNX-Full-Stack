
import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Users, MapPin, Activity, Wallet, 
  ArrowUpRight, Search, Building, Navigation, BarChart3,
  LayoutGrid, Globe2, LogIn, AlertCircle, Plus, Minus, Maximize,
  ChevronRight, ChevronDown, Map, List
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { HospitalUser, Claim } from '../types';

import ExecutiveDashboard from './ExecutiveDashboard';

interface BusinessAnalyticsProps {
  hospitals: HospitalUser[];
  claims: Claim[];
  onSwitchHospital: (hospital: HospitalUser) => void;
  permissions: string[];
}

type ViewType = 'Executive' | 'Network';

// Hierarchical Hospital List Component
const HospitalHierarchy = ({ hospitals, claims, onSwitchHospital }: { hospitals: HospitalUser[], claims: Claim[], onSwitchHospital: (h: HospitalUser) => void }) => {
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});

  const toggleZone = (zone: string) => setExpandedZones(prev => ({ ...prev, [zone]: !prev[zone] }));
  const toggleState = (state: string) => setExpandedStates(prev => ({ ...prev, [state]: !prev[state] }));
  const toggleCity = (city: string) => setExpandedCities(prev => ({ ...prev, [city]: !prev[city] }));

  const data = useMemo(() => {
    const zones: Record<string, any> = {};
    
    hospitals.forEach(h => {
      const zone = h.zone || 'Unassigned';
      const state = h.state || 'Unassigned';
      const city = h.district || 'Unassigned';
      
      if (!zones[zone]) zones[zone] = { name: zone, states: {}, count: 0 };
      if (!zones[zone].states[state]) zones[zone].states[state] = { name: state, cities: {}, count: 0 };
      if (!zones[zone].states[state].cities[city]) zones[zone].states[state].cities[city] = { name: city, hospitals: [], count: 0 };
      
      const hospitalCaseCount = claims.filter(c => c.hospitalId === h.id).length;
      
      zones[zone].states[state].cities[city].hospitals.push({ ...h, caseCount: hospitalCaseCount });
      zones[zone].states[state].cities[city].count++;
      zones[zone].states[state].count++;
      zones[zone].count++;
    });
    
    return zones;
  }, [hospitals, claims]);

  return (
    <div className="space-y-4">
      {Object.values(data).sort((a, b) => b.count - a.count).map((zone: any) => (
        <div key={zone.name} className="border border-slate-700/50 rounded-2xl bg-slate-800/20 overflow-hidden">
          <button 
            onClick={() => toggleZone(zone.name)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Globe2 size={18} />
              </div>
              <div className="text-left">
                <span className="text-sm font-black uppercase tracking-widest text-slate-100">{zone.name}</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{zone.count} Hospitals across {Object.keys(zone.states).length} States</p>
              </div>
            </div>
            {expandedZones[zone.name] ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
          </button>

          {expandedZones[zone.name] && (
            <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
              {Object.values(zone.states).sort((a: any, b: any) => b.count - a.count).map((state: any) => (
                <div key={state.name} className="bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <button 
                    onClick={() => toggleState(`${zone.name}-${state.name}`)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-700/20 transition-all text-slate-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                        <Map size={14} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wide">{state.name}</span>
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full text-[9px] font-bold">{state.count}</span>
                    </div>
                    {expandedStates[`${zone.name}-${state.name}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {expandedStates[`${zone.name}-${state.name}`] && (
                    <div className="px-3 pb-3 space-y-2">
                      {Object.values(state.cities).sort((a: any, b: any) => b.count - a.count).map((city: any) => (
                        <div key={city.name} className="bg-slate-900/40 rounded-lg">
                          <button 
                            onClick={() => toggleCity(`${zone.name}-${state.name}-${city.name}`)}
                            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/40 transition-all text-slate-400"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-slate-500" />
                              <span className="text-[11px] font-black uppercase tracking-tight">{city.name}</span>
                              <span className="text-[10px] text-slate-600">({city.count})</span>
                            </div>
                            {expandedCities[`${zone.name}-${state.name}-${city.name}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>

                          {expandedCities[`${zone.name}-${state.name}-${city.name}`] && (
                            <div className="p-2 space-y-1">
                              {city.hospitals.map((h: any) => (
                                <div key={h.id} className="flex items-center justify-between px-3 py-2 hover:bg-emerald-500/5 rounded-lg group transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <div>
                                      <p className="text-[11px] font-bold text-slate-200 uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{h.hospitalName}</p>
                                      <p className="text-[9px] font-medium text-slate-500">ID: {h.id} • {h.address}</p>
                                    </div>
                                  </div>
                                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-black tabular-nums">
                                    {h.caseCount} Case{h.caseCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const BusinessAnalytics: React.FC<BusinessAnalyticsProps> = ({ hospitals, claims, onSwitchHospital, permissions }) => {
  const hasCeoSuite = permissions.includes('all') || permissions.includes('sidebar_admin:sections:ceo_suite') || permissions.includes('administration:analytics:ceo_suite');
  const hasCooHub = permissions.includes('all') || permissions.includes('sidebar_admin:sections:coo_hub') || permissions.includes('administration:analytics:coo_hub');
  const hasAdminAnalytics = permissions.includes('all') || permissions.includes('sidebar_admin:sections:analytics') || permissions.includes('administration:analytics:view');

  const [view, setView] = useState<ViewType>(() => {
    if (hasCeoSuite || hasCooHub) return 'Executive';
    return 'Network';
  });

  // Mock Data for the Missing Analysis Chart
  const trendData = [
     { name: 'Jan', claims: 450, revenue: 12000000 },
     { name: 'Feb', claims: 520, revenue: 15000000 },
     { name: 'Mar', claims: 480, revenue: 13500000 },
     { name: 'Apr', claims: 610, revenue: 18000000 },
     { name: 'May', claims: 750, revenue: 22000000 },
     { name: 'Jun', claims: 820, revenue: 25000000 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Enterprise Intelligence</h1>
          <p className="text-slate-500 text-sm font-medium">Pan-India Operations & Hospital Network Performance</p>
        </div>
        {(hasCeoSuite || hasCooHub) && hasAdminAnalytics && (
          <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200">
             <button 
               onClick={() => setView('Executive')}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'Executive' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
             >
               Strategic Suite
             </button>
             <button 
               onClick={() => setView('Network')}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'Network' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
             >
               Network Hierarchy
             </button>
          </div>
        )}
      </div>

      {view === 'Executive' ? (
        <ExecutiveDashboard 
          claims={claims} 
          hospitals={hospitals} 
          permissions={permissions}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
              
              {/* 1. KEY METRICS ON TOP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                   { label: 'Total Claims Processed', value: '12,450', trend: '+18%', color: 'blue' },
                   { label: 'Revenue Realized', value: '₹45.2 Cr', trend: '+24%', color: 'emerald' },
                   { label: 'Avg Turnaround', value: '1.8 Days', trend: '-12%', color: 'indigo' }
                ].map((stat, i) => (
                   <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                      <h4 className={`text-2xl font-black text-${stat.color}-600`}>{stat.value}</h4>
                      <div className="flex items-center mt-2 text-[10px] font-bold text-slate-500">
                         <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded mr-2">{stat.trend}</span> vs last month
                      </div>
                   </div>
                ))}
              </div>
             
             {/* 2. REVENUE GROWTH CHART IN MIDDLE */}
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Revenue Growth Trajectory</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Revenue vs Claim Volume</p>
                    </div>
                </div>
                <div className="h-[250px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                         <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                               <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                         <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(v) => `₹${(v/1000000).toFixed(0)}M`} />
                         <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            formatter={(value: any, name: any) => [name === 'revenue' ? `₹${(value/100000).toFixed(2)}L` : value, name === 'revenue' ? 'Revenue' : 'Claims']}
                         />
                         <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#colorRev)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>

          </div>

          <div className="lg:col-span-12 space-y-6">
              <div className="bg-[#000033] p-10 rounded-[3rem] border border-blue-900/50 shadow-2xl flex flex-col h-full ring-1 ring-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                  
                  <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-8 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                          <Navigation size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-wider">Regional Operations Hierarchy</h3>
                          <p className="text-[10px] font-bold text-blue-300/60 uppercase tracking-[0.3em]">Territory Management & Operations Control</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">{hospitals.length}</span>
                        <span className="text-xl font-black text-blue-400/40 uppercase tracking-widest">Hospitals</span>
                      </div>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mt-2">Active Strategic Nodes</span>
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    <HospitalHierarchy 
                      hospitals={hospitals} 
                      claims={claims} 
                      onSwitchHospital={onSwitchHospital} 
                    />
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessAnalytics;
