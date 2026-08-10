import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

import { BaseRepository } from '../../shared/repository/base.repository';
import { QueryBuilderService } from '../../shared/services/query-builder.service';

@Injectable()
export class RecoveryRepository extends BaseRepository {
  constructor(
    databaseService: DatabaseService,
    queryBuilder: QueryBuilderService,
  ) {
    super(databaseService, queryBuilder, {
      table: 'recovery',

      searchableColumns: [
        'reason',
      ],

      defaultSortBy: 'created_at',
      defaultSortOrder: 'desc',
    });
  }
}