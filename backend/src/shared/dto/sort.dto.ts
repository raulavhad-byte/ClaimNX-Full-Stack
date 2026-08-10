import { IsIn, IsOptional, IsString } from 'class-validator';

export class SortDto {
  @IsOptional()
  @IsString()
  sortBy = 'created_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}