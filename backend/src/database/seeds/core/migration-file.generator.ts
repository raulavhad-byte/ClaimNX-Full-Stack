import * as fs from 'node:fs';
import * as path from 'node:path';

import { MigrationGenerator } from './migration.generator';

export class MigrationFileGenerator {
  /**
   * Generates a timestamped SQL migration file.
   *
   * @param migrationName A descriptive name, e.g. "permissions"
   * @returns Absolute path to the generated file.
   */
  static generate(migrationName: string): string {
    const timestamp = this.createTimestamp();

    const fileName = `${timestamp}_${migrationName}.sql`;

    const migrationsDirectory = path.resolve(
      process.cwd(),
      'src',
      'database',
      'migrations',
    );

    if (!fs.existsSync(migrationsDirectory)) {
      fs.mkdirSync(migrationsDirectory, { recursive: true });
    }

    const filePath = path.join(migrationsDirectory, fileName);

    fs.writeFileSync(filePath, MigrationGenerator.generate(), 'utf8');

    return filePath;
  }

  private static createTimestamp(): string {
    const now = new Date();

    const pad = (value: number) => value.toString().padStart(2, '0');

    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join('');
  }
}