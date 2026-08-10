import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class InsuranceFilterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBooleanString()
  on_panel?: string;

  @IsOptional()
  @IsBooleanString()
  rpa_supported?: string;

  @IsOptional()
  @IsBooleanString()
  auto_email_enabled?: string;
}