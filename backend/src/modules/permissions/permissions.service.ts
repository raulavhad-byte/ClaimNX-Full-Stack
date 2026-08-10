import { Injectable } from '@nestjs/common';

import {
  PermissionEntity,
  CreatePermissionDto,
  PermissionsRepository,
} from './permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  /**
   * Get All Permissions
   */
  async getAllPermissions(): Promise<
    PermissionEntity[]
  > {
    return this.permissionsRepository.getAllPermissions();
  }

  /**
   * Create Permission
   */
  async createPermission(
    permission: CreatePermissionDto,
  ): Promise<PermissionEntity> {
    return this.permissionsRepository.createPermission(
      permission,
    );
  }

  /**
   * Find Permission By Name
   */
  async findByPermission(
    permission: string,
  ): Promise<PermissionEntity | null> {
    return this.permissionsRepository.findByPermission(
      permission,
    );
  }
}