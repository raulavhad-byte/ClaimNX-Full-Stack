export class InsurancePartnerContactResponseDto {
  insurancePartnerContactId!: string;
  insurancePartnerId!: string;
  contactTypeReferenceValueId!: string;
  contactName!: string;
  designation!: string | null;
  emailAddress!: string | null;
  phoneNumber!: string;
  mobileNumber!: string | null;
  isPrimary!: boolean;
  version!: number;
}

export class InsurancePartnerResponseDto {
  insurancePartnerId!: string;
  partnerCode!: string;
  displayName!: string;
  legalName!: string | null;
  partnerTypeReferenceValueId!: string;
  operationalStatusReferenceValueId!: string;
  registrationNumber!: string | null;
  version!: number;
  contacts!: InsurancePartnerContactResponseDto[];
}