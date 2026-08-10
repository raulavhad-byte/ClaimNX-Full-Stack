import { PermissionAction } from './permission-action.enum';
import { PermissionCategory } from './permission-category.enum';

export interface PermissionDefinition {
  /**
   * Top-level functional area.
   * Examples:
   * Identity & Access
   * Organization
   * Revenue Cycle
   * Analytics
   * Platform
   */
  module: string;

  /**
   * Business module.
   * Examples:
   * Users
   * Roles
   * Claims
   * Hospitals
   */
  subModule: string;

  /**
   * Business resource.
   * Examples:
   * User
   * Claim
   * Hospital
   */
  resource: string;

  /**
   * Permission action.
   */
  action: PermissionAction;

  /**
   * Unique permission code.
   * Example:
   * users.view
   * claims.submit
   */
  code: string;

  /**
   * Display name.
   */
  name: string;

  /**
   * Description.
   */
  description: string;

  /**
   * Permission category.
   */
  category: PermissionCategory;

  /**
   * Indicates whether permission should
   * respect Organization / Hospital scope.
   */
  scopeRequired: boolean;

  /**
   * System permission.
   */
  isSystem: boolean;

  /**
   * UI display order.
   */
  displayOrder: number;

  /**
   * Feature enabled.
   */
  isActive: boolean;

}