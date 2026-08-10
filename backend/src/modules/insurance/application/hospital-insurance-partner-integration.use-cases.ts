import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  HospitalInsurancePartnerIntegration,
  HospitalPayerIntegrationChannel,
  HospitalPayerIntegrationStatus,
} from '../domain/hospital-insurance-partner-integration.aggregate';
import { InsuranceDomainError } from '../domain/insurance-partner.aggregate';
import { HospitalInsurancePartnerIntegrationRepository } from '../infrastructure/hospital-insurance-partner-integration.repository';
import { InsuranceAccessService } from './insurance-access.service';
import { HospitalPayerIntegrationReferenceDataService } from './hospital-payer-integration-reference-data.service';

export interface HospitalPayerIntegrationContext {
  actorUserId: string;
  organizationId: string;
  hospitalId: string;
  hospitalInsurancePartnerIntegrationId: string;
}

export interface CreateHospitalPayerIntegrationCommand {
  actorUserId: string;
  organizationId: string;
  hospitalId: string;
  insurancePartnerId: string;
  integrationCode: string;
  submissionChannelReferenceValueId: string;
  payerEmailAddress?: string | null;
  notificationEmailAddress?: string | null;
  portalUrl?: string | null;
  portalUserName?: string | null;
  /** Opaque secret-manager pointer, never a credential value. */
  credentialSecretReference?: string | null;
  operationalStatusReferenceValueId: string;
}

export interface UpdateHospitalPayerIntegrationCommand extends HospitalPayerIntegrationContext {
  version: number;
  integrationCode: string;
  submissionChannelReferenceValueId: string;
  payerEmailAddress?: string | null;
  notificationEmailAddress?: string | null;
  portalUrl?: string | null;
  portalUserName?: string | null;
  credentialSecretReference?: string | null;
}

export interface ChangeHospitalPayerIntegrationStatusCommand extends HospitalPayerIntegrationContext {
  version: number;
  operationalStatusReferenceValueId: string;
}

/** Deliberately excludes the opaque credential-secret reference. */
export interface HospitalPayerIntegrationResult {
  hospitalInsurancePartnerIntegrationId: string;
  organizationId: string;
  hospitalId: string;
  insurancePartnerId: string;
  integrationCode: string;
  submissionChannelReferenceValueId: string;
  payerEmailAddress?: string | null;
  notificationEmailAddress?: string | null;
  portalUrl?: string | null;
  portalUserName?: string | null;
  operationalStatusReferenceValueId: string;
  version: number;
}

@Injectable()
export class HospitalInsurancePartnerIntegrationUseCases {
  constructor(
    private readonly repository: HospitalInsurancePartnerIntegrationRepository,
    private readonly accessService: InsuranceAccessService,
    private readonly referenceData: HospitalPayerIntegrationReferenceDataService,
  ) {}

  async get(context: HospitalPayerIntegrationContext): Promise<HospitalPayerIntegrationResult> {
    await this.assertTenantHospitalAccess(context.actorUserId, context.organizationId, context.hospitalId);
    return this.toResult(await this.requireIntegration(context.organizationId, context.hospitalId, context.hospitalInsurancePartnerIntegrationId));
  }

  async list(actorUserId: string, organizationId: string, hospitalId: string): Promise<HospitalPayerIntegrationResult[]> {
    await this.assertTenantHospitalAccess(actorUserId, organizationId, hospitalId);
    return (await this.repository.listActiveByHospital(organizationId, hospitalId)).map((integration) => this.toResult(integration));
  }

  async create(command: CreateHospitalPayerIntegrationCommand): Promise<HospitalPayerIntegrationResult> {
    await this.assertTenantHospitalAccess(command.actorUserId, command.organizationId, command.hospitalId);
    const integration = await this.createValidatedAggregate(command, randomUUID(), 1);
    await this.repository.create({ ...integration.snapshot, actorUserId: command.actorUserId });
    return this.toResult(await this.requireIntegration(command.organizationId, command.hospitalId, integration.id));
  }

  async update(command: UpdateHospitalPayerIntegrationCommand): Promise<HospitalPayerIntegrationResult> {
    await this.assertTenantHospitalAccess(command.actorUserId, command.organizationId, command.hospitalId);
    const existing = await this.requireIntegration(command.organizationId, command.hospitalId, command.hospitalInsurancePartnerIntegrationId);
    const integration = await this.createValidatedAggregate(
      { ...command, insurancePartnerId: existing.snapshot.insurancePartnerId, operationalStatusReferenceValueId: existing.snapshot.operationalStatusReferenceValueId },
      existing.id,
      command.version,
    );
    await this.requireMutation(
      this.repository.update({ ...integration.snapshot, expectedVersion: command.version, actorUserId: command.actorUserId }),
      'Hospital–Payer Integration was changed, retired, or no longer available. Refresh and retry.',
    );
    return this.toResult(await this.requireIntegration(command.organizationId, command.hospitalId, command.hospitalInsurancePartnerIntegrationId));
  }

