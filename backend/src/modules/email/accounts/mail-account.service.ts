import { Injectable, NotFoundException } from '@nestjs/common';
import { MailAccountRepository } from './mail-account.repository';
import { MailProviderFactory } from '../providers/mail-provider.factory';
import { MailProviderType } from '../types/email.types';

export interface CreateMailAccountDto {
  hospitalId: string;
  provider: MailProviderType;
  emailAddress: string;
  displayName?: string;
  authType?: 'OAUTH2' | 'PASSWORD' | 'APP_KEY';
  /** Opaque reference to a value in the configured secret vault; never a token/password. */
  credentialReference: string;
  inboundEnabled?: boolean;
  outboundEnabled?: boolean;
}

@Injectable()
export class MailAccountService {
  constructor(
    private readonly repository: MailAccountRepository,
    private readonly providerFactory: MailProviderFactory
  ) {}

  async getAccountsByHospital(hospitalId: string) {
    return this.repository.findByHospital(hospitalId);
  }

  async getActiveAccountsForActor(hospitalIds: string[], actor: any) {
    const requested = [...new Set(hospitalIds.map(String).filter(Boolean))];
    const role = String(actor?.role ?? '').trim().toUpperCase();
    const permissions = Array.isArray(actor?.permissions) ? actor.permissions.map(String) : [];
    const profile = actor?.profileData && typeof actor.profileData === 'object'
      ? actor.profileData as Record<string, unknown>
      : {};
    const assignedHospitalIds = Array.isArray(profile.assignedHospitalIds)
      ? profile.assignedHospitalIds.map(String)
      : [];
    const actorHospitalId = String(actor?.hospitalId ?? actor?.hospital_id ?? profile.hospitalId ?? '');
    const hasCrossHospitalAccess = ['SUPER ADMIN', 'ADMIN', 'MANAGER', 'CRM TEAM', 'RECONCILIATION MANAGER', 'RECONCILIATION TEAM', 'ACCOUNTS HEAD'].includes(role)
      || permissions.includes('all')
      || permissions.includes('hospitals.update')
      || permissions.includes('reconciliation:recon_approve:oversight');
    // Finance/reconciliation users work across the hospital portfolio. Return
    // the authoritative active mailbox list so legacy UI IDs cannot hide a
    // valid hospital integration.
    if (hasCrossHospitalAccess) return this.repository.findAllActive();
    const permitted = hasCrossHospitalAccess
      ? requested
      : requested.filter((hospitalId) => hospitalId === actorHospitalId || assignedHospitalIds.includes(hospitalId));
    return this.repository.findActiveByHospitals(permitted);
  }

  async createAccount(dto: CreateMailAccountDto) {
    return this.repository.create({
      hospital_id: dto.hospitalId,
      provider: dto.provider,
      email_address: dto.emailAddress,
      display_name: dto.displayName || dto.emailAddress,
      auth_type: dto.authType || 'OAUTH2',
      credential_reference: dto.credentialReference,
      status: 'AUTH_REQUIRED',
      inbound_enabled: dto.inboundEnabled ?? true,
      outbound_enabled: dto.outboundEnabled ?? true
    });
  }

  async testConnection(accountId: string) {
    const account = await this.repository.findById(accountId);
    if (!account) throw new NotFoundException(`Mail account not found: ${accountId}`);

    const provider = this.providerFactory.getProvider(account.provider);
    return provider.testConnection(account);
  }
}
