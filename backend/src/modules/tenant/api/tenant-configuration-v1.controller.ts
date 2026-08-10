import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { GetEffectiveConfigurationUseCase } from '../application/get-effective-configuration.use-case';
import { ListOrganizationConfigurationsUseCase } from '../application/list-organization-configurations.use-case';
import { TenantConfigurationWriteUseCases } from '../application/tenant-configuration-write.use-cases';
import {
  ChangeOrganizationConfigurationStatusRequestDto,
  CreateOrganizationConfigurationOverrideRequestDto,
  UpdateOrganizationConfigurationOverrideRequestDto,
} from './dto/tenant-configuration-request.dto';

@Controller('v1/organizations/:organizationId/configurations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantConfigurationV1Controller {
  constructor(
    private readonly listOrganizationConfigurationsUseCase: ListOrganizationConfigurationsUseCase,
    private readonly getEffectiveConfigurationUseCase: GetEffectiveConfigurationUseCase,
    private readonly tenantConfigurationWriteUseCases: TenantConfigurationWriteUseCases,
  ) {}

  @Get()
  @Permissions('tenant.configurations.view')
  async listOverrides(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    const overrides = await this.listOrganizationConfigurationsUseCase.execute({
      actorUserId,
      organizationId,
    });
    return overrides.map((override) => override.snapshot);
  }

  @Get('effective/:configurationKey')
  @Permissions('tenant.configurations.view')
  async getEffectiveConfiguration(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('configurationKey') configurationKey: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.getEffectiveConfigurationUseCase.execute({
      actorUserId,
      organizationId,
      configurationKey,
    });
  }

  @Post()
  @Permissions('tenant.configurations.manage')
  async createOverride(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateOrganizationConfigurationOverrideRequestDto,
  ) {
    const organizationConfigurationId = await this.tenantConfigurationWriteUseCases.create({
      actorUserId,
      organizationId,
      ...body,
    });
    return { organizationConfigurationId };
  }

  @Patch(':organizationConfigurationId')
  @Permissions('tenant.configurations.manage')
  async updateOverride(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('organizationConfigurationId', ParseUUIDPipe) organizationConfigurationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: UpdateOrganizationConfigurationOverrideRequestDto,
  ) {
    await this.tenantConfigurationWriteUseCases.update({
      actorUserId,
      organizationId,
      organizationConfigurationId,
      ...body,
    });
    return { organizationConfigurationId, updated: true };
  }

  @Patch(':organizationConfigurationId/activate')
  @Permissions('tenant.configurations.manage')
  async activateOverride(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('organizationConfigurationId', ParseUUIDPipe) organizationConfigurationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: ChangeOrganizationConfigurationStatusRequestDto,
  ) {
    await this.tenantConfigurationWriteUseCases.activate({
      actorUserId,
      organizationId,
      organizationConfigurationId,
      ...body,
    });
    return { organizationConfigurationId, status: 'ACTIVE' };
  }

  @Patch(':organizationConfigurationId/deactivate')
  @Permissions('tenant.configurations.manage')
  async deactivateOverride(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('organizationConfigurationId', ParseUUIDPipe) organizationConfigurationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: ChangeOrganizationConfigurationStatusRequestDto,
  ) {
    await this.tenantConfigurationWriteUseCases.deactivate({
      actorUserId,
      organizationId,
      organizationConfigurationId,
      ...body,
    });
    return { organizationConfigurationId, status: 'INACTIVE' };
  }

  @Delete(':organizationConfigurationId')
  @Permissions('tenant.configurations.manage')
  async retireOverride(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('organizationConfigurationId', ParseUUIDPipe) organizationConfigurationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: ChangeOrganizationConfigurationStatusRequestDto,
  ) {
    await this.tenantConfigurationWriteUseCases.retire({
      actorUserId,
      organizationId,
      organizationConfigurationId,
      ...body,
    });
    return { organizationConfigurationId, retired: true };
  }
}
