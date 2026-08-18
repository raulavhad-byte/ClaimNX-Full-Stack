import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { MailboxSyncService } from '../jobs/mailbox-sync.service';
import { GmailPushAuthenticator } from './gmail-push-authenticator.service';

@Controller('webhooks/gmail')
export class GmailWebhookController {
  private readonly logger = new Logger(GmailWebhookController.name);

  constructor(private readonly mailboxSync: MailboxSyncService, private readonly authenticator: GmailPushAuthenticator) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async handleGmailPushNotification(
    @Body() body: any,
    @Headers('authorization') authHeader?: string
  ) {
    await this.authenticator.validate(authHeader);
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

    if (emailAddress) await this.mailboxSync.requestProviderSync('GMAIL', emailAddress);
    return {
      received: true,
      emailAddress,
      historyId
    };
  }
}
