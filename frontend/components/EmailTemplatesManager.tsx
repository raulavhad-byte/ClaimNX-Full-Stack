import React, { useState, useEffect } from 'react';
import { Mail, Save, Loader2, Edit2, X, CheckCircle2 } from 'lucide-react';

import { emailTemplateService } from '../services/emailTemplateService';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'Pre-auth Follow-up' | 'Settlement Follow-up' | 'General';
  updatedAt: string;
}

export default function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    setTemplates(emailTemplateService.getTemplates());
    setLoading(false);
  }, []);

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const updatedTemplate = { ...editingTemplate, updatedAt: new Date().toISOString() };
      const newTemplates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
      
      if (!templates.some(t => t.id === updatedTemplate.id)) {
        newTemplates.push(updatedTemplate);
      }

      setTemplates(newTemplates);
      emailTemplateService.saveTemplates(newTemplates);
      
      setMessage({ type: 'success', text: 'Template saved successfully!' });
      setEditingTemplate(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save template.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Mail size={24} className="text-blue-600" />
            Email Templates
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">Manage standard email drafts for follow-ups</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {templates.map(template => (
            <div 
              key={template.id}
              onClick={() => setEditingTemplate(template)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                editingTemplate?.id === template.id 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-black text-slate-800">{template.name}</h3>
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-md">
                  {template.type}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 line-clamp-2">{template.subject}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {editingTemplate ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-800">Edit Template</h3>
                <button onClick={() => setEditingTemplate(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Template Name</label>
                  <input 
                    type="text" 
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Subject</label>
                  <input 
                    type="text" 
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Email Body</span>
                    <span className="text-blue-500 text-[9px]">Vars: {'{claimId}'}, {'{patientName}'}, {'{hospitalName}'}, {'{invoiceNumber}'}, {'{recipientName}'}, {'{totalAmount}'}, {'{tat}'}</span>
                  </label>
                  <textarea 
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({...editingTemplate, body: e.target.value})}
                    rows={10}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Template
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-20">
              <Mail size={48} className="text-slate-200 mb-4" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select a template to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
