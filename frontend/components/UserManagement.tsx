import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  formatDate,
  formatDateTime,
  isValidYearFormat,
  checkDateReasonability,
} from "../utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  HospitalUser,
  UserPermissionsMatrix,
  AgreementType,
  Role,
  ValueAddedServiceConfig,
  Product,
} from "../types";
import {
  UserPlus,
  Shield,
  Trash2,
  Edit2,
  Key,
  UserCheck,
  ShieldCheck,
  Building,
  User as UserIcon,
  Phone,
  Stethoscope,
  Mail,
  IndianRupee,
  Zap,
  X,
  Save,
  ShieldPlus,
  ChevronRight,
  Lock,
  AlertCircle,
  Calendar,
  Users,
  Check,
  Upload,
  Eye,
  EyeOff,
  FileText,
  Layers,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Coins,
  LayoutDashboard,
  FileSearch,
  BarChart3,
  Hospital,
  ClipboardList,
  Paperclip,
  CheckCircle2,
  CreditCard,
  Globe,
  Server,
  PlusCircle,
  Activity,
  ShieldAlert,
  BriefcaseMedical,
  Settings,
  Sparkles,
  Globe2,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  Plane,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
  Monitor,
  Search,
} from "lucide-react";
import {
  INDIAN_STATES,
  DISTRICTS_BY_STATE,
  ZONES_BY_STATE,
} from "./AdminPanel";
import ProductSelector from "./ProductSelector";
import { usersApi } from "../services/api";

interface UserManagementProps {
  users: HospitalUser[];
  setUsers: React.Dispatch<React.SetStateAction<HospitalUser[]>>;
  mode?: "hospital_partner" | "hospital_staff"; // Mode to determine behavior
  parentHospital?: HospitalUser; // Context for staff creation
  roles?: Role[]; // Global Roles configuration
}

const DEFAULT_PERMISSIONS: UserPermissionsMatrix = {
  overview: false,
  claim_directory: false,
  mis_view: false,
  hospital_manage: false,
  user_manage: false,
  can_edit: true,
  system_admin: false,
  patient_dashboard: true,

  // Dashboard Permissions
  cashless_dashboard: false,
  crm_dashboard: false,
  recon_dashboard: false,
  medical_underwriting: false,
  sales_dashboard: false,

  // Functional Permissions
  claims_view: false,
  claims_edit_stage: false,
  documents_upload: false,
  reconciliation_approve: false,
  financial_view: false,
  dashboards_view: false,
  legal_manage: false,
  recovery_manage: false,

  // UI & Access Permissions
  team_view: false,
  sidebar: true,
  tab_bar: true,
  nav_bar: true,
  ui_profile: true,

  // Manager Oversight Permissions
  crm_oversight: false,
  recon_oversight: false,
  medical_oversight: false,
  kyp_oversight: false,

  // Hospital Tab Permissions
  tab_hospital_profile: false,
  tab_team_access: false,
  tab_payer_config: false,
  tab_digital_assets: false,
  tab_nhcx_onboarding: false,
  tab_email_integration: false,
  tab_wallet_billing: false,
  attendance_view: true,
  attendance_manage: false,
};

const PAYER_LIST = [
  "Star Health Insurance Co.Ltd.",
  "Tata AIG General Insurance Co. Ltd.",
  "The New India Assurance Co. Ltd",
  "The Oriental Insurance Co. Ltd.",
  "United India Insurance Co. Ltd.",
  "National Insurance Co. Ltd.",
  "HDFC ERGO General Insurance Co.Ltd.",
  "ICICI LOMBARD General Insurance Co. Ltd.",
  "Niva Bupa Health Insurance Co Ltd",
  "Care Health Insurance co Ltd",
  "Acko General Insurance Ltd.",
  "Aditya Birla Health Insurance Co. Ltd.",
  "Bajaj General Insurance Co. Ltd",
  "Cholamandalam MS General Insurance Co. Ltd.",
  "Manipal Cigna Health Insurance Company Limited",
  "Navi General Insurance Ltd.",
  "Edelweiss General Insurance Co. Ltd.",
  "Central Generali India Insurance Co. Ltd.",
  "Go Digit General Insurance Ltd",
  "IFFCO TOKIO General Insurance Co. Ltd.",
  "Zurick Kotak General Insurance Co. Ltd.",
  "Liberty General Insurance Ltd.",
  "Magma HDI General Insurance Co. Ltd.",
  "Raheja QBE General Insurance Co. Ltd.",
  "Indusind General Insurance co ltd",
  "Medi Assist Insurance TPA Private Limited",
  "MDIndia Health Insurance TPA Private Limited",
  "Paramount Health Services & Insurance TPA Private Limited",
  "Heritage Health Insurance TPA Private Limited",
  "Family Health Plan Insurance TPA Limited",
  "Raksha Health Insurance TPA Private Limited",
  "Vidal Health Insurance TPA Private Limited",
  "Anyuta Insuance TPA In Health Care Private Limited",
  "East West Assist Insurance TPA Private Limited",
  "Medsave Health Insurance TPA Limited",
  "Genins India Insurance TPA Limited",
  "Alankit Insurance TPA Limited",
  "Health India Insurance TPA Private Limited",
  "Good Health Insurance TPA Limited",
  "Vipul Medcorp Insurance TPA Private Limited",
  "Park Mediclaim Insurance TPA Private Limited",
  "Health Assist Insurance TPA Private Limited",
  "Anmol Medicare Insurance TPA Limited",
  "Grand Insurance TPA Private Limited",
  "Rothshield Insurance TPA Limited",
  "Ericson Insurance TPA Private Limited",
  "Health Insurance TPA of India Limited",
  "Vision Digital Insurance TPA Private Limited",
  "Happy Insurance TPA Services Pvt. Ltd",
];

