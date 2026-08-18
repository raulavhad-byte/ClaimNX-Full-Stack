import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ReportAutomationController } from './report-automation.controller';
import { ReportAutomationService } from './report-automation.service';

@Module({ imports: [EmailModule], controllers: [ReportAutomationController], providers: [ReportAutomationService] })
export class ReportAutomationModule {}
