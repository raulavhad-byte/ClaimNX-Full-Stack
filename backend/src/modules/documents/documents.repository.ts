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

  // The established documents table predates the generic soft-delete model
  // and does not contain is_deleted. BaseRepository.findById() adds that
  // predicate, which breaks secure preview and delete lookups.
  override async findById(id: string) {
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
