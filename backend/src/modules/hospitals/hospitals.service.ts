import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { HospitalsRepository } from './hospitals.repository';

import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { HospitalFilterDto } from './dto/hospital-filter.dto';

@Injectable()
export class HospitalsService {
  constructor(
    private readonly hospitalsRepository: HospitalsRepository,
  ) {}

  async create(dto: CreateHospitalDto) {
    return this.hospitalsRepository.create(dto);
  }

  async findAll(filter: HospitalFilterDto) {
    return this.hospitalsRepository.findAll(filter);
  }

  async findOne(id: string) {
    const hospital =
      await this.hospitalsRepository.findActiveById(id);

    if (!hospital) {
      throw new NotFoundException(
        'Hospital not found',
      );
    }

    return hospital;
  }

  async update(
    id: string,
    dto: UpdateHospitalDto,
  ) {
    const hospital =
      await this.hospitalsRepository.findActiveById(id);

    if (!hospital) {
      throw new NotFoundException(
        'Hospital not found',
      );
    }

    return this.hospitalsRepository.update(id, {
      ...dto,
      updated_at: new Date().toISOString(),
    });
  }

  async remove(id: string) {
    const hospital =
      await this.hospitalsRepository.findActiveById(id);

    if (!hospital) {
      throw new NotFoundException(
        'Hospital not found',
      );
    }

    await this.hospitalsRepository.softDelete(id);

    return {
      message: 'Hospital deleted successfully',
    };
  }
}