import { StringUtils } from '../shared';
import { PermissionGenerator } from './permission.generator';

export class SqlGenerator {

    /**
 * Generates SQL for permissions.
 */
static generatePermissions(): string {
  const permissions = PermissionGenerator.getPermissions();

  const statements: string[] = [];

  for (const permission of permissions) {
    const moduleCode = StringUtils.toKebabCase(permission.module);

    const subModuleCode = StringUtils.toKebabCase(permission.subModule);

    statements.push(`
INSERT INTO permissions
(
    sub_module_id,
    resource,
    action,
    code,
    name,
    description,
    category,
    scope_required,
    is_system,
    display_order,
    is_active
)
SELECT
    psm.id,
    '${permission.resource.replace(/'/g, "''")}',
    '${permission.action}',
    '${permission.code}',
    '${permission.name.replace(/'/g, "''")}',
    '${permission.description.replace(/'/g, "''")}',
    '${permission.category}',
    ${permission.scopeRequired ? 'TRUE' : 'FALSE'},
    ${permission.isSystem ? 'TRUE' : 'FALSE'},
    ${permission.displayOrder},
    ${permission.isActive ? 'TRUE' : 'FALSE'}
FROM permission_sub_modules psm
INNER JOIN permission_modules pm
    ON pm.id = psm.module_id
WHERE
    pm.code='${moduleCode}'
AND psm.code='${subModuleCode}'
ON CONFLICT (code)
DO NOTHING;
`.trim());
  }

  return statements.join('\n\n');
}

  /**
   * Generates SQL for permission_modules.
   */
  static generatePermissionModules(): string {
    const modules = PermissionGenerator.getModules();

    const statements: string[] = [];

    for (const module of modules) {
      statements.push(`
INSERT INTO permission_modules
(
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
VALUES
(
    '${module.code}',
    '${module.name.replace(/'/g, "''")}',
    '${module.name.replace(/'/g, "''")} Module',
    0,
    TRUE,
    TRUE
)
ON CONFLICT (code)
DO NOTHING;
`.trim());
    }

    return statements.join('\n\n');
  }

  /**
   * Generates SQL for permission_sub_modules.
   */
  static generatePermissionSubModules(): string {
    const subModules = PermissionGenerator.getSubModules();

    const statements: string[] = [];

    for (const subModule of subModules) {
      statements.push(`
INSERT INTO permission_sub_modules
(
    module_id,
    code,
    name,
    description,
    display_order,
    is_system,
    is_active
)
SELECT
    pm.id,
    '${subModule.code}',
    '${subModule.name.replace(/'/g, "''")}',
    '${subModule.name.replace(/'/g, "''")}',
    0,
    TRUE,
    TRUE
FROM permission_modules pm
WHERE pm.code='${subModule.moduleCode}'
ON CONFLICT (module_id, code)
DO NOTHING;
`.trim());
    }

    return statements.join('\n\n');
  }
}

