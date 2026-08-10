import { FinancialDatabaseMapper } from './financial-database.mapper';

describe('FinancialDatabaseMapper', () => {
  it('maps numeric database amounts and tenant scope to a Remittance Batch aggregate', () => {
    const aggregate = FinancialDatabaseMapper.toRemittanceBatch({
      financial_remittance_batch_id: 'batch-1', organization_id: 'org-1', hospital_id: 'hospital-1', insurance_partner_id: 'partner-1',
      claim_product_reference_value_id: 'product-1', remittance_source_type_reference_value_id: 'source-1', remittance_status_reference_value_id: 'status-1',
      remittance_reference: 'REM-1', currency_code: 'INR', gross_amount: '100.50', net_amount: '90.25', created_by: 'actor-1', updated_by: 'actor-1', version: 1, deleted_at: null,
    });
    expect(aggregate.snapshot).toMatchObject({ organizationId: 'org-1', hospitalId: 'hospital-1', grossAmount: 100.5, netAmount: 90.25 });
  });
});
