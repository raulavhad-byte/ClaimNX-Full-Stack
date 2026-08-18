
import React from 'react';
import { formatDate } from '../utils';

interface ManipalCignaTemplateProps {
  formData: Record<string, any>;
}

const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-black text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black bg-white">
        {chars.map((char, i) => (
<div key={i} className="w-[11px] h-[12px] shrink-0 border-r border-b border-black flex items-center justify-center text-[8px] font-black text-[#00338d]">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[5.5px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
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
<div key={i} className={`w-[11px] h-[12px] shrink-0 border border-black flex items-center justify-center text-[8px] font-black text-[#00338d] bg-white ${i === 1 || i === 3 ? 'mr-1' : '-ml-[1px]'}`}>
            {char}
          </div>
        ))}
      </div>
      <div className="flex text-[5px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
        <span className="w-[21px] text-center">D D</span>
        <span className="w-[21px] text-center ml-1">M M</span>
        <span className="w-[42px] text-center ml-1">Y Y Y Y</span>
      </div>
    </div>
  );
};

const TimeGrid: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const [h, m] = (value || '  :  ').split(':');
  const hChars = (h || '  ').padStart(2, ' ').split('');
  const mChars = (m || '  ').padStart(2, ' ').split('');

  return (
    <div className="flex flex-col">
      {label && <span className="text-[7.5px] font-black text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex items-center space-x-1">
        <div className="flex border border-black bg-white">
           <div className="w-[11px] h-[12px] shrink-0 border-r border-black flex items-center justify-center text-[8px] font-black text-[#00338d]">{hChars[0]}</div>
           <div className="w-[11px] h-[12px] shrink-0 flex items-center justify-center text-[8px] font-black text-[#00338d]">{hChars[1]}</div>
        </div>
        <span className="font-black text-[10px]">:</span>
        <div className="flex border border-black bg-white">
           <div className="w-[11px] h-[12px] shrink-0 border-r border-black flex items-center justify-center text-[8px] font-black text-[#00338d]">{mChars[0]}</div>
           <div className="w-[11px] h-[12px] shrink-0 flex items-center justify-center text-[8px] font-black text-[#00338d]">{mChars[1]}</div>
        </div>
      </div>
    </div>
  );
};

const TickBox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    <span className="text-[8px] font-bold text-black uppercase">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className="text-[9px] font-black text-[#00338d] uppercase flex-1 truncate leading-none">{value}</span>
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[#1b1c31] text-white py-1 px-4 text-[9px] font-black uppercase tracking-widest my-2">
    {children}
  </div>
);

const ManipalCignaHeader: React.FC = () => (
  <div className="mb-4">
    <div className="flex justify-between items-start mb-6">
      <div className="max-w-[70%]">
        <h1 className="text-[11px] font-black text-slate-800 leading-tight">ManipalCigna Health Insurance Company Limited</h1>
        <p className="text-[7.5px] font-bold text-slate-500 leading-tight">CIN U66000MH2012PLC227948 | IRDAI Reg. No. 151 Reg. Office: 401/402, 4th Floor, Raheja Titanium, off. Western Express Highway, Goregaon (East), Mumbai- 400 063 | Toll free number – 1800-102-4462 Website address-www.manipalcigna.com | E-mail: servicesupport@manipalcigna.com</p>
      </div>
      <div className="text-right flex flex-col items-end shrink-0">
        <div className="flex items-center space-x-2">
           <div className="flex flex-col items-end leading-none">
              <span className="text-[16px] font-black text-[#1b1c31] tracking-tighter">Manipal Cigna</span>
              <span className="text-[7px] font-bold text-[#1b1c31] uppercase tracking-[0.2em] mt-0.5">Health Insurance</span>
           </div>
           <div className="w-8 h-8 border border-[#1b1c31] rounded-full flex items-center justify-center p-1">
              <svg viewBox="0 0 24 24" className="w-full h-full fill-[#1b1c31]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
           </div>
        </div>
        <p className="text-[8px] font-black uppercase text-slate-800 mt-6 tracking-widest">TO BE FILLED IN BLOCK LETTERS</p>
      </div>
    </div>
    <div className="bg-white border-2 border-black p-2 text-center">
       <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800">REQUEST FOR CASHLESS HOSPITALISATION FOR HEALTH INSURANCE POLICY</h2>
       <h3 className="text-[11px] font-black uppercase text-slate-800 mt-1">PART - C (Revised)</h3>
    </div>
  </div>
);

