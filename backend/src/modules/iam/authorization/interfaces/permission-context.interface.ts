/**
 * Represents the current authorization context.
 */
export interface PermissionContext {
  /**
   * Authenticated user ID.
   */
  userId: string;

  /**
   * Organization ID.
   */
  organizationId: string;

  /**
   * Requested permission.
   */
  permission: string;
}