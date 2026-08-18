import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { DatabaseService } from '../../../database/database.service';
import { AttachmentSecurityService } from './attachment-security.service';
import { EMAIL_MODULE_CONSTANTS } from '../constants/email.constants';

export interface OutboundAttachmentInput {
  filename: string;
  contentType: string;
  contentBase64: string;
}

@Injectable()
export class OutboundAttachmentStorageService {
  private static readonly bucket = 'email-attachments';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly attachmentSecurity: AttachmentSecurityService,
  ) {}

  async validate(input: unknown): Promise<OutboundAttachmentInput[]> {
    if (!Array.isArray(input)) return [];
    const attachments = input.map((attachment: any) => {
      const filename = String(attachment?.filename ?? '').trim();
      const contentType = String(attachment?.contentType ?? '').trim().toLowerCase();
      const contentBase64 = String(attachment?.contentBase64 ?? '').replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
      if (!filename || !contentType || !contentBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64)) {
        throw new BadRequestException('Each attachment must include a valid filename, type, and file content.');
      }
      const sizeBytes = Buffer.from(contentBase64, 'base64').byteLength;
      this.attachmentSecurity.validateAttachment(filename, contentType, sizeBytes);
      return { filename, contentType, contentBase64 };
    });
    const totalBytes = attachments.reduce((sum, attachment) => sum + Buffer.from(attachment.contentBase64, 'base64').byteLength, 0);
    if (totalBytes > EMAIL_MODULE_CONSTANTS.MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('The combined size of all attachments must not exceed 25 MB.');
    }
    return attachments;
  }

  async store(hospitalId: string, attachments: OutboundAttachmentInput[]) {
    if (!attachments.length) return [];
    await this.ensureBucket();
    const storage = this.databaseService.getClient().storage.from(OutboundAttachmentStorageService.bucket);
    const stored: Array<OutboundAttachmentInput & { storageReference: string; sizeBytes: number }> = [];
    try {
      for (const attachment of attachments) {
        const safeName = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment';
        const storageReference = `hospitals/${hospitalId}/outbound/${randomUUID()}-${safeName}`;
        const content = Buffer.from(attachment.contentBase64, 'base64');
        const { error } = await storage.upload(storageReference, content, { contentType: attachment.contentType, upsert: false });
        if (error) throw new BadRequestException(`Unable to securely store attachment ${attachment.filename}: ${error.message}`);
        stored.push({ ...attachment, storageReference, sizeBytes: content.byteLength });
      }
      return stored;
    } catch (error) {
      await Promise.all(stored.map((item) => storage.remove([item.storageReference])));
      throw error;
    }
  }

  async createDownloadUrl(storageReference: string) {
    const { data, error } = await this.databaseService.getClient().storage
      .from(OutboundAttachmentStorageService.bucket)
      .createSignedUrl(storageReference, 10 * 60, { download: true });
    if (error || !data?.signedUrl) throw new BadRequestException(error?.message ?? 'Unable to create attachment download link.');
    return data.signedUrl;
  }

  async remove(storageReferences: string[]) {
    if (!storageReferences.length) return;
    await this.databaseService.getClient().storage
      .from(OutboundAttachmentStorageService.bucket)
      .remove(storageReferences);
  }

  private async ensureBucket() {
    const storage = this.databaseService.getClient().storage;
    const { error } = await storage.getBucket(OutboundAttachmentStorageService.bucket);
    if (!error) return;
    const { error: createError } = await storage.createBucket(OutboundAttachmentStorageService.bucket, { public: false, fileSizeLimit: 25 * 1024 * 1024 });
    if (createError && !/already exists/i.test(createError.message)) {
      throw new BadRequestException(`Unable to initialise private email attachment storage: ${createError.message}`);
    }
  }
}
