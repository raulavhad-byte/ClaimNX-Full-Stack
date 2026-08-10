import { Injectable } from '@nestjs/common';

import { AuditRepository } from './audit.repository';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
  ) {}

  /**
   * Create Audit Log
   */
  async log(
    dto: CreateAuditLogDto,
  ) {
    return this.auditRepository.createAuditLog(dto);
  }
}