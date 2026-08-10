import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { HospitalContact } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';
import { HospitalAddressContext } from './hospital-address.use-cases';

export interface CreateHospitalContactCommand extends HospitalAddressContext {
  contactTypeReferenceValueId: string; contactName: string; designation?: string;
  emailAddress?: string; phoneNumber: string; mobileNumber?: string;
}
export interface UpdateHospitalContactCommand extends HospitalAddressContext {
  hospitalContactId: string; version: number; contactTypeReferenceValueId?: string;
  contactName?: string; designation?: string; emailAddress?: string; phoneNumber?: string; mobileNumber?: string;
}
export interface DeleteHospitalContactCommand extends HospitalAddressContext { hospitalContactId: string; version: number; }

@Injectable()
export class HospitalContactUseCases {
  constructor(private readonly repository: HospitalAggregateRepository, private readonly tenantAccess: HospitalTenantAccessService) {}

  async list(context: HospitalAddressContext): Promise<readonly HospitalContact[]> {
    return (await this.loadAggregate(context)).hospitalContacts;
  }

  async create(command: CreateHospitalContactCommand): Promise<HospitalContact> {
    const hospital = await this.loadAggregate(command);
    const contact: HospitalContact = {
      hospitalContactId: randomUUID(), hospitalId: command.hospitalId,
      contactTypeReferenceValueId: command.contactTypeReferenceValueId, contactName: command.contactName,
      designation: command.designation, emailAddress: command.emailAddress, phoneNumber: command.phoneNumber,
      mobileNumber: command.mobileNumber, isPrimary: false, version: 1,
    };
    hospital.addContact(contact);
    await this.repository.createContact({ ...contact, organizationId: command.organizationId, actorUserId: command.actorUserId });
    return contact;
  }

  async update(command: UpdateHospitalContactCommand): Promise<HospitalContact> {
    const hospital = await this.loadAggregate(command);
    hospital.assertContactCanBeChanged(command.hospitalContactId);
    const patch = this.toPatch(command);
    if (Object.keys(patch).length === 0) throw new ConflictException('At least one Contact attribute must be supplied.');
    const updated = await this.repository.updateContact(command.organizationId, command.hospitalId, command.hospitalContactId, command.version, command.actorUserId, patch);
    if (!updated) throw new ConflictException('Contact was updated by another user. Refresh and try again.');
    const reloaded = await this.loadAggregate(command);
    const contact = reloaded.hospitalContacts.find((item) => item.hospitalContactId === command.hospitalContactId);
    if (!contact) throw new NotFoundException('Contact not found in the Hospital.');
    return contact;
  }

  async softDelete(command: DeleteHospitalContactCommand): Promise<void> {
    const hospital = await this.loadAggregate(command);
    hospital.assertContactCanBeDeleted(command.hospitalContactId);
    const deleted = await this.repository.softDeleteContact(command.organizationId, command.hospitalId, command.hospitalContactId, command.version, command.actorUserId);
    if (!deleted) throw new ConflictException('Contact was updated by another user. Refresh and try again.');
  }

  private async loadAggregate(context: HospitalAddressContext) {
    await this.tenantAccess.assertActiveMembership(context.actorUserId, context.organizationId);
    const hospital = await this.repository.findActiveById(context.organizationId, context.hospitalId);
    if (!hospital) throw new NotFoundException('Hospital not found in the Organization tenant.');
    return hospital;
  }

  private toPatch(command: UpdateHospitalContactCommand): Record<string, string> {
    const fields = ['contactTypeReferenceValueId', 'contactName', 'designation', 'emailAddress', 'phoneNumber', 'mobileNumber'] as const;
    return Object.fromEntries(fields.filter((field) => command[field] !== undefined).map((field) => [field, command[field]! ]));
  }
}
