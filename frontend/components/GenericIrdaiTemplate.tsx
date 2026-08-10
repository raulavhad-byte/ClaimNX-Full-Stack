
import React from 'react';
import { formatDate } from '../utils';

interface GenericIrdaiTemplateProps {
  formData: Record<string, any>;
}

const DashedLineField: React.FC<{ label: string; value: string; className?: string; subLabel?: string; bold?: boolean }> = ({ label, value, className = "", subLabel, bold = true }) => (
  <div className={`flex items-end mt-1 ${className}`}>
    <span className="text-[9px] font-bold text-black whitespace-nowrap mr-2 uppercase tracking-tight">{label}</span>
    <div className="flex-1 border-b border-dashed border-slate-400 pb-0.5 flex items-end min-h-[14px]">
      <span className={`text-[10px] uppercase truncate ${bold ? 'font-black text-blue-700' : 'font-medium text-blue-600'}`}>{value}</span>
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
  <div className="mt-auto pt-4 flex justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest border-t border-slate-50">
     <span>Standard IRDAI Form PART-C (Revised)</span>
     <span>Page {page} of 4</span>
  </div>
);

const PPNNetworkPage: React.FC<{ formData: Record<string, any> }> = ({ formData }) => {
  return (
    <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
       {/* Logos Header Placeholder */}
       <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
          <div className="flex flex-col items-center w-1/4">
             <div className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center bg-slate-50 mb-1">
                <span className="text-[8px] font-black">NIA</span>
             </div>
             <span className="text-[6px] font-black uppercase text-center leading-tight">The New India Assurance Co. Ltd.</span>
          </div>
          <div className="flex flex-col items-center w-1/4">
             <div className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center bg-slate-50 mb-1">
                <span className="text-[8px] font-black">UIIC</span>
             </div>
             <span className="text-[6px] font-black uppercase text-center leading-tight">United India Insurance Co. Ltd.</span>
          </div>
          <div className="flex flex-col items-center w-1/4">
              <div className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center bg-slate-50 mb-1">
                <span className="text-[8px] font-black">NIC</span>
             </div>
             <span className="text-[6px] font-black uppercase text-center leading-tight">National Insurance Co. Ltd.</span>
          </div>
          <div className="flex flex-col items-center w-1/4">
              <div className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center bg-slate-50 mb-1">
                <span className="text-[8px] font-black">OIC</span>
             </div>
             <span className="text-[6px] font-black uppercase text-center leading-tight">The Oriental Insurance Co. Ltd.</span>
          </div>
       </div>
 
       <h1 className="text-[12px] font-black text-center uppercase underline decoration-2 underline-offset-4 mb-8 leading-tight">
         PPN NETWORK - DECLARATION BY PATIENT/PATIENT’S ATTENDANT
       </h1>
 
       <div className="space-y-5 text-[9px] font-medium leading-relaxed">
          <div className="flex justify-between items-end">
              <div className="flex items-end w-3/4">
                 <span className="font-bold whitespace-nowrap mr-2">Name of the Hospital :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black uppercase text-blue-700">{formData.hosp_name}</span>
              </div>
              <div className="flex items-end w-1/4 ml-4">
                 <span className="font-bold whitespace-nowrap mr-2">Date :</span>
                 <span className="border-b border-dotted border-black flex-1 text-center font-black">{formatDate(new Date())}</span>
              </div>
          </div>
          <div className="flex items-end">
             <span className="font-bold whitespace-nowrap mr-2">Address :</span>
             <span className="border-b border-dotted border-black flex-1 font-black uppercase text-[8px] text-blue-700">{formData.hosp_address}</span>
          </div>
          <div className="flex justify-between items-end">
              <div className="flex items-end w-3/4">
                 <span className="font-bold whitespace-nowrap mr-2">PATIENT NAME (BLOCK LETTERS) :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black uppercase text-blue-700">{formData.p_name}</span>
              </div>
              <div className="flex items-end w-1/4 ml-4">
                 <span className="font-bold whitespace-nowrap mr-2">AGE/SEX :</span>
                 <span className="border-b border-dotted border-black flex-1 text-center font-black text-blue-700">{formData.p_age_y} / {formData.p_gender?.charAt(0)}</span>
              </div>
          </div>
          <div className="flex justify-between items-end gap-4">
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">IP No :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black text-blue-700">{formData.p_uhid}</span>
             </div>
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">UHID No :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black text-blue-700">{formData.p_uhid}</span>
             </div>
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">Mobile No of Patient :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black text-blue-700">{formData.p_contact}</span>
             </div>
          </div>
          <div className="flex justify-between items-end gap-6">
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">Date of Admission :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black text-blue-700">{formatDate(formData.adm_date)}</span>
             </div>
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">Time of Admission :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black text-blue-700">{formData.adm_time}</span>
             </div>
          </div>
          <div className="flex justify-between items-end gap-6">
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">Date of Discharge :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black text-blue-700">{formatDate(formData.adm_exp_discharge)}</span>
             </div>
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">Time of Discharge :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black"></span>
             </div>
          </div>
          <div className="flex items-end">
             <span className="font-bold whitespace-nowrap mr-2">Address of the Patient :</span>
             <span className="border-b border-dotted border-black flex-1 font-black uppercase text-[8px] text-blue-700">{formData.p_address}</span>
          </div>
          <div className="flex justify-between items-end gap-6">
             <div className="flex items-end flex-[2]">
                 <span className="font-bold whitespace-nowrap mr-2">NAME OF THE ATTENDANT :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black uppercase"></span>
             </div>
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">Relationship :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black"></span>
             </div>
          </div>
          <div className="flex justify-between items-end gap-6">
             <div className="flex items-end w-1/3">
                 <span className="font-bold whitespace-nowrap mr-2">Mobile No. of Attendant :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black text-blue-700">{formData.p_relative_contact}</span>
             </div>
             <div className="flex items-end flex-1">
                 <span className="font-bold whitespace-nowrap mr-2">Address :</span>
                 <span className="border-b border-dotted border-black flex-1 font-black"></span>
             </div>
          </div>
 
          <div className="space-y-2 mt-6">
             <p className="font-black underline uppercase mb-2">Declaration regarding Insurance Policy (Strike off the option which is not applicable)</p>
             <div className="pl-4 space-y-3">
                <div className="flex gap-2 items-start">
                   <span className="font-bold">(i)</span>
                   <div className="flex-1">
                      <span className="font-bold">Declaration when patient has no insurance policy:</span>
                      <ul className="list-disc pl-5 mt-1">
                         <li>I declare that I do not have any insurance policy.</li>
                      </ul>
                   </div>
                </div>
                <div className="flex gap-2 items-start">
                   <span className="font-bold">(ii)</span>
                   <div className="flex-1">
                      <span className="font-bold">Declaration when patient has insurance policy:</span>
                      <ul className="list-disc pl-5 mt-1">
                         <li>I declare that I have following Insurance Policies</li>
                      </ul>
                      <div className="mt-2 space-y-2 pl-4">
                         <div className="flex items-end">
                            <span className="font-bold mr-2">Policy No/TPA card No:</span>
                            <span className="border-b border-black flex-1 font-black text-blue-700">{formData.p_policy_no} / {formData.p_card_id}</span>
                         </div>
                         <div className="flex items-end">
                            <span className="font-bold mr-2">Insurance Company:</span>
                            <span className="border-b border-black flex-1 font-black uppercase text-blue-700">{formData.insurance_company}</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
 
          <div className="space-y-4 mt-4">
             <div className="flex items-center gap-6">
                <span className="font-bold">2) Whether patient opted for Eligible Room Category under Policy:</span>
                <div className="flex gap-4 font-black">
                   <span className="border border-black px-2 py-0.5">Yes</span>
                   <span className="border border-black px-2 py-0.5">No</span>
                </div>
             </div>
             
             <div className="space-y-2">
                <span className="font-bold">3) In case, policyholder wishes to avail better facility:</span>
                <div className="pl-4 space-y-2">
                   <div className="flex items-end">
                      <span className="font-bold mr-2">Name of the Additional Facility/ Provision/ Procedure/ Treatment:</span>
                      <span className="border-b border-dotted border-black flex-1"></span>
                   </div>
                   <div className="flex items-end">
                      <span className="border-b border-dotted border-black flex-[2]"></span>
                      <span className="font-bold mx-2">which costs Rs :</span>
                      <span className="border-b border-dotted border-black flex-1"></span>
                   </div>
                   <div className="flex items-end">
                      <span className="font-bold mr-2">(In words:</span>
                      <span className="border-b border-dotted border-black flex-1"></span>
                      <span className="font-bold ml-1">) only.</span>
                   </div>
                </div>
             </div>
          </div>
 
          <div className="text-justify leading-relaxed mt-4 space-y-3">
             <p>On my own option, I wish to avail above better facility and I hereby agree to pay on my free will, after being explained in detail by the Hospital authority in my own and understandable language about the above mentioned Additional Facility/Procedure/Treatment and associated cost of it, which is over and above the agreed PPN tariff. Further, if I opt to go for final bill reimbursement with insurance company, respective insurance company will reimburse only as per agreed PPN tariff rates and balance amount will be borne by myself or patient only.</p>
             <p>I have also been explained that when room service of a category better than eligible room rent is availed by the patient, not only the difference in room rent but also an equal proportion of all other charges associated with the treatment shall be borne by me.</p>
          </div>
 
          <div className="grid grid-cols-2 gap-20 pt-16">
             <div className="space-y-6">
                <div className="flex items-end">
                   <span className="font-bold mr-2">Signature :</span>
                   <span className="border-b border-dotted border-black flex-1"></span>
                </div>
                <div className="flex items-end">
                   <span className="font-bold mr-2">Name of the Patient/Patient’s attendant:</span>
                   <span className="border-b border-dotted border-black flex-1"></span>
                </div>
             </div>
             <div className="space-y-6">
                <div className="flex items-end">
                   <span className="font-bold mr-2">Signature :</span>
                   <span className="border-b border-dotted border-black flex-1"></span>
                </div>
                <div className="flex items-end">
                   <span className="font-bold mr-2">Name of the Hospital Representative & Hospital Seal :</span>
                   <span className="border-b border-dotted border-black flex-1"></span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
 };

