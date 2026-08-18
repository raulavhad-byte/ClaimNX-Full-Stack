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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() request: Request & { user: { id: string; hospitalId?: string | null; permissions?: string[] } },
  ) {
    this.assertSelfOrUserEditor(id, request.user);
    return this.usersService.uploadAvatar(id, file, request.user);
  }

  @Get(':id/avatar-url')
  async getAvatarUrl(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string; permissions?: string[] } },
  ) {
    this.assertSelfOrUserViewer(id, request.user);
    return this.usersService.getAvatarUrl(id);
  }

  @Delete(':id/avatar')
  async deleteAvatar(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string; hospitalId?: string | null; permissions?: string[] } },
  ) {
    this.assertSelfOrUserEditor(id, request.user);
    return this.usersService.deleteAvatar(id, request.user);
  }

  @Post(':id/assets/:kind')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadProfileAsset(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @UploadedFile() file: any,
    @Req() request: Request & { user: { id: string; hospitalId?: string | null; permissions?: string[] } },
  ) {
    this.assertSelfOrUserEditor(id, request.user);
    return this.usersService.uploadProfileAsset(id, kind, file, request.user);
  }

  @Get(':id/assets/:kind/url')
  async getProfileAssetUrl(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @Req() request: Request & { user: { id: string; permissions?: string[] } },
  ) {
    this.assertSelfOrUserViewer(id, request.user);
    return this.usersService.getProfileAssetUrl(id, kind);
  }

  @Delete(':id/assets/:kind')
  async deleteProfileAsset(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @Req() request: Request & { user: { id: string; hospitalId?: string | null; permissions?: string[] } },
  ) {
    this.assertSelfOrUserEditor(id, request.user);
    return this.usersService.deleteProfileAsset(id, kind, request.user);
  }

  @Delete(':id')
  @Permissions('users.delete')
  async remove(
    @Param('id') id: string,
  ) {
    return this.usersService.remove(id);
  }

  private assertSelfOrUserEditor(id: string, actor: { id: string; permissions?: string[] }) {
    const permissions = actor.permissions ?? [];
    if (actor.id !== id && !permissions.includes('all') && !permissions.includes('users.edit')) {
      throw new ForbiddenException('You do not have permission to update this profile image.');
    }
  }

  private assertSelfOrUserViewer(id: string, actor: { id: string; permissions?: string[] }) {
    const permissions = actor.permissions ?? [];
    if (actor.id !== id && !permissions.includes('all') && !permissions.includes('users.view')) {
      throw new ForbiddenException('You do not have permission to view this profile image.');
    }
  }
}
