
import React from 'react';
import { formatDate } from '../utils';

interface MedsaveTemplateProps {
  formData: Record<string, any>;
}

const UnderlineField: React.FC<{ label: string; value: string; className?: string; boldValue?: boolean; subLabel?: string }> = ({ label, value, className = "", boldValue = true, subLabel }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8.5px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className={`text-[9.5px] uppercase flex-1 truncate leading-none ${boldValue ? 'font-black text-[#00338d]' : 'font-medium text-[#00338d]'}`}>{value}</span>
    {subLabel && <span className="text-[7.5px] font-bold text-slate-500 whitespace-nowrap ml-2">{subLabel}</span>}
  </div>
);

const TickBox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    <span className="text-[8.5px] font-bold text-black uppercase leading-none">{label}</span>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center py-1 border-y border-black my-2 bg-slate-50/50">
    <h3 className="text-[10px] font-black uppercase tracking-[0.1em]">{children}</h3>
  </div>
);

const MedsaveLogo: React.FC = () => (
  <div className="flex flex-col items-center shrink-0">
    <div className="relative">
      <div className="w-24 h-12 rounded-[50%] border-[2.5px] border-[#b31920] flex items-center justify-center relative">
         <span className="text-xl font-black text-[#b31920] tracking-tighter italic" style={{ fontFamily: 'serif' }}>MedSave</span>
      </div>
      <div className="absolute -bottom-1 right-1 bg-white px-1">
         <span className="text-[7px] font-black text-[#b31920] tracking-[0.2em] uppercase">INDIA</span>
      </div>
    </div>
  </div>
);

const PageFooter: React.FC<{ page: number }> = ({ page }) => (
  <div className="mt-auto pt-4 flex justify-end text-[8px] font-black text-slate-300 uppercase tracking-widest border-t border-slate-50">
     {page} | P a g e
  </div>
);

