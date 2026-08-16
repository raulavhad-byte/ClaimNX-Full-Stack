import { Injectable } from '@nestjs/common';
import { EMAIL_MODULE_CONSTANTS } from '../constants/email.constants';

@Injectable()
export class SenderValidationService {
  isTrustedPayerSender(fromAddress: string): boolean {
    if (!fromAddress || !fromAddress.includes('@')) return false;
    const domain = fromAddress.split('@')[1].toLowerCase().trim();
    return EMAIL_MODULE_CONSTANTS.TRUSTED_PAYER_DOMAINS.some(
      (trusted) => domain === trusted || domain.endsWith(`.${trusted}`)
    );
  }
}