import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportAutomationService } from './report-automation.service';

@Controller('report-automations')
@UseGuards(JwtAuthGuard)
export class ReportAutomationController {
  constructor(private readonly service: ReportAutomationService) {}
  @Get() list(@CurrentUser() actor: any) { return this.service.list(actor); }
  @Get('logs') logs(@CurrentUser() actor: any) { return this.service.logs(actor); }
  @Get('templates') templates(@CurrentUser() actor: any) { return this.service.templates(actor); }
  @Post('templates') createTemplate(@Body() body: any, @CurrentUser() actor: any) { return this.service.createTemplate(body, actor); }
  @Patch('templates/:id') updateTemplate(@Param('id') id: string, @Body() body: any, @CurrentUser() actor: any) { return this.service.updateTemplate(id, body, actor); }
  @Post() create(@Body() body: any, @CurrentUser() actor: any) { return this.service.create(body, actor); }
  @Post(':id/run') run(@Param('id') id: string, @CurrentUser() actor: any) { return this.service.run(id, actor); }
  @Post('manual-dispatch') manual(@Body() body: any, @CurrentUser() actor: any) { return this.service.manualDispatch(body, actor); }
}
