import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { MailAccountRepository } from '../accounts/mail-account.repository';
import { AttachmentSecurityService } from '../attachments/attachment-security.service';
import { EmailCorrespondenceRepository } from '../email-correspondence.repository';
import { DatabaseService } from '../../../database/database.service';
import { EmailDataExtractorService } from '../extraction/email-data-extractor.service';
import { ClaimMatcherService } from './claim-matcher.service';
import { EmailClassifierService } from './email-classifier.service';
import { SenderValidationService } from './sender-validation.service';
import { NormalizedEmail } from '../types/email.types';

@Injectable()
export class InboundEmailService {
  constructor(
    private readonly accounts: MailAccountRepository,
    private readonly correspondence: EmailCorrespondenceRepository,
    private readonly databaseService: DatabaseService,
    private readonly matcher: ClaimMatcherService,
    private readonly senderValidation: SenderValidationService,
    private readonly classifier: EmailClassifierService,
    private readonly extractor: EmailDataExtractorService,
    private readonly attachmentSecurity: AttachmentSecurityService,
  ) {}

  async ingest(accountId: string, email: NormalizedEmail, actor?: { hospitalId?: string; hospital_id?: string; role?: string; permissions?: unknown; profileData?: unknown }) {
    const account = await this.accounts.requireById(accountId);
    const role = String(actor?.role ?? '').trim().toUpperCase();
    const permissions = Array.isArray(actor?.permissions) ? actor.permissions.map(String) : [];
    const profile = actor?.profileData && typeof actor.profileData === 'object'
      ? actor.profileData as Record<string, unknown>
      : {};
    const assignedHospitalIds = Array.isArray(profile.assignedHospitalIds)
      ? profile.assignedHospitalIds.map(String)
      : [];
    const actorHospitalId = actor?.hospitalId ?? actor?.hospital_id ?? profile.hospitalId;
    const hasGlobalAccess = !actor || role === 'SUPER ADMIN' || permissions.includes('all');
    if (!hasGlobalAccess && String(actorHospitalId ?? '') !== String(account.hospital_id) && !assignedHospitalIds.includes(String(account.hospital_id))) {
      throw new ForbiddenException('You do not have access to this mailbox.');
    }
    if (!account.inbound_enabled || account.status !== 'ACTIVE') {
      throw new BadRequestException('Inbound email is disabled or the mailbox is not active.');
    }
    if (email.accountId && email.accountId !== account.id) {
      throw new BadRequestException('Email account does not match the receiving mailbox.');
    }
    if (!email.providerMessageId || !email.from?.address) {
      throw new BadRequestException('Provider message ID and sender are required.');
    }

    const { data: claims, error } = await this.databaseService.getClient()
      .from('claims')
      .select('id, case_ref_id, claim_number, status, form_data, hospital_id')
      .eq('hospital_id', account.hospital_id)
      .eq('is_deleted', false);
    if (error) throw error;

    const threads = await this.correspondence.findThreads(account.hospital_id, account.id);
    const match = this.matcher.matchEmailToClaim(email, claims ?? [], threads);
    const classification = this.classifier.classify(email);
    const extracted = this.extractor.extractStructuredData(email);
    const trustedSender = this.senderValidation.isTrustedPayerSender(email.from.address);
    const critical = /APPROVAL|REJECTION|PAYMENT/.test(classification.classification);
    const reviewReason = !match.matched ? match.reason || 'UNMATCHED_CLAIM'
      : !trustedSender ? 'UNKNOWN_SENDER'
      : classification.confidence < 0.8 ? 'LOW_CONFIDENCE'
      : critical ? 'HUMAN_CONFIRMATION_REQUIRED'
      : null;

    const created = await this.correspondence.createInboundMessage({
      hospital_id: account.hospital_id,
      claim_id: match.claimId ?? null,
      mail_account_id: account.id,
      provider: email.provider,
      provider_message_id: email.providerMessageId,
      internet_message_id: email.internetMessageId ?? null,
      direction: 'INBOUND',
      from_address: email.from.address.toLowerCase(),
      to_addresses: email.to ?? [],
      cc_addresses: email.cc ?? [],
      subject: email.subject ?? '',
      plain_text_body: email.plainTextBody ?? '',
      sanitized_html_body: this.stripHtml(email.htmlBody),
      headers: email.headers ?? {},
      raw_metadata: email.rawMetadata ?? {},
      folder: String((email.rawMetadata as any)?.folder || 'INBOX').toUpperCase() === 'SPAM' ? 'SPAM' : 'INBOX',
      received_at: email.receivedAt ?? new Date(),
      classification: classification.classification,
      classification_confidence: classification.confidence,
      claim_match_method: match.method,
      claim_match_confidence: match.confidence,
      processing_status: reviewReason ? 'REVIEW_REQUIRED' : 'COMPLETED',
    });
    if (created.duplicate) return { duplicate: true, messageId: created.message.id };

    const validAttachments: Record<string, unknown>[] = [];
    for (const attachment of email.attachments ?? []) {
      try {
        this.attachmentSecurity.validateAttachment(attachment.filename, attachment.contentType, attachment.sizeBytes);
        validAttachments.push({
          hospital_id: account.hospital_id,
          email_message_id: created.message.id,
          provider_attachment_id: attachment.providerAttachmentId ?? attachment.id ?? null,
          file_name: attachment.filename,
          mime_type: attachment.contentType,
          size_bytes: attachment.sizeBytes,
          processing_status: 'PENDING_DOWNLOAD',
          ocr_status: 'NOT_REQUESTED',
        });
      } catch (attachmentError: any) {
        await this.correspondence.addProcessingAttempt({
          email_message_id: created.message.id,
          attempt_number: 1,
          stage: 'ATTACHMENT_SECURITY',
          status: 'FAILED',
          error_code: 'UNSAFE_ATTACHMENT',
          error_message: attachmentError?.message ?? 'Attachment validation failed.',
        });
      }
    }
    await this.correspondence.addAttachments(validAttachments);

    if (reviewReason) {
      await this.correspondence.createReviewTask({
        hospital_id: account.hospital_id,
        email_message_id: created.message.id,
        claim_id: match.claimId ?? null,
        reason: reviewReason,
        candidate_claim_ids: (match.candidateClaims ?? []).map((claim) => claim.id),
        evidence: match.evidence,
      });
    }
    await this.correspondence.addProcessingAttempt({
      email_message_id: created.message.id,
      attempt_number: 1,
      stage: 'INBOUND_NORMALIZATION',
      status: 'COMPLETED',
    });

    return {
      duplicate: false,
      messageId: created.message.id,
      claimMatch: match,
      classification,
      extracted,
      reviewRequired: Boolean(reviewReason),
    };
  }

  private stripHtml(html?: string) {
    if (!html) return null;
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
