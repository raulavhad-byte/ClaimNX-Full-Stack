import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { DatabaseService } from '../../../database/database.service';
import { MailAccountRepository } from './mail-account.repository';
import { MailCredentialVaultService } from './mail-credential-vault.service';

interface OAuthActor {
  id?: string;
  hospitalId?: string | null;
  hospital_id?: string | null;
  role?: string;
  permissions?: unknown;
}

@Injectable()
export class GmailOAuthService {
  private readonly scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly accounts: MailAccountRepository,
    private readonly vault: MailCredentialVaultService,
  ) {}

  async begin(emailAddress: string, displayName: string | undefined, actor: OAuthActor, requestedHospitalId?: string) {
    const email = this.normalizeEmail(emailAddress);
    const actorHospitalId = actor.hospitalId ?? actor.hospital_id;
    const permissions = Array.isArray(actor.permissions) ? actor.permissions.map(String) : [];
    const role = String(actor.role ?? '').trim().toUpperCase();
    const canManageAnyHospital = role === 'SUPER ADMIN'
      || role === 'ADMIN'
      || permissions.includes('all')
      || permissions.includes('hospitals.update');
    const hospitalId = requestedHospitalId?.trim() || actorHospitalId;
    if (!actor.id || !hospitalId) throw new ForbiddenException('Select a hospital before connecting Gmail.');
    if (!canManageAnyHospital && String(actorHospitalId) !== String(hospitalId)) {
      throw new ForbiddenException('You can connect email only for your assigned hospital.');
    }
    const { data: hospital, error: hospitalError } = await this.databaseService.getClient()
      .from('hospitals')
      .select('id')
      .eq('id', hospitalId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (hospitalError) throw hospitalError;
    if (!hospital) throw new BadRequestException('The selected hospital does not exist or is inactive.');

    const nonce = randomBytes(32).toString('base64url');
    const state = `${nonce}.${this.signState(nonce)}`;
    const stateHash = this.hash(state);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const { error } = await this.databaseService.getClient()
      .from('mail_oauth_authorization_states')
      .insert({
        state_hash: stateHash,
        provider: 'GMAIL',
        hospital_id: hospitalId,
        requested_by: actor.id,
        requested_email_address: email,
        display_name: displayName?.trim() || null,
        expires_at: expiresAt.toISOString(),
      });
    if (error) throw error;

    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });
    return {
      authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async complete(code: string | undefined, state: string | undefined, providerError?: string, providerErrorDescription?: string) {
    if (providerError) throw new BadRequestException(providerErrorDescription || `Google authorization failed: ${providerError}`);
    if (!code || !state) throw new BadRequestException('Google OAuth callback is missing code or state.');
    this.validateStateSignature(state);

    const { data: authorization, error } = await this.databaseService.getClient()
      .from('mail_oauth_authorization_states')
      .select('*')
      .eq('state_hash', this.hash(state))
      .eq('provider', 'GMAIL')
      .maybeSingle();
    if (error) throw error;
    if (!authorization || authorization.consumed_at || new Date(authorization.expires_at) < new Date()) {
      throw new BadRequestException('This Gmail authorization request is invalid, expired, or has already been used.');
    }

    const tokens = await this.exchangeCode(code);
    if (!tokens.refresh_token) {
      throw new BadRequestException('Google did not return a refresh token. Revoke ClaimNX access in Google Account permissions and authorize again.');
    }
    const connectedEmail = await this.getConnectedEmail(tokens.access_token);
    if (connectedEmail !== String(authorization.requested_email_address).toLowerCase()) {
      throw new BadRequestException(`The authenticated Gmail account (${connectedEmail}) does not match the requested mailbox.`);
    }

    const existing = await this.accounts.findByHospitalProviderEmail(authorization.hospital_id, 'GMAIL', connectedEmail);
    const account = existing ?? await this.accounts.create({
      hospital_id: authorization.hospital_id,
      provider: 'GMAIL',
      email_address: connectedEmail,
      display_name: authorization.display_name || connectedEmail,
      auth_type: 'OAUTH2',
      credential_reference: 'vault://pending',
      status: 'AUTH_REQUIRED',
      inbound_enabled: true,
      outbound_enabled: true,
      created_by: authorization.requested_by,
      updated_by: authorization.requested_by,
    });

    await this.vault.saveGmailCredential(account.id, {
      refreshToken: tokens.refresh_token,
      scope: tokens.scope,
      connectedEmailAddress: connectedEmail,
    });
    const updatedAccount = await this.accounts.update(account.id, {
      credential_reference: `vault://mail-account-credentials/${account.id}`,
      status: 'ACTIVE',
      updated_by: authorization.requested_by,
    });
    const { error: consumedError } = await this.databaseService.getClient()
      .from('mail_oauth_authorization_states')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', authorization.id)
      .is('consumed_at', null);
    if (consumedError) throw consumedError;

    return {
      connected: true,
      accountId: updatedAccount.id,
      emailAddress: updatedAccount.email_address,
      status: updatedAccount.status,
    };
  }

  private async exchangeCode(code: string): Promise<{ access_token: string; refresh_token?: string; scope?: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId(),
        client_secret: this.configService.getOrThrow<string>('GMAIL_OAUTH_CLIENT_SECRET'),
        redirect_uri: this.redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok || typeof result.access_token !== 'string') {
      throw new BadRequestException(`Google token exchange failed: ${String(result.error_description || result.error || response.status)}`);
    }
    return result as { access_token: string; refresh_token?: string; scope?: string };
  }

  private async getConnectedEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok || typeof result.emailAddress !== 'string') {
      throw new BadRequestException('Unable to read the connected Gmail address. Ensure Gmail API is enabled and try again.');
    }
    return result.emailAddress.toLowerCase();
  }

  private normalizeEmail(value: string) {
    const email = String(value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('A valid Gmail address is required.');
    return email;
  }

  private clientId() {
    return this.configService.getOrThrow<string>('GMAIL_OAUTH_CLIENT_ID');
  }

  private redirectUri() {
    return this.configService.getOrThrow<string>('GMAIL_OAUTH_REDIRECT_URI');
  }

  private signState(nonce: string) {
    return createHmac('sha256', this.configService.getOrThrow<string>('GMAIL_OAUTH_STATE_SECRET')).update(nonce).digest('base64url');
  }

  private validateStateSignature(state: string) {
    const [nonce, signature, ...extra] = state.split('.');
    if (!nonce || !signature || extra.length > 0) throw new BadRequestException('Invalid OAuth state.');
    const expected = this.signState(nonce);
    const supplied = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) {
      throw new BadRequestException('Invalid OAuth state signature.');
    }
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
