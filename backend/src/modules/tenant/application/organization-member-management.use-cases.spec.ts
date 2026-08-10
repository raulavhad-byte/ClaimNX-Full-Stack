import { ConflictException, NotFoundException } from '@nestjs/common';

import { OrganizationMember } from '../domain/organization-member.aggregate';
import { OrganizationMemberRepository } from '../infrastructure/organization-member.repository';
import { OrganizationMemberTenantAccessService } from './organization-member-tenant-access.service';
import { OrganizationMemberManagementUseCases } from './organization-member-management.use-cases';

const createMember = () =>
  OrganizationMember.create({
    organizationMemberId: 'member-1',
    organizationId: 'organization-1',
    userId: 'user-1',
    status: 'ACTIVE',
    createdBy: 'admin-1',
    createdAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedBy: 'admin-1',
    updatedAt: new Date('2026-07-30T10:00:00.000Z'),
    isDeleted: false,
    version: 1,
  });

describe('OrganizationMemberManagementUseCases', () => {
  const access = {
    assertActiveMembership: jest.fn().mockResolvedValue(undefined),
  } as unknown as OrganizationMemberTenantAccessService;

  it('adds an active membership only for an existing active User and Organization', async () => {
    const repository = {
      organizationIsActive: jest.fn().mockResolvedValue(true),
      userIsActive: jest.fn().mockResolvedValue(true),
      findNonDeletedByOrganizationAndUser: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue('member-2'),
    } as unknown as OrganizationMemberRepository;
    const useCases = new OrganizationMemberManagementUseCases(repository, access);

    const result = await useCases.add({
      actorUserId: 'admin-1',
      organizationId: 'organization-1',
      userId: 'user-2',
    });

    expect(result.snapshot).toMatchObject({
      organizationId: 'organization-1',
      userId: 'user-2',
      status: 'ACTIVE',
      version: 1,
    });
    expect(repository.create).toHaveBeenCalledWith(result);
  });

  it('rejects a duplicate current membership before persistence', async () => {
    const repository = {
      organizationIsActive: jest.fn().mockResolvedValue(true),
      userIsActive: jest.fn().mockResolvedValue(true),
      findNonDeletedByOrganizationAndUser: jest.fn().mockResolvedValue(createMember()),
    } as unknown as OrganizationMemberRepository;
    const useCases = new OrganizationMemberManagementUseCases(repository, access);

    await expect(
      useCases.add({ actorUserId: 'admin-1', organizationId: 'organization-1', userId: 'user-1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('increments the version for a valid lifecycle change', async () => {
    const member = createMember();
    const repository = {
      findNonDeletedById: jest.fn().mockResolvedValue(member),
      persistLifecycleMutation: jest.fn().mockResolvedValue('member-1'),
    } as unknown as OrganizationMemberRepository;
    const useCases = new OrganizationMemberManagementUseCases(repository, access);

    const result = await useCases.suspend({
      actorUserId: 'admin-1',
      organizationId: 'organization-1',
      organizationMemberId: 'member-1',
      version: 1,
    });

    expect(result.snapshot).toMatchObject({ status: 'SUSPENDED', version: 2 });
    expect(repository.persistLifecycleMutation).toHaveBeenCalledWith(result, 1);
  });

  it('maps a stale aggregate version to a conflict', async () => {
    const repository = {
      findNonDeletedById: jest.fn().mockResolvedValue(createMember()),
    } as unknown as OrganizationMemberRepository;
    const useCases = new OrganizationMemberManagementUseCases(repository, access);

    await expect(
      useCases.suspend({
        actorUserId: 'admin-1',
        organizationId: 'organization-1',
        organizationMemberId: 'member-1',
        version: 2,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('does not reveal an Organization Member outside the requested tenant', async () => {
    const repository = {
      findNonDeletedById: jest.fn().mockResolvedValue(null),
    } as unknown as OrganizationMemberRepository;
    const useCases = new OrganizationMemberManagementUseCases(repository, access);

    await expect(
      useCases.get({
        actorUserId: 'admin-1',
        organizationId: 'other-organization',
        organizationMemberId: 'member-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
