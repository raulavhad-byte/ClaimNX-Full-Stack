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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { ClaimsService } from './claims.service';

import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { ClaimFilterDto } from './dto/claim-filter.dto';
import { CrmDecisionDto } from './dto/crm-decision.dto';
import { CrmCommentDto } from './dto/crm-comment.dto';
import { MisReportQueryDto } from './dto/mis-report-query.dto';
import { MisReportService } from './mis-report.service';
import type { ClaimStageActor } from './claim-stage-permissions';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly misReportService: MisReportService,
  ) {}

  @Post()
  create(
    @Body() createClaimDto: CreateClaimDto,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.claimsService.create(createClaimDto, actorUserId);
  }

  @Get()
  findAll(
    @Query() filter: ClaimFilterDto,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.claimsService.findAll(filter, actorUserId);
  }

  @Get('crm/performance')
  crmPerformance(@CurrentUser() actor: ClaimStageActor) {
    return this.claimsService.getCrmPerformance(actor);
  }

  @Get('reports/mis')
  misReport(
    @Query() query: MisReportQueryDto,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.misReportService.generate(query, actorUserId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.claimsService.findOne(id, actorUserId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClaimDto: UpdateClaimDto,
    @CurrentUser() actor: ClaimStageActor,
  ) {
    return this.claimsService.update(
      id,
      updateClaimDto,
      actor,
    );
  }

  @Post(':id/crm/accept')
  acceptForCrmReview(
    @Param('id') id: string,
    @CurrentUser() actor: ClaimStageActor,
  ) {
    return this.claimsService.acceptForCrmReview(id, actor);
  }

  @Post(':id/crm/comment')
  addCrmComment(
    @Param('id') id: string,
    @Body() comment: CrmCommentDto,
    @CurrentUser() actor: ClaimStageActor,
  ) {
    return this.claimsService.addCrmComment(id, comment, actor);
  }

  @Post(':id/crm/decision')
  submitCrmDecision(
    @Param('id') id: string,
    @Body() decision: CrmDecisionDto,
    @CurrentUser() actor: ClaimStageActor,
  ) {
    return this.claimsService.submitCrmDecision(id, decision, actor);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: ClaimStageActor,
  ) {
    return this.claimsService.remove(id, actor);
  }
}
