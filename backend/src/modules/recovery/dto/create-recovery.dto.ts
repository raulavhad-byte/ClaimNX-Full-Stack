import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRecoveryDto {
  @IsUUID()
  @IsNotEmpty()
  claim_id: string;

  @IsNumber()
  @Min(0)
  recoverable_amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recovered_amount?: number;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;
}