import { Inject, Injectable } from '@nestjs/common';
import { REPORTING_SQL_CLIENT } from './reporting-sql-client';
import type { ReportingSqlClient } from './reporting-sql-client';

export interface ReportingCommandScope {
  readonly organizationId: string;
  readonly actorUserId: string;
}

/**
 * Raw-SQL persistence boundary for Phase 11 state-changing commands.
 * The PostgreSQL functions enforce tenant scope and optimistic concurrency.
 */
@Injectable()
export class ReportingCommandRepository {
  constructor(
    @Inject(REPORTING_SQL_CLIENT)
    private readonly sql: ReportingSqlClient,
  ) {}

  async assertActiveActor(scope: ReportingCommandScope): Promise<boolean> {
    const result = await this.sql.query(
      `SELECT 1
         FROM public.organization_members membership
         JOIN public.users actor ON actor.id = membership.user_id
        WHERE membership.organization_id = $1
          AND membership.user_id = $2
          AND membership.status = 'ACTIVE'
          AND membership.deleted_at IS NULL
          AND COALESCE(membership.is_deleted, FALSE) = FALSE
          AND LOWER(COALESCE(actor.status, '')) = 'active'
          AND COALESCE(actor.is_deleted, FALSE) = FALSE
        LIMIT 1`,
      [scope.organizationId, scope.actorUserId],
    );

    return result.rows.length === 1;
  }

  async setDefinitionStatus(
    scope: ReportingCommandScope,
    reportDefinitionId: string,
    expectedVersion: number,
    operationalStatusReferenceValueId: string,
  ): Promise<string | null> {
    return this.invokeSingleId(
      `SELECT public.set_report_definition_status($1, $2, $3, $4, $5) AS id`,
      [
        reportDefinitionId,
        scope.organizationId,
        expectedVersion,
        operationalStatusReferenceValueId,
        scope.actorUserId,
      ],
    );
  }

  async setScheduleStatus(
    scope: ReportingCommandScope,
    reportScheduleId: string,
    expectedVersion: number,
    operationalStatusReferenceValueId: string,
  ): Promise<string | null> {
    return this.invokeSingleId(
      `SELECT public.set_report_schedule_status($1, $2, $3, $4, $5) AS id`,
      [
        reportScheduleId,
        scope.organizationId,
        expectedVersion,
        operationalStatusReferenceValueId,
        scope.actorUserId,
      ],
    );
  }

  async setExecutionStatus(
    scope: ReportingCommandScope,
    reportExecutionId: string,
    expectedVersion: number,
    operationalStatusReferenceValueId: string,
  ): Promise<string | null> {
    return this.invokeSingleId(
      `SELECT public.set_report_execution_status($1, $2, $3, $4, $5) AS id`,
      [
        reportExecutionId,
        scope.organizationId,
        expectedVersion,
        operationalStatusReferenceValueId,
        scope.actorUserId,
      ],
    );
  }

  async softDeleteSchedule(
    scope: ReportingCommandScope,
    reportScheduleId: string,
    expectedVersion: number,
  ): Promise<string | null> {
    return this.invokeSingleId(
      `SELECT public.soft_delete_report_schedule($1, $2, $3, $4) AS id`,
      [reportScheduleId, scope.organizationId, expectedVersion, scope.actorUserId],
    );
  }

  private async invokeSingleId(query: string, values: readonly unknown[]): Promise<string | null> {
    const result = await this.sql.query(query, values);
    const value = result.rows[0]?.id;
    return typeof value === 'string' ? value : null;
  }
}
