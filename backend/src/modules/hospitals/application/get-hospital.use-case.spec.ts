import { NotFoundException } from '@nestjs/common';

import { Hospital } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';

import { GetHospitalUseCase } from './get-hospital.use-case';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';

describe('GetHospitalUseCase', () => {
  const hospital = Hospital.create({
    hospitalId: 'hospital-1',
    organizationId: 'organization-1',
    hospitalCode: 'HOSP-001',
    displayName: 'City Care Hospital',
    hospitalTypeReferenceValueId: 'hospital-type-1',
    operationalStatusReferenceValueId: 'status-active',
    version: 1,
  });

  it('loads an active Hospital only inside its Organization tenant', async () => {
    const repository = {
      findActiveById: jest.fn().mockResolvedValue(hospital),
    } as unknown as HospitalAggregateRepository;
    const tenantAccessService = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as HospitalTenantAccessService;
    const useCase = new GetHospitalUseCase(repository, tenantAccessService);

    await expect(
      useCase.execute({
        actorUserId: 'user-1',
        organizationId: 'organization-1',
        hospitalId: 'hospital-1',
      }),
    ).resolves.toBe(hospital);

    expect(repository.findActiveById).toHaveBeenCalledWith(
      'organization-1',
      'hospital-1',
    );
    expect(tenantAccessService.assertActiveMembership).toHaveBeenCalledWith(
      'user-1',
      'organization-1',
    );
  });

  it('does not disclose a Hospital outside the requested Organization tenant', async () => {
    const repository = {
      findActiveById: jest.fn().mockResolvedValue(null),
    } as unknown as HospitalAggregateRepository;
    const tenantAccessService = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as HospitalTenantAccessService;
    const useCase = new GetHospitalUseCase(repository, tenantAccessService);

    await expect(
      useCase.execute({
        actorUserId: 'user-1',
        organizationId: 'organization-2',
        hospitalId: 'hospital-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