  async setStatus(command: ChangeHospitalPayerIntegrationStatusCommand): Promise<HospitalPayerIntegrationResult> {
    await this.assertTenantHospitalAccess(command.actorUserId, command.organizationId, command.hospitalId);
    await this.requireIntegration(command.organizationId, command.hospitalId, command.hospitalInsurancePartnerIntegrationId);
    // The SQL command function validates the complete secure record. The read
    // model intentionally omits the external secret reference, so application
    // code must not reconstruct or log it just to change lifecycle status.
    await this.resolveStatus(command.operationalStatusReferenceValueId);
    await this.requireMutation(
      this.repository.setStatus(command.organizationId, command.hospitalId, command.hospitalInsurancePartnerIntegrationId, command.version, command.operationalStatusReferenceValueId, command.actorUserId),
      'Hospital–Payer Integration was changed, retired, or no longer available. Refresh and retry.',
    );
    return this.toResult(await this.requireIntegration(command.organizationId, command.hospitalId, command.hospitalInsurancePartnerIntegrationId));
  }

  async retire(context: HospitalPayerIntegrationContext & { version: number }): Promise<void> {
    await this.assertTenantHospitalAccess(context.actorUserId, context.organizationId, context.hospitalId);
    await this.requireIntegration(context.organizationId, context.hospitalId, context.hospitalInsurancePartnerIntegrationId);
    await this.requireMutation(
      this.repository.softDelete(context.organizationId, context.hospitalId, context.hospitalInsurancePartnerIntegrationId, context.version, context.actorUserId),
      'Hospital–Payer Integration was changed, retired, or no longer available. Refresh and retry.',
    );
  }

  private async createValidatedAggregate(
    command: CreateHospitalPayerIntegrationCommand | (UpdateHospitalPayerIntegrationCommand & { insurancePartnerId: string; operationalStatusReferenceValueId: string }),
    id: string,
    version: number,
  ): Promise<HospitalInsurancePartnerIntegration> {
    const [channel, status] = await Promise.all([
      this.resolveChannel(command.submissionChannelReferenceValueId),
      this.resolveStatus(command.operationalStatusReferenceValueId),
    ]);
    const integration = this.rethrowDomainError(() => HospitalInsurancePartnerIntegration.create({
      hospitalInsurancePartnerIntegrationId: id,
      organizationId: command.organizationId,
      hospitalId: command.hospitalId,
      insurancePartnerId: command.insurancePartnerId,
      integrationCode: command.integrationCode,
      submissionChannelReferenceValueId: command.submissionChannelReferenceValueId,
      payerEmailAddress: command.payerEmailAddress,
      notificationEmailAddress: command.notificationEmailAddress,
      portalUrl: command.portalUrl,
      portalUserName: command.portalUserName,
      credentialSecretReference: command.credentialSecretReference,
      operationalStatusReferenceValueId: command.operationalStatusReferenceValueId,
      version,
    }));
    this.rethrowDomainError(() => integration.assertOperationalConfiguration(channel, status));
    return integration;
  }

  private async assertTenantHospitalAccess(actorUserId: string, organizationId: string, hospitalId: string): Promise<void> {
    await this.accessService.assertActiveMembership(actorUserId, organizationId);
    await this.accessService.assertActiveHospitalInOrganization(organizationId, hospitalId);
  }

  private async requireIntegration(organizationId: string, hospitalId: string, integrationId: string): Promise<HospitalInsurancePartnerIntegration> {
    const integration = await this.repository.findActiveById(organizationId, hospitalId, integrationId);
    if (!integration) throw new NotFoundException('Hospital–Payer Integration was not found in the Hospital tenant scope.');
    return integration;
  }

  private async resolveChannel(referenceValueId: string): Promise<HospitalPayerIntegrationChannel> {
    return (await this.referenceData.requireCode(referenceValueId, 'HOSPITAL_PAYER_INTEGRATION_CHANNEL')) as HospitalPayerIntegrationChannel;
  }

  private async resolveStatus(referenceValueId: string): Promise<HospitalPayerIntegrationStatus> {
    return (await this.referenceData.requireCode(referenceValueId, 'HOSPITAL_PAYER_INTEGRATION_STATUS')) as HospitalPayerIntegrationStatus;
  }

  private async requireMutation(operation: Promise<string | null>, message: string): Promise<void> {
    if (!(await operation)) throw new ConflictException(message);
  }

  private toResult(integration: HospitalInsurancePartnerIntegration): HospitalPayerIntegrationResult {
    const snapshot = integration.snapshot;
    return {
      hospitalInsurancePartnerIntegrationId: snapshot.hospitalInsurancePartnerIntegrationId,
      organizationId: snapshot.organizationId, hospitalId: snapshot.hospitalId,
      insurancePartnerId: snapshot.insurancePartnerId, integrationCode: snapshot.integrationCode,
      submissionChannelReferenceValueId: snapshot.submissionChannelReferenceValueId,
      payerEmailAddress: snapshot.payerEmailAddress, notificationEmailAddress: snapshot.notificationEmailAddress,
      portalUrl: snapshot.portalUrl, portalUserName: snapshot.portalUserName,
      operationalStatusReferenceValueId: snapshot.operationalStatusReferenceValueId, version: snapshot.version,
    };
  }

  private rethrowDomainError<T>(operation: () => T): T {
    try { return operation(); } catch (error) {
      if (error instanceof InsuranceDomainError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
