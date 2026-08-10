# Organization Member Management — Physical Database Design

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Organization Member Management |
| Phase | Phase 5 — Tenant Management |
| Status | Implemented and validated — 2026-07-30 |
| Owner | Solution Architecture |
| Database | PostgreSQL / Supabase |
| Date | 2026-07-30 |
| Prerequisites | Architecture and Workflow approved; live preflight and audit remediation validated 2026-07-30 |

## Objective

Define the safe, production-ready physical evolution of the existing
`public.organization_members` table without breaking its current
`hospital_members` dependency or crossing IAM, Hospital, or access-scope
ownership boundaries.

## Live Preflight Evidence

The reviewed live Supabase database contains:

| Check | Result | Design consequence |
|---|---|---|
| `public.organization_members` | Exists | Evolve in place; do not replace or rename the table. |
| Current member records | 1 active record | Existing data must be preserved. |
| Active duplicates | 0 | Partial active-membership uniqueness can be introduced safely. |
| Invalid versions | 0 | `version >= 1` check can be enforced safely. |
| Soft-delete mismatches | 0 | Soft-delete consistency check can be enforced safely. |
| Audit readiness before remediation | 1 record missing actors | Remediated and validated before this design. |
| Audit readiness after remediation | Valid | Audit foreign keys and non-null requirements may be introduced. |
| Inbound foreign keys | 1 | Existing Hospital Member dependency must remain valid. |
| `public.hospital_members` | Exists | Do not rename or replace the Organization Member primary key. |
| `public.organization_member_access_scopes` | Does not exist in live database | Do not create, alter, or depend on it in this capability. |

## Target Table

**Table:** `public.organization_members`

### Naming Compatibility Decision

The existing primary key is named `id` and is referenced by
`public.hospital_members`. Renaming it to `organization_member_id` would add
unnecessary dependency risk without business value.

**Approved physical-design exception:** retain `id` as the legacy primary key.
New SQL constraints and indexes use the current table name and enterprise
naming convention where possible.

## Column Specification

| Column | Type | Required | Physical rule / purpose |
|---|---|---|
| `id` | UUID | Yes | Existing primary key; application-generated for new writes; retained for Hospital Member compatibility. |
| `organization_id` | UUID | Yes | Immutable tenant owner; references `public.organizations(id)`. |
| `user_id` | UUID | Yes | Immutable IAM User reference; references `public.users(id)`. |
| `employee_code` | VARCHAR(50) | No | Legacy compatibility column only; not owned by the core membership lifecycle API. |
| `designation` | VARCHAR(100) | No | Legacy compatibility column only; not owned by the core membership lifecycle API. |
| `joining_date` | DATE | No | Legacy compatibility column only; not owned by the core membership lifecycle API. |
| `status` | VARCHAR(20) | Yes | Membership state. New writes are limited to `ACTIVE` and `SUSPENDED`. |
| `created_by` | UUID | Yes | Creation audit actor; references `public.users(id)`. |
| `created_at` | TIMESTAMPTZ | Yes | Creation audit timestamp. |
| `updated_by` | UUID | Yes | Last mutation audit actor; references `public.users(id)`. |
| `updated_at` | TIMESTAMPTZ | Yes | Last mutation timestamp. |
| `deleted_by` | UUID | No | Soft-retirement audit actor; references `public.users(id)`. |
| `deleted_at` | TIMESTAMPTZ | No | Soft-retirement timestamp. |
| `is_deleted` | BOOLEAN | Yes | Legacy soft-delete compatibility flag; must agree with `deleted_at`. |
| `version` | INTEGER | Yes | Optimistic-concurrency value; starts at 1 and increments on every successful mutation. |

## Ownership and Write Rules

- The table owns the Organization/User membership relationship and its
  lifecycle only.
- `organization_id` and `user_id` are immutable after creation.
- The table does not include a role, permission, or access-scope assignment.
  IAM owns roles and permissions; the missing live access-scope table is not
  part of this capability.
- Legacy employee-related fields are retained, read-compatible, and excluded
  from new core membership write use cases.
- `status`, audit fields, soft-delete fields, and `version` are changed only
  through approved version-aware application/database operations.

## Primary Key and Foreign Keys

| Constraint name | Source | Target | Delete rule | Purpose |
|---|---|---|---|---|
| Existing primary key | `organization_members.id` | — | — | Retained unchanged because `hospital_members` depends on it. |
| `fk_organization_members_organization` | `organization_id` | `organizations(id)` | RESTRICT | Prevent orphaned tenant membership. |
| `fk_organization_members_user` | `user_id` | `users(id)` | RESTRICT | Prevent orphaned IAM membership. |
| `fk_organization_members_created_by_user` | `created_by` | `users(id)` | RESTRICT | Enforce creation audit actor. |
| `fk_organization_members_updated_by_user` | `updated_by` | `users(id)` | RESTRICT | Enforce update audit actor. |
| `fk_organization_members_deleted_by_user` | `deleted_by` | `users(id)` | RESTRICT | Enforce soft-delete audit actor when present. |
| Existing Hospital Member FK | `hospital_members.organization_member_id` | `organization_members(id)` | Existing rule retained | Preserve Hospital ownership and dependency. |

