import { IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { SortDto } from '../../../shared/dto/sort.dto';

export class DocumentFilterDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  claim_id?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy = 'uploaded_at';

  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'desc';
}