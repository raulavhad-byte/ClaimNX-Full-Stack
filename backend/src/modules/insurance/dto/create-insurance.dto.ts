import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export enum InsuranceType {
  INSURER = 'Insurer',
  TPA = 'TPA',
}

export class CreateInsuranceDto {
  @IsString()
  name: string;

  @IsString()
  email_id: string;

  @IsUrl()
  portal_link: string;

  @IsEnum(InsuranceType)
  type: InsuranceType;

  @IsString()
  automation_type: string;

  @IsBoolean()
  on_panel: boolean;

  @IsBoolean()
  rpa_supported: boolean;

  @IsBoolean()
  auto_email_enabled: boolean;

  @IsOptional()
  @IsString()
  template_name?: string;

  @IsOptional()
  @IsString()
  data?: string;
}