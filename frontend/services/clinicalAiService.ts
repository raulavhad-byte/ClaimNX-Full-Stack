import { claimnxApi } from './claimnx-api';

const safeClaimContext = (claim: any) => ({
  caseId: claim?.caseReferenceId || claim?.claimNumber || '',
  diagnosis: claim?.diagnosis || '',
  insurer: claim?.insuranceProvider || '',
  status: claim?.status || '',
  admissionDate: claim?.admissionDate || '',
});

export const clinicalAiService = {
  draftQueryReply: async (claim: unknown, query: string) => claimnxApi.post<{ draft: string }>('/ai/clinical/query-reply', { query, claimContext: safeClaimContext(claim) }),
  suggestICD10: async (diagnosis: string) => claimnxApi.post<{ code: string; description: string }>('/ai/clinical/icd10', { diagnosis }),
};
