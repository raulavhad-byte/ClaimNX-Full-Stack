
import React from 'react';

interface MediAssistTemplateProps {
  formData: Record<string, any>;
}

const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-black text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black bg-white">
        {chars.map((char, i) => (
<div key={i} className="w-[11.5px] h-[13px] shrink-0 border-r border-b border-black flex items-center justify-center text-[9px] font-black text-[#00338d]">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
    </div>
  );
};

const DateGrid: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const d = value ? new Date(value) : null;
  const day = d ? d.getDate().toString().padStart(2, '0') : '  ';
  const month = d ? (d.getMonth() + 1).toString().padStart(2, '0') : '  ';
  const year = d ? d.getFullYear().toString() : '    ';
  const sequence = [...day.split(''), ...month.split(''), ...year.split('')];

  return (
    <div className="flex flex-col">
      {label && <span className="text-[7.5px] font-black text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex">
        {sequence.map((char, i) => (
<div key={i} className={`w-[11.5px] h-[13px] shrink-0 border border-black flex items-center justify-center text-[9px] font-black text-[#00338d] bg-white ${i === 1 || i === 3 ? 'mr-1.5' : '-ml-[1px]'}`}>
            {char}
          </div>
        ))}
      </div>
      <div className="flex text-[5.5px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
        <span className="w-[23px] text-center">D D</span>
        <span className="w-[23px] text-center ml-1">M M</span>
        <span className="w-[46px] text-center ml-1">Y Y Y Y</span>
      </div>
    </div>
  );
};

const TickBox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    <span className="text-[8.5px] font-bold text-black uppercase">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8.5px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className="text-[9.5px] font-black text-[#00338d] uppercase flex-1 truncate">{value}</span>
  </div>
);

const Header: React.FC = () => (
  <div className="mb-4 relative">
    <div className="flex justify-between items-start">
      {/* High Fidelity Medi Assist Logo recreation as requested */}
      <div className="flex flex-col items-center shrink-0 w-16">
        <div className="relative w-12 h-10">
          {/* Stylized Figure 1 (Left - Orange/Yellow) */}
          <div className="absolute left-0 bottom-0 w-8 h-8">
            <div className="w-3 h-3 bg-[#fbb040] rounded-full absolute -top-1 left-2.5 shadow-sm"></div>
            <svg viewBox="0 0 100 100" className="w-full h-full fill-[#fbb040] drop-shadow-sm">
              <path d="M20,100 Q50,40 80,100 Z" />
            </svg>
          </div>
          {/* Stylized Figure 2 (Right - Green) */}
          <div className="absolute right-0 bottom-1 w-6 h-6">
            <div className="w-2.5 h-2.5 bg-[#8dc63f] rounded-full absolute -top-1 left-1.5 shadow-sm"></div>
            <svg viewBox="0 0 100 100" className="w-full h-full fill-[#8dc63f] drop-shadow-sm">
              <path d="M20,100 Q50,40 80,100 Z" />
            </svg>
          </div>
          {/* Small trademark-like dot */}
          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full absolute top-1 right-[-4px]"></div>
        </div>
        <span className="text-[9px] font-black text-[#414099] uppercase tracking-tighter mt-1" style={{ fontFamily: 'system-ui' }}>Medi Assist</span>
      </div>
      
      <div className="flex-1 text-center px-8">
        <h1 className="text-[14px] font-black text-slate-800 uppercase tracking-tight leading-tight">REQUEST FOR CASHLESS HOSPITALISATION FOR HEALTH INSURANCE POLICY</h1>
        <h2 className="text-[12px] font-black text-slate-800 uppercase">PART C (Revised)</h2>
      </div>

      <div className="text-right pt-6">
        <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest">TO BE FILLED IN BLOCK LETTERS</p>
      </div>
    </div>
  </div>
);

const SectionDivider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-black text-white py-1 px-4 text-[10px] font-black uppercase tracking-widest my-2">
    {children}
  </div>
);

