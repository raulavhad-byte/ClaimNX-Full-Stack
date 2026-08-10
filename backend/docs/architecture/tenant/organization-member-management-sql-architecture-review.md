# Organization Member Management — SQL Architecture Review

| Field | Value |
|---|---|
| Module | Tenant Management |
| Capability | Organization Member Management |
| Phase | Phase 5 — Tenant Management |
| Status | Implemented and validated — 2026-07-30 |
| Owner | Solution Architecture |
| Database | PostgreSQL / Supabase |
| Date | 2026-07-30 |
| Prerequisites | Physical Database Design approved; live preflight and audit remediation validated 2026-07-30 |

## Objective

Review the precise PostgreSQL evolution strategy for `public.organization_members` before creating a migration. This review confirms transaction order, constraint behavior, tenant safety, backward compatibility, idempotency, and validation.

## Review Decision

**Approved migration direction:** evolve the existing table in place through one forward-only transactional raw SQL migration.

No table is dropped, renamed, recreated, or copied. The existing `id` primary key and the existing Hospital Member foreign-key dependency remain unchanged.

## Baseline Objects to Preserve

| Object | Decision | Reason |
|---|---|---|
| `public.organization_members` | Retain | Existing tenant-membership foundation. |
| `organization_members.id` | Retain unchanged | Referenced by Hospital Member records. |
| Existing Organization FK | Retain | Correct parent ownership already exists. |
| Existing User FK | Retain | Correct IAM identity relationship already exists. |
| `public.hospital_members` dependency | Preserve and validate | Hospital owns its own relationship and depends on membership identity. |
| Legacy employee columns | Retain | Existing compatibility; excluded from new core membership write use cases. |
| Existing legacy indexes | Retain initially | Avoid unreviewed regression in existing queries. |

## Objects to Add or Evolve

| Object | SQL direction | Reason |
|---|---|---|
| `created_by`, `updated_by` | Enforce `NOT NULL` after in-migration validation. | Mandatory audit standard. |
| Audit-actor foreign keys | Add to `public.users(id)` with `ON DELETE RESTRICT`. | Prevent invalid audit provenance. |
| `deleted_by` foreign key | Add nullable FK to `public.users(id)` with `ON DELETE RESTRICT`. | Preserve audit integrity when retired. |
| Status check | Replace legacy `ACTIVE/INACTIVE/SUSPENDED` check with `ACTIVE/SUSPENDED`. | Align physical state with approved lifecycle. |
| Version check | Add `CHECK (version >= 1)`. | Enforce concurrency baseline. |
| Soft-delete check | Add timestamp/flag consistency check. | Prevent ambiguous active/retired state. |
| Active partial unique index | Add `(organization_id, user_id)` uniqueness for non-retired records. | Supports reuse after soft retirement. |
| Tenant/query indexes | Add partial indexes for active Organization and User lookup. | Support tenant isolation and access checks. |
| Legacy global unique constraint | Remove only after replacement partial unique index succeeds. | Remove soft-delete conflict without an integrity gap. |

## Constraint Names

| Name | Type | Definition |
|---|---|---|
| `fk_organization_members_created_by_user` | FK | `created_by → public.users(id)`; `ON DELETE RESTRICT`. |
| `fk_organization_members_updated_by_user` | FK | `updated_by → public.users(id)`; `ON DELETE RESTRICT`. |
| `fk_organization_members_deleted_by_user` | FK | `deleted_by → public.users(id)`; `ON DELETE RESTRICT`. |
| `ck_organization_members_status` | CHECK | `status IN ('ACTIVE', 'SUSPENDED')`. |
| `ck_organization_members_version` | CHECK | `version >= 1`. |
| `ck_organization_members_soft_delete_consistency` | CHECK | `deleted_at` and `is_deleted` agree. |
| `uq_organization_members_organization_user_active` | Partial unique index | Unique `(organization_id, user_id)` where active/non-retired. |
| `idx_organization_members_organization_active` | Partial index | Active member lookup by tenant. |
| `idx_organization_members_user_active` | Partial index | Active tenant-membership lookup by IAM User. |
| `idx_organization_members_status_active` | Partial index | Active administrative status filtering. |

