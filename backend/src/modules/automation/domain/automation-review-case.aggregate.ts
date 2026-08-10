import { AutomationDomainError } from './automation-domain.error';
import { AutomationUuid } from './automation-work-request.aggregate';

export type AutomationReviewDecisionCode = 'ACCEPT' | 'REJECT' | 'CORRECT' | 'DEFER' | 'OVERRIDE';

export interface AutomationReviewCaseProps {
  automationReviewCaseId: AutomationUuid;
  organizationId: AutomationUuid;
  automationWorkRequestId: AutomationUuid;
  createdBy: AutomationUuid;
  createdAt: Date;
  updatedBy: AutomationUuid;
  updatedAt: Date;
  deletedAt?: Date | null;
  version: number;
}

export interface AutomationReviewDecision {
  automationReviewDecisionId: AutomationUuid;
  decisionSequence: number;
  decisionCode: AutomationReviewDecisionCode;
  decisionReason?: string | null;
  reviewerUserId: AutomationUuid;
  decidedAt: Date;
}

/** Human-review consistency boundary; original candidates/inferences remain immutable. */
export class AutomationReviewCase {
  private readonly decisions: AutomationReviewDecision[] = [];

  private constructor(private props: AutomationReviewCaseProps, decisions: AutomationReviewDecision[] = []) {
    if (!props.automationReviewCaseId || !props.organizationId || !props.automationWorkRequestId || !props.createdBy || !props.updatedBy || !Number.isInteger(props.version) || props.version < 1) {
      throw new AutomationDomainError('Automation Review Case identity, tenant, work request, audit, and version are required.');
    }
    this.decisions.push(...decisions.map((decision) => ({ ...decision })));
  }

  static create(props: AutomationReviewCaseProps): AutomationReviewCase { return new AutomationReviewCase(props); }
  static rehydrate(props: AutomationReviewCaseProps, decisions: AutomationReviewDecision[] = []): AutomationReviewCase { return new AutomationReviewCase(props, decisions); }
  get snapshot(): Readonly<AutomationReviewCaseProps> { return { ...this.props }; }
  get reviewDecisions(): readonly AutomationReviewDecision[] { return this.decisions.map((decision) => ({ ...decision })); }

  recordDecision(
    decisionId: AutomationUuid,
    decisionCode: AutomationReviewDecisionCode,
    reviewerUserId: AutomationUuid,
    expectedVersion: number,
    decisionReason?: string | null,
    decidedAt = new Date(),
  ): AutomationReviewDecision {
    if (this.props.deletedAt) throw new AutomationDomainError('A soft-deleted Automation Review Case cannot be decided.');
    if (!reviewerUserId || expectedVersion !== this.props.version || !Number.isInteger(expectedVersion)) {
      throw new AutomationDomainError('Automation Review Case version conflict or missing reviewer.');
    }
    if ((decisionCode === 'CORRECT' || decisionCode === 'OVERRIDE') && !decisionReason?.trim()) {
      throw new AutomationDomainError(`${decisionCode} requires a review reason.`);
    }
    const decision: AutomationReviewDecision = { automationReviewDecisionId: decisionId, decisionSequence: this.decisions.length + 1, decisionCode, decisionReason: decisionReason?.trim() || null, reviewerUserId, decidedAt };
    this.decisions.push(decision);
    this.props = { ...this.props, updatedBy: reviewerUserId, updatedAt: decidedAt, version: this.props.version + 1 };
    return { ...decision };
  }
}
