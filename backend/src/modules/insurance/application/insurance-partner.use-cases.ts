import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  InsuranceDomainError,
  InsurancePartner,
  InsurancePartnerContact,
} from '../domain/insurance-partner.aggregate';
import { InsurancePartnerRepository } from '../infrastructure/insurance-partner.repository';
import { InsuranceAccessService } from './insurance-access.service';

export interface InsurancePartnerContext {
  actorUserId: string;
  insurancePartnerId: string;
}

export interface CreateInsurancePartnerCommand {
  actorUserId: string;
  partnerCode: string;
  displayName: string;
  legalName?: string | null;
  partnerTypeReferenceValueId: string;
  operationalStatusReferenceValueId: string;
  registrationNumber?: string | null;
}

export interface UpdateInsurancePartnerCommand extends InsurancePartnerContext {
  version: number;
  displayName?: string;
  legalName?: string | null;
  registrationNumber?: string | null;
}

export interface ChangeInsurancePartnerStatusCommand extends InsurancePartnerContext {
  version: number;
  operationalStatusReferenceValueId: string;
}

export interface CreateInsurancePartnerContactCommand extends InsurancePartnerContext {
  contactTypeReferenceValueId: string;
  contactName: string;
  designation?: string | null;
  emailAddress?: string | null;
  phoneNumber: string;
  mobileNumber?: string | null;
}

export interface UpdateInsurancePartnerContactCommand extends InsurancePartnerContext {
  insurancePartnerContactId: string;
  version: number;
  contactTypeReferenceValueId?: string;
  contactName?: string;
  designation?: string | null;
  emailAddress?: string | null;
  phoneNumber?: string;
  mobileNumber?: string | null;
}

export interface ChangeInsurancePartnerContactCommand extends InsurancePartnerContext {
  insurancePartnerContactId: string;
  version: number;
}

@Injectable()
export class InsurancePartnerUseCases {
  constructor(
    private readonly partnerRepository: InsurancePartnerRepository,
    private readonly accessService: InsuranceAccessService,
  ) {}

  async get(actorUserId: string, insurancePartnerId: string): Promise<InsurancePartner> {
    await this.accessService.assertActiveUser(actorUserId);
    return this.requirePartner(insurancePartnerId);
  }

  async create(command: CreateInsurancePartnerCommand): Promise<InsurancePartner> {
    await this.accessService.assertActiveUser(command.actorUserId);
    const partner = this.rethrowDomainError(() =>
      InsurancePartner.create({
        insurancePartnerId: randomUUID(),
        partnerCode: command.partnerCode,
        displayName: command.displayName,
        legalName: command.legalName,
        partnerTypeReferenceValueId: command.partnerTypeReferenceValueId,
        operationalStatusReferenceValueId: command.operationalStatusReferenceValueId,
        registrationNumber: command.registrationNumber,
        version: 1,
      }),
    );

    await this.partnerRepository.create({ ...partner.snapshot, actorUserId: command.actorUserId });
    return this.requirePartner(partner.id);
  }

  async update(command: UpdateInsurancePartnerCommand): Promise<InsurancePartner> {
    await this.accessService.assertActiveUser(command.actorUserId);
    await this.requirePartner(command.insurancePartnerId);
    const patch = pick(command, ['displayName', 'legalName', 'registrationNumber']);
    if (Object.keys(patch).length === 0) {
      throw new ConflictException('At least one Insurance Partner attribute must be supplied.');
    }
    await this.requireMutation(
      this.partnerRepository.update(command.insurancePartnerId, command.version, command.actorUserId, patch),
      'Insurance Partner was changed, retired, or no longer available. Refresh and retry.',
    );
    return this.requirePartner(command.insurancePartnerId);
  }

  async setStatus(command: ChangeInsurancePartnerStatusCommand): Promise<InsurancePartner> {
    await this.accessService.assertActiveUser(command.actorUserId);
    await this.requirePartner(command.insurancePartnerId);
    await this.requireMutation(
      this.partnerRepository.setStatus(command.insurancePartnerId, command.version, command.operationalStatusReferenceValueId, command.actorUserId),
      'Insurance Partner was changed, retired, or no longer available. Refresh and retry.',
    );
    return this.requirePartner(command.insurancePartnerId);
  }

  async retire(command: InsurancePartnerContext & { version: number }): Promise<void> {
    await this.accessService.assertActiveUser(command.actorUserId);
    await this.requirePartner(command.insurancePartnerId);
    await this.requireMutation(
      this.partnerRepository.softDelete(command.insurancePartnerId, command.version, command.actorUserId),
      'Insurance Partner cannot be retired because it changed, is already retired, or has active dependencies.',
    );
  }

