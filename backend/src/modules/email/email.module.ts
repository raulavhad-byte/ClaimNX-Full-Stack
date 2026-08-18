import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

// Webhooks
import { GmailWebhookController } from './webhooks/gmail-webhook.controller';
import { MicrosoftWebhookController } from './webhooks/microsoft-webhook.controller';
import { ZohoWebhookController } from './webhooks/zoho-webhook.controller';

// Providers
import { MailProviderFactory } from './providers/mail-provider.factory';
import { GmailProvider } from './providers/gmail.provider';
import { MicrosoftGraphProvider } from './providers/microsoft-graph.provider';
import { ZohoMailProvider } from './providers/zoho.provider';
import { ImapSmtpProvider } from './providers/imap-smtp.provider';
import { YahooProvider } from './providers/yahoo.provider';

// Inbound
import { ClaimMatcherService } from './inbound/claim-matcher.service';
import { SenderValidationService } from './inbound/sender-validation.service';
import { EmailClassifierService } from './inbound/email-classifier.service';
import { InboundEmailService } from './inbound/inbound-email.service';

// Extraction & Workflow
import { EmailDataExtractorService } from './extraction/email-data-extractor.service';
import { EmailActionPolicyService } from './workflow/email-action-policy.service';
import { EmailHumanReviewService } from './workflow/email-human-review.service';

// Accounts, Outbound & Attachments
import { MailAccountService } from './accounts/mail-account.service';
import { MailAccountRepository } from './accounts/mail-account.repository';
import { ClaimEmailTemplateService } from './outbound/claim-email-template.service';
import { EmailRecipientService } from './outbound/email-recipient.service';
import { AttachmentSecurityService } from './attachments/attachment-security.service';
import { OutboundAttachmentStorageService } from './attachments/outbound-attachment-storage.service';
import { EmailCorrespondenceRepository } from './email-correspondence.repository';
import { GmailOAuthService } from './accounts/gmail-oauth.service';
import { ExternalOAuthService } from './accounts/external-oauth.service';
import { MailCredentialVaultService } from './accounts/mail-credential-vault.service';

// Jobs & Processors
import { MailboxSyncProcessor } from './jobs/mailbox-sync.processor';
import { InboundEmailProcessor } from './jobs/inbound-email.processor';
import { OutboundEmailProcessor } from './jobs/outbound-email.processor';
import { MailboxSyncService } from './jobs/mailbox-sync.service';
import { MailboxSyncStateRepository } from './jobs/mailbox-sync-state.repository';
import { GmailPushAuthenticator } from './webhooks/gmail-push-authenticator.service';

@Module({
  controllers: [
    EmailController,
    GmailWebhookController,
    MicrosoftWebhookController,
    ZohoWebhookController
  ],
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
    InboundEmailService,
    EmailDataExtractorService,
    EmailActionPolicyService,
    EmailHumanReviewService,
    MailAccountService,
    MailAccountRepository,
    MailCredentialVaultService,
    GmailOAuthService,
    ExternalOAuthService,
    EmailCorrespondenceRepository,
    ClaimEmailTemplateService,
    EmailRecipientService,
    AttachmentSecurityService,
    OutboundAttachmentStorageService,
    MailboxSyncProcessor,
    MailboxSyncService,
    MailboxSyncStateRepository,
    GmailPushAuthenticator,
    InboundEmailProcessor,
    OutboundEmailProcessor
  ],
  exports: [
    EmailService,
    MailAccountService,
    MailProviderFactory,
    ClaimMatcherService,
    EmailDataExtractorService,
    EmailHumanReviewService,
    ClaimEmailTemplateService
  ]
})
export class EmailModule {}
