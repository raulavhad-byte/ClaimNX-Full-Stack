import {
  PermissionAction,
  PermissionCategory,
  PermissionDefinition,
  PermissionFactory,
} from '../shared';

const ROLE_PERMISSION_BASE = {
  module: 'Identity & Access',
  subModule: 'Roles',
  resource: 'Role',
  category: PermissionCategory.ADMINISTRATION,
  scopeRequired: false,
} as const;

export const RolePermissions: PermissionDefinition[] = [
  // ============================
  // Read
  // ============================

  PermissionFactory.build(
    {
      ...ROLE_PERMISSION_BASE,
      code: 'roles.read',
      name: 'Read Roles',
      description: 'Allows viewing roles.',
      displayOrder: 10,
    },
    PermissionAction.READ,
  ),

  // ============================
  // Write
  // ============================

  PermissionFactory.build(
    {
      ...ROLE_PERMISSION_BASE,
      code: 'roles.create',
      name: 'Create Role',
      description: 'Allows creating roles.',
      displayOrder: 20,
    },
    PermissionAction.CREATE,
  ),

  PermissionFactory.build(
    {
      ...ROLE_PERMISSION_BASE,
      code: 'roles.update',
      name: 'Update Role',
      description: 'Allows updating roles.',
      displayOrder: 30,
    },
    PermissionAction.UPDATE,
  ),

  PermissionFactory.build(
    {
      ...ROLE_PERMISSION_BASE,
      code: 'roles.delete',
      name: 'Delete Role',
      description: 'Allows deleting roles.',
      displayOrder: 40,
    },
    PermissionAction.DELETE,
  ),

  PermissionFactory.build(
    {
      ...ROLE_PERMISSION_BASE,
      code: 'roles.restore',
      name: 'Restore Role',
      description: 'Allows restoring deleted roles.',
      displayOrder: 50,
    },
    PermissionAction.RESTORE,
  ),

  // ============================
  // Administration
  // ============================

  PermissionFactory.build(
    {
      ...ROLE_PERMISSION_BASE,
      code: 'roles.manage',
      name: 'Manage Roles',
      description: 'Allows full role management.',
      displayOrder: 60,
    },
    PermissionAction.MANAGE,
  ),

  PermissionFactory.build(
    {
      ...ROLE_PERMISSION_BASE,
      code: 'roles.assign-permissions',
      name: 'Assign Permissions',
      description: 'Allows assigning permissions to roles.',
      displayOrder: 70,
    },
    PermissionAction.ASSIGN,
  ),
];