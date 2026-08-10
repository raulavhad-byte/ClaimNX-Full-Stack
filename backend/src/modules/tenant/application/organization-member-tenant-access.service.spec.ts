import { ForbiddenException } from '@nestjs/common';

import { OrganizationMember } from '../domain/organization-member.aggregate';
import { OrganizationMemberRepository } from '../infrastructure/organization-member.repository';
import { OrganizationMemberTenantAccessService } from './organization-member-tenant-access.service';

const activeMember = OrganizationMember.create({
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

describe('OrganizationMemberTenantAccessService', () => {
  it('permits the matching active Organization Member', async () => {
    const repository = {
      findActiveByOrganizationAndUser: jest.fn().mockResolvedValue(activeMember),
    } as unknown as OrganizationMemberRepository;
    const service = new OrganizationMemberTenantAccessService(repository);

    await expect(service.assertActiveMembership('user-1', 'organization-1')).resolves.toBeUndefined();
  });

  it('denies a user that has no active membership in the requested tenant', async () => {
    const repository = {
      findActiveByOrganizationAndUser: jest.fn().mockResolvedValue(null),
    } as unknown as OrganizationMemberRepository;
    const service = new OrganizationMemberTenantAccessService(repository);

    await expect(service.assertActiveMembership('user-1', 'organization-2')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
