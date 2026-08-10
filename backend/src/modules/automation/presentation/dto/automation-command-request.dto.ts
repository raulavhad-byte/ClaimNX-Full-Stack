import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAutomationWorkRequestDto {
  @IsUUID('4') claimId!: string;
  @IsUUID('4') claimProductReferenceValueId!: string;
  @IsUUID('4') workPurposeReferenceValueId!: string;
  @IsUUID('4') queuedWorkStatusReferenceValueId!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) sourceRecordType!: string;
  @IsOptional() @IsString() @MaxLength(150) sourceRecordId?: string | null;
  @IsOptional() @IsUUID('4') correlationId?: string;
  @IsString() @IsNotEmpty() @MaxLength(150) idempotencyKey!: string;
  @IsOptional() @IsObject() safeInputSummary?: Record<string, unknown> | null;
}

export class StartAutomationWorkRequestDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @IsUUID('4') inProgressStatusReferenceValueId!: string;
}

export class RecordAutomationJobAttemptDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRequestVersion!: number;
  @Type(() => Number) @IsInt() @Min(1) attemptNumber!: number;
  @IsUUID('4') jobStatusReferenceValueId!: string;
  @IsUUID('4') resultingWorkStatusReferenceValueId!: string;
  @IsOptional() @IsString() @MaxLength(100) providerCode?: string | null;
  @IsOptional() @IsString() @MaxLength(200) modelIdentifier?: string | null;
  @IsOptional() @IsString() @MaxLength(100) policyVersion?: string | null;
  @IsOptional() @IsString() @MaxLength(200) externalCorrelationReference?: string | null;
  @IsOptional() @IsString() @MaxLength(100) failureClassification?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) failureSummary?: string | null;
  @IsDateString() startedAt!: string;
  @IsDateString() completedAt!: string;
}

export class CreateAutomationReviewCaseDto {
  @IsUUID('4') claimId!: string;
  @IsUUID('4') automationWorkRequestId!: string;
  @IsUUID('4') reviewTypeReferenceValueId!: string;
  @IsUUID('4') openReviewStatusReferenceValueId!: string;
  @IsOptional() @IsUUID('4') correlationId?: string;
  @IsOptional() @IsString() @MaxLength(4000) summary?: string | null;
}

export class RecordAutomationReviewDecisionDto {
  @Type(() => Number) @IsInt() @Min(1) expectedCaseVersion!: number;
  @Type(() => Number) @IsInt() @Min(1) decisionSequence!: number;
  @IsString() @IsNotEmpty() @MaxLength(100) decisionCode!: string;
  @IsOptional() @IsObject() finalValue?: Record<string, unknown> | null;
  @IsOptional() @IsString() @MaxLength(4000) decisionReason?: string | null;
  @IsUUID('4') reviewStatusReferenceValueId!: string;
}

export class CreateAutomationOwnerCommandRequestDto {
  @IsUUID('4') claimId!: string;
  @IsOptional() @IsUUID('4') automationReviewCaseId?: string | null;
  @IsString() @IsNotEmpty() @MaxLength(100) targetContext!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) commandType!: string;
  @IsOptional() @IsObject() commandPayload?: Record<string, unknown> | null;
  @IsUUID('4') commandStatusReferenceValueId!: string;
  @IsOptional() @IsUUID('4') correlationId?: string;
  @IsString() @IsNotEmpty() @MaxLength(150) idempotencyKey!: string;
}

export class CreatePayerDispatchTaskDto {
  @IsUUID('4') claimId!: string;
  @IsUUID('4') claimProductReferenceValueId!: string;
  @IsUUID('4') hospitalInsurancePartnerIntegrationId!: string;
  @IsUUID('4') dispatchChannelReferenceValueId!: string;
  @IsUUID('4') queuedDispatchStatusReferenceValueId!: string;
  @IsOptional() @IsString() @MaxLength(150) submissionIntentReference?: string | null;
  @IsOptional() @IsString() @MaxLength(512) credentialSecretReference?: string | null;
  @IsOptional() @IsUUID('4') correlationId?: string;
  @IsString() @IsNotEmpty() @MaxLength(150) idempotencyKey!: string;
}
