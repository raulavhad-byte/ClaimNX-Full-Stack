
import React from 'react';
import { formatDate } from '../utils';

interface RelianceGeneralTemplateProps {
  formData: Record<string, any>;
}

const CharacterGrid: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-bold text-slate-500 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-[#00529b]">
        {chars.map((char, i) => (
<div key={i} className="w-[11.5px] h-[13px] shrink-0 border-r border-b border-[#00529b] flex items-center justify-center text-[9px] font-black text-[#00338d] bg-white">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
    </div>
  );
};

// Added GridBox component to resolve missing reference errors
const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7px] font-bold text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-[#00529b] bg-white shrink-0">
        {chars.map((char, i) => (
<div key={i} className="w-[10.5px] h-[12px] shrink-0 border-r border-b border-[#00529b] flex items-center justify-center text-[8px] font-black text-[#00338d]">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[5.5px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
    </div>
  );
};

const UnderlineField: React.FC<{ label: string; value: string; className?: string; boldValue?: boolean }> = ({ label, value, className = "", boldValue = true }) => (
  <div className={`flex items-end border-b border-slate-300 pb-0.5 ${className}`}>
    <span className="text-[8.5px] font-bold text-slate-600 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className={`text-[9.5px] uppercase flex-1 truncate leading-none ${boldValue ? 'font-black text-[#00338d]' : 'font-medium text-[#00338d]'}`}>{value}</span>
  </div>
);

const Checkbox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-[#00529b] flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-[#00529b]"></div>}
    </div>
    <span className="text-[8.5px] font-bold text-black uppercase whitespace-nowrap leading-none">{label}</span>
  </div>
);

const SectionSidebar: React.FC<{ part: string; title: string }> = ({ part, title }) => (
  <div className="bg-[#1b3664] text-white w-10 shrink-0 flex flex-col items-center justify-center py-4 relative overflow-hidden">
    <div className="[writing-mode:vertical-lr] rotate-180 flex flex-col items-center space-y-2">
      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{part}</span>
      <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{title}</span>
    </div>
  </div>
);

const RelianceHeader: React.FC = () => (
  <div className="mb-4">
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <span className="text-3xl font-black text-[#00529b] tracking-tighter leading-none">RELIANCE</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[10px] font-black text-[#ed1c24] uppercase tracking-widest">GENERAL</span>
            <span className="text-[10px] font-black text-[#00529b] uppercase tracking-widest">INSURANCE</span>
          </div>
          <span className="text-[6px] font-bold text-[#00529b] uppercase tracking-[0.2em] mt-1">A RELIANCE CAPITAL COMPANY</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[14px] font-black text-[#00a9e0] tracking-tight leading-none">reliancegeneral.co.in</p>
        <p className="text-[20px] font-black text-[#00529b] tracking-tighter leading-none">1800 3009</p>
      </div>
    </div>
    <div className="bg-[#ed1c24] text-white text-center py-1.5 mt-4">
       <h1 className="text-[14px] font-black uppercase tracking-[0.2em]">PRE-AUTHORIZATION REQUEST FORM</h1>
    </div>
    <p className="text-[8px] font-bold text-[#ed1c24] mt-1 text-center italic">Please use Reliance Provider Portal to communicate with us - https://provider.reliancegeneral.co.in/</p>
  </div>
);

const RelianceGeneralTemplate: React.FC<RelianceGeneralTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <RelianceHeader />
        
        <div className="flex-1 space-y-1 border-l border-t border-r border-[#00529b]">
          
          {/* PART 1: INSURED DETAILS */}
          <div className="flex border-b border-[#00529b]">
            <SectionSidebar part="Part 1" title="Insured Details" />
            <div className="flex-1 p-3 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <CharacterGrid label="Insured Name:" value={formData.p_name || ''} length={40} className="flex-1" />
                <CharacterGrid label="Claim No:" value="" length={15} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <CharacterGrid label="Mobile No.:" value={formData.p_contact || ''} length={10} />
                <CharacterGrid label="Policy No.:" value={formData.p_policy_no || ''} length={20} className="flex-1" />
              </div>
              <UnderlineField label="E-mail Id:" value={formData.p_email || ''} />
              <div className="flex items-start justify-between gap-4">
                <CharacterGrid label="If Group Policy, Company Name:" value={formData.p_other_insurer_name || ''} length={30} className="flex-1" />
                <CharacterGrid label="Employee id:" value={formData.p_employee_id || ''} length={15} />
              </div>
              <div className="flex items-start justify-between gap-4">
                <CharacterGrid label="PAN No." value={formData.p_pan || ''} length={10} />
                <CharacterGrid label="UID Aadhar No." value={formData.p_aadhaar || ''} length={12} className="flex-1" />
              </div>
              <div className="flex items-center space-x-6">
                <span className="text-[7.5px] font-bold uppercase">Source of Funds:</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                   <Checkbox label="Business" checked={false} />
                   <Checkbox label="Profession" checked={false} />
                   <Checkbox label="Salary" checked={true} />
                   <Checkbox label="Agricultural Income" checked={false} />
                   <Checkbox label="Savings" checked={false} />
                   <Checkbox label="Others" checked={false} />
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <span className="text-[7.5px] font-bold uppercase">Monthly Income:</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                   <Checkbox label="Upto ₹ 20,000" checked={false} />
                   <Checkbox label="₹ 20,001 to ₹ 50,000" checked={true} />
                   <Checkbox label="₹ 50,001 to ₹ 1,00,000" checked={false} />
                   <Checkbox label="₹ 1,00,001 and above" checked={false} />
                </div>
              </div>
            </div>
          </div>

          {/* PART 2: PATIENT DETAILS */}
          <div className="flex border-b border-[#00529b]">
            <SectionSidebar part="Part 2" title="Patient Details" />
            <div className="flex-1 p-3 space-y-3">
              <CharacterGrid label="Patient Name:" value={formData.p_name || ''} length={40} />
              <div className="flex items-start gap-4">
                <CharacterGrid label="Patient UHID:" value={formData.p_uhid || ''} length={20} className="flex-1" />
                <div className="flex items-start gap-1">
                   <span className="text-[7.5px] font-bold pt-2">Age:</span>
                   <GridBox value={String(formData.p_age_y || '')} length={3} subLabel="yrs" />
                </div>
                <div className="flex items-start gap-1">
                   <span className="text-[7.5px] font-bold pt-2">DOB:</span>
                   <GridBox value={formData.p_dob ? formatDate(formData.p_dob).replace(/-/g, '') : ''} length={8} subLabel="dd/mm/yy" />
                </div>
                <div className="flex items-center space-x-3 pt-2">
                   <span className="text-[7.5px] font-bold uppercase">Gender:</span>
                   <Checkbox label="Male" checked={formData.p_gender === 'Male'} />
                   <Checkbox label="Female" checked={formData.p_gender === 'Female'} />
                </div>
              </div>
              <div className="flex items-start gap-4">
                 <CharacterGrid label="Patient Mobile No.:" value={formData.p_contact || ''} length={10} />
                 <UnderlineField label="Patient email id:" value={formData.p_email || ''} className="flex-1" />
              </div>
              <div className="flex items-center space-x-4">
                 <span className="text-[7.5px] font-bold uppercase">Relation with insured:</span>
                 <Checkbox label="Self" checked={true} />
                 <Checkbox label="Spouse" checked={false} />
                 <Checkbox label="Mother" checked={false} />
                 <Checkbox label="Father" checked={false} />
                 <Checkbox label="Son" checked={false} />
                 <Checkbox label="Daughter" checked={false} />
                 <UnderlineField label="Others" value="" className="flex-1" />
              </div>
              <UnderlineField label="Address:" value={formData.p_address || ''} />
              <div className="grid grid-cols-2 gap-8">
                 <UnderlineField label="District:" value={formData.p_district || ''} />
                 <div className="flex items-end gap-2">
                    <span className="text-[8px] font-bold pb-1 uppercase">Pin Code:</span>
                    <GridBox value={formData.p_pin || ''} length={6} />
                 </div>
              </div>
              <UnderlineField label="Attendant Name:" value="" />
              <div className="flex items-start gap-4">
                 <CharacterGrid label="Attendant mobile no.:" value="" length={10} />
                 <UnderlineField label="Attendant email id:" value="" className="flex-1" />
              </div>
            </div>
          </div>

          {/* PART 3: SERVICE PROVIDER DETAILS */}
          <div className="flex border-b border-[#00529b]">
            <SectionSidebar part="Part 3" title="Service Provider Details" />
            <div className="flex-1 p-3 space-y-3">
              <div className="flex items-start justify-between gap-4">
                 <UnderlineField label="Hospital Name:" value={formData.hosp_name || ''} className="flex-1" />
                 <CharacterGrid label="Hospital Code:" value="" length={12} />
              </div>
              <UnderlineField label="Hospital Address:" value={formData.hosp_address || ''} />
              <div className="flex justify-between items-end">
                 <UnderlineField label="District:" value={formData.hosp_district || ''} className="flex-1" />
                 <div className="flex items-end gap-2 ml-10">
                    <span className="text-[8px] font-bold pb-1 uppercase">Pin Code:</span>
                    <GridBox value={formData.hosp_pin || ''} length={6} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-0 border border-slate-300">
                 <div className="bg-slate-900 text-white text-[9px] font-black uppercase text-center py-1">Contact Details (Hospital Employee)</div>
                 <div className="bg-slate-900 text-white text-[9px] font-black uppercase text-center py-1 border-l border-white/20">Treating Doctor Detail</div>
                 <div className="p-3 border-r border-slate-300 space-y-3">
                    <UnderlineField label="Name:" value={formData.authorizedSignatory || ''} />
                    <UnderlineField label="Telephone no./Mobile no." value={formData.hosp_mobile || ''} />
                    <UnderlineField label="Fax No.:" value="" />
                    <UnderlineField label="E-mail Id:" value={formData.hosp_email || ''} />
                 </div>
                 <div className="p-3 space-y-3">
                    <UnderlineField label="Name: Dr." value={formData.dr_name || ''} />
                    <UnderlineField label="Qualification:" value="MBBS, MD" />
                    <UnderlineField label="Registration No.:" value={formData.registrationNo || ''} />
                    <UnderlineField label="Mobile No.:" value={formData.dr_contact || ''} />
                 </div>
              </div>
            </div>
          </div>

          {/* PART 4: CASE INFORMATION */}
          <div className="flex border-b border-[#00529b]">
            <SectionSidebar part="Part 4" title="Case Information (filled by treating doctor)" />
            <div className="flex-1 p-3 space-y-3">
              <UnderlineField label="Presenting Complaint" value={formData.m_illness || ''} />
              <div className="flex items-start gap-10">
                 <CharacterGrid label="Duration" value={String(formData.m_duration || '')} length={4} className="flex-1" />
                 <UnderlineField label="Date of first onset/Consult" value={formData.m_first_cons_date || ''} className="flex-1" />
              </div>
              <UnderlineField label="H/O of past illness related to present complaint" value="" />
              <UnderlineField label="Relevant Clinical findings" value={formData.m_clinical_findings || ''} />
              <UnderlineField label="Investigation findings" value="" />
              
              <div className="grid grid-cols-12 gap-6">
                 <div className="col-span-6 space-y-3">
                    <UnderlineField label="Provisional Diagnosis" value={formData.m_prov_diag || ''} />
                    <div className="flex items-center space-x-6">
                       <span className="text-[8px] font-bold uppercase">Treatment Plan:</span>
                       <Checkbox label="Medical" checked={formData.m_treatment_type === 'Medical Management'} />
                       <Checkbox label="Surgical" checked={formData.m_treatment_type === 'Surgical Management'} />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[8px] font-black uppercase border-b border-slate-300 w-fit">In case of Maternity</p>
                       <div className="flex items-center gap-4 text-[9px] font-bold">
                          <span>Obstetric History: G___ P___ L___ A___</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <UnderlineField label="LMP" value="" />
                          <UnderlineField label="EDD" value="" />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[8px] font-black uppercase border-b border-slate-300 w-fit">In case to Injury/RTA/Self Injury</p>
                       <div className="flex items-center space-x-6">
                          <span className="text-[8px] font-bold uppercase">Under Influence of Alcohol/Drug abuse</span>
                          <Checkbox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                          <Checkbox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                       </div>
                       <div className="flex items-center space-x-6">
                          <span className="text-[8px] font-bold uppercase">Attached Copy of</span>
                          <Checkbox label="MLC" checked={formData.m_rta_police === 'Yes'} />
                          <Checkbox label="FIR" checked={false} />
                          <Checkbox label="PI" checked={false} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <UnderlineField label="MLC/FIR Number:" value={formData.m_fir_no || ''} />
                          <UnderlineField label="Place:" value="" />
                       </div>
                    </div>
                 </div>
                 <div className="col-span-6 border-l border-slate-300 pl-4 space-y-1">
                    <div className="flex justify-between border-b border-slate-300 pb-0.5 mb-1">
                       <span className="text-[8px] font-black uppercase">Past Medical History</span>
                       <span className="text-[8px] font-black uppercase">Duration/Details</span>
                    </div>
                    {[
                      { l: "HTN", k: "hypertension" },
                      { l: "IHD/CAD", k: "heart" },
                      { l: "Diabetes", k: "diabetes" },
                      { l: "Asthma/COPD/TB", k: "asthma" },
                      { l: "Paralysis/CVA/Epilepsy", k: "stroke" },
                      { l: "Arthritis", k: "osteoarthritis" },
                      { l: "Cancer/Tumor/Cyst", k: "cancer" },
                      { l: "STD/HIV", k: "hiv" },
                      { l: "Alcohol/Drug abuse", k: "alcohol" },
                      { l: "Psychiatric condition", k: "" },
                      { l: "Others", k: "other" }
                    ].map(item => (
                      <div key={item.l} className="flex items-center gap-3">
                         <span className="text-[7.5px] font-bold w-32">{item.l}</span>
                         <div className="flex items-center space-x-1">
                            <div className="flex items-center space-x-1"><div className={`w-[8px] h-[8px] border border-black flex items-center justify-center`}>{formData[`m_chronic_${item.k}_status`] === 'Yes' && '✓'}</div><span className="text-[7px]">Y</span></div>
                            <div className="flex items-center space-x-1"><div className={`w-[8px] h-[8px] border border-black flex items-center justify-center`}>{formData[`m_chronic_${item.k}_status`] === 'No' && '✓'}</div><span className="text-[7px]">N</span></div>
                         </div>
                         <div className="flex-1 border-b border-dotted border-slate-300 h-4 font-black text-[8px] pl-2 uppercase">{formData[`m_chronic_${item.k}_since`] || ''}</div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between items-start text-[7px] font-bold text-slate-500 leading-tight">
          <div>
            <p className="font-black text-slate-800 uppercase tracking-widest">An ISO 9001:2008 Certified Company</p>
          </div>
          <div className="text-right max-w-[80%] uppercase">
            <p>RCare Health: Reliance General Insurance, No.1-89/3/B/40 to 42/ks/301, 3rd floor, Krishe Block, Krishe Sapphire, Madhapur, Hyderabad 500081.</p>
            <p>IRDAI Registration No. 103. Reliance General Insurance Company Limited. Registered Office: H Block, 1st Floor, Dhirubhai Ambani Knowledge City, Navi Mumbai - 400710.</p>
            <p>Corporate Office: Reliance Centre, South Wing, 4th Floor, Off. Western Express Highway, Santacruz (East), Mumbai - 400 055. CIN: U66030MH2000PLC128300.</p>
          </div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="flex-1 space-y-1 border border-[#00529b]">
           {/* PART 5: BILLING DETAILS */}
           <div className="flex border-b border-[#00529b]">
             <SectionSidebar part="Part 5" title="Billing details (filled by hospital)" />
             <div className="flex-1 p-4 space-y-4">
                <div className="flex items-start gap-8">
                   <div className="space-y-2">
                      <span className="text-[8.5px] font-bold uppercase">Room Type:</span>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                         <Checkbox label="Single AC" checked={formData.adm_room_type?.includes('Single AC')} />
                         <Checkbox label="Single NON AC" checked={formData.adm_room_type?.includes('NON AC')} />
                         <Checkbox label="Twin Sharing AC" checked={formData.adm_room_type?.includes('Twin')} />
                         <Checkbox label="Twin Sharing NON AC" checked={false} />
                         <Checkbox label="Multi-bed" checked={formData.adm_room_type?.includes('Multi')} />
                         <Checkbox label="Others" checked={false} />
                      </div>
                   </div>
                   <div className="flex-1 space-y-3">
                      <UnderlineField label="Hospital Room Name:" value={formData.adm_room_type || ''} />
                      <div className="flex items-center space-x-6">
                         <span className="text-[8px] font-bold uppercase">Type of Admission:</span>
                         <Checkbox label="Planned" checked={true} />
                         <Checkbox label="Emergency" checked={false} />
                      </div>
                      <div className="flex items-start gap-4">
                         <CharacterGrid label="Expected DOA:" value={formData.adm_date || ''} length={8} subLabel="dd/mm/yy" />
                         <div className="flex items-end gap-2">
                            <span className="text-[8px] font-bold pb-1 uppercase">Length of Stay:</span>
                            <GridBox value={String(formData.adm_stay_days || '')} length={3} />
                            <span className="text-[8px] font-bold pb-1 lowercase">Days</span>
                         </div>
                      </div>
                      <div className="flex items-center space-x-6">
                         <span className="text-[8px] font-bold uppercase">Package Rate:</span>
                         <Checkbox label="Yes" checked={!!formData.cost_package} />
                         <Checkbox label="No" checked={!formData.cost_package} />
                      </div>
                      <UnderlineField label="If Yes, Package Charges" value={formData.cost_package ? `₹${formData.cost_package.toLocaleString()}` : ''} />
                      <UnderlineField label="Implant Charges" value="" />
                      <UnderlineField label="Remarks (if Any)" value="" />
                   </div>
                   <div className="w-64 space-y-1 pt-4 border-l border-slate-200 pl-4">
                      <p className="text-[8.5px] font-black uppercase text-slate-400 mb-2">If Package not applicable,</p>
                      {[
                        { l: "Room Rent + Nursing Charges", id: "cost_room_rent" },
                        { l: "Surgeon/Assistant Surgeon Charges", id: "" },
                        { l: "Anesthesia/Anesthetist Charges", id: "" },
                        { l: "Operation theatre Charges", id: "cost_ot" },
                        { l: "Doctor's Visit Charges", id: "cost_prof_fees" },
                        { l: "Investigation Charges", id: "cost_investigation" },
                        { l: "Pharmacy Charges", id: "cost_medicines" },
                        { l: "Implant Cost(if any)", id: "" },
                        { l: "Total Cost of Hospitalization", id: "adm_total_cost", bold: true }
                      ].map(item => (
                        <div key={item.l} className={`flex items-end justify-between border-b border-slate-100 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                           <span className={`text-[7.5px] uppercase ${item.bold ? 'font-black' : 'font-bold text-slate-600'}`}>{item.l}</span>
                           <div className="border-b border-black w-20 min-h-[14px] text-[9px] font-black text-right pr-1">{formData[item.id] ? `₹${formData[item.id].toLocaleString()}` : ''}</div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           </div>

           {/* DECLARATION SECTION */}
           <div className="p-4 space-y-4">
              <p className="text-[7.5px] text-justify leading-tight text-slate-500 font-medium">
                 <span className="font-black text-slate-800">Please note:</span> In case the Health Gain Policy under which the cashless claim is being lodged has been taken on installment basis then in the event of cashless claim being admissible , the company will deduct the balance installments due if any, from the claim approved amount and pay the balance due to the Policyholder. In the event of the claim assessed amount being lower than the balance installment due then the Policyholder is liable to pay the balance premium installments due immediately by cheque or DD, failing which the said claim would be treated as inadmissible and the Policy shall stand cancelled immediately and no liability shall be admissible under the Policy for any Claims liability in future or in period elapsed.
              </p>
              <p className="text-[7.5px] text-justify leading-tight text-slate-500 font-medium">
                 Consent by the Patient/Insured/Beneficiary: I/We understand that Cashless facility is not automatically guaranteed by RGICL. I/We have no objection to RGICL RCare Health Officials visiting the Hospital/Nursing Home to check the details of treatment and are authorized to collect documents pertaining to my treatment from the Hospital/Nursing Home. I/We have provided the necessary information accurately to the best of my /our knowledge. I/We agree to pay the cost of the hospitalization, if authorization given by RGICL RCare Health becomes null and void, due to wrong and incorrect information.
              </p>
              
              <div className="grid grid-cols-2 gap-20 pt-8 pb-12">
                 <div className="space-y-4">
                    <UnderlineField label="Patient Signature:" value="" />
                    <div className="flex items-center gap-4">
                       <span className="text-[8px] font-bold uppercase">Date & Place:</span>
                       <div className="flex border border-black/40 h-5 items-center px-1">
                          <span className="text-[8px] font-black uppercase text-slate-200">d d m m y y y y</span>
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <UnderlineField label="Treating Doctor's Signature:" value="" />
                    <div className="flex items-center gap-4">
                       <span className="text-[8px] font-bold uppercase">Stamp of Hospital:</span>
                       <div className="h-10 w-40 border border-slate-200 bg-slate-50/50 relative flex items-center justify-center">
                          {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-60 mix-blend-multiply" />}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex border border-black/40">
                 <div className="bg-[#1b3664] text-white w-10 shrink-0 flex flex-col items-center justify-center p-2">
                    <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-black uppercase tracking-[0.4em]">Declaration</span>
                 </div>
                 <div className="flex-1 p-6 space-y-4">
                    <p className="text-[8.5px] text-justify leading-relaxed font-medium">
                       I hereby agree, affirm and declare that, the statements/information given/stated by me/us in this claim form is true, correct and complete. No material information which is relevant to the processing of the claim or which in any manner has a bearing on the claim has been with held or not disclosed. If I have given/made any false or fraudulent statement/information, or suppressed or concealed or in any manner failed to disclose material information, the policy shall be void & that I shall not be entitled to all/any rights to recover there under in respect of any or all claims, past, present or future. The receipt of this claim form/other supporting/related documents does not constitute or be deemed to constitute an agreement by the Company of the claim and the Company reserves the right to process or reject or require further/additional information in respect of the claim.
                    </p>
                    <p className="text-[8.5px] text-justify leading-relaxed font-medium">
                       I hereby provide my consent and authorize Reliance General Insurance Company Ltd to seek any medical information from any hospital/Medical Practitioner who has at any time attended on the insured person.
                    </p>
                    <div className="flex justify-between items-end pt-4">
                       <div className="space-y-2">
                          <UnderlineField label="Place:" value={formData.hosp_district || ''} />
                          <div className="flex items-center gap-4">
                             <span className="text-[8px] font-bold uppercase">Date:</span>
                             <div className="flex border border-black/40 h-5 items-center px-1">
                                <span className="text-[8px] font-black uppercase text-slate-200">d d m m y y y y</span>
                             </div>
                          </div>
                       </div>
                       <div className="text-center w-64">
                          <div className="border-t border-black/40 pt-1">
                             <p className="text-[9px] font-black uppercase text-[#ed1c24]">(Signature of Claimant)</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-8 space-y-4">
           <h3 className="text-[11px] font-black text-[#ed1c24] text-center uppercase tracking-widest underline underline-offset-4 decoration-2">IMPORTANT INFORMATION FOR HOSPITALS:</h3>
           <div className="grid grid-cols-1 gap-2 text-[8px] font-bold text-slate-700 leading-tight pl-4">
              <p>1. The Pre-authorisation Request Form should be filled with due care including the unique number received by the Insured/member/beneficiary. All columns are required to be filled in block letters.</p>
              <p>2. Completed Pre-authorization Request Form should be faxed to RCare-Health on 1800 3010 3001, or emailed at rgiccl.rcarehealth@relianceada.com by the provider hospital. It should reach us at least 4 days prior to likely date of admission. In case of emergency admission Pre-Authorisation Request Form should be sent within 4 hours of admission.</p>
              <p>3. Authorisation may be denied if complete information is not provided or queries are not replied to.</p>
              <p>4. Discrepancy in the information provided by the hospital records found at the time of claim may render the authorisation given null and void and the amount claimed by the hospital would have to be settled by the Insured to the hospital.</p>
              <p>5. Any changes in Diagnosis/Treatment plan should be intimated before discharge of the patient.</p>
              <p>6. All queries raised by us need to be replied at the earliest & maximum within 24hrs.</p>
              <p>7. Request for authorisation/enhancement will not be entertained after discharges of the patient.</p>
              <p>8. We shall share the authorization denial letter to the concerned hospital within 24 hours of complete and correct information being provided.</p>
              <p>9. If clinical details provided are insufficient, there may be a delay in the authorisation or denial for cashless.</p>
              <p>10. As per IRDAI any claimed amount above 1lac, copy of PAN card/form 60 of the insured/Policy holder/Proposer is mandatory and for below 1lac, Photo identity proof ( For eg- Aadhar card, Driving license, Election card, Passport etc) is mandatory.</p>
           </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-200 text-[7px] font-black text-slate-400">
           <div className="flex justify-between items-end">
              <div className="space-y-1">
                 <p className="uppercase">Email: rgiccl.rcarehealth@relianceada.com, Help line: 1800 3009 (Toll free) 022 - 39898282 (Charges Apply)</p>
                 <p className="uppercase">Fax No.: 180030103001 (Toll free)</p>
              </div>
              <div className="text-right">
                 <p>RELIANCE GENERAL INSURANCE COMPANY LIMITED. VER. 1.4/301017.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RelianceGeneralTemplate;
