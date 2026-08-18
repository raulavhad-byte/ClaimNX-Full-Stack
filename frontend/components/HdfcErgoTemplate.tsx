
import React from 'react';
import { Zap, History as HistoryIcon } from 'lucide-react';

interface HdfcErgoTemplateProps {
  formData: Record<string, any>;
}

// Fixed length grid for character-by-character input
const GridInput: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7px] font-black text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black w-fit bg-white">
        {chars.map((char, i) => (
<div key={i} className="w-[12px] h-[13px] shrink-0 border-r border-b border-black flex items-center justify-center text-[8.5px] font-black text-[#00338d]">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
    </div>
  );
};

// Date grid with D D M M Y Y Y Y format
const DateGrid: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const d = value ? new Date(value) : null;
  const day = d ? d.getDate().toString().padStart(2, '0') : '  ';
  const month = d ? (d.getMonth() + 1).toString().padStart(2, '0') : '  ';
  const year = d ? d.getFullYear().toString() : '    ';
  const sequence = [...day.split(''), ...month.split(''), ...year.split('')];

  return (
    <div className="flex flex-col">
      {label && <span className="text-[7px] font-black text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex">
        {sequence.map((char, i) => (
<div key={i} className={`w-[12px] h-[13px] shrink-0 border border-black flex items-center justify-center text-[8.5px] font-black text-[#00338d] -ml-[1px] bg-white ${i === 1 || i === 3 ? 'mr-1.5' : ''}`}>
            {char}
          </div>
        ))}
      </div>
      <div className="flex text-[5px] font-bold text-slate-400 mt-0.5">
        <span className="w-[24px] text-center">D D</span>
        <span className="w-[6px]"></span>
        <span className="w-[24px] text-center">M M</span>
        <span className="w-[6px]"></span>
        <span className="w-[48px] text-center">Y Y Y Y</span>
      </div>
    </div>
  );
};

// Time grid with H H : M M format
const TimeGrid: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const [h, m] = (value || '  :  ').split(':');
  const sequence = [...(h || '  ').padStart(2, ' ').split(''), ...(m || '  ').padStart(2, ' ').split('')];
  return (
    <div className="flex flex-col">
      {label && <span className="text-[7px] font-black text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex items-center">
        <div className="flex border border-black bg-white">
          <div className="w-[12px] h-[13px] border-r border-black flex items-center justify-center text-[8.5px] font-black text-blue-700">{sequence[0]}</div>
          <div className="w-[12px] h-[13px] flex items-center justify-center text-[8.5px] font-black text-blue-700">{sequence[1]}</div>
        </div>
        <span className="mx-0.5 font-black text-[10px]">:</span>
        <div className="flex border border-black bg-white">
          <div className="w-[12px] h-[13px] border-r border-black flex items-center justify-center text-[8.5px] font-black text-blue-700">{sequence[2]}</div>
          <div className="w-[12px] h-[13px] flex items-center justify-center text-[8.5px] font-black text-blue-700">{sequence[3]}</div>
        </div>
      </div>
      <div className="flex text-[5px] font-bold text-slate-400 mt-0.5">
        <span className="w-[24px] text-center">H H</span>
        <span className="w-[8px]"></span>
        <span className="w-[24px] text-center">M M</span>
      </div>
    </div>
  );
};

const TickBox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    <span className="text-[8px] font-black text-black uppercase">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8px] font-bold text-slate-600 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className="text-[9px] font-black text-blue-700 uppercase flex-1 truncate">{value}</span>
  </div>
);

const RedBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[#e31e24] text-white px-3 py-1.5 text-[9.5px] font-black uppercase tracking-widest my-4">
    {children}
  </div>
);

