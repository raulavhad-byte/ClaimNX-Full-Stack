import {
  ConfigurationDefinition,
  OrganizationConfigurationOverride,
  TenantConfigurationDomainError,
  resolveEffectiveConfiguration,
} from './tenant-configuration.aggregate';

const definition = (): ConfigurationDefinition =>
  ConfigurationDefinition.create({
    configurationDefinitionId: 'definition-1',
    configurationKey: 'platform.date_format',
    displayName: 'Platform Date Format',
    configurationCategory: 'Platform',
    valueType: 'ENUM',
    defaultValue: 'DD/MM/YYYY',
    validationRule: { allowedValues: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
    overrideAllowed: true,
    status: 'ACTIVE',
    version: 1,
  });

describe('Tenant Configuration Domain', () => {
  it('resolves the Definition default when no Organization override exists', () => {
    const resolved = resolveEffectiveConfiguration(definition());

    expect(resolved).toEqual({
      configurationDefinitionId: 'definition-1',
      configurationKey: 'platform.date_format',
      value: 'DD/MM/YYYY',
      source: 'DEFAULT',
    });
  });

  it('resolves an active Organization override for its governing Definition', () => {
    const configurationDefinition = definition();
    const override = OrganizationConfigurationOverride.create(
      {
        organizationConfigurationId: 'override-1',
        organizationId: 'organization-1',
        configurationDefinitionId: 'definition-1',
        configKey: 'platform.date_format',
        configValue: 'YYYY-MM-DD',
        status: 'ACTIVE',
        version: 1,
      },
      configurationDefinition,
    );

    expect(resolveEffectiveConfiguration(configurationDefinition, override).source).toBe(
      'ORGANIZATION_OVERRIDE',
    );
  });

  it('does not allow an Organization to use an arbitrary configuration key', () => {
    expect(() =>
      OrganizationConfigurationOverride.create(
        {
          organizationConfigurationId: 'override-1',
          organizationId: 'organization-1',
          configurationDefinitionId: 'definition-1',
          configKey: 'claims.unapproved_setting',
          configValue: 'DD/MM/YYYY',
          status: 'ACTIVE',
          version: 1,
        },
        definition(),
      ),
    ).toThrow('Organization Configuration key must mirror its governing Configuration Definition.');
  });

  it('rejects values outside an enum Definition', () => {
    expect(() =>
      OrganizationConfigurationOverride.create(
        {
          organizationConfigurationId: 'override-1',
          organizationId: 'organization-1',
          configurationDefinitionId: 'definition-1',
          configKey: 'platform.date_format',
          configValue: 'DD-MM-YYYY',
          status: 'ACTIVE',
          version: 1,
        },
        definition(),
      ),
    ).toThrow(TenantConfigurationDomainError);
  });

  it('does not permit override when the Definition forbids it', () => {
    const lockedDefinition = ConfigurationDefinition.create({
      ...definition().snapshot,
      overrideAllowed: false,
    });

    expect(() =>
      OrganizationConfigurationOverride.create(
        {
          organizationConfigurationId: 'override-1',
          organizationId: 'organization-1',
          configurationDefinitionId: 'definition-1',
          configKey: 'platform.date_format',
          configValue: 'YYYY-MM-DD',
          status: 'ACTIVE',
          version: 1,
        },
        lockedDefinition,
      ),
    ).toThrow('This Configuration Definition cannot be overridden by an Organization.');
  });
});
