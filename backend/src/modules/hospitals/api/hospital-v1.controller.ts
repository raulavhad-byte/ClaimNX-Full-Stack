import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CreateHospitalUseCase } from '../application/create-hospital.use-case';
import { GetHospitalUseCase } from '../application/get-hospital.use-case';
import { UpdateHospitalRootUseCase } from '../application/update-hospital-root.use-case';
import { HospitalAddressUseCases } from '../application/hospital-address.use-cases';
import { HospitalContactUseCases } from '../application/hospital-contact.use-cases';
import { HospitalDepartmentUseCases } from '../application/hospital-department.use-cases';
import { SetHospitalPrimaryChildUseCase } from '../application/set-hospital-primary-child.use-case';
import { Hospital } from '../domain/hospital.aggregate';

import { CreateHospitalRequestDto } from './dto/create-hospital-request.dto';
import { UpdateHospitalRootRequestDto } from './dto/update-hospital-root-request.dto';
import {
  CreateHospitalAddressDto,
  DeleteHospitalAddressDto,
  UpdateHospitalAddressDto,
} from './dto/hospital-address-request.dto';
import { CreateHospitalContactDto, DeleteHospitalContactDto, UpdateHospitalContactDto } from './dto/hospital-contact-request.dto';
import { CreateHospitalDepartmentDto, DeleteHospitalDepartmentDto, UpdateHospitalDepartmentDto } from './dto/hospital-department-request.dto';
import { SetHospitalPrimaryChildRequestDto } from './dto/set-hospital-primary-child-request.dto';