const HdfcHeader: React.FC = () => (
  <div className="flex justify-between items-start mb-6">
    <div className="flex flex-col">
      <h1 className="text-[16px] font-black text-slate-800 uppercase leading-none tracking-tight">HDFC ERGO General Insurance Company Limited</h1>
    </div>
    <div className="text-right">
      <div className="bg-[#e31e24] text-white p-2.5 inline-block rounded-sm">
        <p className="text-[13px] font-black leading-none text-center">HDFC<br/>ERGO</p>
      </div>
      <p className="text-[11px] font-serif italic font-black text-[#e31e24] mt-1 pr-1">Take it easy!</p>
    </div>
  </div>
);

const HdfcErgoTemplate: React.FC<HdfcErgoTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-8 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-8 font-sans leading-none print:min-h-[297mm]">
        <HdfcHeader />
        
        <div className="mb-4">
          <h2 className="text-[12px] font-black uppercase text-slate-800 tracking-tight">REQUEST FOR CASHLESS HOSPITALISATION FOR HEALTH INSURANCE</h2>
          <h3 className="text-[12px] font-black uppercase text-slate-800">POLICY PART - C</h3>
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-[8px] font-black uppercase text-slate-500 mb-2">DETAILS OF THE THIRD PARTY ADMINISTRATOR/ INSURER/ HOSPITAL <span className="text-[7px] lowercase italic font-bold">(All fields are mandatory and fill in CAPITALS only)</span></p>
          <div className="space-y-3">
            <UnderlineField label="a) Name of the TPA/ Insurance Company:" value={formData.insurance_company || 'HDFC ERGO General Insurance Company Limited'} />
            <UnderlineField label="b) Customer service no:" value="022 - 6234 6234 / 0120 - 6234 6234" />
            <div className="flex items-start">
              <span className="text-[8px] font-bold text-slate-600 uppercase w-32 pt-1">c) Name of Hospital:</span>
              <div className="flex-1 space-y-3">
                <UnderlineField label="" value={formData.hosp_name || ''} />
                <UnderlineField label="i. Address" value={formData.hosp_address || ''} />
                <div className="flex gap-10">
                  <UnderlineField label="ii. Rohini ID" value={formData.hosp_rohini_id || ''} className="flex-1" />
                  <UnderlineField label="iii. E-mail id" value={formData.hosp_email || ''} className="flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <RedBanner>TO BE FILLED BY INSURED/ PATIENT</RedBanner>

        <div className="space-y-5 mb-6">
          <div className="flex items-end">
            <span className="text-[8px] font-black text-slate-800 uppercase w-32 pb-1.5">a) Name of the Patient:</span>
            <div className="flex-1 flex gap-4">
              <GridInput value={formData.p_name?.split(' ')[0] || ''} length={15} subLabel="(First Name)" />
              <GridInput value={formData.p_name?.split(' ')[1] || ''} length={15} subLabel="(Middle Name)" />
              <GridInput value={formData.p_name?.split(' ')[2] || ''} length={15} subLabel="(Last Name)" />
            </div>
          </div>

          <div className="flex items-start gap-12">
            <div className="flex items-center gap-4">
              <span className="text-[8px] font-black text-slate-800 uppercase">b) Gender:</span>
              <div className="flex gap-3">
                 <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                 <TickBox label="Female" checked={formData.p_gender === 'Female'} />
                 <TickBox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-[8px] font-black text-slate-800 uppercase pt-1">c) Age:</span>
              <div className="flex gap-3">
                <GridInput value={String(formData.p_age_y || '')} length={2} subLabel="Years" />
                <GridInput value="" length={2} subLabel="Months" />
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-[8px] font-black text-slate-800 uppercase pt-1">d) Date of birth:</span>
              <DateGrid value={formData.p_dob} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-5">
            <div className="flex items-end"><span className="text-[8px] font-black text-slate-800 uppercase w-32 pb-1.5">e) Contact Number:</span><GridInput value={formData.p_contact || ''} length={15} /></div>
            <div className="flex items-end"><span className="text-[8px] font-black text-slate-800 uppercase w-48 pb-1.5">f) Contact number of relative:</span><GridInput value={formData.p_relative_contact || ''} length={15} /></div>
            <div className="flex items-end"><span className="text-[8px] font-black text-slate-800 uppercase w-32 pb-1.5">g) Insured Card ID No:</span><GridInput value={formData.p_card_id || ''} length={20} /></div>
            <div className="flex items-end"><span className="text-[8px] font-black text-slate-800 uppercase w-48 pb-1.5">h) Policy No./Corp Name:</span><GridInput value={formData.p_policy_no || ''} length={20} /></div>
          </div>

          <div className="flex items-end"><span className="text-[8px] font-black text-slate-800 uppercase w-32 pb-1.5">i) Employee ID:</span><GridInput value={formData.p_employee_id || ''} length={15} /></div>

          <div className="flex items-center gap-10 bg-slate-50/50 p-2 border border-slate-100 rounded-sm">
            <span className="text-[8px] font-black text-slate-800 uppercase">j) Currently do you have any Medicliam/Health Insurance:</span>
            <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
            <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
          </div>

          <div className="pl-8 space-y-4">
            <div className="flex items-end"><span className="text-[8px] font-black text-slate-500 uppercase w-32 pb-1.5">i) Company Name:</span><GridInput value={formData.p_other_insurer_name || ''} length={40} /></div>
            <UnderlineField label="ii) Give details:" value="" />
          </div>

          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <span className="text-[8px] font-black text-slate-800 uppercase">k) Do you have a family physician:</span>
              <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
              <TickBox label="No" checked={formData.p_family_physician === 'No'} />
            </div>
            <UnderlineField label="l) Name of family physician:" value={formData.p_family_physician_name || ''} className="flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div className="flex items-end"><span className="text-[8px] font-black text-slate-800 uppercase w-32 pb-1.5">m) Contact No:</span><GridInput value={formData.p_family_physician_contact || ''} length={15} /></div>
            <UnderlineField label="n) Current Address:" value={formData.p_address || ''} className="flex-1" />
          </div>
          
          <UnderlineField label="o) Occupation of Insured Patient:" value={formData.p_occupation || ''} />
        </div>

        <p className="text-[7.5px] text-center font-black text-[#e31e24] uppercase mb-2 tracking-widest">(PLEASE COMPLETE DECLARATION OF THIS FORM)</p>

        <RedBanner>TO BE FILLED BY TREATING DOCTOR/HOSPITAL</RedBanner>

        <div className="space-y-4 text-[8.5px]">
          <div className="grid grid-cols-2 gap-12">
            <div className="flex items-end"><span className="font-black text-slate-800 uppercase w-40 pb-1.5">a) Name of Treating Doctor:</span><GridInput value={formData.dr_name || ''} length={25} /></div>
            <div className="flex items-end"><span className="font-black text-slate-800 uppercase w-32 pb-1.5">b) Contact Number:</span><GridInput value={formData.dr_contact || ''} length={12} /></div>
          </div>
          <div className="grid grid-cols-2 gap-12">
            <UnderlineField label="c) Nature of illness/ complaints" value={formData.m_illness || ''} />
            <UnderlineField label="d) Relevant clinical findings" value={formData.m_clinical_findings || ''} />
          </div>
          <div className="flex items-start gap-12">
            <div className="flex items-start gap-2"><span className="font-black text-slate-800 uppercase pt-1">e) Duration:</span><GridInput value={String(formData.m_duration || '')} length={3} subLabel="Days" /></div>
            <div className="flex items-start gap-4"><span className="font-black text-slate-800 uppercase pt-1">i) Date of 1st consultation:</span><DateGrid value={formData.m_first_cons_date} /></div>
            <UnderlineField label="ii) Past history of ailment:" value="" className="flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-12">
            <UnderlineField label="f) Provisional Diagnosis" value={formData.m_prov_diag || ''} />
            <div className="flex items-end"><span className="font-black text-slate-800 uppercase w-32 pb-1.5">i) ICD Code:</span><GridInput value={formData.m_icd_code || ''} length={15} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3">
            <span className="font-black text-slate-800 uppercase text-[8px]">g) Proposed line of treatment</span>
            <TickBox label="i) Medical" checked={formData.m_treatment_type === 'Medical Management'} />
            <TickBox label="ii) Surgical" checked={formData.m_treatment_type === 'Surgical Management'} />
            <TickBox label="iii) Intensive Care" checked={formData.m_treatment_type === 'Intensive care'} />
            <TickBox label="iv) Investigation" checked={formData.m_treatment_type === 'Investigation'} />
            <TickBox label="v) Non-allopathic" checked={false} />
          </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between items-center text-[7.5px] font-black text-slate-400 border-t border-slate-100">
          <p className="max-w-[85%] leading-tight uppercase">HDFC ERGO General Insurance Company Limited (Formerly HDFC General Insurance Limited). Registered & Corporate Office: 1st Floor, HDFC House, 165-166 Backbay Reclamation, H. T. Parekh Marg, Churchgate, Mumbai – 400 020. CIN: U66030MH2007PLC177117. IRDAI Reg No. 146.</p>
          <div className="bg-slate-800 text-white w-5 h-5 flex items-center justify-center rounded-sm font-black">1</div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-8 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-8 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <div className="space-y-4 mb-8">
           <div className="grid grid-cols-2 gap-12">
              <UnderlineField label="h) Medical Management details" value="" />
              <UnderlineField label="i) Route of drug administration" value={formData.m_route_drug || ''} />
           </div>
           <div className="grid grid-cols-2 gap-12">
              <UnderlineField label="i) Name of surgery" value={formData.m_surgery_name || ''} />
              <div className="flex items-end"><span className="text-[8px] font-black text-slate-800 uppercase w-32 pb-1.5">i) ICD 10 PCS code</span><GridInput value={formData.m_icd_code || ''} length={15} /></div>
           </div>
           <div className="grid grid-cols-2 gap-12">
              <UnderlineField label="j) Other treatment details" value="" />
              <UnderlineField label="k) How did injury occur" value="" />
           </div>
           <div className="space-y-2 border-l-4 border-slate-200 pl-4 bg-slate-50/30 py-2">
              <span className="text-[8.5px] font-black text-slate-800 uppercase">l) In case of Accident:</span>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 pl-2 mt-2">
                 <div className="flex items-center gap-6"><span className="text-[8px] font-bold text-slate-600">i. Is it RTA:</span><TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} /><TickBox label="No" checked={formData.m_is_rta === 'No'} /></div>
                 <div className="flex items-start gap-4"><span className="text-[8px] font-bold text-slate-600 pt-1">ii. Date of injury:</span><DateGrid value={formData.m_rta_date} /></div>
                 <div className="flex items-center gap-6"><span className="text-[8px] font-bold text-slate-600">iii. Reported to police:</span><TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} /><TickBox label="No" checked={formData.m_rta_police === 'No'} /></div>
                 <UnderlineField label="iv. FIR No.:" value={formData.m_fir_no || ''} />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-12 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-6"><span className="text-[8.5px] font-black text-slate-800 uppercase">v) Substance abuse/alcohol:</span><TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} /><TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} /></div>
              <div className="flex items-center gap-6"><span className="text-[8.5px] font-black text-slate-800 uppercase">vi) Test conducted:</span><TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} /><TickBox label="No" checked={formData.m_test_conducted === 'No'} /></div>
           </div>
           <div className="flex items-center gap-6 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-4">
                 <span className="text-[8.5px] font-black text-slate-800 uppercase">m) In case of Maternity:</span>
                 <div className="flex space-x-2 border border-slate-800 p-1">
                    <span className="text-[8px] font-bold">G</span><span className="text-[8px] font-bold">P</span><span className="text-[8px] font-bold">L</span><span className="text-[8px] font-bold">A</span>
                 </div>
              </div>
              <div className="flex items-start gap-4 ml-6">
                 <span className="text-[8.5px] font-black text-slate-800 uppercase pt-1">i) Expected Date of Delivery:</span>
                 <DateGrid value={formData.m_mat_edd} />
              </div>
           </div>
        </div>

        <p className="text-[11px] font-black uppercase text-slate-800 mb-6 border-b-2 border-slate-800 pb-1.5 tracking-tight flex items-center">
           <Zap size={16} className="mr-2 text-[#e31e24]" /> Details of patient admitted
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-10">
           <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div className="flex items-start gap-4"><span className="text-[8.5px] font-black text-slate-800 uppercase pt-1">a) Date of admission:</span><DateGrid value={formData.adm_date} /></div>
                 <div className="flex items-start gap-4"><span className="text-[8.5px] font-black text-slate-800 uppercase pt-1">b) Time:</span><TimeGrid value={formData.adm_time} /></div>
              </div>
              <div className="flex items-center gap-8 bg-slate-50 p-2 border border-slate-100 rounded-sm">
                 <span className="text-[8.5px] font-black text-slate-800 uppercase">c) Type of event:</span>
                 <TickBox label="Emergency" checked={formData.adm_type === 'Emergency'} />
                 <TickBox label="Planned" checked={formData.adm_type === 'Planned'} />
              </div>
              <div className="flex items-start gap-12">
                 <div className="flex items-start gap-4"><span className="text-[8.5px] font-black text-slate-800 uppercase pt-1">e) Stay (Days):</span><GridInput value={String(formData.adm_stay_days || '')} length={3} /></div>
                 <div className="flex-1"><UnderlineField label="g) Room Type:" value={formData.adm_room_type || ''} /></div>
              </div>

              <div className="space-y-2.5 mt-8 border-t border-slate-100 pt-6">
                 {[
                    { label: "h) Room Rent + Nursing + Service + Diet", id: 'cost_room_rent' },
                    { label: "i) Expected Investigation + Diagnostics", id: 'cost_investigation' },
                    { label: "j) ICU Charges", id: 'cost_icu' },
                    { label: "k) OT Charges", id: 'cost_ot' },
                    { label: "l) Professional Fees (Surgeon/Cons)", id: 'cost_prof_fees' },
                    { label: "m) Medicines + Consumables + Implants", id: 'cost_medicines' },
                    { label: "n) Other Hospital Expenses", id: 'cost_other' },
                    { label: "o) All Inclusive Package Charges", id: 'cost_package' },
                    { label: "p) SUM TOTAL EXPECTED COST", id: 'adm_total_cost', bold: true },
                 ].map(item => (
                    <div key={item.id} className={`flex items-end border-b border-slate-100 pb-1 ${item.bold ? 'border-black mt-4' : ''}`}>
                       <span className={`text-[8px] font-black uppercase ${item.bold ? 'text-black' : 'text-slate-600'}`}>{item.label}</span>
                       <div className="flex-1 text-right pr-6 text-[8.5px] font-black text-blue-700">Rs. <span className="text-black ml-1">{Number(formData[item.id] || 0).toLocaleString()}</span></div>
                       <GridInput value={String(formData[item.id] || 0)} length={7} />
                    </div>
                 ))}
              </div>
           </div>

           <div className="lg:col-span-5 bg-[#fef2f2]/40 p-6 rounded-[2.5rem] border-2 border-[#e31e24]/10 shadow-sm">
              <p className="text-[10px] font-black uppercase text-[#e31e24] mb-6 border-b border-[#e31e24]/20 pb-3 flex items-center">
                 <HistoryIcon size={14} className="mr-2" /> d) Chronic Illness History
              </p>
              <div className="space-y-4">
                 {[
                    { label: "i) Diabetes", key: "diabetes" },
                    { label: "ii) Heart Disease", key: "heart" },
                    { label: "iii) Hypertension", key: "hypertension" },
                    { label: "iv) Hyperlipidemias", key: "hyperlipidemias" },
                    { label: "v) Osteoarthritis", key: "osteoarthritis" },
                    { label: "vi) Asthma/ COPD", key: "asthma" },
                    { label: "vii) Cancer", key: "cancer" },
                    { label: "viii) Alcohol/Drug abuse", key: "alcohol" },
                    { label: "ix) HIV/STD Related", key: "hiv" },
                    { label: "x) Any other Ailment:", key: "other" },
                 ].map(ill => (
                    <div key={ill.key} className="flex items-center justify-between group">
                       <span className="text-[8.5px] font-black text-slate-700 uppercase group-hover:text-blue-700 transition-colors">{ill.label}</span>
                       <div className="flex gap-2">
                          <GridInput value="" length={2} subLabel="M" />
                          <GridInput value="" length={2} subLabel="Y" />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <RedBanner>DECLARATION (Please read carefully)</RedBanner>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
           <div className="space-y-6">
              <UnderlineField label="a) Name of treating doctor:" value={formData.dr_name || ''} />
              <UnderlineField label="b) Qualification:" value="MBBS, MD" />
              <UnderlineField label="c) Registration No. (State Code):" value={formData.registrationNo || ''} />
              <div className="border-2 border-black/10 p-10 h-32 relative flex items-center justify-center bg-slate-50/50 rounded-2xl">
                 <span className="absolute top-2 left-2 text-[6px] font-black uppercase text-slate-400">Official Hospital Seal</span>
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
              </div>
           </div>
           <div className="flex flex-col justify-end">
              <div className="border-2 border-black/10 p-10 h-32 relative flex items-center justify-center bg-slate-50/50 rounded-2xl">
                 <span className="absolute top-2 left-2 text-[6px] font-black uppercase text-slate-400">Patient/ Insured Signature</span>
              </div>
           </div>
        </div>

        <RedBanner>HOSPITAL DECLARATION</RedBanner>
        <div className="text-[7.5px] text-justify leading-relaxed mb-10 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 italic font-medium">
           <p className="mb-2">a. We have no objection to any authorized TPA/ Insurance Company official verifying documents pertaining to hospitalization.</p>
           <p className="mb-2">b. All valid original documents duly countersigned by the insured/patient as per the checklist below will be sent to TPA / Insurance Company within 7 days of the patient's discharge.</p>
           <p>i. In the event of unauthorized recovery of any additional amount from the Insured in excess of Agreed Package Rates, the authorized TPA / Insurance Company reserves the right to recover the same from us (the Network Provider) and/or take necessary action, as provided under the MOU or applicable laws.</p>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-auto">
           <div className="border border-black p-8 h-24 relative flex items-center justify-center bg-slate-50/30 rounded-xl">
              <span className="absolute top-2 left-2 text-[6px] font-black uppercase text-slate-400">Hospital Seal</span>
              {formData.hospitalSeal && <img src={formData.hospitalSeal} alt="Seal" className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
           </div>
           <div className="border border-black p-8 h-24 relative flex items-center justify-center bg-slate-50/30 rounded-xl">
              <span className="absolute top-2 left-2 text-[6px] font-black uppercase text-slate-400">Doctor's Signature</span>
              {formData.doctorStamp && <img src={formData.doctorStamp} alt="Stamp" className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
           </div>
        </div>

        <div className="mt-8 pt-4 flex justify-between items-center text-[7.5px] font-black text-slate-400 border-t border-slate-100">
          <p className="max-w-[85%] leading-tight uppercase">HDFC ERGO General Insurance Company Limited (Formerly HDFC General Insurance Limited). IRDAI Reg No. 146.</p>
          <div className="bg-slate-800 text-white w-5 h-5 flex items-center justify-center rounded-sm font-black">2</div>
        </div>
      </div>
    </div>
  );
};

export default HdfcErgoTemplate;
