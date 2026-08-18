
import React from 'react';
import { formatDate } from '../utils';

interface HealthIndiaTemplateProps {
  formData: Record<string, any>;
}

const CharacterGrid: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-bold text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
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
      {label && <span className="text-[7.5px] font-bold text-slate-800 uppercase mb-0.5">{label}</span>}
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
  <div className={`flex items-center space-x-2 ${className}`}>
    <div className={`w-[12px] h-[12px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[8px] h-[8px] bg-black"></div>}
    </div>
    <span className="text-[9px] font-bold text-black uppercase leading-none">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string; boldValue?: boolean }> = ({ label, value, className = "", boldValue = true }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[9px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className={`text-[10px] uppercase flex-1 truncate leading-none ${boldValue ? 'font-black text-[#00338d]' : 'font-medium text-[#00338d]'}`}>{value}</span>
  </div>
);

const HealthIndiaLogo: React.FC = () => (
  <div className="flex flex-col shrink-0">
    <div className="flex items-baseline">
      <span className="text-2xl font-black text-[#5ba53e] tracking-tighter">HEALTHINDIA</span>
    </div>
    <span className="text-[6.5px] font-bold text-slate-500 uppercase tracking-widest leading-none">INSURANCE TPA SERVICES PVT. LTD.</span>
  </div>
);

const PageFooter: React.FC<{ page: number }> = ({ page }) => (
  <div className="mt-auto pt-4 flex justify-between text-[8px] font-bold text-slate-400 border-t border-slate-50 uppercase tracking-widest">
     <span>Standard HealthIndia Form PART-C</span>
     <span className="font-black text-slate-800">{page} | P a g e</span>
  </div>
);

const HealthIndiaTemplate: React.FC<HealthIndiaTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-200 p-4 lg:p-12 space-y-12 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1: Registry and Patient Info */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
           <HealthIndiaLogo />
           <div className="flex-1 text-center px-4">
              <h1 className="text-[12px] font-black uppercase leading-tight">REQUEST FOR CASHLESS HOSPITALISATION FOR HEALTH INSURANCE POLICY</h1>
              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">(TO BE FILLED IN BLOCK LETTERS)</p>
           </div>
        </div>

        <div className="text-center bg-slate-50 border-y border-black py-1 mb-6">
           <h2 className="text-[10px] font-black uppercase tracking-widest">DETAILS OF THE THIRD PARTY ADMINISTRATOR/ INSURER/ HOSPITAL:</h2>
        </div>

        <div className="space-y-4 mb-6">
           <div className="flex items-end">
              <span className="text-[9px] font-bold w-48 uppercase">a. Name of TPA/Insurance company:</span>
              <span className="border-b border-black flex-1 font-black text-[10px] uppercase">HEALTHINDIA INSURANCE TPA SERVICES PVT. LTD.</span>
           </div>
           <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 px-2">
              <span>(IRDA LICENCE No .022)</span>
              <span className="text-blue-600 underline">Cashless Request E-mail Id : crm@healthindiatpa.com</span>
           </div>
           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="b. Toll free phone number:" value="1800-2201-02" />
              <UnderlineField label="c. Toll free fax:" value="07666136699" />
           </div>
           <div className="flex items-start">
              <span className="text-[9px] font-bold w-48 pt-2 uppercase">d. Name of Hospital:</span>
              <CharacterGrid value={formData.hosp_name || ''} length={40} className="flex-1" />
           </div>
           <div className="pl-8 space-y-3 mt-2">
              <UnderlineField label="i. Address:" value={formData.hosp_address || ''} />
              <div className="grid grid-cols-2 gap-10">
                <UnderlineField label="ii. Rohini ID:" value={formData.hosp_rohini_id || ''} />
                <UnderlineField label="iii. E-mail ID:" value={formData.hosp_email || ''} />
              </div>
           </div>
        </div>

        <div className="text-center bg-slate-50 border-y border-black py-1 mb-6">
           <h2 className="text-[10px] font-black uppercase tracking-widest">TO BE FILLED BY INSURED/PATIENT</h2>
        </div>

        <div className="space-y-4 mb-6">
           <div className="flex items-start">
              <span className="text-[9px] font-bold w-48 pt-2 uppercase">A. Name of the Patient:</span>
              <CharacterGrid value={formData.p_name || ''} length={45} className="flex-1" />
           </div>
           
           <div className="flex items-start gap-12">
              <div className="flex items-center gap-4">
                 <span className="text-[9px] font-bold uppercase">B. Gender:</span>
                 <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                 <TickBox label="Female" checked={formData.p_gender === 'Female'} />
                 <TickBox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
              </div>
              <div className="flex items-start gap-2">
                 <span className="text-[9px] font-bold pt-1 uppercase">C. Age:</span>
                 <CharacterGrid value={String(formData.p_age_y || '')} length={3} subLabel="Years" />
                 <CharacterGrid value="" length={2} subLabel="Months" />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-start gap-4">
                 <span className="text-[9px] font-bold pt-1 uppercase">D. Date of Birth:</span>
                 <DateGrid value={formData.p_dob} />
              </div>
              <UnderlineField label="E. Contact number:" value={formData.p_contact || ''} />
           </div>

           <UnderlineField label="F. Contact number of attending Relative:" value={formData.p_relative_contact || ''} />
           <UnderlineField label="G. Insured Card ID number:" value={formData.p_card_id || ''} />
           <UnderlineField label="H. Policy number/Name of Corporate:" value={formData.p_policy_no || ''} />
           <UnderlineField label="I. Employee ID:" value={formData.p_employee_id || ''} />

           <div className="flex items-center space-x-10 mt-2">
              <span className="text-[9px] font-bold uppercase">J. Currently do you have any other mediclaim / health insurance:</span>
              <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
           </div>
           <div className="pl-8 space-y-2 mt-1">
              <UnderlineField label="i. Company Name:" value={formData.p_other_insurer_name || ''} />
              <UnderlineField label="ii. Give Details:" value="" />
           </div>

           <div className="flex items-center space-x-12 mt-2">
              <span className="text-[9px] font-bold uppercase">K. Do you have a family Physician:</span>
              <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
              <TickBox label="No" checked={formData.p_family_physician === 'No'} />
           </div>
           <UnderlineField label="L. Name of the Family Physician:" value={formData.p_family_physician_name || ''} />
           <UnderlineField label="M. Contact number, if any:" value={formData.p_family_physician_contact || ''} />
           <UnderlineField label="N. Current Address of Insured Patient:" value={formData.p_address || ''} />
           <UnderlineField label="O. Occupation of Insured Patient:" value={formData.p_occupation || ''} />
           
           <p className="text-[8px] font-black text-center mt-6 uppercase text-slate-400 tracking-widest">(PLEASE COMPLETE DECLARATION OF THIS FORM)</p>
        </div>

        <PageFooter page={1} />
      </div>

      {/* PAGE 2: Treating Doctor Info */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="text-center bg-slate-50 border-y border-black py-1 mb-6">
           <h2 className="text-[10px] font-black uppercase tracking-widest">TO BE FILLED BY TREATING DOCTOR / HOSPITAL</h2>
        </div>

        <div className="space-y-4 pt-4 flex-1">
           <UnderlineField label="A: Name of the treating Doctor:" value={formData.dr_name || ''} />
           <UnderlineField label="B. Contact Number:" value={formData.dr_contact || ''} />
           <UnderlineField label="C: Nature of Illness / Disease with presenting complaint:" value={formData.m_illness || ''} />
           <UnderlineField label="D: Relevant Critical Findings:" value={formData.m_clinical_findings || ''} />
           
           <div className="flex items-start gap-12">
              <div className="flex items-end gap-2">
                 <span className="text-[9px] font-bold pb-1 uppercase">E: Duration of the present ailment:</span>
                 <CharacterGrid value={String(formData.m_duration || '')} length={3} />
                 <span className="text-[8px] font-bold pb-1 uppercase ml-1">Days</span>
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[9px] font-bold pt-1 uppercase">i. Date of First consultation:</span>
                 <DateGrid value={formData.m_first_cons_date} />
              </div>
           </div>
           
           <UnderlineField label="ii. Past history of present ailment, if any" value="" />
           <UnderlineField label="F: Provisional diagnosis:" value={formData.m_prov_diag || ''} />
           <UnderlineField label="i. ICD 10 code:" value={formData.m_icd_code || ''} className="w-1/2" />

           <div className="space-y-3 mt-6">
              <span className="text-[9px] font-bold uppercase underline">G: Proposed line of treatment:</span>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 pl-4">
                 <div className="flex items-center justify-between max-w-[300px] border-b border-black/5 pb-1">
                    <span className="text-[9px] uppercase font-bold text-slate-700">i. Medical Management</span>
                    <span className="text-[10px] font-black">( {formData.m_treatment_type === 'Medical Management' ? '✓' : ' '} )</span>
                 </div>
                 <div className="flex items-center justify-between max-w-[300px] border-b border-black/5 pb-1">
                    <span className="text-[9px] uppercase font-bold text-slate-700">ii. Surgical Management</span>
                    <span className="text-[10px] font-black">( {formData.m_treatment_type === 'Surgical Management' ? '✓' : ' '} )</span>
                 </div>
                 <div className="flex items-center justify-between max-w-[300px] border-b border-black/5 pb-1">
                    <span className="text-[9px] uppercase font-bold text-slate-700">iii. Intensive care</span>
                    <span className="text-[10px] font-black">( {formData.m_treatment_type === 'Intensive care' ? '✓' : ' '} )</span>
                 </div>
                 <div className="flex items-center justify-between max-w-[300px] border-b border-black/5 pb-1">
                    <span className="text-[9px] uppercase font-bold text-slate-700">iv. Investigation</span>
                    <span className="text-[10px] font-black">( {formData.m_treatment_type === 'Investigation' ? '✓' : ' '} )</span>
                 </div>
                 <div className="flex items-center justify-between max-w-[300px] border-b border-black/5 pb-1">
                    <span className="text-[9px] uppercase font-bold text-slate-700">v. Non-allopathic treatment</span>
                    <span className="text-[10px] font-black">(   )</span>
                 </div>
              </div>
           </div>

           <UnderlineField label="i. Route of Drug Administration" value={formData.m_route_drug || ''} className="mt-4" />
           <UnderlineField label="l: lf surgical, name of surgery" value={formData.m_surgery_name || ''} />
           <UnderlineField label="i. ICD l0 PCS code" value="" className="w-1/2" />
           <UnderlineField label="J: If other treatment, provide details" value="" />
           <UnderlineField label="K: How did injury occur" value="" />

           <div className="space-y-3 mt-6 border border-black/10 p-4 bg-slate-50/50 rounded-xl">
              <span className="text-[9px] font-black uppercase underline">L: ln case of accident</span>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 pl-4 mt-2">
                 <div className="flex items-center gap-10">
                    <span className="text-[9px] font-bold w-24">i. Is it RTA:</span>
                    <TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                    <TickBox label="No" checked={formData.m_is_rta === 'No'} />
                 </div>
                 <div className="flex items-start gap-4">
                    <span className="text-[9px] font-bold pt-1">ii. Date of Injury:</span>
                    <DateGrid value={formData.m_rta_date} />
                 </div>
                 <div className="flex items-center gap-10">
                    <span className="text-[9px] font-bold w-24">iii. Report to Police:</span>
                    <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                    <TickBox label="No" checked={formData.m_rta_police === 'No'} />
                 </div>
                 <UnderlineField label="iv. FIR NO." value={formData.m_fir_no || ''} />
                 <div className="col-span-2 flex items-center gap-10">
                    <span className="text-[9px] font-bold uppercase">v. Injury / Disease caused due to substance abuse/alcohol consumption:</span>
                    <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                    <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
                 <div className="col-span-2 flex items-center gap-10">
                    <span className="text-[9px] font-bold uppercase">vi. Test conducted to establish this (if yes, attach report):</span>
                    <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                    <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-10 mt-6">
              <div className="flex items-center space-x-4">
                 <span className="text-[9px] font-bold uppercase">M: In case of Matemity:</span>
                 <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-5 h-5 flex items-center justify-center border-r last:border-r-0 border-black text-[9px] font-black">{l}</div>)}</div>
              </div>
              <div className="flex items-start space-x-4 flex-1">
                 <span className="text-[9px] font-bold pt-1 uppercase">i. Expected date of Delivery:</span>
                 <DateGrid value="" />
              </div>
           </div>
        </div>

        <PageFooter page={2} />
      </div>

      {/* PAGE 3: Admission and Costs */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="text-center bg-slate-50 border-y border-black py-1 mb-6">
           <h2 className="text-[10px] font-black uppercase tracking-widest">DETAILS OF PATIENT ADMITTED</h2>
        </div>
        
        <div className="space-y-6 pt-4 flex-1">
           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-start space-x-4"><span className="text-[9px] font-bold pt-1 uppercase">A. Date of admission:</span><DateGrid value={formData.adm_date} /></div>
              <div className="flex items-start space-x-4">
                 <span className="text-[9px] font-bold pt-1 uppercase">B. Time of admission:</span>
                 <div className="flex border border-black bg-white h-5">
                    <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{formData.adm_time?.split(':')[0] || ' '}</div>
                    <div className="w-5 flex items-center justify-center font-black text-[9px]">{formData.adm_time?.split(':')[1] || ' '}</div>
                 </div>
                 <span className="text-[7px] font-bold pt-1.5 uppercase text-slate-400 ml-1">( HH:MM )</span>
              </div>
           </div>

           <div className="flex items-center gap-12">
              <span className="text-[9px] font-bold uppercase">C. Is this an emergency / planned hospitalization event:</span>
              <TickBox label="Emergency" checked={false} />
              <TickBox label="Planned" checked={true} />
           </div>

           <div className="space-y-4">
              <span className="text-[9px] font-black uppercase underline">D. Mandatory Past History of any chronic illness</span>
              <div className="grid grid-cols-1 gap-2 pl-4">
                 {[
                    { label: "i. Diabetes", key: "diabetes" },
                    { label: "ii. Heart disease", key: "heart" },
                    { label: "iii. Hypertension", key: "hypertension" },
                    { label: "iv. Hyperlipidemias", key: "hyperlipidemias" },
                    { label: "v. Osteoarthritis", key: "osteoarthritis" },
                    { label: "vi. Asthma / COPD / Bronchitis", key: "asthma" },
                    { label: "vii Cancer", key: "cancer" },
                    { label: "viii. Alcohol / Drug abuse", key: "alcohol" },
                    { label: "ix. Any HIV/ or STD Related ailment", key: "hiv" }
                 ].map(item => (
                    <div key={item.key} className="flex items-center justify-between border-b border-slate-50 pb-0.5">
                       <span className="text-[8.5px] font-bold uppercase text-slate-700">{item.label}</span>
                       <div className="flex items-end gap-2">
                          <span className="text-[7.5px] font-bold pb-1 text-slate-400 uppercase">If yes (Since month/year):</span>
                          <CharacterGrid value={formData[`m_chronic_${item.key}_since`] || ''} length={5} />
                       </div>
                    </div>
                 ))}
                 <UnderlineField label="x. Any other ailment, give details" value="" />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-end gap-2"><span className="text-[9px] font-bold pb-1.5 uppercase">E. Expected number of Days /stay in hospital:</span><CharacterGrid value={String(formData.adm_stay_days || '')} length={3} /><span className="text-[8px] font-bold pb-1.5 uppercase">Days</span></div>
              <div className="flex items-end gap-2"><span className="text-[9px] font-bold pb-1.5 uppercase">F. Days in ICU:</span><CharacterGrid value="" length={3} /><span className="text-[8px] font-bold pb-1.5 uppercase">Days</span></div>
           </div>
           
           <UnderlineField label="G. Room Type:" value={formData.adm_room_type || ''} />

           <div className="space-y-2 mt-6 border-t border-slate-200 pt-4">
              <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Aggregated Cost Estimates (INR)</p>
              {[
                 { label: "H. Per day room rent + nursing and service charges + patients diet:", id: "cost_room_rent" },
                 { label: "I. Expected cost of investigation + diagnostic:", id: "cost_investigation" },
                 { label: "J. ICU charges:", id: "cost_icu" },
                 { label: "K. OT charges:", id: "cost_ot" },
                 { label: "L. Professional fees Surgeon + Anesthetist Fees + Consultation Charges:", id: "cost_prof_fees" },
                 { label: "M. Medicines + Consumables + Cost of Implants (if applicable specify):", id: "cost_medicines" },
                 { label: "N. Other hospital expenses if any:", id: "cost_other" },
                 { label: "O. All - inclusive package charges if any applicable:", id: "cost_package" },
                 { label: "P. Sum Total expected cost of hospitalization:", id: "adm_total_cost", bold: true },
              ].map((item, idx) => (
                 <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                    <span className={`text-[8px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                    <div className="flex items-center">
                       <span className="text-[9px] mr-1 font-black">₹</span>
                       <CharacterGrid value={String(formData[item.id] || 0)} length={7} />
                    </div>
                 </div>
              ))}
           </div>
        </div>

        <PageFooter page={3} />
      </div>

      {/* PAGE 4: Declarations and Seals */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="text-center bg-slate-50 border-y border-black py-1 mb-6">
           <h2 className="text-[10px] font-black uppercase tracking-widest">DECLARATION</h2>
        </div>
        <p className="text-[9px] font-black text-center uppercase tracking-tight my-4">(Please read very carefully)</p>
        <p className="text-[9px] font-black text-center uppercase mb-10">We confirm having read understood and agreed to the Declarations of this form</p>
        
        <div className="space-y-8 px-10">
           <UnderlineField label="a. Name of the treating doctor:" value={formData.dr_name || ''} />
           <UnderlineField label="b. Qualification:" value="MBBS, MD" />
           <UnderlineField label="c. Registration number with State code:" value={formData.dec_reg_no || formData.registrationNo || ''} />
        </div>

        <div className="grid grid-cols-2 gap-20 px-10 pt-24 mb-auto">
           <div className="flex flex-col items-center">
              <div className="w-full h-36 border-2 border-dashed border-black relative flex items-center justify-center bg-slate-50 rounded-2xl overflow-hidden">
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-60 mix-blend-multiply p-2" />}
              </div>
              <p className="text-[10px] font-black uppercase mt-3">Hospital Seal</p>
              <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-1">(Must include Hospital ID)</p>
           </div>
           <div className="flex flex-col items-center">
              <div className="w-full h-36 border-2 border-dashed border-black relative flex items-end justify-center bg-slate-50 rounded-2xl">
              </div>
              <p className="text-[10px] font-black uppercase mt-3">Patient/lnsured Name and Sign</p>
           </div>
        </div>

        <PageFooter page={4} />
      </div>

      {/* PAGE 5: Legal Declarations & Footer */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="text-center bg-slate-50 border-y border-black py-1 mb-6">
           <h2 className="text-[10px] font-black uppercase tracking-widest">DECLARATION BY THE PATIENT / REPRESENTATIVE</h2>
        </div>
        
        <div className="text-[8.5px] text-justify space-y-3 px-6 leading-relaxed text-slate-700 font-medium">
           <p>a. I agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer /T.P.A after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
           <p>b. Payment to hospital is governed by the terms and conditions of the policy. In case the lnsurer / TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
           <p>c. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer /T.P.A not governed by the terms and conditions of the policy will be paid by me.</p>
           <p>d. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the insurer / T.P.A</p>
           <p>e. I agree and understand that T.P.A is in no way warranting the service of the hospital & that the Insurer / TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
           <p>f. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
           <p>g. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer / TPA.</p>
           <p>h. "I/We authorize Insurance Company / TPA to contact me / us through mobile/email for any update on this claim"</p>
        </div>

        <div className="space-y-4 px-6 pt-8 border-t border-slate-100 mt-6">
           <UnderlineField label="a) Patient's / Insured's Name:" value={formData.p_name || ''} />
           <div className="grid grid-cols-2 gap-10 pt-4">
              <UnderlineField label="b) Contact number:" value={formData.p_contact || ''} />
              <UnderlineField label="c) e-mail Id (optional):" value={formData.p_email || ''} />
           </div>
           <div className="grid grid-cols-2 gap-10 pt-6">
              <div className="border-t border-black pt-1"><p className="text-[10px] font-black uppercase">d) Patient's / Insured's Signature:</p></div>
              <div className="flex gap-10">
                 <UnderlineField label="Date:" value={formatDate(new Date())} />
                 <UnderlineField label="Time:" value={new Date().toLocaleTimeString()} />
              </div>
           </div>
        </div>

        <div className="text-center bg-slate-50 border-y border-black py-1 mt-10 mb-6">
           <h2 className="text-[10px] font-black uppercase tracking-widest">HOSPITAL DECLARATION</h2>
        </div>
        
        <div className="text-[8.5px] text-justify space-y-2.5 px-6 leading-relaxed text-slate-700 font-medium mb-auto">
           <p>a. We have no objection to any authorized TPA / Insurance Company official verifying documents pertaining to hospitalization.</p>
           <p>b. All valid original documents duly countersigned by the insured / patient as per the checklist below will be sent to TPA/ lnsurance Company within 7 days of the patient’s discharge.</p>
           <p>c. We agree that TPA / Insurance Company will not be Iiable to make the payment in the event of any discrepancy between the facts in this form and discharge summary or other documents.</p>
           <p>d. The patient declaration has been signed by the patient or by his representative in our presence.</p>
           <p>e. We agree to provide clarifications for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications.</p>
           <p>f. We will abide by the terms and conditions agreed in the MOU.</p>
           <p>g. We confirm that no additional amount would be collected from the insured in excess of Agreed Package Rates except costs towards non-admissible amounts.</p>
           <p>h. We confirm that no recoveries would be made from the deposit amount collected from the lnsured except for costs towards non admissible amounts.</p>
           <p>i. In the event of unauthorized recovery of any additional amount from the Insured in excess of Agreed Package Rates, RGICL reserves the right to recover the same from us.</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-20 px-6 pb-6">
           <div className="flex flex-col items-center">
              <div className="w-full h-24 border border-black relative flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden">
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-60 mix-blend-multiply" />}
              </div>
              <p className="text-[9px] font-black uppercase mt-2">Hospital Seal</p>
           </div>
           <div className="flex flex-col items-center">
              <div className="w-full h-24 border border-black relative flex items-center justify-center bg-slate-50 rounded-xl">
                 {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-full max-w-full opacity-60 mix-blend-multiply" />}
              </div>
              <p className="text-[9px] font-black uppercase mt-2">Doctor's Signature</p>
           </div>
        </div>

        <div className="bg-slate-900 text-white p-6 -mx-10 -mb-10 text-center space-y-1.5 mt-10">
           <p className="text-[10px] font-black uppercase tracking-widest">HEALTH INDIA INSURANCE TPA SERVICES PVT. LTD.</p>
           <p className="text-[7.5px] font-bold text-slate-400 uppercase leading-tight">Neelkanth Corporate IT Park, 4th floor, 406-412, Kirol park, Vidyavihar (West)</p>
           <div className="flex justify-center items-center space-x-6 text-[7px] font-black text-slate-300 uppercase tracking-widest">
              <span>Website : www.healthindiatpa.com</span>
              <span>Email ID:- crm@healthindiatpa.com</span>
              <span>Contact Number:- 022-66867575</span>
           </div>
        </div>
      </div>

    </div>
  );
};

export default HealthIndiaTemplate;
