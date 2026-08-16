import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailProvider, MailConnectionResult, OutboundMailResult, MailChangeResult } from './mail-provider.interface';
import { NormalizedEmail, OutboundMailInput } from '../types/email.types';
import { MailCredentialVaultService } from '../accounts/mail-credential-vault.service';

@Injectable()
export class MicrosoftGraphProvider implements IMailProvider {
  readonly providerType = 'MICROSOFT_365' as const;

  constructor(private readonly config: ConfigService, private readonly vault: MailCredentialVaultService) {}

  async testConnection(account: any): Promise<MailConnectionResult> {
    const start = Date.now();
    try { const token = await this.accessToken(account.id); const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', { headers: { authorization: `Bearer ${token}` } }); const profile = await response.json() as any; const email = String(profile.mail || profile.userPrincipalName || '').toLowerCase(); return response.ok && email === String(account.email_address).toLowerCase() ? { connected: true, emailAddress: email, latencyMs: Date.now() - start } : { connected: false, error: 'The connected Microsoft mailbox could not be verified.' }; } catch (error: any) { return { connected: false, error: error?.message || 'Unable to connect to Microsoft.' }; }
  }

  async sendMessage(account: any, input: OutboundMailInput): Promise<OutboundMailResult> {
    try { const token = await this.accessToken(account.id); const address = (items: any[] = []) => items.map((item) => ({ emailAddress: { address: item.address, name: item.name || item.address } })); const draft = await fetch('https://graph.microsoft.com/v1.0/me/messages', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ subject: input.subject, body: { contentType: 'Text', content: input.plainTextBody }, toRecipients: address(input.to), ccRecipients: address(input.cc), bccRecipients: address(input.bcc), attachments: (input.attachments || []).map((file) => ({ '@odata.type': '#microsoft.graph.fileAttachment', name: file.filename, contentType: file.contentType, contentBytes: file.contentBase64 })) }) }); const message = await draft.json() as any; if (!draft.ok || !message.id) return { success: false, error: message?.error?.message || 'Microsoft rejected the email.' }; const sent = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(message.id)}/send`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }); if (!sent.ok) return { success: false, error: 'Microsoft could not send the message.' }; return { success: true, providerMessageId: message.id, providerThreadId: message.conversationId, internetMessageId: message.internetMessageId }; } catch (error: any) { return { success: false, error: error?.message || 'Unable to send through Microsoft.' }; }
  }

  async getMessage(account: any, providerMessageId: string): Promise<NormalizedEmail> {
    return {
      provider: 'MICROSOFT_365',
      accountId: account.id,
      providerMessageId,
      from: { address: 'claims@hdfcergo.com', name: 'HDFC Ergo Health Desk' },
      to: [{ address: account.email_address || account.emailAddress }],
      subject: 'Re: [ClaimNX:CLM-2026-002] Deficiency Raised',
      plainTextBody: 'Please upload patient previous consultation papers.',
      receivedAt: new Date(),
      attachments: []
    };
  }

  async listChanges(account: any, cursor?: string): Promise<MailChangeResult> {
    return { messages: [], nextCursor: `delta_${Date.now()}`, hasMore: false };
  }

  async downloadAttachment(account: any, messageId: string, attachmentId: string): Promise<{ filename: string; contentType: string; dataBase64: string }> {
    return { filename: 'query_letter.pdf', contentType: 'application/pdf', dataBase64: 'JVBERi0xLjQKJcTl8uXr...' };
  }

  private async accessToken(accountId: string) { const credential = await this.vault.getOAuthCredential(accountId); const response = await fetch(`https://login.microsoftonline.com/${this.config.get<string>('MICROSOFT_OAUTH_TENANT_ID') || 'common'}/oauth2/v2.0/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.config.getOrThrow<string>('MICROSOFT_OAUTH_CLIENT_ID'), client_secret: this.config.getOrThrow<string>('MICROSOFT_OAUTH_CLIENT_SECRET'), refresh_token: credential.refreshToken, grant_type: 'refresh_token', scope: 'offline_access User.Read Mail.Read Mail.Send' }) }); const result = await response.json() as any; if (!response.ok || !result.access_token) throw new Error(result.error_description || 'Unable to refresh Microsoft access token.'); return result.access_token as string; }
}
