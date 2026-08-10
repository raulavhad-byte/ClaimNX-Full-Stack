import { ForbiddenException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

/** Establishes active tenant membership; IAM permission evaluation remains external. */
@Injectable()
export class WorkflowTenantAccessService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertActiveMembership(
    actorUserId: string,
    organizationId: string,
  ): Promise<void> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_members')
      .select('id')
      .eq('user_id', actorUserId)
      .eq('organization_id', organizationId)
      .eq('status', 'ACTIVE')
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<{ id: string }>();
    if (error) throw error;
    if (!data) {
      throw new ForbiddenException(
        'The authenticated user is not an active member of the Organization tenant.',
      );
    }
  }
}
