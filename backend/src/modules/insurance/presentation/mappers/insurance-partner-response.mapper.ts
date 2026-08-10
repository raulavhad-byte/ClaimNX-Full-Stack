import {
  InsurancePartner,
  InsurancePartnerContact,
} from '../../domain/insurance-partner.aggregate';
import {
  InsurancePartnerContactResponseDto,
  InsurancePartnerResponseDto,
} from '../dto/response/insurance-partner-response.dto';

export class InsurancePartnerResponseMapper {
  static toResponse(
    partner: InsurancePartner,
  ): InsurancePartnerResponseDto {
    const snapshot = partner.snapshot;

    return {
      insurancePartnerId: snapshot.insurancePartnerId,
      partnerCode: snapshot.partnerCode,
      displayName: snapshot.displayName,
      legalName: snapshot.legalName ?? null,
      partnerTypeReferenceValueId:
        snapshot.partnerTypeReferenceValueId,
      operationalStatusReferenceValueId:
        snapshot.operationalStatusReferenceValueId,
      registrationNumber: snapshot.registrationNumber ?? null,
      version: snapshot.version,
      contacts: partner.insurancePartnerContacts.map(
        (contact) => this.toContactResponse(contact),
      ),
    };
  }

  private static toContactResponse(
    contact: InsurancePartnerContact,
  ): InsurancePartnerContactResponseDto {
    return {
      insurancePartnerContactId:
        contact.insurancePartnerContactId,
      insurancePartnerId: contact.insurancePartnerId,
      contactTypeReferenceValueId:
        contact.contactTypeReferenceValueId,
      contactName: contact.contactName,
      designation: contact.designation ?? null,
      emailAddress: contact.emailAddress ?? null,
      phoneNumber: contact.phoneNumber,
      mobileNumber: contact.mobileNumber ?? null,
      isPrimary: contact.isPrimary,
      version: contact.version,
    };
  }
}