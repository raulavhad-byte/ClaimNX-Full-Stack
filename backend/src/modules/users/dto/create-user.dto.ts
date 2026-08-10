import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  roleId?: string;

  @IsOptional()
  hospitalId?: string;

  @IsOptional()
  mobileNo?: string;
}