import { Hospital } from '../domain/hospital.aggregate';
import { CreateHospitalUseCase } from '../application/create-hospital.use-case';
import { GetHospitalUseCase } from '../application/get-hospital.use-case';
import { UpdateHospitalRootUseCase } from '../application/update-hospital-root.use-case';
import { HospitalAddressUseCases } from '../application/hospital-address.use-cases';
import { HospitalContactUseCases } from '../application/hospital-contact.use-cases';
import { HospitalDepartmentUseCases } from '../application/hospital-department.use-cases';
import { SetHospitalPrimaryChildUseCase } from '../application/set-hospital-primary-child.use-case';

import { HospitalV1Controller } from './hospital-v1.controller';

describe('HospitalV1Controller', () => {
  const hospital = Hospital.create({
    hospitalId: 'hospital-1',
    organizationId: 'organization-1',
    hospitalCode: 'HOSP-001',
    displayName: 'City Care Hospital',
    hospitalTypeReferenceValueId: 'hospital-type-1',
    operationalStatusReferenceValueId: 'status-active',
    version: 1,
  });

  it('passes the authenticated user and route tenant to the get use case', async () => {
    const createUseCase = {} as CreateHospitalUseCase;
    const getUseCase = {
      execute: jest.fn().mockResolvedValue(hospital),
    } as unknown as GetHospitalUseCase;
    const updateUseCase = {} as UpdateHospitalRootUseCase;
    const addressUseCases = {} as HospitalAddressUseCases;
    const contactUseCases = {} as HospitalContactUseCases;
    const departmentUseCases = {} as HospitalDepartmentUseCases;
    const primaryChildUseCase = {} as SetHospitalPrimaryChildUseCase;
    const controller = new HospitalV1Controller(
      createUseCase,
      getUseCase,
      updateUseCase,
      addressUseCases,
      contactUseCases,
      departmentUseCases,
      primaryChildUseCase,
    );

    await expect(
      controller.findOne('organization-1', 'hospital-1', 'user-1'),
    ).resolves.toMatchObject({
      hospitalId: 'hospital-1',
      organizationId: 'organization-1',
      addresses: [],
      contacts: [],
      departments: [],
    });

    expect(getUseCase.execute).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      organizationId: 'organization-1',
      hospitalId: 'hospital-1',
    });
  });
});
