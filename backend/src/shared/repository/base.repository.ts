import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { DatabaseService } from '../../database/database.service';
import { QueryBuilderService } from '../services/query-builder.service';

import type {
  RepositoryOptions,
  QueryBuilderOptions,
} from './repository-options.interface';

@Injectable()
export abstract class BaseRepository<T = any> {
  protected readonly client: SupabaseClient;
  protected readonly table: string;
  protected readonly searchableColumns: string[];
  protected readonly defaultSortBy: string;
  protected readonly defaultSortOrder: 'asc' | 'desc';

  constructor(
    protected readonly databaseService: DatabaseService,
    protected readonly queryBuilder: QueryBuilderService,
    options: RepositoryOptions,
  ) {
    this.client = this.databaseService.getClient();

    this.table = options.table;
    this.searchableColumns =
      options.searchableColumns ?? [];
    this.defaultSortBy =
      options.defaultSortBy ?? 'created_at';
    this.defaultSortOrder =
      options.defaultSortOrder ?? 'desc';
  }

  /**
   * Find all records
   */
  async findAll(
    options: QueryBuilderOptions = {},
  ) {
    let query = this.client
      .from(this.table)
      .select('*', { count: 'exact' });

    query = this.queryBuilder.build(query, {
      ...options,
      searchableColumns: this.searchableColumns,
      sortBy:
        options.sortBy ?? this.defaultSortBy,
      sortOrder:
        options.sortOrder ??
        this.defaultSortOrder,
    });

    const { data, error, count } =
      await query;

    if (error) {
      throw error;
    }

    return {
      data,
      total: count ?? 0,
      page: options.page ?? 1,
      limit: options.limit ?? 10,
    };
  }

  /**
   * Find by ID
   */
  async findById(
    id: string,
  ): Promise<T | null> {
    const { data, error } = await this.client
  .from(this.table)
  .select('*')
  .eq('id', id)
  .eq('is_deleted', false)
  .maybeSingle();

    if (error) {
      throw error;
    }

    return data as T;
  }

  /**
   * Create
   */
  async create(
    payload: Record<string, any>,
  ): Promise<T> {
    const { data, error } =
      await this.client
        .from(this.table)
        .insert(payload)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data as T;
  }

  /**
   * Update
   */
  async update(
    id: string,
    payload: Record<string, any>,
  ): Promise<T> {
    const { data, error } =
      await this.client
        .from(this.table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data as T;
  }

  /**
   * Hard Delete
   */
  async delete(
    id: string,
  ): Promise<void> {
    const { error } =
      await this.client
        .from(this.table)
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Soft Delete Helper
   */
  async softDelete(
    id: string,
  ): Promise<T> {
    const { data, error } =
      await this.client
        .from(this.table)
        .update({
          is_deleted: true,
          deleted_at:
            new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data as T;
  }
}