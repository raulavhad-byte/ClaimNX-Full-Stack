import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import {
  ReportingCommandRepository,
} from '../infrastructure/reporting-command.repository';
import { ReportingAccessService } from './reporting-access.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SetReportingStatusInput {
  readonly organizationId: string;
  readonly recordId: string;
  readonly expectedVersion: number;
  readonly statusReferenceValueId: string;
  readonly actorUserId: string;
}

export interface SoftDeleteReportingScheduleInput {
  readonly organizationId: string;
  readonly reportScheduleId: string;
  readonly expectedVersion: number;
  readonly actorUserId: string;
}

/**
 * Reporting command orchestration. Database functions remain the final atomic
 * persistence boundary; this layer supplies authorization and input guards.
 */
@Injectable()
export class ReportingCommandUseCases {
  constructor(
    private readonly access: ReportingAccessService,
    private readonly commands: ReportingCommandRepository,
  ) {}

  async setReportDefinitionStatus(input: SetReportingStatusInput): Promise<string> {
    return this.setStatus(input, 'REPORT_STATUS', (command) =>
      this.commands.setDefinitionStatus(
        command,
        command.recordId,
        command.expectedVersion,
        command.statusReferenceValueId,
      ),
    );
  }

  async setReportScheduleStatus(input: SetReportingStatusInput): Promise<string> {
    return this.setStatus(input, 'REPORT_SCHEDULE_STATUS', (command) =>
      this.commands.setScheduleStatus(
        command,
        command.recordId,
        command.expectedVersion,
        command.statusReferenceValueId,
      ),
    );
  }

  async setReportExecutionStatus(input: SetReportingStatusInput): Promise<string> {
    return this.setStatus(input, 'REPORT_EXECUTION_STATUS', (command) =>
      this.commands.setExecutionStatus(
        command,
        command.recordId,
        command.expectedVersion,
        command.statusReferenceValueId,
      ),
    );
  }

  async softDeleteReportSchedule(
    input: SoftDeleteReportingScheduleInput,
  ): Promise<string> {
    this.assertIdentifiers(input.organizationId, input.reportScheduleId, input.actorUserId);
    this.assertExpectedVersion(input.expectedVersion);
    await this.access.assertActiveOrganizationMember(
      input.organizationId,
      input.actorUserId,
    );

    const deletedId = await this.commands.softDeleteSchedule(
      input,
      input.reportScheduleId,
      input.expectedVersion,
    );
    return this.requireMutationResult(deletedId);
  }

  private async setStatus(
    input: SetReportingStatusInput,
    categoryCode: string,
    persist: (command: SetReportingStatusInput) => Promise<string | null>,
  ): Promise<string> {
    this.assertIdentifiers(
      input.organizationId,
      input.recordId,
      input.statusReferenceValueId,
      input.actorUserId,
    );
    this.assertExpectedVersion(input.expectedVersion);

    await this.access.assertActiveOrganizationMember(
      input.organizationId,
      input.actorUserId,
    );
    await this.access.assertActiveGlobalReferenceValue(
      input.statusReferenceValueId,
      categoryCode,
    );

    return this.requireMutationResult(await persist(input));
  }

  private assertIdentifiers(...identifiers: readonly string[]): void {
    if (identifiers.some((identifier) => !UUID_PATTERN.test(identifier))) {
      throw new BadRequestException('All Reporting command identifiers must be UUIDs.');
    }
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException('expectedVersion must be a positive integer.');
    }
  }

  private requireMutationResult(result: string | null): string {
    if (!result) {
      throw new ConflictException(
        'The Reporting record is stale, inactive, retired, or outside the Organization scope.',
      );
    }
    return result;
  }
}
