
import React, { useState, useMemo, useEffect } from 'react';
import { FormField, ClaimStage, InsuranceEntity, Role, HospitalUser, RegionalContact, Claim } from '../types';
import ManageRoles from './ManageRoles';
import TataAigTemplate from './TataAigTemplate';
import StarHealthTemplate from './StarHealthTemplate';
import HdfcErgoTemplate from './HdfcErgoTemplate';
import IciciLombardTemplate from './IciciLombardTemplate';
import CareHealthTemplate from './CareHealthTemplate';
import AdityaBirlaTemplate from './AdityaBirlaTemplate';
import BajajAllianzTemplate from './BajajAllianzTemplate';
import GenericIrdaiTemplate from './GenericIrdaiTemplate';
import MediAssistTemplate from './MediAssistTemplate';
import CholaMsTemplate from './CholaMsTemplate';
import ManipalCignaTemplate from './ManipalCignaTemplate';
import CentralGeneraliTemplate from './CentralGeneraliTemplate';
import GoDigitTemplate from './GoDigitTemplate';
import IffcoTokioTemplate from './IffcoTokioTemplate';
import MagmaHdiTemplate from './MagmaHdiTemplate';
import RelianceGeneralTemplate from './RelianceGeneralTemplate';
import IndusindTemplate from './IndusindTemplate';
import NivaBupaTemplate from './NivaBupaTemplate';
import MdIndiaTemplate from './MdIndiaTemplate';
import MedsaveTemplate from './MedsaveTemplate';
import HealthIndiaTemplate from './HealthIndiaTemplate';
import VidalHealthTemplate from './VidalHealthTemplate';
import { fetchEntityContactDetails } from '../services/geminiService';
import EmailTemplatesManager from './EmailTemplatesManager';
import ManualDiagnosisReview from './ManualDiagnosisReview';
import { 
  Plus, Trash2, Zap, Edit2, Search, Save, X, ShieldCheck, 
  Hospital, Banknote, Mail, Globe, 
  Loader2, Layers, FileCode, ChevronRight,
  LayoutTemplate, Eye, Settings, Building, ListFilter,
  Activity, Info, AlertCircle, ToggleRight, CreditCard,
  BriefcaseMedical, CheckCircle2, FlaskConical, Filter, IndianRupee,
  Maximize2, MapPin, Globe2, PlusCircle, Radio, Share2, ToggleLeft, RefreshCw, Link as LinkIcon, Key, Settings2, Code2, ShieldAlert, Landmark, FileText
} from 'lucide-react';

import AdminClaimsList from './AdminClaimsList';
import { INTEGRATIONS } from '../constants';
import { toast } from 'sonner';
import { configApi } from '../services/api';
import { ApiDocs } from './ApiDocs';
import { AuthConfig } from './AuthConfig';
import AutomatedReportingSystem from './AutomatedReportingSystem';
import NotificationManager from './NotificationManager';
import LiveClaimsTracker from './LiveClaimsTracker';
import { SystemAnnouncements } from './SystemAnnouncements';

interface AdminPanelProps {
  fields: FormField[];
  setFields: React.Dispatch<React.SetStateAction<FormField[]>>;
  stages: ClaimStage[];
  setStages: React.Dispatch<React.SetStateAction<ClaimStage[]>>;
  insurers: InsuranceEntity[];
  setInsurers: React.Dispatch<React.SetStateAction<InsuranceEntity[]>>;
  tpas: InsuranceEntity[];
  setTpas: React.Dispatch<React.SetStateAction<InsuranceEntity[]>>;
  config: any;
  setConfig: (cfg: any) => void;
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  hospitalUser: HospitalUser;
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  roomCategories: string[];
  setRoomCategories: React.Dispatch<React.SetStateAction<string[]>>;
  hospitals: HospitalUser[];
  hospitalUsers: HospitalUser[];
  permissions?: string[];
}

