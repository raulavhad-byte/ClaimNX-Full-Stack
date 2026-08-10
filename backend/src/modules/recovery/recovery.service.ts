import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RecoveryRepository } from './recovery.repository';

import { CreateRecoveryDto } from './dto/create-recovery.dto';
import { UpdateRecoveryDto } from './dto/update-recovery.dto';
import { RecoveryFilterDto } from './dto/recovery-filter.dto';

@Injectable()
export class RecoveryService {
  constructor(
    private readonly recoveryRepository: RecoveryRepository,
  ) {}

  async create(dto: CreateRecoveryDto) {
    return this.recoveryRepository.create(dto);
  }

  async findAll(filter: RecoveryFilterDto) {
    return this.recoveryRepository.findAll({
      page: filter.page,
      limit: filter.limit,

      search: filter.search,

      filters: {
        ...(filter.status && {
          status: filter.status,
        }),
      },
    });
  }

  async findOne(id: string) {
    const recovery =
      await this.recoveryRepository.findById(id);

    if (!recovery) {
      throw new NotFoundException(
        'Recovery record not found',
      );
    }

    return recovery;
  }

  async update(
    id: string,
    dto: UpdateRecoveryDto,
  ) {
    const recovery =
      await this.recoveryRepository.findById(id);

    if (!recovery) {
      throw new NotFoundException(
        'Recovery record not found',
      );
    }

    return this.recoveryRepository.update(id, {
      ...dto,
      updated_at: new Date().toISOString(),
    });
  }

  async remove(id: string) {
    const recovery =
      await this.recoveryRepository.findById(id);

    if (!recovery) {
      throw new NotFoundException(
        'Recovery record not found',
      );
    }

    await this.recoveryRepository.softDelete(id);

    return {
      message:
        'Recovery record deleted successfully',
    };
  }
}