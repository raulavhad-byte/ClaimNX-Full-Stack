import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Phone, Plus, Trash2, Edit2, 
  CheckCircle2, AlertTriangle, Search, Send, X, Building,
  LayoutTemplate, Zap, Smartphone, Settings2, Bell, Share2, Filter, Clock
} from 'lucide-react';
import { ClaimStatus, NotificationTemplate, HospitalNotificationConfig, HospitalUser, Product, StageNotificationConfig } from '../types';
import { toast } from 'sonner';

interface NotificationManagerProps {
  hospitals: HospitalUser[];
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ hospitals }) => {
  const [activeTab, setActiveTab] = useState<'hospitals' | 'templates' | 'centralized'>('centralized');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product>(Product.CPC);
  const [centralizedConfigs, setCentralizedConfigs] = useState<Record<string, StageNotificationConfig[]>>(() => {
    const initial: Record<string, StageNotificationConfig[]> = {};
    Object.values(Product).forEach(p => {
      initial[p] = Object.values(ClaimStatus).map(s => ({
         stage: s,
         enabled: false,
         whatsappTemplateId: '',
         smsTemplateId: ''
      }));
    });
    return initial;
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedHospitalForConfig, setSelectedHospitalForConfig] = useState<HospitalUser | null>(null);

  // Mock Templates
  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: 'temp-1',
      name: 'Standard Admission Alert',
      type: 'WhatsApp',
      content: 'Hello {{patientName}}, your claim at {{hospitalName}} has been initiated. Status: {{claimStatus}}',
      placeholders: ['patientName', 'hospitalName', 'claimStatus'],
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'temp-2',
      name: 'Pre-Auth Approval Notification',
      type: 'SMS',
      content: 'Your Pre-Auth for {{claimId}} has been approved for amount {{approvedAmount}}.',
      placeholders: ['claimId', 'approvedAmount'],
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);

  // Mock Configs
  const [hospitalConfigs, setHospitalConfigs] = useState<HospitalNotificationConfig[]>([]);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => 
      h.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [hospitals, searchTerm]);

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    if (templates.find(t => t.id === editingTemplate.id)) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
      toast.success('Template updated successfully');
    } else {
      setTemplates([...templates, { ...editingTemplate, id: `temp-${Date.now()}` }]);
      toast.success('Template created successfully');
    }
    setShowTemplateModal(false);
  };

  const getHospitalConfig = (hospitalId: string): HospitalNotificationConfig => {
    const existing = hospitalConfigs.find(c => c.hospitalId === hospitalId);
    if (existing) return existing;
    
    // Create default config
    return {
      id: `conf-${Date.now()}`,
      hospitalId,
      hospitalName: hospitals.find(h => h.id === hospitalId)?.hospitalName || 'Unknown',
      whatsappEnabled: false,
      smsEnabled: false,
      stageConfigs: []
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => setActiveTab('centralized')} 
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'centralized' ? 'bg-white text-[#000080] shadow-lg' : 'text-slate-500'}`}
            >
              Centralized
            </button>
            <button 
              onClick={() => setActiveTab('hospitals')} 
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'hospitals' ? 'bg-white text-[#000080] shadow-lg' : 'text-slate-500'}`}
            >
              Hospital Config
            </button>
            <button 
              onClick={() => setActiveTab('templates')} 
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'templates' ? 'bg-white text-[#000080] shadow-lg' : 'text-slate-500'}`}
            >
              Template Engine
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search registry..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none ring-offset-4 focus:ring-4 focus:ring-blue-50 transition-all font-sans" 
              />
            </div>
            {activeTab === 'templates' && (
              <button 
                onClick={() => {
                  setEditingTemplate({
                    id: '',
                    name: '',
                    type: 'WhatsApp',
                    content: '',
                    placeholders: [],
                    status: 'Active',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  setShowTemplateModal(true);
                }}
                className="bg-[#000080] text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                <Plus size={24} />
              </button>
            )}
          </div>
        </div>

        <div className="p-8 font-sans">
          {activeTab === 'centralized' ? (
            <div className="space-y-10">
              <div className="flex flex-wrap gap-3">
                {Object.values(Product).map((product) => (
                  <button
                    key={product}
                    onClick={() => setSelectedProduct(product)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                      selectedProduct === product 
                      ? 'bg-[#000080] text-white border-[#000080]' 
                      : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200 shadow-sm'
                    }`}
                  >
                    {product}
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Master Notification Matrix: {selectedProduct}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure global triggers for all hospitals</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl">
                      <Zap size={14} className="text-amber-500" />
                      <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Global Policy Sync</span>
                    </div>
                 </div>

                 <div className="space-y-3">
                    {centralizedConfigs[selectedProduct].map((stageConfig) => {
                      return (
                        <div key={stageConfig.stage} className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-[#000080]/30 transition-all shadow-sm">
                           <div className="flex items-center gap-4 flex-1">
                              <div className={`w-3 h-3 rounded-full ${stageConfig.enabled ? 'bg-[#000080]' : 'bg-slate-200'}`} />
                              <div>
                                 <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{stageConfig.stage}</p>
                                 <p className="text-[9px] font-bold text-slate-400">Global trigger for all Hospitals on {selectedProduct}</p>
                              </div>
                           </div>

                           <div className="flex items-center gap-8">
                              <div className="flex items-center gap-6">
                                 <div className="flex flex-col gap-1.5">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">WA Master Template</p>
                                    <select 
                                      value={stageConfig.whatsappTemplateId || ''}
                                      onChange={(e) => {
                                        const newConfigs = [...centralizedConfigs[selectedProduct]];
                                        const idx = newConfigs.findIndex(c => c.stage === stageConfig.stage);
                                        newConfigs[idx] = { ...newConfigs[idx], whatsappTemplateId: e.target.value };
                                        setCentralizedConfigs({ ...centralizedConfigs, [selectedProduct]: newConfigs });
                                      }}
                                      disabled={!stageConfig.enabled}
                                      className="bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black p-2 outline-none focus:ring-2 focus:ring-blue-100 min-w-[160px] uppercase disabled:opacity-50"
                                    >
                                       <option value="">No Global Default</option>
                                       {templates.filter(t => t.type === 'WhatsApp').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                 </div>
                                 <div className="flex flex-col gap-1.5">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">SMS Master Template</p>
                                    <select 
                                      value={stageConfig.smsTemplateId || ''}
                                      onChange={(e) => {
                                        const newConfigs = [...centralizedConfigs[selectedProduct]];
                                        const idx = newConfigs.findIndex(c => c.stage === stageConfig.stage);
                                        newConfigs[idx] = { ...newConfigs[idx], smsTemplateId: e.target.value };
                                        setCentralizedConfigs({ ...centralizedConfigs, [selectedProduct]: newConfigs });
                                      }}
                                      disabled={!stageConfig.enabled}
                                      className="bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black p-2 outline-none focus:ring-2 focus:ring-blue-100 min-w-[160px] uppercase disabled:opacity-50"
                                    >
                                       <option value="">No Global Default</option>
                                       {templates.filter(t => t.type === 'SMS').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                 </div>
                              </div>

                              <div className="flex flex-col items-center gap-1.5">
                                 <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Status</p>
                                 <button 
                                   onClick={() => {
                                     const newConfigs = [...centralizedConfigs[selectedProduct]];
                                     const idx = newConfigs.findIndex(c => c.stage === stageConfig.stage);
                                     newConfigs[idx] = { ...newConfigs[idx], enabled: !newConfigs[idx].enabled };
                                     setCentralizedConfigs({ ...centralizedConfigs, [selectedProduct]: newConfigs });
                                   }}
                                   className={`w-12 h-6 rounded-full p-1 transition-all ${stageConfig.enabled ? 'bg-[#000080]' : 'bg-slate-200'}`}
                                 >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-sm transform ${stageConfig.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                 </button>
                              </div>
                           </div>
                        </div>
                      );
                    })}
                 </div>

                 <div className="mt-10 flex justify-end">
                    <button 
                      onClick={() => toast.success(`Centralized settings for ${selectedProduct} deployed across all entities`)}
                      className="px-10 py-4 bg-[#000080] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10"
                    >
                      Deploy Global Matrix
                    </button>
                 </div>
              </div>
            </div>
          ) : activeTab === 'hospitals' ? (
            <div className="overflow-x-auto border border-slate-200 rounded-3xl">
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5">Hospital Entity</th>
                    <th className="px-6 py-5">WhatsApp</th>
                    <th className="px-6 py-5">SMS</th>
                    <th className="px-6 py-5">Active Stages</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHospitals.map(hospital => {
                    const config = getHospitalConfig(hospital.id);
                    return (
                      <tr key={hospital.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                              <Building size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{hospital.hospitalName}</p>
                              <p className="text-[10px] font-bold text-slate-400 lowercase">{hospital.emailId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-sans">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.whatsappEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            <MessageSquare size={12} />
                            {config.whatsappEnabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.smsEnabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Smartphone size={12} />
                            {config.smsEnabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                             <div className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                               {config.stageConfigs.filter(s => s.enabled).length} Stages
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => {
                              setSelectedHospitalForConfig(hospital);
                              setShowConfigModal(true);
                            }}
                            className="p-2.5 text-slate-400 hover:text-[#000080] hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Settings2 size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <div key={template.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:border-[#000080]/30 transition-all shadow-sm relative">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${template.type === 'WhatsApp' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {template.type === 'WhatsApp' ? <MessageSquare size={24} /> : <Smartphone size={24} />}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateModal(true);
                        }}
                        className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-sm"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setTemplates(templates.filter(t => t.id !== template.id))}
                        className="p-2 bg-white text-slate-400 hover:text-rose-500 rounded-xl shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2 truncate">{template.name}</h4>
                  <div className="bg-white/80 p-4 rounded-2xl border border-slate-100 mb-4 min-h-[100px]">
                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed line-clamp-4 italic">"{template.content}"</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.placeholders.map(p => (
                      <span key={p} className="text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 lowercase font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplateModal && editingTemplate && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 font-sans"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#000080] text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <LayoutTemplate size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Template Architect</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Define dynamic notification content</p>
                  </div>
                </div>
                <button onClick={() => setShowTemplateModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                  <X size={28} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Template Name</label>
                    <input 
                      type="text" 
                      required
                      value={editingTemplate.name}
                      onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      placeholder="e.g. Admission Confirmation"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Channel Type</label>
                    <select 
                      value={editingTemplate.type}
                      onChange={e => setEditingTemplate({...editingTemplate, type: e.target.value as any})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                    >
                      <option value="WhatsApp">WhatsApp Business API</option>
                      <option value="SMS">Premium SMS Terminal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Message Content</label>
                  <div className="relative">
                    <textarea 
                      required
                      rows={5}
                      value={editingTemplate.content}
                      onChange={e => {
                        const content = e.target.value;
                        const placeholders = content.match(/\{\{(.*?)\}\}/g)?.map(p => p.replace(/\{\{|\}\}/g, '')) || [];
                        setEditingTemplate({...editingTemplate, content, placeholders: Array.from(new Set(placeholders))});
                      }}
                      className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all font-mono resize-none"
                      placeholder="Type your message here... Use {{variable}} for dynamic content."
                    />
                    <div className="absolute top-4 right-4 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                       <Zap size={16} className="text-amber-500" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Identified Placeholders
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {editingTemplate.placeholders.length > 0 ? (
                      editingTemplate.placeholders.map(p => (
                        <span key={p} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-[10px] font-bold lowercase">
                          {p}
                        </span>
                      ))
                    ) : (
                      <p className="text-[10px] font-bold text-blue-400 italic">No variables found in content yet...</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowTemplateModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 font-sans"
                  >
                    Deploy Template
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hospital Config Modal */}
      <AnimatePresence>
        {showConfigModal && selectedHospitalForConfig && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 font-sans max-h-[92vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8 flex-shrink-0">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-blue-50 text-[#000080] rounded-[1.5rem] flex items-center justify-center shadow-sm">
                    <Building size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{selectedHospitalForConfig.hospitalName}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Regional Notification Infrastructure</p>
                  </div>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                  <X size={28} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 -mr-4 space-y-10">
                {/* Channel master toggle */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white text-emerald-500 rounded-2xl flex items-center justify-center shadow-sm">
                          <MessageSquare size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-800 uppercase">WhatsApp API</p>
                          <p className="text-[10px] font-bold text-emerald-600">Enterprise Messaging Bridge</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const config = getHospitalConfig(selectedHospitalForConfig.id);
                          setHospitalConfigs(prev => {
                             const others = prev.filter(c => c.hospitalId !== selectedHospitalForConfig.id);
                             return [...others, {...config, whatsappEnabled: !config.whatsappEnabled}];
                          });
                        }}
                        className={`w-14 h-8 rounded-full p-1 transition-all ${getHospitalConfig(selectedHospitalForConfig.id).whatsappEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      >
                         <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-sm transform ${getHospitalConfig(selectedHospitalForConfig.id).whatsappEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white text-blue-500 rounded-2xl flex items-center justify-center shadow-sm">
                          <Smartphone size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-blue-800 uppercase">SMS Gateway</p>
                          <p className="text-[10px] font-bold text-blue-600">Global SMS Relay Integration</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const config = getHospitalConfig(selectedHospitalForConfig.id);
                          setHospitalConfigs(prev => {
                             const others = prev.filter(c => c.hospitalId !== selectedHospitalForConfig.id);
                             return [...others, {...config, smsEnabled: !config.smsEnabled}];
                          });
                        }}
                        className={`w-14 h-8 rounded-full p-1 transition-all ${getHospitalConfig(selectedHospitalForConfig.id).smsEnabled ? 'bg-blue-500' : 'bg-slate-200'}`}
                      >
                         <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-sm transform ${getHospitalConfig(selectedHospitalForConfig.id).smsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stage Configuration */}
                <div>
                   <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Stage-Wise Configuration Matrix</h4>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">
                         <Clock size={12} /> Auto-Sync Enabled
                      </div>
                   </div>

                   <div className="space-y-3">
                      {Object.values(ClaimStatus).slice(0, 10).map((status) => {
                        const config = getHospitalConfig(selectedHospitalForConfig.id);
                        const stageConf = config.stageConfigs.find(s => s.stage === status) || {
                          stage: status,
                          enabled: false
                        };

                        return (
                          <div key={status} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:bg-slate-100/50 transition-all">
                             <div className="flex items-center gap-4 flex-1">
                                <div className={`w-3 h-3 rounded-full ${stageConf.enabled ? 'bg-[#000080]' : 'bg-slate-300'}`} />
                                <div>
                                   <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{status}</p>
                                   <p className="text-[9px] font-bold text-slate-400">Trigger notification on status update</p>
                                </div>
                             </div>

                             <div className="flex items-center gap-6">
                                <div className="flex items-center gap-4">
                                   <div className="flex flex-col gap-1">
                                      <p className="text-[8px] font-black uppercase text-slate-400">WA Template</p>
                                      <select 
                                        disabled={!stageConf.enabled}
                                        value={stageConf.whatsappTemplateId || ''}
                                        onChange={e => {
                                           // Update stage config
                                           const newStageConf = {...stageConf, whatsappTemplateId: e.target.value};
                                           const newStages = config.stageConfigs.filter(s => s.stage !== status);
                                           newStages.push(newStageConf);
                                           setHospitalConfigs(prev => [...prev.filter(c => c.hospitalId !== selectedHospitalForConfig.id), {...config, stageConfigs: newStages}]);
                                        }}
                                        className="bg-white border border-slate-200 rounded-lg text-[9px] font-bold p-1.5 outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 min-w-[120px]"
                                      >
                                         <option value="">Default...</option>
                                         {templates.filter(t => t.type === 'WhatsApp').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                      </select>
                                   </div>
                                   <div className="flex flex-col gap-1">
                                      <p className="text-[8px] font-black uppercase text-slate-400">SMS Template</p>
                                      <select 
                                        disabled={!stageConf.enabled}
                                        value={stageConf.smsTemplateId || ''}
                                        onChange={e => {
                                           const newStageConf = {...stageConf, smsTemplateId: e.target.value};
                                           const newStages = config.stageConfigs.filter(s => s.stage !== status);
                                           newStages.push(newStageConf);
                                           setHospitalConfigs(prev => [...prev.filter(c => c.hospitalId !== selectedHospitalForConfig.id), {...config, stageConfigs: newStages}]);
                                        }}
                                        className="bg-white border border-slate-200 rounded-lg text-[9px] font-bold p-1.5 outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 min-w-[120px]"
                                      >
                                         <option value="">Default...</option>
                                         {templates.filter(t => t.type === 'SMS').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                      </select>
                                   </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    const newStageConf = {...stageConf, enabled: !stageConf.enabled};
                                    const newStages = config.stageConfigs.filter(s => s.stage !== status);
                                    newStages.push(newStageConf);
                                    setHospitalConfigs(prev => [...prev.filter(c => c.hospitalId !== selectedHospitalForConfig.id), {...config, stageConfigs: newStages}]);
                                  }}
                                  className={`w-12 h-6 rounded-full p-1 transition-all ${stageConf.enabled ? 'bg-[#000080]' : 'bg-slate-200'}`}
                                >
                                   <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-sm transform ${stageConf.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-100 flex gap-4 flex-shrink-0">
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Close Manager
                </button>
                <button 
                  onClick={() => {
                    toast.success('System configuration persisted successfully');
                    setShowConfigModal(false);
                  }}
                  className="flex-[2] py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10"
                >
                  Save & Apply Config
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationManager;

import { LucideIcon } from 'lucide-react';
const SectionHeading = ({ icon: Icon, title, subtitle }: { icon: LucideIcon, title: string, subtitle: string }) => (
  <div className="flex items-center gap-5">
    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100">
      <Icon size={28} className="text-[#000080]" />
    </div>
    <div>
      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{title}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{subtitle}</p>
    </div>
  </div>
);
