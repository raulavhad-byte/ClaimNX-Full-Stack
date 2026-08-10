import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';

import { MigrationService } from '../../database/generator/services';

@Injectable()
@Command({
  name: 'generate:permissions',
  description: 'Generate the Permission SQL migration.',
})
export class GeneratePermissionsCommand extends CommandRunner {
  private readonly logger = new Logger(GeneratePermissionsCommand.name);

  constructor(
    private readonly migrationService: MigrationService,
  ) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log('Generating permission migration...');

    const filePath =
      this.migrationService.generatePermissions();

    this.logger.log('Permission migration generated successfully.');

    this.logger.log(`Location: ${filePath}`);
  }
}