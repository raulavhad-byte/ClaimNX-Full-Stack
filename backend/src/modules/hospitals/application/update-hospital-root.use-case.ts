import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { Hospital } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';

export interface UpdateHospitalRootCommand {
  actorUserId: string;
  organizationId: string;
  hospitalId: string;
  version: number;
  displayName?: string;
  registrationNumber?: string;
  hospitalTypeReferenceValueId?: string;
  ownershipTypeReferenceValueId?: string;
  operationalStatusReferenceValueId?: string;
}

@Injectable()
export class UpdateHospitalRootUseCase {
  constructor(
    private readonly hospitalAggregateRepository: HospitalAggregateRepository,
    private readonly hospitalTenantAccessService: HospitalTenantAccessService,
  ) {}

  async execute(command: UpdateHospitalRootCommand): Promise<Hospital> {
    await this.hospitalTenantAccessService.assertActiveMembership(
      command.actorUserId,
      command.organizationId,
    );

    const existing = await this.hospitalAggregateRepository.findActiveById(
      command.organizationId,
      command.hospitalId,
    );

    if (!existing) {
      throw new NotFoundException('Hospital not found in the Organization tenant.');
    }

    const patch = {
      ...(command.displayName !== undefined && { displayName: command.displayName }),
      ...(command.registrationNumber !== undefined && {
        registrationNumber: command.registrationNumber,
      }),
      ...(command.hospitalTypeReferenceValueId !== undefined && {
        hospitalTypeReferenceValueId: command.hospitalTypeReferenceValueId,
      }),
      ...(command.ownershipTypeReferenceValueId !== undefined && {
        ownershipTypeReferenceValueId: command.ownershipTypeReferenceValueId,
      }),
      ...(command.operationalStatusReferenceValueId !== undefined && {
        operationalStatusReferenceValueId: command.operationalStatusReferenceValueId,
      }),
    };

    if (Object.keys(patch).length === 0) {
      throw new ConflictException('At least one Hospital root attribute must be supplied.');
    }

    const updatedHospitalId = await this.hospitalAggregateRepository.updateRoot(
      command.organizationId,
      command.hospitalId,
      command.version,
      command.actorUserId,
      patch,
    );

    if (!updatedHospitalId) {
      throw new ConflictException(
        'Hospital profile was updated by another user. Refresh and try again.',
      );
    }

    return (await this.hospitalAggregateRepository.findActiveById(
      command.organizationId,
      command.hospitalId,
    ))!;
  }
}
