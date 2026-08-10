import { Injectable, NotFoundException } from '@nestjs/common';

import { Hospital } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';

export interface GetHospitalQuery {
  actorUserId: string;
  organizationId: string;
  hospitalId: string;
}

@Injectable()
export class GetHospitalUseCase {
  constructor(
    private readonly hospitalAggregateRepository: HospitalAggregateRepository,
    private readonly hospitalTenantAccessService: HospitalTenantAccessService,
  ) {}

  async execute(query: GetHospitalQuery): Promise<Hospital> {
    await this.hospitalTenantAccessService.assertActiveMembership(
      query.actorUserId,
      query.organizationId,
    );

    const hospital = await this.hospitalAggregateRepository.findActiveById(
      query.organizationId,
      query.hospitalId,
    );

    if (!hospital) {
      throw new NotFoundException('Hospital not found in the Organization tenant.');
    }

    return hospital;
  }
}
