import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { FinancialAccessService } from './application/financial-access.service';
import { FinancialManagementUseCases } from './application/financial-management.use-cases';
import { FinancialManagementRepository } from './infrastructure/financial-management.repository';
import { FinancialV1Controller } from './presentation/controllers/financial-v1.controller';

@Module({ imports: [SharedModule], controllers: [FinancialV1Controller], providers: [FinancialAccessService, FinancialManagementUseCases, FinancialManagementRepository], exports: [FinancialManagementUseCases] })
export class FinancialModule {}
