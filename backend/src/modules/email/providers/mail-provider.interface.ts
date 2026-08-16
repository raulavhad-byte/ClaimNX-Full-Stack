import { NormalizedEmail, OutboundMailInput, MailProviderType } from '../types/email.types';

export interface MailConnectionResult {
  connected: boolean;
  emailAddress?: string;
  error?: string;
  latencyMs?: number;
}

export interface OutboundMailResult {
  success: boolean;
  providerMessageId?: string;
  providerThreadId?: string;
  internetMessageId?: string;
  error?: string;
}

export interface MailChangeResult {
  messages: NormalizedEmail[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface IMailProvider {
  readonly providerType: MailProviderType;
  testConnection(account: any): Promise<MailConnectionResult>;
  sendMessage(account: any, input: OutboundMailInput): Promise<OutboundMailResult>;
  getMessage(account: any, providerMessageId: string): Promise<NormalizedEmail>;
  listChanges(account: any, cursor?: string): Promise<MailChangeResult>;
  downloadAttachment(account: any, messageId: string, attachmentId: string): Promise<{ filename: string; contentType: string; dataBase64: string }>;
}