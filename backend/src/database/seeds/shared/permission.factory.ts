import { PermissionAction } from './permission-action.enum';
import { PermissionDefinition } from './permission-definition.interface';
import { PermissionOptions } from './permission-options.interface';

export class PermissionFactory {
  /**
   * Builds a complete PermissionDefinition.
   */
  static build(
    options: PermissionOptions,
    action: PermissionAction,
  ): PermissionDefinition {
    return {
      module: options.module,

      subModule: options.subModule,

      resource: options.resource,

      action,

      code: options.code,

      name: options.name,

      description: options.description,

      category: options.category,

      scopeRequired: options.scopeRequired ?? true,

      isSystem: options.isSystem ?? true,

      isActive: options.isActive ?? true,

      displayOrder: options.displayOrder,
    };
  }
}