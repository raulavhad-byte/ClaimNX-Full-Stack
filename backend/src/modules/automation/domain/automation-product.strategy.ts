import { AutomationDomainError, UnimplementedAutomationProductStrategyError } from './automation-domain.error';

export type AutomationClaimProductCode = 'ICA' | 'PRE_POST' | 'PARTNER_PROCESSING' | 'KYP';
export type AutomationWorkPurposeCode =
  | 'DOCUMENT_EXTRACTION'
  | 'CLAIM_READINESS_SCORING'
  | 'FINANCIAL_INSIGHT'
  | 'PAYER_DISPATCH_ENQUEUE';

export interface AutomationProductStrategy {
  readonly productCode: AutomationClaimProductCode;
  assertPurposeSupported(purposeCode: AutomationWorkPurposeCode): void;
}

class ActiveAutomationProductStrategy implements AutomationProductStrategy {
  constructor(readonly productCode: Extract<AutomationClaimProductCode, 'ICA' | 'PRE_POST'>) {}

  assertPurposeSupported(): void {
    // ICA is the cashless / pre-authorization route. ICA and PRE_POST are active in Phase 10.
  }
}

class GuardedAutomationProductStrategy implements AutomationProductStrategy {
  constructor(
    readonly productCode: Extract<AutomationClaimProductCode, 'PARTNER_PROCESSING' | 'KYP'>,
  ) {}

  assertPurposeSupported(purposeCode: AutomationWorkPurposeCode): void {
    if (purposeCode !== 'DOCUMENT_EXTRACTION') {
      throw new UnimplementedAutomationProductStrategyError(this.productCode, purposeCode);
    }
  }
}

export class AutomationProductStrategyFactory {
  static forProduct(productCode: AutomationClaimProductCode): AutomationProductStrategy {
    switch (productCode) {
      case 'ICA':
      case 'PRE_POST':
        return new ActiveAutomationProductStrategy(productCode);
      case 'PARTNER_PROCESSING':
      case 'KYP':
        return new GuardedAutomationProductStrategy(productCode);
      default: {
        const exhaustive: never = productCode;
        throw new AutomationDomainError(`Unsupported Claim Product ${exhaustive}.`);
      }
    }
  }
}