@Controller('v1/organizations/:organizationId/hospitals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HospitalV1Controller {
  constructor(
    private readonly createHospitalUseCase: CreateHospitalUseCase,
    private readonly getHospitalUseCase: GetHospitalUseCase,
    private readonly updateHospitalRootUseCase: UpdateHospitalRootUseCase,
    private readonly hospitalAddressUseCases: HospitalAddressUseCases,
    private readonly hospitalContactUseCases: HospitalContactUseCases,
    private readonly hospitalDepartmentUseCases: HospitalDepartmentUseCases,
    private readonly setHospitalPrimaryChildUseCase: SetHospitalPrimaryChildUseCase,
  ) {}

  @Post()
  @Permissions('hospitals.create')
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateHospitalRequestDto,
  ) {
    const hospital = await this.createHospitalUseCase.execute({
      organizationId,
      actorUserId,
      ...body,
    });

    return this.toResponse(hospital);
  }

  @Get(':hospitalId')
  @Permissions('hospitals.view')
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    const hospital = await this.getHospitalUseCase.execute({
      actorUserId,
      organizationId,
      hospitalId,
    });

    return this.toResponse(hospital);
  }

  @Patch(':hospitalId')
  @Permissions('hospitals.update')
  async updateRoot(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: UpdateHospitalRootRequestDto,
  ) {
    const hospital = await this.updateHospitalRootUseCase.execute({
      organizationId,
      hospitalId,
      actorUserId,
      ...body,
    });

    return this.toResponse(hospital);
  }

  @Get(':hospitalId/addresses')
  @Permissions('hospitals.view')
  async listAddresses(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.hospitalAddressUseCases.list({ actorUserId, organizationId, hospitalId });
  }

  @Post(':hospitalId/addresses')
  @Permissions('hospitals.update')
  async createAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: CreateHospitalAddressDto,
  ) {
    return this.hospitalAddressUseCases.create({ actorUserId, organizationId, hospitalId, ...body });
  }

  @Patch(':hospitalId/addresses/:hospitalAddressId')
  @Permissions('hospitals.update')
  async updateAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('hospitalAddressId', ParseUUIDPipe) hospitalAddressId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: UpdateHospitalAddressDto,
  ) {
    return this.hospitalAddressUseCases.update({
      actorUserId, organizationId, hospitalId, hospitalAddressId, ...body,
    });
  }

  @Delete(':hospitalId/addresses/:hospitalAddressId')
  @Permissions('hospitals.update')
  async deleteAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('hospitalAddressId', ParseUUIDPipe) hospitalAddressId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() body: DeleteHospitalAddressDto,
  ) {
    await this.hospitalAddressUseCases.softDelete({
      actorUserId, organizationId, hospitalId, hospitalAddressId, ...body,
    });
    return { hospitalAddressId, deleted: true };
  }

  @Get(':hospitalId/contacts')
  @Permissions('hospitals.view')
  async listContacts(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string) {
    return this.hospitalContactUseCases.list({ actorUserId, organizationId, hospitalId });
  }

  @Post(':hospitalId/contacts')
  @Permissions('hospitals.update')
  async createContact(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string, @Body() body: CreateHospitalContactDto) {
    return this.hospitalContactUseCases.create({ actorUserId, organizationId, hospitalId, ...body });
  }

  @Patch(':hospitalId/contacts/:hospitalContactId')
  @Permissions('hospitals.update')
  async updateContact(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @Param('hospitalContactId', ParseUUIDPipe) hospitalContactId: string, @CurrentUser('id') actorUserId: string, @Body() body: UpdateHospitalContactDto) {
    return this.hospitalContactUseCases.update({ actorUserId, organizationId, hospitalId, hospitalContactId, ...body });
  }

  @Delete(':hospitalId/contacts/:hospitalContactId')
  @Permissions('hospitals.update')
  async deleteContact(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @Param('hospitalContactId', ParseUUIDPipe) hospitalContactId: string, @CurrentUser('id') actorUserId: string, @Body() body: DeleteHospitalContactDto) {
    await this.hospitalContactUseCases.softDelete({ actorUserId, organizationId, hospitalId, hospitalContactId, ...body });
    return { hospitalContactId, deleted: true };
  }

  @Get(':hospitalId/departments')
  @Permissions('hospitals.view')
  async listDepartments(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string) {
    return this.hospitalDepartmentUseCases.list({ actorUserId, organizationId, hospitalId });
  }

  @Post(':hospitalId/departments')
  @Permissions('hospitals.update')
  async createDepartment(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string, @Body() body: CreateHospitalDepartmentDto) {
    return this.hospitalDepartmentUseCases.create({ actorUserId, organizationId, hospitalId, ...body });
  }

  @Patch(':hospitalId/departments/:hospitalDepartmentId')
  @Permissions('hospitals.update')
  async updateDepartment(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @Param('hospitalDepartmentId', ParseUUIDPipe) hospitalDepartmentId: string, @CurrentUser('id') actorUserId: string, @Body() body: UpdateHospitalDepartmentDto) {
    return this.hospitalDepartmentUseCases.update({ actorUserId, organizationId, hospitalId, hospitalDepartmentId, ...body });
  }

  @Delete(':hospitalId/departments/:hospitalDepartmentId')
  @Permissions('hospitals.update')
  async deleteDepartment(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @Param('hospitalDepartmentId', ParseUUIDPipe) hospitalDepartmentId: string, @CurrentUser('id') actorUserId: string, @Body() body: DeleteHospitalDepartmentDto) {
    await this.hospitalDepartmentUseCases.softDelete({ actorUserId, organizationId, hospitalId, hospitalDepartmentId, ...body });
    return { hospitalDepartmentId, deleted: true };
  }

  @Patch(':hospitalId/primary-address')
  @Permissions('hospitals.update')
  async setPrimaryAddress(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string, @Body() body: SetHospitalPrimaryChildRequestDto) {
    const hospital = await this.setHospitalPrimaryChildUseCase.setAddress({ actorUserId, organizationId, hospitalId, childId: body.childId, version: body.version });
    return this.toResponse(hospital);
  }

  @Patch(':hospitalId/primary-contact')
  @Permissions('hospitals.update')
  async setPrimaryContact(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('hospitalId', ParseUUIDPipe) hospitalId: string, @CurrentUser('id') actorUserId: string, @Body() body: SetHospitalPrimaryChildRequestDto) {
    const hospital = await this.setHospitalPrimaryChildUseCase.setContact({ actorUserId, organizationId, hospitalId, childId: body.childId, version: body.version });
    return this.toResponse(hospital);
  }

  private toResponse(hospital: Hospital) {
    return {
      ...hospital.snapshot,
      addresses: hospital.hospitalAddresses,
      contacts: hospital.hospitalContacts,
      departments: hospital.hospitalDepartments,
    };
  }
}
