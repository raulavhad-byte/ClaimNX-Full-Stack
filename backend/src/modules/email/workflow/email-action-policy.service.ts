import { Injectable } from '@nestjs/common';
import { ClaimMatchResult } from '../inbound/claim-matcher.service';
import { ExtractedEmailData } from '../extraction/email-data-extractor.service';
import { EmailClassificationType } from '../types/email.types';

export type WorkflowDecision = 'AUTO_PROCESS' | 'REVIEW_REQUIRED' | 'NO_WORKFLOW_ACTION';

export interface ActionPolicyEvaluation {
  decision: WorkflowDecision;
  proposedStageTransition?: string;
  reviewReason?: string;
  policyNotes: string[];
}

@Injectable()
export class EmailActionPolicyService {
  evaluate(
    matchResult: ClaimMatchResult,
    classification: { classification: EmailClassificationType; confidence: number },
    extractedData: ExtractedEmailData,
    conflictResult: { hasConflict: boolean; conflicts: any[] },
    isTrustedSender: boolean
  ): ActionPolicyEvaluation {
    const notes: string[] = [];

    if (!matchResult.matched || !matchResult.claim) {
      return {
        decision: 'REVIEW_REQUIRED',
        reviewReason: matchResult.reason || 'UNMATCHED_CLAIM',
        policyNotes: ['Email could not be deterministically mapped to a single active claim.']
      };
    }

    if (!isTrustedSender) {
      return {
        decision: 'REVIEW_REQUIRED',
        reviewReason: 'UNKNOWN_SENDER',
        policyNotes: ['Sender email domain is not in the verified Insurer/TPA whitelist.']
      };
    }

    if (conflictResult.hasConflict) {
      return {
        decision: 'REVIEW_REQUIRED',
        reviewReason: 'CONFLICTING_INFORMATION',
        policyNotes: conflictResult.conflicts.map((c) => c.description)
      };
    }

    if (classification.confidence < 0.8) {
      return {
        decision: 'REVIEW_REQUIRED',
        reviewReason: 'LOW_CONFIDENCE',
        policyNotes: [`Classification confidence below 0.8 threshold.`]
      };
    }

    if (classification.classification === 'PREAUTH_APPROVAL') {
      if (extractedData.approvedAmount && extractedData.approvedAmount > 0) {
        notes.push(`Pre-auth approval verified with amount ₹${extractedData.approvedAmount}`);
        return {
          decision: 'AUTO_PROCESS',
          proposedStageTransition: 'Pre Auth Approved',
          policyNotes: notes
        };
      } else {
        return {
          decision: 'REVIEW_REQUIRED',
          reviewReason: 'LOW_CONFIDENCE',
          policyNotes: ['Pre-auth approval email lacks clear approved numeric amount.']
        };
      }
    }

    if (classification.classification === 'PREAUTH_QUERY') {
      notes.push('Query raised by payer.');
      return {
        decision: 'AUTO_PROCESS',
        proposedStageTransition: 'Initial Query Pending',
        policyNotes: notes
      };
    }

    if (classification.classification === 'ENHANCEMENT_APPROVAL') {
      notes.push('Enhancement approval received.');
      return {
        decision: 'AUTO_PROCESS',
        proposedStageTransition: 'Enhancement Approved',
        policyNotes: notes
      };
    }

    if (classification.classification === 'DISCHARGE_APPROVAL') {
      notes.push('Discharge approval received.');
      return {
        decision: 'AUTO_PROCESS',
        proposedStageTransition: 'Discharged Approved',
        policyNotes: notes
      };
    }

    if (classification.classification === 'PREAUTH_REJECTION') {
      return {
        decision: 'REVIEW_REQUIRED',
        reviewReason: 'WORKFLOW_TRANSITION_NOT_ALLOWED',
        policyNotes: ['Payer repudiation/denial letter received. Reviewer must verify and finalize rejection.']
      };
    }

    return {
      decision: 'NO_WORKFLOW_ACTION',
      policyNotes: ['General correspondence recorded in claim timeline without stage alteration.']
    };
  }
}