import React from 'react';
import { formatDate } from '../utils';

interface CentralGeneraliTemplateProps {
  formData: Record<string, any>;
}

const TickBox: React.FC<{ label?: string; checked: boolean; className?: string }> = ({ label, checked, className = "" }) => (
  <div className={`inline-flex items-center space-x-1 ${className}`}>
    <div className={`w-[11px] h-[11px] border border-black flex items-center justify-center bg-white`}>
      {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
    {label && <span className="text-[8px] font-bold text-black uppercase leading-none">{label}</span>}
  </div>
);

const UnderlineField: React.FC<{ label: string; value: string; className?: string; bold?: boolean }> = ({ label, value, className = "", bold = true }) => (
  <div className={`flex items-end border-b border-black/20 pb-0.5 ${className}`}>
    <span className="text-[8px] font-bold text-slate-700 whitespace-nowrap mr-2 leading-none uppercase">{label}</span>
    <span className={`text-[9px] uppercase flex-1 truncate leading-none ${bold ? 'font-black text-black' : 'font-medium text-slate-600'}`}>{value}</span>
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-200 text-black py-0.5 px-2 text-[9px] font-black uppercase text-center border-y border-black my-2">
    <span className="tracking-[0.3em]">--{children}--</span>
  </div>
);

const GeneraliLogo: React.FC = () => (
  <div className="flex flex-col items-start shrink-0">
    <div className="flex items-end gap-3 mb-1">
      {/* High Fidelity Winged Lion Icon */}
      <div className="w-16 h-10 flex items-center justify-center">
        <svg viewBox="0 0 120 70" className="w-full h-full fill-[#b31920]">
          <path d="M5,55 h110 v4 h-110 z" /> {/* Ground */}
          <path d="M10,55 v-15 h12 v15 z M25,55 v-10 h12 v10 z M40,55 v-12 h12 v12 z" /> {/* Pedestal/Book */}
          <path d="M55,55 q0,-40 50,-15 q20,-25 15,15 l-65,0" /> {/* Body */}
          <circle cx="60" cy="25" r="9" /> {/* Head */}
          <path d="M65,20 q15,-15 35,-5 q10,10 0,20" /> {/* Wing */}
        </svg>
      </div>
      {/* High Fidelity Square pattern Icon */}
      <div className="w-10 h-10 bg-[#b31920] p-1.5 flex items-center justify-center rounded-sm">
        <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-white" strokeWidth="10">
          <rect x="15" y="15" width="70" height="70" />
          <path d="M50,5 v90 M5,50 h90" strokeWidth="6" />
          <rect x="35" y="35" width="30" height="30" fill="white" stroke="none" />
        </svg>
      </div>
    </div>
    {/* Stylized Branding Text as part of the logo unit */}
    <div className="flex flex-col w-full leading-none">
       <div className="flex items-baseline gap-1">
          <span className="text-[17px] font-black text-[#b31920] uppercase tracking-tighter">GENERALI</span>
          <span className="text-[17px] font-black text-[#b31920] italic">Central</span>
       </div>
       <div className="flex items-center gap-1.5 mt-0.5">
          <div className="h-[1px] bg-[#b31920] flex-1"></div>
          <span className="text-[8px] font-bold text-[#b31920] uppercase tracking-[0.35em]">INSURANCE</span>
          <div className="h-[1px] bg-[#b31920] flex-1"></div>
       </div>
    </div>
  </div>
);

const CentralGeneraliTemplate: React.FC<CentralGeneraliTemplateProps> = ({ formData }) => {
  const chronicDiseases = [
    { label: "Hypertension", key: "hypertension" },
    { label: "Hyperlipidemia", key: "hyperlipidemia" },
    { label: "Cancer", key: "cancer" },
    { label: "Osteoarthritis", key: "osteoarthritis" },
    { label: "Diabetes", key: "diabetes" },
    { label: "Cardiovascular Diseases", key: "cardiovascular" },
    { label: "Asthma / COPD / Bronchitis", key: "asthma" },
    { label: "Any Surgery / Hospitalization", key: "surgery" },
    { label: "Any Other Disease / Disability", key: "other" },
    { label: "Congenital", key: "congenital", sub: "Internal / External" },
    { label: "Any HIV or STD/Related Ailments", key: "hiv" },
    { label: "Alcohol or Drug Abuse", key: "alcohol" }
  ];

  return (
    <div className="bg-slate-100 p-4 lg:p-12 space-y-10 no-print print:bg-white print:p-0 print:space-y-0">
      
      {/* PAGE 1 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] flex flex-col relative overflow-hidden text-[9px]">
        
        {/* Header Section with actual Logo */}
        <div className="flex justify-between items-start mb-6">
          <GeneraliLogo />
          <div className="text-[7.5px] font-bold text-slate-600 leading-tight text-right pt-4">
            Phone: 1800 209 1016 / 1800 103 8889<br/>
            Fax: 1800 209 1017 / 1800 103 9998<br/>
            Email: GCH.cashless@generalicentral.com
          </div>
        </div>

        <div className="flex justify-between items-end mb-2">
          <div className="flex items-end space-x-2">
            <span className="text-[10px] font-black uppercase">Hospital Id No:</span>
            <span className="border-b border-black w-32 min-h-[14px] font-black text-center">{formData.hosp_rohini_id || ''}</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">GCI-PAF-03</span>
        </div>

        <div className="bg-[#cd5c5c] text-white py-1 px-4 text-[12px] font-black uppercase text-center mb-1">
          PRE-AUTHORIZATION / CLAIM FORM FOR CASHLESS FACILITY
        </div>

        <SectionHeader>TO BE FILLED BY THE INSURED/PATIENT</SectionHeader>

        <div className="space-y-3 mb-4">
          <UnderlineField label="Patient Name:" value={formData.p_name || ''} />
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8 flex items-end space-x-4">
              <span className="text-[8px] font-bold uppercase whitespace-nowrap">Gender:</span>
              <TickBox label="Male" checked={formData.p_gender === 'Male'} />
              <TickBox label="Female" checked={formData.p_gender === 'Female'} />
              <UnderlineField label="Age:" value={String(formData.p_age_y || '')} className="flex-1" />
              <span className="text-[7px] font-bold pb-0.5">(yrs)</span>
            </div>
            <div className="col-span-4">
              <UnderlineField label="Health Card No." value={formData.p_card_id || ''} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <UnderlineField label="DOB:" value={formData.p_dob ? formatDate(formData.p_dob) : ''} />
            <UnderlineField label="Policy No:" value={formData.p_policy_no || ''} />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <UnderlineField label="Patient/Attendant Mobile No." value={formData.p_contact || ''} />
            <UnderlineField label="Employee ID" value={formData.p_employee_id || ''} />
            <UnderlineField label="Company Name" value={formData.p_other_insurer_name || ''} />
          </div>

          <div className="flex items-center space-x-6">
            <span className="text-[8px] font-bold uppercase">Currently do you have any other Mediclaim / Health Insurance</span>
            <TickBox label="Yes" checked={formData.p_other_insurance === 'Yes'} />
            <TickBox label="No" checked={formData.p_other_insurance === 'No'} />
            <span className="text-[7px] font-medium text-slate-500 italic">(if yes, provide other insurance details)</span>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <UnderlineField label="Insurance Co. Name" value="" />
            <UnderlineField label="Policy No:" value="" />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <UnderlineField label="Sum Insured" value="" />
            <UnderlineField label="since how long you have this cover" value="" />
          </div>

          <div className="flex items-center space-x-6">
            <span className="text-[8px] font-bold uppercase">Do you have Family Physician</span>
            <TickBox label="Yes" checked={formData.p_family_physician === 'Yes'} />
            <TickBox label="No" checked={formData.p_family_physician === 'No'} />
            <UnderlineField label="No. Name of Family Physician:" value={formData.p_family_physician_name || ''} className="flex-1" />
            <UnderlineField label="Mobile No:" value={formData.p_family_physician_contact || ''} className="w-48" />
          </div>
        </div>

        <SectionHeader>TO BE FILLED BY THE TREATING DOCTOR / HOSPITAL</SectionHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-8">
            <UnderlineField label="Name of the Hospital:" value={formData.hosp_name || ''} />
            <UnderlineField label="District:" value={formData.hosp_district || ''} />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2 flex items-center space-x-4">
              <span className="text-[8px] font-bold uppercase">Type of hospitalization:</span>
              <TickBox label="Emergency" checked={false} />
              <TickBox label="Planned" checked={true} />
            </div>
            <UnderlineField label="Expected Admission Date:" value={formatDate(formData.adm_date)} />
            <UnderlineField label="Time of Admission" value={formData.adm_time || ''} />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <UnderlineField label="Expected Length of Stay:" value={`${formData.adm_stay_days || ''} (days)`} />
            <UnderlineField label="Name of Treating Doctor:" value={formData.dr_name || ''} />
            <UnderlineField label="Mobile No:" value={formData.dr_contact || ''} />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase">Nature of Illness / Disease with Presenting Complaints:</label>
            <div className="border-b border-black w-full min-h-[14px] text-[9px] font-black uppercase">{formData.m_illness || ''}</div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase">Relevant Clinical Findings:</label>
            <div className="border-b border-black w-full min-h-[14px] text-[9px] font-black uppercase">{formData.m_clinical_findings || ''}</div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="flex items-end space-x-2">
              <span className="text-[8px] font-bold uppercase">Duration of present Ailment:</span>
              <span className="border-b border-black w-10 text-center font-black">{formData.m_duration || ''}</span>
              <span className="text-[7px] font-bold">Years</span>
              <span className="border-b border-black w-10 text-center font-black"></span>
              <span className="text-[7px] font-bold">Months</span>
              <span className="border-b border-black w-10 text-center font-black"></span>
              <span className="text-[7px] font-bold">Days</span>
            </div>
            <UnderlineField label="Date of First Consultation:" value={formatDate(formData.m_first_cons_date)} className="col-span-2" />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase">Past History of Present Ailment if any</label>
            <div className="border-b border-black w-full min-h-[14px]"></div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <UnderlineField label="Provisional Diagnosis:" value={formData.m_prov_diag || ''} />
            <UnderlineField label="ICD Code:" value={formData.m_icd_code || ''} />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-[8px] font-bold uppercase">Proposed Line of Treatment during Hospitalization:</span>
            <TickBox label="Medical" checked={formData.m_treatment_type === 'Medical Management'} />
            <TickBox label="Surgical" checked={formData.m_treatment_type === 'Surgical Management'} />
            <TickBox label="Intensive" checked={formData.m_treatment_type === 'Intensive care'} />
            <TickBox label="Investigation" checked={formData.m_treatment_type === 'Investigation'} />
            <TickBox label="Non Allopathic treatment" checked={false} />
          </div>

          <UnderlineField label="If Investigation & /or Medical Management, provide details:" value="" />

          <div className="grid grid-cols-2 gap-8">
            <UnderlineField label="Route of Drug Administration:" value={formData.m_route_drug || ''} />
            <UnderlineField label="If Surgical, Name of Surgery:" value={formData.m_surgery_name || ''} />
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8 flex items-center space-x-4">
              <span className="text-[8px] font-bold uppercase">Type of Anesthesia:</span>
              <TickBox label="Local" checked={false} />
              <TickBox label="General" checked={false} />
              <TickBox label="Regional" checked={false} />
              <TickBox label="Dissociative" checked={false} />
            </div>
            <UnderlineField label="ICD PCS Code:" value="" className="col-span-4" />
          </div>

          <UnderlineField label="If other treatments provide details:" value="" />

          <div className="flex items-center space-x-8">
            <span className="text-[8px] font-bold uppercase">In case of Accident / Injury:</span>
            <TickBox label="RTA" checked={formData.m_is_rta === 'Yes'} />
            <TickBox label="Intentional Self Injury" checked={false} />
            <UnderlineField label="Date of Accident / Injury:" value={formatDate(formData.m_rta_date)} className="flex-1" />
          </div>

          <UnderlineField label="How did injury occur:" value="" />

          <div className="grid grid-cols-2 gap-10">
            <div className="flex items-center space-x-6">
              <span className="text-[8px] font-bold uppercase">Injury / Diseases caused due to Substance Abuse / Alcohol Consumptions:</span>
              <TickBox label="Yes" checked={formData.m_abuse_alcohol === 'Yes'} />
              <TickBox label="No" checked={formData.m_abuse_alcohol === 'No'} />
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-[8px] font-bold uppercase">Reported to Police:</span>
              <TickBox label="Yes" checked={formData.m_rta_police === 'Yes'} />
              <TickBox label="No" checked={formData.m_rta_police === 'No'} />
              <UnderlineField label="FIR / MLC No:" value={formData.m_fir_no || ''} className="flex-1 ml-4" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div className="flex items-center space-x-6">
              <span className="text-[8px] font-bold uppercase">Test conducted to establish this:</span>
              <TickBox label="Yes" checked={formData.m_test_conducted === 'Yes'} />
              <TickBox label="No" checked={formData.m_test_conducted === 'No'} />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-[8.5px] font-black text-slate-800 uppercase">PAST HISTORY OF ANY CHRONIC ILLNESS WITH DURATION:</span>
            </div>
          </div>

          {/* Chronic Illness Table Page 1 Part */}
          <table className="w-full border-collapse border border-black mt-1 text-[8px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="border border-black p-1 text-left w-1/3 uppercase">Disease / Ailment</th>
                <th className="border border-black p-1 text-center w-1/6 uppercase">Yes</th>
                <th className="border border-black p-1 text-center w-1/6 uppercase">No</th>
                <th className="border border-black p-1 text-left uppercase">Duration (Specify Year / Month / Days)</th>
              </tr>
            </thead>
            <tbody>
              {chronicDiseases.slice(0, 12).map((item, i) => {
                const status = formData[`m_chronic_${item.key}_status`];
                const since = formData[`m_chronic_${item.key}_since`];
                return (
                  <tr key={i} className="h-5">
                    <td className="border border-black px-2 py-0.5 font-bold uppercase">
                      {item.label}
                      {item.sub && <span className="block text-[6px] font-medium lowercase italic leading-none">{item.sub}</span>}
                    </td>
                    <td className="border border-black text-center"><TickBox checked={status === 'Yes'} /></td>
                    <td className="border border-black text-center"><TickBox checked={status === 'No'} /></td>
                    <td className="border border-black px-2 py-0.5 font-black uppercase text-slate-700">{status === 'Yes' ? since : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-200">
          <div className="flex justify-between items-start text-[6.5px] font-bold text-slate-500 leading-tight">
            <div className="max-w-[80%]">
              <p className="font-black text-slate-800 uppercase">Generali Central Insurance Company Limited (Formerly known as Future Generali India Insurance Company Limited)</p>
              <p>Registered Office: Unit No. 801 & 802, 8th Floor, Tower C, Embassy 247 Park, LBS Marg, Vikhroli (West), Mumbai – 400083 | IRDAI Regn. No.: 132 | CIN: U66030MH2006PLC165287</p>
              <p>Website: www.generalicentralinsurance.com | Email ID: gccare@generalicentral.com | Toll-free Phone: 1800 220 233 / 1860 500 3333 / 022 6783 7800</p>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="bg-white p-10 max-w-[210mm] w-full mx-auto text-black border shadow-lg print:shadow-none print:border-none print:p-10 font-sans leading-none print:min-h-[297mm] print:break-before-page flex flex-col relative overflow-hidden text-[9.5px]">
        
        <div className="flex justify-between items-start mb-6">
          <GeneraliLogo />
          <div className="text-[8px] font-bold text-slate-600 leading-tight text-right pt-4">
            Phone: 1800 209 1016 / 1800 103 8889<br/>
            Fax: 1800 209 1017 / 1800 103 9998<br/>
            Email: GCH.cashless@generalicentral.com
          </div>
        </div>

        {/* Expenses Table */}
        <table className="w-full border-collapse border border-black mb-4">
          <thead className="bg-slate-50 font-black uppercase text-[10px]">
            <tr>
              <th className="border border-black p-2 text-left">Expense Head</th>
              <th className="border border-black p-2 text-center w-24">Amount (Rs.)</th>
              <th className="border border-black p-2 text-left">Expense Head</th>
              <th className="border border-black p-2 text-center w-24">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {[
              { l1: "Room Rent per day + Nursing/Service charges + Diet", id1: "cost_room_rent", l2: "Investigations + Diagnostics", id2: "cost_investigation" },
              { l1: "ICU charges per day", id1: "cost_icu", l2: "Medicines / Consumables", id2: "cost_medicines" },
              { l1: "Doctor / Consultant visit charges", id1: "cost_prof_fees", l2: "Equipment / Monitor etc", id2: "" },
              { l1: "Surgeon charges + Anesthetist", id1: "", l2: "Miscellaneous (specify)", id2: "cost_other" },
              { l1: "Operation Theatre Charges", id1: "cost_ot", l2: "Implant Charges (If any)", id2: "" },
              { l1: "Package Charges", id1: "cost_package", l2: "", id2: "" }
            ].map((row, i) => (
              <tr key={i} className="h-10">
                <td className="border border-black px-3 font-bold text-slate-700 uppercase leading-tight uppercase">{row.l1}</td>
                <td className="border border-black text-center font-black">{formData[row.id1] ? `₹${formData[row.id1].toLocaleString()}` : ''}</td>
                <td className="border border-black px-3 font-bold text-slate-700 uppercase leading-tight uppercase">{row.l2}</td>
                <td className="border border-black text-center font-black">{formData[row.id2] ? `₹${formData[row.id2].toLocaleString()}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-end mb-6 space-x-12 px-2">
          <UnderlineField label="Estimate of Expenses: Total Amount Rs." value={formData.adm_total_cost ? `₹${formData.adm_total_cost.toLocaleString()}` : ''} className="flex-1" />
          <UnderlineField label="Class of Accommodation:" value={formData.adm_room_type || ''} className="flex-1" />
        </div>

        <SectionHeader>DECLARATION</SectionHeader>
        <p className="text-[10px] font-medium leading-relaxed mb-6 px-2 text-justify">
          I have completed this form and will be responsible for correctness of the medical information certified by me. I agree that Generali Central shall not be liable to make payment in case of any discrepancy between the preauthorization form and discharge summary.
        </p>

        <div className="space-y-4 mb-8 px-2">
          <div className="grid grid-cols-2 gap-12">
            <UnderlineField label="Name of the treating Doctor:" value={formData.dr_name || ''} />
            <UnderlineField label="Qualification:" value="MBBS, MD" />
          </div>
          <UnderlineField label="MCI Registration No with State Code:" value={formData.registrationNo || ''} className="w-1/2" />
          
          <div className="flex justify-between items-end pt-10">
            <div className="w-64 border-t border-black text-center">
              <p className="text-[10px] font-black uppercase mt-1">Signature of Doctor:</p>
            </div>
            <div className="w-64 border-t border-black text-center">
              <p className="text-[10px] font-black uppercase mt-1">Stamp / Seal of Hospital</p>
              {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-20 mx-auto mt-2 opacity-80 mix-blend-multiply" />}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border border-black/10 rounded-sm mb-6 space-y-4">
          <h4 className="text-[11px] font-black uppercase text-[#b31920] border-b border-[#b31920]/20 pb-1">BENEFICIARY CONSENT / AUTHORISATION</h4>
          <p className="text-[9.5px] font-medium text-justify leading-relaxed">
            I have ‘No Objection’ to Generali Central obtaining details of my treatment / collecting documents and also hereby authorize Generali Central to pay the hospital bill from the sum insured of my insurance policy. I also undertake to pay all non medical / non authorized expenses in the hospital bill directly to the hospital at the time of discharge. In case Generali Central issues " Denial of cashless facility" to the provider, I have 'No objection' in paying the hospital bill for the treatment given. All information provided above is true and I agree that if I have provided any false or untrue information, my right to claim the expenses shall be absolutely forfeited.
          </p>
          <div className="grid grid-cols-2 gap-10 pt-4">
            <UnderlineField label="NAME OF INSURED:" value={formData.p_name || ''} />
            <div className="border-t border-black text-center pt-1">
              <p className="text-[10px] font-black uppercase">SIGNATURE OF INSURED:</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10">
            <UnderlineField label="INSURED Email ID:" value={formData.p_email || ''} />
            <UnderlineField label="INSURED Mobile No:" value={formData.p_contact || ''} />
          </div>
        </div>

        <SectionHeader>Declaration by the patient/representative</SectionHeader>
        <div className="text-[8.5px] font-medium text-justify leading-relaxed space-y-2 px-2 mb-8 text-slate-700">
          <p>I agree to allow the hospital to submit all original documents pertaining to hospitalization to the insurer after the discharge. I agree to sign on the final bill and the discharge summary before my discharge. Payment to hospital is governed by the terms and conditions of the policy. In case the insurer is not liable to settle the hospital bill, I undertake to settle the bill as per the terms and conditions of the policy. All non medical expenses and expenses not relevant to current hospitalization and the amounts over and above the limit authorized by the insurer not governed by the terms and conditions of the policy will be paid by me. In case any clarification is needed on admissibility of a particular item I shall contact insurer at the toll free no on the reverse of the form. I hereby declare to abide by the terms and conditions of the policy and it at any time the facts disclosed by me are found to be false or incorrect I forfeit my claim and agree to indemnify the insurer. I agree and understand that insurer is in no way warranting the services of the hospital and the insurer is in no way guaranteeing that the services provided by the hospital will be of a particular quality or standard. I hereby warrant the truth of the forgoing particulars in every respect and I agree that if I made or shall make any false or untrue statement, suppression or concealment, my right to claim reimbursement of the said expenses shall be absolutely forfeited. I further declare that, in respect of the above treatment, no benefits are admissible under any other medical scheme or insurance. I agree to indemnify the hospital against all expenses incurred on my behalf, which are not reimbursed by the insurer.</p>
        </div>

        <div className="grid grid-cols-3 gap-8 px-2 mb-10">
          <UnderlineField label="Patient’s /Insured’s Name" value={formData.p_name || ''} />
          <UnderlineField label="Contact No:" value={formData.p_contact || ''} />
          <div className="border-t border-black text-center pt-1">
            <p className="text-[10px] font-black uppercase">Patient’s / Insured’s Signature</p>
          </div>
        </div>

        <SectionHeader>Hospital Declaration</SectionHeader>
        <div className="text-[8.5px] font-medium text-justify leading-relaxed space-y-2 px-2 mb-8 text-slate-700">
          <p>We have no objection to any authorized insurance company official verifying documents pertaining to hospitalization. All valid original documents duly counter singed by the insured/patient as per the check list below will be sent to insurance company within 7 days of the patient’s discharge. All non medical expenses or expenses not relevant to hospitalization/illness, or expenses disallowed in the authorization letter of the insurance company, or arising out of incorrect information in the preauthorization form will be collected from the patient.</p>
          <p className="font-black text-black">WE AGREE THAT INSURANCE COMPANY WILL NOT BE LIABLE TO MAKE THE PAYMENT IN THE EVENT OF ANY DISCREPANCY BETWEEN THE FACTS IN THIS FORM AND DISCHARGE SUMMARY OR OTHER DOCUMENTS. The patient declaration has been signed by the patient or by his / her representative in our presence. We agree to provide clarification for the queries raised regarding this hospitalization and we take the sole responsibility for any delay in offering clarifications. We will abide by the terms and conditions agreed in the MOU.</p>
        </div>

        <div className="flex justify-between items-end pt-10 px-2 mb-10">
          <div className="w-64 border-t border-black text-center">
            <p className="text-[10px] font-black uppercase mt-1">Hospital Seal:</p>
            {formData.hospitalSeal && <img src={formData.hospitalSeal} className="max-h-20 mx-auto mt-2 opacity-80 mix-blend-multiply" />}
          </div>
          <div className="w-64 border-t border-black text-center">
            <p className="text-[10px] font-black uppercase mt-1">Doctor’s Signature:</p>
            {formData.doctorStamp && <img src={formData.doctorStamp} className="max-h-20 mx-auto mt-2 opacity-80 mix-blend-multiply" />}
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-sm">
          <h4 className="text-[11px] font-black uppercase text-slate-800 border-b border-slate-200 pb-1 mb-3">Documents to be provided by the hospital in support of the claim</h4>
          <ol className="list-decimal pl-6 space-y-1 text-[10px] font-bold text-slate-600 uppercase tracking-tight">
            <li>Authorization Letter</li>
            <li>Original Detailed Discharge Summary</li>
            <li>Original Hospital Main Bill and Detailed Break Up</li>
            <li>All Original Pharmacy Bills and Investigation Bill if any</li>
            <li>All Investigation Reports & Prescriptions Including OT Notes</li>
          </ol>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-200">
          <div className="flex justify-between items-start text-[6.5px] font-bold text-slate-500 leading-tight">
            <div className="max-w-[80%]">
              <p className="font-black text-slate-800 uppercase">Generali Central Insurance Company Limited (Formerly known as Future Generali India Insurance Company Limited)</p>
              <p>Registered Office: Unit No. 801 & 802, 8th Floor, Tower C, Embassy 247 Park, LBS Marg, Vikhroli (West), Mumbai – 400083 | IRDAI Regn. No.: 132 | CIN: U66030MH2006PLC165287</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CentralGeneraliTemplate;
