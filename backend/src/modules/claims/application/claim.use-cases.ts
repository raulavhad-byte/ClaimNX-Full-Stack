import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ClaimDomainError } from '../domain/claim-domain.error';
import { Claim } from '../domain/claim.aggregate';
import { ClaimLifecycleStatusCode } from '../domain/claim-product.strategy';
import { ClaimRepository } from '../infrastructure/claim.repository';
import { ClaimAccessService } from './claim-access.service';
import { ClaimReferenceDataService } from './claim-reference-data.service';

export interface ClaimTenantContext { actorUserId: string; organizationId: string; hospitalId: string; }
export interface CreateClaimCommand extends ClaimTenantContext {
  patientId?: string | null; claimProductReferenceValueId: string; claimTypeReferenceValueId: string;
  draftLifecycleStatusReferenceValueId: string; hospitalInsurancePartnerIntegrationId?: string | null;
  currencyCode: string; totalClaimedAmount: number; authorizationReference?: string | null;
}
export interface TransitionClaimCommand extends ClaimTenantContext {
  claimId: string; expectedVersion: number; targetLifecycleStatusReferenceValueId: string; transitionReason: string;
}
export interface CreateClaimAuthorizationCommand extends ClaimTenantContext {
  claimId: string; authorizationTypeReferenceValueId: string; authorizationStatusReferenceValueId: string;
  authorizationNumber?: string | null; approvedAmount?: number | null; validFrom?: string | null; validUntil?: string | null;
}
export interface CreateClaimQueryCommand extends ClaimTenantContext {
  claimId: string; queryTypeReferenceValueId: string; queryStatusReferenceValueId: string;
  payerQueryReference?: string | null; queryText: string; dueAt?: string | null;
}
export interface CreateClaimSubmissionIntentCommand extends ClaimTenantContext {
  claimId: string; hospitalInsurancePartnerIntegrationId: string; channelReferenceValueId: string; submissionStatusReferenceValueId: string;
}
export interface ListClaimsQuery extends ClaimTenantContext {
  claimProductReferenceValueId?: string;
  lifecycleStatusReferenceValueId?: string;
}

@Injectable()
export class ClaimUseCases {
  constructor(
    private readonly repository: ClaimRepository,
    private readonly access: ClaimAccessService,
    private readonly referenceData: ClaimReferenceDataService,
  ) {}

  async create(command: CreateClaimCommand): Promise<Claim> {
    await this.assertAccess(command);
    const [, draft] = await Promise.all([
      this.referenceData.requireClaimProduct(command.claimProductReferenceValueId),
      this.referenceData.requireLifecycleStatus(command.draftLifecycleStatusReferenceValueId),
      this.referenceData.requireCode(command.claimTypeReferenceValueId, 'CLAIM_TYPE'),
    ]);
    if (draft !== 'DRAFT') throw new BadRequestException('A new Claim must start in DRAFT lifecycle status.');
    if (!Number.isFinite(command.totalClaimedAmount) || command.totalClaimedAmount < 0) {
      throw new BadRequestException('Total claimed amount must be a non-negative number.');
    }
    if (!/^[A-Za-z]{3}$/.test(command.currencyCode.trim())) throw new BadRequestException('Currency code must contain exactly three letters.');
    const claimId = randomUUID();
    await this.repository.create({ ...command, claimId, claimStatusHistoryId: randomUUID(), currencyCode: command.currencyCode.toUpperCase() });
    return this.requireClaim(command.organizationId, command.hospitalId, claimId);
  }

  async get(context: ClaimTenantContext & { claimId: string }): Promise<Claim> {
    await this.assertAccess(context);
    return this.requireClaim(context.organizationId, context.hospitalId, context.claimId);
  }

  async list(query: ListClaimsQuery) {
    await this.assertAccess(query);
    return this.repository.listActive(query);
  }