const ManipalCignaTemplate: React.FC<ManipalCignaTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <ManipalCignaHeader />
        
        <SectionHeader>DETAILS OF THE THIRD PARTY ADMINISTRATOR/INSURER/HOSPITAL:</SectionHeader>
        <div className="space-y-3 mb-6">
          <UnderlineField label="a) Name of Insurance Company:" value="ManipalCigna Health Insurance Company Limited" />
          <UnderlineField label="b) Toll Free Phone Number:" value="1800-102-4462" />
          <div className="flex items-end gap-10">
             <UnderlineField label="c) Toll free fax:" value="" className="w-64" />
             <UnderlineField label="d) Name of Hospital:" value={formData.hosp_name || ''} className="flex-1" />
          </div>
          <div className="pl-6 space-y-3">
             <UnderlineField label="i) Address:" value={formData.hosp_address || ''} />
             <div className="grid grid-cols-2 gap-10">
                <UnderlineField label="ii) Rohini ID:" value={formData.hosp_rohini_id || ''} />
                <UnderlineField label="iii) Email ID:" value={formData.hosp_email || ''} />
             </div>
          </div>
        </div>

        <SectionHeader>TO BE FILLED BY THE INSURED / PATIENT:</SectionHeader>
        <div className="space-y-4 mb-6">
           <div className="flex items-start">
              <span className="text-[8px] font-bold w-48 pt-2 uppercase">a) Name of the Patient:</span>
              <div className="flex-1 flex gap-2">
                 <GridBox value={formData.p_name?.split(' ')[2] || ''} length={12} label="S U R N A M E" />
                 <GridBox value={formData.p_name?.split(' ')[0] || ''} length={12} label="F I R S T  N A M E" />
                 <GridBox value={formData.p_name?.split(' ')[1] || ''} length={12} label="M I D D L E  N A M E" />
              </div>
           </div>

           <div className="flex items-start gap-10">
              <div className="flex items-center space-x-3">
                 <span className="text-[8px] font-bold uppercase">b) Gender:</span>
                 <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                 <TickBox label="Female" checked={formData.p_gender === 'Female'} />
                 <TickBox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
              </div>
              <div className="flex items-start gap-2">
                 <span className="text-[8px] font-bold pt-1 uppercase">c) Age: Years</span>
                 <GridBox value={String(formData.p_age_y || '')} length={2} />
                 <span className="text-[8px] font-bold pt-1 uppercase">Months</span>
                 <GridBox value="" length={2} />
              </div>
              <div className="flex items-start gap-4 flex-1">
                 <span className="text-[8px] font-bold pt-1 uppercase">d) Date of Birth:</span>
                 <DateGrid value={formData.p_dob} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-12">
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">e) Contact Number:</span>
                 <GridBox value={formData.p_contact || ''} length={10} />
              </div>
              <div className="flex items-end gap-2 flex-1">
                 <span className="text-[8px] font-bold pb-1 uppercase">f) Contact Number of Attending Relative:</span>
                 <GridBox value={formData.p_relative_contact || ''} length={10} />
              </div>
           </div>

           <div className="flex items-end gap-2">
              <span className="text-[8px] font-bold pb-1 uppercase">g) Insured Card ID Number:</span>
              <GridBox value={formData.p_card_id || ''} length={20} className="flex-1" />
           </div>

           <div className="flex items-start gap-10">
              <div className="flex items-start gap-2 flex-1">
                 <span className="text-[8px] font-bold pt-1 uppercase">h) Policy Number / Name of Corporate:</span>
                 <GridBox value={formData.p_policy_no || ''} length={25} className="flex-1" />
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">i) Employee ID:</span>
                 <GridBox value={formData.p_employee_id || ''} length={12} />
              </div>
           </div>

           <div className="flex items-center gap-10">
              <span className="text-[8px] font-bold uppercase">j) Currently do you have any other Mediclaim / Health Insurance:</span>
              <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
              <div className="flex items-end gap-2 flex-1 ml-4">
                 <span className="text-[8px] font-bold pb-1 uppercase">Company Name:</span>
                 <GridBox value={formData.p_other_insurer_name || ''} length={20} />
              </div>
           </div>
           <UnderlineField label="Give Details:" value="" />

           <div className="flex items-start">
              <div className="flex items-center space-x-4">
                 <span className="text-[8px] font-bold uppercase">k) Do you have a Family Physician:</span>
                 <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
                 <TickBox label="No" checked={formData.p_family_physician === 'No'} />
              </div>
              <div className="flex items-end gap-2 flex-1 ml-10">
                 <span className="text-[8px] font-bold pb-1 uppercase">l) Name of the Family Physician:</span>
                 <GridBox value={formData.p_family_physician_name || ''} length={25} className="flex-1" />
              </div>
           </div>
           
           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">m) Contact Number, if any:</span>
              <GridBox value={formData.p_family_physician_contact || ''} length={10} />
              <span className="text-[6.5px] font-bold text-slate-400 uppercase ml-4 italic">(PLEASE COMPLETE DECLARATION ON THE REVERSE SIDE OF THIS FORM)</span>
           </div>

           <UnderlineField label="n) Current address of Insured Patient:" value={formData.p_address || ''} />
           <UnderlineField label="o) Occupation of Insured Patient:" value={formData.p_occupation || ''} />
        </div>

        <SectionHeader>TO BE FILLED BY THE TREATING DOCTOR / HOSPITAL:</SectionHeader>
        <div className="space-y-3">
           <div className="grid grid-cols-12 gap-8">
              <div className="col-span-8">
                 <UnderlineField label="a) Name of the Treating Doctor:" value={formData.dr_name || ''} />
              </div>
              <div className="col-span-4 flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">b) Contact Number:</span>
                 <GridBox value={formData.dr_contact || ''} length={10} className="flex-1" />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">c) Nature of Illness / Disease with Presenting Complaints:</span>
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
              <div className="flex items-start gap-4 flex-1">
                 <span className="text-[8px] font-bold pt-1 uppercase">i) Date of first consultation:</span>
                 <DateGrid value={formData.m_first_cons_date} />
              </div>
           </div>
           <UnderlineField label="ii) Past history of present ailment if any:" value="" />
           <div className="grid grid-cols-12 gap-4">
              <UnderlineField label="f) Provisional diagnosis:" value={formData.m_prov_diag || ''} className="col-span-9" />
              <div className="col-span-3 flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">i) ICD 10 Code:</span>
                 <GridBox value={formData.m_icd_code || ''} length={8} />
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-slate-100 pt-2">
              <span className="text-[8px] font-bold uppercase">g) Proposed line of treatment:</span>
              <TickBox label="Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
              <TickBox label="Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
              <TickBox label="Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
              <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
              <TickBox label="Non allopathic treatment" checked={false} />
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between items-center text-[7px] font-black text-slate-400">
           <p className="uppercase tracking-widest">Manipal Cigna Standard Form</p>
           <p className="uppercase tracking-widest">Page 1 of 3 | Apr19 onwards</p>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="space-y-4 pt-2">
           <UnderlineField label="h) If Investigation & / or Medical Management provide details:" value="" />
           <UnderlineField label="i) Route of drug administration:" value={formData.m_route_drug || ''} />
           <div className="flex items-end gap-10">
              <UnderlineField label="i) If Surgical, name of surgery:" value={formData.m_surgery_name || ''} className="flex-1" />
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">i) ICD 10 PCS Code:</span>
                 <GridBox value="" length={10} />
              </div>
           </div>
           <UnderlineField label="j) If other treatments provide details:" value="" />
           <UnderlineField label="k) How did injury occur?:" value="" />

           <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 space-y-4">
              <div className="flex items-center gap-10">
                 <div className="flex items-center gap-4">
                    <span className="text-[8px] font-bold uppercase">l) In case of accident: i) Is it RTA?:</span>
                    <TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                    <TickBox label="No" checked={formData.m_is_rta === 'No'} />
                 </div>
                 <div className="flex items-start gap-4">
                    <span className="text-[8px] font-bold pt-1 uppercase">ii) Date of injury:</span>
                    <DateGrid value={formData.m_rta_date} />
                 </div>
              </div>
              <div className="flex items-center gap-10">
                 <div className="flex items-center gap-4">
                    <span className="text-[8px] font-bold uppercase">iii) Reported to Police:</span>
                    <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                    <TickBox label="No" checked={formData.m_rta_police === 'No'} />
                 </div>
                 <UnderlineField label="iv) FIR No.:" value={formData.m_fir_no || ''} className="w-64" />
                 <div className="flex items-center gap-4">
                    <span className="text-[8px] font-bold uppercase">v) Injury due to substance abuse / alcohol:</span>
                    <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                    <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
              </div>
              <div className="flex items-center gap-6">
                 <span className="text-[8px] font-bold uppercase">vi) Test conducted to establish this:</span>
                 <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                 <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
                 <span className="text-[7px] font-bold text-slate-400 italic">(If Yes, attach reports)</span>
              </div>
           </div>

           <div className="flex items-center gap-10">
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">m) In case of Maternity:</span>
                 <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-5 h-5 flex items-center justify-center border-r last:border-r-0 border-black text-[9px] font-bold">{l}</div>)}</div>
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">Expected date of delivery:</span>
                 <DateGrid value="" />
              </div>
           </div>
        </div>

        <SectionHeader>DETAILS OF THE PATIENT ADMITTED :</SectionHeader>
        <div className="grid grid-cols-12 gap-8 mb-6">
           <div className="col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-start gap-2"><span className="text-[8px] font-bold pt-1 uppercase">a) Date of admission:</span><DateGrid value={formData.adm_date} /></div>
                 <div className="flex items-start gap-2"><span className="text-[8px] font-bold pt-1 uppercase">b) Time :</span><TimeGrid value={formData.adm_time} /></div>
              </div>
              <div className="flex items-center gap-6">
                 <span className="text-[8px] font-bold uppercase">c) Is this an Emergency / a Planned Hospitalisation Event?:</span>
                 <TickBox label="Emergency" checked={false} />
                 <TickBox label="Planned" checked={true} />
              </div>
              <div className="flex items-start gap-12">
                 <div className="flex items-end gap-2"><span className="text-[8px] font-bold pb-1 uppercase">e) Expected No. of Days Stay:</span><GridBox value={String(formData.adm_stay_days || '')} length={3} /><span className="text-[8px] font-bold pb-1 uppercase">Days</span></div>
                 <UnderlineField label="g) Room Type:" value={formData.adm_room_type || ''} className="flex-1" />
              </div>

              <div className="space-y-1.5 mt-8 border-t border-slate-100 pt-4">
                 <p className="text-[9px] font-black uppercase text-[#1b1c31] border-b border-[#1b1c31]/10 pb-1 mb-2">Estimated Expenditure for Hospitalization</p>
                 {[
                    { label: "h) Per Day Room Rent + Nursing & Service Charges + Patient's Diet:", id: "cost_room_rent" },
                    { label: "i) Expected Cost for Investigation + Diagnostics:", id: "cost_investigation" },
                    { label: "j) ICU Charges:", id: "cost_icu" },
                    { label: "k) OT Charges:", id: "cost_ot" },
                    { label: "l) Professional Fees Surgeon + Anesthetist Fees + Consultation Charges:", id: "cost_prof_fees" },
                    { label: "m) Medicines + Consumables + Cost of Implants (if applicable, please specify):", id: "cost_medicines" },
                    { label: "n) Other hospital expenses if any:", id: "cost_other" },
                    { label: "o) All Inclusive Package Charges, if any applicable:", id: "cost_package" },
                    { label: "p) Sum Total Expected Cost of Hospitalisation:", id: "adm_total_cost", bold: true },
                 ].map((item, idx) => (
                    <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                       <span className={`text-[7.5px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                       <div className="flex items-center">
                          <span className="text-[8.5px] mr-1 font-black">₹</span>
                          <GridBox value={String(formData[item.id] || 0)} length={7} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="col-span-5 bg-slate-50 p-4 border-l border-black flex flex-col">
              <p className="text-[8.5px] font-black uppercase mb-6 leading-tight">Mandatory: Past History of any chronic illness <span className="lowercase font-bold italic">if yes since month / year)</span></p>
              <div className="space-y-3.5">
                 {[
                    "Diabetes", "Heart Disease", "Hypertension", "Hyperlipidemias", "Osteoarthritis",
                    "Asthma / COPD / Bronchitis", "Cancer", "Alcohol or Drug Abuse", "Any HIV or STD / Related Ailments"
                 ].map((ill, i) => (
                    <div key={i} className="flex items-center justify-between group">
                       <div className="flex items-center gap-3 flex-1">
                          <div className="w-[10px] h-[10px] border border-black bg-white"></div>
                          <span className="text-[7.5px] font-black uppercase text-slate-700 truncate">{ill}</span>
                       </div>
                       <div className="flex gap-2">
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
                 <UnderlineField label="Any other Ailment, give details:" value="" className="mt-4" />
              </div>
           </div>
        </div>

        <SectionHeader>DECLARATION: (Please read very carefully)</SectionHeader>
        <p className="text-[8px] font-black text-center mb-4 uppercase">We confirm having read, understood and agreed to the Declarations portion of this form.</p>
        <div className="space-y-6">
           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-2 uppercase">a) Name of the treating doctor:</span>
              <div className="flex-1 flex gap-3">
                 <GridBox value={formData.dr_name?.split(' ')[2] || ''} length={12} label="S U R N A M E" />
                 <GridBox value={formData.dr_name?.split(' ')[0] || ''} length={12} label="F I R S T  N A M E" />
                 <GridBox value={formData.dr_name?.split(' ')[1] || ''} length={12} label="M I D D L E  N A M E" />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="b) Qualification:" value="MBBS, MD" />
              <div className="flex items-end gap-2 flex-1">
                 <span className="text-[8px] font-bold pb-1 uppercase">c) Registration No. with State Code:</span>
                 <GridBox value={formData.registrationNo || ''} length={12} />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-12 h-28">
              <div className="border border-black p-4 relative flex items-center justify-center">
                 <span className="absolute top-1 left-1 text-[7px] font-bold uppercase text-slate-300">Hospital Seal (Must include Hospital ID)</span>
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
              </div>
              <div className="border border-black p-4 relative flex items-end justify-center text-[7px] font-bold uppercase text-slate-300">
                 <span className="absolute top-1 left-1">Patient / Insured Name & Signature:</span>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between items-center text-[7px] font-black text-slate-400">
           <p className="uppercase tracking-widest">Manipal Cigna Standard Form</p>
           <p className="uppercase tracking-widest">Page 2 of 3 | Apr19 onwards</p>
        </div>
      </div>

      {/* PAGE 3 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <SectionHeader>DECLARATION BY THE PATIENT / REPRESENTATIVE:</SectionHeader>
        <div className="space-y-3 text-[8.5px] text-slate-700 text-justify leading-relaxed px-4 mb-8">
           <p>1. I agree to allow the hospital to submit all original documents pertaining to hospitalisation to the Insurer / TPA after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
           <p>2. Payment to hospital is governed by the Terms and Conditions of the policy. In case the Insurer / TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the Terms and Conditions of the policy.</p>
           <p>3. All non-medical expenses and expenses not relevant to current hospitalisation and the amounts over & above the limit authorised by the Insurer / TPA not governed by the Terms and Conditions of the policy will be paid by me.</p>
           <p>4. I hereby declare to abide by the Terms and Conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect, I forfeit my claim and agree to indemnify the Insurer / TPA.</p>
           <p>5. I agree and understand that TPA is in no way warranting the service of the hospital & that the Insurer / TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
           <p>6. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
           <p>7. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer / TPA.</p>
           <p>8. "I/We authorize Insurance Company/TPA to contact me/us through mobile/email for any update on this claim".</p>
        </div>

        <div className="space-y-6 px-4">
           <div className="flex items-end space-x-3">
              <span className="text-[8px] font-bold pb-1.5 uppercase">a) Patient's / Insured's Name:</span>
              <div className="flex-1 flex gap-3">
                 <GridBox value={formData.p_name?.split(' ')[2] || ''} length={12} label="S U R N A M E" />
                 <GridBox value={formData.p_name?.split(' ')[0] || ''} length={12} label="F I R S T  N A M E" />
                 <GridBox value={formData.p_name?.split(' ')[1] || ''} length={12} label="M I D D L E  N A M E" />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-12">
              <div className="flex items-end gap-2">
                 <span className="text-[8.5px] font-bold pb-1 uppercase">b) Contact Number:</span>
                 <GridBox value={formData.p_contact || ''} length={10} />
              </div>
              <div className="border-b border-black h-12 relative flex items-end">
                 <span className="text-[7.5px] font-bold uppercase text-slate-400 pb-1">c) Patient's / Insured's Signature:</span>
              </div>
           </div>
           <UnderlineField label="Email ID (optional) :" value={formData.p_email || ''} />
           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="Date :" value={formatDate(new Date())} />
              <UnderlineField label="Time :" value={new Date().toLocaleTimeString()} />
           </div>
        </div>

        <SectionHeader>HOSPITAL DECLARATION:</SectionHeader>
        <div className="space-y-2 text-[8.5px] text-slate-700 text-justify leading-relaxed px-4 mb-8">
           <p>1. We have no objection to any authorised TPA/ Insurance Company official verifying documents pertaining to hospitalisation.</p>
           <p>2. All valid original documents duly countersigned by the insured / patient as per the checklist below will be sent to TPA/ Insurance Company within 7 days of the patient's discharge.</p>
           <p>3. We agree that tpa / insurance company will not be liable to make the payment in the event of any discrepancy between the facts in this form and discharge summary or other documents.</p>
           <p>4. The patient declaration has been signed by the patient or by his representative in our presence.</p>
           <p>5. We agree to provide clarifications for the queries raised regarding this hospitalisation and we take the sole responsibility for any delay in offering clarifications.</p>
           <p>6. We will abide by the Terms and Conditions agreed in the MOU.</p>
           <p>7. We confirm that no additional amount would be collected from the insured in excess of Agreed Package Rates except costs towards non-admissible amounts.</p>
           <p>8. We confirm that no recoveries would be made from the deposit amount collected from the lnsured except for costs towards non admissible amounts.</p>
           <p>9. In the event of unauthorized recovery of any additional amount from the Insured in excess of Agreed Package Rates,the adhorized TPA / Insurance Company reserves the right to recoverthe same from us (the Network Provider).</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-12 px-4 mb-auto">
           <div className="h-32 border border-black relative flex items-center justify-center">
              <span className="absolute top-1 left-1 text-[7px] font-bold uppercase text-slate-300">Hospital Seal</span>
              {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
           </div>
           <div className="h-32 border border-black relative flex items-center justify-center">
              <span className="absolute top-1 left-1 text-[7px] font-bold uppercase text-slate-300">Doctor’s Signature</span>
              {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
           </div>
        </div>

        <div className="mt-12 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1b1c31] border-b border-slate-200 pb-2">DOCUMENTS TO BE PROVIDED BY THE HOSPITAL IN SUPPORT OF THE CLAIM</h4>
           <div className="grid grid-cols-1 gap-2 text-[8px] font-medium text-slate-600">
              <p>1. Detailed Discharge Summary and all Bills from the hospital, duly signed by the Patient/Representative.</p>
              <p>2. Cash Memos from the Hospitals / Chemists supported by proper prescription.</p>
              <p>3. Diagnostic Tests Reports and Receipts supported by physician note.</p>
              <p>4. Surgeon's Certificate stating nature of operation performed and Surgeon's Bill and Receipt.</p>
              <p>5. Certificates from attending Medical Practitioner / Surgeon giving the patient's condition and advice on discharge.</p>
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between items-center text-[7px] font-black text-slate-400">
           <p className="uppercase tracking-widest">Manipal Cigna Standard Form</p>
           <p className="uppercase tracking-widest">Page 3 of 3 | Apr19 onwards</p>
        </div>
      </div>

    </div>
  );
};

export default ManipalCignaTemplate;
