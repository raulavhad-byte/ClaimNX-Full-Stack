import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { IMailProvider, MailChangeResult, MailConnectionResult, OutboundMailResult } from './mail-provider.interface';
import { NormalizedEmail, OutboundMailInput } from '../types/email.types';
import { MailCredentialVaultService } from '../accounts/mail-credential-vault.service';

@Injectable()
export class YahooProvider implements IMailProvider {
  readonly providerType = 'YAHOO' as const;
  constructor(private readonly config: ConfigService, private readonly vault: MailCredentialVaultService) {}
  async testConnection(account: any): Promise<MailConnectionResult> { try { const transport = await this.transport(account.id, account.email_address); await transport.verify(); return { connected: true, emailAddress: account.email_address, latencyMs: 0 }; } catch (error: any) { return { connected: false, error: error?.message || 'Unable to connect to Yahoo.' }; } }
  async sendMessage(account: any, input: OutboundMailInput): Promise<OutboundMailResult> { try { const transport = await this.transport(account.id, account.email_address); const info = await transport.sendMail({ from: account.email_address, to: input.to.map((item) => item.address).join(', '), cc: input.cc?.map((item) => item.address).join(', '), bcc: input.bcc?.map((item) => item.address).join(', '), subject: input.subject, text: input.plainTextBody, attachments: (input.attachments || []).map((file) => ({ filename: file.filename, content: Buffer.from(file.contentBase64, 'base64'), contentType: file.contentType })) }); return { success: true, providerMessageId: info.messageId, internetMessageId: info.messageId }; } catch (error: any) { return { success: false, error: error?.message || 'Unable to send through Yahoo.' }; } }
  async getMessage(account: any, providerMessageId: string): Promise<NormalizedEmail> { throw new Error('Yahoo message retrieval is not configured yet.'); }
  async listChanges(_account: any, _cursor?: string): Promise<MailChangeResult> { return { messages: [], hasMore: false }; }
  async downloadAttachment(_account: any, _messageId: string, _attachmentId: string): Promise<{ filename: string; contentType: string; dataBase64: string }> { throw new Error('Yahoo attachment retrieval is not configured yet.'); }
  private async transport(accountId: string, user: string) { const credential = await this.vault.getOAuthCredential(accountId); const token = await this.accessToken(credential.refreshToken); return nodemailer.createTransport({ host: 'smtp.mail.yahoo.com', port: 465, secure: true, auth: { type: 'OAuth2', user, clientId: this.config.getOrThrow<string>('YAHOO_OAUTH_CLIENT_ID'), clientSecret: this.config.getOrThrow<string>('YAHOO_OAUTH_CLIENT_SECRET'), refreshToken: credential.refreshToken, accessToken: token } }); }
  private async accessToken(refreshToken: string) { const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', { method: 'POST', headers: { authorization: `Basic ${Buffer.from(`${this.config.getOrThrow<string>('YAHOO_OAUTH_CLIENT_ID')}:${this.config.getOrThrow<string>('YAHOO_OAUTH_CLIENT_SECRET')}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }) }); const result = await response.json() as any; if (!response.ok || !result.access_token) throw new Error(result.error_description || 'Unable to refresh Yahoo access token.'); return result.access_token as string; }
}
