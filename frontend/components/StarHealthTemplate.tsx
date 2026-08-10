
import React from 'react';
import { formatDate } from '../utils';

interface StarHealthTemplateProps {
  formData: Record<string, any>;
}

interface UnderlineFieldProps {
  label: string;
  value: string;
  subLabel?: string;
  className?: string;
}

const UnderlineField: React.FC<UnderlineFieldProps> = ({ label, value, subLabel, className = "" }) => (
  <div className={`flex items-end space-x-2 border-b border-black pb-0.5 mt-2 ${className}`}>
    <span className="text-[8px] font-bold text-black whitespace-nowrap">{label}</span>
    <span className="text-[9px] font-black text-blue-700 uppercase flex-1 min-h-[14px]">{value}</span>
    {subLabel && <span className="text-[7px] font-bold text-slate-500 whitespace-nowrap italic">{subLabel}</span>}
  </div>
);

const TickBox: React.FC<{ label: string, checked: boolean }> = ({ label, checked }) => (
  <div className="flex items-center space-x-1">
    <div className={`w-[12px] h-[12px] border border-black flex items-center justify-center`}>
      {checked && <div className="w-[8px] h-[8px] bg-black"></div>}
    </div>
    <span className="text-[8px] font-bold text-black uppercase">{label}</span>
  </div>
);

const Header: React.FC = () => (
  <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
    <div className="flex items-center space-x-1 shrink-0">
      <div className="flex flex-col items-center">
         <svg viewBox="0 0 100 100" className="w-12 h-12 fill-black" >
            <path d="M50 5l12.5 31.5H95L66.5 54.5 77.5 88 50 67.5 22.5 88l11-33.5L5 36.5h32.5z" />
         </svg>
         <div className="mt-[-8px] flex flex-col items-center">
            <span className="text-[14px] font-black tracking-tighter leading-none">STAR</span>
            <span className="text-[4px] font-bold uppercase tracking-[0.1em] whitespace-nowrap">Personal & Caring</span>
         </div>
      </div>
      <div className="h-10 w-[1px] bg-slate-300 mx-1"></div>
      <div className="flex flex-col justify-center leading-none">
         <span className="text-[8px] font-bold">Health</span>
         <span className="text-[8px] font-bold">Insurance</span>
      </div>
    </div>

    <div className="flex-1 text-center px-4">
      <h1 className="text-[13px] font-black uppercase text-black leading-none mb-1">STAR HEALTH AND ALLIED INSURANCE COMPANY LIMITED</h1>
      <p className="text-[7px] text-black leading-tight font-medium">Regd. & Corporate Office: 1, New Tank Street, Valluvar Kottam High Road, Nungambakkam, Chennai - 600 034.</p>
      <p className="text-[7px] text-black leading-tight font-medium">Corporate Office - Claims Dept. : No.15, Balaji Complex, Whites Lane, 1st Floor, Royapettah, Chennai - 600 014.</p>
      <p className="text-[7px] text-black leading-tight font-medium">Toll free Phone No: 1800 425 2255 Toll free Fax No: 1800 425 5522</p>
      <p className="text-[7px] text-black leading-tight font-medium">CIN : U66010TN2005PLC056649 Email:cashless.network@starhealth.in Website: www.starhealth.in IRDAI Regn. No: 129</p>
    </div>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center py-1.5 border-y-2 border-black my-4 bg-slate-50">
    <h2 className="text-[10px] font-black uppercase tracking-widest">{children}</h2>
  </div>
);

const PageFooter: React.FC<{ page: number }> = ({ page }) => (
  <div className="mt-auto pt-6 flex justify-between text-[6px] font-bold text-slate-400">
    <span>STAR HEALTH FORM PART-C (REVISED)</span>
    <span>Page {page} of 4</span>
  </div>
);

