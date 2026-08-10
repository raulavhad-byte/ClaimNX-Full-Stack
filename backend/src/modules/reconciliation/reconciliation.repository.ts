import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../../shared/repository/base.repository';
import { DatabaseService } from '../../database/database.service';
import { QueryBuilderService } from '../../shared/services/query-builder.service';

@Injectable()
export class ReconciliationRepository extends BaseRepository {
  constructor(
    databaseService: DatabaseService,
    queryBuilder: QueryBuilderService,
  ) {
    super(
      databaseService,
      queryBuilder,
      {
        table: 'reconciliations',

        searchableColumns: [
          'status',
          'bank_ref_no',
        ],

        defaultSortBy: 'created_at',

        defaultSortOrder: 'desc',
      },
    );
  }
}