
import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, Plus, Edit2, Trash2, CheckCircle2, Lock, Eye, Key, 
  X, Save, CheckSquare, Square, ShieldCheck, Database, FileText, 
  Users, User, BarChart3, Hospital, Timer, Layers, LayoutDashboard,
  Wallet, FileDown, EyeOff, Navigation, Sidebar, UserPlus, Activity,
  Globe2, Settings, Package, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { ClaimStage, Role, Product, HospitalUser, ROLE_STAGE_ENTITLEMENTS } from '../types';
import ProductSelector from './ProductSelector';
import { configApi } from '../services/api';

interface PermissionAction {
  id: string;
  label: string;
}

interface SubModule {
  id: string;
  label: string;
  actions: PermissionAction[];
}

interface Module {
  id: string;
  label: string;
  subModules: SubModule[];
}

interface ManageRolesProps {
  stages: ClaimStage[];
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  hospitalUsers?: HospitalUser[];
}

const ManageRoles: React.FC<ManageRolesProps> = ({ stages, roles, setRoles, hospitalUsers = [] }) => {
  const getLinkedProfilesCount = (roleName: string) => {
    const normalize = (name: string) => {
      let n = (name || '').trim().toLowerCase();
      if (n === 'policy audit team role') n = 'policy audit team';
      if (n === 'reconciliation') n = 'reconciliation team';
      if (n === 'operations') n = 'operations team';
      if (n === 'medical officer') n = 'medical team';
      return n;
    };
    const target = normalize(roleName);
    return hospitalUsers.filter(u => normalize(u.role) === target).length;
  };

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const dynamicPermissionStructure = useMemo(() => {
    const structure = [
      {
        id: 'sidebar_hospital',
        label: 'Sidebar: Hospital View',
        subModules: [
          {
            id: 'sections',
            label: 'Hospital View Modules',
            actions: [
              { id: 'group', label: 'Group Visibility' },
              { id: 'overview', label: 'Overview Dashboard' },
              { id: 'cashless', label: 'Cashless Dashboard' },
              { id: 'directory', label: 'Claim Directory' },
              { id: 'patient_dashboard', label: 'Patient Dashboard' },
              { id: 'mis', label: 'MIS View' }
            ]
          }
        ]
      },
      {
        id: 'stage_access',
        label: 'Cashless Control Center',
        subModules: [
          {
            id: 'phases',
            label: 'Phase Access Control',
            actions: [
              { id: 'pre-auth', label: 'Pre auth & Enhancement' },
              { id: 'discharge', label: 'Discharge' },
              { id: 'settlement', label: 'Settlement' }
            ]
          }
        ]
      },
      {
        id: 'sidebar_hospital_admin',
        label: 'Sidebar: Hospital Admin',
        subModules: [
          {
            id: 'sections',
            label: 'Hospital Admin Modules',
            actions: [
              { id: 'group', label: 'Group Visibility' },
              { id: 'hospital', label: 'Hospital Management' },
              { id: 'live_tracker', label: 'Live Claims Tracker' },
              { id: 'tab_hospital_profile', label: 'Hospital Profile Tab' },
              { id: 'tab_team_access', label: 'Team Access Tab' },
              { id: 'tab_payer_config', label: 'Payer Config Tab' },
              { id: 'tab_digital_assets', label: 'Digital Assets Tab' },
              { id: 'tab_nhcx_onboarding', label: 'NHCX Onboarding Tab' },
              { id: 'tab_email_integration', label: 'Email Integration Tab' },
              { id: 'tab_wallet_billing', label: 'Wallet & Billing Tab' }
            ]
          }
        ]
      },
      {
        id: 'sidebar_reimbursement',
        label: 'Sidebar: Reimbursement Section',
        subModules: [
          {
            id: 'sections',
            label: 'Reimbursement Modules',
            actions: [
              { id: 'group', label: 'Group Visibility' },
              { id: 'partner', label: 'Partner Processing' },
              { id: 'ica', label: 'ICA' },
              { id: 'pre_post', label: 'Pre & Post' },
              { id: 'kyp', label: 'Know Your Policy (KYP)' },
              { id: 'recovery', label: 'Recovery & Recon' }
            ]
          }
        ]
      },
      {
        id: 'sidebar_ops',
        label: 'Sidebar: Operations View',
        subModules: [
          {
            id: 'sections',
            label: 'Operations Modules',
            actions: [
              { id: 'group', label: 'Group Visibility' },
              { id: 'crm', label: 'CRM Dashboard' },
              { id: 'recon', label: 'Finance Team (Recon)' },
              { id: 'medical', label: 'Medical Underwriting' },
              { id: 'legal', label: 'Legal Management' },
              { id: 'audit', label: 'Policy Audit Team (KYP)' },
              { id: 'performance', label: 'Performance Tracking' }
            ]
          }
        ]
      },
      {
        id: 'sidebar_sales',
        label: 'Sidebar: Sales View',
        subModules: [
          {
            id: 'sections',
            label: 'Sales Modules',
            actions: [
              { id: 'group', label: 'Group Visibility' },
              { id: 'dashboard', label: 'Sales Dashboard' },
              { id: 'manager', label: 'Sales Manager View' }
            ]
          }
        ]
      },
      {
        id: 'sidebar_admin',
        label: 'Sidebar: Administration',
        subModules: [
          {
            id: 'sections',
            label: 'Admin Modules',
            actions: [
              { id: 'group', label: 'Group Visibility' },
              { id: 'analytics', label: 'Business Analytics' },
              { id: 'ceo_suite', label: 'Business Analytics - CEO Suite' },
              { id: 'coo_hub', label: 'Business Analytics - COO Hub' },
              { id: 'users', label: 'User Management' },
              { id: 'system', label: 'System Admin' },
              { id: 'sys_connectors', label: 'System Admin: Connectors' },
              { id: 'sys_builder', label: 'System Admin: Forms Builder' },
              { id: 'sys_stages', label: 'System Admin: Claim Stages' },
              { id: 'sys_roles', label: 'System Admin: Roles & Access' },
              { id: 'sys_financials', label: 'System Admin: Financial Config' },
              { id: 'sys_claims_list', label: 'System Admin: Claims Registry' },
              { id: 'sys_logic', label: 'System Admin: Rule Engines' },
              { id: 'sys_templates', label: 'System Admin: Email Templates' },
              { id: 'sys_diagnosis', label: 'System Admin: Diagnosis Master' },
              { id: 'sys_rooms', label: 'System Admin: Room Categories' },
              { id: 'sys_reports', label: 'System Admin: Automated Reports' },
              { id: 'sys_integrations', label: 'System Admin: API & Integrations' },
              { id: 'sys_notifications', label: 'System Admin: Notifications' },
              { id: 'sys_invoices', label: 'Invoice Management' }
            ]
          }
        ]
      },
      {
        id: 'nav_features',
        label: 'Navigation Bar Features',
        subModules: [
          {
            id: 'actions',
            label: 'Header Functionalities',
            actions: [
              { id: 'view', label: 'Show Nav Bar' },
              { id: 'tab_bar', label: 'Show Mobile Tab Bar' },
              { id: 'search', label: 'Global Search' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'profile', label: 'Profile Menu' }
            ]
          }
        ]
      },
      {
        id: 'functional_access',
        label: 'Functional Management',
        subModules: [
          {
            id: 'recovery',
            label: 'Recovery Tracking Actions',
            actions: [
              { id: 'view', label: 'View' },
              { id: 'manage', label: 'Manage' }
            ]
          },
          {
            id: 'financial',
            label: 'Financial Oversight Actions',
            actions: [
              { id: 'view', label: 'View Wallet' },
              { id: 'manage', label: 'Manage Charges' }
            ]
          }
        ]
      },
      {
        id: 'stage_permissions',
        label: 'Cashless Stage Visibility',
        subModules: ROLE_STAGE_ENTITLEMENTS.flatMap(cat => cat.stages.map(stage => ({
          id: `stage_${stage.key}`,
          label: `${cat.category} → ${stage.label}`,
          actions: [
            { id: 'update', label: 'Update Stage' }
          ]
        })))
      },
      {
        id: 'claims',
        label: 'Claim Directory Actions',
        subModules: [
          {
            id: 'claims_list',
            label: 'All Claims',
            actions: [
              { id: 'view', label: 'View Content' },
              { id: 'edit', label: 'Edit Content' },
              { id: 'delete', label: 'Delete Entry' },
              { id: 'export', label: 'Export Data' }
            ]
          }
        ]
      }
    ];
    
    // Filter out anything related to 'validation' to respect user instructions
    const filteredStructure = structure.map(module => ({
      ...module,
      subModules: module.subModules
        .filter(sm => !sm.label.toLowerCase().includes('validation') && sm.id !== 'validation')
        .map(sm => ({
          ...sm,
          actions: sm.actions.filter(act => !act.label.toLowerCase().includes('validation') && act.id !== 'validation')
        }))
        .filter(sm => sm.actions.length > 0)
    })).filter(module => module.subModules.length > 0);

    return filteredStructure;
  }, [stages]);

  const handleCreateRole = () => {
    setEditingRole({
      id: `role-${Date.now()}`,
      name: '',
      description: '',
      permissions: [],
      products: [],
      canCreateRoles: [],
      allowedReports: [],
      users: 0,
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole({ 
      ...role, 
      canCreateRoles: role.canCreateRoles || [],
      products: role.products || [],
      allowedReports: role.allowedReports || [],
      status: role.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    if (role.name === 'Super Admin') return;
    setDeleteConfirmRole(role);
  };

  const confirmDeleteRole = async () => {
    if (deleteConfirmRole) {
      const roleName = deleteConfirmRole.name;
      try {
        await configApi.deleteRole(deleteConfirmRole.id);
        setRoles(roles.filter(r => r.id !== deleteConfirmRole.id));
        setDeleteConfirmRole(null);
        toast.success(`Role "${roleName}" has been successfully deleted.`);
      } catch (err) {
        toast.error("Failed to delete role.");
      }
    }
  };

  const handleToggleStatus = async (role: Role) => {
    if (role.name === 'Super Admin') return;
    const newStatus = (role.status === 'Active' ? 'Inactive' : 'Active') as 'Active' | 'Inactive';
    const updatedRole: Role = { ...role, status: newStatus };
    try {
      await configApi.updateRole(role.id, updatedRole);
      setRoles(roles.map(r => r.id === role.id ? updatedRole : r));
      toast.success(`Role "${role.name}" status updated to ${newStatus}.`);
    } catch (err) {
      toast.error("Failed to update role status.");
    }
  };

  const handleTogglePermission = (pId: string) => {
    if (!editingRole) return;
    const newPermissions = editingRole.permissions.includes(pId)
      ? editingRole.permissions.filter(id => id !== pId)
      : [...editingRole.permissions, pId];
    setEditingRole({ ...editingRole, permissions: newPermissions });
  };

  const handleSelectAllModule = (moduleId: string, checked: boolean) => {
    if (!editingRole) return;
    const module = dynamicPermissionStructure.find(m => m.id === moduleId);
    if (!module) return;

    const modulePermissionIds: string[] = [];
    module.subModules.forEach(sm => {
      sm.actions.forEach(a => {
        modulePermissionIds.push(`${moduleId}:${sm.id}:${a.id}`);
      });
    });

    let newPermissions = [...editingRole.permissions];
    if (checked) {
      // Add all if not already present
      modulePermissionIds.forEach(id => {
        if (!newPermissions.includes(id)) newPermissions.push(id);
      });
    } else {
      // Remove all
      newPermissions = newPermissions.filter(id => !modulePermissionIds.includes(id));
    }
    setEditingRole({ ...editingRole, permissions: newPermissions });
  };
  
  const handleToggleCreateRole = (roleName: string) => {
      if (!editingRole) return;
      const currentList = editingRole.canCreateRoles || [];
      const newList = currentList.includes(roleName)
          ? currentList.filter(r => r !== roleName)
          : [...currentList, roleName];
      setEditingRole({ ...editingRole, canCreateRoles: newList });
  };

  const handleToggleAllowedReport = (reportType: string) => {
      if (!editingRole) return;
      const currentList = editingRole.allowedReports || [];
      const newList = currentList.includes(reportType)
          ? currentList.filter(r => r !== reportType)
          : [...currentList, reportType];
      setEditingRole({ ...editingRole, allowedReports: newList });
  };

  const handleSaveRole = async () => {
    if (!editingRole || !editingRole.name) return;
    
    try {
      if (roles.some(r => r.id === editingRole.id)) {
        await configApi.updateRole(editingRole.id, editingRole);
        setRoles(roles.map(r => r.id === editingRole.id ? editingRole : r));
        toast.success(`Role "${editingRole.name}" saved successfully.`);
      } else {
        const res = await configApi.addRole(editingRole);
        const createdRole = res.data;
        setRoles([...roles, createdRole]);
        toast.success(`Role "${editingRole.name}" created successfully.`);
      }
      setIsModalOpen(false);
      setEditingRole(null);
    } catch (err) {
      toast.error("Failed to save role.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
            <ShieldAlert className="mr-3 text-indigo-600" size={28} />
            Role Directory
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configure hierarchical access & workflow permissions</p>
        </div>
        <button 
          onClick={handleCreateRole}
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center"
        >
          <Plus size={16} className="mr-2" /> Define New Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
            <div key={role.id} className={`bg-white rounded-2xl border ${role.status === 'Inactive' ? 'opacity-60 grayscale' : ''} border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-all p-6 group relative`}>
              {role.status === 'Inactive' && (
                <div className="absolute top-4 right-20 bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">Deactivated</div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${role.name === 'Super Admin' ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{role.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{getLinkedProfilesCount(role.name)} Linked Profiles</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => handleToggleStatus(role)} 
                    className={`p-2 transition-colors ${role.status === 'Active' ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-500'}`}
                    title={role.status === 'Active' ? 'Deactivate Role' : 'Activate Role'}
                    disabled={role.name === 'Super Admin'}
                  >
                    {role.status === 'Active' ? <CheckCircle2 size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => handleEditRole(role)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDeleteRole(role)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" disabled={role.name === 'Super Admin'}><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed h-8 line-clamp-2">{role.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {role.permissions.includes('all') ? (
                   <span className="flex items-center bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-bold">
                      <Lock size={10} className="mr-1" /> Super Admin Access
                   </span>
                ) : (
                  <>
                    {role.permissions.slice(0, 5).map(pId => (
                      <span key={pId} className="flex items-center bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-100">
                        <CheckCircle2 size={10} className="mr-1 text-emerald-500" /> {pId.split(':').pop() || pId}
                      </span>
                    ))}
                    {role.permissions.length > 5 && <span className="text-[10px] font-bold text-slate-400 px-2 py-1">+{role.permissions.length - 5} more</span>}
                  </>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                 <div className="flex space-x-2">
                   <PermissionIndicator icon={LayoutDashboard} active={role.permissions.some(p => p.startsWith('overview')) || role.permissions.includes('all')} title="Dashboard Access" />
                   <PermissionIndicator icon={Layers} active={role.permissions.some(p => p.includes('process_')) || role.permissions.includes('all')} title="Stage Workflow" />
                   <PermissionIndicator icon={Wallet} active={role.permissions.some(p => p.includes('financials')) || role.permissions.includes('all')} title="Financial Data" />
                 </div>
                 <button onClick={() => handleEditRole(role)} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">Configure Access</button>
              </div>
            </div>
          ))}
        </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Role?</h2>
              <p className="text-slate-500 text-sm mb-8">
                Are you sure you want to delete the role <strong>"{deleteConfirmRole.name}"</strong>? This action cannot be undone.
                {getLinkedProfilesCount(deleteConfirmRole.name) > 0 && (
                  <span className="block mt-4 p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-[10px] font-bold uppercase tracking-wider">
                    Warning: This role is currently assigned to {getLinkedProfilesCount(deleteConfirmRole.name)} users. Deleting it may affect their access.
                  </span>
                )}
              </p>
              <div className="flex space-x-4">
                <button 
                  onClick={confirmDeleteRole}
                  className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
                >
                  Delete Role
                </button>
                <button 
                  onClick={() => setDeleteConfirmRole(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && editingRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[95vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheck size={32} /></div>
                <div>
                   <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{editingRole.id.startsWith('role-') && !roles.find(r => r.id === editingRole.id) ? 'Create New Role' : 'Edit Access Control'}</h2>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Define Entitlements & Visibility</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-white rounded-xl transition-all"><X size={28} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Name</label>
                    <input 
                      type="text" 
                      value={editingRole.name} 
                      onChange={(e) => setEditingRole({...editingRole, name: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                      placeholder="e.g. Senior Auditor"
                    />
                 </div>
                 <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <input 
                      type="text"
                      value={editingRole.description} 
                      onChange={(e) => setEditingRole({...editingRole, description: e.target.value})} 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all" 
                      placeholder="Describe the scope of this role..."
                    />
                 </div>
                 <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select
                      value={editingRole.status}
                      onChange={(e) => setEditingRole({...editingRole, status: e.target.value as 'Active' | 'Inactive'})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                 </div>
              </div>

              {/* Hierarchical Creation Rights & Product Mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100">
                    <h4 className="text-[11px] font-black text-indigo-700 uppercase tracking-widest flex items-center border-b border-indigo-100 pb-2">
                       <UserPlus size={18} className="mr-2" /> Hierarchical Creation Access
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">Which roles can a user with the <strong>{editingRole.name || 'Current Role'}</strong> role create?</p>
                    <div className="grid grid-cols-2 gap-3">
                        {roles.filter(r => r.name !== 'Super Admin').map(r => {
                           const canCreate = editingRole.canCreateRoles?.includes(r.name);
                           return (
                               <button
                                  key={r.id}
                                  onClick={() => handleToggleCreateRole(r.name)}
                                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${canCreate ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                               >
                                  <span className="text-[10px] font-bold uppercase">{r.name}</span>
                                  {canCreate ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 border border-slate-300 rounded-sm"></div>}
                               </button>
                           )
                       })}
                    </div>
                </div>

                <div className="space-y-4 bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
                    <h4 className="text-[11px] font-black text-blue-700 uppercase tracking-widest flex items-center border-b border-blue-100 pb-2">
                       <FileDown size={18} className="mr-2" /> Report Downloads Access
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">Select report types this role is authorized to download:</p>
                    <div className="grid grid-cols-2 gap-3">
                        {['Business', 'Admission', 'Discharge', 'Outstanding', 'TAT', 'File Dispatch Pending'].map(report => {
                           const isAllowed = editingRole.allowedReports?.includes(report);
                           return (
                               <button
                                  key={report}
                                  onClick={() => handleToggleAllowedReport(report)}
                                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isAllowed ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                               >
                                  <span className="text-[10px] font-bold uppercase">{report}</span>
                                  {isAllowed ? <CheckCircle2 size={14} className="text-blue-600" /> : <div className="w-3.5 h-3.5 border border-slate-300 rounded-sm"></div>}
                               </button>
                           )
                       })}
                    </div>
                </div>
              </div>

              {/* Granular Permission Matrix (Management moved to Role Directory) */}
              {/* Super Admin can still view/edit them here in the modal if needed, but the request says remove section BESIDE Role Directory */}
              {/* So I will keep them in the modal as they ARE the access control definition */}
              <div className="space-y-10">
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight border-b-2 border-slate-900 pb-2 inline-block">Cashless Stage Visibility</h3>
                 
                 <div className="space-y-12">
                   {dynamicPermissionStructure.map(module => {
                     const modulePermissions = editingRole.permissions.filter(p => p.startsWith(`${module.id}:`));
                     const totalModulePermissions = module.subModules.reduce((acc, sm) => acc + sm.actions.length, 0);
                     const isAllModuleSelected = modulePermissions.length === totalModulePermissions;

                     return (
                       <div key={module.id} className="bg-slate-50/50 rounded-3xl border border-slate-200 overflow-hidden">
                         <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center ">
                           <div className="flex items-center space-x-3">
                             <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                               <PrivilegeIcon category={module.label} active={true} />
                             </div>
                             <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">{module.label}</h4>
                             <div className="text-slate-400 ml-2">
                               {null}
                             </div>
                           </div>
                           <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
                             <label className="flex items-center space-x-2 cursor-pointer group bg-slate-100/50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Enable Section</span>
                               <input 
                                 type="checkbox" 
                                 checked={isAllModuleSelected}
                                 onChange={(e) => {
                                   handleSelectAllModule(module.id, e.target.checked);
                                   
                                 }}
                                 className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                               />
                             </label>
                           </div>
                         </div>
                         
                         {true && (
                           <div className="p-6 space-y-8 bg-slate-50/20 border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
                           {module.subModules.map(subModule => (
                             <div key={subModule.id} className="space-y-4">
                               <div className="flex items-center space-x-2">
                                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                 <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{subModule.label}</h5>
                               </div>
                               <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 pl-4">
                                 {subModule.actions.map(action => {
                                   const pId = `${module.id}:${subModule.id}:${action.id}`;
                                   const isSelected = editingRole.permissions.includes(pId) || editingRole.permissions.includes('all');
                                   return (
                                     <label key={action.id} className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                       <input 
                                         type="checkbox"
                                         checked={isSelected}
                                         onChange={() => handleTogglePermission(pId)}
                                         className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                         disabled={editingRole.permissions.includes('all')}
                                       />
                                       <span className="text-[10px] font-black uppercase tracking-widest">{action.label}</span>
                                     </label>
                                   );
                                 })}
                               </div>
                             </div>
                           ))}
                         </div>
                         )}
                       </div>
                     );
                   })}
                 </div>

                  {/* Workflow Stages Matrix - Handled via dynamicPermissionStructure now */}
               </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex space-x-4 sticky bottom-0 z-20">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
              <button onClick={handleSaveRole} className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center"><Save size={18} className="mr-2" /> Save Configuration</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PrivilegeIcon = ({ category, active }: { category: string, active: boolean }) => {
  const color = active ? 'text-blue-600' : 'text-slate-400';
  switch (category) {
    case 'Overview Dashboard': return <LayoutDashboard size={18} className={color} />;
    case 'Patient Dashboard': return <User size={18} className={color} />;
    case 'Cashless Dashboard': return <Activity size={18} className={color} />;
    case 'Patient Management': return <Users size={18} className={color} />;
    case 'Claims Processing': return <FileText size={18} className={color} />;
    case 'Finance & Accounts': return <Database size={18} className={color} />;
    case 'System Admin': return <ShieldAlert size={18} className={color} />;
    case 'Workflow Stages Access': return <Layers size={18} className={color} />;
    case 'Cashless Control Center': return <Activity size={18} className={color} />;
    default: return <Key size={18} className={color} />;
  }
};

const PermissionIndicator = ({ icon: Icon, active, title }: any) => (
  <div className={`p-2 rounded-lg border ${active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`} title={title}><Icon size={14} /></div>
);

export default ManageRoles;
