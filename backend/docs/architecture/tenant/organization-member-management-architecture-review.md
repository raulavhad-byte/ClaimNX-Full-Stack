# Organization Member Management — Architecture Review

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Organization Member Management |
| Phase | Phase 5 — Tenant Management |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |
| Reviewed inputs | Approved Business Understanding, Domain Analysis, Aggregate Design, Logical ERD, and existing migration foundations |

## Objective

Validate the approved logical design against ClaimNX architectural principles
and the existing Organization, IAM, Organization Member, Access Scope, and
Hospital foundations before any workflow, physical database, or implementation
work begins.

## Review Outcome

**Conditionally approved, with one mandatory logical-model correction before
Physical Database Design.**

The proposed Organization Member aggregate, lifecycle, tenant isolation,
audit, soft-delete, and optimistic-concurrency rules are compatible with the
ClaimNX architecture.

However, the Logical ERD's direct `Organization Role Assignment` reference on
Organization Member is not compatible with the approved IAM ownership boundary
or the existing schema. Roles and permissions are IAM-owned. The Organization
Member relationship must not duplicate or directly own a role assignment.

## Existing Foundation Verified

| Existing foundation | Verified purpose | Architecture result |
|---|---|---|
| `organizations` | Tenant identity and ownership. | Correct external parent of Organization Member. |
| `users` | IAM identity and global role relationship. | Correct external identity reference. |
| `organization_members` | Existing Organization/User membership relation with status, audit, soft-delete, and version fields. | Correct legacy foundation to evolve safely, not replace. |
| `organization_type_roles` | Approved relationship between Organization Type and IAM Role. | Role eligibility belongs to Organization/IAM, not to Organization Member. |
| `organization_member_access_scopes` | Existing scoped-access assignments for a member. | Separate existing child/association foundation; not part of the core membership lifecycle in this capability. |
| `hospital_members` | Existing Hospital-specific membership relationship. | Hospital relationship remains Hospital-owned and must not be absorbed into Organization Member. |

## Mandatory Logical-Model Correction

### Previous logical assumption

The Logical ERD described one direct `organization_role_assignment_id` on the
Organization Member aggregate.

### Corrected architecture

```text
Organization Member
    ├── belongs to one Organization
    ├── references one IAM User
    ├── owns membership lifecycle only
    └── may be constrained by separately owned access scopes

IAM User
    └── holds IAM role / permissions

Organization Type Role
    └── governs which IAM roles are eligible for an Organization type
```

**Decision:** Role and permission assignment stays in IAM. Organization Member
does not add a new role foreign key, does not duplicate a User role, and does
not own a parallel tenant permission model.

The existing `organization_member_access_scopes` relationship remains an
existing access-control foundation. It is intentionally outside the core
Organization Member lifecycle aggregate for this capability. Its redesign,
if ever required, must be a separately approved bounded-context decision.

## Corrected Core Aggregate

**Aggregate Root:** Organization Member

**Core attributes:**

- `organization_member_id`
- immutable `organization_id`
- immutable `user_id`
- `membership_status` (`ACTIVE` or `SUSPENDED`)
- standard audit fields
- soft-delete fields
- `version`

**External references and policies:**

- Organization — Organization domain
- User, role, and permissions — IAM domain
- role eligibility by Organization type — Organization/IAM domain
- member access scopes — existing separate access-scope association
- Hospital membership — Hospital domain

## Aggregate and Boundary Review

| Review area | Result | Notes |
|---|---|---|
| Aggregate root | Approved | Organization Member remains the sole core aggregate root. |
| Child entities | Approved with boundary clarification | No new child entity is introduced. Existing access-scope associations are not redesigned in this capability. |
| IAM ownership | Approved after correction | User roles and permissions remain IAM-owned. |
| Organization ownership | Approved | Organization owns membership relationship and tenant context. |
| Hospital ownership | Approved | Hospital Member remains separate; no Hospital assignment is added here. |
| Tenant isolation | Approved | Active membership is necessary, but permission is evaluated through IAM. |
| Soft delete and version | Approved | Existing standards remain mandatory for all evolution. |
| Future workflow compatibility | Approved | Workflow can consume active members without owning them. |

## Authorization Decision Model

An Organization-scoped action is permitted only when:

1. the caller is authenticated as an IAM User;
2. the caller has an active, non-deleted Organization Member relationship for
   the requested Organization;
3. IAM grants the required permission through the User's approved role; and
4. any separately approved access-scope restriction permits the requested
   entity.

```text
Authenticated IAM User
        ↓
Active Organization Member for requested Organization?
        ↓
IAM permission granted?
        ↓
Access scope permits target, when applicable?
        ↓
Allow operation
```

## Legacy-Evolution Strategy

The existing `organization_members` table is retained and evolved in place.
No table will be dropped or replaced. Existing `hospital_members` and
`organization_member_access_scopes` foreign-key relationships must be
preserved.

Physical Database Design must first inspect the live database for:

- active and historical Organization Member data;
- current foreign keys and dependent tables;
- current audit, status, version, and soft-delete readiness;
- duplicate or inconsistent Organization/User memberships; and
- practical usage of existing access-scope records.

No physical change is authorized before that preflight evidence is reviewed.

## Final-Administrator Protection

The desired last-active-administrator safeguard is architecturally valid but
cannot be implemented yet because the existing model does not establish a
member-owned tenant-administrator role. Any future safeguard must be expressed
through IAM permission/role evaluation and a documented platform or
Organization administration policy.

**Phase 5 decision:** defer final-administrator enforcement. Do not infer an
administrator role from an unverified role name or frontend behavior.

## Required Documentation Amendment

Before Physical Database Design, amend the approved Logical ERD so that:

- `organization_role_assignment_id` is removed from Organization Member;
- the `Organization Role Assignment → Organization Member` relationship is
  removed;
- IAM User is documented as the role/permission holder; and
- `organization_member_access_scopes` is documented as a separate existing
  access-control association, not a new child entity in this aggregate.

This correction protects an already-approved ownership boundary; it is not a
structural redesign or a new business requirement.

## Validation

- The review used existing raw SQL migration foundations; no assumptions were
  made that contradict the current schema.
- IAM continues to own Users, Roles, and Permissions.
- Organization Member continues to own Organization/User membership lifecycle.
- Hospital and access-scope foundations remain outside this aggregate's core
  lifecycle responsibility.
- No SQL migration, database schema change, NestJS code, REST API, or test has
  been created.

## Approval Record

Approved on 2026-07-30. The mandatory Logical ERD correction is authorized.
The next step is **Organization Member Management — Workflow and Implementation
Plan**.