// FULL DATA SET - PAN INDIA STATES & DISTRICTS
export const INDIAN_STATES = [
  "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", 
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  "Andaman & Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chandigarh": ["Chandigarh"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Dadra & Nagar Haveli and Daman & Diu": ["Dadra & Nagar Haveli", "Daman", "Diu"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udepur", "Devbhumi Dwarka", "Dahod", "Dang", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul & Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jammu & Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Saraikela-Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Ladakh": ["Kargil", "Leh"],
  "Lakshadweep": ["Lakshadweep"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
  "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Noklak", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghapur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Keonjhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundargarh"],
  "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Sri Muktsar Sahib", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Buvangiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
};

export const ZONES_BY_STATE: Record<string, string> = {
  "Andaman & Nicobar Islands": "South", "Andhra Pradesh": "South", "Arunachal Pradesh": "East", "Assam": "East", "Bihar": "East", 
  "Chhattisgarh": "Central", "Chandigarh": "North", "Dadra & Nagar Haveli and Daman & Diu": "West", "Delhi": "North", 
  "Goa": "West", "Gujarat": "West", "Himachal Pradesh": "North", "Haryana": "North", "Jharkhand": "East", 
  "Jammu & Kashmir": "North", "Karnataka": "South", "Kerala": "South", "Ladakh": "North", "Lakshadweep": "South", "Meghalaya": "East", 
  "Maharashtra": "West", "Manipur": "East", "Madhya Pradesh": "Central", "Mizoram": "East", "Nagaland": "East", 
  "Odisha": "East", "Puducherry": "South", "Punjab": "North", "Rajasthan": "West", "Sikkim": "East", 
  "Tamil Nadu": "South", "Telangana": "South", "Tripura": "East", "Uttar Pradesh": "North", "Uttarakhand": "North", "West Bengal": "East"
};

const AVAILABLE_TEMPLATES = [
  "Generic IRDAI (Dashed)",
  "Star Health Standard",
  "Tata AIG Standard",
  "The New India Assurance Standard",
  "The Oriental Insurance Standard",
  "United India Insurance Standard",
  "National Insurance Standard",
  "HDFC ERGO Standard",
  "ICICI Lombard Standard",
  "Niva Bupa Health Insurance Standard",
  "Care Health Insurance Standard",
  "Acko General Insurance Standard",
  "Aditya Birla Health Insurance Standard",
  "Bajaj Allianz General Insurance Standard",
  "Cholamandalam MS Standard",
  "Manipal Cigna Standard",
  "Navi General Insurance Standard",
  "Edelweiss General Insurance Standard",
  "Central Generali Standard",
  "Go Digit Standard",
  "IFFCO TOKIO Standard",
  "Zurick Kotak Standard",
  "Liberty General Insurance Standard",
  "Magma HDI Standard",
  "Raheja QBE Standard",
  "SBI General Insurance Standard",
  "Shriram General Insurance Standard",
  "Universal Sompo Standard",
  "Zuno General Insurance Standard",
  "Max Life Insurance Standard",
  "HDFC Life Insurance Standard",
  "ICICI Prudential Life Standard",
  "Kotak Mahindra Life Standard",
  "LIC of India Standard",
  "Reliance Nippon Life Standard",
  "SBI Life Insurance Standard",
  "Medi Assist TPA Standard",
  "MDIndia Standard",
  "Medsave Standard",
  "HealthIndia Standard",
  "Vidal Health Standard"
];

const TabNav = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
  >
    {label}
  </button>
);

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  fields, setFields, 
  stages, setStages,
  insurers, setInsurers,
  tpas, setTpas,
  config, setConfig,
  roles, setRoles,
  hospitalUser,
  claims, setClaims,
  roomCategories, setRoomCategories,
  hospitals,
  hospitalUsers,
  permissions = []
}) => {
  const [activeTab, setActiveTab] = useState<'builder' | 'stages' | 'connectors' | 'logic' | 'roles' | 'financials' | 'email_templates' | 'claims_list' | 'diagnosis_review' | 'diagnosis_master' | 'room_categories' | 'integrations' | 'automated_reports' | 'notifications' | 'announcements'>('connectors');

  const tabPermissions: Record<string, string> = {
    connectors: 'sidebar_admin:sections:sys_connectors',
    builder: 'sidebar_admin:sections:sys_builder',
    stages: 'sidebar_admin:sections:sys_stages',
    roles: 'sidebar_admin:sections:sys_roles',
    financials: 'sidebar_admin:sections:sys_financials',
    claims_list: 'sidebar_admin:sections:sys_claims_list',
    logic: 'sidebar_admin:sections:sys_logic',
    email_templates: 'sidebar_admin:sections:sys_templates',
    diagnosis_master: 'sidebar_admin:sections:sys_diagnosis',
    room_categories: 'sidebar_admin:sections:sys_rooms',
    automated_reports: 'sidebar_admin:sections:sys_reports',
    integrations: 'sidebar_admin:sections:sys_integrations',
    notifications: 'sidebar_admin:sections:sys_notifications',
    announcements: 'sidebar_admin:sections:sys_announcements',
  };

  const canAccessTab = (tabKey: string) => {
    if (hospitalUser.role?.toUpperCase() === 'SUPER ADMIN' || hospitalUser.role?.toUpperCase() === 'ADMIN') return true;
    if (!permissions) return false;
    if (permissions.includes('all')) return true;

    // Fallback: If no granular System Admin sub-permissions are allocated, default to true 
    // to preserve expected legacy/default behavior.
    const hasAnyGranular = permissions.some(p => p.startsWith('sidebar_admin:sections:sys_'));
    if (!hasAnyGranular) return true;

    return permissions.includes(tabPermissions[tabKey]);
  };

  const visibleTabs = useMemo(() => {
    const tabs: { key: typeof activeTab; label: string }[] = [
      { key: 'connectors', label: 'Connectors' },
      { key: 'builder', label: 'Forms' },
      { key: 'stages', label: 'Stages' },
      { key: 'roles', label: 'Roles' },
      { key: 'financials', label: 'Financials' },
      { key: 'claims_list', label: 'Claims List' },
      { key: 'logic', label: 'Logic' },
      { key: 'email_templates', label: 'Email Templates' },
      { key: 'diagnosis_master', label: 'Diagnosis Master List' },
      { key: 'room_categories', label: 'Room Categories' },
      { key: 'automated_reports', label: 'Automated Reports' },
    ];

    if (hospitalUser.role?.toUpperCase() === 'SUPER ADMIN' || hospitalUser.role?.toUpperCase() === 'ADMIN' || canAccessTab('integrations') || canAccessTab('notifications') || canAccessTab('announcements')) {
      tabs.push({ key: 'integrations', label: 'API & Integrations' });
      tabs.push({ key: 'notifications', label: 'Notifications' });
      tabs.push({ key: 'announcements', label: 'System Announcements' });
    }

    return tabs.filter(t => canAccessTab(t.key));
  }, [permissions, hospitalUser]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  const [connectorSubTab, setConnectorSubTab] = useState<'Insurers' | 'TPAs' | 'Templates'>('Insurers');
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Entity Management State
  const [editingEntity, setEditingEntity] = useState<InsuranceEntity | null>(null);
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [newRegionContact, setNewRegionContact] = useState<Partial<RegionalContact>>({ state: '', district: '', zone: '', claimEmail: '', settlementEmail: '' });
  
  // Field Builder State
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);

  // Stage Manager State
  const [editingStage, setEditingStage] = useState<ClaimStage | null>(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  
  // Template Management State
  const [templateEntityType, setTemplateEntityType] = useState<'Insurer' | 'TPA'>('Insurer');
  const [selectedEntityForTemplate, setSelectedEntityForTemplate] = useState<InsuranceEntity | null>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      const response = await configApi.resetDummyData();
      
      // Clear client-side LocalStorage cache keys for claims, patients, documents, insurers, roles etc.
      const keysToClear = [
        'claimnx_claims',
        'claimnx_patients',
        'claimnx_patientDocuments',
        'claimnx_orders',
        'claimnx_reconciliations',
        'claimnx_kyp_policies',
        'claimnx_roles',
        'claimnx_emails',
        'claimnx_system_announcements',
        'claimnx_announcement_acknowledgements',
        'claimnx_config'
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));

      toast.success(response.data?.message || 'All dummy data purged successfully!');
      setShowResetConfirm(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('[Reset Error]', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to purge database');
    } finally {
      setIsResetting(false);
    }
  };

  // Handlers for Entity Management
  const openAddEntity = () => {
    setEditingEntity({
      id: `ent-${Date.now()}`,
      name: '',
      emailId: '',
      settlementEmail: '', // Initialize new field
      portalLink: '',
      type: connectorSubTab === 'Insurers' ? 'Insurer' : 'TPA',
      automationType: 'Portal',
      onPanel: true,
      rpaSupported: false,
      autoEmailEnabled: true,
      state: '',
      district: '',
      zone: '',
      regionalContacts: [],
      templateName: 'Generic IRDAI (Dashed)'
    });
    setNewRegionContact({ state: '', district: '', zone: '', claimEmail: '', settlementEmail: '' });
    setIsEntityModalOpen(true);
  };

  const handleEntityStateChange = (val: string) => {
    if (!editingEntity) return;
    const zone = ZONES_BY_STATE[val] || '';
    setEditingEntity({...editingEntity, state: val, zone, district: ''});
  };
  
  const handleNewRegionStateChange = (val: string) => {
    const zone = ZONES_BY_STATE[val] || '';
    setNewRegionContact(prev => ({ ...prev, state: val, zone, district: '' }));
  };

  const addRegionalContact = () => {
    if (!editingEntity || !newRegionContact.state || !newRegionContact.claimEmail) return;
    
    const newContact: RegionalContact = {
      id: `rc-${Date.now()}`,
      state: newRegionContact.state!,
      district: newRegionContact.district || 'All Districts',
      zone: newRegionContact.zone || '',
      claimEmail: newRegionContact.claimEmail!,
      settlementEmail: newRegionContact.settlementEmail || ''
    };
    
    setEditingEntity({
      ...editingEntity,
      regionalContacts: [...(editingEntity.regionalContacts || []), newContact]
    });
    setNewRegionContact({ state: '', district: '', zone: '', claimEmail: '', settlementEmail: '' });
  };
  
  const removeRegionalContact = (contactId: string) => {
    if (!editingEntity) return;
    setEditingEntity({
      ...editingEntity,
      regionalContacts: editingEntity.regionalContacts?.filter(c => c.id !== contactId)
    });
  };

  const handleSaveEntity = async () => {
    if (!editingEntity) return;
    const list = connectorSubTab === 'Insurers' ? insurers : tpas;
    const setter = connectorSubTab === 'Insurers' ? setInsurers : setTpas;

    if (!editingEntity.name.trim() || !editingEntity.emailId.trim() || !editingEntity.portalLink.trim()) {
      toast.error('Entity name, claims email, and portal link are required for database persistence.');
      return;
    }
    
    try {
      const isNewEntity = editingEntity.id.startsWith('ent-');
      const response = isNewEntity
        ? await configApi.createInsurer(editingEntity)
        : await configApi.updateInsurer(editingEntity.id, editingEntity);
      const savedEntity = response.data;
      
      if (list.some(e => e.id === savedEntity.id)) {
        setter(list.map(e => e.id === savedEntity.id ? savedEntity : e));
      } else {
        setter([...list, savedEntity]);
      }
      
      toast.success(`${savedEntity.type} "${savedEntity.name}" configured and saved successfully!`);
      setIsEntityModalOpen(false);
      setEditingEntity(null);
    } catch (err: any) {
      console.error('[Entity Save Error]', err);
      toast.error('Failed to save entity configuration to database: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handlers for Form Builder
  const openAddField = () => {
    setEditingField({
      id: `field-${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      section: 'tpa_hospital',
      options: []
    });
    setIsFieldModalOpen(true);
  };

  const handleSaveField = () => {
    if (!editingField) return;
    if (fields.some(f => f.id === editingField.id)) {
      setFields(fields.map(f => f.id === editingField.id ? editingField : f));
    } else {
      setFields([...fields, editingField]);
    }
    setIsFieldModalOpen(false);
    setEditingField(null);
  };

  // Handlers for Stage Manager
  const handleSaveStage = () => {
    if (!editingStage) return;
    if (stages.some(s => s.id === editingStage.id)) {
      setStages(stages.map(s => s.id === editingStage.id ? editingStage : s));
    } else {
      setStages([...stages, editingStage]);
    }
    setIsStageModalOpen(false);
    setEditingStage(null);
  };

  const saveTemplateToEntity = async (entityId: string, templateName: string) => {
    const targetEntity = (templateEntityType === 'Insurer' ? insurers : tpas).find(e => e.id === entityId);
    if (!targetEntity) return;

    const updatedEntity = { ...targetEntity, templateName };

    try {
      // Optimistically update local state first
      if (templateEntityType === 'Insurer') {
        setInsurers(insurers.map(ins => ins.id === entityId ? updatedEntity : ins));
      } else {
        setTpas(tpas.map(tpa => tpa.id === entityId ? updatedEntity : tpa));
      }
      if (selectedEntityForTemplate?.id === entityId) {
        setSelectedEntityForTemplate(updatedEntity);
      }

      // Save template mapping directly to backend database
      await configApi.updateInsurer(entityId, updatedEntity);
      toast.success(`Successfully mapped "${templateName}" template to ${targetEntity.name}!`);
    } catch (err: any) {
      console.error('[Template Map Error]', err);
      toast.error('Failed to map template: ' + (err.response?.data?.message || err.message));
    }
  };

  const renderActiveTemplate = (name: string) => {
    const mockData = { 
      p_name: "John Q. Patient", 
      hosp_name: hospitalUser.hospitalName, 
      hosp_address: hospitalUser.address,
      hosp_rohini_id: hospitalUser.rohiniId,
      hosp_email: hospitalUser.emailId,
      adm_date: new Date().toISOString().split('T')[0],
      p_dob: "1990-05-24",
      p_age_y: 34,
      p_gender: "Male",
      p_contact: "9876543210",
      p_policy_no: "POL-SAMPLE-123",
      m_prov_diag: "Acute Medical Condition Sample",
      adm_total_cost: 125000,
      hospitalSeal: hospitalUser.hospitalSeal,
      doctorStamp: hospitalUser.doctorStamp,
      insurance_company: selectedEntityForTemplate?.name || 'Generic Insurance Co.'
    };

    switch(name) {
       case 'Star Health Standard': return <StarHealthTemplate formData={mockData} />;
       case 'Tata AIG Standard': return <TataAigTemplate formData={mockData} />;
       case 'HDFC ERGO Standard': return <HdfcErgoTemplate formData={mockData} />;
       case 'ICICI Lombard Standard': return <IciciLombardTemplate formData={mockData} />;
       case 'Care Health Insurance Standard': return <CareHealthTemplate formData={mockData} />;
       case 'Aditya Birla Health Insurance Standard': return <AdityaBirlaTemplate formData={mockData} />;
       case 'Bajaj Allianz General Insurance Standard': return <BajajAllianzTemplate formData={mockData} />;
       case 'Medi Assist TPA Standard': return <MediAssistTemplate formData={mockData} />;
       case 'Chola MS Standard': return <CholaMsTemplate formData={mockData} />;
       case 'Manipal Cigna Standard': return <ManipalCignaTemplate formData={mockData} />;
       case 'Central Generali Standard': return <CentralGeneraliTemplate formData={mockData} />;
       case 'Go Digit Standard': return <GoDigitTemplate formData={mockData} />;
       case 'IFFCO TOKIO Standard': return <IffcoTokioTemplate formData={mockData} />;
       case 'Magma HDI Standard': return <MagmaHdiTemplate formData={mockData} />;
       case 'Reliance General Standard (2017)': return <RelianceGeneralTemplate formData={mockData} />;
       case 'Indusind Standard (2025)': return <IndusindTemplate formData={mockData} />;
       case 'Niva Bupa Health Insurance Standard': return <NivaBupaTemplate formData={mockData} />;
       case 'MDIndia Standard': return <MdIndiaTemplate formData={mockData} />;
       case 'Medsave Standard': return <MedsaveTemplate formData={mockData} />;
       case 'HealthIndia Standard': return <HealthIndiaTemplate formData={mockData} />;
       case 'Vidal Health Standard': return <VidalHealthTemplate formData={mockData} />;
       case 'Generic IRDAI (Dashed)': return <GenericIrdaiTemplate formData={mockData} />;
       default: return <GenericIrdaiTemplate formData={mockData} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Schema Control</h1>
          <p className="text-slate-500 text-sm font-medium">Core environment governance and registry settings.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner flex-wrap overflow-x-auto">
          {visibleTabs.map(tab => (
            <TabNav 
              key={tab.key}
              active={activeTab === tab.key} 
              onClick={() => setActiveTab(tab.key)} 
              label={tab.label} 
            />
          ))}
        </div>
      </div>

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <NotificationManager 
          hospitals={hospitals} 
        />
      )}

      {/* SYSTEM ANNOUNCEMENTS TAB */}
      {activeTab === 'announcements' && (
        <SystemAnnouncements
          currentUser={hospitalUser}
          hospitals={hospitals}
          hospitalUsers={hospitalUsers}
          insurers={insurers}
          tpas={tpas}
          roles={roles}
        />
      )}

      {/* AUTOMATED REPORTS TAB */}
      {activeTab === 'automated_reports' && (
        <AutomatedReportingSystem 
          hospitals={hospitals} 
          hospitalUsers={hospitalUsers}
        />
      )}

      {/* CONNECTORS TAB: INSURERS / TPAS / TEMPLATES */}
      {activeTab === 'connectors' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl">
               <button onClick={() => setConnectorSubTab('Insurers')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${connectorSubTab === 'Insurers' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}>Insurers</button>
               <button onClick={() => setConnectorSubTab('TPAs')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${connectorSubTab === 'TPAs' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}>TPAs</button>
               <button onClick={() => setConnectorSubTab('Templates')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${connectorSubTab === 'Templates' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}>Templates</button>
             </div>
             <div className="flex items-center space-x-4">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search registry..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none" />
                </div>
                {connectorSubTab !== 'Templates' && (
                  <button onClick={openAddEntity} className="bg-[#000080] text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24} /></button>
                )}
             </div>
          </div>

          <div className="p-8">
            {connectorSubTab === 'Templates' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                 <div className="lg:col-span-4 space-y-6">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                       <button onClick={() => setTemplateEntityType('Insurer')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${templateEntityType === 'Insurer' ? 'bg-white text-[#000080] shadow-sm' : 'text-slate-500'}`}>Insurers</button>
                       <button onClick={() => setTemplateEntityType('TPA')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${templateEntityType === 'TPA' ? 'bg-white text-[#000080] shadow-sm' : 'text-slate-500'}`}>TPAs</button>
                    </div>
                    <div className="space-y-2 overflow-y-auto max-h-[500px] custom-scrollbar">
                       {(templateEntityType === 'Insurer' ? insurers : tpas).map(entity => (
                          <button key={entity.id} onClick={() => setSelectedEntityForTemplate(entity)} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${selectedEntityForTemplate?.id === entity.id ? 'bg-blue-600 border-blue-600 shadow-lg text-white' : 'bg-slate-50 border-slate-100'}`}>
                             <span className="text-[11px] font-black uppercase truncate">{entity.name}</span>
                             <ChevronRight size={16} />
                          </button>
                       ))}
                    </div>
                 </div>
                 <div className="lg:col-span-8">
                    {selectedEntityForTemplate ? (
                       <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-10 space-y-8">
                          <div className="flex justify-between items-start">
                             <div>
                                <h4 className="text-xl font-black text-slate-800 uppercase">{selectedEntityForTemplate.name}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Map Pre-Auth Document Schema</p>
                             </div>
                             <div className="flex space-x-3">
                                <button onClick={() => setShowTemplatePreview(true)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase flex items-center shadow-sm hover:bg-slate-50 active:scale-95 transition-all"><Eye size={16} className="mr-2" /> Live Preview</button>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Template Mapping</label>
                             <select 
                                value={selectedEntityForTemplate.templateName || 'Generic IRDAI (Dashed)'}
                                onChange={(e) => saveTemplateToEntity(selectedEntityForTemplate.id, e.target.value)}
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-50"
                             >
                                {AVAILABLE_TEMPLATES.map(temp => (
                                   <option key={temp} value={temp}>{temp}</option>
                                ))}
                             </select>
                          </div>
                       </div>
                    ) : (
                       <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-20">
                          <LayoutTemplate size={48} className="text-slate-200 mb-4" />
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select entity to map template</p>
                       </div>
                    )}
                 </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-3xl">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Entity Name</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Claims Email</th>
                      <th className="px-6 py-4">Settlement Email</th>
                      <th className="px-6 py-4">Region (S/Z/C)</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(connectorSubTab === 'Insurers' ? insurers : tpas)
                      .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(entity => (
                        <tr key={entity.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setEditingEntity(entity); setIsEntityModalOpen(true); }}>
                              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                {entity.type === 'Insurer' ? <ShieldCheck size={16} /> : <Building size={16} />}
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{entity.name}</h5>
                                <a href={entity.portalLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[9px] font-bold text-blue-500 hover:underline">{entity.portalLink}</a>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">{entity.type}</span>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-600">
                             {entity.emailId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-600">
                             {entity.settlementEmail || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                             {entity.state ? (
                                <div className="text-[9px]">
                                   <p className="font-bold text-slate-700">{entity.state}</p>
                                   <p className="text-slate-400 font-medium">{entity.zone} • {entity.district || 'All Districts'}</p>
                                </div>
                             ) : (
                                <span className="text-[9px] font-bold text-slate-400 italic">National / Default</span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end space-x-1">
                                <button onClick={() => { setEditingEntity(entity); setIsEntityModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                             </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEMPLATE PREVIEW MODAL */}
      {showTemplatePreview && selectedEntityForTemplate && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[500] flex items-center justify-center p-4 lg:p-8 overflow-y-auto">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl flex flex-col max-h-[92vh] border border-white/20 animate-in zoom-in duration-300">
             <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center space-x-5">
                   <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><LayoutTemplate size={28} /></div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-1.5">Live Template Analysis</h3>
                      <div className="flex items-center space-x-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Mapping:</p>
                         <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">{selectedEntityForTemplate.templateName || 'Generic IRDAI (Dashed)'}</p>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={() => setShowTemplatePreview(false)} 
                  className="p-4 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                >
                   <X size={36} />
                </button>
             </div>
             <div className="flex-1 overflow-y-auto bg-slate-100/50 p-6 lg:p-12 custom-scrollbar">
                <div className="w-full flex justify-center pb-20">
                   <div className="origin-top transform scale-[0.65] md:scale-[0.85] lg:scale-[1.0] transition-transform duration-500 shadow-2xl">
                      {renderActiveTemplate(selectedEntityForTemplate.templateName || 'Generic IRDAI (Dashed)')}
                   </div>
                </div>
             </div>
             <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Institutional Schema Control: High Fidelity Preview Enabled</p>
             </div>
          </div>
        </div>
      )}

      {/* ENTITY MODAL */}
      {isEntityModalOpen && editingEntity && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl p-8 space-y-8 animate-in zoom-in max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configure {editingEntity.type} Entity</h3>
                 <button onClick={() => setIsEntityModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Entity Name</label>
                    <input type="text" value={editingEntity.name} onChange={e => setEditingEntity({...editingEntity, name: e.target.value})} className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50" />
                 </div>
                 
                 {/* TEMPLATE ASSIGNMENT */}
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Assigned Document Template</label>
                    <select 
                       value={editingEntity.templateName || 'Generic IRDAI (Dashed)'} 
                       onChange={e => setEditingEntity({...editingEntity, templateName: e.target.value})}
                       className="w-full p-4 border border-slate-200 bg-blue-50/30 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 text-blue-700"
                    >
                       {AVAILABLE_TEMPLATES.map(temp => (
                          <option key={temp} value={temp}>{temp}</option>
                       ))}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1 font-bold">Defines the PDF structure used for pre-auth generation.</p>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Default Claim Email ID</label>
                        <input type="email" value={editingEntity.emailId} onChange={e => setEditingEntity({...editingEntity, emailId: e.target.value})} className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50" placeholder="claims@domain.com" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Default Settlement Follow-Up Email</label>
                        <input type="email" value={editingEntity.settlementEmail} onChange={e => setEditingEntity({...editingEntity, settlementEmail: e.target.value})} className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50" placeholder="finance@domain.com" />
                    </div>
                 </div>
                 <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Portal Link</label>
                     <input type="text" value={editingEntity.portalLink} onChange={e => setEditingEntity({...editingEntity, portalLink: e.target.value})} className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50" />
                 </div>

                 {/* REGIONAL CONFIG */}
                 <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center border-b border-slate-200 pb-2 mb-2"><Globe2 size={12} className="mr-2" /> Regional Email Routing</p>
                    
                    {/* List of Added Regions */}
                    {editingEntity.regionalContacts && editingEntity.regionalContacts.length > 0 && (
                       <div className="space-y-2 mb-4">
                          {editingEntity.regionalContacts.map((contact, idx) => (
                             <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div>
                                   <p className="text-[10px] font-black uppercase text-slate-700">{contact.state} • {contact.district || 'All Districts'}</p>
                                   <p className="text-[9px] font-bold text-slate-400">Claims: {contact.claimEmail} | Settlement: {contact.settlementEmail}</p>
                                </div>
                                <button onClick={() => removeRegionalContact(contact.id)} className="p-1.5 text-slate-300 hover:text-rose-500 bg-slate-50 rounded-lg"><Trash2 size={14} /></button>
                             </div>
                          ))}
                       </div>
                    )}

                    {/* Add New Region Form */}
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
                       <p className="text-[9px] font-black uppercase text-blue-600">Add New Regional Contact</p>
                       <div className="grid grid-cols-3 gap-4">
                          <div>
                             <label className="text-[8px] font-bold text-slate-400 mb-1 block">State</label>
                             <select 
                                value={newRegionContact.state || ''} 
                                onChange={e => handleNewRegionStateChange(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none"
                             >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                          </div>
                          <div>
                             <label className="text-[8px] font-bold text-slate-400 mb-1 block">District</label>
                             <select 
                                value={newRegionContact.district || ''} 
                                onChange={e => setNewRegionContact({...newRegionContact, district: e.target.value})}
                                disabled={!newRegionContact.state}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none disabled:bg-slate-100"
                             >
                                <option value="">All Districts</option>
                                {newRegionContact.state && DISTRICTS_BY_STATE[newRegionContact.state]?.map(d => <option key={d} value={d}>{d}</option>)}
                             </select>
                          </div>
                          <div>
                             <label className="text-[8px] font-bold text-slate-400 mb-1 block">Zone (Auto)</label>
                             <input type="text" value={newRegionContact.zone || ''} readOnly className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500" />
                          </div>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                             <label className="text-[8px] font-bold text-slate-400 mb-1 block">Regional Claim Email</label>
                             <input type="email" value={newRegionContact.claimEmail || ''} onChange={e => setNewRegionContact({...newRegionContact, claimEmail: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none" placeholder="region.claims@domain.com" />
                          </div>
                          <div>
                             <label className="text-[8px] font-bold text-slate-400 mb-1 block">Regional Settlement Email</label>
                             <input type="email" value={newRegionContact.settlementEmail || ''} onChange={e => setNewRegionContact({...newRegionContact, settlementEmail: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none" placeholder="region.finance@domain.com" />
                          </div>
                       </div>
                       <button 
                         onClick={addRegionalContact}
                         disabled={!newRegionContact.state || !newRegionContact.claimEmail}
                         className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center disabled:opacity-50"
                       >
                          <PlusCircle size={14} className="mr-2" /> Add to List
                       </button>
                    </div>
                 </div>

                 {/* RPA TOGGLE */}
                 <div className="bg-blue-50 p-6 rounded-2xl flex items-center justify-between border border-blue-100">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                          <Zap size={20} />
                       </div>
                       <div>
                          <p className="text-sm font-black text-blue-800 uppercase">RPA Supported</p>
                          <p className="text-[10px] font-bold text-blue-500">Enable Robotic Process Automation for claims?</p>
                       </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" checked={editingEntity.rpaSupported} onChange={(e) => setEditingEntity({...editingEntity, rpaSupported: e.target.checked})} />
                       <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                 </div>
              </div>

              <div className="flex space-x-4 pt-4 border-t border-slate-100">
                 <button onClick={() => setIsEntityModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50">Cancel</button>
                 <button onClick={handleSaveEntity} className="flex-[2] py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl">Save Configuration</button>
              </div>
           </div>
        </div>
      )}

      {/* BUILDER TAB */}
      {activeTab === 'builder' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
           <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <SectionHeading icon={LayoutTemplate} title="Form Field Architect" subtitle="Map clinical and patient data points" />
              <button onClick={openAddField} className="px-8 py-3 bg-[#000080] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-blue-700 transition-all active:scale-95">
                <Plus size={18} className="mr-2" /> Add Data Point
              </button>
           </div>
           <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {fields.map(field => (
                   <div key={field.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl group relative hover:border-blue-400 transition-all">
                      <div className="flex justify-between items-start mb-4">
                         <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400">{field.section}</span>
                         <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingField(field); setIsFieldModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-white rounded-lg"><Edit2 size={14} /></button>
                            <button onClick={() => setFields(fields.filter(f => f.id !== field.id))} className="p-1.5 text-rose-500 hover:bg-white rounded-lg"><Trash2 size={14} /></button>
                         </div>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">{field.label}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{field.type} {field.required ? '• Required' : ''}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* STAGES TAB */}
      {activeTab === 'stages' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
           <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <SectionHeading icon={Layers} title="Workflow Stage Engine" subtitle="Define processing milestones and status hooks" />
              <button onClick={() => { setEditingStage({ id: `st-${Date.now()}`, name: '', key: '', description: '', icon: 'Activity', statuses: [], mappedFieldIds: [] }); setIsStageModalOpen(true); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-indigo-700 transition-all active:scale-95">
                <Plus size={18} className="mr-2" /> Define New Stage
              </button>
           </div>
           <div className="p-10 space-y-4">
              {stages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center p-6 bg-slate-50 border border-slate-100 rounded-[2rem] group hover:border-indigo-400 transition-all">
                   <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-indigo-600 shadow-sm mr-6 group-hover:scale-110 transition-transform">0{idx+1}</div>
                   <div className="flex-1">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{stage.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{stage.statuses.length} Status States Mapped</p>
                   </div>
                   <div className="flex space-x-3">
                      <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-indigo-600 transition-all">Map Fields</button>
                      <button onClick={() => setStages(stages.filter(s => s.id !== stage.id))} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* FINANCIALS TAB */}
      {activeTab === 'financials' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 space-y-12 animate-in slide-in-from-bottom-4">
           <SectionHeading icon={IndianRupee} title="Institutional Financials" subtitle="Configure wallet billing thresholds and per-case charges" />

           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-200 space-y-8">
                 <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Per-Case Processing Fee (INR)</label>
                 <div className="relative">
                    <IndianRupee className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={32} />
                    <input 
                      type="number" 
                      defaultValue={hospitalUser.perCaseCharge} 
                      className="w-full pl-20 pr-8 py-8 bg-white border border-slate-200 rounded-[2.5rem] text-4xl font-black text-[#000080] outline-none focus:ring-12 focus:ring-blue-50 transition-all" 
                    />
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 px-2 italic uppercase">System will auto-debit this amount from facility wallet upon approval.</p>
              </div>
              <div className="p-10 bg-indigo-900 rounded-[3rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                 <Zap className="absolute -right-10 -bottom-10 text-white/5 rotate-12" size={200} />
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-widest mb-4">Direct Billing API</h3>
                    <p className="text-indigo-100/60 font-medium text-sm leading-relaxed">Connect your internal hospital ERP financial ledger to auto-reconcile cashless credits in real-time.</p>
                 </div>
                 <button className="w-fit px-8 py-3 bg-white text-indigo-900 rounded-xl text-[10px] font-black uppercase tracking-widest mt-8 shadow-lg active:scale-95">Request Integration</button>
              </div>
           </div>
        </div>
      )}

      {/* LOGIC TAB */}
      {activeTab === 'logic' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 space-y-12 animate-in slide-in-from-bottom-4">
           <SectionHeading icon={FlaskConical} title="Business Logic Engine" subtitle="Configure AI behavior and automated clinical validation rules" />

           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { title: 'AI Clinical Mining', key: 'autoExtract', desc: 'Auto-extract chronic history and social habits from discharge summaries.' },
                { title: 'Policy Analysis', key: 'policyAnalysis', desc: 'Verify sum insured and room rent limits against extracted policy PDF.' },
                { title: 'TAT Tracking', key: 'tatTracking', desc: 'Enable real-time SLA monitoring for insurance desk operations.' }
              ].map(item => (
                <div key={item.key} className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl group transition-all hover:-translate-y-2">
                   <Zap className={`absolute -right-5 -bottom-5 text-white/5 transition-transform duration-700 group-hover:scale-125 ${config[item.key] ? 'text-blue-500/20' : ''}`} size={150} />
                   <div className="relative z-10">
                      <div className="flex justify-between items-start mb-10">
                         <h4 className="text-xl font-black uppercase tracking-tight leading-tight">{item.title}</h4>
                         <button 
                           onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                           className={`w-14 h-7 rounded-full p-1.5 transition-all flex items-center ${config[item.key] ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}
                         >
                            <div className="w-4 h-4 bg-white rounded-full shadow-lg"></div>
                         </button>
                      </div>
                      <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em] leading-relaxed">{item.desc}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* ROLES TAB */}
      {activeTab === 'roles' && (
        <ManageRoles stages={stages} roles={roles} setRoles={setRoles} hospitalUsers={hospitalUsers} />
      )}

      {/* CLAIMS LIST TAB */}
      {activeTab === 'claims_list' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 space-y-12 animate-in slide-in-from-bottom-4">
           <SectionHeading icon={ListFilter} title="Global Case Registry" subtitle="Administrative claim journey and record governance" />
           <AdminClaimsList claims={claims} setClaims={setClaims} stages={stages} fields={fields} hospitalUser={hospitalUser} />
        </div>
      )}

      {/* Field Modal */}
      {isFieldModalOpen && editingField && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 space-y-6 animate-in zoom-in">
              <h3 className="text-xl font-black text-slate-800 uppercase">Edit Data Point</h3>
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Label</label>
                    <input type="text" value={editingField.label} onChange={e => setEditingField({...editingField, label: e.target.value})} className="w-full p-3 border rounded-xl font-bold text-sm" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Type</label>
                    <select value={editingField.type} onChange={e => setEditingField({...editingField, type: e.target.value as any})} className="w-full p-3 border rounded-xl font-bold text-sm">
                       <option value="text">Text</option>
                       <option value="number">Number</option>
                       <option value="date">Date</option>
                       <option value="textarea">Text Area</option>
                       <option value="select">Select Dropdown</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Section</label>
                    <select value={editingField.section} onChange={e => setEditingField({...editingField, section: e.target.value as any})} className="w-full p-3 border rounded-xl font-bold text-sm">
                       <option value="tpa_hospital">Patient & Policy</option>
                       <option value="medical">Medical / Clinical</option>
                       <option value="admission">Admission & Finance</option>
                    </select>
                 </div>
                 <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={editingField.required} onChange={e => setEditingField({...editingField, required: e.target.checked})} />
                    <span className="text-sm font-bold text-slate-700">Mandatory Field</span>
                 </div>
              </div>
              <div className="flex space-x-4 pt-4">
                 <button onClick={() => setIsFieldModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-500">Cancel</button>
                 <button onClick={handleSaveField} className="flex-1 py-3 bg-[#000080] text-white rounded-xl font-bold">Save Field</button>
              </div>
           </div>
        </div>
      )}

      {/* Stage Modal */}
      {isStageModalOpen && editingStage && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 space-y-6 animate-in zoom-in">
              <h3 className="text-xl font-black text-slate-800 uppercase">Configure Stage</h3>
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Stage Name</label>
                    <input type="text" value={editingStage.name} onChange={e => setEditingStage({...editingStage, name: e.target.value})} className="w-full p-3 border rounded-xl font-bold text-sm" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">System Key</label>
                    <input type="text" value={editingStage.key} onChange={e => setEditingStage({...editingStage, key: e.target.value})} className="w-full p-3 border rounded-xl font-bold text-sm" placeholder="e.g. pre-auth" />
                 </div>
              </div>
              <div className="flex space-x-4 pt-4">
                 <button onClick={() => setIsStageModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-500">Cancel</button>
                 <button onClick={handleSaveStage} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Save Stage</button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'email_templates' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
          <EmailTemplatesManager />
        </div>
      )}

      {activeTab === 'diagnosis_master' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
          <ManualDiagnosisReview currentUser={hospitalUser} />
        </div>
      )}

      {activeTab === 'room_categories' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-8">
          <SectionHeading icon={Building} title="Room Category Management" subtitle="Manage patient room types for new admissions" />
          
          <div className="flex gap-4">
            <input 
              type="text" 
              id="new-room-category"
              placeholder="Enter new room category..." 
              className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val && !roomCategories.includes(val)) {
                    setRoomCategories([...roomCategories, val]);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <button 
              onClick={() => {
                const input = document.getElementById('new-room-category') as HTMLInputElement;
                const val = input.value.trim();
                if (val && !roomCategories.includes(val)) {
                  setRoomCategories([...roomCategories, val]);
                  input.value = '';
                }
              }}
              className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomCategories.map((cat, idx) => (
              <div key={idx} className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-white transition-all">
                <span className="text-sm font-bold text-slate-700">{cat}</span>
                <button 
                  onClick={() => setRoomCategories(roomCategories.filter((_, i) => i !== idx))}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (hospitalUser.role?.toUpperCase() === 'SUPER ADMIN' || hospitalUser.role?.toUpperCase() === 'ADMIN') && (
        <div className="space-y-12 animate-in fade-in duration-500">
           {/* Global Settings Section */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-5 mb-10">
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-sm">
                    <Radio size={32} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Portal Gateway Config</h3>
                    <p className="text-sm font-medium text-slate-500">Global B2B integration hub for the entire ClaimNX portal.</p>
                 </div>
              </div>

              <div className="space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">External Processing</label>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${config.apiConfig?.externalIntegEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                             {config.apiConfig?.externalIntegEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                       </div>
                       <button 
                          onClick={() => setConfig({ ...config, apiConfig: { ...config.apiConfig, externalIntegEnabled: !config.apiConfig?.externalIntegEnabled } })}
                          className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${config.apiConfig?.externalIntegEnabled ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-slate-50/50'}`}
                       >
                          <div className="flex items-center gap-3">
                             <Share2 size={18} className={config.apiConfig?.externalIntegEnabled ? 'text-blue-600' : 'text-slate-400'} />
                             <span className="text-xs font-bold text-slate-700">Auto-Link External Portals</span>
                          </div>
                          {config.apiConfig?.externalIntegEnabled ? <ToggleRight size={24} className="text-blue-600" /> : <ToggleLeft size={24} className="text-slate-300" />}
                       </button>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Auto-Update</label>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${config.apiConfig?.autoUpdateEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                             {config.apiConfig?.autoUpdateEnabled ? 'Ready' : 'Off'}
                          </span>
                       </div>
                       <button 
                          onClick={() => setConfig({ ...config, apiConfig: { ...config.apiConfig, autoUpdateEnabled: !config.apiConfig?.autoUpdateEnabled } })}
                          className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${config.apiConfig?.autoUpdateEnabled ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'}`}
                       >
                          <div className="flex items-center gap-3">
                             <RefreshCw size={18} className={config.apiConfig?.autoUpdateEnabled ? 'text-emerald-600' : 'text-slate-400'} />
                             <span className="text-xs font-bold text-slate-700">Accept Inbound Updates</span>
                          </div>
                          {config.apiConfig?.autoUpdateEnabled ? <ToggleRight size={24} className="text-emerald-600" /> : <ToggleLeft size={24} className="text-slate-300" />}
                       </button>
                    </div>
                 </div>

                 <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Primary Partner Webhook URL</label>
                       <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                             type="url"
                             value={config.apiConfig?.webhookUrl || ''}
                             onChange={(e) => setConfig({ ...config, apiConfig: { ...config.apiConfig, webhookUrl: e.target.value } })}
                             className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all"
                             placeholder="https://partner-portal.com/api/webhooks/claims"
                          />
                       </div>
                       <p className="text-[10px] text-slate-400 mt-2 italic">ClaimNX will send real-time data to this URL whenever a claim is finalized portal-wide.</p>
                    </div>

                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Master API Key (Super Admin Only)</label>
                       <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                             type="text"
                             readOnly
                             value={config.apiConfig?.apiKey || ''}
                             className="w-full pl-12 pr-12 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-xs font-mono text-slate-500 outline-none"
                          />
                          <button 
                             onClick={() => {
                                if (config.apiConfig?.apiKey) {
                                   navigator.clipboard.writeText(config.apiConfig.apiKey);
                                }
                             }}
                             className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest"
                          >
                             Copy
                          </button>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-2 italic">Provide this master key to global partner companies. They must include it in their request headers.</p>
                    </div>
                 </div>

                 <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
                    <ShieldCheck className="text-amber-600 shrink-0" size={24} />
                    <div>
                       <p className="text-xs font-black text-amber-800 uppercase mb-1">Security Enforcement</p>
                       <p className="text-[10px] font-medium text-amber-900/60 leading-relaxed">
                          Changing these settings affects all outbound and inbound B2B traffic. Webhook URLs must be HTTPS. The API Key should be rotated periodically if compromised.
                       </p>
                    </div>
                 </div>
              </div>
           </div>

            {/* Database Administration Maintenance Block */}
            <div className="bg-rose-50/50 p-10 rounded-[3rem] border border-rose-100 shadow-sm mb-8 animate-in fade-in duration-500">
               <div className="flex items-center gap-5 mb-10">
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center shadow-sm">
                     <ShieldAlert size={32} />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-rose-800 uppercase tracking-tight">Database Maintenance</h3>
                     <p className="text-sm font-medium text-rose-700/80">Purge and clear all dummy clinical case files, patient registries, and documents.</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <p className="text-xs font-semibold text-rose-900/70 leading-relaxed">
                     Purging the portal database will permanently erase all dummy claims, patients, documents, insurers, TPAs, custom roles (preserving "Super Admin"), and billing/invoice data across local SQLite storage and Supabase cloud synchronization. This action is irreversible. Use this utility to clean the workspace before entering manual live case analysis data.
                  </p>

                  <div className="flex justify-start">
                     <button
                        onClick={() => setShowResetConfirm(true)}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer animate-pulse"
                     >
                        <Trash2 size={16} /> Purge All Portal Dummy Data
                     </button>
                  </div>
               </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
               <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                  <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                           <ShieldAlert size={24} />
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Confirm Hard Database Reset</h4>
                           <p className="text-xs text-slate-500 font-semibold">This action cannot be undone.</p>
                        </div>
                     </div>

                     <p className="text-xs font-medium text-slate-600 leading-relaxed mb-8">
                        Are you absolutely certain you want to purge all Patients, Claims, Insurers, TPAs, Invoices/Orders, and Patient Documents? All existing tables will be cleared on both SQLite and Supabase databases. The <strong>Super Admin</strong> role and your user session credentials will be fully preserved.
                     </p>

                     <div className="flex items-center gap-4">
                        {/* LEFT: Delete/Confirm Button */}
                        <button
                           onClick={handleResetAllData}
                           disabled={isResetting}
                           className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                           {isResetting ? (
                              <>
                                 <Loader2 size={14} className="animate-spin" /> Purging...
                              </>
                           ) : (
                              'Yes, Purge All Data'
                           )}
                        </button>

                        {/* RIGHT: Cancel/Dismiss Button */}
                        <button
                           onClick={() => setShowResetConfirm(false)}
                           disabled={isResetting}
                           className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                           Cancel
                        </button>
                     </div>
                  </div>
               </div>
            )}

           {/* Documentation Section */}
           <div className="bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800">
              <div className="p-10 border-b border-slate-800 flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Technical Integration Portal</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real-time API Documentation & Tooling</p>
                 </div>
                 <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400">
                    <Code2 size={24} />
                 </div>
              </div>
              <div className="p-0">
                 {/* Re-using the core of IntegrationPortal logic here but styled for AdminPanel */}
                 <IntegrationPortalEmbed />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// EMBEDDED INTEGRATION PORTAL FOR ADMIN PANEL
const IntegrationPortalEmbed: React.FC = () => {
  const [selectedId, setSelectedId] = useState(() => INTEGRATIONS[0]?.id ?? '');
  const [activePortalTab, setActivePortalTab] = useState<'docs' | 'auth'>('docs');

  const selectedSystem = INTEGRATIONS.find(s => s?.id === selectedId);
  
  const iconMap: Record<string, React.ReactNode> = {
    Hospital: <Hospital size={20} />,
    ShieldCheck: <ShieldCheck size={20} />,
    Landmark: <Landmark size={20} />,
    FileText: <FileText size={20} />
  };

  if (!selectedSystem) {
    return (
      <div className="min-h-[360px] flex flex-col items-center justify-center p-10 text-center">
        <div className="w-14 h-14 mb-5 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center"><Code2 size={26} /></div>
        <h4 className="text-sm font-black text-white uppercase tracking-wider">No integrations configured</h4>
        <p className="mt-2 max-w-md text-xs font-medium text-slate-500">Integration definitions will appear here once they are configured for this tenant.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
       {/* Sidebar */}
       <div className="lg:col-span-3 border-r border-slate-800 bg-slate-900/50 p-6 space-y-2">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Available Systems</h2>
          {INTEGRATIONS.map((system) => (
            <button
               key={system.id}
               onClick={() => setSelectedId(system.id)}
               className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                 selectedId === system.id 
                   ? 'bg-slate-800 border-slate-700 text-white shadow-lg' 
                   : 'bg-transparent border-transparent hover:bg-slate-800/50 text-slate-500'
               }`}
            >
               <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${selectedId === system.id ? 'bg-slate-700' : 'bg-slate-800/50'}`}>
                   {iconMap[system.icon]}
                 </div>
                 <span className="text-[11px] font-bold uppercase tracking-tight">{system.name}</span>
               </div>
               {selectedId === system.id && <ChevronRight size={14} className="text-slate-500" />}
            </button>
          ))}
          
          <div className="mt-20 p-5 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
             <div className="flex items-center gap-2 text-amber-500 mb-3">
                <ShieldAlert size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Gateway Status</span>
             </div>
             <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                <span>API UPTIME</span>
                <span className="text-emerald-500">99.98%</span>
             </div>
             <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[99.98%]"></div>
             </div>
          </div>
       </div>

       {/* Content Area */}
       <div className="lg:col-span-9 p-8 lg:p-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div>
                <div className="flex items-center gap-3 mb-2">
                   <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedSystem.name}</h2>
                   <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20">Production Ready</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xl font-medium">{selectedSystem.description}</p>
             </div>
             <div className="flex gap-2">
                <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2">
                   <Activity size={14} /> Live Logs
                </button>
                <button className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg">
                   <Code2 size={14} /> Test Endpoint
                </button>
             </div>
          </div>

          <div className="flex border-b border-slate-800">
             <button
                onClick={() => setActivePortalTab('docs')}
                className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
                  activePortalTab === 'docs' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
             >
                Rest API Documentation
             </button>
             <button
                onClick={() => setActivePortalTab('auth')}
                className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
                  activePortalTab === 'auth' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
             >
                Authentication Protocols
             </button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
             {activePortalTab === 'docs' ? (
                <div className="bg-slate-800/30 rounded-3xl p-1 border border-slate-800">
                   <ApiDocs endpoints={selectedSystem.endpoints} />
                </div>
             ) : (
                <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-800">
                   <AuthConfig method={selectedSystem.authMethod} />
                </div>
             )}
          </div>
          
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 uppercase tracking-widest pt-10 border-t border-slate-800/50 border-dashed">
             <span>Gateway Version: 1.4.2-stable</span>
             <span>Last Security Audit: Today 04:30 UTC</span>
          </div>
       </div>
    </div>
  );
};

const SectionHeading = ({ icon: Icon, title, subtitle }: any) => (
  <div className="flex items-center space-x-5">
     <div className="w-14 h-14 bg-[#000080] text-white rounded-2xl flex items-center justify-center shadow-lg"><Icon size={28} /></div>
     <div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{title}</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
     </div>
  </div>
);

export default AdminPanel;
