import { Injectable } from '@nestjs/common';
import { NormalizedEmail, EmailClassificationType } from '../types/email.types';

@Injectable()
export class EmailClassifierService {
  classify(email: NormalizedEmail): { classification: EmailClassificationType; confidence: number } {
    const text = `${email.subject} \n ${email.plainTextBody || ''}`.toLowerCase();

    if (email.subject.toLowerCase().includes('out of office') || text.includes('delivery status notification')) {
      return { classification: 'AUTO_REPLY', confidence: 0.99 };
    }

    if (
      (text.includes('pre-auth') || text.includes('preauth') || text.includes('cashless')) &&
      (text.includes('approved') || text.includes('approval letter') || text.includes('authorized')) &&
      !text.includes('reject') &&
      !text.includes('query')
    ) {
      return { classification: 'PREAUTH_APPROVAL', confidence: 0.95 };
    }

    if (text.includes('query') || text.includes('deficiency') || text.includes('additional document')) {
      return { classification: 'PREAUTH_QUERY', confidence: 0.92 };
    }

    if (text.includes('reject') || text.includes('denial') || text.includes('repudiat')) {
      return { classification: 'PREAUTH_REJECTION', confidence: 0.94 };
    }

    if (text.includes('enhancement') && (text.includes('approved') || text.includes('enhanced'))) {
      return { classification: 'ENHANCEMENT_APPROVAL', confidence: 0.93 };
    }

    if (text.includes('discharge') && text.includes('approval')) {
      return { classification: 'DISCHARGE_APPROVAL', confidence: 0.95 };
    }

    return { classification: 'GENERAL_CORRESPONDENCE', confidence: 0.75 };
  }
}