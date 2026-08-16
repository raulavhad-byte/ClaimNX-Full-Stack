import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email.service';

@Injectable()
export class OutboundEmailProcessor {
  private readonly logger = new Logger(OutboundEmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  async processOutboundJob(jobData: { hospitalId: string; claimId: string; payload: any }) {
    this.logger.log(`Dispatching outbound email queue job for claim: ${jobData.claimId}`);
    return this.emailService.sendClaimEmail(jobData.hospitalId, jobData.claimId, jobData.payload);
  }
}