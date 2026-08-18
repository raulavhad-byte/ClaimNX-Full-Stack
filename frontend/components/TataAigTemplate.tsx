
import React from 'react';
import { formatDate, parseDate } from '../utils';

interface TataAigTemplateProps {
  formData: Record<string, any>;
}

const TataAigTemplate: React.FC<TataAigTemplateProps> = ({ formData }) => {
  // Added React.FC type to support 'key' prop and ensure proper type checking
  const GridInput: React.FC<{ label?: string, value: string, length?: number, className?: string }> = ({ label, value, length = 20, className = "" }) => {
    const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
    return (
      <div className={`flex flex-col ${className}`}>
        {label && <span className="text-[7px] font-bold text-slate-500 uppercase mb-0.5">{label}</span>}
        <div className="flex flex-nowrap border-l border-t border-black">
          {chars.map((char, i) => (
            <div key={i} className="w-[11px] h-[12px] shrink-0 border-r border-b border-black flex items-center justify-center text-[7px] font-black text-[#00338d] bg-white">
              {char === ' ' ? '' : char}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Added React.FC type to support 'key' prop
  const DateGrid: React.FC<{ label?: string, value: string, format?: "DDMMYYYY" | "YYMMDD" }> = ({ label, value, format = "DDMMYYYY" }) => {
    const d = parseDate(value);
    let sequence: string[] = [];
    
    if (isNaN(d.getTime())) {
       sequence = format === "DDMMYYYY" ? [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '] : [' ', ' ', ' ', ' ', ' ', ' '];
    } else if (format === "DDMMYYYY") {
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString();
      sequence = [...day.split(''), ...month.split(''), ...year.split('')];
    } else {
      const year = d.getFullYear().toString().slice(-2);
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      sequence = [...year.split(''), ...month.split(''), ...day.split('')];
    }

    return (
      <div className="flex flex-col">
        {label && <span className="text-[7px] font-bold text-slate-500 uppercase mb-0.5">{label}</span>}
        <div className="flex">
          {sequence.map((char, i) => (
            <div key={i} className="w-[11px] h-[12px] shrink-0 border-l border-t border-r border-b border-black flex items-center justify-center text-[7px] font-black text-[#00338d]">
              {char}
            </div>
          ))}
        </div>
        <div className="flex text-[5px] font-bold text-slate-400 mt-0.5">
          {format === "DDMMYYYY" ? (
            <>
              <span className="w-[22px] text-center">D D</span>
              <span className="w-[22px] text-center">M M</span>
              <span className="w-[44px] text-center">Y Y Y Y</span>
            </>
          ) : (
            <>
              <span className="w-[22px] text-center">Y Y</span>
              <span className="w-[22px] text-center">M M</span>
              <span className="w-[22px] text-center">D D</span>
            </>
          )}
        </div>
      </div>
    );
  };

  // Added React.FC type to support 'key' prop and fixed parameter types
  const UnderlineField: React.FC<{ label: string, value: string, className?: string }> = ({ label, value, className = "" }) => (
    <div className={`flex items-end border-b border-black pb-0.5 ${className}`}>
      <span className="text-[8px] font-bold text-black whitespace-nowrap mr-2">{label}</span>
      <span className="text-[8px] font-black text-[#00338d] uppercase flex-1">{value}</span>
    </div>
  );

  // Added React.FC type to support 'key' prop
  const TickBox: React.FC<{ label: string, checked: boolean }> = ({ label, checked }) => (
    <div className="flex items-center space-x-1">
      <div className={`w-[10px] h-[10px] border border-black flex items-center justify-center`}>
        {checked && <div className="w-[6px] h-[6px] bg-black"></div>}
      </div>
      <span className="text-[7px] font-bold text-black uppercase">{label}</span>
    </div>
  );

  return (
    <div className="bg-slate-100 p-4 lg:p-8 space-y-8 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-6 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-6 font-sans leading-none print:min-h-[297mm]">
        <div className="flex justify-between items-start mb-6">
           <div className="flex-1 pt-4">
              <h1 className="text-[12px] font-black text-[#00338d] uppercase text-center">
                REQUEST FOR CASHLESS HOSPITALISATION FOR<br/>HEALTH INSURANCE POLICY PART - C
              </h1>
           </div>
           <div className="w-20 text-right">
              <div className="border-[3px] border-[#00338d] p-0.5 inline-block">
                 <div className="bg-[#00338d] text-white p-1 text-[8px] font-black text-center leading-none">
                    TATA<br/>AIG<br/><span className="text-[5px]">INSURANCE</span>
                 </div>
              </div>
              <p className="text-[5px] font-black text-[#00338d] uppercase mt-0.5">WITH YOU ALWAYS</p>
           </div>
        </div>

        <div className="text-center mb-4 space-y-0.5">
           <p className="text-[7px] font-bold italic text-slate-500">(TO BE FILLED IN BLOCK LETTERS)</p>
           <p className="text-[8px] font-black uppercase text-black tracking-widest">DETAILS OF THE THIRD PARTY ADMINISTRATOR/INSURER/HOSPITAL</p>
        </div>

        <div className="space-y-3 mb-6">
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-2">a. Name of Insurance Company:</span>
              <GridInput value={formData.insurance_company || 'TATA AIG GENERAL INSURANCE CO. LTD.'} length={50} className="flex-1" />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-2">b. Name of Hospital:</span>
              <GridInput value={formData.hosp_name || ''} length={50} className="flex-1" />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-2">c. Phone number:</span>
              <GridInput value={formData.hosp_mobile || formData.mobileNo || ''} length={15} />
              <span className="text-[7px] font-bold w-20 pt-2 ml-4">d. Extension No.:</span>
              <GridInput value="" length={10} />
           </div>
           <div className="flex items-start pl-4">
              <span className="text-[7px] font-bold w-28 pt-2">i. Address:</span>
              <GridInput value={formData.hosp_address || formData.address || ''} length={50} className="flex-1" />
           </div>
           <div className="flex items-start pl-4">
              <span className="text-[7px] font-bold w-28 pt-2">ii. Rohini ID:</span>
              <GridInput value={formData.hosp_rohini_id || formData.rohiniId || ''} length={15} />
              <span className="text-[7px] font-bold w-20 pt-2 ml-4">iii. e-mail id:</span>
              <GridInput value={formData.hosp_email || formData.emailId || ''} length={30} />
           </div>
        </div>

        <div className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase mb-3 w-fit">
          TO BE FILLED BY INSURED/PATIENT
        </div>

        <div className="space-y-3 mb-6">
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-2">A. Name of the Patient:</span>
              <GridInput label="First Name" value={formData.p_name?.split(' ')[0] || ''} length={15} />
              <GridInput label="Middle Name" value={formData.p_name?.split(' ')[1] || ''} length={15} className="ml-1" />
              <GridInput label="Surname" value={formData.p_name?.split(' ')[2] || ''} length={15} className="ml-1" />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-20">B. Gender:</span>
              <div className="flex space-x-3 w-40">
                <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                <TickBox label="Female" checked={formData.p_gender === 'Female'} />
                <TickBox label="Third Gender" checked={formData.p_gender === 'Third Gender'} />
              </div>
              <span className="text-[7px] font-bold mr-2 ml-4">C. Age:</span>
              <DateGrid value={formData.p_age_y ? `2000-01-01` : ''} format="YYMMDD" />
              <span className="text-[7px] font-bold mr-2 ml-4">D. Date of Birth:</span>
              <DateGrid value={formData.p_dob} />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">E. Contact number:</span>
              <GridInput value={formData.p_contact || ''} length={15} />
              <span className="text-[7px] font-bold w-40 pt-1 ml-4">F. Contact number of attending Relative:</span>
              <GridInput value={formData.p_relative_contact || ''} length={15} />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">G. Member / UHID No.:</span>
              <GridInput value={formData.p_uhid || ''} length={20} />
              <span className="text-[7px] font-bold w-40 pt-1 ml-4">H. Policy number/Name of Corporate:</span>
              <GridInput value={formData.p_policy_no || ''} length={30} />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">I. Employee ID:</span>
              <GridInput value={formData.p_employee_id || ''} length={20} />
           </div>
           <div className="flex items-center space-x-6">
              <span className="text-[7px] font-bold">J. Currently do you have any other mediclaim/health insurance:</span>
              <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
           </div>
           <div className="flex items-start pl-4">
              <span className="text-[7px] font-bold w-28 pt-1">i. Company Name:</span>
              <GridInput value={formData.p_other_insurer_name || ''} length={50} />
           </div>
           <div className="flex items-start pl-4">
              <span className="text-[7px] font-bold w-28 pt-1">ii. Give Details:</span>
              <GridInput value="" length={50} />
           </div>
           <div className="flex items-center space-x-6">
              <span className="text-[7px] font-bold">K. Do you have a family Physician:</span>
              <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
              <TickBox label="No" checked={formData.p_family_physician === 'No'} />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">L. Name of the Family Physician:</span>
              <GridInput value={formData.p_family_physician_name || ''} length={50} />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">M. Contact number, if any:</span>
              <GridInput value={formData.p_family_physician_contact || ''} length={15} />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">N. Current Address of Insured Patient:</span>
              <GridInput value={formData.p_address || ''} length={50} />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">O. Occupation of Insured Patient:</span>
              <GridInput value={formData.p_occupation || ''} length={50} />
           </div>
        </div>

        <div className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase mb-3 w-fit">
          TO BE FILLED BY TREATING DOCTOR/HOSPITAL
        </div>

        <div className="space-y-2.5">
           <UnderlineField label="A. Name of the treating Doctor:" value={formData.dr_name || ''} />
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">B. Contact number:</span>
              <GridInput value={formData.dr_contact || ''} length={15} />
           </div>
           <UnderlineField label="C. Nature of Illness/Disease with presenting complaint:" value={formData.m_illness || ''} />
           <UnderlineField label="D. Relevant Critical Findings:" value={formData.m_clinical_findings || ''} />
           <div className="flex items-start">
              <span className="text-[7px] font-bold mr-4 pt-1">E. Duration of the present ailment:</span>
              <DateGrid value="" format="YYMMDD" />
              <span className="text-[7px] font-bold ml-6 mr-4 pt-1">i. Date of First consultation:</span>
              <DateGrid value={formData.m_first_cons_date} />
           </div>
           <UnderlineField label="ii. Past history of present ailment, if any:" value="" />
           <UnderlineField label="F. Provisional diagnosis:" value={formData.m_prov_diag || ''} />
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">i. ICD 10 code:</span>
              <GridInput value={formData.m_icd_code || ''} length={15} />
           </div>
           <div className="flex items-start">
              <span className="text-[7px] font-bold w-32 pt-1">G. Proposed line of treatment:</span>
              <div className="grid grid-cols-3 gap-2 flex-1">
                 <TickBox label="i. Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
                 <TickBox label="ii. Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
                 <TickBox label="iii. Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
                 <TickBox label="iv. Investigation" checked={formData.m_treatment_type === 'Investigation'} />
                 <TickBox label="v. Non-allopathic treatment" checked={false} />
              </div>
           </div>
        </div>

        <div className="mt-4 text-right">
           <span className="text-[6px] font-bold text-slate-400">Page 1 of 4</span>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-6 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-6 font-sans leading-none print:min-h-[297mm] print:break-before-page">
        <div className="space-y-2.5 mb-6">
           <UnderlineField label="H. If investigation and/or Medical Management provide" value="" />
           <UnderlineField label="i. Route of Drug Administration" value={formData.m_route_drug || ''} className="pl-4" />
           <UnderlineField label="I. If surgical, name of surgery" value={formData.m_surgery_name || ''} />
           <div className="flex items-start pl-4">
              <span className="text-[7px] font-bold w-32 pt-1">i. ICD 10 PCS code:</span>
              <GridInput value={formData.m_icd_code || ''} length={15} />
           </div>
           <UnderlineField label="J. If other treatment, provide details" value="" />
           <UnderlineField label="K. How did injury occur" value="" />
           <div className="space-y-1">
              <span className="text-[7px] font-bold">L. In case of accident</span>
              <div className="grid grid-cols-2 gap-4 pl-4">
                 <div className="flex items-center space-x-6">
                    <span className="text-[7px] font-bold w-24">i. Is it RTA:</span>
                    <TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                    <TickBox label="No" checked={formData.m_is_rta === 'No'} />
                 </div>
                 <div className="flex items-center space-x-4">
                    <span className="text-[7px] font-bold">ii. Date of Injury:</span>
                    <DateGrid value={formData.m_rta_date} />
                 </div>
                 <div className="flex items-center space-x-6">
                    <span className="text-[7px] font-bold w-24">iii. Report to Police:</span>
                    <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                    <TickBox label="No" checked={formData.m_rta_police === 'No'} />
                 </div>
                 <UnderlineField label="iv. FIR NO" value={formData.m_fir_no || ''} />
                 <div className="flex items-center space-x-6">
                    <span className="text-[7px] font-bold">v. Injury /Disease caused due to substance abuse/alcohol consumption:</span>
                    <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                    <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
                 <div className="flex items-center space-x-6">
                    <span className="text-[7px] font-bold">vi. Test conducted to establish this (if yes, attach report):</span>
                    <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                    <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
                 </div>
              </div>
           </div>
           <div className="space-y-1">
              <div className="flex items-center space-x-4">
                 <span className="text-[7px] font-bold">M. In case of Maternity</span>
                 <div className="flex space-x-2">
                    {['G','P','L','A'].map(l => <div key={l} className="flex items-center border border-black px-1 text-[7px] font-black">{l}</div>)}
                 </div>
              </div>
              <div className="flex items-center space-x-4 pl-4">
                 <span className="text-[7px] font-bold">i. Expected date of Delivery:</span>
                 <DateGrid value="" />
              </div>
           </div>
        </div>

        <div className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase mb-3 w-fit">
          DETAILS OF PATIENT ADMITTED
        </div>

        <div className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-4">
                 <span className="text-[7px] font-bold">A. Date of admission:</span>
                 <DateGrid value={formData.adm_date} />
              </div>
              <div className="flex items-center space-x-4">
                 <span className="text-[7px] font-bold">B. Time of admission:</span>
                 <div className="flex border border-black">
                    <div className="w-[12px] h-[12px] border-r border-black flex items-center justify-center text-[7px] font-black">{formData.adm_time?.split(':')[0] || '  '}</div>
                    <div className="w-[12px] h-[12px] flex items-center justify-center text-[7px] font-black">{formData.adm_time?.split(':')[1] || '  '}</div>
                 </div>
                 <span className="text-[6px] font-bold">H H : M M</span>
              </div>
           </div>
           <div className="flex items-center space-x-8">
              <span className="text-[7px] font-bold">C. Is this an emergency/planned hospitalization event:</span>
              <TickBox label="Emergency" checked={false} />
              <TickBox label="Planned" checked={true} />
           </div>

           <div className="space-y-1">
              <span className="text-[7px] font-bold uppercase">D. Mandatory Past History of any chronic illness if yes (Since month/year)</span>
              <div className="grid grid-cols-1 gap-1.5 pl-4">
                 {[
                   "i. Diabetes", "ii. Heart disease", "iii. Hypertension", "iv. Hyperlipidemias", 
                   "v. Osteoarthritis", "vi. Asthma/COPD/Bronchitis", "vii. Cancer", 
                   "viii. Alcohol/Drug abuse", "ix. Any HIV/or STD Related ailment", "x. Any other ailment, give details"
                 ].map((ill, i) => (
                    // Explicitly cast value to string to fix TypeScript any vs string mismatch
                    <UnderlineField key={i} label={ill} value={String(formData[`m_chronic_${ill.split(' ')[1].toLowerCase()}_since`] || '')} />
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <UnderlineField label="E. Expected number of Days/stay in hospital:" value={`${formData.adm_stay_days || ''} Days`} />
              <UnderlineField label="F. Days in ICU:" value="" />
           </div>
           <UnderlineField label="G. Room Type" value={formData.adm_room_type || ''} />

           <div className="space-y-1 mt-4">
              {[
                { label: "H. Per day room rent + nursing and service charges + patients diet", id: 'cost_room_rent' },
                { label: "I. Expected cost of investigation + diagnostic", id: 'cost_investigation' },
                { label: "J. ICU charges", id: 'cost_icu' },
                { label: "K. OT charges", id: 'cost_ot' },
                { label: "L. Professional fees Surgeon +Anesthetist Fees +consultation Charges", id: 'cost_prof_fees' },
                { label: "M. Medicines + Consumables + Cost of Implants (if applicable please specify)", id: 'cost_medicines' },
                { label: "N. Other hospital expenses if any", id: 'cost_other' },
                { label: "O. All-inclusive package charges if any applicable", id: 'cost_package' },
                { label: "P. Sum Total expected cost of hospitalization", id: 'adm_total_cost', bold: true },
              ].map(item => (
                <div key={item.id} className={`flex items-end border-b border-slate-200 pb-0.5 ${item.bold ? 'border-black' : ''}`}>
                   <span className={`text-[7px] font-bold ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                   <div className="flex-1 text-right pr-4 text-[7px] font-black">Rs.</div>
                   <span className="text-[7px] font-black text-black w-24 text-right">{Number(formData[item.id] || 0).toLocaleString()}</span>
                </div>
              ))}
           </div>
        </div>

        <div className="mt-4 text-right">
           <span className="text-[6px] font-bold text-slate-400">Page 2 of 4</span>
        </div>
      </div>

      {/* PAGE 3 */}
      <div className="bg-white p-6 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-6 font-sans leading-none print:min-h-[297mm] print:break-before-page">
        <div className="space-y-4">
           <div className="space-y-1">
              <h3 className="text-[8px] font-black uppercase underline">DECLARATION</h3>
              <p className="text-[7px] font-bold italic">(Please read very carefully)</p>
              <p className="text-[7px] font-bold">We confirm having read understood and agreed to the Declarations of this form</p>
           </div>
           
           <div className="space-y-2">
              <UnderlineField label="a. Name of the treating doctor" value={formData.dr_name || ''} />
              <UnderlineField label="b. Qualification" value="MBBS, MD" />
              <UnderlineField label="c. Registration number with State code" value={formData.registrationNo || ''} />
           </div>

           <div className="grid grid-cols-2 gap-10 mt-6">
              <div className="border border-black p-8 h-20 relative flex items-center justify-center">
                 <span className="absolute top-1 left-1 text-[5px] font-bold uppercase text-slate-400">Hospital Seal (Must include Hospital ID)</span>
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} alt="Seal" className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
              </div>
              <div className="border border-black p-8 h-20 relative flex items-center justify-center">
                 <span className="absolute top-1 left-1 text-[5px] font-bold uppercase text-slate-400">Patient/Insured Name and Sign</span>
              </div>
           </div>

           <div className="space-y-2 mt-6">
              <h3 className="text-[8px] font-black uppercase underline">DECLARATION BY THE PATIENT I REPRESENTATIVE</h3>
              <div className="space-y-1 text-[6.5px] text-justify leading-tight">
                 <p>a. I agrees to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer/T.P.A after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
                 <p>b. Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer /TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
                 <p>c. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer/T.P.A not governed by the terms and conditions of the policy will be paid by me.</p>
                 <p>d. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the Insurer / T.P.A</p>
                 <p>e. I agree and understand that T.P.A is in no way warranting the service of the hospital & that the Insurer /TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
                 <p>f. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
                 <p>g. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer / T.P.A.</p>
                 <p>h. "I/We authorize Insurance Company/TPA to contact me/us through mobile/email for any update on this claim".</p>
              </div>
           </div>

           <div className="space-y-2 mt-4">
              <UnderlineField label="a) Patient's / Insured's Name:" value={formData.p_name || ''} />
              <UnderlineField label="b) Contact number:" value={formData.p_contact || ''} />
              <UnderlineField label="c) e-mail Id (optional):" value="" />
              <UnderlineField label="d) Patient's / Insured's Signature:" value="" />
           </div>

           <div className="grid grid-cols-2 gap-4 mt-2">
              <UnderlineField label="Date:" value={new Date().toLocaleDateString()} />
              <UnderlineField label="Time:" value={new Date().toLocaleTimeString()} />
           </div>

           <div className="space-y-2 mt-6">
              <h3 className="text-[8px] font-black uppercase underline">HOSPITAL DECLARATION</h3>
              <div className="space-y-1 text-[6.5px] text-justify leading-tight">
                 <p>a. We have no objection to any authorized TPA /Insurance Company official verifying documents pertaining to hospitalization.</p>
                 <p>b. All valid original documents duly countersigned by the insured/patient as per the checklist below will be sent to TPA / Insurance Company within 7 days of the patient's discharge.</p>
                 <p>c. We agree that TPA / Insurance Company will not be liable to make the payment in the between the facts in this form and discharge summary or other documents</p>
                 <p>d. The patient declaration has been signed by the patient or by his representative in our presence.</p>
                 <p>e. We agree to provide clarifications for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications</p>
                 <p>f. We will abide by the terms and conditions agreed in the MOU.</p>
                 <p>g. We confirm that no additional amount would be collected from the insured in excess of Agreed Package Rates except costs towards non admissible amounts (including additional charges due to opting higher room rent than eligibility/choosing separate line of treatment which is not envisaged/considered in package).</p>
                 <p>h. We confirm that no recoveries would be made from the deposit amount collected from the Insured except for costs towards non-admissible amounts (including additional charges due to opting higher room rent than eligibility/ choosing separate line of treatment which is not envisaged/considered in package).</p>
                 <p>i. In the event of unauthorized recovery of any additional amount from the Insured in excess of Agreed Package Rates, the authorized TPA /Insurance Company reserves the right to recover the same from us (the Network Provider) and/or take necessary action, as provided under the MoU or applicable laws.</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-10 mt-6">
              <div className="border border-black p-8 h-20 relative flex items-center justify-center">
                 <span className="absolute top-1 left-1 text-[5px] font-bold uppercase text-slate-400">Hospital Seal</span>
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} alt="Hospital Seal" className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
              </div>
              <div className="border border-black p-8 h-20 relative flex items-center justify-center">
                 <span className="absolute top-1 left-1 text-[5px] font-bold uppercase text-slate-400">Doctor's Signature</span>
                 {formData.doctorStamp && <img src={formData.doctorStamp} alt="Doctor Stamp" className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 mt-2">
              <UnderlineField label="Date:" value={new Date().toLocaleDateString()} />
              <UnderlineField label="Time:" value={new Date().toLocaleTimeString()} />
           </div>

           <div className="mt-8 border-t border-black pt-2 text-center">
              <p className="text-[7.5px] font-black text-[#00338d] uppercase">Tata AIG General Insurance Company Limited</p>
              <p className="text-[5.5px] text-slate-600 mt-1">
                Registered Office: Peninsula Business Park, Tower A, 15th Floor, G. K. Marg, Lower Parel, Mumbai - 400 013.<br/>
                24X7 Toll Free No: 1800 266 7780 or 1800 22 9966 (For Senior Citizens) Fax: 022-6693 8170 Email: customersupport@tataaig.com<br/>
                Website: www.tataaig.com IRDA of India Registration No.: 108 CIN: U85110MH2000PLC128425
              </p>
           </div>
        </div>

        <div className="mt-2 text-right">
           <span className="text-[6px] font-bold text-slate-400">Page 3 of 3</span>
        </div>
      </div>
    </div>
  );
};

export default TataAigTemplate;
