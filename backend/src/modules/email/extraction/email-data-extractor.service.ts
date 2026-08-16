import { Injectable } from '@nestjs/common';
import { NormalizedEmail } from '../types/email.types';

export interface ExtractedEmailData {
  approvalNumber?: string;
  approvedAmount?: number;
  queryReasons?: string[];
  rejectionReason?: string;
  confidenceScores: Record<string, number>;
}

@Injectable()
export class EmailDataExtractorService {
  extractStructuredData(email: NormalizedEmail): ExtractedEmailData {
    const text = `${email.subject} \n ${email.plainTextBody || ''}`;
    const data: ExtractedEmailData = { confidenceScores: {} };

    const amountRegex = /(?:approved\s*(?:amount|sum)?|authorized\s*amount|sanctioned\s*amount|inr|rs\.?)\s*[:=-]?\s*(?:inr|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?|[0-9]+)/i;
    const amountMatch = text.match(amountRegex);
    if (amountMatch && amountMatch[1]) {
      const num = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) {
        data.approvedAmount = num;
        data.confidenceScores['approvedAmount'] = 0.9;
      }
    }

    const authRegex = /(?:auth(?:orization)?\s*(?:no|num|number|id)|al\s*no|pre-?auth\s*(?:ref|no|id))\s*[:=-]?\s*([A-Za-z0-9\/-]{5,30})/i;
    const authMatch = text.match(authRegex);
    if (authMatch && authMatch[1]) {
      data.approvalNumber = authMatch[1].trim();
      data.confidenceScores['approvalNumber'] = 0.92;
    }

    return data;
  }

  detectConflicts(bodyData: ExtractedEmailData, ocrData?: Partial<ExtractedEmailData>) {
    const conflicts: any[] = [];
    if (!ocrData) return { hasConflict: false, conflicts };

    if (bodyData.approvedAmount && ocrData.approvedAmount && Math.abs(bodyData.approvedAmount - ocrData.approvedAmount) > 1.0) {
      conflicts.push({
        field: 'approvedAmount',
        bodyValue: bodyData.approvedAmount,
        attachmentValue: ocrData.approvedAmount,
        description: `Discrepancy: Email Body states ₹${bodyData.approvedAmount} while Letter OCR states ₹${ocrData.approvedAmount}`
      });
    }

    return { hasConflict: conflicts.length > 0, conflicts };
  }
}