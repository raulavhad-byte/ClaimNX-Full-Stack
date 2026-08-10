import React, { useState, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { safeHtml2Canvas } from '../utils';
import { 
  ReceiptIndianRupee, Plus, Search, Filter, ChevronRight, Download, Printer, 
  Trash2, Edit, CheckCircle, Clock, AlertCircle, X, ChevronDown, 
  DollarSign, FileText, Calendar, Building, Send, PlusCircle, CreditCard,
  Layers, ArrowUpRight, TrendingUp, Info, ArrowDown, User, Percent,
  ShieldCheck, Mail, Play, History, FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { emailTemplateService } from '../services/emailTemplateService';
import InvoiceReminderModal from './InvoiceReminderModal';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceUpdateLog {
  timestamp: string;
  previousStatus: string;
  newStatus: string;
  utrNumber?: string;
  transactionDate?: string;
  amountPaid?: number;
  difference?: number;
  adjustmentConfirmed?: boolean;
  excessComment?: string;
  discrepancyBasis?: string;
  discrepancyComment?: string;
  notes?: string;
  user: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'Hospital' | 'Partner';
  recipientName: string;
  recipientEmail: string;
  recipientAddress: string;
  createdAt: string;
  dueDate: string;
  billingPeriod: string;
  pricingModel: 'Per Case' | 'Monthly Flat' | 'Percentage of Claim';
  claimsProcessedCount: number;
  totalClaimValue?: number;
  ratePerUnit: number;
  platformFee: number;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number; // 18% GST (CGST 9% + SGST 9%)
  totalAmount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Cancelled';
  utrNumber?: string;
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
  transactionDate?: string;
  amountPaid?: number;
  difference?: number;
  adjustmentConfirmed?: boolean;
  excessComment?: string;
  discrepancyBasis?: string;
  discrepancyComment?: string;
  updateHistory?: InvoiceUpdateLog[];
  billedCaseIds?: string[];
  skippedCaseIds?: string[];
  recoveredCaseIds?: string[];
  auditLog?: string[];
  emailDeliveryStatus?: string;
}

// Pre-seeded initial invoices
const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-001',
    invoiceNumber: 'INV/2026/06/001',
    type: 'Hospital',
    recipientName: 'Apollo Hospitals - Greams Road',
    recipientEmail: 'finance@apollohospitals.com',
    recipientAddress: '21 Greams Lane, Off Greams Road, Chennai, Tamil Nadu 600006',
    createdAt: '2026-06-01',
    dueDate: '2026-06-15',
    billingPeriod: 'May 2026',
    pricingModel: 'Per Case',
    claimsProcessedCount: 142,
    ratePerUnit: 150,
    platformFee: 5000,
    lineItems: [
      { description: 'Claims Processing Services - Per Case Fee (142 cases)', quantity: 142, rate: 150, amount: 21300 },
      { description: 'Monthly Cloud Platform Integration License Fee', quantity: 1, rate: 5000, amount: 5000 },
      { description: 'Live Claim Tracking Integration (Value Added Service)', quantity: 1, rate: 2500, amount: 2500 },
    ],
    subtotal: 28800,
    taxAmount: 5184,
    totalAmount: 33984,
    status: 'Paid',
    utrNumber: 'N0352617789421',
    paidAt: '2026-06-12',
    paymentMethod: 'NEFT Transfer',
    notes: 'Fully settled by Apollo finance team. UTR matched with HDFC bank node.'
  },
  {
    id: 'INV-2026-002',
    invoiceNumber: 'INV/2026/06/002',
    type: 'Partner',
    recipientName: 'MediClaim Partners Ltd',
    recipientEmail: 'invoicing@mediclaimpartners.in',
    recipientAddress: '7th Floor, Tech Park Wing B, Sector 62, Noida, UP 201301',
    createdAt: '2026-06-03',
    dueDate: '2026-06-18',
    billingPeriod: 'May 2026',
    pricingModel: 'Percentage of Claim',
    claimsProcessedCount: 45,
    totalClaimValue: 2450000,
    ratePerUnit: 1.5, // 1.5%
    platformFee: 10000,
    lineItems: [
      { description: 'Claims Management Partnership Fee (1.5% of ₹2,450,000)', quantity: 1, rate: 36750, amount: 36750 },
      { description: 'Platform Enterprise Multi-user License', quantity: 1, rate: 10000, amount: 10000 },
      { description: 'Auto-Reporting and Custom MIS Dashboards add-on', quantity: 1, rate: 3000, amount: 3000 }
    ],
    subtotal: 49750,
    taxAmount: 8955,
    totalAmount: 58705,
    status: 'Paid',
    utrNumber: 'UPI627389102123',
    paidAt: '2026-06-16',
    paymentMethod: 'UPI Business Gateway',
    notes: 'Automated settlement via partner portal payment link.'
  },
  {
    id: 'INV-2026-003',
    invoiceNumber: 'INV/2026/06/003',
    type: 'Hospital',
    recipientName: 'Fortis Healthcare - Okhla',
    recipientEmail: 'okhla.accounts@fortishealthcare.com',
    recipientAddress: 'Fortis Hospital Road, Sukhdev Vihar, Okhla, New Delhi 110025',
    createdAt: '2026-06-05',
    dueDate: '2026-06-20',
    billingPeriod: 'May 2026',
    pricingModel: 'Monthly Flat',
    claimsProcessedCount: 210,
    ratePerUnit: 0,
    platformFee: 45000,
    lineItems: [
      { description: 'Enterprise Monthly Flat Operations Fee (Unlimited cases)', quantity: 1, rate: 45000, amount: 45000 },
      { description: 'Priority SLA Dedicated Processing Queue Support', quantity: 1, rate: 15000, amount: 15000 }
    ],
    subtotal: 60000,
    taxAmount: 10800,
    totalAmount: 70800,
    status: 'Overdue',
    notes: 'Payment reminder sent to Fortis CFO inbox. Awaiting response on check dispatch.'
  },
  {
    id: 'INV-2026-004',
    invoiceNumber: 'INV/2026/06/004',
    type: 'Partner',
    recipientName: 'Royal Claims Underwriters',
    recipientEmail: 'invoicing@royalclaims.org',
    recipientAddress: 'Marol Naka, Andheri East, Mumbai, Maharashtra 400059',
    createdAt: '2026-06-10',
    dueDate: '2026-07-10',
    billingPeriod: 'June 2026 (Advance)',
    pricingModel: 'Monthly Flat',
    claimsProcessedCount: 0,
    ratePerUnit: 0,
    platformFee: 20000,
    lineItems: [
      { description: 'Dedicated Dedicated Underwriter API Connection Fee', quantity: 1, rate: 20000, amount: 20000 },
    ],
    subtotal: 20000,
    taxAmount: 3600,
    totalAmount: 23600,
    status: 'Pending',
    notes: 'Advance invoice for standard API middleware access.'
  },
  {
    id: 'INV-2026-005',
    invoiceNumber: 'INV/2026/06/005',
    type: 'Hospital',
    recipientName: 'Apollo Hospitals - Jubilee Hills',
    recipientEmail: 'billing.jh@apollohospitals.com',
    recipientAddress: 'Road No 72, Opposite Bharatiya Vidya Bhavan, Jubilee Hills, Hyderabad 500033',
    createdAt: '2026-06-12',
    dueDate: '2026-06-27',
    billingPeriod: 'May 2026',
    pricingModel: 'Per Case',
    claimsProcessedCount: 88,
    ratePerUnit: 150,
    platformFee: 5000,
    lineItems: [
      { description: 'Claims Processing Services - Per Case Fee (88 cases)', quantity: 88, rate: 150, amount: 13200 },
      { description: 'Monthly Cloud Platform Integration License Fee', quantity: 1, rate: 5000, amount: 5000 }
    ],
    subtotal: 18200,
    taxAmount: 3276,
    totalAmount: 21476,
    status: 'Pending',
    notes: 'Under review by hospital senior auditor.'
  },
  {
    id: 'INV-2026-006',
    invoiceNumber: 'INV/2026/06/006',
    type: 'Partner',
    recipientName: 'Star Health Premium Processing',
    recipientEmail: 'partner.billing@starhealth.in',
    recipientAddress: 'No.1, New Tank Street, Valluvar Kottam High Road, Nungambakkam, Chennai 600034',
    createdAt: '2026-06-15',
    dueDate: '2026-06-30',
    billingPeriod: 'May 2026',
    pricingModel: 'Percentage of Claim',
    claimsProcessedCount: 30,
    totalClaimValue: 1200000,
    ratePerUnit: 1.2, // 1.2%
    platformFee: 8000,
    lineItems: [
      { description: 'Claims Management Partnership Fee (1.2% of ₹1,200,000)', quantity: 1, rate: 14400, amount: 14400 },
      { description: 'Platform Enterprise License Addon', quantity: 1, rate: 8000, amount: 8000 }
    ],
    subtotal: 22400,
    taxAmount: 4032,
    totalAmount: 26432,
    status: 'Pending',
    notes: 'Generated automatically by platform. Under matching.'
  }
];

interface InvoiceManagementProps {
  hospitals?: any[];
  currentUser?: any;
  claims?: any[];
}

const MONTH_NAMES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const getQuarter = (monthStr: string) => {
  const m = parseInt(monthStr, 10);
  if (m >= 1 && m <= 3) return { num: 1, label: 'Q1 (Jan-Mar)', months: ['01', '02', '03'] };
  if (m >= 4 && m <= 6) return { num: 2, label: 'Q2 (Apr-Jun)', months: ['04', '05', '06'] };
  if (m >= 7 && m <= 9) return { num: 3, label: 'Q3 (Jul-Sep)', months: ['07', '08', '09'] };
  return { num: 4, label: 'Q4 (Oct-Dec)', months: ['10', '11', '12'] };
};

interface AutomatedRunLog {
  id: string;
  timestamp: string;
  billingPeriod: string;
  invoicesGenerated: number;
  totalAmountGenerated: number;
  casesBilledCount: number;
  missedCasesRecoveredCount: number;
  duplicateCasesSkippedCount: number;
  details: string[];
  invoiceIds: string[];
}

