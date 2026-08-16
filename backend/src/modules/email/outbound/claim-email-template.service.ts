import { Injectable } from '@nestjs/common';

export type ClaimTemplateType =
  | 'CASHLESS_PREAUTH_REQUEST'
  | 'CASHLESS_ENHANCEMENT_REQUEST'
  | 'CASHLESS_QUERY_RESPONSE'
  | 'DISCHARGE_REQUEST'
  | 'REIMBURSEMENT_CORRESPONDENCE';

@Injectable()
export class ClaimEmailTemplateService {
  renderTemplate(type: ClaimTemplateType, context: {
    claimId: string;
    patientName: string;
    hospitalName: string;
    admissionDate?: string;
    requestedAmount?: number;
    correlationToken: string;
  }): { subject: string; plainTextBody: string; htmlBody: string } {
    switch (type) {
      case 'CASHLESS_PREAUTH_REQUEST':
        return {
          subject: `${context.correlationToken} Cashless Pre-Authorization Request - ${context.patientName}`,
          plainTextBody: `Dear Claims Desk,\n\nPlease find attached the Pre-Authorization Request Form and clinical documentation for Patient: ${context.patientName} at ${context.hospitalName}.\n\nRequested Amount: INR ${context.requestedAmount?.toLocaleString() || 'N/A'}\n\nKindly acknowledge and issue initial approval.\n\nRegards,\n${context.hospitalName} TPA Desk`,
          htmlBody: `<p>Dear Claims Desk,</p><p>Please find attached the <strong>Pre-Authorization Request Form</strong> and clinical documentation for Patient: <strong>${context.patientName}</strong> at ${context.hospitalName}.</p><p><strong>Requested Amount:</strong> INR ${context.requestedAmount?.toLocaleString() || 'N/A'}</p><p>Regards,<br/>${context.hospitalName} TPA Desk</p>`
        };

      case 'CASHLESS_ENHANCEMENT_REQUEST':
        return {
          subject: `${context.correlationToken} Cashless Enhancement Request - ${context.patientName}`,
          plainTextBody: `Dear Claims Desk,\n\nPlease review the enhancement request with updated interim billing for Patient: ${context.patientName}.\n\nRequested Enhancement Amount: INR ${context.requestedAmount?.toLocaleString() || 'N/A'}\n\nRegards,\n${context.hospitalName} TPA Desk`,
          htmlBody: `<p>Dear Claims Desk,</p><p>Please review the enhancement request for Patient: <strong>${context.patientName}</strong>.</p><p>Regards,<br/>${context.hospitalName} TPA Desk</p>`
        };

      case 'DISCHARGE_REQUEST':
        return {
          subject: `${context.correlationToken} Final Discharge & Settlement Authorization - ${context.patientName}`,
          plainTextBody: `Dear Claims Desk,\n\nPlease find attached the final discharge summary and final bill for Patient: ${context.patientName}.\n\nKindly issue final authorization.\n\nRegards,\n${context.hospitalName} TPA Desk`,
          htmlBody: `<p>Dear Claims Desk,</p><p>Please find attached the final discharge summary and final bill for Patient: <strong>${context.patientName}</strong>.</p>`
        };

      default:
        return {
          subject: `${context.correlationToken} Claim Correspondence - ${context.patientName}`,
          plainTextBody: `Dear Claims Desk,\n\nPlease find updated records for claim ${context.claimId}.\n\nRegards,\n${context.hospitalName}`,
          htmlBody: `<p>Dear Claims Desk,</p><p>Please find updated records for claim <strong>${context.claimId}</strong>.</p>`
        };
    }
  }
}