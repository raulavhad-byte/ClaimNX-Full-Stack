import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Trash2, Edit2, Play, Pause, AlertTriangle, 
  CheckCircle2, Info, Users, MapPin, Building, ShieldAlert, 
  Clock, X, Check, Eye, HelpCircle, Activity, Globe, FileText
} from 'lucide-react';
import { HospitalUser, InsuranceEntity, Role, Product } from '../types';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'information' | 'success' | 'warning' | 'critical';
  startDateTime: string;
  endDateTime: string;
  isActive: boolean;
  neverExpire?: boolean;
  displayTypes: ('banner' | 'marquee' | 'popup' | 'card')[];
  
  // Custom colors
  backgroundColor?: string;
  textColor?: string;
  
  // Targeting criteria (multiple allowed)
  targetAll: boolean;
  targetRoles: string[];
  targetHospitals: string[];
  targetProducts: string[];
  targetZones: string[];
  targetStates: string[];
  targetCities: string[];
  targetInsurers: string[];
  targetTpas: string[];

  // Audit Info
  createdBy: string;
  createdDate: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface Acknowledgement {
  announcementId: string;
  userName: string;
  userRole: string;
  timestamp: string;
}

interface SystemAnnouncementsProps {
  currentUser: HospitalUser;
  hospitals: HospitalUser[];
  hospitalUsers: HospitalUser[];
  insurers: InsuranceEntity[];
  tpas: InsuranceEntity[];
  roles: Role[];
}

export const getPreviewPriorityColors = (
  priority: Announcement['priority'], 
  customBg?: string, 
  customText?: string
) => {
  if (customBg) {
    return {
      bg: customBg,
      text: customText || '#ffffff',
      badgeBg: 'rgba(255,255,255,0.15)',
      badgeText: customText || '#ffffff'
    };
  }
  switch (priority) {
    case 'critical':
      return { bg: '#dc2626', text: '#ffffff', badgeBg: '#fee2e2', badgeText: '#dc2626' };
    case 'warning':
      return { bg: '#f59e0b', text: '#1e293b', badgeBg: '#fef3c7', badgeText: '#d97706' };
    case 'success':
      return { bg: '#10b981', text: '#ffffff', badgeBg: '#d1fae5', badgeText: '#059669' };
    case 'information':
    default:
      return { bg: '#4f46e5', text: '#ffffff', badgeBg: '#e0e7ff', badgeText: '#4f46e5' };
  }
};

export const getActiveAnnouncements = (user: HospitalUser, activeProduct?: Product): Announcement[] => {
  if (!user) return [];
  try {
    const raw = localStorage.getItem('claimnx_system_announcements');
    if (!raw) return [];
    
    const announcements: Announcement[] = JSON.parse(raw);
    const now = new Date();

    return announcements.filter(ann => {
      // 1. Must be active
      if (!ann.isActive) return false;
      
      // 2. Validate current time with Start & End times
      const start = new Date(ann.startDateTime);
      if (now < start) return false;
      
      if (!ann.neverExpire) {
        const end = new Date(ann.endDateTime);
        if (now > end) return false;
      }

      // 3. Evaluate Targeting criteria (If targetAll is true, bypass specific criteria)
      if (ann.targetAll) return true;

      let matched = false;

      // Check Role
      if (ann.targetRoles && ann.targetRoles.length > 0) {
        if (ann.targetRoles.some(r => user.role?.toUpperCase() === r.toUpperCase())) {
          matched = true;
        }
      }

      // Check Hospital ID or Name
      if (ann.targetHospitals && ann.targetHospitals.length > 0) {
        if (user.hospitalId && ann.targetHospitals.includes(user.hospitalId)) {
          matched = true;
        }
      }

      // Check Products
      if (ann.targetProducts && ann.targetProducts.length > 0) {
        // Match user's assigned products or currently focused product
        const userProds = user.products || [];
        if (activeProduct && ann.targetProducts.includes(activeProduct)) {
          matched = true;
        } else if (userProds.some(p => ann.targetProducts.includes(p))) {
          matched = true;
        }
      }

      // Check Zone
      if (ann.targetZones && ann.targetZones.length > 0) {
        if (user.zone && ann.targetZones.some(z => z.toUpperCase() === user.zone?.toUpperCase())) {
          matched = true;
        }
      }

      // Check State
      if (ann.targetStates && ann.targetStates.length > 0) {
        if (user.state && ann.targetStates.some(s => s.toUpperCase() === user.state?.toUpperCase())) {
          matched = true;
        }
      }

      // Check City
      if (ann.targetCities && ann.targetCities.length > 0) {
        const userCity = user.location || user.district || '';
        if (userCity && ann.targetCities.some(c => userCity.toLowerCase().includes(c.toLowerCase()))) {
          matched = true;
        }
      }

      // Check Insurers
      if (ann.targetInsurers && ann.targetInsurers.length > 0) {
        // If user is connected with allowed insurers or has specific portal creds
        const userInsurers = user.portalCredentials?.map(c => c.entityId) || [];
        if (userInsurers.some(id => ann.targetInsurers.includes(id))) {
          matched = true;
        }
      }

      // Check TPAs
      if (ann.targetTpas && ann.targetTpas.length > 0) {
        const userTPAs = user.portalCredentials?.map(c => c.entityId) || [];
        if (userTPAs.some(id => ann.targetTpas.includes(id))) {
          matched = true;
        }
      }

      // If any of the target parameters were specified but none matched, matching fails
      const hasSpecificTargeting = 
        (ann.targetRoles?.length > 0) || 
        (ann.targetHospitals?.length > 0) || 
        (ann.targetProducts?.length > 0) || 
        (ann.targetZones?.length > 0) || 
        (ann.targetStates?.length > 0) || 
        (ann.targetCities?.length > 0) || 
        (ann.targetInsurers?.length > 0) || 
        (ann.targetTpas?.length > 0);

      if (hasSpecificTargeting && !matched) {
        return false;
      }

      return true;
    });
  } catch (err) {
    console.error('Error fetching active announcements', err);
    return [];
  }
};

