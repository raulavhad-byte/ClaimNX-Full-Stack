
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { HospitalUser, InsuranceEntity, UploadedFile, SMTPConfig, Role, WalletTransaction } from '../types';
import UserManagement from './UserManagement';
import { 
  Building, MapPin, Mail, Phone, CreditCard, 
  ShieldCheck, Calendar, Edit2, CheckCircle2, 
  Upload, User, X, Eye, EyeOff,
  Loader2, Globe, ShieldPlus, FileText, CalendarDays, Paperclip, Trash2, Save, AlertTriangle, FileSpreadsheet, Search, Download,
  Server, RefreshCw, Link as LinkIcon, Check, LogOut, Settings2, AtSign,
  Activity, Key, Radio, Stethoscope, Landmark, Receipt, ReceiptIndianRupee, Wallet, IndianRupee, ArrowUpCircle, ArrowDownCircle, ToggleLeft, ToggleRight, Plus, History as HistoryIcon, ArrowUpRight
} from 'lucide-react';

import { formatDate, isValidYearFormat, checkDateReasonability } from '../utils';
import { toast } from 'sonner';
import { documentsApi, usersApi, ordersApi } from '../services/api';
import { claimnxApi } from '../services/claimnx-api';

interface ManageHospitalProps {
  user: HospitalUser;
  onUpdate: (user: HospitalUser) => void;
  insurers: InsuranceEntity[];
  tpas: InsuranceEntity[];
  setInsurers: (list: InsuranceEntity[]) => void;
  setTpas: (list: InsuranceEntity[]) => void;
  users?: HospitalUser[];
  setUsers?: React.Dispatch<React.SetStateAction<HospitalUser[]>>;
  roles?: Role[];
  permissions?: string[];
}

interface Invoice {
  id: string;
  month: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  generatedDate: string;
  dueDate: string;
}

type MainTab = 'Hospital Profile' | 'Team Access' | 'Payer Config' | 'Digital Assets' | 'NHCX Onboarding' | 'Email Integration' | 'Wallet & Billing';
type ProfileSubTab = 'Basic Details' | 'Account Details';

const EMAIL_PRESETS: Record<string, { host: string; port: number }> = {
  'Gmail': { host: 'smtp.gmail.com', port: 587 },
  'Microsoft Office': { host: 'smtp.office365.com', port: 587 },
  'Outlook': { host: 'smtp-mail.outlook.com', port: 587 },
  'Yahoo Mail': { host: 'smtp.mail.yahoo.com', port: 587 },
  'Icloud Mail': { host: 'smtp.mail.me.com', port: 587 },
  'Zoho Mail': { host: 'smtp.zoho.com', port: 465 },
  'Rediff Mail': { host: 'smtp.rediffmail.com', port: 587 },
  'Local Domain': { host: 'smtp.yourdomain.com', port: 25 }
};

