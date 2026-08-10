import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

import { InsurancePartnerUseCases } from '../../application/insurance-partner.use-cases';
import { InsurancePartnerQueryService } from '../../application/insurance-partner-query.service';

import { CreateInsurancePartnerRequestDto } from '../dto/request/create-insurance-partner-request.dto';
import { UpdateInsurancePartnerRequestDto } from '../dto/request/update-insurance-partner-request.dto';
import { ListInsurancePartnersRequestDto } from '../dto/request/list-insurance-partners-request.dto';

import { InsurancePartnerResponseDto } from '../dto/response/insurance-partner-response.dto';
import { InsurancePartnerListResponseDto } from '../dto/response/insurance-partner-list-response.dto';

import { InsurancePartnerResponseMapper } from '../mappers/insurance-partner-response.mapper';

@Controller('v1/insurance/partners')
@UseGuards(JwtAuthGuard)
export class InsurancePartnerController {
  constructor(
    private readonly insurancePartnerUseCases: InsurancePartnerUseCases,
    private readonly insurancePartnerQueryService: InsurancePartnerQueryService,
  ) {}

  // ===========================================================
  // CREATE
  // ===========================================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPartner(
    @CurrentUser('id') actorUserId: string,
    @Body() request: CreateInsurancePartnerRequestDto,
  ): Promise<InsurancePartnerResponseDto> {
    const partner =
      await this.insurancePartnerUseCases.create({
        actorUserId,

        partnerCode: request.partnerCode,

        displayName: request.displayName,

        legalName: request.legalName,

        partnerTypeReferenceValueId:
          request.partnerTypeReferenceValueId,

        operationalStatusReferenceValueId:
          request.operationalStatusReferenceValueId,

        registrationNumber:
          request.registrationNumber,
      });

    return InsurancePartnerResponseMapper.toResponse(partner);
  }

  // ===========================================================
  // LIST
  // ===========================================================

  @Get()
  async listPartners(
    @CurrentUser('id') actorUserId: string,
    @Query() request: ListInsurancePartnersRequestDto,
  ): Promise<InsurancePartnerListResponseDto> {
    return this.insurancePartnerQueryService.list({
      actorUserId,

      page: request.page,
      limit: request.limit,

      search: request.search,

      partnerTypeReferenceValueId:
        request.partnerTypeReferenceValueId,

      operationalStatusReferenceValueId:
        request.operationalStatusReferenceValueId,

      sortBy: request.sortBy,

      sortOrder: request.sortOrder,
    });
  }

  // ===========================================================
  // GET BY ID
  // ===========================================================

  @Get(':partnerId')
  async getPartner(
    @CurrentUser('id') actorUserId: string,

    @Param(
      'partnerId',
      new ParseUUIDPipe({ version: '4' }),
    )
    partnerId: string,
  ): Promise<InsurancePartnerResponseDto> {
    const partner =
      await this.insurancePartnerUseCases.get(
        actorUserId,
        partnerId,
      );

    return InsurancePartnerResponseMapper.toResponse(partner);
  }

  // ===========================================================
  // UPDATE
  // ===========================================================

  @Patch(':partnerId')
  async updatePartner(
    @CurrentUser('id') actorUserId: string,

    @Param(
      'partnerId',
      new ParseUUIDPipe({ version: '4' }),
    )
    partnerId: string,

    @Body()
    request: UpdateInsurancePartnerRequestDto,
  ): Promise<InsurancePartnerResponseDto> {
    const partner =
      await this.insurancePartnerUseCases.update({
        actorUserId,

        insurancePartnerId: partnerId,

        version: request.version,

        displayName: request.displayName,

        legalName: request.legalName,

        registrationNumber:
          request.registrationNumber,
      });

    return InsurancePartnerResponseMapper.toResponse(partner);
  }
}