import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { AutomationManagementUseCases } from '../../application/automation-management.use-cases';
import {
  CreateAutomationOwnerCommandRequestDto,
  CreateAutomationReviewCaseDto,
  CreateAutomationWorkRequestDto,
  CreatePayerDispatchTaskDto,
  RecordAutomationJobAttemptDto,
  RecordAutomationReviewDecisionDto,
  StartAutomationWorkRequestDto,
} from '../dto/automation-command-request.dto';

/** Phase 10 command boundary. It never returns credentials, provider payloads, or opaque secret values. */
@Controller('v1/organizations/:organizationId/hospitals/:hospitalId/automation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AutomationV1Controller {
  constructor(private readonly useCases: AutomationManagementUseCases) {}

  private scope(organizationId: string, hospitalId: string, actorUserId: string) {
    return { organizationId, hospitalId, actorUserId };
  }

  @Post('work-requests')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('automation.update')
  async createWorkRequest(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string, @Body() body: CreateAutomationWorkRequestDto) {
    const automationWorkRequestId = await this.useCases.createWorkRequest({ ...this.scope(organizationId, hospitalId, actorUserId), ...body });
    return { automationWorkRequestId };
  }

  @Patch('work-requests/:automationWorkRequestId/start')
  @Permissions('automation.update')
  async startWorkRequest(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @Param('automationWorkRequestId', ParseUUIDPipe) automationWorkRequestId: string, @CurrentUser('id') actorUserId: string, @Body() body: StartAutomationWorkRequestDto) {
    const startedAutomationWorkRequestId = await this.useCases.startWorkRequest({ ...this.scope(organizationId, hospitalId, actorUserId), automationWorkRequestId, ...body });
    return { automationWorkRequestId: startedAutomationWorkRequestId };
  }

  @Post('work-requests/:automationWorkRequestId/job-attempts')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('automation.update')
  async recordJobAttempt(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @Param('automationWorkRequestId', ParseUUIDPipe) automationWorkRequestId: string, @CurrentUser('id') actorUserId: string, @Body() body: RecordAutomationJobAttemptDto) {
    const automationJobAttemptId = await this.useCases.recordJobAttempt({ ...this.scope(organizationId, hospitalId, actorUserId), automationWorkRequestId, ...body });
    return { automationJobAttemptId };
  }

  @Post('review-cases')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('automation.update')
  async createReviewCase(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string, @Body() body: CreateAutomationReviewCaseDto) {
    const automationReviewCaseId = await this.useCases.createReviewCase({ ...this.scope(organizationId, hospitalId, actorUserId), ...body });
    return { automationReviewCaseId };
  }

  @Post('review-cases/:automationReviewCaseId/decisions')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('automation.update')
  async recordReviewDecision(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @Param('automationReviewCaseId', ParseUUIDPipe) automationReviewCaseId: string, @CurrentUser('id') actorUserId: string, @Body() body: RecordAutomationReviewDecisionDto) {
    const automationReviewDecisionId = await this.useCases.recordReviewDecision({ ...this.scope(organizationId, hospitalId, actorUserId), automationReviewCaseId, ...body });
    return { automationReviewDecisionId };
  }

  @Post('owner-command-requests')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('automation.update')
  async createOwnerCommandRequest(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string, @Body() body: CreateAutomationOwnerCommandRequestDto) {
    const automationOwnerCommandRequestId = await this.useCases.createOwnerCommandRequest({ ...this.scope(organizationId, hospitalId, actorUserId), ...body });
    return { automationOwnerCommandRequestId };
  }

  @Post('payer-dispatch-tasks')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('automation.update')
  async createPayerDispatchTask(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string, @Body() body: CreatePayerDispatchTaskDto) {
    const payerDispatchTaskId = await this.useCases.createPayerDispatchTask({ ...this.scope(organizationId, hospitalId, actorUserId), ...body });
    return { payerDispatchTaskId };
  }
}
