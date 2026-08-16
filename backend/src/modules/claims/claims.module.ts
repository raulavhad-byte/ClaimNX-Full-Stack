import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { ClaimAccessService } from './application/claim-access.service';
import { ClaimReferenceDataService } from './application/claim-reference-data.service';
import { ClaimUseCases } from './application/claim.use-cases';
import { ClaimRepository } from './infrastructure/claim.repository';
import { ClaimV1Controller } from './api/claim-v1.controller';
import { MisReportService } from './mis-report.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ClaimsController, ClaimV1Controller],
  providers: [
    ClaimsService,
    ClaimRepository,
    ClaimAccessService,
    ClaimReferenceDataService,
    ClaimUseCases,
    MisReportService,
  ],
})
export class ClaimsModule {}