const ManageHospital: React.FC<ManageHospitalProps> = ({ 
  user, onUpdate, insurers, tpas, setInsurers, setTpas, users, setUsers, roles = [], permissions = []
}) => {
  const canAccess = (key: string) => {
    const isHospitalManageEnabled = user.valueAddedServices?.hospitalManageEnabled === true || user.role?.toUpperCase() === 'SUPER ADMIN';
    
    if (key !== 'tab_hospital_profile') {
      if (!isHospitalManageEnabled) return false;
    }

    if (user.role === 'Super Admin' || user.isAdmin) return true;
    if (permissions.includes('all')) return true;
    
    const navToModuleMap: Record<string, string> = {
      'tab_hospital_profile': 'administration:hospital:profile',
      'tab_team_access': 'administration:hospital:team',
      'tab_payer_config': 'administration:hospital:payer',
      'tab_digital_assets': 'administration:hospital:assets',
      'tab_nhcx_onboarding': 'administration:hospital:nhcx',
      'tab_email_integration': 'administration:hospital:email',
      'tab_wallet_billing': 'administration:hospital:billing'
    };

    const moduleId = navToModuleMap[key] || key;
    return permissions.some(p => p.startsWith(`${moduleId}:`) || p === moduleId);
  };

  const allTabs: { label: MainTab; permission: string }[] = [
    { label: 'Hospital Profile', permission: 'tab_hospital_profile' },
    { label: 'Team Access', permission: 'tab_team_access' },
    { label: 'Payer Config', permission: 'tab_payer_config' },
    { label: 'Digital Assets', permission: 'tab_digital_assets' },
    { label: 'NHCX Onboarding', permission: 'tab_nhcx_onboarding' },
    { label: 'Email Integration', permission: 'tab_email_integration' },
    { label: 'Wallet & Billing', permission: 'tab_wallet_billing' }
  ];

  const visibleTabs = useMemo(() => {
    return allTabs.filter(tab => canAccess(tab.permission)).map(tab => tab.label);
  }, [permissions, user]);

  const [activeMainTab, setActiveMainTab] = useState<MainTab>(visibleTabs[0] || 'Hospital Profile');

  // Roles grant access to individual Hospital Management tabs. The tab bar is
  // only the navigation between those granted tabs, so it must not require a
  // second, unrelated UI permission.
  useEffect(() => {
    if (!visibleTabs.includes(activeMainTab)) {
      setActiveMainTab(visibleTabs[0] || 'Hospital Profile');
    }
  }, [activeMainTab, visibleTabs]);
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('Basic Details');
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Payer Config State
  const [payerFilter, setPayerFilter] = useState<'Insurers' | 'TPAs' | 'Hospital Tie Up List'>('Insurers');
  const [savingEntityId, setSavingEntityId] = useState<string | null>(null);
  const [editingTieUp, setEditingTieUp] = useState<InsuranceEntity | null>(null);
  const [payerToRemove, setPayerToRemove] = useState<InsuranceEntity | null>(null);
  const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null);

  // Visibility States
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [previewRateList, setPreviewRateList] = useState<{ entityName: string, fileName: string, fileData?: string, fileType?: string } | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (previewRateList?.fileData) {
      if (previewRateList.fileData.startsWith('http://') || previewRateList.fileData.startsWith('https://')) {
        setBlobUrl(previewRateList.fileData);
        return;
      }
      try {
        const byteCharacters = atob(previewRateList.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: previewRateList.fileType || 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error("Failed to create blob URL", e);
      }
    } else {
      setBlobUrl(null);
    }
  }, [previewRateList]);

  // Email Integration State
  const [configuringEmailType, setConfiguringEmailType] = useState<string | null>(null);
  const [emailConfigForm, setEmailConfigForm] = useState({
    email: '',
    password: '',
    provider: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587
  });
  // Only platform administrators may choose a different onboarded hospital.
  // Hospital users must never see or operate the cross-hospital selector.
  const canManageAnyHospitalEmail = ['SUPER ADMIN', 'ADMIN'].includes(user.role?.toUpperCase() || '');
  const onboardingHospitals = useMemo(
    () => (users || []).filter((entry: any) => (entry.entityType || '').toUpperCase() === 'HOSPITAL'),
    [users],
  );
  const [emailHospitalId, setEmailHospitalId] = useState(user.hospitalId || '');
  const [emailHospitalSearch, setEmailHospitalSearch] = useState('');
  const [isStartingGmailOAuth, setIsStartingGmailOAuth] = useState(false);
  const [connectedMailboxes, setConnectedMailboxes] = useState<any[]>([]);
  const filteredOnboardingHospitals = useMemo(() => {
    const search = emailHospitalSearch.trim().toLowerCase();
    if (!search) return onboardingHospitals;
    return onboardingHospitals.filter((hospital: any) => {
      const name = String(hospital.hospitalName || hospital.displayName || hospital.name || '').toLowerCase();
      const code = String(hospital.hospitalCode || hospital.rohiniId || '').toLowerCase();
      return name.includes(search) || code.includes(search);
    });
  }, [emailHospitalSearch, onboardingHospitals]);
  const emailTargetHospitalId = emailHospitalId || user.hospitalId || '';

  useEffect(() => {
    if (!emailTargetHospitalId) {
      setConnectedMailboxes([]);
      return;
    }
    claimnxApi.get<any[]>(`/email/mailboxes?hospitalIds=${encodeURIComponent(emailTargetHospitalId)}`)
      .then((accounts) => setConnectedMailboxes(accounts.filter((account) => account.status === 'ACTIVE')))
      .catch(() => setConnectedMailboxes([]));
  }, [emailTargetHospitalId]);

  // Digital Assets
  const [processingImage, setProcessingImage] = useState<string | null>(null);

  // Wallet & Billing States
  const [autoDebit, setAutoDebit] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showFullLedger, setShowFullLedger] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [walletError, setWalletError] = useState('');
  
  // Online Gateway State Managers
  const [activeBillingSubTab, setActiveBillingSubTab] = useState<'invoices' | 'gateway_logs'>('invoices');
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [razorpayConfig, setRazorpayConfig] = useState<{
    amount: number;
    purpose: 'TopUp' | 'InvoicePayment';
    invoiceId?: string;
    selectedMethod: 'Card' | 'UPI' | 'Netbanking' | 'QR';
    upiId: string;
    cardNum: string;
    cardExpiry: string;
    cardCvv: string;
    bankSelected: string;
    status: 'MethodSelection' | 'Paying' | 'Success';
    txnProgress: number;
  }>({
    amount: 0,
    purpose: 'TopUp',
    invoiceId: undefined,
    selectedMethod: 'Card',
    upiId: '',
    cardNum: '',
    cardExpiry: '',
    cardCvv: '',
    bankSelected: 'HDFC Bank',
    status: 'MethodSelection',
    txnProgress: 0
  });
  
  // Mock Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'INV-2025-001', month: 'January 2025', amount: 4500, status: 'Paid', generatedDate: '2025-01-31', dueDate: '2025-02-05' },
    { id: 'INV-2025-002', month: 'February 2025', amount: 3200, status: 'Overdue', generatedDate: '2025-02-28', dueDate: '2025-03-05' },
    { id: 'INV-2025-003', month: 'March 2025', amount: 5100, status: 'Pending', generatedDate: '2025-03-31', dueDate: '2025-04-05' },
  ]);

  // Document Modals
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    fileData: '',
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState<HospitalUser>({
    ...user,
    displayNameFull: user.displayNameFull || user.hospitalName,
    website: user.website || 'www.claimnx.com',
    smtpConfigs: user.smtpConfigs || [],
    portalCredentials: user.portalCredentials || [],
    nhcxConfig: user.nhcxConfig || {
      hfrId: user.rohiniId || '',
      nodeId: '',
      publicKey: '',
      endpointUrl: '',
      status: 'Pending'
    },
    apiConfig: user.apiConfig || {
      webhookUrl: '',
      apiKey: 'claimnx_partner_key_123',
      externalIntegEnabled: false,
      autoUpdateEnabled: false
    },
    invoiceGenerationType: user.invoiceGenerationType || 'Centralized', // Default
    walletBalance: user.walletBalance || 0,
    transactions: (user.transactions && user.transactions.length > 0) ? user.transactions : [
      {
        id: 'tx-101',
        date: '2025-06-21T18:45:00Z',
        type: 'Debit',
        amount: 4500,
        description: 'Invoice INV-2025-001 Settled',
        gateway: 'Razorpay',
        gatewayTxnId: 'pay_RP_MOCK9212',
        gatewayOrderId: 'order_RP_or_342125',
        reconciliationStatus: 'Reconciled (Auto Match)',
        bankRef: 'ref_bank_8123982312'
      },
      {
        id: 'tx-102',
        date: '2025-06-15T16:20:00Z',
        type: 'Credit',
        amount: 10000,
        description: 'Wallet Recharge via Razorpay',
        gateway: 'Razorpay',
        gatewayTxnId: 'pay_RP_MOCK8721',
        gatewayOrderId: 'order_RP_or_109283',
        reconciliationStatus: 'Reconciled (Auto Match)',
        bankRef: 'ref_bank_2129831923'
      },
      {
        id: 'tx-103',
        date: '2025-05-01T10:00:00Z',
        type: 'Credit',
        amount: 5000,
        description: 'Initial Wallet Setup Bonus',
        gateway: 'Wallet',
        reconciliationStatus: 'Reconciled (Auto Match)'
      }
    ],
    documents: user.documents || [
      { name: 'Accreditation certificates (ISO/NABH/NABL/EQAS)', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: '17/2 Tax Exemption', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: 'Service tax registration', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: 'PAN Copy', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: 'Cancelled Cheque', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: 'Tariff - IP', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: 'Pollution Control certificate', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: 'MOU', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: 'Registration certificate', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
      { name: 'Hospital Brochure', validity: 'NA', count: 0, status: 'Incomplete', files: [] },
    ]
  });

  const handleInputChange = (field: keyof HospitalUser, value: any) => {
    let finalVal = value;
    if (typeof value === "string" && (field === 'mobileNo' || field === 'tpaPersonMobile' || field === 'doctorMobileNo')) {
      finalVal = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: finalVal }));
  };

  const handleSave = async () => {
    try {
      await usersApi.update(formData.id!, formData);
      onUpdate(formData);
      // Also update in the global users list if present
      if (setUsers && users) {
        setUsers(users.map(u => u.id === formData.id ? formData : u));
      }
      setIsEditingBasic(false);
      setIsEditingAccount(false);
      toast.success("Profile saved successfully");
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      toast.error("Failed to save profile details.");
    }
  };



  // --- Wallet Handlers ---
  const triggerRazorpayCheckout = (amount: number, purpose: 'TopUp' | 'InvoicePayment', invoiceId?: string) => {
    setRazorpayConfig({
      amount,
      purpose,
      invoiceId,
      selectedMethod: 'Card',
      upiId: 'hospital@okhdfcbank',
      cardNum: '4312 8821 9089 3214',
      cardExpiry: '12/29',
      cardCvv: '445',
      bankSelected: 'HDFC Bank',
      status: 'MethodSelection',
      txnProgress: 0
    });
    setShowRazorpayModal(true);
    setShowTopUp(false);
  };

  const handleExecuteRazorpaySimulatedPayment = () => {
    setRazorpayConfig(prev => ({ ...prev, status: 'Paying', txnProgress: 5 }));
    
    let progress = 5;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setTimeout(() => {
          const txId = `pay_RP_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
          const orderId = `order_RP_or_${Math.floor(100000 + Math.random() * 900000)}`;
          const bankRef = `ref_bank_${Math.floor(1000000000 + Math.random() * 9000000000)}`;
          
          // Send all checkout/order fields to Supabase via backend API
          const orderPayload = {
            amount: razorpayConfig.amount,
            purpose: razorpayConfig.purpose,
            invoiceId: razorpayConfig.invoiceId || null,
            selectedMethod: razorpayConfig.selectedMethod,
            upiId: razorpayConfig.upiId || null,
            cardNum: razorpayConfig.cardNum || null,
            cardExpiry: razorpayConfig.cardExpiry || null,
            bankSelected: razorpayConfig.bankSelected || null,
            orderId: orderId,
            txnId: txId,
            bankRef: bankRef,
            hospitalId: formData.hospitalId || formData.id || 'unknown'
          };
          ordersApi.create(orderPayload).catch(err => {
            console.error('Failed to send order fields to Supabase:', err);
          });
          
          if (razorpayConfig.purpose === 'TopUp') {
            const newTx: WalletTransaction = {
              id: `tx-top-${Date.now()}`,
              date: new Date().toISOString(),
              type: 'Credit',
              amount: razorpayConfig.amount,
              description: `Online Gateway Recharge (Razorpay)`,
              referenceId: orderId,
              gateway: 'Razorpay',
              gatewayTxnId: txId,
              gatewayOrderId: orderId,
              reconciliationStatus: 'Reconciled (Auto Match)',
              bankRef: bankRef
            };
            const updated = {
              ...formData,
              walletBalance: (formData.walletBalance || 0) + razorpayConfig.amount,
              transactions: [newTx, ...(formData.transactions || [])]
            };
            setFormData(updated);
            onUpdate(updated);
            setTopUpAmount('');
            toast.success(`Wallet successfully recharged with ₹${razorpayConfig.amount.toLocaleString()} via Razorpay!`);
          } else {
            const newTx: WalletTransaction = {
              id: `tx-inv-${Date.now()}`,
              date: new Date().toISOString(),
              type: 'Debit',
              amount: razorpayConfig.amount,
              description: `Invoice Settled (Razorpay): ${razorpayConfig.invoiceId}`,
              referenceId: razorpayConfig.invoiceId,
              gateway: 'Razorpay',
              gatewayTxnId: txId,
              gatewayOrderId: orderId,
              reconciliationStatus: 'Reconciled (Auto Match)',
              bankRef: bankRef
            };
            const updated = {
              ...formData,
              transactions: [newTx, ...(formData.transactions || [])]
            };
            setFormData(updated);
            onUpdate(updated);
            
            const updatedInvoices = invoices.map(inv => 
              inv.id === razorpayConfig.invoiceId ? { ...inv, status: 'Paid' as const } : inv
            );
            setInvoices(updatedInvoices);
            setPaymentModal(null);
            toast.success(`Invoice ${razorpayConfig.invoiceId} successfully paid via Razorpay!`);
          }
          
          setRazorpayConfig(prev => ({ ...prev, status: 'Success', txnProgress: 100 }));
        }, 500);
      } else {
        setRazorpayConfig(prev => ({ ...prev, txnProgress: progress }));
      }
    }, 150);
  };

  const handlePayInvoice = (method: 'Wallet' | 'External') => {
    if (!paymentModal) return;
    setIsProcessingPayment(true);
    setWalletError('');

    setTimeout(() => {
       if (method === 'Wallet') {
          if (formData.walletBalance < paymentModal.amount) {
             setWalletError('Insufficient Wallet Balance. Please Top-up or use External method.');
             setIsProcessingPayment(false);
             return;
          }
          
          const newTx: WalletTransaction = {
             id: `tx-inv-${Date.now()}`,
             date: new Date().toISOString(),
             type: 'Debit',
             amount: paymentModal.amount,
             description: `Invoice Payment: ${paymentModal.id}`,
             referenceId: paymentModal.id,
             gateway: 'Wallet',
             reconciliationStatus: 'Reconciled (Auto Match)'
          };
          const updatedUser = {
             ...formData,
             walletBalance: formData.walletBalance - paymentModal.amount,
             transactions: [newTx, ...(formData.transactions || [])]
          };
          setFormData(updatedUser);
          onUpdate(updatedUser);
       } 

       const updatedInvoices = invoices.map(inv => 
          inv.id === paymentModal.id ? { ...inv, status: 'Paid' as const } : inv
       );
       setInvoices(updatedInvoices);
       
       setIsProcessingPayment(false);
       setPaymentModal(null);
    }, 1500);
  };

  const handleTopUp = () => {
    const amt = Number(topUpAmount);
    if (amt > 0) {
      triggerRazorpayCheckout(amt, 'TopUp');
    }
  };

  const resizeTo100x100 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 300; // Increased resolution for better seal quality
          canvas.height = 300; 
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.clearRect(0, 0, 300, 300);
            const ratio = Math.min(300 / img.width, 300 / img.height);
            const newWidth = img.width * ratio;
            const newHeight = img.height * ratio;
            const x = (300 - newWidth) / 2;
            const y = (300 - newHeight) / 2;
            ctx.drawImage(img, x, y, newWidth, newHeight);
            resolve(canvas.toDataURL('image/png', 0.95));
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAssetUpload = async (field: 'hospitalSeal' | 'doctorStamp', file: File | null) => {
    if (!file) return;
    setProcessingImage(field);
    try {
      const resizedDataUrl = await resizeTo100x100(file);
      const updated = { ...formData, [field]: resizedDataUrl };
      setFormData(updated);
      onUpdate(updated); // Save immediately
    } catch (err) {
      console.error("Image processing failed:", err);
    } finally {
      setTimeout(() => setProcessingImage(null), 800);
    }
  };

  // ... (Other handlers like handleFileSelection, handleToggleTieUp, etc. remain the same)
  const handleToggleTieUp = (entityId: string, isChecked: boolean) => {
    let currentCreds = [...(formData.portalCredentials || [])];
    if (isChecked) {
      if (!currentCreds.find(c => c.entityId === entityId)) {
        currentCreds.push({ entityId, username: '', password: '', startDate: '', endDate: '', rateListName: '' });
        setExpandedEntityId(entityId);
      }
    } else {
      currentCreds = currentCreds.filter(c => c.entityId !== entityId);
      if (expandedEntityId === entityId) setExpandedEntityId(null);
    }
    setFormData(prev => ({ ...prev, portalCredentials: currentCreds }));
  };

  const validateDateOnBlur = (entityId: string, field: string, value: string) => {
    if (!value) return;
    
    // 4-digit year limit
    const yearStr = value.split('-')[0];
    if (yearStr && yearStr.length > 4) {
      toast.error("Year cannot exceed 4 digits. Please correct the date.");
      handleUpdateCredential(entityId, field, "");
      return;
    }

    const result = checkDateReasonability(value, 'other');
    
    if (!result.isReasonable) {
      toast.warning(
        `Unusual Date: You ${result.message}. Please double check if this is correct.`,
        {
          action: {
            label: "Correct",
            onClick: () => {}
          },
          cancel: {
            label: "Change",
            onClick: () => handleUpdateCredential(entityId, field, "")
          },
          duration: 10000
        }
      );
    }
  };

  const handleUpdateCredential = (entityId: string, field: string, value: any) => {
    const currentCreds = (formData.portalCredentials || []).map(c => 
      c.entityId === entityId ? { ...c, [field]: value } : c
    );
    setFormData(prev => ({ ...prev, portalCredentials: currentCreds }));
  };

  const handleRateListUpload = (entityId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!formData.id) {
        toast.error('Hospital profile is not available for file upload.');
        return;
      }
      setSavingEntityId(`upload-${entityId}`);
      documentsApi.uploadHospitalRateList({
        hospitalUserId: formData.id,
        payerId: entityId,
        file,
      }).then((asset) => {
        const currentCreds = (formData.portalCredentials || []).map((credential: any) =>
          credential.entityId === entityId ? {
            ...credential,
            rateListName: asset.file_name || file.name,
            rateListStoragePath: asset.storage_path,
            rateListType: asset.mime_type || file.type,
            // Purge the old inline value so a subsequent profile save stays
            // small regardless of the uploaded file size.
            rateListData: '',
          } : credential,
        );
        setFormData((previous) => ({ ...previous, portalCredentials: currentCreds }));
        toast.success('Rate list stored securely. Click Save Configuration to link it to this payer.');
      }).catch((error) => {
        console.error('Rate-list upload failed', error);
        toast.error(error?.message || 'Unable to upload rate list.');
      }).finally(() => setSavingEntityId(null));
    }
  };

  const openRateListPreview = async (entityName: string, credential: any) => {
    try {
      if (credential?.rateListStoragePath) {
        const preview = await documentsApi.previewHospitalRateList(credential.rateListStoragePath);
        setPreviewRateList({
          entityName,
          fileName: credential.rateListName || 'Rate List',
          fileData: preview.preview_url,
          fileType: credential.rateListType || 'application/pdf',
        });
        return;
      }
      setPreviewRateList({ entityName, fileName: credential?.rateListName || 'Rate List', fileData: credential?.rateListData, fileType: credential?.rateListType });
    } catch (error: any) {
      console.error('Rate-list preview failed', error);
      toast.error(error?.message || 'Unable to preview rate list.');
    }
  };

  const downloadRateList = async (credential: any) => {
    try {
      if (credential?.rateListStoragePath) {
        const preview = await documentsApi.previewHospitalRateList(credential.rateListStoragePath);
        handleDownload(credential.rateListName || 'Rate List', preview.preview_url, credential.rateListType);
        return;
      }
      handleDownload(credential?.rateListName || 'Rate List', credential?.rateListData, credential?.rateListType);
    } catch (error: any) {
      console.error('Rate-list download failed', error);
      toast.error(error?.message || 'Unable to download rate list.');
    }
  };

  const saveCredentials = async (entityId: string) => {
    setSavingEntityId(entityId);
    try {
      await usersApi.update(formData.id!, formData);
      onUpdate(formData);
      // Also update in the global users list if present
      if (setUsers && users) {
        setUsers(users.map(u => u.id === formData.id ? formData : u));
      }
      setSavingEntityId('success-' + entityId);
      toast.success("Payer config saved and synced.");
      setTimeout(() => {
          setSavingEntityId(null);
          setExpandedEntityId(null);
      }, 1000);
    } catch (err: any) {
      console.error("Failed to save credentials:", err);
      toast.error("Failed to save configuration.");
      setSavingEntityId(null);
    }
  };
  
  const togglePasswordVisibility = (entityId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [entityId]: !prev[entityId] }));
  };

  // Helper: DD-MM-YYYY format
  const formatDateDDMMYYYY = (dateStr: string) => {
     if (!dateStr) return 'Not Set';
     const date = new Date(dateStr);
     if (isNaN(date.getTime())) return dateStr;
     return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const sortedPayers = useMemo(() => {
    if (payerFilter === 'Hospital Tie Up List') {
       const all = [...insurers, ...tpas];
       return all.filter(e => formData.portalCredentials?.some(c => c.entityId === e.name))
                 .sort((a, b) => a.name.localeCompare(b.name));
    }
    const list = payerFilter === 'Insurers' ? insurers : tpas;
    return [...list].sort((a, b) => {
       const aLinked = formData.portalCredentials?.some(c => c.entityId === a.name);
       const bLinked = formData.portalCredentials?.some(c => c.entityId === b.name);
       if (aLinked && !bLinked) return -1;
       if (!aLinked && bLinked) return 1;
       return a.name.localeCompare(b.name);
    });
  }, [payerFilter, insurers, tpas, formData.portalCredentials]);

  const openEmailConfig = (type: string) => {
     const existing = formData.smtpConfigs?.find(c => c.provider === type);
     const connectedGmail = type === 'Gmail'
       ? connectedMailboxes.find((mailbox) => mailbox.provider === 'GMAIL')
       : undefined;
     setConfiguringEmailType(type);
     setEmailConfigForm({
        email: connectedGmail?.email_address || existing?.username || '',
        password: existing?.password || '',
        provider: type,
        host: existing?.host || EMAIL_PRESETS[type]?.host || 'smtp.gmail.com',
        port: existing?.port || EMAIL_PRESETS[type]?.port || 587
     });
  };

  const handleSaveEmailConfig = () => {
    if (!configuringEmailType) return;
    
    const newConfig: SMTPConfig = {
      id: Math.random().toString(36).substr(2, 9),
      provider: configuringEmailType,
      username: emailConfigForm.email,
      password: emailConfigForm.password,
      host: emailConfigForm.host,
      port: emailConfigForm.port,
      secure: emailConfigForm.port === 465,
      fromEmail: emailConfigForm.email,
      status: 'Connected'
    };

    const updatedConfigs = [...(formData.smtpConfigs || [])];
    const existingIndex = updatedConfigs.findIndex(c => c.provider === configuringEmailType);
    
    if (existingIndex >= 0) {
      updatedConfigs[existingIndex] = newConfig;
    } else {
      updatedConfigs.push(newConfig);
    }

    setFormData(prev => ({ ...prev, smtpConfigs: updatedConfigs }));
    setConfiguringEmailType(null);
  };

  const handleConnectGmail = async () => {
    let hospitalId: string;
    try {
      hospitalId = await resolveEmailHospitalId();
    } catch (error: any) {
      toast.error(error?.message || 'Select the hospital that will own this mailbox.');
      return;
    }
    const emailAddress = emailConfigForm.email.trim();
    if (!hospitalId) {
      toast.error('Select the hospital that will own this mailbox.');
      return;
    }
    if (!emailAddress) {
      toast.error('Enter the Gmail address to connect.');
      return;
    }
    setIsStartingGmailOAuth(true);
    try {
      const result = await claimnxApi.post<{ authorizationUrl: string }>('/email/gmail/oauth/authorize', {
        hospitalId,
        emailAddress,
        displayName: formData.hospitalName || formData.displayNameFull || 'ClaimNX Claims Desk',
      });
      window.location.assign(result.authorizationUrl);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to start Gmail authorization.');
      setIsStartingGmailOAuth(false);
    }
  };

  const resolveEmailHospitalId = async (): Promise<string> => {
    const selectedId = emailHospitalId || user.hospitalId || formData.hospitalId || '';
    // Hospital Management historically stored some non-UUID identifiers in
    // browser profile data. OAuth must always use the canonical hospitals.id.
    const hospitals = await claimnxApi.get<any>('/hospitals');
    const list = Array.isArray(hospitals) ? hospitals : (hospitals?.data || []);
    const direct = list.find((hospital: any) => String(hospital?.id) === String(selectedId));
    if (direct?.id) return String(direct.id);
    const normalize = (value: unknown) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const names = [formData.hospitalName, formData.displayNameFull, user.hospitalName, user.displayNameFull]
      .map(normalize)
      .filter(Boolean);
    const matchingHospital = list.find((hospital: any) => names.includes(normalize(hospital?.hospitalName || hospital?.hospital_name || hospital?.displayName || hospital?.display_name || hospital?.name)));
    if (!matchingHospital?.id) throw new Error('The selected hospital does not exist or is inactive. Please select an active onboarded hospital.');
    setEmailHospitalId(String(matchingHospital.id));
    return String(matchingHospital.id);
  };

  const handleConnectOAuthMailbox = async (provider: 'Microsoft Office' | 'Outlook' | 'Yahoo Mail') => {
    let hospitalId: string;
    try {
      hospitalId = await resolveEmailHospitalId();
    } catch (error: any) {
      toast.error(error?.message || 'Select the hospital that will own this mailbox.');
      return;
    }
    const emailAddress = emailConfigForm.email.trim();
    if (!hospitalId) { toast.error('Select the hospital that will own this mailbox.'); return; }
    if (!emailAddress) { toast.error('Enter the mailbox address to connect.'); return; }
    try {
      const endpoint = provider === 'Yahoo Mail' ? '/email/yahoo/oauth/authorize' : '/email/microsoft/oauth/authorize';
      const result = await claimnxApi.post<{ authorizationUrl: string }>(endpoint, { hospitalId, emailAddress, displayName: formData.hospitalName || formData.displayNameFull || 'ClaimNX Claims Desk' });
      window.location.assign(result.authorizationUrl);
    } catch (error: any) {
      toast.error(error?.message || `Unable to start ${provider} authorization.`);
    }
  };

  const [isVerifyingNHCX, setIsVerifyingNHCX] = useState(false);
  const handleNHCXVerify = () => {
    setIsVerifyingNHCX(true);
    setTimeout(() => {
      setIsVerifyingNHCX(false);
      setFormData(prev => ({
        ...prev,
        nhcxConfig: {
          ...prev.nhcxConfig!,
          status: 'Active'
        }
      }));
    }, 2000);
  };

  const handleDownload = (name: string, data: string, type?: string) => {
    const link = document.createElement('a');
    link.href = data?.startsWith('http://') || data?.startsWith('https://')
      ? data
      : `data:${type || 'application/pdf'};base64,${data}`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      {visibleTabs.length > 0 && (
        <nav className="bg-white border-b border-slate-200 px-8 flex items-center space-x-8 h-14 shrink-0 shadow-sm z-10 overflow-x-auto no-scrollbar">
          {visibleTabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveMainTab(tab)}
              className={`h-full px-2 text-sm font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${activeMainTab === tab ? 'text-blue-700 border-blue-700' : 'text-slate-400 border-transparent hover:text-slate-800'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      )}

      <div className="bg-white border-b border-slate-100 py-4 px-8 shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{formData.hospitalName}</h1>
        <div className="flex items-center space-x-2">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Tab:</span>
           <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase border border-blue-100">{activeMainTab}</span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-8">
        {activeMainTab === 'Hospital Profile' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex bg-slate-200 p-1 rounded-xl w-fit shadow-inner">
              {(['Basic Details', 'Account Details'] as ProfileSubTab[]).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setProfileSubTab(tab)}
                  className={`px-10 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${profileSubTab === tab ? 'bg-blue-700 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            {profileSubTab === 'Basic Details' && (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-2">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <SectionHeading icon={Building} title="Hospital Details" subtitle="Verified Institutional Identity" />
                  <button onClick={() => setIsEditingBasic(!isEditingBasic)} className="text-blue-600 hover:text-blue-800 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all active:scale-95"><Edit2 size={20} /></button>
                </div>
                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  <FieldView label="Hospital Name" value={formData.hospitalName} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('hospitalName', v)} />
                  <FieldView label="Address" value={formData.address} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('address', v)} isTextArea />
                  <FieldView label="Rohini ID" value={formData.rohiniId} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('rohiniId', v)} />
                  <FieldView label="Official Email ID" value={formData.emailId} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('emailId', v)} />
                  <FieldView label="Official Mobile No" value={formData.mobileNo} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('mobileNo', v)} />
                  
                  <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><User size={16} className="mr-2" /> Key Personnel</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                      <FieldView label="TPA Person Name" value={formData.tpaPersonName} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('tpaPersonName', v)} />
                      <FieldView label="TPA Person Mobile" value={formData.tpaPersonMobile} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('tpaPersonMobile', v)} />
                      <FieldView label="Treating Dr. Name" value={formData.doctorName} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('doctorName', v)} />
                      <FieldView label="Dr. Mobile No" value={formData.doctorMobileNo} isEditing={isEditingBasic} onChange={(v: string) => handleInputChange('doctorMobileNo', v)} />
                    </div>
                  </div>
                </div>
                {isEditingBasic && (
                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
                    <button onClick={() => setIsEditingBasic(false)} className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                    <button onClick={handleSave} className="px-10 py-3 bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Commit Changes</button>
                  </div>
                )}
              </div>
            )}

            {profileSubTab === 'Account Details' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-2">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <SectionHeading icon={CreditCard} title="Registration & Accounts" subtitle="Fiscal and Legal Registry" />
                    <button onClick={() => setIsEditingAccount(!isEditingAccount)} className="text-blue-600 hover:text-blue-800 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all active:scale-95"><Edit2 size={20} /></button>
                  </div>
                  <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                    <FieldView label="Registration No." value={formData.registrationNo} isEditing={isEditingAccount} onChange={(v: string) => handleInputChange('registrationNo', v)} />
                    <FieldView label="Rohini ID" value={formData.rohiniId} isEditing={isEditingAccount} onChange={(v: string) => handleInputChange('rohiniId', v)} />
                    <FieldView label="PAN card No." value={formData.panNo} isEditing={isEditingAccount} onChange={(v: string) => handleInputChange('panNo', v)} />
                    <FieldView label="Account No." value={formData.accountNo} isEditing={isEditingAccount} onChange={(v: string) => handleInputChange('accountNo', v)} />
                    <FieldView label="IFSC code" value={formData.ifscCode} isEditing={isEditingAccount} onChange={(v: string) => handleInputChange('ifscCode', v)} />
                    <FieldView label="Bank name" value={formData.bankName} isEditing={isEditingAccount} onChange={(v: string) => handleInputChange('bankName', v)} />
                  </div>
                </div>

                {/* INVOICING CONFIGURATION SECTION */}
                {(user.role === 'Super Admin' || user.role === 'Department Head') && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-3">
                    <div className="p-8 border-b border-indigo-100 flex justify-between items-center bg-indigo-50/50">
                        <SectionHeading icon={ReceiptIndianRupee} title="Branch & Invoicing Architecture" subtitle="Billing flow configuration for managed units" />
                        <button onClick={() => setIsEditingAccount(!isEditingAccount)} className="text-indigo-600 hover:text-indigo-800 p-3 bg-white border border-indigo-100 rounded-2xl shadow-sm transition-all active:scale-95"><Edit2 size={20} /></button>
                    </div>
                    <div className="p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Invoice Generation Policy</label>
                                <div className="flex gap-4">
                                    <button 
                                        disabled={!isEditingAccount}
                                        onClick={() => handleInputChange('invoiceGenerationType', 'Centralized')}
                                        className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center justify-center text-xs font-bold ${formData.invoiceGenerationType === 'Centralized' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'}`}
                                    >
                                        <Landmark size={18} className="mr-2" /> Centralized (Head Office)
                                    </button>
                                    <button 
                                        disabled={!isEditingAccount}
                                        onClick={() => handleInputChange('invoiceGenerationType', 'Decentralized')}
                                        className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center justify-center text-xs font-bold ${formData.invoiceGenerationType === 'Decentralized' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300'}`}
                                    >
                                        <Building size={18} className="mr-2" /> Decentralized (Per Branch)
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 italic font-medium px-1">
                                    {formData.invoiceGenerationType === 'Centralized' 
                                        ? "All invoices for sub-branches will be generated using the Main Branch's billing details and sequence." 
                                        : "Each branch will generate invoices independently using their local billing details."}
                                </p>
                            </div>
                        </div>
                    </div>
                    {isEditingAccount && (
                        <div className="p-8 bg-indigo-50/50 border-t border-indigo-100 flex justify-end space-x-4">
                            <button onClick={() => setIsEditingAccount(false)} className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                            <button onClick={handleSave} className="px-10 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700">Update Configuration</button>
                        </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ... (Rest of activeMainTab conditions: Team Access, Payer Config, etc.) ... */}
        {activeMainTab === 'Team Access' && users && setUsers && (
           <UserManagement users={users} setUsers={setUsers} mode="hospital_staff" parentHospital={user} roles={roles} />
        )}
        
        {activeMainTab === 'Payer Config' && (
           // ... (Same as previous Payer Config content) ...
           <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                   <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Insurance Payer Configuration</h2>
                   <p className="text-slate-500 text-sm font-medium">Manage portal credentials, rate lists, and tie-up validity periods.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar w-full md:w-auto">
                   {['Insurers', 'TPAs', 'Hospital Tie Up List'].map(t => (
                      <button key={t} onClick={() => setPayerFilter(t as any)} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${payerFilter === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{t}</button>
                   ))}
                </div>
             </div>
             {payerFilter === 'Hospital Tie Up List' ? (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-2">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left min-w-[800px]">
                       <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         <tr><th className="px-6 py-4">Entity</th><th className="px-6 py-4">MOU Validity</th><th className="px-6 py-4">Portal ID</th><th className="px-6 py-4">Password</th><th className="px-6 py-4">Rate List</th><th className="px-6 py-4 text-right">Action</th></tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                       {sortedPayers.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 uppercase font-black">No active tie-ups configured.</td></tr> : sortedPayers.map(entity => {
                          const credential = formData.portalCredentials?.find(c => c.entityId === entity.name) as any;
                          const showPass = visiblePasswords[entity.name];
                          return (
                            <tr key={entity.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4"><div className="flex items-center space-x-3"><div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">{entity.name.charAt(0)}</div><span className="uppercase font-black text-[11px] text-slate-800">{entity.name}</span></div></td>
                              <td className="px-6 py-4"><div className="flex flex-col space-y-1 text-[10px] text-slate-500"><div><span className="font-black text-slate-300 w-10 inline-block">START:</span> {formatDateDDMMYYYY(credential?.startDate)}</div><div><span className="font-black text-slate-300 w-10 inline-block">END:</span> {formatDateDDMMYYYY(credential?.endDate)}</div></div></td>
                              <td className="px-6 py-4 font-mono text-slate-600">{credential?.username || '--'}</td>
                              <td className="px-6 py-4"><div className="flex items-center space-x-2"><span className="font-mono text-slate-600 tracking-widest min-w-[80px]">{showPass ? (credential?.password || '--') : '••••••••'}</span><button onClick={() => togglePasswordVisibility(entity.name)} className="text-slate-300 hover:text-slate-500">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></td>
                              <td className="px-6 py-4">{credential?.rateListName ? <div className="flex items-center space-x-2"><button className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase border border-emerald-100" onClick={() => openRateListPreview(entity.name, credential)}><Search size={12} className="mr-1.5" /> View</button><button className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase border border-blue-100" onClick={() => downloadRateList(credential)}><Download size={12} className="mr-1.5" /> Download</button></div> : <span className="text-[10px] text-slate-400 font-bold italic">Not Uploaded</span>}</td>
                              <td className="px-6 py-4 text-right"><div className="flex justify-end space-x-2"><button onClick={() => { setPayerFilter(entity.type === 'TPA' ? 'TPAs' : 'Insurers'); setExpandedEntityId(entity.name); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button><button onClick={() => setPayerToRemove(entity)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button></div></td>
                            </tr>
                          );
                       })}
                     </tbody>
                   </table>
                 </div>
                 </div>
             ) : (
                <div className="flex flex-col space-y-4">
                   {sortedPayers.map(entity => {
                      const credential = formData.portalCredentials?.find(c => c.entityId === entity.name) as any;
                      const hasTieUp = !!credential;
                      const isExpanded = expandedEntityId === entity.name;
                      const isRateListUploading = savingEntityId === `upload-${entity.name}`;
                      return (
                         <div key={entity.id} className={`p-6 rounded-3xl border transition-all ${hasTieUp ? 'bg-emerald-50/20 border-emerald-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                               <div className="flex items-center gap-4 flex-1">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm ${hasTieUp ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{entity.name.charAt(0)}</div>
                                  <div><h4 className={`text-base font-black uppercase ${hasTieUp ? 'text-emerald-900' : 'text-slate-600'}`}>{entity.name}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{entity.type} • {hasTieUp ? 'Active Tie-Up' : 'Not Configured'}</p></div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                                  {hasTieUp && <><span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest">Added</span><button onClick={() => setExpandedEntityId(isExpanded ? null : entity.name)} className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-400 border border-slate-200'}`}><Edit2 size={16} /></button></>}
                                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={hasTieUp} onChange={(e) => handleToggleTieUp(entity.name, e.target.checked)} /><div className={`w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${hasTieUp ? 'peer-checked:bg-emerald-600' : ''} shadow-inner`}></div></label>
                               </div>
                            </div>
                            {hasTieUp && isExpanded && (
                               <div className="mt-6 pt-6 border-t border-slate-100/50 animate-in slide-in-from-top-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                                     <div className="lg:col-span-4 space-y-3">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Portal Credentials</h5>
                                        <input type="text" value={credential?.username || ''} onChange={(e) => handleUpdateCredential(entity.name, 'username', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" placeholder="Portal User ID" />
                                        <div className="relative">
                                           <input type={visiblePasswords[entity.name] ? 'text' : 'password'} value={credential?.password || ''} onChange={(e) => handleUpdateCredential(entity.name, 'password', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none pr-10" placeholder="Portal Password" />
                                           <button onClick={() => togglePasswordVisibility(entity.name)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                              {visiblePasswords[entity.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                                           </button>
                                        </div>
                                     </div>
                                     <div className="lg:col-span-4 space-y-3">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MOU Validity</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                           <div className="relative"><label className="text-[9px] font-bold text-slate-400 absolute -top-2 left-2 bg-white px-1">Start Date</label><input type="date" value={credential?.startDate || ''} min="2000-01-01" max="2099-12-31" onChange={(e) => handleUpdateCredential(entity.name, 'startDate', e.target.value)} onBlur={(e) => validateDateOnBlur(entity.name, 'startDate', e.target.value)} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                                           <div className="relative"><label className="text-[9px] font-bold text-slate-400 absolute -top-2 left-2 bg-white px-1">End Date</label><input type="date" value={credential?.endDate || ''} min={credential?.startDate || '2000-01-01'} max={credential?.startDate ? new Date(new Date(credential.startDate).setFullYear(new Date(credential.startDate).getFullYear() + 4)).toISOString().split('T')[0] : "2099-12-31"} onChange={(e) => handleUpdateCredential(entity.name, 'endDate', e.target.value)} onBlur={(e) => validateDateOnBlur(entity.name, 'endDate', e.target.value)} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                                        </div>
                                     </div>
                                     <div className="lg:col-span-4 space-y-3">
                                        <div className="flex items-center justify-between mb-2">
                                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate List</h5>
                                           {credential?.rateListName && (
                                              <div className="flex items-center gap-3"><button onClick={() => openRateListPreview(entity.name, credential)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"><Search size={12} /> View</button><button onClick={() => downloadRateList(credential)} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-1"><Download size={12} /> Download</button></div>
                                           )}
                                        </div>
                                        <div className="relative group">
                                          <input type="file" id={`rate-list-${entity.id}`} className="hidden" disabled={isRateListUploading} onChange={(e) => handleRateListUpload(entity.name, e)} />
                                          <label
                                            htmlFor={isRateListUploading ? undefined : `rate-list-${entity.id}`}
                                            className={`flex flex-col items-center justify-center w-full h-[90px] border-2 border-dashed rounded-2xl bg-slate-50 transition-colors ${isRateListUploading ? 'border-blue-300 cursor-wait' : 'border-slate-300 cursor-pointer hover:bg-white'}`}
                                          >
                                            {isRateListUploading ? (
                                              <div className="flex flex-col items-center text-blue-600" role="status" aria-live="polite">
                                                <Loader2 size={22} className="animate-spin mb-2" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Uploading rate list...</span>
                                                <span className="text-[9px] font-bold text-slate-400 mt-1">Please keep this page open</span>
                                              </div>
                                            ) : credential?.rateListName ? (
                                              <div className="flex items-center space-x-2 text-emerald-600"><CheckCircle2 size={16} /><span className="text-[10px] font-bold truncate max-w-[120px]">{credential.rateListName}</span></div>
                                            ) : (
                                              <><Upload size={18} className="text-slate-400 mb-1" /><span className="text-[9px] font-bold text-slate-400 uppercase">Upload PDF/Excel</span></>
                                            )}
                                          </label>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex justify-end mt-4 pt-4 border-t border-slate-100 border-dashed">
                                     <button onClick={() => saveCredentials(entity.id)} disabled={!!savingEntityId} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center ${savingEntityId === 'success-' + entity.id ? 'bg-emerald-600 text-white' : 'bg-[#000080] text-white disabled:opacity-70'}`}>{savingEntityId === entity.id ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />} {savingEntityId === 'success-' + entity.id ? 'Saved!' : 'Save Configuration'}</button>
                                  </div>
                               </div>
                            )}
                         </div>
                      );
                   })}
                </div>
             )}
          </div>
        )}

        {/* ... (Other activeMainTab contents like Digital Assets, NHCX, Email Integration) ... */}
        {activeMainTab === 'Digital Assets' && (
            // ... (Same as provided code) ...
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                    {/* ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                         <StampUpload 
                          label="Official Hospital Seal" 
                          value={formData.hospitalSeal} 
                          isProcessing={processingImage === 'hospitalSeal'}
                          onUpload={(file: File | null) => handleAssetUpload('hospitalSeal', file)}
                          icon={Building}
                        />
                        <StampUpload 
                          label="Authorized Doctor Signature" 
                          value={formData.doctorStamp} 
                          isProcessing={processingImage === 'doctorStamp'}
                          onUpload={(file: File | null) => handleAssetUpload('doctorStamp', file)}
                          icon={Stethoscope}
                        />
                    </div>
                </div>
            </div>
        )}
        
        {/* ... (Other Tabs omitted for brevity as they are unchanged) ... */}
        {activeMainTab === 'NHCX Onboarding' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
               <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-sm"><ShieldPlus size={28} /></div>
                        <div>
                           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">NHCX Node Onboarding</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">National Health Claims Exchange Configuration</p>
                        </div>
                     </div>
                     <div className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                        formData.nhcxConfig?.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        formData.nhcxConfig?.status === 'Verified' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                     }`}>
                        Status: {formData.nhcxConfig?.status}
                     </div>
                  </div>

                  <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FieldView 
                        label="Hospital Registry ID (HFR)" 
                        value={formData.nhcxConfig?.hfrId} 
                        isEditing={true} 
                        onChange={(val: string) => setFormData(prev => ({ ...prev, nhcxConfig: { ...prev.nhcxConfig!, hfrId: val } }))} 
                     />
                     <FieldView 
                        label="NHCX Node ID" 
                        value={formData.nhcxConfig?.nodeId} 
                        isEditing={true} 
                        onChange={(val: string) => setFormData(prev => ({ ...prev, nhcxConfig: { ...prev.nhcxConfig!, nodeId: val } }))} 
                        placeholder="Enter Node ID"
                     />
                     <div className="md:col-span-2">
                        <FieldView 
                           label="Public Key (PEM Format)" 
                           value={formData.nhcxConfig?.publicKey} 
                           isEditing={true} 
                           isTextArea={true}
                           onChange={(val: string) => setFormData(prev => ({ ...prev, nhcxConfig: { ...prev.nhcxConfig!, publicKey: val } }))} 
                           placeholder="-----BEGIN PUBLIC KEY-----"
                        />
                     </div>
                     <div className="md:col-span-2">
                        <FieldView 
                           label="NHCX Endpoint URL" 
                           value={formData.nhcxConfig?.endpointUrl} 
                           isEditing={true} 
                           onChange={(val: string) => setFormData(prev => ({ ...prev, nhcxConfig: { ...prev.nhcxConfig!, endpointUrl: val } }))} 
                           placeholder="https://nhcx.node.hospital.com/api/v1"
                        />
                     </div>
                  </div>

                  <div className="p-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-4 text-slate-400">
                        <ShieldCheck size={20} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Secure mTLS Connection Required</p>
                     </div>
                     <div className="flex gap-4">
                        <button className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center">
                           <Download size={16} className="mr-2" /> Download Cert
                        </button>
                        <button 
                           onClick={handleNHCXVerify}
                           disabled={isVerifyingNHCX || formData.nhcxConfig?.status === 'Active'}
                           className="px-10 py-4 bg-[#000080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 shadow-lg active:scale-95 transition-all flex items-center disabled:opacity-50"
                        >
                           {isVerifyingNHCX ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
                           {formData.nhcxConfig?.status === 'Active' ? 'Node Verified' : 'Verify Node'}
                        </button>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                     { title: 'Claim Submission', desc: 'Real-time claim delivery to NHCX', icon: FileText },
                     { title: 'Status Tracking', desc: 'Automated status updates from payers', icon: Activity },
                     { title: 'Settlement Info', desc: 'Direct bank reconciliation via NHCX', icon: Landmark }
                  ].map((item, i) => (
                     <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6"><item.icon size={24} /></div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">{item.title}</h4>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
        )}

        {activeMainTab === 'Email Integration' && (
           <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                 <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                       <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm"><Mail size={32} /></div>
                       <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-3">Email Automation</h3>
                       <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">Connect the hospital mailbox securely for claim communication and notifications.</p>
                       
                       <div className="mt-10 space-y-4">
                          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><Check size={16} /></div>
                             <p className="text-[10px] font-black text-slate-600 uppercase">Auto-Claim Sending</p>
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><Check size={16} /></div>
                             <p className="text-[10px] font-black text-slate-600 uppercase">Query Notifications</p>
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><Check size={16} /></div>
                             <p className="text-[10px] font-black text-slate-600 uppercase">Patient Updates</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-8 space-y-8">
                    {canManageAnyHospitalEmail && (
                      <div className="bg-indigo-50/60 rounded-[2rem] border border-indigo-100 p-6 flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">Onboarded hospital</p>
                          <select value={emailHospitalId} onChange={(event) => setEmailHospitalId(event.target.value)} className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200">
                            <option value="">Select an onboarded hospital</option>
                            {filteredOnboardingHospitals.map((hospital: any) => <option key={hospital.id} value={hospital.id}>{hospital.hospitalName || hospital.displayName || hospital.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">Filter hospital</p>
                          <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={emailHospitalSearch} onChange={(event) => setEmailHospitalSearch(event.target.value)} placeholder="Name, code, or Rohini ID" className="w-full pl-9 pr-3 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Hospital Mailboxes</h3>
                          <button onClick={() => setConfiguringEmailType('Custom')} className="px-6 py-3 bg-[#000080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 shadow-md active:scale-95 transition-all flex items-center">
                             <Plus size={16} className="mr-2" /> Add SMTP
                          </button>
                       </div>

                       <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.keys(EMAIL_PRESETS).map(provider => {
                             const config = formData.smtpConfigs?.find(c => c.provider === provider);
                             const mailboxProvider = provider === 'Gmail' ? 'GMAIL' : provider === 'Yahoo Mail' ? 'YAHOO' : ['Microsoft Office', 'Outlook'].includes(provider) ? 'MICROSOFT_365' : undefined;
                             const connectedMailbox = mailboxProvider
                               ? connectedMailboxes.find((mailbox) => mailbox.provider === mailboxProvider)
                               : undefined;
                             const isConnected = Boolean(connectedMailbox || config);
                             return (
                                <div key={provider} className={`p-6 rounded-[2rem] border-2 transition-all group ${isConnected ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-white hover:border-blue-100'}`}>
                                   <div className="flex items-center justify-between mb-6">
                                      <div className="flex items-center gap-4">
                                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                            <AtSign size={24} />
                                         </div>
                                         <div>
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{provider}</h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{connectedMailbox?.email_address || (config ? config.username : 'Not Configured')}</p>
                                         </div>
                                      </div>
                                      {isConnected && <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
                                   </div>
                                   <button 
                                      onClick={() => openEmailConfig(provider)}
                                      className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                         isConnected ? 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white' : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-[#000080] hover:text-white'
                                      }`}
                                   >
                                      {provider === 'Gmail' ? (connectedMailbox ? 'Connected — manage' : 'Connect securely') : config ? 'Edit Config' : 'Configure'}
                                   </button>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Email Config Modal */}
              {configuringEmailType && (
                 <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[500] flex items-center justify-center p-8">
                    <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                       <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-6">
                             <div className="w-16 h-16 bg-[#000080] text-white rounded-2xl flex items-center justify-center shadow-xl"><AtSign size={32} /></div>
                             <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{configuringEmailType} Setup</h3>
                                <p className="text-[10px] font-black text-[#000080] uppercase tracking-[0.2em]">{['Gmail', 'Microsoft Office', 'Outlook', 'Yahoo Mail'].includes(configuringEmailType) ? 'Secure OAuth Connection' : 'SMTP Server Configuration'}</p>
                             </div>
                          </div>
                          <button onClick={() => setConfiguringEmailType(null)} className="p-4 text-slate-400 hover:text-slate-600 transition-all hover:bg-white rounded-2xl"><X size={28} /></button>
                       </div>
                       
                       <div className="p-12 space-y-8">
                          {configuringEmailType === 'Gmail' && (
                            <>
                              {canManageAnyHospitalEmail && !emailHospitalId && <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">Select an onboarded hospital above before continuing with Gmail.</p>}
                              <FieldView label="Gmail address" value={emailConfigForm.email} isEditing={true} onChange={(value: string) => setEmailConfigForm(prev => ({ ...prev, email: value }))} />
                              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                                <ShieldCheck className="text-blue-600 shrink-0" size={20} />
                                <p className="text-[10px] font-bold text-blue-900 leading-relaxed uppercase">ClaimNX opens Google&apos;s consent screen. Your password is never entered, displayed, or stored by ClaimNX.</p>
                              </div>
                              <button onClick={handleConnectGmail} disabled={isStartingGmailOAuth} className="w-full py-5 bg-[#000080] disabled:opacity-60 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all">
                                {isStartingGmailOAuth ? 'Opening Google…' : 'Continue with Google'}
                              </button>
                            </>
                          )}
                          {(['Microsoft Office', 'Outlook', 'Yahoo Mail'].includes(configuringEmailType)) && <>
                            {canManageAnyHospitalEmail && !emailHospitalId && <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">Select an onboarded hospital above before continuing.</p>}
                            <FieldView label="Mailbox address" value={emailConfigForm.email} isEditing={true} onChange={(value: string) => setEmailConfigForm(prev => ({ ...prev, email: value }))} />
                            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4"><ShieldCheck className="text-blue-600 shrink-0" size={20} /><p className="text-[10px] font-bold text-blue-900 leading-relaxed uppercase">ClaimNX opens the provider&apos;s consent screen. Your password is never entered, displayed, or stored by ClaimNX.</p></div>
                            <button onClick={() => handleConnectOAuthMailbox(configuringEmailType as 'Microsoft Office' | 'Outlook' | 'Yahoo Mail')} className="w-full py-5 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all">Continue securely</button>
                          </>}
                          {!['Gmail', 'Microsoft Office', 'Outlook', 'Yahoo Mail'].includes(configuringEmailType) && <>
                          <div className="grid grid-cols-2 gap-8">
                             <div className="col-span-2">
                                <FieldView 
                                   label="Email Address / Username" 
                                   value={emailConfigForm.email} 
                                   isEditing={true} 
                                   onChange={(val: string) => setEmailConfigForm(prev => ({ ...prev, email: val }))} 
                                />
                             </div>
                             <div className="col-span-2">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">App Password / SMTP Password</label>
                                   <div className="relative">
                                      <input 
                                         type={visiblePasswords['smtp'] ? 'text' : 'password'}
                                         value={emailConfigForm.password}
                                         onChange={(e) => setEmailConfigForm(prev => ({ ...prev, password: e.target.value }))}
                                         className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                      />
                                      <button 
                                         onClick={() => setVisiblePasswords(prev => ({ ...prev, smtp: !prev.smtp }))}
                                         className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                      >
                                         {visiblePasswords['smtp'] ? <EyeOff size={18} /> : <Eye size={18} />}
                                      </button>
                                   </div>
                                </div>
                             </div>
                             <FieldView 
                                label="SMTP Host" 
                                value={emailConfigForm.host} 
                                isEditing={true} 
                                onChange={(val: string) => setEmailConfigForm(prev => ({ ...prev, host: val }))} 
                             />
                             <FieldView 
                                label="SMTP Port" 
                                value={emailConfigForm.port.toString()} 
                                isEditing={true} 
                                onChange={(val: string) => setEmailConfigForm(prev => ({ ...prev, port: parseInt(val) || 0 }))} 
                             />
                          </div>

                          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                             <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                             <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase">
                                For Gmail/Outlook, please use an "App Password" instead of your regular account password. Ensure SMTP access is enabled in your provider settings.
                             </p>
                          </div>

                          <div className="flex gap-4 pt-4">
                             <button className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                                Test Connection
                             </button>
                             <button 
                                onClick={handleSaveEmailConfig}
                                className="flex-[2] py-5 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all"
                             >
                                Save Configuration
                             </button>
                          </div>
                          </>}
                       </div>
                    </div>
                 </div>
              )}
           </div>
        )}

        {activeMainTab === 'Wallet & Billing' && (
              <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
                  {/* Wallet Command Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><Wallet size={200} /></div>
                    
                    <div className="relative z-10 flex items-center gap-8">
                        <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
                          <Wallet size={40} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Available Balance</p>
                          <h2 className="text-5xl font-black tracking-tighter">₹{formData.walletBalance?.toLocaleString('en-IN')}</h2>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 min-w-[300px]">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md">
                          <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-white">Auto-Debit Invoices</p>
                              <p className="text-[9px] font-bold text-slate-400 mt-1">Pay generated bills automatically</p>
                          </div>
                          <button onClick={() => setAutoDebit(!autoDebit)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                              {autoDebit ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-500" />}
                          </button>
                        </div>
                        <button onClick={() => setShowTopUp(true)} className="w-full py-4 bg-white text-[#000080] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-lg active:scale-95 flex items-center justify-center">
                          <Plus size={16} className="mr-2" /> Add Funds to Wallet
                        </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                     {/* Monthly Invoice Ledger */}
                     <div className="lg:col-span-12 bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-10 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50/30">
                           <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-sm"><ReceiptIndianRupee size={28} /></div>
                              <div>
                                 <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight">Financial Ledgers</h3>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Invoices & Online Gateway Logs</p>
                              </div>
                           </div>

                           {/* Sub Tabs Selection */}
                           <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0 select-none">
                              <button 
                                type="button"
                                onClick={() => setActiveBillingSubTab('invoices')}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                                  activeBillingSubTab === 'invoices' 
                                    ? 'bg-[#000080] text-white shadow-md' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Invoices
                              </button>
                              <button 
                                type="button"
                                onClick={() => setActiveBillingSubTab('gateway_logs')}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                                  activeBillingSubTab === 'gateway_logs' 
                                    ? 'bg-[#000080] text-emerald-400 border border-emerald-500/10 shadow-md' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Razorpay Logs
                              </button>
                           </div>
                        </div>
                        
                        {activeBillingSubTab === 'invoices' && (
                           <div className="overflow-x-auto">
                              <table className="w-full text-left">
                              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                 <tr>
                                    <th className="px-6 py-6">Month</th>
                                    <th className="px-6 py-6">Invoice ID</th>
                                    <th className="px-6 py-6">Due Date</th>
                                    <th className="px-6 py-6 text-right">Amount</th>
                                    <th className="px-6 py-6 text-center">Status</th>
                                    <th className="px-6 py-6 text-right">Action</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                                 {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group whitespace-nowrap">
                                       <td className="px-6 py-6 text-slate-800">{inv.month}</td>
                                       <td className="px-6 py-6 font-mono text-xs text-slate-500">{inv.id}</td>
                                       <td className="px-6 py-6 text-[10px] text-slate-500">{formatDate(inv.dueDate)}</td>
                                       <td className="px-6 py-6 text-right font-black text-slate-800">₹{inv.amount.toLocaleString('en-IN')}</td>
                                       <td className="px-6 py-6 text-center">
                                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                             inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                             inv.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                             'bg-amber-50 text-amber-600 border-amber-100'
                                          }`}>
                                             {inv.status}
                                          </span>
                                       </td>
                                       <td className="px-6 py-6 text-right flex items-center justify-end gap-3">
                                          <button 
                                             onClick={() => setViewInvoice(inv)}
                                             className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                             title="View Invoice Copy"
                                          >
                                             <ReceiptIndianRupee size={18} />
                                          </button>
                                          {inv.status !== 'Paid' ? (
                                             <button 
                                                onClick={() => setPaymentModal(inv)}
                                                className="px-6 py-2.5 bg-[#000080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 shadow-md active:scale-95 transition-all"
                                             >
                                                Pay Now
                                             </button>
                                          ) : (
                                             <button className="px-6 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default">
                                                Settled
                                             </button>
                                          )}
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}

                     {activeBillingSubTab === 'gateway_logs' && (
                        <div className="overflow-x-auto animate-in fade-in duration-300 text-slate-705">
                           <table className="w-full text-left">
                              <thead className="bg-[#111923] border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                 <tr>
                                    <th className="px-6 py-6 text-white font-black uppercase">Timestamp</th>
                                    <th className="px-6 py-6 text-white font-black uppercase">Gateway Details</th>
                                    <th className="px-6 py-6 text-white font-black uppercase">Channel / Account</th>
                                    <th className="px-6 py-6 text-right text-white font-black">Amount</th>
                                    <th className="px-6 py-6 text-center text-white font-black">Status</th>
                                    <th className="px-6 py-6 text-right text-white font-black">Reconciliation</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                 {[
                                   ...(formData.transactions || []).filter(t => t.gateway),
                                   {
                                     id: 'mock-tx-1',
                                     date: '2025-06-20T18:45:00Z',
                                     type: 'Debit',
                                     amount: 4500,
                                     description: 'Invoice Settled (Razorpay)',
                                     gateway: 'Razorpay',
                                     gatewayTxnId: 'pay_RP_MOCK9212',
                                     gatewayOrderId: 'order_RP_or_342125',
                                     reconciliationStatus: 'Reconciled (Auto Match)',
                                     bankRef: 'ref_bank_8123982312'
                                   },
                                   {
                                     id: 'mock-tx-2',
                                     date: '2025-06-15T16:20:00Z',
                                     type: 'Credit',
                                     amount: 10000,
                                     description: 'Online Gateway Recharge (Razorpay)',
                                     gateway: 'Razorpay',
                                     gatewayTxnId: 'pay_RP_MOCK8721',
                                     gatewayOrderId: 'order_RP_or_109283',
                                     reconciliationStatus: 'Reconciled (Auto Match)',
                                     bankRef: 'ref_bank_2129831923'
                                   }
                                 ].map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group whitespace-nowrap">
                                       <td className="px-6 py-6 text-slate-550 min-w-[140px]">
                                          <p className="font-extrabold text-slate-700">{formatDate(tx.date)}</p>
                                          <p className="text-[9px] text-[#2cb742] uppercase font-black tracking-wider mt-1">{tx.gateway ?? 'Razorpay'} Sandbox</p>
                                       </td>
                                       <td className="px-6 py-6 leading-normal">
                                          <p className="font-mono text-[10px] text-[#000080]/80 font-extrabold max-w-[170px] truncate">TXID: {tx.gatewayTxnId || 'N/A'}</p>
                                          <p className="font-mono text-[9px] text-slate-400 mt-1 max-w-[175px] truncate">Order ID: {tx.gatewayOrderId || 'N/A'}</p>
                                       </td>
                                       <td className="px-6 py-6">
                                          <p className="text-slate-800 uppercase font-black tracking-tight">{tx.description?.replace('Invoice Settled (Razorpay): ', '').replace('Online Gateway Recharge (Razorpay)', '') || 'Wallet'}</p>
                                          <p className="font-mono text-[9px] text-slate-400 mt-1">Ref: {tx.bankRef?.replace('ref_bank_', '') || 'Internal'}</p>
                                       </td>
                                       <td className="px-6 py-6 text-right font-black text-slate-900 text-sm">
                                          ₹{tx.amount.toLocaleString('en-IN')}
                                       </td>
                                       <td className="px-6 py-6 text-center">
                                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block animate-pulse">
                                             SUCCESS
                                          </span>
                                       </td>
                                       <td className="px-6 py-6 text-right">
                                          <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-750 border border-emerald-150">
                                             {tx.reconciliationStatus || 'Reconciled (Auto Match)'}
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                     </div>

                     {/* Transaction History Sidebar */}
                     <div className="lg:col-span-12 bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all">
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                           <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center text-slate-500 shadow-sm border border-slate-100"><HistoryIcon size={28} /></div>
                              <h3 className="text-lg font-black uppercase tracking-widest text-slate-800">History</h3>
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8 max-h-[500px]">
                           {formData.transactions?.length ? formData.transactions.map(tx => (
                              <div key={tx.id} className="flex items-start justify-between group">
                                 <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${tx.type === 'Credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'} group-hover:scale-110 transition-transform`}>
                                       {tx.type === 'Credit' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                    </div>
                                    <div>
                                       <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight mb-1">{tx.description}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(tx.date)}</p>
                                    </div>
                                 </div>
                                 <span className={`text-sm font-black ${tx.type === 'Credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {tx.type === 'Credit' ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN')}
                                 </span>
                              </div>
                           )) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40">
                                 <HistoryIcon size={48} className="mb-4" />
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Transactions</p>
                              </div>
                           )}
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
                           <button 
                              onClick={() => setShowFullLedger(true)}
                              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center justify-center mx-auto group"
                           >
                              View Full Ledger <ArrowUpRight size={14} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                           </button>
                        </div>
                     </div>
                  </div>
              </div>
        )}



      </main>

      {/* TOP-UP MODAL */}
      {showTopUp && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[400] flex items-center justify-center p-8">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
              <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#000080] text-white rounded-2xl flex items-center justify-center shadow-xl"><Wallet size={32} /></div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">Add Funds</h3>
                       <p className="text-[10px] font-black text-[#000080] uppercase tracking-[0.2em]">Secure Wallet Recharge</p>
                    </div>
                 </div>
                 <button onClick={() => setShowTopUp(false)} className="p-4 text-slate-400 hover:text-slate-600 transition-all hover:bg-white rounded-2xl"><X size={28} /></button>
              </div>
              <div className="p-12 space-y-12">
                 <div className="space-y-6 text-center">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] block">Amount (INR)</label>
                    <div className="relative inline-block w-full">
                       <IndianRupee className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={40} />
                       <input 
                        type="number" 
                        value={topUpAmount} 
                        onChange={(e) => setTopUpAmount(e.target.value)} 
                        className="w-full pl-20 pr-8 py-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] text-5xl font-black text-slate-800 outline-none focus:ring-[12px] focus:ring-blue-50 focus:border-[#000080] transition-all shadow-inner text-center placeholder:text-slate-200" 
                        placeholder="0" 
                        autoFocus
                       />
                    </div>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                    {[5000, 10000, 25000].map(val => (
                      <button key={val} onClick={() => setTopUpAmount(val.toString())} className="py-4 bg-white border-2 border-slate-100 text-sm font-black text-slate-600 rounded-2xl hover:bg-[#000080] hover:text-white hover:border-[#000080] hover:shadow-lg transition-all active:scale-95">₹{val.toLocaleString('en-IN')}</button>
                    ))}
                 </div>
                 <button 
                  onClick={handleTopUp} 
                  className="w-full py-6 bg-[#000080] text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-xl hover:bg-blue-800 hover:-translate-y-1 transition-all active:translate-y-0 flex items-center justify-center"
                 >
                   <CreditCard size={20} className="mr-3" /> Proceed to Pay
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* VIEW FULL LEDGER MODAL */}
      {showFullLedger && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[500] flex items-start justify-center p-4 md:p-8 overflow-y-auto">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in duration-300 my-4 md:my-8 border border-slate-100">
              {/* Header */}
              <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                       <HistoryIcon size={28} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Financial Wallet Ledger</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formData.hospitalName || 'Hospital Transactions'}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <button 
                       onClick={() => setShowFullLedger(false)} 
                       className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                       <X size={24} />
                    </button>
                 </div>
              </div>

              {/* Stats overview banner */}
              <div className="p-8 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                       <Wallet size={24} />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wallet Balance</p>
                       <p className="text-xl font-black text-slate-800">₹{formData.walletBalance.toLocaleString('en-IN')}</p>
                    </div>
                 </div>
                 
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                       <ArrowUpCircle size={24} />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Credits</p>
                       <p className="text-xl font-black text-emerald-600">
                          ₹{((formData.transactions || []) as any[])
                             .filter((tx: any) => tx.type === 'Credit')
                             .reduce((acc: number, tx: any) => acc + (tx.amount || 0), 0)
                             .toLocaleString('en-IN')}
                       </p>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                       <ArrowDownCircle size={24} />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Debits</p>
                       <p className="text-xl font-black text-rose-600">
                          ₹{((formData.transactions || []) as any[])
                             .filter((tx: any) => tx.type === 'Debit')
                             .reduce((acc: number, tx: any) => acc + (tx.amount || 0), 0)
                             .toLocaleString('en-IN')}
                       </p>
                    </div>
                 </div>
              </div>

              {/* Transactions List */}
              <div className="p-10">
                 <div className="overflow-x-auto border border-slate-100 rounded-[2rem]">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          <tr>
                             <th className="px-6 py-5">Date & Time</th>
                             <th className="px-6 py-5">Tx ID / Ref</th>
                             <th className="px-6 py-5">Type</th>
                             <th className="px-6 py-5">Description</th>
                             <th className="px-6 py-5">Gateway</th>
                             <th className="px-6 py-5 text-right">Amount</th>
                             <th className="px-6 py-5 text-center">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 whitespace-nowrap">
                          {formData.transactions?.length ? (
                             (formData.transactions as any[]).map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                   <td className="px-6 py-5 text-slate-800 font-extrabold">{formatDate(tx.date)}</td>
                                   <td className="px-6 py-5 font-mono text-[10px] text-slate-500">
                                      {tx.gatewayTxnId || tx.id}
                                      {tx.bankRef && <span className="block text-[8px] text-slate-400 mt-0.5">Ref: {tx.bankRef.replace('ref_bank_', '')}</span>}
                                   </td>
                                   <td className="px-6 py-5">
                                      <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                                         tx.type === 'Credit' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                      }`}>
                                         {tx.type}
                                      </span>
                                   </td>
                                   <td className="px-6 py-5 font-black text-slate-700">{tx.description}</td>
                                   <td className="px-6 py-5 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                      {tx.gateway || 'Internal'}
                                   </td>
                                   <td className="px-6 py-5 text-right text-sm font-black text-slate-800">
                                      ₹{(tx.amount || 0).toLocaleString('en-IN')}
                                   </td>
                                   <td className="px-6 py-5 text-center">
                                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                         {tx.reconciliationStatus || 'Success'}
                                      </span>
                                   </td>
                                </tr>
                             ))
                          ) : (
                             <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-300 opacity-50">
                                   <HistoryIcon size={40} className="mx-auto mb-2" />
                                   <p className="text-[10px] font-black uppercase tracking-wider">No Transaction Records</p>
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* VIEW INVOICE MODAL */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[500] flex items-start justify-center p-4 md:p-8 overflow-y-auto">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300 my-4 md:my-8">
              <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm"><ReceiptIndianRupee size={28} /></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Invoice Details</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{viewInvoice.id}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <button onClick={() => toast.success('Invoice PDF downloading...')} className="px-6 py-3 bg-[#000080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 shadow-md transition-all flex items-center">
                       <Download size={16} className="mr-2" /> Download PDF
                    </button>
                    <button onClick={() => setViewInvoice(null)} className="p-3 text-slate-400 hover:bg-white rounded-xl transition-all"><X size={24} /></button>
                 </div>
              </div>

              <div className="p-12 space-y-12">
                 <div className="flex flex-col md:flex-row justify-between gap-8 pb-12 border-b border-dashed border-slate-200">
                    <div>
                       <h2 className="text-2xl font-black text-[#000080] tracking-tighter mb-4">ClaimNX</h2>
                       <p className="text-sm font-bold text-slate-500">123 Tech Park, Sector 4<br/>Tech City, 400001</p>
                    </div>
                    <div className="text-left md:text-right">
                       <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-4 uppercase">Tax Invoice</h2>
                       <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                          <p className="font-bold text-slate-400">Invoice No:</p>
                          <p className="font-black text-slate-800">{viewInvoice.id}</p>
                          <p className="font-bold text-slate-400">Generated Date:</p>
                          <p className="font-black text-slate-800">{formatDate(viewInvoice.generatedDate)}</p>
                          <p className="font-bold text-slate-400">Due Date:</p>
                          <p className="font-black text-slate-800">{formatDate(viewInvoice.dueDate)}</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row justify-between gap-8 pb-12 border-b border-dashed border-slate-200">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Billed To</p>
                       <h3 className="text-lg font-black text-slate-800 tracking-tight">{formData.hospitalName}</h3>
                       <p className="text-sm font-bold text-slate-500 mt-2">{formData.address || 'Address not provided'}</p>
                       {formData.gstNo && <p className="text-sm font-bold text-slate-500 mt-1">GSTIN: <span className="font-black">{formData.gstNo}</span></p>}
                    </div>
                    <div className="text-left md:text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Payment Status</p>
                       <span className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block border ${
                          viewInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          viewInvoice.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                       }`}>
                          {viewInvoice.status}
                       </span>
                    </div>
                 </div>

                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                             <th className="px-6 py-4 rounded-tl-xl">Description</th>
                             <th className="px-6 py-4 text-center">Quantity</th>
                             <th className="px-6 py-4 text-right">Rate</th>
                             <th className="px-6 py-4 text-right rounded-tr-xl">Amount</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                          <tr>
                             <td className="px-6 py-6">
                                <p className="text-slate-800 font-black">Platform Usage Fees - {viewInvoice.month}</p>
                                <p className="text-xs text-slate-500 mt-1">Standard SaaS subscription</p>
                             </td>
                             <td className="px-6 py-6 text-center">1</td>
                             <td className="px-6 py-6 text-right">₹{viewInvoice.amount.toLocaleString('en-IN')}</td>
                             <td className="px-6 py-6 text-right text-slate-900 font-black">₹{viewInvoice.amount.toLocaleString('en-IN')}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <div className="flex justify-end pt-8">
                    <div className="w-full max-w-sm space-y-4">
                       <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                          <span>Subtotal</span>
                          <span>₹{viewInvoice.amount.toLocaleString('en-IN')}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                          <span>CGST (9%)</span>
                          <span>₹{(viewInvoice.amount * 0.09).toLocaleString('en-IN')}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                          <span>SGST (9%)</span>
                          <span>₹{(viewInvoice.amount * 0.09).toLocaleString('en-IN')}</span>
                       </div>
                       <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                          <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Total</span>
                          <span className="text-2xl font-black text-[#000080]">₹{(viewInvoice.amount * 1.18).toLocaleString('en-IN')}</span>
                       </div>
                    </div>
                 </div>

                 <div className="pt-12 border-t border-slate-100 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                    <p className="text-xs font-bold">Thank you for your business!</p>
                    <p className="text-[10px] font-medium uppercase tracking-widest">For any queries, please contact billing@claimnx.com</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paymentModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[500] flex items-center justify-center p-8">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-[#000080] text-white rounded-2xl flex items-center justify-center shadow-lg"><ReceiptIndianRupee size={28} /></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Settle Invoice</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{paymentModal.id}</p>
                    </div>
                 </div>
                 <button onClick={() => setPaymentModal(null)} className="p-3 text-slate-400 hover:bg-white rounded-xl transition-all"><X size={24} /></button>
              </div>

              <div className="p-10 space-y-8">
                 <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount Due</p>
                    <p className="text-5xl font-black text-slate-800 tracking-tighter">₹{paymentModal.amount.toLocaleString('en-IN')}</p>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Payment Method</p>
                    
                    <button 
                       onClick={() => handlePayInvoice('Wallet')}
                       disabled={isProcessingPayment || formData.walletBalance < paymentModal.amount}
                       className="w-full p-5 border-2 border-slate-100 rounded-[2rem] flex items-center justify-between hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group disabled:opacity-50 disabled:grayscale"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Wallet size={20} /></div>
                          <div className="text-left">
                             <p className="text-xs font-black text-slate-800 uppercase">Pay via Wallet</p>
                             <p className="text-[10px] font-bold text-slate-400">Balance: ₹{formData.walletBalance.toLocaleString()}</p>
                          </div>
                       </div>
                       <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-emerald-500 group-hover:bg-emerald-500 transition-colors"></div>
                    </button>

                    <button 
                       onClick={() => triggerRazorpayCheckout(paymentModal.amount, 'InvoicePayment', paymentModal.id)}
                       disabled={isProcessingPayment}
                       className="w-full p-5 border-2 border-slate-100 rounded-[2rem] flex items-center justify-between hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><CreditCard size={20} /></div>
                          <div className="text-left">
                             <p className="text-xs font-black text-slate-800 uppercase">Razorpay Payment Gateway</p>
                             <p className="text-[10px] font-bold text-slate-400">Cards / UPI / Netbanking / QR Code</p>
                          </div>
                       </div>
                       <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-blue-500 group-hover:bg-blue-500 transition-colors"></div>
                    </button>
                 </div>
                 
                 {isProcessingPayment && (
                    <div className="flex items-center justify-center text-blue-600 gap-2 text-xs font-black uppercase tracking-widest animate-pulse">
                       <Loader2 size={16} className="animate-spin" /> Processing Transaction...
                    </div>
                 )}
                 {walletError && (
                    <div className="text-center text-rose-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                       <AlertTriangle size={16} /> {walletError}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* RAZORPAY INTEGRATION PREVIEW FRAME */}
      {showRazorpayModal && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-[#1a2530] text-slate-100 rounded-2xl w-full max-w-2xl overflow-hidden border border-slate-700/50 shadow-2xl animate-in zoom-in-95 duration-200">
               {/* Header branding */}
               <div className="bg-[#111923] p-6 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="bg-[#2cb742] text-white p-2.5 rounded-lg flex items-center justify-center font-bold">
                        <span className="text-sm font-black italic tracking-tighter">Rp</span>
                     </div>
                     <div>
                        <h4 className="text-sm font-black tracking-wide text-[#2cb742] uppercase">Razorpay Secure Checkout</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ClaimNX Gateway Integration Module</p>
                     </div>
                  </div>
                  <button 
                     onClick={() => setShowRazorpayModal(false)}
                     className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                     <X size={20} />
                  </button>
               </div>

               {/* Main Frame content */}
               <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-8 bg-[#151c24]">
                  {/* Left Column: Flow Controls */}
                  <div className="md:col-span-4 border-r border-slate-800/80 pr-6 space-y-4">
                     <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Transaction Amount</span>
                        <div className="text-xl font-black text-white mt-1">₹{razorpayConfig.amount.toLocaleString('en-IN')}</div>
                        <span className="text-[9px] text-[#2cb742] font-black uppercase tracking-widest mt-1 block">Live Connection Sandbox</span>
                     </div>
                     
                     {razorpayConfig.status === 'MethodSelection' && (
                        <div className="space-y-2">
                           <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Select Route</span>
                           {[
                              { id: 'Card', label: 'Credit/Debit Card' },
                              { id: 'UPI', label: 'UPI / Google Pay' },
                              { id: 'Netbanking', label: 'Net Banking' },
                              { id: 'QR', label: 'Scan QR Code' }
                           ].map((m) => (
                              <button
                                 key={m.id}
                                 type="button"
                                 onClick={() => setRazorpayConfig(prev => ({ ...prev, selectedMethod: m.id as any }))}
                                 className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all transition-colors uppercase tracking-wider block ${
                                    razorpayConfig.selectedMethod === m.id
                                       ? 'bg-[#2cb742]/10 border border-[#2cb742] text-[#2cb742]'
                                       : 'bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 text-slate-300'
                                 }`}
                              >
                                 {m.label}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* Right Column: Interaction form dynamic stages */}
                  <div className="md:col-span-8 flex flex-col justify-between h-[360px]">
                     {/* Method Selection & Inputs */}
                     {razorpayConfig.status === 'MethodSelection' && (
                        <div className="space-y-6">
                           <div>
                              <h5 className="text-xs font-black text-white uppercase tracking-wider">Configure {razorpayConfig.selectedMethod} Payment Mode Details</h5>
                              <p className="text-[10px] text-slate-400">Payment generated and reconciled securely against reference database.</p>
                           </div>

                           {razorpayConfig.selectedMethod === 'Card' && (
                              <div className="space-y-4">
                                 <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Card Number (Mockable)</label>
                                    <input 
                                       type="text" 
                                       value={razorpayConfig.cardNum} 
                                       onChange={(e) => setRazorpayConfig(prev => ({ ...prev, cardNum: e.target.value }))}
                                       className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-black tracking-widest uppercase outline-none focus:border-[#2cb742] text-white" 
                                    />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Expiry Date</label>
                                       <input 
                                          type="text" 
                                          value={razorpayConfig.cardExpiry} 
                                          onChange={(e) => setRazorpayConfig(prev => ({ ...prev, cardExpiry: e.target.value }))}
                                          placeholder="MM/YY" 
                                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-center outline-none focus:border-[#2cb742] text-white" 
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">CVV Code</label>
                                       <input 
                                          type="password" 
                                          value={razorpayConfig.cardCvv} 
                                          onChange={(e) => setRazorpayConfig(prev => ({ ...prev, cardCvv: e.target.value }))}
                                          placeholder="•••" 
                                          maxLength={3}
                                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-center outline-none focus:border-[#2cb742] text-white" 
                                       />
                                    </div>
                                 </div>
                              </div>
                           )}

                           {razorpayConfig.selectedMethod === 'UPI' && (
                              <div className="space-y-4">
                                 <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">UPI Address / Virtual Private Address (VPA)</label>
                                    <input 
                                       type="text" 
                                       value={razorpayConfig.upiId} 
                                       onChange={(e) => setRazorpayConfig(prev => ({ ...prev, upiId: e.target.value }))}
                                       placeholder="healthcare@pay_upi" 
                                       className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-black tracking-wide outline-none focus:border-[#2cb742] text-white" 
                                    />
                                    <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Automatic UPI authorization request will send notification to mobile app.</p>
                                 </div>
                              </div>
                           )}

                           {razorpayConfig.selectedMethod === 'Netbanking' && (
                              <div className="space-y-4">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Select Bank</label>
                                 <select
                                    value={razorpayConfig.bankSelected}
                                    onChange={(e) => setRazorpayConfig(prev => ({ ...prev, bankSelected: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wide outline-none focus:border-[#2cb742] text-white"
                                 >
                                    <option value="HDFC Bank">HDFC Bank (Instant Confirm)</option>
                                    <option value="ICICI Bank">ICICI Bank</option>
                                    <option value="State Bank of India">State Bank of India (SBI)</option>
                                    <option value="Axis Bank">Axis Bank</option>
                                 </select>
                              </div>
                           )}

                           {razorpayConfig.selectedMethod === 'QR' && (
                              <div className="flex items-center gap-6 bg-slate-900/60 p-4 rounded-xl border border-dashed border-slate-800">
                                 <div className="w-24 h-24 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                                    {/* Mock SVG QR Code */}
                                    <div className="w-full h-full border-4 border-black relative flex flex-wrap p-1">
                                       <div className="w-3 h-3 bg-black absolute top-1 left-1"></div>
                                       <div className="w-3 h-3 bg-black absolute top-1 right-1"></div>
                                       <div className="w-3 h-3 bg-black absolute bottom-1 left-1"></div>
                                       <div className="w-1.5 h-1.5 bg-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                                       <svg className="w-full h-full text-black opacity-80" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M4 4h4v4H4V4zm2 2v2h2V6H6zm8-2h4v4h-4V4zm2 2v2h2V6h-2zM4 14h4v4H4v-4zm2 2v2h2v-2H6zm10-2h4v2h-4v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-2-2h2v4h-2v-4zm-2-2h2v2h-2v-2z" />
                                       </svg>
                                    </div>
                                 </div>
                                 <div>
                                    <span className="text-[10px] font-black text-[#2cb742] uppercase tracking-wide">Static Sandbox QR</span>
                                    <h6 className="text-[11px] font-bold text-white uppercase mt-1">UPI Pay Ground Scanner</h6>
                                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">Scan with GPay, PhonePe, or PayTM. Safe instant sandbox payment matching engine active.</p>
                                    <div className="text-[9px] font-bold text-amber-500 uppercase mt-1 leading-none">Expires in: 4:32</div>
                                 </div>
                              </div>
                           )}

                           <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Razorpay Checkout Sandbox Enabled</span>
                              <button
                                 type="button"
                                 onClick={handleExecuteRazorpaySimulatedPayment}
                                 className="px-8 py-3 bg-[#2cb742] hover:bg-green-600 active:scale-95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all"
                              >
                                 Pay ₹{razorpayConfig.amount.toLocaleString()} Now
                              </button>
                           </div>
                        </div>
                     )}

                     {/* Processing states */}
                     {razorpayConfig.status === 'Paying' && (
                        <div className="flex flex-col items-center justify-center text-center space-y-6 h-full mt-4">
                           <Loader2 size={48} className="animate-spin text-[#2cb742] stroke-[3]" />
                           <div className="space-y-2">
                              <h5 className="text-sm font-black text-white uppercase tracking-widest">Integrating with Razorpay API Gateway...</h5>
                              <p className="text-[10px] text-zinc-400 font-mono tracking-wide uppercase">Connecting Secure Direct Ingress Channel • Status: AUTHORIZING</p>
                           </div>

                           {/* Progress indicators */}
                           <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-full h-3.5 p-0.5 overflow-hidden relative">
                              <div 
                                 className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-300" 
                                 style={{ width: `${razorpayConfig.txnProgress}%` }}
                              ></div>
                           </div>
                           <span className="text-[10px] font-bold text-[#2cb742] uppercase tracking-widest">{razorpayConfig.txnProgress}% Secure Processed</span>
                        </div>
                     )}

                     {/* Successful states */}
                     {razorpayConfig.status === 'Success' && (
                        <div className="flex flex-col items-center justify-center text-center space-y-6 h-full mt-4 animate-in zoom-in-95 duration-300">
                           <div className="w-16 h-16 bg-[#2cb742]/10 border-2 border-[#2cb742] rounded-full flex items-center justify-center text-[#2cb742]">
                              <Check size={32} className="stroke-[3]" />
                           </div>
                           <div className="space-y-1.5">
                              <h5 className="text-md font-black text-white uppercase tracking-widest">Transaction Successful</h5>
                              <p className="text-[10px] text-slate-400">Your online invoice/wallet receipt has been compiled and autolinked.</p>
                           </div>

                           <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl w-full max-w-md grid grid-cols-2 gap-4 text-left font-mono text-[9px] text-slate-300">
                              <div>
                                 <span className="text-slate-500 uppercase block font-bold">Razorpay ID</span>
                                 <span className="text-white font-bold block uppercase mt-0.5">pay_RP_{Date.now().toString().slice(-8)}</span>
                              </div>
                              <div>
                                 <span className="text-slate-500 uppercase block font-bold">Bank Reference</span>
                                 <span className="text-white font-bold block mt-0.5">TXN_{Math.floor(1000000000 + Math.random() * 9000000000)}</span>
                              </div>
                              <div className="col-span-2 pt-2 border-t border-slate-800">
                                 <p className="text-[#2cb742] font-black uppercase flex items-center gap-1">
                                    Reconciled with ClaimsNX ledger instantly (Auto Match Code 200)
                                 </p>
                              </div>
                           </div>

                           <button
                              type="button"
                              onClick={() => setShowRazorpayModal(false)}
                              className="px-10 py-3 bg-[#2cb742] hover:bg-green-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                           >
                              Return to Wallet & Billing
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      )}
      {previewRateList && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[600] flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 className="text-white text-lg font-bold truncate max-w-md">{previewRateList.entityName} - Rate List</h3>
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{previewRateList.fileName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {previewRateList.fileData && (
                <button 
                  onClick={() => handleDownload(previewRateList.fileName, previewRateList.fileData!, previewRateList.fileType)} 
                  className="px-6 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center"
                >
                  <Download size={16} className="mr-2" /> Download
                </button>
              )}
              <button onClick={() => setPreviewRateList(null)} className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="w-full max-w-6xl flex-1 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
            {previewRateList.fileData === '[STRIPPED_FOR_LOCAL_CACHE]' ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Globe size={64} className="mb-6 text-blue-500/40 animate-pulse" />
                <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Data Not Cached</h4>
                <p className="max-w-md text-sm text-slate-500 leading-relaxed">
                  This document is too large to be stored in your local browser cache. 
                  Please connect to the internet to download or view the full document from the cloud.
                </p>
                <div className="mt-8 flex gap-4">
                  <button 
                    onClick={() => setPreviewRateList(null)}
                    className="px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : previewRateList.fileData ? (
              previewRateList.fileType?.startsWith('image/') ? (
                <div className="w-full h-full flex items-center justify-center p-8 bg-slate-900">
                  <img 
                    src={blobUrl || `data:${previewRateList.fileType};base64,${previewRateList.fileData}`} 
                    className="max-w-full max-h-full object-contain shadow-2xl" 
                    alt="Rate List Preview"
                  />
                </div>
              ) : (
                <iframe 
                  src={blobUrl || `data:${previewRateList.fileType || 'application/pdf'};base64,${previewRateList.fileData}`} 
                  className="w-full h-full border-none" 
                  title="Rate List Preview"
                ></iframe>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <AlertTriangle size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">No Preview Available</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// Helper Components
const SectionHeading = ({ icon: Icon, title, subtitle }: any) => (
  <div className="flex items-center space-x-4">
    <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{title}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
    </div>
  </div>
);

const FieldView = ({ label, value, isEditing, onChange, isTextArea }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    {isEditing ? (
      isTextArea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none h-24"
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
        />
      )
    ) : (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 min-h-[54px] flex items-center">
        {value || <span className="text-slate-400 italic">Not set</span>}
      </div>
    )}
  </div>
);

const StampUpload = ({ label, value, isProcessing, onUpload, icon: Icon }: any) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="p-8 bg-slate-50/50 rounded-[3rem] border border-slate-100 flex flex-col items-center gap-6 group hover:border-blue-100 transition-all hover:bg-slate-50">
         <div className="w-40 h-40 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center overflow-hidden shadow-inner relative group-hover:border-blue-200 transition-all">
            {value ? (
              <img src={value} alt="Stamp" className="w-full h-full object-contain p-4 animate-in fade-in zoom-in" />
            ) : (
              <Icon className="text-slate-200 group-hover:text-blue-100 transition-colors" size={48} />
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                 <Loader2 size={40} className="text-blue-600 animate-spin" />
              </div>
            )}
         </div>
         <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0] || null)} />
         <button 
          type="button" 
          onClick={() => inputRef.current?.click()} 
          className="w-full py-4 bg-white border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg transition-all active:scale-95"
        >
          {value ? 'Replace Asset' : 'Upload Asset'}
        </button>
      </div>
    </div>
  );
};

export default ManageHospital;
