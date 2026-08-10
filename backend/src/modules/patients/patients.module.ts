import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { RepositoryModule } from '../../shared/repository/repository.module';

import { PatientsController } from './patients.controller';
import { PatientsRepository } from './patients.repository';
import { PatientsService } from './patients.service';

@Module({
  imports: [
    DatabaseModule,
    RepositoryModule,
  ],
  controllers: [PatientsController],
  providers: [
    PatientsService,
    PatientsRepository,
  ],
  exports: [
    PatientsService,
    PatientsRepository,
  ],
})
export class PatientsModule {}