import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import {
  ConfigurationDefinition,
  EffectiveConfiguration,
  OrganizationConfigurationOverride,
  resolveEffectiveConfiguration,
} from '../domain/tenant-configuration.aggregate';

import {
  ConfigurationDefinitionPersistenceRow,
  OrganizationConfigurationOverridePersistenceRow,
  TenantConfigurationDatabaseMapper,
} from './tenant-configuration.database.mapper';

@Injectable()
export class TenantConfigurationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveDefinitionByKey(
    configurationKey: string,
  ): Promise<ConfigurationDefinition | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('configuration_definitions')
      .select(
        'configuration_definition_id, configuration_key, display_name, configuration_category, value_type, default_value, validation_rule, override_allowed, status, version, deleted_at',
      )
      .eq('configuration_key', configurationKey)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .maybeSingle<ConfigurationDefinitionPersistenceRow>();

    if (error) throw error;
    return data ? TenantConfigurationDatabaseMapper.toDefinition(data) : null;
  }

  async findActiveDefinitions(): Promise<ConfigurationDefinition[]> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('configuration_definitions')
      .select(
        'configuration_definition_id, configuration_key, display_name, configuration_category, value_type, default_value, validation_rule, override_allowed, status, version, deleted_at',
      )
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .order('configuration_key', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) =>
      TenantConfigurationDatabaseMapper.toDefinition(
        row as ConfigurationDefinitionPersistenceRow,
      ),
    );
  }

  async findDefinitionById(
    configurationDefinitionId: string,
  ): Promise<ConfigurationDefinition | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('configuration_definitions')
      .select(
        'configuration_definition_id, configuration_key, display_name, configuration_category, value_type, default_value, validation_rule, override_allowed, status, version, deleted_at',
      )
      .eq('configuration_definition_id', configurationDefinitionId)
      .is('deleted_at', null)
      .maybeSingle<ConfigurationDefinitionPersistenceRow>();

    if (error) throw error;
    return data ? TenantConfigurationDatabaseMapper.toDefinition(data) : null;
  }

  async listOrganizationOverrides(
    organizationId: string,
  ): Promise<OrganizationConfigurationOverride[]> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_configurations')
      .select(
        'id, organization_id, configuration_definition_id, config_key, config_value, status, version, deleted_at',
      )
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .order('config_key', { ascending: true });

    if (error) throw error;

    return Promise.all(
      ((data ?? []) as OrganizationConfigurationOverridePersistenceRow[]).map(async (row) => {
        const definition = await this.findDefinitionById(row.configuration_definition_id);
        if (!definition) {
          throw new Error('Organization Configuration has no available Configuration Definition.');
        }
        return TenantConfigurationDatabaseMapper.toOrganizationOverride(row, definition);
      }),
    );
  }

  async findActiveOverride(
    organizationId: string,
    definition: ConfigurationDefinition,
  ): Promise<OrganizationConfigurationOverride | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_configurations')
      .select(
        'id, organization_id, configuration_definition_id, config_key, config_value, status, version, deleted_at',
      )
      .eq('organization_id', organizationId)
      .eq('configuration_definition_id', definition.id)
      .eq('status', 'ACTIVE')
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<OrganizationConfigurationOverridePersistenceRow>();

    if (error) throw error;
    return data
      ? TenantConfigurationDatabaseMapper.toOrganizationOverride(data, definition)
      : null;
  }

  async findOrganizationOverrideById(
    organizationId: string,
    organizationConfigurationId: string,
  ): Promise<OrganizationConfigurationOverride | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_configurations')
      .select(
        'id, organization_id, configuration_definition_id, config_key, config_value, status, version, deleted_at',
      )
      .eq('organization_id', organizationId)
      .eq('id', organizationConfigurationId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<OrganizationConfigurationOverridePersistenceRow>();

    if (error) throw error;
    if (!data) return null;

    const definition = await this.findDefinitionById(data.configuration_definition_id);
    if (!definition) {
      throw new Error('Organization Configuration has no available Configuration Definition.');
    }
    return TenantConfigurationDatabaseMapper.toOrganizationOverride(data, definition);
  }

  async createOrganizationOverride(input: {
    organizationConfigurationId: string;
    organizationId: string;
    configurationDefinitionId: string;
    configValue: string;
    actorUserId: string;
  }): Promise<string> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'create_organization_configuration_override',
      {
        p_organization_configuration_id: input.organizationConfigurationId,
        p_organization_id: input.organizationId,
        p_configuration_definition_id: input.configurationDefinitionId,
        p_config_value: input.configValue,
        p_actor_user_id: input.actorUserId,
      },
    );
    if (error) throw error;
    return data as string;
  }

  async updateOrganizationOverride(input: {
    organizationConfigurationId: string;
    organizationId: string;
    expectedVersion: number;
    configValue: string;
    actorUserId: string;
  }): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'update_organization_configuration_override',
      {
        p_organization_configuration_id: input.organizationConfigurationId,
        p_organization_id: input.organizationId,
        p_expected_version: input.expectedVersion,
        p_config_value: input.configValue,
        p_actor_user_id: input.actorUserId,
      },
    );
    if (error) throw error;
    return data as string | null;
  }

  async setOrganizationOverrideStatus(input: {
    organizationConfigurationId: string;
    organizationId: string;
    expectedVersion: number;
    targetStatus: 'ACTIVE' | 'INACTIVE';
    actorUserId: string;
  }): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'set_organization_configuration_override_status',
      {
        p_organization_configuration_id: input.organizationConfigurationId,
        p_organization_id: input.organizationId,
        p_expected_version: input.expectedVersion,
        p_target_status: input.targetStatus,
        p_actor_user_id: input.actorUserId,
      },
    );
    if (error) throw error;
    return data as string | null;
  }

  async softDeleteOrganizationOverride(input: {
    organizationConfigurationId: string;
    organizationId: string;
    expectedVersion: number;
    actorUserId: string;
  }): Promise<string | null> {
    const { data, error } = await this.databaseService.getClient().rpc(
      'soft_delete_organization_configuration_override',
      {
        p_organization_configuration_id: input.organizationConfigurationId,
        p_organization_id: input.organizationId,
        p_expected_version: input.expectedVersion,
        p_actor_user_id: input.actorUserId,
      },
    );
    if (error) throw error;
    return data as string | null;
  }

  async resolveEffectiveConfiguration(
    organizationId: string,
    configurationKey: string,
  ): Promise<EffectiveConfiguration | null> {
    const definition = await this.findActiveDefinitionByKey(configurationKey);
    if (!definition) return null;

    const override = await this.findActiveOverride(organizationId, definition);
    return resolveEffectiveConfiguration(definition, override);
  }
}
