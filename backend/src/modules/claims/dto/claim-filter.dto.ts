import { IsOptional, IsString } from 'class-validator';

export class ClaimFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  patient_id?: string;

  @IsOptional()
  @IsString()
  hospital_id?: string;

  @IsOptional()
  @IsString()
  payer_id?: string;
}