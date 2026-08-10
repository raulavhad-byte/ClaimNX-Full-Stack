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

import { RecoveryService } from './recovery.service';

import { CreateRecoveryDto } from './dto/create-recovery.dto';
import { UpdateRecoveryDto } from './dto/update-recovery.dto';
import { RecoveryFilterDto } from './dto/recovery-filter.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recovery')
@UseGuards(JwtAuthGuard)
export class RecoveryController {
  constructor(
    private readonly recoveryService: RecoveryService,
  ) {}

  @Post()
  create(@Body() dto: CreateRecoveryDto) {
    return this.recoveryService.create(dto);
  }

  @Get()
  findAll(@Query() filter: RecoveryFilterDto) {
    return this.recoveryService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recoveryService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRecoveryDto,
  ) {
    return this.recoveryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recoveryService.remove(id);
  }
}