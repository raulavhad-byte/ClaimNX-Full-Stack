import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { HealthModule } from './modules/health/health.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { RolesModule } from './modules/roles/roles.module';
import { SharedModule } from './shared/shared.module';
import { UsersModule } from './modules/users/users.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { FinancialModule } from './modules/financial/financial.module';
import { AutomationModule } from './modules/automation/automation.module';
import { EmailModule } from './modules/email/email.module';
import { ReportAutomationModule } from './modules/report-automation/report-automation.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { ReimbursementModule } from './modules/reimbursement/reimbursement.module';
import { AiModule } from './modules/ai/ai.module';



@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
  }),

  DatabaseModule,

  AuthModule,
  AuditModule,
  ClaimsModule,
  DocumentsModule,
  FinancialModule,
  AutomationModule,
  HealthModule,
  HospitalsModule,
  InsuranceModule,
  PatientsModule,
  PermissionsModule,
  ReconciliationModule,
  RecoveryModule,
  RolesModule,
  TenantModule,
  WorkflowModule,
  UsersModule,
  SharedModule,
  EmailModule,
  ReportAutomationModule,
  OcrModule,
  ReimbursementModule,
  AiModule,
],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes({
        path: '*',
        method: RequestMethod.ALL,
      });
  }
}
