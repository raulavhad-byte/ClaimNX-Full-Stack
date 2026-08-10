import { BadRequestException, ConflictException } from '@nestjs/common';

import { ConfigurationDefinition } from '../domain/tenant-configuration.aggregate';
import { TenantConfigurationRepository } from '../infrastructure/tenant-configuration.repository';
import { TenantConfigurationTenantAccessService } from './tenant-configuration-tenant-access.service';
import { TenantConfigurationWriteUseCases } from './tenant-configuration-write.use-cases';

const definition = ConfigurationDefinition.create({
  configurationDefinitionId: 'definition-1',
  configurationKey: 'platform.feature.notifications_enabled',
  displayName: 'Notifications Enabled',
  configurationCategory: 'Feature Management',
  valueType: 'BOOLEAN',
  defaultValue: 'true',
  validationRule: { validation: 'BOOLEAN' },
  overrideAllowed: true,
  status: 'ACTIVE',
  version: 1,
});

describe('TenantConfigurationWriteUseCases', () => {
  const access = {
    assertActiveMembership: jest.fn().mockResolvedValue(undefined),
  } as unknown as TenantConfigurationTenantAccessService;

  it('creates an override only for an approved Definition and a valid value', async () => {
    const repository = {
      findDefinitionById: jest.fn().mockResolvedValue(definition),
      findActiveOverride: jest.fn().mockResolvedValue(null),
      createOrganizationOverride: jest.fn().mockResolvedValue('override-1'),
    } as unknown as TenantConfigurationRepository;
    const useCases = new TenantConfigurationWriteUseCases(repository, access);

    await expect(
      useCases.create({
        actorUserId: 'user-1',
        organizationId: 'organization-1',
        configurationDefinitionId: 'definition-1',
        configValue: 'false',
      }),
    ).resolves.toBe('override-1');

    expect(repository.createOrganizationOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'organization-1',
        configurationDefinitionId: 'definition-1',
        configValue: 'false',
        actorUserId: 'user-1',
      }),
    );
  });

  it('returns a conflict when a versioned update loses its concurrency check', async () => {
    const repository = {
      findOrganizationOverrideById: jest.fn().mockResolvedValue({
        snapshot: { configurationDefinitionId: 'definition-1' },
      }),
      findDefinitionById: jest.fn().mockResolvedValue(definition),
      updateOrganizationOverride: jest.fn().mockResolvedValue(null),
    } as unknown as TenantConfigurationRepository;
    const useCases = new TenantConfigurationWriteUseCases(repository, access);

    await expect(
      useCases.update({
        actorUserId: 'user-1',
        organizationId: 'organization-1',
        organizationConfigurationId: 'override-1',
        version: 1,
        configValue: 'false',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('maps an invalid Domain value to a client validation error before persistence', async () => {
    const repository = {
      findDefinitionById: jest.fn().mockResolvedValue(definition),
      findActiveOverride: jest.fn().mockResolvedValue(null),
      createOrganizationOverride: jest.fn(),
    } as unknown as TenantConfigurationRepository;
    const useCases = new TenantConfigurationWriteUseCases(repository, access);

    await expect(
      useCases.create({
        actorUserId: 'user-1',
        organizationId: 'organization-1',
        configurationDefinitionId: 'definition-1',
        configValue: 'DD-MM-YYYY',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