const MediAssistTemplate: React.FC<MediAssistTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-8 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col overflow-hidden">
        <Header />
        
        <div className="space-y-3 mb-4">
          <div className="flex items-start">
            <span className="text-[8px] font-bold w-32 pt-2 uppercase">Name of the hospital:</span>
            <GridBox value={formData.hosp_name || ''} length={60} className="flex-1" />
          </div>
          <div className="flex items-start">
            <span className="text-[8px] font-bold w-32 pt-2 uppercase">Hospital location:</span>
            <GridBox value={formData.hosp_address?.split(',')[0] || ''} length={50} />
            <div className="flex items-end gap-2 ml-auto">
               <span className="text-[8px] font-bold pb-1 uppercase">Hospital ID:</span>
               <GridBox value="" length={15} />
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-[8px] font-bold w-32 pt-2 uppercase">Hospital email ID:</span>
            <GridBox value={formData.hosp_email || ''} length={40} />
            <div className="flex items-end gap-2 ml-auto">
               <span className="text-[8px] font-bold pb-1 uppercase">ROHINI ID:</span>
               <GridBox value={formData.hosp_rohini_id || ''} length={15} />
            </div>
          </div>
        </div>

        <p className="text-[8px] font-black uppercase underline mb-2">DETAILS OF THIRD PARTY ADMINISTRATOR</p>
        <div className="flex items-end gap-6 mb-4">
          <div className="flex items-end gap-2">
             <span className="text-[8px] font-bold pb-1">a) Name of TPA company:</span>
             <span className="text-[9.5px] font-black border-b border-black min-w-[200px]">Medi Assist Insurance TPA Pvt Ltd</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-[8px] font-bold pb-1">b) Phone no.:</span>
             <span className="text-[9.5px] font-black border-b border-black">080 22068666</span>
          </div>
          <div className="flex items-end gap-2 flex-1">
             <span className="text-[8px] font-bold pb-1">c) Toll Free Fax no.:</span>
             <span className="text-[9.5px] font-black border-b border-black">1800 425 9559</span>
          </div>
        </div>

        <SectionDivider>TO BE FILLED BY INSURED/PATIENT</SectionDivider>
        <div className="space-y-4 mb-6">
           <div className="flex items-start">
              <span className="text-[8px] font-bold w-32 pt-2 uppercase">a) Name of the patient:</span>
              <GridBox value={formData.p_name || ''} length={60} className="flex-1" />
           </div>
           <div className="flex items-start gap-10">
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">b) Gender:</span>
                 <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                 <TickBox label="Female" checked={formData.p_gender === 'Female'} />
                 <TickBox label="Third gender" checked={formData.p_gender === 'Third Gender'} />
              </div>
              <div className="flex items-end gap-2 flex-1">
                 <span className="text-[8px] font-bold pb-1 uppercase">c) Contact no.:</span>
                 <GridBox value={formData.p_contact || ''} length={10} />
              </div>
              <div className="flex items-end gap-2 flex-1">
                 <span className="text-[8px] font-bold pb-1 uppercase">d) Alternate contact no.:</span>
                 <GridBox value="" length={10} />
              </div>
           </div>
           <div className="flex items-start gap-10">
              <div className="flex items-start gap-2">
                 <span className="text-[8px] font-bold pt-1 uppercase">e) Age: Years</span>
                 <GridBox value={String(formData.p_age_y || '')} length={2} />
                 <span className="text-[8px] font-bold pt-1 uppercase">Months</span>
                 <GridBox value="" length={2} />
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">f) Date of birth:</span>
                 <DateGrid value={formData.p_dob} />
              </div>
              <div className="flex items-end gap-2 flex-1">
                 <span className="text-[8px] font-bold pb-1 uppercase">g) Insurer ID card no.:</span>
                 <GridBox value={formData.p_card_id || ''} length={20} />
              </div>
           </div>
           <div className="flex items-start gap-10">
              <div className="flex items-start gap-2 flex-1">
                 <span className="text-[8px] font-bold pt-2 uppercase">h) Policy number/Name of corporate:</span>
                 <GridBox value={`${formData.p_policy_no || ''}${formData.corporate_name ? ' / ' + formData.corporate_name : ''}`} length={30} className="flex-1" />
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">i) Employee ID:</span>
                 <GridBox value={formData.p_employee_id || ''} length={15} />
              </div>
           </div>
           <div className="flex items-center gap-10">
              <span className="text-[8px] font-bold uppercase">j) Currently do you have any other medical claim/health Insurance:</span>
              <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
              <div className="flex items-end gap-2 flex-1 ml-4">
                 <span className="text-[8px] font-bold pb-1 uppercase">j.1) Insurer name:</span>
                 <GridBox value={formData.p_other_insurer_name || ''} length={25} />
              </div>
           </div>
           <UnderlineField label="j.2) Give details:" value="" />
           <div className="flex items-start">
              <span className="text-[8px] font-bold w-48 pt-2 uppercase">k) Do you have a family physician, if yes: Name:</span>
              <GridBox value={formData.p_family_physician_name || ''} length={40} className="flex-1" />
              <div className="flex items-end gap-2 ml-4">
                 <span className="text-[8px] font-bold pb-1 uppercase">k.1) Contact no.:</span>
                 <GridBox value={formData.p_family_physician_contact || ''} length={10} />
              </div>
           </div>
           <div className="flex items-start">
              <span className="text-[8px] font-bold w-48 pt-2 uppercase">L) Occupation of insured patient:</span>
              <GridBox value={formData.p_occupation || ''} length={40} className="flex-1" />
           </div>
           <div className="space-y-1">
              <span className="text-[8px] font-bold uppercase">m) Address of insured patient:</span>
              <div className="border border-black p-2 h-10 bg-white text-[9px] font-black uppercase">{formData.p_address}</div>
           </div>
        </div>

        <SectionDivider>TO BE FILLED BY THE TREATING DOCTOR/HOSPITAL</SectionDivider>
        <div className="space-y-3">
           <div className="flex items-start">
              <span className="text-[8px] font-bold w-48 pt-2 uppercase">a) Name of the treating doctor:</span>
              <GridBox value={formData.dr_name || ''} length={50} className="flex-1" />
              <div className="flex items-end gap-2 ml-4">
                 <span className="text-[8px] font-bold pb-1 uppercase">b) Contact no.:</span>
                 <GridBox value={formData.dr_contact || ''} length={10} />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">c) Name of Illness/disease with presenting complaints:</span>
                 <div className="border border-black p-2 h-14 bg-white text-[8px] font-bold uppercase overflow-hidden leading-tight">{formData.m_illness}</div>
              </div>
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">d) Relevant clinical findings:</span>
                 <div className="border border-black p-2 h-14 bg-white text-[8px] font-bold uppercase overflow-hidden leading-tight">{formData.m_clinical_findings}</div>
              </div>
           </div>
           <div className="flex items-start gap-10">
              <div className="flex items-center gap-2">
                 <span className="text-[8px] font-bold uppercase">e) Duration of the present ailment:</span>
                 <div className="w-16 h-7 border border-black flex items-center justify-center text-[10px] font-black">{formData.m_duration || ''}</div>
                 <span className="text-[8px] font-bold uppercase">days</span>
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">e.1) Date of first consultation:</span>
                 <DateGrid value={formData.m_first_cons_date} />
              </div>
           </div>
           <UnderlineField label="e.2) Past history of present ailment if any:" value="" />
           <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 space-y-1">
                 <span className="text-[8px] font-bold uppercase">f) Provisional diagnosis:</span>
                 <div className="border border-black p-2 h-10 bg-white text-[8px] font-bold uppercase">{formData.m_prov_diag}</div>
              </div>
              <div className="col-span-4 flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">f.1) ICD 10 code:</span>
                 <GridBox value={formData.m_icd_code || ''} length={10} />
              </div>
           </div>
           <div className="space-y-2">
              <span className="text-[8px] font-bold uppercase">g) Proposed line of treatment:</span>
              <div className="flex flex-wrap gap-x-6 gap-y-1 pl-4">
                 <TickBox label="Medical management" checked={formData.m_treatment_type === 'Medical Management'} />
                 <TickBox label="Surgical management" checked={formData.m_treatment_type === 'Surgical Management'} />
                 <TickBox label="Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
                 <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
                 <TickBox label="Non-Allopathic treatment" checked={false} />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">h) If investigation and/or medical management, provide details:</span>
                 <div className="border border-black p-2 h-12 bg-white"></div>
              </div>
              <div className="space-y-2">
                 <span className="text-[8px] font-bold uppercase">h.1) Route of drug administration:</span>
                 <div className="flex gap-4 mb-2">
                    <TickBox label="IV" checked={formData.m_route_drug === 'IV'} />
                    <TickBox label="Oral" checked={formData.m_route_drug === 'Oral'} />
                    <TickBox label="Other" checked={false} />
                 </div>
                 <div className="border border-black p-2 h-7 bg-white"></div>
              </div>
           </div>
           <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 space-y-1">
                 <span className="text-[8px] font-bold uppercase">i) If Surgical, name of surgery:</span>
                 <div className="border border-black p-2 h-10 bg-white text-[8px] font-bold uppercase">{formData.m_surgery_name}</div>
              </div>
              <div className="col-span-4 flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">i.1) ICD 10 PCS code:</span>
                 <GridBox value="" length={10} />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">j) If other treatments provide details:</span>
                 <div className="border border-black p-2 h-12 bg-white"></div>
              </div>
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">k) How did injury occur:</span>
                 <div className="border border-black p-2 h-12 bg-white"></div>
              </div>
           </div>
           <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border border-black p-2 bg-slate-50/50">
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">L) In case of accident: I. Is it RTA:</span>
                 <TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                 <TickBox label="No" checked={formData.m_is_rta === 'No'} />
              </div>
              <div className="flex items-start gap-2">
                 <span className="text-[8px] font-bold pt-1 uppercase">ii. Date of injury:</span>
                 <DateGrid value={formData.m_rta_date} />
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">iii. Reported to Police:</span>
                 <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                 <TickBox label="No" checked={formData.m_rta_police === 'No'} />
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">iv. FIR no.:</span>
                 <GridBox value={formData.m_fir_no || ''} length={10} />
              </div>
           </div>
           <div className="flex items-center gap-10">
              <span className="text-[8px] font-bold uppercase">v. Injury/Disease caused due to substance abuse/alcohol consumption:</span>
              <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
              <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
              <div className="flex items-center gap-4 ml-6">
                 <span className="text-[8px] font-bold uppercase">vi. Test conducted to establish this, If yes attach reports:</span>
                 <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                 <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
              </div>
           </div>
           <div className="flex items-center gap-10">
              <div className="flex items-center gap-2">
                 <span className="text-[8px] font-bold uppercase mr-4">m) In case of maternity:</span>
                 <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-5 h-5 flex items-center justify-center border-r last:border-r-0 border-black text-[9px] font-bold">{l}</div>)}</div>
              </div>
              <div className="flex items-start gap-4 flex-1">
                 <span className="text-[8px] font-bold pt-1 uppercase">n) Expected date of delivery:</span>
                 <DateGrid value="" />
              </div>
           </div>
        </div>

        <p className="text-[9px] font-black uppercase text-blue-900 border-b border-blue-100 pb-0.5 mt-4">DETAILS OF THE PATIENT ADMITTED</p>
        <div className="space-y-3 pt-2">
           <div className="flex items-start gap-12">
              <div className="flex items-start gap-4"><span className="text-[8px] font-bold pt-1 uppercase">a) Date of admission:</span><DateGrid value={formData.adm_date} /></div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">b) Time of admission:</span>
                 <div className="flex border border-black h-5">
                    <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{formData.adm_time?.split(':')[0] || ' '}</div>
                    <div className="w-5 flex items-center justify-center font-black text-[9px]">{formData.adm_time?.split(':')[1] || ' '}</div>
                 </div>
                 <span className="text-[6px] font-bold pt-1.5 uppercase text-slate-400">H H M M</span>
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">c) This is</span>
                 <TickBox label="an emergency/" checked={false} />
                 <TickBox label="a planned hospitalization event" checked={true} />
              </div>
           </div>
           <div className="flex items-end gap-10">
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">d) Expected no. of days stay in hospital:</span>
                 <div className="w-16 h-7 border border-black flex items-center justify-center text-[10px] font-black">{formData.adm_stay_days || ''}</div>
                 <span className="text-[8px] font-bold pb-1 uppercase">Days</span>
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">e) Days in ICU:</span>
                 <div className="w-16 h-7 border border-black flex items-center justify-center text-[10px] font-black"></div>
                 <span className="text-[8px] font-bold pb-1 uppercase">Days</span>
              </div>
              <UnderlineField label="f) Room type:" value={formData.adm_room_type || ''} className="flex-1" />
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-end text-[7px] font-bold text-slate-400">
           Page 1 of 2 | Version: 25.06.2019
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-8 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative">
        <Header />
        
        <div className="grid grid-cols-12 gap-10">
           <div className="col-span-7 space-y-2">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-4 border-b pb-1">ESTIMATED EXPENDITURE FOR HOSPITALIZATION</p>
              {[
                 { label: "g) Per Day Room Rent + Nursing & Service charges + Patient’s Diet:", id: "cost_room_rent" },
                 { label: "h) Expected cost for investigation + diagnostics:", id: "cost_investigation" },
                 { label: "i) ICU Charges:", id: "cost_icu" },
                 { label: "j) OT Charges:", id: "cost_ot" },
                 { label: "k) Professional fees Surgeon + Anesthetist fees + Consultation charges:", id: "cost_prof_fees" },
                 { label: "L) Medicines + Consumables cost of Implants:", id: "cost_medicines", sub: "(specify if applicable)" },
                 { label: "m) Other hospital expenses if any:", id: "cost_other" },
                 { label: "n) All inclusive package charges if any applicable :", id: "cost_package" },
                 { label: "o) Sum Total expected cost of hospitalization", id: "adm_total_cost", bold: true },
              ].map((item, idx) => (
                 <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                    <div className="flex flex-col">
                       <span className={`text-[7.5px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                       {item.sub && <span className="text-[6px] text-slate-400 font-bold lowercase italic leading-none">{item.sub}</span>}
                    </div>
                    <div className="flex items-center">
                       <span className="text-[8px] mr-2 font-black">Rs.</span>
                       <GridBox value={String(formData[item.id] || 0)} length={7} />
                    </div>
                 </div>
              ))}
           </div>

           <div className="col-span-5 bg-slate-50/50 p-4 border-l border-black">
              <p className="text-[8.5px] font-black uppercase mb-4 leading-tight">p. Mandatory past history of any chronic illness. <span className="lowercase font-bold italic">If yes (since month/year)</span></p>
              <div className="space-y-2.5">
                 {[
                    "Diabetes", "Heart Disease", "Hypertension", "Hyperlipidemias", "Osteoarthritis",
                    "Asthma / COPD / Bronchitis", "Cancer", "Alcohol or drug abuse", "Any HIV or STD / related ailments"
                 ].map((ill, i) => (
                    <div key={i} className="flex items-center justify-between group">
                       <div className="flex items-center gap-2 flex-1">
                          <div className="w-[10px] h-[10px] border border-black bg-white"></div>
                          <span className="text-[7.5px] font-black uppercase text-slate-700 truncate">{ill}</span>
                       </div>
                       <div className="flex gap-1.5">
                          <div className="flex border border-black h-[14px] bg-white">
                             <div className="w-[10px] border-r border-black flex items-center justify-center text-[7px] font-black">M</div>
                             <div className="w-[10px] flex items-center justify-center text-[7px] font-black">M</div>
                          </div>
                          <div className="flex border border-black h-[14px] bg-white">
                             <div className="w-[10px] border-r border-black flex items-center justify-center text-[7px] font-black">Y</div>
                             <div className="w-[10px] flex items-center justify-center text-[7px] font-black">Y</div>
                          </div>
                       </div>
                    </div>
                 ))}
                 <div className="pt-2">
                    <span className="text-[7px] font-bold uppercase">10. Any other ailment give details:</span>
                    <div className="border-b border-black h-8 mt-1"></div>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-8 border-t-2 border-black pt-4">
           <h3 className="text-[10px] font-black text-center uppercase tracking-tight mb-2 underline">DECLARATION (PLEASE READ VERY CAREFULLY)</h3>
           <p className="text-[8px] font-black text-center mb-6 uppercase">We confirm having read understood and agreed to the declaration of this form</p>
           
           <div className="space-y-4 px-4">
              <div className="flex items-end">
                 <span className="text-[8.5px] font-bold w-48 pb-2 uppercase">a) Name of the treating doctor:</span>
                 <GridBox value={formData.dr_name || ''} length={50} className="flex-1" />
              </div>
              <div className="grid grid-cols-2 gap-10">
                 <UnderlineField label="b) Qualification:" value="MBBS, MD" />
                 <div className="flex items-end gap-2">
                    <span className="text-[8.5px] font-bold pb-1 uppercase">c) Registration No. with State code:</span>
                    <GridBox value={formData.registrationNo || ''} length={15} />
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-8 px-4 space-y-6">
           <h3 className="text-[9px] font-black uppercase underline">DECLARATION BY THE PATIENT / REPRESENTATIVE</h3>
           <div className="text-[6.5px] text-justify space-y-1 text-slate-600 leading-tight">
              <p>a. I agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer/TPA after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
              <p>b. Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer / TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
              <p>c. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer/TPA not governed by the terms and conditions of the policy will be paid by me.</p>
              <p>d. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the insurer / TPA</p>
              <p>e. I agree and understand that TPA is in no way warranting the service of the hospital & that the Insurer / TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
              <p>f. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
              <p>g. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer/ TPA.</p>
              <p>h. “I/We authorize Insurance Company/TPA to contact me/us through mobile/email for any update on this claim”</p>
           </div>

           <div className="grid grid-cols-12 gap-8 pt-4">
              <div className="col-span-8 space-y-3">
                 <div className="flex items-end">
                    <span className="text-[8.5px] font-bold w-40 pb-1 uppercase">a) Patient’s / Insured’s name:</span>
                    <GridBox value={formData.p_name || ''} length={30} className="flex-1" />
                 </div>
                 <div className="flex items-end">
                    <span className="text-[8.5px] font-bold w-40 pb-1 uppercase">b) Contact number:</span>
                    <GridBox value={formData.p_contact || ''} length={10} />
                    <span className="text-[8.5px] font-bold ml-4 pb-1 uppercase">c) Email ID: (Optional)</span>
                    <GridBox value={formData.p_email || ''} length={20} className="flex-1" />
                 </div>
              </div>
              <div className="col-span-4 border-2 border-black/10 p-4 h-24 relative flex items-end justify-center bg-slate-50/50">
                 <span className="absolute top-1 left-1 text-[6px] font-bold text-slate-300 uppercase">d) Patient's / Insured's signature</span>
              </div>
           </div>
        </div>

        <div className="mt-8 px-4 flex justify-between items-center gap-12">
           <div className="flex flex-col items-center flex-1">
              <div className="w-full h-24 border border-black flex items-center justify-center relative bg-slate-50/10">
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
                 <span className="absolute top-1 left-1 text-[6px] font-bold text-slate-300 uppercase">Hospital seal</span>
              </div>
           </div>
           <div className="flex flex-col items-center flex-1">
              <div className="w-full h-24 border border-black flex items-center justify-center relative bg-slate-50/10">
                 {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
                 <span className="absolute top-1 left-1 text-[6px] font-bold text-slate-300 uppercase">Doctor's signature</span>
              </div>
           </div>
        </div>

        <div className="mt-6 px-4 flex justify-between">
           <div className="flex items-center gap-4">
              <span className="text-[8.5px] font-bold uppercase">Date:</span>
              <DateGrid value={new Date().toISOString()} />
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[8.5px] font-bold uppercase">Time:</span>
              <div className="flex border border-black h-5">
                 <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{new Date().getHours().toString().padStart(2,'0')}</div>
                 <div className="w-5 flex items-center justify-center font-black text-[9px]">{new Date().getMinutes().toString().padStart(2,'0')}</div>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-end text-[7px] font-bold text-slate-400">
           Page 1 of 2 | Version: 25.06.2019
        </div>
      </div>
    </div>
  );
};

export default MediAssistTemplate;
