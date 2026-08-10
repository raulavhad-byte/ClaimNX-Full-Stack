import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { QueryBuilderService } from '../services/query-builder.service';

@Module({
  imports: [DatabaseModule],

  providers: [QueryBuilderService],

  exports: [
    DatabaseModule,
    QueryBuilderService,
  ],
})
export class RepositoryModule {}