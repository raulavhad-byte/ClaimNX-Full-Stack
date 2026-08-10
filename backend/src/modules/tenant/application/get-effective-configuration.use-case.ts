import { Injectable, NotFoundException } from '@nestjs/common';

import { EffectiveConfiguration } from '../domain/tenant-configuration.aggregate';
import { TenantConfigurationRepository } from '../infrastructure/tenant-configuration.repository';
import { TenantConfigurationTenantAccessService } from './tenant-configuration-tenant-access.service';

export interface GetEffectiveConfigurationQuery {
  actorUserId: string;
  organizationId: string;
  configurationKey: string;
}

@Injectable()
export class GetEffectiveConfigurationUseCase {
  constructor(
    private readonly tenantConfigurationRepository: TenantConfigurationRepository,
    private readonly tenantAccessService: TenantConfigurationTenantAccessService,
  ) {}

  async execute(query: GetEffectiveConfigurationQuery): Promise<EffectiveConfiguration> {
    await this.tenantAccessService.assertActiveMembership(
      query.actorUserId,
      query.organizationId,
    );

    const effectiveConfiguration =
      await this.tenantConfigurationRepository.resolveEffectiveConfiguration(
        query.organizationId,
        query.configurationKey,
      );

    if (!effectiveConfiguration) {
      throw new NotFoundException('Configuration Definition was not found or is inactive.');
    }

    return effectiveConfiguration;
  }
}
