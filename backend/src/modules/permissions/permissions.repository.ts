import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../../shared/repository/base.repository';
import { DatabaseService } from '../../database/database.service';
import { QueryBuilderService } from '../../shared/services/query-builder.service';

export interface PermissionEntity {
  id: string;

  module: string;

  action: string;

  permission: string;

  description: string | null;

  status: string;

  created_at: string;

  updated_at: string;
}

export interface CreatePermissionDto {
  module: string;

  action: string;

  permission: string;

  description?: string;
}

@Injectable()
export class PermissionsRepository extends BaseRepository {
  constructor(
    databaseService: DatabaseService,
    queryBuilder: QueryBuilderService,
  ) {
    super(databaseService, queryBuilder, {
      table: 'permissions',

      searchableColumns: [
        'module',
        'action',
        'permission',
      ],

      defaultSortBy: 'module',

      defaultSortOrder: 'asc',
    });
  }

  /**
   * Find Permission By Name
   */
  async findByPermission(
    permission: string,
  ): Promise<PermissionEntity | null> {
    const { data, error } = await this.client
      .from('permissions')
      .select('*')
      .eq('permission', permission)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Create Permission
   */
  async createPermission(
    permission: CreatePermissionDto,
  ): Promise<PermissionEntity> {
    const { data, error } = await this.client
      .from('permissions')
      .insert({
        ...permission,
        description:
          permission.description ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Get All Permissions
   */
  async getAllPermissions(): Promise<
    PermissionEntity[]
  > {
    const { data, error } = await this.client
      .from('permissions')
      .select('*')
      .order('module')
      .order('action');

    if (error) {
      throw error;
    }

    return data ?? [];
  }
}