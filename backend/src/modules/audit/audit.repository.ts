import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../../shared/repository/base.repository';
import { DatabaseService } from '../../database/database.service';
import { QueryBuilderService } from '../../shared/services/query-builder.service';

import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditRepository extends BaseRepository {
  constructor(
    databaseService: DatabaseService,
    queryBuilder: QueryBuilderService,
  ) {
    super(databaseService, queryBuilder, {
      table: 'audit_logs',

      searchableColumns: [
        'module',
        'action',
        'entity',
      ],

      defaultSortBy: 'created_at',

      defaultSortOrder: 'desc',
    });
  }

  /**
   * Create Audit Log
   */
  async createAuditLog(
    dto: CreateAuditLogDto,
  ) {
    const { data, error } = await this.client
      .from('audit_logs')
      .insert(dto)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Get Audit Log By ID
   */
  async findById(id: string) {
    const { data, error } = await this.client
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
}