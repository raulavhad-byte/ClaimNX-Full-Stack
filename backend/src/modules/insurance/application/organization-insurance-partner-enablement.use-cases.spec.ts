import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { OrganizationInsurancePartnerEnablement } from '../domain/insurance-partner.aggregate';
import { InsurancePartnerRepository } from '../infrastructure/insurance-partner.repository';
import { OrganizationInsurancePartnerEnablementRepository } from '../infrastructure/organization-insurance-partner-enablement.repository';
import { InsuranceAccessService } from './insurance-access.service';
import { OrganizationInsurancePartnerEnablementUseCases } from './organization-insurance-partner-enablement.use-cases';

describe('OrganizationInsurancePartnerEnablementUseCases', () => {
  const access = { assertActiveMembership: jest.fn() } as unknown as InsuranceAccessService;
  const enablements = { create: jest.fn(), findActiveById: jest.fn() } as unknown as OrganizationInsurancePartnerEnablementRepository;
  const partners = { findActiveById: jest.fn() } as unknown as InsurancePartnerRepository;
  const useCases = new OrganizationInsurancePartnerEnablementUseCases(enablements, partners, access);

  beforeEach(() => {
    jest.resetAllMocks();
    (access.assertActiveMembership as jest.Mock).mockResolvedValue(undefined);
  });

  it('requires the platform Partner before allowing tenant enablement', async () => {
    (partners.findActiveById as jest.Mock).mockResolvedValue(null);

    await expect(useCases.create({
      actorUserId: 'actor-1', organizationId: 'org-1', insurancePartnerId: 'missing',
      operationalStatusReferenceValueId: 'active-status',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(enablements.create).not.toHaveBeenCalled();
  });

  it('enforces tenant membership before querying an enablement', async () => {
    (access.assertActiveMembership as jest.Mock).mockRejectedValue(new ForbiddenException());

    await expect(useCases.get({
      actorUserId: 'actor-1', organizationId: 'org-2', organizationInsurancePartnerEnablementId: 'enablement-1',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(enablements.findActiveById).not.toHaveBeenCalled();
  });

  it('creates and reloads a tenant-scoped enablement', async () => {
    (partners.findActiveById as jest.Mock).mockResolvedValue({ id: 'partner-1' });
    (enablements.create as jest.Mock).mockResolvedValue('enablement-1');
    (enablements.findActiveById as jest.Mock).mockResolvedValue(
      OrganizationInsurancePartnerEnablement.create({
        organizationInsurancePartnerEnablementId: 'enablement-1', organizationId: 'org-1', insurancePartnerId: 'partner-1',
        operationalStatusReferenceValueId: 'active-status', version: 1,
      }),
    );

    const result = await useCases.create({
      actorUserId: 'actor-1', organizationId: 'org-1', insurancePartnerId: 'partner-1',
      operationalStatusReferenceValueId: 'active-status',
    });

    expect(result.id).toBe('enablement-1');
    expect(enablements.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-1', actorUserId: 'actor-1' }));
  });
});
