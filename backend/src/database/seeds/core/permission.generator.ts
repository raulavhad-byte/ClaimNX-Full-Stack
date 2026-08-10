import { PermissionDefinition } from '../shared';
import { PermissionCatalog } from './permission.catalog';
import { StringUtils } from '../shared';

export interface PermissionModuleModel {
  code: string;
  name: string;
}

export interface PermissionSubModuleModel {
  moduleCode: string;
  code: string;
  name: string;
}

export class PermissionGenerator {
  /**
   * Returns all permission modules.
   */
  static getModules(): PermissionModuleModel[] {
    const modules = new Map<string, PermissionModuleModel>();

    for (const permission of PermissionCatalog) {
      const code = StringUtils.toKebabCase(permission.module);

      if (!modules.has(code)) {
        modules.set(code, {
          code,
          name: permission.module,
        });
      }
    }

    return [...modules.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Returns all permission sub-modules.
   */
  static getSubModules(): PermissionSubModuleModel[] {
    const subModules = new Map<string, PermissionSubModuleModel>();

    for (const permission of PermissionCatalog) {
      const moduleCode = StringUtils.toKebabCase(permission.module);

      const code = StringUtils.toKebabCase(permission.subModule);

      const key = `${moduleCode}:${code}`;

      if (!subModules.has(key)) {
        subModules.set(key, {
          moduleCode,
          code,
          name: permission.subModule,
        });
      }
    }

    return [...subModules.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Returns every permission definition.
   */
  static getPermissions(): PermissionDefinition[] {
    return [...PermissionCatalog];
  }
}