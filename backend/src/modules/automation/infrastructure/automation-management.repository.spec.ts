import { DatabaseService } from '../../../database/database.service';
import { AutomationManagementRepository } from './automation-management.repository';

describe('AutomationManagementRepository', () => {
  it('scopes Work Request reads by Organization, Hospital, and active lifecycle', async () => {
    const chain: any = { select: jest.fn(), eq: jest.fn(), is: jest.fn(), maybeSingle: jest.fn() };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.is.mockReturnValue(chain); chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const repository = new AutomationManagementRepository({ getClient: () => ({ from: jest.fn(() => chain) }) } as unknown as DatabaseService);
    await expect(repository.findActiveWorkRequestById('org-1', 'hospital-1', 'request-1')).resolves.toBeNull();
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(chain.eq).toHaveBeenCalledWith('hospital_id', 'hospital-1');
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
    expect(chain.select.mock.calls[0][0]).not.toContain('reference_values!');
  });
});
