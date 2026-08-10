
import React from 'react';

interface IciciLombardTemplateProps {
  formData: Record<string, any>;
}

// Character grid input for names and numbers
const GridBox: React.FC<{ value: string; length: number; label?: string; subLabel?: string; className?: string }> = ({ value, length, label, subLabel, className = "" }) => {
  const chars = String(value || '').toUpperCase().padEnd(length, ' ').slice(0, length).split('');
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-[7.5px] font-black text-slate-800 uppercase mb-0.5 leading-none">{label}</span>}
      <div className="flex border-l border-t border-black bg-white">
        {chars.map((char, i) => (
          <div key={i} className="w-[11.5px] h-[13px] border-r border-b border-black flex items-center justify-center text-[9px] font-black text-black">
            {char === ' ' ? '' : char}
          </div>
        ))}
      </div>
      {subLabel && <span className="text-[6px] font-bold text-slate-400 uppercase mt-0.5 text-center w-full">{subLabel}</span>}
    </div>
  );
};

// Date grid D D M M Y Y Y Y
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
          <div key={i} className={`w-[11.5px] h-[13px] border border-black flex items-center justify-center text-[9px] font-black bg-white ${i === 1 || i === 3 ? 'mr-1.5' : '-ml-[1px]'}`}>
            {char}
          </div>
        ))}
      </div>
      <div className="flex text-[5.5px] font-bold text-slate-400 mt-0.5">
        <span className="w-[23px] text-center">D D</span>
        <span className="w-[5px]"></span>
        <span className="w-[23px] text-center">M M</span>
        <span className="w-[5px]"></span>
        <span className="w-[46px] text-center">Y Y Y Y</span>
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

const SectionBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white border-y border-black text-black text-center py-0.5 my-2 text-[9.5px] font-black uppercase tracking-widest">
    {children}
  </div>
);

const IciciHeader: React.FC = () => (
  <div className="space-y-1">
    <div className="flex justify-between items-end pb-2">
      <div className="flex flex-col items-center">
        <div className="flex items-center space-x-2">
           <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center rounded-lg shadow-sm">
             <span className="font-black text-xl italic tracking-tighter">i</span>
           </div>
           <div className="flex flex-col">
             <span className="text-2xl font-black italic tracking-tighter text-slate-800">ICICI Lombard</span>
             <span className="text-[8px] font-black tracking-[0.4em] text-slate-600">— GENERAL INSURANCE —</span>
           </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="text-right">
           <p className="text-[12px] font-black italic text-slate-800 leading-none">ICICI Lombard</p>
           <p className="text-[10px] font-black italic text-slate-600">Health Care</p>
        </div>
        {/* Apple shape logo SVG placeholder */}
        <div className="w-10 h-10 border border-slate-300 rounded-full flex items-center justify-center">
           <svg viewBox="0 0 24 24" className="w-8 h-8 fill-slate-800"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
        </div>
      </div>
    </div>
    <div className="bg-black text-white text-center py-2">
       <h1 className="text-[15px] font-black uppercase tracking-[0.2em]">CASHLESS AUTHORIZATION REQUEST NOTE</h1>
    </div>
    <div className="bg-slate-100/50 text-[7.5px] font-bold text-center py-1 text-slate-500 border-b border-slate-200">
      Toll Free Number: 1800 2666 • Fax Number: 1800 209 8880 / 040 6698 9160 / 61 • Email us: cashlessrequest@icicilombard.com
    </div>
  </div>
);

