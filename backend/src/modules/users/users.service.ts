import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';

import { UsersRepository } from './users.repository';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService,
  ) {}

  async findAll(filter: UserFilterDto) {
    return this.usersRepository.findAll({
      page: filter.page,
      limit: filter.limit,

      search: filter.search,

      filters: {
        status: filter.status,
        is_deleted: false,
      },

      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    });
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user || user.is_deleted) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ) {
    return this.usersRepository.update(id, {
      ...dto,
      updated_at: new Date().toISOString(),
    });
  }

  async remove(id: string) {
    await this.usersRepository.update(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    });

    return {
      message: 'User deleted successfully',
    };
  }
}