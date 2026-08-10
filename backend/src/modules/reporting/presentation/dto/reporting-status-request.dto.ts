import { IsInt, IsUUID, Min } from 'class-validator';

export class ReportingStatusRequestDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsUUID()
  operationalStatusReferenceValueId!: string;
}
