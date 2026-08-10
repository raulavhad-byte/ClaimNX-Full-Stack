export class ReportingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportingDomainError';
  }
}

export class ReportingValidationError extends ReportingDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ReportingValidationError';
  }
}

export class ReportingConflictError extends ReportingDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ReportingConflictError';
  }
}
