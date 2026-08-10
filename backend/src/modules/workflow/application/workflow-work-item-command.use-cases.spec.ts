import { ConflictException } from '@nestjs/common';

import { WorkflowWorkItemCommandRepository } from '../infrastructure/workflow-work-item-command.repository';

import { WorkflowTenantAccessService } from './workflow-tenant-access.service';
import { WorkflowWorkItemCommandUseCases } from './workflow-work-item-command.use-cases';

describe('WorkflowWorkItemCommandUseCases', () => {
  const actorUserId = 'actor-user-id';
  const organizationId = 'organization-id';

  function createSubject() {
    const repository = {
      create: jest.fn(),
      assign: jest.fn(),
      transition: jest.fn(),
      updateSla: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as WorkflowWorkItemCommandRepository;
    const tenantAccess = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowTenantAccessService;
    return {
      repository,
      tenantAccess,
      useCases: new WorkflowWorkItemCommandUseCases(repository, tenantAccess),
    };
  }

  it('checks tenant membership and generates aggregate child identifiers on create', async () => {
    const { repository, tenantAccess, useCases } = createSubject();
    const create = jest
      .spyOn(repository, 'create')
      .mockResolvedValue('task-id');
    const assertActiveMembership = jest.spyOn(
      tenantAccess,
      'assertActiveMembership',
    );

    const result = await useCases.create({
      actorUserId,
      organizationId,
      workflowInstanceId: 'instance-id',
      type: 'STANDARD',
      title: 'Review document',
      slaTargetMinutes: 60,
    });
    expect(result.workflowTaskId).toBe('task-id');
    expect(typeof result.workflowSlaId).toBe('string');

    expect(assertActiveMembership).toHaveBeenCalledWith(
      actorUserId,
      organizationId,
    );
    expect(create).toHaveBeenCalledTimes(1);
    const createInput = create.mock.calls[0][0];
    expect(createInput).toMatchObject({
      actorUserId,
      organizationId,
      workflowInstanceId: 'instance-id',
    });
    expect(typeof createInput.workflowTaskId).toBe('string');
    expect(typeof createInput.workflowTaskHistoryId).toBe('string');
    expect(typeof createInput.workflowSlaId).toBe('string');
  });

  it('maps a stale Work Item update to a conflict response', async () => {
    const { repository, useCases } = createSubject();
    jest.spyOn(repository, 'transition').mockResolvedValue(null);

    await expect(
      useCases.transition({
        actorUserId,
        organizationId,
        workflowTaskId: 'task-id',
        version: 1,
        targetStatus: 'IN_PROGRESS',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
