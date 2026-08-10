import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class CreateOrganizationConfigurationOverrideRequestDto {
  @IsUUID()
  configurationDefinitionId: string;

  @IsString()
  @IsNotEmpty()
  configValue: string;
}

export class UpdateOrganizationConfigurationOverrideRequestDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  @IsNotEmpty()
  configValue: string;
}

export class ChangeOrganizationConfigurationStatusRequestDto {
  @IsInt()
  @Min(1)
  version: number;
}
