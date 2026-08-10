import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

class FinancialScopedReferenceDto {
  @IsUUID('4') claimProductReferenceValueId!: string;
  @IsString() @Matches(/^[A-Z]{3}$/) currencyCode!: string;
}

export class CreateFinancialRemittanceBatchRequestDto extends FinancialScopedReferenceDto {
  @IsUUID('4') insurancePartnerId!: string;
  @IsUUID('4') remittanceSourceTypeReferenceValueId!: string;
  @IsUUID('4') remittanceStatusReferenceValueId!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) remittanceReference!: string;
  @IsDateString() receivedAt!: string;
  @Type(() => Number) @IsNumber() @Min(0) grossAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) netAmount!: number;
  @IsOptional() @IsString() @MaxLength(150) externalReference?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string | null;
}
export class CreateFinancialRemittanceLineItemRequestDto {
  @IsUUID('4') financialRemittanceBatchId!: string;
  @IsOptional() @IsUUID('4') claimId?: string | null;
  @IsUUID('4') lineStatusReferenceValueId!: string;
  @IsOptional() @IsString() @MaxLength(150) payerClaimReference?: string | null;
  @IsString() @IsNotEmpty() @MaxLength(100) lineReference!: string;
  @Type(() => Number) @IsNumber() @Min(0) grossAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) deductionAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) netAmount!: number;
  @IsString() @Matches(/^[A-Z]{3}$/) currencyCode!: string;
  @IsOptional() @IsString() @MaxLength(4000) receivedPayloadSummary?: string | null;
}
export class CreateFinancialRemittanceEvidenceRequestDto {
  @IsUUID('4') financialRemittanceBatchId!: string;
  @IsString() @IsNotEmpty() @MaxLength(1024) storageObjectReference!: string;
  @IsString() @IsNotEmpty() @MaxLength(255) fileName!: string;
  @IsOptional() @IsString() @MaxLength(150) mimeType?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) fileSizeBytes?: number | null;
  @IsOptional() @IsString() @MaxLength(128) documentHash?: string | null;
}
export class CreateFinancialClaimSettlementRequestDto extends FinancialScopedReferenceDto {
  @IsUUID('4') claimId!: string; @IsUUID('4') insurancePartnerId!: string;
  @IsOptional() @IsUUID('4') financialRemittanceLineItemId?: string | null;
  @IsUUID('4') settlementStatusReferenceValueId!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) settlementReference!: string;
  @IsOptional() @IsString() @MaxLength(150) payerSettlementReference?: string | null;
  @IsDateString() settledAt!: string;
  @Type(() => Number) @IsNumber() @Min(0) grossPayerPaidAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) tdsAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) payerDeductionAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) otherPayerAdjustmentAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) netPayerSettlementAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) patientResponsibilityAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) hospitalWriteOffAmount!: number;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string | null;
}
export class CreateFinancialSettlementDeductionRequestDto {
  @IsUUID('4') financialClaimSettlementId!: string; @IsUUID('4') deductionTypeReferenceValueId!: string;
  @IsOptional() @IsString() @MaxLength(100) deductionReference?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsString() @Matches(/^[A-Z]{3}$/) currencyCode!: string;
}
export class CreateFinancialRecoveryRequestDto extends FinancialScopedReferenceDto {
  @IsUUID('4') claimId!: string; @IsOptional() @IsUUID('4') financialClaimSettlementId?: string | null; @IsUUID('4') insurancePartnerId!: string;
  @IsUUID('4') recoveryTypeReferenceValueId!: string; @IsUUID('4') recoveryStatusReferenceValueId!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) recoveryReference!: string; @IsDateString() openedAt!: string; @IsOptional() @IsDateString() dueAt?: string | null;
  @Type(() => Number) @IsNumber() @Min(0) originalAmount!: number; @Type(() => Number) @IsNumber() @Min(0) recoveredAmount!: number; @Type(() => Number) @IsNumber() @Min(0) outstandingAmount!: number;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string | null;
}
export class CreateFinancialPostingRequestDto extends FinancialScopedReferenceDto {
  @IsOptional() @IsUUID('4') claimId?: string | null; @IsOptional() @IsUUID('4') financialClaimSettlementId?: string | null; @IsOptional() @IsUUID('4') financialRecoveryId?: string | null;
  @IsUUID('4') postingTypeReferenceValueId!: string; @IsString() @IsNotEmpty() @MaxLength(100) postingReference!: string; @Type(() => Number) @IsInt() @Min(1) postingSequence!: number; @IsDateString() postedAt!: string;
  @IsString() @IsNotEmpty() @MaxLength(50) debitAccountCode!: string; @IsString() @IsNotEmpty() @MaxLength(50) creditAccountCode!: string; @Type(() => Number) @IsNumber() @Min(0.01) amount!: number; @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
}
export class CreateFinancialBankStatementLineRequestDto {
  @IsString() @IsNotEmpty() @MaxLength(150) bankTransactionReference!: string; @IsString() @IsNotEmpty() @MaxLength(150) bankAccountReference!: string; @IsDateString() transactionAt!: string; @IsOptional() @IsDateString() valueDate?: string | null;
  @IsString() @Matches(/^[A-Z]{3}$/) currencyCode!: string; @Type(() => Number) @IsNumber() @Min(0) creditAmount!: number; @Type(() => Number) @IsNumber() @Min(0) debitAmount!: number; @IsOptional() @IsString() @MaxLength(4000) narration?: string | null; @IsUUID('4') bankMatchStatusReferenceValueId!: string;
}
export class CreateFinancialBankMatchRequestDto {
  @IsUUID('4') financialBankStatementLineId!: string; @IsOptional() @IsUUID('4') financialRemittanceBatchId?: string | null; @IsOptional() @IsUUID('4') financialClaimSettlementId?: string | null; @IsUUID('4') bankMatchStatusReferenceValueId!: string; @Type(() => Number) @IsNumber() @Min(0.01) matchedAmount!: number; @IsDateString() matchedAt!: string; @IsOptional() @IsString() @MaxLength(4000) notes?: string | null;
}
