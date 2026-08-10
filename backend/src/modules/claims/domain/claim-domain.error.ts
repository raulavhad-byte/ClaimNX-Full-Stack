/** Domain rule violation for the Phase 8 Claim aggregate. */
export class ClaimDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaimDomainError';
  }
}

/** Raised when a future product attempts an operational Phase 8 transition. */
export class UnimplementedClaimProductStrategyError extends ClaimDomainError {
  constructor(productCode: string) {
    super(
      `Operational lifecycle transitions are not implemented for Claim Product ${productCode}.`,
    );
    this.name = 'UnimplementedClaimProductStrategyError';
  }
}
