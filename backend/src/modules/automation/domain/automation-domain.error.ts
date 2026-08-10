/** Domain rule violation for Phase 10 AI & Automation aggregates. */
export class AutomationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AutomationDomainError';
  }
}

/** Raised before an unsupported Claim product can run an operational automation purpose. */
export class UnimplementedAutomationProductStrategyError extends AutomationDomainError {
  constructor(productCode: string, purposeCode: string) {
    super(`Automation purpose ${purposeCode} is not implemented for Claim Product ${productCode}.`);
    this.name = 'UnimplementedAutomationProductStrategyError';
  }
}
