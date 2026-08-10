import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { OrganizationMember } from '../domain/organization-member.aggregate';

import {
  OrganizationMemberDatabaseMapper,
  OrganizationMemberPersistenceRow,
} from './organization-member.database.mapper';

const memberSelect =
  'id, organization_id, user_id, status, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at, is_deleted, version';

/**
 * Persistence adapter for the Organization Member aggregate.
 * All reads and mutations are explicitly organization-scoped. It deliberately
 * does not read or write IAM roles, permissions, or legacy employee metadata.
 */
@Injectable()
export class OrganizationMemberRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async listActiveForOrganization(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_members')
      .select(memberSelect)
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return ((data ?? []) as OrganizationMemberPersistenceRow[]).map(
      OrganizationMemberDatabaseMapper.toAggregate,
    );
  }

  async findNonDeletedById(
    organizationId: string,
    organizationMemberId: string,
  ): Promise<OrganizationMember | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_members')
      .select(memberSelect)
      .eq('organization_id', organizationId)
      .eq('id', organizationMemberId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<OrganizationMemberPersistenceRow>();

    if (error) throw error;
    return data ? OrganizationMemberDatabaseMapper.toAggregate(data) : null;
  }

  async findNonDeletedByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_members')
      .select(memberSelect)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<OrganizationMemberPersistenceRow>();

    if (error) throw error;
    return data ? OrganizationMemberDatabaseMapper.toAggregate(data) : null;
  }

  async findActiveByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_members')
      .select(memberSelect)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<OrganizationMemberPersistenceRow>();

    if (error) throw error;
    return data ? OrganizationMemberDatabaseMapper.toAggregate(data) : null;
  }

  async organizationIsActive(organizationId: string): Promise<boolean> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .eq('status', 'ACTIVE')
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .maybeSingle<{ id: string }>();

    if (error) throw error;
    return Boolean(data);
  }

  async userIsActive(userId: string): Promise<boolean> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('status', 'Active')
      .eq('is_deleted', false)
      .maybeSingle<{ id: string }>();

    if (error) throw error;
    return Boolean(data);
  }

  async create(member: OrganizationMember): Promise<string> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_members')
      .insert(OrganizationMemberDatabaseMapper.toInsertRow(member))
      .select('id')
      .single<{ id: string }>();

    if (error) throw error;
    return data.id;
  }

  /**
   * Persists a domain-approved lifecycle mutation. `expectedVersion` is the
   * version before the aggregate command incremented it. A null return means
   * stale version, retirement, or a cross-tenant target; callers map it to the
   * appropriate application-level conflict/not-found response.
   */
  async persistLifecycleMutation(
    member: OrganizationMember,
    expectedVersion: number,
  ): Promise<string | null> {
    const snapshot = member.snapshot;
    const { data, error } = await this.databaseService
      .getClient()
      .from('organization_members')
      .update({
        status: snapshot.status,
        updated_by: snapshot.updatedBy,
        updated_at: snapshot.updatedAt.toISOString(),
        deleted_by: snapshot.deletedBy ?? null,
        deleted_at: snapshot.deletedAt?.toISOString() ?? null,
        is_deleted: snapshot.isDeleted,
        version: snapshot.version,
      })
      .eq('id', snapshot.organizationMemberId)
      .eq('organization_id', snapshot.organizationId)
      .eq('version', expectedVersion)
      .eq('is_deleted', false)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle<{ id: string }>();

    if (error) throw error;
    return data?.id ?? null;
  }
}
