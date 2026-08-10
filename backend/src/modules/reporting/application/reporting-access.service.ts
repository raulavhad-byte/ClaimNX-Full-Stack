import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { REPORTING_SQL_CLIENT } from '../infrastructure/reporting-sql-client';
import type { ReportingSqlClient } from '../infrastructure/reporting-sql-client';

/**
 * Enforces Reporting's server-side IAM and tenant boundaries.  Request input
 * is never trusted as proof of membership or reference-data validity.
 */
@Injectable()
export class ReportingAccessService {
  constructor(
    @Inject(REPORTING_SQL_CLIENT)
    private readonly sql: ReportingSqlClient,
  ) {}

  async assertActiveOrganizationMember(
    organizationId: string,
    actorUserId: string,
  ): Promise<void> {
    const result = await this.sql.query(
      `SELECT 1
       FROM public.users AS user_record
       INNER JOIN public.organization_members AS membership
         ON membership.user_id = user_record.id
       WHERE user_record.id = $1
         AND membership.organization_id = $2
         AND LOWER(COALESCE(user_record.status, '')) = 'active'
         AND user_record.deleted_at IS NULL
         AND COALESCE(user_record.is_deleted, FALSE) = FALSE
         AND membership.status = 'ACTIVE'
         AND membership.deleted_at IS NULL
         AND COALESCE(membership.is_deleted, FALSE) = FALSE
       LIMIT 1`,
      [actorUserId, organizationId],
    );

    if (!result.rows[0]) {
      throw new ForbiddenException(
        'An active IAM user and active Organization membership are required.',
      );
    }
  }

  async assertActiveGlobalReferenceValue(
    referenceValueId: string,
    categoryCode: string,
  ): Promise<void> {
    const result = await this.sql.query(
      `SELECT 1
       FROM public.reference_values AS value
       INNER JOIN public.reference_categories AS category
         ON category.id = value.category_id
       WHERE value.id = $1
         AND category.code = $2
         AND value.organization_id IS NULL
         AND value.is_active = TRUE
         AND value.deleted_at IS NULL
         AND COALESCE(value.is_deleted, FALSE) = FALSE
       LIMIT 1`,
      [referenceValueId, categoryCode],
    );

    if (!result.rows[0]) {
      throw new ForbiddenException(
        `An active global ${categoryCode} reference value is required.`,
      );
    }
  }
}
