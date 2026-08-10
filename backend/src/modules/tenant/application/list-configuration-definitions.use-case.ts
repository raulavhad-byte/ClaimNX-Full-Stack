import { Injectable } from '@nestjs/common';

import { ConfigurationDefinition } from '../domain/tenant-configuration.aggregate';
import { TenantConfigurationRepository } from '../infrastructure/tenant-configuration.repository';

@Injectable()
export class ListConfigurationDefinitionsUseCase {
  constructor(private readonly tenantConfigurationRepository: TenantConfigurationRepository) {}

  async execute(): Promise<ConfigurationDefinition[]> {
    return this.tenantConfigurationRepository.findActiveDefinitions();
  }
}
