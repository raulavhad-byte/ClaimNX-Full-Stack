import React from 'react';
import { formatDate } from '../utils';

interface VidalHealthTemplateProps {
  formData: Record<string, any>;
}

const DashedLineField: React.FC<{ label: string; value: string; className?: string; subLabel?: string; bold?: boolean }> = ({ label, value, className = "", subLabel, bold = true }) => (
  <div className={`flex items-end mt-1 ${className}`}>
    <span className="text-[9px] font-bold text-black whitespace-nowrap mr-2 uppercase tracking-tight">{label}</span>
    <div className="flex-1 border-b border-dashed border-black/60 pb-0.5 flex items-end min-h-[14px]">
    <span className={`text-[10px] uppercase truncate ${bold ? 'font-black text-[#00338d]' : 'font-medium text-[#00338d]'}`}>{value}</span>
    </div>
    {subLabel && <span className="text-[7.5px] font-bold text-slate-500 whitespace-nowrap ml-2">{subLabel}</span>}
  </div>
);

const BoxCheckbox: React.FC<{ label: string; checked: boolean }> = ({ label, checked }) => (
  <div className="flex items-center space-x-1.5 shrink-0">
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    <span className="text-[8.5px] font-bold text-black uppercase">{label}</span>
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-y border-black py-0.5 my-3 text-center bg-slate-50/50">
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{children}</h3>
  </div>
);

const PageFooter: React.FC<{ page: number }> = ({ page }) => (
  <div className="mt-auto pt-4 flex justify-end text-[8px] font-black text-slate-300 uppercase tracking-widest border-t border-slate-50">
     Page {page} of 4
  </div>
);

