
import React from 'react';
import { formatDate } from '../utils';

interface CholaMsTemplateProps {
  formData: Record<string, any>;
}

const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-black text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black bg-white shrink-0">
        {chars.map((char, i) => (
          <div key={i} className="w-[11.5px] h-[13px] shrink-0 border-r border-b border-black flex items-center justify-center text-[9px] font-black text-[#00338d]">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[6.5px] font-bold text-slate-400 uppercase mt-0.5">{subLabel}</span>}
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

const BoxCheckbox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    <span className="text-[8px] font-bold text-black uppercase whitespace-nowrap">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string; boldValue?: boolean }> = ({ label, value, className = "", boldValue = true }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8.5px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className={`text-[9.5px] uppercase flex-1 truncate leading-none ${boldValue ? 'font-black text-[#00338d]' : 'font-medium text-[#00338d]'}`}>{value}</span>
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-500 text-white py-1 px-4 text-[9px] font-black uppercase tracking-widest my-2 text-center w-full">
    {children}
  </div>
);

const Header: React.FC<{ page: number }> = ({ page }) => (
  <div className="mb-4">
    <div className="flex justify-between items-start">
      <div className="flex flex-col space-y-0.5">
        <h1 className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-tight">CHOLAMANDALAM MS GENERAL INSURANCE COMPANY LIMITED</h1>
        <div className="text-[6.5px] font-bold text-slate-500 leading-tight">
          Claims Processing Centre: Shaw Wallace Building, New No. 319, Old No. 154, <br/>
          2nd Floor, Thambu Chetty Street, Parrys, Chennai- 600001 <br/>
          Toll Free Ph No.: 1800 200 5544, Toll Free Fax No.: 1800 425 2200 <br/>
          Pre Authorization Request: faxhealth@cholams.murugappa.com; <br/>
          Queries & Complaints: customercare@cholams.murugappa.com; <br/>
          www.cholainsurance.com
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
           <div className="flex flex-col items-center">
              <div className="relative">
                 <div className="w-8 h-8 bg-[#005a9c] rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                       <div className="w-4 h-4 bg-[#f15a24] rounded-full"></div>
                    </div>
                 </div>
              </div>
           </div>
           <div className="flex flex-col leading-none">
              <span className="text-[18px] font-black text-[#005a9c] italic tracking-tighter">Chola<span className="text-[#f15a24]">MS</span></span>
              <span className="text-[6px] font-bold text-[#005a9c] uppercase tracking-widest">GENERAL INSURANCE</span>
           </div>
        </div>
        <div className="flex flex-col items-center border-l border-slate-200 pl-4">
           <div className="w-12 h-12 rounded-full border-[3px] border-slate-800 flex items-center justify-center relative">
              <span className="text-[8px] font-black">TUV</span>
           </div>
           <span className="text-[6px] font-bold mt-1 uppercase">INDIA</span>
        </div>
      </div>
    </div>
    
    <div className="text-center mt-6">
      <p className="text-[8px] font-black uppercase text-slate-400">PLEASE FAX / SCAN PAGE 1 ONLY</p>
      <h2 className="text-[12px] font-black uppercase text-slate-800 tracking-widest mt-1">REQUEST FOR CASHLESS HOSPITALISATION FOR MEDICAL INSURANCE POLICY</h2>
      <p className="text-[7.5px] font-black text-slate-400 mt-1">(To be filled in block letters)</p>
    </div>
  </div>
);

const CholaMsTemplate: React.FC<CholaMsTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <Header page={1} />
        
        <div className="space-y-4 mb-4">
          <p className="text-[8px] font-black uppercase border-b border-black w-fit">DETAILS OF THE THIRD PARTY ADMINISTRATOR</p>
          <div className="space-y-2">
             <UnderlineField label="a) Name of TPA / Insurance company:" value={formData.insurance_company || 'CHOLAMANDALAM MS GENERAL INSURANCE COMPANY LIMITED'} />
             <div className="grid grid-cols-2 gap-8">
                <UnderlineField label="b) toll free phone number:" value="1800 200 5544" />
                <UnderlineField label="c) toll free FAX:" value="1800 425 2200" />
             </div>
          </div>
        </div>

        <SectionHeader>TO BE FILLED BY THE INSURED / PATIENT</SectionHeader>
        <div className="space-y-4 mb-4">
           <div className="flex items-start">
              <span className="text-[8px] font-bold w-48 pt-2 uppercase">a) Name of the Patient:</span>
              <GridBox value={formData.p_name || ''} length={45} className="flex-1" />
           </div>
           
           <div className="flex items-start gap-12">
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">b) Gender:</span>
                 <BoxCheckbox label="Male" checked={formData.p_gender === 'Male'} />
                 <BoxCheckbox label="Female" checked={formData.p_gender === 'Female'} />
              </div>
              <div className="flex items-start gap-2">
                 <span className="text-[8px] font-bold pt-1 uppercase">c) Age: Years</span>
                 <GridBox value={String(formData.p_age_y || '')} length={2} />
                 <span className="text-[8px] font-bold pt-1 uppercase">Months</span>
                 <GridBox value="" length={2} />
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">d) Contact Number:</span>
                 <GridBox value={formData.p_contact || ''} length={10} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">e) Insured card ID number:</span>
                 <GridBox value={formData.p_card_id || ''} length={15} />
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">f) Policy number / Corporate:</span>
                 <GridBox value={formData.p_policy_no || ''} length={20} />
              </div>
           </div>

           <div className="flex items-center gap-10">
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">g) Employee ID:</span>
                 <GridBox value={formData.p_employee_id || ''} length={15} />
              </div>
              <div className="flex items-center gap-6">
                 <span className="text-[8px] font-bold uppercase">h) Currently do you have any other Mediclaim / Health insurance:</span>
                 <BoxCheckbox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
                 <BoxCheckbox label="No" checked={formData.p_other_insurance === 'No'} />
              </div>
           </div>

           <div className="pl-6 space-y-3">
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">i. Company Name</span>
                 <GridBox value={formData.p_other_insurer_name || ''} length={40} className="flex-1" />
              </div>
              <UnderlineField label="ii. Give details:" value="" />
           </div>

           <div className="grid grid-cols-2 gap-12">
              <UnderlineField label="iii. Policy No." value="" />
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">iv. Sum Insured</span>
                 <GridBox value="" length={10} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">i) Name of the family physician:</span>
                 <GridBox value={formData.p_family_physician_name || ''} length={25} />
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">j) Contact number:</span>
                 <GridBox value={formData.p_family_physician_contact || ''} length={10} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-12">
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">k) PAN:</span>
                 <GridBox value={formData.p_pan || ''} length={10} />
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">l) Aadhaar No.:</span>
                 <GridBox value={formData.p_aadhaar || ''} length={12} />
              </div>
           </div>

           <p className="text-[7.5px] font-black text-slate-500 text-center uppercase mt-2">(PLEASE COMPLETE DECLARATION ON THE REVERSE SIDE OF THIS FORM)</p>
        </div>

        <SectionHeader>TO BE FILLED BY THE TREATING DOCTOR / HOSPITAL</SectionHeader>
        <div className="space-y-3">
           <div className="grid grid-cols-12 gap-8">
              <div className="col-span-8">
                 <UnderlineField label="a) Name of the treating doctor:" value={formData.dr_name || ''} />
              </div>
              <div className="col-span-4 flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">b) Contact number:</span>
                 <GridBox value={formData.dr_contact || ''} length={10} />
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">c) Nature of ILLNESS / Disease with presenting complaints:</span>
                 <div className="border border-black p-2 h-14 bg-white text-[8px] font-bold uppercase leading-tight overflow-hidden">{formData.m_illness}</div>
              </div>
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">d) Relevant clinical findings:</span>
                 <div className="border border-black p-2 h-14 bg-white text-[8px] font-bold uppercase leading-tight overflow-hidden">{formData.m_clinical_findings}</div>
              </div>
           </div>

           <div className="flex items-start gap-12">
              <div className="flex items-start gap-2">
                 <span className="text-[8px] font-bold pt-1 uppercase">e) Duration of the present ailment:</span>
                 <GridBox value={String(formData.m_duration || '')} length={3} />
                 <span className="text-[8px] font-bold pt-1 uppercase ml-1">Days</span>
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">f) Date of first consultation:</span>
                 <div className="flex border border-black h-5">
                    <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{formData.m_first_cons_date?.split('-')[2] || ' '}</div>
                    <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{formData.m_first_cons_date?.split('-')[1] || ' '}</div>
                    <div className="w-10 flex items-center justify-center font-black text-[9px]">{formData.m_first_cons_date?.split('-')[0] || ' '}</div>
                 </div>
              </div>
              <UnderlineField label="g) Past history of ailment if any:" value="" className="flex-1" />
           </div>

           <div className="flex items-end gap-6">
              <UnderlineField label="h) Provisional diagnosis:" value={formData.m_prov_diag || ''} className="flex-1" />
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">i) ICD 10 Code:</span>
                 <GridBox value={formData.m_icd_code || ''} length={10} />
              </div>
           </div>

           <div className="space-y-2">
              <span className="text-[8px] font-bold uppercase">j) Proposed line of treatment:</span>
              <div className="flex flex-wrap gap-x-8 gap-y-1 pl-4">
                 <BoxCheckbox label="Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
                 <BoxCheckbox label="Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
                 <BoxCheckbox label="Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
                 <BoxCheckbox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
                 <BoxCheckbox label="Non allopathic treatment" checked={false} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">k) If Investigation & / or Medical Management provide details:</span>
                 <div className="border border-black h-12 bg-white"></div>
              </div>
              <div className="space-y-2">
                 <span className="text-[8px] font-bold uppercase">l) Route of drug administration:</span>
                 <div className="border border-black p-2 h-12 bg-white"></div>
              </div>
           </div>

           <div className="flex items-end gap-6">
              <UnderlineField label="m) If Surgical, name of surgery:" value={formData.m_surgery_name || ''} className="flex-1" />
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 uppercase">n) ICD 10 PCS Code:</span>
                 <GridBox value="" length={12} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">o) If other treatments provide details:</span>
                 <div className="border border-black h-12 bg-white"></div>
              </div>
              <div className="space-y-1">
                 <span className="text-[8px] font-bold uppercase">p) How did injury occur:</span>
                 <div className="border border-black h-12 bg-white"></div>
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border border-black p-2 bg-slate-50/50">
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">q) In case of accident: i) Is it RTA:</span>
                 <BoxCheckbox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                 <BoxCheckbox label="No" checked={formData.m_is_rta === 'No'} />
              </div>
              <div className="flex items-start gap-4"><span className="text-[8px] font-bold pt-1 uppercase">ii) Date of injury:</span><DateGrid value={formData.m_rta_date} /></div>
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">iii) Reported to Police:</span>
                 <BoxCheckbox label="Yes" checked={formData.m_is_rta === 'Yes' ? false : formData.m_rta_police === 'Yes'} />
                 <BoxCheckbox label="No" checked={formData.m_is_rta === 'Yes' ? false : formData.m_rta_police === 'No'} />
              </div>
              <UnderlineField label="iv) FIR No.:" value={formData.m_fir_no || ''} className="flex-1" />
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between items-center text-[7px] font-black text-slate-400">
           <p className="uppercase">CHOLAMANDALAM MS GENERAL INSURANCE COMPANY LIMITED</p>
           <p className="uppercase">PAGE 1 OF 3</p>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <Header page={2} />
        
        <div className="space-y-4">
           <div className="flex items-center gap-10">
              <span className="text-[8px] font-bold uppercase">v) Injury / Disease caused due to substance abuse / alcohol consumption:</span>
              <BoxCheckbox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
              <BoxCheckbox label="No" checked={formData.m_abuse_alcohol === 'No'} />
              <div className="flex items-center gap-4 ml-6">
                 <span className="text-[8px] font-bold uppercase">vi) Test conducted to establish this:</span>
                 <BoxCheckbox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                 <BoxCheckbox label="No" checked={formData.m_test_conducted === 'No'} />
              </div>
           </div>

           <div className="flex items-center gap-10">
              <div className="flex items-center gap-4">
                 <span className="text-[8px] font-bold uppercase">r) In case of Maternity:</span>
                 <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-5 h-5 flex items-center justify-center border-r last:border-r-0 border-black text-[9px] font-bold">{l}</div>)}</div>
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">Expected date of Delivery:</span>
                 <DateGrid value="" />
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">LMP:</span>
                 <DateGrid value="" />
              </div>
           </div>
        </div>

        <SectionHeader>DETAILS OF THE PATIENT ADMITTED</SectionHeader>
        <div className="grid grid-cols-12 gap-10 mb-6">
           <div className="col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-start gap-2"><span className="text-[8px] font-bold pt-1 uppercase">a) Date of admission:</span><DateGrid value={formData.adm_date} /></div>
                 <div className="flex items-start gap-2">
                    <span className="text-[8px] font-bold pt-1 uppercase">b) Time :</span>
                    <div className="flex border border-black bg-white h-5">
                       <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{formData.adm_time?.split(':')[0] || ' '}</div>
                       <div className="w-5 flex items-center justify-center font-black text-[9px]">{formData.adm_time?.split(':')[1] || ' '}</div>
                    </div>
                    <span className="text-[6px] font-bold pt-1.5 text-slate-400">HH : MM</span>
                 </div>
              </div>
              <div className="flex items-center gap-6">
                 <span className="text-[8px] font-bold uppercase">c) Is this an emergency / a planned hospitalization event?</span>
                 <BoxCheckbox label="Emergency" checked={false} />
                 <BoxCheckbox label="Planned" checked={true} />
              </div>
              <div className="flex items-start gap-12">
                 <div className="flex items-end gap-2"><span className="text-[8px] font-bold pb-1 uppercase">d) Expected no. of days stay:</span><GridBox value={String(formData.adm_stay_days || '')} length={3} /><span className="text-[8px] font-bold pb-1 uppercase">Days</span></div>
                 <UnderlineField label="e) Room Type:" value={formData.adm_room_type || ''} className="flex-1" />
              </div>

              <div className="space-y-1.5 mt-8 border-t border-slate-100 pt-4">
                 <p className="text-[9px] font-black uppercase text-blue-900 border-b border-blue-100 pb-1 mb-2">Estimated Expenditure for Hospitalization</p>
                 {[
                    { label: "f) Per Day Room Rent + Nursing + Service + Diet:", id: "cost_room_rent" },
                    { label: "g) Expected cost for investigation + diagnostics:", id: "cost_investigation" },
                    { label: "h) ICU Charges:", id: "cost_icu" },
                    { label: "i) OT Charges:", id: "cost_ot" },
                    { label: "j) Professional fees Surgeon + Anesthetist Fees:", id: "cost_prof_fees" },
                    { label: "k) Medicines + Consumables + Cost of Implants:", id: "cost_medicines" },
                    { label: "l) All inclusive package charges if any:", id: "cost_package" },
                    { label: "Sum total expected cost of hospitalization:", id: "adm_total_cost", bold: true },
                 ].map((item, idx) => (
                    <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                       <span className={`text-[7.5px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                       <div className="flex items-center">
                          <span className="text-[8.5px] mr-1 font-black">Rs.</span>
                          <GridBox value={String(formData[item.id] || 0)} length={7} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="col-span-5 bg-slate-50 p-4 border-l border-black flex flex-col">
              <p className="text-[8.5px] font-black uppercase mb-6 leading-tight">Mandatory: Past History of any chronic illness <span className="lowercase font-bold italic">If yes, since (month/year)</span></p>
              <div className="space-y-3.5">
                 {[
                    "Diabetes", "Heart Disease", "Hypertension", "Hyperlipidemias", "Osteoarthritis",
                    "Asthma / COPD / Bronchitis", "Cancer", "Alcohol or drug abuse", "Any HIV or STD / Related"
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
                 <UnderlineField label="Any other Ailment give details:" value="" className="mt-4" />
              </div>
           </div>
        </div>

        <SectionHeader>DECLARATION</SectionHeader>
        <p className="text-[8px] font-black text-center mb-4 uppercase">We confirm having read understood and agreed to the Declarations on the reverse of this form</p>
        <div className="space-y-6">
           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-2 uppercase">a) Name of the treating doctor:</span>
              <div className="flex-1 flex gap-3">
                 <GridBox value={formData.dr_name?.split(' ')[2] || ''} length={15} label="S U R N A M E" />
                 <GridBox value={formData.dr_name?.split(' ')[0] || ''} length={15} label="F I R S T  N A M E" />
                 <GridBox value={formData.dr_name?.split(' ')[1] || ''} length={15} label="M I D D L E  N A M E" />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="b) Qualification:" value="MBBS, MD" />
              <div className="flex items-end gap-2 flex-1">
                 <span className="text-[8px] font-bold pb-1 uppercase">c) Registration No. with State code:</span>
                 <GridBox value={formData.registrationNo || ''} length={15} />
              </div>
           </div>
           <div className="grid grid-cols-3 gap-6 h-28">
              <div className="border border-black p-4 relative flex items-end justify-center text-[7px] font-bold uppercase text-slate-300">
                 <span className="absolute top-1 left-1">Signature of treating doctor</span>
              </div>
              <div className="border border-black p-4 relative flex items-center justify-center">
                 <span className="absolute top-1 left-1 text-[7px] font-bold uppercase text-slate-300">Hospital Seal (Must include Hospital ID)</span>
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
              </div>
              <div className="border border-black p-4 relative flex items-end justify-center text-[7px] font-bold uppercase text-slate-300">
                 <span className="absolute top-1 left-1">Patient / Insured Name & Signature:</span>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-[8px] font-black text-slate-400">
           <p className="uppercase">CHOLAMANDALAM MS GENERAL INSURANCE COMPANY LIMITED</p>
           <p className="uppercase">PAGE 2 OF 3</p>
        </div>
      </div>

      {/* PAGE 3: FORM 60 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <div className="text-center mb-8 border-b border-black pb-4">
           <p className="text-[10px] font-bold uppercase">Income-tax Rules, 1962</p>
           <h1 className="text-[20px] font-black uppercase mt-1">FORM NO. 60</h1>
           <p className="text-[9px] font-medium uppercase mt-1">[See second proviso to rule 114B]</p>
           <p className="text-[8px] font-medium mt-2 text-slate-500 italic">Form for declaration to be filed by an individual or a person (not being a company or firm) <br/> who does not have a permanent account number and who enters into any transaction specified in rule 114B</p>
        </div>

        <div className="border border-black divide-y divide-black">
           <Form60Row label="First Name" value={formData.p_name?.split(' ')[0] || ''} />
           <Form60Row label="Middle Name" value={formData.p_name?.split(' ')[1] || ''} />
           <Form60Row label="Surname" value={formData.p_name?.split(' ')[2] || ''} />
           <div className="grid grid-cols-12 divide-x divide-black">
              <div className="col-span-6 p-2 flex items-center gap-4"><span className="text-[10px] font-bold">Date of Birth:</span><DateGrid value={formData.p_dob} /></div>
              <div className="col-span-6 p-2"><span className="text-[10px] font-bold">Father's Name:</span></div>
           </div>
           <Form60Row label="Flat/ Room No." value="" />
           <Form60Row label="Floor No." value="" />
           <Form60Row label="Name of premises" value="" />
           <Form60Row label="Block Name/No." value="" />
           <Form60Row label="Road/ Street/ Lane" value="" />
           <Form60Row label="Area/ Locality" value="" />
           <Form60Row label="Town/ District" value={formData.p_district || ''} />
           <Form60Row label="District" value={formData.p_district || ''} />
           <Form60Row label="State" value={formData.p_state || ''} />
           <Form60Row label="Pin Code" value={formData.p_pin || ''} />
           <Form60Row label="Telephone Number" value={formData.p_contact || ''} />
           <Form60Row label="Mobile Number" value={formData.p_contact || ''} />
           <Form60Row label="Amount of transaction (Rs.)" value={String(formData.adm_total_cost || '')} />
           <Form60Row label="Date of transaction" value={formatDate(new Date())} />
           <Form60Row label="Mode of transaction" value="Cash / Cheque / Card / Net Banking" />
           <Form60Row label="Aadhaar Number issued by UIDAI" value={formData.p_aadhaar || ''} />
        </div>

        <div className="mt-8 p-6 bg-slate-50 border border-black rounded-sm space-y-4">
           <h4 className="text-[12px] font-black uppercase text-center border-b border-black pb-2">Verification</h4>
           <p className="text-[10px] font-medium leading-relaxed text-justify">
              I, <span className="border-b border-dotted border-black px-8 font-black uppercase">{formData.p_name}</span> do hereby declare that what is stated above is true to the best of my knowledge and belief. I further declare that I do not have a Permanent Account Number and my/ our estimated total income (including income of spouse, minor child etc. as per section 64 of Income-tax Act, 1961) computed in accordance with the provisions of Income-tax Act, 1961 for the financial year in which the above transaction is held will be less than maximum amount not chargeable to tax.
           </p>
           <div className="flex justify-between items-end pt-8">
              <div className="space-y-4">
                 <p className="text-[10px] font-bold">Verified today, the <span className="border-b border-dotted border-black px-4">{new Date().getDate()}</span> day of <span className="border-b border-dotted border-black px-8 uppercase">{new Date().toLocaleString('default', { month: 'long' })}</span> 20<span className="border-b border-dotted border-black px-4">{new Date().getFullYear().toString().slice(-2)}</span></p>
                 <p className="text-[10px] font-bold">Place: <span className="border-b border-dotted border-black px-20"></span></p>
              </div>
              <div className="text-center">
                 <div className="w-40 h-10 border-b border-black mb-1"></div>
                 <p className="text-[10px] font-black uppercase">(Signature of declarant)</p>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-6 flex justify-between items-center text-[7px] font-black text-slate-400">
           <p className="uppercase">CHOLAMANDALAM MS GENERAL INSURANCE COMPANY LIMITED</p>
           <p className="uppercase">PAGE 3 OF 3</p>
        </div>
      </div>

    </div>
  );
};

const Form60Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center min-h-[30px] w-full">
    <div className="w-1/2 p-2 border-r border-black h-full flex items-center">
       <span className="text-[10px] font-bold uppercase">{label}:</span>
    </div>
    <div className="w-1/2 p-2 h-full flex items-center">
          <span className="text-[10px] font-black uppercase text-[#00338d]">{value}</span>
    </div>
  </div>
);

export default CholaMsTemplate;
