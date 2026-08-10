import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { HospitalDepartment } from '../domain/hospital.aggregate';
import { HospitalAggregateRepository } from '../infrastructure/hospital-aggregate.repository';
import { HospitalTenantAccessService } from './hospital-tenant-access.service';
import { HospitalAddressContext } from './hospital-address.use-cases';

export interface CreateHospitalDepartmentCommand extends HospitalAddressContext {
  departmentCode: string; departmentName: string; departmentTypeReferenceValueId?: string;
  operationalStatusReferenceValueId: string; description?: string;
}
export interface UpdateHospitalDepartmentCommand extends HospitalAddressContext {
  hospitalDepartmentId: string; version: number; departmentCode?: string; departmentName?: string;
  departmentTypeReferenceValueId?: string; operationalStatusReferenceValueId?: string; description?: string;
}
export interface DeleteHospitalDepartmentCommand extends HospitalAddressContext { hospitalDepartmentId: string; version: number; }

@Injectable()
export class HospitalDepartmentUseCases {
  constructor(private readonly repository: HospitalAggregateRepository, private readonly tenantAccess: HospitalTenantAccessService) {}
  async list(context: HospitalAddressContext): Promise<readonly HospitalDepartment[]> { return (await this.load(context)).hospitalDepartments; }
  async create(command: CreateHospitalDepartmentCommand): Promise<HospitalDepartment> {
    const hospital = await this.load(command);
    const department: HospitalDepartment = {
      hospitalDepartmentId: randomUUID(), hospitalId: command.hospitalId, departmentCode: command.departmentCode,
      departmentName: command.departmentName, departmentTypeReferenceValueId: command.departmentTypeReferenceValueId,
      operationalStatusReferenceValueId: command.operationalStatusReferenceValueId, description: command.description, version: 1,
    };
    hospital.addDepartment(department);
    await this.repository.createDepartment({ ...department, organizationId: command.organizationId, actorUserId: command.actorUserId });
    return department;
  }
  async update(command: UpdateHospitalDepartmentCommand): Promise<HospitalDepartment> {
    const hospital = await this.load(command);
    hospital.assertDepartmentCanBeChanged(command.hospitalDepartmentId);
    const patch = this.toPatch(command);
    if (Object.keys(patch).length === 0) throw new ConflictException('At least one Department attribute must be supplied.');
    const updated = await this.repository.updateDepartment(command.organizationId, command.hospitalId, command.hospitalDepartmentId, command.version, command.actorUserId, patch);
    if (!updated) throw new ConflictException('Department was updated by another user. Refresh and try again.');
    const department = (await this.load(command)).hospitalDepartments.find((item) => item.hospitalDepartmentId === command.hospitalDepartmentId);
    if (!department) throw new NotFoundException('Department not found in the Hospital.');
    return department;
  }
  async softDelete(command: DeleteHospitalDepartmentCommand): Promise<void> {
    const hospital = await this.load(command);
    hospital.assertDepartmentCanBeChanged(command.hospitalDepartmentId);
    const deleted = await this.repository.softDeleteDepartment(command.organizationId, command.hospitalId, command.hospitalDepartmentId, command.version, command.actorUserId);
    if (!deleted) throw new ConflictException('Department was updated by another user. Refresh and try again.');
  }
  private async load(context: HospitalAddressContext) {
    await this.tenantAccess.assertActiveMembership(context.actorUserId, context.organizationId);
    const hospital = await this.repository.findActiveById(context.organizationId, context.hospitalId);
    if (!hospital) throw new NotFoundException('Hospital not found in the Organization tenant.');
    return hospital;
  }
  private toPatch(command: UpdateHospitalDepartmentCommand): Record<string, string> {
    const fields = ['departmentCode', 'departmentName', 'departmentTypeReferenceValueId', 'operationalStatusReferenceValueId', 'description'] as const;
    return Object.fromEntries(fields.filter((field) => command[field] !== undefined).map((field) => [field, command[field]! ]));
  }
}
