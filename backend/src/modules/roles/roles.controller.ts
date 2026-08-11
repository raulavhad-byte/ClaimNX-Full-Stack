import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleFilterDto } from './dto/role-filter.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
  ) {}

  @Get()
  @Permissions('roles.view')
  async findAll(
    @Query() filter: RoleFilterDto,
  ) {
    return this.rolesService.findAll(filter);
  }

  @Post()
  @Permissions('roles.create')
  async create(@Body() payload: CreateRoleDto) {
    return this.rolesService.create(payload);
  }

  @Patch(':id')
  @Permissions('roles.update')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, payload);
  }

  @Delete(':id')
  @Permissions('roles.delete')
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }
}
