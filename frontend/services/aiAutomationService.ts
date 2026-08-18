export const forecastRecovery = async (_claims: unknown[]): Promise<any> => ({ forecast: [], totalExpected: 0 });
import { claimnxApi } from './claimnx-api';

const safeClaim = (claim: any) => ({
  id: claim?.id || claim?.caseReferenceId || '', diagnosis: claim?.diagnosis || '', insurer: claim?.insuranceProvider || '',
  status: claim?.status || '', amount: claim?.estimatedCost || 0, admissionDate: claim?.admissionDate || '', policyNumber: claim?.policyNumber || '',
});

export const performFullAIAnalysis = async (claim: unknown, allClaims: unknown[]): Promise<any> => {
  const result = await claimnxApi.post<any>('/ai/claims/analyze', {
    claim: safeClaim(claim), comparisonClaims: Array.isArray(allClaims) ? allClaims.map(safeClaim) : [],
  });
  return { ...result, lastAnalyzedAt: new Date().toISOString() };
};
