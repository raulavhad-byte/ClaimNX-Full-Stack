import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';
import { MailAccountRepository } from './mail-account.repository';
import { MailCredentialVaultService } from './mail-credential-vault.service';

type Provider = 'MICROSOFT_365' | 'YAHOO';

@Injectable()
export class ExternalOAuthService {
  constructor(private readonly config: ConfigService, private readonly db: DatabaseService, private readonly accounts: MailAccountRepository, private readonly vault: MailCredentialVaultService) {}

  async begin(provider: Provider, emailAddress: string, displayName: string | undefined, actor: any, requestedHospitalId?: string) {
    const email = this.email(emailAddress); const hospitalId = requestedHospitalId?.trim() || actor?.hospitalId || actor?.hospital_id;
    const role = String(actor?.role || '').toUpperCase(); const permissions = Array.isArray(actor?.permissions) ? actor.permissions.map(String) : [];
    const canManageAny = ['SUPER ADMIN', 'ADMIN'].includes(role) || permissions.includes('all') || permissions.includes('hospitals.update');
    if (!actor?.id || !hospitalId) throw new ForbiddenException('Select a hospital before connecting email.');
    if (!canManageAny && String(actor.hospitalId || actor.hospital_id) !== String(hospitalId)) throw new ForbiddenException('You can connect email only for your assigned hospital.');
    const { data: hospital, error } = await this.db.getClient().from('hospitals').select('id').eq('id', hospitalId).eq('is_deleted', false).maybeSingle();
    if (error) throw error; if (!hospital) throw new BadRequestException('The selected hospital does not exist or is inactive.');
    const nonce = randomBytes(32).toString('base64url'); const state = `${nonce}.${this.sign(nonce)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const { error: insertError } = await this.db.getClient().from('mail_oauth_authorization_states').insert({ state_hash: this.hash(state), provider, hospital_id: hospitalId, requested_by: actor.id, requested_email_address: email, display_name: displayName?.trim() || null, expires_at: expiresAt.toISOString() });
    if (insertError) throw insertError;
    const params = new URLSearchParams({ client_id: this.clientId(provider), redirect_uri: this.redirectUri(provider), response_type: 'code', scope: this.scopes(provider), state });
    if (provider === 'MICROSOFT_365') { params.set('response_mode', 'query'); params.set('prompt', 'select_account'); }
    else { params.set('redirect_uri', this.redirectUri(provider)); }
    return { authorizationUrl: `${this.authorizeUrl(provider)}?${params}`, expiresAt: expiresAt.toISOString() };
  }

  async complete(provider: Provider, code?: string, state?: string, providerError?: string, description?: string) {
    if (providerError) throw new BadRequestException(description || `${provider} authorization failed: ${providerError}`);
    if (!code || !state) throw new BadRequestException('OAuth callback is missing code or state.'); this.validateState(state);
    const { data: authorization, error } = await this.db.getClient().from('mail_oauth_authorization_states').select('*').eq('state_hash', this.hash(state)).eq('provider', provider).maybeSingle();
    if (error) throw error;
    if (!authorization || authorization.consumed_at || new Date(authorization.expires_at) < new Date()) throw new BadRequestException('This authorization request is invalid, expired, or already used.');
    const tokens = await this.exchange(provider, code); if (!tokens.refresh_token) throw new BadRequestException('The provider did not return a refresh token. Revoke ClaimNX access and authorize again.');
    const connectedEmail = await this.connectedEmail(provider, tokens.access_token);
    if (connectedEmail !== String(authorization.requested_email_address).toLowerCase()) throw new BadRequestException(`The authenticated account (${connectedEmail}) does not match the requested mailbox.`);
    const existing = await this.accounts.findByHospitalProviderEmail(authorization.hospital_id, provider, connectedEmail);
    const account = existing ?? await this.accounts.create({ hospital_id: authorization.hospital_id, provider, email_address: connectedEmail, display_name: authorization.display_name || connectedEmail, auth_type: 'OAUTH2', credential_reference: 'vault://pending', status: 'AUTH_REQUIRED', inbound_enabled: true, outbound_enabled: true, created_by: authorization.requested_by, updated_by: authorization.requested_by });
    await this.vault.saveOAuthCredential(account.id, { provider, refreshToken: tokens.refresh_token, scope: tokens.scope, connectedEmailAddress: connectedEmail });
    const updated = await this.accounts.update(account.id, { credential_reference: `vault://mail-account-credentials/${account.id}`, status: 'ACTIVE', updated_by: authorization.requested_by });
    const { error: consumeError } = await this.db.getClient().from('mail_oauth_authorization_states').update({ consumed_at: new Date().toISOString() }).eq('id', authorization.id).is('consumed_at', null);
    if (consumeError) throw consumeError;
    return { connected: true, accountId: updated.id, emailAddress: updated.email_address, status: updated.status };
  }

