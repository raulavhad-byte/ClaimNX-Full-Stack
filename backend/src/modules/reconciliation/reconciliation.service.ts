import {
  Injectable,
} from '@nestjs/common';

import { ReconciliationRepository } from './reconciliation.repository';
import { AuditService } from '../audit/audit.service';

import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { UpdateReconciliationDto } from './dto/update-reconciliation.dto';
import { ReconciliationFilterDto } from './dto/reconciliation-filter.dto';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly reconciliationRepository: ReconciliationRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateReconciliationDto) {
    const data =
      await this.reconciliationRepository.create(dto);

    await this.auditService.log({
      module: 'Reconciliation',
      entity_id: data.id,
      action: 'CREATE',
      user_id: dto.reconciled_by,
      old_values: null,
      new_values: data,
      ip_address: undefined,
      user_agent: undefined,
    });

    return data;
  }

  async findAll(filter: ReconciliationFilterDto) {
    return this.reconciliationRepository.findAll(filter);
  }

  async findOne(id: string) {
    return this.reconciliationRepository.findById(id);
  }

  async update(
    id: string,
    dto: UpdateReconciliationDto,
  ) {
    const existing =
      await this.reconciliationRepository.findById(id);

    const data =
      await this.reconciliationRepository.update(
        id,
        dto,
      );

    await this.auditService.log({
      module: 'Reconciliation',
      entity_id: id,
      action: 'UPDATE',
      user_id:
        dto.reconciled_by ??
        existing.reconciled_by,
      old_values: existing,
      new_values: data,
      ip_address: undefined,
      user_agent: undefined,
    });

    return data;
  }

  async remove(id: string) {
    const existing =
      await this.reconciliationRepository.findById(id);

    await this.reconciliationRepository.softDelete(id);

    await this.auditService.log({
      module: 'Reconciliation',
      entity_id: id,
      action: 'DELETE',
      user_id: existing.reconciled_by,
      old_values: existing,
      new_values: {
        ...existing,
        is_deleted: true,
      },
      ip_address: undefined,
      user_agent: undefined,
    });

    return {
      message:
        'Reconciliation record deleted successfully',
    };
  }
}