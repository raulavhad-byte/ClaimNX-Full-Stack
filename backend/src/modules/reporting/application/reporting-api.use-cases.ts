import { ForbiddenException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ReportingCommandRepository } from '../infrastructure/reporting-command.repository';
import { ReportingRepository } from '../infrastructure/reporting.repository';

export interface ReportingApiScope {
  readonly organizationId: string;
  readonly actorUserId: string;
}

@Injectable()
export class ReportingApiUseCases {
  constructor(
    private readonly reportingRepository: ReportingRepository,
    private readonly commandRepository: ReportingCommandRepository,
  ) {}

  async listDefinitions(scope: ReportingApiScope) {
    await this.assertActiveActor(scope);
    return this.reportingRepository.listActiveDefinitions(scope);
  }

  async getDefinition(scope: ReportingApiScope, reportDefinitionId: string) {
    await this.assertActiveActor(scope);
    const definition = await this.reportingRepository.findDefinition(scope, reportDefinitionId);
    if (!definition) throw new NotFoundException('Report Definition was not found in this Organization.');
    return definition;
  }

  async getSchedule(scope: ReportingApiScope, reportScheduleId: string) {
    await this.assertActiveActor(scope);
    const schedule = await this.reportingRepository.findSchedule(scope, reportScheduleId);
    if (!schedule) throw new NotFoundException('Report Schedule was not found in this Organization.');
    return schedule;
  }

  async getExecution(scope: ReportingApiScope, reportExecutionId: string) {
    await this.assertActiveActor(scope);
    const execution = await this.reportingRepository.findExecution(scope, reportExecutionId);
    if (!execution) throw new NotFoundException('Report Execution was not found in this Organization.');
    return execution;
  }

  async setDefinitionStatus(scope: ReportingApiScope, id: string, expectedVersion: number, statusId: string) {
    await this.assertActiveActor(scope);
    return this.requireMutation(
      this.commandRepository.setDefinitionStatus(scope, id, expectedVersion, statusId),
      'Report Definition update was rejected because the version is stale, the record is inactive, or it is outside this Organization.',
    );
  }

  async setScheduleStatus(scope: ReportingApiScope, id: string, expectedVersion: number, statusId: string) {
    await this.assertActiveActor(scope);
    return this.requireMutation(
      this.commandRepository.setScheduleStatus(scope, id, expectedVersion, statusId),
      'Report Schedule update was rejected because the version is stale, the record is inactive, or it is outside this Organization.',
    );
  }

  async setExecutionStatus(scope: ReportingApiScope, id: string, expectedVersion: number, statusId: string) {
    await this.assertActiveActor(scope);
    return this.requireMutation(
      this.commandRepository.setExecutionStatus(scope, id, expectedVersion, statusId),
      'Report Execution update was rejected because the version is stale, the record is inactive, or it is outside this Organization.',
    );
  }

  async retireSchedule(scope: ReportingApiScope, id: string, expectedVersion: number) {
    await this.assertActiveActor(scope);
    return this.requireMutation(
      this.commandRepository.softDeleteSchedule(scope, id, expectedVersion),
      'Report Schedule retirement was rejected because the version is stale, the schedule is inactive, or it is outside this Organization.',
    );
  }

  private async assertActiveActor(scope: ReportingApiScope): Promise<void> {
    if (!(await this.commandRepository.assertActiveActor(scope))) {
      throw new ForbiddenException('An active Organization Member is required.');
    }
  }

  private async requireMutation(operation: Promise<string | null>, conflictMessage: string): Promise<{ id: string }> {
    const id = await operation;
    if (!id) throw new ConflictException(conflictMessage);
    return { id };
  }
}
