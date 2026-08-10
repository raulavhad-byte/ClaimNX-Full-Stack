import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { HospitalAddress } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';

export interface HospitalAddressContext {
  actorUserId: string;
  organizationId: string;
  hospitalId: string;
}

export interface CreateHospitalAddressCommand extends HospitalAddressContext {
  addressTypeReferenceValueId: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  countryId: string;
  stateId: string;
  cityId: string;
  postalCode: string;
}

export interface UpdateHospitalAddressCommand extends HospitalAddressContext {
  hospitalAddressId: string;
  version: number;
  addressTypeReferenceValueId?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  countryId?: string;
  stateId?: string;
  cityId?: string;
  postalCode?: string;
}

export interface DeleteHospitalAddressCommand extends HospitalAddressContext {
  hospitalAddressId: string;
  version: number;
}

@Injectable()
export class HospitalAddressUseCases {
  constructor(
    private readonly repository: HospitalAggregateRepository,
    private readonly tenantAccess: HospitalTenantAccessService,
  ) {}

  async list(context: HospitalAddressContext): Promise<readonly HospitalAddress[]> {
    const hospital = await this.loadAggregate(context);
    return hospital.hospitalAddresses;
  }

  async create(command: CreateHospitalAddressCommand): Promise<HospitalAddress> {
    const hospital = await this.loadAggregate(command);
    const address: HospitalAddress = {
      hospitalAddressId: randomUUID(),
      hospitalId: command.hospitalId,
      addressTypeReferenceValueId: command.addressTypeReferenceValueId,
      addressLine1: command.addressLine1,
      addressLine2: command.addressLine2,
      landmark: command.landmark,
      countryId: command.countryId,
      stateId: command.stateId,
      cityId: command.cityId,
      postalCode: command.postalCode,
      isPrimary: false,
      version: 1,
    };
    hospital.addAddress(address);
    await this.repository.createAddress({ ...address, organizationId: command.organizationId, actorUserId: command.actorUserId });
    return address;
  }

  async update(command: UpdateHospitalAddressCommand): Promise<HospitalAddress> {
    const hospital = await this.loadAggregate(command);
    hospital.assertAddressCanBeChanged(command.hospitalAddressId);
    const patch = this.toPatch(command);
    if (Object.keys(patch).length === 0) {
      throw new ConflictException('At least one Address attribute must be supplied.');
    }
    const updated = await this.repository.updateAddress(
      command.organizationId, command.hospitalId, command.hospitalAddressId,
      command.version, command.actorUserId, patch,
    );
    if (!updated) throw new ConflictException('Address was updated by another user. Refresh and try again.');
    return this.findAddress(await this.loadAggregate(command), command.hospitalAddressId);
  }

  async softDelete(command: DeleteHospitalAddressCommand): Promise<void> {
    const hospital = await this.loadAggregate(command);
    hospital.assertAddressCanBeDeleted(command.hospitalAddressId);
    const deleted = await this.repository.softDeleteAddress(
      command.organizationId, command.hospitalId, command.hospitalAddressId,
      command.version, command.actorUserId,
    );
    if (!deleted) throw new ConflictException('Address was updated by another user. Refresh and try again.');
  }

  private async loadAggregate(context: HospitalAddressContext) {
    await this.tenantAccess.assertActiveMembership(context.actorUserId, context.organizationId);
    const hospital = await this.repository.findActiveById(context.organizationId, context.hospitalId);
    if (!hospital) throw new NotFoundException('Hospital not found in the Organization tenant.');
    return hospital;
  }

  private findAddress(hospital: { hospitalAddresses: readonly HospitalAddress[] }, addressId: string): HospitalAddress {
    const address = hospital.hospitalAddresses.find((item) => item.hospitalAddressId === addressId);
    if (!address) throw new NotFoundException('Address not found in the Hospital.');
    return address;
  }

  private toPatch(command: UpdateHospitalAddressCommand): Record<string, string> {
    const fields = [
      'addressTypeReferenceValueId', 'addressLine1', 'addressLine2', 'landmark',
      'countryId', 'stateId', 'cityId', 'postalCode',
    ] as const;
    return Object.fromEntries(
      fields.filter((field) => command[field] !== undefined).map((field) => [field, command[field]!]),
    );
  }
}
