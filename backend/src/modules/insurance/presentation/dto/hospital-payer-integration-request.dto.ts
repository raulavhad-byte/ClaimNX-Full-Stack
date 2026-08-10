import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * External secret-manager pointer only. This API never accepts a password,
 * token, mailbox credential, or any other secret value.
 */
class HospitalPayerIntegrationConfigurationRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  integrationCode!: string;

  @IsUUID('4')
  submissionChannelReferenceValueId!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  payerEmailAddress?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  notificationEmailAddress?: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  portalUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  portalUserName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  credentialSecretReference?: string | null;
}

export class CreateHospitalPayerIntegrationRequestDto extends HospitalPayerIntegrationConfigurationRequestDto {
  @IsUUID('4')
  insurancePartnerId!: string;

  @IsUUID('4')
  operationalStatusReferenceValueId!: string;
}

export class UpdateHospitalPayerIntegrationRequestDto extends HospitalPayerIntegrationConfigurationRequestDto {
  @IsInt()
  @Min(1)
  version!: number;
}

export class ChangeHospitalPayerIntegrationStatusRequestDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsUUID('4')
  operationalStatusReferenceValueId!: string;
}

export class RetireHospitalPayerIntegrationRequestDto {
  @IsInt()
  @Min(1)
  version!: number;
}
