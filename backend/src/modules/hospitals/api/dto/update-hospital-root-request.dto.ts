import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateHospitalRootRequestDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsUUID()
  hospitalTypeReferenceValueId?: string;

  @IsOptional()
  @IsUUID()
  ownershipTypeReferenceValueId?: string;

  @IsOptional()
  @IsUUID()
  operationalStatusReferenceValueId?: string;
}