const InvoiceManagement: React.FC<InvoiceManagementProps> = ({ hospitals = [], currentUser, claims = [] }) => {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('hospital_invoices_registry');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [viewTab, setViewTab] = useState<'invoices' | 'automated_runs'>('invoices');
  const [runMonth, setRunMonth] = useState<string>('06');
  const [runYear, setRunYear] = useState<string>('2026');
  const [automatedRuns, setAutomatedRuns] = useState<AutomatedRunLog[]>(() => {
    const saved = localStorage.getItem('automated_billing_audit_log');
    return saved ? JSON.parse(saved) : [];
  });

  const [latestRunInvoices, setLatestRunInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIdsForEmail, setSelectedInvoiceIdsForEmail] = useState<Record<string, boolean>>({});
  const [isEmailsSentForLatestRun, setIsEmailsSentForLatestRun] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('automated_billing_audit_log', JSON.stringify(automatedRuns));
  }, [automatedRuns]);

  // NEW Dashboard selectors state
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('06'); // June
  const [dashboardView, setDashboardView] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');

  const [filterType, setFilterType] = useState<'All' | 'Hospital' | 'Partner'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Paid' | 'Pending' | 'Overdue' | 'Cancelled'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [isPreviewActiveOpen, setIsPreviewActiveOpen] = useState(false);
  const [isPreviewInvoiceModalOpen, setIsPreviewInvoiceModalOpen] = useState(false);
  const [previewInvoiceData, setPreviewInvoiceData] = useState<Invoice | null>(null);
  
  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  const getRateForClaimInReview = (claim: any, inv: Invoice) => {
    const caseId = claim.caseReferenceId || claim.id;
    const match = inv.lineItems.find((item: any) => item.description.includes(caseId));
    return match ? match.rate : (inv.ratePerUnit || 150);
  };

  const handleExecuteAutomatedBilling = () => {
    const targetMonthObj = MONTH_NAMES.find(m => m.value === runMonth);
    const billingPeriod = `${targetMonthObj ? targetMonthObj.label : 'June'} ${runYear}`;
    
    // 1. Gather all globally billed Case IDs
    const globallyBilledCaseIds = new Set<string>();
    invoices.forEach(inv => {
      if (inv.billedCaseIds && Array.isArray(inv.billedCaseIds)) {
        inv.billedCaseIds.forEach(id => globallyBilledCaseIds.add(id));
      }
    });

    const isEligibleStatus = (status: string) => {
      const s = (status || '').toLowerCase();
      return s.includes('settl') || s.includes('approv') || s.includes('discharg') || s.includes('complete') || s.includes('recon');
    };

    const isCurrentPeriod = (createdAtStr: string) => {
      if (!createdAtStr) return false;
      return createdAtStr.startsWith(`${runYear}-${runMonth}`);
    };

    const isPreviousPeriod = (createdAtStr: string) => {
      if (!createdAtStr) return false;
      try {
        const parts = createdAtStr.split('-');
        if (parts.length >= 2) {
          const yearNum = parseInt(parts[0], 10);
          const monthNum = parseInt(parts[1], 10);
          const targetY = parseInt(runYear, 10);
          const targetM = parseInt(runMonth, 10);
          if (yearNum < targetY) return true;
          if (yearNum === targetY && monthNum < targetM) return true;
        }
      } catch (e) {}
      return false;
    };

    const newInvoicesList: Invoice[] = [];
    const runDetails: string[] = [];
    let totalInvoices = 0;
    let totalAmt = 0;
    let casesBilledCount = 0;
    let missedCasesRecoveredCount = 0;
    let duplicateCasesSkippedCount = 0;

    hospitals.forEach(hospital => {
      const agreementType = hospital.agreementType || 'Per Case';
      const agreementValue = Number(hospital.agreementValue) || 0;
      const basisType = hospital.agreementPercentageBase || 'Final Approval Amount';
      
      const recipientName = hospital.hospitalName || hospital.displayName || 'Apollo Greams';
      const recipientEmail = hospital.invoiceEmail || hospital.emailId || `finance@${recipientName.toLowerCase().replace(/\s+/g, '')}.com`;
      const recipientAddress = hospital.address || 'Corporate Office, Mumbai, India';

      const hospitalClaims = claims.filter(c => c.hospitalId === hospital.id);
      const eligibleClaims = hospitalClaims.filter(c => isEligibleStatus(c.status));

      const lineItems: InvoiceLineItem[] = [];
      let subtotal = 0;
      let claimsProcessed = 0;
      let totalBasisVal = 0;
      
      const currentBilledIds: string[] = [];
      const skippedIds: string[] = [];
      const recoveredIds: string[] = [];
      const invoiceAuditLog: string[] = [];

      invoiceAuditLog.push(`Validation run started at ${new Date().toLocaleString()}`);
      invoiceAuditLog.push(`Billing Entity: ${recipientName} | Email: ${recipientEmail}`);
      invoiceAuditLog.push(`Commercial Type: ${agreementType}`);

      if (agreementType === 'Per Case') {
        const currentPeriodClaims = eligibleClaims.filter(c => isCurrentPeriod(c.createdAt));
        const missedClaims = eligibleClaims.filter(c => isPreviousPeriod(c.createdAt));

        invoiceAuditLog.push(`Found ${currentPeriodClaims.length} current period claims and ${missedClaims.length} prior claims with eligible status.`);

        const getRateForClaim = (c: any) => {
          if (hospital.agreementStageValues && hospital.agreementStageValues.length > 0) {
            const match = hospital.agreementStageValues.find((sv: any) => sv.stage === c.status);
            if (match && Number(match.value) > 0) {
              return Number(match.value);
            }
          }
          return agreementValue || 150;
        };

        currentPeriodClaims.forEach(c => {
          const caseId = c.caseReferenceId || c.id;
          if (globallyBilledCaseIds.has(caseId)) {
            skippedIds.push(caseId);
            duplicateCasesSkippedCount++;
            invoiceAuditLog.push(`[DUPLICATE DETECTED] Skip Case ${caseId}: Already billed in an existing invoice.`);
          } else {
            globallyBilledCaseIds.add(caseId);
            currentBilledIds.push(caseId);
            casesBilledCount++;
            claimsProcessed++;
            const rate = getRateForClaim(c);
            lineItems.push({
              description: `Claims Processing Fee - Case ${caseId} (${c.patientName || 'Patient'})`,
              quantity: 1,
              rate,
              amount: rate
            });
            subtotal += rate;
          }
        });

        missedClaims.forEach(c => {
          const caseId = c.caseReferenceId || c.id;
          if (!globallyBilledCaseIds.has(caseId)) {
            globallyBilledCaseIds.add(caseId);
            currentBilledIds.push(caseId);
            recoveredIds.push(caseId);
            missedCasesRecoveredCount++;
            claimsProcessed++;
            const rate = getRateForClaim(c);
            lineItems.push({
              description: `Recovered Fee (Missed in Previous Cycle) - Case ${caseId} (${c.patientName || 'Patient'})`,
              quantity: 1,
              rate,
              amount: rate
            });
            subtotal += rate;
            invoiceAuditLog.push(`[MISSED CASE RECOVERED] Recovered Case ${caseId} from ${c.createdAt.split('T')[0]}: Included in current cycle.`);
          }
        });

        const basePlatformFee = 5000;
        lineItems.push({
          description: 'Tech Platform Integration License Fee',
          quantity: 1,
          rate: basePlatformFee,
          amount: basePlatformFee
        });
        subtotal += basePlatformFee;
        invoiceAuditLog.push(`Included fixed Platform License Fee: ₹${basePlatformFee.toLocaleString()}`);

      } else if (agreementType === 'Monthly Billing') {
        const flatFee = agreementValue || 45000;
        lineItems.push({
          description: `Enterprise Monthly Flat Operations Fee - ${billingPeriod} (Unlimited cases)`,
          quantity: 1,
          rate: flatFee,
          amount: flatFee
        });
        subtotal = flatFee;
        invoiceAuditLog.push(`Included fixed Monthly Flat Fee: ₹${flatFee.toLocaleString()}`);

      } else if (agreementType === 'Percentage') {
        const currentPeriodClaims = eligibleClaims.filter(c => isCurrentPeriod(c.createdAt));
        const pct = agreementValue || 1.5;

        currentPeriodClaims.forEach(c => {
          let claimVal = 0;
          if (basisType === 'Final Approval Amount') {
            claimVal = Number(c.formData?.approvedAmount) || Number(c.estimatedCost) || 0;
          } else {
            claimVal = Number(c.formData?.settledAmount) || c.paidAmount || Number(c.estimatedCost) || 0;
          }
          totalBasisVal += claimVal;
          claimsProcessed++;
          currentBilledIds.push(c.caseReferenceId || c.id);
        });

        const pctFee = (totalBasisVal * pct) / 100;
        lineItems.push({
          description: `Claims Management Platform Fee (${pct}% of ₹${totalBasisVal.toLocaleString('en-IN')} ${basisType}) for ${currentPeriodClaims.length} cases`,
          quantity: 1,
          rate: pctFee,
          amount: pctFee
        });
        subtotal += pctFee;

        const basePlatformFee = 5000;
        lineItems.push({
          description: 'Tech Platform Integration License Fee',
          quantity: 1,
          rate: basePlatformFee,
          amount: basePlatformFee
        });
        subtotal += basePlatformFee;

        invoiceAuditLog.push(`Processed ${currentPeriodClaims.length} cases. Basis Type: ${basisType}. Total Volume: ₹${totalBasisVal.toLocaleString('en-IN')}`);
        invoiceAuditLog.push(`Calculated Percentage Fee (${pct}%): ₹${pctFee.toLocaleString('en-IN')}`);
        invoiceAuditLog.push(`Included fixed Platform License Fee: ₹${basePlatformFee.toLocaleString()}`);
      }

      if (subtotal === 0) {
        invoiceAuditLog.push(`No active cases or flat commercials found. Invoice generation skipped.`);
        runDetails.push(`Hospital ${recipientName}: Skipped (No activity to bill).`);
        return;
      }

      const taxAmount = subtotal * 0.18;
      const totalAmount = subtotal + taxAmount;
      const invoiceNumber = `INV/${runYear}/${runMonth}/${String(invoices.length + newInvoicesList.length + 1).padStart(3, '0')}`;

      const newInv: Invoice = {
        id: `INV-${runYear}-${String(invoices.length + newInvoicesList.length + 1).padStart(3, '0')}`,
        invoiceNumber,
        type: hospital.entityType === 'Partner' ? 'Partner' : 'Hospital',
        recipientName,
        recipientEmail,
        recipientAddress,
        createdAt: `${runYear}-${runMonth}-01`,
        dueDate: (() => {
          const due = new Date(`${runYear}-${runMonth}-01`);
          due.setDate(due.getDate() + 15);
          return due.toISOString().split('T')[0];
        })(),
        billingPeriod,
        pricingModel: agreementType === 'Monthly Billing' ? 'Monthly Flat' : (agreementType === 'Percentage' ? 'Percentage of Claim' : 'Per Case'),
        claimsProcessedCount: claimsProcessed,
        totalClaimValue: agreementType === 'Percentage' ? totalBasisVal : undefined,
        ratePerUnit: agreementType === 'Percentage' ? agreementValue || 1.5 : (agreementType === 'Per Case' ? agreementValue || 150 : 0),
        platformFee: agreementType === 'Monthly Billing' ? agreementValue : 5000,
        lineItems,
        subtotal,
        taxAmount,
        totalAmount,
        status: 'Pending',
        notes: `Automated 1st of month billing run for ${billingPeriod}.`,
        billedCaseIds: currentBilledIds,
        skippedCaseIds: skippedIds,
        recoveredCaseIds: recoveredIds,
        auditLog: invoiceAuditLog,
        emailDeliveryStatus: 'Not Sent'
      };

      newInvoicesList.push(newInv);
      totalInvoices++;
      totalAmt += totalAmount;
      runDetails.push(`Calculated Invoice ${invoiceNumber} for ${recipientName} (Total: ₹${totalAmount.toLocaleString('en-IN')}) | Email: ${recipientEmail}.`);
    });

    if (newInvoicesList.length === 0) {
      toast.error('No billing runs executed. Verify active onboarding setups and claims status.');
      return;
    }

    const updatedInvoices = [...invoices, ...newInvoicesList];
    setInvoices(updatedInvoices);
    localStorage.setItem('hospital_invoices_registry', JSON.stringify(updatedInvoices));

    const runLogObj: AutomatedRunLog = {
      id: `RUN-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN'),
      billingPeriod,
      invoicesGenerated: totalInvoices,
      totalAmountGenerated: totalAmt,
      casesBilledCount,
      missedCasesRecoveredCount,
      duplicateCasesSkippedCount,
      details: runDetails,
      invoiceIds: newInvoicesList.map(inv => inv.id)
    };

    setAutomatedRuns(prev => [runLogObj, ...prev]);
    
    // Set the latest generated invoices for user review and selection
    setLatestRunInvoices(newInvoicesList);
    const initialSelection: Record<string, boolean> = {};
    newInvoicesList.forEach(inv => {
      initialSelection[inv.id] = true;
    });
    setSelectedInvoiceIdsForEmail(initialSelection);
    setIsEmailsSentForLatestRun(false);

    toast.success(`Automated Billing Calculated! Generated ${totalInvoices} invoices (₹${totalAmt.toLocaleString('en-IN')}). Review invoice details below and dispatch emails.`);
  };

  const handleSendEmailsForLatestRun = () => {
    const selectedIds = Object.keys(selectedInvoiceIdsForEmail).filter(id => selectedInvoiceIdsForEmail[id]);
    if (selectedIds.length === 0) {
      toast.error('No Hospital/Partner selected for sending email.');
      return;
    }

    const targetMonthObj = MONTH_NAMES.find(m => m.value === runMonth);
    const billingPeriod = `${targetMonthObj ? targetMonthObj.label : 'June'} ${runYear}`;

    let sentCount = 0;
    const updatedInvoices = invoices.map(inv => {
      const isLatestRun = latestRunInvoices.some(li => li.id === inv.id);
      if (isLatestRun && selectedInvoiceIdsForEmail[inv.id]) {
        sentCount++;
        
        // Build and save email log
        const emailLog = {
          id: `email-auto-inv-${inv.id}`,
          sentDate: new Date().toISOString(),
          sender: "billing@claimnx.com",
          recipient: inv.recipientEmail,
          recipientType: inv.type,
          subject: `Automated Tax Invoice ${inv.invoiceNumber} - ${billingPeriod} | ${inv.recipientName}`,
          body: `Dear Accounts Team at ${inv.recipientName},\n\nPlease find attached the automated Tax Invoice ${inv.invoiceNumber} for the billing period of ${billingPeriod}.\n\nSummary of Commercials:\n-----------------------\n- Commercial Type: ${inv.pricingModel}\n- Amount Due: ₹${inv.totalAmount.toLocaleString('en-IN')} (including 18% GST)\n- Due Date: ${inv.dueDate}\n\n${inv.pricingModel === 'Per Case' ? `Billed Cases Summary:\n- Current Billed Cases: ${(inv.billedCaseIds || []).length - (inv.recoveredCaseIds || []).length}\n- Recovered Missed Cases: ${(inv.recoveredCaseIds || []).length}\n- Duplicate Cases Prevented: ${(inv.skippedCaseIds || []).length}` : ''}\n\n${inv.pricingModel === 'Percentage of Claim' ? `Percentage-Based Summary:\n- Base Claim Volume: ₹${(inv.totalClaimValue || 0).toLocaleString('en-IN')}\n- Applied Percentage: ${inv.ratePerUnit}%` : ''}\n\nAn audit log has been maintained. Please access the Partner/Hospital Portal to settle the invoice via NEFT/UPI.\n\nRegards,\nClaimNX Billing Automation Node`,
          status: "Sent",
          templateUsed: "Invoice Automatic Delivery"
        };

        try {
          const storedEmails = localStorage.getItem('claimnx_emails');
          const emailsList = storedEmails ? JSON.parse(storedEmails) : [];
          emailsList.push(emailLog);
          localStorage.setItem('claimnx_emails', JSON.stringify(emailsList));
        } catch (e) {
          console.error('Failed to log email', e);
        }

        return { ...inv, emailDeliveryStatus: 'Sent' };
      }
      return inv;
    });

    // Update latestRunInvoices array's email delivery status too
    const updatedLatest = latestRunInvoices.map(inv => {
      if (selectedInvoiceIdsForEmail[inv.id]) {
        return { ...inv, emailDeliveryStatus: 'Sent' };
      }
      return inv;
    });

    setInvoices(updatedInvoices);
    setLatestRunInvoices(updatedLatest);
    localStorage.setItem('hospital_invoices_registry', JSON.stringify(updatedInvoices));
    setIsEmailsSentForLatestRun(true);

    toast.success(`Successfully sent emails to ${sentCount} selected Hospital/Partner accounts!`);
  };
  
  // Create New Invoice Form State
  const [newInvType, setNewInvType] = useState<'Hospital' | 'Partner'>('Hospital');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [sendEmailToHospital, setSendEmailToHospital] = useState(true);
  const [newInvRecipient, setNewInvRecipient] = useState('');
  const [newInvEmail, setNewInvEmail] = useState('');
  const [newInvAddress, setNewInvAddress] = useState('');
  const [newBillingPeriod, setNewBillingPeriod] = useState('June 2026');
  const [newPricingModel, setNewPricingModel] = useState<'Per Case' | 'Monthly Flat' | 'Percentage of Claim'>('Per Case');
  const [newClaimsCount, setNewClaimsCount] = useState(10);
  const [newClaimValue, setNewClaimValue] = useState(500000);
  const [newRate, setNewRate] = useState(150);
  const [newPlatformFee, setNewPlatformFee] = useState(5000);
  const [newNotes, setNewNotes] = useState('');
  const [dueDateDays, setDueDateDays] = useState(15);

  // Update Status Form State
  const [updateStatusVal, setUpdateStatusVal] = useState<'Paid' | 'Pending' | 'Overdue' | 'Cancelled'>('Paid');
  const [updateUtr, setUpdateUtr] = useState('');
  const [updateMethod, setUpdateMethod] = useState('NEFT Transfer');
  const [updateNotes, setUpdateNotes] = useState('');

  // NEW Fields for Payment Status = Paid
  const [updateTxnDate, setUpdateTxnDate] = useState('');
  const [updateAmountPaid, setUpdateAmountPaid] = useState<number | string>('');
  const [updateWriteOffConfirmed, setUpdateWriteOffConfirmed] = useState(false);
  const [updateExcessComment, setUpdateExcessComment] = useState('');
  const [updateDiscrepancyBasis, setUpdateDiscrepancyBasis] = useState<string>('Write Off');
  const [updateDiscrepancyComment, setUpdateDiscrepancyComment] = useState<string>('');
  const [updaterUser, setUpdaterUser] = useState('');

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('hospital_invoices_registry', JSON.stringify(invoices));
  }, [invoices]);

  // Statistics calculation
  const stats = useMemo(() => {
    const activeInvoices = invoices.filter(inv => inv.status !== 'Cancelled');
    const totalAmount = activeInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalPaid = activeInvoices.filter(inv => inv.status === 'Paid').reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalPending = activeInvoices.filter(inv => inv.status === 'Pending').reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalOverdue = activeInvoices.filter(inv => inv.status === 'Overdue').reduce((acc, inv) => acc + inv.totalAmount, 0);
    
    const paidCount = activeInvoices.filter(inv => inv.status === 'Paid').length;
    const pendingCount = activeInvoices.filter(inv => inv.status === 'Pending').length;
    const overdueCount = activeInvoices.filter(inv => inv.status === 'Overdue').length;

    const hospitalTotal = activeInvoices.filter(inv => inv.type === 'Hospital').reduce((acc, inv) => acc + inv.totalAmount, 0);
    const partnerTotal = activeInvoices.filter(inv => inv.type === 'Partner').reduce((acc, inv) => acc + inv.totalAmount, 0);

    return {
      totalAmount,
      totalPaid,
      totalPending,
      totalOverdue,
      paidCount,
      pendingCount,
      overdueCount,
      hospitalTotal,
      partnerTotal
    };
  }, [invoices]);

  const availableYears = useMemo(() => {
    const years = invoices.map(inv => inv.createdAt.substring(0, 4));
    return Array.from(new Set([...years, '2026', '2025', '2024'])).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  const dashboardStats = useMemo(() => {
    const periodInvoices = invoices.filter(inv => {
      if (inv.status === 'Cancelled') return false;
      const invYear = inv.createdAt.substring(0, 4);
      const invMonth = inv.createdAt.substring(5, 7);

      if (invYear !== selectedYear) return false;

      if (dashboardView === 'Monthly') {
        return invMonth === selectedMonth;
      } else if (dashboardView === 'Quarterly') {
        const q = getQuarter(selectedMonth);
        return q.months.includes(invMonth);
      } else {
        // Yearly
        return true;
      }
    });

    const totalInvoiced = periodInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalPaidInvoices = periodInvoices.filter(inv => inv.status === 'Paid');
    
    const totalOutstanding = periodInvoices
      .filter(inv => inv.status === 'Pending' || inv.status === 'Overdue')
      .reduce((acc, inv) => acc + inv.totalAmount, 0);

    const totalCollected = totalPaidInvoices.reduce((acc, inv) => {
      return acc + (inv.amountPaid !== undefined ? inv.amountPaid : inv.totalAmount);
    }, 0);

    const totalOverdue = periodInvoices
      .filter(inv => inv.status === 'Overdue')
      .reduce((acc, inv) => acc + inv.totalAmount, 0);

    const totalWriteOff = totalPaidInvoices.reduce((acc, inv) => {
      if (inv.difference !== undefined && inv.difference < -0.01) {
        return acc + Math.abs(inv.difference);
      }
      return acc;
    }, 0);

    const totalExcess = totalPaidInvoices.reduce((acc, inv) => {
      if (inv.difference !== undefined && inv.difference > 0.01) {
        return acc + inv.difference;
      }
      return acc;
    }, 0);

    const paidCount = totalPaidInvoices.length;
    const pendingCount = periodInvoices.filter(inv => inv.status === 'Pending').length;
    const overdueCount = periodInvoices.filter(inv => inv.status === 'Overdue').length;
    const invoiceCount = periodInvoices.length;

    const collectionEfficiency = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    let totalDays = 0;
    let settledWithDateCount = 0;
    totalPaidInvoices.forEach(inv => {
      const createdStr = inv.createdAt;
      const settledStr = inv.paidAt || inv.transactionDate;
      if (createdStr && settledStr) {
        const createdDate = new Date(createdStr);
        const settledDate = new Date(settledStr);
        const diffTime = settledDate.getTime() - createdDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (!isNaN(diffDays) && diffDays >= 0) {
          totalDays += diffDays;
          settledWithDateCount++;
        }
      }
    });
    const avgSettlementDays = settledWithDateCount > 0 ? Math.round(totalDays / settledWithDateCount) : null;
    const uniqueClients = new Set(periodInvoices.map(inv => inv.recipientName)).size;

    return {
      periodInvoices,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalOverdue,
      totalWriteOff,
      totalExcess,
      paidCount,
      pendingCount,
      overdueCount,
      invoiceCount,
      collectionEfficiency,
      avgSettlementDays,
      uniqueClients
    };
  }, [invoices, selectedYear, selectedMonth, dashboardView]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesType = filterType === 'All' || inv.type === filterType;
      const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
      const matchesSearch = inv.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (inv.utrNumber && inv.utrNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [invoices, filterType, filterStatus, searchTerm]);

  const generatePreviewData = (): Invoice | null => {
    if (!newInvRecipient.trim() || !newInvEmail.trim()) {
      toast.error('Please enter recipient name and email');
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    const due = new Date();
    due.setDate(due.getDate() + Number(dueDateDays));
    const dueDateStr = due.toISOString().split('T')[0];

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const seq = String(invoices.length + 1).padStart(3, '0');
    const generatedNumber = `INV/${year}/${month}/${seq}`;
    const generatedId = `INV-${year}-${seq}`;

    // Compute line items
    const lineItems: InvoiceLineItem[] = [];
    let computedAmount = 0;

    if (newPricingModel === 'Per Case') {
      const amt = newClaimsCount * newRate;
      lineItems.push({
        description: `Claims Processing Fee - Per Case Fee (${newClaimsCount} cases)`,
        quantity: newClaimsCount,
        rate: newRate,
        amount: amt
      });
      computedAmount += amt;
    } else if (newPricingModel === 'Percentage of Claim') {
      const percentageAmount = (newClaimValue * newRate) / 100;
      lineItems.push({
        description: `Claims Management Platform Fee (${newRate}% of ₹${newClaimValue.toLocaleString('en-IN')})`,
        quantity: 1,
        rate: percentageAmount,
        amount: percentageAmount
      });
      computedAmount += percentageAmount;
    } else {
      // Monthly Flat
      lineItems.push({
        description: `Monthly Flat Claims Administration Fee`,
        quantity: 1,
        rate: newPlatformFee,
        amount: newPlatformFee
      });
      computedAmount += newPlatformFee;
    }

    // Always append secondary base platform fee if not flat
    if (newPricingModel !== 'Monthly Flat' && newPlatformFee > 0) {
      lineItems.push({
        description: 'Tech Platform Integration License Fee',
        quantity: 1,
        rate: newPlatformFee,
        amount: newPlatformFee
      });
      computedAmount += newPlatformFee;
    }

    const subtotal = computedAmount;
    const taxAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + taxAmount;

    return {
      id: generatedId,
      invoiceNumber: generatedNumber,
      type: newInvType,
      recipientName: newInvRecipient,
      recipientEmail: newInvEmail,
      recipientAddress: newInvAddress || 'Corporate Office Address Not Provided',
      createdAt: today,
      dueDate: dueDateStr,
      billingPeriod: newBillingPeriod,
      pricingModel: newPricingModel,
      claimsProcessedCount: newPricingModel === 'Per Case' ? newClaimsCount : 0,
      totalClaimValue: newPricingModel === 'Percentage of Claim' ? newClaimValue : undefined,
      ratePerUnit: newRate,
      platformFee: newPlatformFee,
      lineItems,
      subtotal,
      taxAmount,
      totalAmount,
      status: 'Pending',
      notes: newNotes
    };
  };

  // Handle invoice generation
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const invoice = generatePreviewData();
    if (!invoice) return;

    setInvoices([invoice, ...invoices]);
    setIsCreateModalOpen(false);
    toast.success(`Invoice ${invoice.invoiceNumber} created successfully!`);

    if (sendEmailToHospital) {
      toast.success(`Tax invoice PDF copy sent to: ${newInvEmail}`);
    }

    // Reset Form
    setSelectedHospitalId('');
    setNewInvRecipient('');
    setNewInvEmail('');
    setNewInvAddress('');
    setNewNotes('');
  };

  const handlePreviewCustomInvoice = (e: React.MouseEvent) => {
    e.preventDefault();
    const data = generatePreviewData();
    if (data) {
      setPreviewInvoiceData(data);
      setIsPreviewInvoiceModalOpen(true);
    }
  };

  // Open update status modal
  const handleOpenStatusUpdate = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setUpdateStatusVal(invoice.status);
    setUpdateUtr(invoice.utrNumber || '');
    setUpdateMethod(invoice.paymentMethod || 'NEFT Transfer');
    setUpdateNotes(invoice.notes || '');
    
    // NEW Payment Status Fields initialization
    setUpdateTxnDate(invoice.transactionDate || new Date().toISOString().split('T')[0]);
    setUpdateAmountPaid(invoice.amountPaid !== undefined ? invoice.amountPaid : invoice.totalAmount);
    setUpdateWriteOffConfirmed(invoice.adjustmentConfirmed || false);
    setUpdateExcessComment(invoice.excessComment || '');
    setUpdateDiscrepancyBasis(invoice.discrepancyBasis || (invoice.amountPaid !== undefined && invoice.amountPaid < invoice.totalAmount ? 'Write Off' : 'Adjustment'));
    setUpdateDiscrepancyComment(invoice.discrepancyComment || '');
    
    const defaultUser = currentUser?.displayName || currentUser?.firstName || currentUser?.username || currentUser?.emailId || 'Raul Avhad';
    setUpdaterUser(defaultUser);
    
    setIsUpdateStatusOpen(true);
  };

  // Save invoice status update
  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    // Validate if Status is Paid
    let diff = 0;
    if (updateStatusVal === 'Paid') {
      diff = Number(updateAmountPaid) - selectedInvoice.totalAmount;
      
      // If there is any under/overpayment discrepancy, enforce resolution basis and comments
      if (Math.abs(diff) > 0.01) {
        if (!updateDiscrepancyBasis) {
          toast.error('Please select the discrepancy resolution basis.');
          return;
        }
        if (!updateDiscrepancyComment.trim()) {
          toast.error('Please enter the comments or reasons explaining the discrepancy.');
          return;
        }
      }

      if (diff < -0.01 && !updateWriteOffConfirmed && updateDiscrepancyBasis === 'Write Off') {
        toast.error(`Please confirm write-off authorization checkbox for short payment of ₹${Math.abs(diff).toLocaleString('en-IN')}`);
        return;
      }
    }

    const now = new Date();
    // Format timestamp in local IST time
    const timestampStr = now.toLocaleString('en-IN') || now.toISOString();
    
    // Auto-capture actual user name from background
    const updater = currentUser?.displayName || currentUser?.firstName || currentUser?.username || currentUser?.emailId || 'Raul Avhad';

    const newLogItem: InvoiceUpdateLog = {
      timestamp: timestampStr,
      previousStatus: selectedInvoice.status,
      newStatus: updateStatusVal,
      notes: updateNotes,
      user: updater,
      ...(updateStatusVal === 'Paid' ? {
        utrNumber: updateUtr,
        transactionDate: updateTxnDate,
        amountPaid: Number(updateAmountPaid),
        difference: diff,
        adjustmentConfirmed: diff < -0.01 ? (updateDiscrepancyBasis === 'Write Off' ? updateWriteOffConfirmed : true) : undefined,
        excessComment: diff > 0.01 ? updateDiscrepancyComment : undefined,
        discrepancyBasis: Math.abs(diff) > 0.01 ? updateDiscrepancyBasis : undefined,
        discrepancyComment: Math.abs(diff) > 0.01 ? updateDiscrepancyComment : undefined,
      } : {})
    };

    const updated = invoices.map(inv => {
      if (inv.id === selectedInvoice.id) {
        return {
          ...inv,
          status: updateStatusVal,
          utrNumber: updateStatusVal === 'Paid' ? updateUtr : inv.utrNumber,
          paidAt: updateStatusVal === 'Paid' ? updateTxnDate : inv.paidAt,
          paymentMethod: updateStatusVal === 'Paid' ? updateMethod : inv.paymentMethod,
          notes: updateNotes,
          transactionDate: updateStatusVal === 'Paid' ? updateTxnDate : inv.transactionDate,
          amountPaid: updateStatusVal === 'Paid' ? Number(updateAmountPaid) : inv.amountPaid,
          difference: updateStatusVal === 'Paid' ? diff : inv.difference,
          adjustmentConfirmed: updateStatusVal === 'Paid' ? (diff < -0.01 ? (updateDiscrepancyBasis === 'Write Off' ? updateWriteOffConfirmed : true) : undefined) : inv.adjustmentConfirmed,
          excessComment: updateStatusVal === 'Paid' ? (diff > 0.01 ? updateDiscrepancyComment : undefined) : inv.excessComment,
          discrepancyBasis: updateStatusVal === 'Paid' ? (Math.abs(diff) > 0.01 ? updateDiscrepancyBasis : undefined) : inv.discrepancyBasis,
          discrepancyComment: updateStatusVal === 'Paid' ? (Math.abs(diff) > 0.01 ? updateDiscrepancyComment : undefined) : inv.discrepancyComment,
          updateHistory: [...(inv.updateHistory || []), newLogItem]
        };
      }
      return inv;
    });

    setInvoices(updated);
    setIsUpdateStatusOpen(false);
    
    // Update active selected invoice view
    const matching = updated.find(i => i.id === selectedInvoice.id);
    if (matching) setSelectedInvoice(matching);

    toast.success(`Invoice status updated to ${updateStatusVal}`);
  };

  // Send Invoice Email Reminder
  const handleSendReminder = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsReminderModalOpen(true);
  };

  // Print Invoice Function
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-invoice');
    if (!element) return;
    try {
      const canvas = await safeHtml2Canvas(element, {
        scale: 2, // Standard high-quality 2x scaling for clear, sharp, non-blurry rendering
        useCORS: true,
        allowTaint: false, // Must be false to prevent SecurityError when calling toDataURL on custom fonts/styles
        logging: false,
        backgroundColor: '#ffffff', // Clean white color
        onclone: (clonedDoc: Document) => {
          // Hide all elements with 'no-print' class so they don't clutter the official PDF
          const noPrints = clonedDoc.querySelectorAll('.no-print');
          noPrints.forEach((el: any) => {
            el.style.display = 'none';
          });

          // Optimize typography rendering and styling for print quality
          const clonedInvoiceEl = clonedDoc.getElementById('printable-invoice');
          if (clonedInvoiceEl) {
            clonedInvoiceEl.style.boxShadow = 'none';
            clonedInvoiceEl.style.borderRadius = '0px';
            clonedInvoiceEl.style.border = 'none';
            clonedInvoiceEl.style.padding = '0px'; // Remove padding from outer container so it fits page nicely
            (clonedInvoiceEl.style as any).fontSmoothing = 'antialiased';
            (clonedInvoiceEl.style as any).webkitFontSmoothing = 'antialiased';
            (clonedInvoiceEl.style as any).mozOsxFontSmoothing = 'grayscale';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable compression for sharp but highly optimized outputs
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10; // 10mm margins for an elegant professional document layout
      const maxPdfWidth = pageWidth - (margin * 2);
      const maxPdfHeight = pageHeight - (margin * 2);
      
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 1130;

      let finalPdfWidth = maxPdfWidth;
      let finalPdfHeight = (canvasHeight * finalPdfWidth) / canvasWidth;
      
      // Scale down to fit the page vertically if necessary
      if (finalPdfHeight > maxPdfHeight) {
        finalPdfHeight = maxPdfHeight;
        finalPdfWidth = (canvasWidth * finalPdfHeight) / canvasHeight;
      }
      
      // Center the invoice image horizontally & vertically within margins
      let xOffset = margin + (maxPdfWidth - finalPdfWidth) / 2;
      let yOffset = margin + (maxPdfHeight - finalPdfHeight) / 2;

      // Final fallback check to prevent any NaN/Infinity from throwing "Invalid coordinates passed to jsPDF.addImage"
      if (!isFinite(finalPdfWidth) || finalPdfWidth <= 0) finalPdfWidth = maxPdfWidth;
      if (!isFinite(finalPdfHeight) || finalPdfHeight <= 0) finalPdfHeight = maxPdfHeight;
      if (!isFinite(xOffset)) xOffset = margin;
      if (!isFinite(yOffset)) yOffset = margin;

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalPdfWidth, finalPdfHeight, undefined, 'FAST');
      pdf.save(`Invoice_${selectedInvoice?.invoiceNumber || 'Download'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  // Delete Invoice
  const handleDeleteInvoice = (id: string) => {
    if (confirm('Are you sure you want to permanently delete/cancel this invoice?')) {
      const updated = invoices.map(inv => {
        if (inv.id === id) {
          return { ...inv, status: 'Cancelled' as const };
        }
        return inv;
      });
      setInvoices(updated);
      toast.success('Invoice cancelled and archived.');
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(null);
      }
    }
  };

  const handleDownloadReport = () => {
    if (!reportStartDate || !reportEndDate) {
      toast.error('Please select both start and end dates.');
      return;
    }

    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    end.setHours(23, 59, 59, 999);

    const filteredForReport = invoices.filter(inv => {
      const invDate = new Date(inv.createdAt);
      return invDate >= start && invDate <= end;
    });

    if (filteredForReport.length === 0) {
      toast.error('No invoices found for the selected date range.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Hospital/Partner Name',
      'Recipient Email',
      'Type',
      'Created At',
      'Due Date',
      'Billing Period',
      'Pricing Model',
      'Claims Processed Count',
      'Subtotal',
      'Tax Amount',
      'Total Amount',
      'Outstanding/Pending Ageing',
      'Invoice Settled Amt',
      'Payment Status',
      'Transaction reference (UTR No.)',
      'Settlement Channel',
      'Transaction Date',
      'Amount Paid',
      'Discrepancy Action / Basis',
      'Extra Comment / Reason (Required)',
      'Audit Remarks & Internal Notes'
    ];

    const getAgeing = (inv: Invoice) => {
      if (inv.status === 'Cancelled') return '-';
      if (inv.status === 'Paid') {
        const start = new Date(inv.createdAt);
        const end = new Date(inv.transactionDate || inv.paidAt || inv.createdAt);
        let diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) diffDays = 0;
        return `${diffDays}d`;
      }
      const due = new Date(inv.dueDate);
      const now = new Date();
      const diffTime = now.getTime() - due.getTime();
      const diffDays = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24)); 
      return `${diffDays}d`;
    };

    const csvRows = filteredForReport.map(inv => {
      return [
        inv.invoiceNumber,
        `"${inv.recipientName}"`,
        inv.recipientEmail,
        inv.type,
        new Date(inv.createdAt).toLocaleDateString('en-IN'),
        new Date(inv.dueDate).toLocaleDateString('en-IN'),
        inv.billingPeriod,
        inv.pricingModel,
        inv.claimsProcessedCount,
        inv.subtotal.toFixed(2),
        inv.taxAmount.toFixed(2),
        inv.totalAmount.toFixed(2),
        getAgeing(inv),
        (inv.amountPaid || 0).toFixed(2),
        inv.status,
        inv.utrNumber || '',
        inv.paymentMethod || '',
        inv.transactionDate ? new Date(inv.transactionDate).toLocaleDateString('en-IN') : '',
        (inv.amountPaid || 0).toFixed(2),
        inv.discrepancyBasis || '',
        `"${(inv.discrepancyComment || inv.excessComment || '').replace(/"/g, '""')}"`,
        `"${(inv.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Invoice_Report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsReportModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <ReceiptIndianRupee size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Invoice Management</h1>
              <p className="text-slate-500 text-xs font-medium">Manage and audit institutional billing for Hospital clients and processing Partners.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="bg-[#000080] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center shadow-sm active:scale-95 transition-all hover:bg-green-600 border-none"
          >
            <Download size={16} className="mr-2" /> Download Report
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-yellow-400 text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center shadow-lg active:scale-95 transition-all hover:bg-yellow-500"
          >
            <Plus size={16} className="mr-2" /> Generate Custom Invoice
          </button>
        </div>
      </div>

      {/* View Tab Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80 max-w-md">
        <button
          onClick={() => setViewTab('invoices')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            viewTab === 'invoices' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Invoices Dashboard
        </button>
        <button
          onClick={() => setViewTab('automated_runs')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            viewTab === 'automated_runs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={14} />
          Automated Billing Hub
        </button>
      </div>

      {viewTab === 'invoices' ? (
        <>
          {/* Interactive Financial & Settlement Dashboard Panel */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="text-indigo-600 animate-pulse" size={16} />
              Billing & Collection Performance Analytics
            </h2>
            <p className="text-slate-500 text-[11px] font-medium mt-0.5">
              Analyze settlement compliance, collection efficiency, shortfalls, and write-offs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              >
                {MONTH_NAMES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Dashboard Period Switcher (Tabs) */}
            <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200 shadow-inner">
              {(['Monthly', 'Quarterly', 'Yearly'] as const).map((view) => {
                const isActive = dashboardView === view;
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setDashboardView(view)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {view} view
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dashboard Metrics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Outstanding */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Outstanding</span>
                <span className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
                  <Clock size={16} />
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mt-2.5">
                ₹{dashboardStats.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">Invoices Awaiting Pay:</span>
              <span className="text-amber-600 px-2 py-0.5 bg-amber-50 border border-amber-100/60 rounded-md">
                {dashboardStats.pendingCount + dashboardStats.overdueCount} items
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20" />
          </div>

          {/* Total Payment Collected */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Collected</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle size={16} />
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mt-2.5">
                ₹{dashboardStats.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">Settled In Full:</span>
              <span className="text-emerald-600 px-2 py-0.5 bg-emerald-50 border border-emerald-100/60 rounded-md">
                {dashboardStats.paidCount} items
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/20" />
          </div>

          {/* Total Overdue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Overdue Amount</span>
                <span className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                  <AlertCircle size={16} />
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mt-2.5">
                ₹{dashboardStats.totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">Overdue Risk:</span>
              <span className="text-rose-600 px-2 py-0.5 bg-rose-50 border border-rose-100/60 rounded-md">
                {dashboardStats.overdueCount} items
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500/20" />
          </div>

          {/* Collection Efficiency & Invoice Counts */}
          <div className="bg-slate-900 text-white border border-slate-850 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Collection Efficiency</span>
                <span className="p-1.5 bg-slate-800 text-indigo-400 rounded-lg">
                  <Percent size={16} />
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mt-2.5">
                {dashboardStats.collectionEfficiency.toFixed(1)}%
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] font-bold relative z-10">
              <span className="text-slate-400">Total Billed Period:</span>
              <span className="text-white">
                ₹{dashboardStats.totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          </div>
        </div>

        {/* Extended Analytical Options for Period Tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Write-offs / Underpayments */}
          <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Write-offs / Shortfalls</p>
              <p className="text-xs font-black text-slate-700 mt-0.5">₹{dashboardStats.totalWriteOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Excess Collections */}
          <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <PlusCircle size={16} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Excess Collections</p>
              <p className="text-xs font-black text-slate-700 mt-0.5">₹{dashboardStats.totalExcess.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Active Billed Accounts */}
          <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Building size={16} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Billed Clients / Accounts</p>
              <p className="text-xs font-black text-slate-700 mt-0.5">{dashboardStats.uniqueClients} Unique</p>
            </div>
          </div>

          {/* Average Days to Settle */}
          <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Avg Days to Settle</p>
              <p className="text-xs font-black text-slate-700 mt-0.5">
                {dashboardStats.avgSettlementDays !== null ? `${dashboardStats.avgSettlementDays} Days` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Filter and List Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Controls Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
          
          {/* Sub-tabs / Entity filter */}
          <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 w-full md:w-auto">
            <button
              onClick={() => setFilterType('All')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                filterType === 'All' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Invoices
            </button>
            <button
              onClick={() => setFilterType('Hospital')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                filterType === 'Hospital' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Hospital Billing
            </button>
            <button
              onClick={() => setFilterType('Partner')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                filterType === 'Partner' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Partner Invoicing
            </button>
          </div>

          {/* Search and Status Dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search recipient or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/80 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-wider cursor-pointer text-slate-600 focus:ring-0"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

          </div>

        </div>

        {/* Invoice Grid / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Invoice details</th>
                <th className="px-6 py-4">Client / Recipient</th>
                <th className="px-6 py-4">Billing period</th>
                <th className="px-6 py-4">Pricing Model</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">TAT</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  const getAgeing = (inv: Invoice) => {
                    if (inv.status === 'Cancelled') return '-';
                    if (inv.status === 'Paid') {
                      const start = new Date(inv.createdAt);
                      const end = new Date(inv.transactionDate || inv.paidAt || inv.createdAt);
                      let diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) diffDays = 0;
                      return `${diffDays}d`;
                    }
                    const due = new Date(inv.dueDate);
                    const now = new Date();
                    const diffTime = now.getTime() - due.getTime();
                    const diffDays = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24)); 
                    return `${diffDays}d`;
                  };
                  return (
                  <tr 
                    key={inv.id} 
                    className={`hover:bg-slate-50 transition-all group ${selectedInvoice?.id === inv.id ? 'bg-indigo-50/40' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div 
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => { setSelectedInvoice(inv); setIsPreviewActiveOpen(true); }}
                      >
                        <p className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline text-[13px]">{inv.invoiceNumber}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{inv.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className="flex items-center gap-2.5 cursor-pointer hover:opacity-80"
                        onClick={() => { setSelectedInvoice(inv); setIsPreviewActiveOpen(true); }}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${inv.type === 'Hospital' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {inv.type === 'Hospital' ? <Building size={14} /> : <User size={14} />}
                        </div>
                        <div>
                          <p className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">{inv.recipientName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{inv.recipientEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700">{inv.billingPeriod}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Due: {inv.dueDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700">{inv.pricingModel}</span>
                        {inv.pricingModel === 'Per Case' && (
                          <span className="text-[10px] text-slate-400 mt-0.5">{inv.claimsProcessedCount} cases processed</span>
                        )}
                        {inv.pricingModel === 'Percentage of Claim' && inv.totalClaimValue && (
                          <span className="text-[10px] text-slate-400 mt-0.5">{inv.ratePerUnit}% of ₹{inv.totalClaimValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-black text-slate-800 text-[13px]">₹ {inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[9px] font-medium text-slate-400 mt-0.5">Subtotal: ₹{inv.subtotal.toLocaleString('en-IN')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-bold ${new Date() > new Date(inv.dueDate) && inv.status !== 'Paid' ? 'text-rose-600' : 'text-slate-600'}`}>
                        {getAgeing(inv)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {inv.status === 'Paid' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider text-[9px] border border-emerald-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Paid
                          </span>
                        )}
                        {inv.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold uppercase tracking-wider text-[9px] border border-amber-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        )}
                        {inv.status === 'Overdue' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold uppercase tracking-wider text-[9px] border border-rose-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            Overdue
                          </span>
                        )}
                        {inv.status === 'Cancelled' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px] border border-slate-200">
                            Cancelled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-65 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSendReminder(inv)}
                          title="Send Email Reminder"
                          className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Send size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenStatusUpdate(inv)}
                          title="Update payment status"
                          className="px-3 py-1.5 bg-[#000080] hover:bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 border-none"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <ReceiptIndianRupee size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-bold text-slate-600">No Invoices Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Automated Billing Runner Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="text-indigo-600 animate-pulse" size={16} />
                  Automated Monthly Billing & Compliance Core
                </h2>
                <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                  Execute 1st-of-month automatic batch billing runs with strict Per-Case duplicate and Missed-Case validation checks.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Year Selection */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Year:</span>
                  <select
                    value={runYear}
                    onChange={(e) => setRunYear(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>

                {/* Month Selection */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Month:</span>
                  <select
                    value={runMonth}
                    onChange={(e) => setRunMonth(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExecuteAutomatedBilling}
                  className="bg-[#000080] hover:bg-indigo-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all border-none font-sans"
                >
                  <Play size={14} fill="currentColor" /> Run Automated Billing
                </button>

                <button
                  onClick={handleSendEmailsForLatestRun}
                  disabled={latestRunInvoices.length === 0}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all border-none font-sans ${
                    latestRunInvoices.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Mail size={14} /> Sent Email {latestRunInvoices.length > 0 && `(${Object.values(selectedInvoiceIdsForEmail).filter(Boolean).length})`}
                </button>
              </div>
            </div>

            {/* Configured Entities Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Building size={14} /> Onboarded Commercial Agreement Configurations ({hospitals.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hospitals.map((h: any) => {
                  const pricingType = h.agreementType || 'Per Case';
                  const baseVal = Number(h.agreementValue) || 0;
                  const basePercentType = h.agreementPercentageBase || 'Final Approval Amount';
                  return (
                    <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                      <div>
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          {h.entityType || 'Hospital'}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm mt-1.5">{h.hospitalName || h.displayName}</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{h.invoiceEmail || h.emailId}</p>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/80 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400 font-bold uppercase tracking-wider">Agreement Type:</span>
                          <span className="font-bold text-slate-700">{pricingType}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400 font-bold uppercase tracking-wider">Base Value:</span>
                          <span className="font-bold text-slate-700">
                            {pricingType === 'Percentage' ? `${baseVal}%` : `₹${baseVal.toLocaleString()}`}
                          </span>
                        </div>
                        {pricingType === 'Percentage' && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">Basis field:</span>
                            <span className="font-black text-indigo-600">{basePercentType}</span>
                          </div>
                        )}
                        {pricingType === 'Per Case' && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">Custom Stages:</span>
                            <span className="font-bold text-slate-700">{(h.agreementStageValues || []).length} Stage-wise</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Latest Run Review Panel */}
          {latestRunInvoices.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 font-sans">
                    <ShieldCheck className="text-emerald-600 animate-pulse" size={16} />
                    Invoice Generation Review & Dispatch Deck
                  </h3>
                  <p className="text-slate-500 text-[11px] font-medium mt-0.5 font-sans">
                    Review calculated fees, taxes, and cases processed. Toggle the selection next to each Hospital/Partner to include them in the automated email batch dispatch.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => {
                      const allSelected = Object.values(selectedInvoiceIdsForEmail).every(Boolean);
                      const nextSel: Record<string, boolean> = {};
                      latestRunInvoices.forEach(inv => {
                        nextSel[inv.id] = !allSelected;
                      });
                      setSelectedInvoiceIdsForEmail(nextSel);
                    }}
                    className="text-[11px] font-bold text-[#000080] hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all active:scale-95 font-sans"
                  >
                    {Object.values(selectedInvoiceIdsForEmail).every(Boolean) ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">Select</th>
                      <th className="py-3 px-4">Invoice / Entity</th>
                      <th className="py-3 px-4">Period / Model</th>
                      <th className="py-3 px-4 text-center">Claims Processed</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-right">GST (18%)</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {latestRunInvoices.map((inv) => {
                      const isSelected = !!selectedInvoiceIdsForEmail[inv.id];
                      return (
                        <tr key={inv.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-slate-50/30' : ''}`}>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedInvoiceIdsForEmail(prev => ({
                                  ...prev,
                                  [inv.id]: !prev[inv.id]
                                }));
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {inv.invoiceNumber}
                              <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md uppercase tracking-wider ${
                                inv.type === 'Partner' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {inv.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold mt-0.5">{inv.recipientName}</div>
                            <div className="text-[9px] font-mono text-slate-400">{inv.recipientEmail}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-700">{inv.billingPeriod}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase">{inv.pricingModel}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-[10px]">
                              {inv.claimsProcessedCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-600">
                            ₹{inv.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-500">
                            ₹{inv.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            ₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                              inv.emailDeliveryStatus === 'Sent'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {inv.emailDeliveryStatus === 'Sent' ? 'Dispatched' : 'Pending Send'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsPreviewActiveOpen(true);
                              }}
                              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border-none flex items-center gap-1 mx-auto transition-all cursor-pointer active:scale-95 font-sans"
                            >
                              <FileText size={12} /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Trail List Panel */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="text-slate-500" size={16} />
                Platform Billing Audit History Trail
              </h3>
              <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                Detailed execution logs of automatic billing cycles, including counts of recovered, billed, and duplicate-skipped cases.
              </p>
            </div>

            {automatedRuns.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed animate-in fade-in duration-300">
                <FileCheck size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-600">No Automated Runs Executed Yet</p>
                <p className="text-[11px] text-slate-400 mt-1">Select a billing period above and click "Run Automated Billing".</p>
              </div>
            ) : (
              <div className="space-y-4">
                {automatedRuns.map((run) => (
                  <div key={run.id} className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-lg">
                            SUCCESSFUL RUN
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">{run.id}</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800 mt-1">Billing Run for {run.billingPeriod}</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Executed at: {run.timestamp}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-indigo-600">₹{run.totalAmountGenerated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{run.invoicesGenerated} Invoices Generated</p>
                      </div>
                    </div>

                    {/* Stats metrics block */}
                    <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-100 text-center">
                      <div className="border-r border-slate-100 last:border-r-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cases Billed</p>
                        <p className="text-xs font-black text-slate-700 mt-0.5">{run.casesBilledCount}</p>
                      </div>
                      <div className="border-r border-slate-100 last:border-r-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-emerald-600">Missed Recovered</p>
                        <p className="text-xs font-black text-emerald-600 mt-0.5">+{run.missedCasesRecoveredCount}</p>
                      </div>
                      <div className="last:border-r-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-rose-500">Duplicate Skipped</p>
                        <p className="text-xs font-black text-rose-500 mt-0.5">{run.duplicateCasesSkippedCount}</p>
                      </div>
                    </div>

                    {/* Expandable step-by-step log lines */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step-By-Step Validation Audit Logs</p>
                      <div className="bg-slate-900 text-slate-300 font-mono text-[9px] rounded-xl p-3 max-h-48 overflow-y-auto space-y-1 leading-relaxed">
                        {run.details.map((detailLine, dIdx) => (
                          <div key={dIdx} className="flex gap-2">
                            <span className="text-indigo-400 shrink-0">[{dIdx + 1}]</span>
                            <p>{detailLine}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Detail Modal (Active Preview Frame) */}
      {selectedInvoice && isPreviewActiveOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col no-print">
            
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Preview Frame</p>
                <h2 className="text-lg font-black text-slate-800 mt-0.5">{selectedInvoice.invoiceNumber}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                  title="Print Corporate Invoice"
                >
                  <Printer size={14} />
                </button>
                <button
                  onClick={() => setIsPreviewActiveOpen(false)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 relative">
              {/* Invoice Visual Layout */}
              <div className="bg-[#fcfdfe] border border-slate-200 rounded-2xl p-8 shadow-inner overflow-hidden max-w-4xl mx-auto" id="printable-invoice">
                
                {/* Real corporate header */}
                <div className="flex justify-between items-start flex-col md:flex-row gap-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm">C</div>
                      <span className="font-black text-slate-800 tracking-tight text-lg uppercase">CLAIMNX PORTAL</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-semibold">Institutional Automated Billing Service</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">GSTIN: 33AAFCK0232B1ZM</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">TAX INVOICE</h3>
                    <p className="text-[11px] font-bold text-indigo-600 mt-1">{selectedInvoice.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Date: {selectedInvoice.createdAt}</p>
                    <p className="text-[10px] text-slate-400">Billing Term: Net 15</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 border-y border-slate-100 py-6 text-xs">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">BILLED TO (RECIPIENT):</p>
                    <h4 className="font-black text-slate-800 mt-2 text-sm">{selectedInvoice.recipientName}</h4>
                    <p className="text-slate-500 mt-1 leading-relaxed max-w-xs">{selectedInvoice.recipientAddress}</p>
                    <p className="text-slate-500 mt-1 font-semibold">{selectedInvoice.recipientEmail}</p>
                  </div>
                  <div className="text-right md:text-right">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">BILLING SPECIFICATION:</p>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <p className="text-slate-600"><span className="text-slate-400 font-medium">Agreement Type:</span> <span className="font-bold text-slate-800">{selectedInvoice.pricingModel}</span></p>
                      <p className="text-slate-600"><span className="text-slate-400 font-medium">Billing Cycle:</span> <span className="font-bold text-slate-800">{selectedInvoice.billingPeriod}</span></p>
                      <p className="text-slate-600"><span className="text-slate-400 font-medium">Payment Due:</span> <span className="font-black text-rose-600">{selectedInvoice.dueDate}</span></p>
                      <p className="text-slate-600"><span className="text-slate-400 font-medium">Status:</span> <span className="font-bold uppercase tracking-wider text-[9px]">{selectedInvoice.status}</span></p>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2.5">Service Description</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Rate</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                      {selectedInvoice.lineItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.description}</td>
                          <td className="px-4 py-3 text-center text-slate-500 font-medium">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-500 font-medium">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Block */}
                <div className="flex justify-end mt-6">
                  <div className="w-full md:w-80 space-y-2 text-[11px] border-t border-slate-100 pt-4">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-800">₹{selectedInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>CGST (9.0%):</span>
                      <span className="font-semibold text-slate-800">₹{(selectedInvoice.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 pb-2 border-b border-slate-100">
                      <span>SGST (9.0%):</span>
                      <span className="font-semibold text-slate-800">₹{(selectedInvoice.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-800 font-black text-sm pt-1">
                      <span>Grand Total:</span>
                      <span className="text-indigo-600">₹{selectedInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Audit Logs & Disclosures */}
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px]">
                    <div className="space-y-2">
                      <p className="font-black text-slate-400 uppercase tracking-wider">Payment information:</p>
                      <p className="text-slate-500 leading-relaxed">
                        Please route institutional payments via NEFT/RTGS to our designated corporate banking channel.<br />
                        Bank: <strong className="text-slate-700">HDFC Bank Ltd</strong> | A/c: <strong className="text-slate-700">50200088912344</strong> | IFSC: <strong className="text-slate-700">HDFC0000021</strong>
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                      <p className="font-black text-slate-400 uppercase tracking-wider">Audit logs & status tracking:</p>
                      <div className="space-y-1 text-slate-500">
                        <p>• Created on: <span className="font-semibold text-slate-700">{selectedInvoice.createdAt}</span></p>
                        <p>• Due by: <span className="font-semibold text-slate-700">{selectedInvoice.dueDate}</span></p>
                        {selectedInvoice.status === 'Paid' && (
                          <>
                            <p>• Settled on: <span className="font-semibold text-emerald-600">{selectedInvoice.paidAt}</span></p>
                            <p>• Method: <span className="font-semibold text-slate-700">{selectedInvoice.paymentMethod}</span></p>
                            <p>• Bank Ref UTR: <span className="font-mono font-black text-slate-800 text-[9px] bg-slate-200 px-1 py-0.5 rounded">{selectedInvoice.utrNumber}</span></p>
                            {selectedInvoice.amountPaid !== undefined && (
                              <p>• Amount Settled: <span className="font-bold text-indigo-600">₹{selectedInvoice.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                            )}
                            {selectedInvoice.difference !== undefined && selectedInvoice.difference < -0.01 && (
                              <div className="mt-1 bg-amber-50 border border-amber-100 p-2 rounded text-[9px] text-amber-900 leading-relaxed">
                                <span className="font-bold">• Short Amount:</span> ₹{Math.abs(selectedInvoice.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({selectedInvoice.discrepancyBasis || 'Adjustment'})<br />
                                <span className="font-bold">Reason/Comment:</span> "{selectedInvoice.discrepancyComment || 'N/A'}"
                              </div>
                            )}
                            {selectedInvoice.difference !== undefined && selectedInvoice.difference > 0.01 && (
                              <div className="mt-1 bg-indigo-50 border border-indigo-100 p-2 rounded text-[9px] text-indigo-900 leading-relaxed">
                                <span className="font-bold">• Excess Amount:</span> ₹{selectedInvoice.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({selectedInvoice.discrepancyBasis || 'Adjustment'})<br />
                                <span className="font-bold">Reason/Comment:</span> "{selectedInvoice.discrepancyComment || selectedInvoice.excessComment || 'N/A'}"
                              </div>
                            )}
                          </>
                        )}
                        {selectedInvoice.notes && (
                          <p className="text-[9px] italic text-slate-400 mt-1 border-t border-slate-200/60 pt-1">Notes: {selectedInvoice.notes}</p>
                        )}
                      </div>

                      {/* UPDATE HISTORY LOGS TRAIL */}
                      {selectedInvoice.updateHistory && selectedInvoice.updateHistory.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2 text-left">
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] flex items-center gap-1">
                            <User size={10} className="text-indigo-500" /> Audit Log History Trail ({selectedInvoice.updateHistory.length})
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {selectedInvoice.updateHistory.map((log, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/60 text-[9px] space-y-1 shadow-sm">
                                <div className="flex justify-between font-bold text-slate-800">
                                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{log.previousStatus} → {log.newStatus}</span>
                                  <span className="text-slate-400 font-medium">{log.timestamp}</span>
                                </div>
                                <p className="text-slate-500 leading-normal"><span className="font-bold text-slate-600">User:</span> {log.user}</p>
                                {log.utrNumber && (
                                  <p className="text-slate-500 leading-normal">
                                    <span className="font-bold text-slate-600">UTR:</span> <code className="bg-slate-50 px-1 py-0.2 rounded font-mono text-slate-800 font-bold">{log.utrNumber}</code>
                                    {log.transactionDate && <span className="ml-1 text-[8px] text-slate-400">({log.transactionDate})</span>}
                                  </p>
                                )}
                                {log.amountPaid !== undefined && (
                                  <p className="text-slate-600 leading-normal">
                                    <span className="font-bold text-slate-600">Paid:</span> ₹{log.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    {log.difference !== undefined && (
                                      <span className={`ml-1 font-bold ${log.difference < -0.01 ? 'text-amber-600' : log.difference > 0.01 ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                        ({log.difference < -0.01 ? `Short: -₹${Math.abs(log.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : log.difference > 0.01 ? `Excess: +₹${log.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Exact Match'})
                                      </span>
                                    )}
                                  </p>
                                )}
                                {log.adjustmentConfirmed && (
                                  <p className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-bold text-[8px] border border-amber-100">
                                    ✓ Under-payment write-off authorized
                                  </p>
                                )}
                                {log.discrepancyBasis && (
                                  <p className="text-slate-600 bg-slate-50 px-1 py-0.5 rounded text-[8px] border border-slate-100 leading-relaxed">
                                    <span className="font-bold text-slate-800">Resolution Action:</span> {log.discrepancyBasis}
                                  </p>
                                )}
                                {log.discrepancyComment && (
                                  <p className="text-indigo-700 bg-indigo-50/50 px-1.5 py-1 rounded text-[8px] border border-indigo-100 leading-relaxed italic">
                                    <span className="font-bold text-indigo-900 not-italic">Extra Comments:</span> "{log.discrepancyComment}"
                                  </p>
                                )}
                                {!log.discrepancyComment && log.excessComment && (
                                  <p className="text-indigo-700 bg-indigo-50/50 px-1 py-0.5 rounded text-[8px] border border-indigo-100 leading-relaxed italic">
                                    <span className="font-bold text-indigo-900 not-italic">Excess Comment:</span> "{log.excessComment}"
                                  </p>
                                )}
                                {log.notes && (
                                  <p className="text-slate-400 italic">"Notes: {log.notes}"</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AUTOMATED BILLING DETAIL VERIFICATION & CASE AUDIT PANEL */}
                {selectedInvoice && (
                  <div className="mt-8 border-t border-slate-200 pt-6 space-y-6 text-left no-print">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <Layers className="text-[#000080]" size={14} />
                          Automated Billing Verification Panel (Case Audit)
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-sans">
                          Dynamic billing breakdown matching the configured agreement type for validation & complete audit trail.
                        </p>
                      </div>
                      <span className="bg-[#000080]/5 text-[#000080] border border-[#000080]/10 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider font-sans">
                        Model: {selectedInvoice.pricingModel}
                      </span>
                    </div>

                    {/* DYNAMIC AGREEMENT SEGREGATED DISPLAYS */}
                    {selectedInvoice.pricingModel === 'Monthly Flat' && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 font-sans">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Billing Cycle</p>
                            <p className="text-xs font-bold text-slate-700 mt-1">{selectedInvoice.billingPeriod}</p>
                          </div>
                          <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fixed Agreement Value</p>
                            <p className="text-xs font-bold text-slate-800 mt-1">₹{(selectedInvoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Invoice Amount (with GST)</p>
                            <p className="text-xs font-black text-indigo-600 mt-1">₹{selectedInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Billing Model Type</p>
                            <p className="text-xs font-bold text-emerald-600 mt-1">Fixed Retainer</p>
                          </div>
                        </div>
                        <div className="border-t border-slate-200/60 pt-3 text-[11px] text-slate-600 leading-relaxed font-medium">
                          <span className="font-bold text-slate-800">Billing Summary:</span> Monthly Enterprise operations flat fee retainer model. Patient-wise tracking is omitted as commercials are decoupled from daily claim volumes. This model secures unlimited case submissions with guaranteed platform availability.
                        </div>
                      </div>
                    )}

                    {selectedInvoice.pricingModel === 'Per Case' && (() => {
                      const billedClaims = claims.filter(c => (selectedInvoice.billedCaseIds || []).includes(c.caseReferenceId || c.id));
                      return (
                        <div className="space-y-4 font-sans">
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between text-xs">
                            <div className="space-y-1">
                              <p className="font-black text-slate-500 uppercase text-[9px] tracking-wider">Per Case Agreement Metrics</p>
                              <p className="text-slate-600 font-medium">Total Billed Cases: <span className="font-black text-slate-800">{billedClaims.length} cases</span></p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full md:w-auto">
                              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-sm">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Current Period</span>
                                <span className="font-bold text-slate-700">{billedClaims.length - (selectedInvoice.recoveredCaseIds || []).length}</span>
                              </div>
                              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-sm">
                                <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-wider">Recovered Missed</span>
                                <span className="font-bold text-emerald-600">{(selectedInvoice.recoveredCaseIds || []).length}</span>
                              </div>
                              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center shadow-sm col-span-2 sm:col-span-1">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Base Rate</span>
                                <span className="font-bold text-slate-700">₹{selectedInvoice.ratePerUnit}/case</span>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                            <table className="w-full text-left border-collapse text-[10px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Case ID</th>
                                  <th className="py-2.5 px-3">Patient / UHID</th>
                                  <th className="py-2.5 px-3">Claim / Policy</th>
                                  <th className="py-2.5 px-3">Insurer / TPA</th>
                                  <th className="py-2.5 px-3 text-center">Stay Period</th>
                                  <th className="py-2.5 px-3">Billing Stage</th>
                                  <th className="py-2.5 px-3 text-right">Value (Rate)</th>
                                  <th className="py-2.5 px-3 text-right">Billed Amt</th>
                                  <th className="py-2.5 px-3 text-center">Billing Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600">
                                {billedClaims.length === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="py-6 text-center text-slate-400 font-bold italic">
                                      No case records available matching this invoice's Case IDs.
                                    </td>
                                  </tr>
                                ) : (
                                  billedClaims.map(claim => {
                                    const isRecovered = (selectedInvoice.recoveredCaseIds || []).includes(claim.caseReferenceId || claim.id);
                                    const rate = getRateForClaimInReview(claim, selectedInvoice);
                                    return (
                                      <tr key={claim.id} className="hover:bg-slate-50/50">
                                        <td className="py-2 px-3 font-mono text-slate-800 font-bold">
                                          {claim.caseReferenceId || claim.id}
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="font-bold text-slate-700">{claim.patientName}</div>
                                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">UHID: {claim.formData?.uhid || 'NA'}</div>
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="font-bold text-slate-700">{claim.formData?.claimNumber || claim.formData?.claimNo || 'NA'}</div>
                                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">Policy: {claim.policyNumber || 'NA'}</div>
                                        </td>
                                        <td className="py-2 px-3 font-medium">
                                          {claim.insuranceProvider || 'NA'}
                                        </td>
                                        <td className="py-2 px-3 text-center leading-normal">
                                          <div>{claim.admissionDate || 'NA'}</div>
                                          <div className="text-slate-400">to {claim.dischargeDate || 'NA'}</div>
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded">
                                            {claim.status}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-semibold text-slate-600">
                                          ₹{rate.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-2 px-3 text-right font-black text-slate-800">
                                          ₹{rate.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                            isRecovered
                                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                          }`}>
                                            {isRecovered ? 'Recovered Missed' : 'Billed (Current)'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {selectedInvoice.pricingModel === 'Percentage of Claim' && (() => {
                      const isFinalApprovalBasis = selectedInvoice.lineItems.some((item: any) => item.description.includes('Final Approval Amount'));
                      const basisType = isFinalApprovalBasis ? 'Final Approval Amount' : 'Settled Amount';
                      const billedClaims = claims.filter(c => (selectedInvoice.billedCaseIds || []).includes(c.caseReferenceId || c.id));
                      const pctApplied = selectedInvoice.ratePerUnit || 1.5;
                      
                      // Percentage Fee calculated component from line items (or fallback to subtotal minus platform)
                      const pctFeeItem = selectedInvoice.lineItems.find((item: any) => item.description.includes('Platform Fee') || item.description.includes('Claims Management'));
                      const pctFeeAmount = pctFeeItem ? pctFeeItem.amount : (selectedInvoice.subtotal - (selectedInvoice.platformFee || 5000));

                      return (
                        <div className="space-y-4 font-sans">
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Applied Percentage</p>
                              <p className="text-sm font-black text-[#000080] mt-1">{pctApplied}%</p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Billing Basis Type</p>
                              <p className="text-xs font-bold text-slate-700 mt-1.5">{basisType}</p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Total Eligible Amount (Base)</p>
                              <p className="text-sm font-black text-slate-800 mt-1">₹{(selectedInvoice.totalClaimValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Calculated Fee Component</p>
                              <p className="text-sm font-black text-indigo-600 mt-1">₹{pctFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                            <table className="w-full text-left border-collapse text-[10px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Case ID</th>
                                  <th className="py-2.5 px-3">Patient Name</th>
                                  <th className="py-2.5 px-3">Insurer / TPA</th>
                                  <th className="py-2.5 px-3">Billing Stage (Status)</th>
                                  <th className="py-2.5 px-3 text-right">Eligible Base Amount ({basisType})</th>
                                  <th className="py-2.5 px-3 text-center">Applied Pct</th>
                                  <th className="py-2.5 px-3 text-right">Calculated Fee</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600">
                                {billedClaims.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-6 text-center text-slate-400 font-bold italic">
                                      No case records available matching this invoice's Case IDs.
                                    </td>
                                  </tr>
                                ) : (
                                  billedClaims.map(claim => {
                                    const claimBaseVal = isFinalApprovalBasis
                                      ? (Number(claim.formData?.approvedAmount) || Number(claim.estimatedCost) || 0)
                                      : (Number(claim.formData?.settledAmount) || claim.paidAmount || Number(claim.estimatedCost) || 0);
                                    const calcFee = (claimBaseVal * pctApplied) / 100;

                                    return (
                                      <tr key={claim.id} className="hover:bg-slate-50/50">
                                        <td className="py-2.5 px-3 font-mono text-slate-800 font-bold">
                                          {claim.caseReferenceId || claim.id}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <div className="font-bold text-slate-700">{claim.patientName}</div>
                                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">UHID: {claim.formData?.uhid || 'NA'}</div>
                                        </td>
                                        <td className="py-2.5 px-3 font-medium">
                                          {claim.insuranceProvider || 'NA'}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded">
                                            {claim.status}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                                          ₹{claimBaseVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                                          {pctApplied}%
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-black text-indigo-600">
                                          ₹{calcFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* AUTOMATED BILLING COMPLIANCE AUDIT PANEL */}
                {selectedInvoice.auditLog && selectedInvoice.auditLog.length > 0 && (
                  <div className="mt-8 border-t border-slate-200 pt-6 space-y-4 text-left">
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="text-emerald-600" size={14} />
                      Automated Billing Verification Audit Log (Compliance Node)
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Billed Cases</p>
                        <p className="text-base font-black text-slate-700 mt-1">{(selectedInvoice.billedCaseIds || []).length}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Missed Cases Recovered</p>
                        <p className="text-base font-black text-emerald-600 mt-1">+{(selectedInvoice.recoveredCaseIds || []).length}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Duplicates Prevented</p>
                        <p className="text-base font-black text-rose-500 mt-1">{(selectedInvoice.skippedCaseIds || []).length}</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 text-slate-300 font-mono text-[9px] rounded-xl p-4 max-h-48 overflow-y-auto space-y-1.5 leading-relaxed shadow-inner">
                      {selectedInvoice.auditLog.map((logLine, logIdx) => (
                        <div key={logIdx} className="flex gap-2">
                          <span className="text-indigo-400">[{logIdx + 1}]</span>
                          <p>{logLine}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* DOWNLOAD REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Calendar className="text-emerald-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Select Report Period</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Management</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From Date</label>
                  <input 
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To Date</label>
                  <input 
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 py-4 px-6 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDownloadReport}
                  className="flex-[2] flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Download size={16} /> Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE REMINDER MODAL */}
      {isReminderModalOpen && selectedInvoice && (
        <InvoiceReminderModal
          invoice={selectedInvoice}
          hospitalProfile={currentUser}
          templates={emailTemplateService.getTemplates()}
          onClose={() => {
            setIsReminderModalOpen(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* CREATE MANUAL INVOICE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ReceiptIndianRupee className="text-indigo-600" size={18} />
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Generate tax invoice</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Type Switcher */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice Entity Category</label>
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      setNewInvType('Hospital');
                      if (!newInvRecipient) {
                        setNewInvRecipient('Apollo Hospitals - Greams Road');
                        setNewInvEmail('finance@apollohospitals.com');
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      newInvType === 'Hospital' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Hospital Client
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewInvType('Partner');
                      if (newInvRecipient.includes('Apollo')) {
                        setNewInvRecipient('MediClaim Partners Ltd');
                        setNewInvEmail('invoicing@mediclaimpartners.in');
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      newInvType === 'Partner' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Service Partner
                  </button>
                </div>
              </div>

              {/* Onboarded Hospital Selector (if Hospital Client) */}
              {newInvType === 'Hospital' && (
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/80 space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1.5">Select Onboarded Hospital Client</label>
                    <select
                      value={selectedHospitalId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedHospitalId(id);
                        const hospital = hospitals.find(h => h.id === id);
                        if (hospital) {
                          setNewInvRecipient(hospital.hospitalName || hospital.displayName || '');
                          
                          // Prioritize invoiceEmail, fallback to emailId
                          const invoiceEmail = hospital.invoiceEmail || hospital.emailId || '';
                          setNewInvEmail(invoiceEmail);
                          setNewInvAddress(hospital.address || '');
                          
                          // Auto fill pricing model & rates
                          const modelMap: Record<string, 'Per Case' | 'Monthly Flat' | 'Percentage of Claim'> = {
                            'Per Case': 'Per Case',
                            'Monthly Billing': 'Monthly Flat',
                            'Percentage': 'Percentage of Claim'
                          };
                          const mappedModel = modelMap[hospital.agreementType || ''] || 'Per Case';
                          setNewPricingModel(mappedModel);
                          
                          const val = Number(hospital.agreementValue) || 0;
                          if (mappedModel === 'Per Case') {
                            setNewRate(val || 150);
                            setNewPlatformFee(5000);
                          } else if (mappedModel === 'Percentage of Claim') {
                            setNewRate(val || 1.5);
                            setNewPlatformFee(5000);
                          } else if (mappedModel === 'Monthly Flat') {
                            setNewPlatformFee(val || 5000);
                          }
                          
                          toast.success(`Commercial details auto-filled for ${hospital.hospitalName || hospital.displayName}!`);
                        } else {
                          setNewInvRecipient('');
                          setNewInvEmail('');
                          setNewInvAddress('');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                    >
                      <option value="">-- Choose Onboarded Hospital --</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.hospitalName || h.displayName} {h.invoiceEmail ? `(📧 Has Invoice Email: ${h.invoiceEmail})` : `(⚠️ No Invoice Email)`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedHospitalId && (
                    <div className="text-[10px] text-indigo-600 font-bold flex flex-wrap gap-2">
                      {(() => {
                        const h = hospitals.find(h => h.id === selectedHospitalId);
                        if (!h) return null;
                        return (
                          <>
                            <span className="px-2 py-1 bg-white border border-indigo-100 rounded-md">Agreement: {h.agreementType || 'Per Case'}</span>
                            <span className="px-2 py-1 bg-white border border-indigo-100 rounded-md">Value: {h.agreementValue ? `₹${h.agreementValue}` : 'N/A'}</span>
                            {h.invoiceEmail ? (
                              <span className="px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md">✓ Dedicated Invoice Email: {h.invoiceEmail}</span>
                            ) : (
                              <span className="px-2 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded-md">⚠️ Falling back to Standard Email: {h.emailId}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Recipient details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Recipient Institution Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fortis Healthcare"
                    value={newInvRecipient}
                    onChange={(e) => setNewInvRecipient(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Billing Contact Email</label>
                  <input
                    type="email"
                    required
                    placeholder="finance@client.com"
                    value={newInvEmail}
                    onChange={(e) => setNewInvEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                  />
                </div>
              </div>

              {/* Recipient address */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street, City, State, ZIP code"
                  value={newInvAddress}
                  onChange={(e) => setNewInvAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Billing Cycle / Period</label>
                  <input
                    type="text"
                    required
                    placeholder="May 2026"
                    value={newBillingPeriod}
                    onChange={(e) => setNewBillingPeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Due Term (Days)</label>
                  <select
                    value={dueDateDays}
                    onChange={(e) => setDueDateDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                  >
                    <option value={7}>7 Days (Net 7)</option>
                    <option value={15}>15 Days (Net 15)</option>
                    <option value={30}>30 Days (Net 30)</option>
                    <option value={45}>45 Days (Net 45)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pricing Model</label>
                  <select
                    value={newPricingModel}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setNewPricingModel(val);
                      if (val === 'Per Case') {
                        setNewRate(150);
                      } else if (val === 'Percentage of Claim') {
                        setNewRate(1.5);
                      } else {
                        setNewRate(0);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                  >
                    <option value="Per Case">Per Case Fee</option>
                    <option value="Monthly Flat">Monthly Flat Fee</option>
                    <option value="Percentage of Claim">Percentage Fee</option>
                  </select>
                </div>
              </div>

              {/* Dynamic inputs based on Pricing Model */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pricing Configuration Details</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newPricingModel === 'Per Case' && (
                    <>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Cases Processed</label>
                        <input
                          type="number"
                          required
                          value={newClaimsCount}
                          onChange={(e) => setNewClaimsCount(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rate Per Claim (INR)</label>
                        <input
                          type="number"
                          required
                          value={newRate}
                          onChange={(e) => setNewRate(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 text-slate-700"
                        />
                      </div>
                    </>
                  )}

                  {newPricingModel === 'Percentage of Claim' && (
                    <>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Claim Value Cleared (INR)</label>
                        <input
                          type="number"
                          required
                          value={newClaimValue}
                          onChange={(e) => setNewClaimValue(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Commission rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={newRate}
                          onChange={(e) => setNewRate(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 text-slate-700"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {newPricingModel === 'Monthly Flat' ? 'Monthly Flat Rate Fee (INR)' : 'Platform License Addon Fee (INR)'}
                    </label>
                    <input
                      type="number"
                      required
                      value={newPlatformFee}
                      onChange={(e) => setNewPlatformFee(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Invoice Notes & Internal Instructions</label>
                <textarea
                  placeholder="Provide brief internal notes or audit info..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                />
              </div>

              {/* Send Email Checkbox */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmailToHospital}
                    onChange={(e) => setSendEmailToHospital(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500/20"
                  />
                  <span className="text-xs font-bold text-slate-700">Send PDF Invoice Copy via Email to Hospital Recipient</span>
                </label>
                {sendEmailToHospital && (
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed pl-6">
                    The tax invoice will be instantly dispatched to <span className="text-indigo-600 font-bold">{newInvEmail || '(no email entered yet)'}</span>.
                    As per compliance, invoice notification emails are strictly sent to the registered billing/invoice email address.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePreviewCustomInvoice}
                  className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <Search size={14} /> Preview Invoice
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all shadow-md"
                >
                  Confirm & Publish
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {isUpdateStatusOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="text-indigo-600" size={18} />
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Update Invoice Status</h3>
              </div>
              <button onClick={() => setIsUpdateStatusOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-medium">Update settlement details for invoice <span className="font-bold text-slate-800">{selectedInvoice.invoiceNumber}</span> (₹{selectedInvoice.totalAmount.toLocaleString('en-IN')})</p>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Status</label>
                <select
                  value={updateStatusVal}
                  onChange={(e) => setUpdateStatusVal(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                >
                  <option value="Paid">Paid (Settled)</option>
                  <option value="Pending">Pending (Unpaid)</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {updateStatusVal === 'Paid' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-150">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Transaction reference (UTR No.)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. N035261..."
                        value={updateUtr}
                        onChange={(e) => setUpdateUtr(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Settlement Channel</label>
                      <select
                        value={updateMethod}
                        onChange={(e) => setUpdateMethod(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                      >
                        <option value="NEFT Transfer">NEFT Bank Transfer</option>
                        <option value="RTGS Transfer">RTGS Bank Transfer</option>
                        <option value="UPI Business Gateway">UPI Business Link</option>
                        <option value="Razorpay Settlement">Razorpay Gateways</option>
                        <option value="Cheque / Draft">Corporate Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-150">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Transaction Date</label>
                      <input
                        type="date"
                        required
                        value={updateTxnDate}
                        onChange={(e) => setUpdateTxnDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount Paid (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={updateAmountPaid}
                        onChange={(e) => setUpdateAmountPaid(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Calculations and alerts for under-payment and over-payment */}
                  {(() => {
                    const diff = Number(updateAmountPaid) - selectedInvoice.totalAmount;
                    if (diff < -0.01) {
                      const shortfallAmount = Math.abs(diff);
                      return (
                        <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
                          <div className="flex items-start gap-2 text-amber-800">
                            <AlertCircle className="shrink-0 mt-0.5" size={16} />
                            <div>
                              <p className="text-xs font-bold">Short Payment Detected</p>
                              <p className="text-[10px] font-medium text-amber-700/90">
                                Paid amount is less than the invoice total by <span className="font-bold">₹{shortfallAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-amber-800 uppercase tracking-widest">
                              Discrepancy Action / Basis
                            </label>
                            <select
                              value={updateDiscrepancyBasis}
                              onChange={(e) => setUpdateDiscrepancyBasis(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-700"
                            >
                              <option value="Write Off">Write Off / General Adjustment (Closes Invoice)</option>
                              <option value="TDS / Deduction">TDS / Tax Deduction Adjustment (Closes Invoice)</option>
                              <option value="Carry Balance">Carry Forward as Pending Balance (Open Balance)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-amber-800 uppercase tracking-widest">
                              Extra Comment / Reason (Required)
                            </label>
                            <textarea
                              required
                              placeholder="Describe the reason for the short-payment (e.g. TDS deducted, contract rebate, etc.)..."
                              value={updateDiscrepancyComment}
                              onChange={(e) => setUpdateDiscrepancyComment(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-700 placeholder-slate-400"
                            />
                          </div>

                          {updateDiscrepancyBasis === 'Write Off' && (
                            <label className="flex items-start gap-2.5 cursor-pointer select-none bg-white border border-amber-200/60 p-3 rounded-xl hover:border-amber-300 transition-all">
                              <input
                                type="checkbox"
                                checked={updateWriteOffConfirmed}
                                onChange={(e) => setUpdateWriteOffConfirmed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500/20"
                              />
                              <span className="text-[10px] font-bold text-amber-950 leading-relaxed">
                                I confirm and authorize write-off or under-payment adjustment of ₹{shortfallAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.
                              </span>
                            </label>
                          )}
                        </div>
                      );
                    } else if (diff > 0.01) {
                      return (
                        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
                          <div className="flex items-start gap-2 text-indigo-800">
                            <CheckCircle className="shrink-0 mt-0.5" size={16} />
                            <div>
                              <p className="text-xs font-bold">Excess Payment Detected</p>
                              <p className="text-[10px] font-medium text-indigo-700/90">
                                Paid amount is more than the invoice total by <span className="font-bold">₹{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-indigo-800 uppercase tracking-widest">
                              Discrepancy Action / Basis
                            </label>
                            <select
                              value={updateDiscrepancyBasis}
                              onChange={(e) => setUpdateDiscrepancyBasis(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                            >
                              <option value="Credit Note">Carry Forward as Client Credit / Credit Note</option>
                              <option value="Excess Account Credited">Direct Excess Account Credit Entry</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-indigo-800 uppercase tracking-widest">
                              Extra Comment / Reason (Required)
                            </label>
                            <textarea
                              required
                              placeholder="Please explain the reason for the overpayment or how it will be adjusted..."
                              value={updateDiscrepancyComment}
                              onChange={(e) => setUpdateDiscrepancyComment(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 placeholder-slate-400"
                            />
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-emerald-50/50 border border-emerald-100 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-emerald-800 text-[10px] font-semibold">
                          <CheckCircle size={14} className="text-emerald-600" />
                          <span>Exact paid settlement matches the invoice amount. No write-off required.</span>
                        </div>
                      );
                    }
                  })()}
                </>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Audit Remarks & Internal Notes</label>
                <textarea
                  placeholder="Enter invoice status update details..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/80 transition-all text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUpdateStatusOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-red-600 hover:text-white text-slate-600 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#000080] hover:bg-green-600 text-white font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all shadow-md border-none"
                >
                  Save Status
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PREVIEW INVOICE MODAL */}
      {isPreviewInvoiceModalOpen && previewInvoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Search className="text-indigo-600" size={18} />
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Invoice Preview</h3>
              </div>
              <button onClick={() => setIsPreviewInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50 relative">
              <div className="bg-[#fcfdfe] border border-slate-200 rounded-2xl p-8 shadow-inner overflow-hidden max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start pb-8 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-indigo-600 text-white p-2 rounded-xl">
                        <Layers size={24} />
                      </div>
                      <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">MedClaim Platform</h1>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Technology Services</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed font-medium">
                      <p>Level 5, Innovation Tower, Cyber City</p>
                      <p>Gurugram, Haryana 122002</p>
                      <p>GSTIN: 06AABCM1234D1Z5</p>
                      <p>support@medclaim.in</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-black text-slate-200 uppercase tracking-widest mb-4">Tax Invoice</h2>
                    <div className="bg-slate-50 inline-block p-4 rounded-xl border border-slate-100 text-left min-w-[200px]">
                      <div className="mb-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Invoice Number</p>
                        <p className="text-sm font-bold text-slate-800">{previewInvoiceData.invoiceNumber}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date of Issue</p>
                          <p className="text-xs font-semibold text-slate-700">{previewInvoiceData.createdAt}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Due Date</p>
                          <p className="text-xs font-semibold text-slate-700">{previewInvoiceData.dueDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill To */}
                <div className="py-8 border-b border-slate-200">
                  <div className="flex items-start gap-12">
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ArrowDown size={12} /> Billed To
                      </p>
                      <h3 className="text-base font-black text-slate-800 mb-1">{previewInvoiceData.recipientName}</h3>
                      <div className="text-xs text-slate-500 leading-relaxed font-medium">
                        <p>{previewInvoiceData.recipientAddress}</p>
                        <p className="text-slate-600 mt-1 font-bold">{previewInvoiceData.recipientEmail}</p>
                      </div>
                    </div>
                    <div className="w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Billing Period</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Calendar size={14} className="text-indigo-500" />
                        {previewInvoiceData.billingPeriod}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="py-8">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b-2 border-slate-800">
                        <th className="pb-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Description</th>
                        <th className="pb-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Qty</th>
                        <th className="pb-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Rate</th>
                        <th className="pb-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm border-b border-slate-200 divide-y divide-slate-100">
                      {previewInvoiceData.lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-4 pr-4">
                            <p className="font-bold text-slate-800">{item.description}</p>
                          </td>
                          <td className="py-4 text-right font-semibold text-slate-600">{item.quantity}</td>
                          <td className="py-4 text-right font-semibold text-slate-600">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-black text-slate-800">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Totals */}
                  <div className="w-full max-w-sm ml-auto mt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                        <span>Subtotal</span>
                        <span>₹{previewInvoiceData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                        <span>IGST @ 18%</span>
                        <span>₹{previewInvoiceData.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="pt-3 mt-3 border-t-2 border-slate-800 flex justify-between items-center">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Total Due</span>
                        <span className="text-xl font-black text-indigo-600">₹{previewInvoiceData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
               <button
                type="button"
                onClick={() => setIsPreviewInvoiceModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] rounded-xl transition-all"
               >
                 Close Preview
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InvoiceManagement;
