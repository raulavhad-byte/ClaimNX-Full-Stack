import { Controller, Post, Get, Body, Query, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { EmailService } from '../email.service';

@Controller('webhooks/microsoft')
export class MicrosoftWebhookController {
  private readonly logger = new Logger(MicrosoftWebhookController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('notifications')
  async handleGraphNotification(
    @Query('validationToken') validationToken: string,
    @Body() payload: any,
    @Res() res: Response
    @Res() res: Response
  ) {
    // 1. Handle Microsoft Graph Webhook Handshake Validation
    if (validationToken) {
      this.logger.log('Responding to Microsoft Graph subscription validation token');
      res.setHeader('Content-Type', 'text/plain');
      return res.status(HttpStatus.OK).send(validationToken);
    }

    // 2. Handle Resource Change Notifications
    if (payload?.value && Array.isArray(payload.value)) {
      for (const notification of payload.value) {
        this.logger.log(`MS Graph change detected on resource: ${notification.resource}`);
      }
    }

    return res.status(HttpStatus.ACCEPTED).json({ received: true });
  }
}