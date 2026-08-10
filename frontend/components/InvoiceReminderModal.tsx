import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Loader2, CheckCircle2, Paperclip, FileText, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { EmailTemplate } from './EmailTemplatesManager';

interface InvoiceReminderModalProps {
  invoice: any;
  hospitalProfile: any;
  templates: EmailTemplate[];
  onClose: () => void;
}

export default function InvoiceReminderModal({ 
  invoice, 
  hospitalProfile, 
  templates, 
  onClose 
}: InvoiceReminderModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [includePdf, setIncludePdf] = useState(true);
  const [includeCsv, setIncludeCsv] = useState(true);

  // Set default template
  useEffect(() => {
    if (templates.length > 0) {
      const invoiceTemplate = templates.find(t => t.id === 'invoice-reminder' || t.name.toLowerCase().includes('invoice'));
      if (invoiceTemplate) {
        setSelectedTemplateId(invoiceTemplate.id);
      } else {
        setSelectedTemplateId(templates[0].id);
      }
    }
  }, [templates]);

  useEffect(() => {
    if (invoice) {
      setToEmail(invoice.recipientEmail || '');
    }
  }, [invoice]);

  // Handle template selection and variable replacement
  useEffect(() => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template && invoice) {
      const hospName = hospitalProfile?.hospitalName || hospitalProfile?.displayName || 'Rahul Avhad';
      let newSubject = template.subject;
      let newBody = template.body;

      // Calculate TAT (Overdue / Pending days)
      const dueDate = new Date(invoice.dueDate);
      const today = new Date();
      let diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const tatText = diffDays > 0 ? `${diffDays} days overdue` : `${Math.abs(diffDays)} days pending`;

      const vars: Record<string, string> = {
        invoiceNumber: invoice.invoiceNumber,
        recipientName: invoice.recipientName,
        totalAmount: `Rs. ${invoice.totalAmount.toLocaleString('en-IN')}`,
        dueDate: invoice.dueDate,
        hospitalName: hospName,
        tat: tatText
      };

      Object.entries(vars).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}|\\#\\{${key}\\}`, 'g');
        newSubject = newSubject.replace(regex, value || '');
        newBody = newBody.replace(regex, value || '');
      });

      setSubject(newSubject);
      setBody(newBody);
    }
  }, [selectedTemplateId, templates, invoice, hospitalProfile]);

  const handleSend = () => {
    setSending(true);
    // Simulate API call
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => onClose(), 2000);
    }, 1500);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] p-12 text-center shadow-2xl max-w-sm w-full"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Reminder Sent!</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">The email has been dispatched successfully.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Mail size={24} className="text-blue-600" />
            Send a Follow Up
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Template Selector */}
          <div className="mb-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Selected Template</label>
            <div className="w-full px-6 py-4 bg-blue-50 border border-blue-100 rounded-2xl text-base font-bold text-blue-700 flex items-center justify-between">
              <span>Invoice Reminder</span>
              <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-md uppercase tracking-widest">Locked</span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-1">
                <span className="text-sm font-bold text-slate-400">From :</span>
              </div>
              <div className="col-span-11">
                <span className="text-sm font-bold text-slate-600">{hospitalProfile?.emailId || 'raulavhad@gmail.com'}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-1">
                <span className="text-sm font-bold text-slate-400">To :</span>
              </div>
              <div className="col-span-11">
                <input 
                  type="text" 
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-600 focus:ring-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-1">
                <span className="text-sm font-bold text-slate-400">Cc :</span>
              </div>
              <div className="col-span-11">
                <input 
                  type="text" 
                  placeholder="Enter Cc emails"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-600 focus:ring-0 placeholder:text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-6"></div>

          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-bold text-slate-400 shrink-0">Subject :</span>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm font-black text-slate-800 focus:ring-0"
              />
            </div>

            <div className="p-8 bg-slate-50 border border-slate-50 rounded-3xl min-h-[300px] relative">
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-600 focus:ring-0 resize-none min-h-[250px] leading-relaxed"
              />
            </div>
            
            {(includePdf || includeCsv) && (
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Paperclip size={14} /> Auto-Attached Files
                </label>
                <div className="flex gap-4">
                  {includePdf && (
                    <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl max-w-xs w-full group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-700 truncate">{`Invoice_${invoice?.invoiceNumber?.replaceAll('/', '_') || 'Data'}.pdf`}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Auto-generated PDF</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIncludePdf(false)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Attachment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                  {includeCsv && (
                    <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl max-w-xs w-full group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-700 truncate">{`InvoiceData_${invoice?.billingPeriod?.replaceAll(' ', '') || 'Current'}.csv`}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Billing Period Data</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIncludeCsv(false)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Attachment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="p-8">
          <button 
            onClick={handleSend}
            disabled={sending}
            className="w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {sending ? 'SENDING...' : 'SEND'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
