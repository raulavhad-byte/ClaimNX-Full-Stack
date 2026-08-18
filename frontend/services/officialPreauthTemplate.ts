import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type OfficialPreauthTemplate = "tata-aig" | "star-health";

type Field = { key: string; page?: number; x: number; y: number; width: number; size?: number };
type CheckField = {
  page: number;
  x: number;
  y: number;
  checked: (formData: Record<string, any>) => boolean;
};
type TemplateDefinition = {
  assetRoot: string;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  fields: Field[];
  checks?: CheckField[];
};

// Coordinates are in the original provider PDF coordinate system (points,
// bottom-left origin). They intentionally are not derived from CSS so screen
// preview and final PDF use the same approved form geometry.
const templates: Record<OfficialPreauthTemplate, TemplateDefinition> = {
  "tata-aig": {
    assetRoot: "/preauth-templates/tata-aig",
    pageCount: 3,
    pageWidth: 595.276,
    pageHeight: 841.89,
    fields: [
      { key: "insurance_company", x: 152, y: 675, width: 410, size: 7 },
      { key: "hosp_name", x: 122, y: 640, width: 440, size: 7 },
      { key: "hosp_mobile", x: 122, y: 626, width: 150, size: 7 },
      { key: "hosp_address", x: 122, y: 608, width: 440, size: 7 },
      { key: "hosp_rohini_id", x: 122, y: 590, width: 150, size: 7 },
      { key: "hosp_email", x: 300, y: 574, width: 250, size: 7 },
      { key: "p_name", x: 122, y: 523, width: 440, size: 7 },
      { key: "p_contact", x: 122, y: 476, width: 150, size: 7 },
      { key: "p_uhid", x: 122, y: 459, width: 150, size: 7 },
      { key: "p_policy_no", x: 165, y: 442, width: 395, size: 7 },
      { key: "dr_name", page: 1, x: 136, y: 224, width: 410, size: 7 },
      { key: "dr_contact", page: 1, x: 136, y: 205, width: 160, size: 7 },
      { key: "m_illness", page: 1, x: 125, y: 185, width: 420, size: 7 },
      { key: "m_clinical_findings", page: 1, x: 125, y: 167, width: 420, size: 7 },
      { key: "m_prov_diag", page: 1, x: 110, y: 103, width: 435, size: 7 },
      { key: "m_icd_code", page: 1, x: 95, y: 84, width: 160, size: 7 },
      { key: "m_surgery_name", page: 2, x: 150, y: 763, width: 390, size: 8 },
      { key: "m_icd_pcs_code", page: 2, x: 110, y: 729, width: 180, size: 8 },
      { key: "adm_date", page: 2, x: 132, y: 476, width: 120, size: 8 },
      { key: "adm_time", page: 2, x: 420, y: 476, width: 60, size: 8 },
      { key: "adm_stay_days", page: 2, x: 202, y: 251, width: 80, size: 8 },
      { key: "adm_icu_days", page: 2, x: 202, y: 231, width: 80, size: 8 },
      { key: "adm_room_type", page: 2, x: 202, y: 211, width: 190, size: 8 },
      { key: "cost_room_rent", page: 2, x: 390, y: 174, width: 160, size: 8 },
      { key: "cost_investigation", page: 2, x: 390, y: 154, width: 160, size: 8 },
      { key: "cost_icu", page: 2, x: 390, y: 134, width: 160, size: 8 },
      { key: "cost_ot", page: 2, x: 390, y: 114, width: 160, size: 8 },
      { key: "cost_prof_fees", page: 2, x: 390, y: 94, width: 160, size: 8 },
      { key: "cost_medicines", page: 2, x: 390, y: 74, width: 160, size: 8 },
      { key: "cost_other", page: 2, x: 390, y: 54, width: 160, size: 8 },
      { key: "adm_total_cost", page: 2, x: 390, y: 14, width: 160, size: 8 },
    ],
  },
  "star-health": {
    assetRoot: "/preauth-templates/star-health",
    pageCount: 6,
    pageWidth: 613.276,
    pageHeight: 859.89,
    fields: [
      // The Star Health source already prints its legal insurer identity on
      // this line. Do not overlay it again; only claimant-entered fields are
      // written in blue.
      { key: "hosp_name", x: 168, y: 607, width: 385, size: 8 },
      { key: "hosp_address", x: 168, y: 586, width: 385, size: 8 },
      { key: "hosp_rohini_id", x: 168, y: 573, width: 385, size: 8 },
      { key: "hosp_email", x: 168, y: 560, width: 385, size: 8 },
      { key: "p_name", x: 168, y: 501, width: 385, size: 8 },
      { key: "p_age_y", x: 240, y: 448, width: 88, size: 8 },
      { key: "p_dob", x: 240, y: 420, width: 88, size: 8 },
      { key: "p_contact", x: 278, y: 392, width: 275, size: 8 },
      { key: "p_relative_contact", x: 278, y: 366, width: 275, size: 8 },
      { key: "p_card_id", x: 278, y: 338, width: 275, size: 8 },
      { key: "p_policy_no", x: 278, y: 309, width: 275, size: 8 },
      { key: "p_employee_id", x: 278, y: 282, width: 275, size: 8 },
      { key: "p_other_insurer_name", x: 278, y: 227, width: 275, size: 8 },
      { key: "p_family_physician_name", x: 278, y: 157, width: 275, size: 8 },
      { key: "p_family_physician_contact", x: 278, y: 129, width: 275, size: 8 },
      { key: "p_address", x: 278, y: 104, width: 275, size: 8 },
      { key: "p_occupation", x: 278, y: 76, width: 275, size: 8 },
      { key: "dr_name", page: 2, x: 344, y: 756, width: 210, size: 8 },
      { key: "dr_contact", page: 2, x: 344, y: 728, width: 210, size: 8 },
      { key: "m_illness", page: 2, x: 344, y: 698, width: 210, size: 8 },
      { key: "m_clinical_findings", page: 2, x: 344, y: 669, width: 210, size: 8 },
      { key: "m_duration", page: 2, x: 344, y: 642, width: 100, size: 8 },
      { key: "m_first_cons_date", page: 2, x: 344, y: 616, width: 100, size: 8 },
      { key: "m_past_history", page: 2, x: 344, y: 580, width: 210, size: 8 },
      { key: "m_prov_diag", page: 2, x: 344, y: 532, width: 210, size: 8 },
      { key: "m_icd_code", page: 2, x: 396, y: 532, width: 158, size: 8 },
      { key: "m_investigation_details", page: 2, x: 396, y: 369, width: 158, size: 8 },
      { key: "m_surgery_name", page: 2, x: 396, y: 329, width: 158, size: 8 },
      { key: "m_icd_pcs_code", page: 2, x: 396, y: 329, width: 158, size: 8 },
      { key: "m_other_treatment", page: 2, x: 344, y: 301, width: 210, size: 8 },
      { key: "m_injury_reason", page: 2, x: 344, y: 273, width: 210, size: 8 },
      { key: "m_rta_date", page: 2, x: 467, y: 207, width: 60, size: 8 },
      { key: "m_fir_no", page: 2, x: 467, y: 171, width: 60, size: 8 },
      { key: "adm_exp_discharge", page: 2, x: 274, y: 87, width: 120, size: 8 },
      { key: "adm_date", page: 3, x: 392, y: 732, width: 160, size: 8 },
      { key: "adm_time", page: 3, x: 392, y: 702, width: 160, size: 8 },
      { key: "adm_stay_days", page: 3, x: 265, y: 438, width: 125, size: 8 },
      { key: "adm_icu_days", page: 3, x: 265, y: 387, width: 125, size: 8 },
      { key: "adm_room_type", page: 3, x: 265, y: 360, width: 290, size: 8 },
      { key: "cost_room_rent", page: 3, x: 348, y: 331, width: 207, size: 8 },
      { key: "cost_investigation", page: 3, x: 262, y: 302, width: 293, size: 8 },
      { key: "cost_icu", page: 3, x: 150, y: 275, width: 405, size: 8 },
      { key: "cost_ot", page: 3, x: 144, y: 248, width: 411, size: 8 },
      { key: "cost_prof_fees", page: 3, x: 365, y: 220, width: 190, size: 8 },
      { key: "cost_medicines", page: 3, x: 382, y: 192, width: 173, size: 8 },
      { key: "cost_other", page: 3, x: 205, y: 165, width: 350, size: 8 },
      { key: "cost_package", page: 3, x: 265, y: 138, width: 290, size: 8 },
      { key: "adm_total_cost", page: 3, x: 265, y: 110, width: 290, size: 8 },
      // Mandatory past-history entries are written only when the condition
      // has been selected in New Admission. "other" is free text; all the
      // other values are the month/year captured by the form.
      { key: "m_chronic_diabetes_since", page: 3, x: 328, y: 635, width: 227, size: 8 },
      { key: "m_chronic_heart_disease_since", page: 3, x: 328, y: 617, width: 227, size: 8 },
      { key: "m_chronic_hypertension_since", page: 3, x: 328, y: 599, width: 227, size: 8 },
      { key: "m_chronic_hyperlipidemia_since", page: 3, x: 328, y: 581, width: 227, size: 8 },
      { key: "m_chronic_osteoarthritis_since", page: 3, x: 328, y: 563, width: 227, size: 8 },
      { key: "m_chronic_asthma_copd_since", page: 3, x: 328, y: 545, width: 227, size: 8 },
      { key: "m_chronic_cancer_since", page: 3, x: 328, y: 527, width: 227, size: 8 },
      { key: "m_chronic_alcohol_abuse_since", page: 3, x: 328, y: 509, width: 227, size: 8 },
      { key: "m_chronic_hiv_std_since", page: 3, x: 328, y: 491, width: 227, size: 8 },
      { key: "m_chronic_stroke_since", page: 3, x: 328, y: 473, width: 227, size: 8 },
      { key: "m_chronic_liver_disease_since", page: 3, x: 328, y: 455, width: 227, size: 8 },
      { key: "m_chronic_kidney_disease_since", page: 3, x: 328, y: 437, width: 227, size: 8 },
      { key: "m_chronic_other_since", page: 3, x: 328, y: 419, width: 227, size: 8 },
      { key: "dr_name", page: 4, x: 280, y: 662, width: 250, size: 9 },
      { key: "p_name", page: 4, x: 380, y: 500, width: 140, size: 10 },
      { key: "p_name", page: 5, x: 227, y: 206, width: 215, size: 9 },
      { key: "p_contact", page: 5, x: 227, y: 174, width: 215, size: 9 },
      { key: "p_email", page: 5, x: 227, y: 142, width: 215, size: 9 },
      { key: "p_name", page: 5, x: 227, y: 113, width: 215, size: 9 },
    ],
    checks: [
      { page: 1, x: 207, y: 476, checked: (d) => d.p_gender === "Male" },
      { page: 1, x: 303, y: 476, checked: (d) => d.p_gender === "Female" },
      { page: 1, x: 404, y: 476, checked: (d) => /third/i.test(String(d.p_gender ?? "")) },
      { page: 1, x: 382, y: 260, checked: (d) => d.p_other_insurance === "Yes" },
      { page: 1, x: 446, y: 260, checked: (d) => d.p_other_insurance === "No" },
      { page: 1, x: 382, y: 189, checked: (d) => d.p_family_physician === "Yes" },
      { page: 1, x: 446, y: 189, checked: (d) => d.p_family_physician === "No" },
      { page: 2, x: 334, y: 526, checked: (d) => /medical/i.test(String(d.m_treatment_type ?? "")) },
      { page: 2, x: 334, y: 509, checked: (d) => /surgical/i.test(String(d.m_treatment_type ?? "")) },
      { page: 2, x: 334, y: 492, checked: (d) => /intensive|icu/i.test(String(d.m_treatment_type ?? "")) },
      { page: 2, x: 334, y: 475, checked: (d) => /investigation/i.test(String(d.m_treatment_type ?? "")) },
      { page: 2, x: 334, y: 458, checked: (d) => /non.allopathic/i.test(String(d.m_treatment_type ?? "")) },
      { page: 2, x: 446, y: 225, checked: (d) => d.m_is_rta === "Yes" },
      { page: 2, x: 524, y: 225, checked: (d) => d.m_is_rta === "No" },
      { page: 2, x: 446, y: 207, checked: (d) => Boolean(d.m_rta_date) },
      { page: 2, x: 446, y: 189, checked: (d) => d.m_rta_police === "Yes" },
      { page: 2, x: 524, y: 189, checked: (d) => d.m_rta_police === "No" },
      { page: 2, x: 446, y: 171, checked: (d) => Boolean(d.m_fir_no) },
      { page: 2, x: 446, y: 143, checked: (d) => d.m_abuse_alcohol === "Yes" },
      { page: 2, x: 524, y: 143, checked: (d) => d.m_abuse_alcohol === "No" },
      { page: 2, x: 446, y: 116, checked: (d) => d.m_test_conducted === "Yes" },
      { page: 2, x: 524, y: 116, checked: (d) => d.m_test_conducted === "No" },
      { page: 3, x: 402, y: 680, checked: (d) => d.adm_type === "Emergency" },
      { page: 3, x: 498, y: 680, checked: (d) => d.adm_type === "Planned" },
    ],
  },
};

