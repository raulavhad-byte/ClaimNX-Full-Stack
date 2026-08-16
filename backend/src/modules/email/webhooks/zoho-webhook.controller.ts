import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { EmailService } from '../email.service';

@Controller('webhooks/zoho')
export class ZohoWebhookController {
  private readonly logger = new Logger(ZohoWebhookController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('incoming')
  @HttpCode(HttpStatus.OK)
  async handleZohoIncomingEmail(@Body() payload: any) {
    this.logger.log(`Zoho incoming mail event: ${payload?.summary || payload?.mailId || ''}`);
    return { received: true, status: 'PROCESSED' };
  }
}