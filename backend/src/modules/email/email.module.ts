import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

// Providers
import { MailProviderFactory } from './providers/mail-provider.factory';
import { GmailProvider } from './providers/gmail.provider';
import { MicrosoftGraphProvider } from './providers/microsoft-graph.provider';
import { ZohoMailProvider } from './providers/zoho.provider';
import { ImapSmtpProvider } from './providers/imap-smtp.provider';

// Inbound
import { ClaimMatcherService } from './inbound/claim-matcher.service';
import { SenderValidationService } from './inbound/sender-validation.service';
import { EmailClassifierService } from './inbound/email-classifier.service';

// Extraction & Workflow
import { EmailDataExtractorService } from './extraction/email-data-extractor.service';
import { EmailActionPolicyService } from './workflow/email-action-policy.service';

// Accounts, Outbound & Attachments
import { MailAccountService } from './accounts/mail-account.service';
import { MailAccountRepository } from './accounts/mail-account.repository';
import { MailCredentialVaultService } from './accounts/mail-credential-vault.service';
import { GmailOAuthService } from './accounts/gmail-oauth.service';
import { ExternalOAuthService } from './accounts/external-oauth.service';
import { YahooProvider } from './providers/yahoo.provider';
import { ClaimEmailTemplateService } from './outbound/claim-email-template.service';
import { EmailRecipientService } from './outbound/email-recipient.service';
import { AttachmentSecurityService } from './attachments/attachment-security.service';
import { OutboundAttachmentStorageService } from './attachments/outbound-attachment-storage.service';
import { EmailCorrespondenceRepository } from './email-correspondence.repository';
import { InboundEmailService } from './inbound/inbound-email.service';
import { MailboxSyncStateRepository } from './jobs/mailbox-sync-state.repository';
import { MailboxSyncService } from './jobs/mailbox-sync.service';
import { GmailPushAuthenticator } from './webhooks/gmail-push-authenticator.service';

@Module({
  controllers: [EmailController],
  providers: [
    EmailService,
    MailProviderFactory,
    GmailProvider,
    MicrosoftGraphProvider,
    ZohoMailProvider,
    ImapSmtpProvider,
    YahooProvider,
    ClaimMatcherService,
    SenderValidationService,
    EmailClassifierService,
    EmailDataExtractorService,
    EmailActionPolicyService,
    MailAccountService,
    MailAccountRepository,
    MailCredentialVaultService,
    GmailOAuthService,
    ExternalOAuthService,
    ClaimEmailTemplateService,
    EmailRecipientService,
    AttachmentSecurityService,
    OutboundAttachmentStorageService,
    EmailCorrespondenceRepository,
    InboundEmailService,
    MailboxSyncStateRepository,
    MailboxSyncService,
    GmailPushAuthenticator,
  ],
  exports: [
    EmailService,
    MailAccountService,
    MailProviderFactory,
    ClaimMatcherService,
    EmailDataExtractorService,
    InboundEmailService,
    MailboxSyncService,
  ]
})
export class EmailModule {}