Existing Organization/User FK names and the primary-key name remain legacy compatibility names. They are not renamed merely for naming cosmetics.

## Required In-Migration Guard Clauses

The migration must halt and roll back if any condition below is true:

1. `public.organization_members` does not exist.
2. `public.hospital_members` no longer has a foreign key to `public.organization_members(id)`.
3. Any `created_by` or `updated_by` is null.
4. Any audit actor does not exist in `public.users`.
5. Any `version` is null or lower than 1.
6. A soft-delete flag/timestamp mismatch exists.
7. A status is not `ACTIVE` or `SUSPENDED`.
8. An active, non-retired duplicate `(organization_id, user_id)` exists.

These checks ensure a failed migration leaves the live schema unchanged.

## Migration Order

```text
BEGIN
  ↓
Validate live table, Hospital Member FK, audit actors, statuses, version, soft-delete consistency, and duplicate data
  ↓
Set created_by and updated_by NOT NULL
  ↓
Add audit actor foreign keys
  ↓
Replace legacy status check
  ↓
Add version and soft-delete checks
  ↓
Create new partial indexes and partial unique index
  ↓
Drop legacy global unique constraint `uk_org_member`
  ↓
Add compatibility comments
  ↓
Revalidate all required constraints/indexes and Hospital Member FK
  ↓
COMMIT
```

The replacement partial unique index is created before `uk_org_member` is dropped. Because both operations happen in one transaction, a failure rolls back the entire change.

## Idempotency Strategy

The migration is intended to run once through migration history, but it will use defensive PostgreSQL checks:

- `CREATE INDEX IF NOT EXISTS` for indexes;
- catalog checks before adding named foreign keys or check constraints;
- catalog checks before dropping the exact legacy `uk_org_member` constraint;
- no `CASCADE` in any DDL; and
- no `DROP TABLE`, `DROP COLUMN`, or primary-key rename.

An existing object with the same name but a different definition is a review failure, not a condition to overwrite silently.

## Transaction and Deployment Rules

- The migration runs inside one `BEGIN` / `COMMIT` transaction.
- Do not use `CREATE INDEX CONCURRENTLY`; it cannot run in this transaction and is not justified by the current single-row data volume.
- Apply it to Supabase primary database only after review approval.
- Commit the migration file to Git before applying it to the database.
- Run the post-migration validation script immediately after applying it.

## Tenant Isolation Review

No row-level policy is introduced by this migration. Tenant isolation remains a combined responsibility of:

1. `organization_id` ownership and database constraints;
2. tenant-filtered repository queries;
3. application-level active-membership verification; and
4. REST API authorization checks.

The partial Organization/User uniqueness and active indexes support these checks but do not replace them.

## Backward Compatibility Review

| Existing behavior | Migration treatment |
|---|---|
| Hospital Member references Organization Member `id`. | Preserved unchanged and revalidated. |
| Legacy employee columns exist. | Retained unchanged. |
| `INACTIVE` was historically permitted. | Disallowed after migration; there are zero live `INACTIVE` records. New reversible state is `SUSPENDED`. |
| Global Organization/User uniqueness existed. | Replaced with active/non-retired uniqueness to support soft-delete history. |
| Access-scope migration exists locally but table is missing live. | Not applied, created, or altered in this capability. |

## Post-Migration Validation Requirements

The separate validation script must prove:

- table and retained legacy primary key exist;
- Hospital Member FK remains valid;
- audit columns are non-null and audit FKs exist;
- status, version, and soft-delete checks exist;
- active unique index and tenant lookup indexes exist;
- legacy global unique constraint is absent;
- existing record remains active and preserves its `id` and Organization/User relationship; and
- no active duplicate memberships exist.

## Validation

- The plan uses raw SQL as the schema source of truth.
- No DDL is created in this review stage.
- No ownership boundary is crossed.
- No destructive DDL or cascade behavior is permitted.
- Existing Hospital Member dependency is a hard migration guard.

## Approval Record

Approved on 2026-07-30. The next step is **Organization Member Management —
PostgreSQL Migration Scripts**.

## Implementation Evidence

The reviewed migration was applied successfully and its read-only validation
returned `true` for every required schema and integrity check. The live
database retains one active non-deleted Organization Member record and the
Hospital Member foreign-key dependency.
