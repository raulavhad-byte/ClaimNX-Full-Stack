import {
  AuthenticationPermissions,
  DashboardPermissions,
  PermissionsPermissions,
  RolePermissions,
  UserPermissions,
} from '../permissions';

import { PermissionDefinition } from '../shared';

/**
 * Master catalog containing every permission
 * supported by the ClaimNX platform.
 *
 * This catalog is the single source of truth for:
 *
 * - Database seed runner
 * - Permission synchronization
 * - Default role creation
 * - Permission validation
 * - Future authorization metadata
 */
export const PermissionCatalog: PermissionDefinition[] = [
  ...DashboardPermissions,

  ...AuthenticationPermissions,

  ...PermissionsPermissions,

  ...RolePermissions,

  ...UserPermissions,
];