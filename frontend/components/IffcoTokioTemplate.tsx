
import React from 'react';

interface IffcoTokioTemplateProps {
  formData: Record<string, any>;
}

const IffcoTokioLogo: React.FC = () => (
  <div className="flex items-center gap-2">
    <div className="border border-slate-300 p-0.5 flex flex-col items-center">
      <div className="bg-[#008144] p-1 flex items-center justify-center">
        <span className="text-white font-black text-[14px] tracking-tighter italic">IFFCO-TOKIO</span>
      </div>
      <div className="text-[6px] font-black text-[#008144] uppercase tracking-widest mt-0.5">GENERAL INSURANCE</div>
      <div className="text-[7px] font-bold italic text-slate-500 mt-0.5">Muskurate Raho</div>
    </div>
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = "" }) => (
  <div className={`flex items-end border-b border-slate-300 pb-0.5 ${className}`}>
    <span className="text-[9px] font-bold text-slate-700 whitespace-nowrap mr-2 uppercase">{label}</span>
    <span className="text-[10px] font-black text-black uppercase flex-1 truncate leading-none">{value}</span>
  </div>
);

const Checkbox: React.FC<{ label: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`flex items-center space-x-1.5 ${className}`}>
    <div className={`w-3.5 h-3.5 border border-slate-800 flex items-center justify-center bg-white`}>
      {checked && <div className="w-2.5 h-2.5 bg-slate-900"></div>}
    </div>
    <span className="text-[9px] font-bold text-slate-800 uppercase">{label}</span>
  </div>
);

