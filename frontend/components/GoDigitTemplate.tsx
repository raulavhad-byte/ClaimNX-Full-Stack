
import React from 'react';

interface GoDigitTemplateProps {
  formData: Record<string, any>;
}

const DigitLogo: React.FC = () => (
  <div className="flex items-center">
    <div className="flex items-baseline scale-125 origin-left">
      <span className="text-4xl font-black text-slate-800 tracking-tighter" style={{ fontFamily: 'Arial, sans-serif' }}>digit</span>
      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full ml-1 mb-1"></div>
    </div>
  </div>
);

const DateGrid: React.FC<{ value?: string; label?: string }> = ({ value, label }) => {
  const d = value ? new Date(value) : null;
  const day = d ? d.getDate().toString().padStart(2, '0') : '  ';
  const month = d ? (d.getMonth() + 1).toString().padStart(2, '0') : '  ';
  const year = d ? d.getFullYear().toString() : '    ';
  const chars = [...day.split(''), ...month.split(''), ...year.split('')];

  return (
    <div className="flex flex-col">
      {label && <span className="text-[7.5px] font-bold text-slate-500 uppercase mb-0.5">{label}</span>}
      <div className="flex space-x-0.5">
        {chars.map((char, i) => (
          <div key={i} className="w-3.5 h-4.5 border border-slate-400 flex items-center justify-center text-[9px] font-black bg-white">
            {char}
          </div>
        ))}
      </div>
      <div className="flex text-[5px] font-bold text-slate-400 mt-0.5">
        <span className="w-7 text-center">D D</span>
        <span className="w-7 text-center">M M</span>
        <span className="w-14 text-center">Y Y Y Y</span>
      </div>
    </div>
  );
};

const UnderlineField: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`flex items-end border-b border-slate-300 pb-0.5 ${className}`}>
    <span className="text-[9px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className="text-[10px] font-black text-black uppercase flex-1 truncate leading-none">{value}</span>
  </div>
);

