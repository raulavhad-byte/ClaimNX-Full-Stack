import { IsInt, Min } from 'class-validator';

export class ReportingRetireRequestDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