const IciciLombardTemplate: React.FC<IciciLombardTemplateProps> = ({ formData }) => {
  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-8 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col">
        <IciciHeader />

        <SectionBanner>TO BE FILLED BY THE INSURED / PATIENT</SectionBanner>

        <div className="space-y-4 mb-6 pt-2">
          <div className="flex items-end">
            <span className="text-[8.5px] font-bold w-36 pb-1">1) Name of Patient:</span>
            <GridBox value={formData.p_name || ''} length={40} className="flex-1" />
          </div>

          <div className="flex items-start gap-10">
            <div className="flex items-center gap-3">
              <span className="text-[8.5px] font-bold">2) Gender:</span>
              <TickBox label="Male" checked={formData.p_gender === 'Male'} />
              <TickBox label="Female" checked={formData.p_gender === 'Female'} />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[8.5px] font-bold pb-1">3) Age:</span>
              <GridBox value={String(formData.p_age_y || '')} length={3} />
              <span className="text-[8px] font-bold pb-1 lowercase">Years</span>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-[8.5px] font-bold pt-1">4) Date of Birth:</span>
              <DateGrid value={formData.p_dob} />
            </div>
            <div className="flex items-end gap-2 flex-1">
              <span className="text-[8.5px] font-bold pb-1">5) Mobile No.:</span>
              <GridBox value={formData.p_contact || ''} length={10} />
            </div>
          </div>

          <div className="flex items-end gap-10">
            <div className="flex items-end gap-2">
              <span className="text-[8.5px] font-bold pb-1">5) Insured Card ID No:</span>
              <GridBox value={formData.p_card_id || ''} length={20} />
            </div>
            <UnderlineField label="6) Email ID:" value={formData.p_email || ''} className="flex-1" />
          </div>

          <div className="flex items-end">
            <span className="text-[8.5px] font-bold w-36 pb-1">7) Policy No.:</span>
            <GridBox value={formData.p_policy_no || ''} length={35} className="flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-10">
            <UnderlineField label="8) a) Corporate Policy No.:" value="" />
            <UnderlineField label="b) Corporate Policy Name:" value="" />
          </div>

          <div className="flex items-center gap-10">
            <UnderlineField label="c) Employee ID:" value={formData.p_employee_id || ''} className="w-64" />
            <div className="flex items-center gap-4">
              <span className="text-[8px] font-bold">9) Currently do you have any other Mediclaim / Health insurance</span>
              <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
              <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
             <UnderlineField label="If Yes, Company Name:" value={formData.p_other_insurer_name || ''} />
             <UnderlineField label="Give details:" value="" />
          </div>

          <div className="grid grid-cols-2 gap-10">
            <UnderlineField label="10) a) Name of the family physician:" value={formData.p_family_physician_name || ''} />
            <div className="flex items-end gap-2">
              <span className="text-[8.5px] font-bold pb-1">b) Contact Number:</span>
              <GridBox value={formData.p_family_physician_contact || ''} length={10} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <span className="text-[8.5px] font-bold">11) ID/Age Proof Attached:</span>
            <TickBox label="Aadhar Card" checked={false} />
            <TickBox label="Passport" checked={false} />
            <TickBox label="Driving License" checked={false} />
            <TickBox label="10th Class Certificate" checked={false} />
            <UnderlineField label="Others" value="" className="flex-1" />
          </div>
        </div>

        <SectionBanner>TO BE FILLED BY THE TREATING DOCTOR / HOSPITAL</SectionBanner>

        <div className="space-y-3 pt-2">
           <div className="grid grid-cols-12 gap-8">
              <div className="col-span-8">
                 <UnderlineField label="1) a) Name of the treating doctor" value={formData.dr_name || ''} />
              </div>
              <div className="col-span-4 flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 whitespace-nowrap">b) Mobile No.:</span>
                 <GridBox value={formData.dr_contact || ''} length={10} className="flex-1" />
              </div>
           </div>
           <div className="grid grid-cols-12 gap-8">
              <div className="col-span-8">
                 <UnderlineField label="2) a) Name of Hospital:" value={formData.hosp_name || ''} />
              </div>
              <div className="col-span-4 flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 whitespace-nowrap">b) Contact No.:</span>
                 <GridBox value={formData.hosp_mobile || ''} length={10} className="flex-1" />
              </div>
           </div>
           <div className="grid grid-cols-3 gap-6">
              <UnderlineField label="c) NT Code:" value="" />
              <UnderlineField label="d) Email ID:" value={formData.hosp_email || ''} />
              <UnderlineField label="e) Fax No." value="" />
           </div>
           <UnderlineField label="3) Nature of Illness / Disease with presenting complaints:" value={formData.m_illness || ''} />
           <UnderlineField label="4) Relevant clinical findings:" value={formData.m_clinical_findings || ''} />
           <div className="flex items-center gap-6">
              <UnderlineField label="5) a) Past history of present ailment, if any:" value="" className="flex-1" />
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 whitespace-nowrap">b) Duration of present ailment:</span>
                 <GridBox value={String(formData.m_duration || '')} length={3} />
                 <span className="text-[7.5px] font-bold pb-1 lowercase">Days</span>
              </div>
              <div className="flex items-start gap-3">
                 <span className="text-[8px] font-bold pt-1 whitespace-nowrap">c) Date of first consultation:</span>
                 <DateGrid value={formData.m_first_cons_date} />
              </div>
           </div>
           <div className="flex items-end gap-6">
              <UnderlineField label="6) a) Provisional diagnosis:" value={formData.m_prov_diag || ''} className="flex-1" />
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 whitespace-nowrap">b) ICD 10 Code:</span>
                 <GridBox value={formData.m_icd_code || ''} length={10} />
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-2">
              <span className="text-[8px] font-bold uppercase">7) Proposed line of treatment:</span>
              <TickBox label="Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
              <TickBox label="Surgical Management" checked={formData.m_treatment_type === 'Surgical Management'} />
              <TickBox label="Intensive care" checked={formData.m_treatment_type === 'Intensive care'} />
              <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
              <TickBox label="Non allopathic treatment" checked={false} />
           </div>

           <div className="grid grid-cols-2 gap-10">
              <UnderlineField label="8) a) If Investigation & / or Medical management, provide details:" value="" />
              <UnderlineField label="b) Route of drug administration:" value={formData.m_route_drug || ''} />
           </div>
           
           <div className="flex items-end gap-6">
              <UnderlineField label="9) a) If Surgical, name of surgery:" value={formData.m_surgery_name || ''} className="flex-1" />
              <div className="flex items-end gap-2">
                 <span className="text-[8px] font-bold pb-1 whitespace-nowrap">b) ICD 10 PCS Code:</span>
                 <GridBox value="" length={10} />
              </div>
           </div>
           <UnderlineField label="10) If other treatments provide details:" value="" />

           <div className="grid grid-cols-2 gap-8 border-y border-black py-2 my-2">
              <div className="space-y-2">
                 <div className="flex items-center gap-4">
                    <span className="text-[7.5px] font-bold uppercase">11) In case of accident: a) Is it RTA:</span>
                    <TickBox label="Y" checked={formData.m_is_rta === 'Yes'} />
                    <TickBox label="N" checked={formData.m_is_rta === 'No'} />
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="text-[7.5px] font-bold uppercase">b) Date of injury:</span>
                    <DateGrid value={formData.m_rta_date} />
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex items-center gap-4">
                    <span className="text-[7.5px] font-bold uppercase">c) Reported to Police:</span>
                    <TickBox label="Y" checked={formData.m_rta_police === 'Yes'} />
                    <TickBox label="N" checked={formData.m_rta_police === 'No'} />
                    <UnderlineField label="FIR No." value={formData.m_fir_no || ''} className="flex-1" />
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="text-[7.5px] font-bold uppercase">12) a) Injury / Disease caused due to substance abuse / alcohol:</span>
                    <TickBox label="Y" checked={formData.m_abuse_alcohol === 'Yes'} />
                    <TickBox label="N" checked={formData.m_abuse_alcohol === 'No'} />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-12 gap-8">
              <div className="col-span-7 space-y-3">
                 <p className="text-[9px] font-black uppercase tracking-tight border-b border-black w-fit">Details of patient admitted</p>
                 <div className="flex items-center gap-4"><span className="text-[8px] font-bold uppercase">a) Date of admission:</span><DateGrid value={formData.adm_date} /></div>
                 <div className="flex items-center gap-4">
                    <span className="text-[8px] font-bold uppercase">b) Time :</span>
                    <div className="flex border border-black h-5">
                       <div className="w-5 flex items-center justify-center border-r border-black font-black text-[9px]">{formData.adm_time?.split(':')[0] || '  '}</div>
                       <div className="w-5 flex items-center justify-center font-black text-[9px]">{formData.adm_time?.split(':')[1] || '  '}</div>
                    </div>
                    <span className="text-[6px] font-bold">H H : M M</span>
                 </div>
                 <div className="flex items-center gap-4"><span className="text-[8px] font-bold uppercase">c) Is this an emergency / planned event?</span><TickBox label="Emergency" checked={false} /><TickBox label="Planned" checked={true} /></div>
                 <div className="flex items-end gap-2"><span className="text-[8px] font-bold uppercase pb-1">d) Expected no. of days stay:</span><GridBox value={String(formData.adm_stay_days || '')} length={3} /><span className="text-[7px] font-bold pb-1 lowercase">Days</span></div>
                 <UnderlineField label="e) Room Type:" value={formData.adm_room_type || ''} />

                 <div className="space-y-1 mt-4">
                    {[
                       { label: "f) Per Day Room Rent + Nursing + Diet:", id: "cost_room_rent" },
                       { label: "g) Expected cost for investigation + diagnostics:", id: "cost_investigation" },
                       { label: "h) ICU Charges:", id: "cost_icu" },
                       { label: "i) OT Charges:", id: "cost_ot" },
                       { label: "j) Professional fees Surgeon + Anesthetist Fees:", id: "cost_prof_fees" },
                       { label: "k) Medicines + Consumables + Implants:", id: "cost_medicines" },
                       { label: "l) All inclusive package charges if any:", id: "cost_package" },
                       { label: "Sum total expected cost of hospitalization:", id: "adm_total_cost", bold: true },
                    ].map((item, idx) => (
                       <div key={idx} className={`flex items-end justify-between border-b border-slate-50 pb-0.5 ${item.bold ? 'border-black mt-2 pt-1' : ''}`}>
                          <span className={`text-[7px] font-bold uppercase ${item.bold ? 'font-black' : ''}`}>{item.label}</span>
                          <div className="flex items-center">
                             <span className="text-[8px] mr-1 font-black">`</span>
                             <GridBox value={String(formData[item.id] || 0)} length={7} />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="col-span-5 bg-slate-50/50 p-4 border-l border-black">
                 <p className="text-[8.5px] font-black uppercase mb-4 leading-tight">Mandatory: Past History of any<br/>chronic illness <span className="lowercase font-bold">If yes, since (Month/year)</span></p>
                 <div className="space-y-2">
                    {[
                       "Diabetes", "Heart Disease", "Hypertension", "Hyperlipidemias", "Osteoarthritis",
                       "Asthma / COPD / Bronchitis", "Cancer", "Alcohol or drug abuse", "Any HIV or STD / Related", "Other ailments"
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
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-6 border-t border-black pt-4">
           <SectionBanner>DECLARATION</SectionBanner>
           <p className="text-[8px] font-black text-center mb-4 uppercase">We confirm having read understood and agreed to the Declarations on the reverse of this form</p>
           <div className="space-y-6">
              <div className="flex items-end">
                 <span className="text-[8px] font-bold w-48 pb-2 uppercase">a) Name of the treating doctor:</span>
                 <div className="flex-1 flex gap-3">
                    <GridBox value={formData.dr_name?.split(' ')[2] || ''} length={12} label="S U R N A M E" />
                    <GridBox value={formData.dr_name?.split(' ')[0] || ''} length={12} label="F I R S T  N A M E" />
                    <GridBox value={formData.dr_name?.split(' ')[1] || ''} length={12} label="M I D D L E  N A M E" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-10">
                 <UnderlineField label="b) Qualification:" value="MBBS, MD" />
                 <div className="flex items-end gap-2">
                    <span className="text-[8px] font-bold pb-1 uppercase">c) Registration No. with state code:</span>
                    <GridBox value={formData.registrationNo || ''} length={15} />
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-6 h-28">
                 <div className="border border-black p-4 relative flex items-end justify-center text-[7px] font-bold uppercase text-slate-300">
                    <span className="absolute top-1 left-1">Signature of treating doctor</span>
                 </div>
                 <div className="border border-black p-4 relative flex items-center justify-center">
                    <span className="absolute top-1 left-1 text-[7px] font-bold uppercase text-slate-300">Hospital Seal (Must include Hospital NT ID)</span>
                    {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
                 </div>
                 <div className="border border-black p-4 relative flex items-end justify-center text-[7px] font-bold uppercase text-slate-300">
                    <span className="absolute top-1 left-1">Patient / Insured Name & Signature:</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-[8px] font-black text-slate-400">
           <p className="uppercase">PLEASE READ VERY CAREFULLY • THIS FORM IS TO BE FILLED IN BLOCK LETTERS</p>
           <p className="uppercase">(PLEASE COMPLETE DECLARATION ON THE REVERSE SIDE OF THIS FORM)</p>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-8 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col">
        <div className="bg-black text-white text-center py-1 mb-8 uppercase text-[12px] font-black tracking-widest">NOT TO BE FAXED/SCANNED</div>
        
        <div className="space-y-6 flex-1">
          <section className="space-y-4">
             <h3 className="text-[11px] font-black uppercase underline decoration-2 underline-offset-4">DECLARATION BY THE PATIENT / REPRESENTATIVE</h3>
             <ol className="list-decimal pl-5 space-y-2 text-[9px] font-medium leading-relaxed text-justify">
                <li>I agree to allow the hospital to submit all original documents pertaining to hospitalization to the Insurer/T.P.A after the discharge. I agree to sign on the Final Bill & the Discharge Summary, before my discharge.</li>
                <li>Payment to hospital is governed by the terms and conditions of the policy. In case the Insurer / TPA is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy.</li>
                <li>All non-medical expenses and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by the Insurer/T.P.A not governed by the terms and conditions of the policy will be paid by me.</li>
                <li>I hereby declare to abide by the terms and conditions of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the Insurer / T.P.A.</li>
                <li>I agree and understand that T.P.A is in no way warranting the service of the hospital & that the Insurer / TPA is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</li>
                <li>I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment with respect to the claim, my right to claim reimbursement of the said expenses shall be absolutely forfeited.</li>
                <li>I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the Insurer / TPA.</li>
             </ol>
             <div className="space-y-3 pt-4">
                <UnderlineField label="a) Patient's / Insured's Name:" value={formData.p_name || ''} />
                <UnderlineField label="b) Address:" value={formData.p_address || ''} />
                <div className="grid grid-cols-2 gap-10">
                   <div className="flex items-end gap-2">
                      <span className="text-[9px] font-bold pb-1 uppercase">c) Contact Number:</span>
                      <GridBox value={formData.p_contact || ''} length={10} />
                   </div>
                   <div className="border border-black p-6 h-20 relative flex items-center justify-center bg-slate-50/50">
                      <span className="absolute top-1 left-1 text-[7px] font-bold uppercase text-slate-300">d) Patient's / Insured's Signature:</span>
                   </div>
                </div>
             </div>
          </section>

          <section className="space-y-4 mt-12 pt-8 border-t border-slate-100">
             <h3 className="text-[11px] font-black uppercase underline decoration-2 underline-offset-4">HOSPITAL DECLARATION</h3>
             <ol className="list-decimal pl-5 space-y-2 text-[9px] font-medium leading-relaxed text-justify">
                <li>We have no objection to any authorized TPA / Insurance Company official verifying documents pertaining to hospitalization.</li>
                <li>All valid original documents duly countersigned by the insured / patient as per the checklist below will be sent to TPA / Insurance Company within 7 days of the patient's discharge.</li>
                <li>All non medical expenses, OR expenses not relevant to hospitalization or illness, OR expenses disallowed in the Authorization Letter of the TPA / Insurance Co, OR arising out of incorrect information in the pre-authorisation form will be collected from the patient.</li>
                <li>WE AGREE THAT TPA / INSURANCE COMPANY WILL NOT BE LIABLE TO MAKE THE PAYMENT IN THE EVENT OF ANY DISCREPANCY BETWEEN THE FACTS IN THIS FORM AND DISCHARGE SUMMARY or other documents.</li>
                <li>The patient declaration has been signed by the patient or by his representative in our presence.</li>
                <li>We agree to provide clarifications for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications.</li>
                <li>We will abide by the terms and conditions agreed in the MOU.</li>
             </ol>
             <div className="grid grid-cols-2 gap-10 mt-8 h-32">
                <div className="border border-black p-4 relative flex items-center justify-center">
                   <span className="absolute top-1 left-1 text-[7px] font-bold uppercase text-slate-300">Hospital Seal</span>
                   {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
                </div>
                <div className="border border-black p-4 relative flex items-center justify-center">
                   <span className="absolute top-1 left-1 text-[7px] font-bold uppercase text-slate-300">Doctor's Signature</span>
                   {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-[80%] max-w-[80%] opacity-80 mix-blend-multiply" />}
                </div>
             </div>
          </section>

          <section className="mt-12 p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-2">DOCUMENTS TO BE PROVIDED BY THE HOSPITAL IN SUPPORT OF THE CLAIM</h4>
             <ul className="space-y-1.5 text-[8.5px] font-bold text-slate-600">
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> 1. Detailed Discharge Summary and all Bills from the hospital</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> 2. Cash Memos from the Hospitals / Chemists supported by proper prescription.</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> 3. Receipts and Pathological Test Reports from Pathologists, supported by physician note.</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> 4. Surgeon's Certificate stating nature of operation performed and Surgeon's Bill.</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> 5. Certificates from attending Medical Practitioner / Surgeon that the patient is fully cured.</li>
             </ul>
          </section>
        </div>

        <div className="mt-auto pt-6 flex justify-between items-center text-[7px] font-black text-slate-400">
           <p className="uppercase">ICICI Lombard General Insurance Co. Ltd.</p>
           <p className="uppercase">013035MI/SC</p>
        </div>
      </div>
    </div>
  );
};

export default IciciLombardTemplate;
