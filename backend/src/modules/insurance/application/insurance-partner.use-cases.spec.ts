import { ConflictException, NotFoundException } from '@nestjs/common';

import { InsurancePartner } from '../domain/insurance-partner.aggregate';
import { InsurancePartnerRepository } from '../infrastructure/insurance-partner.repository';
import { InsuranceAccessService } from './insurance-access.service';
import { InsurancePartnerUseCases } from './insurance-partner.use-cases';

describe('InsurancePartnerUseCases', () => {
  const access = { assertActiveUser: jest.fn() } as unknown as InsuranceAccessService;
  const repository = {
    findActiveById: jest.fn(), create: jest.fn(), update: jest.fn(),
  } as unknown as InsurancePartnerRepository;
  const useCases = new InsurancePartnerUseCases(repository, access);

  const partner = () => InsurancePartner.create({
    insurancePartnerId: 'partner-1', partnerCode: 'BCBS', displayName: 'Blue Cross',
    partnerTypeReferenceValueId: 'type-1', operationalStatusReferenceValueId: 'status-1', version: 1,
  });

  beforeEach(() => jest.clearAllMocks());

  it('creates a validated platform-owned Insurance Partner and reloads it', async () => {
    (repository.create as jest.Mock).mockResolvedValue('partner-1');
    (repository.findActiveById as jest.Mock).mockResolvedValue(partner());

    const result = await useCases.create({
      actorUserId: 'actor-1', partnerCode: 'BCBS', displayName: 'Blue Cross',
      partnerTypeReferenceValueId: 'type-1', operationalStatusReferenceValueId: 'status-1',
    });

    expect(access.assertActiveUser).toHaveBeenCalledWith('actor-1');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      partnerCode: 'BCBS', actorUserId: 'actor-1', version: 1,
    }));
    expect(result.id).toBe('partner-1');
  });

  it('rejects an empty root update before persistence', async () => {
    (repository.findActiveById as jest.Mock).mockResolvedValue(partner());

    await expect(useCases.update({ actorUserId: 'actor-1', insurancePartnerId: 'partner-1', version: 1 }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not disclose a missing Insurance Partner as a successful update', async () => {
    (repository.findActiveById as jest.Mock).mockResolvedValue(null);

    await expect(useCases.get('actor-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
