import {
  PermissionAction,
  PermissionCategory,
  PermissionDefinition,
  PermissionFactory,
} from '../shared';

const PERMISSION_PERMISSION_BASE = {
  module: 'Identity & Access',
  subModule: 'Permissions',
  resource: 'Permission',
  category: PermissionCategory.ADMINISTRATION,
  scopeRequired: false,
} as const;

export const PermissionsPermissions: PermissionDefinition[] = [
  // ============================
  // Read
  // ============================

  PermissionFactory.build(
    {
      ...PERMISSION_PERMISSION_BASE,
      code: 'permissions.read',
      name: 'Read Permissions',
      description: 'Allows viewing permissions.',
      displayOrder: 10,
    },
    PermissionAction.READ,
  ),

  // ============================
  // Administration
  // ============================

  PermissionFactory.build(
    {
      ...PERMISSION_PERMISSION_BASE,
      code: 'permissions.manage',
      name: 'Manage Permissions',
      description: 'Allows managing system permissions.',
      displayOrder: 20,
    },
    PermissionAction.MANAGE,
  ),
];