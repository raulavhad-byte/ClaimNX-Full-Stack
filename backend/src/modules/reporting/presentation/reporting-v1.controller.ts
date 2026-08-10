import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ReportingApiUseCases } from '../application/reporting-api.use-cases';
import { ReportingRetireRequestDto } from './dto/reporting-retire-request.dto';
import { ReportingStatusRequestDto } from './dto/reporting-status-request.dto';

interface AuthenticatedRequest {
  readonly user?: { readonly id?: string; readonly userId?: string; readonly sub?: string };
}

@Controller('v1/organizations/:organizationId/reports')
export class ReportingV1Controller {
  constructor(private readonly useCases: ReportingApiUseCases) {}

  @Get('definitions')
  listDefinitions(@Param('organizationId') organizationId: string, @Req() request: AuthenticatedRequest) {
    return this.useCases.listDefinitions(this.scope(organizationId, request));
  }

  @Get('definitions/:reportDefinitionId')
  getDefinition(@Param('organizationId') organizationId: string, @Param('reportDefinitionId') id: string, @Req() request: AuthenticatedRequest) {
    return this.useCases.getDefinition(this.scope(organizationId, request), id);
  }

  @Get('schedules/:reportScheduleId')
  getSchedule(@Param('organizationId') organizationId: string, @Param('reportScheduleId') id: string, @Req() request: AuthenticatedRequest) {
    return this.useCases.getSchedule(this.scope(organizationId, request), id);
  }

  @Get('executions/:reportExecutionId')
  getExecution(@Param('organizationId') organizationId: string, @Param('reportExecutionId') id: string, @Req() request: AuthenticatedRequest) {
    return this.useCases.getExecution(this.scope(organizationId, request), id);
  }

  @Patch('definitions/:reportDefinitionId/status')
  setDefinitionStatus(@Param('organizationId') organizationId: string, @Param('reportDefinitionId') id: string, @Body() body: ReportingStatusRequestDto, @Req() request: AuthenticatedRequest) {
    return this.useCases.setDefinitionStatus(this.scope(organizationId, request), id, body.expectedVersion, body.operationalStatusReferenceValueId);
  }

  @Patch('schedules/:reportScheduleId/status')
  setScheduleStatus(@Param('organizationId') organizationId: string, @Param('reportScheduleId') id: string, @Body() body: ReportingStatusRequestDto, @Req() request: AuthenticatedRequest) {
    return this.useCases.setScheduleStatus(this.scope(organizationId, request), id, body.expectedVersion, body.operationalStatusReferenceValueId);
  }

  @Patch('executions/:reportExecutionId/status')
  setExecutionStatus(@Param('organizationId') organizationId: string, @Param('reportExecutionId') id: string, @Body() body: ReportingStatusRequestDto, @Req() request: AuthenticatedRequest) {
    return this.useCases.setExecutionStatus(this.scope(organizationId, request), id, body.expectedVersion, body.operationalStatusReferenceValueId);
  }

  @Delete('schedules/:reportScheduleId')
  @HttpCode(204)
  async retireSchedule(@Param('organizationId') organizationId: string, @Param('reportScheduleId') id: string, @Body() body: ReportingRetireRequestDto, @Req() request: AuthenticatedRequest): Promise<void> {
    await this.useCases.retireSchedule(this.scope(organizationId, request), id, body.expectedVersion);
  }

  private scope(organizationId: string, request: AuthenticatedRequest) {
    const actorUserId = request.user?.id ?? request.user?.userId ?? request.user?.sub;
    if (!actorUserId) throw new UnauthorizedException('Authenticated user context is required.');
    return { organizationId, actorUserId };
  }
}
