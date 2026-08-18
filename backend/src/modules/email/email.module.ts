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

// Inbound
import { ClaimMatcherService } from './inbound/claim-matcher.service';
import { SenderValidationService } from './inbound/sender-validation.service';
import { EmailClassifierService } from './inbound/email-classifier.service';

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

// Jobs & Processors
import { MailboxSyncProcessor } from './jobs/mailbox-sync.processor';
import { InboundEmailProcessor } from './jobs/inbound-email.processor';
import { OutboundEmailProcessor } from './jobs/outbound-email.processor';

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
    ClaimMatcherService,
    SenderValidationService,
    EmailClassifierService,
    EmailDataExtractorService,
    EmailActionPolicyService,
    EmailHumanReviewService,
    MailAccountService,
    MailAccountRepository,
    ClaimEmailTemplateService,
    EmailRecipientService,
    AttachmentSecurityService,
    MailboxSyncProcessor,
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