const StarHealthTemplate: React.FC<StarHealthTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-8 space-y-8 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1: DETAILS OF TPA/INSURER/HOSPITAL & PATIENT */}
      <div className="bg-white p-6 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-6 font-sans leading-none print:min-h-[297mm] flex flex-col">
        <Header />
        
        <div className="bg-black text-white text-center py-1.5 w-full mb-2">
           <h3 className="text-[9px] font-black uppercase tracking-widest">REQUEST FOR CASHLESS HOSPITALISATION FOR HEALTH INSURANCE</h3>
        </div>

        <div className="flex justify-between items-start mb-2 px-1">
           <div className="flex flex-col">
              <p className="text-[8px] font-bold uppercase">POLICY PART — C (Revised)</p>
           </div>
           <div className="text-right">
              <p className="text-[7px] font-black italic">(TO BE FILLED IN BLOCK LETTERS)</p>
           </div>
        </div>

        <div className="space-y-3 mt-4">
          <p className="text-[8px] font-black uppercase underline mb-1">DETAILS OF THE THIRD PARTY ADMINISTRATOR/INSURER/HOSPITAL.:</p>
          <UnderlineField label="a. Name of TPA/Insurance company:" value={formData.insurance_company || 'STAR HEALTH AND ALLIED INSURANCE COMPANY LIMITED'} />
          <UnderlineField label="b. Toll free phone number:" value="1800 425 2255" />
          <UnderlineField label="c. Toll free fax:" value="1800 425 5522" />
          <UnderlineField label="d. Name of Hospital:" value={formData.hosp_name || ''} />
          <div className="pl-6 space-y-1">
            <UnderlineField label="i. Address:" value={formData.hosp_address || ''} />
            <UnderlineField label="ii. Rohini ID:" value={formData.hosp_rohini_id || ''} />
            <UnderlineField label="iii. e-mail id:" value={formData.hosp_email || ''} />
          </div>
        </div>

        <SectionTitle>TO BE FILLED BY INSURED/PATIENT</SectionTitle>

        <div className="space-y-3">
          <UnderlineField label="A. Name of the Patient:" value={formData.p_name || ''} />
          <div className="flex items-center space-x-12">
            <span className="text-[8px] font-bold">B. Gender:</span>
            <TickBox label="Male" checked={formData.p_gender === 'Male'} />
            <TickBox label="Female" checked={formData.p_gender === 'Female'} />
            <TickBox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
          </div>
          <UnderlineField label="C. Age:" value={String(formData.p_age_y || '')} subLabel="(Years) / (Month)" />
          <UnderlineField label="D. Date of Birth:" value={formData.p_dob ? formatDate(formData.p_dob) : ''} subLabel="(DD/MM/YYYY)" />
          <UnderlineField label="E. Contact number:" value={formData.p_contact || ''} />
          <UnderlineField label="F. Contact number of attending Relative:" value={formData.p_relative_contact || ''} />
          <UnderlineField label="G. Insured Card ID number:" value={formData.p_card_id || ''} />
          <UnderlineField label="H. Policy number/Name of Corporate:" value={formData.p_policy_no || ''} />
          <UnderlineField label="I. Employee ID:" value={formData.p_employee_id || ''} />
          <div className="flex items-center space-x-12">
            <span className="text-[8px] font-bold">J. Currently do you have any other mediclaim/health insurance:</span>
            <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
            <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
          </div>
          <div className="pl-6 space-y-1">
            <UnderlineField label="i. Company Name:" value={formData.p_other_insurer_name || ''} />
            <UnderlineField label="ii. Give Details:" value={formData.p_other_insurance_details || ''} />
          </div>
          <div className="flex items-center space-x-12">
            <span className="text-[8px] font-bold">K. Do you have a family Physician:</span>
            <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
            <TickBox label="No" checked={formData.p_family_physician === 'No'} />
          </div>
          <UnderlineField label="L. Name of the family Physician:" value={formData.p_family_physician_name || ''} />
          <UnderlineField label="M. Contact number, if any:" value={formData.p_family_physician_contact || ''} />
          <UnderlineField label="N. Current Address of Insured Patient:" value={formData.p_address || ''} />
          <UnderlineField label="O. Occupation of Insured Patient:" value={formData.p_occupation || ''} />
        </div>
        <p className="text-[7px] text-center font-bold mt-4 uppercase">(PLEASE COMPLETE DECLARATION OF THIS FORM)</p>
        <PageFooter page={1} />
      </div>

      {/* PAGE 2: TREATING DOCTOR/HOSPITAL */}
      <div className="bg-white p-6 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-6 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <SectionTitle>TO BE FILLED BY TREATING DOCTOR/HOSPITAL</SectionTitle>
        
        <div className="space-y-4">
          <UnderlineField label="A. Name of the treating Doctor:" value={formData.dr_name || ''} />
          <UnderlineField label="B. Contact number:" value={formData.dr_contact || ''} />
          <UnderlineField label="C. Nature of illness/Disease with presenting complaint:" value={formData.m_illness || ''} />
          <UnderlineField label="D. Relevant Critical Findings:" value={formData.m_clinical_findings || ''} />
          <div className="flex items-center space-x-4">
            <UnderlineField label="E. Duration of the present ailment:" value={String(formData.m_duration || '')} className="flex-1" />
            <span className="text-[8px] font-bold">Days</span>
          </div>
          <UnderlineField label="iv. Date of First consultation:" value={formatDate(formData.m_first_cons_date)} subLabel="(DD/MM/YYYY)" />
          <UnderlineField label="v. Past history of present ailment, if an:" value="" />
          <UnderlineField label="F. Provisional diagnosis:" value={formData.m_prov_diag || ''} />
          <UnderlineField label="ICD 10 code:" value={formData.m_icd_code || ''} />
          
          <div className="space-y-2 mt-4">
            <span className="text-[8px] font-bold">G. Proposed line of treatment:</span>
            <div className="grid grid-cols-2 gap-2 pl-4">
              <TickBox label="i. Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
              <TickBox label="ii. Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
              <TickBox label="iii. Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
              <TickBox label="iv. Investigation" checked={formData.m_treatment_type === 'Investigation'} />
              <TickBox label="v. Non-allopathic treatment" checked={false} />
            </div>
          </div>

          <UnderlineField label="H. If Investigation & / or Medical Management provide details:" value="" />
          <UnderlineField label="i. Route of Drug Administration:" value={formData.m_route_drug || ''} />
          
          <div className="grid grid-cols-2 gap-4">
            <UnderlineField label="I. If Surgical, name of surgery:" value={formData.m_surgery_name || ''} />
            <UnderlineField label="i. ICD 10 PCS code:" value="" />
          </div>
          
          <UnderlineField label="J. If other treatments provide details:" value="" />
          <UnderlineField label="K. How did injury occur:" value="" />

          <div className="pl-4 space-y-2 border border-black/20 p-2">
            <p className="text-[8px] font-bold uppercase underline mb-1">L. In case of accident:</p>
            <div className="flex items-center space-x-12">
              <span className="text-[8px] font-bold">i. Is it RTA:</span>
              <TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} />
              <TickBox label="No" checked={formData.m_is_rta === 'No'} />
            </div>
            <UnderlineField label="ii. Date of Injury:" value={formatDate(formData.m_rta_date)} subLabel="(DD/MM/YYYY)" />
            <div className="flex items-center space-x-12">
              <span className="text-[8px] font-bold">iii. Report to Police:</span>
              <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
              <TickBox label="No" checked={formData.m_rta_police === 'No'} />
            </div>
            <UnderlineField label="iv. FIR NO:" value={formData.m_fir_no || ''} />
            <div className="flex items-center space-x-12">
              <span className="text-[8px] font-bold">v. Injury / Disease caused due to substance abuse / alcohol consumption:</span>
              <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
              <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
            </div>
            <div className="flex items-center space-x-12">
              <span className="text-[8px] font-bold">vi. Test conducted to establish this:</span>
              <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
              <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
              <span className="text-[7px] text-slate-400 italic">(If Yes, attach reports)</span>
            </div>
          </div>

          <div className="flex items-center space-x-12 mt-2">
            <span className="text-[8px] font-bold">M. In case of Maternity:</span>
            <div className="flex border border-black bg-slate-50">
               <div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">G: {formData.m_mat_g || '0'}</div>
               <div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">P: {formData.m_mat_p || '0'}</div>
               <div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">L: {formData.m_mat_l || '0'}</div>
               <div className="px-1.5 h-5 flex items-center justify-center text-[9px] font-bold">A: {formData.m_mat_a || '0'}</div>
            </div>
            <UnderlineField label="i. Expected date of Delivery:" value={formatDate(formData.m_mat_edd)} subLabel="(DD/MM/YYYY)" className="flex-1" />
          </div>
        </div>
        <PageFooter page={2} />
      </div>

      {/* PAGE 3: PATIENT ADMISSION DETAILS */}
      <div className="bg-white p-6 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-6 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <SectionTitle>DETAILS OF PATIENT ADMITTED</SectionTitle>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-8">
            <UnderlineField label="A. Date of admission:" value={formatDate(formData.adm_date)} subLabel="(DD/MM/YYYY)" />
            <UnderlineField label="B. Time of admission:" value={formData.adm_time || ''} subLabel="(HH:MM)" />
          </div>
          
          <div className="flex items-center space-x-12">
            <span className="text-[8px] font-bold uppercase">C. Is this an emergency/a planned hospitalization event:</span>
            <TickBox label="Emergency" checked={formData.adm_type === 'Emergency'} />
            <TickBox label="Planned" checked={formData.adm_type === 'Planned'} />
          </div>

          <div className="space-y-2 mt-4">
            <p className="text-[8px] font-bold uppercase underline">D. Mandatory Past History of any chronic illness: <span className="text-slate-400 italic normal-case">If yes (Since month/year)</span></p>
            <div className="grid grid-cols-1 gap-2 pl-4">
              {[
                { label: "i. Diabetes", key: "diabetes" },
                { label: "ii. Heart disease", key: "heart_disease" },
                { label: "iii. Hypertension", key: "hypertension" },
                { label: "iv. Hyperlipidemias", key: "hyperlipidemia" },
                { label: "v. Osteoarthritis", key: "osteoarthritis" },
                { label: "vi. Asthma/COPD/Bronchitis", key: "asthma_copd" },
                { label: "vii. Cancer", key: "cancer" },
                { label: "viii. Alcohol/Drug abuse", key: "alcohol_abuse" },
                { label: "ix. Any HIV/or STD Related ailment", key: "hiv_std" },
              ].map((ill, idx) => (
                <div key={idx} className="flex items-end justify-between border-b border-black/10 pb-0.5">
                   <div className="flex items-center gap-4">
                      <span className="text-[8px] font-bold uppercase">{ill.label}</span>
                      <div className="flex gap-2">
                         <TickBox label="Yes" checked={formData[`m_chronic_${ill.key}_status`] === 'Yes'} />
                         <TickBox label="No" checked={formData[`m_chronic_${ill.key}_status`] !== 'Yes'} />
                      </div>
                   </div>
                   <span className="text-[9px] font-black uppercase text-blue-700">{formData[`m_chronic_${ill.key}_since`] || ''}</span>
                </div>
              ))}
              <UnderlineField label="x. Any other ailment, give details:" value="" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-4">
             <div className="flex items-end gap-2">
                <UnderlineField label="E. Expected number of Days/stay in hospital:" value={String(formData.adm_stay_days || '')} className="flex-1" />
                <span className="text-[8px] font-bold pb-1">Days</span>
             </div>
             <div className="flex items-end gap-2">
                <UnderlineField label="F. Days in ICU:" value="NA" className="flex-1" />
                <span className="text-[8px] font-bold pb-1">Days</span>
             </div>
          </div>
          <UnderlineField label="G. Room Type:" value={formData.adm_room_type || ''} />

          <div className="space-y-1 mt-6">
             <p className="text-[8px] font-bold uppercase mb-2">Estimated Cost Structure:</p>
             {[
               { label: "H. Per day room rent + nursing and service charges + patients diet:", id: "cost_room_rent" },
               { label: "I. Expected cost of investigation + diagnostic:", id: "cost_investigation" },
               { label: "J. ICU charges:", id: "cost_icu" },
               { label: "K. OT charges:", id: "cost_ot" },
               { label: "L. Professional fees Surgeon +Anesthetist Fees +consultation Charges:", id: "cost_prof_fees" },
               { label: "M. Medicines + Consumables + Cost of Implants (if applicable please specify):", id: "cost_medicines" },
               { label: "N. Other hospital expenses if any:", id: "cost_other" },
               { label: "O. All-inclusive package charges if any applicable:", id: "cost_package" },
               { label: "P. Sum Total expected cost of hospitalization:", id: "adm_total_cost", bold: true },
             ].map((item, idx) => (
               <div key={idx} className={`flex items-end justify-between border-b border-slate-200 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                  <span className={`text-[8px] font-bold uppercase ${item.bold ? 'font-black' : 'text-slate-600'}`}>{item.label}</span>
                  <div className="flex items-end w-32">
                     <span className="text-[8px] font-bold mr-1">Rs.</span>
                     <span className="text-[9px] font-black w-full text-right text-blue-700">{Number(formData[item.id] || 0).toLocaleString()}</span>
                  </div>
               </div>
             ))}
          </div>
        </div>
        <PageFooter page={3} />
      </div>

      {/* PAGE 4: DECLARATIONS */}
      <div className="bg-white p-6 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-6 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <SectionTitle>DECLARATION</SectionTitle>
        <p className="text-[8px] font-black uppercase text-center mb-6">(Please read very carefully)</p>
        <p className="text-[8px] font-bold text-center mb-4">We confirm having read understood and agreed to the Declarations of this form</p>
        
        <div className="space-y-4 px-4">
           <UnderlineField label="a. Name of the treating doctor:" value={formData.dr_name || ''} />
           <UnderlineField label="b. Qualification:" value="MBBS, MD" />
           <UnderlineField label="c. Registration number with State code:" value={formData.registrationNo || ''} />
        </div>

        <div className="grid grid-cols-2 gap-12 mt-12 px-4 h-32">
           <div className="border border-black flex items-center justify-center relative">
              <span className="absolute top-1 left-1 text-[6px] font-bold uppercase text-slate-400">Hospital Seal (Must include Hospital ID)</span>
              {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
           </div>
           <div className="border border-black flex items-center justify-center relative">
              <span className="absolute top-1 left-1 text-[6px] font-bold uppercase text-slate-400">Patient/Insured Name and Sign</span>
           </div>
        </div>

        <SectionTitle>DECLARATION BY THE PATIENT / REPRESENTATIVE</SectionTitle>
        <div className="text-[7.5px] text-justify space-y-2 px-4 leading-relaxed font-medium">
           <p>a. I agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer/T.P.A after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
           <p>b. Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer / TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
           <p>c. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer/T.P.A not governed by the terms and conditions of the policy will be paid by me.</p>
           <p>d. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the insurer / T.P.A</p>
           <p>e. I agree and understand that T.P.A is in no way warranting the service of the hospital & that the Insurer / TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
           <p>f. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
           <p>g. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer / TPA.</p>
           <p>h. "I/We authorize Insurance Company/TPA to contact me/us through mobile/email for any update on this claim".</p>
        </div>

        <div className="space-y-4 px-4 pt-6">
           <UnderlineField label="a) Patient's / Insured's Name:" value={formData.p_name || ''} />
           <UnderlineField label="b) Contact number:" value={formData.p_contact || ''} />
           <UnderlineField label="c) e-mail Id (optional):" value={formData.p_email || ''} />
           <UnderlineField label="d) Patient's / Insured's Signature:" value="" className="pt-4" />
           <div className="flex gap-10">
              <UnderlineField label="Date:" value={formatDate(new Date())} className="flex-1" />
              <UnderlineField label="Time:" value={new Date().toLocaleTimeString()} className="flex-1" />
           </div>
        </div>

        <SectionTitle>HOSPITAL DECLARATION</SectionTitle>
        <div className="text-[7.5px] text-justify space-y-2 px-4 leading-relaxed font-medium">
           <p>a. We have no objection to any authorized TPA / Insurance Company official verifying documents pertaining to hospitalization.</p>
           <p>b. All valid original documents duly countersigned by the insured / patient as per the checklist below will be sent to TPA/ Insurance Company within 7 days of the patient's discharge.</p>
           <p>c. We agree that TPA / Insurance Company will not be liable to make the payment in the event of any discrepancy between the facts in this form and discharge summary or other documents.</p>
           <p>d. The patient declaration has been signed by the patient or by his representative in our presence.</p>
           <p>e. We agree to provide clarifications for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications.</p>
           <p>f. We will abide by the terms and conditions agreed in the MOU.</p>
           <p>g. We confirm that no additional amount would be collected from the insured in excess of Agreed Package Rates except costs towards non-admissible amounts.</p>
           <p>h. We confirm that no recoveries would be made from the deposit amount collected from the Insured except for costs towards non-admissible amounts.</p>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-8 px-4 h-24 mb-auto">
           <div className="border border-black flex items-center justify-center relative">
              <span className="absolute top-1 left-1 text-[6px] font-bold uppercase text-slate-400">Hospital Seal</span>
              {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
           </div>
           <div className="border border-black flex items-center justify-center relative">
              <span className="absolute top-1 left-1 text-[6px] font-bold uppercase text-slate-400">Doctor's Signature</span>
              {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
           </div>
        </div>

        <PageFooter page={4} />
      </div>
    </div>
  );
};

export default StarHealthTemplate;
