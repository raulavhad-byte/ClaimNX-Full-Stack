import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { OrganizationMemberManagementUseCases } from '../application/organization-member-management.use-cases';
import {
  AddOrganizationMemberRequestDto,
  ChangeOrganizationMemberStatusRequestDto,
} from './dto/organization-member-request.dto';

/**
 * Organization Member management routes. Existing IAM permissions are used:
 * `users.view` for reads and `users.manage` for lifecycle changes. This
 * capability never changes a User, Role, or Permission itself.
 */
@Controller('v1/organizations/:organizationId/members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationMemberV1Controller {
  constructor(
    private readonly organizationMemberManagementUseCases: OrganizationMemberManagementUseCases,
  ) {}

  @Get()
  @Permissions('users.view')
  async list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    const members = await this.organizationMemberManagementUseCases.list(
      actorUserId,
      organizationId,
    );
    return members.map((member) => member.snapshot);
  }

  @Post()
  @Permissions('users.manage')
  async add(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: AddOrganizationMemberRequestDto,
  ) {
    const member = await this.organizationMemberManagementUseCases.add({
      actorUserId,
      organizationId,
      ...body,
    });
    return member.snapshot;
  }

  @Get(':organizationMemberId')
  @Permissions('users.view')
  async get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('organizationMemberId', ParseUUIDPipe) organizationMemberId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    const member = await this.organizationMemberManagementUseCases.get({
      actorUserId,
      organizationId,
      organizationMemberId,
    });
    return member.snapshot;
  }

  @Patch(':organizationMemberId/suspend')
  @Permissions('users.manage')
  async suspend(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('organizationMemberId', ParseUUIDPipe) organizationMemberId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: ChangeOrganizationMemberStatusRequestDto,
  ) {
    const member = await this.organizationMemberManagementUseCases.suspend({
      actorUserId,
      organizationId,
      organizationMemberId,
      ...body,
    });
    return member.snapshot;
  }

  @Patch(':organizationMemberId/reactivate')
  @Permissions('users.manage')
  async reactivate(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('organizationMemberId', ParseUUIDPipe) organizationMemberId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: ChangeOrganizationMemberStatusRequestDto,
  ) {
    const member = await this.organizationMemberManagementUseCases.reactivate({
      actorUserId,
      organizationId,
      organizationMemberId,
      ...body,
    });
    return member.snapshot;
  }

  @Delete(':organizationMemberId')
  @Permissions('users.manage')
  async retire(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('organizationMemberId', ParseUUIDPipe) organizationMemberId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: ChangeOrganizationMemberStatusRequestDto,
  ) {
    const member = await this.organizationMemberManagementUseCases.retire({
      actorUserId,
      organizationId,
      organizationMemberId,
      ...body,
    });
    return {
      organizationMemberId: member.id,
      retired: true,
      version: member.snapshot.version,
    };
  }
}
