import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SharedModule } from '../../shared/shared.module';

import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';

import { InsuranceAccessService } from './application/insurance-access.service';
import { HospitalInsurancePartnerIntegrationUseCases } from './application/hospital-insurance-partner-integration.use-cases';
import { HospitalPayerIntegrationReferenceDataService } from './application/hospital-payer-integration-reference-data.service';
import { InsurancePartnerQueryService } from './application/insurance-partner-query.service';
import { InsurancePartnerUseCases } from './application/insurance-partner.use-cases';
import { InsuranceProductPlanUseCases } from './application/insurance-product-plan.use-cases';
import { OrganizationInsurancePartnerEnablementUseCases } from './application/organization-insurance-partner-enablement.use-cases';

import { InsurancePartnerRepository } from './infrastructure/insurance-partner.repository';
import { HospitalInsurancePartnerIntegrationRepository } from './infrastructure/hospital-insurance-partner-integration.repository';
import { InsuranceProductPlanRepository } from './infrastructure/insurance-product-plan.repository';
import { OrganizationInsurancePartnerEnablementRepository } from './infrastructure/organization-insurance-partner-enablement.repository';

import { InsurancePartnerController } from './presentation/controllers/insurance-partner.controller';
import { HospitalPayerIntegrationV1Controller } from './presentation/controllers/hospital-payer-integration-v1.controller';

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
  ],
  controllers: [
    InsuranceController,
    InsurancePartnerController,
    HospitalPayerIntegrationV1Controller,
  ],
  providers: [
    InsuranceService,
    InsuranceAccessService,
    HospitalPayerIntegrationReferenceDataService,
    HospitalInsurancePartnerIntegrationUseCases,
    InsurancePartnerUseCases,
    InsurancePartnerQueryService,
    InsuranceProductPlanUseCases,
    OrganizationInsurancePartnerEnablementUseCases,
    InsurancePartnerRepository,
    HospitalInsurancePartnerIntegrationRepository,
    InsuranceProductPlanRepository,
    OrganizationInsurancePartnerEnablementRepository,
  ],
  exports: [
    InsurancePartnerUseCases,
    InsurancePartnerQueryService,
    InsuranceProductPlanUseCases,
    OrganizationInsurancePartnerEnablementUseCases,
  ],
})
export class InsuranceModule {}
