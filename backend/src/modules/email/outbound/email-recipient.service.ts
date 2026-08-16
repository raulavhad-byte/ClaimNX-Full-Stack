import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailRecipientService {
  private readonly defaultPayerDirectory: Record<string, string> = {
    'STAR_HEALTH': 'claims@starhealth.in',
    'HDFC_ERGO': 'preauth@hdfcergo.com',
    'ICICI_LOMBARD': 'cashless@icicilombard.com',
    'CARE_HEALTH': 'preauth@careinsurance.com',
    'MEDI_ASSIST': 'cashless@mediassist.in',
    'VIDAL_HEALTH': 'preauth@vidalhealthtpa.com',
    'MD_INDIA': 'cashless@mdindia.com',
    'BAJAJ_ALLIANZ': 'bagiccashless@bajajallianz.co.in'
  };

  resolveRecipientEmail(payerCodeOrName: string, overrideEmail?: string): string {
    if (overrideEmail && overrideEmail.includes('@')) {
      return overrideEmail.trim();
    }
    const normalized = payerCodeOrName.toUpperCase().replace(/[^A-Z_]/g, '_');
    return this.defaultPayerDirectory[normalized] || 'claims.desk@payer-portal.in';
  }
}