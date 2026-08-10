import {
  ConfigurationDefinition,
  ConfigurationStatus,
  ConfigurationValidationRule,
  ConfigurationValueType,
  OrganizationConfigurationOverride,
} from '../domain/tenant-configuration.aggregate';

export interface ConfigurationDefinitionPersistenceRow {
  configuration_definition_id: string;
  configuration_key: string;
  display_name: string;
  configuration_category: string;
  value_type: ConfigurationValueType;
  default_value: string | null;
  validation_rule: ConfigurationValidationRule | null;
  override_allowed: boolean;
  status: ConfigurationStatus;
  version: number;
  deleted_at: string | null;
}

export interface OrganizationConfigurationOverridePersistenceRow {
  id: string;
  organization_id: string;
  configuration_definition_id: string;
  config_key: string;
  config_value: string | null;
  status: ConfigurationStatus;
  version: number;
  deleted_at: string | null;
}

export class TenantConfigurationDatabaseMapper {
  static toDefinition(row: ConfigurationDefinitionPersistenceRow): ConfigurationDefinition {
    return ConfigurationDefinition.rehydrate({
      configurationDefinitionId: row.configuration_definition_id,
      configurationKey: row.configuration_key,
      displayName: row.display_name,
      configurationCategory: row.configuration_category,
      valueType: row.value_type,
      defaultValue: row.default_value,
      validationRule: row.validation_rule,
      overrideAllowed: row.override_allowed,
      status: row.status,
      version: row.version,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    });
  }

  static toOrganizationOverride(
    row: OrganizationConfigurationOverridePersistenceRow,
    definition: ConfigurationDefinition,
  ): OrganizationConfigurationOverride {
    return OrganizationConfigurationOverride.rehydrate(
      {
        organizationConfigurationId: row.id,
        organizationId: row.organization_id,
        configurationDefinitionId: row.configuration_definition_id,
        configKey: row.config_key,
        configValue: row.config_value,
        status: row.status,
        version: row.version,
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      },
      definition,
    );
  }
}
