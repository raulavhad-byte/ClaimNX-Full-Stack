import {
  ClaimDomainError,
  UnimplementedClaimProductStrategyError,
} from './claim-domain.error';

export type ClaimProductCode = 'ICA' | 'PRE_POST' | 'PARTNER_PROCESSING' | 'KYP';

export type ClaimLifecycleStatusCode =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'READY_FOR_SUBMISSION'
  | 'SUBMISSION_REQUESTED'
  | 'SUBMITTED'
  | 'QUERY_RAISED'
  | 'PAYER_RESPONSE_RECEIVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CLOSED';

export interface ClaimProductStrategy {
  readonly productCode: ClaimProductCode;
  validateTransition(
    currentStatus: ClaimLifecycleStatusCode,
    targetStatus: ClaimLifecycleStatusCode,
  ): void;
}

const activeTransitionMap: Readonly<Record<ClaimLifecycleStatusCode, readonly ClaimLifecycleStatusCode[]>> = {
  DRAFT: ['READY_FOR_REVIEW', 'CANCELLED'],
  READY_FOR_REVIEW: ['READY_FOR_SUBMISSION', 'CANCELLED'],
  READY_FOR_SUBMISSION: ['SUBMISSION_REQUESTED', 'CANCELLED'],
  SUBMISSION_REQUESTED: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['QUERY_RAISED', 'PAYER_RESPONSE_RECEIVED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  QUERY_RAISED: ['SUBMITTED', 'CANCELLED'],
  PAYER_RESPONSE_RECEIVED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CANCELLED: [],
  CLOSED: [],
};

/** ICA is the ClaimNX cashless / pre-authorization operational pathway. */
export class IcaPrePostClaimProductStrategy implements ClaimProductStrategy {
  constructor(readonly productCode: Extract<ClaimProductCode, 'ICA' | 'PRE_POST'>) {}

  validateTransition(
    currentStatus: ClaimLifecycleStatusCode,
    targetStatus: ClaimLifecycleStatusCode,
  ): void {
    if (!activeTransitionMap[currentStatus].includes(targetStatus)) {
      throw new ClaimDomainError(
        `Claim transition from ${currentStatus} to ${targetStatus} is not allowed for ${this.productCode}.`,
      );
    }
  }
}

/** Future product strategy: permits Draft creation/read but blocks operational work. */
export class GuardedClaimProductStrategy implements ClaimProductStrategy {
  constructor(readonly productCode: Extract<ClaimProductCode, 'PARTNER_PROCESSING' | 'KYP'>) {}

  validateTransition(): void {
    throw new UnimplementedClaimProductStrategyError(this.productCode);
  }
}

export class ClaimProductStrategyFactory {
  static forProduct(productCode: ClaimProductCode): ClaimProductStrategy {
    switch (productCode) {
      case 'ICA':
      case 'PRE_POST':
        return new IcaPrePostClaimProductStrategy(productCode);
      case 'PARTNER_PROCESSING':
      case 'KYP':
        return new GuardedClaimProductStrategy(productCode);
      default: {
        const exhaustive: never = productCode;
        throw new ClaimDomainError(`Unsupported Claim Product ${exhaustive}.`);
      }
    }
  }
}
