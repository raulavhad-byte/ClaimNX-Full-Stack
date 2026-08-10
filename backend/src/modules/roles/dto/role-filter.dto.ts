import { PaginationDto } from '../../../shared/dto/pagination.dto';

import { IsIn, IsOptional, IsString } from 'class-validator';

export class RoleFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sortBy = 'created_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}