import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { RoleFilterDto } from './dto/role-filter.dto';

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
}