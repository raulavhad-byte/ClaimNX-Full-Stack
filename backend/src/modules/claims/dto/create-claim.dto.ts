import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateClaimDto {
  @IsUUID()
  hospital_id: string;

  @IsUUID()
  patient_id: string;

  @IsUUID()
  payer_id: string;

  @IsString()
  @MaxLength(100)
  case_ref_id: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  estimated_cost?: number;

  @IsOptional()
  @IsNumber()
  approved_amount?: number;

  @IsOptional()
  @IsNumber()
  settled_amount?: number;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsDateString()
  admission_date?: string;

  @IsOptional()
  @IsDateString()
  discharge_date?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsObject()
  form_data?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  last_updated_by?: string;
}