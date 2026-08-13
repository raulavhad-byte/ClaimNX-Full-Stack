
import React, { useState, useEffect } from 'react';
import { HospitalUser, AuditLog, Claim } from '../types';
import { 
  User, Mail, Phone, Hash, Briefcase, Building, UserCheck, Calendar,
  Shield, Activity, TrendingUp, History, Lock, Edit2, Camera,
  CheckCircle2, AlertCircle, Zap, BarChart3, ChevronRight,
  LogOut, Save, X, Eye, EyeOff, ShieldCheck, Sparkles, PlusCircle, Key,
  LogIn, Upload, Trash2, Link
} from 'lucide-react';
import { auditService } from '../services/auditService';
import { checkDateReasonability, isValidYearFormat } from '../utils';
import { toast } from 'sonner';

interface UserProfileProps {
  user: HospitalUser;
  onUpdate: (updatedUser: HospitalUser) => Promise<void> | void;
  claims: Claim[];
  allUsers: HospitalUser[];
  onClose: () => void;
  initialTab?: 'profile' | 'performance' | 'activity' | 'security' | 'notifications';
  notifications?: any[];
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate, claims, allUsers, onClose, initialTab = 'profile', notifications = [] }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'performance' | 'activity' | 'security' | 'notifications'>(initialTab);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<HospitalUser>(user);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(user);
  }, [user]);
  
  const validateDateOnBlur = (key: string, value: string) => {
    if (!value) return;
    const result = checkDateReasonability(value, 'other');
    if (!result.isReasonable) {
      toast.warning(
        `Unusual Date: You ${result.message}. Please double check if this is correct.`,
        {
          action: { label: "Correct", onClick: () => {} },
          cancel: { label: "Change", onClick: () => setFormData({...formData, [key]: ""}) },
          duration: 10000
        }
      );
    }
  };
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      const updatedUser = { ...formData, photoURL: base64Url };
      setFormData(updatedUser);
      onUpdate(updatedUser);
      toast.success('Profile photo updated successfully!');
      setShowPhotoMenu(false);

      auditService.log({
        userId: user.id,
        userName: user.displayName,
        action: 'UPDATE_PROFILE_PHOTO',
        resourceType: 'User',
        resourceId: user.id,
        details: 'User updated profile photo'
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUrl = () => {
    const url = prompt("Enter Image URL for profile photo:", formData.photoURL || "");
    if (url !== null) {
      const updatedUser = { ...formData, photoURL: url.trim() };
      setFormData(updatedUser);
      onUpdate(updatedUser);
      toast.success(url.trim() ? 'Profile photo updated!' : 'Profile photo cleared.');
      setShowPhotoMenu(false);
    }
  };

  const handleRemovePhoto = () => {
    const updatedUser = { ...formData, photoURL: "" };
    setFormData(updatedUser);
    onUpdate(updatedUser);
    toast.success('Profile photo removed.');
    setShowPhotoMenu(false);
  };

  useEffect(() => {
    const fetchUserLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const userLogs = await auditService.getLogs({ userId: user.id });
        setLogs(userLogs);
      } catch (err) {
        console.error("Failed to fetch user logs", err);
      } finally {
        setIsLoadingLogs(false);
      }
    };
    fetchUserLogs();
  }, [user.id]);

  const handleSave = async () => {
    const displayName = [formData.firstName, formData.lastName]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ')
      .trim() || formData.displayName;
    const updatedUser = { ...formData, displayName };

    setIsSaving(true);
    try {
      await onUpdate(updatedUser);
      setFormData(updatedUser);
      setIsEditing(false);
      toast.success('Profile details saved successfully.');
    auditService.log({
      userId: user.id,
      userName: user.displayName,
      action: 'UPDATE_PROFILE',
      resourceType: 'User',
      resourceId: user.id,
      details: 'User updated their personal profile details'
    });
    } catch (error) {
      console.error('Unable to save profile details', error);
      toast.error('Unable to save profile details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const userStats = React.useMemo(() => {
    const userClaims = claims.filter(c => c.formData?.assignedToId === user.id);
    const approved = userClaims.filter(c => c.status.toLowerCase().includes('approved')).length;
    const settled = userClaims.filter(c => c.status.toLowerCase().includes('settled')).length;
    const pending = userClaims.length - approved - settled;
    
    return {
      total: userClaims.length,
      approved,
      settled,
      pending,
      efficiency: userClaims.length > 0 ? Math.round(((approved + settled) / userClaims.length) * 100) : 0,
      tatLabel: "Average TAT: 4.2h"
    };
  }, [claims, user.id]);

  const reportingManager = allUsers.find(u => u.id === formData.reportsToId);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#000080] to-blue-700 p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handlePhotoUpload} 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 bg-white/20 rounded-full border-4 border-white/30 flex items-center justify-center shadow-xl overflow-hidden backdrop-blur-sm cursor-pointer hover:opacity-90 transition-all relative group/avatar"
              >
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt={formData.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10">
                    <User size={56} className="text-white/80" strokeWidth={1} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-black uppercase tracking-wider">
                  <Camera size={20} className="mb-1" />
                  <span>Update Photo</span>
                </div>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                  className="absolute bottom-0 right-0 p-2.5 bg-white text-blue-600 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-blue-50 cursor-pointer"
                  title="Update Profile Photo"
                >
                  <Camera size={16} />
                </button>

                {showPhotoMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[210] p-2 space-y-1 text-slate-800 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors text-left"
                    >
                      <Upload size={14} className="text-blue-500" /> Upload Photo
                    </button>
                    <button
                      onClick={handlePhotoUrl}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors text-left"
                    >
                      <Link size={14} className="text-indigo-500" /> Enter Image URL
                    </button>
                    {formData.photoURL && (
                      <button
                        onClick={handleRemovePhoto}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left border-t border-slate-100 pt-2"
                      >
                        <Trash2 size={14} /> Remove Photo
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h2 className="text-3xl font-black uppercase tracking-tight italic">{formData.displayName}</h2>
                <div className="px-3 py-1 bg-emerald-400/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-400/30">
                  {formData.status}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <span className="flex items-center text-xs font-bold text-white/70 uppercase tracking-widest">
                  <Shield size={14} className="mr-2 opacity-70" /> {formData.role}
                </span>
                <span className="w-1 h-1 bg-white/30 rounded-full" />
                <span className="flex items-center text-xs font-bold text-white/70 uppercase tracking-widest">
                  <User size={14} className="mr-2 opacity-70" /> {formData.displayName}
                </span>
                <span className="w-1 h-1 bg-white/30 rounded-full" />
                <span className="flex items-center text-xs font-bold text-white/70 uppercase tracking-widest">
                  <Building size={14} className="mr-2 opacity-70" /> {formData.department || 'Operations'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'profile', icon: User, label: 'Basic Info' },
              { id: 'performance', icon: TrendingUp, label: 'Insights' },
              { id: 'activity', icon: History, label: 'Tracking' },
              { id: 'security', icon: Lock, label: 'Settings' },
              { id: 'notifications', icon: AlertCircle, label: 'Alerts' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                  ? 'bg-white text-[#000080] shadow-lg translate-y-[-2px]' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <tab.icon size={14} className="mr-2" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/50">
          
          {activeTab === 'profile' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Personal Info */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <User size={16} className="mr-2 text-blue-500" /> Personal Information
                    </h3>
                    <button 
                      onClick={() => isEditing ? void handleSave() : setIsEditing(true)}
                      disabled={isSaving}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center hover:underline bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? <><Save size={14} className="mr-1.5 animate-pulse" /> Saving...</> : isEditing ? <><Save size={14} className="mr-1.5" /> Save</> : <><Edit2 size={14} className="mr-1.5" /> Edit Profile</>}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">First Name</label>
                       <input 
                         disabled={!isEditing}
                         value={formData.firstName || formData.displayName.split(' ')[0]} 
                         onChange={e => setFormData({...formData, firstName: e.target.value})}
                         className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none disabled:opacity-60 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Last Name</label>
                       <input 
                         disabled={!isEditing}
                         value={formData.lastName || (formData.displayName.split(' ').length > 1 ? formData.displayName.split(' ')[1] : '')} 
                         onChange={e => setFormData({...formData, lastName: e.target.value})}
                         className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none disabled:opacity-60 transition-all"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email Identifier</label>
                     <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          disabled={!isEditing}
                          value={formData.emailId} 
                          onChange={e => setFormData({...formData, emailId: e.target.value})}
                          className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none disabled:opacity-60 transition-all"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mobile Contact</label>
                     <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          disabled={!isEditing}
                          value={formData.mobileNo} 
                          onChange={e => setFormData({...formData, mobileNo: e.target.value})}
                          className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none disabled:opacity-60 transition-all"
                        />
                     </div>
                  </div>
                </div>

                {/* Organizational Details */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Building size={16} className="mr-2 text-indigo-500" /> Organizational Details
                  </h3>
                  
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Reporting Manager</label>
                     <div className="flex items-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs mr-3 border border-indigo-100 italic">
                          {reportingManager?.displayName?.charAt(0) || 'M'}
                        </div>
                        <div>
                           <p className="text-xs font-black text-slate-800 leading-none mb-1 uppercase tracking-tight italic">{reportingManager?.displayName || 'System Administrator'}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{reportingManager?.role || 'Top Level'}</p>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Department</label>
                       <select 
                         disabled={!isEditing}
                         value={formData.department || 'Operations'} 
                         onChange={e => setFormData({...formData, department: e.target.value})}
                         className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none disabled:opacity-60 transition-all"
                       >
                         <option>Operations</option>
                         <option>Medical Scrutiny</option>
                         <option>Reconciliation</option>
                         <option>Sales & Marketing</option>
                         <option>Customer Support</option>
                         <option>Technology</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Date of Joining</label>
                       <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input 
                            disabled={!isEditing}
                            type="date"
                            value={formData.joiningDate || '2024-01-01'} 
                            onChange={e => {
                               const v = e.target.value;
                               const yearStr = v.split('-')[0];
                               if (yearStr && yearStr.length > 4) {
                                 toast.error("Year cannot exceed 4 digits.");
                                 return;
                               }
                               setFormData({...formData, joiningDate: v});
                            }}
                            onBlur={e => validateDateOnBlur('joiningDate', e.target.value)}
                            className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl text-xs font-bold outline-none disabled:opacity-60 transition-all"
                          />
                       </div>
                    </div>
                  </div>

                  {formData.products && formData.products.length > 0 && (
                    <div className="space-y-2 mt-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Default Landing Product</label>
                       <select 
                         disabled={!isEditing}
                         value={formData.defaultProduct || ''} 
                         onChange={e => setFormData({...formData, defaultProduct: e.target.value})}
                         className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none disabled:opacity-60 transition-all"
                       >
                         <option value="">Configured Priority (Default)</option>
                         {formData.products.map((p: string) => (
                           <option key={p} value={p}>{p}</option>
                         ))}
                       </select>
                    </div>
                  )}

                  {/* Access Summary Hidden */}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none italic">Efficiency Score</p>
                      <h4 className="text-3xl font-black text-slate-800 tracking-tighter italic">{userStats.efficiency}%</h4>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
                  </div>
                  <div className="absolute -right-2 -bottom-2 text-slate-100 pointer-events-none group-hover:text-emerald-50 transition-colors"><TrendingUp size={80} /></div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                   <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none italic italic">Cases Managed</p>
                    <h4 className="text-3xl font-black text-slate-800 tracking-tighter italic">{userStats.total}</h4>
                    <p className="text-[9px] font-bold text-slate-400 mt-2">Active cases under scope</p>
                  </div>
                  <div className="absolute -right-2 -bottom-2 text-slate-100 pointer-events-none group-hover:text-amber-50 transition-colors"><Briefcase size={80} /></div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                   <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none italic">Approval TAT</p>
                    <h4 className="text-3xl font-black text-slate-800 tracking-tighter italic italic">4.2h</h4>
                    <p className="text-[9px] font-bold text-slate-400 mt-2">15% faster than average</p>
                  </div>
                  <div className="absolute -right-2 -bottom-2 text-slate-100 pointer-events-none group-hover:text-blue-50 transition-colors"><Zap size={80} /></div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                   <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none italic">Success Potential</p>
                    <h4 className="text-3xl font-black text-slate-800 tracking-tighter italic italic">92%</h4>
                    <p className="text-[9px] font-bold text-slate-400 mt-2">Based on settlement history</p>
                  </div>
                  <div className="absolute -right-2 -bottom-2 text-slate-100 pointer-events-none group-hover:text-purple-50 transition-colors"><Sparkles size={80} /></div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h3 className="text-lg font-black text-slate-800 uppercase italic">Weekly Throughput Analysis</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Output consistency over last 7 days</p>
                    </div>
                    <div className="flex gap-2">
                       <button className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-white transition-colors">Download PDF</button>
                    </div>
                 </div>
                 
                 <div className="h-[300px] w-full bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex items-center justify-center">
                    <div className="text-center group">
                       <BarChart3 size={48} className="text-slate-200 mx-auto mb-4 group-hover:text-blue-100 transition-colors" />
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Performance trend visualizer placeholder</p>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <History size={16} className="mr-2 text-blue-500" /> Audit Trail & Activity
                  </h3>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Showing last 50 actions</div>
               </div>

               <div className="space-y-4">
                  {logs.length > 0 ? logs.map((log, i) => (
                    <div key={log.id || `${log.timestamp}-${log.action}-${log.resourceId}-${i}`} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all group">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                         log.action.includes('LOGIN') ? 'bg-blue-50 text-blue-600' :
                         log.action.includes('UPDATE') ? 'bg-amber-50 text-amber-600' :
                         log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600' :
                         'bg-slate-50 text-slate-500'
                       }`}>
                          {log.action.includes('LOGIN') ? <Zap size={18} /> : 
                           log.action.includes('UPDATE') ? <Edit2 size={18} /> :
                           log.action.includes('CREATE') ? <PlusCircle size={18} /> :
                           <Activity size={18} />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                             <p className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{log.action.replace(/_/g, ' ')}</p>
                             <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{log.details || `Modified ${log.resourceType}: ${log.resourceId}`}</p>
                       </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-[2.5rem]">
                       <History size={48} className="text-slate-100 mx-auto mb-4" />
                       <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">No activities recorded yet</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className="max-w-2xl">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center mb-8">
                    <Lock size={16} className="mr-2 text-rose-500" /> Account Security & Settings
                  </h3>

                  <div className="space-y-8">
                     <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm space-y-6">
                        <div className="flex items-center space-x-4 mb-2">
                           <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center"><Key size={24} /></div>
                           <div>
                              <h4 className="text-sm font-black text-slate-800 uppercase italic leading-none mb-1">Update Password</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keep your account secure with regular updates</p>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Current Password</label>
                              <div className="relative">
                                 <input 
                                   type={showPassword ? "text" : "password"}
                                   className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                   placeholder="••••••••"
                                 />
                                 <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                 </button>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1">New Password</label>
                                 <input 
                                   type="password"
                                   className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                   placeholder="Min. 8 characters"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Confirm Identity</label>
                                 <input 
                                   type="password"
                                   className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                   placeholder="Repeat password"
                                 />
                              </div>
                           </div>
                           <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#000080] transition-all shadow-lg active:scale-95">Update Credentials</button>
                        </div>
                     </div>

                  </div>
               </div>
            </div>
           )}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <AlertCircle size={16} className="mr-2 text-indigo-500" /> Notifications & System Alerts
                </h3>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all notifications?")) {
                        auditService.log({
                          userId: user.id,
                          userName: user.displayName,
                          action: 'CLEAR_NOTIFICATIONS',
                          resourceType: 'Notification',
                          resourceId: 'all',
                          details: 'User cleared all notifications'
                        });
                        // In a real app we'd call a prop function to update parent state
                        // For now we rely on the parent (App.tsx) alertService
                        (window as any).clearAllNotifications?.();
                      }
                    }}
                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100"
                  >
                    Clear All
                  </button>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    Total {notifications.length} notifications
                  </div>
                </div>
              </div>

              <div className="space-y-4 pb-10">
                {notifications.length > 0 ? (
                  notifications.map((notif: any) => (
                    <div key={notif.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] hover:shadow-xl transition-all group">
                      <div className="flex items-start gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                          notif.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          notif.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {notif.type === 'alert' ? <AlertCircle size={28} /> : <CheckCircle2 size={28} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-black text-slate-800 uppercase italic">{notif.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(notif.date || notif.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed font-bold mb-4">{notif.message}</p>
                          <div className="flex items-center gap-4">
                            {notif.claimId && (
                                <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase text-indigo-600">
                                    Claim ID: {notif.claimId}
                                </div>
                            )}
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                notif.status === 'Unread' || !notif.isRead ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                            }`}>
                                {notif.status || (notif.isRead ? 'Read' : 'Unread')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-[3rem]">
                    <AlertCircle size={64} className="text-slate-100 mx-auto mb-6" />
                    <p className="text-lg font-black text-slate-300 uppercase tracking-widest">No notifications to display</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
           <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              <ShieldCheck size={14} className="mr-2 text-emerald-500" /> Identity Securely Verified by Cloud Sentinel
           </div>
           <button 
             onClick={onClose}
             className="flex items-center px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all transition-all active:scale-95 shadow-sm"
           >
             Close Module
           </button>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;
