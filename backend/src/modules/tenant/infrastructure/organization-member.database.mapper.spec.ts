import { OrganizationMember } from '../domain/organization-member.aggregate';

import { OrganizationMemberDatabaseMapper } from './organization-member.database.mapper';

const persistenceRow = {
  id: 'member-1',
  organization_id: 'organization-1',
  user_id: 'user-1',
  status: 'ACTIVE' as const,
  created_by: 'admin-1',
  created_at: '2026-07-30T10:00:00.000Z',
  updated_by: 'admin-1',
  updated_at: '2026-07-30T10:00:00.000Z',
  deleted_by: null,
  deleted_at: null,
  is_deleted: false,
  version: 1,
};

describe('OrganizationMemberDatabaseMapper', () => {
  it('rehydrates an Organization Member without using legacy employee metadata', () => {
    const member = OrganizationMemberDatabaseMapper.toAggregate(persistenceRow);

    expect(member.snapshot).toMatchObject({
      organizationMemberId: 'member-1',
      organizationId: 'organization-1',
      userId: 'user-1',
      status: 'ACTIVE',
      isDeleted: false,
      version: 1,
    });
  });

  it('maps a newly-created aggregate to the exact persistence contract', () => {
    const member = OrganizationMember.create({
      organizationMemberId: 'member-2',
      organizationId: 'organization-1',
      userId: 'user-2',
      status: 'ACTIVE',
      createdBy: 'admin-1',
      createdAt: new Date('2026-07-30T11:00:00.000Z'),
      updatedBy: 'admin-1',
      updatedAt: new Date('2026-07-30T11:00:00.000Z'),
      isDeleted: false,
      version: 1,
    });

    expect(OrganizationMemberDatabaseMapper.toInsertRow(member)).toEqual({
      ...persistenceRow,
      id: 'member-2',
      user_id: 'user-2',
      created_at: '2026-07-30T11:00:00.000Z',
      updated_at: '2026-07-30T11:00:00.000Z',
    });
  });
});
