import { ForbiddenException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

/** Tenant boundary for every Phase 8 Claim command and query. */
@Injectable()
export class ClaimAccessService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertActiveMembership(actorUserId: string, organizationId: string): Promise<void> {
    const client = this.databaseService.getClient();
    const { data: user, error: userError } = await client.from('users').select('id')
      .eq('id', actorUserId).in('status', ['Active', 'ACTIVE']).eq('is_deleted', false)
      .is('deleted_at', null).maybeSingle<{ id: string }>();
    if (userError) throw userError;
    if (!user) throw new ForbiddenException('The authenticated IAM User is not active.');

    const { data: membership, error: membershipError } = await client.from('organization_members').select('id')
      .eq('user_id', actorUserId).eq('organization_id', organizationId).eq('status', 'ACTIVE')
      .eq('is_deleted', false).is('deleted_at', null).maybeSingle<{ id: string }>();
    if (membershipError) throw membershipError;
    if (!membership) throw new ForbiddenException('The authenticated user is not an active Organization member.');
  }

  async assertActiveHospital(organizationId: string, hospitalId: string): Promise<void> {
    const { data, error } = await this.databaseService.getClient().from('hospitals').select('id')
      .eq('id', hospitalId).eq('organization_id', organizationId).eq('is_deleted', false)
      .is('deleted_at', null).maybeSingle<{ id: string }>();
    if (error) throw error;
    if (!data) throw new ForbiddenException('The Hospital is not active in the Organization tenant.');
  }

  async assertTenantHospitalAccess(actorUserId: string, organizationId: string, hospitalId: string): Promise<void> {
    await this.assertActiveMembership(actorUserId, organizationId);
    await this.assertActiveHospital(organizationId, hospitalId);
  }
}
