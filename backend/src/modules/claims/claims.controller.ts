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

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  constructor(
    private readonly claimsService: ClaimsService,
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
  ) {
    return this.claimsService.findAll(filter);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.claimsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClaimDto: UpdateClaimDto,
  ) {
    return this.claimsService.update(
      id,
      updateClaimDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.claimsService.remove(id);
  }
}
