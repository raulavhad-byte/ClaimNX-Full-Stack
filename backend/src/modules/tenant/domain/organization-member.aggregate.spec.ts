import {
  OrganizationMember,
  OrganizationMemberDomainError,
  OrganizationMemberProps,
} from './organization-member.aggregate';

const actorUserId = 'user-1';
const organizationId = 'organization-1';

const createProps = (): OrganizationMemberProps => ({
  organizationMemberId: 'organization-member-1',
  organizationId,
  userId: actorUserId,
  status: 'ACTIVE',
  createdBy: actorUserId,
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  updatedBy: actorUserId,
  updatedAt: new Date('2026-07-30T10:00:00.000Z'),
  isDeleted: false,
  version: 1,
});

describe('OrganizationMember Aggregate', () => {
  it('creates an active non-deleted Organization Member at version 1', () => {
    const member = OrganizationMember.create(createProps());

    expect(member.isActive()).toBe(true);
    expect(member.snapshot.version).toBe(1);
  });

  it('rejects a new Organization Member that is not active or version 1', () => {
    expect(() => OrganizationMember.create({ ...createProps(), status: 'SUSPENDED' })).toThrow(
      'New Organization Member must be created as ACTIVE.',
    );
    expect(() => OrganizationMember.create({ ...createProps(), version: 2 })).toThrow(
      'New Organization Member version must start at 1.',
    );
  });

  it('allows tenant access only for the matching active Organization and User', () => {
    const member = OrganizationMember.create(createProps());

    expect(() => member.assertTenantAccess(organizationId, actorUserId)).not.toThrow();
    expect(() => member.assertTenantAccess('organization-2', actorUserId)).toThrow(
      OrganizationMemberDomainError,
    );
    expect(() => member.assertTenantAccess(organizationId, 'user-2')).toThrow(
      OrganizationMemberDomainError,
    );
  });

  it('suspends and reactivates with audit and version updates', () => {
    const member = OrganizationMember.create(createProps());
    const suspendedAt = new Date('2026-07-30T11:00:00.000Z');

    member.suspend(1, 'admin-1', suspendedAt);
    expect(member.snapshot.status).toBe('SUSPENDED');
    expect(member.snapshot.updatedBy).toBe('admin-1');
    expect(member.snapshot.version).toBe(2);
    expect(() => member.assertTenantAccess(organizationId, actorUserId)).toThrow(
      'Only an active, non-deleted Organization Member can access tenant data.',
    );

    member.reactivate(2, 'admin-1', new Date('2026-07-30T12:00:00.000Z'));
    expect(member.snapshot.status).toBe('ACTIVE');
    expect(member.snapshot.version).toBe(3);
  });

  it('rejects stale updates and invalid lifecycle transitions', () => {
    const member = OrganizationMember.create(createProps());

    expect(() => member.suspend(2, 'admin-1', new Date())).toThrow('Organization Member version is stale.');
    expect(() => member.reactivate(1, 'admin-1', new Date())).toThrow(
      'Only a SUSPENDED Organization Member can be reactivated.',
    );
  });

  it('retires a member and prevents all later mutations', () => {
    const member = OrganizationMember.create(createProps());

    member.retire(1, 'admin-1', new Date('2026-07-30T13:00:00.000Z'));

    expect(member.isRetired()).toBe(true);
    expect(member.isActive()).toBe(false);
    expect(member.snapshot.deletedBy).toBe('admin-1');
    expect(member.snapshot.version).toBe(2);
    expect(() => member.reactivate(2, 'admin-1', new Date())).toThrow(
      'A retired Organization Member cannot be changed.',
    );
  });

  it('rejects inconsistent soft-delete state during rehydration', () => {
    expect(() =>
      OrganizationMember.rehydrate({
        ...createProps(),
        isDeleted: true,
      }),
    ).toThrow('Organization Member soft-delete timestamp and flag must agree.');
  });
});
