# Organization Member Management — Bounded Context and Aggregate Design

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Organization Member Management |
| Phase | Phase 5 — Tenant Management |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |
| Prerequisites | Business Understanding and Domain Analysis approved 2026-07-30 |

## Objective

Define the bounded-context responsibility, aggregate boundary, lifecycle
commands, invariants, and external references for Organization Member
Management before logical data modeling begins.

## Bounded Context

**Bounded Context:** Tenant Management

**Capability responsibility:** Govern the tenant-scoped relationship that
allows an existing IAM User to participate in exactly one Organization through
one Organization Member record.

The context owns membership lifecycle. It does not own the Organization, User
identity, credential,
global role catalogue, permission catalogue, Hospital employment, or workflow
assignment.

## Context Map

| Neighboring context | Relationship | Rule |
|---|---|---|
| Organization | Upstream identity owner | Organization Member references an existing Organization; it cannot create, delete, or modify it. |
| IAM | Upstream identity and authorization owner | Organization Member references an existing User; IAM retains roles and permissions. This capability cannot create or modify IAM data. |
| Hospital | Downstream consumer | Hospital may later consume a verified member only through an approved requirement. It does not own membership. |
| Tenant Configuration | Peer tenant capability | Both require tenant isolation but have independent aggregates and tables. |
| Workflow | Downstream consumer | Workflow may later assign work to an eligible member; it must not create memberships. |
| Claims / Financial / Insurance / Reporting | Downstream consumers | They consume tenant access and member identity when needed; they do not own membership state. |

## Approved Aggregate

### Aggregate Root: Organization Member

`Organization Member` is the aggregate root and the only write entry point for
the membership relationship.

The aggregate represents:

- one immutable Organization reference;
- one immutable IAM User reference;
- membership operational state;
- soft-delete state;
- audit history; and
- optimistic-concurrency version.

There are no child entities in the Phase 5 Organization Member aggregate.

### Why There Are No Child Entities

The approved scope has one durable relationship. Adding Member Profile, Member
Invitation, Member Employment,
Member Hospital Assignment, or Member Permission Override child entities now
would mix ownership boundaries and create unapproved functionality.

Those concepts may become separate aggregates or integrations only when a
documented business requirement is approved in a later phase.

## Aggregate Boundary

```text
Organization Member Aggregate
│
├── organization_member_id
├── organization_id          → Organization (external reference)
├── user_id                  → IAM User (external reference)
├── membership_status
├── created_by, created_at
├── updated_by, updated_at
├── deleted_by, deleted_at
└── version
```

External references are identifiers only. The aggregate never embeds or
duplicates User credentials, User profile fields, Role definitions,
Permissions, or Organization attributes.

## Aggregate Commands

| Command | Allowed source state | Required business checks | Result |
|---|---|---|---|
| AddOrganizationMember | No active duplicate membership. | Organization and User exist; actor may manage members. | New `ACTIVE` aggregate at version 1. |
| SuspendOrganizationMember | `ACTIVE`, not deleted. | Expected version matches; actor may manage members; last-admin protection passes if enabled. | Status becomes `SUSPENDED`; version increments. |
| ReactivateOrganizationMember | `SUSPENDED`, not deleted. | Expected version matches; actor may manage members; no active duplicate exists. | Status becomes `ACTIVE`; version increments. |
| RetireOrganizationMember | `ACTIVE` or `SUSPENDED`, not deleted. | Expected version matches; actor may manage members; last-admin protection passes if enabled. | Soft delete applied; version increments. |
| VerifyOrganizationMembership | Any request for tenant action. | Authenticated actor, requested Organization, active membership, and required permission. | Allow or deny; no mutation. |

## State Model

| State | Meaning | May authorize tenant action? | Permitted transitions |
|---|---|---|---|
| `ACTIVE` | Member may use tenant-scoped capabilities when IAM permission checks pass. | Yes, if permission check passes. | Suspend, retire. |
| `SUSPENDED` | Membership is retained but tenant access is temporarily blocked. | No. | Reactivate, retire. |
| `RETIRED` | Soft-deleted relationship retained for audit. | No. | No normal transition. Create a new membership if required. |

`RETIRED` is represented by audit soft-delete fields; it does not require a
separate writeable operational status value.

## Aggregate Invariants

1. `organization_id` and `user_id` are mandatory and immutable.
2. The aggregate cannot be written unless its Organization exists and is a
   permitted tenant target.
3. The aggregate cannot be written unless its User exists in IAM.
4. Only one active, non-deleted aggregate may exist for the same
   `(organization_id, user_id)`.
6. Every mutation requires the current expected `version`; successful mutation
   increments `version` by one.
6. An `ACTIVE` aggregate is the only state that can pass membership validation.
7. `SUSPENDED` and `RETIRED` aggregates cannot authorize tenant actions.
8. A retired aggregate cannot be updated, reactivated, or reassigned through
   normal operations.
9. Normal retirement must use `deleted_by` and `deleted_at`, never physical
    deletion.
10. If enabled, final-administrator protection rejects a change that would
    leave the Organization without a required active tenant administrator.
11. The frontend cannot select or change tenant context without server-side
    membership and permission validation.

## Consistency Rules

### Inside the Aggregate

The following must be consistent in the same write transaction:

- membership status;
- audit data;
- soft-delete state; and
- optimistic-concurrency version.

### Across Aggregate Boundaries

Organization, User, Role, Permission, and future Workflow data remain external
references. Referential integrity and validation may confirm they exist, but
this aggregate does not mutate them.

The final-administrator rule is a cross-record rule within one Organization.
It must be implemented transactionally in the later SQL/application design
only if the business approves the tenant-administrator definition.

## Tenant Isolation Model

Every read and write accepts or derives a requested `organization_id` and must
verify that the actor is eligible to act in that same Organization. The
aggregate does not trust a route parameter, request body, JWT tenant claim, or
frontend switcher alone.

```text
Authenticated User
        ↓
Requested Organization
        ↓
Active Organization Member exists?
        ↓
Required permission granted?
        ↓
Allow tenant-scoped operation
```

## Explicit Non-Designs

The following are deliberately not part of this aggregate:

- User registration, invitation delivery, password management, MFA, SSO, or
  session lifecycle;
- employee profile, designation, Hospital assignment, or Department assignment;
- copying a global User Role into a member-owned role definition;
- direct member-owned permission lists that bypass the approved IAM model;
- membership reassignment between Users or Organizations;
- workflow task assignment; and
- frontend design.

## Decisions Required Before Implementation

1. Confirm whether the final active tenant administrator protection is required
   and which role/permission defines an administrator.
2. Confirm whether a platform Super Admin has a documented cross-tenant
   management exception, and the audit requirements for that exception.

## Validation

- Exactly one aggregate root exists: Organization Member.
- No unapproved child entity or cross-domain ownership has been introduced.
- IAM, Organization, Hospital, and Workflow boundaries remain clear.
- Lifecycle, tenant isolation, soft delete, audit, and version rules are
  explicitly stated.
- No ERD, SQL migration, database schema, NestJS code, or REST API has been
  created.

## Approval Record

Approved on 2026-07-30. The next step is **Organization Member Management —
Logical ERD**.
