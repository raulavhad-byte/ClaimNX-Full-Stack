import { IsDateString, IsIn, IsString } from 'class-validator';

export const MIS_REPORT_TYPES = [
  'Business',
  'Admission',
  'Discharge',
  'Outstanding',
  'TAT',
  'File Dispatch Pending',
] as const;

export type MisReportType = (typeof MIS_REPORT_TYPES)[number];

export class MisReportQueryDto {
  @IsString()
  @IsIn(MIS_REPORT_TYPES)
  type: MisReportType;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;
}
