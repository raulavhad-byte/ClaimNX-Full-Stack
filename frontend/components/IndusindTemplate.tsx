
import React from 'react';

interface IndusindTemplateProps {
  formData: Record<string, any>;
}

const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-black text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-[#6B0F1A]">
        {chars.map((char, i) => (
          <div key={i} className="w-[11.5px] h-[13px] border-r border-b border-[#6B0F1A] flex items-center justify-center text-[9px] font-black text-black bg-white">
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
          <div key={i} className={`w-[11.5px] h-[13px] border border-[#6B0F1A] flex items-center justify-center text-[9px] font-black bg-white ${i === 1 || i === 3 ? 'mr-1.5' : '-ml-[1px]'}`}>
            {char}
          </div>
        ))}
      </div>
    </div>
  );
};

const TickBox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-[#6B0F1A] flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-[#6B0F1A]"></div>}
    </div>
    <span className="text-[8.5px] font-bold text-black uppercase whitespace-nowrap leading-none">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string; boldValue?: boolean }> = ({ label, value, className = "", boldValue = true }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8.5px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className={`text-[9.5px] uppercase flex-1 truncate leading-none ${boldValue ? 'font-black text-black' : 'font-medium text-slate-600'}`}>{value}</span>
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[#6B0F1A] text-white py-1.5 px-4 text-[10px] font-black uppercase tracking-[0.2em] my-3">
    {children}
  </div>
);

const IndusindHeader: React.FC = () => (
  <div className="mb-6">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            {/* Zebu Logo Placeholder */}
            <div className="w-12 h-10 bg-[#6B0F1A] flex items-center justify-center rounded-sm">
               <svg viewBox="0 0 100 100" className="w-8 h-8 fill-white">
                  <path d="M20,80 Q50,20 80,80" fill="none" stroke="white" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="15"/>
               </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-3xl font-black text-[#6B0F1A] tracking-tighter">IndusInd</span>
              <span className="text-[10px] font-black text-[#9C7F4A] uppercase tracking-[0.2em]">General Insurance</span>
            </div>
          </div>
          <span className="text-[6.5px] font-bold text-slate-500 uppercase tracking-widest mt-1">A DIVISON OF INDUSIND ENTERPRISE</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[12px] font-black text-[#9C7F4A] leading-none uppercase">Pre-Authorization</p>
        <p className="text-[16px] font-black text-[#6B0F1A] tracking-tighter leading-none mt-1">Request Form</p>
      </div>
    </div>
    <div className="bg-[#9C7F4A] text-white text-center py-1 font-black uppercase text-[9px] tracking-widest">
      REQUEST FOR CASHLESS HOSPITALISATION (IRDAI PART-C REVISED)
    </div>
  </div>
);

const IndusindTemplate: React.FC<IndusindTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <IndusindHeader />
        
        <div className="space-y-2 mb-4">
           <p className="text-[8.5px] font-black uppercase text-[#6B0F1A] border-b border-[#6B0F1A]/20 pb-1">Details of the Hospital / Insurance Provider</p>
           <UnderlineField label="a) Name of TPA/Insurance Company:" value={formData.insurance_company || 'IndusInd General Insurance Co Ltd'} />
           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="b) Customer Care Number:" value="1800 220 220" />
              <UnderlineField label="c) Official Fax Number:" value="" />
           </div>
           <UnderlineField label="d) Name of the Hospital:" value={formData.hosp_name || ''} />
           <div className="pl-8 space-y-2">
              <UnderlineField label="i. Registered Address:" value={formData.hosp_address || ''} />
              <div className="grid grid-cols-2 gap-10">
                <UnderlineField label="ii. ROHINI ID:" value={formData.hosp_rohini_id || ''} />
                <UnderlineField label="iii. Hospital Email:" value={formData.hosp_email || ''} />
              </div>
           </div>
        </div>

        <SectionHeader>TO BE FILLED BY THE INSURED / PATIENT</SectionHeader>
        <div className="space-y-4 mb-6">
           <div className="flex items-start">
              <span className="text-[8.5px] font-bold w-48 pt-2 uppercase">a. Name of the Patient:</span>
              <GridBox value={formData.p_name || ''} length={40} className="flex-1" />
           </div>
           
           <div className="flex items-start gap-12">
              <div className="flex items-center gap-4">
                 <span className="text-[8.5px] font-bold uppercase">b. Gender:</span>
                 <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                 <TickBox label="Female" checked={formData.p_gender === 'Female'} />
              </div>
              <div className="flex items-start gap-2">
                 <span className="text-[8.5px] font-bold pt-1 uppercase">c. Age:</span>
                 <GridBox value={String(formData.p_age_y || '')} length={2} subLabel="Years" />
                 <GridBox value="" length={2} subLabel="Months" />
              </div>
              <div className="flex items-start gap-4 flex-1">
                 <span className="text-[8.5px] font-bold pt-1 uppercase">d. Date of Birth:</span>
                 <DateGrid value={formData.p_dob} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-end gap-2">
                 <span className="text-[8.5px] font-bold pb-1 uppercase">e. Patient Mobile No.:</span>
                 <GridBox value={formData.p_contact || ''} length={10} />
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8.5px] font-bold pb-1 uppercase">f. Insured Card ID:</span>
                 <GridBox value={formData.p_card_id || ''} length={15} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-end gap-2">
                 <span className="text-[8.5px] font-bold pb-1 uppercase">g. Policy Number:</span>
                 <GridBox value={formData.p_policy_no || ''} length={20} />
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-[8.5px] font-bold pb-1 uppercase">h. Employee ID:</span>
                 <GridBox value={formData.p_employee_id || ''} length={12} />
              </div>
           </div>

           <div className="flex items-center space-x-8">
              <span className="text-[8.5px] font-bold uppercase">i. Do you have any other insurance cover:</span>
              <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
              {formData.p_other_insurance === 'Yes' && <UnderlineField label="Company:" value={formData.p_other_insurer_name || ''} className="flex-1" />}
           </div>

           <UnderlineField label="j. Permanent Address of Insured:" value={formData.p_address || ''} />
           <UnderlineField label="k. Patient Occupation:" value={formData.p_occupation || ''} />
        </div>

        <SectionHeader>TO BE FILLED BY THE TREATING DOCTOR / HOSPITAL</SectionHeader>
        <div className="space-y-4">
           <div className="flex items-end gap-10">
              <UnderlineField label="a. Name of Treating Doctor:" value={formData.dr_name || ''} className="flex-1" />
              <div className="flex items-end gap-2">
                 <span className="text-[8.5px] font-bold pb-1 uppercase">Doctor Mobile:</span>
                 <GridBox value={formData.dr_contact || ''} length={10} />
              </div>
           </div>
           
           <UnderlineField label="b. Nature of Illness / presenting complaints:" value={formData.m_illness || ''} />
           <UnderlineField label="c. Relevant Clinical Findings:" value={formData.m_clinical_findings || ''} />
           
           <div className="flex items-start gap-12">
              <div className="flex items-start gap-2">
                 <span className="text-[8.5px] font-bold pt-1 uppercase">d. Ailment Duration:</span>
                 <GridBox value={String(formData.m_duration || '')} length={3} />
                 <span className="text-[8px] font-bold pt-1 uppercase ml-1">Days</span>
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8.5px] font-bold pt-1 uppercase">Date of 1st consultation:</span>
                 <DateGrid value={formData.m_first_cons_date} />
              </div>
           </div>

           <div className="grid grid-cols-12 gap-8">
              <UnderlineField label="e. Provisional Diagnosis:" value={formData.m_prov_diag || ''} className="col-span-9" />
              <div className="col-span-3 flex items-end gap-2">
                 <span className="text-[8.5px] font-bold pb-1 uppercase">f. ICD Code:</span>
                 <GridBox value={formData.m_icd_code || ''} length={8} />
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-2">
              <span className="text-[8.5px] font-bold uppercase">g. Line of Treatment:</span>
              <TickBox label="Medical" checked={formData.m_treatment_type === 'Medical Management'} />
              <TickBox label="Surgical" checked={formData.m_treatment_type === 'Surgical Management'} />
              <TickBox label="Intensive Care" checked={formData.m_treatment_type === 'Intensive care'} />
              <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between text-[7px] font-bold text-slate-400 border-t border-slate-50 uppercase">
           <span>IndusInd Standard Pre-Auth Form (V2.5)</span>
           <span className="bg-[#6B0F1A] text-white px-2 rounded-sm">1</span>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="space-y-4">
           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="h. Name of Surgery (if applicable):" value={formData.m_surgery_name || ''} />
              <div className="flex items-end gap-2">
                 <span className="text-[8.5px] font-bold pb-1 uppercase">i. ICD PCS Code:</span>
                 <GridBox value="" length={10} />
              </div>
           </div>

           <div className="space-y-2 border border-black/10 p-4 bg-slate-50/50 rounded-xl">
              <span className="text-[9px] font-black uppercase text-[#6B0F1A] underline">In case of Accident / Injury:</span>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 pl-4 mt-2">
                 <div className="flex items-center gap-6"><span className="text-[8.5px] font-bold uppercase">Is it RTA:</span><TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} /><TickBox label="No" checked={formData.m_is_rta === 'No'} /></div>
                 <div className="flex items-start gap-3"><span className="text-[8.5px] font-bold pt-1 uppercase">Date of Injury:</span><DateGrid value={formData.m_rta_date} /></div>
                 <div className="flex items-center gap-6"><span className="text-[8.5px] font-bold uppercase">Report to Police:</span><TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} /><TickBox label="No" checked={formData.m_rta_police === 'No'} /></div>
                 <UnderlineField label="FIR / MLC No.:" value={formData.m_fir_no || ''} className="flex-1" />
              </div>
           </div>

           <div className="flex items-center gap-10 mt-4">
              <div className="flex items-center space-x-4">
                 <span className="text-[9px] font-black uppercase text-[#9C7F4A]">In case of Maternity:</span>
                 <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-4 h-4 flex items-center justify-center border-r last:border-r-0 border-black text-[9px] font-bold">{l}</div>)}</div>
              </div>
              <div className="flex items-start space-x-3"><span className="text-[8.5px] font-bold pt-1 uppercase">Expected Delivery:</span><DateGrid value="" /></div>
           </div>

           <SectionHeader>DETAILS OF PATIENT ADMISSION & ESTIMATED COSTS</SectionHeader>
           
           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-start space-x-4"><span className="text-[8.5px] font-bold pt-1 uppercase">Admission Date:</span><DateGrid value={formData.adm_date} /></div>
              <div className="flex items-start space-x-4">
                 <span className="text-[8.5px] font-bold pt-1 uppercase">Admission Time:</span>
                 <div className="flex border border-black bg-white">
                    <div className="w-5 h-5 flex items-center justify-center border-r border-black font-black text-[10px]">{formData.adm_time?.split(':')[0] || ' '}</div>
                    <div className="w-5 h-5 flex items-center justify-center font-black text-[10px]">{formData.adm_time?.split(':')[1] || ' '}</div>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-12 py-2">
              <span className="text-[8.5px] font-bold uppercase">Category of Admission:</span>
              <TickBox label="Emergency" checked={false} />
              <TickBox label="Planned / Routine" checked={true} />
           </div>

           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-end gap-2"><span className="text-[8.5px] font-bold pb-1.5 uppercase">Estimated Stay:</span><GridBox value={String(formData.adm_stay_days || '')} length={3} /><span className="text-[7.5px] font-bold pb-1.5 uppercase">Days</span></div>
              <UnderlineField label="Room Category:" value={formData.adm_room_type || ''} />
           </div>

           <div className="space-y-1.5 mt-4 border-t border-slate-200 pt-4">
              <p className="text-[9px] font-black uppercase text-[#9C7F4A] mb-2 tracking-widest">Aggregate Cost Breakdown (Estimate)</p>
              <div className="grid grid-cols-1 gap-1">
                 {[
                    { label: "1. Room Rent + Nursing + Service + Diet Charges", id: "cost_room_rent" },
                    { label: "2. Investigations + Diagnostics + Lab Registry", id: "cost_investigation" },
                    { label: "3. ICU / ICCU / HDU Facility Charges", id: "cost_icu" },
                    { label: "4. OT Charges + Surgical Operating Fees", id: "cost_ot" },
                    { label: "5. Professional Fees (Surgeon / Consultant)", id: "cost_prof_fees" },
                    { label: "6. Medicines + Consumables + Pharmacy Ledger", id: "cost_medicines" },
                    { label: "7. All-inclusive Package Charges (if applicable)", id: "cost_package" },
                    { label: "AGGREGATED SUM TOTAL ESTIMATED COST", id: "adm_total_cost", isBold: true },
                 ].map((item, idx) => (
                    <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.isBold ? 'border-[#6B0F1A] mt-2 pt-2' : ''}`}>
                       <span className={`text-[8px] font-bold uppercase ${item.isBold ? 'font-black text-[#6B0F1A]' : 'text-slate-600'}`}>{item.label}</span>
                       <div className="flex items-center">
                          <span className="text-[9px] mr-2 font-black">₹</span>
                          <GridBox value={String(formData[item.id] || 0)} length={7} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <SectionHeader>DECLARATIONS & AUTHORIZATIONS</SectionHeader>
           
           <div className="space-y-6 pt-4">
              <p className="text-[8px] text-justify leading-relaxed text-slate-700 italic px-4">
                 I/We hereby declare that the particulars given in this Pre-Authorization request are true and correct to the best of my knowledge and belief. I authorize IndusInd General Insurance to seek any medical information from the treating physician or hospital regarding this admission. I agree to pay for any expenses that are not authorized or are considered as exclusions under the policy terms and conditions.
              </p>

              <div className="grid grid-cols-2 gap-20 px-8 pt-6">
                 <div className="flex flex-col items-center">
                    <div className="w-full h-24 border border-[#6B0F1A]/20 bg-slate-50/50 rounded-xl relative flex items-center justify-center overflow-hidden">
                       {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-60 mix-blend-multiply p-2" />}
                       <span className="absolute top-1 left-2 text-[6px] font-black text-slate-300 uppercase">Hospital Registry Seal</span>
                    </div>
                    <p className="text-[8px] font-black uppercase mt-2">Authorized Signatory</p>
                 </div>
                 <div className="flex flex-col items-center">
                    <div className="w-full h-24 border border-black/20 bg-slate-50/50 rounded-xl relative flex items-center justify-center">
                       <span className="absolute top-1 left-2 text-[6px] font-black text-slate-300 uppercase">Patient / Insured Signature</span>
                    </div>
                    <p className="text-[8px] font-black uppercase mt-2">Beneficiary Consent</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between text-[7px] font-bold text-slate-400 border-t border-slate-50 uppercase">
           <span>IndusInd Standard Pre-Auth Form (V2.5)</span>
           <span className="bg-[#6B0F1A] text-white px-2 rounded-sm">2</span>
        </div>
      </div>

    </div>
  );
};

export default IndusindTemplate;
