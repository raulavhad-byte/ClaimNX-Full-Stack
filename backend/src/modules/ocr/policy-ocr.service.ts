import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

import { DatabaseService } from '../../database/database.service';
import { GeminiAiService } from '../ai/gemini-ai.service';

type Upload = { buffer: Buffer; originalname: string; mimetype?: string; size: number };
type Actor = { id: string; hospitalId?: string | null; role?: string | null };
const execFileAsync = promisify(execFile);

@Injectable()
export class PolicyOcrService {
  private static readonly allowedMimeTypes = new Set([
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  ]);

  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly gemini: GeminiAiService,
  ) {}

  async extractPolicyECard({ file, actor }: { file: Upload; actor: Actor }) {
    if (!actor?.id) throw new BadRequestException('An authenticated user is required.');
    if (!file.size || file.size > 5 * 1024 * 1024) throw new BadRequestException('OCR files must be between 1 byte and 5 MB.');
    if (!PolicyOcrService.allowedMimeTypes.has(String(file.mimetype || '').toLowerCase())) {
      throw new BadRequestException('Only PDF, JPG, PNG, and WEBP policy documents are supported.');
    }

    const sourceHash = createHash('sha256').update(file.buffer).digest('hex');
    const recordId = randomUUID();
    const hospitalId = actor.hospitalId ?? null;

    try {
      const text = await this.readText(file);
      const extracted = await this.extractPolicyFields(text);
      const confidence = this.confidence(extracted);
      await this.persist({ recordId, hospitalId, actorId: actor.id, file, sourceHash, status: 'COMPLETED', extracted, confidence });

      return {
        extractionId: recordId,
        requiresReview: true,
        provider: this.provider(),
        extracted,
        confidence,
        // Text is deliberately not returned: it can include unnecessary PHI.
      };
    } catch (error: any) {
      await this.persist({ recordId, hospitalId, actorId: actor.id, file, sourceHash, status: 'FAILED', extracted: {}, confidence: {} });
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Policy OCR could not be completed. Please enter the details manually.');
    }
  }

  private async readText(file: Upload): Promise<string> {
    if (this.provider() === 'TESSERACT_LOCAL') return this.readTextWithTesseract(file);
    return this.readTextWithAzure(file);
  }

  /**
   * Optional paid-provider adapter retained only for existing deployments.
   * New deployments should use TESSERACT_LOCAL so documents never leave the
   * ClaimNX server for OCR.
   */
  private async readTextWithAzure(file: Upload): Promise<string> {
    const endpoint = this.config.get<string>('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT')?.replace(/\/$/, '');
    const apiKey = this.config.get<string>('AZURE_DOCUMENT_INTELLIGENCE_KEY');
    if (!endpoint || !apiKey) {
      throw new ServiceUnavailableException('OCR is not configured. Set the backend Azure Document Intelligence configuration before using this feature.');
    }

    const start = await fetch(`${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Content-Type': file.mimetype || 'application/octet-stream' },
      body: new Uint8Array(file.buffer),
    });
    if (!start.ok) throw new ServiceUnavailableException('The OCR provider rejected the document.');
    const operationUrl = start.headers.get('operation-location');
    if (!operationUrl) throw new ServiceUnavailableException('The OCR provider did not return a processing operation.');

    for (let attempt = 0; attempt < 15; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const result = await fetch(operationUrl, { headers: { 'Ocp-Apim-Subscription-Key': apiKey } });
      if (!result.ok) throw new ServiceUnavailableException('Unable to retrieve the OCR result.');
      const body = await result.json() as any;
      if (body.status === 'succeeded') {
        const text = body.analyzeResult?.content;
        if (!text) throw new BadRequestException('No readable text was found in this policy document.');
        return String(text);
      }
      if (body.status === 'failed') throw new BadRequestException('The OCR provider could not read this document.');
    }
    throw new ServiceUnavailableException('OCR processing timed out. Please try again.');
  }

  private async readTextWithTesseract(file: Upload): Promise<string> {
    const tesseract = this.config.get<string>('TESSERACT_PATH') || 'tesseract';
    const pdfToText = this.config.get<string>('PDFTOTEXT_PATH') || 'pdftotext';
    const pdfToPpm = this.config.get<string>('PDFTOPPM_PATH') || 'pdftoppm';
    const languages = this.config.get<string>('TESSERACT_LANGUAGES') || 'eng';
    const directory = await mkdtemp(join(tmpdir(), 'claimnx-ocr-'));
    const extension = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const source = join(directory, `source.${extension}`);

    try {
      await writeFile(source, file.buffer, { mode: 0o600 });

      // Digitally generated PDFs have embedded text; using it first is faster
      // and more accurate than image OCR.
      if (file.mimetype === 'application/pdf') {
        try {
          const { stdout } = await execFileAsync(pdfToText, ['-layout', source, '-'], { timeout: 30_000, maxBuffer: 6 * 1024 * 1024, windowsHide: true });
          if (stdout.trim().length >= 20) return stdout;
        } catch {
          // A scanned PDF has no text layer; render its first pages below.
        }

        const prefix = join(directory, 'page');
        try {
          // Higher resolution materially improves small print on policy cards.
          await execFileAsync(pdfToPpm, ['-f', '1', '-l', '3', '-r', '300', '-png', source, prefix], { timeout: 60_000, windowsHide: true });
          const pages = [1, 2, 3].map((page) => join(directory, `page-${page}.png`));
          const text = await Promise.all(pages.map((page) => this.runTesseract(tesseract, page, languages).catch(() => '')));
          const combined = text.filter(Boolean).join('\n');
          if (combined.trim()) return combined;
        } catch {
          throw new ServiceUnavailableException('Local PDF OCR requires Poppler (pdftotext and pdftoppm) on the backend server.');
        }
        throw new BadRequestException('No readable text was found in this policy document.');
      }

      const text = await this.runTesseract(tesseract, source, languages);
      if (!text.trim()) throw new BadRequestException('No readable text was found in this policy document.');
      return text;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Local OCR is unavailable. Install Tesseract on the backend server and configure TESSERACT_PATH.');
    } finally {
      await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async runTesseract(binary: string, image: string, languages: string) {
    const psm = this.config.get<string>('TESSERACT_PAGE_SEGMENTATION_MODE') || '11';
    const { stdout } = await execFileAsync(binary, [image, 'stdout', '-l', languages, '--psm', psm], {
      timeout: 60_000,
      maxBuffer: 6 * 1024 * 1024,
      windowsHide: true,
    });
    return stdout;
  }

  private provider() {
    return (this.config.get<string>('OCR_PROVIDER') || 'TESSERACT_LOCAL').trim().toUpperCase();
  }

  private async extractPolicyFields(text: string) {
    const field = (...labels: string[]) => this.findLabelValue(text, labels);
    const dob = this.toIsoDate(field('date of birth', 'dob'));
    const members = this.findMembers(text);
    const deterministic = {
      patientName: this.asName(field('patient name', 'insured name', 'member name', 'name of insured')) || 'NA',
      policyNumber: this.asIdentifier(field('policy no', 'policy number', 'policy #')) || 'NA',
      cardId: this.asIdentifier(field('card id', 'member id', 'health id', 'uhid')) || 'NA',
      dob: dob || 'NA',
      gender: this.normaliseGender(field('gender', 'sex')) || 'NA',
      insuranceCompany: field('insurance company', 'insurer') || 'NA',
      tpaName: field('tpa', 'third party administrator') || 'NA',
      corporateName: field('corporate name', 'company name') || 'NA',
      employeeId: this.asIdentifier(field('employee id', 'employee code')) || 'NA',
      sumInsured: field('sum insured', 'sum assured', 'coverage amount') || 'NA',
      eligibleRoom: field('room rent', 'room eligibility', 'room limit') || 'NA',
      icuIccu: field('icu', 'iccu limit') || 'NA',
      copay: field('co-pay', 'copay') || 'NA',
      subLimit: field('sub limit', 'sub-limit') || 'NA',
      restoreBenefit: field('restore benefit', 'restoration benefit') || 'NA',
      preHospitalization: field('pre hospitalization', 'pre-hospitalization') || 'NA',
      postHospitalization: field('post hospitalization', 'post-hospitalization') || 'NA',
      ambulanceCover: field('ambulance cover', 'ambulance') || 'NA',
      ayushTreatment: field('ayush') || 'NA',
      insuredPersons: members,
      // These names match the New Admission form. Only labelled, validated
      // values are returned; no raw OCR text is ever sent to the browser.
      admissionForm: this.extractAdmissionFormFields(text),
      aiAnalysisComment: 'OCR suggestion only. Verify all extracted policy and benefit details against the original document.',
    };
    const aiFields = await this.gemini.extractPolicyFields(text).catch(() => null);
    if (!aiFields) return deterministic;
    // Provider output is untrusted: accept only known top-level scalar fields,
    // retain deterministic values when Gemini omitted/declined a value.
    const allowed = Object.keys(deterministic).filter((key) => key !== 'insuredPersons' && key !== 'admissionForm');
    for (const key of allowed) {
      const value = aiFields[key];
      if (typeof value === 'string' && value.trim() && value.length <= 200) (deterministic as any)[key] = value.trim();
    }
    return deterministic;
  }

  private findLabelValue(text: string, labels: string[]) {
    const lines = text
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.replace(/[|]/g, ' ').replace(/(?:\.{3,}|_{3,}|-{4,})/g, ' ').replace(/\s{2,}/g, ' ').trim())
      .filter(Boolean);

    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matcher = new RegExp(`\\b${escaped}\\b\\s*[:#-]?\\s*(.*)$`, 'i');
      for (let index = 0; index < lines.length; index += 1) {
        const match = lines[index].match(matcher);
        if (!match) continue;
        const sameLineValue = this.cleanCandidate(match[1]);
        if (sameLineValue) return sameLineValue;
        const nextLineValue = this.cleanCandidate(lines[index + 1] || '');
        if (nextLineValue) return nextLineValue;
      }
    }
    return '';
  }

  /** Prevent uncertain OCR fragments from being presented as admission data. */
  private cleanCandidate(value: string) {
    const cleaned = value
      .replace(/(?:\bvalid\s+(?:from|till|to|for)\b).*$/i, '')
      .replace(/\b(?:date of admission|date of birth|gender|policy(?:\s*(?:no|number))?|member(?:\s*id)?|card\s*id|employee(?:\s*(?:id|code))?)\s*[:#-].*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleaned.length < 2 || cleaned.length > 100) return '';
    if (/block\s+letters|patient\s*(?:&|and)\s*policy|form\s*(?:no|number)/i.test(cleaned)) return '';
    return cleaned;
  }

  private asIdentifier(value: string) {
    const candidates = value.match(/[A-Z0-9][A-Z0-9/-]{4,39}/gi) || [];
    const permitted = candidates
      .map((candidate) => candidate.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi, ''))
      .filter((candidate) => /\d/.test(candidate) && !/^(?:POLICY|MEMBER|CARD|VALID|DATE)$/i.test(candidate));
    return permitted.sort((a, b) => b.length - a.length)[0] || '';
  }

  private asName(value: string) {
    const candidate = value.replace(/\b(?:mr|mrs|ms|dr)\.?\s+/i, '').trim();
    if (!/^[a-z][a-z '\-]{2,79}$/i.test(candidate)) return '';
    const words = candidate.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.some((word) => word.length < 2)) return '';
    return words.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`).join(' ');
  }

  private extractAdmissionFormFields(text: string): Record<string, string> {
    const field = (...labels: string[]) => this.findLabelValue(text, labels);
    const values: Record<string, string> = {};
    const put = (key: string, value: string) => {
      if (value) values[key] = value;
    };
    const date = (...labels: string[]) => this.toIsoDate(field(...labels));
    const identifier = (...labels: string[]) => this.asIdentifier(field(...labels));
    const number = (...labels: string[]) => this.asNumber(field(...labels));

    put('p_contact', this.asPhone(field('mobile number', 'mobile no', 'contact number', 'phone number')));
    put('p_email', this.asEmail(field('email id', 'email address', 'email')));
    put('p_uhid', identifier('hospital uhid', 'uhid', 'ipd no', 'ipd number'));
    put('corporate_name', this.asOrganisation(field('corporate name', 'employer name', 'company name')));
    put('p_employee_id', identifier('employee id', 'employee code'));
    put('p_relative_contact', this.asPhone(field('alternate contact', 'alt contact')));
    put('p_address', this.asNarrative(field('residential address', 'address')));

    put('dr_name', this.asName(field('treating doctor', 'doctor name', 'name of treating doctor')));
    put('dr_contact', this.asPhone(field('doctor contact', 'doctor mobile', 'treating doctor contact')));
    put('m_illness', this.asNarrative(field('nature of illness', 'presenting complaints', 'chief complaints')));
    put('m_clinical_findings', this.asNarrative(field('critical findings', 'relevant findings')));
    put('m_duration', number('duration of ailment', 'duration'));
    put('m_first_cons_date', date('date of first consultation', 'first consultation date'));
    put('m_past_history', this.asNarrative(field('past history', 'history of present illness')));
    put('m_prov_diag', this.asNarrative(field('provisional diagnosis', 'diagnosis')));
    put('m_icd_code', this.asIcdCode(field('icd 10 code', 'icd code')));
    put('m_investigation_details', this.asNarrative(field('treatment protocol', 'investigation details', 'medical management details')));
    put('m_surgery_name', this.asNarrative(field('name of surgery', 'proposed surgery')));
    put('m_icd_pcs_code', this.asIcdCode(field('icd 10 pcs code', 'pcs code')));

    put('adm_date', date('date of admission', 'admission date'));
    put('adm_exp_discharge', date('expected discharge date', 'expected date of discharge'));
    put('adm_time', this.asTime(field('admission time', 'time of admission')));
    put('adm_stay_days', number('expected stay', 'length of stay', 'stay days'));
    put('adm_icu_days', number('days in icu', 'icu days'));
    put('adm_room_type', this.asRoomCategory(field('room category', 'room type', 'bed category')));
    put('cost_room_rent', number('room rent', 'room rent nursing diet'));
    put('cost_icu', number('icu charges', 'icu cost'));
    put('cost_ot', number('ot charges', 'operation theatre charges'));
    put('cost_investigation', number('investigation diagnostics', 'diagnostic charges'));
    put('cost_prof_fees', number('professional fees', 'surgeon fees'));
    put('cost_medicines', number('medicines consumables', 'pharmacy charges'));
    put('cost_other', number('other expenses'));
    put('cost_package', number('all inclusive package', 'package amount'));

    const admissionType = field('admission type', 'type of admission');
    if (/emergency/i.test(admissionType)) values.adm_type = 'Emergency';
    if (/planned|elective/i.test(admissionType)) values.adm_type = 'Planned';
    const treatment = field('proposed line of treatment', 'treatment type');
    if (/surgical/i.test(treatment)) values.m_treatment_type = 'Surgical Management';
    else if (/intensive\s*care|\bicu\b/i.test(treatment)) values.m_treatment_type = 'Intensive care';
    else if (/investigation/i.test(treatment)) values.m_treatment_type = 'Investigation';
    else if (/medical/i.test(treatment)) values.m_treatment_type = 'Medical Management';
    return values;
  }

  private asPhone(value: string) {
    const match = value.replace(/\D/g, '').match(/(?:\d{10}|\d{12})/);
    return match ? match[0].slice(-10) : '';
  }

  private asEmail(value: string) {
    const match = value.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    return match ? match[0].toLowerCase() : '';
  }

  private asNumber(value: string) {
    const match = value.replace(/,/g, '').match(/(?:₹|rs\.?|inr)?\s*(\d{1,9}(?:\.\d{1,2})?)/i);
    return match ? match[1] : '';
  }

  private asTime(value: string) {
    const match = value.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
    return match ? match[0].padStart(5, '0') : '';
  }

  private asOrganisation(value: string) {
    return /^[a-z0-9&().,' -]{3,100}$/i.test(value) ? value.replace(/\s{2,}/g, ' ').trim() : '';
  }

  private asNarrative(value: string) {
    if (value.length < 3 || value.length > 240 || /[.]{4,}|\b(?:block letters|form number)\b/i.test(value)) return '';
    return value;
  }

  private asIcdCode(value: string) {
    const match = value.match(/\b[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?\b/i);
    return match ? match[0].toUpperCase() : '';
  }

  private asRoomCategory(value: string) {
    return /^(?:single|private|semi[- ]?private|general ward|icu|ccu|nicu|deluxe|suite|sharing|economy)/i.test(value) ? value : '';
  }

  private findMembers(text: string) {
    const members: Array<{ name: string; dob: string; gender: string }> = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/(?:member|insured|beneficiary)\s*(?:name)?\s*[:#-]\s*([^,\n]{2,70})(?:,|\s{2,})(?:dob|date of birth)?\s*[:#-]?\s*([0-3]?\d[\/-][01]?\d[\/-](?:19|20)\d{2})?(?:,|\s{2,})?(male|female|other)?/i);
      if (match?.[1]) members.push({ name: match[1].trim(), dob: this.toIsoDate(match[2] || '') || '', gender: this.normaliseGender(match[3] || '') || '' });
    }
    return members.slice(0, 20);
  }

  private toIsoDate(value: string) {
    const match = value.match(/([0-3]?\d)[\/-]([01]?\d)[\/-]((?:19|20)\d{2})/);
    if (!match) return '';
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  private normaliseGender(value: string) {
    if (/female/i.test(value)) return 'Female';
    if (/male/i.test(value)) return 'Male';
    if (/other/i.test(value)) return 'Other';
    return '';
  }

  private confidence(extracted: Record<string, any>) {
    return Object.fromEntries(Object.entries(extracted)
      .filter(([key]) => key !== 'insuredPersons' && key !== 'aiAnalysisComment')
      .map(([key, value]) => [key, value && value !== 'NA' ? 0.75 : 0]));
  }

  private async persist(input: { recordId: string; hospitalId: string | null; actorId: string; file: Upload; sourceHash: string; status: string; extracted: object; confidence: object }) {
    const { error } = await this.database.getClient().from('ocr_document_extractions').insert({
      id: input.recordId,
      hospital_id: input.hospitalId,
      uploaded_by: input.actorId,
      purpose: 'POLICY_E_CARD',
      source_file_name: input.file.originalname,
      source_mime_type: input.file.mimetype || 'application/octet-stream',
      source_sha256: input.sourceHash,
      provider: this.provider(),
      status: input.status,
      extracted_data: input.extracted,
      confidence: input.confidence,
    });
    if (error) throw error;
  }
}
