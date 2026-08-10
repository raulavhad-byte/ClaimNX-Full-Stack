import { AutomationDatabaseMapper } from './automation-database.mapper';

describe('AutomationDatabaseMapper', () => {
  it('rehydrates a tenant-scoped automation request and append-only attempts', () => {
    const aggregate = AutomationDatabaseMapper.toWorkRequest({ automation_work_request_id: 'request-1', organization_id: 'org-1', hospital_id: 'hospital-1', claim_id: null, claim_product_reference_value_id: null, claim_product_code: null, work_purpose_reference_value_id: 'purpose-1', work_purpose_code: 'DOCUMENT_EXTRACTION', work_status_reference_value_id: 'status-1', work_status_code: 'QUEUED', source_record_type: 'DOCUMENT', source_record_id: null, correlation_id: 'correlation-1', idempotency_key: 'key-1', created_by: 'actor-1', created_at: '2026-08-02T00:00:00Z', updated_by: 'actor-1', updated_at: '2026-08-02T00:00:00Z', deleted_at: null, version: 1 }, [{ automation_job_attempt_id: 'attempt-1', attempt_number: 1, job_status_reference_value_id: 'attempt-status-1', job_status_code: 'STARTED', started_at: '2026-08-02T00:01:00Z', completed_at: null, failure_classification: null, failure_summary: null }]);
    expect(aggregate.snapshot).toMatchObject({ organizationId: 'org-1', hospitalId: 'hospital-1' });
    expect(aggregate.jobAttempts).toHaveLength(1);
  });
});
