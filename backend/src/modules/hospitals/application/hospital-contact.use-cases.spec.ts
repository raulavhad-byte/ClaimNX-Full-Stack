import { Hospital } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';

import { HospitalTenantAccessService } from './hospital-tenant-access.service';
import { HospitalContactUseCases } from './hospital-contact.use-cases';

describe('HospitalContactUseCases', () => {
  const hospital = Hospital.rehydrate(
    {
      hospitalId: 'hospital-1', organizationId: 'organization-1', hospitalCode: 'HOSP-001',
      displayName: 'City Care', hospitalTypeReferenceValueId: 'type-1',
      operationalStatusReferenceValueId: 'draft-1', primaryContactId: 'primary-contact', version: 1,
    }, [], [{
      hospitalContactId: 'primary-contact', hospitalId: 'hospital-1', contactTypeReferenceValueId: 'contact-type-1',
      contactName: 'Operations', phoneNumber: '9999999999', isPrimary: true, version: 1,
    }], [],
  );

  function subject(repository: Partial<HospitalAggregateRepository>) {
    const tenantAccess = { assertActiveMembership: jest.fn().mockResolvedValue(undefined) } as unknown as HospitalTenantAccessService;
    return new HospitalContactUseCases(repository as HospitalAggregateRepository, tenantAccess);
  }

  it('creates a non-primary Contact with an application-generated UUID', async () => {
    const repository = { findActiveById: jest.fn().mockResolvedValue(hospital), createContact: jest.fn().mockResolvedValue('contact-2') };
    const result = await subject(repository).create({
      actorUserId: 'user-1', organizationId: 'organization-1', hospitalId: 'hospital-1',
      contactTypeReferenceValueId: 'contact-type-1', contactName: 'Billing', phoneNumber: '8888888888',
    });
    expect(result.isPrimary).toBe(false);
    expect(result.hospitalContactId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('rejects deletion of the root selected primary Contact', async () => {
    const repository = { findActiveById: jest.fn().mockResolvedValue(hospital) };
    await expect(subject(repository).softDelete({
      actorUserId: 'user-1', organizationId: 'organization-1', hospitalId: 'hospital-1',
      hospitalContactId: 'primary-contact', version: 1,
    })).rejects.toThrow('current primary Contact cannot be deleted');
  });
});
