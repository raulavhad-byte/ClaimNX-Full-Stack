import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateUserSessionDto {
  user_id: string;

  refresh_token_hash: string;

  device_name: string;

  ip_address: string;

  user_agent: string;

  expires_at: string;

  is_revoked: boolean;
}