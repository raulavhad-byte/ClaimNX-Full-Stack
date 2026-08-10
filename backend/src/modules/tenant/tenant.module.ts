import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { GetEffectiveConfigurationUseCase } from './application/get-effective-configuration.use-case';
import { ListConfigurationDefinitionsUseCase } from './application/list-configuration-definitions.use-case';
import { ListOrganizationConfigurationsUseCase } from './application/list-organization-configurations.use-case';
import { TenantConfigurationTenantAccessService } from './application/tenant-configuration-tenant-access.service';
import { TenantConfigurationWriteUseCases } from './application/tenant-configuration-write.use-cases';
import { OrganizationMemberManagementUseCases } from './application/organization-member-management.use-cases';
import { OrganizationMemberTenantAccessService } from './application/organization-member-tenant-access.service';
import { OrganizationMemberV1Controller } from './api/organization-member-v1.controller';
import { TenantConfigurationV1Controller } from './api/tenant-configuration-v1.controller';
import { OrganizationMemberRepository } from './infrastructure/organization-member.repository';
import { TenantConfigurationRepository } from './infrastructure/tenant-configuration.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantConfigurationV1Controller, OrganizationMemberV1Controller],
  providers: [
    TenantConfigurationRepository,
    OrganizationMemberRepository,
    TenantConfigurationTenantAccessService,
    OrganizationMemberTenantAccessService,
    ListConfigurationDefinitionsUseCase,
    ListOrganizationConfigurationsUseCase,
    GetEffectiveConfigurationUseCase,
    TenantConfigurationWriteUseCases,
    OrganizationMemberManagementUseCases,
  ],
  exports: [
    TenantConfigurationRepository,
    OrganizationMemberRepository,
    TenantConfigurationTenantAccessService,
    ListConfigurationDefinitionsUseCase,
    ListOrganizationConfigurationsUseCase,
    GetEffectiveConfigurationUseCase,
    TenantConfigurationWriteUseCases,
    OrganizationMemberManagementUseCases,
  ],
})
export class TenantModule {}
