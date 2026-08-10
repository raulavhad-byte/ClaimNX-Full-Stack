import { IsInt, IsUUID, Min } from 'class-validator';

/** Adds an existing IAM User to the Organization tenant. */
export class AddOrganizationMemberRequestDto {
  @IsUUID()
  userId: string;
}

/** Required by every Organization Member lifecycle mutation. */
export class ChangeOrganizationMemberStatusRequestDto {
  @IsInt()
  @Min(1)
  version: number;
}
