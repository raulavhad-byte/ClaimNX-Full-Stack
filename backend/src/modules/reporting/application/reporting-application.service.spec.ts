import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReportingApplicationService } from './reporting-application.service';
import { ReportingRepository } from '../infrastructure/reporting.repository';

describe('ReportingApplicationService', () => {
  const scope = {
    organizationId: 'organization-1',
    actorUserId: 'user-1',
  };

  const repository = {
    hasActiveActorAccess: jest.fn(),
    listActiveDefinitions: jest.fn(),
    findDefinition: jest.fn(),
    findSchedule: jest.fn(),
    findExecution: jest.fn(),
    setDefinitionStatus: jest.fn(),
    setScheduleStatus: jest.fn(),
    setExecutionStatus: jest.fn(),
    softDeleteSchedule: jest.fn(),
  } as unknown as jest.Mocked<ReportingRepository>;

  let service: ReportingApplicationService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.hasActiveActorAccess.mockResolvedValue(true);
    service = new ReportingApplicationService(repository);
  });

  it('rejects a caller without active tenant access', async () => {
    repository.hasActiveActorAccess.mockResolvedValue(false);

    await expect(service.listDefinitions(scope)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an invalid optimistic-concurrency version before persistence', async () => {
    await expect(
      service.setDefinitionStatus(scope, {
        reportDefinitionId: 'definition-1',
        expectedVersion: 0,
        reportStatusReferenceValueId: 'status-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.setDefinitionStatus).not.toHaveBeenCalled();
  });

  it('returns not found when the definition is outside the tenant scope', async () => {
    repository.findDefinition.mockResolvedValue(null);

    await expect(
      service.setDefinitionStatus(scope, {
        reportDefinitionId: 'definition-1',
        expectedVersion: 1,
        reportStatusReferenceValueId: 'status-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps a stale schedule status command to a conflict', async () => {
    repository.findSchedule.mockResolvedValue({} as never);
    repository.setScheduleStatus.mockResolvedValue(null);

    await expect(
      service.setScheduleStatus(scope, {
        reportScheduleId: 'schedule-1',
        expectedVersion: 1,
        reportScheduleStatusReferenceValueId: 'status-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('persists an execution status change with tenant scope and actor', async () => {
    repository.findExecution.mockResolvedValue({} as never);
    repository.setExecutionStatus.mockResolvedValue('execution-1');

    await expect(
      service.setExecutionStatus(scope, {
        reportExecutionId: 'execution-1',
        expectedVersion: 3,
        reportExecutionStatusReferenceValueId: 'status-2',
      }),
    ).resolves.toEqual({ reportExecutionId: 'execution-1' });

    expect(repository.setExecutionStatus).toHaveBeenCalledWith(
      { organizationId: 'organization-1' },
      'execution-1',
      3,
      'status-2',
      'user-1',
    );
  });
});
