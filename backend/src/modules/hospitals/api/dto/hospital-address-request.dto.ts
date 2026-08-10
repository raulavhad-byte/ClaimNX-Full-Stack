import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateHospitalAddressDto {
  @IsUUID() addressTypeReferenceValueId: string;
  @IsString() @IsNotEmpty() addressLine1: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() landmark?: string;
  @IsUUID() countryId: string;
  @IsUUID() stateId: string;
  @IsUUID() cityId: string;
  @IsString() @IsNotEmpty() postalCode: string;
}

export class UpdateHospitalAddressDto {
  @IsInt() @Min(1) version: number;
  @IsOptional() @IsUUID() addressTypeReferenceValueId?: string;
  @IsOptional() @IsString() @IsNotEmpty() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() landmark?: string;
  @IsOptional() @IsUUID() countryId?: string;
  @IsOptional() @IsUUID() stateId?: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsString() @IsNotEmpty() postalCode?: string;
}

export class DeleteHospitalAddressDto {
  @IsInt() @Min(1) version: number;
}
