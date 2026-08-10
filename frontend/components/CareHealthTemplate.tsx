
import React from 'react';

interface CareHealthTemplateProps {
  formData: Record<string, any>;
}

const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-black text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black bg-white">
        {chars.map((char, i) => (
          <div key={i} className="w-[11px] h-[12px] border-r border-b border-black flex items-center justify-center text-[8.5px] font-black text-black">
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
          <div key={i} className={`w-[11px] h-[12px] border border-black flex items-center justify-center text-[8.5px] font-black bg-white ${i === 1 || i === 3 ? 'mr-1' : '-ml-[1px]'}`}>
            {char}
          </div>
        ))}
      </div>
    </div>
  );
};

const TickBox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    <span className="text-[8.5px] font-bold text-black uppercase">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8.5px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className="text-[9.5px] font-black text-black uppercase flex-1 truncate">{value}</span>
  </div>
);

const CareHeader: React.FC<{ page: number }> = ({ page }) => {
  if (page !== 1) return null;

  return (
    <div className="mb-6 -mx-10 -mt-10">
      {/* Full width light yellow background top bar */}
      <div className="bg-[#fefce8] px-10 py-6 mb-8">
        <div className="bg-[#facc15] px-6 py-4 flex items-center space-x-4 rounded-sm shadow-sm w-fit">
          <span className="text-5xl font-black text-[#00338d] italic tracking-tighter" style={{ fontFamily: 'serif' }}>care</span>
          <div className="flex flex-col border-l-2 border-[#00338d] pl-3 leading-none">
            <span className="text-[14px] font-black uppercase text-[#00338d] tracking-[0.15em]">Health</span>
            <span className="text-[12px] font-bold uppercase text-[#00338d] tracking-[0.1em]">Insurance</span>
          </div>
        </div>
      </div>
      
      <div className="px-10 space-y-1">
        <h1 className="text-[16px] font-bold text-[#00338d] tracking-tight">Pre-Authorisation Form - ‘Care’</h1>
        <h2 className="text-[16px] font-bold text-[#00338d] tracking-tight mb-4">Request for Cashless Hospitalisation for Medical Insurance Policy</h2>
        
        <div className="space-y-0.5 text-[10px] font-medium text-slate-400">
          <p>1. To be filled in CAPITAL LETTERS only.</p>
          <p>2. If there is insufficient space, please provide further details on a separate sheet.</p>
          <p>3. Please Fax/Scan Page 1 & 2 only.</p>
        </div>
      </div>
    </div>
  );
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[#fef9c3] px-3 py-1.5 my-4 border-l-4 border-[#facc15]">
    <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{children}</h2>
  </div>
);

const Footer: React.FC = () => (
  <div className="mt-auto pt-4 border-t border-slate-200">
    <div className="flex justify-between items-start text-[6.5px] font-bold text-slate-500 leading-tight">
      <div className="max-w-[70%]">
        <p className="font-black text-slate-800 uppercase">Care Health Insurance Limited (Formerly Religare Health Insurance Company Limited)</p>
        <p>Registered Office: 5th Floor, 19 Chawla House, Nehru Place, New Delhi-110019 • Corresp. Office: Unit No. 604 - 607, 6th Floor, Tower C, Unitech Cyber Park, Sector-39, Gurugram-122001 (Haryana)</p>
        <p>Website: www.careinsurance.com • E-mail: customerfirst@careinsurance.com • Call us: 1800-102-4488</p>
      </div>
      <div className="text-right uppercase">
        <p>CIN: U66000DL2007PLC161503</p>
        <p>UIN: RHIHLIP21017V052021</p>
        <p>IRDAI Registration No. - 148</p>
      </div>
    </div>
  </div>
);

const CareHealthTemplate: React.FC<CareHealthTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col">
        <CareHeader page={1} />
        
        <SectionHeading>Details of the Third Party Administrator</SectionHeading>
        <div className="space-y-3 mb-6">
          <div className="flex items-end">
            <span className="text-[8px] font-bold w-48 pb-1 uppercase">a) Name of TPA/Insurance Company :</span>
            <GridBox value={formData.insurance_company || 'Care Health Insurance Limited'} length={45} className="flex-1" />
          </div>
          <div className="flex items-start gap-10">
             <div className="flex items-end gap-2">
                <span className="text-[8px] font-bold pb-1 uppercase">b) Toll Free Phone No.:</span>
                <GridBox value="18001024488" length={12} />
             </div>
             <div className="flex items-end gap-2 flex-1">
                <span className="text-[8px] font-bold pb-1 uppercase">c) Toll Free FAX :</span>
                <GridBox value="" length={12} />
             </div>
          </div>
          <div className="flex items-end">
            <span className="text-[8px] font-bold w-48 pb-1 uppercase">d) Name of Hospital :</span>
            <GridBox value={formData.hosp_name || ''} length={45} className="flex-1" />
          </div>
          <div className="pl-6 space-y-3">
             <div className="flex items-end"><span className="text-[8px] font-bold w-40 pb-1 uppercase">i) Address :</span><GridBox value={formData.hosp_address || ''} length={50} className="flex-1" /></div>
             <div className="flex items-end"><span className="text-[8px] font-bold w-40 pb-1 uppercase">ii) Rohini ID :</span><GridBox value={formData.hosp_rohini_id || ''} length={15} /></div>
             <div className="flex items-end"><span className="text-[8px] font-bold w-40 pb-1 uppercase">iii) Email ID :</span><GridBox value={formData.hosp_email || ''} length={40} className="flex-1" /></div>
          </div>
        </div>

        <SectionHeading>To be filled by the Insured/Patient</SectionHeading>
        <div className="space-y-4 mb-6">
           <div className="flex items-start">
              <span className="text-[8px] font-bold w-48 pt-2 uppercase">a) Name of the Patient :</span>
              <div className="flex-1 flex gap-2">
                 <GridBox value={formData.p_name?.split(' ')[0] || ''} length={15} subLabel="(First Name)" />
                 <GridBox value={formData.p_name?.split(' ')[1] || ''} length={15} subLabel="(Middle Name)" />
                 <GridBox value={formData.p_name?.split(' ')[2] || ''} length={15} subLabel="(Last Name)" />
              </div>
           </div>

           <div className="flex items-start gap-10">
              <div className="flex items-center space-x-4">
                 <span className="text-[8px] font-bold uppercase">b) Gender :</span>
                 <TickBox label="M" checked={formData.p_gender === 'Male'} />
                 <TickBox label="F" checked={formData.p_gender === 'Female'} />
                 <TickBox label="Other" checked={formData.p_gender === 'Third Gender'} />
              </div>
              <div className="flex items-start gap-2">
                 <span className="text-[8px] font-bold pt-1 uppercase">c) Age :</span>
                 <GridBox value={String(formData.p_age_y || '')} length={2} subLabel="(YY)" />
                 <GridBox value="" length={2} subLabel="(YY)" />
              </div>
              <div className="flex items-start gap-4 flex-1">
                 <span className="text-[8px] font-bold pt-1 uppercase">d) Date of Birth :</span>
                 <div className="flex items-center space-x-1">
                    <GridBox value={formData.p_dob?.split('-')[2] || ''} length={2} />
                    <span className="font-black">/</span>
                    <GridBox value={formData.p_dob?.split('-')[1] || ''} length={2} />
                    <span className="font-black">/</span>
                    <GridBox value={formData.p_dob?.split('-')[0] || ''} length={4} />
                 </div>
              </div>
           </div>

           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">e) Contact Number :</span>
              <div className="flex items-center">
                 <GridBox value="91" length={2} />
                 <span className="mx-2 font-black">-</span>
                 <GridBox value={formData.p_contact || ''} length={10} />
              </div>
           </div>

           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">f) Contact Number of Attending Relative :</span>
              <GridBox value={formData.p_relative_contact || ''} length={12} />
           </div>

           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">g) Insured Card ID Number :</span>
              <GridBox value={formData.p_card_id || ''} length={25} className="flex-1" />
           </div>

           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">h) Policy Number/Name of Corporate :</span>
              <GridBox value={formData.p_policy_no || ''} length={25} className="flex-1" />
           </div>

           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">i) Employee ID :</span>
              <GridBox value={formData.p_employee_id || ''} length={15} />
           </div>

           <div className="flex items-center space-x-10">
              <span className="text-[8px] font-bold uppercase">j) Currently do you have any other Mediclaim/Health Insurance :</span>
              <div className="flex space-x-6">
                 <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
                 <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
              </div>
           </div>

           <div className="pl-6 space-y-3">
              <div className="flex items-end"><span className="text-[8px] font-bold w-40 pb-1 uppercase">i) Company Name :</span><GridBox value={formData.p_other_insurer_name || ''} length={40} className="flex-1" /></div>
              <UnderlineField label="ii) Give Details :" value="" />
           </div>
        </div>

        <Footer />
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <div className="grid grid-cols-12 gap-8 pt-4">
           <div className="col-span-12 space-y-4">
              <div className="flex items-center space-x-10">
                 <span className="text-[8px] font-bold uppercase">k) Do you have a family physician :</span>
                 <div className="flex space-x-6">
                    <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
                    <TickBox label="No" checked={formData.p_family_physician === 'No'} />
                 </div>
              </div>
              <UnderlineField label="l) Name of the family physician :" value={formData.p_family_physician_name || ''} />
              <div className="flex items-end">
                 <span className="text-[8px] font-bold w-48 pb-1 uppercase">m) Contact Number, if any :</span>
                 <div className="flex items-center">
                    <GridBox value="91" length={2} />
                    <span className="mx-2 font-black">-</span>
                    <GridBox value={formData.p_family_physician_contact || ''} length={10} />
                 </div>
              </div>
              <div className="flex items-end">
                 <span className="text-[8px] font-bold w-48 pb-1 uppercase">n) Current Address of the Insured Patient :</span>
                 <GridBox value={formData.p_address || ''} length={60} className="flex-1" />
              </div>
              <div className="flex items-end">
                 <span className="text-[8px] font-bold w-48 pb-1 uppercase">o) Occupation of Insured Person :</span>
                 <GridBox value={formData.p_occupation || ''} length={40} className="flex-1" />
              </div>
           </div>
        </div>

        <SectionHeading>To be filled by the Treating Doctor/Hospital</SectionHeading>
        <div className="space-y-4">
           <UnderlineField label="a) Name of the treating doctor :" value={formData.dr_name || ''} />
           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">b) Contact Number :</span>
              <div className="flex items-center">
                 <GridBox value="91" length={2} />
                 <span className="mx-2 font-black">-</span>
                 <GridBox value={formData.dr_contact || ''} length={10} />
              </div>
           </div>
           <UnderlineField label="c) Nature of Illness/Disease with presenting complaints :" value={formData.m_illness || ''} />
           <UnderlineField label="d) Relevant clinical findings:" value={formData.m_clinical_findings || ''} />
           
           <div className="flex items-start gap-10">
              <div className="flex items-start gap-2">
                 <span className="text-[8px] font-bold pt-1 uppercase">e) Duration of the present ailment :</span>
                 <GridBox value={String(formData.m_duration || '')} length={3} />
                 <span className="text-[8px] font-bold pt-1 uppercase ml-1">days</span>
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">i) Date of first consultation :</span>
                 <div className="flex items-center space-x-1">
                    <GridBox value={formData.m_first_cons_date?.split('-')[2] || ''} length={2} />
                    <span className="font-black">/</span>
                    <GridBox value={formData.m_first_cons_date?.split('-')[1] || ''} length={2} />
                    <span className="font-black">/</span>
                    <GridBox value={formData.m_first_cons_date?.split('-')[0] || ''} length={4} />
                 </div>
                 <span className="text-[6px] font-bold pt-1.5 uppercase text-slate-400">(DD/MM/YYYY)</span>
              </div>
           </div>
           
           <UnderlineField label="ii) Past history of present ailment if any :" value="" />
           <UnderlineField label="f) Provisional diagnosis :" value={formData.m_prov_diag || ''} />
           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">i) ICD 10 Code :</span>
              <GridBox value={formData.m_icd_code || ''} length={10} />
           </div>

           <div className="space-y-3 mt-6">
              <span className="text-[8px] font-bold uppercase">g) Proposed line of treatment :</span>
              <div className="flex flex-wrap gap-8 pl-4">
                 <TickBox label="Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
                 <TickBox label="Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
                 <TickBox label="Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
                 <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
                 <TickBox label="Non allopathic treatment" checked={false} />
              </div>
           </div>

           <UnderlineField label="h) If Investigation &/or Medical Management provide details :" value="" className="mt-6" />
           <div className="pl-6">
            <UnderlineField label="i. Route of Drug Administration" value={formData.m_route_drug || ''} />
           </div>
           <UnderlineField label="j) If Surgical, name of surgery :" value={formData.m_surgery_name || ''} />
           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-1 uppercase">i) ICD 10 PCS Code :</span>
              <GridBox value="" length={12} />
           </div>
           <UnderlineField label="k) If other treatments provide details :" value="" />
           <UnderlineField label="l) How did injury occur :" value="" />

           <div className="grid grid-cols-2 gap-x-12 gap-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-10">
                 <span className="text-[8px] font-bold uppercase">m) In case of accident: i) Is it RTA :</span>
                 <div className="flex space-x-6">
                    <TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                    <TickBox label="No" checked={formData.m_is_rta === 'No'} />
                 </div>
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8px] font-bold pt-1 uppercase">ii) Date of injury :</span>
                 <div className="flex items-center space-x-1">
                    <GridBox value={formData.m_rta_date?.split('-')[2] || ''} length={2} />
                    <span className="font-black">/</span>
                    <GridBox value={formData.m_rta_date?.split('-')[1] || ''} length={2} />
                    <span className="font-black">/</span>
                    <GridBox value={formData.m_rta_date?.split('-')[0] || ''} length={4} />
                 </div>
              </div>
              <div className="flex items-center space-x-10">
                 <span className="text-[8px] font-bold uppercase">iii) Reported to Police :</span>
                 <div className="flex space-x-6">
                    <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                    <TickBox label="No" checked={formData.m_rta_police === 'No'} />
                 </div>
              </div>
              <UnderlineField label="iv) FIR No.:" value={formData.m_fir_no || ''} />
              <div className="col-span-2 flex items-center space-x-10">
                 <span className="text-[8px] font-bold uppercase">v) Injury/Disease caused due to substance abuse/alcohol consumption :</span>
                 <div className="flex space-x-6">
                    <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                    <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
              </div>
           </div>
        </div>

        <Footer />
      </div>

      {/* PAGE 3 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <div className="space-y-4 pt-4">
           <div className="flex items-center space-x-10">
              <span className="text-[8px] font-bold uppercase">vi) Test conducted to establish this :</span>
              <div className="flex space-x-6">
                 <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                 <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
              </div>
              <span className="text-[7px] font-bold text-slate-400 uppercase">(If Yes attach reports)</span>
           </div>

           <div className="flex items-center space-x-10">
              <span className="text-[8px] font-bold uppercase">n) In case of Maternity :</span>
              <div className="flex items-center border border-black h-5">
                 {['G','P','L','A'].map(l => (
                   <div key={l} className="w-5 h-full flex items-center justify-center border-r last:border-r-0 border-black text-[8px] font-black">{l}</div>
                 ))}
              </div>
              <div className="flex items-center space-x-4 pl-10">
                 <span className="text-[8px] font-bold uppercase">Date of Delivery :</span>
                 <div className="flex items-center space-x-1">
                    <GridBox value="" length={2} />
                    <span className="font-black">/</span>
                    <GridBox value="" length={2} />
                    <span className="font-black">/</span>
                    <GridBox value="" length={4} />
                 </div>
              </div>
           </div>
        </div>

        <SectionHeading>Details of the patient admitted</SectionHeading>
        <div className="grid grid-cols-12 gap-8">
           <div className="col-span-7 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-start gap-2">
                    <span className="text-[8px] font-bold pt-1 uppercase">a) Date of Admission :</span>
                    <div className="flex items-center space-x-1">
                       <GridBox value={formData.adm_date?.split('-')[2] || ''} length={2} />
                       <span className="font-black">/</span>
                       <GridBox value={formData.adm_date?.split('-')[1] || ''} length={2} />
                       <span className="font-black">/</span>
                       <GridBox value={formData.adm_date?.split('-')[0] || ''} length={4} />
                    </div>
                 </div>
                 <div className="flex items-start gap-2">
                    <span className="text-[8px] font-bold pt-1 uppercase">b) Time of Admission :</span>
                    <div className="flex border border-black bg-white h-5">
                       <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{formData.adm_time?.split(':')[0] || '  '}</div>
                       <div className="w-5 flex items-center justify-center font-black text-[9px]">{formData.adm_time?.split(':')[1] || '  '}</div>
                    </div>
                    <span className="text-[6px] font-bold pt-1.5 text-slate-400">(HH:MM)</span>
                 </div>
              </div>

              <div className="flex items-center space-x-10">
                 <span className="text-[8px] font-bold uppercase">c) Is this an emergency/a planned hospitalization event?:</span>
                 <div className="flex space-x-6">
                    <TickBox label="Emergency" checked={false} />
                    <TickBox label="Planned" checked={true} />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-start gap-2">
                    <span className="text-[8px] font-bold pt-1 uppercase">d) Expected no. of days stay in hospital :</span>
                    <GridBox value={String(formData.adm_stay_days || '')} length={3} />
                    <span className="text-[8px] font-bold pt-1 uppercase ml-1">days</span>
                 </div>
                 <div className="flex items-start gap-2">
                    <span className="text-[8px] font-bold pt-1 uppercase">e) Days in ICU :</span>
                    <GridBox value="" length={3} />
                    <span className="text-[8px] font-bold pt-1 uppercase ml-1">days</span>
                 </div>
              </div>

              <UnderlineField label="f) Room Type :" value={formData.adm_room_type || ''} />

              <div className="space-y-1.5 mt-8 border-t border-slate-100 pt-6">
                {[
                   { label: "f) Per Day Room Rent + Nursing & Service Charges + Patient's Diet", id: "cost_room_rent" },
                   { label: "g) Expected cost for Investigation + Diagnostics", id: "cost_investigation" },
                   { label: "h) ICU Charges", id: "cost_icu" },
                   { label: "i) OT Charges", id: "cost_ot" },
                   { label: "j) Professional Fees Surgeon + Anesthetist Fees + Consultation Charges", id: "cost_prof_fees" },
                   { label: "k) Medicines + Consumables + Cost of Implants (if applicable please specify).", id: "cost_medicines" },
                   { label: "l) Other hospital Expenses: if any", id: "cost_other" },
                   { label: "m) All inclusive package charges if any applicable", id: "cost_package" },
                   { label: "n) Sum Total expected cost of hospitalization", id: "adm_total_cost", isBold: true },
                ].map((item, idx) => (
                   <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.isBold ? 'border-black mt-4 pt-1' : ''}`}>
                      <span className={`text-[7px] font-bold uppercase ${item.isBold ? 'font-black' : ''}`}>{item.label}</span>
                      <div className="flex items-center">
                         <span className="text-[8px] mr-2 font-black">Rs.</span>
                         <GridBox value={String(formData[item.id] || 0)} length={7} />
                      </div>
                   </div>
                ))}
              </div>
           </div>

           <div className="col-span-5 bg-slate-50 p-4 border-l border-black flex flex-col">
              <p className="text-[8.5px] font-black uppercase mb-6 leading-tight">Mandatory: Past History of any<br/>chronic illness <span className="lowercase font-bold italic">If yes, since (month/year)</span></p>
              <div className="space-y-3.5">
                 {[
                    "Diabetes", "Heart Disease", "Hypertension", "Hyperlipidemias", "Osteoarthritis",
                    "Asthma/COPD/Bronchitis", "Cancer", "Alcohol or drug abuse", "Any HIV or STD / Related"
                 ].map((ill, i) => (
                    <div key={i} className="flex items-center justify-between group">
                       <div className="flex items-center gap-3 flex-1">
                          <div className="w-[10px] h-[10px] border border-black bg-white"></div>
                          <span className="text-[7.5px] font-black uppercase text-slate-700 truncate">{ill}</span>
                       </div>
                       <div className="flex gap-2">
                          <div className="flex border border-black h-[14px] bg-white">
                             <div className="w-[10px] border-r border-black flex items-center justify-center text-[7px] font-black">M</div>
                             <div className="w-[10px] flex items-center justify-center text-[7px] font-black">M</div>
                          </div>
                          <div className="flex border border-black h-[14px] bg-white">
                             <div className="w-[10px] border-r border-black flex items-center justify-center text-[7px] font-black">Y</div>
                             <div className="w-[10px] flex items-center justify-center text-[7px] font-black">Y</div>
                          </div>
                       </div>
                    </div>
                 ))}
                 <UnderlineField label="Any other Ailment give details:" value="" className="mt-4" />
              </div>
           </div>
        </div>

        <SectionHeading>Declaration</SectionHeading>
        <p className="text-[8px] font-black text-center mb-6 uppercase tracking-tighter italic text-slate-500">We confirm having read understood and agreed to the Declarations on the next page of this form. (Please read very carefully)</p>
        
        <div className="space-y-6">
           <div className="flex items-end">
              <span className="text-[8px] font-bold w-48 pb-2 uppercase">a) Name of the treating doctor :</span>
              <GridBox value={formData.dr_name || ''} length={35} className="flex-1" />
           </div>
           <div className="grid grid-cols-2 gap-12">
              <UnderlineField label="b) Qualification :" value="MBBS, MD" />
              <div className="flex items-end gap-2 flex-1">
                 <span className="text-[8px] font-bold pb-1 uppercase">c) Registration No. with State Code :</span>
                 <GridBox value={formData.registrationNo || ''} length={15} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-12 mt-4">
              <div className="border border-black p-10 h-28 relative flex items-center justify-center bg-slate-50/20">
                 <span className="absolute top-1 left-2 text-[6px] font-bold uppercase text-slate-300">Hospital Seal (Must include Hospital ID)</span>
                 {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
              </div>
              <div className="border border-black p-10 h-28 relative flex items-center justify-center bg-slate-50/20">
                 <span className="absolute top-1 left-2 text-[6px] font-bold uppercase text-slate-300">Patient/Insured Name & Signature</span>
              </div>
           </div>
        </div>

        <Footer />
      </div>

    </div>
  );
};

export default CareHealthTemplate;