The migration will preserve existing Organization and User foreign keys. It
will add audit-actor foreign keys only after preflight proves all active rows
have valid audit actors.

## Status and Lifecycle Constraints

### Membership status

Target accepted values:

```text
ACTIVE
SUSPENDED
```

The current live data contains only `ACTIVE`; therefore removing legacy
`INACTIVE` from the check constraint is safe for current data. New application
writes will use `SUSPENDED` for reversible access removal.

### Soft-delete consistency

```text
deleted_at IS NULL     ⇔     is_deleted = FALSE
deleted_at IS NOT NULL ⇔     is_deleted = TRUE
```

### Version constraint

```text
version >= 1
```

## Unique Constraint Strategy

The current legacy global unique constraint on `(organization_id, user_id)`
prevents an Organization from recording a new membership after a previous one
is soft-retired. It must be evolved to support the approved soft-delete policy.

| Name | Columns | Filter | Rule |
|---|---|---|---|
| `uq_organization_members_organization_user_active` | `organization_id`, `user_id` | `deleted_at IS NULL AND COALESCE(is_deleted, FALSE) = FALSE` | At most one active/non-retired membership for the same Organization and User. |

The migration will first create the partial unique index, then remove the
legacy global unique constraint only after validation confirms zero active
duplicates.

## Index Strategy

| Index name | Columns | Filter | Purpose |
|---|---|---|---|
| `idx_organization_members_organization_active` | `organization_id` | active/non-retired | Tenant-scoped member list and access checks. |
| `idx_organization_members_user_active` | `user_id` | active/non-retired | Resolve a User's available tenant memberships. |
| `idx_organization_members_status_active` | `status` | active/non-retired | Administrative status filtering. |
| `uq_organization_members_organization_user_active` | `organization_id`, `user_id` | active/non-retired | Uniqueness and direct tenant-access lookup. |

Existing legacy indexes are reviewed during SQL Architecture Review. They may
be retained when they still support dependent legacy queries; they are not
dropped automatically.

## Migration Strategy

The future raw SQL migration must be forward-only and transactional.

1. Verify the exact live preflight conditions again inside the migration.
2. Validate no active duplicate Organization/User pairs exist.
3. Validate all existing `created_by` and `updated_by` values reference
   `public.users`.
4. Add or normalize named audit foreign keys with `ON DELETE RESTRICT`.
5. Add check constraints for version and soft-delete consistency.
6. Replace the legacy status check with the approved `ACTIVE`/`SUSPENDED`
   lifecycle check.
7. Create partial active-membership indexes and partial unique index.
8. Remove only the legacy global `(organization_id, user_id)` unique constraint
   after the replacement unique index exists.
9. Add table and legacy-column comments documenting ownership and compatibility.
10. Validate that the Hospital Member foreign key remains present and valid.

## Explicit Non-Changes

This Physical Database Design does not:

- create or change IAM users, roles, or permissions;
- add a role column to Organization Member;
- create `organization_member_access_scopes` because it is absent from live
  Supabase and outside this approved capability;
- alter or remove `hospital_members`;
- rename the legacy `id` primary key;
- remove employee-related legacy columns;
- physically delete records; or
- introduce frontend behavior.

## Validation Checklist for Future Migration

- Existing membership record remains active and addressable by the same `id`.
- Hospital Member foreign key remains valid.
- `created_by` and `updated_by` are mandatory and valid User references.
- New active duplicate membership is rejected.
- A new membership after soft retirement is permitted.
- `INACTIVE` is rejected; `SUSPENDED` is accepted.
- Soft-delete flag/timestamp mismatch is rejected.
- Version below 1 is rejected.
- Tenant-scoped reads and writes remain isolated.

## Approval Record

Approved on 2026-07-30. The next step is **Organization Member Management —
SQL Architecture Review**.

## Migration Execution Evidence

The approved migration `20260730123000_evolve_organization_members_for_phase_5.sql`
was applied successfully to the Supabase primary database on 2026-07-30.

The post-migration validation confirmed:

- the Organization Member table and retained UUID `id` column exist;
- the Hospital Member foreign-key dependency is preserved;
- all three audit-actor foreign keys exist;
- status, version, and soft-delete consistency checks exist;
- required active-membership indexes and partial unique index exist;
- the legacy global Organization/User unique constraint is removed;
- all records meet the new rules; and
- active non-deleted member count is `1`.
