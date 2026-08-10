import { Module } from '@nestjs/common';
import { CommandFactory } from 'nest-commander';

import { GeneratePermissionsCommand } from './commands/generate-permissions.command';
import { MigrationService } from '../database/generator/services';

@Module({
  providers: [
    MigrationService,
    GeneratePermissionsCommand,
  ],
})
export class CliModule {
  static async run(): Promise<void> {
    await CommandFactory.run(CliModule, {
      logger: ['error', 'warn', 'log'],
    });
  }
}