import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { EmailService } from '../email.service';

@Controller('webhooks/gmail')
export class GmailWebhookController {
  private readonly logger = new Logger(GmailWebhookController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async handleGmailPushNotification(
    @Body() body: any,
    @Headers('authorization') authHeader?: string
  ) {
    this.logger.log(`Received Gmail Pub/Sub push notification: ${JSON.stringify(body?.message?.messageId || '')}`);

    // Decode PubSub base64 payload if present
    let historyId = null;
    let emailAddress = null;
    if (body?.message?.data) {
      try {
        const decoded = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf-8'));
        historyId = decoded.historyId;
        emailAddress = decoded.emailAddress;
      } catch (err: any) {
        this.logger.warn(`Failed to parse PubSub data: ${err.message}`);
      }
    }

    return {
      received: true,
      emailAddress,
      historyId
    };
  }
}