import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateInsurancePartnerRequestDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;
}