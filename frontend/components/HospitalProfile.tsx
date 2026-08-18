
import React, { useEffect, useState, useRef } from 'react';
import { HospitalUser, WalletTransaction, AgreementType } from '../types';
import { usersApi } from '../services/api';
import { 
  Building, Stethoscope, Mail, Phone, MapPin, BadgeCheck, Save, Loader2, 
  CheckCircle2, User, Image as ImageIcon, Trash2, Zap, ShieldCheck, 
  FileText, CreditCard, UserCheck, Hash, Wallet, ArrowUpCircle, History as HistoryIcon,
  IndianRupee, ArrowDownCircle, Plus, X, Globe, ShieldPlus, ArrowUpRight,
  Lock, Calendar, Users, ChevronDown, AlertCircle, ListFilter, CalendarDays, Banknote,
  ToggleLeft, ToggleRight, Download, Receipt, Edit2, RefreshCw
} from 'lucide-react';

interface HospitalProfileProps {
  user: HospitalUser;
  onUpdate: (user: HospitalUser) => void;
}

type ProfileSubTab = 'Basic Details' | 'Financial Registry';

const HospitalProfile: React.FC<HospitalProfileProps> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState<HospitalUser>({ 
    ...user,
    walletBalance: user.walletBalance || 0,
    perCaseCharge: user.perCaseCharge || 150,
    agreementType: user.agreementType || 'Per Case',
    agreementValue: user.agreementValue || 150,
    agreementStartDate: user.agreementStartDate || '',
    agreementRenewalDate: user.agreementRenewalDate || '',
    tpaPersonName: user.tpaPersonName || '',
    tpaPersonMobile: user.tpaPersonMobile || '',
    bankName: user.bankName || '',
    accountNo: user.accountNo || '',
    ifscCode: user.ifscCode || '',
    accountHolderName: user.accountHolderName || user.hospitalName,
    transactions: user.transactions || []
  });

  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);
  const [error, setError] = useState('');
  const [processingImage, setProcessingImage] = useState<string | null>(null);
  
  // Tab State
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('Basic Details');
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      usersApi.getProfileAssetUrl(user.id, 'hospital-seal'),
      usersApi.getProfileAssetUrl(user.id, 'doctor-stamp'),
    ]).then(([seal, stamp]: any[]) => {
      if (cancelled) return;
      setFormData((current) => ({
        ...current,
        hospitalSeal: seal?.asset_url || current.hospitalSeal || '',
        hospitalSealStoragePath: seal?.storage_path || current.hospitalSealStoragePath,
        doctorStamp: stamp?.asset_url || current.doctorStamp || '',
        doctorStampStoragePath: stamp?.storage_path || current.doctorStampStoragePath,
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [user.id]);

  const handleFileUpload = async (field: 'hospitalSeal' | 'doctorStamp', file: File | null) => {
    if (!file) return;
    setProcessingImage(field);
    try {
      const kind = field === 'hospitalSeal' ? 'hospital-seal' : 'doctor-stamp';
      const storageField = field === 'hospitalSeal' ? 'hospitalSealStoragePath' : 'doctorStampStoragePath';
      const response: any = await usersApi.uploadProfileAsset(user.id, kind, file);
      const updatedData = {
        ...formData,
        [field]: response.asset_url,
        [storageField]: response.storage_path,
      };
      setFormData(updatedData);
      onUpdate(updatedData);
    } catch (err) {
      console.error("Image processing failed:", err);
      setError(err instanceof Error ? err.message : 'Unable to upload the image securely.');
    } finally {
      setProcessingImage(null);
    }
  };

  // --- Form Handlers ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passwordData.password && passwordData.password !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSaving(true);
    setSavedStatus(false);
    setTimeout(() => {
      onUpdate(formData);
      setIsSaving(false);
      setSavedStatus(true);
      setIsEditingBasic(false);
      setIsEditingAccount(false);
      setTimeout(() => setSavedStatus(false), 4000);
    }, 1200);
  };

  const handleChange = (field: keyof HospitalUser, value: any) => {
    let finalVal = value;
    if (typeof value === "string" && (field === 'mobileNo' || field === 'tpaPersonMobile' || field === 'doctorMobileNo')) {
      finalVal = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: finalVal }));
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
      
      {/* 1. IDENTITY HEADER */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] flex flex-col lg:flex-row items-center justify-between gap-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><Building size={200} /></div>
        
        <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
          <div className="w-32 h-32 bg-[#000080] text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl ring-8 ring-blue-50 group overflow-hidden relative transition-all hover:scale-[1.02]">
            <Building size={56} className="group-hover:scale-110 transition-transform duration-500" />
            {savedStatus && <div className="absolute inset-0 bg-emerald-600 flex items-center justify-center animate-in zoom-in"><CheckCircle2 size={48} /></div>}
          </div>
          <div className="text-center lg:text-left">
            <p className="text-[11px] font-black text-[#000080] uppercase tracking-[0.4em] mb-3">Hospital Profile</p>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-6">{formData.hospitalName || 'Institutional Registry'}</h1>
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4">
              <span className="px-5 py-2 bg-blue-50 text-[#000080] border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm">
                <BadgeCheck size={16} className="mr-2" /> Verified Partner
              </span>
              <span className="px-5 py-2 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center font-mono shadow-sm">
                <Hash size={16} className="mr-2" /> {formData.rohiniId || 'ROH-XXXX'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Wallet Summary in Header */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center gap-8 shadow-2xl relative overflow-hidden group min-w-[320px]">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-700"><Wallet size={120} /></div>
           <div className="relative z-10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Wallet Balance</p>
              <p className="text-4xl font-black tracking-tighter">₹{formData.walletBalance?.toLocaleString('en-IN')}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 2. MAIN CONTENT AREA */}
        <div className="lg:col-span-8 space-y-10">
            {error && (
              <div className="p-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-[2rem] text-xs font-black flex items-center animate-in slide-in-from-top-4">
                <AlertCircle size={20} className="mr-4" /> {error}
              </div>
            )}

            {/* TAB NAVIGATION */}
            <div className="flex bg-white p-1.5 rounded-2xl w-fit shadow-sm border border-slate-100">
              {(['Basic Details', 'Financial Registry'] as ProfileSubTab[]).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setProfileSubTab(tab)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${profileSubTab === tab ? 'bg-[#000080] text-white shadow-md' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* CONTENT: BASIC DETAILS */}
            {profileSubTab === 'Basic Details' && (
                <form onSubmit={handleSave} className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10 lg:p-12 space-y-10 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Institutional Identity</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry identification & contact protocols</p>
                    </div>
                    <button type="button" onClick={() => setIsEditingBasic(!isEditingBasic)} className={`p-3 rounded-xl transition-all ${isEditingBasic ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Edit2 size={20} /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2">
                      <ProfileInput label="Full Hospital Name" value={formData.hospitalName} onChange={(v: string) => handleChange('hospitalName', v)} icon={Building} required placeholder="Medicity Health Hub" isEditing={isEditingBasic} />
                    </div>
                    <ProfileInput label="Registered Address" value={formData.address} onChange={(v: string) => handleChange('address', v)} icon={MapPin} required isTextArea placeholder="Plot No 44, Institutional Area, Sector 12..." isEditing={isEditingBasic} />
                    <div className="grid grid-cols-1 gap-8">
                      <ProfileInput label="Rohini ID" value={formData.rohiniId} onChange={(v: string) => handleChange('rohiniId', v)} icon={ShieldCheck} required placeholder="ROH-12345678" isEditing={isEditingBasic} />
                      <ProfileInput label="Official Email ID" value={formData.emailId} onChange={(v: string) => handleChange('emailId', v)} icon={Mail} required placeholder="billing@hospital.com" isEditing={isEditingBasic} />
                      <ProfileInput label="Official Mobile No" value={formData.mobileNo} onChange={(v: string) => handleChange('mobileNo', v)} icon={Phone} required placeholder="+91 98XXX XXXXX" isEditing={isEditingBasic} />
                    </div>
                  </div>

                  {isEditingBasic && (
                    <div className="pt-8 border-t border-slate-100 flex justify-end space-x-4">
                        <button type="button" onClick={() => setIsEditingBasic(false)} className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="px-10 py-3 bg-[#000080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-900">Save Changes</button>
                    </div>
                  )}
                </form>
            )}

            {/* CONTENT: FINANCIAL REGISTRY */}
            {profileSubTab === 'Financial Registry' && (
              <form onSubmit={handleSave} className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10 lg:p-12 space-y-10 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-8">
                  <div>
                      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Bank & Tax Registry</h2>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Settlement accounts for claims</p>
                  </div>
                  <button type="button" onClick={() => setIsEditingAccount(!isEditingAccount)} className={`p-3 rounded-xl transition-all ${isEditingAccount ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Edit2 size={20} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ProfileInput label="Bank Name" value={formData.bankName} onChange={(v: string) => handleChange('bankName', v)} icon={Building} placeholder="HDFC Bank" isEditing={isEditingAccount} />
                  <ProfileInput label="Account Holder Name" value={formData.accountHolderName} onChange={(v: string) => handleChange('accountHolderName', v)} icon={User} placeholder="Hospital Legal Name" isEditing={isEditingAccount} />
                  <ProfileInput label="Account Number" value={formData.accountNo} onChange={(v: string) => handleChange('accountNo', v)} icon={Hash} placeholder="XXXXXXXXXXXX" isEditing={isEditingAccount} />
                  <ProfileInput label="IFSC Code" value={formData.ifscCode} onChange={(v: string) => handleChange('ifscCode', v)} icon={CodeIcon} placeholder="HDFC0001234" isEditing={isEditingAccount} />
                  <ProfileInput label="PAN Number" value={formData.panNo} onChange={(v: string) => handleChange('panNo', v)} icon={CreditCard} placeholder="ABCDE1234F" isEditing={isEditingAccount} />
                  <ProfileInput label="GST Number" value={formData.gstNo} onChange={(v: string) => handleChange('gstNo', v)} icon={Hash} placeholder="27ABCDE1234F1Z5" isEditing={isEditingAccount} />
                </div>

                {isEditingAccount && (
                  <div className="pt-8 border-t border-slate-100 flex justify-end space-x-4">
                      <button type="button" onClick={() => setIsEditingAccount(false)} className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                      <button type="submit" className="px-10 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700">Update Financials</button>
                  </div>
                )}
              </form>
            )}
        </div>

        {/* 3. SIDEBAR: ASSETS */}
        <div className="lg:col-span-4 space-y-10">
          
          {/* DIGITAL ASSETS */}
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10 space-y-10 hover:shadow-md transition-all">
             <div className="flex items-center gap-5 border-b border-slate-100 pb-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-inner"><ShieldPlus size={28} /></div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-slate-800">Digital Assets</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-linked to PDF Forms</p>
                </div>
             </div>
             <div className="space-y-8">
                <StampUpload 
                  label="Official Hospital Seal" 
                  value={formData.hospitalSeal} 
                  isProcessing={processingImage === 'hospitalSeal'}
                  onUpload={(file: File | null) => handleFileUpload('hospitalSeal', file)}
                  icon={ImageIcon}
                />
                <StampUpload 
                  label="Doctor Signature Stamp" 
                  value={formData.doctorStamp} 
                  isProcessing={processingImage === 'doctorStamp'}
                  onUpload={(file: File | null) => handleFileUpload('doctorStamp', file)}
                  icon={Stethoscope}
                />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Reusable Components ---

const ProfileInput = ({ label, value, onChange, icon: Icon, required, placeholder, isTextArea, type = "text", isEditing }: any) => (
  <div className="space-y-3 w-full group">
    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
      {label} {required && <span className="text-rose-500 ml-1 font-black">*</span>}
    </label>
    <div className="relative">
      <div className="absolute left-6 top-[22px] text-slate-300 group-focus-within:text-[#000080] transition-colors pointer-events-none">
        <Icon size={20} />
      </div>
      {isTextArea ? (
        <textarea 
          disabled={!isEditing}
          required={required} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
          className={`w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#000080] focus:bg-white transition-all shadow-sm resize-none h-32 ${!isEditing && 'opacity-60 cursor-not-allowed'}`}
        />
      ) : (
        <input 
          disabled={!isEditing}
          required={required} 
          type={type} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
          className={`w-full pl-16 pr-6 py-5 h-16 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#000080] focus:bg-white transition-all shadow-sm ${!isEditing && 'opacity-60 cursor-not-allowed'}`}
        />
      )}
    </div>
  </div>
);

const StampUpload = ({ label, value, isProcessing, onUpload, icon: Icon }: any) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center gap-6 group hover:border-blue-100 transition-all">
         <div className="w-40 h-40 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center overflow-hidden shadow-inner relative group-hover:border-blue-200 transition-all">
            {value ? (
              <img src={value} alt="Stamp" className="w-full h-full object-contain p-4 animate-in fade-in zoom-in" />
            ) : (
              <Icon className="text-slate-200 group-hover:text-blue-100 transition-colors" size={48} />
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                 <Loader2 size={32} className="text-blue-600 animate-spin" />
              </div>
            )}
         </div>
         <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0] || null)} />
         <button 
          type="button" 
          onClick={() => inputRef.current?.click()} 
          className="w-full py-3 bg-white border-2 border-slate-200 text-[9px] font-black uppercase tracking-widest text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg transition-all active:scale-95"
        >
          {value ? 'Replace Asset' : 'Upload Asset'}
        </button>
      </div>
    </div>
  );
};

// Helper Icon for Code
const CodeIcon = ({size, className}: {size:number, className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
)

export default HospitalProfile;
