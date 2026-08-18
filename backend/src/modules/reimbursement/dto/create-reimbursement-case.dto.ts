import { IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export const REIMBURSEMENT_PRODUCTS = ['ICA', 'PRE_POST', 'PARTNER_PROCESSING', 'KYP', 'RECOVERY_RECON'] as const;
export type ReimbursementProductCode = (typeof REIMBURSEMENT_PRODUCTS)[number];

export class CreateReimbursementCaseDto {
  @IsIn(REIMBURSEMENT_PRODUCTS)
  productCode: ReimbursementProductCode;

  @IsUUID()
  hospitalId: string;

  @IsOptional() @IsUUID()
  claimId?: string;

  @IsOptional() @IsUUID()
  parentCaseId?: string;

  @IsOptional() @IsUUID()
  patientId?: string;

  @IsOptional() @IsUUID()
  payerId?: string;

  @IsOptional() @IsNumber() @Min(0)
  totalClaimedAmount?: number;

  @IsOptional() @IsObject()
  metadata?: Record<string, unknown>;
}
