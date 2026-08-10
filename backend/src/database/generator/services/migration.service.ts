import { Injectable } from '@nestjs/common';

import { MigrationFileGenerator } from '../../seeds/core';

@Injectable()
export class MigrationService {
  /**
   * Generates the permission migration file.
   *
   * @returns Absolute path of the generated migration.
   */
  generatePermissions(): string {
    return MigrationFileGenerator.generate(
      'permissions_generated',
    );
  }
}