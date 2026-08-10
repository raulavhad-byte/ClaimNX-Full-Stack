import { DatabaseService } from '../../../database/database.service';
import { FinancialManagementRepository } from './financial-management.repository';

describe('FinancialManagementRepository', () => {
  it('scopes remittance batch root reads by organization, Hospital, and active lifecycle', async () => {
    const chain = { select: jest.fn(), eq: jest.fn(), is: jest.fn(), maybeSingle: jest.fn() };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.is.mockReturnValue(chain); chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const repository = new FinancialManagementRepository({ getClient: () => ({ from: jest.fn(() => chain) }) } as unknown as DatabaseService);
    await expect(repository.findActiveRemittanceBatchById('org-1', 'hospital-1', 'batch-1')).resolves.toBeNull();
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(chain.eq).toHaveBeenCalledWith('hospital_id', 'hospital-1');
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
  });
});
