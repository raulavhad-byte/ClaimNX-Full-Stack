import { SqlGenerator } from './sql.generator';

export class MigrationGenerator {
  /**
   * Generates the complete SQL migration.
   */
  static generate(): string {
    return [
      '-- ============================================',
      '-- ClaimNX Permission Migration',
      '-- Auto-generated. Do not edit manually.',
      '-- ============================================',
      '',
      'BEGIN;',
      '',
      '-- --------------------------------------------',
      '-- Permission Modules',
      '-- --------------------------------------------',
      '',
      SqlGenerator.generatePermissionModules(),
      '',
      '-- --------------------------------------------',
      '-- Permission Sub Modules',
      '-- --------------------------------------------',
      '',
      SqlGenerator.generatePermissionSubModules(),
      '',
      '-- --------------------------------------------',
      '-- Permissions',
      '-- --------------------------------------------',
      '',
      SqlGenerator.generatePermissions(),
      '',
      'COMMIT;',
      '',
    ].join('\n');
  }
}