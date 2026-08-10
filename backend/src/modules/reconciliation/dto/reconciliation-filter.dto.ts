import {
  IsOptional,
  IsInt,
  Min,
  IsUUID,
  IsString,
} from 'class-validator';

import { Type } from 'class-transformer';

export class ReconciliationFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  claim_id?: string;

  @IsOptional()
  @IsString()
  status?: string;
}