export type Uuid = string;

export type OrganizationMemberStatus = 'ACTIVE' | 'SUSPENDED';

export class OrganizationMemberDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrganizationMemberDomainError';
  }
}

export interface OrganizationMemberProps {
  organizationMemberId: Uuid;
  organizationId: Uuid;
  userId: Uuid;
  status: OrganizationMemberStatus;
  createdBy: Uuid;
  createdAt: Date;
  updatedBy: Uuid;
  updatedAt: Date;
  deletedBy?: Uuid | null;
  deletedAt?: Date | null;
  isDeleted: boolean;
  version: number;
}

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const allowedStatuses: readonly OrganizationMemberStatus[] = ['ACTIVE', 'SUSPENDED'];

/**
 * Tenant-scoped Organization/User membership aggregate. IAM retains ownership
 * of Users, Roles, and Permissions; this aggregate owns only membership
 * lifecycle, audit values, soft deletion, and optimistic concurrency.
 */
export class OrganizationMember {
  private constructor(private readonly props: OrganizationMemberProps) {
    this.assertValid();
  }

  static create(props: OrganizationMemberProps): OrganizationMember {
    if (props.status !== 'ACTIVE') {
      throw new OrganizationMemberDomainError('New Organization Member must be created as ACTIVE.');
    }
    if (props.version !== 1) {
      throw new OrganizationMemberDomainError('New Organization Member version must start at 1.');
    }
    if (props.deletedAt || props.deletedBy || props.isDeleted) {
      throw new OrganizationMemberDomainError('New Organization Member cannot be soft deleted.');
    }
    return new OrganizationMember({ ...props });
  }

  static rehydrate(props: OrganizationMemberProps): OrganizationMember {
    return new OrganizationMember({ ...props });
  }

  get id(): Uuid {
    return this.props.organizationMemberId;
  }

  get snapshot(): Readonly<OrganizationMemberProps> {
    return { ...this.props };
  }

  isActive(): boolean {
    return this.props.status === 'ACTIVE' && !this.props.deletedAt && !this.props.isDeleted;
  }

  isRetired(): boolean {
    return Boolean(this.props.deletedAt) && this.props.isDeleted;
  }

  assertTenantAccess(requestedOrganizationId: Uuid, authenticatedUserId: Uuid): void {
    if (this.props.organizationId !== requestedOrganizationId) {
      throw new OrganizationMemberDomainError('Organization Member does not belong to the requested Organization.');
    }
    if (this.props.userId !== authenticatedUserId) {
      throw new OrganizationMemberDomainError('Organization Member does not belong to the authenticated User.');
    }
    if (!this.isActive()) {
      throw new OrganizationMemberDomainError('Only an active, non-deleted Organization Member can access tenant data.');
    }
  }

  suspend(expectedVersion: number, actorUserId: Uuid, changedAt: Date): void {
    this.assertMutable(expectedVersion, actorUserId, changedAt);
    if (this.props.status !== 'ACTIVE') {
      throw new OrganizationMemberDomainError('Only an ACTIVE Organization Member can be suspended.');
    }
    this.props.status = 'SUSPENDED';
    this.recordMutation(actorUserId, changedAt);
  }

  reactivate(expectedVersion: number, actorUserId: Uuid, changedAt: Date): void {
    this.assertMutable(expectedVersion, actorUserId, changedAt);
    if (this.props.status !== 'SUSPENDED') {
      throw new OrganizationMemberDomainError('Only a SUSPENDED Organization Member can be reactivated.');
    }
    this.props.status = 'ACTIVE';
    this.recordMutation(actorUserId, changedAt);
  }

  retire(expectedVersion: number, actorUserId: Uuid, changedAt: Date): void {
    this.assertMutable(expectedVersion, actorUserId, changedAt);
    this.props.deletedBy = actorUserId;
    this.props.deletedAt = changedAt;
    this.props.isDeleted = true;
    this.recordMutation(actorUserId, changedAt);
  }

  private assertMutable(expectedVersion: number, actorUserId: Uuid, changedAt: Date): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion !== this.props.version) {
      throw new OrganizationMemberDomainError('Organization Member version is stale.');
    }
    if (this.isRetired()) {
      throw new OrganizationMemberDomainError('A retired Organization Member cannot be changed.');
    }
    if (!hasText(actorUserId) || !(changedAt instanceof Date) || Number.isNaN(changedAt.getTime())) {
      throw new OrganizationMemberDomainError('A valid audit actor and mutation timestamp are required.');
    }
  }

  private recordMutation(actorUserId: Uuid, changedAt: Date): void {
    this.props.updatedBy = actorUserId;
    this.props.updatedAt = changedAt;
    this.props.version += 1;
  }

  private assertValid(): void {
    const props = this.props;
    if (!hasText(props.organizationMemberId) || !hasText(props.organizationId) || !hasText(props.userId)) {
      throw new OrganizationMemberDomainError('Organization Member, Organization, and User identifiers are required.');
    }
    if (!allowedStatuses.includes(props.status)) {
      throw new OrganizationMemberDomainError('Organization Member status must be ACTIVE or SUSPENDED.');
    }
    if (!hasText(props.createdBy) || !hasText(props.updatedBy)) {
      throw new OrganizationMemberDomainError('Organization Member audit actors are required.');
    }
    if (!(props.createdAt instanceof Date) || Number.isNaN(props.createdAt.getTime())) {
      throw new OrganizationMemberDomainError('Organization Member creation timestamp is required.');
    }
    if (!(props.updatedAt instanceof Date) || Number.isNaN(props.updatedAt.getTime())) {
      throw new OrganizationMemberDomainError('Organization Member update timestamp is required.');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new OrganizationMemberDomainError('Organization Member version must be an integer greater than or equal to 1.');
    }
    if (Boolean(props.deletedAt) !== props.isDeleted) {
      throw new OrganizationMemberDomainError('Organization Member soft-delete timestamp and flag must agree.');
    }
    if (props.isDeleted && (!hasText(props.deletedBy) || !props.deletedAt)) {
      throw new OrganizationMemberDomainError('Retired Organization Member requires deletion audit values.');
    }
    if (!props.isDeleted && (props.deletedBy || props.deletedAt)) {
      throw new OrganizationMemberDomainError('Active or suspended Organization Member cannot have deletion audit values.');
    }
  }
}
