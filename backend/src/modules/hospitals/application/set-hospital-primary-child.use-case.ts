import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Hospital } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';

export interface SetHospitalPrimaryChildCommand {
  actorUserId: string; organizationId: string; hospitalId: string; childId: string; version: number;
}

@Injectable()
export class SetHospitalPrimaryChildUseCase {
  constructor(private readonly repository: HospitalAggregateRepository, private readonly tenantAccess: HospitalTenantAccessService) {}
  async setAddress(command: SetHospitalPrimaryChildCommand): Promise<Hospital> {
    const hospital = await this.load(command);
    hospital.setPrimaryAddress(command.childId);
    const result = await this.repository.setPrimaryAddress(command.organizationId, command.hospitalId, command.childId, command.version, command.actorUserId);
    if (!result) throw new ConflictException('Hospital was updated by another user. Refresh and try again.');
    return (await this.load(command))!;
  }
  async setContact(command: SetHospitalPrimaryChildCommand): Promise<Hospital> {
    const hospital = await this.load(command);
    hospital.setPrimaryContact(command.childId);
    const result = await this.repository.setPrimaryContact(command.organizationId, command.hospitalId, command.childId, command.version, command.actorUserId);
    if (!result) throw new ConflictException('Hospital was updated by another user. Refresh and try again.');
    return (await this.load(command))!;
  }
  private async load(command: SetHospitalPrimaryChildCommand) {
    await this.tenantAccess.assertActiveMembership(command.actorUserId, command.organizationId);
    const hospital = await this.repository.findActiveById(command.organizationId, command.hospitalId);
    if (!hospital) throw new NotFoundException('Hospital not found in the Organization tenant.');
    return hospital;
  }
}
