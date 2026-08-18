import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReimbursementService } from './reimbursement.service';
import { CreateReimbursementCaseDto } from './dto/create-reimbursement-case.dto';
import { TransitionReimbursementCaseDto } from './dto/transition-reimbursement-case.dto';
import { ReimbursementCaseFilterDto } from './dto/reimbursement-case-filter.dto';

@Controller('reimbursement/cases')
@UseGuards(JwtAuthGuard)
export class ReimbursementController {
  constructor(private readonly service: ReimbursementService) {}
  @Post() create(@Body() dto: CreateReimbursementCaseDto, @CurrentUser() actor: any) { return this.service.create(dto, actor); }
  @Get() list(@Query() filter: ReimbursementCaseFilterDto, @CurrentUser() actor: any) { return this.service.list(filter, actor); }
  @Post(':id/transitions') transition(@Param('id') id: string, @Body() dto: TransitionReimbursementCaseDto, @CurrentUser() actor: any) { return this.service.transition(id, dto, actor); }
}
