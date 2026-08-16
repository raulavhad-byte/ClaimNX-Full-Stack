import { Injectable } from '@nestjs/common';
import { NormalizedEmail } from '../types/email.types';

export interface ClaimMatchResult {
  matched: boolean;
  claimId?: string;
  claim?: any;
  method: 'CORRELATION_ID' | 'IN_REPLY_TO' | 'SUBJECT_CLAIM_NUMBER' | 'INSURER_REF' | 'PATIENT_CONTEXT' | 'UNMATCHED';
  confidence: number;
  evidence: string[];
  candidateClaims?: any[];
  reason?: string;
}

@Injectable()
export class ClaimMatcherService {
  matchEmailToClaim(email: NormalizedEmail, claims: any[], threads: any[] = []): ClaimMatchResult {
    const evidence: string[] = [];

    // 1. Exact Correlation Token ([ClaimNX:CLM-...] or [ClaimNX:uuid])
    const correlationRegex = /\[ClaimNX:(CLM-[A-Za-z0-9-]+|[0-9a-f-]{8,36}|CORR-[A-Za-z0-9-]+)\]/i;
    const subjectMatch = email.subject.match(correlationRegex);

    if (subjectMatch && subjectMatch[1]) {
      const token = subjectMatch[1];
      evidence.push(`Found ClaimNX correlation token: ${token}`);

      const matchedClaim = claims.find(
        (c) => c.id === token || c.case_ref_id === token || c.caseRefId === token || c.claimNumber === token
      );
      if (matchedClaim) {
        return {
          matched: true,
          claimId: matchedClaim.id,
          claim: matchedClaim,
          method: 'CORRELATION_ID',
          confidence: 1.0,
          evidence: [...evidence, `Matched direct claim reference: ${matchedClaim.id}`]
        };
      }

      const matchedThread = threads.find((t) => t.correlation_id === token || t.correlationId === token);
      if (matchedThread && matchedThread.claim_id) {
        const claimFromThread = claims.find((c) => c.id === matchedThread.claim_id);
        if (claimFromThread) {
          return {
            matched: true,
            claimId: claimFromThread.id,
            claim: claimFromThread,
            method: 'CORRELATION_ID',
            confidence: 0.99,
            evidence: [...evidence, `Matched via thread correlation mapping: ${matchedThread.id}`]
          };
        }
      }
    }

    // 2. In-Reply-To or References Header Match
    if (email.inReplyTo || (email.references && email.references.length > 0)) {
      const refIds = [email.inReplyTo, ...(email.references || [])].filter(Boolean);
      for (const ref of refIds) {
        const threadWithRef = threads.find((t) => t.data?.internetMessageIds?.includes(ref));
        if (threadWithRef && threadWithRef.claim_id) {
          const claim = claims.find((c) => c.id === threadWithRef.claim_id);
          if (claim) {
            return {
              matched: true,
              claimId: claim.id,
              claim,
              method: 'IN_REPLY_TO',
              confidence: 0.95,
              evidence: [`Matched via In-Reply-To/References header: ${ref}`]
            };
          }
        }
      }
    }

    // 3. Exact Claim Code in Subject
    const generalClaimRegex = /\b(CLM-[0-9]{4,8}-[0-9]{3,6}|CNX-[0-9]{4,8})\b/i;
    const generalSubjectMatch = email.subject.match(generalClaimRegex);
    if (generalSubjectMatch && generalSubjectMatch[1]) {
      const candidateCode = generalSubjectMatch[1].toUpperCase();
      const matched = claims.find(
        (c) => (c.case_ref_id && c.case_ref_id.toUpperCase() === candidateCode) || (c.id && c.id.toUpperCase() === candidateCode)
      );
      if (matched) {
        return {
          matched: true,
          claimId: matched.id,
          claim: matched,
          method: 'SUBJECT_CLAIM_NUMBER',
          confidence: 0.92,
          evidence: [`Matched exact claim code in subject: ${candidateCode}`]
        };
      }
    }

    // 4. Policy Number in Body
    if (email.plainTextBody) {
      for (const claim of claims) {
        const policyNo = claim.policy_number || claim.policyNumber || claim.formData?.p_policy_no;
        if (policyNo && policyNo.length >= 6 && email.plainTextBody.includes(policyNo)) {
          return {
            matched: true,
            claimId: claim.id,
            claim,
            method: 'INSURER_REF',
            confidence: 0.85,
            evidence: [`Matched unique policy number in body: ${policyNo}`]
          };
        }
      }
    }

    // 5. Patient Name Context (Fuzzy check)
    const patientNameCandidates = claims.filter((c) => {
      const name = c.patient_name || c.patientName || c.formData?.p_name;
      return name && name.length > 3 && email.subject.toLowerCase().includes(name.toLowerCase());
    });

    if (patientNameCandidates.length === 1) {
      return {
        matched: true,
        claimId: patientNameCandidates[0].id,
        claim: patientNameCandidates[0],
        method: 'PATIENT_CONTEXT',
        confidence: 0.78,
        evidence: [`Matched single patient candidate: ${patientNameCandidates[0].patient_name || patientNameCandidates[0].patientName}`]
      };
    } else if (patientNameCandidates.length > 1) {
      return {
        matched: false,
        method: 'UNMATCHED',
        confidence: 0.4,
        reason: 'AMBIGUOUS_CLAIM',
        candidateClaims: patientNameCandidates,
        evidence: [`Ambiguous: ${patientNameCandidates.length} candidate claims share this patient name.`]
      };
    }

    return {
      matched: false,
      method: 'UNMATCHED',
      confidence: 0.0,
      reason: 'UNMATCHED_CLAIM',
      evidence: ['No deterministic or context match found for email']
    };
  }
}