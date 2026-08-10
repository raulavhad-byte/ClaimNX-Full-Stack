import { ReportingDatabaseMapper } from './reporting-database.mapper';

describe('ReportingDatabaseMapper', () => {
  it('maps a tenant-scoped definition row using canonical database names', () => {
    const result = ReportingDatabaseMapper.toDefinition({
      report_definition_id: 'definition-id',
      organization_id: 'organization-id',
      report_code: 'CLAIMS_AGEING',
      display_name: 'Claims Ageing',
      report_category_reference_value_id: 'category-id',
      report_data_source_type_reference_value_id: 'source-id',
      report_status_reference_value_id: 'status-id',
      version: 1,
      created_at: '2026-08-08T00:00:00.000Z',
      updated_at: '2026-08-08T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      id: 'definition-id',
      organizationId: 'organization-id',
      code: 'CLAIMS_AGEING',
      displayName: 'Claims Ageing',
      version: 1,
    });
  });

  it('rejects a row with no optimistic-concurrency version', () => {
    expect(() => ReportingDatabaseMapper.toDefinition({
      report_definition_id: 'definition-id',
      organization_id: 'organization-id',
      report_code: 'CLAIMS_AGEING',
      display_name: 'Claims Ageing',
    })).toThrow('invalid version');
  });
});
