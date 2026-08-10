import { CreateHospitalUseCase } from './create-hospital.use-case';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';

describe('CreateHospitalUseCase', () => {
  it('builds a valid aggregate with application-generated UUIDs before persistence', async () => {
    const repository = {
      createAggregate: jest.fn().mockResolvedValue('created-hospital-id'),
    } as unknown as HospitalAggregateRepository;
    const tenantAccessService = {
      assertActiveMembership: jest.fn().mockResolvedValue(undefined),
    } as unknown as HospitalTenantAccessService;
    const useCase = new CreateHospitalUseCase(repository, tenantAccessService);

    const result = await useCase.execute({
      organizationId: 'organization-1',
      actorUserId: 'user-1',
      hospitalCode: 'HOSP-001',
      displayName: 'City Care Hospital',
      hospitalTypeReferenceValueId: 'hospital-type-1',
      operationalStatusReferenceValueId: 'status-active',
      addresses: [
        {
          addressTypeReferenceValueId: 'registered-address',
          addressLine1: 'Main Road',
          countryId: 'country-1',
          stateId: 'state-1',
          cityId: 'city-1',
          postalCode: '380001',
          isPrimary: true,
        },
      ],
      contacts: [
        {
          contactTypeReferenceValueId: 'administrative-contact',
          contactName: 'Operations Manager',
          phoneNumber: '9999999999',
          isPrimary: true,
        },
      ],
      departments: [],
    });

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.hospitalAddresses).toHaveLength(1);
    expect(result.hospitalContacts).toHaveLength(1);
    expect(repository.createAggregate).toHaveBeenCalledWith(
      result,
      'user-1',
    );
    expect(tenantAccessService.assertActiveMembership).toHaveBeenCalledWith(
      'user-1',
      'organization-1',
    );
  });
});
