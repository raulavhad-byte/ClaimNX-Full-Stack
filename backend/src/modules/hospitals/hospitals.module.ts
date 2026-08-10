import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { RepositoryModule } from '../../shared/repository/repository.module';

import { HospitalsController } from './hospitals.controller';
import { HospitalsRepository } from './hospitals.repository';
import { HospitalsService } from './hospitals.service';
import { HospitalAggregateRepository } from './infrastructure/hospital-aggregate.repository';
import { GetHospitalUseCase } from './application/get-hospital.use-case';
import { CreateHospitalUseCase } from './application/create-hospital.use-case';
import { HospitalTenantAccessService } from './application/hospital-tenant-access.service';
import { HospitalV1Controller } from './api/hospital-v1.controller';
import { UpdateHospitalRootUseCase } from './application/update-hospital-root.use-case';
import { HospitalAddressUseCases } from './application/hospital-address.use-cases';
import { HospitalContactUseCases } from './application/hospital-contact.use-cases';
import { HospitalDepartmentUseCases } from './application/hospital-department.use-cases';
import { SetHospitalPrimaryChildUseCase } from './application/set-hospital-primary-child.use-case';

@Module({
  imports: [
    DatabaseModule,
    RepositoryModule,
  ],
  controllers: [HospitalsController, HospitalV1Controller],
  providers: [
    HospitalsService,
    HospitalsRepository,
    HospitalAggregateRepository,
    GetHospitalUseCase,
    CreateHospitalUseCase,
    HospitalTenantAccessService,
    UpdateHospitalRootUseCase,
    HospitalAddressUseCases,
    HospitalContactUseCases,
    HospitalDepartmentUseCases,
    SetHospitalPrimaryChildUseCase,
  ],
  exports: [
    HospitalsService,
    HospitalsRepository,
    HospitalAggregateRepository,
    GetHospitalUseCase,
    CreateHospitalUseCase,
    HospitalTenantAccessService,
    UpdateHospitalRootUseCase,
    HospitalAddressUseCases,
    HospitalContactUseCases,
    HospitalDepartmentUseCases,
    SetHospitalPrimaryChildUseCase,
  ],
})
export class HospitalsModule {}
