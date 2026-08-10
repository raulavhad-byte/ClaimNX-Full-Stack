import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Create Permission
   */
  @Post()
  @Permissions('permissions.create')
  async createPermission(
    @Body() body: {
      module: string;
      action: string;
      permission: string;
      description?: string;
    },
  ) {
    return this.permissionsService.createPermission(body);
  }

  /**
   * Get All Permissions
   */
  @Get()
  @Permissions('permissions.view')
  async getAllPermissions() {
    return this.permissionsService.getAllPermissions();
  }
}