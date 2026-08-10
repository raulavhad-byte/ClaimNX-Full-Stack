import { Hospital } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';
import { HospitalDepartmentUseCases } from './hospital-department.use-cases';

describe('HospitalDepartmentUseCases', () => {
  const hospital = Hospital.create({ hospitalId: 'hospital-1', organizationId: 'organization-1', hospitalCode: 'HOSP-001', displayName: 'City Care', hospitalTypeReferenceValueId: 'type-1', operationalStatusReferenceValueId: 'draft-1', version: 1 });
  it('creates an aggregate-owned Department with an application-generated UUID', async () => {
    const repository = { findActiveById: jest.fn().mockResolvedValue(hospital), createDepartment: jest.fn().mockResolvedValue('department-1') } as unknown as HospitalAggregateRepository;
    const tenantAccess = { assertActiveMembership: jest.fn().mockResolvedValue(undefined) } as unknown as HospitalTenantAccessService;
    const result = await new HospitalDepartmentUseCases(repository, tenantAccess).create({
      actorUserId: 'user-1', organizationId: 'organization-1', hospitalId: 'hospital-1', departmentCode: 'BILLING',
      departmentName: 'Billing', operationalStatusReferenceValueId: 'draft-1',
    });
    expect(result.hospitalDepartmentId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.version).toBe(1);
  });
});
