import React from 'react';

interface MagmaHdiTemplateProps {
  formData: Record<string, any>;
}

const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7px] font-bold text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black/40 bg-white shrink-0">
        {chars.map((char, i) => (
<div key={i} className="w-[10px] h-[12px] shrink-0 border-r border-b border-black/40 flex items-center justify-center text-[8px] font-black text-[#00338d]">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[5.5px] font-bold text-slate-400 uppercase mt-0.5">{subLabel}</span>}
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
      {label && <span className="text-[7px] font-bold text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex">
        {sequence.map((char, i) => (
<div key={i} className={`w-[10px] h-[12px] shrink-0 border border-black/60 flex items-center justify-center text-[8px] font-black text-[#00338d] bg-white ${i === 1 || i === 3 ? 'mr-1' : '-ml-[1px]'}`}>
            {char}
          </div>
        ))}
      </div>
      <div className="flex text-[5px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
        <span className="w-[20px] text-center">D D</span>
        <span className="w-[20px] text-center ml-1">M M</span>
        <span className="w-[40px] text-center ml-1">Y Y Y Y</span>
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
      {label && <span className="text-[7px] font-bold text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex items-center space-x-0.5">
        <div className="flex border border-black/60 bg-white">
           <div className="w-[10px] h-[12px] shrink-0 border-r border-black/40 flex items-center justify-center text-[8px] font-bold text-[#00338d]">{hChars[0]}</div>
           <div className="w-[10px] h-[12px] shrink-0 flex items-center justify-center text-[8px] font-bold text-[#00338d]">{hChars[1]}</div>
        </div>
        <span className="font-black text-[9px]">:</span>
        <div className="flex border border-black/60 bg-white">
           <div className="w-[10px] h-[12px] shrink-0 border-r border-black/40 flex items-center justify-center text-[8px] font-bold text-[#00338d]">{mChars[0]}</div>
           <div className="w-[10px] h-[12px] shrink-0 flex items-center justify-center text-[8px] font-bold text-[#00338d]">{mChars[1]}</div>
        </div>
        <span className="text-[5px] font-bold text-slate-400 ml-1">H H : M M</span>
      </div>
    </div>
  );
};

const Checkbox: React.FC<{ label?: string; checked: boolean }> = ({ label, checked }) => (
  <div className="flex items-center space-x-1">
    <div className={`w-[10px] h-[10px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[6px] h-[6px] bg-black"></div>}
    </div>
    {label && <span className="text-[8px] font-bold text-black uppercase">{label}</span>}
  </div>
);

const MagmaHeader: React.FC = () => (
  <div className="flex justify-between items-start mb-6">
    <div className="flex items-center space-x-2">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-[#d42d32]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-6 bg-[#d42d32] rotate-45"></div>
          <div className="w-1.5 h-6 bg-[#d42d32] -rotate-45"></div>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline space-x-1 leading-none">
          <span className="text-[14px] font-black text-slate-800 tracking-tight">MAGMA</span>
          <span className="text-[16px] font-black text-[#009b4c] tracking-tighter">HDI</span>
        </div>
        <span className="text-[6px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">General Insurance Company Ltd.</span>
      </div>
    </div>
    <div className="text-center flex-1 px-4 pt-2">
      <h1 className="text-[11px] font-black uppercase text-slate-800 leading-tight">
        REQUEST FOR CASHLESS HOSPITALISATION FOR<br/>
        HEALTH INSURANCE POLICY PART — C (Revised)
      </h1>
      <p className="text-[8px] font-bold mt-1">(TO BE FILLED IN BLOCK LETTERS)</p>
    </div>
    <div className="w-24 text-right">
       <span className="text-[10px] font-black italic text-[#d42d32]">Muskurate Raho</span>
    </div>
  </div>
);

const MagmaHdiTemplate: React.FC<MagmaHdiTemplateProps> = ({ formData }) => {
  const chronicItems = [
    { label: "Diabetes", key: "diabetes" },
    { label: "Heart disease", key: "heart" },
    { label: "Hypertension", key: "hypertension" },
    { label: "Hyperlipidemias", key: "hyperlipidemias" },
    { label: "Osteoarthritis", key: "osteoarthritis" },
    { label: "Asthma/COPD/Bronchitis", key: "asthma" },
    { label: "Cancer", key: "cancer" },
    { label: "Alcohol/Drug abuse", key: "alcohol" },
    { label: "Any HIV/or STD Related ailment", key: "hiv" },
    { label: "Any other ailment, give details", key: "other" }
  ];

  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <MagmaHeader />
        
        <div className="space-y-4">
          <p className="text-[8.5px] font-black uppercase border-b border-black w-fit">DETAILS OF THE THIRD PARTY ADMINISTRATOR/INSURER/HOSPITAL</p>
          <div className="space-y-2">
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">a. Name of TPA/insurance Company:</span>
                <GridBox value={formData.tpa_provider || formData.insurance_company || 'MAGMA HDI GENERAL INSURANCE COMPANY LTD.'} length={40} className="flex-1" />
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">b. Toll free phone number:</span>
                <GridBox value="1800 266 3202" length={20} />
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">c. Toll free fax:</span>
                <GridBox value="" length={20} />
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">d. Name of Hospital:</span>
                <GridBox value={formData.hosp_name || ''} length={40} className="flex-1" />
             </div>
             <div className="pl-6 space-y-2">
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">i. Address</span><GridBox value={formData.hosp_address || ''} length={50} className="flex-1" /></div>
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">ii. Rohini ID</span><GridBox value={formData.hosp_rohini_id || ''} length={15} /></div>
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">iii. e-mail ID</span><GridBox value={formData.hosp_email || ''} length={40} className="flex-1" /></div>
             </div>
          </div>

          <p className="text-[8.5px] font-black uppercase border-b border-black w-fit mt-4">TO BE FILLED BY INSURED/PATIENT</p>
          <div className="space-y-2">
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">A. Name of the Patient:</span>
                <GridBox value={formData.p_name || ''} length={50} className="flex-1" />
             </div>
             <div className="flex items-start gap-8">
                <div className="flex items-center space-x-3">
                   <span className="text-[8px] font-bold uppercase">B. Gender:</span>
                   <Checkbox label="Male" checked={formData.p_gender === 'Male'} />
                   <Checkbox label="Female" checked={formData.p_gender === 'Female'} />
                   <Checkbox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
                </div>
                <div className="flex items-start gap-1">
                   <span className="text-[8px] font-bold pt-1 uppercase">C. Age: Years</span>
                   <GridBox value={String(formData.p_age_y || '')} length={2} />
                   <span className="text-[8px] font-bold pt-1 uppercase">Months</span>
                   <GridBox value="" length={2} />
                </div>
                <div className="flex items-start gap-2 flex-1">
                   <span className="text-[8px] font-bold pt-1 uppercase">D. Date of Birth</span>
                   <DateGrid value={formData.p_dob} />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-8">
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">E. Contact number:</span><GridBox value={formData.p_contact || ''} length={10} /></div>
                <div className="flex items-start"><span className="text-[8px] font-bold w-48 pt-2 uppercase">F. Contact number of attending Relative:</span><GridBox value={formData.p_relative_contact || ''} length={10} /></div>
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">G. Insured Card ID number:</span>
                <GridBox value={formData.p_card_id || ''} length={30} className="flex-1" />
             </div>
             <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8 flex items-start">
                   <span className="text-[8px] font-bold w-48 pt-2 uppercase">H. Policy number/Name of Corporate</span>
                   <GridBox value={formData.p_policy_no || ''} length={35} className="flex-1" />
                </div>
                <div className="col-span-4 flex items-start">
                   <span className="text-[8px] font-bold w-24 pt-2 uppercase">I. Employee ID:</span>
                   <GridBox value={formData.p_employee_id || ''} length={15} />
                </div>
             </div>
             <div className="flex items-center space-x-10">
                <span className="text-[8px] font-bold uppercase">J. Currently do you have any other mediclaim /health insurance:</span>
                <Checkbox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
                <Checkbox label="No" checked={formData.p_other_insurance === 'No'} />
             </div>
             <div className="pl-6 space-y-2">
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">i. Company Name:</span><GridBox value={formData.p_other_insurer_name || ''} length={40} className="flex-1" /></div>
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">ii. Give Details:</span><GridBox value="" length={50} className="flex-1" /></div>
             </div>
             <div className="flex items-center space-x-10">
                <div className="flex items-center space-x-4">
                   <span className="text-[8px] font-bold uppercase">K. Do you have a family Physician:</span>
                   <Checkbox label="Yes" checked={formData.p_family_physician === 'Yes'} />
                   <Checkbox label="No" checked={formData.p_family_physician === 'No'} />
                </div>
                <div className="flex items-start flex-1">
                   <span className="text-[8px] font-bold pt-2 uppercase">L. Name of the Family Physician:</span>
                   <GridBox value={formData.p_family_physician_name || ''} length={30} className="flex-1" />
                </div>
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">M. Contact number, if any:</span>
                <GridBox value={formData.p_family_physician_contact || ''} length={12} />
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">N. Current Address of Insured Patient:</span>
                <GridBox value={formData.p_address || ''} length={50} className="flex-1" />
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">O. Occupation of Insured Patient:</span>
                <GridBox value={formData.p_occupation || ''} length={30} />
             </div>
          </div>

          <p className="text-[8.5px] font-black uppercase border-b border-black w-fit mt-4 text-[#d42d32]">TO BE FILLED BY TREATING DOCTOR/HOSPITAL</p>
          <div className="space-y-2">
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">A. Name of the treating Doctor:</span>
                <GridBox value={formData.dr_name || ''} length={50} className="flex-1" />
             </div>
             <div className="grid grid-cols-2 gap-8">
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">B. Contact number:</span><GridBox value={formData.dr_contact || ''} length={10} /></div>
                <div className="flex items-start"><span className="text-[8px] font-bold w-48 pt-2 uppercase">C. Nature of Illness/Disease with presenting complaint:</span><GridBox value={formData.m_illness || ''} length={30} className="flex-1" /></div>
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">D. Relevant Critical Findings:</span>
                <GridBox value={formData.m_clinical_findings || ''} length={60} className="flex-1" />
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">E. Duration of the present ailment</span>
                <GridBox value={String(formData.m_duration || '')} length={3} />
                <span className="text-[8px] font-bold pt-2 ml-1 uppercase">Days</span>
             </div>
             <div className="pl-6 space-y-2">
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-1 uppercase">i. Date of First consultation:</span><DateGrid value={formData.m_first_cons_date} /></div>
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">ii. Past history of present ailment, if any</span><GridBox value="" length={50} className="flex-1" /></div>
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">F. Provisional diagnosis:</span>
                <GridBox value={formData.m_prov_diag || ''} length={60} className="flex-1" />
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">I. ICD 10 code:</span>
                <GridBox value={formData.m_icd_code || ''} length={10} />
             </div>
             <div className="space-y-1">
                <span className="text-[8px] font-bold uppercase">G. Proposed line of treatment:</span>
                <div className="flex flex-wrap gap-4 pl-4">
                   <div className="flex items-center space-x-2"><span>i. Medical Management (</span><Checkbox checked={formData.m_treatment_type === 'Medical Management'} /><span>)</span></div>
                   <div className="flex items-center space-x-2"><span>ii. Surgical Management (</span><Checkbox checked={formData.m_treatment_type === 'Surgical Management'} /><span>)</span></div>
                   <div className="flex items-center space-x-2"><span>iii. Intensive care (</span><Checkbox checked={formData.m_treatment_type === 'Intensive care'} /><span>)</span></div>
                   <div className="flex items-center space-x-2"><span>iv. Investigation (</span><Checkbox checked={formData.m_treatment_type === 'Investigation'} /><span>)</span></div>
                   <div className="flex items-center space-x-2"><span>v. Non-allopathic treatment (</span><Checkbox checked={false} /><span>)</span></div>
                </div>
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">H. If investigation and/or Medical Management provide details:</span>
                <GridBox value="" length={60} className="flex-1" />
             </div>
             <div className="pl-6">
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">i. Route of Drug Administration:</span><GridBox value={formData.m_route_drug || ''} length={30} /></div>
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">I. If surgical, name of surgery:</span>
                <GridBox value={formData.m_surgery_name || ''} length={50} className="flex-1" />
             </div>
             <div className="pl-6">
                <div className="flex items-start"><span className="text-[8px] font-bold w-40 pt-2 uppercase">i. ICD 10 PCS code:</span><GridBox value="" length={12} /></div>
             </div>
             <div className="flex items-start">
                <span className="text-[8px] font-bold w-48 pt-2 uppercase">J. If other treatment, provide details:</span>
                <GridBox value="" length={50} className="flex-1" />
             </div>
          </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between text-[7px] font-bold text-slate-400 border-t border-slate-50 uppercase">
           <span>Standard Magma HDI Form PART-C</span>
           <span className="bg-slate-800 text-white px-2 rounded-sm">1</span>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="space-y-4">
           <div className="flex items-start">
              <span className="text-[8px] font-bold w-48 pt-2 uppercase">K. How did injury occur:</span>
              <GridBox value="" length={70} className="flex-1" />
           </div>
           
           <div className="space-y-2">
              <span className="text-[8px] font-bold uppercase underline">L. In case of accident:</span>
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 pl-4">
                 <div className="flex items-center gap-6"><span className="text-[8px] font-bold">i. Is it RTA:</span><Checkbox label="Yes" checked={formData.m_is_rta === 'Yes'} /><Checkbox label="No" checked={formData.m_is_rta === 'No'} /></div>
                 <div className="flex items-start gap-3"><span className="text-[8px] font-bold pt-1 uppercase">ii. Date of Injury:</span><DateGrid value={formData.m_rta_date} /></div>
                 <div className="flex items-center gap-6"><span className="text-[8px] font-bold">iii. Report to Police:</span><Checkbox label="Yes" checked={formData.m_rta_police === 'Yes'} /><Checkbox label="No" checked={formData.m_rta_police === 'No'} /></div>
                 <div className="flex items-start gap-3"><span className="text-[8px] font-bold pt-2 uppercase">iv. FIR NO:</span><GridBox value={formData.m_fir_no || ''} length={15} /></div>
                 <div className="flex items-center gap-6 col-span-2"><span className="text-[8px] font-bold">v. Injury /Disease caused due to substance abuse/alcohol consumption:</span><Checkbox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} /><Checkbox label="No" checked={formData.m_abuse_alcohol === 'No'} /></div>
                 <div className="flex items-center gap-6 col-span-2"><span className="text-[8px] font-bold">vi. Test conducted to establish this (if yes, attach report):</span><Checkbox label="Yes" checked={formData.m_test_conducted === 'Yes'} /><Checkbox label="No" checked={formData.m_test_conducted === 'No'} /></div>
              </div>
           </div>

           <div className="flex items-center gap-10">
              <div className="flex items-center space-x-4">
                 <span className="text-[8.5px] font-bold uppercase">M. In case of Maternity:</span>
                 <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-4 h-4 flex items-center justify-center border-r last:border-r-0 border-black text-[9px] font-bold">{l}</div>)}</div>
              </div>
              <div className="flex items-start space-x-3"><span className="text-[8px] font-bold pt-1 uppercase">i. expected date of Delivery:</span><DateGrid value="" /></div>
           </div>

           <p className="text-[9px] font-black uppercase border-b border-black w-fit mt-4 text-[#009b4c]">DETAILS OF PATIENT ADMITTED</p>
           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-start space-x-4"><span className="text-[8px] font-bold pt-1 uppercase">A. Date of admission</span><DateGrid value={formData.adm_date} /></div>
              <div className="flex items-start space-x-4"><span className="text-[8px] font-bold pt-1 uppercase">B. Time of admission</span><TimeGrid value={formData.adm_time} /></div>
           </div>
           <div className="flex items-center gap-12">
              <span className="text-[8px] font-bold uppercase">C. Is this an emergency/planned hospitalization event</span>
              <Checkbox label="Emergency" checked={false} />
              <Checkbox label="Planned" checked={true} />
           </div>

           <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 space-y-2">
                 <span className="text-[8px] font-bold uppercase">D. Mandatory Past History of any chronic illness <span className="text-slate-400 lowercase font-medium">If yes (Since month/year)</span></span>
                 <div className="grid grid-cols-2 gap-x-12 gap-y-1 pl-4">
                    {chronicItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                         <div className="flex items-center space-x-4">
                            <span className="text-[8px] font-bold text-slate-700 w-32">{idx + 1}. {item.label}</span>
                            <div className="flex gap-2">
                               <Checkbox label="Yes" checked={formData[`m_chronic_${item.key}_status`] === 'Yes'} />
                               <Checkbox label="No" checked={formData[`m_chronic_${item.key}_status`] === 'No'} />
                            </div>
                         </div>
                         <div className="flex items-start">
                            <GridBox value={formData[`m_chronic_${item.key}_since`]?.split('-')[1] || ''} length={2} subLabel="M" />
                            <GridBox value={formData[`m_chronic_${item.key}_since`]?.split('-')[0]?.slice(-2) || ''} length={2} subLabel="Y" />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-end gap-2"><span className="text-[8px] font-bold pb-1 uppercase">E. Expected number of Days/stay in hospital</span><GridBox value={String(formData.adm_stay_days || '')} length={3} /><span className="text-[7px] font-bold pb-1 uppercase">Days</span></div>
              <div className="flex items-end gap-2"><span className="text-[8px] font-bold pb-1 uppercase">F. Days in ICU</span><GridBox value="" length={3} /><span className="text-[7px] font-bold pb-1 uppercase">Days</span></div>
           </div>
           <div className="flex items-start"><span className="text-[8px] font-bold w-48 pt-2 uppercase">G. Room Type</span><GridBox value={formData.adm_room_type || ''} length={30} className="flex-1" /></div>

           <div className="space-y-1.5 mt-4 border-t border-slate-200 pt-4">
              <p className="text-[8.5px] font-black uppercase text-slate-400 mb-2">Costing Overview</p>
              <div className="grid grid-cols-1 gap-1">
                 {[
                    { label: "H. Per day room rent + nursing and service charges+ patients diet", id: "cost_room_rent" },
                    { label: "I. Expected cost of investigation + diagnostic", id: "cost_investigation" },
                    { label: "J. ICU charges", id: "cost_icu" },
                    { label: "K. OT Charges", id: "cost_ot" },
                    { label: "L. Professional fees Surgeon + Anesthetist Fees + consultation Charges:", id: "cost_prof_fees" },
                    { label: "M. Medicines + Consumables + Cost of Implants (if applicable please specify)", id: "cost_medicines" },
                    { label: "N. Other hospital expenses if any", id: "cost_other" },
                    { label: "O. All-inclusive package charges if any applicable", id: "cost_package" },
                    { label: "P. Sum Total expected cost of hospitalization", id: "adm_total_cost", isBold: true },
                 ].map((item, idx) => (
                    <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.isBold ? 'border-black mt-2 pt-1' : ''}`}>
                       <span className={`text-[7.5px] font-bold uppercase ${item.isBold ? 'font-black' : ''}`}>{item.label}</span>
                       <div className="flex items-center">
                          <span className="text-[8px] mr-2 font-black">Rs.</span>
                          <GridBox value={String(formData[item.id] || 0)} length={7} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between text-[7px] font-bold text-slate-400 border-t border-slate-50 uppercase">
           <span>Standard Magma HDI Form PART-C</span>
           <span className="bg-slate-800 text-white px-2 rounded-sm">2</span>
        </div>
      </div>

      {/* PAGE 3 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="space-y-6">
           <h3 className="text-[10px] font-black uppercase text-center underline decoration-2 underline-offset-4">DECLARATION (Please read very carefully)</h3>
           <p className="text-[9px] font-bold text-center">We confirm having read understood and agreed to the Declarations within this form</p>
           
           <div className="space-y-4 px-10">
              <div className="flex items-start"><span className="text-[8px] font-bold w-48 pt-2 uppercase">a. Name of the treating doctor</span><GridBox value={formData.dr_name || ''} length={50} className="flex-1" /></div>
              <div className="flex items-start"><span className="text-[8px] font-bold w-48 pt-2 uppercase">b. Qualification:</span><GridBox value="MBBS, MD" length={50} className="flex-1" /></div>
              <div className="flex items-start"><span className="text-[8px] font-bold w-48 pt-2 uppercase">c. Registration number with State code</span><GridBox value={formData.registrationNo || ''} length={20} /></div>
           </div>

           <div className="grid grid-cols-2 gap-12 mt-8 px-10 h-32">
              <div className="border-2 border-black/10 p-4 relative flex items-center justify-center bg-slate-50/50 rounded-xl">
                 <span className="absolute top-2 left-2 text-[6px] font-black uppercase text-slate-400">Hospital Seal (Must include Hospital ID)</span>
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
              </div>
              <div className="border-2 border-black/10 p-4 relative flex items-end justify-center bg-slate-50/50 rounded-xl">
                 <span className="absolute top-2 left-2 text-[6px] font-black uppercase text-slate-400">Patient/Insured Name and Sign</span>
              </div>
           </div>

           <div className="pt-10 space-y-4">
              <h3 className="text-[10px] font-black uppercase text-center underline decoration-2 underline-offset-4">DECLARATION BY THE PATIENT I REPRESENTATIVE</h3>
              <div className="text-[7.5px] text-justify space-y-2 text-slate-700 leading-relaxed px-6">
                 <p>a. 1 agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer/T.P.A after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
                 <p>b. Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer /TPAis not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
                 <p>c. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer/T.P.Anot governed by the terms and conditions of the policy will be paid by me.</p>
                 <p>d. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the Insurer / T.P.A</p>
                 <p>e. I agree and understand that T.P.A is in no way warranting the service of the hospital & that the Insurer /TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
                 <p>f. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
                 <p>g. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer / TPA.</p>
                 <p>h. “I/We authorize Insurance Company/TPAto contact me/us through mobile/email for any update on this claim”.</p>
              </div>
           </div>

           <div className="pt-8 px-6 space-y-3">
              <div className="flex items-start"><span className="text-[8px] font-bold w-48 pt-2 uppercase">a. Patient's / Insured's Name:</span><GridBox value={formData.p_name || ''} length={50} className="flex-1" /></div>
              <div className="grid grid-cols-12 gap-4">
                 <div className="col-span-7 flex items-start"><span className="text-[8px] font-bold w-32 pt-2 uppercase">b. Contact number:</span><GridBox value={formData.p_contact || ''} length={10} /></div>
                 <div className="col-span-5 flex items-start"><span className="text-[8px] font-bold w-32 pt-2 uppercase">c. e-mail Id (optional)</span><GridBox value={formData.p_email || ''} length={20} className="flex-1" /></div>
              </div>
              <div className="flex justify-between items-end pt-8">
                 <div className="flex items-start gap-4">
                    <span className="text-[8px] font-bold pt-1 uppercase">Date:</span>
                    <DateGrid value={new Date().toISOString()} />
                    <span className="text-[8px] font-bold pt-1 uppercase ml-4">Time:</span>
                    <TimeGrid value={new Date().toTimeString()} />
                 </div>
                 <div className="border-b border-black h-10 w-64 relative flex items-end">
                    <span className="text-[7px] font-black uppercase text-slate-300 pb-1">Patient's / Insured's Signature:</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between text-[7px] font-bold text-slate-400 border-t border-slate-50 uppercase">
           <span>Standard Magma HDI Form PART-C</span>
           <span className="bg-slate-800 text-white px-2 rounded-sm">3</span>
        </div>
      </div>

    </div>
  );
};

export default MagmaHdiTemplate;
