import { MailProviderType } from '../../types/email.types';

export class CreateMailAccountDto {
  hospitalId!: string;
  provider!: MailProviderType;
  emailAddress!: string;
  displayName?: string;
  authType?: 'OAUTH2' | 'PASSWORD' | 'APP_KEY';
  credentials?: Record<string, any>;
  inboundEnabled?: boolean;
  outboundEnabled?: boolean;
}