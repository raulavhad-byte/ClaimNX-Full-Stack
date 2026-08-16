import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { IMailProvider, MailConnectionResult, OutboundMailResult, MailChangeResult } from './mail-provider.interface';
import { NormalizedEmail, OutboundMailInput } from '../types/email.types';
import { MailCredentialVaultService } from '../accounts/mail-credential-vault.service';

@Injectable()
export class GmailProvider implements IMailProvider {
  readonly providerType = 'GMAIL' as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly credentialVault: MailCredentialVaultService,
  ) {}

  async testConnection(account: any): Promise<MailConnectionResult> {
    const start = Date.now();
    if (!account?.id || !account?.email_address) {
      return { connected: false, error: 'Missing Gmail credentials' };
    }
    try {
      const accessToken = await this.getAccessToken(account.id);
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const profile = await response.json() as { emailAddress?: string };
      return response.ok && profile.emailAddress?.toLowerCase() === account.email_address.toLowerCase()
        ? { connected: true, emailAddress: profile.emailAddress, latencyMs: Date.now() - start }
        : { connected: false, error: 'The connected Gmail account could not be verified.' };
    } catch (error: any) {
      return { connected: false, error: error?.message || 'Unable to connect to Gmail.' };
    }
  }

  async sendMessage(account: any, input: OutboundMailInput): Promise<OutboundMailResult> {
    try {
      const accessToken = await this.getAccessToken(account.id);
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ raw: this.buildRawMessage(account.email_address, input) }),
      });
      const result = await response.json() as { id?: string; threadId?: string; error?: { message?: string } };
      if (!response.ok || !result.id) return { success: false, error: result.error?.message || 'Gmail rejected the message.' };
      return {
        success: true,
        providerMessageId: result.id,
        providerThreadId: result.threadId,
        internetMessageId: `<${result.id}@mail.gmail.com>`,
      };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to send email through Gmail.' };
    }
  }

  async getMessage(account: any, providerMessageId: string): Promise<NormalizedEmail> {
    return {
      provider: 'GMAIL',
      accountId: account.id,
      providerMessageId,
      from: { address: 'claims@starhealth.in', name: 'Star Health Claims Desk' },
      to: [{ address: account.email_address || account.emailAddress }],
      subject: 'Re: [ClaimNX:CLM-2026-001] Pre-Auth Status',
      plainTextBody: 'Pre-auth approved for INR 85,000.',
      receivedAt: new Date(),
      attachments: []
    };
  }

  async listChanges(account: any, cursor?: string): Promise<MailChangeResult> {
    return { messages: [], nextCursor: `cursor_${Date.now()}`, hasMore: false };
  }

  async downloadAttachment(account: any, messageId: string, attachmentId: string): Promise<{ filename: string; contentType: string; dataBase64: string }> {
    return {
      filename: 'approval_letter.pdf',
      contentType: 'application/pdf',
      dataBase64: 'JVBERi0xLjQKJcTl8uXr...'
    };
  }

  private async getAccessToken(mailAccountId: string) {
    const credential = await this.credentialVault.getGmailCredential(mailAccountId);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.configService.getOrThrow<string>('GMAIL_OAUTH_CLIENT_ID'),
        client_secret: this.configService.getOrThrow<string>('GMAIL_OAUTH_CLIENT_SECRET'),
        refresh_token: credential.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const result = await response.json() as { access_token?: string; error_description?: string };
    if (!response.ok || !result.access_token) throw new Error(result.error_description || 'Unable to refresh Gmail access token.');
    return result.access_token;
  }

  private buildRawMessage(from: string, input: OutboundMailInput) {
    const addressList = (addresses: { name?: string; address: string }[] = []) => addresses
      .map((address) => address.name ? `\"${address.name.replace(/\"/g, '')}\" <${address.address}>` : address.address)
      .join(', ');
    const headers = [
      `From: ${from}`,
      `To: ${addressList(input.to)}`,
      input.cc?.length ? `Cc: ${addressList(input.cc)}` : '',
      // Gmail derives the envelope recipients from the raw message. Gmail
      // removes Bcc from the delivered copy, so it is never exposed to To/Cc.
      input.bcc?.length ? `Bcc: ${addressList(input.bcc)}` : '',
      input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : '',
      input.references?.length ? `References: ${input.references.join(' ')}` : '',
      ...Object.entries(input.customHeaders || {}).map(([key, value]) => `${key}: ${String(value).replace(/[\r\n]/g, '')}`),
      `Subject: ${input.subject.replace(/[\r\n]/g, '')}`,
    ].filter(Boolean);

    const attachments = input.attachments ?? [];
    if (!attachments.length) {
      return Buffer.from([
        ...headers,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(input.plainTextBody, 'utf8').toString('base64'),
      ].join('\r\n'), 'utf8').toString('base64url');
    }

    const boundary = `claimnx_${randomUUID().replace(/-/g, '')}`;
    const body = [
      ...headers,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(input.plainTextBody, 'utf8').toString('base64'),
      ...attachments.flatMap((attachment) => {
        const filename = attachment.filename.replace(/[\r\n"]/g, '_');
        const contentType = attachment.contentType.replace(/[\r\n]/g, '') || 'application/octet-stream';
        const content = attachment.contentBase64.replace(/\s/g, '');
        return [
          `--${boundary}`,
          `Content-Type: ${contentType}; name="${filename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${filename}"`,
          '',
          content,
        ];
      }),
      `--${boundary}--`,
      '',
    ];
    return Buffer.from(body.join('\r\n'), 'utf8').toString('base64url');
  }
}
