import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class HospitalFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy = 'created_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}