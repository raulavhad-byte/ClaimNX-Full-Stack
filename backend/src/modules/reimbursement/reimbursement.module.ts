import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReimbursementController } from './reimbursement.controller';
import { ReimbursementService } from './reimbursement.service';

@Module({ imports: [DatabaseModule], controllers: [ReimbursementController], providers: [ReimbursementService] })
export class ReimbursementModule {}
