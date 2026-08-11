import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../../database/database.service';

import { UsersRepository } from './users.repository';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService,
    private readonly databaseService: DatabaseService,
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
    options: { isSelfUpdate?: boolean } = {},
  ) {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // A user can update their own profile/configuration (such as hospital
    // onboarding and payer tie-ups), but never their access identity. Role,
    // entity and hospital assignment changes remain administrator-only.
    if (!options.isSelfUpdate && dto.email !== undefined) payload.email = dto.email;
    if (dto.displayName !== undefined) payload.display_name = dto.displayName;
    if (!options.isSelfUpdate) {
      if (dto.role !== undefined) payload.role = dto.role;
      if (dto.roleId !== undefined) {
        payload.role_id = dto.roleId;
      } else if (dto.role !== undefined) {
        payload.role_id = await this.resolveRoleId(dto.role);
      }
    }
    if (!options.isSelfUpdate && dto.hospitalId !== undefined) {
      const hospitalId = await this.resolveHospitalId(dto.hospitalId);
      // Legacy UI flows can supply another user UUID as a hospital ID. Do
      // not overwrite an existing valid association with that invalid value.
      if (hospitalId) payload.hospital_id = hospitalId;
    }
    if (dto.mobileNo !== undefined) payload.mobile_no = dto.mobileNo;
    if (!options.isSelfUpdate && dto.entityType !== undefined) payload.entity_type = dto.entityType;
    if (dto.profileData !== undefined) {
      const profileData = { ...dto.profileData };
      // Never allow a JSON profile document to masquerade as an IAM record.
      delete profileData.isAdmin;
      delete profileData.role;
      delete profileData.roleId;
      delete profileData.permissions;
      delete profileData.hospitalId;
      delete profileData.entityType;
      payload.profile_data = profileData;
    }

    return this.usersRepository.update(id, payload);
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

  private async resolveRoleId(roleName: string): Promise<string> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('name', roleName.trim())
      .eq('status', 'Active')
      .maybeSingle();

    if (error || !data?.id) {
      throw new NotFoundException(`Active role "${roleName}" was not found.`);
    }

    return String(data.id);
  }

  private async resolveHospitalId(hospitalId: string): Promise<string | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('hospitals')
      .select('id')
      .eq('id', hospitalId)
      .maybeSingle();

    if (error || !data?.id) return null;
    return String(data.id);
  }
}
