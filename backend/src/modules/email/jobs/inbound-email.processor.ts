import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email.service';
import { NormalizedEmail } from '../types/email.types';

@Injectable()
export class InboundEmailProcessor {
  private readonly logger = new Logger(InboundEmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  async processInboundJob(jobData: { hospitalId: string; email: NormalizedEmail }) {
    this.logger.log(`Processing inbound email job: ${jobData.email.providerMessageId}`);
    // Inbound processing is scoped to the connected mailbox, not a hospital
    // ID. The normalized payload already carries that authoritative account.
    return this.emailService.processInboundEmail(jobData.email.accountId, jobData.email);
  }
}
