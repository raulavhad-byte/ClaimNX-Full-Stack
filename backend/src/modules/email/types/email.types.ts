export type MailProviderType = 'GMAIL' | 'MICROSOFT_365' | 'YAHOO' | 'ZOHO' | 'IMAP_SMTP';
export type MailAccountStatus = 'ACTIVE' | 'AUTH_REQUIRED' | 'DISCONNECTED' | 'SUSPENDED' | 'ERROR';
export type EmailDirection = 'INBOUND' | 'OUTBOUND';

export type EmailClassificationType =
  | 'PREAUTH_APPROVAL'
  | 'PREAUTH_QUERY'
  | 'PREAUTH_REJECTION'
  | 'ENHANCEMENT_APPROVAL'
  | 'ENHANCEMENT_QUERY'
  | 'ENHANCEMENT_REJECTION'
  | 'DISCHARGE_APPROVAL'
  | 'DISCHARGE_QUERY'
  | 'DISCHARGE_REJECTION'
  | 'DOCUMENT_REQUEST'
  | 'DOCUMENT_ACKNOWLEDGEMENT'
  | 'PAYMENT_INFORMATION'
  | 'GENERAL_CORRESPONDENCE'
  | 'AUTO_REPLY'
  | 'SPAM_OR_IRRELEVANT'
  | 'UNKNOWN';

export type EmailProcessingStatus =
  | 'RECEIVED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'MATCHED'
  | 'UNMATCHED'
  | 'CLASSIFIED'
  | 'WORKFLOW_PENDING'
  | 'REVIEW_REQUIRED'
  | 'COMPLETED'
  | 'FAILED'
  | 'IGNORED';

export interface MailAddress {
  name?: string;
  address: string;
}

export interface NormalizedAttachment {
  id?: string;
  providerAttachmentId?: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  contentBase64?: string;
}

export interface NormalizedEmail {
  provider: MailProviderType;
  accountId: string;
  providerMessageId: string;
  providerThreadId?: string;
  internetMessageId?: string;
  inReplyTo?: string;
  references?: string[];
  from: MailAddress;
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  subject: string;
  plainTextBody?: string;
  htmlBody?: string;
  sentAt?: Date;
  receivedAt?: Date;
  attachments: NormalizedAttachment[];
  headers?: Record<string, string>;
  rawMetadata?: Record<string, unknown>;
}

export interface OutboundMailInput {
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  subject: string;
  plainTextBody: string;
  htmlBody?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: {
    filename: string;
    contentType: string;
    contentBase64: string;
  }[];
  customHeaders?: Record<string, string>;
}
