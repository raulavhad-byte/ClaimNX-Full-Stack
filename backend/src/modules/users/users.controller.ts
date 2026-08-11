import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @Permissions('users.view')
  async findAll(
    @Query() filter: UserFilterDto,
  ) {
    return this.usersService.findAll(filter);
  }

  @Get(':id')
  @Permissions('users.view')
  async findOne(
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('users.create')
  async create(
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: Request & { user: { id: string; permissions?: string[] } },
  ) {
    const isSelfUpdate = request.user?.id === id;
    const canEditUsers = request.user?.permissions?.includes('all')
      || request.user?.permissions?.includes('users.edit');

    if (!isSelfUpdate && !canEditUsers) {
      throw new ForbiddenException('You do not have permission to update this user.');
    }

    return this.usersService.update(id, dto, { isSelfUpdate });
  }

  @Delete(':id')
  @Permissions('users.delete')
  async remove(
    @Param('id') id: string,
  ) {
    return this.usersService.remove(id);
  }
}
