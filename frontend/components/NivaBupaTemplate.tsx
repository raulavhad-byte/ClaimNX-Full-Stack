
import React from 'react';
import { formatDate } from '../utils';

interface NivaBupaTemplateProps {
  formData: Record<string, any>;
}

const CharacterGrid: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-bold text-slate-700 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-slate-300 bg-white">
        {chars.map((char, i) => (
<div key={i} className="w-[11.5px] h-[13px] shrink-0 border-r border-b border-slate-300 flex items-center justify-center text-[9px] font-black text-[#00338d]">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
    </div>
  );
};

const DottedGrid: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-bold text-slate-700 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex bg-white">
        {chars.map((char, i) => (
<div key={i} className="w-[11px] h-[13px] shrink-0 border border-dashed border-slate-300 -mr-[1px] flex items-center justify-center text-[8.5px] font-black text-[#00338d]">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
    </div>
  );
};

const TickBox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-slate-800 flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-slate-800"></div>}
    </div>
    <span className="text-[8.5px] font-bold text-slate-800 uppercase whitespace-nowrap leading-none">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string; boldValue?: boolean }> = ({ label, value, className = "", boldValue = true }) => (
  <div className={`flex items-end border-b border-slate-200 pb-0.5 ${className}`}>
    <span className="text-[8.5px] font-bold text-slate-600 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className={`text-[9.5px] uppercase flex-1 truncate leading-none ${boldValue ? 'font-black text-[#00338d]' : 'font-medium text-[#00338d]'}`}>{value}</span>
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[#1a4371] text-white py-1.5 px-4 text-[10px] font-black uppercase tracking-[0.2em] my-3">
    {children}
  </div>
);

const NivaBupaHeader: React.FC = () => (
  <div className="mb-4">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-black text-[#1a4371] tracking-tighter leading-none">Niva</span>
            <span className="text-3xl font-black text-[#f15a24] italic tracking-tighter leading-none">Bupa</span>
          </div>
          <span className="text-[7.5px] font-bold text-[#1a4371] uppercase tracking-[0.3em] mt-1">Health Insurance</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[8px] font-bold text-slate-500 uppercase">Customer Helpline</p>
        <p className="text-[16px] font-black text-[#1a4371] tracking-tighter leading-none">1860-500-8888</p>
        <p className="text-[8px] font-bold text-[#1a4371] uppercase mt-1">www.nivabupa.com</p>
      </div>
    </div>
    <div className="bg-[#1a4371] text-white py-3 px-8 rounded-sm text-center shadow-md">
       <h1 className="text-[15px] font-black uppercase tracking-[0.1em] leading-tight">Request for Cashless Hospitalisation for<br/>Health Insurance Policy Part - C</h1>
    </div>
    <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-widest text-center">Details of the Third Party Administrator/ Insurer/ hospital: (To be filled in block letters)</p>
  </div>
);

const NivaBupaTemplate: React.FC<NivaBupaTemplateProps> = ({ formData }) => {
  const chronicItems = [
    { label: "Diabetes", k: "diabetes" },
    { label: "Heart disease", k: "heart_disease" },
    { label: "Hypertension", k: "hypertension" },
    { label: "Hyperlipidemias", k: "hyperlipidemias" },
    { label: "Osteoarthritis", k: "osteoarthritis" },
    { label: "Asthma/COPD/Bronchitis", k: "asthma_copd" },
    { label: "Cancer", k: "cancer" },
    { label: "Alcohol/Drug abuse", k: "alcohol_abuse" },
    { label: "Any HIV/ or STD Related ailment", k: "hiv_std" }
  ];

  return (
    <div className="bg-slate-200 p-4 lg:p-12 space-y-12 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1: Institutional & Patient Details */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-slate-900 border shadow-2xl print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <NivaBupaHeader />
        
        <div className="space-y-4">
           <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8 space-y-2">
                 <DottedGrid label="a) Name of Insurance company:" value="NIVA BUPA HEALTH INSURANCE" length={35} />
                 <DottedGrid label="b) Customer helpline number:" value="1860 500 8888" length={15} />
                 <DottedGrid label="c) Fax no./email Id:" value={formData.hosp_email || ''} length={30} />
              </div>
           </div>

           <div className="space-y-3">
              <p className="text-[9px] font-black uppercase text-slate-500 border-b border-slate-100 pb-1">d) Name of Hospital:</p>
              <DottedGrid label="i. Address" value={formData.hosp_address || ''} length={50} />
              <div className="grid grid-cols-2 gap-8">
                 <DottedGrid label="ii. ROHINI ID" value={formData.hosp_rohini_id || ''} length={15} />
                 <DottedGrid label="iii. E-mail Id" value={formData.hosp_email || ''} length={30} />
              </div>
           </div>

           <SectionHeader>TO BE FILLED BY INSURED/PATIENT</SectionHeader>
           
           <div className="space-y-4">
              <DottedGrid label="A. Name of the Patient:" value={formData.p_name || ''} length={45} />
              
              <div className="flex items-start gap-12">
                 <div className="flex items-center space-x-4">
                    <span className="text-[8.5px] font-black uppercase">B. Gender:</span>
                    <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                    <TickBox label="Female" checked={formData.p_gender === 'Female'} />
                    <TickBox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
                 </div>
                 <div className="flex items-start gap-2">
                    <span className="text-[8.5px] font-black pt-1 uppercase">C. Age:</span>
                    <DottedGrid value={String(formData.p_age_y || '')} length={2} subLabel="Year" />
                    <DottedGrid value="" length={2} subLabel="Month" />
                 </div>
              </div>

              <div className="grid grid-cols-12 gap-8">
                 <div className="col-span-6">
                    <DottedGrid label="D. Date of Birth:" value={formData.p_dob ? formatDate(formData.p_dob) : ''} length={10} />
                 </div>
                 <div className="col-span-6">
                    <DottedGrid label="E. Contact number:" value={formData.p_contact || ''} length={12} />
                 </div>
              </div>

              <DottedGrid label="F. Contact number & name of attending relative:" value={formData.p_relative_contact || ''} length={40} />
              <DottedGrid label="G. Insured Card ID number:" value={formData.p_card_id || ''} length={20} />
              <DottedGrid label="H. Current Address of Insured Patient" value={formData.p_address || ''} length={50} />
              <DottedGrid label="I. Occupation of Insured Patient" value={formData.p_occupation || ''} length={30} />
              <DottedGrid label="J. Policy number/Name of Corporate:" value={formData.p_policy_no || ''} length={30} />
              <DottedGrid label="K. Employee ID:" value={formData.p_employee_id || ''} length={15} />

              <div className="flex items-center space-x-10 mt-2">
                 <span className="text-[9px] font-black uppercase">L. Currently do you have any other mediclaim /health insurance:</span>
                 <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
                 <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
              </div>
              <div className="pl-8 space-y-2">
                 <DottedGrid label="Company Name:" value={formData.p_other_insurer_name || ''} length={40} />
                 <DottedGrid label="Give Details:" value="" length={40} />
              </div>

              <div className="flex items-center space-x-12">
                 <div className="flex items-center space-x-4">
                    <span className="text-[9px] font-black uppercase">M. Do you have a family Physician:</span>
                    <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
                    <TickBox label="No" checked={formData.p_family_physician === 'No'} />
                 </div>
                 <DottedGrid label="N. Name of the Family Physician:" value={formData.p_family_physician_name || ''} length={30} className="flex-1" />
              </div>
              <DottedGrid label="O. Contact number, if any:" value={formData.p_family_physician_contact || ''} length={12} />
              <p className="text-[7.5px] font-bold text-slate-400 italic text-right">(Please complete declaration of this form)</p>
           </div>

           <SectionHeader>TO BE FILLED BY TREATING DOCTOR/HOSPITAL</SectionHeader>
           
           <div className="space-y-4">
              <div className="grid grid-cols-12 gap-8">
                 <DottedGrid label="A. Name of the treating Doctor:" value={formData.dr_name || ''} length={35} className="col-span-8" />
                 <DottedGrid label="B. Contact number:" value={formData.dr_contact || ''} length={12} className="col-span-4" />
              </div>
              <DottedGrid label="C. Nature of Illness/Disease with presenting complaint:" value={formData.m_illness || ''} length={60} />
              <DottedGrid label="D. Relevant critical findings:" value={formData.m_clinical_findings || ''} length={60} />
              
              <div className="grid grid-cols-12 gap-8">
                 <div className="col-span-4 flex items-end gap-2">
                    <span className="text-[8.5px] font-black pb-1 uppercase">E. Duration:</span>
                    <DottedGrid value={String(formData.m_duration || '')} length={3} />
                    <span className="text-[8px] font-bold pb-1 lowercase">Days</span>
                 </div>
                 <div className="col-span-8">
                    <DottedGrid label="(i) Date of first consultation:" value={formData.m_first_cons_date ? formatDate(formData.m_first_cons_date) : ''} length={10} />
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-6 flex justify-between text-[7.5px] font-black text-slate-300 border-t border-slate-50 uppercase tracking-widest">
           <span>Niva Bupa Pre-Auth Form (V2.5)</span>
           <span className="bg-slate-800 text-white px-2 rounded-sm">1</span>
        </div>
      </div>

      {/* PAGE 2: Clinical Details & Costs */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-slate-900 border shadow-2xl print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="space-y-4">
           <DottedGrid label="(ii) Past history of present ailment, if any" value="" length={70} />
           <DottedGrid label="F. Provisional diagnosis:" value={formData.m_prov_diag || ''} length={60} />
           <DottedGrid label="(i) ICD 10 code:" value={formData.m_icd_code || ''} length={10} />
           
           <div className="space-y-3">
              <span className="text-[9px] font-black uppercase">G. Proposed line of treatment:</span>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 pl-4">
                 <TickBox label="Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
                 <TickBox label="Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
                 <TickBox label="Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
                 <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
                 <TickBox label="Non-allopathic treatment" checked={false} />
              </div>
           </div>

           <DottedGrid label="H. If investigation &/or Medical Management, provide details" value="" length={70} />
           <DottedGrid label="(i) Route of Drug Administration" value={formData.m_route_drug || ''} length={30} className="pl-6" />
           
           <div className="grid grid-cols-12 gap-8">
              <DottedGrid label="I. If Surgical, name of surgery" value={formData.m_surgery_name || ''} length={40} className="col-span-8" />
              <DottedGrid label="(i) ICD 10 code:" value="" length={10} className="col-span-4" />
           </div>

           <DottedGrid label="J. If other treatment, provide details" value="" length={70} />
           <DottedGrid label="K. How did injury occur" value="" length={70} />

           <div className="space-y-3 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
              <span className="text-[9px] font-black uppercase underline">L. In case of accident</span>
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 pl-4">
                 <div className="flex items-center gap-6"><span className="text-[8.5px] font-black">i) Is it RTA:</span><TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} /><TickBox label="No" checked={formData.m_is_rta === 'No'} /></div>
                 <div className="flex items-start gap-3"><span className="text-[8.5px] font-black pt-1">ii) Date of Injury:</span><DottedGrid value={formData.m_rta_date ? formatDate(formData.m_rta_date) : ''} length={10} /></div>
                 <div className="flex items-center gap-6"><span className="text-[8.5px] font-black">iii) Report to Police:</span><TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} /><TickBox label="No" checked={formData.m_rta_police === 'No'} /></div>
                 <DottedGrid label="iv) FIR No." value={formData.m_fir_no || ''} length={15} />
                 <div className="col-span-2 flex items-center gap-10">
                    <span className="text-[8.5px] font-black">v. Injury /Disease caused due to substance abuse/alcohol consumption:</span>
                    <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} /><TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
                 <div className="col-span-2 flex items-center gap-10">
                    <span className="text-[8.5px] font-black">vi. Test conducted to establish this (if yes, attach report):</span>
                    <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} /><TickBox label="No" checked={formData.m_test_conducted === 'No'} />
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-10">
              <div className="flex items-center space-x-4">
                 <span className="text-[9px] font-black uppercase">M. In case of Maternity:</span>
                 <div className="flex border border-slate-800">
                    <div className="px-1.5 h-5 flex items-center justify-center border-r border-slate-800 text-[9px] font-black">G: {formData.m_mat_g || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center border-r border-slate-800 text-[9px] font-black">P: {formData.m_mat_p || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center border-r border-slate-800 text-[9px] font-black">L: {formData.m_mat_l || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center text-[9px] font-black">A: {formData.m_mat_a || '0'}</div>
                 </div>
              </div>
              <div className="flex items-start space-x-3"><span className="text-[8.5px] font-black pt-1 uppercase">(i) Expected date of Delivery</span><DottedGrid value={formData.m_mat_edd ? formatDate(formData.m_mat_edd) : ''} length={10} /></div>
           </div>

           <p className="text-[11px] font-black uppercase text-[#1a4371] mb-2 border-b-2 border-[#1a4371] w-fit">Details of patient admitted</p>
           <div className="grid grid-cols-2 gap-x-12">
              <DottedGrid label="A. Date of admission" value={formData.adm_date ? formatDate(formData.adm_date) : ''} length={10} />
              <DottedGrid label="B. Time of admission" value={formData.adm_time} length={5} />
           </div>
           <div className="flex items-center gap-12 py-2">
              <span className="text-[9px] font-black uppercase">C. Is this an emergency/planned hospitalization event:</span>
              <TickBox label="Emergency" checked={false} />
              <TickBox label="Planned" checked={true} />
           </div>

           <div className="grid grid-cols-12 gap-8">
              <div className="col-span-6 space-y-3">
                 <span className="text-[9.5px] font-black uppercase border-b border-slate-200 block pb-1">D. Mandatory Past History of chronic illness</span>
                 <div className="space-y-2.5">
                    {chronicItems.map(item => (
                      <div key={item.k} className="flex items-center justify-between group">
                         <TickBox label={item.label} checked={formData[`m_chronic_${item.k}_status`] === 'Yes'} />
                         <DottedGrid value={formData[`m_chronic_${item.k}_since`] || ''} length={5} subLabel="M/Y" />
                      </div>
                    ))}
                 </div>
              </div>
              <div className="col-span-6 space-y-4">
                 <div className="flex items-end gap-2"><span className="text-[8.5px] font-black pb-1 uppercase text-slate-400">E. Expected number of days stay:</span><DottedGrid value={String(formData.adm_stay_days || '')} length={3} /></div>
                 <div className="flex items-end gap-2"><span className="text-[8.5px] font-black pb-1 uppercase text-slate-400">F. Days in ICU:</span><DottedGrid value="" length={3} /></div>
                 <UnderlineField label="G. Room Type" value={formData.adm_room_type || ''} />

                 <div className="space-y-1.5 mt-4 border-t border-slate-100 pt-4">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Cost Breakdown (INR)</p>
                    {[
                      { label: "H. Per Day Room Rent + Nursing:", id: "cost_room_rent" },
                      { label: "I. Expected Investigation:", id: "cost_investigation" },
                      { label: "J. ICU Charges:", id: "cost_icu" },
                      { label: "K. OT Charges:", id: "cost_ot" },
                      { label: "L. Professional Fees (Surgeon/Cons):", id: "cost_prof_fees" },
                      { label: "M. Medicines + Implants:", id: "cost_medicines" },
                      { label: "N. Other Hospital Expenses:", id: "cost_other" },
                      { label: "O. All-inclusive Package:", id: "cost_package" },
                      { label: "P. Sum Total Expected Cost:", id: "adm_total_cost", bold: true },
                    ].map(item => (
                      <div key={item.id} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-slate-800 mt-2' : ''}`}>
                         <span className={`text-[7.5px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                         <div className="border-b border-slate-300 w-24 text-right pr-1 text-[9px] font-black">₹ {Number(formData[item.id] || 0).toLocaleString()}</div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-6 flex justify-between text-[7.5px] font-black text-slate-300 border-t border-slate-50 uppercase tracking-widest">
           <span>Niva Bupa Pre-Auth Form (V2.5)</span>
           <span className="bg-slate-800 text-white px-2 rounded-sm">2</span>
        </div>
      </div>

      {/* PAGE 3: Declarations */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-slate-900 border shadow-2xl print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="space-y-8 flex-1">
           <SectionHeader>DECLARATION</SectionHeader>
           <p className="text-[9px] font-black text-center uppercase tracking-tight">We confirm having read understood and agreed to the Declarations within this form</p>
           
           <div className="space-y-4 px-10">
              <DottedGrid label="a. Name of the treating Doctor" value={formData.dr_name || ''} length={40} />
              <div className="grid grid-cols-2 gap-10">
                 <DottedGrid label="b. Qualification:" value="MBBS, MD" length={20} />
                 <DottedGrid label="c. Registration number with State code" value={formData.registrationNo || ''} length={15} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-20 px-10 pt-4">
              <div className="border-2 border-slate-200 p-8 h-32 relative flex items-center justify-center bg-slate-50/30 rounded-2xl">
                 <span className="absolute top-2 left-2 text-[6px] font-black uppercase text-slate-300">Hospital Seal (Must include Hospital ID)</span>
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-60 mix-blend-multiply" />}
              </div>
              <div className="border-2 border-slate-200 p-8 h-32 relative flex items-end justify-center bg-slate-50/30 rounded-2xl">
                 <span className="absolute top-2 left-2 text-[6px] font-black uppercase text-slate-300">Patient/Insured Name and Sign</span>
              </div>
           </div>

           <SectionHeader>DECLARATION BY THE PATIENT/REPRESENTATIVE</SectionHeader>
           <div className="text-[8px] text-justify space-y-3 px-4 leading-relaxed text-slate-600 font-medium">
              <p>a. I agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer/ T.P.A after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
              <p>b. Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer/ TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
              <p>c. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer/ T.P.A not governed by the terms and conditions of the policy will be paid by me.</p>
              <p>d. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the Insurer/ T.P.A</p>
              <p>e. I agree and understand that T.P.A is in no way warranting the service of the hospital & that the Insurer/ TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
              <p>f. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
              <p>g. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer/TPA.</p>
              <p>h. “I/We authorize Insurance Company TPA to contact me/us through mobile/email for any update on this claim”.</p>
           </div>

           <div className="space-y-4 px-4 pt-4 border-t border-slate-100">
              <DottedGrid label="1. Patient’s/Insured’s Name:" value={formData.p_name || ''} length={40} />
              <div className="grid grid-cols-2 gap-8">
                 <DottedGrid label="2. Contact number:" value={formData.p_contact || ''} length={12} />
                 <DottedGrid label="3. e-mail Id (optional)" value={formData.p_email || ''} length={25} />
              </div>
              <div className="flex justify-between items-end pt-4">
                 <div className="flex gap-10">
                    <UnderlineField label="Date:" value={formatDate(new Date())} className="w-32" />
                    <UnderlineField label="Time:" value={new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} className="w-32" />
                 </div>
                 <div className="w-64 border-b-2 border-slate-800 pb-1 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">4. Patient's / Insured's Signature</p>
                 </div>
              </div>
           </div>

           <SectionHeader>HOSPITAL DECLARATION</SectionHeader>
           <p className="text-[7.5px] leading-relaxed text-slate-500 italic px-4">
              We have no objection to any authorized TPA / Insurance Company official verifying documents pertaining to hospitalization. All valid original documents duly countersigned by the insured/patient as per the checklist will be sent to TPA / Insurance Company within 7 days of the patient’s discharge. In the event of unauthorized recovery of any additional amount from the Insured in excess of Agreed Package Rates, the authorized TPA/ Insurance Company reserves the right to recover the same from us (the Network Provider).
           </p>

           <div className="grid grid-cols-2 gap-20 px-10 pt-4">
              <div className="flex flex-col items-center">
                 <div className="w-full h-24 border border-slate-200 relative flex items-center justify-center bg-slate-50 rounded-xl">
                    {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-60 mix-blend-multiply" />}
                 </div>
                 <p className="text-[8px] font-black uppercase mt-2">Hospital Seal</p>
              </div>
              <div className="flex flex-col items-center">
                 <div className="w-full h-24 border border-slate-200 relative flex items-center justify-center bg-slate-50 rounded-xl">
                    {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-full max-w-full opacity-60 mix-blend-multiply" />}
                 </div>
                 <p className="text-[8px] font-black uppercase mt-2">Doctor’s Signature</p>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-6 text-center space-y-1">
          <p className="text-[9px] font-black text-[#1a4371] uppercase">Niva Bupa Health Insurance Company Limited</p>
          <p className="text-[7px] text-slate-400 uppercase tracking-widest">Registered office:- C-98, First Floor, Lajpat Nagar, Part 1, New Delhi-110024</p>
        </div>
      </div>

      {/* PAGE 4: Annexure */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-slate-900 border shadow-2xl print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="flex-1 space-y-10">
           <div className="bg-[#1a4371] text-white p-4 rounded-sm text-center">
              <h2 className="text-[14px] font-black uppercase tracking-widest">ANNEXURE FOR PREAUTH CLAIMS</h2>
           </div>

           <div className="space-y-6">
              <p className="text-[11px] font-black text-slate-800 uppercase">Dear Policyholder,</p>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">Please fill the following information along with the cashless form for your medical insurance policy.</p>
              
              <div className="space-y-4">
                 <DottedGrid label="Policy No." value={formData.p_policy_no || ''} length={15} />
                 <DottedGrid label="Membership Number" value={formData.p_card_id || ''} length={20} />
                 <DottedGrid label="Hospital Id (To be filled by hospital)" value={formData.hosp_rohini_id || ''} length={12} />
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-800 uppercase border-b-2 border-slate-800 pb-1 w-fit">DOCUMENT CHECKLIST:</h3>
              <div className="space-y-3 pl-4">
                 {[
                   "I. Copy of Photo ID, address proof and recent photo of patient. (for Valid proof of documents kindly refer KYC documents list)",
                   "II. Past illness records (With duration of symptoms) if any",
                   "III. First and subsequent consultation paper along with admission note.",
                   "IV. Complete medical history along with supporting investigation reports.",
                   "V. In case of accident, MLC/FIR copy (if applicable)",
                   "VI. Claim consent letter"
                 ].map(item => (
                   <div key={item} className="flex items-start gap-4">
                      <div className="w-4 h-4 border border-slate-300 rounded flex-shrink-0 mt-0.5"></div>
                      <p className="text-[10px] font-bold text-slate-600 leading-tight uppercase tracking-tight">{item}</p>
                   </div>
                 ))}
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase italic pt-4">All documents mentioned above to be submitted along with the completed filled cashless form. Insurer may require further documents to process the request.</p>
           </div>

           <div className="grid grid-cols-2 gap-12 pt-20">
              <div className="space-y-8">
                 <DottedGrid label="Name of the Proposer/insured" value={formData.p_proposer_name || formData.p_name || ''} length={25} />
                 <DottedGrid label="Contact No." value={formData.p_contact || ''} length={10} />
              </div>
              <div className="flex flex-col items-center justify-end">
                 <div className="w-full h-20 border-b-2 border-slate-800 flex items-center justify-center relative bg-slate-50/30">
                    <span className="absolute top-1 left-2 text-[6px] font-black text-slate-300 uppercase">Signature</span>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-12 pt-12">
              <div className="space-y-8">
                 <DottedGrid label="Name of the TPA coordinator" value="" length={25} />
                 <UnderlineField label="Date:" value={formatDate(new Date())} className="w-40" />
                 <DottedGrid label="Place:" value={formData.hosp_district || ''} length={10} />
              </div>
              <div className="flex flex-col items-center justify-end">
                 <div className="w-full h-20 border-b-2 border-slate-800 flex items-center justify-center relative bg-slate-50/30">
                    <span className="absolute top-1 left-2 text-[6px] font-black text-slate-300 uppercase">Signature</span>
                 </div>
              </div>
           </div>
        </div>
        <div className="mt-auto pt-6 text-center space-y-1">
          <p className="text-[9px] font-black text-[#1a4371] uppercase">Niva Bupa Health Insurance Company Limited</p>
        </div>
      </div>

      {/* PAGE 5: Consent Letter */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-slate-900 border shadow-2xl print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="flex-1 space-y-12">
           <div className="bg-[#1a4371] text-white p-4 rounded-sm">
              <h2 className="text-[18px] font-black uppercase tracking-[0.2em]">Consent Letter</h2>
           </div>

           <div className="flex justify-between items-start">
              <div className="space-y-4">
                 <p className="text-[11px] font-black text-slate-800 uppercase">To,</p>
                 <p className="text-[11px] font-black text-slate-800 uppercase underline underline-offset-4 decoration-2">Medical Superintendent</p>
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-800 border-b border-dotted border-slate-400 w-64 pb-0.5">{formData.hosp_name}</p>
                    <p className="text-[10px] font-bold text-slate-800 border-b border-dotted border-slate-400 w-64 pb-0.5">{formData.hosp_address}</p>
                    <p className="text-[10px] font-bold text-slate-800 border-b border-dotted border-slate-400 w-64 pb-0.5">{formData.hosp_district}</p>
                 </div>
              </div>
              <div className="text-right">
                 <UnderlineField label="Date" value={formatDate(new Date())} className="w-40" />
              </div>
           </div>

           <div className="pt-10 space-y-8">
              <p className="text-[11px] leading-[2.5] text-justify font-medium text-slate-700">
                I, Mr./Ms. <span className="border-b-2 border-slate-800 px-10 font-black uppercase">{formData.p_name}</span> Age <span className="border-b-2 border-slate-800 px-4 font-black">{formData.p_age_y}</span> Resident of <span className="border-b-2 border-slate-800 px-20 font-black uppercase">{formData.p_address}</span> State <span className="border-b-2 border-slate-800 px-10 font-black uppercase">{formData.hosp_state || 'MH'}</span> Hereby give my willful consent to Mr/ Dr <span className="border-b-2 border-slate-800 px-16 font-black uppercase">{formData.dr_name}</span> of Niva Bupa Health Insurance Company Limited to verify and collect necessary documents/ statements including but not limited to certified copies of medical records from your esteemed hospital for the purpose of settlement of my Insurance claim.
              </p>
           </div>

           <div className="space-y-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
              <h4 className="text-[11px] font-black text-[#1a4371] uppercase border-b border-[#1a4371]/20 pb-2">My other relevant details are provided below;</h4>
              <div className="grid grid-cols-1 gap-6">
                 <UnderlineField label="Detail of Insured:-" value={formData.p_name || ''} />
                 <div className="grid grid-cols-2 gap-10">
                    <UnderlineField label="DOA:-" value={formData.adm_date || ''} />
                    <UnderlineField label="DOD:-" value="" />
                 </div>
                 <UnderlineField label="MRD/ Indoor/ IP No:-" value={formData.p_uhid || ''} />
                 <UnderlineField label="Policy No:-" value={formData.p_policy_no || ''} />
              </div>
           </div>

           <p className="text-[10px] font-bold text-slate-500 uppercase italic">I request you to provide all the information/documents as required by Niva Bupa Health Insurance Company Ltd.</p>

           <div className="grid grid-cols-2 gap-20 pt-12">
              <div className="space-y-12">
                 <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-800 uppercase">Name</p>
                    <p className="text-[12px] font-black text-slate-900 border-b border-slate-300 pb-1 uppercase">{formData.p_name}</p>
                 </div>
                 <div className="w-full h-24 border border-dashed border-slate-300 relative flex items-center justify-center rounded-xl bg-slate-50">
                    <p className="text-[10px] font-black uppercase text-slate-300">Signature/ Thumb Impression</p>
                 </div>
              </div>
              <div className="flex flex-col justify-end pb-0">
                 <div className="w-full h-24 border border-dashed border-slate-300 relative flex items-center justify-center rounded-xl bg-slate-50">
                    <p className="text-[10px] font-black uppercase text-slate-300">Witness Name & Signature</p>
                 </div>
              </div>
           </div>
        </div>
        <div className="mt-auto pt-6 text-center space-y-1">
          <p className="text-[9px] font-black text-[#1a4371] uppercase">Niva Bupa Health Insurance Company Limited</p>
        </div>
      </div>

    </div>
  );
};

export default NivaBupaTemplate;
