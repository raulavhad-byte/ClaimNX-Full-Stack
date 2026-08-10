import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { HospitalInsurancePartnerIntegrationUseCases } from '../../application/hospital-insurance-partner-integration.use-cases';
import {
  ChangeHospitalPayerIntegrationStatusRequestDto,
  CreateHospitalPayerIntegrationRequestDto,
  RetireHospitalPayerIntegrationRequestDto,
  UpdateHospitalPayerIntegrationRequestDto,
} from '../dto/hospital-payer-integration-request.dto';
import { HospitalPayerIntegrationResponseDto } from '../dto/hospital-payer-integration-response.dto';
import { HospitalPayerIntegrationResponseMapper } from '../mappers/hospital-payer-integration-response.mapper';

@Controller('v1/organizations/:organizationId/hospitals/:hospitalId/insurance-partner-integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HospitalPayerIntegrationV1Controller {
  constructor(
    private readonly useCases: HospitalInsurancePartnerIntegrationUseCases,
  ) {}

  @Get()
  @Permissions('insurance.read')
  async list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @CurrentUser('id') actorUserId: string,
  ): Promise<HospitalPayerIntegrationResponseDto[]> {
    const integrations = await this.useCases.list(
      actorUserId,
      organizationId,
      hospitalId,
    );
    return integrations.map(HospitalPayerIntegrationResponseMapper.toResponse);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('insurance.update')
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateHospitalPayerIntegrationRequestDto,
  ): Promise<HospitalPayerIntegrationResponseDto> {
    return HospitalPayerIntegrationResponseMapper.toResponse(
      await this.useCases.create({ actorUserId, organizationId, hospitalId, ...body }),
    );
  }

  @Get(':hospitalInsurancePartnerIntegrationId')
  @Permissions('insurance.read')
  async get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('hospitalInsurancePartnerIntegrationId', ParseUUIDPipe)
    hospitalInsurancePartnerIntegrationId: string,
    @CurrentUser('id') actorUserId: string,
  ): Promise<HospitalPayerIntegrationResponseDto> {
    return HospitalPayerIntegrationResponseMapper.toResponse(
      await this.useCases.get({
        actorUserId,
        organizationId,
        hospitalId,
        hospitalInsurancePartnerIntegrationId,
      }),
    );
  }

  @Patch(':hospitalInsurancePartnerIntegrationId')
  @Permissions('insurance.update')
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('hospitalInsurancePartnerIntegrationId', ParseUUIDPipe)
    hospitalInsurancePartnerIntegrationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: UpdateHospitalPayerIntegrationRequestDto,
  ): Promise<HospitalPayerIntegrationResponseDto> {
    return HospitalPayerIntegrationResponseMapper.toResponse(
      await this.useCases.update({
        actorUserId,
        organizationId,
        hospitalId,
        hospitalInsurancePartnerIntegrationId,
        ...body,
      }),
    );
  }

  @Patch(':hospitalInsurancePartnerIntegrationId/status')
  @Permissions('insurance.update')
  async changeStatus(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('hospitalInsurancePartnerIntegrationId', ParseUUIDPipe)
    hospitalInsurancePartnerIntegrationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: ChangeHospitalPayerIntegrationStatusRequestDto,
  ): Promise<HospitalPayerIntegrationResponseDto> {
    return HospitalPayerIntegrationResponseMapper.toResponse(
      await this.useCases.setStatus({
        actorUserId,
        organizationId,
        hospitalId,
        hospitalInsurancePartnerIntegrationId,
        ...body,
      }),
    );
  }

  @Delete(':hospitalInsurancePartnerIntegrationId')
  @Permissions('insurance.update')
  async retire(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('hospitalInsurancePartnerIntegrationId', ParseUUIDPipe)
    hospitalInsurancePartnerIntegrationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: RetireHospitalPayerIntegrationRequestDto,
  ) {
    await this.useCases.retire({
      actorUserId,
      organizationId,
      hospitalId,
      hospitalInsurancePartnerIntegrationId,
      ...body,
    });
    return { hospitalInsurancePartnerIntegrationId, retired: true };
  }
}
