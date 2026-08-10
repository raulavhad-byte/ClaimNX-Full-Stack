import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ReconciliationService } from './reconciliation.service';

import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { UpdateReconciliationDto } from './dto/update-reconciliation.dto';
import { ReconciliationFilterDto } from './dto/reconciliation-filter.dto';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateReconciliationDto,
  ) {
    return this.reconciliationService.create(dto);
  }

  @Get()
  findAll(
    @Query() filter: ReconciliationFilterDto,
  ) {
    return this.reconciliationService.findAll(filter);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.reconciliationService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReconciliationDto,
  ) {
    return this.reconciliationService.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.reconciliationService.remove(id);
  }
}