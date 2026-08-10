import { Inject, Injectable } from '@nestjs/common';
import {
  ReportingDatabaseMapper,
  ReportingDefinition,
  ReportingExecution,
  ReportingSchedule,
} from './reporting-database.mapper';
import { REPORTING_SQL_CLIENT } from './reporting-sql-client';
import type { ReportingSqlClient } from './reporting-sql-client';

export interface ReportingTenantScope {
  readonly organizationId: string;
}

export interface ReportingTableNames {
  readonly definitions: string;
  readonly schedules: string;
  readonly executions: string;
}

/**
 * Approved Phase 11 Reporting table names. The object is internal, never
 * derived from request data, and therefore cannot be used for SQL injection.
 */
export const REPORTING_TABLE_NAMES: ReportingTableNames = Object.freeze({
  definitions: 'report_definitions',
  schedules: 'report_schedules',
  executions: 'report_executions',
});

const activeRecordFilter = 'deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE';

@Injectable()
export class ReportingRepository {
  constructor(
    @Inject(REPORTING_SQL_CLIENT)
    private readonly sql: ReportingSqlClient,
  ) {}

  async findDefinition(
    scope: ReportingTenantScope,
    reportDefinitionId: string,
  ): Promise<ReportingDefinition | null> {
    const result = await this.sql.query(
      `SELECT * FROM public.${REPORTING_TABLE_NAMES.definitions}
       WHERE report_definition_id = $1
         AND organization_id = $2
         AND ${activeRecordFilter}
       LIMIT 1`,
      [reportDefinitionId, scope.organizationId],
    );

    return result.rows[0] ? ReportingDatabaseMapper.toDefinition(result.rows[0]) : null;
  }

  async listActiveDefinitions(scope: ReportingTenantScope): Promise<readonly ReportingDefinition[]> {
    const result = await this.sql.query(
      `SELECT * FROM public.${REPORTING_TABLE_NAMES.definitions}
       WHERE organization_id = $1
         AND ${activeRecordFilter}
       ORDER BY display_name, report_definition_id`,
      [scope.organizationId],
    );

    return result.rows.map(ReportingDatabaseMapper.toDefinition);
  }

  async findSchedule(
    scope: ReportingTenantScope,
    reportScheduleId: string,
  ): Promise<ReportingSchedule | null> {
    const result = await this.sql.query(
      `SELECT * FROM public.${REPORTING_TABLE_NAMES.schedules}
       WHERE report_schedule_id = $1
         AND organization_id = $2
         AND ${activeRecordFilter}
       LIMIT 1`,
      [reportScheduleId, scope.organizationId],
    );

    return result.rows[0] ? ReportingDatabaseMapper.toSchedule(result.rows[0]) : null;
  }

  async findExecution(
    scope: ReportingTenantScope,
    reportExecutionId: string,
  ): Promise<ReportingExecution | null> {
    const result = await this.sql.query(
      `SELECT * FROM public.${REPORTING_TABLE_NAMES.executions}
       WHERE report_execution_id = $1
         AND organization_id = $2
         AND ${activeRecordFilter}
       LIMIT 1`,
      [reportExecutionId, scope.organizationId],
    );

    return result.rows[0] ? ReportingDatabaseMapper.toExecution(result.rows[0]) : null;
  }

  /**
   * Verifies that the actor is an active ClaimNX user and an active member of
   * the requested tenant.  This is deliberately evaluated in the repository
   * so every Reporting command is protected even when called outside HTTP.
   */
  async hasActiveActorAccess(
    scope: ReportingTenantScope,
    actorUserId: string,
  ): Promise<boolean> {
    const result = await this.sql.query(
      `SELECT EXISTS (
         SELECT 1
         FROM public.users user_record
         INNER JOIN public.organization_members membership
           ON membership.user_id = user_record.id
         WHERE user_record.id = $1
           AND membership.organization_id = $2
           AND LOWER(user_record.status) = 'active'
           AND COALESCE(user_record.is_deleted, FALSE) = FALSE
           AND membership.status = 'ACTIVE'
           AND membership.deleted_at IS NULL
           AND COALESCE(membership.is_deleted, FALSE) = FALSE
       ) AS has_access`,
      [actorUserId, scope.organizationId],
    );

    return result.rows[0]?.has_access === true;
  }

  async setDefinitionStatus(
    scope: ReportingTenantScope,
    reportDefinitionId: string,
    expectedVersion: number,
    reportStatusReferenceValueId: string,
    actorUserId: string,
  ): Promise<string | null> {
    const result = await this.sql.query(
      `SELECT public.set_report_definition_status($1, $2, $3, $4, $5)
         AS report_definition_id`,
      [
        reportDefinitionId,
        scope.organizationId,
        expectedVersion,
        reportStatusReferenceValueId,
        actorUserId,
      ],
    );

    const persistedReportDefinitionId = result.rows[0]?.report_definition_id;
    return typeof persistedReportDefinitionId === 'string'
      ? persistedReportDefinitionId
      : null;
  }

  async setScheduleStatus(
    scope: ReportingTenantScope,
    reportScheduleId: string,
    expectedVersion: number,
    reportScheduleStatusReferenceValueId: string,
    actorUserId: string,
  ): Promise<string | null> {
    const result = await this.sql.query(
      `SELECT public.set_report_schedule_status($1, $2, $3, $4, $5)
         AS report_schedule_id`,
      [
        reportScheduleId,
        scope.organizationId,
        expectedVersion,
        reportScheduleStatusReferenceValueId,
        actorUserId,
      ],
    );

    const persistedReportScheduleId = result.rows[0]?.report_schedule_id;
    return typeof persistedReportScheduleId === 'string'
      ? persistedReportScheduleId
      : null;
  }

  async setExecutionStatus(
    scope: ReportingTenantScope,
    reportExecutionId: string,
    expectedVersion: number,
    reportExecutionStatusReferenceValueId: string,
    actorUserId: string,
  ): Promise<string | null> {
    const result = await this.sql.query(
      `SELECT public.set_report_execution_status($1, $2, $3, $4, $5)
         AS report_execution_id`,
      [
        reportExecutionId,
        scope.organizationId,
        expectedVersion,
        reportExecutionStatusReferenceValueId,
        actorUserId,
      ],
    );

    const persistedReportExecutionId = result.rows[0]?.report_execution_id;
    return typeof persistedReportExecutionId === 'string'
      ? persistedReportExecutionId
      : null;
  }

  async softDeleteSchedule(
    scope: ReportingTenantScope,
    reportScheduleId: string,
    expectedVersion: number,
    actorUserId: string,
  ): Promise<string | null> {
    const result = await this.sql.query(
      `SELECT public.soft_delete_report_schedule($1, $2, $3, $4)
         AS report_schedule_id`,
      [reportScheduleId, scope.organizationId, expectedVersion, actorUserId],
    );

    const deletedReportScheduleId = result.rows[0]?.report_schedule_id;
    return typeof deletedReportScheduleId === 'string'
      ? deletedReportScheduleId
      : null;
  }
}
