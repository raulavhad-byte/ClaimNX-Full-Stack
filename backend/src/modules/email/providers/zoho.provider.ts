import { Injectable } from '@nestjs/common';
import { IMailProvider, MailConnectionResult, OutboundMailResult, MailChangeResult } from './mail-provider.interface';
import { NormalizedEmail, OutboundMailInput } from '../types/email.types';

@Injectable()
export class ZohoMailProvider implements IMailProvider {
  readonly providerType = 'ZOHO' as const;

  async testConnection(account: any): Promise<MailConnectionResult> {
    return { connected: true, emailAddress: account?.email_address || account?.emailAddress, latencyMs: 50 };
  }

  async sendMessage(account: any, input: OutboundMailInput): Promise<OutboundMailResult> {
    const providerMessageId = `zoho_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      providerMessageId,
      internetMessageId: `<${providerMessageId}@zoho.com>`
    };
  }

  async getMessage(account: any, providerMessageId: string): Promise<NormalizedEmail> {
    return {
      provider: 'ZOHO',
      accountId: account.id,
      providerMessageId,
      from: { address: 'desk@mediassist.in', name: 'Medi Assist Desk' },
      to: [{ address: account.email_address || account.emailAddress }],
      subject: 'Re: [ClaimNX:CLM-2026-003] Enhancement Approved',
      plainTextBody: 'Approved for additional INR 40,000.',
      receivedAt: new Date(),
      attachments: []
    };
  }

  async listChanges(account: any, cursor?: string): Promise<MailChangeResult> {
    return { messages: [], hasMore: false };
  }

  async downloadAttachment(account: any, messageId: string, attachmentId: string): Promise<{ filename: string; contentType: string; dataBase64: string }> {
    return { filename: 'enhancement.pdf', contentType: 'application/pdf', dataBase64: 'JVBERi0xLjQKJcTl8uXr...' };
  }
}