const MedsaveTemplate: React.FC<MedsaveTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-200 p-4 lg:p-12 space-y-12 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1: Registry & Patient Details */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <div className="flex justify-end mb-6">
           <MedsaveLogo />
        </div>

        <div className="text-center mb-6">
           <h1 className="text-[12px] font-black uppercase underline decoration-2 underline-offset-4">REQUEST FOR CASHLESS HOSPITALISATION FOR HEALTH INSURANCE</h1>
           <h2 className="text-[12px] font-black uppercase mt-1">POLICY PART — C</h2>
           <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">(TO BE FILLED IN BLOCK LETTERS)</p>
        </div>

        <p className="text-[9px] font-black uppercase underline mb-4">DETAILS OF THE THIRD PARTY ADMINISTRATOR/INSURER/HOSPITAL</p>
        
        <div className="space-y-4 mb-6">
           <UnderlineField label="a. Name of TPA/insurance Company:" value={formData.tpa_provider || 'Medsave Health Insurance TPA Limited'} />
           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="b. Toll free phone number:" value="1800-XXX-XXXX" />
              <UnderlineField label="c. Toll free fax:" value="" />
           </div>
           <UnderlineField label="d. Name of Hospital:" value={formData.hosp_name || ''} />
           <div className="pl-8 space-y-3 mt-2">
              <UnderlineField label="i. Address:" value={formData.hosp_address || ''} />
              <div className="grid grid-cols-2 gap-10">
                <UnderlineField label="ii. Rohini ID:" value={formData.hosp_rohini_id || ''} />
                <UnderlineField label="iii. e-mail id:" value={formData.hosp_email || ''} />
              </div>
           </div>
        </div>

        <SectionTitle>TO BE FILLED BY INSURED/PATIENT</SectionTitle>
        
        <div className="space-y-4 mb-4">
           <UnderlineField label="A. Name of the Patient:" value={formData.p_name || ''} />
           <div className="flex items-center space-x-10 mt-1">
              <span className="text-[9px] font-bold uppercase">B. Gender:</span>
              <div className="flex space-x-4">
                <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                <TickBox label="Female" checked={formData.p_gender === 'Female'} />
                <TickBox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-x-12">
              <UnderlineField label="C. Age:" value={`${formData.p_age_y || ''} (Years) / (Month)`} />
              <UnderlineField label="D. Date of Birth:" value={formData.p_dob ? formatDate(formData.p_dob) : ''} subLabel="(DD/MM/YYYY)" />
           </div>
           <div className="grid grid-cols-2 gap-x-12">
              <UnderlineField label="E. Contact number:" value={formData.p_contact || ''} />
              <UnderlineField label="F. Contact number of attending Relative:" value={formData.p_relative_contact || ''} />
           </div>
           <UnderlineField label="G. Insured Card ID number:" value={formData.p_card_id || ''} />
           <UnderlineField label="H. Policy number/Name of Corporate:" value={formData.p_policy_no || ''} />
           <UnderlineField label="I. Employee ID:" value={formData.p_employee_id || ''} />

           <div className="flex items-center space-x-8 mt-2">
              <span className="text-[8.5px] font-bold uppercase">J. Currently do you have any other med claim /health insurance:</span>
              <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
           </div>
           <div className="pl-8 space-y-2 mt-1">
              <UnderlineField label="i. Company Name:" value={formData.p_other_insurer_name || ''} />
              <UnderlineField label="ii. Give Details:" value="" />
           </div>

           <div className="flex items-center space-x-12 mt-2">
              <span className="text-[8.5px] font-bold uppercase">K: Do you have a family Physician:</span>
              <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
              <TickBox label="No" checked={formData.p_family_physician === 'No'} />
           </div>
           <UnderlineField label="L: Name of the Family Physician:" value={formData.p_family_physician_name || ''} />
           <UnderlineField label="M: Contact number, if any:" value={formData.p_family_physician_contact || ''} />
           <UnderlineField label="N: Current Address of Insured Patient:" value={formData.p_address || ''} />
           <UnderlineField label="O: Occupation of Insured Patient:" value={formData.p_occupation || ''} />
           
           <p className="text-[8px] font-black text-center mt-6 uppercase text-slate-400 tracking-widest">(PLEASE COMPLETE DECLARATION OF THIS FORM)</p>
        </div>

        <SectionTitle>TO BE FILLED BY TREATING DOCTOR/HOSPITAL</SectionTitle>
        <div className="space-y-4">
           <UnderlineField label="A: Name of the treating Doctor:" value={formData.dr_name || ''} />
           <UnderlineField label="B: Contact number:" value={formData.dr_contact || ''} />
        </div>

        <PageFooter page={1} />
      </div>

      {/* PAGE 2: Clinical Details */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="flex justify-end mb-6">
           <MedsaveLogo />
        </div>

        <div className="space-y-4 flex-1">
           <UnderlineField label="C: Nature of Illness/Disease with presenting complaint:" value={formData.m_illness || ''} />
           <UnderlineField label="D: Relevant Critical Findings:" value={formData.m_clinical_findings || ''} />
           <div className="flex items-end gap-10">
              <UnderlineField label="E: Duration of the present ailment" value={String(formData.m_duration || '')} className="flex-1" />
              <span className="text-[8.5px] font-bold pb-1">Days</span>
           </div>
           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="i. Date of First consultation:" value={formData.m_first_cons_date ? formatDate(formData.m_first_cons_date) : ''} subLabel="(DD/MM/YYYY)" />
           </div>
           <UnderlineField label="ii. Past history of present ailment, if any" value="" />
           <UnderlineField label="F: Provisional diagnosis:" value={formData.m_prov_diag || ''} />
           <UnderlineField label="i. ICD 10 code" value={formData.m_icd_code || ''} className="w-1/2" />

           <div className="space-y-3 mt-4">
              <span className="text-[9px] font-bold uppercase">G: Proposed line of treatment:</span>
              <div className="pl-8 space-y-2">
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

           <UnderlineField label="H: If investigation and/or Medical Management provide details" value="" className="mt-4" />
           <div className="pl-8 mt-1">
              <UnderlineField label="i. Route of Drug Administration" value={formData.m_route_drug || ''} />
           </div>
           
           <div className="grid grid-cols-2 gap-8">
              <UnderlineField label="I: If surgical, name of surgery" value={formData.m_surgery_name || ''} />
              <UnderlineField label="i. ICD 10 PCS code" value="" />
           </div>
           
           <UnderlineField label="J: If other treatment, provide details" value="" />
           <UnderlineField label="K: How did injury occur" value="" />

           <div className="space-y-3 mt-6 border border-black/10 p-4 bg-slate-50/30 rounded-sm">
              <span className="text-[9px] font-bold uppercase underline">L: In case of accident</span>
              <div className="pl-4 space-y-3">
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold w-24 uppercase">i. Is it RTA:</span>
                    <TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                    <TickBox label="No" checked={formData.m_is_rta === 'No'} />
                 </div>
                 <UnderlineField label="ii. Date of Injury:" value={formData.m_rta_date ? formatDate(formData.m_rta_date) : ''} subLabel="(DD/MM/YYYY)" />
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold w-24 uppercase">iii. Report to Police:</span>
                    <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                    <TickBox label="No" checked={formData.m_rta_police === 'No'} />
                 </div>
                 <UnderlineField label="iv. FIR NO" value={formData.m_fir_no || ''} />
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold uppercase">v. Injury /Disease caused due to substance abuse/alcohol consumption:</span>
                    <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                    <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold uppercase">vi. Test conducted to establish this (if yes, attach report):</span>
                    <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                    <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-10 mt-6">
              <div className="flex items-center space-x-4">
                 <span className="text-[9px] font-bold uppercase">M. In case of Maternity:</span>
                 <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-5 h-5 flex items-center justify-center border-r last:border-r-0 border-black text-[9px] font-black">{l}</div>)}</div>
              </div>
              <UnderlineField label="i. expected date of Delivery" value="" subLabel="(DD/MM/YYYY)" className="flex-1" />
           </div>

           <SectionTitle>DETAILS OF PATIENT ADMITTED</SectionTitle>
           <div className="grid grid-cols-2 gap-x-12 pt-2">
              <UnderlineField label="A. Date of admission" value={formData.adm_date ? formatDate(formData.adm_date) : ''} subLabel="(DD/MM/YYYY)" />
              <div className="flex items-center space-x-2">
                 <span className="text-[8.5px] font-bold uppercase">B. Time of admission:</span>
                 <div className="flex border border-black bg-white h-5">
                    <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{formData.adm_time?.split(':')[0] || ' '}</div>
                    <div className="w-5 flex items-center justify-center font-black text-[9px]">{formData.adm_time?.split(':')[1] || ' '}</div>
                 </div>
                 <span className="text-[7px] font-bold text-slate-400">( HH : MM )</span>
              </div>
           </div>
           <div className="flex items-center gap-12 mt-2">
              <span className="text-[8.5px] font-bold uppercase">C. Is this an emergency/planned hospitalization event:</span>
              <div className="flex space-x-6">
                <TickBox label="Emergency" checked={false} />
                <TickBox label="Planned" checked={true} />
              </div>
           </div>
        </div>

        <PageFooter page={2} />
      </div>

      {/* PAGE 3: History & Expenses */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="flex justify-end mb-6">
           <MedsaveLogo />
        </div>

        <div className="space-y-4">
           <div className="space-y-4">
              <span className="text-[9px] font-black uppercase underline">D. Mandatory Past History of any chronic illness if yes (Since month/year)</span>
              <div className="grid grid-cols-1 gap-2 pl-4">
                 {[
                    { label: "i. Diabetes", key: "diabetes" },
                    { label: "ii. Heart disease", key: "heart" },
                    { label: "iii. Hypertension", key: "hypertension" },
                    { label: "iv. Hyperlipidemias", key: "hyperlipidemias" },
                    { label: "v. Osteoarthritis", key: "osteoarthritis" },
                    { label: "vi. Asthma/COPD/Bronchitis", key: "asthma" },
                    { label: "vii. Cancer", key: "cancer" },
                    { label: "viii. Alcohol/Drug abuse", key: "alcohol" },
                    { label: "ix. Any HIV/or STD Related ailment", key: "hiv" }
                 ].map(item => (
                    <UnderlineField key={item.key} label={item.label} value={String(formData[`m_chronic_${item.key}_since`] || '')} />
                 ))}
                 <UnderlineField label="x. Any other ailment, give details" value="" />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12 pt-4">
              <UnderlineField label="E. Expected number of Days/stay in hospital:" value={`${formData.adm_stay_days || ''} Days`} />
              <UnderlineField label="F. Days in ICU:" value="NA" subLabel="Days" />
           </div>
           
           <UnderlineField label="G. Room Type" value={formData.adm_room_type || ''} />

           <div className="space-y-1.5 mt-4 border-t border-slate-200 pt-4">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Estimated Cost Structure (INR)</p>
              {[
                 { label: "H. Per day room rent + nursing and service charges+ patients diet:", id: "cost_room_rent" },
                 { label: "I. Expected cost of investigation + diagnostic:", id: "cost_investigation" },
                 { label: "J. ICU charges:", id: "cost_icu" },
                 { label: "K. OT charges:", id: "cost_ot" },
                 { label: "L. Professional fees Surgeon +Anesthetist Fees +consultation Charges:", id: "cost_prof_fees" },
                 { label: "M. Medicines + Consumables + Cost of Implants (if applicable please specify):", id: "cost_medicines" },
                 { label: "N. Other hospital expenses if any:", id: "cost_other" },
                 { label: "0. All-inclusive package charges if any applicable:", id: "cost_package" },
                 { label: "P. Sum Total expected cost of hospitalization:", id: "adm_total_cost", bold: true },
              ].map((item, idx) => (
                 <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                    <span className={`text-[7.5px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                    <div className="flex items-center">
                       <span className="text-[8.5px] mr-1 font-black">Rs.</span>
                       <span className="border-b border-black w-24 text-right pr-1 text-[10px] font-black">{Number(formData[item.id] || 0).toLocaleString()}</span>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        <div className="mt-8 space-y-6">
           <SectionTitle>DECLARATION</SectionTitle>
           <p className="text-[9px] font-black text-center uppercase tracking-tight">(Please read very carefully)</p>
           <p className="text-[9px] font-black text-center uppercase">We confirm having read understood and agreed to the Declarations of this form</p>
           
           <div className="space-y-6 px-10">
              <UnderlineField label="a. Name of the treating doctor" value={formData.dr_name || ''} />
              <UnderlineField label="b. Qualification:" value="MBBS, MD" />
              <UnderlineField label="c. Registration number with State code" value={formData.registrationNo || ''} />
           </div>

           <div className="grid grid-cols-2 gap-20 px-10 pt-10">
              <div className="flex flex-col items-center">
                 <div className="w-full h-32 border border-black relative flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden">
                    {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-60 mix-blend-multiply" />}
                 </div>
                 <p className="text-[9px] font-black uppercase mt-2">Hospital Seal</p>
                 <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">(Must include Hospital ID)</p>
              </div>
              <div className="flex flex-col items-center">
                 <div className="w-full h-32 border border-black relative flex items-end justify-center bg-slate-50 rounded-xl">
                 </div>
                 <p className="text-[9px] font-black uppercase mt-2">Patient/Insured Name and Sign</p>
              </div>
           </div>
        </div>

        <PageFooter page={3} />
      </div>

      {/* PAGE 4: Legal Declarations */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="flex justify-end mb-6">
           <MedsaveLogo />
        </div>

        <section className="space-y-4 flex-1">
           <h3 className="text-[11px] font-black uppercase text-center underline decoration-2 underline-offset-4">DECLARATION BY THE PATIENT I REPRESENTATIVE</h3>
           <div className="text-[8px] text-justify space-y-3 px-6 leading-relaxed text-slate-700 font-medium">
              <p>a. 1 agrees to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer/T.P.A after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
              <p>b. Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer /TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
              <p>c. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer/T.P.A not governed by the terms and conditions of the policy will be paid by me.</p>
              <p>d. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the Insurer / T.P.A</p>
              <p>e. I agree and understand that T.P.A is in no way warranting the service of the hospital & that the Insurer /TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
              <p>f. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
              <p>g. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer / TPA.</p>
              <p>h. "I/We authorize Insurance Company/TPA to contact me/us through mobile/email for any update on this claim".</p>
           </div>

           <div className="space-y-4 px-6 pt-6">
              <UnderlineField label="a) Patient's / Insured's Name:" value={formData.p_name || ''} />
              <div className="grid grid-cols-2 gap-10">
                 <UnderlineField label="b) Contact number:" value={formData.p_contact || ''} />
                 <UnderlineField label="c) e-mail Id (optional):" value={formData.p_email || ''} />
              </div>
              <div className="grid grid-cols-2 gap-10 pt-4">
                 <div className="border-t border-black pt-1"><p className="text-[9px] font-black uppercase">d) Patient's / Insured's Signature:</p></div>
                 <div className="flex gap-10">
                    <UnderlineField label="Date:" value={formatDate(new Date())} />
                    <UnderlineField label="Time:" value={new Date().toLocaleTimeString()} />
                 </div>
              </div>
           </div>

           <div className="mt-8">
              <SectionTitle>HOSPITAL DECLARATION</SectionTitle>
              <div className="text-[8px] text-justify space-y-3 px-6 leading-relaxed text-slate-700 font-medium pt-4">
                 <p>a. We have no objection to any authorized TPA /Insurance Company official verifying documents pertaining to hospitalization.</p>
                 <p>b. All valid original documents duly countersigned by the insured/patient as per the checklist below will be sent to TPA / Insurance Company within 7 days of the patient's discharge.</p>
                 <p>c. We agree that TPA / Insurance Company will not be liable to make the payment in the between the facts in this form and discharge summary or other documents</p>
                 <p>d. The patient declaration has been signed by the patient or by his representative in our presence.</p>
                 <p>e. We agree to provide clarifications for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications</p>
                 <p>f. We will abide by the terms and conditions agreed in the MOU.</p>
                 <p>g. We confirm that no additional amount would be collected from the insured in excess of Agreed Package Rates except costs towards non-admissible amounts (including additional charges due to opting higher room rent than eligibility/choosing separate line of treatment which is not envisaged/considered in package).</p>
                 <p>h. We confirm that no recoveries would be made from the deposit amount collected from the Insured except for costs towards non-admissible amounts (including additional charges due to opting higher room rent than eligibility/ choosing separate line of treatment which is not envisaged/considered in package).</p>
                 <p>i. In the event of unauthorized recovery of any additional amount from the Insured in excess of Agreed Package Rates, the authorized TPA /Insurance Company reserves the right to recover the same from us (the Network Provider) and/or take necessary action, as provided under the MOU or applicable laws.</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-20 px-10 pt-12 mb-auto">
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

           <div className="grid grid-cols-2 gap-10 px-10 pt-6">
              <UnderlineField label="Date:" value={formatDate(new Date())} />
              <UnderlineField label="Time" value={new Date().toLocaleTimeString()} />
           </div>
        </section>

        <PageFooter page={4} />
      </div>

    </div>
  );
};

export default MedsaveTemplate;
