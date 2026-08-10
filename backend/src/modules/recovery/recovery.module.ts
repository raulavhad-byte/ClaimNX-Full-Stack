import { Module } from '@nestjs/common';

import { RecoveryController } from './recovery.controller';
import { RecoveryService } from './recovery.service';
import { RecoveryRepository } from './recovery.repository';

import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [RecoveryController],
  providers: [
    RecoveryService,
    RecoveryRepository,
  ],
})
export class RecoveryModule {}