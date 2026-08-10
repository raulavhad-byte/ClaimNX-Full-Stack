import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateHospitalAddressRequestDto {
  @IsUUID()
  addressTypeReferenceValueId: string;

  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsUUID()
  countryId: string;

  @IsUUID()
  stateId: string;

  @IsUUID()
  cityId: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsBoolean()
  isPrimary: boolean;
}

export class CreateHospitalContactRequestDto {
  @IsUUID()
  contactTypeReferenceValueId: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsEmail()
  emailAddress?: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @IsBoolean()
  isPrimary: boolean;
}

export class CreateHospitalDepartmentRequestDto {
  @IsString()
  @IsNotEmpty()
  departmentCode: string;

  @IsString()
  @IsNotEmpty()
  departmentName: string;

  @IsOptional()
  @IsUUID()
  departmentTypeReferenceValueId?: string;

  @IsUUID()
  operationalStatusReferenceValueId: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateHospitalRequestDto {
  @IsString()
  @IsNotEmpty()
  hospitalCode: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsUUID()
  hospitalTypeReferenceValueId: string;

  @IsOptional()
  @IsUUID()
  ownershipTypeReferenceValueId?: string;

  @IsUUID()
  operationalStatusReferenceValueId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHospitalAddressRequestDto)
  addresses: CreateHospitalAddressRequestDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHospitalContactRequestDto)
  contacts: CreateHospitalContactRequestDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHospitalDepartmentRequestDto)
  departments: CreateHospitalDepartmentRequestDto[];
}
