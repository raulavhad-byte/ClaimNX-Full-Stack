import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

import { BaseRepository } from '../../shared/repository/base.repository';
import { QueryBuilderService } from '../../shared/services/query-builder.service';

@Injectable()
export class DocumentsRepository extends BaseRepository {
  constructor(
    databaseService: DatabaseService,
    queryBuilder: QueryBuilderService,
  ) {
    super(databaseService, queryBuilder, {
  table: 'documents',

  searchableColumns: [
    'file_name',
    'category',
  ],

  defaultSortBy: 'uploaded_at',
  defaultSortOrder: 'desc',
  });
  }
}