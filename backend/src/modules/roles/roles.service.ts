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
    return this.rolesRepository.create(payload);
  }

  async update(
    id: string,
    payload: Record<string, any>,
  ) {
    return this.rolesRepository.update(id, payload);
  }

  async delete(id: string) {
    return this.rolesRepository.delete(id);
  }
}