export const acknowledgeAnnouncement = (announcementId: string, userName: string, userRole: string) => {
  try {
    const raw = localStorage.getItem('claimnx_announcement_acknowledgements');
    const acks: Acknowledgement[] = raw ? JSON.parse(raw) : [];
    
    // Check if copy already exists
    const exists = acks.some(a => a.announcementId === announcementId && a.userName === userName);
    if (!exists) {
      acks.push({
        announcementId,
        userName,
        userRole,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('claimnx_announcement_acknowledgements', JSON.stringify(acks));
    }
  } catch (err) {
    console.warn('Error saving acknowledgement', err);
  }
};

export const hasAcknowledged = (announcementId: string, userName: string): boolean => {
  try {
    const raw = localStorage.getItem('claimnx_announcement_acknowledgements');
    if (!raw) return false;
    const acks: Acknowledgement[] = JSON.parse(raw);
    return acks.some(a => a.announcementId === announcementId && a.userName === userName);
  } catch {
    return false;
  }
};

export const SystemAnnouncements: React.FC<SystemAnnouncementsProps> = ({
  currentUser,
  hospitals,
  hospitalUsers,
  insurers,
  tpas,
  roles
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'logs' | 'preview'>('list');
  
  // Preview State
  const [previewSelId, setPreviewSelId] = useState<string>('custom');
  const [previewTitle, setPreviewTitle] = useState('New System Maintenance Notice');
  const [previewMessage, setPreviewMessage] = useState('We will be performing a routine database maintenance this Sunday at 02:00 AM UTC. Please save your active claims.');
  const [previewPriority, setPreviewPriority] = useState<Announcement['priority']>('critical');
  const [previewBg, setPreviewBg] = useState('#ef4444');
  const [previewText, setPreviewText] = useState('#ffffff');
  const [previewTypes, setPreviewTypes] = useState<Announcement['displayTypes']>(['banner', 'popup']);
  const [previewPopupAcked, setPreviewPopupAcked] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<Announcement['priority']>('information');
  const [statDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [neverExpire, setNeverExpire] = useState(false);
  const [displayTypes, setDisplayTypes] = useState<Announcement['displayTypes']>(['banner']);
  const [backgroundColor, setBackgroundColor] = useState('');
  const [textColor, setTextColor] = useState('');
  
  // Custom safe modal confirm state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Targeting select states
  const [targetAll, setTargetAll] = useState(true);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetHospitals, setTargetHospitals] = useState<string[]>([]);
  const [targetProducts, setTargetProducts] = useState<string[]>([]);
  const [targetZones, setTargetZones] = useState<string[]>([]);
  const [targetStates, setTargetStates] = useState<string[]>([]);
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [targetInsurers, setTargetInsurers] = useState<string[]>([]);
  const [targetTpas, setTargetTpas] = useState<string[]>([]);

  // Manual values input helper states
  const [newCity, setNewCity] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newState, setNewState] = useState('');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (previewSelId !== 'custom') {
      const selected = announcements.find(a => a.id === previewSelId);
      if (selected) {
        setPreviewTitle(selected.title);
        setPreviewMessage(selected.message);
        setPreviewPriority(selected.priority);
        setPreviewBg(selected.backgroundColor || '');
        setPreviewText(selected.textColor || '');
        setPreviewTypes(selected.displayTypes || ['banner']);
        setPreviewPopupAcked(false);
      }
    }
  }, [previewSelId, announcements]);

  const loadAnnouncements = () => {
    try {
      const rawAnn = localStorage.getItem('claimnx_system_announcements');
      let anns = rawAnn ? JSON.parse(rawAnn) : [];
      if (!Array.isArray(anns)) anns = [];
      const sanitized = anns.filter(Boolean).map((ann: any) => ({
        id: ann.id || 'ann_' + Math.random().toString(36).substring(2, 9),
        title: ann.title || 'Untitled Announcement',
        message: ann.message || '',
        priority: ann.priority || 'information',
        startDateTime: ann.startDateTime || new Date().toISOString(),
        endDateTime: ann.endDateTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: typeof ann.isActive === 'boolean' ? ann.isActive : true,
        neverExpire: typeof ann.neverExpire === 'boolean' ? ann.neverExpire : false,
        displayTypes: Array.isArray(ann.displayTypes) ? ann.displayTypes : ['banner'],
        backgroundColor: ann.backgroundColor || '',
        textColor: ann.textColor || '',
        targetAll: typeof ann.targetAll === 'boolean' ? ann.targetAll : true,
        targetRoles: Array.isArray(ann.targetRoles) ? ann.targetRoles : [],
        targetHospitals: Array.isArray(ann.targetHospitals) ? ann.targetHospitals : [],
        targetProducts: Array.isArray(ann.targetProducts) ? ann.targetProducts : [],
        targetZones: Array.isArray(ann.targetZones) ? ann.targetZones : [],
        targetStates: Array.isArray(ann.targetStates) ? ann.targetStates : [],
        targetCities: Array.isArray(ann.targetCities) ? ann.targetCities : [],
        targetInsurers: Array.isArray(ann.targetInsurers) ? ann.targetInsurers : [],
        targetTpas: Array.isArray(ann.targetTpas) ? ann.targetTpas : [],
        createdBy: ann.createdBy || 'System',
        createdDate: ann.createdDate || new Date().toISOString(),
        modifiedBy: ann.modifiedBy,
        modifiedDate: ann.modifiedDate
      }));
      setAnnouncements(sanitized);
    } catch (err) {
      console.error('Error loading announcements', err);
      setAnnouncements([]);
    }

    try {
      const rawAcks = localStorage.getItem('claimnx_announcement_acknowledgements');
      let acks = rawAcks ? JSON.parse(rawAcks) : [];
      if (!Array.isArray(acks)) acks = [];
      setAcknowledgements(acks);
    } catch {
      setAcknowledgements([]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || !statDateTime || (!neverExpire && !endDateTime)) {
      alert('Please fill in all required fields.');
      return;
    }

    const currentUserName = currentUser?.displayName || currentUser?.username || 'Super Admin';

    const updatedAnnouncement: Announcement = {
      id: editingId || 'ann_' + Date.now(),
      title,
      message,
      priority,
      startDateTime: statDateTime,
      endDateTime: neverExpire ? '2099-12-31T23:59' : endDateTime,
      isActive,
      neverExpire,
      displayTypes,
      backgroundColor,
      textColor,
      targetAll,
      targetRoles: targetAll ? [] : targetRoles,
      targetHospitals: targetAll ? [] : targetHospitals,
      targetProducts: targetAll ? [] : targetProducts,
      targetZones: targetAll ? [] : targetZones,
      targetStates: targetAll ? [] : targetStates,
      targetCities: targetAll ? [] : targetCities,
      targetInsurers: targetAll ? [] : targetInsurers,
      targetTpas: targetAll ? [] : targetTpas,
      
      createdBy: editingId ? (announcements.find(a => a.id === editingId)?.createdBy || currentUserName) : currentUserName,
      createdDate: editingId ? (announcements.find(a => a.id === editingId)?.createdDate || new Date().toISOString()) : new Date().toISOString(),
      modifiedBy: editingId ? currentUserName : undefined,
      modifiedDate: editingId ? new Date().toISOString() : undefined
    };

    let updatedList: Announcement[] = [];
    if (editingId) {
      updatedList = announcements.map(a => a.id === editingId ? updatedAnnouncement : a);
    } else {
      updatedList = [updatedAnnouncement, ...announcements];
    }

    localStorage.setItem('claimnx_system_announcements', JSON.stringify(updatedList));
    setAnnouncements(updatedList);
    resetForm();
    setActiveTab('list');
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setPriority('information');
    
    // Default start now + end in 7 days
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 7);
    
    // Format to yyyy-MM-ddThh:mm
    const tzoffset = (now).getTimezoneOffset() * 60000;
    const localISOTimeNow = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
    const localISOTimeFuture = (new Date(future.getTime() - tzoffset)).toISOString().slice(0, 16);

    setStartDateTime(localISOTimeNow);
    setEndDateTime(localISOTimeFuture);
    setIsActive(true);
    setNeverExpire(false);
    setDisplayTypes(['banner']);
    setBackgroundColor('');
    setTextColor('');
    setTargetAll(true);
    setTargetRoles([]);
    setTargetHospitals([]);
    setTargetProducts([]);
    setTargetZones([]);
    setTargetStates([]);
    setTargetCities([]);
    setTargetInsurers([]);
    setTargetTpas([]);
    setNewCity('');
    setNewZone('');
    setNewState('');
  };

  const startEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title || '');
    setMessage(ann.message || '');
    setPriority(ann.priority || 'information');
    setStartDateTime(ann.startDateTime ? String(ann.startDateTime).slice(0, 16) : '');
    setEndDateTime(ann.endDateTime ? String(ann.endDateTime).slice(0, 16) : '');
    setIsActive(!!ann.isActive);
    setNeverExpire(!!ann.neverExpire);
    setDisplayTypes(ann.displayTypes || ['banner']);
    setBackgroundColor(ann.backgroundColor || '');
    setTextColor(ann.textColor || '');
    setTargetAll(!!ann.targetAll);
    setTargetRoles(ann.targetRoles || []);
    setTargetHospitals(ann.targetHospitals || []);
    setTargetProducts(ann.targetProducts || []);
    setTargetZones(ann.targetZones || []);
    setTargetStates(ann.targetStates || []);
    setTargetCities(ann.targetCities || []);
    setTargetInsurers(ann.targetInsurers || []);
    setTargetTpas(ann.targetTpas || []);
    setActiveTab('create');
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Announcement',
      message: 'Are you sure you want to permanently delete this system announcement? This-action cannot be undone.',
      onConfirm: () => {
        const filtered = announcements.filter(a => a.id !== id);
        localStorage.setItem('claimnx_system_announcements', JSON.stringify(filtered));
        setAnnouncements(filtered);
      }
    });
  };

  const toggleActiveStatus = (ann: Announcement) => {
    const currentUserName = currentUser?.displayName || currentUser?.username || 'Super Admin';
    const updated = announcements.map(a => {
      if (a.id === ann.id) {
        return { ...a, isActive: !a.isActive, modifiedBy: currentUserName, modifiedDate: new Date().toISOString() };
      }
      return a;
    });
    localStorage.setItem('claimnx_system_announcements', JSON.stringify(updated));
    setAnnouncements(updated);
  };

  const toggleDisplayType = (type: Announcement['displayTypes'][number]) => {
    if (displayTypes.includes(type)) {
      if (displayTypes.length > 1) {
        setDisplayTypes(displayTypes.filter(t => t !== type));
      }
    } else {
      setDisplayTypes([...displayTypes, type]);
    }
  };

  const toggleTargetItem = (array: string[], setArray: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const addManualListItem = (array: string[], setArray: React.Dispatch<React.SetStateAction<string[]>>, rawVal: string, resetFn: () => void) => {
    const trimmed = rawVal.trim();
    if (!trimmed) return;
    if (!array.includes(trimmed)) {
      setArray([...array, trimmed]);
    }
    resetFn();
  };

  const getPriorityColor = (p: Announcement['priority']) => {
    switch (p) {
      case 'critical': return { bg: 'bg-rose-50 border-rose-200 text-rose-800', label: 'bg-red-600 text-white' };
      case 'warning': return { bg: 'bg-amber-50 border-amber-200 text-amber-800', label: 'bg-amber-500 text-white' };
      case 'success': return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', label: 'bg-emerald-600 text-white' };
      case 'information': default: return { bg: 'bg-blue-50 border-blue-200 text-blue-800', label: 'bg-blue-600 text-white' };
    }
  };

  // Calculate reach: Active users that would match these settings
  const calculateEstimateReach = (ann: Announcement): number => {
    if (ann.targetAll) return hospitalUsers.length || 1;
    let reached = 0;
    hospitalUsers.forEach(u => {
      let match = false;
      if (ann.targetRoles?.length > 0 && ann.targetRoles.some(r => u.role?.toUpperCase() === r.toUpperCase())) match = true;
      if (ann.targetHospitals?.length > 0 && u.hospitalId && ann.targetHospitals.includes(u.hospitalId)) match = true;
      if (ann.targetZones?.length > 0 && u.zone && ann.targetZones.some(z => z.toUpperCase() === u.zone?.toUpperCase())) match = true;
      if (ann.targetStates?.length > 0 && u.state && ann.targetStates.some(s => s.toUpperCase() === u.state?.toUpperCase())) match = true;
      
      const hasStrictLimit = 
        (ann.targetRoles?.length > 0) || 
        (ann.targetHospitals?.length > 0) || 
        (ann.targetZones?.length > 0) || 
        (ann.targetStates?.length > 0);

      if (hasStrictLimit && match) reached++;
      else if (!hasStrictLimit) reached++; 
    });
    return reached || 1;
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 mb-8" id="sys-ann-module-header">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Megaphone size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Announcements Management</h2>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-0.5">Control communication, scrolling tickers, and alerts across the portal</p>
            </div>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl self-start md:self-center">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Announcement List
          </button>
          <button 
            onClick={() => { resetForm(); setActiveTab('create'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {editingId ? 'Edit Announcement' : 'Create New'}
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Preview Screen
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Acknowledgement Log
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {announcements.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <Megaphone size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-700 text-sm font-black uppercase tracking-wider">No announcements created yet</p>
              <p className="text-slate-400 text-xs font-medium mt-1">Get started by creating your first global or targeted announcement bar</p>
              <button 
                onClick={() => { resetForm(); setActiveTab('create'); }}
                className="mt-4 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition"
              >
                Create Announcement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {announcements.map((ann) => {
                const colors = getPriorityColor(ann.priority);
                const isDeactivated = !ann.isActive;
                const hasEnded = !ann.neverExpire && new Date(ann.endDateTime) < new Date();
                const totalReached = acknowledgements.filter(ack => ack.announcementId === ann.id).length;
                const expectedReach = calculateEstimateReach(ann);
                
                return (
                  <div key={ann.id} className="border border-slate-200 rounded-[2rem] p-6 hover:shadow-md transition-all bg-white relative">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${colors.label}`}>
                            {ann.priority}
                          </span>
                          <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded ${
                            isDeactivated 
                              ? 'bg-slate-100 text-slate-500' 
                              : hasEnded 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-green-100 text-green-700'
                          }`}>
                            {isDeactivated ? 'Paused / Inactive' : hasEnded ? 'Expired' : 'Live & Active'}
                          </span>
                          {ann.displayTypes.map(type => (
                            <span key={type} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                              {type}
                            </span>
                          ))}
                        </div>
                        
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{ann.title}</h3>
                        <p className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                           {ann.message}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3 text-xs border-t border-slate-100">
                          <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Active Duration</span>
                            <div className="flex items-center gap-1.5 mt-1 text-slate-600 font-semibold">
                              <Clock size={12} className="text-slate-400" />
                              <span>{ann.neverExpire ? 'Active Indefinitely' : `${new Date(ann.startDateTime).toLocaleDateString()} - ${new Date(ann.endDateTime).toLocaleDateString()}`}</span>
                            </div>
                          </div>

                          <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Target Audience</span>
                            <span className="block mt-1 text-slate-600 font-semibold truncate max-w-xs">
                              {ann.targetAll ? (
                                <span className="text-indigo-600 font-bold">ALL PORTAL USERS</span>
                              ) : (
                                [
                                  ann.targetRoles?.length > 0 && `Roles (${ann.targetRoles.length})`,
                                  ann.targetHospitals?.length > 0 && `Hospitals (${ann.targetHospitals.length})`,
                                  ann.targetStates?.length > 0 && `States (${ann.targetStates.length})`,
                                  ann.targetZones?.length > 0 && `Zones (${ann.targetZones.length})`,
                                  ann.targetCities?.length > 0 && `Cities (${ann.targetCities.length})`,
                                  ann.targetInsurers?.length > 0 && `Insurers (${ann.targetInsurers.length})`,
                                  ann.targetTpas?.length > 0 && `TPAs (${ann.targetTpas.length})`,
                                ].filter(Boolean).join(', ') || 'Custom filter'
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Reach Coverage</span>
                              <span className="block font-black text-slate-700 mt-1">
                                {totalReached} acknowledged / {expectedReach} targeted
                              </span>
                            </div>
                            <button 
                              onClick={() => toggleActiveStatus(ann)}
                              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wider border ${
                                ann.isActive 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300' 
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                              title={ann.isActive ? "Pause/Deactivate" : "Publish/Activate"}
                            >
                              {ann.isActive ? (
                                <>
                                  <Pause size={14} className="text-emerald-600" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <Play size={14} className="text-slate-400" />
                                  <span>Inactive</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:flex-col md:items-end self-start shrink-0">
                        <button 
                          onClick={() => startEdit(ann)} 
                          className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(ann.id)} 
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE & EDIT FORM VIEW */}
      {activeTab === 'create' && (
        <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight pb-2 border-b border-indigo-50">Announcement Details</h3>
              
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">Title *</label>
                <input 
                  type="text" 
                  value={title} 
                  required
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Star Health Maintenance Window"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">Message *</label>
                <textarea 
                  value={message} 
                  required
                  rows={4}
                  onChange={(e) => setMessage(e.target.value)} 
                  placeholder="Insert announcement copy here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">Priority *</label>
                  <select 
                    value={priority} 
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="information">Information (Blue)</option>
                    <option value="success">Success / Resolved (Green)</option>
                    <option value="warning">Warning (Orange)</option>
                    <option value="critical">Critical (Red)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">Active Status</label>
                  <div className="flex items-center h-[54px] bg-slate-50 border border-slate-200 rounded-2xl px-4">
                    <label className="flex items-center gap-3 cursor-pointer w-full">
                      <input 
                        type="checkbox" 
                        checked={isActive} 
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                      />
                      <span className="text-sm font-semibold text-slate-700">{isActive ? 'Keep Active' : 'Inactive Draft'}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">Start Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    value={statDateTime} 
                    required
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">End Date & Time *</label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={neverExpire} 
                        onChange={(e) => setNeverExpire(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">Never Expire</span>
                    </label>
                  </div>
                  <input 
                    type="datetime-local" 
                    value={neverExpire ? '' : endDateTime} 
                    disabled={neverExpire}
                    required={!neverExpire}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    className={`w-full border rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                      neverExpire 
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* CUSTOM THEME COLORS SECTION */}
              <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">Custom Theme Colors</label>
                  <button
                    type="button"
                    onClick={() => {
                      setBackgroundColor('');
                      setTextColor('');
                    }}
                    className="text-[10px] text-indigo-600 font-extrabold uppercase hover:underline"
                  >
                    Reset to Default Priority Colors
                  </button>
                </div>
                
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-relaxed">
                  Decide standard priority styling or select custom background and font colors.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={backgroundColor || '#4f46e5'} 
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-10 h-10 border-0 p-0 rounded-lg cursor-pointer flex-shrink-0"
                      />
                      <input 
                        type="text" 
                        value={backgroundColor} 
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        placeholder="Default Priority Bg"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Font (Text) Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={textColor || '#ffffff'} 
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-10 h-10 border-0 p-0 rounded-lg cursor-pointer flex-shrink-0"
                      />
                      <input 
                        type="text" 
                        value={textColor} 
                        onChange={(e) => setTextColor(e.target.value)}
                        placeholder="Default Priority Text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-semibold text-slate-400 tracking-wider">PRESET COMBINATIONS</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Indigo Space', bg: '#4f46e5', text: '#ffffff' },
                      { name: 'Sunset Alert', bg: '#f97316', text: '#ffffff' },
                      { name: 'Midnight', bg: '#1e293b', text: '#f1f5f9' },
                      { name: 'Forest Green', bg: '#059669', text: '#ffffff' },
                      { name: 'Ruby Critical', bg: '#dc2626', text: '#ffffff' },
                      { name: 'Gold Sun', bg: '#fef08a', text: '#854d0e' },
                      { name: 'Teal Depth', bg: '#0d9488', text: '#ffffff' }
                    ].map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setBackgroundColor(p.bg);
                          setTextColor(p.text);
                        }}
                        className="px-2.5 py-1 text-[10px] font-extrabold uppercase border border-slate-200 bg-white hover:border-slate-300 rounded-lg transition-all"
                        style={{ borderLeftColor: p.bg, borderLeftWidth: '4px' }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time preview */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Theme Color Preview</span>
                  <div 
                    className="p-3 rounded-xl border flex items-center justify-between transition-all"
                    style={{
                      backgroundColor: backgroundColor || '#4f46e5',
                      borderColor: backgroundColor ? 'transparent' : '#cbd5e1',
                      color: textColor || '#ffffff'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Megaphone size={14} />
                      <div className="text-[10px] tracking-wide font-semibold">
                        <span className="font-extrabold">{title || 'Sample Title'}:</span> {message || 'This is how your custom color styles will appear to users across the platform.'}
                      </div>
                    </div>
                    <X size={12} className="opacity-80" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest">Display Output Types</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'banner', label: 'Fixed Header Banner' },
                    { id: 'marquee', label: 'Scrolling Marquee' },
                    { id: 'popup', label: 'Pop-Up Dialog' },
                    { id: 'card', label: 'Dashboard Card Widget' }
                  ].map(t => (
                    <button 
                      key={t.id}
                      type="button"
                      onClick={() => toggleDisplayType(t.id as any)}
                      className={`flex items-center gap-2 p-3 text-xs font-bold uppercase rounded-xl border text-left transition-all ${displayTypes.includes(t.id as any) ? 'bg-indigo-50 border-indigo-400 text-indigo-700 ring-2 ring-indigo-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${displayTypes.includes(t.id as any) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {displayTypes.includes(t.id as any) && <Check size={10} />}
                      </div>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AUDIENCE TARGETING SECTION */}
            <div className="space-y-6">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight pb-2 border-b border-indigo-50">Audience Targeting criteria</h3>
              
              <div className="bg-slate-50 border border-indigo-50 rounded-[2rem] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-black text-indigo-800 uppercase tracking-tight">Global Broadcast</span>
                    <span className="block text-[11px] font-semibold text-indigo-400 uppercase mt-0.5">Show this announcement to all logged-in portal users</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={targetAll} 
                    onChange={(e) => setTargetAll(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500 ring-offset-2 border-slate-300"
                  />
                </div>

                {!targetAll && (
                  <div className="space-y-5 pt-4 border-t border-slate-200/60 transition-all animate-in fade-in duration-300">
                    {/* Roles Targeting */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Roles</span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-white">
                        {roles.map(r => (
                          <button 
                            key={r.id} 
                            type="button"
                            onClick={() => toggleTargetItem(targetRoles, setTargetRoles, r.name)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${targetRoles.includes(r.name) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50'}`}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hospital targeting */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Hospitals</span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-white">
                        {hospitals.map(h => {
                          const id = h.hospitalId || h.id;
                          return (
                            <button 
                              key={id} 
                              type="button"
                              onClick={() => toggleTargetItem(targetHospitals, setTargetHospitals, id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${targetHospitals.includes(id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50'}`}
                            >
                              {h.hospitalName || h.displayName}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Insurers and TPAs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Insurers</span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-white">
                          {insurers.map(i => (
                            <button 
                              key={i.id} 
                              type="button"
                              onClick={() => toggleTargetItem(targetInsurers, setTargetInsurers, i.id)}
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border transition-all ${targetInsurers.includes(i.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50'}`}
                            >
                              {i.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Target TPAs</span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-white">
                          {tpas.map(t => (
                            <button 
                              key={t.id} 
                              type="button"
                              onClick={() => toggleTargetItem(targetTpas, setTargetTpas, t.id)}
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border transition-all ${targetTpas.includes(t.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50'}`}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Products targeting */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Products</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.values(Product).map(prod => (
                          <button 
                            key={prod} 
                            type="button"
                            onClick={() => toggleTargetItem(targetProducts, setTargetProducts, prod)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${targetProducts.includes(prod) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            {prod}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Geographical targeting fields */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">Geographic Targeting</span>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {/* State */}
                        <div>
                          <input 
                            type="text" 
                            placeholder="Add State"
                            value={newState}
                            onChange={(e) => setNewState(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addManualListItem(targetStates, setTargetStates, newState, () => setNewState(''));
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        {/* Zone */}
                        <div>
                          <input 
                            type="text" 
                            placeholder="Add Zone"
                            value={newZone}
                            onChange={(e) => setNewZone(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addManualListItem(targetZones, setTargetZones, newZone, () => setNewZone(''));
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        {/* City */}
                        <div>
                          <input 
                            type="text" 
                            placeholder="Add City"
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addManualListItem(targetCities, setTargetCities, newCity, () => setNewCity(''));
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Render Geographical active items */}
                      <div className="space-y-1 text-xs">
                        {targetStates.length > 0 && (
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[9px]">States:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {targetStates.map(s => (
                                <span key={s} className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">{s} <button type="button" onClick={() => setTargetStates(targetStates.filter(st => st !== s))} className="text-slate-400 hover:text-red-500 font-bold ml-1">×</button></span>
                              ))}
                            </div>
                          </div>
                        )}
                        {targetZones.length > 0 && (
                          <div className="mt-2">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Zones:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {targetZones.map(z => (
                                <span key={z} className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">{z} <button type="button" onClick={() => setTargetZones(targetZones.filter(zt => zt !== z))} className="text-slate-400 hover:text-red-500 font-bold ml-1">×</button></span>
                              ))}
                            </div>
                          </div>
                        )}
                        {targetCities.length > 0 && (
                          <div className="mt-2">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Cities:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {targetCities.map(c => (
                                <span key={c} className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">{c} <button type="button" onClick={() => setTargetCities(targetCities.filter(ct => ct !== c))} className="text-slate-400 hover:text-red-500 font-bold ml-1">×</button></span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => { resetForm(); setActiveTab('list'); }}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-black uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-8 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-black uppercase tracking-widest transition-all shadow-sm"
            >
              Save Announcement
            </button>
          </div>
        </form>
      )}

      {/* INTERACTIVE PREVIEW SCREEN VIEW (FULL OVERLAY SANDBOX MODAL) */}
      {activeTab === 'preview' && (
        <div className="fixed inset-0 z-[110] bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-slate-100 w-full h-full max-w-7xl rounded-3xl sm:rounded-[2.5rem] border border-slate-200/50 shadow-2xl flex flex-col overflow-hidden relative">
            
            {/* SIMULATOR HEADER */}
            <div className="bg-slate-900 text-white px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl sm:rounded-2xl border border-indigo-500/20 shrink-0">
                  <Eye size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-100 leading-none">System Announcement Simulator</h3>
                    <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded leading-none shrink-0">Real-Time Sandbox</span>
                  </div>
                  <p className="text-slate-400 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mt-1 hidden xs:block">Configure layouts & preview end-user visual blasts across the ecosystem</p>
                </div>
              </div>
              
              {/* EXIT / CLOSE PREVIEW BUTTON */}
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all shadow-lg cursor-pointer shrink-0"
              >
                <X size={14} className="sm:size-4" />
                <span>Close Preview</span>
              </button>
            </div>

            {/* MAIN CORE CONTENT (SCROLLABLE FLEX BODY) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col xl:flex-row gap-6 sm:gap-8 bg-slate-50 min-h-0">
              <style>{`
                @keyframes mockMarquee {
                  0% { transform: translate3d(0, 0, 0); }
                  100% { transform: translate3d(-33.3%, 0, 0); }
                }
                .mock-marquee-scroll {
                  display: inline-block;
                  white-space: nowrap;
                  animation: mockMarquee 20s linear infinite;
                }
              `}</style>

              {/* LEFT SIDEBAR: CONFIGURATOR CONTROLS (xl:col-span-4) */}
              <div className="w-full xl:w-[360px] flex-shrink-0 bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-[#000080] mb-2">Preset Selector</span>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">Preview Announcement</label>
                  <select
                    value={previewSelId}
                    onChange={(e) => setPreviewSelId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-50/50"
                  >
                    <option value="custom">✍️ [Custom Mock Playground]</option>
                    {announcements.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.title.length > 25 ? `${a.title.slice(0, 25)}...` : a.title} ({a.priority})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Content & Styling</span>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Notification Title</label>
                    <input
                      type="text"
                      value={previewTitle}
                      onChange={(e) => {
                        setPreviewTitle(e.target.value);
                        setPreviewSelId('custom');
                      }}
                      placeholder="Enter preview title"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Notification Message</label>
                    <textarea
                      rows={3}
                      value={previewMessage}
                      onChange={(e) => {
                        setPreviewMessage(e.target.value);
                        setPreviewSelId('custom');
                      }}
                      placeholder="Enter message body"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Alert Priority Level</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['information', 'success', 'warning', 'critical'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPreviewPriority(p as any);
                            setPreviewSelId('custom');
                          }}
                          className={`py-2 text-[10px] font-black uppercase rounded-lg border text-center transition-all ${
                            previewPriority === p 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Background</label>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          value={previewBg || '#4f46e5'} 
                          onChange={(e) => {
                            setPreviewBg(e.target.value);
                            setPreviewSelId('custom');
                          }}
                          className="w-8 h-8 rounded border-0 cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={previewBg} 
                          onChange={(e) => {
                            setPreviewBg(e.target.value);
                            setPreviewSelId('custom');
                          }}
                          placeholder="Bg color"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[10px] font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Font Color</label>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="color" 
                          value={previewText || '#ffffff'} 
                          onChange={(e) => {
                            setPreviewText(e.target.value);
                            setPreviewSelId('custom');
                          }}
                          className="w-8 h-8 rounded border-0 cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={previewText} 
                          onChange={(e) => {
                            setPreviewText(e.target.value);
                            setPreviewSelId('custom');
                          }}
                          placeholder="Text color"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[10px] font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {previewSelId === 'custom' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewBg('');
                        setPreviewText('');
                      }}
                      className="text-[10px] text-indigo-600 font-extrabold uppercase hover:underline block pt-1"
                    >
                      Reset Colors to Priority Defaults
                    </button>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Display Modes to Show</span>
                  <div className="space-y-2">
                    {[
                      { id: 'banner', label: 'Fixed Header Banner' },
                      { id: 'marquee', label: 'Scrolling Marquee' },
                      { id: 'popup', label: 'Urgent Pop-Up Dialog' },
                      { id: 'card', label: 'Dashboard Card Widget' }
                    ].map(item => {
                      const isChecked = previewTypes.includes(item.id as any);
                      return (
                        <label key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-700">{item.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setPreviewTypes(previewTypes.filter(x => x !== item.id));
                              } else {
                                setPreviewTypes([...previewTypes, item.id as any]);
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 border-slate-300"
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setPreviewPopupAcked(false)}
                      className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-sm"
                    >
                      🔄 Re-Show (Show Popup Modal)
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DESKTOP SIMULATOR MOCKUP */}
              <div className="flex-1 space-y-4 flex flex-col min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div>
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Device Mockup Preview Screen</h4>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em] mt-0.5">Real-time simulation of how users will experience claims workspace</p>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Interactive Sandbox</span>
                  </div>
                </div>

                {/* MOCK BROWSER CHROME FRAME */}
                <div className="border border-slate-300 rounded-[2rem] bg-white shadow-xl overflow-hidden flex-1 flex flex-col relative select-none min-h-[450px]">
                  {/* BROWSER TOP BAR */}
                  <div className="bg-slate-200/80 px-6 py-3 border-b border-slate-300/60 flex items-center justify-between gap-4 shrink-0">
                    {/* Traffic lights */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                      <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                      <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                    </div>
                    
                    {/* URL Bar */}
                    <div className="bg-white/80 border border-slate-300/40 rounded-xl px-4 py-1.5 text-[10px] font-mono text-slate-500 w-full max-w-md mx-auto truncate text-center select-all">
                      🌍 https://portal.claimnx.com/cashless-dashboard
                    </div>

                    {/* Right helper icon */}
                    <div className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                      ClaimNX Live
                    </div>
                  </div>

                  {/* SIMULATED WEB DESKTOP CONTENT */}
                  <div className="flex-1 flex overflow-hidden relative min-h-0">
                    
                    {/* SIMULATED SIDEBAR */}
                    <div className="w-16 sm:w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-6 shrink-0 z-10 transition-all">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-lg">
                        NX
                      </div>
                      
                      <div className="space-y-4 w-full flex flex-col items-center">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><Activity size={14} /></div>
                        <div className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-800 flex items-center justify-center text-slate-500"><Globe size={14} /></div>
                        <div className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-800 flex items-center justify-center text-slate-500"><FileText size={14} /></div>
                      </div>
                    </div>

                    {/* SIMULATED WORKSPACE CORES */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc] content-start relative min-h-0">
                      
                      {/* 1. EMBEDDED NOTIFICATION BANNER (PREVIEW) */}
                      {previewTypes.includes('banner') && (() => {
                        const colors = getPreviewPriorityColors(previewPriority, previewBg, previewText);
                        return (
                          <div 
                            className="py-1.5 px-4 text-[10px] font-black uppercase tracking-wide flex items-center justify-between border-b border-black/10 transition-all animate-in slide-in-from-top duration-300"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            <div className="flex-1 flex items-center gap-2 truncate">
                              <Megaphone size={12} className="shrink-0" />
                              <div className="truncate">
                                <span className="font-extrabold">{previewTitle}:</span> <span className="font-semibold opacity-90">{previewMessage}</span>
                              </div>
                            </div>
                            <span className="opacity-60 hover:opacity-100 cursor-pointer text-xs ml-3 font-semibold">×</span>
                          </div>
                        );
                      })()}

                      {/* 2. EMBEDDED MARQUEE BANNER (PREVIEW) */}
                      {previewTypes.includes('marquee') && (() => {
                        const colors = getPreviewPriorityColors(previewPriority, previewBg, previewText);
                        return (
                          <div 
                            className="py-1.5 px-3 text-[10px] font-black uppercase tracking-widest flex items-center border-b border-black/10 overflow-hidden relative transition-all animate-in slide-in-from-top duration-300"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            <Megaphone size={12} className="mr-2.5 z-10 shrink-0 bg-inherit" style={{ backgroundColor: colors.bg }} />
                            <div className="w-full overflow-hidden relative whitespace-nowrap">
                              <div className="mock-marquee-scroll font-semibold">
                                <span>📢 {previewTitle}: {previewMessage} &nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp; 📢 {previewTitle}: {previewMessage} &nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp; 📢 {previewTitle}: {previewMessage} &nbsp;&nbsp;&nbsp;&nbsp;</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* SIMULATED HEADER BAR */}
                      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 transition-all">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                            ☰
                          </div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-widest font-sans">Cashless Control Center</span>
                        </div>
                        
                        {/* User mockup */}
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-slate-800 leading-none">RAHUL AVHAD</p>
                            <p className="text-[8px] font-bold text-blue-500 tracking-wider mt-0.5">SUPER ADMIN</p>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-black text-[10px] text-slate-600">
                            R
                          </div>
                        </div>
                      </div>

                      {/* SIMULATED INNER PAGE WORKSPACE */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                        {/* BENTO CARDS SIMULATION */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-sm text-left">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pre Auth</span>
                            <span className="block text-lg font-black text-slate-800 leading-none">12 Cases</span>
                            <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider block mt-1.5">₹44.5L NET</span>
                          </div>
                          <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-sm text-left">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Discharge</span>
                            <span className="block text-lg font-black text-slate-800 leading-none">4 Cases</span>
                            <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider block mt-1.5">₹18.2L NET</span>
                          </div>
                          <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-sm text-left">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Settlement</span>
                            <span className="block text-lg font-black text-slate-800 leading-none">8 Cases</span>
                            <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider block mt-1.5 font-mono">₹25.0L NET</span>
                          </div>
                        </div>

                        {/* 3. SIMULATED DASHBOARD CARD WIDGET (PREVIEW) */}
                        {previewTypes.includes('card') && (() => {
                          const colors = getPreviewPriorityColors(previewPriority, previewBg, previewText);
                          return (
                            <div 
                              className="p-5 rounded-3xl border transition-all animate-in zoom-in duration-300 text-left space-y-3 bg-white"
                              style={{ 
                                backgroundColor: previewBg ? `${previewBg}12` : undefined, 
                                borderColor: previewBg || '#e2e8f0',
                              }}
                            >
                              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100/60 font-sans">
                                <div className="flex items-center gap-1.5">
                                  <Megaphone size={12} className="text-[#000080]" />
                                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest font-sans">Latest System Update</span>
                                </div>
                                <span 
                                  className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider block"
                                  style={{ backgroundColor: colors.bg, color: colors.text }}
                                >
                                  {previewPriority}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{previewTitle}</h5>
                                <p className="text-[10px] font-semibold text-slate-500 leading-relaxed font-sans">{previewMessage}</p>
                              </div>
                              
                              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                                Published Date: {new Date().toLocaleDateString()}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Default mockup background list items */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mock Active Registry Admissions</span>
                            <span className="text-[8px] font-bold text-indigo-500 uppercase">3 records</span>
                          </div>
                          {[
                            { name: 'Sanjay Sharma', id: 'CL-9281', status: 'Approved' },
                            { name: 'Kiran Patel', id: 'CL-3928', status: 'Query Alert' },
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold">
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400 font-mono">{item.id}</span>
                                <span className="text-slate-700">{item.name}</span>
                              </div>
                              <span className="text-indigo-600 uppercase tracking-wider text-[8px]">{item.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. SIMULATED POP-UP MODAL OVERLAY (PREVIEW) */}
                      {previewTypes.includes('popup') && !previewPopupAcked && (() => {
                        const colors = getPreviewPriorityColors(previewPriority, previewBg, previewText);
                        return (
                          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                            <div 
                              className="bg-white rounded-3xl border-2 max-w-sm w-full p-6 shadow-2xl relative text-left animate-in zoom-in duration-200"
                              style={{ borderColor: previewBg || '#dc2626' }}
                            >
                              <div className="flex items-start gap-2.5 mb-3">
                                <div 
                                  className="p-2 rounded-xl text-rose-600 shrink-0"
                                  style={{ 
                                    backgroundColor: previewBg ? `${previewBg}15` : '#fee2e2', 
                                    color: previewBg || '#dc2626' 
                                  }}
                                >
                                  <ShieldAlert size={20} />
                                </div>
                                <div>
                                  <span 
                                    className="text-[7.5px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded"
                                    style={{ 
                                      backgroundColor: previewBg ? `${previewBg}15` : '#fee2e2', 
                                      color: previewBg || '#dc2626' 
                                    }}
                                  >
                                    {previewPriority === 'critical' ? 'Urgent Alert' : 'System Announcement'}
                                  </span>
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1">{previewTitle}</h4>
                                </div>
                              </div>

                              <p className="text-slate-600 text-[10px] font-semibold leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100/50 mb-4 font-sans">
                                {previewMessage}
                              </p>

                              <button
                                type="button"
                                onClick={() => setPreviewPopupAcked(true)}
                                className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-[#ffffff] rounded-xl shadow-lg transition duration-200 block text-center"
                                style={{ 
                                  backgroundColor: previewBg || '#dc2626',
                                  color: previewText || '#ffffff',
                                  boxShadow: `0 4px 10px -2px ${previewBg || '#dc2626'}40`
                                }}
                              >
                                I Have Read This Announcement
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ACKNOWLEDGEMENTS LOGS VIEW */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Audit & Acknowledgement Trail</h3>
            <button 
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Clear Audit Log',
                  message: 'Are you sure you want to clear all acknowledgment history? This action cannot be undone.',
                  onConfirm: () => {
                    localStorage.setItem('claimnx_announcement_acknowledgements', '[]');
                    setAcknowledgements([]);
                  }
                });
              }}
              className="text-xs font-black text-rose-600 uppercase tracking-widest hover:underline"
            >
              Clear Audit Log
            </button>
          </div>

          <div className="border border-slate-200 rounded-[2rem] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User Name</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Announcement Title</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {acknowledgements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      No read confirmations recorded yet
                    </td>
                  </tr>
                ) : (
                  acknowledgements.map((ack, index) => {
                    const annTitle = announcements.find(a => a.id === ack.announcementId)?.title || 'Deleted Announcement';
                    return (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-800 uppercase tracking-tight">{ack.userName}</td>
                        <td className="p-4 text-[10px] font-black text-indigo-600 uppercase tracking-wider">{ack.userRole}</td>
                        <td className="p-4 text-xs font-semibold text-slate-600">{annTitle}</td>
                        <td className="p-4 text-[11px] font-medium text-slate-500">
                          {new Date(ack.timestamp).toLocaleDateString()} {new Date(ack.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL OVERLAY */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full text-left space-y-4 shadow-2xl">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{confirmModal.title}</h4>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed font-sans">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition shadow-sm"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Top Portal Banner Component (Fixed / Scrolling Marquee / Dialog Pop-Up)
export const SystemAnnouncementsBanner: React.FC<{ currentUser: HospitalUser; activeProduct?: Product }> = ({ currentUser, activeProduct }) => {
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    // Poll/load current active matching announcements
    const update = () => {
      const anns = getActiveAnnouncements(currentUser, activeProduct);
      
      // Filter out those REQUIREMENT or ANY priority if already click-acknowledged
      const unacknowledged = anns.filter(ann => {
        return !hasAcknowledged(ann.id, currentUser.displayName);
      });

      setActiveAnnouncements(unacknowledged);
    };

    update();
    const timer = setInterval(update, 5000); // Poll every 5 seconds to match expiry and new publications
    return () => clearInterval(timer);
  }, [currentUser, activeProduct]);

  if (!currentUser || activeAnnouncements.length === 0) return null;

  // Render Fixed Banner & Marquee Display Types
  const topBanners = activeAnnouncements.filter(a => a.displayTypes.includes('banner') || a.displayTypes.includes('marquee'));
  const criticalPopups = activeAnnouncements.filter(a => a.displayTypes.includes('popup'));

  const handleAckClick = (id: string) => {
    acknowledgeAnnouncement(id, currentUser.displayName, currentUser.role);
    setActiveAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const getPriorityClasses = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'critical': 
        return { 
          bg: 'bg-red-600 text-white', 
          icon: <ShieldAlert size={16} className="text-white shrink-0 animate-bounce" />,
          btn: 'bg-white text-red-700 hover:bg-rose-50'
        };
      case 'warning': 
        return { 
          bg: 'bg-amber-500 text-slate-900', 
          icon: <AlertTriangle size={16} className="text-slate-900 shrink-0" />,
          btn: 'bg-slate-900 text-white hover:bg-slate-800'
        };
      case 'success': 
        return { 
          bg: 'bg-emerald-600 text-white', 
          icon: <CheckCircle2 size={16} className="text-white shrink-0" />,
          btn: 'bg-white text-emerald-800 hover:bg-emerald-50'
        };
      case 'information': 
      default: 
        return { 
          bg: 'bg-indigo-600 text-white', 
          icon: <Info size={16} className="text-white shrink-0" />,
          btn: 'bg-white text-indigo-800 hover:bg-indigo-50'
        };
    }
  };

  // 1. Popup display handling (critical block/acknowledgement requirement)
  const currentPopup = criticalPopups[0]; // Process highest priority or first match
  
  return (
    <>
      {/* 1. PORTAL POP-UP DIALOG */}
      {currentPopup && !hasAcknowledged(currentPopup.id, currentUser.displayName) && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div 
            className="bg-white rounded-[2rem] border-2 max-w-lg w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-300"
            style={{ borderColor: currentPopup.backgroundColor || '#ef4444' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="p-3 rounded-2xl animate-pulse"
                style={{ 
                  backgroundColor: `${currentPopup.backgroundColor || '#ef4444'}15`, 
                  color: currentPopup.backgroundColor || '#ef4444' 
                }}
              >
                <ShieldAlert size={28} />
              </div>
              <div>
                <span 
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${currentPopup.backgroundColor || '#ef4444'}15`,
                    color: currentPopup.backgroundColor || '#ef4444'
                  }}
                >
                  {currentPopup.priority === 'critical' ? 'Urgent Alert' : 'System Announcement'}
                </span>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-1">{currentPopup.title}</h3>
              </div>
            </div>
            
            <p className="text-slate-600 text-sm font-semibold leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 font-sans">
              {currentPopup.message}
            </p>

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleAckClick(currentPopup.id)}
                className="w-full py-4 text-xs font-black uppercase tracking-widest text-[#ffffff] rounded-2xl shadow-lg transition duration-200"
                style={{
                  backgroundColor: currentPopup.backgroundColor || '#ef4444',
                  color: currentPopup.textColor || '#ffffff',
                  boxShadow: `0 10px 15px -3px ${currentPopup.backgroundColor || '#ef4444'}30`
                }}
              >
                I Have Read This Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CHOSEN TOPMOST SLIDE-BANNER OR MARQUEE HEADER */}
      {topBanners.length > 0 && (
        <div className="w-full shrink-0 flex flex-col gap-1 transition-all duration-300">
          {topBanners.map((ann) => {
            const layout = getPriorityClasses(ann.priority);
            const isMarquee = ann.displayTypes.includes('marquee');

            return (
              <div 
                key={ann.id} 
                className={`${ann.backgroundColor ? '' : layout.bg} py-2 px-4 flex items-center justify-between text-xs font-black tracking-wide border-b border-white/10 relative transition-all duration-300`}
                style={{
                  backgroundColor: ann.backgroundColor || undefined,
                  color: ann.textColor || undefined
                }}
              >
                <div className="flex-1 flex items-center overflow-hidden gap-3">
                  {layout.icon}
                  {isMarquee ? (
                    <div className="w-full overflow-hidden whitespace-nowrap relative select-none uppercase tracking-widest">
                      <div className="inline-block animate-marquee" style={{ animation: 'marquee 25s linear infinite' }}>
                        <span>📢 {ann.title}: {ann.message} &nbsp;&nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;&nbsp; 📢 {ann.title}: {ann.message}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="uppercase tracking-widest flex flex-wrap gap-1 items-center">
                      <span className="font-black text-[13px] tracking-tight">{ann.title}:</span>
                      <span className="font-semibold" style={{ color: ann.textColor || 'rgba(255, 255, 255, 0.95)' }}>{ann.message}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <button 
                    onClick={() => handleAckClick(ann.id)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    style={{ color: ann.textColor || undefined }}
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Inject custom css animation for marquee fallback if needed */}
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </>
  );
};

// Dashboard Announcement Widget Component
export const DashboardAnnouncementsWidget: React.FC<{ currentUser: HospitalUser; activeProduct?: Product }> = ({ currentUser, activeProduct }) => {
  const [anns, setAnns] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const update = () => {
      // Collect all active matching announcements for the user's view, filtering out already acknowledged cards
      const allMatching = getActiveAnnouncements(currentUser, activeProduct);
      const unacknowledged = allMatching.filter(a => !hasAcknowledged(a.id, currentUser.displayName));
      const cardMatching = unacknowledged.filter(a => a.displayTypes.includes('card'));
      setAnns(cardMatching);
    };
    
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [currentUser, activeProduct]);

  if (!currentUser || anns.length === 0) return null;

  const getPriorityClasses = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'critical': 
        return { bg: 'bg-rose-50 border-rose-100 text-rose-800', badge: 'bg-red-600 text-white', icon: <ShieldAlert size={14} /> };
      case 'warning': 
        return { bg: 'bg-amber-50 border-amber-100 text-amber-800', badge: 'bg-amber-500 text-slate-900', icon: <AlertTriangle size={14} /> };
      case 'success': 
        return { bg: 'bg-emerald-50 border-emerald-100 text-emerald-800', badge: 'bg-emerald-600 text-white', icon: <CheckCircle2 size={14} /> };
      case 'information': 
      default: 
        return { bg: 'bg-blue-50 border-blue-100 text-blue-800', badge: 'bg-blue-600 text-white', icon: <Info size={14} /> };
    }
  };

  const handleAckCard = (id: string) => {
    acknowledgeAnnouncement(id, currentUser.displayName, currentUser.role);
    setAnns(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 space-y-4" id="announcements-dashboard-widget">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-[#000080]" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-sans">Latest System Updates</h3>
        </div>
        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-wider font-mono">
          {anns.length} New
        </span>
      </div>

      <div className="space-y-4 max-h-[350px] overflow-y-auto no-scrollbar">
        {anns.map(ann => {
          const cfg = getPriorityClasses(ann.priority);
          return (
            <div 
              key={ann.id} 
              className="p-4 rounded-2xl border transition-all"
              style={{
                backgroundColor: ann.backgroundColor ? `${ann.backgroundColor}10` : undefined,
                borderColor: ann.backgroundColor || undefined,
                color: ann.textColor || undefined
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1"
                      style={{
                        backgroundColor: ann.backgroundColor || undefined,
                        color: ann.textColor || '#ffffff'
                      }}
                    >
                      {cfg.icon} <span>{ann.priority}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                      {new Date(ann.createdDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">{ann.title}</h4>
                  <p className="text-[11px] font-medium leading-relaxed text-slate-600">
                    {ann.message}
                  </p>
                </div>

                <button 
                  onClick={() => handleAckCard(ann.id)}
                  className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
                  title="Acknowledge & Hide"
                  style={{ color: ann.textColor || undefined }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