  async transition(command: TransitionClaimCommand): Promise<Claim> {
    await this.assertAccess(command);
    const claim = await this.requireClaim(command.organizationId, command.hospitalId, command.claimId);
    const code = await this.referenceData.requireLifecycleStatus(command.targetLifecycleStatusReferenceValueId);
    const claimStatusHistoryId = randomUUID();
    this.rethrowDomainError(() => claim.transition(
      { referenceValueId: command.targetLifecycleStatusReferenceValueId, code }, command.actorUserId,
      command.expectedVersion, claimStatusHistoryId, command.transitionReason,
    ));
    const persisted = await this.repository.transitionLifecycle({ ...command, claimStatusHistoryId });
    if (!persisted) throw new ConflictException('Claim was changed, retired, or is outside the tenant scope. Refresh and retry.');
    return this.requireClaim(command.organizationId, command.hospitalId, command.claimId);
  }

  async createAuthorization(command: CreateClaimAuthorizationCommand): Promise<string> {
    await this.assertAccess(command); await this.requireClaim(command.organizationId, command.hospitalId, command.claimId);
    await Promise.all([
      this.referenceData.requireCode(command.authorizationTypeReferenceValueId, 'CLAIM_AUTHORIZATION_TYPE'),
      this.referenceData.requireCode(command.authorizationStatusReferenceValueId, 'CLAIM_AUTHORIZATION_STATUS'),
    ]);
    if (command.approvedAmount !== undefined && command.approvedAmount !== null && command.approvedAmount < 0) throw new BadRequestException('Authorization approved amount cannot be negative.');
    return this.requireCreated(await this.repository.createAuthorization({ ...command, claimAuthorizationId: randomUUID() }));
  }

  async createQuery(command: CreateClaimQueryCommand): Promise<string> {
    await this.assertAccess(command); await this.requireClaim(command.organizationId, command.hospitalId, command.claimId);
    await Promise.all([
      this.referenceData.requireCode(command.queryTypeReferenceValueId, 'CLAIM_QUERY_TYPE'),
      this.referenceData.requireCode(command.queryStatusReferenceValueId, 'CLAIM_QUERY_STATUS'),
    ]);
    if (!command.queryText?.trim()) throw new BadRequestException('Claim Query text is required.');
    return this.requireCreated(await this.repository.createQuery({ ...command, claimQueryId: randomUUID() }));
  }

  async createSubmissionIntent(command: CreateClaimSubmissionIntentCommand): Promise<string> {
    await this.assertAccess(command); await this.requireClaim(command.organizationId, command.hospitalId, command.claimId);
    await Promise.all([
      this.referenceData.requireCode(command.channelReferenceValueId, 'HOSPITAL_PAYER_INTEGRATION_CHANNEL'),
      this.referenceData.requireCode(command.submissionStatusReferenceValueId, 'CLAIM_SUBMISSION_STATUS'),
    ]);
    return this.requireCreated(await this.repository.createSubmissionIntent({ ...command, claimSubmissionIntentId: randomUUID() }));
  }

  private async assertAccess(context: ClaimTenantContext): Promise<void> {
    await this.access.assertTenantHospitalAccess(context.actorUserId, context.organizationId, context.hospitalId);
  }

  private async requireClaim(organizationId: string, hospitalId: string, claimId: string): Promise<Claim> {
    const claim = await this.repository.findActiveById(organizationId, hospitalId, claimId);
    if (!claim) throw new NotFoundException('Claim was not found in the Hospital tenant scope.');
    return claim;
  }

  private requireCreated(id: string | null): string {
    if (!id) throw new ConflictException('Claim was changed, retired, or is outside the tenant scope. Refresh and retry.');
    return id;
  }

  private rethrowDomainError<T>(operation: () => T): T {
    try { return operation(); } catch (error) {
      if (error instanceof ClaimDomainError) {
        if (error.message.toLowerCase().includes('version conflict')) {
          throw new ConflictException('Claim was changed by another request. Refresh and retry.');
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
