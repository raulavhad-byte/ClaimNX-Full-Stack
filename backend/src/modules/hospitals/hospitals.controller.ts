import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { HospitalsService } from './hospitals.service';

import { Query } from '@nestjs/common';

import { HospitalFilterDto } from './dto/hospital-filter.dto';

@Controller('hospitals')
@UseGuards(JwtAuthGuard)
export class HospitalsController {
  constructor(
    private readonly hospitalsService: HospitalsService,
  ) {}

  @Get()
async findAll(
  @Query() filter: HospitalFilterDto,
) {
  return this.hospitalsService.findAll(filter);
}

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ) {
    return this.hospitalsService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: any,
  ) {
    return this.hospitalsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.hospitalsService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
  ) {
    return this.hospitalsService.remove(id);
  }
}