  async createContact(command: CreateInsurancePartnerContactCommand): Promise<InsurancePartnerContact> {
    await this.accessService.assertActiveUser(command.actorUserId);
    const partner = await this.requirePartner(command.insurancePartnerId);
    const contact: InsurancePartnerContact = {
      insurancePartnerContactId: randomUUID(), insurancePartnerId: partner.id,
      contactTypeReferenceValueId: command.contactTypeReferenceValueId, contactName: command.contactName,
      designation: command.designation, emailAddress: command.emailAddress, phoneNumber: command.phoneNumber,
      mobileNumber: command.mobileNumber, isPrimary: false, version: 1,
    };
    this.rethrowDomainError(() => partner.addContact(contact));
    await this.partnerRepository.createContact({ ...contact, actorUserId: command.actorUserId });
    return contact;
  }

  async updateContact(command: UpdateInsurancePartnerContactCommand): Promise<InsurancePartnerContact> {
    await this.accessService.assertActiveUser(command.actorUserId);
    const partner = await this.requirePartner(command.insurancePartnerId);
    this.rethrowDomainError(() => partner.assertContactCanBeChanged(command.insurancePartnerContactId));
    const patch = pick(command, ['contactTypeReferenceValueId', 'contactName', 'designation', 'emailAddress', 'phoneNumber', 'mobileNumber']);
    if (Object.keys(patch).length === 0) throw new ConflictException('At least one Contact attribute must be supplied.');
    await this.requireMutation(
      this.partnerRepository.updateContact(command.insurancePartnerId, command.insurancePartnerContactId, command.version, command.actorUserId, patch),
      'Insurance Partner Contact was changed, retired, or no longer available. Refresh and retry.',
    );
    return this.requireContact(command.insurancePartnerId, command.insurancePartnerContactId);
  }

  async setPrimaryContact(command: ChangeInsurancePartnerContactCommand): Promise<InsurancePartnerContact> {
    await this.accessService.assertActiveUser(command.actorUserId);
    const partner = await this.requirePartner(command.insurancePartnerId);
    this.rethrowDomainError(() => partner.setPrimaryContact(command.insurancePartnerContactId));
    await this.requireMutation(
      this.partnerRepository.setPrimaryContact(command.insurancePartnerId, command.insurancePartnerContactId, command.version, command.actorUserId),
      'Insurance Partner Contact was changed, retired, or no longer available. Refresh and retry.',
    );
    return this.requireContact(command.insurancePartnerId, command.insurancePartnerContactId);
  }

  async retireContact(command: ChangeInsurancePartnerContactCommand): Promise<void> {
    await this.accessService.assertActiveUser(command.actorUserId);
    const partner = await this.requirePartner(command.insurancePartnerId);
    this.rethrowDomainError(() => partner.assertContactCanBeChanged(command.insurancePartnerContactId));
    await this.requireMutation(
      this.partnerRepository.softDeleteContact(command.insurancePartnerId, command.insurancePartnerContactId, command.version, command.actorUserId),
      'Insurance Partner Contact was changed, retired, or no longer available. Refresh and retry.',
    );
  }

  private async requirePartner(insurancePartnerId: string): Promise<InsurancePartner> {
    const partner = await this.partnerRepository.findActiveById(insurancePartnerId);
    if (!partner) throw new NotFoundException('Insurance Partner was not found.');
    return partner;
  }

  private async requireContact(partnerId: string, contactId: string): Promise<InsurancePartnerContact> {
    const partner = await this.requirePartner(partnerId);
    return this.rethrowDomainError(() => partner.assertContactCanBeChanged(contactId));
  }

  private async requireMutation(operation: Promise<string | null>, message: string): Promise<string> {
    const value = await operation;
    if (!value) throw new ConflictException(message);
    return value;
  }

  private rethrowDomainError<T>(operation: () => T): T {
    try { return operation(); } catch (error) {
      if (error instanceof InsuranceDomainError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}

function pick<T extends object>(source: T, fields: readonly string[]): Record<string, string | null> {
  return Object.fromEntries(
    fields.filter((field) => Object.prototype.hasOwnProperty.call(source, field) && (source as Record<string, unknown>)[field] !== undefined)
      .map((field) => [field, (source as Record<string, string | null>)[field]]),
  );
}
