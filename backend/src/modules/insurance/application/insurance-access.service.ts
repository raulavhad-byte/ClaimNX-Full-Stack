import { ForbiddenException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

/**
 * Access boundary for the Insurance Foundation application layer.
 * Platform-owned Insurance Partners require an active IAM user. Tenant-owned
 * enablements additionally require active Organization membership.
 */
@Injectable()
export class InsuranceAccessService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertActiveUser(userId: string): Promise<void> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('users')
      .select('id')
      .eq('id', userId)
      .in('status', ['Active', 'ACTIVE'])
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<{ id: string }>();

    if (error) throw error;
    if (!data) {
      throw new ForbiddenException('The authenticated IAM User is not active.');
    }
  }

  async assertActiveMembership(userId: string, organizationId: string): Promise<void> {
    await this.assertActiveUser(userId);

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

    if (error) throw error;
    if (!data) {
      throw new ForbiddenException(
        'The authenticated user is not an active member of the Organization tenant.',
      );
    }
  }

  /** Ensures a Hospital path parameter belongs to the caller's tenant. */
  async assertActiveHospitalInOrganization(
    organizationId: string,
    hospitalId: string,
  ): Promise<void> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('hospitals')
      .select('id')
      .eq('id', hospitalId)
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<{ id: string }>();

    if (error) throw error;
    if (!data) {
      throw new ForbiddenException(
        'The Hospital is not active in the Organization tenant.',
      );
    }
  }
}
