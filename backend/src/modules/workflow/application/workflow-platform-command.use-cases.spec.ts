import { ConflictException } from '@nestjs/common';

import { WorkflowPlatformCommandRepository } from '../infrastructure/workflow-platform-command.repository';

import { WorkflowPlatformCommandUseCases } from './workflow-platform-command.use-cases';
import { WorkflowTenantAccessService } from './workflow-tenant-access.service';

describe('WorkflowPlatformCommandUseCases', () => {
  function createSubject() {
    const repository = {
      createDefinition: jest.fn(),
      activateDefinition: jest.fn(),
      retireDefinition: jest.fn(),
      startInstance: jest.fn(),
      transitionInstance: jest.fn(),
      cancelInstance: jest.fn(),
      createQueue: jest.fn(),
      updateQueue: jest.fn(),
      setQueueStatus: jest.fn(),
      softDeleteQueue: jest.fn(),
    } as unknown as WorkflowPlatformCommandRepository;
    const tenantAccess = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowTenantAccessService;
    return {
      repository,
      tenantAccess,
      useCases: new WorkflowPlatformCommandUseCases(repository, tenantAccess),
    };
  }

  it('constructs a complete Definition graph before persistence', async () => {
    const { repository, useCases } = createSubject();
    jest.spyOn(repository, 'createDefinition').mockResolvedValue('definition-id');

    await expect(
      useCases.createDefinition({
        actorUserId: 'actor-id',
        code: 'CLAIM_REVIEW',
        name: 'Claim Review',
        states: [
          { code: 'DRAFT', name: 'Draft', displayOrder: 1, isInitial: true, isTerminal: false },
          { code: 'DONE', name: 'Done', displayOrder: 2, isInitial: false, isTerminal: true },
        ],
        transitions: [{ fromStateCode: 'DRAFT', toStateCode: 'DONE' }],
      }),
    ).resolves.toBe('definition-id');

    expect(repository.createDefinition).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowDefinitionId: expect.any(String),
        states: expect.arrayContaining([expect.objectContaining({ code: 'DRAFT' })]),
        transitions: expect.arrayContaining([
          expect.objectContaining({ from_state_id: expect.any(String), to_state_id: expect.any(String) }),
        ]),
      }),
    );
  });

  it('checks tenant membership before starting a Workflow Instance', async () => {
    const { repository, tenantAccess, useCases } = createSubject();
    jest.spyOn(repository, 'startInstance').mockResolvedValue('instance-id');

    await useCases.startInstance({
      actorUserId: 'actor-id', organizationId: 'organization-id', instanceReference: 'REF-1',
      workflowDefinitionId: 'definition-id', hospitalId: 'hospital-id', sourceType: 'CLAIM', sourceId: 'source-id',
    });

    expect(tenantAccess.assertActiveMembership).toHaveBeenCalledWith('actor-id', 'organization-id');
    expect(repository.startInstance).toHaveBeenCalledWith(expect.objectContaining({
      workflowInstanceId: expect.any(String), workflowHistoryId: expect.any(String),
    }));
  });

  it('maps stale Queue mutations to a conflict response', async () => {
    const { repository, useCases } = createSubject();
    jest.spyOn(repository, 'setQueueStatus').mockResolvedValue(null);

    await expect(useCases.deactivateQueue({
      actorUserId: 'actor-id', organizationId: 'organization-id', workflowQueueId: 'queue-id', version: 1,
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
