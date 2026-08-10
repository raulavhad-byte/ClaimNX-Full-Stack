import { ConflictException } from '@nestjs/common';

import { Hospital } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';

import { HospitalTenantAccessService } from './hospital-tenant-access.service';
import { UpdateHospitalRootUseCase } from './update-hospital-root.use-case';

describe('UpdateHospitalRootUseCase', () => {
  const hospital = Hospital.create({
    hospitalId: 'hospital-1',
    organizationId: 'organization-1',
    hospitalCode: 'HOSP-001',
    displayName: 'City Care Hospital',
    hospitalTypeReferenceValueId: 'hospital-type-1',
    operationalStatusReferenceValueId: 'status-draft',
    version: 1,
  });

  it('updates only root attributes using the caller expected version', async () => {
    const repository = {
      findActiveById: jest.fn().mockResolvedValue(hospital),
      updateRoot: jest.fn().mockResolvedValue('hospital-1'),
    } as unknown as HospitalAggregateRepository;
    const tenantAccessService = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as HospitalTenantAccessService;
    const useCase = new UpdateHospitalRootUseCase(repository, tenantAccessService);

    await expect(
      useCase.execute({
        actorUserId: 'user-1',
        organizationId: 'organization-1',
        hospitalId: 'hospital-1',
        version: 1,
        displayName: 'City Care Hospital Updated',
      }),
    ).resolves.toBe(hospital);

    expect(repository.updateRoot).toHaveBeenCalledWith(
      'organization-1',
      'hospital-1',
      1,
      'user-1',
      { displayName: 'City Care Hospital Updated' },
    );
  });

  it('returns a conflict when the root version is stale', async () => {
    const repository = {
      findActiveById: jest.fn().mockResolvedValue(hospital),
      updateRoot: jest.fn().mockResolvedValue(null),
    } as unknown as HospitalAggregateRepository;
    const tenantAccessService = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as HospitalTenantAccessService;
    const useCase = new UpdateHospitalRootUseCase(repository, tenantAccessService);

    await expect(
      useCase.execute({
        actorUserId: 'user-1',
        organizationId: 'organization-1',
        hospitalId: 'hospital-1',
        version: 1,
        displayName: 'City Care Hospital Updated',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
