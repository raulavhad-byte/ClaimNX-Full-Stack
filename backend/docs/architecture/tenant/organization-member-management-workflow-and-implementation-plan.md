# Organization Member Management — Workflow and Implementation Plan

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Organization Member Management |
| Phase | Phase 5 — Tenant Management |
| Status | Approved — 2026-07-30 |
| Owner | Solution Architecture |
| Date | 2026-07-30 |
| Prerequisites | Business Understanding, Domain Analysis, Aggregate Design, Logical ERD, and Architecture Review approved 2026-07-30 |

## Objective

Define the approved operational workflows and delivery sequence for Organization
Member Management before physical database design begins.

## Approved Workflow Principles

1. Membership is tenant-scoped; an Organization Member belongs to one
   Organization and one IAM User.
2. IAM owns User roles and permissions. Organization Member does not store or
   change a member-owned role.
3. Active membership is required but not sufficient for tenant access; IAM
   permission is also required.
4. Suspended and retired memberships never authorize tenant actions.
5. Normal removal is soft deletion. No membership operation deletes the IAM
   User, Organization, Hospital Member, or access-scope record.
6. Every mutation is auditable and uses optimistic concurrency.
7. Existing Organization Member, Hospital Member, and access-scope foundations
   are evolved safely and never dropped.

## Workflow 1 — Add Existing IAM User to Organization

```text
Authorized actor selects Organization and existing IAM User
        ↓
Service validates actor's active membership and IAM permission
        ↓
Service validates Organization and User exist
        ↓
Service rejects active duplicate (Organization, User)
        ↓
Create Organization Member as ACTIVE, version 1
        ↓
Persist audit actor and timestamps
        ↓
Return tenant-scoped membership
```

### Rules

- User provisioning is out of scope; the IAM User must already exist.
- The Organization/User relationship is immutable after creation.
- A soft-retired historical record does not prevent a new membership.
- Membership creation does not grant a role; IAM permissions remain unchanged.

## Workflow 2 — Read Organization Members

```text
Caller requests members for Organization
        ↓
Verify active membership for same Organization
        ↓
Verify IAM permission to read members
        ↓
Retrieve only that Organization's permitted records
        ↓
Return active records by default; history only through an authorized option
```

### Rules

- Tenant context is derived/validated server-side.
- A caller cannot list another Organization's members by changing a URL or
  request field.
- Soft-retired members are excluded from normal operational lists.

## Workflow 3 — Suspend and Reactivate Membership

```text
Authorized actor selects an active or suspended membership
        ↓
Verify same Organization and expected version
        ↓
Apply allowed transition
        ↓
Update audit values and increment version
        ↓
Return updated membership
```

### Allowed transitions

| Current | Command | Result |
|---|---|---|
| `ACTIVE` | Suspend | `SUSPENDED` |
| `SUSPENDED` | Reactivate | `ACTIVE` |
| `RETIRED` | Any normal update | Rejected |

Final-active-administrator protection is deferred until a specific IAM
permission/role and administration policy are approved.

## Workflow 4 — Retire Membership

```text
Authorized actor selects active or suspended membership
        ↓
Verify same Organization and expected version
        ↓
Reject if future final-administrator safeguard applies
        ↓
Set deleted_by and deleted_at; retain history
        ↓
Update audit values and increment version
        ↓
Membership no longer passes tenant-access checks
```

## Workflow 5 — Verify Tenant Access

```text
Authenticated IAM User requests Organization-scoped operation
        ↓
Find active, non-deleted Organization Member for User + Organization
        ↓
Evaluate IAM permission
        ↓
Evaluate existing access-scope rule if operation requires it
        ↓
Allow or deny operation
```

This workflow is a cross-cutting access policy consumed by tenant-scoped
capabilities. It does not create a duplicate authorization system.

## REST API Intent — Design Only

The detailed API contract is deferred until after Physical Database Design.
The following intent guides the later API design:

| Capability | Intended API action | Required control |
|---|---|---|
| List members | Read tenant-scoped membership list. | Active membership plus read permission. |
| Get member | Read one membership within Organization. | Same tenant and read permission. |
| Add member | Create membership for existing IAM User. | Manage permission, duplicate prevention, audit. |
| Suspend | Change status from Active to Suspended. | Manage permission and expected version. |
| Reactivate | Change status from Suspended to Active. | Manage permission and expected version. |
| Retire | Soft-delete a membership. | Manage permission and expected version. |

No endpoint is authorized at this stage.

## Implementation Plan

The following order is mandatory:

1. **Physical Database Design**
   - inspect the live `organization_members` table, dependent foreign keys,
     record counts, audit readiness, status values, and duplicate data;
   - define safe evolution only after evidence is reviewed.
2. **SQL Architecture Review**
   - review table evolution, constraints, indexes, check constraints,
     compatibility, and rollback strategy.
3. **PostgreSQL Migration Scripts**
   - create forward-only raw SQL migration and post-migration validation;
   - apply only after SQL review approval.
4. **Domain Layer**
   - implement the corrected Organization Member aggregate and lifecycle
     invariants without role ownership.
5. **Repository Layer**
   - implement tenant-scoped persistence and version-aware mutations.
6. **Application Layer**
   - implement add, list, get, suspend, reactivate, retire, and membership
     verification use cases.
7. **API Layer**
   - create DTOs, validation, authorization boundary, and REST controller.
8. **Testing**
   - unit, integration, tenant-isolation, stale-version, soft-delete, and
     legacy-compatibility testing.
9. **Frontend**
   - only after backend contracts and tests are approved.

## Required Test Scenarios

| Scenario | Expected result |
|---|---|
| Add valid existing User | Membership created as `ACTIVE`, version 1, audit populated. |
| Add active duplicate | Conflict; no second active relationship. |
| Cross-tenant read or write | Forbidden. |
| Suspend active membership | Status becomes `SUSPENDED`; version increments. |
| Suspended member requests tenant action | Forbidden. |
| Reactivate suspended membership | Status becomes `ACTIVE`; version increments. |
| Retire membership | Soft-delete fields populated; normal list excludes it. |
| Use stale version | Conflict; no mutation. |
| Modify retired membership | Rejected. |
| Existing Hospital Member linkage | Preserved. |
| Existing access-scope linkage | Preserved. |

## Validation

- Workflows preserve IAM ownership of roles and permissions.
- The planned sequence remains SQL Design → SQL Migration → Domain →
  Repository → Application → DTO → Controller → Validation → Testing.
- Tenant isolation, audit, soft delete, optimistic concurrency, and backward
  compatibility are explicit.
- No physical design, SQL migration, code, endpoint, or test has been created.

## Approval Record

Approved on 2026-07-30. The next step is **Organization Member Management —
Physical Database Design**.
