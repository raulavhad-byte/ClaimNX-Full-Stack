import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  Hospital,
  HospitalAddress,
  HospitalContact,
  HospitalDepartment,
} from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';

export interface CreateHospitalAddressInput {
  addressTypeReferenceValueId: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  countryId: string;
  stateId: string;
  cityId: string;
  postalCode: string;
  isPrimary: boolean;
}

export interface CreateHospitalContactInput {
  contactTypeReferenceValueId: string;
  contactName: string;
  designation?: string | null;
  emailAddress?: string | null;
  phoneNumber: string;
  mobileNumber?: string | null;
  isPrimary: boolean;
}

export interface CreateHospitalDepartmentInput {
  departmentCode: string;
  departmentName: string;
  departmentTypeReferenceValueId?: string | null;
  operationalStatusReferenceValueId: string;
  description?: string | null;
}

export interface CreateHospitalCommand {
  organizationId: string;
  actorUserId: string;
  hospitalCode: string;
  displayName: string;
  registrationNumber?: string | null;
  hospitalTypeReferenceValueId: string;
  ownershipTypeReferenceValueId?: string | null;
  operationalStatusReferenceValueId: string;
  addresses: CreateHospitalAddressInput[];
  contacts: CreateHospitalContactInput[];
  departments: CreateHospitalDepartmentInput[];
}

@Injectable()
export class CreateHospitalUseCase {
  constructor(
    private readonly hospitalAggregateRepository: HospitalAggregateRepository,
    private readonly hospitalTenantAccessService: HospitalTenantAccessService,
  ) {}

  async execute(command: CreateHospitalCommand): Promise<Hospital> {
    await this.hospitalTenantAccessService.assertActiveMembership(
      command.actorUserId,
      command.organizationId,
    );

    const hospital = Hospital.create({
      hospitalId: randomUUID(),
      organizationId: command.organizationId,
      hospitalCode: command.hospitalCode,
      displayName: command.displayName,
      registrationNumber: command.registrationNumber,
      hospitalTypeReferenceValueId: command.hospitalTypeReferenceValueId,
      ownershipTypeReferenceValueId: command.ownershipTypeReferenceValueId,
      operationalStatusReferenceValueId: command.operationalStatusReferenceValueId,
      version: 1,
    });

    command.addresses.forEach((input) => {
      const address: HospitalAddress = {
        hospitalAddressId: randomUUID(),
        hospitalId: hospital.id,
        addressTypeReferenceValueId: input.addressTypeReferenceValueId,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        landmark: input.landmark,
        countryId: input.countryId,
        stateId: input.stateId,
        cityId: input.cityId,
        postalCode: input.postalCode,
        isPrimary: input.isPrimary,
        version: 1,
      };
      hospital.addAddress(address);
    });

    command.contacts.forEach((input) => {
      const contact: HospitalContact = {
        hospitalContactId: randomUUID(),
        hospitalId: hospital.id,
        contactTypeReferenceValueId: input.contactTypeReferenceValueId,
        contactName: input.contactName,
        designation: input.designation,
        emailAddress: input.emailAddress,
        phoneNumber: input.phoneNumber,
        mobileNumber: input.mobileNumber,
        isPrimary: input.isPrimary,
        version: 1,
      };
      hospital.addContact(contact);
    });

    command.departments.forEach((input) => {
      const department: HospitalDepartment = {
        hospitalDepartmentId: randomUUID(),
        hospitalId: hospital.id,
        departmentCode: input.departmentCode,
        departmentName: input.departmentName,
        departmentTypeReferenceValueId: input.departmentTypeReferenceValueId,
        operationalStatusReferenceValueId:
          input.operationalStatusReferenceValueId,
          description: input.description,
          version: 1,
      };
      hospital.addDepartment(department);
    });

    await this.hospitalAggregateRepository.createAggregate(
      hospital,
      command.actorUserId,
    );

    return hospital;
  }
}
