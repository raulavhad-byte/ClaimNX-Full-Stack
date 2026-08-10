import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateInsurancePartnerRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  partnerCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string | null;

  @IsUUID('4')
  partnerTypeReferenceValueId!: string;

  @IsUUID('4')
  operationalStatusReferenceValueId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string | null;
}