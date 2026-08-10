import { TenantConfigurationDatabaseMapper } from './tenant-configuration.database.mapper';

const definitionRow = {
  configuration_definition_id: 'definition-1',
  configuration_key: 'platform.feature.notifications_enabled',
  display_name: 'Notifications Enabled',
  configuration_category: 'Feature Management',
  value_type: 'BOOLEAN' as const,
  default_value: 'true',
  validation_rule: { validation: 'BOOLEAN' },
  override_allowed: true,
  status: 'ACTIVE' as const,
  version: 1,
  deleted_at: null,
};

describe('TenantConfigurationDatabaseMapper', () => {
  it('maps a Configuration Definition database row to the domain model', () => {
    const definition = TenantConfigurationDatabaseMapper.toDefinition(definitionRow);

    expect(definition.snapshot).toMatchObject({
      configurationDefinitionId: 'definition-1',
      configurationKey: 'platform.feature.notifications_enabled',
      valueType: 'BOOLEAN',
      defaultValue: 'true',
    });
  });

  it('maps an Organization override using its governing Definition', () => {
    const definition = TenantConfigurationDatabaseMapper.toDefinition(definitionRow);
    const override = TenantConfigurationDatabaseMapper.toOrganizationOverride(
      {
        id: 'override-1',
        organization_id: 'organization-1',
        configuration_definition_id: 'definition-1',
        config_key: 'platform.feature.notifications_enabled',
        config_value: 'false',
        status: 'ACTIVE',
        version: 1,
        deleted_at: null,
      },
      definition,
    );

    expect(override.snapshot).toMatchObject({
      organizationConfigurationId: 'override-1',
      organizationId: 'organization-1',
      configValue: 'false',
    });
  });
});