const VidalHealthTemplate: React.FC<VidalHealthTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-200 p-4 lg:p-12 space-y-12 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-12 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-12 font-sans leading-none print:min-h-[297mm] flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-start mb-6">
           <div className="flex-1 text-center">
              <h1 className="text-[13px] font-black text-slate-800 uppercase leading-none mb-1 tracking-tight">REQUEST FOR CASHLESS HOSPITALISATION FOR HEALTH INSURANCE</h1>
              <h2 className="text-[12px] font-black text-slate-800 uppercase underline decoration-2 underline-offset-4">POLICY PART - C (Revised)</h2>
              <p className="text-[8px] font-black text-slate-400 mt-2 uppercase tracking-widest">(TO BE FILLED IN BLOCK LETTERS)</p>
           </div>
        </div>

        <SectionHeader>DETAILS OF THE THIRD PARTY ADMINISTRATOR/ INSURER/ HOSPITAL</SectionHeader>
        
        <div className="space-y-3 mb-6">
           <DashedLineField label="a. Name of TPA / Insurance company:" value={formData.tpa_provider || 'VIDAL HEALTH INSURANCE TPA PRIVATE LTD.'} />
           <div className="flex justify-between text-[7px] font-bold text-slate-400 -mt-1 px-2">
              <span>(IRDA LICENCE No .022)</span>
              <span>Cashless Request E-mail Id : crm@healthindiatpa.com</span>
           </div>
           <div className="grid grid-cols-2 gap-10">
              <DashedLineField label="b. Toll free phone number:" value="1800-2201-02" />
              <DashedLineField label="c. Toll free fax:" value="07666136699" />
           </div>
           <DashedLineField label="d. Name of Hospital:" value={formData.hosp_name || ''} />
           <div className="pl-10 space-y-2 mt-2">
              <DashedLineField label="i. Address" value={formData.hosp_address || ''} />
              <div className="grid grid-cols-2 gap-10">
                 <DashedLineField label="ii. Rohini id" value={formData.hosp_rohini_id || ''} />
                 <DashedLineField label="iii. e-mail id" value={formData.hosp_email || ''} />
              </div>
           </div>
        </div>

        <SectionHeader>TO BE FILLED BY INSURED/PATIENT</SectionHeader>

        <div className="space-y-4 mb-6">
           <DashedLineField label="A. Name of the Patient :" value={formData.p_name || ''} />
           <div className="flex items-start gap-12">
              <div className="flex items-center gap-4">
                 <span className="text-[9px] font-bold uppercase">B. Gender:</span>
                 <BoxCheckbox label="Male" checked={formData.p_gender === 'Male'} />
                 <BoxCheckbox label="Female" checked={formData.p_gender === 'Female'} />
                 <BoxCheckbox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
              </div>
              <div className="flex items-end flex-1 space-x-2">
                 <span className="text-[9px] font-bold uppercase pb-1">C. Age:</span>
                 <span className="border-b border-dashed border-black w-12 text-center font-black text-[10px]">{formData.p_age_y}</span>
                 <span className="text-[8px] font-bold text-slate-400 pb-1 uppercase">Years</span>
                 <span className="border-b border-dashed border-black w-12 text-center font-black text-[10px]"></span>
                 <span className="text-[8px] font-bold text-slate-400 pb-1 uppercase">Months</span>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-10">
              <DashedLineField label="D. Date of Birth:" value={formData.p_dob ? formatDate(formData.p_dob) : ''} subLabel="(DD/MM/YYYY)" />
              <DashedLineField label="E. Contact number:" value={formData.p_contact || ''} />
           </div>
           <DashedLineField label="F. Contact number of attending Relative:" value={formData.p_relative_contact || ''} />
           <DashedLineField label="G. Insured Card ID number:" value={formData.p_card_id || ''} />
           <div className="grid grid-cols-2 gap-10">
              <DashedLineField label="H. Policy number / Name of Corporate:" value={formData.p_policy_no || ''} />
              <DashedLineField label="I. Employee ID:" value={formData.p_employee_id || ''} />
           </div>

           <div className="flex items-center space-x-10 mt-2">
              <span className="text-[9px] font-bold uppercase">J. Currently do you have any other mediclaim / health insurance:</span>
              <BoxCheckbox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <BoxCheckbox label="No" checked={formData.p_other_insurance === 'No'} />
           </div>
           <div className="pl-10 space-y-2">
              <DashedLineField label="i. Company Name:" value={formData.p_other_insurer_name || ''} />
              <DashedLineField label="ii. Give Details" value="" />
           </div>

           <div className="flex items-center space-x-12 mt-2">
              <span className="text-[9px] font-bold uppercase">K. Do you have a family Physician:</span>
              <BoxCheckbox label="Yes" checked={formData.p_family_physician === 'Yes'} />
              <BoxCheckbox label="No" checked={formData.p_family_physician === 'No'} />
           </div>
           <DashedLineField label="L. Name of the Family Physician:" value={formData.p_family_physician_name || ''} />
           <DashedLineField label="M. Contact number, if any:" value={formData.p_family_physician_contact || ''} />
           <DashedLineField label="N. Current Address of lnsured patient:" value={formData.p_address || ''} />
           <DashedLineField label="O. Occupation of Insured patient:" value={formData.p_occupation || ''} />
           
           <p className="text-[7.5px] font-black text-center mt-4 text-slate-400 uppercase tracking-widest">(PLEASE COMPLETE DECLARATION OF THIS FORM)</p>
        </div>

        <PageFooter page={1} />
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-12 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-12 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden">
        <SectionHeader>TO BE FILLED BY TREATING DOCTOR/HOSPITAL</SectionHeader>
        
        <div className="space-y-4 pt-4 flex-1">
           <DashedLineField label="A. Name of the treating Doctor:" value={formData.dr_name || ''} />
           <DashedLineField label="B. Contact number:" value={formData.dr_contact || ''} />
           <DashedLineField label="C. Nature of Illness / Disease with presenting complaint:" value={formData.m_illness || ''} />
           <DashedLineField label="D. Relevant Critical Findings:" value={formData.m_clinical_findings || ''} />
           
           <div className="flex items-end gap-10">
              <div className="flex items-end flex-1 space-x-2">
                 <span className="text-[9px] font-bold uppercase pb-1">E. Duration:</span>
                 <span className="border-b border-dashed border-black w-12 text-center font-black text-[10px]">{formData.m_duration}</span>
                 <span className="text-[8px] font-bold text-slate-400 pb-1 uppercase">Days</span>
              </div>
              <DashedLineField label="i. Date of First consultation:" value={formData.m_first_cons_date ? formatDate(formData.m_first_cons_date) : ''} subLabel="(DD/MM/YYYY)" className="flex-1" />
           </div>
           
           <DashedLineField label="ii. Past history of present ailment, if any" value="" />
           <DashedLineField label="F. Provisional diagnosis:" value={formData.m_prov_diag || ''} />
           <DashedLineField label="i. ICD 10 code" value={formData.m_icd_code || ''} className="w-1/2" />

           <div className="space-y-3 mt-4">
              <span className="text-[9px] font-bold uppercase underline">G. Proposed line of treatment:</span>
              <div className="pl-10 space-y-2">
                 {[
                    { label: "i. Medical Management", key: "Medical Management" },
                    { label: "ii. Surgical Management", key: "Surgical Management" },
                    { label: "iii. Intensive care", key: "Intensive care" },
                    { label: "iv. Investigation", key: "Investigation" },
                    { label: "v. Non-allopathic treatment", key: "Non-allopathic" }
                 ].map(item => (
                    <div key={item.key} className="flex items-center justify-between max-w-[300px]">
                       <span className="text-[9px] uppercase font-bold text-slate-700">{item.label}</span>
                       <span className="text-[10px] font-black">( {formData.m_treatment_type === item.key ? '✓' : ' '} )</span>
                    </div>
                 ))}
              </div>
           </div>

           <DashedLineField label="i. Route of Drug Administration :" value={formData.m_route_drug || ''} className="mt-4" />
           <DashedLineField label="I. If surgical, name of surgery" value={formData.m_surgery_name || ''} />
           <DashedLineField label="i. ICD l0 PCS code" value="" className="w-1/2" />
           <DashedLineField label="J. If other treatment, provide details" value="" />
           <DashedLineField label="K. How did injury occur" value="" />

           <div className="space-y-3 mt-6 border border-black/10 p-4 bg-slate-50/30 rounded-sm">
              <span className="text-[9px] font-bold uppercase underline">L. In case of accident</span>
              <div className="pl-4 space-y-3">
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold w-24 uppercase">i. Is it RTA:</span>
                    <BoxCheckbox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                    <BoxCheckbox label="No" checked={formData.m_is_rta === 'No'} />
                 </div>
                 <DashedLineField label="ii. Date of Injury:" value={formData.m_rta_date ? formatDate(formData.m_rta_date) : ''} subLabel="(DD/MM/YYYY)" />
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold w-24 uppercase">iii. Report to Police:</span>
                    <BoxCheckbox label="Yes" checked={formData.m_is_rta === 'Yes' ? false : formData.m_rta_police === 'Yes'} />
                    <BoxCheckbox label="No" checked={formData.m_is_rta === 'Yes' ? false : formData.m_rta_police === 'No'} />
                 </div>
                 <DashedLineField label="iv. FIR NO:" value={formData.m_fir_no || ''} />
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold uppercase">v. Injury / Disease caused due to substance abuse / alcohol consumption:</span>
                    <BoxCheckbox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                    <BoxCheckbox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold uppercase">vi. Test conducted to establish this (if yes, attach report):</span>
                    <BoxCheckbox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                    <BoxCheckbox label="No" checked={formData.m_test_conducted === 'No'} />
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-10 mt-6">
              <div className="flex items-center space-x-4">
                 <span className="text-[9px] font-bold uppercase">M. In case of Maternity:</span>
                 <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-5 h-5 flex items-center justify-center border-r last:border-r-0 border-black text-[9px] font-black">{l}</div>)}</div>
              </div>
              <DashedLineField label="i. expected date of Delivery" value="" subLabel="(DD/MM/YYYY)" className="flex-1" />
           </div>
        </div>

        <PageFooter page={2} />
      </div>

      {/* PAGE 3 */}
      <div className="bg-white p-12 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-12 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden relative">
        <SectionHeader>DETAILS OF PATIENT ADMITTED</SectionHeader>
        
        <div className="space-y-4 pt-4 flex-1">
           <div className="grid grid-cols-2 gap-10">
              <DashedLineField label="A. Date of admission:" value={formData.adm_date ? formatDate(formData.adm_date) : ''} subLabel="(DD/MM/YYYY)" />
              <DashedLineField label="B. Time of admission:" value={formData.adm_time || ''} subLabel="(HH:MM)" />
           </div>

           <div className="flex items-center gap-12 mt-2">
              <span className="text-[8.5px] font-bold uppercase">C. Is this an emergency/planned hospitalization event:</span>
              <div className="flex space-x-6">
                <BoxCheckbox label="Emergency" checked={false} />
                <BoxCheckbox label="Planned" checked={true} />
              </div>
           </div>

           <div className="space-y-3 mt-4">
              <span className="text-[9px] font-black uppercase underline">D. Mandatory Past History of any chronic illness if yes (Since month/year)</span>
              <div className="grid grid-cols-1 gap-1.5 pl-4">
                 {[
                    { label: "i. Diabetes", key: "diabetes" },
                    { label: "ii. Heart disease", key: "heart" },
                    { label: "iii. Hypertension", key: "hypertension" },
                    { label: "iv. Hyperlipidemias", key: "hyperlipidemias" },
                    { label: "v. Osteoarthritis", key: "osteoarthritis" },
                    { label: "vi. Asthma / COPD / Bronchitis", key: "asthma" },
                    { label: "vii. Cancer", key: "cancer" },
                    { label: "viii. Alcohol/Drug abuse", key: "alcohol" },
                    { label: "ix. Any HIV/ or STD Related ailment", key: "hiv" }
                 ].map(item => (
                    <DashedLineField key={item.key} label={item.label} value={String(formData[`m_chronic_${item.key}_since`] || '')} />
                 ))}
                 <DashedLineField label="x. Any other ailment, give details" value="" />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12 pt-4">
              <DashedLineField label="E. Expected number of Days/stay in hospital:" value={`${formData.adm_stay_days || ''} Days`} />
              <DashedLineField label="F. Days in ICU:" value="NA" />
           </div>
           
           <DashedLineField label="G. Room Type" value={formData.adm_room_type || ''} />

           <div className="space-y-1 mt-4 border-t border-slate-200 pt-4">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Estimated Cost Structure (INR)</p>
              {[
                 { label: "H. Per day room rent + nursing and service charges+ patients diet:", id: "cost_room_rent" },
                 { label: "I. Expected cost of investigation + diagnostic:", id: "cost_investigation" },
                 { label: "J. ICU charges:", id: "cost_icu" },
                 { label: "K. OT charges:", id: "cost_ot" },
                 { label: "L. Professional fees Surgeon + Anesthetist Fees + consultation Charges:", id: "cost_prof_fees" },
                 { label: "M. Medicines + Consumables + Cost of Implants (if applicable):", id: "cost_medicines" },
                 { label: "N. Other hospital expenses if any:", id: "cost_other" },
                 { label: "O. All-inclusive package charges if any applicable:", id: "cost_package" },
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
           <SectionHeader>DECLARATION</SectionHeader>
           <p className="text-[9px] font-black text-center uppercase tracking-tight">(Please read very carefully)</p>
           <p className="text-[9px] font-black text-center uppercase">We confirm having read understood and agreed to the Declarations of this form</p>
           
           <div className="space-y-6 px-10">
              <DashedLineField label="a. Name of the treating doctor" value={formData.dr_name || ''} />
              <DashedLineField label="b. Qualification:" value="MBBS, MD" />
              <DashedLineField label="c. Registration number with State code" value={formData.registrationNo || ''} />
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
                 <p className="text-[9px] font-black uppercase mt-2">Patient / lnsured Name and Sign</p>
              </div>
           </div>
        </div>

        <PageFooter page={3} />
      </div>

      {/* PAGE 4 */}
      <div className="bg-white p-12 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-12 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden relative">
        <section className="space-y-4 flex-1">
           <SectionHeader>DECLARATION BY THE PATIENT / REPRESENTATIVE</SectionHeader>
           <div className="text-[8px] text-justify space-y-3 px-6 leading-relaxed text-slate-700 font-medium">
              <p>a. I agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer / TPA after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
              <p>b. Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer / TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
              <p>c. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer/T.P.A not governed by the terms and conditions of the policy will be paid by me.</p>
              <p>d. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the insurer / T.P.A</p>
              <p>e. I agree and understand that T.P.A is in no way warranting the service of the hospital & that the Insurer / TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
              <p>f. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
              <p>g. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the insurer / TPA.</p>
              <p>h. "I/We authorize Insurance Company / TPA to contact me/us through mobile/email for any update on this claim"</p>
           </div>

           <div className="space-y-4 px-6 pt-6">
              <DashedLineField label="a) Patient's / Insured's Name:" value={formData.p_name || ''} />
              <DashedLineField label="b) Contact Number:" value={formData.p_contact || ''} />
              <DashedLineField label="c) e-mail Id (optional):" value={formData.p_email || ''} />
              <div className="grid grid-cols-2 gap-10 pt-4">
                 <div className="border-t border-black pt-1"><p className="text-[9px] font-black uppercase">d) Patient's / Insured's Signature:</p></div>
                 <div className="flex gap-10">
                    <DashedLineField label="Date:" value={formatDate(new Date())} />
                    <DashedLineField label="Time:" value={new Date().toLocaleTimeString()} />
                 </div>
              </div>
           </div>

           <SectionHeader>HOSPITAL DECLARATION</SectionHeader>
           <div className="text-[8px] text-justify space-y-3 px-6 leading-relaxed text-slate-700 font-medium">
              <p>a. We have no objection to any authorized TPA / Insurance Company official verifying documents pertaining to hospitalization.</p>
              <p>b. All valid original documents duly countersigned by the insured / patient as per the checklist below will be sent to TPA/ lnsurance Company within 7 days of the patient's discharge.</p>
              <p>c. We agree that TPA / Insurance Company will not be liable to make the payment in the event of any discrepancy between the facts in this form and discharge summary or other documents.</p>
              <p>d. The patient declaration has been signed by the patient or by his representative in our presence.</p>
              <p>e. We agree to provide clarifications for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications.</p>
              <p>f. We will abide by the terms and conditions agreed in the MOU.</p>
           </div>

           <div className="grid grid-cols-2 gap-20 px-10 pt-12">
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
              <DashedLineField label="Date:" value={formatDate(new Date())} />
              <DashedLineField label="Time" value={new Date().toLocaleTimeString()} />
           </div>
        </section>

        <PageFooter page={4} />
      </div>

    </div>
  );
};

export default VidalHealthTemplate;
