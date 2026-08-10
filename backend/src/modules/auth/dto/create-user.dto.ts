import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsUUID()
  hospitalId?: string;

  @IsOptional()
  @IsString()
  mobileNo?: string;
}