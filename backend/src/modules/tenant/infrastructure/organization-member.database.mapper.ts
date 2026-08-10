import {
  OrganizationMember,
  OrganizationMemberProps,
} from '../domain/organization-member.aggregate';

/**
 * Exact persistence shape used by the Phase 5 Organization Member repository.
 * Legacy employee metadata is intentionally excluded: it is compatibility-only
 * and is not owned by the Organization Member aggregate.
 */
export interface OrganizationMemberPersistenceRow {
  id: string;
  organization_id: string;
  user_id: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  deleted_by: string | null;
  deleted_at: string | null;
  is_deleted: boolean | null;
  version: number;
}

export class OrganizationMemberDatabaseMapper {
  static toAggregate(row: OrganizationMemberPersistenceRow): OrganizationMember {
    const props: OrganizationMemberProps = {
      organizationMemberId: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedBy: row.updated_by,
      updatedAt: new Date(row.updated_at),
      deletedBy: row.deleted_by,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      isDeleted: Boolean(row.is_deleted),
      version: row.version,
    };

    return OrganizationMember.rehydrate(props);
  }

  static toInsertRow(member: OrganizationMember): Omit<OrganizationMemberPersistenceRow, 'created_at' | 'updated_at'> & {
    created_at: string;
    updated_at: string;
  } {
    const snapshot = member.snapshot;

    return {
      id: snapshot.organizationMemberId,
      organization_id: snapshot.organizationId,
      user_id: snapshot.userId,
      status: snapshot.status,
      created_by: snapshot.createdBy,
      created_at: snapshot.createdAt.toISOString(),
      updated_by: snapshot.updatedBy,
      updated_at: snapshot.updatedAt.toISOString(),
      deleted_by: snapshot.deletedBy ?? null,
      deleted_at: snapshot.deletedAt?.toISOString() ?? null,
      is_deleted: snapshot.isDeleted,
      version: snapshot.version,
    };
  }
}
