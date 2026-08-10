/** Domain rule violations for Phase 9 Financial Management. */
export class FinancialDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinancialDomainError';
  }
}

export class FinancialVersionConflictError extends FinancialDomainError {
  constructor(aggregateName: string) {
    super(`${aggregateName} version conflict. Reload the aggregate before retrying the command.`);
    this.name = 'FinancialVersionConflictError';
  }
}
