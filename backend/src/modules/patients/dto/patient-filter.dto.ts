import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class PatientFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;
}