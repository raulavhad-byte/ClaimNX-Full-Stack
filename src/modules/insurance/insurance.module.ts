import { Module } from '@nestjs/common';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';

@Module({
  controllers: [InsuranceController],
  providers: [InsuranceService]
})
export class InsuranceModule {}
