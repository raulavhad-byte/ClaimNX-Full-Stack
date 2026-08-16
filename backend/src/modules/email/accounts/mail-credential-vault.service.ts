import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { DatabaseService } from '../../../database/database.service';

interface GmailCredentialPayload {
  refreshToken: string;
  scope?: string;
  connectedEmailAddress: string;
}

export interface OAuthCredentialPayload extends GmailCredentialPayload {
  provider?: string;
}

@Injectable()
export class MailCredentialVaultService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async saveGmailCredential(mailAccountId: string, payload: GmailCredentialPayload) {
    return this.saveOAuthCredential(mailAccountId, { ...payload, provider: 'GMAIL' });
  }

  async saveOAuthCredential(mailAccountId: string, payload: OAuthCredentialPayload) {
    const key = this.encryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const record = {
      mail_account_id: mailAccountId,
      encrypted_payload: encrypted.toString('base64'),
      initialization_vector: iv.toString('base64'),
      authentication_tag: cipher.getAuthTag().toString('base64'),
      algorithm: 'AES-256-GCM',
      key_version: 'v1',
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.databaseService.getClient()
      .from('mail_account_credentials')
      .upsert(record, { onConflict: 'mail_account_id' });
    if (error) throw error;
  }

  async getGmailCredential(mailAccountId: string): Promise<GmailCredentialPayload> {
    return this.getOAuthCredential(mailAccountId);
  }

  async getOAuthCredential(mailAccountId: string): Promise<OAuthCredentialPayload> {
    const { data, error } = await this.databaseService.getClient()
      .from('mail_account_credentials')
      .select('encrypted_payload, initialization_vector, authentication_tag, algorithm')
      .eq('mail_account_id', mailAccountId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new InternalServerErrorException('No secure credential is configured for this mailbox.');
    if (data.algorithm !== 'AES-256-GCM') throw new InternalServerErrorException('Unsupported mailbox credential encryption.');

    try {
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(data.initialization_vector, 'base64'));
      decipher.setAuthTag(Buffer.from(data.authentication_tag, 'base64'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(data.encrypted_payload, 'base64')),
        decipher.final(),
      ]);
      return JSON.parse(decrypted.toString('utf8')) as OAuthCredentialPayload;
    } catch {
      throw new InternalServerErrorException('Unable to decrypt mailbox credential. Check EMAIL_CREDENTIAL_ENCRYPTION_KEY.');
    }
  }

  private encryptionKey(): Buffer {
    const secret = this.configService.get<string>('EMAIL_CREDENTIAL_ENCRYPTION_KEY');
    if (!secret || secret.length < 32) {
      throw new InternalServerErrorException('EMAIL_CREDENTIAL_ENCRYPTION_KEY must be configured with a long random server-only value.');
    }
    return createHash('sha256').update(secret).digest();
  }
}
