import { OrganizationMember } from '../domain/organization-member.aggregate';
import { OrganizationMemberManagementUseCases } from '../application/organization-member-management.use-cases';

import { OrganizationMemberV1Controller } from './organization-member-v1.controller';

const member = OrganizationMember.create({
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

describe('OrganizationMemberV1Controller', () => {
  it('passes the authenticated identity and route tenant to the add use case', async () => {
    const useCases = {
      add: jest.fn().mockResolvedValue(member),
    } as unknown as OrganizationMemberManagementUseCases;
    const controller = new OrganizationMemberV1Controller(useCases);

    await expect(
      controller.add('organization-1', 'admin-1', { userId: 'user-1' }),
    ).resolves.toMatchObject({
      organizationMemberId: 'member-1',
      organizationId: 'organization-1',
      userId: 'user-1',
    });

    expect(useCases.add).toHaveBeenCalledWith({
      actorUserId: 'admin-1',
      organizationId: 'organization-1',
      userId: 'user-1',
    });
  });

  it('passes the tenant boundary and version to lifecycle use cases', async () => {
    const useCases = {
      suspend: jest.fn().mockResolvedValue(member),
    } as unknown as OrganizationMemberManagementUseCases;
    const controller = new OrganizationMemberV1Controller(useCases);

    await controller.suspend('organization-1', 'member-1', 'admin-1', { version: 1 });

    expect(useCases.suspend).toHaveBeenCalledWith({
      actorUserId: 'admin-1',
      organizationId: 'organization-1',
      organizationMemberId: 'member-1',
      version: 1,
    });
  });
});
