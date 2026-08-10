import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  OrganizationMember,
  OrganizationMemberDomainError,
} from '../domain/organization-member.aggregate';
import { OrganizationMemberRepository } from '../infrastructure/organization-member.repository';

import { OrganizationMemberTenantAccessService } from './organization-member-tenant-access.service';

export interface AddOrganizationMemberCommand {
  actorUserId: string;
  organizationId: string;
  userId: string;
}

export interface OrganizationMemberQuery {
  actorUserId: string;
  organizationId: string;
  organizationMemberId: string;
}

export interface ChangeOrganizationMemberStatusCommand extends OrganizationMemberQuery {
  version: number;
}

/**
 * Application orchestration for the tenant-scoped Organization Member
 * aggregate. IAM authorization is integrated at the API boundary later; this
 * layer enforces membership, tenant scope, lifecycle rules, and concurrency.
 */
@Injectable()
export class OrganizationMemberManagementUseCases {
  constructor(
    private readonly organizationMemberRepository: OrganizationMemberRepository,
    private readonly tenantAccessService: OrganizationMemberTenantAccessService,
  ) {}

  async add(command: AddOrganizationMemberCommand): Promise<OrganizationMember> {
    await this.tenantAccessService.assertActiveMembership(
      command.actorUserId,
      command.organizationId,
    );

    if (!(await this.organizationMemberRepository.organizationIsActive(command.organizationId))) {
      throw new NotFoundException('Organization tenant was not found or is not active.');
    }
    if (!(await this.organizationMemberRepository.userIsActive(command.userId))) {
      throw new NotFoundException('IAM User was not found or is not active.');
    }
    if (
      await this.organizationMemberRepository.findNonDeletedByOrganizationAndUser(
        command.organizationId,
        command.userId,
      )
    ) {
      throw new ConflictException('An active Organization Member already exists for this User.');
    }

    const now = new Date();
    const member = OrganizationMember.create({
      organizationMemberId: randomUUID(),
      organizationId: command.organizationId,
      userId: command.userId,
      status: 'ACTIVE',
      createdBy: command.actorUserId,
      createdAt: now,
      updatedBy: command.actorUserId,
      updatedAt: now,
      isDeleted: false,
      version: 1,
    });

    await this.organizationMemberRepository.create(member);
    return member;
  }

  async list(actorUserId: string, organizationId: string): Promise<OrganizationMember[]> {
    await this.tenantAccessService.assertActiveMembership(actorUserId, organizationId);
    return this.organizationMemberRepository.listActiveForOrganization(organizationId);
  }

  async get(query: OrganizationMemberQuery): Promise<OrganizationMember> {
    await this.tenantAccessService.assertActiveMembership(query.actorUserId, query.organizationId);
    return this.requireCurrentMember(query.organizationId, query.organizationMemberId);
  }

  async suspend(command: ChangeOrganizationMemberStatusCommand): Promise<OrganizationMember> {
    return this.changeLifecycle(command, 'SUSPEND');
  }

  async reactivate(command: ChangeOrganizationMemberStatusCommand): Promise<OrganizationMember> {
    return this.changeLifecycle(command, 'REACTIVATE');
  }

  async retire(command: ChangeOrganizationMemberStatusCommand): Promise<OrganizationMember> {
    return this.changeLifecycle(command, 'RETIRE');
  }

  private async changeLifecycle(
    command: ChangeOrganizationMemberStatusCommand,
    action: 'SUSPEND' | 'REACTIVATE' | 'RETIRE',
  ): Promise<OrganizationMember> {
    await this.tenantAccessService.assertActiveMembership(
      command.actorUserId,
      command.organizationId,
    );
    const member = await this.requireCurrentMember(
      command.organizationId,
      command.organizationMemberId,
    );

    try {
      const changedAt = new Date();
      if (action === 'SUSPEND') member.suspend(command.version, command.actorUserId, changedAt);
      if (action === 'REACTIVATE') member.reactivate(command.version, command.actorUserId, changedAt);
      if (action === 'RETIRE') member.retire(command.version, command.actorUserId, changedAt);
    } catch (error) {
      this.rethrowDomainError(error);
    }

    const persistedId = await this.organizationMemberRepository.persistLifecycleMutation(
      member,
      command.version,
    );
    if (!persistedId) {
      throw new ConflictException(
        'Organization Member was changed, retired, or no longer available. Refresh and retry.',
      );
    }
    return member;
  }

  private async requireCurrentMember(
    organizationId: string,
    organizationMemberId: string,
  ): Promise<OrganizationMember> {
    const member = await this.organizationMemberRepository.findNonDeletedById(
      organizationId,
      organizationMemberId,
    );
    if (!member) {
      throw new NotFoundException('Organization Member was not found in the Organization tenant.');
    }
    return member;
  }

  private rethrowDomainError(error: unknown): never | void {
    if (!(error instanceof OrganizationMemberDomainError)) throw error;
    if (error.message.includes('version is stale')) {
      throw new ConflictException(error.message);
    }
    if (error.message.includes('does not belong')) {
      throw new ForbiddenException(error.message);
    }
    throw new BadRequestException(error.message);
  }
}