const IffcoTokioTemplate: React.FC<IffcoTokioTemplateProps> = ({ formData }) => {
  const chronicList = [
    { id: 'diabetes', label: '(a) Diabetes' },
    { id: 'hypertension', label: '(b) Hypertension' },
    { id: 'heart_disease', label: '(c) Heart Disease' },
    { id: 'asthma_copd', label: '(d) Br. Asthma/COPD' },
    { id: 'osteoarthritis', label: '(e) Osteo Arthritis' },
    { id: 'cancer', label: '(f) Cancer' },
    { id: 'other_1', label: '(g) Any Other Ailment' },
    { id: 'alcohol', label: '(h) Any h/o Alcohol abuse' },
    { id: 'hiv_std', label: '(i) Any HIV or STD' },
    { id: 'other_2', label: '(j) Any Other Ailment' }
  ];

  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden">
        
        <div className="border-2 border-black flex flex-col">
          <div className="flex justify-between items-center p-2 border-b-2 border-black">
            <div className="flex-1 text-center">
              <h1 className="text-[12px] font-black uppercase">FORM 1: CASHLESS REQUEST FORM</h1>
              <h2 className="text-[11px] font-black uppercase mt-1">IFFCO TOKIO GENERAL INSURANCE COMPANY LIMITED</h2>
            </div>
            <IffcoTokioLogo />
          </div>

          <div className="bg-slate-100 py-1 text-center font-black uppercase text-[10px] border-b-2 border-black">
            TO BE FILLED BY THE INSURED / PATIENT
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <UnderlineField label="Name of Patient :" value={formData.p_name || ''} className="col-span-8" />
              <UnderlineField label="Age :" value={String(formData.p_age_y || '')} className="col-span-2" />
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-[9px] font-bold">SEX :</span>
                <Checkbox label="M" checked={formData.p_gender === 'Male'} />
                <Checkbox label="F" checked={formData.p_gender === 'Female'} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <UnderlineField label="Contact Number :" value={formData.p_contact || ''} />
              <UnderlineField label="Email :" value={formData.p_email || ''} />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <UnderlineField label="Name of Proposer:" value="" />
              <UnderlineField label="Relation to Proposer:" value="" />
            </div>

            <UnderlineField label="Address :" value={formData.p_address || ''} />

            <UnderlineField label="Policy Type : Indv / Group (GROUP NAME) :" value="" />

            <div className="grid grid-cols-3 gap-4">
              <UnderlineField label="Card ID No." value={formData.p_card_id || ''} />
              <UnderlineField label="Policy No." value={formData.p_policy_no || ''} />
              <UnderlineField label="Emp.ID" value={formData.p_employee_id || ''} />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-bold">ANY PAST POLICY (Y/N)</span>
                <Checkbox label="Y" checked={false} />
                <Checkbox label="N" checked={true} />
              </div>
              <p className="text-[8px] font-bold text-slate-500">If Y, attach copies</p>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase">Are you presently covered under any other similar type & scheme, cancer / medical / health insurance etc. Give Details</p>
              <div className="border-b border-slate-300 h-6"></div>
            </div>
          </div>

          <div className="bg-slate-100 py-1 text-center font-black uppercase text-[10px] border-y-2 border-black">
            TO BE FILLED BY THE TREATING DOCTOR / HOSPITAL
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <UnderlineField label="Doctor (Name & Mobile No)" value={`${formData.dr_name || ''} - ${formData.dr_contact || ''}`} className="col-span-6" />
              <UnderlineField label="Qualification:" value="MBBS, MD" className="col-span-3" />
              <UnderlineField label="Reg.No. :" value={formData.dec_reg_no || ''} className="col-span-3" />
            </div>

            <UnderlineField label="Presenting complaints with duration:" value={formData.m_illness || ''} />
            <UnderlineField label="Relevant Clinical Findings :" value={formData.m_clinical_findings || ''} />
            <UnderlineField label="Earlier history of the present ailment if any :" value="" />
            
            <div className="grid grid-cols-2 gap-8">
              <UnderlineField label="Date of First Consultation (Fax Prescription)" value={formData.m_first_cons_date || ''} />
              <UnderlineField label="Rx / Tests done so far (FAX documents) :" value="" />
            </div>

            <div className="grid grid-cols-12 gap-4">
              <UnderlineField label="Provisional Diagnosis :" value={formData.m_prov_diag || ''} className="col-span-8" />
              <UnderlineField label="ICD - 10 CM Code:" value={formData.m_icd_code || ''} className="col-span-4" />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <span className="text-[9px] font-bold">Proposed Line of Treatment :</span>
              <Checkbox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
              <Checkbox label="Intensive Care" checked={formData.m_treatment_type === 'Intensive care'} />
              <Checkbox label="Medical Management" checked={formData.m_treatment_type === 'Medical Management'} />
              <Checkbox label="Surgical" checked={formData.m_treatment_type === 'Surgical Management'} />
            </div>

            <p className="text-[8.5px] font-bold leading-tight">(a) If 'Investigation &/or Medical management' provide detailed line of treatment with route of drug administration :-</p>
            <div className="border-b border-slate-300 h-6"></div>

            <div className="grid grid-cols-12 gap-4">
              <UnderlineField label="(b) If Surgical, name of the Surgery & its details" value={formData.m_surgery_name || ''} className="col-span-12" />
            </div>

            <div className="grid grid-cols-12 gap-4">
              <UnderlineField label="(c) For other treatments, furnish details :" value="" className="col-span-8" />
              <UnderlineField label="ICD 10 PCS Code :" value="" className="col-span-4" />
            </div>

            <div className="grid grid-cols-12 gap-4">
              <UnderlineField label="Likely DOA" value={formData.adm_date || ''} className="col-span-3" />
              <UnderlineField label="Likely length of stay" value={`${formData.adm_stay_days || ''} Days`} className="col-span-3" />
              <UnderlineField label="Room Type" value={formData.adm_room_type || ''} className="col-span-3" />
              <UnderlineField label="Room No. :" value="" className="col-span-3" />
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 border border-slate-300 p-2 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[8px] font-black uppercase">In Case of ACCIDENTS :</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px]">Is it RTA</span>
                    <Checkbox label="Y" checked={formData.m_is_rta === 'Yes'} />
                    <Checkbox label="N" checked={formData.m_is_rta === 'No'} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px]">MLC</span>
                  <Checkbox label="Y" checked={formData.m_rta_police === 'Yes'} />
                  <Checkbox label="N" checked={formData.m_rta_police === 'No'} />
                  <UnderlineField label="Date of injury :" value={formData.m_rta_date || ''} className="flex-1" />
                </div>
                <UnderlineField label="How did injury occur" value="" />
                <div className="flex items-center gap-4">
                  <span className="text-[8px]">FIR Attached :</span>
                  <Checkbox label="Y" checked={false} />
                  <Checkbox label="N" checked={true} />
                  <span className="text-[8px] ml-4">Alcohol / Drug Intoxication</span>
                  <Checkbox label="Y" checked={formData.m_abuse_alcohol === 'Yes'} />
                  <Checkbox label="N" checked={formData.m_abuse_alcohol === 'No'} />
                </div>
              </div>
              <div className="col-span-6 border border-slate-300 p-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase">In case of MATERNITY</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {['G','P','L','A'].map(l => <span key={l} className="text-[9px] font-bold">{l}____</span>)}
                </div>
                <UnderlineField label="LMP" value="" className="mt-4" />
              </div>
            </div>
          </div>

          <div className="bg-slate-100 py-1 text-center font-black uppercase text-[10px] border-y-2 border-black">
            HOSPITAL DETAILS
          </div>

          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-6 border-r border-black p-2 space-y-2">
              <UnderlineField label="Hospital name :" value={formData.hosp_name || ''} />
              <UnderlineField label="Hospital Address:" value={formData.hosp_address || ''} />
              <UnderlineField label="Key Contact Person:" value={formData.authorizedSignatory || ''} />
            </div>
            <div className="col-span-6 p-2 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <UnderlineField label="Hosp ID*:" value={formData.hosp_rohini_id || ''} />
                <UnderlineField label="E-Mail :" value={formData.hosp_email || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <UnderlineField label="Pin Code :" value={formData.hosp_pin || ''} />
                <UnderlineField label="Mobile" value={formData.hosp_mobile || ''} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-6 border-r border-black">
              <div className="bg-slate-50 border-b border-black py-1 px-2 text-[8px] font-black uppercase">ESTIMATED EXPENSES DETAILS</div>
              <div className="p-2 space-y-1.5">
                {[
                  { l: "Per Day Room Rent+Nursing", id: "cost_room_rent" },
                  { l: "Consultation Charges", id: "cost_prof_fees" },
                  { l: "Investigation + diagnostics", id: "cost_investigation" },
                  { l: "Medicines + Consumables", id: "cost_medicines" },
                  { l: "Surgeon fees", id: "" },
                  { l: "OT expenses", id: "cost_ot" },
                  { l: "Implants (if any)", id: "" },
                  { l: "Any Others (pl. specify)", id: "cost_other" },
                  { l: "All incl. Package (if applicable)", id: "cost_package" },
                  { l: "TOTAL", id: "adm_total_cost", isTotal: true }
                ].map((item, i) => (
                  <div key={i} className={`flex justify-between items-center text-[8.5px] ${item.isTotal ? 'pt-1 mt-1 border-t border-black font-black' : 'font-bold'}`}>
                    <span>{item.l}</span>
                    <span className="font-mono">Rs. {Number(formData[item.id as string] || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-6">
              <div className="bg-slate-50 border-b border-black py-1 px-2 flex justify-between text-[8px] font-black uppercase">
                <span>Past History of chronic illness (Y/N)</span>
                <span>If Y, Duration</span>
              </div>
              <div className="p-2 space-y-1">
                {chronicList.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-[8px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold w-32">{item.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[7px]">:</span>
                        <Checkbox label="Y" checked={formData[`m_chronic_${item.id}_status`] === 'Yes'} />
                        <span className="mx-1">/</span>
                        <Checkbox label="N" checked={formData[`m_chronic_${item.id}_status`] === 'No'} />
                      </div>
                    </div>
                    <span className="font-black border-b border-dotted border-slate-400 min-w-[60px] text-center">
                      {formData[`m_chronic_${item.id}_since`] || ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-2 text-center text-[9px] font-black uppercase">
            *We confirm having read understood and agreed to the Declaration on the reverse of this form
          </div>
        </div>

        <div className="mt-auto pt-4 text-center">
          <p className="text-[7.5px] text-slate-400 font-bold uppercase">1</p>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col overflow-hidden">
        
        <div className="space-y-6 flex-1">
          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase underline">HOSPITAL DECLARARTION</h3>
            <ol className="list-decimal pl-6 space-y-3 text-[9.5px] font-medium leading-relaxed text-justify">
              <li>We have no objection to any authorized ITGI official verifying documents pertaining to hospitalization.</li>
              <li>All valid original documents duly countersigned by the insured / patient (listed below) will be sent to ITGI within 7 days of the patient’s discharge.</li>
              <li>All non -medical expenses and expenses not relevant to hospitalization or illnesses, which are not payable by ITGI will be collected from the patient.</li>
              <li><span className="font-black uppercase">WE AGREE THAT ITGI WILL NOT BE LIABLE TO MAKE THE PAYMENT IN THE EVENT OF ANY DISCREPANCY BETWEEN THE FACTS IN THIS FORM AND DISCHARGE SUMMARY</span></li>
              <li>The patient declaration (below) has been signed by the patient or by his representative in our presence.</li>
              <li>We agree to provide clarifications for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications.</li>
              <li>We will abide by the terms and conditions agreed in the MOU.</li>
            </ol>
            <div className="flex justify-between items-end pt-12">
               <div className="flex flex-col items-center">
                 <div className="w-48 h-20 border-b border-black relative flex items-center justify-center">
                    {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
                 </div>
                 <p className="text-[9px] font-black uppercase mt-2">Hospital Seal</p>
               </div>
               <div className="flex flex-col items-center">
                 <div className="w-48 h-20 border-b border-black relative flex items-center justify-center">
                    {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-full max-w-full opacity-80 mix-blend-multiply" />}
                 </div>
                 <p className="text-[9px] font-black uppercase mt-2">Doctor’s Signature</p>
               </div>
            </div>
          </section>

          <section className="space-y-4 pt-10 border-t border-slate-100">
            <h3 className="text-[11px] font-black uppercase underline">DECLARATION BY THE PATIENT / REPRESENTATIVE</h3>
            <ol className="list-decimal pl-6 space-y-3 text-[9.5px] font-medium leading-relaxed text-justify text-slate-700">
              <li>I agree to allow the hospital to submit all original documents pertaining to hospitalization to the ITGI after discharge. I agree to sign on the Final Bill & the Discharge Summary before my discharge.</li>
              <li>Payment to hospital is governed by the terms and conditions of the policy. In case ITGI is not liable to settle the hospital bill, I take complete responsibility to settle the bill.</li>
              <li>All non-medical expenses, and expenses not relevant to current hospitalization and the amounts over & above the limit authorized by ITGI will be paid by me. In case any clarification is needed on admissibility of a particular item, I shall contact ITGI Toll Free Number 1800-354-4599</li>
              <li>I hereby declare to abide by the rules and regulations of the policy and if at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify ITGI</li>
              <li>I agree and understand that ITGI is in no way warranting the service of the hospital & that ITGI is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard.</li>
              <li>I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I have made or shall make any false or untrue statement, suppression or concealment, my right to claim reimbursement of the said expenses shall be absolutely forfeited. I further declare that, in respect of the above treatment, no benefits are admissible under any other Medical Scheme or Insurance.</li>
            </ol>
            
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 pt-10">
               <UnderlineField label="Patient’s/ Insured’s Name" value={formData.p_name || ''} />
               <div className="border-b border-black relative h-10 flex items-end">
                  <span className="text-[9px] font-bold text-slate-700 pb-1 uppercase">Patient’s/ Insured’s Signature</span>
               </div>
               <div className="col-start-2">
                 <UnderlineField label="Phone No:" value={formData.p_contact || ''} />
               </div>
            </div>
          </section>

          <section className="mt-12 p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-2">DOCUMENTS TO BE PROVIDED IN ORIGINAL BY THE HOSPITAL IN SUPPORT OF CLAIM</h4>
             <ul className="space-y-1.5 text-[8.5px] font-bold text-slate-600 uppercase">
                <li className="flex items-center gap-3">1. Detailed Discharge Summary and all Bills from the hospital</li>
                <li className="flex items-center gap-3">2. Cash Memos from the Hospitals / Chemists supported by proper prescription.</li>
                <li className="flex items-center gap-3">3. Receipts and Pathological Test Reports from Pathologists, supported by Physician note.</li>
                <li className="flex items-center gap-3">4. Surgeon’s Certificate stating nature of operation performed / OT NOTES and Surgeon’s Bill and Receipt.</li>
                <li className="flex items-center gap-3">5. Certificates from attending Medical Practitioner / Surgeon that the patient is fully cured.</li>
             </ul>
          </section>
        </div>

        <div className="mt-auto pt-4 text-center">
          <p className="text-[7.5px] text-slate-400 font-bold uppercase">2</p>
        </div>
      </div>
    </div>
  );
};

export default IffcoTokioTemplate;
