
import React, { useState, useMemo } from 'react';
import { Claim, ClaimStatus, ClaimStage, FormField, TimelineEvent, HospitalUser } from '../types';
import { FastDOBPicker } from './FastDOBPicker';
import { 
  X, Save, User, ClipboardList, ShieldCheck, 
  History, Plus, Trash2, Edit2, AlertTriangle,
  Calendar, Hash, Activity, MessageSquare,
  ChevronDown, ChevronUp, CheckCircle, UploadCloud, FileText
} from 'lucide-react';

interface SuperAdminClaimEditorProps {
  claim: Claim;
  onSave: (updatedClaim: Claim) => void;
  onClose: () => void;
  stages: ClaimStage[];
  fields: FormField[];
  currentUser: HospitalUser;
}

const SuperAdminClaimEditor: React.FC<SuperAdminClaimEditorProps> = ({
  claim,
  onSave,
  onClose,
  stages,
  fields,
  currentUser
}) => {
  const [editedClaim, setEditedClaim] = useState<Claim>({ ...claim });
  const [activeSection, setActiveSection] = useState<'patient' | 'clinical' | 'insurance' | 'history'>('patient');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const handlePatientChange = (key: string, value: any) => {
    setEditedClaim(prev => ({
      ...prev,
      formData: { ...prev.formData, [key]: value },
      patientName: key === 'p_name' ? value : prev.patientName
    }));
  };

  const handleClaimChange = (key: string, value: any) => {
    setEditedClaim(prev => ({
      ...prev,
      [key]: value,
      formData: { ...prev.formData, [key]: value }
    }));
  };

  const handleHistoryEventChange = (eventId: string, field: keyof TimelineEvent, value: any) => {
    setEditedClaim(prev => ({
      ...prev,
      history: prev.history.map(ev => ev.id === eventId ? { ...ev, [field]: value } : ev)
    }));
  };

  const handleStageDataChange = (eventId: string, key: string, value: any) => {
    setEditedClaim(prev => ({
      ...prev,
      history: prev.history.map(ev => 
        ev.id === eventId 
          ? { ...ev, stageData: { ...(ev.stageData || {}), [key]: value } }
          : ev
      )
    }));
  };

  const deleteHistoryEvent = (eventId: string) => {
    setEditedClaim(prev => ({
      ...prev,
      history: prev.history.filter(ev => ev.id !== eventId)
    }));
  };

  const addNewHistoryEvent = () => {
    const newEvent: TimelineEvent = {
      id: `ev-manual-${Date.now()}`,
      status: ClaimStatus.DRAFT,
      date: new Date().toISOString(),
      comment: 'Manual entry by Super Admin',
      type: 'status_change',
      stageData: {},
      userName: currentUser.displayName || currentUser.username || "System"
    };
    setEditedClaim(prev => ({
      ...prev,
      history: [newEvent, ...prev.history]
    }));
    setEditingEventId(newEvent.id);
  };

  const getFieldsForSection = (section: string) => {
    return fields.filter(f => f.section === section);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[500] flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        {/* HEADER */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl">
              <Edit2 size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Super Admin Claim Editor</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Full System Override Mode • Case ID: {claim.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={onClose}
              className="p-4 text-slate-400 hover:bg-white hover:text-slate-600 rounded-2xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex overflow-hidden">
          {/* SIDEBAR NAVIGATION */}
          <div className="w-64 border-r border-slate-100 p-6 space-y-2 bg-slate-50/30">
            <NavButton 
              active={activeSection === 'patient'} 
              onClick={() => setActiveSection('patient')} 
              icon={User} 
              label="Patient Dashboard" 
            />
            <NavButton 
              active={activeSection === 'clinical'} 
              onClick={() => setActiveSection('clinical')} 
              icon={ClipboardList} 
              label="Clinical Details" 
            />
            <NavButton 
              active={activeSection === 'insurance'} 
              onClick={() => setActiveSection('insurance')} 
              icon={ShieldCheck} 
              label="Insurance Info" 
            />
            <NavButton 
              active={activeSection === 'history'} 
              onClick={() => setActiveSection('history')} 
              icon={History} 
              label="Stages & Timeline" 
            />
          </div>

          {/* EDITOR PANEL */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {activeSection === 'patient' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <SectionTitle icon={User} title="Patient Demographic Data" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputGroup label="Patient Full Name" value={editedClaim.patientName} onChange={v => handlePatientChange('p_name', v)} />
                  <InputGroup label="Gender" value={editedClaim.formData?.p_gender} onChange={v => handlePatientChange('p_gender', v)} type="select" options={['Male', 'Female', 'Other']} />
                  <InputGroup label="Date of Birth" value={editedClaim.formData?.p_dob} onChange={v => handlePatientChange('p_dob', v)} type="date" />
                  <InputGroup label="Contact Number" value={editedClaim.formData?.p_contact} onChange={v => handlePatientChange('p_contact', v)} />
                  <InputGroup label="UHID / IPD No" value={editedClaim.formData?.p_uhid} onChange={v => handlePatientChange('p_uhid', v)} />
                  <InputGroup label="Address" value={editedClaim.formData?.p_address} onChange={v => handlePatientChange('p_address', v)} type="textarea" />
                </div>
              </div>
            )}

            {activeSection === 'clinical' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <SectionTitle icon={ClipboardList} title="Clinical & Financial Data" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputGroup label="Primary Diagnosis" value={editedClaim.diagnosis} onChange={v => handleClaimChange('diagnosis', v)} />
                  <InputGroup label="Estimated Cost" value={editedClaim.estimatedCost} onChange={v => handleClaimChange('estimatedCost', Number(v))} type="number" />
                  <InputGroup label="Admission Date" value={editedClaim.admissionDate} onChange={v => handleClaimChange('admissionDate', v)} type="date" />
                  <InputGroup label="Doctor Name" value={editedClaim.formData?.dr_name} onChange={v => handlePatientChange('dr_name', v)} />
                  <InputGroup label="ICD Code" value={editedClaim.formData?.m_icd_code} onChange={v => handlePatientChange('m_icd_code', v)} />
                  <InputGroup label="Hospital Stay (Days)" value={editedClaim.formData?.adm_stay_days} onChange={v => handlePatientChange('adm_stay_days', v)} type="number" />
                </div>
              </div>
            )}

            {activeSection === 'insurance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <SectionTitle icon={ShieldCheck} title="Insurance & Payer Data" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputGroup label="Insurance Provider" value={editedClaim.insuranceProvider} onChange={v => handleClaimChange('insuranceProvider', v)} />
                  <InputGroup label="Policy Number" value={editedClaim.policyNumber} onChange={v => handleClaimChange('policyNumber', v)} />
                  <InputGroup label="TPA Provider" value={editedClaim.formData?.tpa_provider} onChange={v => handlePatientChange('tpa_provider', v)} />
                  <InputGroup label="Payer Member ID" value={editedClaim.formData?.p_card_id} onChange={v => handlePatientChange('p_card_id', v)} />
                  <InputGroup label="Current Status" value={editedClaim.status} onChange={v => handleClaimChange('status', v)} type="select" options={Object.values(ClaimStatus)} />
                </div>
              </div>
            )}

            {activeSection === 'history' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <SectionTitle icon={History} title="Stages & Timeline History" />
                  <button 
                    onClick={addNewHistoryEvent}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center shadow-lg"
                  >
                    <Plus size={16} className="mr-2" /> Add Stage Entry
                  </button>
                </div>

                <div className="space-y-4">
                  {editedClaim.history.map((event, idx) => (
                    <div 
                      key={event.id} 
                      className={`border rounded-3xl overflow-hidden transition-all ${editingEventId === event.id ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-xl' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
                    >
                      <div 
                        className={`p-6 flex items-center justify-between cursor-pointer ${editingEventId === event.id ? 'bg-indigo-50/50' : 'bg-white'}`}
                        onClick={() => setEditingEventId(editingEventId === event.id ? null : event.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${event.status.includes('Approved') ? 'bg-emerald-100 text-emerald-600' : event.status.includes('Rejected') ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Activity size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{event.status}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(event.date).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteHistoryEvent(event.id); }}
                            className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                          {editingEventId === event.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </div>
                      </div>

                      {editingEventId === event.id && (
                        <div className="p-8 border-t border-slate-100 bg-white space-y-6 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Status" value={event.status} onChange={v => handleHistoryEventChange(event.id, 'status', v)} type="select" options={Object.values(ClaimStatus)} />
                            <InputGroup label="Date" value={event.date.split('T')[0]} onChange={v => handleHistoryEventChange(event.id, 'date', new Date(v).toISOString())} type="date" />
                            <div className="md:col-span-2">
                              <InputGroup label="Updated By (User Name)" value={event.userName} onChange={v => handleHistoryEventChange(event.id, 'userName', v)} />
                            </div>
                            <div className="md:col-span-2">
                              <InputGroup label="Comment / Remarks" value={event.comment} onChange={v => handleHistoryEventChange(event.id, 'comment', v)} type="textarea" />
                            </div>
                          </div>

                          <div className="pt-6 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Stage Specific Data (JSON Payload)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {Object.entries(event.stageData || {}).map(([key, val]) => (
                                <div key={key} className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{key.replace(/_/g, ' ')}</label>
                                  <input 
                                    type="text" 
                                    value={String(val)} 
                                    onChange={e => handleStageDataChange(event.id, key, e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50"
                                  />
                                </div>
                              ))}
                              {Object.keys(event.stageData || {}).length === 0 && (
                                <p className="text-xs font-medium text-slate-400 italic">No stage-specific data recorded for this entry.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-amber-600">
            <AlertTriangle size={20} />
            <p className="text-xs font-bold uppercase tracking-tight">Changes made here bypass all workflow logic</p>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={onClose}
              className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
              Discard Changes
            </button>
            <button 
              onClick={() => onSave(editedClaim)}
              className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl flex items-center transition-all active:scale-95"
            >
              <Save size={18} className="mr-2" /> Save System Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// HELPER COMPONENTS
const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}
  >
    <Icon size={20} />
    <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const SectionTitle: React.FC<{ icon: any, title: string }> = ({ icon: Icon, title }) => (
  <div className="flex items-center space-x-4 border-b border-slate-100 pb-4">
    <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
      <Icon size={20} />
    </div>
    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{title}</h3>
  </div>
);

const InputGroup: React.FC<{ label: string, value: any, onChange: (v: string) => void, type?: string, options?: string[] }> = ({ label, value, onChange, type = 'text', options = [] }) => {
  const isMobile = label.toLowerCase().includes("mobile") || label.toLowerCase().includes("phone") || label.toLowerCase().includes("contact");
  const displayType = isMobile ? "text" : type;

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">{label}</label>
      {type === 'textarea' ? (
        <textarea 
          value={value || ''} 
          onChange={e => onChange(e.target.value)}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 min-h-[100px]"
        />
      ) : type === 'select' ? (
        <select 
          value={value || ''} 
          onChange={e => onChange(e.target.value)}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50"
        >
          <option value="">Select Option</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : type === 'date' && (label === 'Date of Birth' || label.toLowerCase().includes('birth') || label.toLowerCase().includes('dob')) ? (
        <FastDOBPicker
          value={value}
          onChange={onChange}
          placeholder={label}
        />
      ) : (
        <div className="relative group">
          <input 
            type={displayType}
            value={value || ''} 
            onChange={e => {
              let val = e.target.value;
              if (isMobile) {
                val = val.replace(/\D/g, '').slice(0, 10);
              }
              onChange(val);
            }}
            onKeyDown={(e) => {
              if (type === "date") {
                if (e.key !== "Tab" && e.key !== "Escape") {
                  e.preventDefault();
                }
              }
            }}
            onClick={(e) => {
              if (type === "date") {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {
                  console.log("showPicker not supported", err);
                }
              }
            }}
            className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 ${type === "date" ? "cursor-pointer select-none" : ""}`}
          />
        </div>
      )}
    </div>
  );
};

export default SuperAdminClaimEditor;
