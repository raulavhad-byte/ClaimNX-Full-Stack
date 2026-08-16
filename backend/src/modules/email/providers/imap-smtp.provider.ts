import { Injectable } from '@nestjs/common';
import { IMailProvider, MailConnectionResult, OutboundMailResult, MailChangeResult } from './mail-provider.interface';
import { NormalizedEmail, OutboundMailInput } from '../types/email.types';

@Injectable()
export class ImapSmtpProvider implements IMailProvider {
  readonly providerType = 'IMAP_SMTP' as const;

  async testConnection(account: any): Promise<MailConnectionResult> {
    return { connected: true, emailAddress: account?.email_address || account?.emailAddress, latencyMs: 65 };
  }

  async sendMessage(account: any, input: OutboundMailInput): Promise<OutboundMailResult> {
    const providerMessageId = `smtp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const domain = (account.email_address || 'hospital.org').split('@')[1] || 'hospital.org';
    return {
      success: true,
      providerMessageId,
      internetMessageId: `<${providerMessageId}@${domain}>`
    };
  }

  async getMessage(account: any, providerMessageId: string): Promise<NormalizedEmail> {
    return {
      provider: 'IMAP_SMTP',
      accountId: account.id,
      providerMessageId,
      from: { address: 'claims@icicilombard.com', name: 'ICICI Lombard' },
      to: [{ address: account.email_address || account.emailAddress }],
      subject: 'Re: [ClaimNX:CLM-2026-004] Pre-Auth Decision',
      plainTextBody: 'Pre-auth status updated.',
      receivedAt: new Date(),
      attachments: []
    };
  }

  async listChanges(account: any, cursor?: string): Promise<MailChangeResult> {
    return { messages: [], hasMore: false };
  }

  async downloadAttachment(account: any, messageId: string, attachmentId: string): Promise<{ filename: string; contentType: string; dataBase64: string }> {
    return { filename: 'decision.pdf', contentType: 'application/pdf', dataBase64: 'JVBERi0xLjQKJcTl8uXr...' };
  }
}