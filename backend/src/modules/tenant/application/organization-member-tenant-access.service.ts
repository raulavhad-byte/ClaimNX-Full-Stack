import { ForbiddenException, Injectable } from '@nestjs/common';

import { OrganizationMemberRepository } from '../infrastructure/organization-member.repository';

/**
 * Cross-cutting tenant membership gate. Permission evaluation remains in IAM;
 * this service establishes only the active Organization Member condition.
 */
@Injectable()
export class OrganizationMemberTenantAccessService {
  constructor(
    private readonly organizationMemberRepository: OrganizationMemberRepository,
  ) {}

  async assertActiveMembership(userId: string, organizationId: string): Promise<void> {
    const member = await this.organizationMemberRepository.findActiveByOrganizationAndUser(
      organizationId,
      userId,
    );

    if (!member) {
      throw new ForbiddenException(
        'The authenticated user is not an active member of the Organization tenant.',
      );
    }

    try {
      member.assertTenantAccess(organizationId, userId);
    } catch {
      throw new ForbiddenException(
        'The authenticated user is not an active member of the Organization tenant.',
      );
    }
  }
}
