import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import { QueryBuilderService } from '../../shared/services/query-builder.service';

@Injectable()
export class UsersRepository extends BaseRepository<any> {
  constructor(
    databaseService: DatabaseService,
    queryBuilder: QueryBuilderService,
  ) {
    super(
      databaseService,
      queryBuilder,
      {
        table: 'users',

        searchableColumns: [
          'display_name',
          'email',
          'mobile_no',
        ],

        defaultSortBy: 'created_at',

        defaultSortOrder: 'desc',
      },
    );
  }
}