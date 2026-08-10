import { ForbiddenException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class HospitalTenantAccessService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertActiveMembership(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'ACTIVE')
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new ForbiddenException(
        'The authenticated user is not an active member of the Organization tenant.',
      );
    }
  }
}
