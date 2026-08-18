import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Paperclip, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Claim, HospitalUser, InsuranceEntity, ClaimStatus } from '../types';
import { EmailTemplate } from './EmailTemplatesManager';
import { motion, AnimatePresence } from 'motion/react';

interface FollowUpEmailModalProps {
  claim: Claim;
  hospitalProfile: HospitalUser;
  insurers: InsuranceEntity[];
  tpas: InsuranceEntity[];
  templates: EmailTemplate[];
  onClose: () => void;
}

export default function FollowUpEmailModal({ 
  claim, 
  hospitalProfile, 
  insurers, 
  tpas, 
  templates, 
  onClose 
}: FollowUpEmailModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [removedAttachments, setRemovedAttachments] = useState<string[]>([]);
  const [isTemplateLocked, setIsTemplateLocked] = useState(false);

  // Find recipient email
  useEffect(() => {
    const provider = [...insurers, ...tpas].find(
      e => e.name === claim.insuranceProvider || e.id === claim.insuranceCompanyId
    );
    if (provider) {
      setToEmail(provider.emailId);
    } else {
      setToEmail('claims@insurance.com, cashless@insurance.com'); // Fallback
    }
  }, [claim, insurers, tpas]);

  // Set default template based on status
  useEffect(() => {
    let idealId = '';
    const status = claim.status;

    if (status === ClaimStatus.PRE_AUTH_INITIATED || status === ClaimStatus.QUERY_REPLY_DONE) {
      idealId = 'pre-auth-initiated';
    } else if (status === ClaimStatus.ENHANCEMENT || status === ClaimStatus.ENHANCEMENT_QUERY_RESOLVED) {
      idealId = 'enhancement';
    } else if (status === ClaimStatus.DISCHARGE_INITIATED || status === ClaimStatus.DISCHARGE_QUERY_REPLY) {
      idealId = 'discharge-initiated';
    } else if (status === ClaimStatus.DISCHARGE_RECONSIDERATION_RAISED) {
      idealId = 'reconsideration';
    } else if (status === ClaimStatus.PRE_AUTH_REJECTED || status === ClaimStatus.ENHANCEMENT_REJECTED || status === ClaimStatus.DISCHARGE_REJECTED) {
      idealId = 'claim-cancellation';
    } else if (status === ClaimStatus.FILE_DISPATCH_PENDING || status === ClaimStatus.ACCOUNT_RECONCILIATION) {
      idealId = 'settlement-initiation';
    }

    const matchedTemplate = templates.find(t => 
      t.id === idealId || 
      t.name.toLowerCase().includes(status.toLowerCase()) ||
      (status === ClaimStatus.PRE_AUTH_INITIATED && t.name === 'Pre-auth Initiated')
    );

    if (matchedTemplate) {
      setSelectedTemplateId(matchedTemplate.id);
      
      const lockedIds = [
        'pre-auth-initiated', 
        'enhancement', 
        'discharge-initiated', 
        'claim-cancellation', 
        'settlement-initiation'
      ];
      setIsTemplateLocked(lockedIds.includes(matchedTemplate.id) || lockedIds.includes(idealId));
    } else if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
      setIsTemplateLocked(false);
    }
  }, [claim.status, templates]);

  // Handle template selection and variable replacement
  useEffect(() => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template) {
      const pName = claim.patientName || claim.formData?.p_name || 'N/A';
      const polNo = claim.policyNumber || claim.formData?.p_policy_no || 'N/A';
      const memId = claim.formData?.p_member_id || claim.formData?.memberId || 'N/A';
      const admDate = claim.admissionDate || claim.formData?.adm_date || 'N/A';
      const estCostVal = claim.estimatedCost || claim.formData?.adm_total_cost || claim.formData?.estimatedCost || 0;
      const fmtCost = Number(estCostVal) > 0 ? `Rs. ${Number(estCostVal).toLocaleString('en-IN')}` : 'N/A';
      const hospName = claim.formData?.hosp_name || hospitalProfile.hospitalName || hospitalProfile.displayName || 'Rahul Avhad';

      let newSubject = template.subject;
      let newBody = template.body;

      if (template.id === 'pre-auth-initiated' || template.name.toLowerCase() === 'pre-auth initiated') {
        newSubject = `New Pre-authorization Request - ${pName} | Policy: ${polNo} | Member ID: ${memId}`;
        
        newBody = `Dear ${claim.insuranceProvider || 'Insurance Team'},\n\n` +
          `We have initiated a new pre-authorization request for the patient below.\n\n` +
          `Patient Name: ${pName}\n` +
          `Policy Number: ${polNo}\n` +
          `Member ID: ${memId}\n` +
          `Admission Date: ${admDate}\n` +
          `Estimated Amount: ${fmtCost}\n` +
          `Hospital Name: ${hospName}\n\n` +
          `Please review and provide the initial approval.\n\n` +
          `Regards,\n` +
          `${hospName} Billing Team`;
      } else {
        const vars: Record<string, string> = {
          claimId: claim.formData?.insurer_claim_no || claim.formData?.claim_id || claim.id.substring(0, 8).toUpperCase(),
          patientName: claim.patientName || claim.formData?.p_name || claim.formData?.patientName || 'N/A',
          hospitalName: hospitalProfile.displayName,
          policyNo: claim.policyNumber,
          memberId: claim.formData?.p_member_id || 'N/A',
          stage: claim.status
        };

        Object.entries(vars).forEach(([key, value]) => {
          const regex = new RegExp(`\\{${key}\\}|\\#\\{${key}\\}`, 'g');
          newSubject = newSubject.replace(regex, value);
          newBody = newBody.replace(regex, value);
        });

        // Special handling for the screenshot format if needed
        if (!newBody.includes('Dear')) {
          const insuranceName = claim.insuranceProvider || 'Insurance Team';
          newBody = `Dear ${insuranceName},\n\n${newBody}`;
        }
      }

      setSubject(newSubject);
      setBody(newBody);
    }
  }, [selectedTemplateId, templates, claim, hospitalProfile]);

  const handleSend = () => {
    setSending(true);
    // Simulate API call
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => onClose(), 2000);
    }, 1500);
  };

  const attachments = useMemo(() => {
    const list: { name: string; size: string }[] = [];
    const seenNames = new Set<string>();

    const isTemplateFile = (name: string, type?: string) => {
      const n = name.toLowerCase();
      const t = (type || '').toLowerCase();
      return (
        n.includes('blank_template') || 
        t.includes('blank_template')
      );
    };

    // 1. Get from claim.history (including initial stage documents from New Admission)
    if (claim.history && Array.isArray(claim.history)) {
      claim.history.forEach((event) => {
        if (event.stageData?.documents && Array.isArray(event.stageData.documents)) {
          event.stageData.documents.forEach((doc: any) => {
            if (doc && doc.name && !seenNames.has(doc.name)) {
              if (!isTemplateFile(doc.name, doc.type)) {
                seenNames.add(doc.name);
                list.push({
                  name: doc.name,
                  size: '1.2 MB'
                });
              }
            }
          });
        }
        if (event.fileName && !seenNames.has(event.fileName)) {
          if (!isTemplateFile(event.fileName, event.fileType)) {
            seenNames.add(event.fileName);
            list.push({
              name: event.fileName,
              size: '1.2 MB'
            });
          }
        }
      });
    }

    return list;
  }, [claim.history, claim.id]);

  const visibleAttachments = useMemo(() => {
    return attachments.filter(file => !removedAttachments.includes(file.name));
  }, [attachments, removedAttachments]);

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
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Follow Up Sent!</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">The email has been dispatched to the insurer.</p>
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
            {isTemplateLocked ? (
              <>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Selected Template</label>
                <div className="w-full px-6 py-4 bg-blue-50 border border-blue-100 rounded-2xl text-base font-bold text-blue-700 flex items-center justify-between">
                  <span>{templates.find(t => t.id === selectedTemplateId)?.name || 'Selected Template'}</span>
                  <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-md uppercase tracking-widest">Locked</span>
                </div>
              </>
            ) : (
              <>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Template</label>
                <div className="relative">
                  <select 
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-1">
                <span className="text-sm font-bold text-slate-400">From :</span>
              </div>
              <div className="col-span-11">
                <span className="text-sm font-bold text-slate-600">{hospitalProfile.emailId || 'raulavhad@gmail.com'}</span>
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
          </div>

          {/* Attachments */}
          <div className="space-y-3">
             <div className="flex items-start gap-2">
                <span className="text-sm font-bold text-slate-400 mt-1 shrink-0">Attachments :</span>
                <div className="flex flex-wrap gap-2">
                  {visibleAttachments.length > 0 ? (
                    visibleAttachments.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-[#e8e9ff] text-[#523cf2] rounded-xl border border-[#d5d7ff] hover:bg-[#dbddff] transition-all">
                        <Paperclip size={12} className="stroke-[3]" />
                        <span className="text-[10px] font-black uppercase tracking-wider max-w-[200px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setRemovedAttachments(prev => [...prev, file.name])}
                          className="p-0.5 hover:bg-[#c3c5ff] rounded-full transition-colors flex items-center justify-center cursor-pointer ml-1 text-[#523cf2]"
                          title="Remove attachment"
                        >
                          <X size={11} className="stroke-[3]" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1.5">No documents attached</span>
                  )}
                </div>
             </div>
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