const GenericIrdaiTemplate: React.FC<GenericIrdaiTemplateProps> = ({ formData }) => {
  const PSU_INSURERS = [
    "The New India Assurance Co. Ltd",
    "The Oriental Insurance Co. Ltd.",
    "United India Insurance Co. Ltd.",
    "National Insurance Co. Ltd."
  ];

  const showPPNForm = PSU_INSURERS.some(insurer => 
    (formData.insurance_company || '').toLowerCase().includes(insurer.toLowerCase())
  );

  return (
    <div className="bg-slate-200 p-4 lg:p-12 space-y-12 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-12 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-12 font-sans leading-none print:min-h-[297mm] flex flex-col overflow-hidden relative">
        <div className="text-center mb-10">
           <h1 className="text-[13px] font-black text-slate-800 uppercase leading-none mb-1 tracking-tight">REQUEST FOR CASHLESS HOSPITALISATION FOR HEALTH INSURANCE</h1>
           <h2 className="text-[12px] font-black text-slate-800 uppercase underline decoration-2 underline-offset-4">POLICY PART - C (Revised)</h2>
           <p className="text-[8px] font-black text-slate-400 mt-2 uppercase tracking-widest">(TO BE FILLED IN BLOCK LETTERS)</p>
        </div>

        <SectionHeader>DETAILS OF THE THIRD PARTY ADMINISTRATOR/ INSURER/ HOSPITAL</SectionHeader>
        
        <div className="space-y-3 mb-6">
           <DashedLineField label="a. Name of TPA / Insurance company:" value={formData.tpa_provider || formData.insurance_company || ''} />
           <div className="grid grid-cols-2 gap-10">
              <DashedLineField label="b. Toll free phone number:" value="" />
              <DashedLineField label="c. Toll free fax:" value="" />
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
                 <span className="border-b border-dashed border-slate-400 w-12 text-center font-black text-[10px] text-blue-700">{formData.p_age_y}</span>
                 <span className="text-[8px] font-bold text-slate-400 pb-1 uppercase">Years</span>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-10">
              <DashedLineField label="D. Date of Birth:" value={formatDate(formData.p_dob)} subLabel="(DD/MM/YYYY)" />
              <DashedLineField label="E. Contact number:" value={formData.p_contact || ''} />
           </div>
           <DashedLineField label="F. Contact number of attending Relative:" value={formData.p_relative_contact || ''} />
           <DashedLineField label="G. Insured Card ID number:" value={formData.p_card_id || ''} />
           <div className="grid grid-cols-2 gap-10">
              <DashedLineField label="H. Policy number / Name of Corporate:" value={`${formData.p_policy_no || ''}${formData.corporate_name ? ' / ' + formData.corporate_name : ''}`} />
              <DashedLineField label="I. Employee ID:" value={formData.p_employee_id || ''} />
           </div>

           <div className="flex items-center space-x-10 mt-2">
              <span className="text-[9px] font-bold uppercase">J. Currently do you have any other mediclaim / health insurance:</span>
              <BoxCheckbox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <BoxCheckbox label="No" checked={formData.p_other_insurance === 'No'} />
           </div>
           <DashedLineField label="Company Name:" value={formData.p_other_insurer_name || ''} className="pl-10" />

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
      <div className="bg-white p-12 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-12 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden relative">
        <SectionHeader>TO BE FILLED BY TREATING DOCTOR/HOSPITAL</SectionHeader>
        
        <div className="space-y-4 pt-4 flex-1">
           <DashedLineField label="A. Name of the treating Doctor:" value={formData.dr_name || ''} />
           <DashedLineField label="B. Contact number:" value={formData.dr_contact || ''} />
           <DashedLineField label="C. Nature of Illness / Disease with presenting complaint:" value={formData.m_illness || ''} />
           <DashedLineField label="D. Relevant Critical Findings:" value={formData.m_clinical_findings || ''} />
           
           <div className="flex items-end gap-10">
              <div className="flex items-end flex-1 space-x-2">
                 <span className="text-[9px] font-bold uppercase pb-1">E. Duration:</span>
                 <span className="border-b border-dashed border-slate-400 w-12 text-center font-black text-[10px] text-blue-700">{formData.m_duration}</span>
                 <span className="text-[8px] font-bold text-slate-400 pb-1 uppercase">Days</span>
              </div>
              <DashedLineField label="i. Date of First consultation:" value={formatDate(formData.m_first_cons_date)} subLabel="(DD/MM/YYYY)" className="flex-1" />
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
                       <span className="text-[10px] font-black text-blue-700">( {formData.m_treatment_type === item.key ? '✓' : ' '} )</span>
                    </div>
                 ))}
              </div>
           </div>

           <DashedLineField label="i. Route of Drug Administration :" value={formData.m_route_drug || ''} className="mt-4" />
           <DashedLineField label="I. If surgical, name of surgery" value={formData.m_surgery_name || ''} />
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
                 <DashedLineField label="ii. Date of Injury:" value={formData.m_rta_date || ''} subLabel="(DD/MM/YYYY)" />
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold w-24 uppercase">iii. Report to Police:</span>
                    <BoxCheckbox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                    <BoxCheckbox label="No" checked={formData.m_rta_police === 'No'} />
                 </div>
                 <DashedLineField label="iv. FIR NO:" value={formData.m_fir_no || ''} />
                 <div className="flex items-center space-x-10">
                    <span className="text-[9px] font-bold uppercase">v. Injury / Disease caused due to substance abuse / alcohol consumption:</span>
                    <BoxCheckbox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                    <BoxCheckbox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-10 mt-6">
              <div className="flex items-center space-x-4">
                 <span className="text-[9px] font-bold uppercase">M. In case of Maternity:</span>
                 <div className="flex border border-black"><div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">G: {formData.m_mat_g || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">P: {formData.m_mat_p || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">L: {formData.m_mat_l || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center text-[9px] font-bold">A: {formData.m_mat_a || '0'}</div></div>
              </div>
              <DashedLineField label="i. expected date of Delivery" value={formData.m_mat_edd ? formatDate(formData.m_mat_edd) : ''} subLabel="(DD/MM/YYYY)" className="flex-1" />
           </div>
        </div>

        <PageFooter page={2} />
      </div>

      {/* PAGE 3 */}
      <div className="bg-white p-12 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-12 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden relative">
        <SectionHeader>DETAILS OF PATIENT ADMITTED</SectionHeader>
        
        <div className="space-y-4 pt-4 flex-1">
           <div className="grid grid-cols-2 gap-10">
              <DashedLineField label="A. Date of admission:" value={formData.adm_date || ''} subLabel="(DD/MM/YYYY)" />
              <DashedLineField label="B. Time of admission:" value={formData.adm_time || ''} subLabel="(HH:MM)" />
           </div>

           <div className="flex items-center gap-12 mt-2">
              <span className="text-[8.5px] font-bold uppercase">C. Is this an emergency/planned hospitalization event:</span>
              <div className="flex space-x-6">
                <BoxCheckbox label="Emergency" checked={formData.adm_type === 'Emergency'} />
                <BoxCheckbox label="Planned" checked={formData.adm_type === 'Planned'} />
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
              <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Estimated Cost Breakdown (INR)</p>
              {[
                 { label: "H. Per day room rent + nursing and service charges+ patients diet:", id: "cost_room_rent" },
                 { label: "I. Expected cost of investigation + diagnostic:", id: "cost_investigation" },
                 { label: "J. ICU charges:", id: "cost_icu" },
                 { label: "K. OT charges:", id: "cost_ot" },
                 { label: "L. Professional fees Surgeon + Anesthetist Fees + Consultation Charges:", id: "cost_prof_fees" },
                 { label: "M. Medicines + Consumables + Cost of Implants (if applicable):", id: "cost_medicines" },
                 { label: "N. Other hospital expenses if any:", id: "cost_other" },
                 { label: "O. All-inclusive package charges if any applicable:", id: "cost_package" },
                 { label: "P. Sum Total expected cost of hospitalization:", id: "adm_total_cost", bold: true },
              ].map((item, idx) => (
                 <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                    <span className={`text-[7.5px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                    <div className="flex items-center">
                       <span className="text-[8.5px] mr-1 font-black">Rs.</span>
                       <span className="border-b border-black w-24 text-right pr-1 text-[10px] font-black text-blue-700">{Number(formData[item.id] || 0).toLocaleString()}</span>
                    </div>
                 </div>
              ))}
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
              <DashedLineField label="Date:" value={new Date().toLocaleDateString()} />
              <DashedLineField label="Time" value={new Date().toLocaleTimeString()} />
           </div>
        </section>

        <PageFooter page={4} />
      </div>

      {/* Conditionally Render PPN Network Page for PSU Insurers */}
      {showPPNForm && <PPNNetworkPage formData={formData} />}

    </div>
  );
};

export default GenericIrdaiTemplate;
