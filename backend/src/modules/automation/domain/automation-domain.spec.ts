import { UnimplementedAutomationProductStrategyError } from './automation-domain.error';
import { AutomationReviewCase } from './automation-review-case.aggregate';
import { AutomationWorkRequest } from './automation-work-request.aggregate';
import { PayerDispatchTask } from './payer-dispatch-task.aggregate';

const id = (value: string) => `${value}-0000-0000-0000-000000000000`;
const now = new Date('2026-08-02T10:00:00.000Z');

describe('Phase 10 AI & Automation domain', () => {
  const request = () => AutomationWorkRequest.create({
    automationWorkRequestId: id('request'), organizationId: id('organization'), hospitalId: id('hospital'), claimId: id('claim'),
    claimProductReferenceValueId: id('ica-product'), claimProductCode: 'ICA', purpose: { referenceValueId: id('purpose'), code: 'DOCUMENT_EXTRACTION' },
    status: { referenceValueId: id('queued'), code: 'QUEUED' }, sourceRecordType: 'PATIENT_DOCUMENT', sourceRecordId: id('document'), correlationId: id('correlation'), idempotencyKey: 'document-1', createdBy: id('actor'), createdAt: now, updatedBy: id('actor'), updatedAt: now, version: 1,
  });

  it('starts and completes one job attempt with aggregate version changes', () => {
    const aggregate = request();
    const attempt = aggregate.startAttempt(id('attempt'), { referenceValueId: id('started'), code: 'STARTED' }, id('actor'), 1, now);
    aggregate.completeAttempt(attempt.automationJobAttemptId, { referenceValueId: id('completed-job'), code: 'SUCCEEDED' }, { referenceValueId: id('completed-request'), code: 'COMPLETED' }, id('actor'), 2, now);
    expect(aggregate.snapshot.status.code).toBe('COMPLETED');
    expect(aggregate.snapshot.version).toBe(3);
  });

  it('blocks unsupported future-product operational automation', () => {
    const aggregate = AutomationWorkRequest.create({ ...request().snapshot, automationWorkRequestId: id('kyp-request'), claimProductCode: 'KYP', purpose: { referenceValueId: id('purpose'), code: 'CLAIM_READINESS_SCORING' } });
    expect(() => aggregate.startAttempt(id('attempt'), { referenceValueId: id('started'), code: 'STARTED' }, id('actor'), 1)).toThrow(UnimplementedAutomationProductStrategyError);
  });

  it('requires rationale for review overrides and increments review version', () => {
    const review = AutomationReviewCase.create({ automationReviewCaseId: id('review'), organizationId: id('organization'), automationWorkRequestId: id('request'), createdBy: id('actor'), createdAt: now, updatedBy: id('actor'), updatedAt: now, version: 1 });
    expect(() => review.recordDecision(id('decision'), 'OVERRIDE', id('reviewer'), 1)).toThrow('OVERRIDE requires a review reason.');
    review.recordDecision(id('decision'), 'OVERRIDE', id('reviewer'), 1, 'Verified against source document', now);
    expect(review.snapshot.version).toBe(2);
  });

  it('requires verification before dispatch completion', () => {
    const task = PayerDispatchTask.create({ payerDispatchTaskId: id('task'), organizationId: id('organization'), hospitalId: id('hospital'), claimId: id('claim'), hospitalInsurancePartnerIntegrationId: id('route'), correlationId: id('correlation'), idempotencyKey: 'claim-1', status: { referenceValueId: id('queued'), code: 'QUEUED' }, createdBy: id('actor'), createdAt: now, updatedBy: id('actor'), updatedAt: now, version: 1 });
    task.start({ referenceValueId: id('progress'), code: 'IN_PROGRESS' }, id('actor'), 1, now);
    expect(() => task.complete({ referenceValueId: id('complete'), code: 'COMPLETED' }, id('actor'), 2, now)).toThrow('requires verified outcome');
    task.verify(id('reviewer'));
    task.complete({ referenceValueId: id('complete'), code: 'COMPLETED' }, id('actor'), 2, now);
    expect(task.snapshot.status.code).toBe('COMPLETED');
  });
});
