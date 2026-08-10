import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateReconciliationDto {
  @IsUUID()
  claim_id!: string;

  @IsNumber()
  amount_received!: number;

  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  bank_ref_no?: string;

  @IsOptional()
  @IsUUID()
  reconciled_by?: string;
}