// Fallback roles if not provided via props
const STAFF_ROLES = [
  "Admin",
  "Hospital",
  "Reconciliation",
  "CRM Team",
  "Medical Team",
  "Hospital Cashless Desk",
  "Hospital Accounts",
  "KYP Team",
];

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  setUsers,
  mode = "hospital_partner",
  parentHospital,
  roles = [],
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "profile"
    | "payers"
    | "assets"
    | "access"
    | "pricing"
    | "value_added_service"
  >("profile");
  const [activeUserTab, setActiveUserTab] = useState<
    "User" | "Partner" | "Hospital"
  >("User");
  const [showPassword, setShowPassword] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // State to handle the "Create New Hospital" flow from within Staff Creation
  const [isCreatingNewBranch, setIsCreatingNewBranch] = useState(false);
  const [targetHospitalId, setTargetHospitalId] = useState<string>("");

  // Requirement: Entity Type Selection
  const [entityType, setEntityType] = useState<"User" | "Hospital" | "Partner">(
    "Hospital",
  );
  const [stateSearch, setStateSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // File Refs
  const hospitalSealRef = useRef<HTMLInputElement>(null);
  const doctorStampRef = useRef<HTMLInputElement>(null);

  const initialUserState = {
    // Hospital Details (Relevant for Partner Mode)
    hospitalName: "",
    address: "",
    state: "",
    district: "",
    zone: "",
    rohiniId: "",
    emailId: "",
    mobileNo: "",

    // User Details
    firstName: "",
    lastName: "",
    photoURL: "",
    empCode: "",
    designation: "",
    department: "",
    joiningDate: "",
    zones: [] as string[],
    states: [] as string[],
    districts: [] as string[],

    // Contacts / Staff Details
    tpaPersonName: "", // Maps to Staff Name in Staff Mode
    tpaPersonMobile: "",
    doctorName: "",
    doctorMobileNo: "",

    // Role & Login
    role: mode === "hospital_partner" ? "Admin" : "Hospital",
    reportsToId: "",
    loginId: "",
    password: "",
    confirmPassword: "",
    status: "Active" as "Active" | "Inactive",
    statusReason: "",

    // Permissions
    isAdmin: mode === "hospital_partner", // Only partners start as Admin
    permissionsMatrix: { ...DEFAULT_PERMISSIONS },
    allowedStages: [] as string[],
    assignedHospitalIds: [] as string[],
    products: [] as Product[],
    defaultProduct: "" as string,

    // Assets
    hospitalSeal: "",
    doctorStamp: "",

    // Pricing & Agreement (Partner Mode Only)
    invoiceEmail: "",
    agreementType: "Per Case" as AgreementType,
    agreementValue: "",
    agreementStartDate: "",
    agreementRenewalDate: "",
    agreementStageValues: [] as { stage: string; value: number }[],
    agreementInvoiceCategories: [] as string[],
    agreementPercentageBase: "" as
      "Final Approval Amount" | "Settled Amount" | "",
    valueAddedServices: {
      vasEnabled: true,
      hospitalManageEnabled: true,
      kypEnabled: false,
      rpaEnabled: false,
      aiInsightsEnabled: false,
      digitalAssetsEnabled: false,
      nhcxEnabled: false,
      medicalScrutinyRequired: true,
      liveClaimsTrackerEnabled: false,
    } as ValueAddedServiceConfig,

    // Payer Config (Partner Mode Only)
    payerConfigs: PAYER_LIST.map((name) => ({
      name,
      hasTieUp: false,
      startDate: "",
      endDate: "",
      portalUser: "",
      portalPass: "",
      linkedRateList: "",
      rateListFile: null as string | null,
    })),
  };

  const [formState, setFormState] = useState<any>(initialUserState);
  const [error, setError] = useState("");
  const [commercialSearch, setCommercialSearch] = useState("");
  const [commercialFilter, setCommercialFilter] = useState("all"); // 'all' | 'selected' | 'unselected' | 'Complete Processing' | 'Rejected at Discharge' | 'Pre-Auth Case'

  const validateDateOnBlur = (
    key: string,
    value: string,
    nestedIndex?: number,
  ) => {
    if (!value) return;

    // 4-digit year limit
    const yearStr = value.split("-")[0];
    if (yearStr && yearStr.length > 4) {
      toast.error("Year cannot exceed 4 digits. Please correct the date.");
      if (nestedIndex !== undefined) {
        const newConfigs = [...formState.payerConfigs];
        (newConfigs[nestedIndex] as any)[key] = "";
        setFormState((prev) => ({ ...prev, payerConfigs: newConfigs }));
      } else {
        setFormState((prev) => ({ ...prev, [key]: "" }));
      }
      return;
    }

    const type = key === "p_dob" ? "dob" : "other";
    const result = checkDateReasonability(value, type);

    if (!result.isReasonable) {
      toast.warning(
        `Unusual Date: You ${result.message}. Please double check if this is correct.`,
        {
          action: {
            label: "Correct",
            onClick: () => {},
          },
          cancel: {
            label: "Change",
            onClick: () => {
              if (nestedIndex !== undefined) {
                const newConfigs = [...formState.payerConfigs];
                (newConfigs[nestedIndex] as any)[key] = "";
                setFormState((prev) => ({ ...prev, payerConfigs: newConfigs }));
              } else {
                setFormState((prev) => ({ ...prev, [key]: "" }));
              }
            },
          },
          duration: 10000,
        },
      );
    }
  };

  // Check if parent hospital has Value Added Services access
  const hasVASAccess = useMemo(() => {
    if (!parentHospital || !roles) return true; // Default to true if not provided (e.g. Super Admin)
    if (parentHospital.role === "Admin") return true;
    const roleDef = roles.find((r) => r.name === parentHospital.role);
    const perms = roleDef?.permissions || [];
    return perms.includes("all") || perms.includes("value_added_services:view");
  }, [parentHospital, roles]);

  // Identify if the current creator is a Department Head or Admin
  const isDeptHead = parentHospital?.role === "Department Head";
  const isSuperAdmin =
    parentHospital?.role?.toUpperCase() === "SUPER ADMIN" ||
    parentHospital?.role?.toUpperCase() === "ADMIN" ||
    parentHospital?.role?.toUpperCase() === "PRIMARY ADMIN";
  const canManageBranches = isDeptHead || isSuperAdmin;

  // Filter managed hospitals for Dept Head or Admin
  const managedHospitals = useMemo(() => {
    if (!canManageBranches || !parentHospital) return [];
    if (isSuperAdmin) {
      return users.filter(
        (u) =>
          (u.entityType || (u.isAdmin ? "Hospital" : "User")) === "Hospital",
      );
    }
    return users.filter(
      (u) =>
        u.id === parentHospital.id || u.parentHospitalId === parentHospital.id,
    );
  }, [users, canManageBranches, isDeptHead, isSuperAdmin, parentHospital]);

  const targetHospitalProducts = useMemo(() => {
    if (mode === "hospital_staff") {
      if (targetHospitalId) {
        const target = users.find((u) => u.id === targetHospitalId);
        return target?.products;
      }
      return parentHospital?.products;
    }
    return undefined; // All products available
  }, [mode, targetHospitalId, parentHospital, users]);

  // Determine effective mode: are we creating a hospital/branch OR a staff member?
  const effectiveMode = isCreatingNewBranch ? "hospital_partner" : mode;

  // Determine available tabs based on mode and restrictions
  const availableTabs = useMemo(() => {
    if (effectiveMode === "hospital_partner") {
      const tabs = ["profile"];

      // Payer Config and Digital Assets are only relevant for "Hospital" entities (Branches).
      // Partners (Agents/Agencies) do not need these configurations.
      // This applies to both Admin and Dept Head.
      if (entityType === "Hospital") {
        tabs.push("payers", "assets");
      }

      if (entityType !== "User") {
        tabs.push("value_added_service");
      }

      // Pricing/Commercials tab logic:
      // - Hidden for Dept Head (Requirement 3)
      // - Shown for Admin (Standard flow)
      // - Hidden for "User" entityType (Requirement: If we are creating any user then hide Key Contacts and Commercials)
      if (!isDeptHead && entityType !== "User") {
        tabs.push("pricing");
      }

      return tabs;
    }
    const tabs = ["profile"];
    if (hasVASAccess) {
      tabs.push("value_added_service");
    }
    return tabs;
  }, [effectiveMode, isDeptHead, entityType, hasVASAccess]);

  // Reset tab to profile when entity type changes to avoid stuck on hidden tabs
  useEffect(() => {
    setActiveTab("profile");
  }, [entityType]);

  // Determine Available Roles (Requirement: Access Control Config)
  const availableRoles = useMemo(() => {
    // Base roles from the global roles configuration (only active ones)
    const activeRoles = roles
      .filter((r) => r.status === "Active")
      .map((r) => r.name);

    let result: string[] = [];

    // Admin should always see all active roles, regardless of mode
    if (isSuperAdmin) {
      result = activeRoles;
    }
    // Requirement: In Hospital Staff mode (Team Access), restrict to specific roles for non-admins
    else if (mode === "hospital_staff") {
      const allowedHospitalRoles = [
        "Hospital",
        "Hospital Cashless Desk",
        "Hospital Accounts",
      ];
      result = activeRoles.filter((roleName) =>
        allowedHospitalRoles.includes(roleName),
      );
      if (result.length === 0)
        result = ["Hospital", "Hospital Cashless Desk", "Hospital Accounts"];
    }
    // If parentHospital exists, check their role configuration
    else if (parentHospital) {
      const parentRoleDef = roles.find((r) => r.name === parentHospital.role);
      // If role definition exists and has specific creation rights
      if (
        parentRoleDef &&
        parentRoleDef.canCreateRoles &&
        parentRoleDef.canCreateRoles.length > 0
      ) {
        // Filter the allowed roles to only include active ones
        result = parentRoleDef.canCreateRoles.filter((roleName) =>
          activeRoles.includes(roleName),
        );
      }

      // Fallback if no specific config (e.g. legacy or undefined)
      if (result.length === 0) {
        if (parentHospital.role === "Department Head") {
          result = activeRoles.filter(
            (r) => r !== "Admin" && r !== "Department Head",
          );
        }
      }
    }

    // Final Fallback if still empty or roles prop is empty
    if (result.length === 0) {
      result = activeRoles.length > 0 ? activeRoles : STAFF_ROLES;
    }

    return result;
  }, [parentHospital, roles, mode]);

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormState(initialUserState);
    setError("");
    setActiveTab("profile");
    setIsViewMode(false);
    setIsCreatingNewBranch(false);
    setEntityType(mode === "hospital_staff" ? "User" : "Hospital"); // Default based on mode

    // If Staff Mode and Manager, default target hospital to self
    if (mode === "hospital_staff" && canManageBranches && parentHospital) {
      setTargetHospitalId(parentHospital.id);
    }

    setShowAddForm(true);
  };

  const handleEdit = (user: HospitalUser, viewOnly: boolean = false) => {
    setEditingUserId(user.id);
    setIsViewMode(viewOnly);
    setIsCreatingNewBranch(false); // Edit is always direct

    // Detect Entity Type dynamically
    let detectedType: "User" | "Hospital" | "Partner" = "Hospital";
    if (user.entityType) {
      detectedType = user.entityType as any;
    } else if (user.role === "Admin" && !user.hospitalName) {
      detectedType = "Partner";
    } else if (user.firstName && user.lastName) {
      detectedType = "User";
    }
    setEntityType(detectedType);

    if (
      mode === "hospital_staff" &&
      canManageBranches &&
      user.parentHospitalId
    ) {
      setTargetHospitalId(user.parentHospitalId);
    }

    setFormState({
      ...initialUserState,
      ...user, // Spread user to preserve all fields
      hospitalName: user.hospitalName || "",
      address: user.address || "",
      state: user.state || "",
      district: user.district || "",
      zone: user.zone || "",
      rohiniId: user.rohiniId || "",
      emailId: user.emailId || "",
      mobileNo: user.mobileNo || "",
      // Map Staff Name or Contact Person
      tpaPersonName:
        mode === "hospital_staff"
          ? user.displayName
          : user.tpaPersonName || user.displayName || "",
      tpaPersonMobile: user.tpaPersonMobile || user.mobileNo || "",
      doctorName: user.doctorName || "",
      doctorMobileNo: user.doctorMobileNo || "",
      role: user.role || (mode === "hospital_partner" ? "Admin" : "Hospital"),
      loginId: user.username || user.emailId || "",
      password: user.password || "",
      confirmPassword: user.password || "",
      isAdmin: user.isAdmin || false,
      hospitalSeal: user.hospitalSeal || "",
      doctorStamp: user.doctorStamp || "",
      reportsToId: user.reportsToId || "",
      invoiceEmail: user.invoiceEmail || "",
      agreementType: user.agreementType || "Per Case",
      agreementValue: user.agreementValue ? String(user.agreementValue) : "",
      agreementStartDate: user.agreementStartDate || "",
      agreementRenewalDate: user.agreementRenewalDate || "",
      agreementStageValues: user.agreementStageValues || [],
      agreementInvoiceCategories: user.agreementInvoiceCategories || [],
      agreementPercentageBase: user.agreementPercentageBase || "",
      valueAddedServices: {
        vasEnabled: user.valueAddedServices?.vasEnabled ?? true,
        hospitalManageEnabled:
          user.valueAddedServices?.hospitalManageEnabled ?? true,
        medicalScrutinyRequired:
          user.valueAddedServices?.medicalScrutinyRequired ?? true,
        kypEnabled: user.valueAddedServices?.kypEnabled || false,
        rpaEnabled: user.valueAddedServices?.rpaEnabled || false,
        aiInsightsEnabled: user.valueAddedServices?.aiInsightsEnabled || false,
        digitalAssetsEnabled:
          user.valueAddedServices?.digitalAssetsEnabled || false,
        nhcxEnabled: user.valueAddedServices?.nhcxEnabled || false,
        liveClaimsTrackerEnabled:
          user.valueAddedServices?.liveClaimsTrackerEnabled || false,
      },
      permissionsMatrix: user.permissionsMatrix
        ? { ...DEFAULT_PERMISSIONS, ...user.permissionsMatrix }
        : { ...DEFAULT_PERMISSIONS },
      allowedStages: (user as any).allowedStages || [],
      assignedHospitalIds: user.assignedHospitalIds || [],
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      empCode: user.empCode || "",
      zones: user.zones || [],
      states: user.states || [],
      districts: user.districts || [],
      payerConfigs: initialUserState.payerConfigs.map((p) => {
        const creds = user.portalCredentials?.find(
          (c) => c.entityId === p.name,
        );
        return creds
          ? {
              ...p,
              hasTieUp: true,
              portalUser: creds.username || "",
              portalPass: creds.password || "",
              startDate: creds.startDate || "",
              endDate: creds.endDate || "",
              linkedRateList: creds.rateListName || "",
            }
          : p;
      }),
    });
    setError("");
    setActiveTab("profile");
    setShowAddForm(true);
  };

  const handleStateChange = (val: string) => {
    const zone = ZONES_BY_STATE[val] || "";
    setFormState((prev) => ({
      ...prev,
      state: val,
      district: "", // Reset district when state changes
      zone,
    }));
  };

  // Requirement 1: Login Credential Mapping
  const handleEmailChange = (val: string) => {
    setFormState((prev) => {
      // If loginId is empty OR loginId matches the OLD email, update it
      // This ensures if user manually changed loginId, we don't overwrite it
      const trimmedVal = val.trim();
      const shouldUpdateLogin =
        !prev.loginId || prev.loginId.trim() === prev.emailId?.trim();
      return {
        ...prev,
        emailId: trimmedVal,
        loginId: shouldUpdateLogin ? trimmedVal : prev.loginId,
      };
    });
  };

  // Requirement 2 & 3: Hospital Selection for Dept Head
  const handleHospitalSelection = (val: string) => {
    if (val === "CREATE_NEW") {
      setIsCreatingNewBranch(true);
      setTargetHospitalId("");
      setFormState(initialUserState); // Reset form for new hospital
      setEntityType("Hospital");
    } else {
      setIsCreatingNewBranch(false);
      setTargetHospitalId(val);
    }
  };

  // Image resize utility
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, 100, 100);
            resolve(canvas.toDataURL(file.type));
          } else {
            reject("Canvas context not available");
          }
        };
      };
    });
  };

  const handleFileUpload = async (
    field: "hospitalSeal" | "doctorStamp",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedData = await resizeImage(file);
        setFormState((prev) => ({ ...prev, [field]: resizedData }));
      } catch (err) {
        console.error("Image resize failed", err);
      }
    }
  };

  const handleRateListUpload = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const newConfigs = [...formState.payerConfigs];
      newConfigs[index].linkedRateList = file.name;
      // In a real app, you'd upload this file or convert to base64
      newConfigs[index].rateListFile = file.name; // Simulating uploaded file state
      setFormState((prev) => ({ ...prev, payerConfigs: newConfigs }));
    }
  };

  const handleNextStep = () => {
    const currentIndex = availableTabs.indexOf(activeTab);
    if (currentIndex < availableTabs.length - 1) {
      setActiveTab(availableTabs[currentIndex + 1] as any);
    }
  };

  const handlePrevStep = () => {
    const currentIndex = availableTabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(availableTabs[currentIndex - 1] as any);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formState.loginId) {
      setError("Login ID is required.");
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Determine the Parent ID and Final Hospital Details
    let parentId: string | undefined = undefined;
    let finalHospitalName = formState.hospitalName;
    let finalAddress = formState.address;
    let finalState = formState.state;
    let finalDistrict = formState.district;
    let finalZone = formState.zone;
    let finalRohini = formState.rohiniId;

    if (effectiveMode === "hospital_staff") {
      // Staff Creation Logic
      if (canManageBranches && targetHospitalId) {
        // Selected a specific hospital from dropdown
        const targetHospital = users.find((u) => u.id === targetHospitalId);
        parentId = targetHospitalId; // Logic: Staff belongs to that specific branch/hospital
        if (targetHospital) {
          finalHospitalName = targetHospital.hospitalName;
          finalAddress = targetHospital.address;
          finalState = targetHospital.state || "";
          finalDistrict = targetHospital.district || "";
          finalZone = targetHospital.zone || "";
          finalRohini = targetHospital.rohiniId;
        }
      } else {
        // Standard Staff creation (Admin creating staff or single hospital context)
        parentId = parentHospital?.id;
        finalHospitalName = parentHospital?.hospitalName || "";
        finalAddress = parentHospital?.address || "";
        finalState = parentHospital?.state || "";
        finalDistrict = parentHospital?.district || "";
        finalZone = parentHospital?.zone || "";
        finalRohini = parentHospital?.rohiniId || "";
      }
    } else {
      // Partner/Branch Creation Logic
      // If Manager is creating a new hospital (Branch)
      if (canManageBranches) {
        parentId = parentHospital?.id;
      }
      // If Admin is creating a Partner, parentId is undefined (Top level)
    }

    if (formState.status === "Inactive" && !formState.statusReason?.trim()) {
      setError("Deactivation reason is mandatory.");
      return;
    }

    const mobileRegex = /^\d{10}$/;
    if (formState.mobileNo && !mobileRegex.test(formState.mobileNo)) {
      setError("Official Mobile Number must be exactly 10 digits.");
      return;
    }
    if (
      formState.tpaPersonMobile &&
      !mobileRegex.test(formState.tpaPersonMobile)
    ) {
      setError("Contact Number must be exactly 10 digits.");
      return;
    }
    if (
      formState.doctorMobileNo &&
      !mobileRegex.test(formState.doctorMobileNo)
    ) {
      setError("Dr. Mobile Number must be exactly 10 digits.");
      return;
    }

    const existingUser = editingUserId
      ? users.find((u) => u.id === editingUserId)
      : null;
    const isRahul = formState.loginId === "raulavhad@gmail.com";

    if (entityType === "User") {
      if (
        !formState.firstName ||
        !formState.lastName ||
        !formState.emailId ||
        !formState.role
      ) {
        setError("First Name, Last Name, Email, and Role are mandatory.");
        return;
      }
      if (
        formState.zones.length === 0 &&
        formState.states.length === 0 &&
        formState.districts.length === 0
      ) {
        setError("At least one Zone, State, or District must be selected.");
        return;
      }
    }

    if (effectiveMode === "hospital_partner" && entityType !== "User") {
      if (formState.agreementType === "Percentage") {
        if (!formState.agreementPercentageBase) {
          setError(
            "Selection of either Final Approval Amount or Settled Amount is mandatory for Percentage agreements.",
          );
          return;
        }
      }
      if (formState.agreementType === "Per Case") {
        if (
          !formState.agreementStageValues ||
          formState.agreementStageValues.length === 0
        ) {
          setError(
            "At least one billing stage must be selected and configured for Per Case agreements.",
          );
          return;
        }
        const invalidStage = formState.agreementStageValues.find(
          (sv: any) => !sv.category,
        );
        if (invalidStage) {
          setError(
            `Validation Error: Please select an Invoice Category for the stage "${invalidStage.stage}"`,
          );
          return;
        }
      }
    }

    const createdId =
      editingUserId || `USR-${Math.random().toString(36).substr(2, 9)}`;
    const userPayload: HospitalUser = {
      id: createdId,
      username: formState.loginId,
      password: formState.password,
      // Logic for Display Name: Staff Mode = Staff Name, Partner Mode = Hospital Name or Contact Person
      displayName: isRahul
        ? "Rahul Avhad"
        : entityType === "User"
          ? `${formState.firstName} ${formState.lastName}`
          : effectiveMode === "hospital_staff"
            ? formState.tpaPersonName
            : formState.hospitalName || "New Hospital",
      role: isRahul ? "Admin" : formState.role,
      status: formState.status,
      statusReason: formState.statusReason,
      createdAt: existingUser?.createdAt || new Date().toISOString(),

      hospitalId:
        existingUser?.hospitalId ||
        (entityType === "User" || effectiveMode === "hospital_staff"
          ? targetHospitalId ||
            parentHospital?.hospitalId ||
            parentHospital?.id ||
            ""
          : createdId),

      // User Details
      firstName: formState.firstName,
      lastName: formState.lastName,
      empCode: formState.empCode,
      designation: formState.designation,
      zones: formState.zones,
      states: formState.states,
      districts: formState.districts,

      photoURL: formState.photoURL,
      employeeCode: formState.empCode,
      department: formState.department,
      joiningDate: formState.joiningDate,

      // Inheritance Logic
      hospitalName: finalHospitalName,
      address: finalAddress,
      state: finalState,
      district: finalDistrict,
      zone: finalZone,
      rohiniId: finalRohini,

      emailId: formState.emailId,
      mobileNo: formState.mobileNo || formState.tpaPersonMobile,

      tpaPersonName: formState.tpaPersonName,
      tpaPersonMobile: formState.tpaPersonMobile,
      doctorName: formState.doctorName,
      doctorMobileNo: formState.doctorMobileNo,
      hospitalSeal: formState.hospitalSeal,
      doctorStamp: formState.doctorStamp,
      reportsToId: formState.reportsToId,

      isAdmin: effectiveMode === "hospital_partner" ? formState.isAdmin : false,
      permissionsMatrix: formState.permissionsMatrix,
      permissions: isRahul
        ? ["all"]
        : roles.find((r) => r.name === formState.role)?.permissions || [],
      entityType: entityType, // Save the selected entity type

      walletBalance: existingUser?.walletBalance || 0,
      perCaseCharge: existingUser?.perCaseCharge || 0,
      invoiceEmail: formState.invoiceEmail || "",
      agreementType: formState.agreementType,
      agreementValue: Number(formState.agreementValue) || 0,
      agreementStartDate: formState.agreementStartDate,
      agreementRenewalDate: formState.agreementRenewalDate,
      agreementStageValues: formState.agreementStageValues,
      agreementInvoiceCategories: formState.agreementInvoiceCategories,
      agreementPercentageBase: formState.agreementPercentageBase,
      valueAddedServices: formState.valueAddedServices,

      portalCredentials: formState.payerConfigs
        .filter((p) => p.hasTieUp)
        .map((p) => ({
          entityId: p.name,
          username: p.portalUser,
          password: p.portalPass,
          startDate: p.startDate,
          endDate: p.endDate,
          rateListName: p.linkedRateList,
        })),

      allowedStages: formState.allowedStages,
      assignedHospitalIds: formState.assignedHospitalIds,
      products: formState.products,
      defaultProduct: formState.defaultProduct || "",

      // Assign Parent Relationship if creating a sub-branch or staff linked to a branch
      parentHospitalId: existingUser?.parentHospitalId || parentId,
      // Default to centralized if creating sub-branch under Dept Head, else default Centralized
      invoiceGenerationType: (existingUser?.invoiceGenerationType ||
        (parentId ? "Centralized" : "Centralized")) as any,
    };

    const savePromise = (async () => {
      if (editingUserId) {
        const res = await usersApi.update(editingUserId, userPayload);
        const updated = res.data;
        setUsers(
          users.map((u) => (u.id === editingUserId ? { ...u, ...updated } : u)),
        );
        setShowAddForm(false);
      } else {
        const res = await usersApi.create(userPayload);
        const created = res.data;
        const updatedUsers = [...users, created];
        setUsers(updatedUsers);

        // REQUIREMENT 1: If Manager is creating a new branch (within staff flow), return to staff creation with new hospital selected
        if (
          isCreatingNewBranch &&
          mode === "hospital_staff" &&
          canManageBranches
        ) {
          setIsCreatingNewBranch(false);
          setTargetHospitalId(created.id); // Auto-select the new branch
          setFormState(initialUserState); // Reset form for the Staff Member
          setActiveTab("profile"); // Ensure we are on profile tab
          setEntityType("User"); // Switch back to staff user creation
          // Do NOT close the modal
        } else {
          setShowAddForm(false);
        }
      }
    })();

    toast.promise(savePromise, {
      loading: editingUserId
        ? "Saving modifications..."
        : "Adding new profile...",
      success: editingUserId
        ? "Successfully updated!"
        : "Successfully created!",
      error: (error) =>
        error instanceof Error && error.message
          ? `Unable to save profile: ${error.message}`
          : "Unable to save profile.",
    });
  };

  const deleteUser = (id: string) => {
    setUserToDelete(id);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      const deletePromise = (async () => {
        await usersApi.delete(userToDelete);
        setUsers(users.filter((u) => u.id !== userToDelete));
        setUserToDelete(null);
      })();

      toast.promise(deletePromise, {
        loading: "Deleting user...",
        success: "User deleted successfully",
        error: "Failed to delete user",
      });
    }
  };

  const cancelDeleteUser = () => {
    setUserToDelete(null);
  };

  const togglePermission = (key: keyof UserPermissionsMatrix) => {
    setFormState((prev) => ({
      ...prev,
      permissionsMatrix: {
        ...prev.permissionsMatrix,
        [key]: !prev.permissionsMatrix[key],
      },
    }));
  };

  const toggleStageAccess = (stageKey: string) => {
    const current = formState.allowedStages;
    if (current.includes(stageKey)) {
      setFormState((prev) => ({
        ...prev,
        allowedStages: current.filter((s) => s !== stageKey),
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        allowedStages: [...current, stageKey],
      }));
    }
  };

  const toggleHospitalAssignment = (hospitalId: string) => {
    const current = formState.assignedHospitalIds;
    if (current.includes(hospitalId)) {
      setFormState((prev) => ({
        ...prev,
        assignedHospitalIds: current.filter((id) => id !== hospitalId),
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        assignedHospitalIds: [...current, hospitalId],
      }));
    }
  };

  const PERMISSION_CONFIG = [
    { key: "overview", label: "Overview Dashboard", icon: LayoutDashboard },
    { key: "cashless_dashboard", label: "Cashless Dashboard", icon: Activity },
    { key: "crm_dashboard", label: "CRM Dashboard", icon: ShieldAlert },
    { key: "recon_dashboard", label: "Finance Team", icon: ShieldCheck },
    {
      key: "medical_underwriting",
      label: "Medical Underwriting",
      icon: BriefcaseMedical,
    },
    { key: "sales_dashboard", label: "Sales Dashboard", icon: TrendingUp },
    { key: "claim_directory", label: "Claim Directory", icon: FileSearch },
    { key: "mis_view", label: "MIS Analytics", icon: BarChart3 },
    { key: "hospital_manage", label: "Hospital Settings", icon: Hospital },
    { key: "user_manage", label: "User Management", icon: Users },
    { key: "can_edit", label: "Edit & Process Claims", icon: Edit2 },
    { key: "system_admin", label: "System Administration", icon: Settings },
    {
      key: "reimbursement_partner",
      label: "Partner Processing Access",
      icon: ShieldCheck,
    },
    { key: "reimbursement_ica", label: "ICA Access", icon: Zap },
    {
      key: "reimbursement_pre_post",
      label: "Pre & Post Access",
      icon: HistoryIcon,
    },
    { key: "reimbursement_kyp", label: "KYP Access", icon: FileSearch },
    {
      key: "reimbursement_recovery",
      label: "Recovery & Recon Access",
      icon: Coins,
    },
    {
      key: "patient_dashboard",
      label: "Patient Dashboard Access",
      icon: UserIcon,
    },
  ];

  const HOSPITAL_TAB_CONFIG = [
    { key: "tab_hospital_profile", label: "Hospital Profile", icon: Building },
    { key: "tab_team_access", label: "Team Access", icon: Users },
    { key: "tab_payer_config", label: "Payer Config", icon: CreditCard },
    { key: "tab_digital_assets", label: "Digital Assets", icon: ShieldPlus },
    { key: "tab_nhcx_onboarding", label: "NHCX Onboarding", icon: Globe },
    { key: "tab_email_integration", label: "Email Integration", icon: Mail },
    { key: "tab_wallet_billing", label: "Wallet & Billing", icon: Wallet },
  ];

  const FUNCTIONAL_PERMISSION_CONFIG = [
    { key: "claims_view", label: "View Claims", icon: Eye },
    { key: "claims_edit_stage", label: "Edit Claim Stages", icon: Layers },
    { key: "documents_upload", label: "Upload Documents", icon: Upload },
    {
      key: "reconciliation_approve",
      label: "Approve Reconciliation",
      icon: CheckCircle2,
    },
    {
      key: "financial_view",
      label: "Access Financial Data",
      icon: IndianRupee,
    },
    { key: "dashboards_view", label: "View MIS Dashboards", icon: BarChart3 },
    { key: "legal_manage", label: "Manage Legal Cases", icon: Shield },
    { key: "recovery_manage", label: "Manage Recoveries", icon: Zap },
  ];

  // Filter users displayed based on hierarchy if Dept Head is viewing
  const userCounts = useMemo(() => {
    let filtered = users;
    if (mode === "hospital_partner") {
      const roleUpper = parentHospital?.role?.toUpperCase();
      if (roleUpper === "SUPER ADMIN" || roleUpper === "ADMIN") {
        filtered = users;
      } else if (parentHospital?.role === "Department Head") {
        filtered = users.filter(
          (u) =>
            u.parentHospitalId === parentHospital.id ||
            u.id === parentHospital.id,
        );
      } else {
        const myScopeId =
          parentHospital?.hospitalId ||
          parentHospital?.parentHospitalId ||
          parentHospital?.id;
        filtered = users.filter(
          (u) =>
            u.parentHospitalId === myScopeId ||
            u.hospitalId === myScopeId ||
            u.id === myScopeId,
        );
      }
    } else {
      const parentId = parentHospital?.id || "hosp-001";
      filtered = users.filter((u) => u.parentHospitalId === parentId);
      if (parentHospital?.role !== "Admin") {
        const allowedHospitalRoles = [
          "Hospital",
          "Hospital Cashless Desk",
          "Hospital Accounts",
        ];
        filtered = filtered.filter((u) =>
          allowedHospitalRoles.includes(u.role || ""),
        );
      }
    }

    return {
      User: filtered.filter(
        (u) => (u.entityType || (u.isAdmin ? "Hospital" : "User")) === "User",
      ).length,
      Partner: filtered.filter(
        (u) =>
          (u.entityType || (u.isAdmin ? "Hospital" : "User")) === "Partner",
      ).length,
      Hospital: filtered.filter(
        (u) =>
          (u.entityType || (u.isAdmin ? "Hospital" : "User")) === "Hospital",
      ).length,
    };
  }, [users, mode, parentHospital]);

  const displayedUsers = React.useMemo(() => {
    let filtered = users;
    if (mode === "hospital_partner") {
      const roleUpper = parentHospital?.role?.toUpperCase();
      if (roleUpper === "SUPER ADMIN" || roleUpper === "ADMIN") {
        filtered = users;
      } else if (parentHospital?.role === "Department Head") {
        filtered = users.filter(
          (u) =>
            u.parentHospitalId === parentHospital.id ||
            u.id === parentHospital.id,
        );
      } else {
        const myScopeId =
          parentHospital?.hospitalId ||
          parentHospital?.parentHospitalId ||
          parentHospital?.id;
        filtered = users.filter(
          (u) =>
            u.parentHospitalId === myScopeId ||
            u.hospitalId === myScopeId ||
            u.id === myScopeId,
        );
      }
    } else {
      // Staff mode: Only show staff of the parent hospital
      const parentId = parentHospital?.id || "hosp-001";
      filtered = users.filter((u) => u.parentHospitalId === parentId);
      if (parentHospital?.role !== "Admin") {
        const allowedHospitalRoles = [
          "Hospital",
          "Hospital Cashless Desk",
          "Hospital Accounts",
        ];
        filtered = filtered.filter((u) =>
          allowedHospitalRoles.includes(u.role || ""),
        );
      }
    }

    // Filter by activeUserTab
    return filtered.filter(
      (u) =>
        (u.entityType || (u.isAdmin ? "Hospital" : "User")) === activeUserTab,
    );
  }, [users, mode, parentHospital, activeUserTab]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight leading-tight">
            {mode === "hospital_partner" ? "Hospital Registry" : "Team Access"}
          </h1>
          {mode === "hospital_partner" && (
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl mt-4">
              {(["User", "Partner", "Hospital"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveUserTab(tab);
                    setEntityType(tab);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeUserTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {tab}{" "}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] ${activeUserTab === tab ? "bg-slate-100 text-slate-600" : "bg-slate-200/50 text-slate-400"}`}
                  >
                    {userCounts[tab]}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="text-slate-500 text-sm font-medium mt-2">
            {mode === "hospital_partner"
              ? "Onboard and manage hospital partners."
              : "Create and manage IDs for your hospital team."}
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-[#000080] text-white px-10 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl active:scale-95"
        >
          <UserPlus size={18} className="mr-3" />{" "}
          {mode === "hospital_partner"
            ? parentHospital?.role === "Department Head"
              ? "Add Branch"
              : "Create User / Partner / Hospital"
            : "Create Staff"}
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Identity
                </th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Contact
                </th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Assigned Role
                </th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Status
                </th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">
                  Ops
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedUsers.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#000080] font-black text-xs mr-4 shadow-sm group-hover:scale-110 transition-transform">
                        {u.displayName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase tracking-tight">
                          {u.displayName}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {u.hospitalName}
                        </p>
                        {u.district && (
                          <p className="text-[9px] font-medium text-slate-400">
                            {u.district}, {u.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-700">
                      {u.mobileNo}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">
                      {u.emailId}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight border ${u.isAdmin ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-50 text-slate-500 border-slate-100"}`}
                    >
                      {u.designation ||
                        u.role ||
                        (u.isAdmin ? "Admin" : "No Role Assigned")}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span
                        className={`w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${u.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {u.status}
                      </span>
                      {u.status === "Inactive" && u.statusReason && (
                        <span
                          className="text-[10px] font-medium text-slate-400 mt-1 max-w-[150px] truncate"
                          title={u.statusReason}
                        >
                          {u.statusReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(u, true)}
                        className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(u, false)}
                        className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div
            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                  {effectiveMode === "hospital_partner"
                    ? isCreatingNewBranch ||
                      parentHospital?.role === "Department Head"
                      ? "Register New Branch"
                      : "Hospital/Partner Onboarding"
                    : "Staff Account"}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {isViewMode
                    ? "Read-only access"
                    : effectiveMode === "hospital_partner"
                      ? "Configure Partner Profile"
                      : "Configure Staff Access"}
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={28} />
              </button>
            </div>

            {/* Stepper Tabs */}
            <div className="px-10 border-b border-slate-100 bg-slate-50/50 flex space-x-8 overflow-hidden flex-shrink-0 flex-nowrap">
              {availableTabs.map((step, idx) => (
                <button
                  key={step}
                  onClick={() => setActiveTab(step as any)}
                  className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center ${activeTab === step ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 text-[9px] ${activeTab === step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}
                  >
                    {idx + 1}
                  </span>
                  {step === "profile"
                    ? "Profile & Identity"
                    : step === "payers"
                      ? "Payer Config"
                      : step === "assets"
                        ? "Digital Assets"
                        : step === "value_added_service"
                          ? "Value Added Service"
                          : step === "access"
                            ? "Access Control"
                            : "Commercials"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
              {activeTab === "profile" && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                  {/* HOSPITAL SELECTION (Only for Dept Head or Admin creating Staff) */}
                  {mode === "hospital_staff" &&
                    canManageBranches &&
                    !isViewMode && (
                      <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl mb-6">
                        <h3 className="text-sm font-black text-indigo-700 uppercase flex items-center mb-4">
                          <Building size={16} className="mr-2" /> Assign to
                          Hospital
                        </h3>
                        <div className="relative">
                          <select
                            value={targetHospitalId ?? ""}
                            onChange={(e) =>
                              handleHospitalSelection(e.target.value)
                            }
                            disabled={editingUserId !== null}
                            className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm appearance-none disabled:bg-slate-100"
                          >
                            <option value="">Select Branch...</option>
                            {managedHospitals.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.hospitalName} ({h.district})
                              </option>
                            ))}
                            <option value="CREATE_NEW">
                              ＋ Create New Hospital
                            </option>
                          </select>
                          <ChevronRight
                            size={14}
                            className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-indigo-400 pointer-events-none"
                          />
                        </div>
                      </div>
                    )}

                  {/* Entity Type Selection - Only for Partner Mode */}
                  {effectiveMode === "hospital_partner" && (
                    <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl mb-6 shadow-sm">
                      <h3 className="text-sm font-black text-slate-800 uppercase flex items-center">
                        <Layers size={16} className="mr-2 text-blue-500" />{" "}
                        {editingUserId ? "Entity Type" : "Create Entity Type"}
                      </h3>
                      <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                        <button
                          onClick={() => !isViewMode && setEntityType("User")}
                          className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${entityType === "User" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                          disabled={isViewMode || editingUserId !== null}
                        >
                          User
                        </button>
                        <button
                          onClick={() =>
                            !isViewMode && setEntityType("Hospital")
                          }
                          className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${entityType === "Hospital" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                          disabled={isViewMode || editingUserId !== null}
                        >
                          Hospital
                        </button>
                        <button
                          onClick={() =>
                            !isViewMode && setEntityType("Partner")
                          }
                          className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${entityType === "Partner" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                          disabled={isViewMode || editingUserId !== null}
                        >
                          Partner
                        </button>
                      </div>
                    </div>
                  )}

                  {/* USER IDENTITY - Only for User Mode */}
                  {(effectiveMode === "hospital_partner" ||
                    effectiveMode === "hospital_staff") &&
                    entityType === "User" && (
                      <div className="space-y-6">
                        <h3 className="text-sm font-black text-slate-800 uppercase flex items-center justify-between">
                          <div className="flex items-center">
                            <UserIcon
                              size={16}
                              className="mr-2 text-blue-500"
                            />{" "}
                            User Details
                          </div>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {mode === "hospital_staff" && (
                            <div className="md:col-span-2">
                              <InputGroup
                                label="Assigned Hospital"
                                value={
                                  canManageBranches
                                    ? users.find(
                                        (u) => u.id === targetHospitalId,
                                      )?.hospitalName || "Select Hospital Above"
                                    : parentHospital?.hospitalName || ""
                                }
                                disabled={true}
                              />
                            </div>
                          )}
                          <InputGroup
                            label="First Name"
                            value={formState.firstName}
                            onChange={(v) =>
                              setFormState({ ...formState, firstName: v })
                            }
                            placeholder="e.g. John"
                            disabled={isViewMode}
                          />
                          <InputGroup
                            label="Last Name"
                            value={formState.lastName}
                            onChange={(v) =>
                              setFormState({ ...formState, lastName: v })
                            }
                            placeholder="e.g. Doe"
                            disabled={isViewMode}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 md:col-span-2">
                            <InputGroup
                              label="Designation"
                              value={formState.designation || ""}
                              onChange={(v) =>
                                setFormState({ ...formState, designation: v })
                              }
                              placeholder="e.g. Medical Superintendent"
                              disabled={isViewMode}
                            />
                          </div>
                          <InputGroup
                            label="Email ID"
                            value={formState.emailId}
                            onChange={handleEmailChange}
                            type="email"
                            placeholder="john.doe@example.com"
                            disabled={isViewMode}
                          />
                          <InputGroup
                            label="Mobile Number"
                            value={formState.mobileNo}
                            onChange={(v) =>
                              setFormState({ ...formState, mobileNo: v })
                            }
                            type="number"
                            placeholder="9876543210"
                            disabled={isViewMode}
                          />
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                              Department
                            </label>
                            <select
                              value={formState.department}
                              onChange={(e) =>
                                setFormState({
                                  ...formState,
                                  department: e.target.value,
                                })
                              }
                              disabled={isViewMode}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm disabled:bg-slate-100"
                            >
                              <option value="">Select Department...</option>
                              <option value="Operations">Operations</option>
                              <option value="Medical">Medical</option>
                              <option value="Reconciliation">
                                Reconciliation
                              </option>
                              <option value="Sales">Sales</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </div>
                          <InputGroup
                            label="Date of Joining"
                            value={formState.joiningDate}
                            onChange={(v) =>
                              setFormState({ ...formState, joiningDate: v })
                            }
                            onBlur={() =>
                              validateDateOnBlur(
                                "joiningDate",
                                formState.joiningDate,
                              )
                            }
                            type="date"
                            disabled={isViewMode}
                          />

                          {mode !== "hospital_staff" && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Reporting Manager
                              </label>
                              <div className="relative">
                                <select
                                  value={formState.reportsToId ?? ""}
                                  onChange={(e) =>
                                    setFormState({
                                      ...formState,
                                      reportsToId: e.target.value,
                                    })
                                  }
                                  disabled={isViewMode}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm appearance-none disabled:bg-slate-100"
                                >
                                  <option value="">Select Manager...</option>
                                  {users
                                    .filter(
                                      (u) =>
                                        (u.role
                                          ?.toLowerCase()
                                          .includes("manager") ||
                                          u.role
                                            ?.toLowerCase()
                                            .includes("head") ||
                                          u.role
                                            ?.toLowerCase()
                                            .includes("admin") ||
                                          u.isAdmin) &&
                                        (u.entityType ||
                                          (u.isAdmin ? "Hospital" : "User")) !==
                                          "Hospital",
                                    )
                                    .map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.displayName} ({m.role})
                                      </option>
                                    ))}
                                </select>
                                <ChevronRight
                                  size={14}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none"
                                />
                              </div>
                            </div>
                          )}

                          {entityType === "User" && (
                            <div className="md:col-span-2 space-y-4">
                              <ProductSelector
                                selected={formState.products}
                                available={targetHospitalProducts}
                                onChange={(p) =>
                                  setFormState({ ...formState, products: p })
                                }
                                disabled={isViewMode}
                              />
                              {formState.products.length > 0 && (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                    Default Landing Product
                                  </label>
                                  <div className="relative">
                                    <select
                                      disabled={isViewMode}
                                      value={formState.defaultProduct || ""}
                                      onChange={(e) =>
                                        setFormState({
                                          ...formState,
                                          defaultProduct: e.target.value,
                                        })
                                      }
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm disabled:bg-slate-100"
                                    >
                                      <option value="">Configured Priority (Default)</option>
                                      {formState.products.map((p) => (
                                        <option key={p} value={p}>
                                          {p}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                              {roles &&
                                formState.role &&
                                roles.find((r) => r.name === formState.role)
                                  ?.products &&
                                (roles.find((r) => r.name === formState.role)
                                  ?.products?.length ?? 0) > 0 && (
                                  <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                                      <Shield size={10} className="mr-1" />{" "}
                                      Inherited from {formState.role} Role
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {roles
                                        .find((r) => r.name === formState.role)
                                        ?.products?.map((p) => (
                                          <span
                                            key={p}
                                            className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 border border-slate-100 flex items-center gap-1"
                                          >
                                            <CheckCircle2
                                              size={10}
                                              className="text-emerald-500"
                                            />{" "}
                                            {p}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          {(mode !== "hospital_staff" ||
                            formState.role === "Sales" ||
                            formState.role === "Manager" ||
                            formState.role === "Sales Head") && (
                            <>
                              {/* Location Config (Multi-select) */}
                              <div className="space-y-2 md:col-span-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Zone Mapping (Multi-select)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allZones = [
                                        "North",
                                        "South",
                                        "East",
                                        "West",
                                        "Central",
                                      ];
                                      setFormState((prev) => ({
                                        ...prev,
                                        zones:
                                          prev.zones.length === allZones.length
                                            ? []
                                            : allZones,
                                      }));
                                    }}
                                    className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                                    disabled={isViewMode}
                                  >
                                    {formState.zones.length === 5
                                      ? "Deselect All"
                                      : "Select All"}
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                                  {[
                                    "North",
                                    "South",
                                    "East",
                                    "West",
                                    "Central",
                                  ].map((zone) => (
                                    <label
                                      key={zone}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formState.zones.includes(zone)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormState({
                                              ...formState,
                                              zones: [...formState.zones, zone],
                                            });
                                          } else {
                                            setFormState({
                                              ...formState,
                                              zones: formState.zones.filter(
                                                (z) => z !== zone,
                                              ),
                                            });
                                          }
                                        }}
                                        disabled={isViewMode}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-bold text-slate-700">
                                        {zone}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    State Mapping (Multi-select)
                                  </label>
                                  <div className="flex items-center space-x-4">
                                    <input
                                      type="text"
                                      placeholder="Search States..."
                                      value={stateSearch ?? ""}
                                      onChange={(e) =>
                                        setStateSearch(e.target.value)
                                      }
                                      className="text-[10px] px-3 py-1 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormState((prev) => ({
                                          ...prev,
                                          states:
                                            prev.states.length ===
                                            INDIAN_STATES.length
                                              ? []
                                              : [...INDIAN_STATES],
                                        }));
                                      }}
                                      className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                                      disabled={isViewMode}
                                    >
                                      {formState.states.length ===
                                      INDIAN_STATES.length
                                        ? "Deselect All"
                                        : "Select All"}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                                  {INDIAN_STATES.filter((s) =>
                                    s
                                      .toLowerCase()
                                      .includes(stateSearch.toLowerCase()),
                                  ).map((state) => (
                                    <label
                                      key={state}
                                      className="flex items-center gap-2 cursor-pointer w-1/3 min-w-[150px]"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formState.states.includes(
                                          state,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormState({
                                              ...formState,
                                              states: [
                                                ...formState.states,
                                                state,
                                              ],
                                            });
                                          } else {
                                            setFormState({
                                              ...formState,
                                              states: formState.states.filter(
                                                (s) => s !== state,
                                              ),
                                            });
                                          }
                                        }}
                                        disabled={isViewMode}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-bold text-slate-700 truncate">
                                        {state}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    District Mapping (Multi-select)
                                  </label>
                                  <div className="flex items-center space-x-4">
                                    <input
                                      type="text"
                                      placeholder="Search Districts..."
                                      value={districtSearch ?? ""}
                                      onChange={(e) =>
                                        setDistrictSearch(e.target.value)
                                      }
                                      className="text-[10px] px-3 py-1 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const allAvailableDistricts =
                                          formState.states.flatMap(
                                            (state) =>
                                              DISTRICTS_BY_STATE[state] || [],
                                          );
                                        setFormState((prev) => ({
                                          ...prev,
                                          districts:
                                            prev.districts.length ===
                                            allAvailableDistricts.length
                                              ? []
                                              : [...allAvailableDistricts],
                                        }));
                                      }}
                                      className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                                      disabled={isViewMode}
                                    >
                                      {formState.districts.length > 0 &&
                                      formState.districts.length ===
                                        formState.states.flatMap(
                                          (state) =>
                                            DISTRICTS_BY_STATE[state] || [],
                                        ).length
                                        ? "Deselect All"
                                        : "Select All"}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-xl max-h-60 overflow-y-auto custom-scrollbar">
                                  {formState.states
                                    .flatMap(
                                      (state) =>
                                        DISTRICTS_BY_STATE[state] || [],
                                    )
                                    .filter((d) =>
                                      d
                                        .toLowerCase()
                                        .includes(districtSearch.toLowerCase()),
                                    )
                                    .map((district, idx) => (
                                      <label
                                        key={`${district}-${idx}`}
                                        className="flex items-center gap-2 cursor-pointer w-[30%] min-w-[180px] p-1 hover:bg-slate-50 rounded transition-colors"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={formState.districts.includes(
                                            district,
                                          )}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setFormState({
                                                ...formState,
                                                districts: [
                                                  ...formState.districts,
                                                  district,
                                                ],
                                              });
                                            } else {
                                              setFormState({
                                                ...formState,
                                                districts:
                                                  formState.districts.filter(
                                                    (c) => c !== district,
                                                  ),
                                              });
                                            }
                                          }}
                                          disabled={isViewMode}
                                          className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-[11px] font-bold text-slate-700 truncate">
                                          {district}
                                        </span>
                                      </label>
                                    ))}
                                  {formState.states.length === 0 && (
                                    <div className="w-full py-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                                      Please select at least one state first to
                                      see districts
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  {/* HOSPITAL IDENTITY - Only for Partner Mode */}
                  {effectiveMode === "hospital_partner" &&
                    entityType !== "User" && (
                      <div className="space-y-6">
                        <h3 className="text-sm font-black text-slate-800 uppercase flex items-center justify-between">
                          <div className="flex items-center">
                            <Building
                              size={16}
                              className="mr-2 text-blue-500"
                            />{" "}
                            Hospital Identity
                          </div>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputGroup
                            label={
                              entityType === "Partner"
                                ? "Partner Name"
                                : "Partner/Hospital Name"
                            }
                            value={formState.hospitalName}
                            onChange={(v) =>
                              setFormState({ ...formState, hospitalName: v })
                            }
                            placeholder={
                              entityType === "Partner"
                                ? "e.g. HealthCare Solutions Pvt Ltd"
                                : "e.g. City Care Hospital"
                            }
                            disabled={isViewMode}
                          />
                          <InputGroup
                            label="Rohini ID"
                            value={formState.rohiniId}
                            onChange={(v) =>
                              setFormState({ ...formState, rohiniId: v })
                            }
                            placeholder="ROH-XXXX"
                            disabled={isViewMode}
                          />

                          {/* Location Config */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                State
                              </label>
                              <div className="relative">
                                <select
                                  value={formState.state ?? ""}
                                  onChange={(e) =>
                                    handleStateChange(e.target.value)
                                  }
                                  disabled={isViewMode}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm appearance-none disabled:bg-slate-100"
                                >
                                  <option value="">Select State</option>
                                  {INDIAN_STATES.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                District
                              </label>
                              <div className="relative">
                                <select
                                  value={formState.district ?? ""}
                                  onChange={(e) =>
                                    setFormState({
                                      ...formState,
                                      district: e.target.value,
                                    })
                                  }
                                  disabled={isViewMode || !formState.state}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm appearance-none disabled:bg-slate-100"
                                >
                                  <option value="">Select District</option>
                                  {formState.state &&
                                    DISTRICTS_BY_STATE[formState.state]?.map(
                                      (d) => (
                                        <option key={d} value={d}>
                                          {d}
                                        </option>
                                      ),
                                    )}
                                </select>
                              </div>
                            </div>
                          </div>
                          <InputGroup
                            label="Zone (Auto)"
                            value={formState.zone}
                            disabled={true}
                            placeholder="Auto-detected"
                          />

                          <InputGroup
                            label="Official Email ID"
                            value={formState.emailId}
                            onChange={handleEmailChange}
                            type="email"
                            disabled={isViewMode}
                          />
                          <InputGroup
                            label="Official Mobile No"
                            value={formState.mobileNo}
                            onChange={(v) =>
                              setFormState({ ...formState, mobileNo: v })
                            }
                            type="number"
                            disabled={isViewMode}
                          />
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                              Address
                            </label>
                            <textarea
                              value={formState.address ?? ""}
                              onChange={(e) =>
                                setFormState({
                                  ...formState,
                                  address: e.target.value,
                                })
                              }
                              disabled={isViewMode}
                              className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none resize-none h-24 disabled:bg-slate-100 disabled:text-slate-500"
                              placeholder="Full Address..."
                            />
                          </div>
                          {entityType === "Partner" && (
                            <div className="md:col-span-2 space-y-4">
                              <ProductSelector
                                selected={formState.products}
                                available={targetHospitalProducts}
                                onChange={(p) =>
                                  setFormState({ ...formState, products: p })
                                }
                                disabled={isViewMode}
                              />
                              {roles &&
                                formState.role &&
                                roles.find((r) => r.name === formState.role)
                                  ?.products &&
                                (roles.find((r) => r.name === formState.role)
                                  ?.products?.length ?? 0) > 0 && (
                                  <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                                      <Shield size={10} className="mr-1" />{" "}
                                      Inherited from {formState.role} Role
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {roles
                                        .find((r) => r.name === formState.role)
                                        ?.products?.map((p) => (
                                          <span
                                            key={p}
                                            className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 border border-slate-100 flex items-center gap-1"
                                          >
                                            <CheckCircle2
                                              size={10}
                                              className="text-emerald-500"
                                            />{" "}
                                            {p}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* STAFF / CONTACT DETAILS */}
                  {entityType !== "User" && (
                    <div className="space-y-6 pt-6 border-t border-slate-200">
                      <h3 className="text-sm font-black text-slate-800 uppercase flex items-center">
                        <UserIcon size={16} className="mr-2 text-indigo-500" />{" "}
                        {effectiveMode === "hospital_partner"
                          ? "Key Contacts"
                          : "Staff Details"}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup
                          label={
                            effectiveMode === "hospital_partner"
                              ? entityType === "Partner"
                                ? "SPOC Person Name"
                                : "TPA Person Name"
                              : "Staff Name"
                          }
                          value={formState.tpaPersonName}
                          onChange={(v) =>
                            setFormState({ ...formState, tpaPersonName: v })
                          }
                          disabled={isViewMode}
                        />
                        <InputGroup
                          label={
                            effectiveMode === "hospital_partner"
                              ? entityType === "Partner"
                                ? "Contact Number"
                                : "TPA Mobile No"
                              : "Mobile Number"
                          }
                          value={formState.tpaPersonMobile}
                          onChange={(v) =>
                            setFormState({ ...formState, tpaPersonMobile: v })
                          }
                          type="number"
                          disabled={isViewMode}
                        />

                        {/* Doctor Details - Only show if Entity is NOT Partner */}
                        {effectiveMode === "hospital_partner" &&
                          entityType !== "Partner" && (
                            <>
                              <InputGroup
                                label="Treating Dr. Name"
                                value={formState.doctorName}
                                onChange={(v) =>
                                  setFormState({ ...formState, doctorName: v })
                                }
                                disabled={isViewMode}
                              />
                              <InputGroup
                                label="Dr. Mobile No"
                                value={formState.doctorMobileNo}
                                onChange={(v) =>
                                  setFormState({
                                    ...formState,
                                    doctorMobileNo: v,
                                  })
                                }
                                type="number"
                                disabled={isViewMode}
                              />
                            </>
                          )}

                        {effectiveMode === "hospital_partner" &&
                          entityType === "Partner" && (
                            <InputGroup
                              label="Email ID"
                              value={formState.emailId}
                              onChange={handleEmailChange}
                              type="email"
                              disabled={isViewMode}
                            />
                          )}

                        {effectiveMode === "hospital_staff" && (
                          <InputGroup
                            label="Email ID"
                            value={formState.emailId}
                            onChange={handleEmailChange}
                            type="email"
                            disabled={isViewMode}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Role & Login */}
                  <div className="space-y-6 pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-black text-slate-800 uppercase flex items-center">
                      <Key size={16} className="mr-2 text-emerald-500" />{" "}
                      Credentials & Role
                    </h3>

                    {canManageBranches && mode === "hospital_staff" && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Select Hospital
                        </label>
                        <div className="relative">
                          <select
                            value={targetHospitalId ?? ""}
                            onChange={(e) =>
                              setTargetHospitalId(e.target.value)
                            }
                            disabled={isViewMode}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm appearance-none disabled:bg-slate-100"
                          >
                            <option value="">Select Hospital</option>
                            {managedHospitals.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.hospitalName}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            ▼
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Role Selection (Enabled for both modes as requested) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Assigned Role
                      </label>
                      <div className="relative">
                        <select
                          value={formState.role ?? ""}
                          onChange={(e) =>
                            setFormState({ ...formState, role: e.target.value })
                          }
                          disabled={isViewMode}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm appearance-none disabled:bg-slate-100"
                        >
                          {availableRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          ▼
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <InputGroup
                        label="Login ID / Username"
                        value={formState.loginId}
                        onChange={(v) =>
                          setFormState({ ...formState, loginId: v })
                        }
                        disabled={isViewMode}
                        placeholder="Unique Login ID"
                        autoComplete="username"
                      />
                      <div className="relative">
                        <InputGroup
                          label="Password"
                          value={formState.password}
                          onChange={(v) =>
                            setFormState({ ...formState, password: v })
                          }
                          type={showPassword ? "text" : "password"}
                          disabled={isViewMode}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-[34px] text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      <InputGroup
                        label="Re-enter Password"
                        value={formState.confirmPassword}
                        onChange={(v) =>
                          setFormState({ ...formState, confirmPassword: v })
                        }
                        type="password"
                        disabled={isViewMode}
                        autoComplete="new-password"
                      />
                    </div>
                    {error && (
                      <p className="text-xs font-bold text-rose-500 flex items-center">
                        <AlertCircle size={14} className="mr-1" /> {error}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Other Tabs (Payers, Assets, Pricing) only for Partner Mode */}
              {activeTab === "payers" &&
                effectiveMode === "hospital_partner" && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-800 uppercase">
                        Insurance Tie-Ups
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Configure Portal Credentials & MOUs
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {formState.payerConfigs.map((payer, idx) => (
                        <div
                          key={payer.name}
                          className={`p-6 rounded-2xl border transition-all ${payer.hasTieUp ? "bg-blue-50/30 border-blue-200 shadow-md" : "bg-white border-slate-100 hover:border-slate-200"}`}
                        >
                          {/* Simplified Payer Config Rendering */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${payer.hasTieUp ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}
                              >
                                {payer.name.charAt(0)}
                              </div>
                              <span
                                className={`text-sm font-black uppercase ${payer.hasTieUp ? "text-blue-900" : "text-slate-500"}`}
                              >
                                {payer.name}
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={payer.hasTieUp}
                                disabled={isViewMode}
                                onChange={(e) => {
                                  const newConfigs = [
                                    ...formState.payerConfigs,
                                  ];
                                  newConfigs[idx].hasTieUp = e.target.checked;
                                  setFormState({
                                    ...formState,
                                    payerConfigs: newConfigs,
                                  });
                                }}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          {payer.hasTieUp && (
                            <div className="space-y-4 mt-4 pt-4 border-t border-slate-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputGroup
                                  label="Portal User ID"
                                  value={payer.portalUser}
                                  onChange={(v) => {
                                    const newConfigs = [
                                      ...formState.payerConfigs,
                                    ];
                                    newConfigs[idx].portalUser = v;
                                    setFormState({
                                      ...formState,
                                      payerConfigs: newConfigs,
                                    });
                                  }}
                                  small
                                  disabled={isViewMode}
                                />
                                <InputGroup
                                  label="Password"
                                  type="password"
                                  value={payer.portalPass}
                                  onChange={(v) => {
                                    const newConfigs = [
                                      ...formState.payerConfigs,
                                    ];
                                    newConfigs[idx].portalPass = v;
                                    setFormState({
                                      ...formState,
                                      payerConfigs: newConfigs,
                                    });
                                  }}
                                  small
                                  disabled={isViewMode}
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputGroup
                                  label="MOU Start Date"
                                  type="date"
                                  value={payer.startDate}
                                  onChange={(v) => {
                                    const newConfigs = [
                                      ...formState.payerConfigs,
                                    ];
                                    newConfigs[idx].startDate = v;
                                    setFormState({
                                      ...formState,
                                      payerConfigs: newConfigs,
                                    });
                                  }}
                                  onBlur={() =>
                                    validateDateOnBlur(
                                      "startDate",
                                      payer.startDate,
                                      idx,
                                    )
                                  }
                                  small
                                  disabled={isViewMode}
                                />
                                <InputGroup
                                  label="MOU End Date"
                                  type="date"
                                  value={payer.endDate}
                                  onChange={(v) => {
                                    const newConfigs = [
                                      ...formState.payerConfigs,
                                    ];
                                    newConfigs[idx].endDate = v;
                                    setFormState({
                                      ...formState,
                                      payerConfigs: newConfigs,
                                    });
                                  }}
                                  onBlur={() =>
                                    validateDateOnBlur(
                                      "endDate",
                                      payer.endDate,
                                      idx,
                                    )
                                  }
                                  small
                                  disabled={isViewMode}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                  Rate List / Tariff
                                </label>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center justify-center px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-all text-[10px] font-bold uppercase text-slate-600">
                                    <Upload size={14} className="mr-2" /> Upload
                                    File
                                    <input
                                      type="file"
                                      className="hidden"
                                      disabled={isViewMode}
                                      onChange={(e) =>
                                        handleRateListUpload(idx, e)
                                      }
                                    />
                                  </label>
                                  {payer.linkedRateList && (
                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                                      <CheckCircle2
                                        size={12}
                                        className="mr-1"
                                      />{" "}
                                      {payer.linkedRateList}
                                    </span>
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

              {/* ASSETS TAB */}
              {activeTab === "assets" &&
                effectiveMode === "hospital_partner" && (
                  <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-800 uppercase">
                        Digital Assets
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Manage Official Stamps & Seals
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Hospital Seal */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Official Hospital Seal
                        </p>
                        <div className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden relative">
                          {formState.hospitalSeal ? (
                            <img
                              src={formState.hospitalSeal}
                              alt="Seal"
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Building className="text-slate-300" size={32} />
                          )}
                        </div>
                        <label className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-lg cursor-pointer hover:bg-blue-100 transition-all">
                          Upload Seal
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            disabled={isViewMode}
                            onChange={(e) =>
                              handleFileUpload("hospitalSeal", e)
                            }
                          />
                        </label>
                      </div>

                      {/* Doctor Stamp */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Doctor Signature Stamp
                        </p>
                        <div className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden relative">
                          {formState.doctorStamp ? (
                            <img
                              src={formState.doctorStamp}
                              alt="Stamp"
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Stethoscope className="text-slate-300" size={32} />
                          )}
                        </div>
                        <label className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-lg cursor-pointer hover:bg-blue-100 transition-all">
                          Upload Stamp
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            disabled={isViewMode}
                            onChange={(e) => handleFileUpload("doctorStamp", e)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

              {/* VALUE ADDED SERVICE TAB */}
              {activeTab === "value_added_service" &&
                (hasVASAccess || effectiveMode === "hospital_partner") && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-800 uppercase">
                        Value Added Service
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Configure Service Flow
                      </p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">


                      {/* Specific Value Added Services */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          {
                            key: "hospitalManageEnabled",
                            label: "Hospital Management",
                            icon: Building,
                            color: "text-indigo-600",
                            bg: "bg-indigo-50",
                          },
                          {
                            key: "kypEnabled",
                            label: "Know Your Policy (KYP)",
                            icon: FileText,
                            color: "text-maroon-600",
                            bg: "bg-maroon-50",
                          },
                          {
                            key: "rpaEnabled",
                            label: "RPA Automation",
                            icon: Zap,
                            color: "text-amber-600",
                            bg: "bg-amber-50",
                          },
                          {
                            key: "aiInsightsEnabled",
                            label: "AI Insights",
                            icon: Sparkles,
                            color: "text-purple-600",
                            bg: "bg-purple-50",
                          },
                          {
                            key: "digitalAssetsEnabled",
                            label: "Digital Assets",
                            icon: HardDrive,
                            color: "text-blue-600",
                            bg: "bg-blue-50",
                          },
                          {
                            key: "nhcxEnabled",
                            label: "NHCX Onboarding",
                            icon: Globe2,
                            color: "text-emerald-600",
                            bg: "bg-emerald-50",
                          },
                          {
                            key: "liveClaimsTrackerEnabled",
                            label: "Live Claims Tracker",
                            icon: Monitor,
                            color: "text-rose-600",
                            bg: "bg-rose-50",
                          },
                        ].map((service) => (
                          <div
                            key={service.key}
                            className={`p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-all`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-10 h-10 ${service.bg} ${service.color} rounded-xl flex items-center justify-center`}
                              >
                                <service.icon size={20} />
                              </div>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                {service.label}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                !isViewMode &&
                                setFormState((prev) => ({
                                  ...prev,
                                  valueAddedServices: {
                                    ...prev.valueAddedServices,
                                    [service.key]:
                                      !prev.valueAddedServices[
                                        service.key as keyof ValueAddedServiceConfig
                                      ],
                                  },
                                }))
                              }
                              className={`w-12 h-6 rounded-full transition-all relative ${formState.valueAddedServices?.[service.key as keyof ValueAddedServiceConfig] ? "bg-emerald-500" : "bg-slate-300"}`}
                            >
                              <div
                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${formState.valueAddedServices?.[service.key as keyof ValueAddedServiceConfig] ? "right-0.5" : "left-0.5"}`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Standalone Medical Scrutiny Card - styled exactly like the enclosed screenshot */}
                      <div className="bg-slate-50/40 p-6 px-10 rounded-full border border-slate-200/60 flex items-center justify-between shadow-sm mt-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#0f172a] uppercase tracking-wider">
                            Medical Scrutiny
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Route claims to the medical underwriting team during workflow
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            !isViewMode &&
                            setFormState((prev) => ({
                              ...prev,
                              valueAddedServices: {
                                ...prev.valueAddedServices,
                                medicalScrutinyRequired: !prev.valueAddedServices?.medicalScrutinyRequired,
                              },
                            }))
                          }
                          className={`w-14 h-7 rounded-full transition-all relative shrink-0 ${
                            formState.valueAddedServices?.medicalScrutinyRequired ? "bg-[#00c58d]" : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                              formState.valueAddedServices?.medicalScrutinyRequired ? "right-1" : "left-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              {/* PRICING / COMMERCIALS TAB */}
              {activeTab === "pricing" &&
                effectiveMode === "hospital_partner" && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-800 uppercase">
                        Commercial Agreement
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Billing Terms & Renewals
                      </p>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <InputGroup
                            label="Invoice Email Address"
                            type="email"
                            value={formState.invoiceEmail ?? ""}
                            onChange={(v: any) =>
                              setFormState({ ...formState, invoiceEmail: v })
                            }
                            disabled={isViewMode}
                            placeholder="e.g. billing@hospital.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Agreement Type
                          </label>
                          <div className="relative">
                            <select
                              value={formState.agreementType ?? ""}
                              onChange={(e) =>
                                setFormState({
                                  ...formState,
                                  agreementType: e.target
                                    .value as AgreementType,
                                })
                              }
                              disabled={isViewMode}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none disabled:bg-slate-100"
                            >
                              <option value="Per Case">Per Case</option>
                              <option value="Monthly Billing">
                                Monthly Billing
                              </option>
                              <option value="Percentage">Percentage</option>
                            </select>
                            <ChevronRight
                              size={14}
                              className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none"
                            />
                          </div>
                        </div>
                        {formState.agreementType === "Monthly Billing" && (
                          <InputGroup
                            label="Agreement Value (INR / Month)"
                            type="number"
                            value={formState.agreementValue}
                            onChange={(v: any) =>
                              setFormState({ ...formState, agreementValue: v })
                            }
                            disabled={isViewMode}
                            placeholder="e.g. 50000"
                          />
                        )}
                        {formState.agreementType === "Percentage" && (
                          <>
                            <InputGroup
                              label="Agreement Value (%)"
                              type="number"
                              value={formState.agreementValue}
                              onChange={(v: any) =>
                                setFormState({ ...formState, agreementValue: v })
                              }
                              disabled={isViewMode}
                              placeholder="e.g. 2"
                            />
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Percentage Basis
                              </label>
                              <div className="relative">
                                <select
                                  value={formState.agreementPercentageBase ?? ""}
                                  onChange={(e) =>
                                    setFormState({
                                      ...formState,
                                      agreementPercentageBase: e.target.value as any,
                                    })
                                  }
                                  disabled={isViewMode}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none disabled:bg-slate-100"
                                >
                                  <option value="">-- Select Basis --</option>
                                  <option value="Final Approval Amount">Final Approval Amount</option>
                                  <option value="Settled Amount">Settled Amount</option>
                                </select>
                                <ChevronRight
                                  size={14}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {formState.agreementType === "Per Case" && (
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 mt-2 space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                Commercial Configuration Table
                              </span>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">
                                Map any of the 24 Claim Directory stages to
                                invoicing categories and rates
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-lg shadow-xs tracking-wider">
                                {(formState.agreementStageValues || []).length}{" "}
                                / 24 Stages Active
                              </span>
                            </div>
                          </div>

                          {/* Search & Filter Controls */}
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-sm">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <Search size={14} className="stroke-[2.5]" />
                              </div>
                              <input
                                type="text"
                                value={commercialSearch}
                                onChange={(e) =>
                                  setCommercialSearch(e.target.value)
                                }
                                placeholder="Search cashless stages..."
                                className="w-full bg-slate-50 hover:bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400"
                              />
                              {commercialSearch && (
                                <button
                                  onClick={() => setCommercialSearch("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Filters Row */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">
                                Filter:
                              </span>
                              {[
                                { label: "All Stages", value: "all" },
                                { label: "Active", value: "selected" },
                                { label: "Inactive", value: "unselected" },
                                {
                                  label: "Complete Process",
                                  value: "Complete Processing",
                                },
                                {
                                  label: "Rejected @ Discharge",
                                  value: "Rejected at Discharge",
                                },
                                {
                                  label: "Pre-Auth Cases",
                                  value: "Pre-Auth Case",
                                },
                              ].map((f) => (
                                <button
                                  key={f.value}
                                  type="button"
                                  onClick={() => setCommercialFilter(f.value)}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                                    commercialFilter === f.value
                                      ? "bg-slate-800 border-slate-800 text-white shadow-xs"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm max-h-[480px] overflow-y-auto w-full">
                            <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-slate-50 z-10 shadow-xs">
                                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                                  <th className="px-6 py-4 border-r border-slate-200 w-1/3">
                                    Cashless Stages (Validation)
                                  </th>
                                  <th className="px-6 py-4 border-r border-slate-200 w-1/3">
                                    Invoice Category Association
                                  </th>
                                  <th className="px-6 py-4 w-1/3 text-right pr-6">
                                    Invoice Value (INR)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(() => {
                                  const ALL_CLAIM_STAGES = [
                                    { label: "DRAFT", value: "Draft" },
                                    {
                                      label: "PENDING MEDICAL REVIEW",
                                      value: "Pending Medical Review",
                                    },
                                    {
                                      label: "PENDING MEDICAL TEAM",
                                      value: "Pending Medical Team",
                                    },
                                    {
                                      label: "MEDICAL QUERY RAISED",
                                      value: "Medical Query Raised",
                                    },
                                    {
                                      label: "MEDICAL QUERY REPLIED",
                                      value: "Medical Query Replied",
                                    },
                                    {
                                      label: "PRE AUTH INITIATED",
                                      value: "Pre Auth initiated",
                                    },
                                    {
                                      label: "PRE AUTH APPROVED",
                                      value: "Pre Auth Approved",
                                    },
                                    {
                                      label: "INITIAL QUERY PENDING",
                                      value: "Initial Query Pending",
                                    },
                                    {
                                      label: "QUERY REPLY DONE",
                                      value: "Query reply done",
                                    },
                                    {
                                      label: "PRE AUTH REJECTED",
                                      value: "Pre Auth Rejected",
                                    },
                                    {
                                      label: "ENHANCEMENT INITIATED",
                                      value: "Enhancement Initiated",
                                    },
                                    {
                                      label: "ENHANCEMENT APPROVED",
                                      value: "Enhancement Approved",
                                    },
                                    {
                                      label: "ENHANCEMENT QUERY RAISED",
                                      value: "Enhancement Query Raised",
                                    },
                                    {
                                      label: "ENHANCEMENT QUERY RESOLVED",
                                      value: "Enhancement Query Resolved",
                                    },
                                    {
                                      label: "ENHANCEMENT REJECTED",
                                      value: "Enhancement Rejected",
                                    },
                                    {
                                      label: "DISCHARGE INITIATED",
                                      value: "Discharge Initiated",
                                    },
                                    {
                                      label: "DISCHARGE QUERY RAISED",
                                      value: "Discharge Query Raised",
                                    },
                                    {
                                      label: "DISCHARGE QUERY REPLIED",
                                      value: "Discharge Query Replied",
                                    },
                                    {
                                      label: "DISCHARGE REJECTED",
                                      value: "Discharge Rejected",
                                    },
                                    {
                                      label: "DISCHARGED APPROVED",
                                      value: "Discharged Approved",
                                    },
                                    {
                                      label: "DISCHARGE RECONSIDERATION RAISED",
                                      value: "Discharge Reconsideration Raised",
                                    },
                                    {
                                      label:
                                        "DISCHARGE RECONSIDERATION APPROVED",
                                      value:
                                        "Discharge Reconsideration Approved",
                                    },
                                    {
                                      label: "FILE DISPATCH PENDING",
                                      value: "File Dispatch Pending",
                                    },
                                    {
                                      label: "COMPLETE SETTLEMENT",
                                      value: "Complete Settlement",
                                    },
                                  ];

                                  const filteredStages =
                                    ALL_CLAIM_STAGES.filter((stageItem) => {
                                      // Search Filter
                                      if (commercialSearch) {
                                        const term =
                                          commercialSearch.toLowerCase();
                                        const matchesSearch =
                                          stageItem.label
                                            .toLowerCase()
                                            .includes(term) ||
                                          stageItem.value
                                            .toLowerCase()
                                            .includes(term);
                                        if (!matchesSearch) return false;
                                      }

                                      // Status Filter
                                      const stageEntry =
                                        formState.agreementStageValues?.find(
                                          (sv) => sv.stage === stageItem.value,
                                        );
                                      const isSelected = !!stageEntry;

                                      if (commercialFilter === "selected")
                                        return isSelected;
                                      if (commercialFilter === "unselected")
                                        return !isSelected;
                                      if (
                                        [
                                          "Complete Processing",
                                          "Rejected at Discharge",
                                          "Pre-Auth Case",
                                        ].includes(commercialFilter)
                                      ) {
                                        return (
                                          isSelected &&
                                          stageEntry?.category ===
                                            commercialFilter
                                        );
                                      }

                                      return true;
                                    });

                                  if (filteredStages.length === 0) {
                                    return (
                                      <tr>
                                        <td
                                          colSpan={3}
                                          className="px-6 py-12 text-center"
                                        >
                                          <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <AlertCircle
                                              size={24}
                                              className="stroke-[2] text-slate-300"
                                            />
                                            <span className="text-xs font-black uppercase tracking-wider">
                                              No cashless stages match filters
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                              Try clearing search or changing
                                              filtration badges
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return filteredStages.map((stageItem) => {
                                    const stageEntry =
                                      formState.agreementStageValues?.find(
                                        (sv) => sv.stage === stageItem.value,
                                      );
                                    const isSelected = !!stageEntry;
                                    const valueAmount = stageEntry
                                      ? stageEntry.value
                                      : "";
                                    const activeCategory =
                                      stageEntry?.category || "";

                                    const handleCheckboxToggle = () => {
                                      if (isViewMode) return;
                                      let updatedStages = [
                                        ...(formState.agreementStageValues ||
                                          []),
                                      ];
                                      if (isSelected) {
                                        updatedStages = updatedStages.filter(
                                          (sv) => sv.stage !== stageItem.value,
                                        );
                                      } else {
                                        // Default category is set to 'Complete Processing' on toggle, user can change
                                        updatedStages.push({
                                          stage: stageItem.value,
                                          value: 0,
                                          category: "Complete Processing",
                                        });
                                      }

                                      // Synchronize the distinct categories that are actively selected in state
                                      const distinctCats = Array.from(
                                        new Set(
                                          updatedStages
                                            .map((s) => s.category)
                                            .filter(Boolean),
                                        ),
                                      );

                                      setFormState({
                                        ...formState,
                                        agreementStageValues: updatedStages,
                                        agreementInvoiceCategories:
                                          distinctCats,
                                      });
                                    };

                                    const handleCategoryDropdownChange = (
                                      newCat,
                                    ) => {
                                      if (isViewMode || !isSelected) return;
                                      const updatedStages = (
                                        formState.agreementStageValues || []
                                      ).map((sv) => {
                                        if (sv.stage === stageItem.value) {
                                          return { ...sv, category: newCat };
                                        }
                                        return sv;
                                      });

                                      const distinctCats = Array.from(
                                        new Set(
                                          updatedStages
                                            .map((s) => s.category)
                                            .filter(Boolean),
                                        ),
                                      );

                                      setFormState({
                                        ...formState,
                                        agreementStageValues: updatedStages,
                                        agreementInvoiceCategories:
                                          distinctCats,
                                      });
                                    };

                                    const handleValueChange = (valStr) => {
                                      if (isViewMode) return;
                                      const numVal = Number(valStr) || 0;
                                      const updatedStages = (
                                        formState.agreementStageValues || []
                                      ).map((sv) => {
                                        if (sv.stage === stageItem.value) {
                                          return { ...sv, value: numVal };
                                        }
                                        return sv;
                                      });
                                      setFormState({
                                        ...formState,
                                        agreementStageValues: updatedStages,
                                      });
                                    };

                                    // Theme colors based on invoice category for beautiful distinct badges
                                    let catBadgeColor =
                                      "text-slate-450 bg-slate-50 border-slate-150";
                                    if (isSelected) {
                                      if (
                                        activeCategory === "Complete Processing"
                                      ) {
                                        catBadgeColor =
                                          "text-emerald-800 bg-emerald-50 border-emerald-150";
                                      } else if (
                                        activeCategory ===
                                        "Rejected at Discharge"
                                      ) {
                                        catBadgeColor =
                                          "text-amber-800 bg-amber-50 border-amber-150";
                                      } else if (
                                        activeCategory === "Pre-Auth Case"
                                      ) {
                                        catBadgeColor =
                                          "text-sky-800 bg-sky-50 border-sky-150";
                                      }
                                    }

                                    return (
                                      <tr
                                        key={stageItem.value}
                                        className={`hover:bg-slate-50/40 transition-colors ${isSelected ? "bg-indigo-50/10" : ""}`}
                                      >
                                        {/* Column 1: Cashless Stages (Validation) */}
                                        <td className="px-6 py-4 border-r border-slate-200">
                                          <button
                                            type="button"
                                            disabled={isViewMode}
                                            onClick={handleCheckboxToggle}
                                            className="flex items-center gap-3 text-left w-full group"
                                          >
                                            <div
                                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                                                isSelected
                                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                                  : "border-slate-300 group-hover:border-slate-400 bg-white"
                                              }`}
                                            >
                                              {isSelected && (
                                                <Check
                                                  size={12}
                                                  className="stroke-[3]"
                                                />
                                              )}
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                                {stageItem.label}
                                              </span>
                                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                {stageItem.value}
                                              </span>
                                            </div>
                                          </button>
                                        </td>

                                        {/* Column 2: Invoice Category Dropdown Selector */}
                                        <td className="px-6 py-4 border-r border-slate-200">
                                          {isSelected ? (
                                            <div className="flex items-center gap-2">
                                              <select
                                                disabled={isViewMode}
                                                value={activeCategory}
                                                onChange={(e) =>
                                                  handleCategoryDropdownChange(
                                                    e.target.value,
                                                  )
                                                }
                                                className={`text-[10px] font-black uppercase tracking-wider px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer ${catBadgeColor}`}
                                              >
                                                <option value="Complete Processing">
                                                  Complete Processing
                                                </option>
                                                <option value="Rejected at Discharge">
                                                  Rejected at Discharge
                                                </option>
                                                <option value="Pre-Auth Case">
                                                  Pre-Auth Case
                                                </option>
                                              </select>
                                              <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1.5 opacity-40">
                                              <select
                                                disabled
                                                value=""
                                                onChange={() => {}}
                                                className="text-[10px] font-black uppercase tracking-wider px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 outline-none"
                                              >
                                                <option value="">
                                                  Stage Inactive
                                                </option>
                                              </select>
                                            </div>
                                          )}
                                        </td>

                                        {/* Column 3: Invoice Value (INR) */}
                                        <td className="px-6 py-4 bg-slate-50/10 text-right">
                                          {isSelected ? (
                                            <div className="w-full max-w-[160px] animate-in fade-in zoom-in-95 duration-200 relative ml-auto pr-2">
                                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                                                ₹
                                              </div>
                                              <input
                                                type="number"
                                                disabled={isViewMode}
                                                value={valueAmount}
                                                onChange={(e) =>
                                                  handleValueChange(
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="Rate (₹)"
                                                className="w-full bg-white border border-slate-250 rounded-xl pl-7 pr-4 py-2.5 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-slate-300 text-right shadow-xs"
                                              />
                                            </div>
                                          ) : (
                                            <div className="text-right pr-4">
                                              <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-widest italic">
                                                Stage Muted
                                              </span>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>

                          {/* Validation Summary & Guidance banner */}
                          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-3xs">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                                <CheckCircle2
                                  size={18}
                                  className="stroke-[2.5]"
                                />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase text-slate-700 tracking-tight">
                                  Invoice Category Sync Active
                                </p>
                                <p className="text-[10px] font-bold text-slate-400">
                                  Selecting stages automatically registers
                                  active invoicing categories.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {[
                                "Complete Processing",
                                "Rejected at Discharge",
                                "Pre-Auth Case",
                              ].map((cat) => {
                                const count = (
                                  formState.agreementStageValues || []
                                ).filter((sv) => sv.category === cat).length;
                                const isCatActive = count > 0;
                                return (
                                  <span
                                    key={cat}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                                      isCatActive
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-3xs"
                                        : "bg-slate-50 border-slate-250 text-slate-400 opacity-60"
                                    }`}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${isCatActive ? "bg-emerald-500" : "bg-slate-300"}`}
                                    />
                                    <span>
                                      {cat} (${count})
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup
                          label="Agreement Start Date"
                          type="date"
                          value={formState.agreementStartDate}
                          onChange={(v) =>
                            setFormState({
                              ...formState,
                              agreementStartDate: v,
                            })
                          }
                          onBlur={() =>
                            validateDateOnBlur(
                              "agreementStartDate",
                              formState.agreementStartDate,
                            )
                          }
                          disabled={isViewMode}
                        />
                        <InputGroup
                          label="Renewal Date"
                          type="date"
                          value={formState.agreementRenewalDate}
                          onChange={(v) =>
                            setFormState({
                              ...formState,
                              agreementRenewalDate: v,
                            })
                          }
                          onBlur={() =>
                            validateDateOnBlur(
                              "agreementRenewalDate",
                              formState.agreementRenewalDate,
                            )
                          }
                          disabled={isViewMode}
                        />
                      </div>
                      <div className="pt-6 border-t border-slate-100 space-y-4">
                        <ProductSelector
                          selected={formState.products}
                          available={targetHospitalProducts}
                          onChange={(p) =>
                            setFormState({ ...formState, products: p })
                          }
                          disabled={isViewMode}
                        />
                        {roles &&
                          formState.role &&
                          roles.find((r) => r.name === formState.role)
                            ?.products &&
                          (roles.find((r) => r.name === formState.role)
                            ?.products?.length ?? 0) > 0 && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                                <Shield size={10} className="mr-1" /> Inherited
                                from {formState.role} Role
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {roles
                                  .find((r) => r.name === formState.role)
                                  ?.products?.map((p) => (
                                    <span
                                      key={p}
                                      className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 border border-slate-100 flex items-center gap-1"
                                    >
                                      <CheckCircle2
                                        size={10}
                                        className="text-emerald-500"
                                      />{" "}
                                      {p}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

              {activeTab === "access" && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2rem] text-center max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-white text-blue-600 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6">
                      <ShieldCheck size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
                      Role-Based Access Control
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mb-8">
                      Access control is now centrally managed via roles. The
                      permissions for this user will be automatically inherited
                      from the assigned role:{" "}
                      <strong className="text-blue-600">
                        "{formState.role}"
                      </strong>
                      .
                    </p>
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Lock size={14} />
                        <span>Manual permission overrides are disabled</span>
                      </div>
                      <p className="text-[9px] text-slate-400 italic">
                        To modify permissions for this role, please visit the
                        Roles Management module in System Admin.
                      </p>
                    </div>
                  </div>

                  {/* CRM Hospital Assignment - Still relevant as it's user-specific, not role-specific */}
                  {(mode === "hospital_partner" ||
                    [
                      "Claims Processing Executive",
                      "CRM Manager",
                      "Sales Manager",
                      "Reconciliation Manager",
                      "Medical Manager",
                      "Medical Head",
                      "KYP Head",
                      "Department Head",
                      "Manager",
                      "Operations Head",
                      "Sales Head",
                    ].includes(formState.role)) && (
                    <div className="space-y-4 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
                        Hospitals Assignment (CRM Visibility)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users
                          .filter(
                            (u) =>
                              (u.entityType ||
                                (u.isAdmin ? "Hospital" : "User")) ===
                              "Hospital",
                          )
                          .map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <Hospital
                                  size={16}
                                  className="text-slate-400"
                                />
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold uppercase text-slate-700 truncate max-w-[150px]">
                                    {h.hospitalName}
                                  </span>
                                  <span className="text-[9px] font-medium text-slate-400">
                                    {h.district}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  !isViewMode && toggleHospitalAssignment(h.id)
                                }
                                disabled={isViewMode}
                                className={`w-10 h-6 rounded-full p-1 transition-all flex items-center ${formState.assignedHospitalIds.includes(h.id) ? "bg-blue-600 justify-end" : "bg-slate-200 justify-start"}`}
                              >
                                <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STATUS MANAGEMENT (Super Admin Only) - Global for all entities */}
            {isSuperAdmin && editingUserId && (
              <div className="px-10 pb-6">
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        Account Access Status
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Toggle active/inactive status for this entity
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (isViewMode) return;
                        const newStatus =
                          formState.status === "Active" ? "Inactive" : "Active";
                        setFormState({
                          ...formState,
                          status: newStatus as any,
                        });
                      }}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${formState.status === "Active" ? "bg-emerald-500" : "bg-slate-300"}`}
                      disabled={isViewMode}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${formState.status === "Active" ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {formState.status === "Inactive" && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <AlertTriangle size={12} />
                        Deactivation Reason *
                      </label>
                      <textarea
                        value={formState.statusReason || ""}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            statusReason: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-rose-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 shadow-sm"
                        placeholder="Please specify the reason for deactivation..."
                        rows={3}
                        disabled={isViewMode}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-between space-x-4 bg-white sticky bottom-0 z-20">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>

              <div className="flex space-x-4">
                {activeTab !== availableTabs[0] && (
                  <button
                    onClick={handlePrevStep}
                    className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center"
                  >
                    <ArrowLeft size={16} className="mr-2" /> Back
                  </button>
                )}

                {activeTab !== availableTabs[availableTabs.length - 1] ? (
                  <button
                    onClick={handleNextStep}
                    className="px-10 py-4 bg-[#000080] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center active:scale-95"
                  >
                    Next Step <ArrowRight size={16} className="ml-2" />
                  </button>
                ) : (
                  !isViewMode && (
                    <button
                      onClick={handleSaveUser}
                      className="px-10 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center active:scale-95 animate-pulse"
                    >
                      <Save size={18} className="mr-2" />
                      {editingUserId
                        ? "Update Details"
                        : effectiveMode === "hospital_partner"
                          ? isCreatingNewBranch
                            ? "Register Branch"
                            : "Create User / Partner / Hospital"
                          : "Create Staff"}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              Confirm Deletion
            </h2>
            <p className="text-slate-500 mb-8">
              Are you sure you want to delete this user? This action cannot be
              undone.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={confirmDeleteUser}
                className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
              >
                Delete User
              </button>
              <button
                onClick={cancelDeleteUser}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
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

const InputGroup = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  small,
  disabled,
  autoComplete,
}: any) => {
  const isMobile =
    label.toLowerCase().includes("mobile") ||
    label.toLowerCase().includes("phone") ||
    label.toLowerCase().includes("contact");
  const displayType = isMobile ? "text" : type;

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group">
        <input
          type={displayType}
          value={value ?? ""}
          onChange={(e) => {
            let val = e.target.value;
            if (isMobile) {
              val = val.replace(/\D/g, "").slice(0, 10);
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
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full bg-white border border-slate-200 rounded-xl px-4 ${small ? "py-2 text-xs" : "py-3.5 text-sm"} font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-500 ${type === "date" ? "cursor-pointer select-none" : ""}`}
        />
      </div>
    </div>
  );
};

export default UserManagement;
