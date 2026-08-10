import {
  ReportingConflictError,
  ReportingValidationError,
} from './reporting-domain.error';

export type ReportDefinitionStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface ReportDefinitionProps {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string | null;
  categoryReferenceValueId: string;
  dataSourceTypeReferenceValueId: string;
  outputFormatReferenceValueId: string;
  status: ReportDefinitionStatus;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  deletedBy?: string | null;
  deletedAt?: Date | null;
}

export type CreateReportDefinition = Omit<
  ReportDefinitionProps,
  'status' | 'version' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'description'
> & { description?: string | null };

export interface UpdateReportDefinition {
  code?: string;
  name?: string;
  description?: string | null;
  categoryReferenceValueId?: string;
  dataSourceTypeReferenceValueId?: string;
  outputFormatReferenceValueId?: string;
}

export class ReportDefinition {
  private constructor(private readonly props: ReportDefinitionProps) {}

  static create(input: CreateReportDefinition, now = new Date()): ReportDefinition {
    ReportDefinition.validateRequired(input);
    return new ReportDefinition({
      ...input,
      status: 'DRAFT',
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedBy: null,
      deletedAt: null,
    });
  }

  static rehydrate(props: ReportDefinitionProps): ReportDefinition {
    ReportDefinition.validateRequired(props);
    if (props.version < 1) throw new ReportingValidationError('Report definition version must be at least 1.');
    return new ReportDefinition({ ...props });
  }

  update(actorId: string, expectedVersion: number, changes: UpdateReportDefinition, now = new Date()): void {
    this.assertVersion(expectedVersion);
    ReportDefinition.validateActor(actorId);
    const next = { ...changes };
    if (next.code !== undefined) ReportDefinition.validateText(next.code, 'Report definition code');
    if (next.name !== undefined) ReportDefinition.validateText(next.name, 'Report definition name');
    if (next.categoryReferenceValueId !== undefined) ReportDefinition.validateId(next.categoryReferenceValueId, 'Category reference value');
    if (next.dataSourceTypeReferenceValueId !== undefined) ReportDefinition.validateId(next.dataSourceTypeReferenceValueId, 'Data source type reference value');
    if (next.outputFormatReferenceValueId !== undefined) ReportDefinition.validateId(next.outputFormatReferenceValueId, 'Output format reference value');
    Object.assign(this.props, next, { updatedBy: actorId, updatedAt: now, version: this.props.version + 1 });
  }

  activate(actorId: string, expectedVersion: number, now = new Date()): void {
    this.assertVersion(expectedVersion);
    if (this.props.status !== 'DRAFT') throw new ReportingValidationError('Only draft report definitions can be activated.');
    this.props.status = 'ACTIVE';
    this.touch(actorId, now);
  }

  retire(actorId: string, expectedVersion: number, now = new Date()): void {
    this.assertVersion(expectedVersion);
    if (this.props.status !== 'ACTIVE') throw new ReportingValidationError('Only active report definitions can be retired.');
    this.props.status = 'RETIRED';
    this.touch(actorId, now);
  }

  snapshot(): Readonly<ReportDefinitionProps> {
    return { ...this.props };
  }

  private touch(actorId: string, now: Date): void {
    ReportDefinition.validateActor(actorId);
    this.props.updatedBy = actorId;
    this.props.updatedAt = now;
    this.props.version += 1;
  }

  private assertVersion(expectedVersion: number): void {
    if (expectedVersion !== this.props.version) throw new ReportingConflictError('Report definition version conflict.');
  }

  private static validateRequired(value: CreateReportDefinition | ReportDefinitionProps): void {
    ReportDefinition.validateId(value.id, 'Report definition');
    ReportDefinition.validateId(value.organizationId, 'Organization');
    ReportDefinition.validateText(value.code, 'Report definition code');
    ReportDefinition.validateText(value.name, 'Report definition name');
    ReportDefinition.validateId(value.categoryReferenceValueId, 'Category reference value');
    ReportDefinition.validateId(value.dataSourceTypeReferenceValueId, 'Data source type reference value');
    ReportDefinition.validateId(value.outputFormatReferenceValueId, 'Output format reference value');
    ReportDefinition.validateActor(value.createdBy);
    ReportDefinition.validateActor(value.updatedBy);
  }

  private static validateId(value: string, label: string): void {
    if (!value?.trim()) throw new ReportingValidationError(`${label} is required.`);
  }

  private static validateActor(value: string): void { ReportDefinition.validateId(value, 'Audit actor'); }
  private static validateText(value: string, label: string): void { if (!value?.trim()) throw new ReportingValidationError(`${label} is required.`); }
}