export function officialTemplateForName(name: string): OfficialPreauthTemplate | null {
  if (name === "Tata AIG Standard") return "tata-aig";
  if (name === "Star Health Standard") return "star-health";
  return null;
}

export function officialTemplateDefinition(template: OfficialPreauthTemplate) {
  return templates[template];
}

function shouldRenderField(field: Field, formData: Record<string, any>) {
  const chronicMatch = field.key.match(/^m_chronic_(.+)_since$/);
  if (chronicMatch) return formData[`m_chronic_${chronicMatch[1]}_status`] === "Yes";
  if (["m_rta_date", "m_fir_no", "m_injury_reason"].includes(field.key)) return formData.m_is_rta === "Yes";
  return true;
}

export function previewValueFields(template: OfficialPreauthTemplate, formData: Record<string, any>) {
  const definition = templates[template];
  return definition.fields.filter((field) => shouldRenderField(field, formData)).map((field) => ({
    ...field,
    page: field.page ?? 1,
    value: String(formData[field.key] ?? "").toUpperCase(),
    left: `${(field.x / definition.pageWidth) * 100}%`,
    top: `${((definition.pageHeight - field.y - (field.size ?? 9)) / definition.pageHeight) * 100}%`,
    widthPercent: `${(field.width / definition.pageWidth) * 100}%`,
    fontCqw: `${((field.size ?? 9) / definition.pageWidth) * 100}cqw`,
  }));
}

