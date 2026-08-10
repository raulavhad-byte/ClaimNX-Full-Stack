
import React from 'react';
import { formatDate, parseDate } from '../utils';

interface BajajAllianzTemplateProps {
  formData: Record<string, any>;
}

const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7px] font-bold text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black bg-white shrink-0">
        {chars.map((char, i) => (
          <div key={i} className="w-[10.5px] h-[12px] border-r border-b border-black flex items-center justify-center text-[8px] font-black text-black">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[5.5px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
    </div>
  );
};

const DateGrid: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const d = parseDate(value);
  const day = !isNaN(d.getTime()) ? d.getDate().toString().padStart(2, '0') : '  ';
  const month = !isNaN(d.getTime()) ? (d.getMonth() + 1).toString().padStart(2, '0') : '  ';
  const year = !isNaN(d.getTime()) ? d.getFullYear().toString() : '    ';
  const sequence = [...day.split(''), ...month.split(''), ...year.split('')];

  return (
    <div className="flex flex-col">
      {label && <span className="text-[7px] font-bold text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex">
        {sequence.map((char, i) => (
          <div key={i} className={`w-[10.5px] h-[12px] border border-black flex items-center justify-center text-[8px] font-black bg-white ${i === 1 || i === 3 ? 'mr-1.5' : '-ml-[1px]'}`}>
            {char}
          </div>
        ))}
      </div>
      <div className="flex text-[5.5px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
        <span className="w-[21px] text-center">D D</span>
        <span className="w-[21px] text-center ml-1">M M</span>
        <span className="w-[42px] text-center ml-1">Y Y Y Y</span>
      </div>
    </div>
  );
};

const TickBox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    <span className="text-[8px] font-bold text-black uppercase">{label}</span>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className="text-[9px] font-black text-black uppercase flex-1 truncate">{value}</span>
  </div>
);

const Header: React.FC<{ page: number }> = ({ page }) => (
  <div className="mb-4 relative">
    <div className="flex justify-between items-start mb-4">
      <div className="max-w-[70%]">
        <h1 className="text-[12px] font-black text-slate-800 uppercase leading-none mb-1">BAJAJ GENERAL INSURANCE LIMITED (Formerly known as Bajaj Allianz General Insurance Co. Ltd.)</h1>
        <p className="text-[8px] font-bold text-slate-500">Bajaj Insurance House, Airport Road, Yerawada, Pune - 411006.</p>
        <p className="text-[8px] font-bold text-slate-500">CIN: U66010PN2000PLC015329</p>
        <div className="mt-2 text-[7.5px] font-medium text-slate-500 max-w-[90%] leading-tight">
          <span className="font-black text-slate-700">Health Administration Team : </span>
          *A - Wing 2nd Floor, Bajaj Finserv Building, Behind Weikfield IT Park, Off Nagar Road, Viman Nagar | Pune - 411 014
          <br/>
          <span className="font-black text-slate-700">Phone No.: </span> 020-30305858/ 1800-103-2529 Fax: 020-30512224/ 6/ 7 | <span className="font-black text-slate-700">Email: </span> careforyou@bajajgeneral.com
        </div>
      </div>
      <div className="text-right flex flex-col items-end">
        <div className="flex items-center space-x-2">
           <div className="w-10 h-10 border-2 border-[#0055a5] flex items-center justify-center p-1 rounded-sm">
              <span className="font-black text-xl text-[#0055a5]">B</span>
           </div>
           <div className="flex flex-col text-left leading-none">
              <span className="text-[14px] font-black text-[#0055a5]">GENERAL</span>
              <span className="text-[11px] font-black text-[#0055a5]">BAJAJ</span>
           </div>
        </div>
        <p className="text-[7px] font-bold text-[#0055a5] uppercase tracking-widest mt-1">Caringly Yours</p>
        <span className="text-[8px] font-black text-slate-800 mt-4">(To be filled in block letters)</span>
      </div>
    </div>
    
    <div className="bg-[#0055a5] text-white text-center py-1.5 w-full uppercase text-[14px] font-black tracking-[0.3em]">
      CASHLESS FORM
    </div>
    
    <div className="flex justify-between py-2 px-1 text-[8.5px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100">
       <span>PLEASE FAX/SCAN PAGE 1 AND 2 ONLY</span>
       <span>REQUEST FOR CASHLESS HOSPITALISATION FOR MEDICAL INSURANCE POLICY</span>
    </div>
  </div>
);

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute right-[-45px] top-1/2 -translate-y-1/2 [writing-mode:vertical-lr] rotate-180 flex flex-col items-center">
    <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest bg-slate-100 py-10 px-2 border-l-4 border-slate-800">{label}</span>
  </div>
);

