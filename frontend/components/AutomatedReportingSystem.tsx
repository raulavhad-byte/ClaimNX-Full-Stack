import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Calendar, Clock, Filter, Mail, MessageSquare, 
  Download, Activity, ShieldCheck, Zap, BarChart3, 
  Settings2, History, AlertCircle, CheckCircle2, XCircle,
  ChevronRight, ArrowRight, UserCheck, Globe, Building2,
  PieChart, TrendingUp, DollarSign, Bell, MailOpen, Link as LinkIcon, Edit2, Trash2, X, RefreshCw, Send, ListFilter, Play, FileText, Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, HospitalUser, ReportConfig, ReportDeliveryLog, AutomatedReportTemplate } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];
const CHANNELS = [
  { id: 'Email', icon: Mail, label: 'Auto Email' },
  { id: 'SMS', icon: MessageSquare, label: 'SMS Notification' },
  { id: 'Portal', icon: Globe, label: 'Portal Link' }
];

const PRODUCTS = [
  Product.CPC,
  Product.BG_DESK,
  Product.KYP,
  Product.ICA,
  Product.PRE_POST,
  Product.RECOVERY_RECONCILIATION,
  Product.PARTNER_PROCESSING
];

const AutomatedReportingSystem: React.FC<{ hospitalUsers?: HospitalUser[], hospitals?: HospitalUser[] }> = ({ hospitalUsers = [], hospitals = [] }) => {
  const [activeTab, setActiveTab] = useState<'configs' | 'logs' | 'templates'>('configs');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<ReportConfig> | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<AutomatedReportTemplate> | null>(null);

  // Mock templates
  const [templates, setTemplates] = useState<AutomatedReportTemplate[]>([
    {
      id: 'tmpl-1',
      name: 'Standard Hospital Daily Summary',
      type: 'Email',
      subject: 'Daily Operations Pulse: {{hospitalName}}',
      body: 'Hello {{hospitalName}},\n\nYour performance report for {{dateRange}} is ready.\n\nKPI Summary:\n- Total Cases: {{totalCases}}\n- Approved: {{approvedCases}}\n- Approval Ratio: {{approvalRatio}}%\n\n--- ENCLOSED RECONCILIATION SUMMARY ---\n{{reconciliationSummary}}\n\n--- AGING ANALYSIS ---\n{{agingAnalysis}}\n\nView full details here: {{portalLink}}\n\nRegards,\nBima Garage Team',
      placeholders: ['hospitalName', 'dateRange', 'totalCases', 'approvedCases', 'approvalRatio', 'reconciliationSummary', 'agingAnalysis', 'portalLink']
    }
  ]);

  // Mock data for initial view
  const [configs, setConfigs] = useState<ReportConfig[]>([
    {
      id: 'rpt-1',
      name: 'Daily Operations Pulse',
      products: [Product.CPC, Product.BG_DESK],
      frequency: { type: 'Daily', time: '09:00' },
      recipients: { zones: ['North', 'West'] },
      deliveryChannels: ['Email', 'Portal'],
      status: 'Active',
      createdBy: 'Super Admin',
      createdAt: '2025-01-01T09:00:00Z'
    },
    {
      id: 'rpt-2',
      name: 'Monthly Financial Settlement Report',
      products: [Product.RECOVERY_RECONCILIATION],
      frequency: { type: 'Monthly', day: '1', time: '10:00' },
      recipients: { states: ['Maharashtra', 'Karnataka'] },
      deliveryChannels: ['Email', 'SMS', 'Portal'],
      status: 'Active',
      createdBy: 'Super Admin',
      createdAt: '2025-01-05T10:00:00Z'
    }
  ]);

  const [logs] = useState<ReportDeliveryLog[]>([
    {
      id: 'log-1',
      configId: 'rpt-1',
      reportName: 'Daily Operations Pulse',
      deliveredToId: 'hosp-1',
      deliveredToName: 'Apollo Hospital',
      channel: 'Email',
      status: 'Delivered',
      timestamp: new Date().toISOString(),
      metadata: { totalCases: 45, approvedCases: 38, pendingCases: 7 }
    },
    {
      id: 'log-2',
      configId: 'rpt-2',
      reportName: 'Monthly Financial Settlement Report',
      deliveredToId: 'hosp-2',
      deliveredToName: 'Fortis Healthcare',
      channel: 'SMS',
      status: 'Sent',
      timestamp: new Date().toISOString()
    }
  ]);

  const [manualRequest, setManualRequest] = useState({ 
    hospitalId: '', 
    to: '', 
    cc: '', 
    subject: '', 
    body: '',
    templateId: templates[0]?.id || ''
  });

  const handleManualHospitalChange = (hId: string) => {
    const hospital = hospitals.find(h => h.id === hId);
    const template = templates.find(t => t.id === manualRequest.templateId) || templates[0];
    
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
    const template = templates.find(t => t.id === tId);
    
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

  const stats = useMemo(() => {
    return {
      totalSent: logs.length,
      failed: logs.filter(l => l.status === 'Failed').length,
      downloaded: logs.filter(l => l.status === 'Downloaded').length,
      activeConfigs: configs.filter(c => c.status === 'Active').length
    };
  }, [logs, configs]);

  const handleSaveConfig = () => {
    if (!editingConfig?.name) return;
    
    if (editingConfig.id) {
      setConfigs(configs.map(c => c.id === editingConfig.id ? (editingConfig as ReportConfig) : c));
    } else {
      const newConfig: ReportConfig = {
        ...(editingConfig as ReportConfig),
        id: `rpt-${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdBy: 'Super Admin',
        status: 'Active'
      };
      setConfigs([...configs, newConfig]);
    }
    setShowConfigModal(false);
    setEditingConfig(null);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate?.name) return;
    
    if (editingTemplate.id) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? (editingTemplate as AutomatedReportTemplate) : t));
    } else {
      const newTemplate: AutomatedReportTemplate = {
        ...(editingTemplate as AutomatedReportTemplate),
        id: `tmpl-${Date.now()}`,
        placeholders: ['hospitalName', 'dateRange', 'totalCases', 'approvedCases', 'portalLink']
      };
      setTemplates([...templates, newTemplate]);
    }
    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={Send} 
          label="Total Reports Sent" 
          value={stats.totalSent} 
          color="blue"
          trend="+12% from last week"
        />
        <StatCard 
          icon={AlertCircle} 
          label="Failed Deliveries" 
          value={stats.failed} 
          color="rose"
          trend="0.2% failure rate"
        />
        <StatCard 
          icon={Download} 
          label="Report Downloads" 
          value={stats.downloaded} 
          color="emerald"
          trend="85% engagement"
        />
        <StatCard 
          icon={Settings2} 
          label="Active Automations" 
          value={stats.activeConfigs} 
          color="amber"
          trend="4 new this month"
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
          <div className="flex bg-slate-200/50 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('configs')} 
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'configs' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}
            >
              Configurations
            </button>
            <button 
              onClick={() => setActiveTab('logs')} 
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}
            >
              Delivery Logs
            </button>
            <button 
              onClick={() => setActiveTab('templates')} 
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'templates' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}
            >
              Templates
            </button>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white border border-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-900/20"
            >
              <Send size={18} /> Manual Dispatch
            </button>
            <button 
              onClick={() => {
                setEditingConfig({
                  name: '',
                  products: [],
                  frequency: { type: 'Daily', time: '09:00' },
                  recipients: {},
                  deliveryChannels: []
                });
                setShowConfigModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#000080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:bg-blue-800 transition-all active:scale-95"
            >
              <Plus size={18} /> Create New Automation
            </button>
          </div>
        </div>

        <div className="p-8">
          {activeTab === 'configs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {configs.map(config => (
                <div key={config.id} className="group p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:border-blue-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${config.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{config.name}</h4>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => { setEditingConfig(config); setShowConfigModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {config.products.map(p => (
                          <span key={p} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[8px] font-black uppercase">{p}</span>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar size={14} />
                          <span className="text-[10px] font-bold uppercase">{config.frequency.type} {config.frequency.day ? `(Day ${config.frequency.day})` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock size={14} />
                          <span className="text-[10px] font-bold uppercase">{config.frequency.time}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-2 border-t border-slate-200">
                        {config.deliveryChannels.includes('Email') && <Mail size={14} className="text-blue-500" />}
                        {config.deliveryChannels.includes('SMS') && <MessageSquare size={14} className="text-emerald-500" />}
                        {config.deliveryChannels.includes('Portal') && <Globe size={14} className="text-amber-500" />}
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-auto">Last run: {config.lastRunAt ? format(new Date(config.lastRunAt), 'dd-MM-yyyy HH:mm') : 'Never'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button className="mt-4 w-full py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                    <Play size={12} /> Trigger Manual Run
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Report / Destination</th>
                    <th className="px-6 py-4">Channel</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">KPI Summary</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <p className="text-slate-800 font-black uppercase tracking-tight">{log.reportName}</p>
                        <p className="text-[10px] text-slate-400">{log.deliveredToName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {log.channel === 'Email' && <Mail size={14} className="text-blue-500" />}
                          {log.channel === 'SMS' && <MessageSquare size={14} className="text-emerald-500" />}
                          {log.channel === 'Portal' && <Globe size={14} className="text-amber-500" />}
                          <span className="uppercase text-[9px] tracking-wider">{log.channel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          log.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                          log.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                          log.status === 'Failed' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {log.metadata ? (
                          <div className="flex gap-2 text-[9px]">
                            <span className="text-blue-600">Cases: {log.metadata.totalCases}</span>
                            <span className="text-emerald-600">Appr: {log.metadata.approvedCases}</span>
                          </div>
                        ) : '---'}
                      </td>
                      <td className="px-6 py-4 text-[10px] text-slate-400">
                        {format(new Date(log.timestamp), 'dd-MM-yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map(template => (
                <div key={template.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] hover:border-blue-400 transition-all">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${template.type === 'Email' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {template.type === 'Email' ? <Mail size={20} /> : <MessageSquare size={20} />}
                         </div>
                         <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{template.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{template.type} Format</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <button 
                            onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm"
                         >
                            <Edit2 size={18} />
                         </button>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject / Header</p>
                         <p className="text-xs font-bold text-slate-700">{template.subject}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Body Preview</p>
                         <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed">{template.body}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                         {template.placeholders.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[8px] font-black uppercase">
                               {`{{${p}}}`}
                            </span>
                         ))}
                      </div>
                   </div>
                </div>
              ))}
              
              <button 
                onClick={() => {
                  setEditingTemplate({ name: '', type: 'Email', subject: '', body: '', placeholders: [] });
                  setShowTemplateModal(true);
                }}
                className="p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all bg-slate-50/30"
              >
                 <Plus size={32} />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Custom Template</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfigModal && editingConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Report Automation Engine</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configure periodic hospital communication</p>
                  </div>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <Section label="1. Basic Identity">
                    <div className="space-y-4">
                      <Input 
                        label="Automation Name" 
                        value={editingConfig.name || ''} 
                        onChange={val => setEditingConfig({...editingConfig, name: val})}
                        placeholder="e.g. Daily Operations Pulse"
                      />
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Products Under Report</label>
                        <div className="grid grid-cols-2 gap-2">
                          {PRODUCTS.map(p => (
                            <button 
                              key={p}
                              onClick={() => {
                                const products = editingConfig.products || [];
                                const next = products.includes(p) ? products.filter(i => i !== p) : [...products, p];
                                setEditingConfig({...editingConfig, products: next});
                              }}
                              className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase text-left transition-all border ${
                                editingConfig.products?.includes(p) 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' 
                                : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section label="2. Scheduling Logic">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Frequency</label>
                        <select 
                          value={editingConfig.frequency?.type || 'Daily'} 
                          onChange={e => setEditingConfig({
                            ...editingConfig, 
                            frequency: { ...editingConfig.frequency!, type: e.target.value as any }
                          })}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none"
                        >
                          {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Run Time</label>
                        <input 
                          type="time" 
                          value={editingConfig.frequency?.time || '09:00'}
                          onChange={e => setEditingConfig({
                            ...editingConfig, 
                            frequency: { ...editingConfig.frequency!, time: e.target.value }
                          })}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none" 
                        />
                      </div>
                      
                      {(editingConfig.frequency?.type === 'Weekly' || editingConfig.frequency?.type === 'Monthly') && (
                        <div className="md:col-span-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                              {editingConfig.frequency.type === 'Weekly' ? 'Select Day of Week' : 'Select Day of Month'}
                           </label>
                           <div className="flex flex-wrap gap-2">
                              {editingConfig.frequency.type === 'Weekly' ? (
                                ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                  <button 
                                    key={day}
                                    onClick={() => setEditingConfig({...editingConfig, frequency: {...editingConfig.frequency!, day}})}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${editingConfig.frequency?.day === day ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                  >
                                    {day}
                                  </button>
                                ))
                              ) : (
                                [1, 5, 10, 15, 20, 25, 28].map(day => (
                                  <button 
                                    key={day}
                                    onClick={() => setEditingConfig({...editingConfig, frequency: {...editingConfig.frequency!, day: day.toString()}})}
                                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${editingConfig.frequency?.day === day.toString() ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                  >
                                    {day}
                                  </button>
                                ))
                              )}
                           </div>
                        </div>
                      )}
                    </div>
                  </Section>
                </div>

                <div className="space-y-8 border-l border-slate-100 pl-10">
                  <Section label="3. Filtering Scope">
                    <div className="space-y-4">
                      <FilterGroup 
                        label="Zonal Distribution" 
                        options={['North', 'South', 'East', 'West', 'Central']} 
                        selected={editingConfig.recipients?.zones || []}
                        onChange={vals => setEditingConfig({...editingConfig, recipients: {...editingConfig.recipients!, zones: vals}})}
                      />
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Hospital Specific</label>
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input 
                              type="text" 
                              placeholder="Search hospitals..." 
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" 
                            />
                         </div>
                      </div>
                    </div>
                  </Section>

                  <Section label="4. Delivery Channels">
                    <div className="space-y-3">
                      {CHANNELS.map(channel => (
                        <button 
                          key={channel.id}
                          onClick={() => {
                            const channels = editingConfig.deliveryChannels || [];
                            const next = channels.includes(channel.id as any) ? channels.filter(i => i !== channel.id) : [...channels, channel.id as any];
                            setEditingConfig({...editingConfig, deliveryChannels: next});
                          }}
                          className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${
                            editingConfig.deliveryChannels?.includes(channel.id as any)
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-slate-50 border-slate-100 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <channel.icon size={20} />
                            <span className="text-[11px] font-black uppercase tracking-tight">{channel.label}</span>
                          </div>
                          {editingConfig.deliveryChannels?.includes(channel.id as any) && <CheckCircle2 size={18} className="text-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  </Section>
                </div>
              </div>

              <div className="mt-12 flex gap-4 pt-8 border-t border-slate-100">
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveConfig}
                  className="flex-[2] py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10"
                >
                  Save & Activate Automation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplateModal && editingTemplate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100"
            >
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                        <FileText size={24} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Communication Template</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Define message structure & placeholders</p>
                     </div>
                  </div>
                  <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                     <X size={24} className="text-slate-400" />
                  </button>
               </div>

               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <Input 
                        label="Template Name" 
                        value={editingTemplate.name || ''} 
                        onChange={(v: string) => setEditingTemplate({...editingTemplate, name: v})} 
                     />
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Format Type</label>
                        <select 
                          value={editingTemplate.type || 'Email'} 
                          onChange={e => setEditingTemplate({...editingTemplate, type: e.target.value as any})}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none"
                        >
                           <option value="Email">Email</option>
                           <option value="SMS">SMS</option>
                        </select>
                     </div>
                  </div>

                  <Input 
                    label="Subject / Header Line" 
                    value={editingTemplate.subject || ''} 
                    onChange={(v: string) => setEditingTemplate({...editingTemplate, subject: v})} 
                  />

                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Message Body</label>
                     <textarea 
                        value={editingTemplate.body || ''} 
                        onChange={(e) => setEditingTemplate({...editingTemplate, body: e.target.value})}
                        rows={6}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-50 transition-all resize-none"
                        placeholder="Use {{placeholderName}} for dynamic content..."
                     />
                  </div>
                  
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                     <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Code size={12} /> Available Placeholders
                     </p>
                     <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                        hospitalName, dateRange, totalCases, approvedCases, approvalRatio, reconciliationSummary, agingAnalysis, portalLink, productNames, zones
                     </p>
                  </div>
               </div>

               <div className="mt-10 flex gap-4">
                  <button 
                    onClick={() => setShowTemplateModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleSaveTemplate}
                    className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10"
                  >
                    Save Template
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                    >
                      <option value="">Choose Hospital...</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.hospitalName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Use Template</label>
                    <select 
                      value={manualRequest.templateId}
                      onChange={(e) => handleManualTemplateChange(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Recipient Email (To)</label>
                    <input 
                      type="text"
                      value={manualRequest.to}
                      onChange={(e) => setManualRequest({...manualRequest, to: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      placeholder="hospital@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">CC Emails</label>
                    <input 
                      type="text"
                      value={manualRequest.cc}
                      onChange={(e) => setManualRequest({...manualRequest, cc: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      placeholder="comma separated emails..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email Subject</label>
                  <input 
                    type="text"
                    value={manualRequest.subject}
                    onChange={(e) => setManualRequest({...manualRequest, subject: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                    placeholder="Enter subject..."
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email Draft (Body)</label>
                  <textarea 
                    value={manualRequest.body}
                    onChange={(e) => setManualRequest({...manualRequest, body: e.target.value})}
                    rows={6}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all resize-none"
                    placeholder="Compose report message..."
                  />
                  <p className="text-[9px] text-slate-400 mt-2 font-medium italic">Note: Report PDF will be attached automatically.</p>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                   <AlertCircle className="text-amber-600 shrink-0" size={16} />
                   <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                      Manual trigger will use the latest available data as of today for the selected hospital only.
                   </p>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    // Logic to send report
                    toast.success(`Report dispatch initiated for ${hospitals.find(h => h.id === manualRequest.hospitalId)?.hospitalName || 'selected hospital'} to ${manualRequest.to}`);
                    setShowManualModal(false);
                    setManualRequest({ hospitalId: '', to: '', cc: '', subject: '', body: '', templateId: templates[0]?.id || '' });
                  }}
                  disabled={!manualRequest.hospitalId || !manualRequest.to}
                  className="flex-[2] py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 disabled:opacity-50 disabled:grayscale"
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

const StatCard = ({ icon: Icon, label, value, color, trend }: any) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };

  return (
    <div className={`p-6 rounded-[2rem] border bg-white shadow-sm transition-transform hover:-translate-y-1`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${colors[color as keyof typeof colors]}`}>
        <Icon size={24} />
      </div>
      <div>
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h5>
        <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
        <p className={`text-[9px] font-bold mt-2 ${color === 'rose' ? 'text-rose-500' : 'text-emerald-500'}`}>{trend}</p>
      </div>
    </div>
  );
};

const Section = ({ label, children }: any) => (
  <div className="space-y-4">
    <h5 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">{label}</h5>
    {children}
  </div>
);

const Input = ({ label, value, onChange, placeholder }: any) => (
  <div>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
    <input 
      type="text" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" 
    />
  </div>
);

const FilterGroup = ({ label, options, selected, onChange }: any) => (
  <div>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button 
          key={opt}
          onClick={() => {
            const next = selected.includes(opt) ? selected.filter((i: any) => i !== opt) : [...selected, opt];
            onChange(next);
          }}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
            selected.includes(opt) ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

export default AutomatedReportingSystem;