export function previewCheckFields(template: OfficialPreauthTemplate, formData: Record<string, any>) {
  const definition = templates[template];
  return (definition.checks ?? [])
    .filter((field) => field.checked(formData))
    .map((field) => ({
      ...field,
      left: `${(field.x / definition.pageWidth) * 100}%`,
      top: `${((definition.pageHeight - field.y - 9) / definition.pageHeight) * 100}%`,
      fontCqw: `${(10 / definition.pageWidth) * 100}cqw`,
    }));
}

export async function createOfficialPreauthPdf(
  template: OfficialPreauthTemplate,
  formData: Record<string, any>,
): Promise<Uint8Array> {
  const definition = templates[template];
  const response = await fetch(`${definition.assetRoot}/blank.pdf`);
  if (!response.ok) throw new Error("Official template could not be loaded");

  const document = await PDFDocument.load(await response.arrayBuffer());
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0, 0.2, 0.55);

  for (const field of definition.fields) {
    if (!shouldRenderField(field, formData)) continue;
    const value = String(formData[field.key] ?? "").toUpperCase().trim();
    if (!value) continue;
    const size = field.size ?? 9;
    const fitted = value.length > 0
      ? Math.min(size, Math.max(5, (field.width / value.length) * 1.65))
      : size;
    const page = pages[(field.page ?? 1) - 1];
    if (!page) continue;
    page.drawText(value, { x: field.x, y: field.y, size: fitted, font, color: blue, maxWidth: field.width });
  }

  for (const field of definition.checks ?? []) {
    if (!field.checked(formData)) continue;
    const page = pages[field.page - 1];
    if (!page) continue;
    // Standard PDF fonts use WinAnsi and cannot encode the Unicode tick. A
    // Vector strokes make the tick render consistently in every generated PDF.
    page.drawLine({ start: { x: field.x, y: field.y + 3 }, end: { x: field.x + 3, y: field.y }, thickness: 1.4, color: blue });
    page.drawLine({ start: { x: field.x + 3, y: field.y }, end: { x: field.x + 8, y: field.y + 8 }, thickness: 1.4, color: blue });
    continue;
    page.drawText("✓", { x: field.x, y: field.y, size: 10, font, color: blue });
  }

  return document.save();
}
