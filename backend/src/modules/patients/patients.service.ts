import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PatientsRepository } from './patients.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientFilterDto } from './dto/patient-filter.dto';

@Injectable()
export class PatientsService {
  constructor(
  private readonly patientsRepository: PatientsRepository,
) {}

  async create(dto: CreatePatientDto) {
    return this.patientsRepository.create(dto);
  }

  async findAll(filter: PatientFilterDto) {
    return this.patientsRepository.findAll(filter);
  }

  async findOne(id: string) {
  const patient = await this.patientsRepository.findActiveById(id);

  if (!patient) {
    throw new NotFoundException('Patient not found');
  }

  return patient;
  }

  async update(
  id: string,
  dto: UpdatePatientDto,
) {
  const patient = await this.patientsRepository.findActiveById(id);

  if (!patient) {
    throw new NotFoundException('Patient not found');
  }

  return this.patientsRepository.update(id, {
    ...dto,
    updated_at: new Date().toISOString(),
  });
}

  async remove(id: string) {
  const patient = await this.patientsRepository.findActiveById(id);

  if (!patient) {
    throw new NotFoundException('Patient not found');
  }

  await this.patientsRepository.softDelete(id);

  return {
    message: 'Patient deleted successfully',
  };
}
}