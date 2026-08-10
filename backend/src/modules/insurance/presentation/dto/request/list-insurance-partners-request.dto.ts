import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const INSURANCE_PARTNER_SORT_FIELDS = [
  'partner_code',
  'display_name',
  'legal_name',
  'created_at',
  'updated_at',
] as const;

export type InsurancePartnerSortField =
  (typeof INSURANCE_PARTNER_SORT_FIELDS)[number];

export class ListInsurancePartnersRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsUUID('4')
  partnerTypeReferenceValueId?: string;

  @IsOptional()
  @IsUUID('4')
  operationalStatusReferenceValueId?: string;

  @IsOptional()
  @IsIn(INSURANCE_PARTNER_SORT_FIELDS)
  sortBy: InsurancePartnerSortField = 'created_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}