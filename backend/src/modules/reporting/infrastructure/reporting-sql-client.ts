/**
 * Minimal database boundary for the Reporting & BI infrastructure layer.
 *
 * The concrete PostgreSQL/Supabase adapter is supplied by the composition
 * root. Repository code must only depend on this contract.
 */
export interface ReportingSqlQueryResult<T extends Record<string, unknown>> {
  readonly rows: readonly T[];
}

export interface ReportingSqlClient {
  query<T extends Record<string, unknown>>(
    statement: string,
    parameters: readonly unknown[],
  ): Promise<ReportingSqlQueryResult<T>>;
}

export const REPORTING_SQL_CLIENT = Symbol('REPORTING_SQL_CLIENT');