const BajajAllianzTemplate: React.FC<BajajAllianzTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        <Header page={1} />
        
        <div className="space-y-6 relative mb-auto">
          {/* SECTION A */}
          <div className="space-y-4">
             <SectionLabel label="SECTION A" />
             <p className="text-[9px] font-black uppercase text-blue-800 border-b border-blue-100 pb-1">DETAILS OF THE PROVIDER</p>
             <UnderlineField label="Hospital Name/nursing Home Name:" value={formData.hosp_name || ''} />
             <div className="grid grid-cols-12 gap-4">
                <UnderlineField label="District Name:" value={formData.hosp_district || ''} className="col-span-6" />
                <div className="col-span-6 flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">Pin Code:</span>
                   <GridBox value={formData.hosp_pin || ''} length={6} />
                </div>
             </div>
             <div className="grid grid-cols-12 gap-4">
                <UnderlineField label="State Name:" value={formData.hosp_state || ''} className="col-span-6" />
                <div className="col-span-6 flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">Hosp Id:</span>
                   <GridBox value="" length={12} />
                </div>
             </div>
             <div className="grid grid-cols-12 gap-4">
                <UnderlineField label="Landmark:" value="" className="col-span-6" />
                <div className="col-span-6 flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">Rohini ID:</span>
                   <GridBox value={formData.hosp_rohini_id || ''} length={13} />
                </div>
             </div>
             <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <UnderlineField label="Hospital Contact No:" value={formData.hosp_mobile || ''} className="w-48" />
                <UnderlineField label="Fax No:" value="" className="w-32" />
                <UnderlineField label="TPA desk No:" value="" className="w-32" />
                <UnderlineField label="Email id:" value={formData.hosp_email || ''} className="flex-1" />
             </div>
          </div>

          {/* SECTION B */}
          <div className="space-y-4 pt-4">
             <SectionLabel label="SECTION B" />
             <p className="text-[9px] font-black uppercase text-blue-800 border-b border-blue-100 pb-1">TO BE FILLED BY THE INSURED/PATIENT</p>
             <UnderlineField label="a) Name of the Patient:" value={formData.p_name || ''} />
             <UnderlineField label="b) Current Address of Insured patient:" value={formData.p_address || ''} />
             
             <div className="flex items-center gap-10">
                <div className="flex items-center gap-4">
                   <span className="text-[8px] font-bold uppercase">c) Gender:</span>
                   <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                   <TickBox label="Female" checked={formData.p_gender === 'Female'} />
                </div>
                <div className="flex items-start gap-3">
                   <span className="text-[8px] font-bold pt-1 uppercase">d) Age:</span>
                   <GridBox value={String(formData.p_age_y || '')} length={2} subLabel="Years" />
                   <GridBox value="" length={2} subLabel="Months" />
                </div>
                <div className="flex items-start gap-4">
                   <span className="text-[8px] font-bold pt-1 uppercase">e) Date of birth:</span>
                   <DateGrid value={formData.p_dob} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8">
                <UnderlineField label="f) Name of the Attendant:" value="" />
                <div className="flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">g) Contact number, if any:</span>
                   <GridBox value="" length={10} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8">
                <div className="flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">h) Contact number:</span>
                   <GridBox value={formData.p_contact || ''} length={10} />
                </div>
                <div className="flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">i) Insured card ID number:</span>
                   <GridBox value={formData.p_card_id || ''} length={15} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8">
                <UnderlineField label="j) Occupation of Insured patient:" value={formData.p_occupation || ''} />
                <UnderlineField label="k) Policy number / Name of corporate:" value={formData.p_policy_no || ''} />
             </div>

             <div className="grid grid-cols-2 gap-8">
                <div className="flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">l) Employee ID:</span>
                   <GridBox value={formData.p_employee_id || ''} length={12} />
                </div>
                <div className="flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">m) Pan No:</span>
                   <GridBox value={formData.p_pan || ''} length={10} />
                </div>
             </div>

             <UnderlineField label="n) Name of the Proposer" value={formData.p_proposer_name || formData.p_name || ''} />
             <div className="space-y-1">
                <label className="text-[7.5px] font-bold uppercase text-slate-400">CKYC of the proposer</label>
                <div className="border border-black h-8 bg-slate-50/30"></div>
             </div>

             <div className="flex items-center gap-10">
                <span className="text-[8px] font-bold uppercase">o) Currently do you have any other Mediclaim / Health insurance:</span>
                <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
                <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
             </div>
             <UnderlineField label="Company Name:" value={formData.p_other_insurer_name || ''} />
             <UnderlineField label="Give details:" value="" />

             <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 flex items-center gap-4">
                   <span className="text-[8px] font-bold uppercase">p) Do you have a family physician:</span>
                   <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
                   <TickBox label="No" checked={formData.p_family_physician === 'No'} />
                </div>
                <UnderlineField label="q) Name of the family physician:" value={formData.p_family_physician_name || ''} className="col-span-8" />
             </div>

             <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6 flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">r) Contact number, if any:</span>
                   <GridBox value={formData.p_family_physician_contact || ''} length={10} />
                </div>
                <UnderlineField label="s) Insured E-mail id" value={formData.p_email || ''} className="col-span-6" />
             </div>
             <p className="text-[7.5px] font-black text-slate-600 text-center uppercase tracking-widest pt-2">(PLEASE COMPLETE DECLARATION ON THE REVERSE SIDE OF THIS FORM)</p>
          </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between items-center text-[6px] font-bold text-slate-400 uppercase tracking-tighter">
           <p>CIN: U66010PN2000PLC015329 | UIN: BAJHLIP19087V011819</p>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden">
        <div className="space-y-6 relative mb-auto">
          {/* SECTION C */}
          <div className="space-y-4 pt-2">
             <SectionLabel label="SECTION C" />
             <p className="text-[9px] font-black uppercase text-blue-800 border-b border-blue-100 pb-1">TO BE FILLED BY THE TREATING DOCTOR / HOSPITAL</p>
             <div className="grid grid-cols-2 gap-8">
                <UnderlineField label="a) Name of the treating doctor:" value={formData.dr_name || ''} />
                <div className="flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">b) Contact number:</span>
                   <GridBox value={formData.dr_contact || ''} length={10} />
                </div>
             </div>
             <UnderlineField label="c) Nature of ILLNESS / Disease with presenting complaints" value={formData.m_illness || ''} />
             <UnderlineField label="d) Relevant clinical findings:" value={formData.m_clinical_findings || ''} />
             
             <div className="flex items-start gap-10">
                <div className="flex items-start gap-3">
                   <span className="text-[8px] font-bold pt-1 uppercase">e) Duration of the present ailment:</span>
                   <GridBox value={String(formData.m_duration || '')} length={3} subLabel="Days" />
                </div>
                <div className="flex items-start gap-4">
                   <span className="text-[8px] font-bold pt-1 uppercase">i. Date of first consultation:</span>
                   <DateGrid value={formData.m_first_cons_date} />
                </div>
             </div>
             <UnderlineField label="i. Past history of present ailment if any:" value="" />

             <div className="grid grid-cols-12 gap-4">
                <UnderlineField label="f) Provisional diagnosis" value={formData.m_prov_diag || ''} className="col-span-8" />
                <div className="col-span-4 flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">i. ICD 10 Code:</span>
                   <GridBox value={formData.m_icd_code || ''} length={10} />
                </div>
             </div>

             <div className="space-y-3">
                <span className="text-[8px] font-bold uppercase">g) Proposed line of treatment:</span>
                <div className="flex flex-wrap gap-x-8 gap-y-2 pl-4">
                   <TickBox label="Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
                   <TickBox label="Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
                   <TickBox label="Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
                   <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
                   <TickBox label="Non allopathic treatment" checked={false} />
                </div>
             </div>

             <UnderlineField label="h) If Investigation & / or Medical Management provide details" value="" />
             <UnderlineField label="i) Route of drug administration:" value={formData.m_route_drug || ''} />

             <div className="grid grid-cols-12 gap-4">
                <UnderlineField label="j ) If Surgical, name of surgery:" value={formData.m_surgery_name || ''} className="col-span-8" />
                <div className="col-span-4 flex items-end gap-2">
                   <span className="text-[8px] font-bold pb-1 uppercase">i. ICD 10 PCS Code:</span>
                   <GridBox value="" length={10} />
                </div>
             </div>
             <UnderlineField label="k) If other treatments provide details:" value="" />
             <UnderlineField label="l) How did injury occur:" value="" />

             <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 space-y-4">
                <div className="flex items-center gap-10">
                   <div className="flex items-center gap-4">
                      <span className="text-[8px] font-bold uppercase">m) In case of accident: i. Is it RTA:</span>
                      <TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} />
                      <TickBox label="No" checked={formData.m_is_rta === 'No'} />
                   </div>
                   <div className="flex items-start gap-4">
                      <span className="text-[8px] font-bold pt-1 uppercase">ii. Date of injury:</span>
                      <DateGrid value={formData.m_rta_date} />
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="text-[8px] font-bold uppercase">iii. Reported to Police:</span>
                      <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
                      <TickBox label="No" checked={formData.m_rta_police === 'No'} />
                   </div>
                </div>
                <div className="flex items-center gap-10">
                   <div className="flex items-end gap-2">
                      <span className="text-[8px] font-bold pb-1 uppercase">iv. FIR No.</span>
                      <GridBox value={formData.m_fir_no || ''} length={12} />
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="text-[8px] font-bold uppercase">v. Injury caused by substance abuse/alcohol:</span>
                      <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
                      <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <span className="text-[8px] font-bold uppercase">vi. Test conducted to establish this :</span>
                   <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
                   <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
                   <span className="text-[7px] font-bold text-slate-400 italic">(If Yes attach reports)</span>
                </div>
             </div>

             <div className="flex items-center gap-10">
                <div className="flex items-center gap-4">
                   <span className="text-[8px] font-bold uppercase">n) In case of Maternity:</span>
                   <div className="flex border border-black">{['G','P','L','A'].map(l => <div key={l} className="w-4 h-4 flex items-center justify-center border-r last:border-r-0 border-black text-[8px] font-bold">{l}</div>)}</div>
                </div>
                <div className="flex items-start gap-4">
                   <span className="text-[8px] font-bold pt-1 uppercase">Expected date of Delivery:</span>
                   <DateGrid value="" />
                </div>
                <div className="flex items-start gap-4">
                   <span className="text-[8px] font-bold pt-1 uppercase">LMP:</span>
                   <DateGrid value="" />
                </div>
             </div>
          </div>

          {/* SECTION D */}
          <div className="space-y-6 pt-6">
             <SectionLabel label="SECTION D" />
             <p className="text-[9px] font-black uppercase text-blue-800 border-b border-blue-100 pb-1">DETAILS OF THE PATIENT ADMITTED</p>
             
             <div className="grid grid-cols-2 gap-8">
                <div className="flex items-start gap-4">
                   <span className="text-[8.5px] font-bold pt-1 uppercase">a) Date of admission:</span>
                   <DateGrid value={formData.adm_date} />
                </div>
                <div className="flex items-start gap-4">
                   <span className="text-[8.5px] font-bold pt-1 uppercase">b) Time:</span>
                   <div className="flex border border-black shrink-0">
                      <div className="w-[10.5px] h-[12px] border-r border-black flex items-center justify-center text-[8px] font-black">{formData.adm_time?.split(':')[0] || ' '}</div>
                      <div className="w-[10.5px] h-[12px] border-r border-black flex items-center justify-center text-[8px] font-black">{formData.adm_time?.split(':')[0] || ' '}</div>
                      <div className="w-[10.5px] h-[12px] border-r border-black flex items-center justify-center text-[8px] font-black">{formData.adm_time?.split(':')[1] || ' '}</div>
                      <div className="w-[10.5px] h-[12px] flex items-center justify-center text-[8px] font-black">{formData.adm_time?.split(':')[1] || ' '}</div>
                   </div>
                   <div className="flex flex-col text-[5.5px] font-bold text-slate-400 mt-0.5">
                      <span className="text-center w-[44px]">H H : M M</span>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-10">
                <span className="text-[8.5px] font-bold uppercase">c) Is this an emergency/planned hospitalization event?:</span>
                <TickBox label="Emergency" checked={formData.adm_type === 'Emergency'} />
                <TickBox label="Planned" checked={formData.adm_type === 'Planned'} />
             </div>

             <div className="grid grid-cols-2 gap-8">
                <div className="flex items-end gap-2">
                   <span className="text-[8.5px] font-bold pb-1 uppercase">d) Expected no. of days stay in hospital:</span>
                   <GridBox value={String(formData.adm_stay_days || '')} length={3} />
                   <span className="text-[8px] font-bold pb-1 lowercase">Days</span>
                </div>
                <div className="flex items-end gap-2">
                   <span className="text-[8.5px] font-bold pb-1 uppercase">e) Expected no.of days in ICU</span>
                   <GridBox value="" length={3} />
                   <span className="text-[8px] font-bold pb-1 lowercase">Days</span>
                </div>
             </div>

             <UnderlineField label="f) Room Type:" value={formData.adm_room_type || ''} />

             <div className="grid grid-cols-12 gap-8">
                <div className="col-span-7 space-y-1.5">
                   {[
                      { label: "g) Per Day Room Rent + Nursing & Service Charges + Patient's Diet:", id: "cost_room_rent" },
                      { label: "h) Expected cost for investigation + diagnostics:", id: "cost_investigation" },
                      { label: "i) ICU Charges:", id: "cost_icu" },
                      { label: "j) OT Charges:", id: "cost_ot" },
                      { label: "k) Professional fees Surgeon + Anesthetist Fees + consultation Charges", id: "cost_prof_fees" },
                      { label: "l) Medicines + Consumables + Cost of Implants specify).", id: "cost_medicines" },
                      { label: "m) Other hospital expenses if any:", id: "cost_other" },
                      { label: "n) All inclusive package charges if any applicable", id: "cost_package" },
                      { label: "o) Sum Total expected cost of hospitalization", id: "adm_total_cost", bold: true },
                   ].map((item, idx) => (
                      <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                         <span className={`text-[7.5px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                         <div className="flex items-center">
                            <span className="text-[8px] mr-1 font-black">Rs.</span>
                            <GridBox value={String(formData[item.id] || 0)} length={7} />
                         </div>
                      </div>
                   ))}
                </div>

                <div className="col-span-5 bg-slate-50/50 p-4 border-l border-black">
                   <p className="text-[8.5px] font-black uppercase mb-6 leading-tight">Mandatory: Past History of any<br/>chronic illness <span className="lowercase font-bold">(If yes, since (month / year)</span></p>
                   <div className="space-y-2.5">
                      {[
                         "Diabetes", "Heart Disease", "Hypertension", "Hyperlipidemia", "Osteoarthritis",
                         "Asthma / COPD / Bronchitis", "Cancer", "Alcohol or drug abuse", "Any HIV or STD / Related ailments"
                      ].map((ill, i) => (
                         <div key={i} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2 flex-1">
                               <div className="w-[10px] h-[10px] border border-black bg-white"></div>
                               <span className="text-[7.5px] font-black uppercase text-slate-700 truncate">{ill}</span>
                            </div>
                            <div className="flex gap-1.5">
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
          </div>
        </div>

        <div className="mt-auto pt-4 flex justify-between items-center text-[6px] font-bold text-slate-400 uppercase tracking-tighter">
           <p>CIN: U66010PN2000PLC015329 | UIN: BAJHLIP19087V011819</p>
        </div>
      </div>

    </div>
  );
};

export default BajajAllianzTemplate;
