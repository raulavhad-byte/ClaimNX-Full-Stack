export interface ReportingDefinition {
  readonly id: string;
  readonly organizationId: string;
  readonly code: string;
  readonly displayName: string;
  readonly categoryReferenceValueId: string | null;
  readonly dataSourceTypeReferenceValueId: string | null;
  readonly statusReferenceValueId: string | null;
  readonly version: number;
  readonly createdAt: Date | null;
  readonly updatedAt: Date | null;
}

export interface ReportingSchedule {
  readonly id: string;
  readonly organizationId: string;
  readonly reportDefinitionId: string;
  readonly statusReferenceValueId: string | null;
  readonly version: number;
  readonly createdAt: Date | null;
  readonly updatedAt: Date | null;
}

export interface ReportingExecution {
  readonly id: string;
  readonly organizationId: string;
  readonly reportDefinitionId: string;
  readonly statusReferenceValueId: string | null;
  readonly outputFormatReferenceValueId: string | null;
  readonly version: number;
  readonly createdAt: Date | null;
  readonly updatedAt: Date | null;
}

type DatabaseRow = Record<string, unknown>;

const requiredString = (row: DatabaseRow, ...keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  throw new Error(`Reporting database row is missing required column: ${keys.join(' or ')}`);
};

const optionalString = (row: DatabaseRow, ...keys: string[]): string | null => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

const version = (row: DatabaseRow): number => {
  const value = row.version;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value) && Number(value) >= 1) {
    return Number(value);
  }

  throw new Error('Reporting database row has an invalid version.');
};

const date = (value: unknown): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Maps persisted snake_case rows into infrastructure-neutral read models. */
export class ReportingDatabaseMapper {
  static toDefinition(row: DatabaseRow): ReportingDefinition {
    return {
      id: requiredString(row, 'report_definition_id', 'id'),
      organizationId: requiredString(row, 'organization_id'),
      code: requiredString(row, 'report_code', 'code'),
      displayName: requiredString(row, 'display_name', 'name'),
      categoryReferenceValueId: optionalString(row, 'report_category_reference_value_id', 'category_reference_value_id'),
      dataSourceTypeReferenceValueId: optionalString(row, 'report_data_source_type_reference_value_id', 'data_source_type_reference_value_id'),
      statusReferenceValueId: optionalString(row, 'report_status_reference_value_id', 'operational_status_reference_value_id', 'status_reference_value_id'),
      version: version(row),
      createdAt: date(row.created_at),
      updatedAt: date(row.updated_at),
    };
  }

  static toSchedule(row: DatabaseRow): ReportingSchedule {
    return {
      id: requiredString(row, 'report_schedule_id', 'id'),
      organizationId: requiredString(row, 'organization_id'),
      reportDefinitionId: requiredString(row, 'report_definition_id'),
      statusReferenceValueId: optionalString(row, 'report_schedule_status_reference_value_id', 'status_reference_value_id'),
      version: version(row),
      createdAt: date(row.created_at),
      updatedAt: date(row.updated_at),
    };
  }

  static toExecution(row: DatabaseRow): ReportingExecution {
    return {
      id: requiredString(row, 'report_execution_id', 'id'),
      organizationId: requiredString(row, 'organization_id'),
      reportDefinitionId: requiredString(row, 'report_definition_id'),
      statusReferenceValueId: optionalString(row, 'report_execution_status_reference_value_id', 'status_reference_value_id'),
      outputFormatReferenceValueId: optionalString(row, 'report_output_format_reference_value_id', 'output_format_reference_value_id'),
      version: version(row),
      createdAt: date(row.created_at),
      updatedAt: date(row.updated_at),
    };
  }
}
