import {
  PermissionAction,
  PermissionCategory,
  PermissionDefinition,
  PermissionFactory,
} from '../shared';

const AUTH_PERMISSION_BASE = {
  module: 'Identity & Access',
  subModule: 'Authentication',
  resource: 'Authentication',
  category: PermissionCategory.ADMINISTRATION,
  scopeRequired: false,
} as const;

const SESSION_PERMISSION_BASE = {
  module: 'Identity & Access',
  subModule: 'Authentication',
  resource: 'Session',
  category: PermissionCategory.ADMINISTRATION,
  scopeRequired: false,
} as const;

export const AuthenticationPermissions: PermissionDefinition[] = [
  // ============================
  // Authentication
  // ============================

  PermissionFactory.build(
    {
      ...AUTH_PERMISSION_BASE,
      code: 'auth.view',
      name: 'View Authentication',
      description: 'Allows viewing authentication information.',
      displayOrder: 10,
    },
    PermissionAction.READ,
  ),

  PermissionFactory.build(
    {
      ...AUTH_PERMISSION_BASE,
      code: 'auth.manage',
      name: 'Manage Authentication',
      description: 'Allows managing authentication settings.',
      displayOrder: 20,
    },
    PermissionAction.MANAGE,
  ),

  // ============================
  // Sessions
  // ============================

  PermissionFactory.build(
    {
      ...SESSION_PERMISSION_BASE,
      code: 'sessions.view',
      name: 'View Sessions',
      description: 'Allows viewing user sessions.',
      displayOrder: 30,
    },
    PermissionAction.READ,
  ),

  PermissionFactory.build(
    {
      ...SESSION_PERMISSION_BASE,
      code: 'sessions.revoke',
      name: 'Revoke Sessions',
      description: 'Allows revoking active user sessions.',
      displayOrder: 40,
    },
    PermissionAction.DELETE,
  ),

  // ============================
  // Impersonation
  // ============================

  PermissionFactory.build(
    {
      ...SESSION_PERMISSION_BASE,
      code: 'users.impersonate',
      name: 'Impersonate User',
      description: 'Allows administrators to impersonate another user.',
      displayOrder: 50,
    },
    PermissionAction.IMPERSONATE,
  ),
];