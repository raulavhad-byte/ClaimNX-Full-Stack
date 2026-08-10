import { BadRequestException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

type ReferenceValueRow = { code: string; reference_categories?: { code?: string } | null };

/** Resolves only approved, global Reference Data used by this aggregate. */
@Injectable()
export class HospitalPayerIntegrationReferenceDataService {
  constructor(private readonly databaseService: DatabaseService) {}

  async requireCode(referenceValueId: string, categoryCode: string): Promise<string> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('reference_values')
      .select('code, reference_categories!inner(code)')
      .eq('id', referenceValueId)
      .eq('reference_categories.code', categoryCode)
      .is('organization_id', null)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<ReferenceValueRow>();

    if (error) throw error;
    if (!data?.code) {
      throw new BadRequestException(
        `The supplied Reference Data value is not an active ${categoryCode} value.`,
      );
    }
    return data.code;
  }
}
