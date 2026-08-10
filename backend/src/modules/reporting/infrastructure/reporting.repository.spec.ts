import { ReportingRepository } from './reporting.repository';
import { ReportingSqlClient } from './reporting-sql-client';

describe('ReportingRepository', () => {
  it('always scopes a definition lookup to the requesting organization', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{
        report_definition_id: 'definition-id',
        organization_id: 'organization-id',
        report_code: 'CLAIMS_AGEING',
        display_name: 'Claims Ageing',
        version: 1,
      }],
    });
    const repository = new ReportingRepository({ query } as unknown as ReportingSqlClient);

    const result = await repository.findDefinition(
      { organizationId: 'organization-id' },
      'definition-id',
    );

    expect(result?.id).toBe('definition-id');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('organization_id = $2'),
      ['definition-id', 'organization-id'],
    );
  });

  it('returns null when no active tenant-scoped execution exists', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new ReportingRepository({ query } as unknown as ReportingSqlClient);

    await expect(repository.findExecution(
      { organizationId: 'organization-id' },
      'execution-id',
    )).resolves.toBeNull();
  });
});
