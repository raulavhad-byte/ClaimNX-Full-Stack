import { Injectable } from '@nestjs/common';

import { OrganizationConfigurationOverride } from '../domain/tenant-configuration.aggregate';
import { TenantConfigurationRepository } from '../infrastructure/tenant-configuration.repository';
import { TenantConfigurationTenantAccessService } from './tenant-configuration-tenant-access.service';

export interface ListOrganizationConfigurationsQuery {
  actorUserId: string;
  organizationId: string;
}

@Injectable()
export class ListOrganizationConfigurationsUseCase {
  constructor(
    private readonly tenantConfigurationRepository: TenantConfigurationRepository,
    private readonly tenantAccessService: TenantConfigurationTenantAccessService,
  ) {}

  async execute(
    query: ListOrganizationConfigurationsQuery,
  ): Promise<OrganizationConfigurationOverride[]> {
    await this.tenantAccessService.assertActiveMembership(
      query.actorUserId,
      query.organizationId,
    );
    return this.tenantConfigurationRepository.listOrganizationOverrides(query.organizationId);
  }
}
