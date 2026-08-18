import { ocrApi } from './api';

/**
 * Compatibility wrapper for admission components. OCR is performed only by
 * the backend; this function contains no provider key, prompt, or extraction
 * logic. It will be replaced by more purpose-specific backend calls later.
 */
export const extractDataFromPolicy = async (base64: unknown, mimeType = 'application/pdf'): Promise<any> => {
  if (typeof base64 !== 'string' || !base64) throw new Error('A policy document is required for OCR.');
  const payload = base64.includes(',') ? base64.split(',').pop()! : base64;
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const extension = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
  const result: any = await ocrApi.extractPolicyECard(new File([bytes], `policy-e-card.${extension}`, { type: mimeType }));
  return result?.extracted ?? result?.data?.extracted ?? {};
};

// Medical extraction has not been approved for automated use. Clinical data
// must be captured through a separately validated backend workflow.
export const extractMedicalData = async (_file: unknown): Promise<any> => ({});
export const fetchEntityContactDetails = async (_entity: unknown): Promise<any> => ({});
