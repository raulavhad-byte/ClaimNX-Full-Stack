import { Injectable } from '@nestjs/common';

import { RolesRepository } from './roles.repository';
import { RoleFilterDto } from './dto/role-filter.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
  ) {}

  async findAll(filter: RoleFilterDto) {
    return this.rolesRepository.findAll({
      page: filter.page,
      limit: filter.limit,

      search: filter.search,

      filters: {
        status: filter.status,
      },

      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    });
  }

  async findById(id: string) {
    return this.rolesRepository.findById(id);
  }

  async create(payload: Record<string, any>) {
    return this.rolesRepository.create(this.toPersistencePayload(payload));
  }

  async update(
    id: string,
    payload: Record<string, any>,
  ) {
    const { id: _ignoredId, ...updates } = payload;
    return this.rolesRepository.update(
      id,
      this.toPersistencePayload(updates),
    );
  }

  async delete(id: string) {
    return this.rolesRepository.delete(id);
  }

  private toPersistencePayload(payload: Record<string, any>) {
    const result: Record<string, any> = {};

    if (payload.id !== undefined) result.id = payload.id;
    if (payload.name !== undefined) result.name = payload.name;
    if (payload.description !== undefined) result.description = payload.description;
    if (payload.permissions !== undefined) result.permissions = payload.permissions;
    if (payload.canCreateRoles !== undefined) {
      result.can_create_roles = payload.canCreateRoles;
    }
    if (payload.status !== undefined) result.status = payload.status;

    return result;
  }
}
