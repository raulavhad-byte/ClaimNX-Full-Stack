
import React from 'react';

interface ClaimFormTemplateProps {
  formData: Record<string, any>;
}

const ClaimFormTemplate: React.FC<ClaimFormTemplateProps> = ({ formData }) => {
  const Checkbox = ({ checked, label }: { checked: boolean, label: string }) => (
    <div className="flex items-center space-x-1 shrink-0">
      <div className={`w-[11px] h-[11px] border border-[#000080] flex items-center justify-center text-[7px] ${checked ? 'bg-[#000080] text-white' : 'bg-white'}`}>
        {checked && '✓'}
      </div>
      <span className={`text-[9px] whitespace-nowrap font-bold ${checked ? 'text-[#000080]' : 'text-slate-800'}`}>{label}</span>
    </div>
  );

  const PDF_CHRONIC_ORDER = [
    { label: "Diabetes", id: "diabetes" },
    { label: "Heart Disease", id: "heart_disease" },
    { label: "Hypertension", id: "hypertension" },
    { label: "Hyperlipidemias", id: "hyperlipidemia" },
    { label: "Osteoarthritis", id: "osteoarthritis" },
    { label: "Asthma / COPD / Bronchitis", id: "asthma_copd" },
    { label: "Cancer", id: "cancer" },
    { label: "Alcohol or drug abuse", id: "alcohol_abuse" },
    { label: "Any HIV or STD Related ailment", id: "hiv_std" },
    { label: "Cerebrovascular Accident(Stroke)", id: "stroke" },
    { label: "Liver disease", id: "liver_disease" },
    { label: "Kidney disease", id: "kidney_disease" }
  ];

  const Header = () => (
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center text-[#000080] shrink-0">
         <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current" >
            <path d="M50 5l12.5 31.5H95L66.5 54.5 77.5 88 50 67.5 22.5 88l11-33.5L5 36.5h32.5z" />
         </svg>
         <div className="ml-1 flex flex-col">
            <span className="text-xl font-black tracking-tighter leading-none">STAR</span>
            <span className="text-[5px] font-bold uppercase tracking-widest">Personal & Caring</span>
         </div>
         <div className="h-8 w-[1px] bg-slate-300 mx-2"></div>
         <div className="flex flex-col justify-center">
            <span className="text-[10px] font-bold leading-tight">Health Insurance</span>
         </div>
      </div>
      <div className="text-right text-[6px] leading-tight text-slate-800 max-w-[60%]">
        <h1 className="text-[10px] font-black uppercase text-[#000080] mb-0.5">STAR HEALTH AND ALLIED INSURANCE COMPANY LIMITED</h1>
        <p>Regd. & Corporate Office: 1, New Tank Street, Valluvar Kottam High Road, Nungambakkam, Chennai - 600 034.</p>
        <p>Corporate Office - Claims Dept.: No.15, Balaji Complex, Whites Lane, Royapettah, Chennai - 600 014.</p>
        <p>CIN: U66010TN2005PLC056649 | Email: cashless.network@starhealth.in | IRDAI Regn. No.: 129</p>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 p-4 lg:p-8 space-y-12 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1: ADMISSION & PATIENT DETAILS */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-tight overflow-hidden print:min-h-[297mm]">
        <Header />
        <div className="text-center bg-[#000080] text-white py-2 mb-2 font-bold uppercase text-[12px] tracking-widest shadow-sm">
          PART 1: ADMISSION & PATIENT IDENTITY
        </div>
        <div className="text-center font-bold text-[9px] mb-4 border-b border-slate-200 pb-1 text-[#000080] uppercase tracking-widest">
          Request for Cashless Hospitalisation (IRDAI PART-C)
        </div>

        <div className="mb-6">
          <h3 className="text-[10px] font-black underline mb-3 italic text-[#000080] uppercase">Section A: Institutional Registry</h3>
          <div className="space-y-2 text-[9px]">
            <div className="flex items-end"><span className="w-48 text-slate-600">a. Insurance Company / TPA Name:</span><span className="border-b border-slate-200 flex-1 font-bold uppercase text-blue-700">{formData['tpa_provider'] || 'STAR HEALTH AND ALLIED INSURANCE COMPANY LIMITED'}</span></div>
            <div className="flex items-end"><span className="w-48 text-slate-600">b. Name of Hospital:</span><span className="border-b border-slate-200 flex-1 font-bold uppercase text-blue-700">{formData['hosp_name']}</span></div>
            <div className="flex items-end pl-4"><span className="w-44 text-slate-500">i. Rohini ID:</span><span className="border-b border-slate-200 flex-1 font-mono font-black text-blue-700">{formData['hosp_rohini_id']}</span></div>
            <div className="flex items-end pl-4"><span className="w-44 text-slate-500">ii. Official Email:</span><span className="border-b border-slate-200 flex-1 font-bold text-blue-700">{formData['hosp_email']}</span></div>
            <div className="flex items-end pl-4"><span className="w-44 text-slate-500">iii. Hospital Address:</span><span className="border-b border-slate-200 flex-1 font-bold text-blue-700">{formData['hosp_address']}</span></div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-[10px] font-black text-center border-y border-[#000080] text-[#000080] py-1.5 uppercase mb-4 bg-slate-50/50">Section B: Insured Demographic Registry</h3>
          <div className="space-y-3 text-[9px]">
            <div className="flex items-end"><span className="w-48 text-slate-600">1. Full Name of Patient:</span><span className="border-b border-slate-200 flex-1 font-black uppercase text-blue-700">{formData['p_name']}</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center"><span className="w-24 text-slate-600">2. Gender:</span><div className="flex space-x-4"><Checkbox label="Male" checked={formData['p_gender'] === 'Male'} /><Checkbox label="Female" checked={formData['p_gender'] === 'Female'} /></div></div>
              <div className="flex items-end"><span className="w-24 text-slate-600">3. Age (Years):</span><span className="border-b border-slate-200 w-24 text-center font-black text-blue-700">{formData['p_age_y']}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-end"><span className="w-48 text-slate-600">4. Date of Birth:</span><span className="border-b border-slate-200 flex-1 text-center font-black text-blue-700">{formData['p_dob']}</span></div>
              <div className="flex items-end"><span className="w-48 text-slate-600">5. Contact Number:</span><span className="border-b border-slate-200 flex-1 font-mono font-black text-blue-700">{formData['p_contact']}</span></div>
            </div>
            <div className="flex items-end"><span className="w-48 text-slate-600">6. Policy Number / Corporate ID:</span><span className="border-b border-slate-200 flex-1 font-black text-blue-700">{formData['p_policy_no']}</span></div>
            <div className="flex items-end"><span className="w-48 text-slate-600">7. Payer Member Card ID:</span><span className="border-b border-slate-200 flex-1 font-black text-blue-700">{formData['p_card_id']}</span></div>
            <div className="flex items-end"><span className="w-48 text-slate-600">8. Residential Address:</span><span className="border-b border-slate-200 flex-1 font-bold text-blue-700 text-[8px] uppercase">{formData['p_address']}</span></div>
            <div className="flex items-center"><span className="w-48 text-slate-600">9. Concurrent Insurance Cover:</span><div className="flex space-x-6"><Checkbox label="Yes" checked={formData['p_other_insurance'] === 'Yes'} /><Checkbox label="No" checked={formData['p_other_insurance'] === 'No'} /></div></div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-10">
          <div className="text-center border-t border-slate-300 pt-2"><span className="text-[8px] font-bold uppercase text-slate-400">Date & Time of Request</span><p className="text-[9px] font-black text-blue-700">{new Date().toLocaleString()}</p></div>
          <div className="text-center border-t border-slate-300 pt-2"><span className="text-[8px] font-bold uppercase text-slate-400">Signature of Insured / Patient</span><div className="h-4"></div></div>
        </div>
      </div>

      {/* PAGE 2: CLINICAL REGISTRY */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-tight overflow-hidden print:min-h-[297mm] print:break-before-page">
        <Header />
        <div className="text-center bg-[#000080] text-white py-2 mb-2 font-bold uppercase text-[12px] tracking-widest shadow-sm">
          PART 2: CLINICAL REGISTRY
        </div>
        <div className="text-center font-bold text-[9px] mb-4 border-b border-slate-200 pb-1 text-[#000080] uppercase tracking-widest">
          Medical Justification & Case Narrative
        </div>

        <div className="mb-6">
          <h3 className="text-[10px] font-black underline mb-3 italic text-[#000080] uppercase">Section C: Attending Physician Registry</h3>
          <div className="space-y-3 text-[9px]">
            <div className="flex items-end"><span className="w-48 text-slate-600">a. Name of Treating Doctor:</span><span className="border-b border-slate-200 flex-1 font-black uppercase text-blue-700">{formData['dr_name']}</span></div>
            <div className="flex items-end"><span className="w-48 text-slate-600">b. Qualification / Registration No:</span><span className="border-b border-slate-200 flex-1 font-bold text-blue-700">{formData['dec_dr_qual']} / {formData['dec_reg_no']}</span></div>
            <div className="flex items-end"><span className="w-48 text-slate-600">c. Direct Contact Number:</span><span className="border-b border-slate-200 flex-1 font-mono font-black text-blue-700">{formData['dr_contact']}</span></div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-[10px] font-black text-center border-y border-[#000080] text-[#000080] py-1.5 uppercase mb-4 bg-slate-50/50">Section D: Case Narrative & Diagnosis</h3>
          <div className="space-y-4 text-[9px]">
            <div className="flex flex-col space-y-1"><span className="text-slate-600 font-bold uppercase text-[8px]">1. Nature of Illness / Presenting Complaints:</span><div className="border border-slate-200 p-2 rounded-lg bg-slate-50 min-h-[50px] font-bold text-blue-700 leading-normal">{formData['m_illness']}</div></div>
            <div className="flex flex-col space-y-1"><span className="text-slate-600 font-bold uppercase text-[8px]">2. Relevant Clinical Findings / Investigations:</span><div className="border border-slate-200 p-2 rounded-lg bg-slate-50 min-h-[50px] font-bold text-blue-700 leading-normal">{formData['m_clinical_findings']}</div></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-end"><span className="w-32 text-slate-600">3. ICD-10 Code:</span><span className="border-b border-slate-200 flex-1 font-black text-blue-700">{formData['m_icd_code']}</span></div>
              <div className="flex items-end"><span className="w-32 text-slate-600">4. Ailment Duration:</span><span className="border-b border-slate-200 flex-1 font-black text-blue-700">{formData['m_duration']} Days</span></div>
            </div>
            <div className="flex flex-col space-y-1"><span className="text-slate-600 font-bold uppercase text-[8px]">5. Provisional Diagnosis:</span><div className="border border-slate-200 p-2 rounded-lg bg-slate-50 min-h-[40px] font-black text-blue-700 leading-normal uppercase">{formData['m_prov_diag']}</div></div>
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <span className="text-slate-600 font-bold uppercase text-[8px]">6. Proposed Line of Treatment:</span>
              <div className="grid grid-cols-2 gap-4 pl-4">
                <Checkbox label="Medical Management" checked={formData['m_treatment_type'] === 'Medical Management'} />
                <Checkbox label="Surgical Management" checked={formData['m_treatment_type'] === 'Surgical Management'} />
                <Checkbox label="Intensive Care" checked={formData['m_treatment_type'] === 'Intensive care'} />
                <Checkbox label="Investigation" checked={formData['m_treatment_type'] === 'Investigation'} />
              </div>
            </div>
            {formData['m_treatment_type'] === 'Surgical Management' && (
              <div className="flex items-end"><span className="w-48 text-slate-600 font-bold">7. Name of Surgery / Grade:</span><span className="border-b border-slate-200 flex-1 font-black text-blue-700">{formData['m_surgery_name']} ({formData['m_surgery_grade']})</span></div>
            )}
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between items-end gap-10">
             <div className="flex-1 flex flex-col items-center">
                <div className="w-40 h-24 border-2 border-dashed border-[#000080] rounded-xl flex items-center justify-center relative bg-slate-50/50 mb-2">
                   {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full p-2 opacity-80 mix-blend-multiply" />}
                </div>
                <span className="text-[7px] font-black uppercase text-[#000080] tracking-widest">Digital Hospital Seal</span>
             </div>
             <div className="flex-1 flex flex-col items-center">
                <div className="w-40 h-24 border-2 border-dashed border-[#000080] rounded-xl flex items-center justify-center relative bg-slate-50/50 mb-2">
                   {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-full max-w-full p-2 opacity-80 mix-blend-multiply" />}
                </div>
                <span className="text-[7px] font-black uppercase text-[#000080] tracking-widest">Physician Digital Signature</span>
             </div>
          </div>
        </div>
      </div>

      {/* PAGE 3: ADMISSION LOGISTICS & FINANCE */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page">
        <Header />
        <div className="text-center bg-[#000080] text-white py-2 mb-2 font-bold uppercase text-[12px] tracking-widest shadow-sm">
          PART 3: ADMISSION LOGISTICS & ESTIMATE
        </div>
        <div className="text-center font-bold text-[9px] mb-4 border-b border-slate-200 pb-1 text-[#000080] uppercase tracking-widest">
          Financial Protocol & Stay Logistics
        </div>

        <div className="mb-6">
          <h3 className="text-[10px] font-black underline mb-3 italic text-[#000080] uppercase">Section E: Stay Protocol</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[9px]">
            <div className="flex items-end"><span className="w-32 text-slate-600">1. Date of Admission:</span><span className="border-b border-slate-200 flex-1 font-black text-blue-700">{formData['adm_date']}</span></div>
            <div className="flex items-end"><span className="w-32 text-slate-600">2. Time of Admission:</span><span className="border-b border-slate-200 flex-1 font-mono font-black text-blue-700">{formData['adm_time']}</span></div>
            <div className="flex items-center col-span-2 gap-6">
                 <span className="w-32 text-slate-600">3. Is this an emergency or planned event?</span>
                 <Checkbox label="Emergency" checked={formData.adm_type === 'Emergency'} />
                 <Checkbox label="Planned" checked={formData.adm_type === 'Planned'} />
            </div>
            <div className="flex items-end"><span className="w-32 text-slate-600">4. Expected Stay (Days):</span><span className="border-b border-slate-200 flex-1 font-black text-blue-700">{formData['adm_stay_days']} Days</span></div>
            <div className="flex items-end"><span className="w-32 text-slate-600">5. Expected Discharge:</span><span className="border-b border-slate-200 flex-1 font-black text-blue-700">{formData['adm_exp_discharge']}</span></div>
            <div className="flex items-end col-span-2"><span className="w-32 text-slate-600">6. Room Category:</span><span className="border-b border-slate-200 flex-1 font-black uppercase text-blue-700">{formData['adm_room_type']}</span></div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-[10px] font-black text-center border-y border-[#000080] text-[#000080] py-1.5 uppercase mb-4 bg-slate-50/50">Section F: Chronic History Registry</h3>
          <div className="grid grid-cols-2 gap-x-10 gap-y-1.5 text-[8px]">
             {PDF_CHRONIC_ORDER.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                   <div className="flex items-center space-x-2">
                      <span className="w-4 text-slate-300 font-bold">{i+1}.</span>
                      <span className="font-bold text-slate-700">{item.label}</span>
                   </div>
                   <span className={`font-black uppercase text-[7px] ${formData[`m_chronic_${item.id}_status`] === 'Yes' ? 'text-rose-600' : 'text-slate-300'}`}>
                      {formData[`m_chronic_${item.id}_status`] === 'Yes' ? `YES (SINCE: ${formData[`m_chronic_${item.id}_since`]})` : 'NO'}
                   </span>
                </div>
             ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-[10px] font-black underline mb-3 italic text-[#000080] uppercase">Section G: Financial Assessment</h3>
          <div className="border border-[#000080]/20 rounded-2xl overflow-hidden shadow-sm">
             <div className="bg-slate-50 px-4 py-2 border-b border-[#000080]/10 flex justify-between text-[8px] font-black uppercase tracking-widest text-[#000080]">
                <span>Cost Head Description</span>
                <span>Value (INR)</span>
             </div>
             <div className="p-4 space-y-2 text-[9px]">
                {[
                  { label: "Room Rent / Nursing / Diet Charges", id: 'cost_room_rent' },
                  { label: "ICU / ICCU Facility Charges", id: 'cost_icu' },
                  { label: "OT & Surgery Operating Charges", id: 'cost_ot' },
                  { label: "Investigation & Diagnostics Registry", id: 'cost_investigation' },
                  { label: "Professional Fees (Surgeon / Consultant)", id: 'cost_prof_fees' },
                  { label: "Medicines / Consumables / Implants", id: 'cost_medicines' },
                  { label: "Other Administrative / Hospital Expenses", id: 'cost_other' },
                ].map(item => (
                   <div key={item.id} className="flex justify-between items-center border-b border-slate-50 pb-1">
                      <span className="text-slate-600 font-bold">{item.label}</span>
                      <span className="font-black text-blue-700">₹ {Number(formData[item.id] || 0).toLocaleString()}</span>
                   </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t-2 border-[#000080] mt-2">
                   <span className="text-[#000080] font-black uppercase text-[10px]">Aggregated Expected Cost</span>
                   <span className="text-[14px] font-black text-blue-700">₹ {Number(formData['adm_total_cost'] || 0).toLocaleString()}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="mt-12 p-4 bg-[#000080]/5 rounded-xl border border-dashed border-[#000080]/20 text-[7px] text-slate-500 leading-relaxed text-justify">
           <p className="font-black text-[#000080] mb-1 uppercase">Institutional Declaration:</p>
           We hereby declare that the clinical narrative and estimated cost structure provided above are as per the institutional tariff and medically necessary for the patient's recovery. The hospital assumes responsibility for the integrity of the data uploaded via the ClaimNX Digital Hub.
        </div>
      </div>

    </div>
  );
};

export default ClaimFormTemplate;
