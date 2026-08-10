
import React from 'react';
import { formatDate, parseDate } from '../utils';

interface AdityaBirlaTemplateProps {
  formData: Record<string, any>;
}

const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-bold text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black bg-white">
        {chars.map((char, i) => (
          <div key={i} className="w-[11px] h-[12px] border-r border-b border-black flex items-center justify-center text-[8px] font-bold text-black">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
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
      {label && <span className="text-[7.5px] font-bold text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex">
        {sequence.map((char, i) => (
          <div key={i} className={`w-[11px] h-[12px] border border-black flex items-center justify-center text-[8px] font-bold bg-white ${i === 1 || i === 3 ? 'mr-1' : '-ml-[1px]'}`}>
            {char}
          </div>
        ))}
      </div>
      <div className="flex text-[5.5px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
        <span className="w-[22px] text-center">D D</span>
        <span className="w-[22px] text-center">M M</span>
        <span className="w-[44px] text-center">Y Y Y Y</span>
      </div>
    </div>
  );
};

const TimeGrid: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const [h, m] = (value || '  :  ').split(':');
  const hChars = (h || '  ').padStart(2, ' ').split('');
  const mChars = (m || '  ').padStart(2, ' ').split('');

  return (
    <div className="flex flex-col">
      {label && <span className="text-[7.5px] font-bold text-slate-800 uppercase mb-0.5">{label}</span>}
      <div className="flex items-center space-x-1">
        <div className="flex border border-black bg-white">
           <div className="w-[11px] h-[12px] border-r border-black flex items-center justify-center text-[8px] font-bold">{hChars[0]}</div>
           <div className="w-[11px] h-[12px] flex items-center justify-center text-[8px] font-bold">{hChars[1]}</div>
        </div>
        <span className="font-black text-[10px]">:</span>
        <div className="flex border border-black bg-white">
           <div className="w-[11px] h-[12px] border-r border-black flex items-center justify-center text-[8px] font-bold">{mChars[0]}</div>
           <div className="w-[11px] h-[12px] flex items-center justify-center text-[8px] font-bold">{mChars[1]}</div>
        </div>
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
    <span className="text-[9.5px] font-bold text-black uppercase flex-1 truncate">{value}</span>
  </div>
);

const SectionBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[#cd8e8d] text-white px-3 py-1.5 my-4 text-[9.5px] font-black uppercase tracking-widest">
    {children}
  </div>
);

const Header: React.FC = () => (
  <div className="bg-[#b31920] text-white p-6 -mx-10 -mt-10 mb-8 flex justify-between items-center">
    <div className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight">Health Insurance</h1>
      <p className="text-sm font-bold opacity-80">Aditya Birla Health Insurance Co. Limited</p>
    </div>
    <div className="text-right flex flex-col items-end">
       <div className="flex items-center space-x-2 bg-white/10 p-2 rounded-sm border border-white/20">
          <div className="grid grid-cols-2 gap-0.5">
             <div className="w-3 h-3 bg-white/20"></div>
             <div className="w-3 h-3 bg-[#facc15]"></div>
             <div className="w-3 h-3 bg-[#facc15]"></div>
             <div className="w-3 h-3 bg-white/20"></div>
          </div>
          <div className="flex flex-col leading-none text-left">
             <span className="text-[12px] font-black tracking-widest uppercase">ADITYA BIRLA</span>
             <span className="text-[18px] font-black tracking-tighter uppercase leading-none">CAPITAL</span>
          </div>
       </div>
       <div className="flex space-x-2 mt-2 text-[6px] font-black uppercase tracking-[0.2em] opacity-60">
          <span>PROTECTING</span>
          <span>INVESTING</span>
          <span>FINANCING</span>
          <span>ADVISING</span>
       </div>
    </div>
  </div>
);

const AdityaBirlaTemplate: React.FC<AdityaBirlaTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col">
        <Header />
        
        <div className="mb-6">
           <h2 className="text-[16px] font-black text-[#b31920] uppercase tracking-tight">Activ Care Preauthorization Form</h2>
           <p className="text-[14px] font-bold text-slate-700 mt-1">(Request For Cashless Hospitalisation For Medical Insurance Policy)</p>
        </div>

        <SectionBanner>DETAILS OF THE THIRD PARTY ADMINISTRATOR (To be filled in block letters)</SectionBanner>
        <div className="space-y-4 mb-6">
          <div className="flex items-end">
            <span className="text-[8.5px] font-bold w-48 pb-1 uppercase">a. Name of TPA/Insurance company:</span>
            <GridBox value={formData.tpa_provider || 'ADITYA BIRLA HEALTH INSURANCE CO. LIMITED'} length={40} className="flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-10">
             <div className="flex items-end"><span className="text-[8.5px] font-bold w-48 pb-1 uppercase">b. Toll free phone number:</span><GridBox value="1800 270 7000" length={15} /></div>
             <div className="flex items-end"><span className="text-[8.5px] font-bold w-32 pb-1 uppercase">c. Toll free FAX:</span><GridBox value="" length={10} /></div>
          </div>
        </div>

        <SectionBanner>TO BE FILLED BY THE INSURED/PATIENT</SectionBanner>
        <div className="space-y-4 mb-6">
           <div className="flex items-end">
             <span className="text-[8.5px] font-bold w-48 pb-1 uppercase">a. Name of the Patient:</span>
             <GridBox value={formData.p_name || ''} length={40} className="flex-1" />
           </div>
           <div className="flex items-start gap-12">
              <div className="flex items-center space-x-4">
                 <span className="text-[8.5px] font-bold uppercase">b. Gender:</span>
                 <TickBox label="Male" checked={formData.p_gender === 'Male'} />
                 <TickBox label="Female" checked={formData.p_gender === 'Female'} />
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8.5px] font-bold pt-1 uppercase">c. Age:</span>
                 <GridBox value={String(formData.p_age_y || '')} length={2} subLabel="Years" />
                 <GridBox value="" length={2} subLabel="Months" />
              </div>
              <div className="flex items-start gap-4">
                 <span className="text-[8.5px] font-bold pt-1 uppercase">d. Date of birth:</span>
                 <DateGrid value={formData.p_dob} />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <div className="flex items-end"><span className="text-[8.5px] font-bold w-40 pb-1 uppercase">e. Contact number:</span><GridBox value={formData.p_contact || ''} length={10} /></div>
              <div className="flex items-end"><span className="text-[8.5px] font-bold w-64 pb-1 uppercase">f. Contact number of attending relative:</span><GridBox value={formData.p_relative_contact || ''} length={12} /></div>
              <div className="flex items-end"><span className="text-[8.5px] font-bold w-40 pb-1 uppercase">g. Insured card ID number:</span><GridBox value={formData.p_card_id || ''} length={20} /></div>
              <div className="flex items-end"><span className="text-[8.5px] font-bold w-64 pb-1 uppercase">h. Policy number/ Name of corporate:</span><GridBox value={formData.p_policy_no || ''} length={25} className="flex-1" /></div>
           </div>
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-48 pb-1 uppercase">i. Employee ID:</span><GridBox value={formData.p_employee_id || ''} length={20} /></div>
           <div className="flex items-center space-x-10">
              <span className="text-[8.5px] font-bold uppercase">j. Currently do you have any other Mediclaim/Health insurance:</span>
              <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
           </div>
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-48 pb-1 uppercase">k. Company Name: Give details</span><GridBox value={formData.p_other_insurer_name || ''} length={40} className="flex-1" /></div>
           <div className="flex items-center space-x-10">
              <span className="text-[8.5px] font-bold uppercase">l. Do you have any family physician:</span>
              <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
              <TickBox label="No" checked={formData.p_family_physician === 'No'} />
           </div>
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-48 pb-1 uppercase">m. Name of the family physician:</span><GridBox value={formData.p_family_physician_name || ''} length={40} className="flex-1" /></div>
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-48 pb-1 uppercase">n. Contact number If any :</span><GridBox value={formData.p_family_physician_contact || ''} length={10} /></div>
           <p className="text-[8px] font-black text-slate-500 text-center uppercase mt-2">(PLEASE COMPLETE DECLARATION ON THE REVERSE SIDE OF THIS FORM)</p>
        </div>

        <SectionBanner>TO BE FILLED BY THE TREATING DOCTOR/HOSPITAL</SectionBanner>
        <div className="space-y-4">
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-48 pb-1 uppercase">a. Name of the treating doctor:</span><GridBox value={formData.dr_name || ''} length={40} className="flex-1" /></div>
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-48 pb-1 uppercase">b. Contact number:</span><GridBox value={formData.dr_contact || ''} length={10} /></div>
           <UnderlineField label="c. Nature of ILLNESS / Disease with presenting Complaints:" value={formData.m_illness || ''} />
           <UnderlineField label="d. Relevant clinical findings:" value={formData.m_clinical_findings || ''} />
           <div className="flex items-start gap-12">
              <div className="flex items-start gap-2"><span className="text-[8.5px] font-bold pt-1 uppercase">e. Duration of the present ailment:</span><GridBox value={String(formData.m_duration || '')} length={3} /><span className="text-[8px] font-bold pt-1 uppercase">Days</span></div>
              <div className="flex items-start gap-4"><span className="text-[8.5px] font-bold pt-1 uppercase">Date of first consultation:</span><DateGrid value={formData.m_first_cons_date} /></div>
           </div>
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-64 pb-1 uppercase">Past history of present ailment if any:</span><GridBox value="" length={40} className="flex-1" /></div>
           <UnderlineField label="f. Provisional diagnosis:" value={formData.m_prov_diag || ''} />
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-32 pb-1 uppercase">g. ICD 10 Code:</span><GridBox value={formData.m_icd_code || ''} length={10} /></div>
           <div className="space-y-3 mt-4">
              <span className="text-[8.5px] font-bold uppercase">h. Proposed line of treatment:</span>
              <div className="flex flex-wrap gap-8 pl-4">
                 <TickBox label="Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
                 <TickBox label="Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
                 <TickBox label="Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
                 <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
                 <TickBox label="Non allopathic treatment." checked={false} />
              </div>
           </div>
           <UnderlineField label="I. If Investigation &/or Medical Management provide details:" value="" className="mt-4" />
           <UnderlineField label="j. Route of drug administration:" value={formData.m_route_drug || ''} />
           <UnderlineField label="k. If Surgical, name of surgery:" value={formData.m_surgery_name || ''} />
           <div className="flex items-end"><span className="text-[8.5px] font-bold w-40 pb-1 uppercase">l. ICD 10 PCS Code:</span><GridBox value="" length={10} /></div>
           <UnderlineField label="m. If other treatments provide details:" value="" />
           <UnderlineField label="n. How did injury occur:" value="" />
        </div>
        <div className="mt-auto pt-4 text-[7px] font-bold text-slate-400 flex justify-end uppercase">
          Activ Care, Product UIN: ADIHLIP20001V011920.
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <div className="space-y-5 mb-8">
           <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3"><span className="text-[8.5px] font-bold uppercase">o. In case of accident: i. Is it RTA –</span><TickBox label="Yes" checked={formData.m_is_rta === 'Yes'} /><TickBox label="No" checked={formData.m_is_rta === 'No'} /></div>
              <div className="flex items-start space-x-3"><span className="text-[8.5px] font-bold pt-1 uppercase">ii. Date of injury:</span><DateGrid value={formData.m_rta_date} /></div>
           </div>
           <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3"><span className="text-[8.5px] font-bold uppercase">iii. Reported to Police:</span><TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} /><TickBox label="No" checked={formData.m_rta_police === 'No'} /></div>
              <div className="flex items-end space-x-3"><span className="text-[8.5px] font-bold pb-1 uppercase">iv. FIR No:</span><GridBox value={formData.m_fir_no || ''} length={15} /></div>
           </div>
           <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3"><span className="text-[8.5px] font-bold uppercase">p. Injury /Disease caused due to substance abuse/alcohol consumption:</span><TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} /><TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} /></div>
           </div>
           <div className="flex items-center space-x-6 pl-4">
              <span className="text-[8.5px] font-bold uppercase">Test conducted to establish this:</span>
              <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
              <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
              <span className="text-[7.5px] font-bold text-slate-400 uppercase">(if Yes attach reports)</span>
           </div>
           <div className="flex items-center space-x-10">
              <div className="flex items-center space-x-4"><span className="text-[8.5px] font-bold uppercase">q. In case of Maternity :</span><div className="flex border border-black bg-slate-50"><div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">G: {formData.m_mat_g || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">P: {formData.m_mat_p || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center border-r border-black text-[9px] font-bold">L: {formData.m_mat_l || '0'}</div><div className="px-1.5 h-5 flex items-center justify-center text-[9px] font-bold">A: {formData.m_mat_a || '0'}</div></div></div>
              <div className="flex items-start space-x-4"><span className="text-[8.5px] font-bold pt-1 uppercase">Date of Delivery:</span><DateGrid value={formData.m_mat_edd} /></div>
           </div>
        </div>

        <SectionBanner>Details of the patient admitted</SectionBanner>
        <div className="space-y-5">
           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-start space-x-4"><span className="text-[8.5px] font-bold pt-1 uppercase">a. Date of admission:</span><DateGrid value={formData.adm_date} /></div>
              <div className="flex items-start space-x-4"><span className="text-[8.5px] font-bold pt-1 uppercase">b. Time:</span><TimeGrid value={formData.adm_time} /><span className="text-[6.5px] font-bold text-slate-400 pt-1.5">(HH:MM)</span></div>
           </div>
           <div className="flex items-center space-x-12">
              <span className="text-[8.5px] font-bold uppercase">c. Is this an emergency /a planned hospitalization event?</span>
              <TickBox label="Emergency" checked={false} />
              <TickBox label="Planned" checked={true} />
           </div>
           <div className="grid grid-cols-2 gap-x-12">
              <div className="flex items-end space-x-4"><span className="text-[8.5px] font-bold pb-1.5 uppercase">d. Expected no. of days stay in hospital:</span><GridBox value={String(formData.adm_stay_days || '')} length={3} /><span className="text-[8px] font-bold pb-1.5 uppercase">Days.</span></div>
              <div className="flex items-end space-x-4"><span className="text-[8.5px] font-bold pb-1.5 uppercase">e. Room Type:</span><GridBox value={formData.adm_room_type || ''} length={25} className="flex-1" /></div>
           </div>

           <div className="space-y-1.5 mt-8 border-t border-slate-100 pt-6">
              {[
                 { label: "f. Per Day Room Rent + Nursing & Service Charges + Patient’s Diet", id: "cost_room_rent" },
                 { label: "g. Expected cost of investigation + diagnostics:", id: "cost_investigation" },
                 { label: "h. ICU Charges:", id: "cost_icu" },
                 { label: "i. OT Charges:", id: "cost_ot" },
                 { label: "j. Professional fees Surgeon+ Anaesthetist Fees + consultation Charges:", id: "cost_prof_fees" },
                 { label: "k. Medicines+ Consumables+ Cost of Implants( if applicable specify) Other hospital expenses if any:", id: "cost_medicines" },
                 { label: "l. All inclusive package charges if any applicable:", id: "cost_package" },
                 { label: "m. Sum total expected cost of hospitalisation:", id: "adm_total_cost", isBold: true },
              ].map((item, idx) => (
                 <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.isBold ? 'border-black mt-4 pt-1' : ''}`}>
                    <span className={`text-[7.5px] font-bold uppercase ${item.isBold ? 'font-black' : ''}`}>{item.label}</span>
                    <div className="flex items-center">
                       <span className="text-[8px] mr-2 font-bold">Rs.</span>
                       <GridBox value={String(formData[item.id] || 0)} length={7} />
                    </div>
                 </div>
              ))}
           </div>
        </div>

        <SectionBanner>MANDATORY: PAST HISTORY OF ANY CHRONIC ILLNESS IF YES, SINCE (MONTH/YEAR).</SectionBanner>
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 px-4">
           {[
             { label: "Diabetes:", key: "diabetes" },
             { label: "Heart Disease:", key: "heart" },
             { label: "Hypertension:", key: "hypertension" },
             { label: "Hyperlipidemias:", key: "hyperlipidemias" },
             { label: "Osteoarthritis:", key: "osteoarthritis" },
             { label: "Asthma/COPD/Bronchitis:", key: "asthma" },
             { label: "Cancer:", key: "cancer" },
             { label: "Alcohol or drug absuse:", key: "alcohol" },
             { label: "Any HIV or STD/Related ailment:", key: "hiv" },
           ].map(ill => (
              <div key={ill.key} className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 border border-black bg-white"></div>
                    <span className="text-[8.5px] font-bold uppercase text-slate-700">{ill.label}</span>
                 </div>
                 <div className="flex items-start space-x-1.5">
                    <GridBox value="" length={2} subLabel="M M" />
                    <GridBox value="" length={2} subLabel="Y Y" />
                 </div>
              </div>
           ))}
           <div className="col-span-2 mt-4">
             <UnderlineField label="Any other Ailment give details:" value="" />
           </div>
        </div>

        <SectionBanner>DECLARATION (PLEASE READ VERY CAREFULLY)</SectionBanner>
        <p className="text-[8px] font-bold text-slate-600 mb-6 uppercase text-center italic">We confirm having read understood and agreed to the Declarations on the reverse of this form.</p>
        <div className="space-y-4 px-2">
           <div className="flex items-end space-x-3"><span className="text-[8.5px] font-bold pb-1.5 uppercase">a. Name of the treating doctor:</span><GridBox value={formData.dr_name || ''} length={30} className="flex-1" /></div>
           <div className="flex items-end space-x-3"><span className="text-[8.5px] font-bold pb-1.5 uppercase">b. Qualification:</span><GridBox value="MBBS, MD" length={40} className="flex-1" /></div>
           <div className="flex items-end space-x-3"><span className="text-[8.5px] font-bold pb-1.5 uppercase">c. Registration No. with State Code:</span><GridBox value={formData.registrationNo || ''} length={15} /></div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-12 px-2">
           <div className="h-28 border border-black relative flex items-center justify-center bg-slate-50/50">
              <span className="absolute top-1 left-2 text-[6px] font-bold text-slate-300 uppercase">Hospital Seal (Must include Hospital ID).</span>
              {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
           </div>
           <div className="h-28 border border-black relative flex items-center justify-center bg-slate-50/50">
              <span className="absolute top-1 left-2 text-[6px] font-bold text-slate-300 uppercase">Patient / Insured Name & Signature</span>
           </div>
        </div>

        <div className="mt-auto pt-4 text-[7px] font-bold text-slate-400 flex justify-between uppercase">
          <span>(IMPORTANT PLEASE TURN OVER)</span>
          <span>Activ Care, Product UIN: ADIHLIP20001V011920.</span>
        </div>
      </div>

      {/* PAGE 3 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <SectionBanner>DECLARATION BY THE PATIENT/REPRESENTATIVE:</SectionBanner>
        <div className="space-y-4 text-[8.5px] text-slate-700 text-justify leading-relaxed px-4">
           <p>1. I agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer / TPA after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</p>
           <p>2. Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer / TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</p>
           <p>3. All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorised by the Insurer / TPA not governed by the terms and conditions of the policy will be paid by me.</p>
           <p>4. I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect, I forfeit my claim and agree to indemnify the Insurer / TPA.</p>
           <p>5. I agree and understand that TPA is in no way warranting the service of the hospital & that the Insurer / TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</p>
           <p>6. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</p>
           <p>7. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer / TPA.</p>
        </div>

        <div className="mt-8 space-y-6 px-4">
           <div className="flex items-end space-x-3"><span className="text-[8.5px] font-bold pb-1.5 uppercase">Patient’s/Insured’s Name:</span><GridBox value={formData.p_name || ''} length={35} className="flex-1" /></div>
           <div className="grid grid-cols-2 gap-12">
              <div className="h-20 border border-black relative flex items-center justify-center bg-slate-50/50">
                 <span className="absolute top-1 left-2 text-[6px] font-bold text-slate-300 uppercase">Patient’s/Insured’s Signature</span>
              </div>
              <div className="flex items-end space-x-3"><span className="text-[8.5px] font-bold pb-1.5 uppercase">Contact Number:</span><GridBox value={formData.p_contact || ''} length={10} /></div>
           </div>
        </div>

        <SectionBanner>HOSPITAL DECLARATION</SectionBanner>
        <div className="space-y-4 text-[8.5px] text-slate-700 text-justify leading-relaxed px-4">
           <p>1. We have no objection to any authorized TPA / Insurance Company official verifying documents pertaining to hospitalization.</p>
           <p>2. All valid original documents duly countersigned by the insured / patient as per the checklist mentioned below will be sent to TPA / Insurance Company within 7 days of the patient’s discharge.</p>
           <p>3. All nonmedical expenses OR expenses not relevant to hospitalization or illness OR expenses disallowed in the Authorisation Letter of the TPA / Insurance Co. OR arising out of incorrect information in the pre-authorisation form will be collected from the patient.</p>
           <p>4. WE AGREE THAT TPA / INSURANCE COMPANY WILL NOT BE LIABLE TO MAKE THE PAYMENT IN THE EVENT OF ANY DISCREPANCY BETWEEN THE FACTS IN THIS FORM AND DISCHARGE SUMMARY OR OTHER DOCUMENTS.</p>
           <p>5. The patient declaration has been signed by the patient or by his representative in our presence.</p>
           <p>6. We agree to provide clarifications for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications.</p>
           <p>7. We will abide by the terms and conditions agreed in the MOU.</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-12 px-4 mb-auto">
           <div className="h-28 border border-black relative flex items-center justify-center bg-slate-50/50">
              <span className="absolute top-1 left-2 text-[6px] font-bold text-slate-300 uppercase">Hospital Seal:</span>
              {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
           </div>
           <div className="h-28 border border-black relative flex items-center justify-center bg-slate-50/50">
              <span className="absolute top-1 left-2 text-[6px] font-bold text-slate-300 uppercase">Doctor’s Signature:</span>
              {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
           </div>
        </div>

        <div className="mt-auto pt-4 text-[7px] font-bold text-slate-400 flex justify-end uppercase">
          Activ Care, Product UIN: ADIHLIP20001V011920.
        </div>
      </div>

      {/* PAGE 4 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <SectionBanner>DOCUMENTS TO BE PROVIDED BY THE HOSPITAL IN SUPPORT OF THE CLAIM</SectionBanner>
        <div className="space-y-6 text-[10px] font-bold text-slate-700 pl-4 mt-8">
           <p>1. Detailed Discharge Summary and all Bills from the hospital</p>
           <p>2. Cash Memos from the Hospitals / Chemists supported by proper prescription.</p>
           <p>3. Receipts and Pathological Test Reports from Pathologists, supported by note from the attending Medical Practitioner / Surgeon recommending such pathological Tests.</p>
           <p>4. Surgeon’s Certificate stating nature of operation performed and Surgeon’s Bill and Receipt.</p>
           <p>5. Certificates from attending Medical Practitioner / Surgeon that the patient is fully cured.</p>
        </div>

        <div className="mt-auto pt-10 border-t border-slate-200">
           <div className="grid grid-cols-12 gap-10">
              <div className="col-span-8 space-y-2 text-[7.5px] font-bold text-slate-500 uppercase leading-relaxed">
                 <p className="font-black text-slate-800">Aditya Birla Health Insurance Co. Limited. IRDAI Reg.153. CIN No. U66000MH2015PLC263677.</p>
                 <p>Product Name: Activ Care, Product UIN: ADIHLIP20001V011920.</p>
                 <p>Address: 9th Floor, Tower 1, One Indiabulls Centre, Jupiter Mills Compound, 841, Senapati Bapat Marg, Elphinstone Road, Mumbai 400013. Email: care.healthinsurance@adityabirlacapital.com, Website: adityabirlahealthinsurance.com, Telephone: 1800 270 7000, Fax: +91 22 6225 7700. Trademark/Logo Aditya Birla Capital is owned by Aditya Birla Management Corporation Private Limited and is used by Aditya Birla Health Insurance Co. Limited under licensed user agreement(s).</p>
              </div>
              <div className="col-span-4 flex flex-col justify-between">
                 <div className="bg-[#b31920] p-4 text-white rounded-sm space-y-1">
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Contact us:</p>
                    <p className="text-[18px] font-black tracking-tight leading-none">1800 270 7000</p>
                 </div>
                 <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-sm border border-slate-100 self-end w-full">
                    <div className="grid grid-cols-2 gap-0.5">
                       <div className="w-3 h-3 bg-slate-200"></div>
                       <div className="w-3 h-3 bg-[#b31920]"></div>
                       <div className="w-3 h-3 bg-[#b31920]"></div>
                       <div className="w-3 h-3 bg-slate-200"></div>
                    </div>
                    <div className="flex flex-col leading-none">
                       <span className="text-[10px] font-black text-slate-800 uppercase">ADITYA BIRLA</span>
                       <span className="text-[14px] font-black text-slate-800 uppercase">CAPITAL</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

    </div>
  );
};

export default AdityaBirlaTemplate;
