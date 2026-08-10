import {
  PermissionAction,
  PermissionCategory,
  PermissionDefinition,
  PermissionFactory,
} from '../shared';

const USER_PERMISSION_BASE = {
  module: 'Identity & Access',
  subModule: 'Users',
  resource: 'User',
  category: PermissionCategory.ADMINISTRATION,
  scopeRequired: false,
} as const;

export const UserPermissions: PermissionDefinition[] = [
  // ============================
  // Read
  // ============================

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.view',
      name: 'View Users',
      description: 'Allows viewing user details.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 10,
    },
    PermissionAction.READ,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.list',
      name: 'List Users',
      description: 'Allows listing users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 20,
    },
    PermissionAction.READ,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.search',
      name: 'Search Users',
      description: 'Allows searching users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 30,
    },
    PermissionAction.READ,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.export',
      name: 'Export Users',
      description: 'Allows exporting users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 40,
    },
    PermissionAction.EXPORT,
  ),

  // ============================
  // Write
  // ============================

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.create',
      name: 'Create User',
      description: 'Allows creating users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 50,
    },
    PermissionAction.CREATE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.edit',
      name: 'Edit User',
      description: 'Allows editing users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 60,
    },
    PermissionAction.UPDATE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.delete',
      name: 'Delete User',
      description: 'Allows deleting users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 70,
    },
    PermissionAction.DELETE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.restore',
      name: 'Restore User',
      description: 'Allows restoring deleted users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 80,
    },
    PermissionAction.RESTORE,
  ),

  // ============================
  // Administration
  // ============================

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.manage',
      name: 'Manage Users',
      description: 'Allows full user management.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 90,
    },
    PermissionAction.MANAGE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.invite',
      name: 'Invite Users',
      description: 'Allows inviting new users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 100,
    },
    PermissionAction.CREATE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.activate',
      name: 'Activate Users',
      description: 'Allows activating user accounts.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 110,
    },
    PermissionAction.UPDATE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.deactivate',
      name: 'Deactivate Users',
      description: 'Allows deactivating user accounts.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 120,
    },
    PermissionAction.UPDATE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.unlock',
      name: 'Unlock Users',
      description: 'Allows unlocking user accounts.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 130,
    },
    PermissionAction.UPDATE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.reset-password',
      name: 'Reset User Password',
      description: 'Allows resetting user passwords.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 140,
    },
    PermissionAction.UPDATE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.force-password-change',
      name: 'Force Password Change',
      description: 'Allows forcing password change on next login.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 150,
    },
    PermissionAction.UPDATE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.force-logout',
      name: 'Force Logout',
      description: 'Allows terminating all active user sessions.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 160,
    },
    PermissionAction.DELETE,
  ),

  PermissionFactory.build(
    {
      ...USER_PERMISSION_BASE,
      code: 'users.assign-roles',
      name: 'Assign Roles',
      description: 'Allows assigning roles to users.',
      category: PermissionCategory.ADMINISTRATION,
      displayOrder: 170,
    },
    PermissionAction.MANAGE,
  ),
];