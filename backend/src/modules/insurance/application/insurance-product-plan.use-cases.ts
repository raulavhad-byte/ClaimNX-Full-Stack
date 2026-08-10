import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { InsuranceDomainError, InsuranceProductPlan } from '../domain/insurance-partner.aggregate';
import { InsurancePartnerRepository } from '../infrastructure/insurance-partner.repository';
import { InsuranceProductPlanRepository } from '../infrastructure/insurance-product-plan.repository';
import { InsuranceAccessService } from './insurance-access.service';

export interface InsuranceProductPlanContext {
  actorUserId: string;
  insurancePartnerId: string;
  insuranceProductPlanId: string;
}

export interface CreateInsuranceProductPlanCommand {
  actorUserId: string;
  insurancePartnerId: string;
  planCode: string;
  planName: string;
  description?: string | null;
  operationalStatusReferenceValueId: string;
}

export interface UpdateInsuranceProductPlanCommand extends InsuranceProductPlanContext {
  version: number;
  planName?: string;
  description?: string | null;
}

export interface ChangeInsuranceProductPlanStatusCommand extends InsuranceProductPlanContext {
  version: number;
  operationalStatusReferenceValueId: string;
}

@Injectable()
export class InsuranceProductPlanUseCases {
  constructor(
    private readonly partnerRepository: InsurancePartnerRepository,
    private readonly planRepository: InsuranceProductPlanRepository,
    private readonly accessService: InsuranceAccessService,
  ) {}

  async get(context: InsuranceProductPlanContext): Promise<InsuranceProductPlan> {
    await this.accessService.assertActiveUser(context.actorUserId);
    return this.requirePlan(context.insurancePartnerId, context.insuranceProductPlanId);
  }

  async create(command: CreateInsuranceProductPlanCommand): Promise<InsuranceProductPlan> {
    await this.accessService.assertActiveUser(command.actorUserId);
    await this.requirePartner(command.insurancePartnerId);
    const plan = this.rethrowDomainError(() => InsuranceProductPlan.create({
      insuranceProductPlanId: randomUUID(), insurancePartnerId: command.insurancePartnerId,
      planCode: command.planCode, planName: command.planName, description: command.description,
      operationalStatusReferenceValueId: command.operationalStatusReferenceValueId, version: 1,
    }));
    await this.planRepository.create({ ...plan.snapshot, actorUserId: command.actorUserId });
    return this.requirePlan(command.insurancePartnerId, plan.id);
  }

  async update(command: UpdateInsuranceProductPlanCommand): Promise<InsuranceProductPlan> {
    await this.accessService.assertActiveUser(command.actorUserId);
    await this.requirePlan(command.insurancePartnerId, command.insuranceProductPlanId);
    const patch = pick(command, ['planName', 'description']);
    if (Object.keys(patch).length === 0) throw new ConflictException('At least one Product Plan attribute must be supplied.');
    await this.requireMutation(
      this.planRepository.update(command.insurancePartnerId, command.insuranceProductPlanId, command.version, command.actorUserId, patch),
    );
    return this.requirePlan(command.insurancePartnerId, command.insuranceProductPlanId);
  }

  async setStatus(command: ChangeInsuranceProductPlanStatusCommand): Promise<InsuranceProductPlan> {
    await this.accessService.assertActiveUser(command.actorUserId);
    await this.requirePlan(command.insurancePartnerId, command.insuranceProductPlanId);
    await this.requireMutation(
      this.planRepository.setStatus(command.insurancePartnerId, command.insuranceProductPlanId, command.version, command.operationalStatusReferenceValueId, command.actorUserId),
    );
    return this.requirePlan(command.insurancePartnerId, command.insuranceProductPlanId);
  }

  async retire(context: InsuranceProductPlanContext & { version: number }): Promise<void> {
    await this.accessService.assertActiveUser(context.actorUserId);
    await this.requirePlan(context.insurancePartnerId, context.insuranceProductPlanId);
    await this.requireMutation(
      this.planRepository.softDelete(context.insurancePartnerId, context.insuranceProductPlanId, context.version, context.actorUserId),
    );
  }

  private async requirePartner(insurancePartnerId: string): Promise<void> {
    if (!(await this.partnerRepository.findActiveById(insurancePartnerId))) {
      throw new NotFoundException('Insurance Partner was not found.');
    }
  }

  private async requirePlan(partnerId: string, planId: string): Promise<InsuranceProductPlan> {
    const plan = await this.planRepository.findActiveById(partnerId, planId);
    if (!plan) throw new NotFoundException('Insurance Product Plan was not found for the Insurance Partner.');
    return plan;
  }

  private async requireMutation(operation: Promise<string | null>): Promise<string> {
    const value = await operation;
    if (!value) throw new ConflictException('Insurance Product Plan was changed, retired, or no longer available. Refresh and retry.');
    return value;
  }

  private rethrowDomainError<T>(operation: () => T): T {
    try { return operation(); } catch (error) {
      if (error instanceof InsuranceDomainError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}

function pick<T extends object>(source: T, fields: readonly string[]): Record<string, string | null> {
  return Object.fromEntries(
    fields.filter((field) => Object.prototype.hasOwnProperty.call(source, field) && (source as Record<string, unknown>)[field] !== undefined)
      .map((field) => [field, (source as Record<string, string | null>)[field]]),
  );
}
