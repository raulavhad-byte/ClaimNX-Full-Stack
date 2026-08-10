import { FilterDto } from '../../../shared/dto/filter.dto';
import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { SortDto } from '../../../shared/dto/sort.dto';

import {
  IsOptional,
  IsString,
} from 'class-validator';

export class RecoveryFilterDto
  extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  claim_id?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy = 'created_at';

  @IsOptional()
  @IsString()
  sortOrder: 'asc' | 'desc' = 'desc';
}