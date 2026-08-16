import { Injectable, BadRequestException } from '@nestjs/common';
import { EMAIL_MODULE_CONSTANTS } from '../constants/email.constants';

@Injectable()
export class AttachmentSecurityService {
  validateAttachment(fileName: string, mimeType: string, sizeBytes: number): boolean {
    if (sizeBytes > EMAIL_MODULE_CONSTANTS.MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException(`Attachment ${fileName} exceeds maximum size limit (25MB)`);
    }

    const isAllowedMime = EMAIL_MODULE_CONSTANTS.ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType.toLowerCase());
    const lowerName = fileName.toLowerCase();
    const isDangerousExtension = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.scr', '.zip', '.tar'].some((ext) =>
      lowerName.endsWith(ext)
    );

    if (isDangerousExtension || !isAllowedMime) {
      throw new BadRequestException(`Attachment type not allowed or executable: ${fileName}`);
    }

    return true;
  }

  generateSanitizedStorageKey(hospitalId: string, claimId: string, fileName: string): string {
    const ext = fileName.split('.').pop() || 'dat';
    const cleanUuid = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return `hospitals/${hospitalId}/claims/${claimId}/correspondence/${cleanUuid}.${ext}`;
  }
}