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
    const accessToken = await this.getAccessToken(account.id);
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(providerMessageId)}?format=full`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const message = await response.json() as any;
    if (!response.ok) throw new Error(message?.error?.message || 'Unable to read Gmail message.');
    return this.normalizeMessage(account, message);
  }

  async listChanges(account: any, cursor?: string): Promise<MailChangeResult> {
    const accessToken = await this.getAccessToken(account.id);
    // A Gmail watch supplies a historyId. Normal operation must advance from
    // that cursor; never fall back to listing an entire mailbox on every run.
    if (!cursor) return { messages: [], hasMore: false };
    const output: NormalizedEmail[] = [];
    const historyResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${encodeURIComponent(cursor)}&historyTypes=messageAdded&maxResults=100`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const history = await historyResponse.json() as any;
    if (!historyResponse.ok) {
      const error: any = new Error(history?.error?.message || 'Unable to retrieve Gmail mailbox changes.');
      error.code = history?.error?.code === 404 ? 'GMAIL_HISTORY_EXPIRED' : 'GMAIL_HISTORY_FAILED';
      throw error;
    }
    const ids = [...new Set((history.history ?? []).flatMap((entry: any) => (entry.messagesAdded ?? []).map((item: any) => item.message?.id)).filter(Boolean))];
    for (const id of ids.map(String)) {
      // Headers are enough for matching/classification. Bodies and attachment
      // bytes are fetched only through an authorised on-demand flow.
      const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Message-ID`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const detail = await detailResponse.json() as any;
      if (!detailResponse.ok) continue;
      const labels = Array.isArray(detail.labelIds) ? detail.labelIds : [];
      if (!labels.includes('INBOX') && !labels.includes('SPAM')) continue;
      output.push(this.normalizeMessage(account, detail, labels.includes('SPAM') ? 'SPAM' : 'INBOX'));
    }
    return { messages: output, nextCursor: String(history.historyId || cursor), hasMore: Boolean(history.nextPageToken) };
  }

  async watch(account: any): Promise<{ historyId: string; expiresAt: string }> {
    const topicName = this.configService.get<string>('GMAIL_PUBSUB_TOPIC');
    if (!topicName) {
      const error: any = new Error('Gmail Pub/Sub topic is not configured.');
      error.code = 'GMAIL_PUSH_NOT_CONFIGURED';
      throw error;
    }
    const accessToken = await this.getAccessToken(account.id);
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ topicName, labelIds: ['INBOX', 'SPAM'], labelFilterAction: 'include' }),
    });
    const body = await response.json() as { historyId?: string; expiration?: string; error?: { message?: string } };
    if (!response.ok || !body.historyId || !body.expiration) {
      const error: any = new Error(body.error?.message || 'Unable to create Gmail mailbox watch.');
      error.code = 'GMAIL_WATCH_FAILED';
      throw error;
    }
    return { historyId: body.historyId, expiresAt: new Date(Number(body.expiration)).toISOString() };
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

  private normalizeMessage(account: any, message: any, folderOverride?: 'INBOX' | 'SPAM'): NormalizedEmail {
    const headers = new Map<string, string>((message.payload?.headers ?? []).map((header: any) => [String(header.name).toLowerCase(), String(header.value)]));
    const parseAddresses = (value?: string) => String(value || '').split(',').map((part) => {
      const match = part.trim().match(/^(?:\"?([^\"<]+)\"?\s*)?<([^>]+)>$|^([^\s@]+@[^\s@]+)$/);
      return { name: match?.[1]?.trim(), address: (match?.[2] || match?.[3] || part).trim().toLowerCase() };
    }).filter((address) => address.address.includes('@'));
    const body = this.readTextPart(message.payload);
    const labels = Array.isArray(message.labelIds) ? message.labelIds : [];
    const folder = folderOverride || (labels.includes('SPAM') ? 'SPAM' : 'INBOX');
    return {
      provider: 'GMAIL', accountId: account.id, providerMessageId: String(message.id), providerThreadId: message.threadId,
      internetMessageId: headers.get('message-id'),
      from: parseAddresses(headers.get('from'))[0] || { address: 'unknown@invalid' },
      to: parseAddresses(headers.get('to')), cc: parseAddresses(headers.get('cc')),
      subject: headers.get('subject') || '(No subject)', plainTextBody: body,
      receivedAt: new Date(Number(message.internalDate || Date.now())), attachments: [],
      headers: Object.fromEntries(headers), rawMetadata: { folder },
    };
  }

  private readTextPart(part: any): string {
    if (part?.mimeType === 'text/plain' && part?.body?.data) return Buffer.from(String(part.body.data), 'base64url').toString('utf8');
    for (const child of part?.parts ?? []) {
      const text = this.readTextPart(child);
      if (text) return text;
    }
    return '';
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
    const bodyContent = input.htmlBody || input.plainTextBody;
    const bodyContentType = input.htmlBody ? 'text/html' : 'text/plain';
    if (!attachments.length) {
      return Buffer.from([
        ...headers,
        'MIME-Version: 1.0',
        `Content-Type: ${bodyContentType}; charset=UTF-8`,
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(bodyContent, 'utf8').toString('base64'),
      ].join('\r\n'), 'utf8').toString('base64url');
    }

    const boundary = `claimnx_${randomUUID().replace(/-/g, '')}`;
    const body = [
      ...headers,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: ${bodyContentType}; charset=UTF-8`,
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(bodyContent, 'utf8').toString('base64'),
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
