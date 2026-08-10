import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { BaseRepository } from '../../shared/repository/base.repository';
import { QueryBuilderService } from '../../shared/services/query-builder.service';

@Injectable()
export class HospitalsRepository extends BaseRepository {
  constructor(
    databaseService: DatabaseService,
    queryBuilder: QueryBuilderService,
  ) {
    super(databaseService, queryBuilder, {
      table: 'hospitals',

      searchableColumns: [
        'name',
        'rohini_id',
        'registration_no',
        'city',
        'phone',
        'email',
      ],

      defaultSortBy: 'created_at',
      defaultSortOrder: 'desc',
    });
  }

  async findActiveById(id: string) {
    const { data, error } = await this.client
      .from('hospitals')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
}