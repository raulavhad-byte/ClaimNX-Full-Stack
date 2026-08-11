import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { InsuranceFilterDto } from './dto/insurance-filter.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(
    private readonly insuranceService: InsuranceService,
  ) {}

  @Get()
  findAll(@Query() filter: InsuranceFilterDto) {
    return this.insuranceService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.insuranceService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInsuranceDto, @Req() request: Request) {
    return this.insuranceService.create(dto, (request as any).user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInsuranceDto,
  ) {
    return this.insuranceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.insuranceService.remove(id);
  }
}
