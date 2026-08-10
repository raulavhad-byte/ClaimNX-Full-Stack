import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { RepositoryModule } from '../../shared/repository/repository.module';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsRepository } from './documents.repository';

@Module({
  imports: [
    DatabaseModule,
    RepositoryModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsRepository,
  ],
  exports: [
    DocumentsService,
    DocumentsRepository,
  ],
})
export class DocumentsModule {}