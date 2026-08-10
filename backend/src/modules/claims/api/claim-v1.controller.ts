import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ClaimUseCases } from '../application/claim.use-cases';
import {
  ClaimListQueryDto,
  CreateClaimAuthorizationRequestDto,
  CreateClaimQueryRequestDto,
  CreateClaimRequestDto,
  CreateClaimSubmissionIntentRequestDto,
  TransitionClaimLifecycleRequestDto,
} from './dto/claim-command-request.dto';

/** Versioned Phase 8 API. Legacy `/claims` CRUD remains untouched for compatibility. */
@Controller('v1/organizations/:organizationId/hospitals/:hospitalId/claims')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClaimV1Controller {
  constructor(private readonly useCases: ClaimUseCases) {}

  @Get()
  @Permissions('claims.view')
  async list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @CurrentUser('id') actorUserId: string,
    @Query() query: ClaimListQueryDto,
  ) {
    return this.useCases.list({ actorUserId, organizationId, hospitalId, ...query });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('claims.create')
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateClaimRequestDto,
  ) {
    return this.toResponse(await this.useCases.create({ actorUserId, organizationId, hospitalId, ...body }));
  }

  @Get(':claimId')
  @Permissions('claims.view')
  async get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.toResponse(await this.useCases.get({ actorUserId, organizationId, hospitalId, claimId }));
  }

  @Patch(':claimId/lifecycle')
  @Permissions('claims.update')
  async transition(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: TransitionClaimLifecycleRequestDto,
  ) {
    return this.toResponse(await this.useCases.transition({ actorUserId, organizationId, hospitalId, claimId, ...body }));
  }

  @Post(':claimId/authorizations')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('claims.update')
  async createAuthorization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateClaimAuthorizationRequestDto,
  ) {
    return { claimAuthorizationId: await this.useCases.createAuthorization({ actorUserId, organizationId, hospitalId, claimId, ...body }) };
  }

  @Post(':claimId/queries')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('claims.update')
  async createQuery(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateClaimQueryRequestDto,
  ) {
    return { claimQueryId: await this.useCases.createQuery({ actorUserId, organizationId, hospitalId, claimId, ...body }) };
  }

  @Post(':claimId/submission-intents')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('claims.update')
  async createSubmissionIntent(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateClaimSubmissionIntentRequestDto,
  ) {
    return { claimSubmissionIntentId: await this.useCases.createSubmissionIntent({ actorUserId, organizationId, hospitalId, claimId, ...body }) };
  }

  private toResponse(claim: Awaited<ReturnType<ClaimUseCases['get']>>) {
    return claim.snapshot;
  }
}
