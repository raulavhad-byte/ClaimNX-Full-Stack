import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateHospitalContactDto {
  @IsUUID() contactTypeReferenceValueId: string;
  @IsString() @IsNotEmpty() contactName: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsEmail() emailAddress?: string;
  @IsString() @IsNotEmpty() phoneNumber: string;
  @IsOptional() @IsString() mobileNumber?: string;
}
export class UpdateHospitalContactDto {
  @IsInt() @Min(1) version: number;
  @IsOptional() @IsUUID() contactTypeReferenceValueId?: string;
  @IsOptional() @IsString() @IsNotEmpty() contactName?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsEmail() emailAddress?: string;
  @IsOptional() @IsString() @IsNotEmpty() phoneNumber?: string;
  @IsOptional() @IsString() mobileNumber?: string;
}
export class DeleteHospitalContactDto { @IsInt() @Min(1) version: number; }
