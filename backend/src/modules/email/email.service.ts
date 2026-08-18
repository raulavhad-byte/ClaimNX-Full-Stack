import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
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
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
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
    private readonly database: DatabaseService,
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
    htmlBody?: string;
    claimId?: string;
    claimIds?: string[];
    attachments?: { filename: string; contentType: string; contentBase64: string }[];
  }, actor: any) {
    const account = await this.accounts.requireById(accountId);
    this.assertMailboxAccess(account, actor);
    const claimIds = [...new Set([...(input.claimIds ?? []), ...(input.claimId ? [input.claimId] : [])].map(String).filter(Boolean))];
    await this.assertCrmClaimVisibility(actor, claimIds);
    if (claimIds.length) {
      const { data: claims, error } = await this.database.getClient().from('claims').select('id,hospital_id').in('id', claimIds).eq('is_deleted', false);
      if (error) throw error;
      if (!claims || claims.length !== claimIds.length || claims.some((claim: any) => String(claim.hospital_id) !== String(account.hospital_id))) {
        throw new ForbiddenException('Follow-up emails can be sent only from the connected mailbox of the selected claim hospital.');
      }
    }
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
      htmlBody: input.htmlBody,
      attachments,
      customHeaders: input.claimId ? { 'X-ClaimNX-Claim-Id': input.claimId } : undefined,
    });
    if (!result.success || !result.providerMessageId) {
      // Storage removal is intentionally best-effort; the sending error is
      // still the useful response for the user.
      await this.outboundAttachments.remove(storedAttachments.map((attachment) => attachment.storageReference));
      throw new BadRequestException(result.error || 'The email could not be sent.');
    }

    // The provider has accepted the message at this point.  Keep the sent-box
    // write separate so a temporary reporting-table/storage mismatch cannot
    // cause callers to retry and send duplicate emails.
    let message: any = null;
    let persistedAttachments: any[] = [];
    try {
      message = await this.correspondence.createOutboundMessage({
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
        folder: 'SENT',
        sent_at: new Date().toISOString(),
        processing_status: 'COMPLETED',
      });
      persistedAttachments = await this.correspondence.addAttachments(storedAttachments.map((attachment) => ({
        hospital_id: account.hospital_id,
        email_message_id: message.id,
        file_name: attachment.filename,
        mime_type: attachment.contentType,
        size_bytes: attachment.sizeBytes,
        storage_reference: attachment.storageReference,
        processing_status: 'COMPLETED',
      })));
    } catch (persistenceError: any) {
      // Do not log recipient, subject, body, or attachment names: they can be
      // PHI. The provider identifiers make this safely traceable in the
      // provider's sent box while an administrator repairs persistence.
      this.logger.error(`Outbound correspondence persistence failed after provider acceptance (provider=${account.provider}, code=${String(persistenceError?.code ?? 'unknown')}).`);
    }
    return {
      messageId: message?.id ?? null,
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

  async getMailboxMessages(accountIds: string[], folder?: string, limit?: number) {
    return this.correspondence.listMessagesForAccounts(accountIds, folder, limit);
  }

  async getMailboxFolderCounts(accountIds: string[]) {
    return this.correspondence.countMessagesForAccounts(accountIds);
  }

  async syncMailboxMessages(accounts: any[], actor: any) {
    let imported = 0;
    let skipped = 0;
    for (const account of accounts) {
      if (!account.inbound_enabled || account.status !== 'ACTIVE') continue;
      try {
        const provider = this.providerFactory.getProvider(account.provider);
        const changes = await provider.listChanges(account, account.sync_cursor || undefined);
        for (const email of changes.messages) {
          const result = await this.processInboundEmail(account.id, email, actor);
          if (!result.duplicate) imported += 1;
        }
      } catch (error: any) {
        // One failed provider integration must not hide mail from all other
        // connected hospitals. Do not log subjects, senders, or message data.
        skipped += 1;
        this.logger.warn(`Mailbox sync skipped (provider=${String(account.provider)}, code=${String(error?.code ?? 'unavailable')}).`);
      }
    }
    return { imported, skipped };
  }

  /** Worker-only incremental sync for one already-authorized mailbox. */
  async syncMailboxAccount(account: any, cursor?: string) {
    if (!account.inbound_enabled || account.status !== 'ACTIVE') {
      return { imported: 0, skipped: true, nextCursor: cursor, hasMore: false };
    }
    const provider = this.providerFactory.getProvider(account.provider);
    const changes = await provider.listChanges(account, cursor);
    let imported = 0;
    for (const email of changes.messages) {
      const result = await this.processInboundEmail(account.id, email);
      if (!result.duplicate) imported += 1;
    }
    return { imported, skipped: false, nextCursor: changes.nextCursor || cursor, hasMore: changes.hasMore, found: changes.messages.length };
  }

  private assertMailboxAccess(account: any, actor: any) {
    const role = String(actor?.role ?? '').trim().toUpperCase();
    const permissions = Array.isArray(actor?.permissions) ? actor.permissions.map(String) : [];
    const profile = actor?.profileData && typeof actor.profileData === 'object' ? actor.profileData : {};
    const assigned = Array.isArray(profile.assignedHospitalIds) ? profile.assignedHospitalIds.map(String) : [];
    const actorHospitalId = String(actor?.hospitalId ?? actor?.hospital_id ?? profile.hospitalId ?? '');
    const canManage = ['SUPER ADMIN', 'ADMIN', 'MANAGER', 'CRM TEAM', 'RECONCILIATION MANAGER', 'RECONCILIATION TEAM', 'ACCOUNTS HEAD'].includes(role)
      || permissions.includes('all') || permissions.includes('reconciliation:recon_approve:oversight');
    if (!canManage && actorHospitalId !== String(account.hospital_id) && !assigned.includes(String(account.hospital_id))) {
      throw new ForbiddenException('You do not have access to send from this hospital mailbox.');
    }
  }

  private isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /** CRM users may work across hospitals, but only for claims the database
   * visibility policy has assigned to them. This avoids a broad mailbox grant
   * being used to send unrelated hospital email. */
  private async assertCrmClaimVisibility(actor: any, claimIds: string[]) {
    if (String(actor?.role ?? '').trim().toUpperCase() !== 'CRM TEAM') return;
    if (!claimIds.length) throw new ForbiddenException('CRM email must be linked to a visible claim.');
    const { data, error } = await this.database.getClient().rpc('claims_visible_to_user', {
      p_actor_user_id: actor.id,
      p_status: null,
      p_priority: null,
      p_patient_id: null,
      p_hospital_id: null,
      p_payer_id: null,
    });
    if (error) throw error;
    const visible = new Set((data ?? []).map((claim: any) => String(claim.id)));
    if (claimIds.some((claimId) => !visible.has(String(claimId)))) {
      throw new ForbiddenException('You cannot send email for a claim outside your CRM queue.');
    }
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
