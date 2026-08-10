import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

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
  @Permissions('users.edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('users.delete')
  async remove(
    @Param('id') id: string,
  ) {
    return this.usersService.remove(id);
  }
}