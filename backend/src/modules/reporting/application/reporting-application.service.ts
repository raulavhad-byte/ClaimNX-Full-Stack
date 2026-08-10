import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ReportingRepository } from '../infrastructure/reporting.repository';
import type { ReportingTenantScope } from '../infrastructure/reporting.repository';

/** Authenticated tenant context required by every Reporting use case. */
export interface ReportingApplicationScope {
  readonly organizationId: string;
  readonly actorUserId: string;
}

export interface SetReportDefinitionStatusCommand {
  readonly reportDefinitionId: string;
  readonly expectedVersion: number;
  readonly reportStatusReferenceValueId: string;
}

export interface SetReportScheduleStatusCommand {
  readonly reportScheduleId: string;
  readonly expectedVersion: number;
  readonly reportScheduleStatusReferenceValueId: string;
}

export interface SetReportExecutionStatusCommand {
  readonly reportExecutionId: string;
  readonly expectedVersion: number;
  readonly reportExecutionStatusReferenceValueId: string;
}

export interface SoftDeleteReportScheduleCommand {
  readonly reportScheduleId: string;
  readonly expectedVersion: number;
}

/**
 * Phase 11 application boundary for Reporting & BI.
 *
 * The database functions remain the sole command persistence mechanism. This
 * service supplies active-IAM/member enforcement, tenant scoping, command
 * validation, and HTTP-safe error semantics before invoking those functions.
 */
@Injectable()
export class ReportingApplicationService {
  constructor(private readonly reportingRepository: ReportingRepository) {}

  async listDefinitions(scope: ReportingApplicationScope) {
    return this.reportingRepository.listActiveDefinitions(await this.authorize(scope));
  }

  async getDefinition(scope: ReportingApplicationScope, reportDefinitionId: string) {
    const tenantScope = await this.authorize(scope);
    const definition = await this.reportingRepository.findDefinition(tenantScope, reportDefinitionId);

    if (!definition) {
      throw new NotFoundException('Reporting definition was not found in the current organization.');
    }

    return definition;
  }

  async getSchedule(scope: ReportingApplicationScope, reportScheduleId: string) {
    const tenantScope = await this.authorize(scope);
    const schedule = await this.reportingRepository.findSchedule(tenantScope, reportScheduleId);

    if (!schedule) {
      throw new NotFoundException('Reporting schedule was not found in the current organization.');
    }

    return schedule;
  }

  async getExecution(scope: ReportingApplicationScope, reportExecutionId: string) {
    const tenantScope = await this.authorize(scope);
    const execution = await this.reportingRepository.findExecution(tenantScope, reportExecutionId);

    if (!execution) {
      throw new NotFoundException('Reporting execution was not found in the current organization.');
    }

    return execution;
  }

  async setDefinitionStatus(
    scope: ReportingApplicationScope,
    command: SetReportDefinitionStatusCommand,
  ): Promise<string> {
    this.assertExpectedVersion(command.expectedVersion);
    const tenantScope = await this.authorize(scope);
    await this.requireDefinition(tenantScope, command.reportDefinitionId);

    const updatedId = await this.reportingRepository.setDefinitionStatus(
      tenantScope,
      command.reportDefinitionId,
      command.expectedVersion,
      command.reportStatusReferenceValueId,
      scope.actorUserId,
    );

    return this.requireCommandResult(updatedId, 'Reporting definition was changed by another request.');
  }

  async setScheduleStatus(
    scope: ReportingApplicationScope,
    command: SetReportScheduleStatusCommand,
  ): Promise<string> {
    this.assertExpectedVersion(command.expectedVersion);
    const tenantScope = await this.authorize(scope);
    await this.requireSchedule(tenantScope, command.reportScheduleId);

    const updatedId = await this.reportingRepository.setScheduleStatus(
      tenantScope,
      command.reportScheduleId,
      command.expectedVersion,
      command.reportScheduleStatusReferenceValueId,
      scope.actorUserId,
    );

    return this.requireCommandResult(updatedId, 'Reporting schedule was changed by another request.');
  }

  async setExecutionStatus(
    scope: ReportingApplicationScope,
    command: SetReportExecutionStatusCommand,
  ): Promise<string> {
    this.assertExpectedVersion(command.expectedVersion);
    const tenantScope = await this.authorize(scope);
    await this.requireExecution(tenantScope, command.reportExecutionId);

    const updatedId = await this.reportingRepository.setExecutionStatus(
      tenantScope,
      command.reportExecutionId,
      command.expectedVersion,
      command.reportExecutionStatusReferenceValueId,
      scope.actorUserId,
    );

    return this.requireCommandResult(updatedId, 'Reporting execution was changed by another request.');
  }

  async softDeleteSchedule(
    scope: ReportingApplicationScope,
    command: SoftDeleteReportScheduleCommand,
  ): Promise<string> {
    this.assertExpectedVersion(command.expectedVersion);
    const tenantScope = await this.authorize(scope);
    await this.requireSchedule(tenantScope, command.reportScheduleId);

    const deletedId = await this.reportingRepository.softDeleteSchedule(
      tenantScope,
      command.reportScheduleId,
      command.expectedVersion,
      scope.actorUserId,
    );

    return this.requireCommandResult(deletedId, 'Reporting schedule was changed by another request.');
  }

  private async authorize(scope: ReportingApplicationScope): Promise<ReportingTenantScope> {
    const allowed = await this.reportingRepository.hasActiveActorAccess(
      { organizationId: scope.organizationId },
      scope.actorUserId,
    );

    if (!allowed) {
      throw new ForbiddenException('The active user is not a member of this organization.');
    }

    return { organizationId: scope.organizationId };
  }

  private async requireDefinition(scope: ReportingTenantScope, reportDefinitionId: string): Promise<void> {
    if (!(await this.reportingRepository.findDefinition(scope, reportDefinitionId))) {
      throw new NotFoundException('Reporting definition was not found in the current organization.');
    }
  }

  private async requireSchedule(scope: ReportingTenantScope, reportScheduleId: string): Promise<void> {
    if (!(await this.reportingRepository.findSchedule(scope, reportScheduleId))) {
      throw new NotFoundException('Reporting schedule was not found in the current organization.');
    }
  }

  private async requireExecution(scope: ReportingTenantScope, reportExecutionId: string): Promise<void> {
    if (!(await this.reportingRepository.findExecution(scope, reportExecutionId))) {
      throw new NotFoundException('Reporting execution was not found in the current organization.');
    }
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException('expectedVersion must be a positive integer.');
    }
  }

  private requireCommandResult(value: string | null, message: string): string {
    if (!value) {
      throw new ConflictException(message);
    }

    return value;
  }
}
