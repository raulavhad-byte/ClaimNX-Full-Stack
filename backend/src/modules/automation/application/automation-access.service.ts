import { ForbiddenException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

/** Application-side tenant boundary; database functions enforce the same boundary again. */
@Injectable()
export class AutomationAccessService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertCommandAccess(actorUserId: string, organizationId: string, hospitalId: string): Promise<void> {
    const client = this.databaseService.getClient();
    const { data: user, error: userError } = await client.from('users').select('id')
      .eq('id', actorUserId).in('status', ['Active', 'ACTIVE']).eq('is_deleted', false).is('deleted_at', null).maybeSingle();
    if (userError) throw userError;
    if (!user) throw new ForbiddenException('The authenticated IAM User is not active.');

    const { data: membership, error: membershipError } = await client.from('organization_members').select('id')
      .eq('user_id', actorUserId).eq('organization_id', organizationId).eq('status', 'ACTIVE')
      .eq('is_deleted', false).is('deleted_at', null).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new ForbiddenException('The authenticated user is not an active Organization member.');

    const { data: hospital, error: hospitalError } = await client.from('hospitals').select('id')
      .eq('id', hospitalId).eq('organization_id', organizationId).eq('is_deleted', false).is('deleted_at', null).maybeSingle();
    if (hospitalError) throw hospitalError;
    if (!hospital) throw new ForbiddenException('The Hospital is not active in the Organization tenant.');
  }
}
