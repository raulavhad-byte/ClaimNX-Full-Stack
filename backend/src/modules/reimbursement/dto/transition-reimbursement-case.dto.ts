import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class TransitionReimbursementCaseDto {
  @IsString() @MaxLength(80)
  targetStatusCode: string;

  @IsOptional() @IsString() @MaxLength(4000)
  reason?: string;

  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}
