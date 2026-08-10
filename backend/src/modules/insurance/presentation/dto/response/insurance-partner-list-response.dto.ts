export class InsurancePartnerListItemResponseDto {
  insurancePartnerId!: string;
  partnerCode!: string;
  displayName!: string;
  legalName!: string | null;
  partnerTypeReferenceValueId!: string;
  operationalStatusReferenceValueId!: string;
  registrationNumber!: string | null;
  version!: number;
}

export class InsurancePartnerListResponseDto {
  items!: InsurancePartnerListItemResponseDto[];

  page!: number;
  limit!: number;

  totalRecords!: number;
  totalPages!: number;

  hasNextPage!: boolean;
  hasPreviousPage!: boolean;
}