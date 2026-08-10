import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateHospitalDto {
  @IsString()
  hospital_name: string;

  @IsOptional()
  @IsString()
  hospital_code?: string;

  @IsOptional()
  @IsString()
  registration_no?: string;

  @IsOptional()
  @IsString()
  gst_no?: string;

  @IsOptional()
  @IsString()
  pan_no?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsUUID()
  parent_hospital_id?: string;
}