import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { MailProviderFactory } from './providers/mail-provider.factory';
import { ClaimMatcherService } from './inbound/claim-matcher.service';
import { SenderValidationService } from './inbound/sender-validation.service';
import { EmailClassifierService } from './inbound/email-classifier.service';
import { EmailDataExtractorService } from './extraction/email-data-extractor.service';
import { EmailActionPolicyService } from './workflow/email-action-policy.service';
import { NormalizedEmail, OutboundMailInput } from './types/email.types';
import { InboundEmailService } from './inbound/inbound-email.service';
import { MailAccountRepository } from './accounts/mail-account.repository';
import { EmailCorrespondenceRepository } from './email-correspondence.repository';
import { OutboundAttachmentStorageService } from './attachments/outbound-attachment-storage.service';

@Injectable()
export class EmailService {
  constructor(
    private readonly providerFactory: MailProviderFactory,
    private readonly claimMatcher: ClaimMatcherService,
    private readonly senderValidation: SenderValidationService,
    private readonly classifier: EmailClassifierService,
    private readonly extractor: EmailDataExtractorService,
    private readonly actionPolicy: EmailActionPolicyService,
    private readonly inboundEmailService: InboundEmailService,
    private readonly accounts: MailAccountRepository,
    private readonly correspondence: EmailCorrespondenceRepository,
    private readonly outboundAttachments: OutboundAttachmentStorageService,
  ) {}

  generateCorrelationToken(claimId: string): string {
    return `[ClaimNX:${claimId}]`;
  }

  async sendClaimEmail(hospitalId: string, claimId: string, input: any) {
    const correlationToken = this.generateCorrelationToken(claimId);
    const subjectWithToken = input.subject.includes('[ClaimNX:')
      ? input.subject
      : `${correlationToken} ${input.subject}`;

    const provider = this.providerFactory.getProvider('GMAIL');
    const outboundPayload: OutboundMailInput = {
      to: [{ address: input.toAddress }],
      cc: (input.ccAddresses || []).map((addr: string) => ({ address: addr })),
      subject: subjectWithToken,
      plainTextBody: input.plainTextBody,
      htmlBody: input.htmlBody,
      customHeaders: {
        'X-ClaimNX-Claim-Id': claimId,
        'X-ClaimNX-Correlation-Id': correlationToken,
        'X-ClaimNX-Hospital-Id': hospitalId
      }
    };

    return await provider.sendMessage({ id: 'default' }, outboundPayload);
  }

  async processInboundEmail(accountId: string, email: NormalizedEmail, actor?: any) {
    return this.inboundEmailService.ingest(accountId, email, actor);
  }

