import { Injectable } from '@nestjs/common';
import { MailProviderType } from '../types/email.types';
import { IMailProvider } from './mail-provider.interface';
import { GmailProvider } from './gmail.provider';
import { MicrosoftGraphProvider } from './microsoft-graph.provider';
import { ZohoMailProvider } from './zoho.provider';
import { ImapSmtpProvider } from './imap-smtp.provider';
import { YahooProvider } from './yahoo.provider';

@Injectable()
export class MailProviderFactory {
  constructor(
    private readonly gmailProvider: GmailProvider,
    private readonly msGraphProvider: MicrosoftGraphProvider,
    private readonly zohoProvider: ZohoMailProvider,
    private readonly imapSmtpProvider: ImapSmtpProvider,
    private readonly yahooProvider: YahooProvider,
  ) {}

  getProvider(type: MailProviderType): IMailProvider {
    switch (type) {
      case 'GMAIL':
        return this.gmailProvider;
      case 'MICROSOFT_365':
        return this.msGraphProvider;
      case 'YAHOO':
        return this.yahooProvider;
      case 'ZOHO':
        return this.zohoProvider;
      case 'IMAP_SMTP':
        return this.imapSmtpProvider;
      default:
        throw new Error(`Unsupported Mail Provider: ${type}`);
    }
  }
}
