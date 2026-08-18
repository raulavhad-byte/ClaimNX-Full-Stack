import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { REIMBURSEMENT_PRODUCTS } from './create-reimbursement-case.dto';
import type { ReimbursementProductCode } from './create-reimbursement-case.dto';

export class ReimbursementCaseFilterDto {
  @IsOptional() @IsUUID()
  hospitalId?: string;

  @IsOptional() @IsIn(REIMBURSEMENT_PRODUCTS)
  productCode?: ReimbursementProductCode;
}
