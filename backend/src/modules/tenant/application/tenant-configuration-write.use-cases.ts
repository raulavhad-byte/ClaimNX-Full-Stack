import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import {
  ConfigurationDefinition,
  OrganizationConfigurationOverride,
  TenantConfigurationDomainError,
} from '../domain/tenant-configuration.aggregate';
import { TenantConfigurationRepository } from '../infrastructure/tenant-configuration.repository';
import { TenantConfigurationTenantAccessService } from './tenant-configuration-tenant-access.service';

export interface CreateOrganizationConfigurationOverrideCommand {
  actorUserId: string;
  organizationId: string;
  configurationDefinitionId: string;
  configValue: string;
}

export interface UpdateOrganizationConfigurationOverrideCommand {
  actorUserId: string;
  organizationId: string;
  organizationConfigurationId: string;
  version: number;
  configValue: string;
}

export interface ChangeOrganizationConfigurationStatusCommand {
  actorUserId: string;
  organizationId: string;
  organizationConfigurationId: string;
  version: number;
}

@Injectable()
export class TenantConfigurationWriteUseCases {
  constructor(
    private readonly tenantConfigurationRepository: TenantConfigurationRepository,
    private readonly tenantAccessService: TenantConfigurationTenantAccessService,
  ) {}

  async create(
    command: CreateOrganizationConfigurationOverrideCommand,
  ): Promise<string> {
    await this.tenantAccessService.assertActiveMembership(
      command.actorUserId,
      command.organizationId,
    );

    const definition = await this.tenantConfigurationRepository.findDefinitionById(
      command.configurationDefinitionId,
    );
    if (!definition) {
      throw new NotFoundException('Configuration Definition was not found.');
    }
    this.assertDefinitionAllowsValue(definition, command.configValue);
    if (
      await this.tenantConfigurationRepository.findActiveOverride(
        command.organizationId,
        definition,
      )
    ) {
      throw new ConflictException(
        'An active Organization override already exists for this Configuration Definition.',
      );
    }

    const override = OrganizationConfigurationOverride.create(
      {
        organizationConfigurationId: randomUUID(),
        organizationId: command.organizationId,
        configurationDefinitionId: definition.id,
        configKey: definition.snapshot.configurationKey,
        configValue: command.configValue,
        status: 'ACTIVE',
        version: 1,
      },
      definition,
    );

    return this.tenantConfigurationRepository.createOrganizationOverride({
      organizationConfigurationId: override.snapshot.organizationConfigurationId,
      organizationId: command.organizationId,
      configurationDefinitionId: definition.id,
      configValue: command.configValue,
      actorUserId: command.actorUserId,
    });
  }

  async update(command: UpdateOrganizationConfigurationOverrideCommand): Promise<string> {
    await this.tenantAccessService.assertActiveMembership(
      command.actorUserId,
      command.organizationId,
    );

    const override = await this.requireOverride(command.organizationId, command.organizationConfigurationId);
    const definition = await this.tenantConfigurationRepository.findDefinitionById(
      override.snapshot.configurationDefinitionId,
    );
    if (!definition) throw new NotFoundException('Configuration Definition was not found.');
    this.assertDefinitionAllowsValue(definition, command.configValue);

    return this.requireMutation(
      await this.tenantConfigurationRepository.updateOrganizationOverride({
        organizationConfigurationId: command.organizationConfigurationId,
        organizationId: command.organizationId,
        expectedVersion: command.version,
        configValue: command.configValue,
        actorUserId: command.actorUserId,
      }),
    );
  }

  async activate(command: ChangeOrganizationConfigurationStatusCommand): Promise<string> {
    return this.changeStatus(command, 'ACTIVE');
  }

  async deactivate(command: ChangeOrganizationConfigurationStatusCommand): Promise<string> {
    return this.changeStatus(command, 'INACTIVE');
  }

  async retire(command: ChangeOrganizationConfigurationStatusCommand): Promise<string> {
    await this.tenantAccessService.assertActiveMembership(
      command.actorUserId,
      command.organizationId,
    );
    await this.requireOverride(command.organizationId, command.organizationConfigurationId);

    return this.requireMutation(
      await this.tenantConfigurationRepository.softDeleteOrganizationOverride({
        organizationConfigurationId: command.organizationConfigurationId,
        organizationId: command.organizationId,
        expectedVersion: command.version,
        actorUserId: command.actorUserId,
      }),
    );
  }

  private async changeStatus(
    command: ChangeOrganizationConfigurationStatusCommand,
    targetStatus: 'ACTIVE' | 'INACTIVE',
  ): Promise<string> {
    await this.tenantAccessService.assertActiveMembership(
      command.actorUserId,
      command.organizationId,
    );
    await this.requireOverride(command.organizationId, command.organizationConfigurationId);

    return this.requireMutation(
      await this.tenantConfigurationRepository.setOrganizationOverrideStatus({
        organizationConfigurationId: command.organizationConfigurationId,
        organizationId: command.organizationId,
        expectedVersion: command.version,
        targetStatus,
        actorUserId: command.actorUserId,
      }),
    );
  }

  private async requireOverride(
    organizationId: string,
    organizationConfigurationId: string,
  ): Promise<OrganizationConfigurationOverride> {
    const override = await this.tenantConfigurationRepository.findOrganizationOverrideById(
      organizationId,
      organizationConfigurationId,
    );
    if (!override) {
      throw new NotFoundException('Organization Configuration override was not found in the Organization tenant.');
    }
    return override;
  }

  private requireMutation(result: string | null): string {
    if (!result) {
      throw new ConflictException('Organization Configuration was changed, retired, or no longer available. Refresh and retry.');
    }
    return result;
  }

  private assertDefinitionAllowsValue(
    definition: ConfigurationDefinition,
    configValue: string,
  ): void {
    try {
      definition.assertOverrideAllowed();
      definition.assertValueIsValid(configValue);
    } catch (error) {
      if (error instanceof TenantConfigurationDomainError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
