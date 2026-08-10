import { Module } from '@nestjs/common';

import { QueryBuilderService } from './services/query-builder.service';

@Module({
  providers: [
    QueryBuilderService,
  ],
  exports: [
    QueryBuilderService,
  ],
})
export class SharedModule {}