const Checkbox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-3 h-3 border border-slate-600 flex items-center justify-center bg-white`}>
      {checked && <div className="w-2 h-2 bg-slate-800"></div>}
    </div>
    <span className="text-[9px] font-bold text-slate-800 uppercase">{label}</span>
  </div>
);

const GoDigitTemplate: React.FC<GoDigitTemplateProps> = ({ formData }) => {
  const footerInfo = (
    <div className="mt-auto pt-4 border-t border-yellow-400">
      <p className="text-[7.5px] font-medium text-slate-500 leading-tight">
        Go Digit General Insurance Limited, Atlantis, 95, 4th 'B' Cross Road, Koramangala Industrial Layout, 5th Block, Bengaluru-560095 <br/>
        CIN: U66010PN2016PLC167410 | Website: www.godigit.com | IRDAI Regn No: 158
      </p>
    </div>
  );

  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <DigitLogo />
          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">PRE AUTH REQUEST FORM</h1>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          <div className="space-y-1">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800">CASHLESS PRE AUTHORISATION FORM</h2>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase underline">Details of the hospital:</p>
            <UnderlineField label="a) Name of the Hospital:" value={formData.hosp_name || ''} />
            <UnderlineField label="b) Address:" value={formData.hosp_address || ''} />
            <div className="grid grid-cols-2 gap-8">
              <UnderlineField label="c) ROHINI ID:" value={formData.hosp_rohini_id || ''} />
              <UnderlineField label="d) Email ID:" value={formData.hosp_email || ''} />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase underline">To be filled by insured/patient:</p>
            <UnderlineField label="a) Name of the Patient:" value={formData.p_name || ''} />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-bold uppercase">b) Gender:</span>
                <Checkbox label="Male" checked={formData.p_gender === 'Male'} />
                <Checkbox label="Female" checked={formData.p_gender === 'Female'} />
                <Checkbox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
              </div>
              <UnderlineField label="c) Age:" value={String(formData.p_age_y || '')} className="w-24" />
              <DateGrid label="d) Date of Birth:" value={formData.p_dob} />
            </div>
            <div className="grid grid-cols-2 gap-8">
              <UnderlineField label="e) Contact number:" value={formData.p_contact || ''} />
              <UnderlineField label="f) Contact number of attending relative:" value={formData.p_relative_contact || ''} />
            </div>
            <UnderlineField label="g) Insured’ s Card ID number:" value={formData.p_card_id || ''} />
            <UnderlineField label="h) Policy number/Name of Corporate:" value={formData.p_policy_no || ''} />
            <UnderlineField label="i) Employee ID:" value={formData.p_employee_id || ''} />
            
            <div className="flex items-center gap-10">
              <span className="text-[9px] font-bold uppercase">j) Currently do you have any other Mediclaim/health insurance:</span>
              <Checkbox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <Checkbox label="No" checked={formData.p_other_insurance === 'No'} />
            </div>
            <div className="pl-6 space-y-3">
              <span className="text-[8px] font-bold uppercase italic text-slate-400">If yes:</span>
              <UnderlineField label="i. Company Name:" value={formData.p_other_insurer_name || ''} />
              <UnderlineField label="ii. Give Details:" value="" />
            </div>

            <div className="flex items-center gap-10">
              <span className="text-[9px] font-bold uppercase">k) Do you have a family physician:</span>
              <Checkbox label="Yes" checked={formData.p_family_physician === 'Yes'} />
              <Checkbox label="No" checked={formData.p_family_physician === 'No'} />
            </div>
            <UnderlineField label="l) Name of the family physician:" value={formData.p_family_physician_name || ''} />
            <UnderlineField label="m) Contact number, if any:" value={formData.p_family_physician_contact || ''} />
            <UnderlineField label="n) Current address of insured patient:" value={formData.p_address || ''} />
            <UnderlineField label="o) Occupation of insured patient:" value={formData.p_occupation || ''} />
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase underline">To be filled by treating doctor/hospital</p>
            <UnderlineField label="a) Name of the treating doctor:" value={formData.dr_name || ''} />
            <UnderlineField label="b) Contact number:" value={formData.dr_contact || ''} />
            <UnderlineField label="c) Nature of illness/disease with presenting complaint:" value={formData.m_illness || ''} />
            <UnderlineField label="d) Relevant critical findings:" value={formData.m_clinical_findings || ''} />
            <div className="flex items-start justify-between">
              <div className="flex items-end gap-2 flex-1">
                <span className="text-[9px] font-bold uppercase pb-0.5">e) Duration of the present ailment:</span>
                <span className="border-b border-slate-300 w-16 text-center font-black">{formData.m_duration || ''}</span>
                <span className="text-[8px] font-bold uppercase pb-0.5">Day(s)</span>
              </div>
              <DateGrid label="i) Date of first consultation" value={formData.m_first_cons_date} />
            </div>
            <UnderlineField label="ii) Past history of present ailment, if any" value="" />
          </div>
        </div>
        {footerInfo}
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <DigitLogo />
          <div className="text-right">
            <h1 className="text-xl font-black text-slate-800 tracking-tighter uppercase">PRE AUTH REQUEST FORM</h1>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          <UnderlineField label="f) Provisional diagnosis:" value={formData.m_prov_diag || ''} />
          <UnderlineField label="i) ICD-l0 code:" value={formData.m_icd_code || ''} className="w-1/2" />

          <div className="space-y-3">
            <p className="text-[9px] font-bold uppercase">g) Proposed line of treatment:</p>
            <div className="grid grid-cols-1 gap-2 pl-6">
              {[
                { l: "i) Medical Management", k: "Medical Management" },
                { l: "ii) Surgical Management", k: "Surgical Management" },
                { l: "iii) Intensive Care", k: "Intensive care" },
                { l: "iv) Investigation", k: "Investigation" },
                { l: "v) Non-allopathic treatment", k: "Non-allopathic" }
              ].map(item => (
                <div key={item.k} className="flex items-center justify-between max-w-[250px]">
                  <span className="text-[9px]">{item.l}</span>
                  <span className="text-[9px] font-black">( {formData.m_treatment_type === item.k ? '✓' : ' '} )</span>
                </div>
              ))}
            </div>
          </div>

          <UnderlineField label="h) If investigation/Medical Management, provide details:" value="" />
          <UnderlineField label="i) Route of drug administration:" value={formData.m_route_drug || ''} />
          <UnderlineField label="j) lf surgical, name of surgery:" value={formData.m_surgery_name || ''} />
          <UnderlineField label="i) ICD-l0 PCS code:" value="" className="w-1/2" />
          <UnderlineField label="k) If other treatment, provide details:" value="" />
          <UnderlineField label="l) How did the injury occur?" value="" />

          <div className="space-y-3 border border-slate-200 p-4 rounded-sm bg-slate-50/30">
            <p className="text-[9px] font-black uppercase underline">m) ln case of accident</p>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 pl-4">
              <div className="flex items-center gap-6">
                <span className="text-[9px] font-bold uppercase">i) Is it RTA:</span>
                <Checkbox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                <Checkbox label="No" checked={formData.m_is_rta === 'No'} />
              </div>
              <DateGrid label="ii) Date of Injury:" value={formData.m_rta_date} />
              <div className="flex items-center gap-6">
                <span className="text-[9px] font-bold uppercase">iii) Report to Police:</span>
                <Checkbox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                <Checkbox label="No" checked={formData.m_rta_police === 'No'} />
              </div>
              <UnderlineField label="iv) FIR No.:" value={formData.m_fir_no || ''} />
              <div className="col-span-2 flex items-center gap-10">
                <span className="text-[9px] font-bold uppercase">v) Injury/Disease caused due to substance abuse/alcohol consumption</span>
                <Checkbox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                <Checkbox label="No" checked={formData.m_abuse_alcohol === 'No'} />
              </div>
              <div className="col-span-2 flex items-center gap-10">
                <span className="text-[9px] font-bold uppercase">vi) Test conducted to establish this (if yes, attach report)</span>
                <Checkbox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                <Checkbox label="No" checked={formData.m_test_conducted === 'No'} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase">n) In case of maternity</span>
              <div className="flex border border-slate-800 bg-slate-50">
                <div className="px-1.5 h-5 flex items-center justify-center border-r border-slate-800 text-[9px] font-black">G: {formData.m_mat_g || '0'}</div>
                <div className="px-1.5 h-5 flex items-center justify-center border-r border-slate-800 text-[9px] font-black">P: {formData.m_mat_p || '0'}</div>
                <div className="px-1.5 h-5 flex items-center justify-center border-r border-slate-800 text-[9px] font-black">L: {formData.m_mat_l || '0'}</div>
                <div className="px-1.5 h-5 flex items-center justify-center text-[9px] font-black">A: {formData.m_mat_a || '0'}</div>
              </div>
            </div>
            <DateGrid label="i) Expected date of delivery:" value={formData.m_mat_edd} />
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase underline">Details of patient admitted</p>
            <div className="grid grid-cols-2 gap-8">
              <DateGrid label="a) Date of admission:" value={formData.adm_date} />
              <div className="flex items-start gap-4">
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-bold text-slate-500 uppercase mb-0.5">b) Time of admission:</span>
                  <div className="flex space-x-0.5">
                    {['H','H','M','M'].map((l, i) => (
                      <div key={i} className={`w-3.5 h-4.5 border border-slate-400 flex items-center justify-center text-[9px] font-black bg-white ${i === 1 ? 'mr-1' : ''}`}>
                        {formData.adm_time ? (i < 2 ? formData.adm_time.split(':')[0][i] : formData.adm_time.split(':')[1][i-2]) : ' '}
                      </div>
                    ))}
                  </div>
                  <div className="flex text-[5px] font-bold text-slate-400 mt-0.5 uppercase">
                    <span className="w-7 text-center">H H</span>
                    <span className="w-7 text-center">M M</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-10">
              <span className="text-[9px] font-bold uppercase">c) Is this an emergency/planned hospitalization event</span>
              <Checkbox label="Emergency" checked={false} />
              <Checkbox label="Planned" checked={true} />
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase">d) Mandatory past history of any chronic illness If yes, since month/year:</p>
              <div className="grid grid-cols-1 gap-1.5 pl-6">
                {[
                  "i) Diabetes:", "ii) Heart disease:", "iii) Hypertension:", "iv) Hyperlipidemias:",
                  "v) Osteoarthritis:", "vi) Asthma/COPD/Bronchitis:", "vii) Cancer:", "viii) Alcohol/Drug abuse:"
                ].map((ill, i) => (
                   <UnderlineField key={i} label={ill} value={String(formData[`m_chronic_${ill.split(' ')[1].toLowerCase().replace('/', '_')}_since`] || '')} className="max-w-[400px]" />
                ))}
              </div>
            </div>
          </div>
        </div>
        {footerInfo}
      </div>

      {/* PAGE 3 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <DigitLogo />
          <div className="text-right">
            <h1 className="text-xl font-black text-slate-800 tracking-tighter uppercase">PRE AUTH REQUEST FORM</h1>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          <div className="grid grid-cols-1 gap-1.5 pl-6">
             <UnderlineField label="ix) Any HIV/ STD Related ailment:" value="" />
             <UnderlineField label="x) Any other ailment, give details:" value="" />
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div className="flex items-end gap-2">
              <span className="text-[9px] font-bold uppercase pb-0.5">e) Expected number of days/stay in hospital</span>
              <span className="border-b border-slate-300 w-16 text-center font-black">{formData.adm_stay_days || ''}</span>
              <span className="text-[8px] font-bold uppercase pb-0.5">Day(s)</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[9px] font-bold uppercase pb-0.5">f) Days in ICU</span>
              <span className="border-b border-slate-300 w-16 text-center font-black"></span>
              <span className="text-[8px] font-bold uppercase pb-0.5">Day(s)</span>
            </div>
          </div>

          <UnderlineField label="g) Room Type:" value={formData.adm_room_type || ''} />
          
          <div className="space-y-1 pt-2">
            {[
              { label: "h) Per day room rent+nursing and service charges+ patient’s diet:", id: "cost_room_rent" },
              { label: "i) Expected cost of diagnosis + investigation:", id: "cost_investigation" },
              { label: "j) ICU charges:", id: "cost_icu" },
              { label: "k) OT charges:", id: "cost_ot" },
              { label: "l) Surgeon's Professional Fees + Anesthetist Fees + Consultation Charges:", id: "cost_prof_fees" },
              { label: "m) Medicines + Consumables + Cost of Implants (if applicable, please specify)", id: "cost_medicines" },
              { label: "n) Other hospital expenses, if any:", id: "cost_other" },
              { label: "o) All-inclusive package charges if any applicable:", id: "cost_package" },
              { label: "p) Sum total expected cost of hospitalization:", id: "adm_total_cost", isBold: true }
            ].map(item => (
              <div key={item.id} className={`flex items-end border-b border-slate-100 pb-0.5 ${item.isBold ? 'border-slate-800' : ''}`}>
                 <span className={`text-[9px] font-bold text-slate-700 uppercase ${item.isBold ? 'font-black text-black' : ''}`}>{item.label}</span>
                 <div className="flex-1"></div>
                 <span className="text-[10px] font-black text-black w-24 text-right">Rs. {Number(formData[item.id] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="space-y-6 pt-10">
            <h3 className="text-[11px] font-black uppercase underline">DECLARATION (Please read very carefully)</h3>
            <p className="text-[9px] font-medium leading-relaxed">We confirm having read, understood, and agreed to the Declarations within this form</p>
            <UnderlineField label="Name of the treating doctor" value={formData.dr_name || ''} />
            <UnderlineField label="Qualification" value="MBBS, MD" />
            <UnderlineField label="Registration number with State code" value={formData.registrationNo || ''} />
            
            <div className="grid grid-cols-2 gap-12 pt-4">
              <div className="flex flex-col items-center">
                <div className="w-full h-32 border border-slate-800 flex items-center justify-center relative bg-slate-50/20">
                   {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
                </div>
                <p className="text-[8px] font-bold uppercase mt-1">Hospital Seal (Must include Hospital ID)</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-full h-32 border border-slate-800 flex items-center justify-center bg-slate-50/20"></div>
                <p className="text-[8px] font-bold uppercase mt-1">Patient/lnsured Name and Sign</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-10">
            <h3 className="text-[11px] font-black uppercase underline">Declaration by the patient /representative</h3>
            <div className="space-y-2 text-[8px] text-justify leading-tight text-slate-600">
               <p>a) I agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer/TPA aftermy discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
               <p>b) Payment to hospital is governed by the terms and conditions of the policy. In case the lnsurer/TPA is not liable to settle thehospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
               <p>c) All non-medical expenses, and expenses not relevant to the current hospitalization; and the amounts over & above the limit authorized by the Insurer/TPA not governed by the terms and conditions of the policy will be paid by me.</p>
               <p>d) I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found tobe false or incorrect, I forfeit my claim and agree to indemnify the Insurer/TPA.</p>
               <p>e) I agree and understand that TPA is in no way warranting the service of the hospital & that the Insurer/TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
            </div>
          </div>
        </div>
        {footerInfo}
      </div>

      {/* PAGE 4 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <DigitLogo />
          <div className="text-right">
            <h1 className="text-xl font-black text-slate-800 tracking-tighter uppercase">PRE AUTH REQUEST FORM</h1>
          </div>
        </div>

        <div className="space-y-6 flex-1 text-slate-700">
           <div className="space-y-3 text-[8px] text-justify leading-tight">
              <p>f) I hereby warrant the truth of the foregoing particulars in every respect, and I agree that if I have made or shall make anyfalse or untrue statements, suppression, or concealment with respect to the claim, my right to claim reimbursement of thesaid expenses shall be absolutely forfeited.</p>
              <p>g) I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer/TPA.</p>
              <p>h) “I/We authorize the Insurance Company/TPA to contact me/us through mobile/email for any update on this claim?”.</p>
           </div>

           <div className="space-y-4 pt-4">
              <UnderlineField label="a) Patient's/Insured's Name:" value={formData.p_name || ''} />
              <div className="grid grid-cols-2 gap-12">
                 <UnderlineField label="b) Contact number:" value={formData.p_contact || ''} />
                 <UnderlineField label="c) Email ID (optional):" value={formData.p_email || ''} />
              </div>
              <div className="h-20 border-b border-slate-300 relative flex items-end">
                 <span className="text-[9px] font-bold uppercase pb-1 mr-4">d) Patient's/Insured's Signature:</span>
              </div>
              <div className="grid grid-cols-2 gap-8">
                 <DateGrid label="Date:" value={new Date().toISOString()} />
                 <div className="flex flex-col">
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase mb-0.5">Time:</span>
                    <div className="flex space-x-0.5">
                       {['H','H','M','M'].map((l, i) => (
                         <div key={i} className={`w-3.5 h-4.5 border border-slate-400 flex items-center justify-center text-[9px] font-black bg-white ${i === 1 ? 'mr-1' : ''}`}>
                           {new Date().getHours().toString().padStart(2,'0').split('')[i] || new Date().getMinutes().toString().padStart(2,'0').split('')[i-2]}
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-4 pt-10">
              <h3 className="text-[11px] font-black uppercase underline tracking-widest">Hospital declaration</h3>
              <div className="space-y-2 text-[8px] text-justify leading-tight">
                 <p>a) We have no objection to any authorized TPA/Insurance Company official verifying documents pertaining to hospitalization.</p>
                 <p>b) All valid original documents duly countersigned by the insured/patient as per the checklist below will be sent to TPA/lnsurance Company within 7 days of the patient's discharge.</p>
                 <p>c) We agree that TPA/Insurance Company will not be liable to make the payment in the event of any discrepancybetween the facts in this form and the discharge summary or other documents.</p>
                 <p>d) The patient's declaration has been signed by the patient or by his representative in our presence.</p>
                 <p>e) We agree to provide clarifications for the queries raised regarding this hospitalization and we take sole responsibilityfor any delay in offering clarifications.</p>
                 <p>f) We will abide by the terms and conditions agreed upon or agreed to MOU.</p>
                 <p>g) We confirm that no additional amount would be collected from the insured in excess of Agreed Package Rates, except costs towards non-admissible amounts (including additional charges due to opting for higher room rent thaneligibility/choosing separate line of treatment which is not envisaged/considered in the package).</p>
                 <p>h) We confirm that no recoveries would be made from the deposit amount collected from the insured, except for coststoward non-admissible amounts (including additional charges due to opting for higher room rent than eligibility/ choosing separate line of treatment which is not envisaged/considered in the package).</p>
                 <p>i) In the event of unauthorized recovery of any additional amount from the Insured in excess of Agreed Package Rates, the authorized TPA/Insurance Company reserves the right to recover the same from us (the Network Provider) and/ortake necessary action, as provided under the MOU or applicable laws.</p>
              </div>
           </div>

           <div className="flex justify-between items-end pt-12">
              <div className="flex flex-col items-center">
                 <div className="w-48 h-20 border-b border-slate-800 flex items-center justify-center relative bg-slate-50/10">
                    {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
                 </div>
                 <p className="text-[9px] font-black uppercase mt-2">Hospital Seal</p>
              </div>
              <div className="flex flex-col items-center">
                 <div className="w-48 h-20 border-b border-slate-800 flex items-center justify-center relative bg-slate-50/10">
                    {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
                 </div>
                 <p className="text-[9px] font-black uppercase mt-2">Doctor’s Signature</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8 pt-6">
              <DateGrid label="Date:" value={new Date().toISOString()} />
              <div className="flex flex-col">
                 <span className="text-[7.5px] font-bold text-slate-500 uppercase mb-0.5">Time:</span>
                 <div className="flex space-x-0.5">
                    {['H','H','M','M'].map((l, i) => (
                      <div key={i} className={`w-3.5 h-4.5 border border-slate-400 flex items-center justify-center text-[9px] font-black bg-white ${i === 1 ? 'mr-1' : ''}`}>
                         {new Date().getHours().toString().padStart(2,'0').split('')[i] || new Date().getMinutes().toString().padStart(2,'0').split('')[i-2]}
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
        {footerInfo}
      </div>

    </div>
  );
};

export default GoDigitTemplate;
