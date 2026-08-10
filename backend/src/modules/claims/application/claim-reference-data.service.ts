import { BadRequestException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { ClaimLifecycleStatusCode, ClaimProductCode } from '../domain/claim-product.strategy';

type ReferenceValueRow = { code: string };

/** Resolves only active, global controlled values accepted by Phase 8 commands. */
@Injectable()
export class ClaimReferenceDataService {
  constructor(private readonly databaseService: DatabaseService) {}

  async requireCode(referenceValueId: string, categoryCode: string): Promise<string> {
    const { data, error } = await this.databaseService.getClient().from('reference_values')
      .select('code, reference_categories!inner(code)').eq('id', referenceValueId)
      .eq('reference_categories.code', categoryCode).is('organization_id', null).eq('is_active', true)
      .eq('is_deleted', false).is('deleted_at', null).maybeSingle<ReferenceValueRow>();
    if (error) throw error;
    if (!data?.code) throw new BadRequestException(`The supplied Reference Data value is not an active ${categoryCode} value.`);
    return data.code;
  }

  async requireClaimProduct(id: string): Promise<ClaimProductCode> {
    return (await this.requireCode(id, 'CLAIM_PRODUCT')) as ClaimProductCode;
  }

  async requireLifecycleStatus(id: string): Promise<ClaimLifecycleStatusCode> {
    return (await this.requireCode(id, 'CLAIM_LIFECYCLE_STATUS')) as ClaimLifecycleStatusCode;
  }
}
