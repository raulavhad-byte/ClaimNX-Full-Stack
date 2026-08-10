import { NotFoundException } from '@nestjs/common';

import { GetWorkflowInstanceUseCase } from './get-workflow-instance.use-case';
import { WorkflowTenantAccessService } from './workflow-tenant-access.service';

describe('Workflow read use cases', () => {
  it('checks tenant membership before accessing an Instance', async () => {
    const repository = { findActiveById: jest.fn() };
    const assertActiveMembership = jest.fn().mockResolvedValue(undefined);
    const access = {
      assertActiveMembership,
    } as unknown as WorkflowTenantAccessService;
    const useCase = new GetWorkflowInstanceUseCase(repository as never, access);

    repository.findActiveById.mockResolvedValue(null);
    await expect(
      useCase.execute({
        actorUserId: 'user-1',
        organizationId: 'org-1',
        workflowInstanceId: 'instance-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(assertActiveMembership).toHaveBeenCalledWith('user-1', 'org-1');
    expect(repository.findActiveById).toHaveBeenCalledWith(
      'org-1',
      'instance-1',
    );
  });
});
