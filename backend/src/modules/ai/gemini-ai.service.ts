import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiAiService {
  constructor(private readonly config: ConfigService) {}

  isEnabled() {
    return this.config.get<string>('GEMINI_ENABLED') === 'true' && Boolean(this.config.get<string>('GEMINI_API_KEY'));
  }

  async extractPolicyFields(documentText: string): Promise<Record<string, unknown> | null> {
    if (!this.isEnabled()) return null;
    // A bounded text-only request avoids provider access to the source file and
    // prevents unexpected token/cost growth for malformed documents.
    return this.json<Record<string, unknown>>(
      `You are a healthcare insurance document analyst. Extract only explicitly stated values. Return JSON only with these optional keys: patientName, policyNumber, cardId, dob, gender, insuranceCompany, tpaName, corporateName, employeeId, sumInsured, eligibleRoom, icuIccu, copay, subLimit, restoreBenefit, preHospitalization, postHospitalization, ambulanceCover, ayushTreatment. Never infer missing values.`,
      { documentText: documentText.slice(0, 30_000) },
    );
  }

  async suggestIcd10(diagnosis: string) {
    return this.json<{ code: string; description: string }>(
      'Return JSON only: {"code":"ICD-10 code or empty string","description":"short description"}. Suggest only when the diagnosis is sufficiently specific; otherwise return empty strings. This is a coding suggestion requiring clinician verification.',
      { diagnosis: diagnosis.slice(0, 500) },
    );
  }

  async draftQueryReply(query: string, claimContext: Record<string, unknown>) {
    return this.json<{ draft: string }>(
      'Draft a concise, professional health-insurance query response. Do not invent clinical facts, commitments, approvals, or patient identifiers. Return JSON only: {"draft":"..."}.',
      { query: query.slice(0, 4000), claimContext },
    );
  }

  async analyzeClaim(claim: Record<string, unknown>, comparisonClaims: Record<string, unknown>[]) {
    return this.json<Record<string, unknown>>(
      'Analyze operational claim metadata only. Return JSON with riskScore {score 0-100, likelihood High|Medium|Low, recommendation, factors string[]}, fraudRisk {score 0-100, riskLevel None|Low|Medium|High, suspiciousPatterns string[]}, duplicateDetection {isPotentialDuplicate boolean, matchingClaimIds string[], matchConfidence 0-100, reason}. This is advisory only; do not make coverage or fraud determinations.',
      { claim, comparisonClaims: comparisonClaims.slice(0, 50) },
    );
  }

  private async json<T>(instruction: string, input: Record<string, unknown>): Promise<T> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    const model = this.config.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    if (!key) throw new ServiceUnavailableException('AI analysis is not configured.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 4096 },
        }),
      });
      if (!response.ok) throw new ServiceUnavailableException('AI analysis is temporarily unavailable.');
      const body = await response.json() as any;
      const text = body?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('').trim();
      if (!text) throw new ServiceUnavailableException('AI analysis returned no structured result.');
      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('AI analysis is temporarily unavailable.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
