import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GmailPushAuthenticator {
  private readonly client = new OAuth2Client();
  constructor(private readonly config: ConfigService) {}

  async validate(authorization?: string) {
    const audience = this.config.get<string>('GMAIL_PUBSUB_AUDIENCE');
    const expectedServiceAccount = this.config.get<string>('GMAIL_PUBSUB_SERVICE_ACCOUNT');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!audience || !expectedServiceAccount || !token) {
      throw new UnauthorizedException('Untrusted Gmail push notification.');
    }
    const ticket = await this.client.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    if (!payload?.email_verified || String(payload.email).toLowerCase() !== expectedServiceAccount.toLowerCase()) {
      throw new UnauthorizedException('Untrusted Gmail push notification.');
    }
  }
}
