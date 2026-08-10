import { GetEffectiveConfigurationUseCase } from '../application/get-effective-configuration.use-case';
import { ListOrganizationConfigurationsUseCase } from '../application/list-organization-configurations.use-case';
import { TenantConfigurationV1Controller } from './tenant-configuration-v1.controller';

describe('TenantConfigurationV1Controller', () => {
  const listUseCase = {
    execute: jest.fn().mockResolvedValue([]),
  } as unknown as ListOrganizationConfigurationsUseCase;
  const effectiveUseCase = {
    execute: jest.fn().mockResolvedValue({
      configurationKey: 'platform.date_format',
      value: 'DD/MM/YYYY',
      source: 'DEFAULT',
    }),
  } as unknown as GetEffectiveConfigurationUseCase;
  const writeUseCases = {
    create: jest.fn(),
    update: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    retire: jest.fn(),
  } as any;
  const controller = new TenantConfigurationV1Controller(
    listUseCase,
    effectiveUseCase,
    writeUseCases,
  );

  it('passes the authenticated user and Organization boundary to the list use case', async () => {
    await expect(controller.listOverrides('organization-1', 'user-1')).resolves.toEqual([]);
    expect(listUseCase.execute).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      actorUserId: 'user-1',
    });
  });

  it('resolves a known configuration only inside the requested Organization', async () => {
    await expect(
      controller.getEffectiveConfiguration('organization-1', 'platform.date_format', 'user-1'),
    ).resolves.toMatchObject({ source: 'DEFAULT' });
    expect(effectiveUseCase.execute).toHaveBeenCalledWith({
      organizationId: 'organization-1',
      configurationKey: 'platform.date_format',
      actorUserId: 'user-1',
    });
  });
});
