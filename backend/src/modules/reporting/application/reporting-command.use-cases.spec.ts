import { BadRequestException, ConflictException } from '@nestjs/common';

import { ReportingCommandUseCases } from './reporting-command.use-cases';

const organizationId = '11111111-1111-4111-8111-111111111111';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const recordId = '33333333-3333-4333-8333-333333333333';
const statusReferenceValueId = '44444444-4444-4444-8444-444444444444';

describe('ReportingCommandUseCases', () => {
  const access = {
    assertActiveOrganizationMember: jest.fn(),
    assertActiveGlobalReferenceValue: jest.fn(),
  };
  const commands = {
    setDefinitionStatus: jest.fn(),
    setScheduleStatus: jest.fn(),
    setExecutionStatus: jest.fn(),
    softDeleteSchedule: jest.fn(),
  };
  let useCases: ReportingCommandUseCases;

  beforeEach(() => {
    jest.resetAllMocks();
    useCases = new ReportingCommandUseCases(access as never, commands as never);
  });

  it('authorizes and changes a definition status', async () => {
    commands.setDefinitionStatus.mockResolvedValue(recordId);

    await expect(
      useCases.setReportDefinitionStatus({
        organizationId,
        recordId,
        expectedVersion: 1,
        statusReferenceValueId,
        actorUserId,
      }),
    ).resolves.toBe(recordId);

    expect(access.assertActiveOrganizationMember).toHaveBeenCalledWith(
      organizationId,
      actorUserId,
    );
    expect(access.assertActiveGlobalReferenceValue).toHaveBeenCalledWith(
      statusReferenceValueId,
      'REPORT_STATUS',
    );
  });

  it('rejects an invalid optimistic-concurrency version before persistence', async () => {
    await expect(
      useCases.setReportScheduleStatus({
        organizationId,
        recordId,
        expectedVersion: 0,
        statusReferenceValueId,
        actorUserId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(commands.setScheduleStatus).not.toHaveBeenCalled();
  });

  it('converts a null database mutation result to a conflict', async () => {
    commands.setExecutionStatus.mockResolvedValue(null);

    await expect(
      useCases.setReportExecutionStatus({
        organizationId,
        recordId,
        expectedVersion: 1,
        statusReferenceValueId,
        actorUserId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes a schedule within the caller tenant', async () => {
    commands.softDeleteSchedule.mockResolvedValue(recordId);

    await expect(
      useCases.softDeleteReportSchedule({
        organizationId,
        reportScheduleId: recordId,
        expectedVersion: 2,
        actorUserId,
      }),
    ).resolves.toBe(recordId);
  });
});