  private async exchange(provider: Provider, code: string): Promise<any> { const response = await fetch(this.tokenUrl(provider), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: this.clientId(provider), client_secret: this.config.getOrThrow(`${provider === 'MICROSOFT_365' ? 'MICROSOFT' : 'YAHOO'}_OAUTH_CLIENT_SECRET`), redirect_uri: this.redirectUri(provider), grant_type: 'authorization_code' }) }); const result = await response.json() as any; if (!response.ok || !result.access_token) throw new BadRequestException(`Token exchange failed: ${result.error_description || result.error || response.status}`); return result; }
  private async connectedEmail(provider: Provider, token: string) { const url = provider === 'MICROSOFT_365' ? 'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName' : 'https://api.login.yahoo.com/openid/v1/userinfo'; const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } }); const result = await response.json() as any; const email = provider === 'MICROSOFT_365' ? result.mail || result.userPrincipalName : result.email; if (!response.ok || typeof email !== 'string') throw new BadRequestException('Unable to determine the connected mailbox address.'); return email.toLowerCase(); }
  private scopes(provider: Provider) { return provider === 'MICROSOFT_365' ? 'offline_access User.Read Mail.Read Mail.Send' : 'openid profile email mail-r mail-w'; }
  private authorizeUrl(provider: Provider) { return provider === 'MICROSOFT_365' ? `https://login.microsoftonline.com/${this.config.get<string>('MICROSOFT_OAUTH_TENANT_ID') || 'common'}/oauth2/v2.0/authorize` : 'https://api.login.yahoo.com/oauth2/request_auth'; }
  private tokenUrl(provider: Provider) { return provider === 'MICROSOFT_365' ? `https://login.microsoftonline.com/${this.config.get<string>('MICROSOFT_OAUTH_TENANT_ID') || 'common'}/oauth2/v2.0/token` : 'https://api.login.yahoo.com/oauth2/get_token'; }
  private clientId(provider: Provider) { return this.config.getOrThrow<string>(provider === 'MICROSOFT_365' ? 'MICROSOFT_OAUTH_CLIENT_ID' : 'YAHOO_OAUTH_CLIENT_ID'); }
  private redirectUri(provider: Provider) { return this.config.getOrThrow<string>(provider === 'MICROSOFT_365' ? 'MICROSOFT_OAUTH_REDIRECT_URI' : 'YAHOO_OAUTH_REDIRECT_URI'); }
  private email(value: string) { const email = String(value || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('A valid email address is required.'); return email; }
  private sign(nonce: string) { return createHmac('sha256', this.config.getOrThrow<string>('GMAIL_OAUTH_STATE_SECRET')).update(nonce).digest('base64url'); }
  private validateState(state: string) { const [nonce, signature, ...extra] = state.split('.'); const expected = this.sign(nonce || ''); if (!nonce || !signature || extra.length || Buffer.from(signature).length !== Buffer.from(expected).length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new BadRequestException('Invalid OAuth state.'); }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
}
