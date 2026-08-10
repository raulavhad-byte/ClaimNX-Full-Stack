# Organization Member Management — Domain Analysis

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Organization Member Management |
| Phase | Phase 5 — Tenant Management |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |
| Prerequisite | Business Understanding approved 2026-07-30 |

## Objective

Translate the approved business understanding into domain language, behaviors,
invariants, and ownership boundaries before defining the bounded context,
aggregate, ERD, SQL, or API contracts.

## Domain Purpose

Organization Member Management answers one tenant-security question:

> Is this IAM User currently authorized to act within this Organization, and
> under which approved Organization-level authorization assignment?

It models a durable business relationship, not a UI selection, a JWT claim, or
a user-profile field. Tenant-scoped modules consume the result; they do not
create or own it.

## Ubiquitous Language

| Term | Meaning | Ownership / note |
|---|---|---|
| Organization | ClaimNX tenant that owns business data and memberships. | Organization domain owns tenant identity. |
| IAM User | Globally identified person/system account able to authenticate. | IAM owns identity, credentials, roles, and permissions. |
| Organization Member | Tenant-scoped relationship between one Organization and one IAM User. | This capability owns the relationship lifecycle. |
| Membership | Synonym for Organization Member when discussing access and lifecycle. | One membership has one Organization and one User. |
| Membership Status | Operational state: `ACTIVE` or `SUSPENDED`. | Separate from soft deletion. |
| Retired Membership | A soft-deleted membership that no longer authorizes access. | Historical record is retained. |
| Organization Role Assignment | Approved Organization/IAM authorization held by a member. | Role catalogue remains IAM/Organization owned. |
| Tenant Access | Permission to act within a specified Organization. | Derived only from active membership and authorization. |
| Actor | Authenticated IAM User who performs a membership action. | Recorded in audit fields. |
| Version | Optimistic-concurrency value of a membership. | Starts at 1; increments on successful change. |

## Core Domain Concepts

### Organization Member

An Organization Member is an Organization-owned access relationship. It binds
exactly one `organization_id`, exactly one immutable `user_id`, one approved
organization-level authorization assignment, a reversible operational status,
and its audit/version history.

It does not contain the user's password, email, profile, global role
definition, permission definition, hospital employment record, or independent
identity lifecycle.

### Membership Lifecycle

```text
Create
  ↓
ACTIVE  ←→  SUSPENDED
  ↓
RETIRED (soft deleted; terminal for normal operations)
```

- **Active:** can participate in tenant-access decisions.
- **Suspended:** remains visible for audit and may be reactivated, but must not
  authorize tenant actions.
- **Retired:** soft-deleted; it cannot authorize tenant actions.

### Tenant Access Decision

Tenant access is granted only when all conditions are true:

1. The request is authenticated as the referenced IAM User.
2. An Organization Member exists for the requested Organization and User.
3. The membership is `ACTIVE` and not soft-deleted.
4. The required permission is allowed by the approved role/access model.

The requested Organization identifier alone never proves tenant access.

## Domain Behaviors

| Behavior | Preconditions | Result |
|---|---|---|
| Add Member | Actor can manage members; User and approved assignment exist; no active duplicate. | New Active membership at version 1. |
| Read / List Members | Actor has member-read permission in the Organization. | Only permitted tenant records are returned. |
| Change Authorization Assignment | Membership active; actor authorized; expected version matches. | Assignment changes and version increments. |
| Suspend Member | Membership active; actor authorized; expected version matches; final-admin protection passes when enabled. | Status becomes Suspended. |
| Reactivate Member | Membership suspended; actor authorized; expected version matches. | Status becomes Active. |
| Retire Membership | Membership active or suspended; actor authorized; expected version matches; final-admin protection passes when enabled. | Soft-delete fields are set. |
| Verify Tenant Access | Authenticated actor and target Organization supplied. | Explicit allow/deny result. |

## Domain Invariants

1. An Organization Member cannot exist without one Organization and one IAM
   User.
2. Organization and User are immutable after membership creation.
3. At most one active, non-deleted membership may exist for a
   `(organization_id, user_id)` pair.
4. Only an active, non-deleted membership can contribute to tenant access.
5. A suspended or retired membership never authorizes tenant-scoped actions.
6. The assigned role/access value must come from the approved
   IAM/Organization authorization model.
7. State or assignment changes use the expected `version`.
8. Normal removal uses soft deletion only; it must not delete or alter the IAM
   User.
9. Every lifecycle and authorization change records required audit fields.
10. Tenant isolation is checked at database query, application service, and
    REST API boundaries.
11. If final-tenant-administrator protection is approved, a mutation that
    leaves the Organization without an active administrator is rejected.

## Domain Events — Conceptual Only

These are business concepts for later Workflow/Audit integration. No event
transport or outbox implementation is proposed in this stage.

| Event | Meaning | Potential future consumer |
|---|---|---|
| OrganizationMemberAdded | A User was granted Organization membership. | Audit, notification, workflow. |
| OrganizationMemberAuthorizationChanged | A member's approved assignment changed. | Audit, authorization-cache invalidation. |
| OrganizationMemberSuspended | Tenant access was temporarily disabled. | Audit, security monitoring. |
| OrganizationMemberReactivated | Tenant access was restored. | Audit, notification. |
| OrganizationMemberRetired | The Organization/User relationship ended. | Audit, workflow, reporting. |

## Ownership Boundaries

| Domain | Owns | This capability may do | This capability must not do |
|---|---|---|---|
| IAM | Users, credentials, authentication, roles, permissions. | Validate IAM references and consume authorization decisions. | Create users, reset passwords, alter global roles/permissions, manage sessions. |
| Organization | Tenant identity and Organization lifecycle. | Reference the Organization as membership owner. | Reassign a membership or change Organization data. |
| Hospital | Hospital aggregate and child entities. | Consume verified tenant membership when a future requirement permits. | Model employment, department placement, or Hospital ownership. |
| Workflow | Tasks, assignments, states, transitions. | Consume membership data for future assignment policy. | Create or modify membership records. |
| Tenant Configuration | Definitions and Organization overrides. | Use tenant access validation for administration. | Store or determine membership state. |

## Authorization Boundary

Every protected operation must pass two independent checks:

1. **Membership check:** the actor has an active membership in the requested
   Organization.
2. **Permission check:** the active membership's approved assignment permits
   the requested operation.

Both are required. Any existing global Super Admin exception must be explicit
in later API and service design; it must not silently bypass tenant rules.

## Decisions Carried Forward

| Decision | Recommended direction | Required before implementation |
|---|---|---|
| Existing-user requirement | Add only an existing IAM User. | Confirmed by Business Understanding. |
| Authorization assignment | Reuse existing Organization/IAM role model. | Confirm exact referenced model in Architecture Review. |
| Lifecycle | Active, Suspended, and soft-retired. | Confirm physical representation later. |
| Final administrator protection | Enforce if tenant-administrator permission is approved. | Business decision needed before SQL/API. |
| Cross-tenant User | Allow separate membership and assignment per Organization. | Confirmed by Business Understanding. |

## Validation

- IAM retains ownership of identity and authorization-catalogue data.
- Organization retains ownership of tenant membership.
- Hospital, Workflow, Claims, Financial, and Configuration boundaries are not
  crossed.
- The lifecycle distinguishes reversible suspension from soft retirement.
- No ERD, SQL migration, database schema, NestJS code, or REST API has been
  created.

## Approval Record

Approved on 2026-07-30. The next step is **Organization Member Management —
Bounded Context and Aggregate Design**.
