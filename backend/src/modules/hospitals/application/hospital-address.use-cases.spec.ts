import { ConflictException } from '@nestjs/common';

import { Hospital } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';

import { HospitalTenantAccessService } from './hospital-tenant-access.service';
import { HospitalAddressUseCases } from './hospital-address.use-cases';

describe('HospitalAddressUseCases', () => {
  const hospital = Hospital.rehydrate(
    {
      hospitalId: 'hospital-1', organizationId: 'organization-1', hospitalCode: 'HOSP-001',
      displayName: 'City Care', hospitalTypeReferenceValueId: 'type-1',
      operationalStatusReferenceValueId: 'draft-1', primaryAddressId: 'primary-address', version: 1,
    },
    [{
      hospitalAddressId: 'primary-address', hospitalId: 'hospital-1', addressTypeReferenceValueId: 'address-type-1',
      addressLine1: 'Main Road', countryId: 'country-1', stateId: 'state-1', cityId: 'city-1',
      postalCode: '380001', isPrimary: true, version: 1,
    }], [], [],
  );

  function subject(repository: Partial<HospitalAggregateRepository>) {
    const tenantAccess = { assertActiveMembership: jest.fn().mockResolvedValue(undefined) } as unknown as HospitalTenantAccessService;
    return new HospitalAddressUseCases(repository as HospitalAggregateRepository, tenantAccess);
  }

  it('creates only a non-primary Address with an application-generated UUID', async () => {
    const repository = { findActiveById: jest.fn().mockResolvedValue(hospital), createAddress: jest.fn().mockResolvedValue('new-address') };
    const result = await subject(repository).create({
      actorUserId: 'user-1', organizationId: 'organization-1', hospitalId: 'hospital-1',
      addressTypeReferenceValueId: 'address-type-1', addressLine1: 'Second Road', countryId: 'country-1',
      stateId: 'state-1', cityId: 'city-1', postalCode: '380002',
    });
    expect(result.isPrimary).toBe(false);
    expect(result.hospitalAddressId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('rejects deletion of the root selected primary Address', async () => {
    const repository = { findActiveById: jest.fn().mockResolvedValue(hospital) };
    await expect(subject(repository).softDelete({
      actorUserId: 'user-1', organizationId: 'organization-1', hospitalId: 'hospital-1',
      hospitalAddressId: 'primary-address', version: 1,
    })).rejects.toThrow('current primary Address cannot be deleted');
  });

  it('returns a conflict for a stale child Address version', async () => {
    const repository = {
      findActiveById: jest.fn().mockResolvedValue(hospital), updateAddress: jest.fn().mockResolvedValue(null),
    };
    await expect(subject(repository).update({
      actorUserId: 'user-1', organizationId: 'organization-1', hospitalId: 'hospital-1',
      hospitalAddressId: 'primary-address', version: 1, addressLine1: 'Changed Road',
    })).rejects.toThrow(ConflictException);
  });
});
