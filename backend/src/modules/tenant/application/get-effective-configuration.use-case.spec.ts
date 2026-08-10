import { NotFoundException } from '@nestjs/common';

import { TenantConfigurationRepository } from '../infrastructure/tenant-configuration.repository';
import { GetEffectiveConfigurationUseCase } from './get-effective-configuration.use-case';
import { TenantConfigurationTenantAccessService } from './tenant-configuration-tenant-access.service';

describe('GetEffectiveConfigurationUseCase', () => {
  const query = {
    actorUserId: 'user-1',
    organizationId: 'organization-1',
    configurationKey: 'platform.date_format',
  };

  it('checks tenant membership before resolving an effective configuration', async () => {
    const repository = {
      resolveEffectiveConfiguration: jest.fn().mockResolvedValue({
        configurationDefinitionId: 'definition-1',
        configurationKey: 'platform.date_format',
        value: 'DD/MM/YYYY',
        source: 'DEFAULT',
      }),
    } as unknown as TenantConfigurationRepository;
    const access = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as TenantConfigurationTenantAccessService;
    const useCase = new GetEffectiveConfigurationUseCase(repository, access);

    await expect(useCase.execute(query)).resolves.toMatchObject({ source: 'DEFAULT' });
    expect(access.assertActiveMembership).toHaveBeenCalledWith('user-1', 'organization-1');
    expect(repository.resolveEffectiveConfiguration).toHaveBeenCalledWith(
      'organization-1',
      'platform.date_format',
    );
  });

  it('does not expose an inactive or unknown configuration definition', async () => {
    const repository = {
      resolveEffectiveConfiguration: jest.fn().mockResolvedValue(null),
    } as unknown as TenantConfigurationRepository;
    const access = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as TenantConfigurationTenantAccessService;
    const useCase = new GetEffectiveConfigurationUseCase(repository, access);

    await expect(useCase.execute(query)).rejects.toThrow(NotFoundException);
  });
});