  async sendFromMailbox(accountId: string, input: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    plainTextBody: string;
    claimId?: string;
    attachments?: { filename: string; contentType: string; contentBase64: string }[];
  }, actor: any) {
    const account = await this.accounts.requireById(accountId);
    this.assertMailboxAccess(account, actor);
    if (account.status !== 'ACTIVE' || !account.outbound_enabled) {
      throw new BadRequestException('This mailbox is not active for outbound email.');
    }
    const recipients = [...new Set(input.to.map((email) => email.trim().toLowerCase()).filter(Boolean))];
    if (!recipients.length || recipients.some((email) => !this.isEmail(email))) throw new BadRequestException('At least one valid recipient email is required.');
    if (!input.subject?.trim() || !input.plainTextBody?.trim()) throw new BadRequestException('Email subject and body are required.');

    const toAddresses = recipients.map((address) => ({ address }));
    const ccAddresses = (input.cc ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean).map((address) => ({ address }));
    const bccAddresses = (input.bcc ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean).map((address) => ({ address }));
    if ([...ccAddresses, ...bccAddresses].some(({ address }) => !this.isEmail(address))) throw new BadRequestException('One or more CC/BCC email addresses are invalid.');

    const attachments = await this.outboundAttachments.validate(input.attachments);
    // Persist attachments before sending so the ClaimNX sent box can always
    // serve the exact binary that was given to Gmail. Clean them up on send
    // failure to avoid orphaned private files.
    const storedAttachments = await this.outboundAttachments.store(account.hospital_id, attachments);
    const provider = this.providerFactory.getProvider(account.provider);
    const result = await provider.sendMessage(account, {
      to: toAddresses,
      cc: ccAddresses,
      bcc: bccAddresses,
      subject: input.subject.trim(),
      plainTextBody: input.plainTextBody,
      attachments,
      customHeaders: input.claimId ? { 'X-ClaimNX-Claim-Id': input.claimId } : undefined,
    });
    if (!result.success || !result.providerMessageId) {
      // Storage removal is intentionally best-effort; the sending error is
      // still the useful response for the user.
      await this.outboundAttachments.remove(storedAttachments.map((attachment) => attachment.storageReference));
      throw new BadRequestException(result.error || 'The email could not be sent.');
    }

    const message = await this.correspondence.createOutboundMessage({
      hospital_id: account.hospital_id,
      claim_id: input.claimId || null,
      mail_account_id: account.id,
      provider: account.provider,
      provider_message_id: result.providerMessageId,
      internet_message_id: result.internetMessageId || null,
      direction: 'OUTBOUND',
      from_address: account.email_address,
      to_addresses: toAddresses,
      cc_addresses: ccAddresses,
      subject: input.subject.trim(),
      plain_text_body: input.plainTextBody,
      headers: input.claimId ? { 'X-ClaimNX-Claim-Id': input.claimId } : {},
      raw_metadata: { provider_thread_id: result.providerThreadId || null },
      sent_at: new Date().toISOString(),
      processing_status: 'COMPLETED',
    });
    const persistedAttachments = await this.correspondence.addAttachments(storedAttachments.map((attachment) => ({
      hospital_id: account.hospital_id,
      email_message_id: message.id,
      file_name: attachment.filename,
      mime_type: attachment.contentType,
      size_bytes: attachment.sizeBytes,
      storage_reference: attachment.storageReference,
      processing_status: 'COMPLETED',
    })));
    return {
      messageId: message.id,
      providerMessageId: result.providerMessageId,
      fromAddress: account.email_address,
      attachments: persistedAttachments.map((attachment: any) => ({
        id: attachment.id,
        filename: attachment.file_name,
        contentType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
      })),
    };
  }

  async getAttachmentDownloadUrl(attachmentId: string, actor: any) {
    const attachment = await this.correspondence.findAttachment(attachmentId);
    if (!attachment?.storage_reference) throw new BadRequestException('Attachment is unavailable.');
    const account = await this.accounts.requireById(String(attachment.email_messages?.mail_account_id));
    this.assertMailboxAccess(account, actor);
    return { url: await this.outboundAttachments.createDownloadUrl(String(attachment.storage_reference)) };
  }

  private assertMailboxAccess(account: any, actor: any) {
    const role = String(actor?.role ?? '').trim().toUpperCase();
    const permissions = Array.isArray(actor?.permissions) ? actor.permissions.map(String) : [];
    const profile = actor?.profileData && typeof actor.profileData === 'object' ? actor.profileData : {};
    const assigned = Array.isArray(profile.assignedHospitalIds) ? profile.assignedHospitalIds.map(String) : [];
    const actorHospitalId = String(actor?.hospitalId ?? actor?.hospital_id ?? profile.hospitalId ?? '');
    const canManage = ['SUPER ADMIN', 'ADMIN', 'MANAGER', 'RECONCILIATION MANAGER', 'RECONCILIATION TEAM', 'ACCOUNTS HEAD'].includes(role)
      || permissions.includes('all') || permissions.includes('reconciliation:recon_approve:oversight');
    if (!canManage && actorHospitalId !== String(account.hospital_id) && !assigned.includes(String(account.hospital_id))) {
      throw new ForbiddenException('You do not have access to send from this hospital mailbox.');
    }
  }

  private isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /** Pure policy evaluation retained for unit tests and future workers. */
  evaluateInboundEmail(email: NormalizedEmail, claims: any[], threads: any[]) {
    const matchResult = this.claimMatcher.matchEmailToClaim(email, claims, threads);
    const classification = this.classifier.classify(email);
    const extractedData = this.extractor.extractStructuredData(email);
    const conflictResult = this.extractor.detectConflicts(extractedData);
    const isTrustedSender = this.senderValidation.isTrustedPayerSender(email.from.address);

    const policy = this.actionPolicy.evaluate(
      matchResult,
      classification,
      extractedData,
      conflictResult,
      isTrustedSender
    );

    return {
      matchResult,
      classification,
      extractedData,
      policy
    };
  }
}
