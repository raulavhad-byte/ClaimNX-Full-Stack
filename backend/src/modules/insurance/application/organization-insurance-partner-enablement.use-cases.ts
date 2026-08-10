import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  InsuranceDomainError,
  OrganizationInsurancePartnerEnablement,
} from '../domain/insurance-partner.aggregate';
import { InsurancePartnerRepository } from '../infrastructure/insurance-partner.repository';
import { OrganizationInsurancePartnerEnablementRepository } from '../infrastructure/organization-insurance-partner-enablement.repository';
import { InsuranceAccessService } from './insurance-access.service';

export interface OrganizationInsurancePartnerEnablementContext {
  actorUserId: string;
  organizationId: string;
  organizationInsurancePartnerEnablementId: string;
}

export interface CreateOrganizationInsurancePartnerEnablementCommand {
  actorUserId: string;
  organizationId: string;
  insurancePartnerId: string;
  tenantPartnerCode?: string | null;
  operationalStatusReferenceValueId: string;
}

export interface UpdateOrganizationInsurancePartnerEnablementCommand extends OrganizationInsurancePartnerEnablementContext {
  version: number;
  tenantPartnerCode?: string | null;
}

export interface ChangeOrganizationInsurancePartnerEnablementStatusCommand extends OrganizationInsurancePartnerEnablementContext {
  version: number;
  operationalStatusReferenceValueId: string;
}

@Injectable()
export class OrganizationInsurancePartnerEnablementUseCases {
  constructor(
    private readonly enablementRepository: OrganizationInsurancePartnerEnablementRepository,
    private readonly partnerRepository: InsurancePartnerRepository,
    private readonly accessService: InsuranceAccessService,
  ) {}

  async get(context: OrganizationInsurancePartnerEnablementContext): Promise<OrganizationInsurancePartnerEnablement> {
    await this.accessService.assertActiveMembership(context.actorUserId, context.organizationId);
    return this.requireEnablement(context.organizationId, context.organizationInsurancePartnerEnablementId);
  }

  async create(command: CreateOrganizationInsurancePartnerEnablementCommand): Promise<OrganizationInsurancePartnerEnablement> {
    await this.accessService.assertActiveMembership(command.actorUserId, command.organizationId);
    if (!(await this.partnerRepository.findActiveById(command.insurancePartnerId))) {
      throw new NotFoundException('Insurance Partner was not found.');
    }
    const enablement = this.rethrowDomainError(() => OrganizationInsurancePartnerEnablement.create({
      organizationInsurancePartnerEnablementId: randomUUID(), organizationId: command.organizationId,
      insurancePartnerId: command.insurancePartnerId, tenantPartnerCode: command.tenantPartnerCode,
      operationalStatusReferenceValueId: command.operationalStatusReferenceValueId, version: 1,
    }));
    await this.enablementRepository.create({ ...enablement.snapshot, actorUserId: command.actorUserId });
    return this.requireEnablement(command.organizationId, enablement.id);
  }

  async update(command: UpdateOrganizationInsurancePartnerEnablementCommand): Promise<OrganizationInsurancePartnerEnablement> {
    await this.accessService.assertActiveMembership(command.actorUserId, command.organizationId);
    await this.requireEnablement(command.organizationId, command.organizationInsurancePartnerEnablementId);
    const patch: Record<string, string | null> =
      command.tenantPartnerCode === undefined
        ? {}
        : { tenantPartnerCode: command.tenantPartnerCode };
    if (Object.keys(patch).length === 0) throw new ConflictException('A tenant Partner Code must be supplied.');
    await this.requireMutation(this.enablementRepository.update(command.organizationId, command.organizationInsurancePartnerEnablementId, command.version, command.actorUserId, patch));
    return this.requireEnablement(command.organizationId, command.organizationInsurancePartnerEnablementId);
  }

  async setStatus(command: ChangeOrganizationInsurancePartnerEnablementStatusCommand): Promise<OrganizationInsurancePartnerEnablement> {
    await this.accessService.assertActiveMembership(command.actorUserId, command.organizationId);
    await this.requireEnablement(command.organizationId, command.organizationInsurancePartnerEnablementId);
    await this.requireMutation(this.enablementRepository.setStatus(command.organizationId, command.organizationInsurancePartnerEnablementId, command.version, command.operationalStatusReferenceValueId, command.actorUserId));
    return this.requireEnablement(command.organizationId, command.organizationInsurancePartnerEnablementId);
  }

  async retire(context: OrganizationInsurancePartnerEnablementContext & { version: number }): Promise<void> {
    await this.accessService.assertActiveMembership(context.actorUserId, context.organizationId);
    await this.requireEnablement(context.organizationId, context.organizationInsurancePartnerEnablementId);
    await this.requireMutation(this.enablementRepository.softDelete(context.organizationId, context.organizationInsurancePartnerEnablementId, context.version, context.actorUserId));
  }

  private async requireEnablement(organizationId: string, enablementId: string): Promise<OrganizationInsurancePartnerEnablement> {
    const enablement = await this.enablementRepository.findActiveById(organizationId, enablementId);
    if (!enablement) throw new NotFoundException('Insurance Partner Enablement was not found in the Organization tenant.');
    return enablement;
  }

  private async requireMutation(operation: Promise<string | null>): Promise<string> {
    const value = await operation;
    if (!value) throw new ConflictException('Insurance Partner Enablement was changed, retired, or no longer available. Refresh and retry.');
    return value;
  }

  private rethrowDomainError<T>(operation: () => T): T {
    try { return operation(); } catch (error) {
      if (error instanceof InsuranceDomainError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
