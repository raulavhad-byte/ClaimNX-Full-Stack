import { IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { SortDto } from '../../../shared/dto/sort.dto';

export class UserFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  hospitalId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}