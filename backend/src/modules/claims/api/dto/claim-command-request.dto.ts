import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClaimRequestDto {
  @IsOptional() @IsUUID('4') patientId?: string | null;
  @IsUUID('4') claimProductReferenceValueId!: string;
  @IsUUID('4') claimTypeReferenceValueId!: string;
  @IsUUID('4') draftLifecycleStatusReferenceValueId!: string;
  @IsOptional() @IsUUID('4') hospitalInsurancePartnerIntegrationId?: string | null;
  @Matches(/^[A-Za-z]{3}$/) currencyCode!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) totalClaimedAmount!: number;
  @IsOptional() @IsString() @MaxLength(100) authorizationReference?: string | null;
}

export class TransitionClaimLifecycleRequestDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsUUID('4') targetLifecycleStatusReferenceValueId!: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) transitionReason!: string;
}

export class CreateClaimAuthorizationRequestDto {
  @IsUUID('4') authorizationTypeReferenceValueId!: string;
  @IsUUID('4') authorizationStatusReferenceValueId!: string;
  @IsOptional() @IsString() @MaxLength(100) authorizationNumber?: string | null;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) approvedAmount?: number | null;
  @IsOptional() @IsDateString() validFrom?: string | null;
  @IsOptional() @IsDateString() validUntil?: string | null;
}

export class CreateClaimQueryRequestDto {
  @IsUUID('4') queryTypeReferenceValueId!: string;
  @IsUUID('4') queryStatusReferenceValueId!: string;
  @IsOptional() @IsString() @MaxLength(100) payerQueryReference?: string | null;
  @IsString() @IsNotEmpty() @MaxLength(10000) queryText!: string;
  @IsOptional() @IsDateString() dueAt?: string | null;
}

export class CreateClaimSubmissionIntentRequestDto {
  @IsUUID('4') hospitalInsurancePartnerIntegrationId!: string;
  @IsUUID('4') channelReferenceValueId!: string;
  @IsUUID('4') submissionStatusReferenceValueId!: string;
}

export class ClaimListQueryDto {
  @IsOptional() @IsUUID('4') claimProductReferenceValueId?: string;
  @IsOptional() @IsUUID('4') lifecycleStatusReferenceValueId?: string;
}
